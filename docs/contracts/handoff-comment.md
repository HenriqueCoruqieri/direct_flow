# Contrato — Comentário na troca de destinatário

Etapa 3 do plano `docs/plans/assignee-edit-and-handoff-comment.md` (item 5 do
escopo; decisões do usuário lá, não repetidas aqui). Este documento é a
referência técnica: assinaturas, sequências e cenários. Ordem das ondas:
`df-architect` → `df-data` → `df-actions` → `df-ui` → `df-reviewer` → `df-qa`.

Ele **altera** contratos anteriores, que continuam valendo no que não é tocado
aqui e trazem uma revisão de 2026-10-12 (comentário na troca) apontando para cá:

- `docs/contracts/department-transfer.md` — `request_reason` deixa de ser nulo;
  todo envio para outro setor exige comentário
- `docs/contracts/department-queue.md` — o "Enviar" exige comentário; texto do
  diálogo
- `docs/contracts/ticket-assignee.md`, `docs/contracts/queue-default-and-comment-edit.md`,
  `docs/contracts/assignee-edit-and-assume.md` — trocar o destinatário pelo
  "Editar" exige comentário
- `docs/contracts/ticket-resolution.md` — o card Conclusão de um chamado
  aguardando aprovação passa a mostrar o comentário do envio

Versões observadas: `next@16.3.5`, `drizzle-orm@0.45.2`, `zod@4.6.5`,
`react-hook-form@7.88`.

> Revisão de 2026-10-12 (apontamento do `df-reviewer`, decisão do
> orquestrador, KISS): o desvio de `INVALID_INPUT` para o campo Comentário nos
> dois diálogos de envio **sai**. O `zodResolver` já valida o mesmo
> `handoffCommentSchema` antes do `onSubmit`, então o servidor só recusa o
> comentário com payload forjado, e o desvio nunca disparava. O tratamento de
> `INVALID_INPUT` volta ao anterior: na Fila, erro no campo Destinatário; no
> envio para outro setor, toast. Para payload forjado, a mensagem no
> Destinatário ou em toast é aceita (HC7 e HC17). A edição não muda (código
> próprio `HANDOFF_COMMENT_REQUIRED`).

## Escopo técnico em uma frase

Sem schema e sem migration: os três caminhos em que alguém passa o chamado a
outra pessoa, fila ou setor recebem um comentário obrigatório, validado por um
schema só (`handoffCommentSchema`), que a função de dados grava como `message`
`publica` na mesma transação e com o mesmo instante da troca; no envio para
outro setor o texto vai também para `ticket_transfer.request_reason`. Sem
e-mail.

## Os três caminhos

| Caminho                          | Quem                                       | Action                   | Função de dados                 | Campo            | Exigido quando                                 | Grava                                                  |
| -------------------------------- | ------------------------------------------ | ------------------------ | ------------------------------- | ---------------- | ---------------------------------------------- | ------------------------------------------------------ |
| "Enviar para outro setor"        | despachante do setor atual ou destinatário | `sendTicketToDepartment` | `requestTicketTransfer`         | `comment`        | sempre (schema)                                | `message` `publica` + `ticket_transfer.request_reason` |
| "Enviar" da Fila                 | admin do setor ou diretoria                | `sendTicket`             | `assignTicket` (`mode: "send"`) | `comment`        | sempre (schema)                                | `message` `publica`                                    |
| Campo "Destinatário" no "Editar" | destinatário atual (ADR 017)               | `editTicket`             | `updateTicketByAssignee`        | `handoffComment` | o destinatário muda (`requiresHandoffComment`) | `message` `publica`                                    |

**Não pedem comentário:** "Assumir" (Fila e detalhe), "Atender" (início e
aceite de transferência), resolver. A recusa continua com o motivo obrigatório
dela (`reason`, mesmas mensagens), que já vira comentário público.

## Decisões do arquiteto (não fixadas no plano)

| Tema                                                    | Decisão                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Um schema, quatro usos                                  | `commentTextSchema({ required, tooLong })` (novo, `validation/comment-text.ts`) é a única definição de "texto de comentário": `trim`, `TICKET_COMMENT_MIN_LENGTH` (1) e `TICKET_COMMENT_MAX_LENGTH` (5000). `handoffCommentSchema` é ele com as mensagens da troca; `ticketCommentContentSchema` (comentário comum) e o `reason` da recusa passam a ser ele com as **mesmas mensagens de antes**. Nenhum texto visível da recusa ou do comentário comum muda                     |
| Nome do campo                                           | `comment` nos dois diálogos (o formulário só tem destino e comentário). `handoffComment` na edição, onde o formulário já tem título, descrição e solução e o nome genérico confundiria                                                                                                                                                                                                                                                                                           |
| Obrigatoriedade na edição                               | O schema de edição não conhece o destinatário atual, então `handoffComment` é **opcional** no schema e exigido pela função de dados (`comment_required`) quando `requiresHandoffComment(changes)`. O cliente espelha com `isHandoffAssigneeChange(defaults.assigneeId, assigneeId)`: o campo só existe quando o destinatário escolhido difere do inicial, e enquanto existe o schema o exige (vazio falha no `min`)                                                              |
| Por que a regra da edição é `changes.assignee !== null` | Só o destinatário atual edita (ADR 017), então toda troca pelo "Editar" vai para **outra pessoa ou para a fila**; nunca para quem edita. "Mudou o destinatário" já é "passou o chamado a terceiro"                                                                                                                                                                                                                                                                               |
| Comentário sem troca, na edição                         | Ignorado: nada é gravado em `message` e o resultado é o mesmo de sem comentário (`saved` ou `no_changes`). Só acontece com payload forjado ou cliente divergente (o campo some e é desregistrado quando o destinatário volta ao inicial)                                                                                                                                                                                                                                         |
| "Enviar" da Fila para si mesmo                          | O admin pode escolher a si no "Enviar" (alvo `actor`, vira `em_andamento`). O comentário é exigido do mesmo jeito: o schema é estático e, quando o chamado estava com um colega, é esse colega quem perde o chamado e precisa saber por quê. Para pegar um chamado da fila sem comentário existe o "Assumir"                                                                                                                                                                     |
| Onde o texto mora                                       | `message` (`visibility = 'publica'`, `user_id` = quem agiu), como o motivo da recusa. **Sem** `note` em `ticket_history`: repetir o texto na linha do tempo duplicaria a tela (mesma decisão da recusa)                                                                                                                                                                                                                                                                          |
| `request_reason`                                        | Recebe o **mesmo** texto, já com `trim`. É o registro da solicitação: não acompanha edição nem exclusão posterior do comentário (como o `review_note` da recusa)                                                                                                                                                                                                                                                                                                                 |
| Quadro "aguardando aprovação"                           | **Confirmado como desejado** (critério de pronto do plano). Com `request_reason` preenchido, `describeTransferAwaitingConclusion` devolve o texto e o card Conclusão mostra o comentário no lugar de `Aguardando aprovação de {destino}`; o aviso amarelo (`PendingTransferNotice`) mantém o título `Aguardando aprovação de {destino}`, `Solicitada por …` e mostra o texto abaixo. O nome do destino continua visível na página. Nenhum código de domínio ou UI muda para isso |
| Mesmo instante                                          | A `message` usa `created_at = updated_at = changedAt`, o mesmo `changedAt` das linhas de `ticket_history` e de `ticket_transfer` do ato. Sem `(editado)` na mensagem nova                                                                                                                                                                                                                                                                                                        |
| Ordem dos inserts                                       | `message` **primeiro**, antes do `update ticket`, como em `rejectTicketTransfer`. As tabelas são exibidas separadas (comentários × linha do tempo), então a ordem só fixa o padrão                                                                                                                                                                                                                                                                                               |
| `ticket.updated_at`                                     | Já muda pelo ato; a mensagem não muda nada a mais                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Quem perde acesso ao enviar                             | Quem envia para outro setor e deixa de ver o chamado continua autor do comentário; não o vê mais (regra de visibilidade de sempre)                                                                                                                                                                                                                                                                                                                                               |
| Código de erro novo                                     | `editTicket` ganha `HANDOFF_COMMENT_REQUIRED` (em vez de `INVALID_INPUT`) para a UI marcar o campo certo sem adivinhar qual entrada falhou                                                                                                                                                                                                                                                                                                                                       |
| ADR                                                     | Não há: a decisão de produto está no plano, e o desenho reaproveita o padrão da recusa (comentário público na mesma transação)                                                                                                                                                                                                                                                                                                                                                   |

## Tabelas, enums e migration

Nenhuma mudança de schema, nenhuma migration.

| Tabela            | Uso novo                                                                                      |
| ----------------- | --------------------------------------------------------------------------------------------- |
| `message`         | `insert` `publica` nos três caminhos (`ticket_id`, `user_id`, `content`, `visibility`, datas) |
| `ticket_transfer` | envio para outro setor: `request_reason` = comentário (era sempre nulo)                       |

## Tipos — `app/_lib/types/`

### `ticket-transfer.ts` (alterado)

```ts
export interface RequestTicketTransferValues {
  ticketId: number
  actorId: number
  toDepartmentId: number
  expectedDepartmentId: number
  comment: string
}

export interface SendToDepartmentFormDefaults {
  ticketId: number
  expectedDepartmentId: number
  toDepartmentId?: number
  comment: string
}
```

### `ticket-assignment.ts` (alterado)

```ts
export interface SendTicketValues {
  mode: "send"
  ticketId: number
  actorId: number
  assigneeId: number
  expectedAssigneeId: number | null
  comment: string
}

export interface SendTicketFormDefaults {
  ticketId: number
  expectedAssigneeId: number | null
  assigneeId?: number
  comment: string
}
```

`AssumeTicketValues` não muda (sem comentário).

### `ticket-edit.ts` (alterado)

```ts
export interface UpdateTicketByAssigneeValues extends TicketEditValues {
  ticketId: number
  editorId: number
  handoffComment?: string
}

export interface TicketHandoffCommentRequired {
  status: "comment_required"
}

export type UpdateTicketByAssigneeOutcome =
  | TicketEditSaved
  | TicketNotFound
  | TicketNotEditable
  | TicketInvalidTag
  | TicketInvalidAssignee
  | TicketNoChanges
  | TicketHandoffCommentRequired
```

`EditTicketFormDefaults` **não** ganha `handoffComment`: o campo nasce quando
aparece (ver UI). `TicketEditValues` não muda (o comentário não entra em
`diffTicketEdit`).

## Validação — `app/_lib/validation/`

### `comment-text.ts` (novo)

```ts
export const commentTextSchema: (messages: {
  required: string
  tooLong: string
}) => z.ZodString

export const handoffCommentSchema = commentTextSchema({
  required: HANDOFF_COMMENT_REQUIRED_MESSAGE,
  tooLong: HANDOFF_COMMENT_TOO_LONG_MESSAGE,
})
```

| Entrada                     | Resultado                                                |
| --------------------------- | -------------------------------------------------------- |
| ausente, não string         | `Escreva um comentário para quem vai receber o chamado.` |
| `""`, só espaços            | `Escreva um comentário para quem vai receber o chamado.` |
| 5001 caracteres após `trim` | `O comentário precisa ter no máximo 5000 caracteres.`    |
| 1 a 5000 após `trim`        | o texto **com `trim`**                                   |

### Schemas alterados

```ts
export const sendTicketToDepartmentSchema = z
  .object({
    ticketId,
    toDepartmentId,
    expectedDepartmentId,
    comment: handoffCommentSchema,
  })
  .refine(...)
export type SendTicketToDepartmentInput = z.infer<typeof sendTicketToDepartmentSchema>

export const sendTicketSchema = z
  .object({
    ticketId,
    assigneeId,
    expectedAssigneeId,
    comment: handoffCommentSchema,
  })
  .refine(...)
export type SendTicketInput = z.infer<typeof sendTicketSchema>

export const editTicketSchema = createTicketSchema.extend({
  ticketId,
  solution: ticketSolutionSchema.optional(),
  handoffComment: handoffCommentSchema.optional(),
})
export type EditTicketInput = z.infer<typeof editTicketSchema>
```

Refatorados sem mudança visível: `ticketCommentContentSchema`
(`validation/ticket-comments.ts`, `Escreva o comentário.` / `O comentário
precisa ter no máximo 5000 caracteres.`) e `declineTicketTransferSchema.reason`
(`Escreva o motivo da recusa.` / `O motivo precisa ter no máximo 5000
caracteres.`). `assumeTicketSchema`, `attendTicketSchema`,
`acceptTicketTransferSchema` e `createTicketSchema` não mudam.

## Domínio — `app/_lib/domain/`

### `ticket-handoff.ts` (novo)

```ts
export const HANDOFF_COMMENT_LABEL = "Comentário"
export const HANDOFF_COMMENT_PLACEHOLDER =
  "Explique o motivo da troca e o que quem recebe precisa saber."
export const HANDOFF_COMMENT_DESCRIPTION =
  "O texto vira um comentário público no chamado."
export const HANDOFF_COMMENT_REQUIRED_MESSAGE =
  "Escreva um comentário para quem vai receber o chamado."
export const HANDOFF_COMMENT_TOO_LONG_MESSAGE =
  "O comentário precisa ter no máximo 5000 caracteres."
export const EMPTY_HANDOFF_COMMENT = ""

export const requiresHandoffComment: (changes: TicketEditChanges) => boolean
export const isHandoffAssigneeChange: (
  currentAssigneeId: number | null | undefined,
  nextAssigneeId: number | null | undefined,
) => boolean
```

| Nome                      | Semântica                                                                                                                                                                                                                                                                                                                                      |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `requiresHandoffComment`  | `changes.assignee !== null`. É o que `updateTicketByAssignee` usa, sobre o `diffTicketEdit` calculado sob a trava                                                                                                                                                                                                                              |
| `isHandoffAssigneeChange` | `nextAssigneeId !== undefined && nextAssigneeId !== currentAssigneeId`. É o espelho no cliente: `currentAssigneeId` = `defaults.assigneeId` do formulário (`preselectedAssigneeId`), `nextAssigneeId` = valor atual do campo. `undefined` no próximo = "sem seleção" (o schema já recusa), não mostra o campo. `null` = fila, conta como troca |
| `EMPTY_HANDOFF_COMMENT`   | valor inicial do campo nos três formulários                                                                                                                                                                                                                                                                                                    |

O texto do limite é montado com `TICKET_COMMENT_MAX_LENGTH`.

### `ticket-transfer.ts` (alterado)

- `buildSendToDepartmentFormDefaults(ticket)` → `{ ticketId,
expectedDepartmentId, comment: "" }`.
- `SEND_TO_DEPARTMENT_DIALOG_DESCRIPTION` →
  `O chamado sai da fila deste setor e vai para a fila do setor escolhido, aguardando aprovação até alguém de lá atendê-lo. O comentário fica público no chamado e aparece no aviso de aprovação.`

### `ticket-assignment.ts` (alterado)

- `buildSendTicketFormDefaults(ticket)` → `{ ticketId, expectedAssigneeId,
comment: "" }`.
- `SEND_TICKET_DIALOG_DESCRIPTION` →
  `Escolha quem do setor do chamado vai cuidar dele. O comentário fica público no chamado.`

### Não muda

`describeTransferAwaitingConclusion`, `ticketConclusionStateFor`,
`describePendingTransfer`, regras de quem envia, assume, atende, aceita ou
recusa, `diffTicketEdit`, `describeTicketEditNote`.

## `df-data` — o que mudar (`app/_lib/data/tickets.ts`)

Em todos os três: o `insert into message` usa a tabela `message` já importada
(como em `rejectTicketTransfer`):

```ts
await tx.insert(message).values({
  ticketId,
  userId: <quem agiu>,
  content: <comentário>,
  visibility: "publica",
  createdAt: changedAt,
  updatedAt: changedAt,
})
```

Sempre **depois** de todas as checagens que devolvem outcome sem gravar e
**antes** do `update ticket`. O conteúdo chega já com `trim` (a action passa
o resultado do `safeParse`); a função de dados não reaplica regra de
formato.

### `requestTicketTransfer` (alterado)

Assinatura igual; `values.comment` novo.

1. Travas, regra, conflito e `invalid_target`: sem mudança.
2. `changedAt`.
3. **Novo:** `insert into message` (`userId: actorId`, `content: comment`).
4. `update ticket`: sem mudança.
5. `insert into ticket_transfer`: `requestReason: comment` (era `null`).
6. `transferencia_solicitada`: sem mudança (`note` continua nula).

### `assignTicket` (alterado)

Assinatura igual; `SendTicketValues.comment` novo.

- `mode: "assume"`: **nada muda**, nenhuma mensagem.
- `mode: "send"`: depois da checagem de `invalid_assignee` e de `changedAt`,
  `insert into message` (`userId: actorId`, `content: values.comment`), antes
  do `update ticket`. Sugestão: guardar o comentário numa variável
  `handoffComment: string | null` dentro do bloco `if (values.mode === "send")`
  já existente e inserir depois de `changedAt` quando não nulo, para não
  precisar de um segundo estreitamento da união.
- `atribuicao` e `mudanca_status`: sem mudança.

### `updateTicketByAssignee` (alterado)

Assinatura igual; `values.handoffComment?` novo; outcome novo
`comment_required`.

Depois de `if (!hasTicketEditChanges(changes)) return { status: "no_changes" }`:

```ts
const handoffComment = requiresHandoffComment(changes)
  ? (values.handoffComment ?? null)
  : null

if (requiresHandoffComment(changes) && handoffComment === null) {
  return { status: "comment_required" }
}
```

e, depois de `changedAt`, antes do `update ticket`:

```ts
if (handoffComment !== null) {
  await tx.insert(message).values({
    ticketId,
    userId: editorId,
    content: handoffComment,
    visibility: "publica",
    createdAt: changedAt,
    updatedAt: changedAt,
  })
}
```

Precedência dos outcomes: `not_found` → `not_editable` → `invalid_tag` →
`invalid_assignee` → `no_changes` → `comment_required` (os dois últimos são
mutuamente exclusivos). Comentário recebido sem troca de destinatário é
descartado (decisão acima). Travas, ordem das linhas de histórico (`edicao` →
`mudanca_tag` → `atribuicao` → `mudanca_status`) e validações: sem mudança.

Importar `requiresHandoffComment` de `@/app/_lib/domain/ticket-handoff`.

## `df-actions` — o que mudar

### `app/_lib/actions/ticket-transfer.ts` — `sendTicketToDepartment`

**Nada a mudar no código.** O `...parsed.data` já leva `comment` a
`requestTicketTransfer`. Revalidação, códigos e textos iguais. A mensagem de
`INVALID_INPUT` passa a poder ser a do comentário (primeira issue do
`safeParse`).

### `app/_lib/actions/ticket-assignment.ts` — `sendTicket`

Acrescentar `comment: parsed.data.comment` ao objeto `mode: "send"` passado a
`runAssignment` (hoje é erro de `tsc`). `assumeTicket` não muda. Revalidação
igual.

### `app/_lib/actions/tickets.ts` — `editTicket`

- `EditTicketErrorCode` ganha `"HANDOFF_COMMENT_REQUIRED"`.
- `EDIT_OUTCOME_FAILURES` ganha (hoje é erro de `tsc`):

```ts
comment_required: {
  ok: false,
  code: "HANDOFF_COMMENT_REQUIRED",
  message: HANDOFF_COMMENT_REQUIRED_MESSAGE,
},
```

com `HANDOFF_COMMENT_REQUIRED_MESSAGE` importado de
`@/app/_lib/domain/ticket-handoff`.

- O `...parsed.data` já leva `handoffComment`. Revalidação igual (o detalhe
  revalidado já traz o comentário novo na lista).

## `df-ui` — o que mudar

Padrão do campo nos três lugares: o do motivo em
`app/(app)/tickets/[id]/_components/decline-transfer-dialog.tsx` —
`Controller` → `Field` (`data-invalid`) → `FieldLabel`
(`HANDOFF_COMMENT_LABEL`) → `Textarea` (`placeholder=
HANDOFF_COMMENT_PLACEHOLDER`, `rows={4}`, `className="max-h-60 min-h-24"`,
`aria-invalid`, `aria-describedby` apontando o erro, `disabled` durante o
envio) → `FieldError`. Textos de `@/app/_lib/domain/ticket-handoff`; nada
escrito à mão.

### `app/(app)/tickets/[id]/_components/send-to-department-dialog.tsx`

- Campo `comment` **depois** do combobox de setor, só quando `hasTargets` (sem
  destino não há o que enviar).
- Tratamento dos resultados **como antes** (`INVALID_INPUT` em toast). O
  comentário vazio ou longo é barrado pelo `zodResolver` antes do
  `onSubmit`; o servidor só o recusa com payload forjado (revisão abaixo).
- A descrição do diálogo já avisa que o texto é público
  (`SEND_TO_DEPARTMENT_DIALOG_DESCRIPTION`); `FieldDescription` não é
  necessário.

### `app/(app)/queue/_components/send-ticket-dialog.tsx`

- Campo `comment` depois do `TicketAssigneeField`.
- Tratamento dos resultados **como antes**: `INVALID_INPUT` e
  `INVALID_ASSIGNEE` no campo Destinatário. O comentário inválido nunca
  chega ao servidor pelo formulário legítimo (`zodResolver`; revisão abaixo).

### Edição — campo condicional

Arquivos: `ticket-edit-assignee.tsx` (onde o campo aparece),
`ticket-edit-provider.tsx` (valor inicial e tratamento do resultado),
`_hooks/use-ticket-edit.ts` (contexto). Sugestão: um componente novo
`app/(app)/tickets/[id]/_components/ticket-edit-handoff-comment.tsx`
(`"use client"`), renderizado por `TicketEditAssignee` logo abaixo do
Destinatário, ocupando a largura da grade.

- O contexto ganha o destinatário inicial (ex.: `initialAssigneeId:
number | null | undefined` = `options.defaults.assigneeId`).
- Visibilidade: `useWatch({ control: form.control, name: "assigneeId" })` e
  `isHandoffAssigneeChange(initialAssigneeId, assigneeId)`.
- `Controller name="handoffComment"` com `shouldUnregister` e
  `defaultValue={EMPTY_HANDOFF_COMMENT}`: ao sumir (destinatário volta ao
  inicial, "Cancelar", fim da edição) o valor é removido do formulário e não
  vai no envio; ao reaparecer, volta vazio. `FieldDescription` com
  `HANDOFF_COMMENT_DESCRIPTION` abaixo do rótulo (aqui não há diálogo que
  explique).
- `editTicket` → `HANDOFF_COMMENT_REQUIRED`: se o campo está visível,
  `form.setError("handoffComment", { message }, { shouldFocus: true })`; senão
  `toast.error(message)` e `router.refresh()`. `INVALID_INPUT` continua em
  toast (o cliente já bloqueia vazio e longo antes).
- `EditTicketFormDefaults` não muda; `form.reset(options.defaults)` continua.

### O que não muda

"Assumir" (Fila e detalhe), "Atender", "Recusar", formulário de comentário,
`PendingTransferNotice`, `TicketConclusion` (o texto do envio chega pelo
`requestReason` que eles já leem).

## Riscos

1. **`request_reason` congelado.** O autor pode editar ou apagar o comentário
   do envio (regras de comentário de sempre); o aviso e o card Conclusão
   continuam mostrando o texto original enquanto a transferência estiver
   pendente. Decidido (registro da solicitação).
2. **Card Conclusão sem o nome do destino** quando há comentário. O aviso
   amarelo acima continua com `Aguardando aprovação de {destino}`. Decidido.
3. **Diálogos sem campo entre ondas**: entre a Onda 1 (`df-data`) e a do
   `df-ui`, "Enviar" e "Enviar para outro setor" não enviam (validação do
   cliente sem campo visível). Não comitar a etapa no meio.
4. **Cliente e servidor divergentes na edição**: se `defaults.assigneeId` for
   `undefined` (destinatário atual fora da lista, dica
   `UNAVAILABLE_ASSIGNEE_HINT`), qualquer escolha mostra o campo; o servidor
   só exige se a escolha diferir do `assigned_to` real. Na prática não ocorre
   (quem edita é o destinatário, ativo e do setor), e o pior caso é pedir um
   comentário a mais.

## Cenários para o `df-qa`

Usuários de `docs/contracts/qa-seed.md`: `M` = QA Membro Suporte, `A` = QA
Admin Suporte, `I` = QA Admin Infra, `D` = Diretor; `S` e `F` = ids de QA
Suporte e QA Infra. Títulos e comentários criados começam com `[QA]`; criação
só em QA Suporte. **Não alterar #65 a #68.** "Request de action" = `POST` com
cabeçalho `Next-Action`. Antes de cada cenário que diz "nada gravado", anotar
`max(id)` de `ticket_history` e de `message` e `updated_at` do chamado. Forjar
= alterar o payload da action a partir de um formulário legítimo. `X5000` =
texto de 5000 caracteres começando por `[QA] `; `X5001` = 5001.

**Preparação**:

- Diretor: `I` ativo em QA Infra (reativar se preciso).
- A: `[QA] Acesso` ativa em QA Suporte.
- Como M, "Novo chamado", tag `[QA] Acesso`:

| Título                     | Destinatário         | Chamado | Estado esperado            |
| -------------------------- | -------------------- | ------- | -------------------------- |
| `[QA] Troca setor`         | `QA Membro Suporte`  | `#H1`   | `em_andamento`, M          |
| `[QA] Troca setor limite`  | `QA Membro Suporte`  | `#H2`   | `em_andamento`, M          |
| `[QA] Troca fila envio`    | `Fila de QA Suporte` | `#H3`   | `aberto`, sem destinatário |
| `[QA] Troca edição colega` | `QA Membro Suporte`  | `#H4`   | `em_andamento`, M          |
| `[QA] Troca edição fila`   | `QA Membro Suporte`  | `#H5`   | `em_andamento`, M          |
| `[QA] Troca edição volta`  | `QA Membro Suporte`  | `#H6`   | `em_andamento`, M          |
| `[QA] Troca assumir`       | `Fila de QA Suporte` | `#H7`   | `aberto`, sem destinatário |
| `[QA] Troca forja`         | `QA Membro Suporte`  | `#H8`   | `em_andamento`, M          |

### Enviar para outro setor

| #    | Quem  | Ação                                                                                                                       | Esperado                                                                                                                                                                                                                                                                                                                                                                             |
| ---- | ----- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| HC1  | M     | `/tickets/H1` → "Enviar para outro setor"                                                                                  | descrição `O chamado sai da fila deste setor e vai para a fila do setor escolhido, aguardando aprovação até alguém de lá atendê-lo. O comentário fica público no chamado e aparece no aviso de aprovação.`; depois do `Setor de destino`, campo `Comentário` (textarea vazia, placeholder `Explique o motivo da troca e o que quem recebe precisa saber.`)                           |
| HC2  | M     | QA Infra, comentário vazio → `Enviar`; depois só espaços → `Enviar`                                                        | as duas vezes `Escreva um comentário para quem vai receber o chamado.` sob o campo, com foco e `aria-invalid="true"`; nenhuma request de action (aba Rede); nada gravado                                                                                                                                                                                                             |
| HC3  | M     | comentário `X5001` → `Enviar`                                                                                              | `O comentário precisa ter no máximo 5000 caracteres.`; nada gravado                                                                                                                                                                                                                                                                                                                  |
| HC4  | M     | comentário `  [QA] Precisa de acesso à VPN.  ` (espaços antes e depois) → `Enviar`                                         | `Enviando…`; toast `Chamado #H1 enviado para a fila de QA Infra.`; M continua no detalhe (autor); aviso amarelo `Aguardando aprovação de QA Infra`, `Solicitada por QA Membro Suporte em …` e, abaixo, `[QA] Precisa de acesso à VPN.`; card Conclusão mostra `[QA] Precisa de acesso à VPN.`; Comentários com um item público (sem selo `Privado`) de QA Membro Suporte com o texto |
| HC5  | banco | depois do HC4                                                                                                              | uma `message` nova do `#H1`: `user_id = M`, `visibility = 'publica'`, `content = '[QA] Precisa de acesso à VPN.'` (sem espaços nas pontas), `created_at = updated_at`; `ticket_transfer` pendente com `request_reason` = o mesmo texto e `created_at` igual ao da `message`; uma `transferencia_solicitada` com o mesmo `changed_at` e `note` nula                                   |
| HC6  | I e D | abrir `/tickets/H1`                                                                                                        | os dois veem o comentário público de QA Membro Suporte e o texto no aviso; I vê `Atender` e `Recusar`                                                                                                                                                                                                                                                                                |
| HC7  | M     | do diálogo do `#H2` (QA Infra escolhido), forjar `sendTicketToDepartment` sem `comment`; com `comment: "   "`; com `X5001` | os três: `{ ok: false, code: "INVALID_INPUT" }`, mensagens `Escreva um comentário para quem vai receber o chamado.` (duas) e `O comentário precisa ter no máximo 5000 caracteres.`, exibidas em **toast** (tratamento anterior); nada gravado                                                                                                                                        |
| HC8  | M     | `#H2` → QA Infra com `X5000`                                                                                               | sucesso; no banco `length(content) = 5000` e `length(request_reason) = 5000`; o aviso quebra o texto sem estourar a largura                                                                                                                                                                                                                                                          |
| HC9  | I     | "Atender" no `#H1`                                                                                                         | nenhum campo de comentário; toast de aceite; nenhuma `message` nova                                                                                                                                                                                                                                                                                                                  |
| HC10 | I     | "Recusar" no `#H2`: vazio; só espaços; `X5001`; depois `[QA] Recusa com motivo`                                            | regressão da recusa: `Escreva o motivo da recusa.` (duas vezes), `O motivo precisa ter no máximo 5000 caracteres.`; o último devolve o `#H2` a QA Suporte com comentário público `[QA] Recusa com motivo` de QA Admin Infra                                                                                                                                                          |

### "Enviar" da Fila

| #    | Quem  | Ação                                                                                                           | Esperado                                                                                                                                                                                                    |
| ---- | ----- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HC11 | A     | `/queue`, "Enviar" no `#H3`                                                                                    | descrição `Escolha quem do setor do chamado vai cuidar dele. O comentário fica público no chamado.`; campo `Comentário` depois do Destinatário, vazio                                                       |
| HC12 | A     | sem escolher ninguém e sem comentário → `Enviar`; depois escolher QA Membro Suporte, sem comentário → `Enviar` | o primeiro: `Selecione o destinatário.` e `Escreva um comentário para quem vai receber o chamado.`, cada um no seu campo; o segundo: só o do comentário, com foco nele; nada gravado                        |
| HC13 | A     | QA Membro Suporte, comentário `[QA] Fica com você, M.` → `Enviar`                                              | toast `Chamado #H3 enviado para QA Membro Suporte.`; diálogo fecha; linha com Destinatário QA Membro Suporte                                                                                                |
| HC14 | banco | depois do HC13                                                                                                 | `message` nova do `#H3`: `user_id = A`, `publica`, `[QA] Fica com você, M.`; `created_at` = `changed_at` da `atribuicao` nova (nulo → M, `changed_by = A`) e da `mudanca_status` (`aberto` → `encaminhado`) |
| HC15 | M     | `/tickets/H3`                                                                                                  | comentário público de QA Admin Suporte com o texto                                                                                                                                                          |
| HC16 | D     | `/queue?setor=S`, "Enviar" no `#H3` para QA Admin Suporte com `[QA] Diretoria repassa.`                        | sucesso; `message` com `user_id = D`; A vê o comentário no detalhe                                                                                                                                          |
| HC17 | A     | do diálogo do `#H3`, forjar `sendTicket` sem `comment` e com `comment: ""`                                     | `INVALID_INPUT`, `Escreva um comentário para quem vai receber o chamado.` exibido no campo **Destinatário** (tratamento anterior, aceito para payload forjado); nada gravado                                |
| HC18 | A     | `/queue`, "Assumir" no `#H7`; depois `/tickets/H7`                                                             | nenhum diálogo nem campo; toast `Você assumiu o chamado #H7.`; nenhuma `message` nova no `#H7`                                                                                                              |

### Destinatário no "Editar"

| #    | Quem  | Ação                                                                                                                                 | Esperado                                                                                                                                                                                                                                                              |
| ---- | ----- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HC19 | M     | `/tickets/H4` → "Editar"                                                                                                             | Destinatário `QA Membro Suporte`; **nenhum** campo `Comentário` no modo de edição                                                                                                                                                                                     |
| HC20 | M     | mudar só o título para `[QA] Troca edição colega título` → salvar                                                                    | campo nunca aparece; toast `Chamado #H4 atualizado.`; nenhuma `message` nova                                                                                                                                                                                          |
| HC21 | M     | "Editar" → Destinatário `QA Admin Suporte`                                                                                           | campo `Comentário` aparece abaixo do Destinatário, vazio, com `O texto vira um comentário público no chamado.`                                                                                                                                                        |
| HC22 | M     | salvar com o comentário vazio; depois só espaços                                                                                     | `Escreva um comentário para quem vai receber o chamado.` no campo, com foco; continua editando; nenhuma request de action; nada gravado                                                                                                                               |
| HC23 | M     | escrever `[QA] Texto descartado`; voltar o Destinatário para `QA Membro Suporte`                                                     | o campo some; salvar → `Nenhuma alteração para salvar.`; nenhuma `message` nova. "Editar" de novo → `QA Admin Suporte` → o campo reaparece **vazio**                                                                                                                  |
| HC24 | M     | `QA Admin Suporte` com `[QA] Passo para o admin.` → salvar                                                                           | toast `Chamado #H4 atualizado.`; a página volta sem "Editar" para M; Destinatário QA Admin Suporte; comentário público de QA Membro Suporte com o texto; linha do tempo "Edição" `Alterou destinatário.`                                                              |
| HC25 | banco | depois do HC24                                                                                                                       | `message` nova: `user_id = M`, `publica`, `[QA] Passo para o admin.`, `created_at` = `changed_at` das linhas novas (`edicao`, `atribuicao` M → A, `mudanca_status` `em_andamento` → `encaminhado`, nessa ordem de `id`); `note` da `edicao` = `Alterou destinatário.` |
| HC26 | M     | `/tickets/H5` → "Editar" → `Fila de QA Suporte` → campo aparece → `[QA] Devolvo à fila.` → salvar                                    | sucesso; Destinatário `Fila de QA Suporte`; comentário público de M; no banco `atribuicao` M → nulo com `to_department_id = S` e a `message` com o mesmo instante                                                                                                     |
| HC27 | M     | `/tickets/H6` → "Editar" → `QA Admin Suporte` → `X5001` → salvar                                                                     | `O comentário precisa ter no máximo 5000 caracteres.` no campo; nada gravado                                                                                                                                                                                          |
| HC28 | M     | do modo de edição do `#H6` (destinatário `QA Admin Suporte` no formulário), forjar o payload **sem** `handoffComment`                | resultado `HANDOFF_COMMENT_REQUIRED`, `Escreva um comentário para quem vai receber o chamado.` (no campo, se visível; senão toast); nada gravado                                                                                                                      |
| HC29 | M     | forjar `handoffComment: "  "` com o destinatário trocado                                                                             | `INVALID_INPUT`, `Escreva um comentário para quem vai receber o chamado.`; nada gravado                                                                                                                                                                               |
| HC30 | M     | forjar `handoffComment: "[QA] Sem troca"` com destinatário `QA Membro Suporte` (o atual) e o título alterado                         | `Chamado #H6 atualizado.`; **nenhuma** `message` nova (comentário sem troca é descartado)                                                                                                                                                                             |
| HC31 | M     | `/tickets/H8` → "Editar" → título `[QA] Troca forja título`, Destinatário `QA Admin Suporte`, `[QA] Título e destinatário.` → salvar | nota `Alterou título e destinatário.`; uma `message` só                                                                                                                                                                                                               |

### Layout e regressão

| #    | Quem     | Ação                                                                                                     | Esperado                                                                                                                                                                                         |
| ---- | -------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| HC32 | A        | 390×844: "Enviar" na Fila; "Enviar para outro setor" num chamado `em_andamento` de A; "Editar" com troca | os três campos visíveis e alcançáveis, botões do rodapé alcançáveis com rolagem; textarea sem estouro horizontal; não enviar                                                                     |
| HC33 | M        | editar o próprio comentário do HC4 (`/tickets/H1`, depois do aceite do HC9) para `[QA] VPN editado`      | comentário com `(editado)`; `ticket_transfer.request_reason` do `#H1` continua `[QA] Precisa de acesso à VPN.` (risco 1)                                                                         |
| HC34 | qualquer | toda a bateria                                                                                           | nenhum e-mail; nenhum erro nem aviso de hidratação (`next-devtools`); "Assumir", "Atender" e o aceite nunca pedem comentário; o comentário comum do chamado continua com `Escreva o comentário.` |

## Critério de pronto

1. Cenários HC1–HC34 aprovados pelo `df-qa`.
2. `npx tsc --noEmit`, `npm run lint` e `npm run build` passam;
   `df-reviewer` sem bloqueante.
3. Nenhum `requestReason: null` em `app/_lib/data/tickets.ts`.

## Checklist de encerramento

- [x] `commentTextSchema`, `handoffCommentSchema`; `comment` em `sendTicketToDepartmentSchema` e `sendTicketSchema`; `handoffComment` opcional em `editTicketSchema`; `ticketCommentContentSchema` e o `reason` da recusa sobre o mesmo schema; `domain/ticket-handoff.ts`; `comment` nos valores e defaults de envio; `handoffComment` e `TicketHandoffCommentRequired` na edição; textos dos diálogos (`df-architect`)
- [x] `requestTicketTransfer` (mensagem + `request_reason`), `assignTicket` modo envio (mensagem), `updateTicketByAssignee` (`comment_required` + mensagem) (`df-data`)
- [x] `sendTicket` com `comment`; `editTicket` com `HANDOFF_COMMENT_REQUIRED` (`df-actions`)
- [x] campo nos dois diálogos e campo condicional na edição, sem desvio de `INVALID_INPUT` para o Comentário (`df-ui`)
- [ ] cenários do `df-qa`
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm run build`
