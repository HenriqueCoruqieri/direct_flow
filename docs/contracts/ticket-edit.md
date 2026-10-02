# Contrato — Edição do chamado pelo autor

Entrada das ondas 1 e 2. As decisões estão no plano, `docs/plans/ticket-edit.md`,
e não são repetidas aqui. Este documento é a referência técnica: assinaturas,
sequências, textos e cenários. Padrões de outcome, resultado de action e
formulário vêm de `docs/contracts/ticket-creation.md`; detalhe e linha do tempo,
de `docs/contracts/my-tickets.md`.

Versões observadas: `next@16.3.5`, `drizzle-orm@0.45.2`, `drizzle-kit@0.31`,
`zod@4.6.5`, `react-hook-form@7.88`.

## Escopo técnico em uma frase

O autor edita título, descrição, tipo e tag do próprio chamado enquanto ele está
no setor dele, sem transferência pendente e fora de `aguardando_aprovacao`,
`fechado` e `cancelado`. Uma transação grava `ticket`, `ticket_tag` (se a tag
mudou) e `ticket_history` (`edicao`, mais `mudanca_tag` se a tag mudou). Sem
e-mail.

## Tabelas, enums e migration

### `db/schema.ts` (alterado)

| Objeto                 | Mudança                              |
| ---------------------- | ------------------------------------ |
| `history_event` (enum) | novo valor `edicao`, no fim da lista |

`HistoryEvent` ganha `"edicao"`. Nenhuma coluna, índice ou tabela nova.

### Migration `db/migrations/0008_ticket_edit.sql`

Gerada por `npm run db:generate -- --name ticket_edit`, sem edição:

```sql
ALTER TYPE "public"."history_event" ADD VALUE 'edicao';
```

Não destrutiva. Mesmo raciocínio da `0007` (`ticket-creation.md`, "Por que é
aplicável"): o migrador roda as pendentes numa transação só, e o Postgres aceita
`ADD VALUE` em transação desde que o valor não seja **usado** antes do commit. A
`0008` não usa `edicao`. Quem grava `edicao` é a aplicação, em transação
posterior.

Quem aplica (`npm run db:migrate`) é o usuário, **antes** dos testes do `df-qa`.
Sem ela, a primeira edição falha com `invalid input value for enum
history_event: "edicao"` (falha inesperada na action) e nada é gravado.

### Lidas e gravadas pelo fluxo

| Tabela            | Uso                                                                                        |
| ----------------- | ------------------------------------------------------------------------------------------ |
| `ticket`          | lê e trava a linha (`for update`); grava `title`, `description`, `type`, `updated_at`      |
| `users`           | lê o autor: `department_id`, `is_active`, `must_change_password` (trava `for share`)       |
| `department`      | lê `is_board` do setor do autor (visibilidade)                                             |
| `ticket_transfer` | lê se há linha `pendente` do chamado                                                       |
| `ticket_tag`      | lê a tag atual; substitui a linha única se a tag mudou (insere se o chamado não tinha tag) |
| `tag`             | lê `department_id`, `is_active` da tag escolhida (`for share`)                             |
| `ticket_history`  | grava `edicao` e, se a tag mudou, `mudanca_tag`                                            |

## Tipos — `app/_lib/types/`

### `app/_lib/types/ticket.ts` (alterado)

`TicketDetail` ganha `tagId: number | null` (ao lado de `tagName`). Nulo quando
o chamado não tem `ticket_tag` (3 chamados legados).

### `app/_lib/types/ticket-edit.ts` (novo)

```ts
export interface TicketEditorFacts extends TicketViewerFacts {
  isActive: boolean
  mustChangePassword: boolean
}

export interface TicketEditabilityFacts {
  createdBy: number
  currentDepartmentId: number
  status: TicketStatus
  hasPendingTransfer: boolean
}

export type TicketEditBlockReason =
  | "EDITOR_INACTIVE"
  | "PASSWORD_CHANGE_REQUIRED"
  | "NOT_AUTHOR"
  | "OUTSIDE_EDITOR_DEPARTMENT"
  | "TICKET_FINISHED"
  | "AWAITING_APPROVAL"
  | "STATUS_NOT_EDITABLE"

export interface TicketPendingTransferTarget {
  toDepartmentName: string
}

export interface TicketEditButtonFacts extends Omit<
  TicketEditabilityFacts,
  "hasPendingTransfer"
> {
  pendingTransfer: TicketPendingTransferTarget | null
}

export interface TicketEditButtonEditable {
  state: "editable"
}

export interface TicketEditButtonBlocked {
  state: "blocked"
  message: string
}

export interface TicketEditButtonHidden {
  state: "hidden"
}

export type TicketEditButtonState =
  TicketEditButtonEditable | TicketEditButtonBlocked | TicketEditButtonHidden

export interface TicketEditSnapshot {
  title: string
  description: string
  type: TicketType
  tagId: number | null
}

export interface TicketEditSource extends TicketEditSnapshot {
  id: number
}

export interface TicketEditValues {
  title: string
  description: string
  type: TicketType
  tagId: number
}

export interface TicketTypeChange {
  from: TicketType
  to: TicketType
}

export interface TicketTagChange {
  fromTagId: number | null
  toTagId: number
}

export interface TicketEditChanges {
  title: boolean
  description: boolean
  type: TicketTypeChange | null
  tag: TicketTagChange | null
}

export interface UpdateTicketByAuthorValues extends TicketEditValues {
  ticketId: number
  authorId: number
}

export interface TicketEditSaved {
  status: "saved"
  ticketId: number
  tagChanged: boolean
}

export interface TicketNotFound {
  status: "not_found"
}

export interface TicketNotEditable {
  status: "not_editable"
}

export interface TicketNoChanges {
  status: "no_changes"
}

export type UpdateTicketByAuthorOutcome =
  | TicketEditSaved
  | TicketNotFound
  | TicketNotEditable
  | TicketInvalidTag
  | TicketNoChanges

export interface EditTicketFormDefaults {
  ticketId: number
  title: string
  description: string
  type: TicketType
  tagId?: number
}

export interface TicketEditFormOptions {
  defaults: EditTicketFormDefaults
  tags: TagOption[]
}
```

- `TicketEditorFacts` estende `TicketViewerFacts`: o mesmo objeto serve a
  `canViewTicket` e a `canEditTicket`. Sai inteiro de `getAccountFacts()` mais o
  `actor.id`.
- `TicketDetail` satisfaz `TicketEditSource` sem conversão (`id`, `title`,
  `description`, `type`, `tagId`).
- `TicketDetail` satisfaz também `TicketEditButtonFacts` sem conversão
  (`createdBy`, `currentDepartmentId`, `status`, `pendingTransfer`, que já traz
  `toDepartmentName`).
- `TicketEditButtonState` é o estado do botão "Editar" no detalhe: `editable`
  (abre o dialog), `blocked` (visível, esmaecido; `message` vai para o toast do
  clique e para o `aria-describedby`) ou `hidden` (não renderiza).
- `TicketInvalidTag` é o já existente (`{ status: "invalid_tag" }`), reusado.
- `EditTicketFormDefaults` tem o formato de `DefaultValues<EditTicketInput>` do
  React Hook Form: `tagId` ausente deixa o campo sem seleção. É serializável
  (vai de Server para Client Component por props).

## Domínio — `app/_lib/domain/`

### `app/_lib/domain/ticket-edit.ts` (novo)

```ts
export const isAuthorEditableStatus: (status: TicketStatus) => boolean
export const ticketEditBlockFor: (
  editor: TicketEditorFacts,
  ticket: TicketEditabilityFacts,
) => TicketEditBlockReason | null
export const canEditTicket: (
  editor: TicketEditorFacts,
  ticket: TicketEditabilityFacts,
) => boolean
export const describeTicketAwaitingApproval: (
  toDepartmentName: string,
) => string
export const ticketEditButtonStateFor: (
  editor: TicketEditorFacts,
  ticket: TicketEditButtonFacts,
) => TicketEditButtonState
export const buildTicketEditFormOptions: (
  ticket: TicketEditSource,
  tags: readonly TagOption[],
) => TicketEditFormOptions
export const diffTicketEdit: (
  current: TicketEditSnapshot,
  next: TicketEditValues,
) => TicketEditChanges
export const hasTicketEditChanges: (changes: TicketEditChanges) => boolean
export const describeTicketEditNote: (changes: TicketEditChanges) => string
export const describeTicketEdited: (ticketId: number) => string
```

| Nome                             | Semântica                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `isAuthorEditableStatus`         | Tabela de flags `satisfies Record<TicketStatus, boolean>` (abaixo). Status novo no enum quebra o `tsc` até ser decidido                                                                                                                                                                                                                                                                                                                                                                          |
| `ticketEditBlockFor`             | Primeiro motivo que impede a edição, nesta ordem: editor inativo (`EDITOR_INACTIVE`); troca de senha pendente (`PASSWORD_CHANGE_REQUIRED`); não é o autor (`NOT_AUTHOR`); chamado fora do setor do editor, lido fresco do banco (`OUTSIDE_EDITOR_DEPARTMENT`); status `fechado`/`cancelado` (`TICKET_FINISHED`, via `isNonFinalTicketStatus` de `domain/ticket.ts`); transferência pendente (`AWAITING_APPROVAL`); status fora da tabela de editáveis (`STATUS_NOT_EDITABLE`). `null` = editável |
| `canEditTicket`                  | `ticketEditBlockFor(...) === null`. Mesma semântica de antes: `true` só se **todas** as condições acima valem. Assinatura inalterada; `updateTicketByAuthor` continua usando esta                                                                                                                                                                                                                                                                                                                |
| `describeTicketAwaitingApproval` | `QA Infra` → `Aguarde a solução ou devolutiva de QA Infra` (texto exato, sem ponto final). É o texto do toast e do `span` `sr-only` do botão esmaecido; o card amarelo do detalhe (`Aguardando aprovação de QA Infra`) vem de outra função e não muda                                                                                                                                                                                                                                            |
| `ticketEditButtonStateFor`       | Estado do botão no detalhe. Motivo `null` → `{ state: "editable" }`; motivo `AWAITING_APPROVAL` com `pendingTransfer` → `{ state: "blocked", message: describeTicketAwaitingApproval(pendingTransfer.toDepartmentName) }`; qualquer outro motivo → `{ state: "hidden" }`                                                                                                                                                                                                                         |
| `buildTicketEditFormOptions`     | `defaults` = valores atuais do chamado; `tagId` só quando a tag atual está entre `tags` (ativas do setor do autor). Tag inativa ou chamado sem tag → `tagId` ausente: o autor precisa escolher                                                                                                                                                                                                                                                                                                   |
| `diffTicketEdit`                 | Compara valor a valor, sem normalizar (o Zod já fez `trim` na entrada; o banco guarda o texto como foi gravado). `type` e `tag` trazem de/para; `title` e `description` só `true`/`false` (o texto antigo não é guardado)                                                                                                                                                                                                                                                                        |
| `hasTicketEditChanges`           | Algum campo mudou                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `describeTicketEditNote`         | A `note` da linha `edicao` (formato abaixo)                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `describeTicketEdited`           | Mensagem de sucesso: `Chamado #42 atualizado.`                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

Status editáveis pelo autor:

| `ticket_status`        | Editável | Por quê                                                      |
| ---------------------- | -------- | ------------------------------------------------------------ |
| `aberto`               | sim      |                                                              |
| `em_analise`           | sim      |                                                              |
| `encaminhado`          | sim      | desde que no setor do autor e sem transferência pendente     |
| `aguardando_aprovacao` | **não**  | o autor perde o controle enquanto aguarda (plano de criação) |
| `em_andamento`         | sim      |                                                              |
| `resolvido`            | sim      | janela de correções da futura feature de Conclusão           |
| `fechado`              | **não**  | imutável                                                     |
| `cancelado`            | **não**  | encerrado                                                    |

`ticketEditBlockFor` é **a** regra; `canEditTicket` e `ticketEditButtonStateFor`
derivam dela. A página usa `ticketEditButtonStateFor` para decidir o botão; a
transação de `updateTicketByAuthor` reconfere com `canEditTicket` e dados
travados. Ninguém repete as condições em SQL nem na UI.

**Por que só a transferência pendente vira botão esmaecido.** Nos demais
motivos, o chamado não é (ou não é mais) assunto do editor para edição: não é o
autor, o chamado saiu do setor dele ou foi encerrado. Na transferência pendente,
o autor continua dono e volta a poder editar se a transferência for recusada;
o botão esmaecido explica a espera, ao ser clicado, em vez de sumir sem razão. A ordem do
`ticketEditBlockFor` garante isso: autor e setor são conferidos antes, e um
chamado encerrado nunca vira `blocked`, mesmo que sobre uma transferência
pendente por inconsistência. `aguardando_aprovacao` sem transferência pendente
(inconsistência, sem setor de destino para a mensagem) cai em
`STATUS_NOT_EDITABLE` → `hidden`.

**Nota da linha `edicao`** — campos alterados, nesta ordem fixa: título,
descrição, tipo (com de → para pelos rótulos de `TICKET_TYPE_LABELS`), tag (só a
palavra; o de/para está na linha `mudanca_tag`). Junção em português (`a`,
`a e b`, `a, b e c`), prefixo `Alterou `, ponto final.

| Mudou                   | `note`                                                  |
| ----------------------- | ------------------------------------------------------- |
| título                  | `Alterou título.`                                       |
| título, descrição, tipo | `Alterou título, descrição e tipo (Dúvida → Bug).`      |
| só a tag                | `Alterou tag.`                                          |
| descrição e tag         | `Alterou descrição e tag.`                              |
| tudo                    | `Alterou título, descrição, tipo (Dúvida → Bug) e tag.` |

Os rótulos de tipo ficam congelados na nota (texto da época da edição). Nada
mudou → `hasTicketEditChanges` é `false` e a nota não é gravada (a função
devolve `Nenhuma alteração.` só por totalidade).

### `app/_lib/domain/ticket-history.ts` (alterado)

| `history_event` | Rótulo | Frase               |
| --------------- | ------ | ------------------- |
| `edicao`        | Edição | `Editou o chamado.` |

A UI já mostra a `note` abaixo da frase (contrato de Meus chamados): é ali que
aparece `Alterou título e tipo (Dúvida → Bug).`. A linha `mudanca_tag` gravada
junto usa a frase existente (`Trocou a tag de Acesso para Rede.`; chamado legado
sem tag: `Definiu a tag Rede.`).

## Validação — `app/_lib/validation/ticket.ts` (acrescido)

```ts
export const ticketIdSchema // number int > 0 e <= TICKET_ID_MAX, "Chamado inválido."
export const editTicketSchema // createTicketSchema.extend({ ticketId })
export type EditTicketInput = {
  ticketId: number
  title: string
  description: string
  type: TicketType
  tagId: number
}
```

- Mesmos campos e mensagens do `createTicketSchema` (título, descrição, tipo,
  tag), por derivação: nenhuma regra de campo é reescrita.
- Setor, status, prioridade e responsável não são editáveis e não entram no
  schema. Chave extra no envio é descartada.
- Desde a revisão de 2026-10-02 o `createTicketSchema` não tem mais
  `departmentId` (`ticket-creation.md`), então a derivação deixou de precisar do
  `omit`. Os campos da edição continuam os mesmos.
- `ticketId` sem `coerce`; vem dos `defaults`, não de campo visível.
- Autor e setor **não** estão no schema: vêm da sessão e do banco.

## `df-auth` — nada novo

`requireSession()`/`getSession()` dão `actor.id`; `getAccountFacts()` dá
`departmentId`, `isBoard`, `isActive` e `mustChangePassword` frescos.

## `df-data` — o que criar e mudar

### `app/_lib/data/tickets.ts` — `findTicketDetail` (alterado)

Selecionar também `tagId: tag.id` (nulo pelo `left join`). Nada mais muda.

### `app/_lib/data/tickets.ts` — `updateTicketByAuthor` (novo)

```ts
export async function updateTicketByAuthor(
  values: UpdateTicketByAuthorValues,
): Promise<UpdateTicketByAuthorOutcome>
```

Uma transação (`db.transaction`). Sequência, nesta ordem; cada saída antecipada
devolve o outcome **sem gravar nada**:

1. **Chamado** — `select created_by, assigned_to, current_department_id, status,
title, description, type from ticket where id = $ticketId for update`. Sem
   linha → `{ status: "not_found" }`.
2. **Autor** — `users ⋈ department` por `users.department_id`: `department_id`,
   `is_active`, `must_change_password`, `department.is_board`, `where users.id =
$authorId`, travando a linha de `users` (`for share of users`). Sem linha →
   `not_editable`.
3. **Visibilidade** — `canViewTicket({ userId, departmentId, isBoard }, chamado)`
   falso → `not_found`. Quem não vê o chamado recebe a mesma resposta de
   inexistente (igual ao 404 do detalhe).
4. **Transferência pendente** — existe `ticket_transfer` com `ticket_id =
$ticketId and status = 'pendente'`?
5. **Regra** — `canEditTicket(editor, { createdBy, currentDepartmentId, status,
hasPendingTransfer })` falso → `{ status: "not_editable" }`.
6. **Tag atual** — `select tag_id from ticket_tag where ticket_id = $ticketId`
   (zero ou uma linha).
7. **Tag escolhida** — `select department_id, is_active from tag where id =
$tagId for share`. Sem linha ou `!isUsableTicketTag(row, editor.departmentId)`
   → `{ status: "invalid_tag" }`. Vale também quando a tag não mudou mas foi
   desativada: a tag precisa ser válida no momento de salvar.
8. **Diferença** — `diffTicketEdit({ title, description, type, tagId: tagAtual },
values)`; `!hasTicketEditChanges` → `{ status: "no_changes" }`.
9. `const changedAt = new Date()` — um instante só para as escritas abaixo.
10. `update ticket set title, description, type, updated_at = changedAt where id
= $ticketId`.
11. Só se `changes.tag`: tag atual existia → `update ticket_tag set tag_id =
$tagId, created_at = changedAt where ticket_id = $ticketId`; não existia →
    `insert into ticket_tag (ticket_id, tag_id, created_at)`. A linha continua
    única (`ticket_tag_single_per_ticket_idx`).
12. `insert into ticket_history`: `event: "edicao"`, `changedBy = authorId`,
    `note = describeTicketEditNote(changes)`, `changedAt`. Demais colunas nulas.
13. Só se `changes.tag`: `insert into ticket_history`: `event: "mudanca_tag"`,
    `changedBy = authorId`, `fromTagId = changes.tag.fromTagId` (nulo em chamado
    legado), `toTagId = changes.tag.toTagId`, `changedAt`. **Depois** da `edicao`
    (o `id` maior ordena na linha do tempo).
14. `{ status: "saved", ticketId, tagChanged: changes.tag !== null }`.

Detalhes que o contrato fixa:

- **Precedência**: `not_found` → `not_editable` → `invalid_tag` → `no_changes`.
- **Travas, nesta ordem**: `ticket` (`for update`) → `users` (`for share`) →
  `tag` (`for share`). O `for update` no chamado serializa duas edições do
  mesmo chamado e qualquer escrita futura que também trave o chamado antes.
- **Dados frescos**: setor, ativo e troca de senha do autor vêm da linha de
  `users` lida na transação, nunca da sessão nem do input. A comparação usa os
  valores do chamado lidos sob a trava, não os `defaults` do dialog.
- **Regra fora da data layer**: visibilidade, editabilidade, validade da tag,
  diferença e nota vêm do domínio; a função não repete as condições em SQL.
- `status`, `priority`, `assigned_to`, `current_department_id` e
  `origin_department_id` nunca são escritos aqui.
- O texto antigo de título e descrição não é guardado em lugar nenhum.
- Exceção (violação de `CHECK`, enum sem `edicao` por migration não aplicada)
  sobe para a action. Nada é gravado: a transação é desfeita.

### Leituras do dialog — sem função nova

- Tags: `listActiveDepartmentTags(facts.departmentId)` (`app/_lib/data/tags.ts`,
  já existe). Como o chamado editável está no setor do autor, são as tags do
  setor do chamado.
- Valores atuais: `findTicketDetail` (com o `tagId` acima).

## `df-actions` — o que criar

### `app/_lib/actions/tickets.ts` (acrescido, `"use server"`)

```ts
export type EditTicketErrorCode =
  "INVALID_INPUT" | "FORBIDDEN" | "NOT_FOUND" | "INVALID_TAG" | "NO_CHANGES"

export interface EditTicketSuccess {
  ok: true
  message: string
}

export interface EditTicketFailure {
  ok: false
  message: string
  code?: EditTicketErrorCode
}

export type EditTicketResult = EditTicketSuccess | EditTicketFailure

export const editTicket: (input: EditTicketInput) => Promise<EditTicketResult>
```

Tipos próprios, sem alargar `TicketErrorCode`/`TicketActionFailure` da criação
(o `createTicket` continua sem poder devolver `NO_CHANGES`).

Sequência:

1. `const actor = await getSession()`; `null` → `FORBIDDEN` (sem sessão).
2. `editTicketSchema.safeParse(input)`; inválido → `INVALID_INPUT` com a primeira
   `issue.message`.
3. `try`: `updateTicketByAuthor({ ...parsed.data, authorId: actor.id })`.
   `catch` → `console.error("[editTicket]", error)` e falha inesperada, sem
   `code`.
4. Traduz o outcome (tabela). `saved` →
   `revalidatePath(ticketDetailPath(ticketId))`,
   `revalidatePath(MY_TICKETS_PATH)` e, só se `tagChanged`,
   `revalidatePath("/dashboard")` (a tag ofensora do Início pode mudar; título,
   descrição e tipo não aparecem lá).

**Autor vem da sessão; setor e permissão, do banco.** `authorId` é `actor.id`.
A action não lê `getAccountFacts` nem decide permissão: a transação lê o autor
sob trava e aplica `canEditTicket`. Nenhum SQL na action.

| Situação         | `code`          | Mensagem                                                            |
| ---------------- | --------------- | ------------------------------------------------------------------- |
| salvo            | —               | `describeTicketEdited` → `Chamado #42 atualizado.`                  |
| sem sessão       | `FORBIDDEN`     | `Você não tem permissão para editar este chamado.`                  |
| schema falhou    | `INVALID_INPUT` | primeira `issue.message` do Zod                                     |
| `not_found`      | `NOT_FOUND`     | `Chamado não encontrado.`                                           |
| `not_editable`   | `FORBIDDEN`     | `Você não pode editar este chamado.`                                |
| `invalid_tag`    | `INVALID_TAG`   | `Esta tag não está disponível. Escolha uma tag ativa do seu setor.` |
| `no_changes`     | `NO_CHANGES`    | `Nenhuma alteração para salvar.`                                    |
| falha inesperada | —               | `Não foi possível salvar o chamado agora. Tente novamente.`         |

O texto de `INVALID_TAG` é o mesmo da criação: uma constante só no arquivo.

Sem e-mail.

## `df-ui` — o que criar e mudar

### Estrutura

```
app/(app)/tickets/[id]/page.tsx                                   alterado — decide o botão, carrega as tags
app/(app)/tickets/[id]/_components/ticket-detail-header.tsx        alterado — espaço para a ação
app/(app)/tickets/[id]/_components/edit-ticket-dialog.tsx          novo — "use client", botão + Dialog + formulário
app/(app)/tickets/[id]/_components/edit-ticket-blocked-button.tsx  novo — "use client", botão esmaecido + toast no clique
```

O gatilho "Editar" (`Button` `variant="outline"` + `PencilIcon` + `Editar`) é o
mesmo nos dois componentes. Se for extraído para um componente da rota (como
`NewTicketButton` com a prop `blocked`), os dois o usam; a decisão é do `df-ui`.

`ticket-timeline.tsx` não muda: rótulo e frase de `edicao` vêm do domínio, e a
`note` já é exibida.

### `/tickets/[id]` — `page.tsx`

```tsx
const editor: TicketEditorFacts = {
  userId: actor.id,
  departmentId: facts.departmentId,
  isBoard: facts.isBoard,
  isActive: facts.isActive,
  mustChangePassword: facts.mustChangePassword,
}
if (!canViewTicket(editor, ticket)) notFound()

const editButton = ticketEditButtonStateFor(editor, ticket)
const editOptions =
  editButton.state === "editable"
    ? buildTicketEditFormOptions(
        ticket,
        await listActiveDepartmentTags(facts.departmentId),
      )
    : null
```

A ação do cabeçalho (ao lado do título no desktop, abaixo dele no mobile), por
`editButton.state`:

| `state`    | Renderiza                                                        |
| ---------- | ---------------------------------------------------------------- |
| `editable` | `<EditTicketDialog options={editOptions} />`                     |
| `blocked`  | `<EditTicketBlockedButton message={editButton.message} />`       |
| `hidden`   | nada: sem botão (não-autor, outro setor, `fechado`, `cancelado`) |

- A página não chama mais `canEditTicket` direto: `ticketEditButtonStateFor` já
  a contém. Nenhuma condição (`status`, `pendingTransfer`, autor) é testada na
  página.
- As tags só são lidas no estado `editable`.
- Narrowing por `editButton.state` (união discriminada); `editOptions` só é
  usado no ramo `editable`. Se o narrowing não alcançar `editOptions` por estar
  em outra variável, montar o JSX dentro do mesmo ramo, sem `!` nem `as`.

### `EditTicketBlockedButton` (`"use client"`)

Props: `message: string`. Mesmo comportamento do `NewTicketBlockedButton`; a
referência completa está em `docs/contracts/ticket-creation.md`, seção
"Comportamento do botão de ação bloqueada". A peça
`app/_components/blocked-action-tooltip.tsx` deixa de existir. Em resumo:

- Gatilho com o mesmo visual do "Editar" ativo, esmaecido (`opacity-50`,
  `cursor-not-allowed`, sem efeito de hover), como `<button type="button"
aria-disabled="true">`. **Não** usar `disabled` nativo: o botão precisa
  continuar focável e receber o clique.
- **Hover e foco:** nada aparece. Sem `Tooltip`, `Popover` nem atributo
  `title`.
- **Clique, toque, `Enter`/`Espaço`:** o `onClick` do botão chama
  `toast.info(message, { id })`, com `id` estável (`useId`) para cliques
  repetidos não empilharem toasts. O foco continua no botão.
- **Leitor de tela:** `span` `sr-only` permanente com a mensagem, `id` via
  `useId`, apontado pelo `aria-describedby` do botão: anuncia "Editar, botão,
  indisponível" seguido da mensagem.
- **Nunca age:** em nenhuma entrada o botão abre o dialog de edição ou chama
  action. Não há `EditTicketDialog` nem formulário montado neste estado (a
  página não lê as tags).
- Texto exato: `Aguarde a solução ou devolutiva de {setor}`, sem ponto final,
  com `{setor}` = setor de destino da transferência pendente — vem pronto de
  `editButton.message`; a UI não monta nem formata a frase.
- O card amarelo de transferência pendente do detalhe
  (`Aguardando aprovação de {setor}`) continua como está.

### `EditTicketDialog` (`"use client"`)

Props: `options: TicketEditFormOptions`.

- Gatilho: `Button` `variant="outline"`, ícone `PencilIcon` (`aria-hidden`),
  texto `Editar`.
- `DialogTitle` `Editar chamado #42` (`formatTicketNumber`). **Sem**
  `DialogDescription` (retirada pelo usuário em 2026-10-02, intencional). Sem
  descrição, o Radix avisa no console (`Missing Description or
aria-describedby={undefined} for {DialogContent}`): o `DialogContent` recebe
  `aria-describedby={undefined}` para declarar que o dialog não tem descrição.
  Nenhum outro elemento do formulário substitui a descrição.
- `useForm<EditTicketInput>({ resolver: zodResolver(editTicketSchema),
defaultValues: options.defaults })`. **Ao abrir**, `form.reset(options.defaults)`:
  depois de salvar, a página volta com valores novos e o próximo "Editar" precisa
  partir deles, não do rascunho anterior. Fechar descarta o rascunho.
- `ticketId` vai nos `defaults`; não há campo para ele.
- Campos, nesta ordem, com o mesmo padrão do `NewTicketDialog` (`Controller`,
  `Field`, `FieldLabel`, `FieldError`, `aria-invalid`, `aria-describedby`):

  | Campo     | Componente | Opções / padrão                                                                         |
  | --------- | ---------- | --------------------------------------------------------------------------------------- |
  | Título    | `Input`    | valor atual                                                                             |
  | Descrição | `Textarea` | valor atual                                                                             |
  | Tipo      | `Select`   | `TICKET_TYPES` com `TICKET_TYPE_LABELS`; valor atual                                    |
  | Tag       | `Combobox` | `options.tags`, busca `Buscar tag…`; valor atual quando `options.defaults.tagId` existe |

- Com `options.defaults.tagId` ausente, `FieldDescription` no campo Tag:
  `A tag atual não está disponível. Escolha uma tag ativa do seu setor.`
- Os quatro campos são os mesmos do `NewTicketDialog`. Se der para extrair os
  renderizadores para `app/(app)/_components/` sem `as` (o `Control` do React
  Hook Form é invariante no tipo do formulário), extraia; senão, repita a
  marcação. A regra de campo não se repete em nenhum caso: vem do schema.
- Rodapé: `Cancelar` (fecha e descarta) e `Salvar alterações`
  (`Salvando…` com `Loader2Icon` enquanto `isSubmitting`; ambos desabilitados
  durante o envio). O botão de salvar fica habilitado mesmo sem mudança: quem
  decide "nada mudou" é o servidor.
- Submit chama `editTicket(values)`:
  - `ok` → `toast.success(result.message)`, fecha. Sem `router.refresh()`: o
    `revalidatePath` da action atualiza a página.
  - `NO_CHANGES` → `toast.info(result.message)`, fecha.
  - `INVALID_TAG` → `setError("tagId", { message }, { shouldFocus: true })` e
    `router.refresh()` (a lista de tags pode estar velha).
  - `FORBIDDEN` ou `NOT_FOUND` → `toast.error(result.message)`, fecha e
    `router.refresh()` (o botão some, ou a página vira 404).
  - `INVALID_INPUT` → `toast.error(result.message)`.
  - sem `code` → `toast.error(result.message)`, dialog aberto, valores mantidos.
- Client Component: importa só `app/_lib/domain`, `app/_lib/validation`,
  `app/_lib/types` e a action.

### Linha do tempo

Nada a codar. Uma edição aparece como item **Edição** · autor · data/hora ·
`Editou o chamado.` com a nota (`Alterou título e tipo (Dúvida → Bug).`) no
quadro de nota; se a tag mudou, logo abaixo o item **Mudança de tag** com
`Trocou a tag de X para Y.` (mesmo instante, ordenado pelo `id`).

## Riscos

1. **Migration não aplicada** → toda edição falha como erro inesperado; nada
   gravado. A `0008` precisa estar aplicada antes do teste.
2. **Texto antigo perdido**: o histórico diz **que** título/descrição mudaram,
   não **de quê**. Decidido.
3. **Setor sem tag ativa**: o autor vê "Editar", mas a lista de tags vem vazia e
   o formulário não salva (`Selecione a tag.`). Raro (o setor precisou de tag
   para o chamado nascer); o admin do setor resolve cadastrando uma tag.
4. **Autor trocado de setor** perde a edição dos chamados que ficaram no setor
   antigo (a regra pede chamado no setor atual do autor). Decidido.
5. **Convenção de trava para as próximas features**: quem criar ou mudar
   `ticket_transfer` de um chamado existente (Aprovações, encaminhamento) trava
   antes a linha de `ticket` (`for update`). Sem isso, uma edição e um pedido de
   transferência simultâneos podem passar os dois.
6. **Trava em `users`**: o `for share` no autor segura por milissegundos a
   gravação de `last_login_at` de um login simultâneo da mesma pessoa. Aceito.
7. **Duas abas da mesma pessoa**: a segunda edição espera a trava e compara com
   o valor já gravado pela primeira; a última vence, as duas ficam no histórico.
8. **Nomes atuais na linha do tempo**: `mudanca_tag` mostra o nome atual das
   tags; a nota de `edicao` guarda o rótulo do tipo da época.
9. **Título com emoji no limite** (mesmo risco 6 da criação): passa no Zod e
   falha no `CHECK` como erro inesperado.
10. **Nome do valor em português** (`edicao`), no padrão atual do enum.

## Cenários para o `df-qa`

Usuários e setores de `docs/contracts/qa-seed.md`. Títulos e tags criados
começam com `[QA]`. **Não editar #65 a #68**: são referência de
`docs/contracts/my-tickets.md` (linha do tempo do #65 tem um item só). A bateria
usa um chamado novo, `#E` abaixo.

Preparação (como QA Admin Suporte): QA Suporte com **duas** tags ativas,
`[QA] Acesso` e `[QA] Edição B` (criar ou reativar); QA Infra com `[QA] Rede`
ativa. Depois, como QA Membro Suporte: "Novo chamado" `[QA] Edição base`, tipo
Dúvida, tag `[QA] Acesso` → `#E` (`aberto`; desde 2026-10-02 a criação não tem
setor de destino). Anotar
`max(id)` de `ticket_history` antes de cada cenário que diz "nada gravado".

| #   | Quem                 | Ação                                                                                                                                                                                 | Esperado                                                                                                                                                                                                                                                                                                                |
| --- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | QA Membro Suporte    | abrir `/tickets/E`                                                                                                                                                                   | botão "Editar" no cabeçalho                                                                                                                                                                                                                                                                                             |
| 2   | QA Membro Suporte    | "Editar"                                                                                                                                                                             | dialog "Editar chamado #E" com título, descrição, tipo Dúvida e tag `[QA] Acesso` preenchidos; sem campo de setor, status, prioridade ou responsável; "Cancelar" fecha sem gravar                                                                                                                                       |
| 3   | QA Membro Suporte    | título `[QA] Edição base alterada`, nova descrição, tipo Bug → "Salvar alterações"                                                                                                   | toast `Chamado #E atualizado.`; dialog fecha; cabeçalho, Tipo e descrição atualizados; último item da linha do tempo "Edição" · QA Membro Suporte · data/hora · `Editou o chamado.` com nota `Alterou título, descrição e tipo (Dúvida → Bug).`                                                                         |
| 4   | banco, só leitura    | depois do 3                                                                                                                                                                          | uma linha nova em `ticket_history` (`event = 'edicao'`, `changed_by` = membro, `note` igual à da tela, demais colunas nulas); `ticket.updated_at` = `changed_at` dessa linha; nenhuma `mudanca_tag`; `ticket_tag` do #E inalterado; `status`, `priority`, `current_department_id` inalterados                           |
| 5   | QA Membro Suporte    | "Editar" de novo                                                                                                                                                                     | dialog abre com os valores do cenário 3 (não os originais)                                                                                                                                                                                                                                                              |
| 6   | QA Membro Suporte    | trocar só a tag para `[QA] Edição B` → salvar                                                                                                                                        | toast de sucesso; linha do tempo ganha "Edição" com nota `Alterou tag.` e, logo abaixo, "Mudança de tag" `Trocou a tag de [QA] Acesso para [QA] Edição B.`; campo Tag do detalhe e a linha do #E em Meus chamados mostram `[QA] Edição B`                                                                               |
| 7   | banco, só leitura    | depois do 6                                                                                                                                                                          | duas linhas novas com o mesmo `changed_at`: `edicao` e, com `id` maior, `mudanca_tag` (`from_tag_id` = `[QA] Acesso`, `to_tag_id` = `[QA] Edição B`); `ticket_tag` do #E com uma linha só, `tag_id` = `[QA] Edição B`                                                                                                   |
| 8   | QA Membro Suporte    | "Editar" → "Salvar alterações" sem mudar nada                                                                                                                                        | toast `Nenhuma alteração para salvar.`; dialog fecha; `max(id)` de `ticket_history` e `ticket.updated_at` do #E inalterados                                                                                                                                                                                             |
| 9   | QA Membro Suporte    | acrescentar espaços no começo e no fim do título → salvar                                                                                                                            | igual ao 8 (o `trim` torna o valor igual)                                                                                                                                                                                                                                                                               |
| 10  | QA Membro Suporte    | título `ab`, descrição `curta` → salvar                                                                                                                                              | erros nos campos com os textos da criação; nenhum request da action                                                                                                                                                                                                                                                     |
| 11  | QA Membro Suporte    | forjar `tagId` = id de `[QA] Rede` no payload da action                                                                                                                              | `Esta tag não está disponível. Escolha uma tag ativa do seu setor.` no campo Tag, com foco no gatilho e `aria-invalid="true"`; nada gravado                                                                                                                                                                             |
| 12  | QA Admin Suporte     | abrir `/tickets/E` (mesmo setor, não é autor)                                                                                                                                        | detalhe abre; **sem** botão "Editar"                                                                                                                                                                                                                                                                                    |
| 13  | QA Admin Suporte     | criar `[QA] Edição admin` no próprio setor, abrir o dialog de edição dele e forjar `ticketId` = E no payload                                                                         | toast `Você não pode editar este chamado.`; nada gravado no #E                                                                                                                                                                                                                                                          |
| 14  | QA Membro Suporte    | abrir `/tickets/66` (aguardando aprovação); depois, do dialog do #E, forjar `ticketId` = 66                                                                                          | no #66, botão "Editar" **esmaecido** (cenários 21–24); a action devolve `Você não pode editar este chamado.`; nada gravado no #66                                                                                                                                                                                       |
| 15  | QA Admin Infra       | criar `[QA] Edição infra` em QA Infra; do dialog dele, forjar `ticketId` = E, depois `ticketId` = 999999                                                                             | os dois devolvem `Chamado não encontrado.` (o #E não é visível para ele: mesma resposta de inexistente); nada gravado                                                                                                                                                                                                   |
| 16  | Diretor              | abrir `/tickets/E`; abrir um chamado próprio `aberto` do seed demo; abrir um `fechado` e um `cancelado` próprios                                                                     | #E sem botão (não é autor); o próprio `aberto` **com** botão; `fechado` e `cancelado` sem botão, nem esmaecido. **Não salvar** nada na Diretoria                                                                                                                                                                        |
| 17  | QA Membro + Diretor  | membro abre o dialog do #E; Diretor move o membro para QA Infra (Cadastros → Pessoas); membro salva uma mudança                                                                      | toast `Você não pode editar este chamado.`; dialog fecha; a página recarrega sem o botão (o membro ainda vê o detalhe, como autor); nada gravado. Ao fim, Diretor move o membro de volta para QA Suporte                                                                                                                |
| 18  | QA Admin + QA Membro | admin desativa `[QA] Edição B` (tag atual do #E); membro abre "Editar"                                                                                                               | campo Tag sem seleção e com `A tag atual não está disponível. Escolha uma tag ativa do seu setor.`; salvar sem escolher → `Selecione a tag.`; escolher `[QA] Acesso` → salva (`edicao` + `mudanca_tag` de `[QA] Edição B` para `[QA] Acesso`). Ao fim, reativar `[QA] Edição B`                                         |
| 19  | banco, só leitura    | `select enum_range(null::history_event)`; `select ticket_id from ticket_tag group by ticket_id having count(*) > 1`                                                                  | contém `edicao`; nenhuma linha                                                                                                                                                                                                                                                                                          |
| 20  | qualquer             | navegar pelos cenários                                                                                                                                                               | nenhum erro nem aviso de hidratação no dev server (MCP `next-devtools`)                                                                                                                                                                                                                                                 |
| 21  | QA Membro Suporte    | desktop, mouse: abrir `/tickets/66` (autor; `aguardando_aprovacao`, transferência pendente para QA Infra); passar o mouse sobre "Editar" e esperar 2 s; tirar o mouse                | card amarelo `Aguardando aprovação de QA Infra` igual a antes; botão "Editar" visível no cabeçalho, esmaecido (`aria-disabled="true"`, sem atributo `disabled` nem `title`); com o mouse em cima, **nada** aparece (nenhum tooltip, popover ou toast no DOM)                                                            |
| 22  | QA Membro Suporte    | desktop, mouse: no #66, clicar "Editar"; depois clicar mais duas vezes seguidas                                                                                                      | o primeiro clique mostra um toast com o texto exato `Aguarde a solução ou devolutiva de QA Infra`; os cliques seguintes não empilham toasts (no máximo um toast com a mensagem visível); dialog "Editar chamado #66" **não** abre; nenhum request de action                                                             |
| 23  | QA Membro Suporte    | só teclado: no #66, chegar ao "Editar" com `Tab` e esperar 2 s; `Enter`; esperar o toast sumir; `Espaço`; inspecionar a árvore de acessibilidade                                     | o foco chega ao botão e **nada** aparece além do anel de foco; `Enter` mostra o toast com o texto exato; `Espaço` também; o dialog não abre; o foco continua no botão; nome acessível `Editar` e `aria-describedby` apontando para um elemento `sr-only` presente no DOM com a mensagem exata; nenhum request de action |
| 24  | QA Membro Suporte    | viewport móvel com toque emulado (Playwright: contexto com `hasTouch: true`, `isMobile: true`, 390×844; usar `tap`): no #66, tocar em "Editar"                                       | botão abaixo do título; o toque mostra o toast com o texto exato; o dialog não abre; nenhum request de action                                                                                                                                                                                                           |
| 25  | banco, só leitura    | depois de 21–24 (anotar antes `max(id)` de `ticket_history` e `updated_at` do #66)                                                                                                   | `max(id)` de `ticket_history` e `ticket.updated_at` do #66 inalterados; `ticket_tag` do #66 inalterado; nada gravado                                                                                                                                                                                                    |
| 26  | QA Admin Suporte     | abrir `/tickets/66` (mesmo setor, não é autor); depois, como QA Membro Suporte, repetir 21 e 22 no #68 ou em outro chamado próprio `aguardando_aprovacao` com transferência pendente | admin: detalhe abre, **sem** botão "Editar" (nem esmaecido); idem para o Diretor no #66. Membro: mesmo comportamento do 21 e do 22, com o nome do setor de destino daquele chamado no toast (`Aguarde a solução ou devolutiva de {setor}`)                                                                              |

O cenário 17 é opcional se a troca de setor no meio do dialog não puder ser
coordenada; nesse caso, registrar como não executado.

Desde a revisão de 2026-10-02 a criação não gera mais chamado
`aguardando_aprovacao` com transferência pendente. Os cenários 14 e 21–26 usam
só os legados de QA Membro Suporte (#66, #68 e, nos testes de 2026-10-01,
#70), em leitura. `fechado` e `cancelado`
próprios continuam **sem** botão, nem esmaecido: é o cenário 16. Os cenários
21–24 são a versão desta tela da bateria 14a–14g de
`docs/contracts/ticket-creation.md`; o comportamento é o mesmo, então uma falha
em um lado provavelmente aparece no outro. "Request de action" = `POST` com
cabeçalho `Next-Action` na aba de rede. Use `force: true` em hover, clique e
toque no botão esmaecido: a ferramenta de navegador recusa a ação em elemento
`aria-disabled` sem ele.

## Critério de pronto

1. Cenários 1–26 aprovados pelo `df-qa` (17 pode ficar como não executado).
2. Nenhuma edição grava fora de `ticket`, `ticket_tag` e `ticket_history`;
   `status`, `priority`, `assigned_to` e setores nunca mudam por esta action.
3. `npx tsc --noEmit`, `npm run lint` e `npm run build` passam; `df-reviewer`
   sem bloqueante.

## Checklist de encerramento da feature

- [x] `edicao` em `history_event`, migration `0008_ticket_edit`, tipos, `canEditTicket` e demais funções de `domain/ticket-edit.ts`, rótulo e frase de `edicao`, `editTicketSchema`, `TicketDetail.tagId` (`df-architect`)
- [ ] `tagId` em `findTicketDetail`; `updateTicketByAuthor` em `app/_lib/data/tickets.ts` (`df-data`)
- [ ] `editTicket` em `app/_lib/actions/tickets.ts` (`df-actions`)
- [x] `ticketEditBlockFor`, `ticketEditButtonStateFor`, `describeTicketAwaitingApproval`, `TicketEditButtonState` e afins; `canEditTicket` derivada do motivo (`df-architect`)
- [ ] botão e `EditTicketDialog` no detalhe (`df-ui`)
- [ ] página por `ticketEditButtonStateFor` e `EditTicketBlockedButton` no estado `blocked` (`df-ui`)
- [x] `describeTicketAwaitingApproval` → `Aguarde a solução ou devolutiva de {setor}` (`df-architect`)
- [ ] botão esmaecido sem nada no hover/foco, toast com `editButton.message` no clique, toque e `Enter`/`Espaço`, `aria-describedby` para `span` `sr-only`; `app/_components/blocked-action-tooltip.tsx` removido (`df-ui`)
- [ ] `npm run db:migrate` aplicado pelo usuário
- [ ] cenários do `df-qa`
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm run build`
