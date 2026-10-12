# Contrato — Edição pelo destinatário, "Assumir" no detalhe e resolvedor como destinatário

Etapa 2 do plano `docs/plans/assignee-edit-and-handoff-comment.md` (itens 2, 3
e 4 do escopo; decisões do usuário lá, não repetidas aqui). Decisão de
desenho: `docs/adr/017-ticket-edit-belongs-to-assignee.md`. Este documento é a
referência técnica: assinaturas, sequências e cenários.

Ele **altera** contratos anteriores, que continuam valendo no que não é tocado
aqui e trazem uma revisão de 2026-10-12 apontando para cá:

- `docs/contracts/ticket-edit.md` — quem edita, botão esmaecido, nome da
  função de dados
- `docs/contracts/ticket-edit-window.md` — quem edita a solução na janela
- `docs/contracts/ticket-assignee.md` — quem troca o destinatário pelo "Editar"
- `docs/contracts/ticket-resolution.md` — resolver sem destinatário grava o
  destinatário
- `docs/contracts/department-queue.md` — "Assumir" também no detalhe
- `docs/contracts/department-transfer.md` — "Editar" com envio pendente e
  depois do aceite
- `docs/contracts/queue-default-and-comment-edit.md` e
  `docs/contracts/queue-tabs-comment-delete-and-attend.md` — cenários de
  edição feitos por quem não é destinatário
- `docs/contracts/qa-seed.md` — chamados da janela com destinatário

Versões observadas: `next@16.3.5`, `drizzle-orm@0.45.2`, `zod@4.6.5`,
`react-hook-form@7.88`.

## Escopo técnico em uma frase

Sem schema e sem migration: a regra de edição troca "é o autor" por "é o
destinatário atual"; o botão "Editar" esmaecido some e a regra do botão vira
booleana; o detalhe ganha "Assumir" com a regra e a action da Fila; resolver
um chamado sem destinatário grava o resolvedor como destinatário (com
`atribuicao`) quando ele é destinatário válido. Sem e-mail.

## Decisões do arquiteto (não fixadas no plano)

| Tema                                              | Decisão                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Estado do botão "Editar"                          | **Booleano.** `ticketEditButtonStateFor`, `TicketEditButtonState` (e as três interfaces `Editable`/`Blocked`/`Hidden`) e `describeTicketAwaitingApproval` saem. Entra `canEditTicketDetail(editor, ticket, now): boolean`, no padrão de `canSendTicketToDepartmentDetail` (recebe o formato do detalhe e converte `pendingTransfer` em `hasPendingTransfer`). Com um estado só visível, a união não tem mais o que discriminar             |
| Ordem de `ticketEditBlockFor`                     | inativo → troca de senha → **`NOT_ASSIGNEE`** → `OUTSIDE_EDITOR_DEPARTMENT` → `AWAITING_APPROVAL` → `TICKET_FINISHED` → `STATUS_NOT_EDITABLE`. O `AWAITING_APPROVAL` volta para depois do setor: ele só vinha antes para alimentar o botão esmaecido (revisão de 2026-10-08), que acabou. Como a transferência pendente zera `assigned_to` (ADR 016), na prática `NOT_ASSIGNEE` já barra; os dois motivos seguintes ficam como salvaguarda |
| Nome do mapa de status                            | `TICKET_STATUS_IS_EDITABLE_BY_AUTHOR` → `TICKET_STATUS_IS_EDITABLE`; `isAuthorEditableStatus` → `isEditableStatus`. Valores intactos                                                                                                                                                                                                                                                                                                       |
| Nome da função de dados                           | `updateTicketByAuthor` → **`updateTicketByAssignee`**; `UpdateTicketByAuthorValues`/`Outcome` → `UpdateTicketByAssigneeValues`/`Outcome`; `authorId` → **`editorId`**. A sequência e os outcomes não mudam                                                                                                                                                                                                                                 |
| Resolvedor fora do setor do chamado               | `resolutionAssigneeFor` só grava o resolvedor quando ele é **destinatário válido** (`isUsableTicketAssignee`: ativo e do setor atual do chamado). Diretoria que resolve chamado da fila de outro setor **não** vira destinatária (o chamado continua sem destinatário). Motivo: o invariante "destinatário é do setor do chamado" vale em criação, "Assumir", "Enviar", aceite e recusa, e a diretoria nem editaria (setor)                |
| Alvo do "Assumir" no detalhe                      | `ticketAssumeTargetFor(actor, ticket)` → `{ ticketId, expectedAssigneeId } \| null`, no padrão de `ticketAttendTargetFor`/`ticketDeclineTargetFor`. A forma é a mesma de `AssumeTicketInput`: a UI passa o alvo direto para `assumeTicket`. Como "Assumir" exige chamado sem destinatário, `expectedAssigneeId` sai sempre `null` hoje; vem de `ticket.assignedTo` para não fixar a regra na UI                                            |
| Exclusividade dos botões do cabeçalho             | "Assumir", "Atender" e "Aceitar/Recusar" nunca aparecem juntos para a mesma pessoa (prova abaixo). "Assumir" e "Editar" também não. "Atender" (`start_work`) e "Editar" podem aparecer juntos: os dois são do destinatário                                                                                                                                                                                                                 |
| Linha do tempo da resolução com destinatário novo | `atribuicao` (de nulo para o resolvedor, `changed_by` = resolvedor) **antes** da `resolucao`, mesmo `changed_at`, `id` crescente. Frase existente: `{nome} assumiu o chamado.` (alvo `actor`). Sem `mudanca_status`: a `resolucao` já carrega de/para de status                                                                                                                                                                            |

### Exclusividade, regra a regra

| Botão                                     | Exige                                                                                                          |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| "Assumir"                                 | `assigned_to` **nulo** (`ALREADY_ASSIGNEE`/`ALREADY_TAKEN`), **sem** transferência pendente, status atribuível |
| "Atender" (`start_work`)                  | `assigned_to` = quem vê (`NOT_ASSIGNEE`), sem transferência pendente, `encaminhado`/`recusado`                 |
| "Atender" (`accept_transfer`) e "Recusar" | transferência pendente para o setor de quem vê, status `aguardando_aprovacao`                                  |
| "Editar"                                  | `assigned_to` = quem vê, sem transferência pendente, no setor de quem vê                                       |

"Assumir" × "Atender (início)": destinatário nulo × igual a quem vê.
"Assumir" × "Aceitar/Recusar": sem pendência × com pendência. "Atender
(início)" × "Aceitar/Recusar": sem pendência × com pendência (e
`ticketAttendKindFor` já escolhe um só). "Assumir" × "Editar": destinatário
nulo × igual a quem vê. Nenhuma regra muda para garantir isso; a
exclusividade decorre das existentes.

### Quem vê o quê no cabeçalho do detalhe

| Situação do chamado                                    | Destinatário     | Autor (não destinatário) | Pessoa do setor             | Admin do setor              | Diretoria (outro setor)          |
| ------------------------------------------------------ | ---------------- | ------------------------ | --------------------------- | --------------------------- | -------------------------------- |
| Na fila do setor (`aberto`, `encaminhado`, `recusado`) | —                | Assumir¹                 | Assumir                     | Assumir                     | nada                             |
| Com destinatário, `encaminhado`/`recusado`             | Atender + Editar | nada                     | nada                        | nada                        | nada                             |
| Com destinatário, `em_andamento`/`em_analise`          | Editar           | nada                     | nada                        | nada                        | nada                             |
| Transferência pendente (na fila do destino)            | —                | nada                     | Atender + Recusar (destino) | Atender + Recusar (destino) | nada (salvo destino = Diretoria) |
| `resolvido` na janela                                  | Editar           | nada                     | nada                        | nada                        | nada                             |
| `resolvido` vencido, `fechado`, `cancelado`            | nada             | nada                     | nada                        | nada                        | nada                             |

¹ Só se o autor ainda for do setor atual do chamado. "Enviar" e "Enviar para
outro setor" continuam no card Conclusão e na Fila, sem mudança.

## Tabelas, enums e migration

Nenhuma mudança. Lidas e gravadas como antes; `updateTicketResolution` passa a
gravar `ticket.assigned_to` e uma linha `atribuicao` no caso descrito abaixo.

## Tipos — `app/_lib/types/`

### `app/_lib/types/ticket-edit.ts` (alterado)

```ts
export interface TicketEditabilityFacts {
  assignedTo: number | null
  currentDepartmentId: number
  status: TicketStatus
  resolvedAt: Date | null
  hasPendingTransfer: boolean
}

export type TicketEditBlockReason =
  | "EDITOR_INACTIVE"
  | "PASSWORD_CHANGE_REQUIRED"
  | "NOT_ASSIGNEE"
  | "OUTSIDE_EDITOR_DEPARTMENT"
  | "AWAITING_APPROVAL"
  | "TICKET_FINISHED"
  | "STATUS_NOT_EDITABLE"

export interface TicketPendingTransferTarget {
  toDepartmentName: string
}

export interface TicketEditDetailFacts extends Omit<
  TicketEditabilityFacts,
  "hasPendingTransfer"
> {
  pendingTransfer: TicketPendingTransferTarget | null
}

export interface UpdateTicketByAssigneeValues extends TicketEditValues {
  ticketId: number
  editorId: number
}

export type UpdateTicketByAssigneeOutcome =
  | TicketEditSaved
  | TicketNotFound
  | TicketNotEditable
  | TicketInvalidTag
  | TicketInvalidAssignee
  | TicketNoChanges
```

| Antes                                                                                                    | Depois                                                     |
| -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `TicketEditabilityFacts.createdBy`                                                                       | `assignedTo: number \| null` (o `createdBy` saiu, sem uso) |
| `"NOT_AUTHOR"`                                                                                           | `"NOT_ASSIGNEE"`                                           |
| `TicketEditButtonFacts`                                                                                  | `TicketEditDetailFacts` (mesma forma, com `assignedTo`)    |
| `TicketEditButtonState`, `TicketEditButtonEditable`, `TicketEditButtonBlocked`, `TicketEditButtonHidden` | removidos                                                  |
| `UpdateTicketByAuthorValues` (`authorId`)                                                                | `UpdateTicketByAssigneeValues` (`editorId`)                |
| `UpdateTicketByAuthorOutcome`                                                                            | `UpdateTicketByAssigneeOutcome` (mesmos membros)           |

`TicketPendingTransferTarget` continua (usado também por
`TicketAttendDetailFacts`). `TicketDetail` satisfaz `TicketEditDetailFacts`
sem conversão.

### `app/_lib/types/ticket-assignment.ts` (acrescido)

```ts
export interface TicketAssumeDetailSource extends TicketAttendDetailFacts {
  id: number
}

export interface AssumeTicketTarget {
  ticketId: number
  expectedAssigneeId: number | null
}
```

`TicketDetail` satisfaz `TicketAssumeDetailSource` sem conversão.
`AssumeTicketTarget` tem a forma de `AssumeTicketInput`
(`validation/ticket-assignment.ts`).

## Domínio — `app/_lib/domain/`

### `app/_lib/domain/ticket-edit.ts` (alterado)

```ts
export const isEditableStatus: (status: TicketStatus) => boolean
export const ticketEditBlockFor: (
  editor: TicketEditorFacts,
  ticket: TicketEditabilityFacts,
  now: Date,
) => TicketEditBlockReason | null
export const canEditTicket: (
  editor: TicketEditorFacts,
  ticket: TicketEditabilityFacts,
  now: Date,
) => boolean
export const canEditTicketDetail: (
  editor: TicketEditorFacts,
  ticket: TicketEditDetailFacts,
  now: Date,
) => boolean
```

| Nome                  | Semântica                                                                                                                                                                                                                                                                                     |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `isEditableStatus`    | `TICKET_STATUS_IS_EDITABLE[status]` — o mesmo mapa de antes (`aberto`, `em_analise`, `encaminhado`, `recusado`, `em_andamento`, `resolvido`: `true`; `aguardando_aprovacao`, `fechado`, `cancelado`: `false`)                                                                                 |
| `ticketEditBlockFor`  | Primeiro motivo, na ordem: `EDITOR_INACTIVE`; `PASSWORD_CHANGE_REQUIRED`; `NOT_ASSIGNEE` (`ticket.assignedTo !== editor.userId`, inclusive chamado na fila); `OUTSIDE_EDITOR_DEPARTMENT`; `AWAITING_APPROVAL`; `TICKET_FINISHED` (`isTicketLocked`); `STATUS_NOT_EDITABLE`. `null` = editável |
| `canEditTicket`       | `ticketEditBlockFor(...) === null`. É o que `updateTicketByAssignee` usa sob trava                                                                                                                                                                                                            |
| `canEditTicketDetail` | `canEditTicket` com `hasPendingTransfer: ticket.pendingTransfer !== null`. É o que a página usa para decidir "Editar" e carregar tags e atribuíveis                                                                                                                                           |

**Removidos**: `isAuthorEditableStatus`, `describeTicketAwaitingApproval`,
`ticketEditButtonStateFor`. O texto `Aguarde a solução ou devolutiva de
{setor}` deixa de existir no projeto. Não mudam: `canEditSolution`,
`buildTicketEditFormOptions`, `diffTicketEdit`, `hasTicketEditChanges`,
`describeTicketEditNote`, `describeTicketEdited`, `tagEditHintFor`.

### `app/_lib/domain/ticket-assignment.ts` (acrescido)

```ts
export const ticketAssumeTargetFor: (
  actor: TicketActorFacts,
  ticket: TicketAssumeDetailSource,
) => AssumeTicketTarget | null
```

`canAssumeTicket(actor, { createdBy, assignedTo, currentDepartmentId, status,
hasPendingTransfer: ticket.pendingTransfer !== null })` verdadeiro →
`{ ticketId: ticket.id, expectedAssigneeId: ticket.assignedTo }`; senão
`null`. `ticketAssumeBlockFor`, `canAssumeTicket` e os textos
(`ASSUME_TICKET_LABEL` `Assumir`, `ASSUME_TICKET_PENDING_LABEL` `Assumindo…`,
`describeTicketAssumed`, `describeTicketAssignmentConflict`) não mudam.

### `app/_lib/domain/ticket-resolution.ts` (acrescido)

```ts
export const resolutionAssigneeFor: (
  resolver: TicketActorFacts,
  ticket: TicketVisibilityFacts,
) => number | null
```

| Caso                                                           | Retorno                            |
| -------------------------------------------------------------- | ---------------------------------- |
| `ticket.assignedTo` não nulo                                   | `ticket.assignedTo` (não muda)     |
| nulo e `isUsableTicketAssignee(resolver, currentDepartmentId)` | `resolver.userId`                  |
| nulo e resolvedor fora do setor (diretoria de outro setor)     | `null` (continua sem destinatário) |

A função de dados compara o retorno com o `assigned_to` lido sob trava:
diferente → grava. `canResolveTicket` e `isTicketResolver` não mudam (quem
resolve continua o mesmo).

## Validação

Nada novo. `assumeTicketSchema`, `editTicketSchema` e `resolveTicketSchema`
não mudam.

## `df-data` — o que mudar

### `app/_lib/data/tickets.ts` — `updateTicketByAuthor` → `updateTicketByAssignee`

```ts
export async function updateTicketByAssignee(
  values: UpdateTicketByAssigneeValues,
): Promise<UpdateTicketByAssigneeOutcome>
```

Renomear a função e os tipos importados; `const { ticketId, editorId } =
values`; `lockActorFacts(tx, editorId)`; todo `changedBy: authorId` →
`changedBy: editorId`; `assigneeTargetFor(editorId, values.assigneeId)`. No
passo da regra:

```ts
canEditTicket(
  editor,
  {
    assignedTo: ticketRow.assignedTo,
    currentDepartmentId: ticketRow.currentDepartmentId,
    status: ticketRow.status,
    resolvedAt: ticketRow.resolvedAt,
    hasPendingTransfer: pendingTransfer !== undefined,
  },
  now,
)
```

`createdBy` sai desse objeto (`TicketEditabilityFacts` não o aceita mais). O
`select` continua lendo `created_by` para
`canViewTicket`. Travas, precedência de outcomes, ordem das linhas
(`edicao` → `mudanca_tag` → `atribuicao` → `mudanca_status`) e validação de
tag e destinatário pelo setor do editor: **sem mudança**.

### `app/_lib/data/tickets.ts` — `updateTicketResolution` (alterado)

Assinatura e outcomes iguais. Depois de `canResolveTicket` e antes de gravar:

1. `const assigneeId = resolutionAssigneeFor(resolver, ticketRow)` e
   `const assigneeChanged = assigneeId !== ticketRow.assignedTo`.
2. `update ticket`: acrescentar `...(assigneeChanged ? { assignedTo:
assigneeId } : {})` ao `set` existente (`status`, `solution`,
   `resolvedAt`, `updatedAt`).
3. Só se `assigneeChanged`: `insert into ticket_history` com `event:
"atribuicao"`, `changedBy: resolverId`, `fromAssigneeId:
ticketRow.assignedTo` (nulo), `toAssigneeId: assigneeId`, `changedAt`.
   **Antes** da linha `resolucao`.
4. A linha `resolucao` como hoje.

Nenhuma trava nova (o resolvedor já está travado por `lockActorFacts`, e a
regra usa os dados dele lidos sob a trava).

### `db/seed.ts` — `seedQa` (alterado)

Ver a revisão de 2026-10-12 em `docs/contracts/qa-seed.md`: os dois chamados
da janela passam a ter `assigned_to` = QA Membro Suporte e uma linha
`atribuicao` antes da `resolucao`; a idempotência passa a exigir esse
destinatário.

## `df-actions` — o que mudar

### `app/_lib/actions/tickets.ts` — `editTicket`

- Importar `updateTicketByAssignee` e `UpdateTicketByAssigneeOutcome`.
- `type UpdateTicketByAssigneeFailureStatus = Exclude<UpdateTicketByAssigneeOutcome["status"], "saved">`
  (renomear o alias local).
- Chamar `updateTicketByAssignee({ ...parsed.data, editorId: actor.id })`.
- Textos, códigos e revalidações iguais. `not_editable` continua `Você não pode
editar este chamado.` (`FORBIDDEN`).

### `app/_lib/actions/ticket-assignment.ts` — `assumeTicket`

**Nada a mudar.** Conferido: `runAssignment` já revalida
`DEPARTMENT_QUEUE_PATH`, `ticketDetailPath(outcome.ticketId)` e
`MY_TICKETS_PATH` em todo `saved`. O detalhe atualiza sozinho depois do
"Assumir".

### `app/_lib/actions/ticket-resolution.ts` — `resolveTicket`

**Nada a mudar.** Já revalida o detalhe, `/tickets` e `/queue`.

## `df-ui` — o que mudar

### Estrutura

```
app/(app)/tickets/[id]/page.tsx                                   alterado — canEditTicketDetail e alvo do assumir
app/(app)/tickets/[id]/_components/ticket-detail-header.tsx        alterado — prop assumeTarget; sai a prop action
app/(app)/tickets/[id]/_components/assume-ticket-button.tsx        novo — "use client", botão "Assumir" do detalhe
app/(app)/tickets/[id]/_components/edit-ticket-blocked-button.tsx  removido
```

### `page.tsx`

```tsx
import {
  canEditTicketDetail,
  buildTicketEditFormOptions,
} from "@/app/_lib/domain/ticket-edit"
import { ticketAssumeTargetFor } from "@/app/_lib/domain/ticket-assignment"

const isEditable = canEditTicketDetail(actor, ticket, now)
const assumeTarget = ticketAssumeTargetFor(actor, ticket)
```

- `editButton` e o ramo `editButton.state === "blocked"` saem;
  `isEditable` continua decidindo se tags e atribuíveis são lidos (mesmo
  `Promise.all`).
- `TicketDetailHeader` recebe `assumeTarget={assumeTarget}` ao lado de
  `attendTarget` e `decline`; a prop `action` deixa de ser passada.
- Sem `import` de `EditTicketBlockedButton`.

### `TicketDetailHeader`

- Nova prop `assumeTarget?: AssumeTicketTarget | null` (padrão `null`),
  `import type` de `@/app/_lib/types/ticket-assignment`.
- O grupo de ações (`attendActions`) passa a incluir
  `<AssumeTicketButton target={assumeTarget} />` quando não nulo. Pela regra,
  ele nunca convive com "Atender", "Recusar" nem com o modo editável, então
  não há ordem a decidir; se precisar de uma, "Assumir" primeiro.
- A prop `action` não tem mais quem a passe: remover (o único uso era o
  "Editar" esmaecido).

### `AssumeTicketButton` (`"use client"`)

Props: `target: AssumeTicketTarget`. Mesmo comportamento de
`AttendTicketButton`:

- `Button` (variante padrão, como "Atender"), ícone `lucide-react`
  (`aria-hidden`; sugestão `UserCheckIcon`), texto `ASSUME_TICKET_LABEL`
  (`Assumir`); durante o envio, `Loader2Icon` girando,
  `ASSUME_TICKET_PENDING_LABEL` (`Assumindo…`), `disabled` e `aria-busy`.
- Clique → `assumeTicket(target)` dentro de `useTransition`.
  - `ok` → `toast.success(result.message)` (`Você assumiu o chamado #N.`). Sem
    `router.refresh()`: a action revalida o detalhe, que volta com "Editar" e
    sem "Assumir".
  - `CONFLICT`, `NOT_FOUND`, `FORBIDDEN` → `toast.error(result.message)` e
    `router.refresh()`.
  - `INVALID_INPUT` ou sem `code` → `toast.error(result.message)`.
- Importa só a action, `app/_lib/domain/ticket-assignment` (rótulos) e o tipo.
  A linha da Fila (`queue-row-actions.tsx`) não muda; se o `df-ui` quiser
  compartilhar a lógica do clique entre as duas rotas, o lugar é
  `app/(app)/_hooks/` (colocation), sem mudar o visual de nenhuma das duas.

### O que não muda

`TicketEditProvider`, `TicketEditHeading`, modo de edição, campos, textos e
tratamento de resultados da edição. O `PendingTransferNotice` continua sendo o
único aviso de transferência pendente. `blocked-action-trigger.tsx` continua
(usado pelo "Novo chamado" e pelo card Conclusão).

## Riscos

1. **Autores perdem a edição** de chamados que não estão com eles, inclusive
   os antigos. Decidido (ADR 017).
2. **Resolvidos antigos sem destinatário** (inclusive `[QA] Janela aberta`
   anteriores ao seed novo) ficam sem edição até a janela vencer. Sem
   backfill. Decidido.
3. **Recategorização de tag** no setor de destino: a primeira edição exige uma
   tag do setor de quem edita. Decidido.
4. **Quem troca o destinatário pelo "Editar" perde a edição** ao salvar. O
   toast de sucesso aparece e a página volta sem "Editar". Consequência da
   regra, não erro.
5. **Diretoria que resolve chamado da fila de outro setor** não vira
   destinatária: o chamado resolvido fica sem destinatário e ninguém edita a
   solução. Para corrigir, a diretoria precisaria antes "Enviar" o chamado a
   alguém do setor. Decisão do arquiteto (tabela acima); se o usuário preferir
   gravar a diretoria mesmo assim, muda só `resolutionAssigneeFor`.
6. **Membro trocado de setor** continua destinatário dos chamados antigos e não
   edita (setor diferente), como já era com o autor.
7. **Etapa 3** (comentário na troca de destinatário) vai exigir comentário no
   "Editar" quando o destinatário mudar; esta etapa não antecipa nada disso.

## Cenários para o `df-qa`

Usuários de `docs/contracts/qa-seed.md`: `M` = QA Membro Suporte, `A` = QA
Admin Suporte, `I` = QA Admin Infra, `D` = Diretor; `S` e `F` = ids de QA
Suporte e QA Infra. Seed rodado com `SEED_QA=true` **depois** da mudança do
`seedQa` desta etapa. Títulos e tags criados começam com `[QA]`; criação só em
QA Suporte. **Não alterar #65 a #68.** "Request de action" = `POST` com
cabeçalho `Next-Action`. Anotar `max(id)` de `ticket_history` antes de cada
cenário que diz "nada gravado". Forjar = alterar o payload da action a partir
de um formulário legítimo aberto em outro chamado.

**Preparação**:

- Diretor: `I` ativo em QA Infra (reativar se preciso).
- A: `[QA] Acesso` e `[QA] Edição B` ativas em QA Suporte. I: `[QA] Rede`
  ativa em QA Infra.
- Como M, "Novo chamado", tag `[QA] Acesso`:

| Título                        | Destinatário         | Chamado | Estado esperado            |
| ----------------------------- | -------------------- | ------- | -------------------------- |
| `[QA] Dono fila`              | `Fila de QA Suporte` | `#D1`   | `aberto`, sem destinatário |
| `[QA] Dono membro`            | `QA Membro Suporte`  | `#D2`   | `em_andamento`, M          |
| `[QA] Dono admin`             | `QA Admin Suporte`   | `#D3`   | `encaminhado`, A           |
| `[QA] Dono transferência`     | `QA Membro Suporte`  | `#D4`   | `em_andamento`, M          |
| `[QA] Dono resolução membro`  | `Fila de QA Suporte` | `#D5`   | `aberto`, sem destinatário |
| `[QA] Dono resolução admin`   | `Fila de QA Suporte` | `#D6`   | `aberto`, sem destinatário |
| `[QA] Dono resolução diretor` | `Fila de QA Suporte` | `#D7`   | `aberto`, sem destinatário |
| `[QA] Dono forja`             | `QA Membro Suporte`  | `#D8`   | `em_andamento`, M          |
| `[QA] Dono mobile`            | `Fila de QA Suporte` | `#D9`   | `aberto`, sem destinatário |

### Quem vê "Editar" e "Assumir"

| #   | Quem  | Ação                                                                      | Esperado                                                                                                                                                                                                  |
| --- | ----- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AE1 | M     | abrir `/tickets/D1` (autor, na fila) e **manter a aba aberta** até o AE10 | **sem** "Editar" (nem esmaecido: nenhum botão com nome `Editar` no DOM); botão `Assumir` no cabeçalho; sem "Atender"/"Recusar"; Conclusão com o formulário de resolver (autor de chamado na fila resolve) |
| AE2 | A     | abrir `/tickets/D1`                                                       | sem "Editar"; `Assumir` presente; sem "Atender"/"Recusar"                                                                                                                                                 |
| AE3 | D     | abrir `/tickets/D1`                                                       | sem "Editar"; **sem** `Assumir` (Diretoria não é do setor do chamado)                                                                                                                                     |
| AE4 | M     | abrir `/tickets/D3` (autor; destinatário A, `encaminhado`)                | sem "Editar", sem "Assumir", sem "Atender"                                                                                                                                                                |
| AE5 | A     | abrir `/tickets/D3`                                                       | "Atender" **e** "Editar" no cabeçalho; sem "Assumir". "Editar" → modo de edição abre (o destinatário edita antes de atender); "Cancelar" volta sem gravar                                                 |
| AE6 | A e D | abrir `/tickets/D2` (destinatário M)                                      | os dois: sem "Editar", sem "Assumir", sem "Atender"                                                                                                                                                       |
| AE7 | M     | abrir `/tickets/D2`                                                       | "Editar" presente; sem "Assumir"; sem "Atender" (`em_andamento`)                                                                                                                                          |

### "Assumir" no detalhe

| #    | Quem  | Ação                                                                                     | Esperado                                                                                                                                                                                                                                                                                                                                        |
| ---- | ----- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AE8  | A     | em `/tickets/D1`, clicar `Assumir`                                                       | `Assumindo…` com o botão desabilitado durante o envio; toast `Você assumiu o chamado #D1.`; a página atualiza sem recarregar: `Destinatário` QA Admin Suporte, selo `Em andamento`, "Assumir" some, **"Editar" aparece**, sem "Atender"; linha do tempo `QA Admin Suporte assumiu o chamado.` e `Alterou o status de Aberto para Em andamento.` |
| AE9  | banco | depois do AE8                                                                            | `#D1`: `assigned_to = A`, `status = 'em_andamento'`; linhas novas, mesmo `changed_at`: `atribuicao` (`from_assignee_id` nulo, `to_assignee_id = A`, `changed_by = A`) e, com `id` maior, `mudanca_status` (`aberto` → `em_andamento`)                                                                                                           |
| AE10 | M     | na aba do AE1, sem recarregar, clicar `Assumir`                                          | toast `Este chamado já foi assumido por QA Admin Suporte.`; a página atualiza sem "Assumir" e sem "Editar"; nada gravado                                                                                                                                                                                                                        |
| AE11 | A     | `/tickets/D1` → "Editar": título `[QA] Dono fila assumido`, tag `[QA] Edição B` → salvar | toast `Chamado #D1 atualizado.`; linha do tempo "Edição" (`Alterou título e tag.`) e "Mudança de tag"; no banco `changed_by = A` nas duas linhas                                                                                                                                                                                                |
| AE12 | A     | `/queue`, linha do `#D1`                                                                 | sem "Assumir" (a Fila continua coerente com o detalhe)                                                                                                                                                                                                                                                                                          |

### Edição recusada a terceiros

| #    | Quem | Ação                                                                                    | Esperado                                                                                                                                                |
| ---- | ---- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AE13 | M    | do modo de edição do `#D8`, forjar `ticketId` = D1 (autor, destinatário A)              | toast `Você não pode editar este chamado.`; nada gravado no `#D1`                                                                                       |
| AE14 | A    | do modo de edição do `#D1`, forjar `ticketId` = D8 (destinatário M; A é admin do setor) | toast `Você não pode editar este chamado.`; nada gravado no `#D8`                                                                                       |
| AE15 | M    | do modo de edição do `#D8`, forjar `ticketId` = D5 (na fila, autor M)                   | toast `Você não pode editar este chamado.`; nada gravado no `#D5`                                                                                       |
| AE16 | M    | `/tickets/D2` → "Editar" → `Destinatário` `QA Admin Suporte` → salvar                   | toast `Chamado #D2 atualizado.`; a página volta **sem** "Editar" para M (não é mais o destinatário); A, ao abrir `/tickets/D2`, vê "Editar" e "Atender" |

### Transferência entre setores

| #    | Quem  | Ação                                                                           | Esperado                                                                                                                                                                                                                         |
| ---- | ----- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AE17 | M     | `/tickets/D4` → "Enviar para outro setor" → QA Infra                           | sucesso; M continua no detalhe (autor); aviso de transferência pendente; **nenhum** "Editar" (nem esmaecido, nem `aria-disabled`); nenhum toast com `Aguarde a solução ou devolutiva` em lugar nenhum                            |
| AE18 | I e D | abrir `/tickets/D4` durante a pendência                                        | I: "Atender" e "Recusar", sem "Editar", sem "Assumir". D: sem "Editar", sem "Assumir", sem "Atender"                                                                                                                             |
| AE19 | M     | do modo de edição do `#D8`, forjar `ticketId` = D4                             | `Você não pode editar este chamado.`; nada gravado                                                                                                                                                                               |
| AE20 | I     | "Atender" no `#D4`                                                             | toast de aceite; `Destinatário` QA Admin Infra; selo `Em andamento`; **"Editar" aparece** para I                                                                                                                                 |
| AE21 | I     | "Editar" no `#D4`                                                              | campo Tag **sem seleção**, com `A tag atual não está disponível. Escolha uma tag ativa do seu setor.`; opções só de QA Infra (inclui `[QA] Rede`, nenhuma de QA Suporte); Destinatário com `QA Admin Infra` e `Fila de QA Infra` |
| AE22 | I     | escolher `[QA] Rede`, título `[QA] Dono transferência recategorizado` → salvar | toast `Chamado #D4 atualizado.`; "Edição" (`Alterou título e tag.`) e "Mudança de tag" `Trocou a tag de [QA] Acesso para [QA] Rede.`                                                                                             |
| AE23 | banco | depois do AE22                                                                 | `ticket_tag` do `#D4`: uma linha, `tag_id` = `[QA] Rede`; linhas `edicao` e `mudanca_tag` com `changed_by = I`; `current_department_id = F`                                                                                      |
| AE24 | M     | abrir `/tickets/D4` (pela busca)                                               | sem "Editar" (autor, fora do setor e não destinatário)                                                                                                                                                                           |

### Resolver sem destinatário

| #    | Quem  | Ação                                                                                  | Esperado                                                                                                                                                                                                                                                                          |
| ---- | ----- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AE25 | M     | `/tickets/D5` (autor, na fila) → Resolver com `[QA] Resolvido pelo autor na fila.`    | toast `Chamado #D5 resolvido.`; selo `Resolvido`; `Destinatário` QA Membro Suporte; linha do tempo `QA Membro Suporte assumiu o chamado.` seguida de `Resolveu o chamado.`; **"Editar" aparece**                                                                                  |
| AE26 | banco | depois do AE25                                                                        | `#D5`: `assigned_to = M`, `status = 'resolvido'`; linhas novas, mesmo `changed_at`: `atribuicao` (`from_assignee_id` nulo, `to_assignee_id = M`, `changed_by = M`, `to_department_id` nulo) e, com `id` maior, `resolucao` (`aberto` → `resolvido`); **nenhuma** `mudanca_status` |
| AE27 | M     | `/tickets/D5` → "Editar" → solução `[QA] Solução corrigida pelo resolvedor.` → salvar | toast de sucesso; nota `Alterou solução.`; `resolved_at` inalterado                                                                                                                                                                                                               |
| AE28 | A     | `/tickets/D6` → resolver                                                              | sucesso; `Destinatário` QA Admin Suporte; A vê "Editar"; M (autor) abre `/tickets/D6`: sem "Editar"                                                                                                                                                                               |
| AE29 | D     | `/tickets/D7` → resolver                                                              | sucesso; `Destinatário` `Fila de QA Suporte`; no banco `assigned_to` nulo, **nenhuma** `atribuicao` nova, só a `resolucao`; ninguém vê "Editar" no `#D7` (conferir D, A e M)                                                                                                      |
| AE30 | A     | `/tickets/D2` (destinatário A desde o AE16) → resolver                                | sucesso; `assigned_to` continua A; uma linha nova só (`resolucao`), nenhuma `atribuicao`                                                                                                                                                                                          |

### Seed, layout e regressão

| #    | Quem     | Ação                                                                                                         | Esperado                                                                                                                                |
| ---- | -------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| AE31 | M e A    | `[QA] Janela aberta` de maior `id` ainda `resolvido`                                                         | `Destinatário` QA Membro Suporte; M vê "Editar" (com o campo Solução ao editar); A não vê "Editar"                                      |
| AE32 | banco    | `select id, assigned_to from ticket where title = '[QA] Janela aberta' and status = 'resolvido' order by id` | registrar no relatório; os de `assigned_to` nulo (anteriores ao seed novo) não têm "Editar" para ninguém (risco 2)                      |
| AE33 | A        | 390×844: abrir `/tickets/D9`                                                                                 | `Assumir` visível e alcançável abaixo do título; não clicar                                                                             |
| AE34 | qualquer | toda a bateria                                                                                               | "Assumir" nunca aparece junto de "Atender", "Recusar" ou "Editar"; nenhum e-mail; nenhum erro nem aviso de hidratação (`next-devtools`) |

## Critério de pronto

1. Cenários AE1–AE34 aprovados pelo `df-qa`.
2. Nenhuma referência a `ticketEditButtonStateFor`, `TicketEditButtonState`,
   `describeTicketAwaitingApproval`, `updateTicketByAuthor`,
   `UpdateTicketByAuthor*`, `EditTicketBlockedButton` ou `NOT_AUTHOR` fora de
   `docs/`.
3. `npx tsc --noEmit`, `npm run lint` e `npm run build` passam;
   `df-reviewer` sem bloqueante.

## Checklist de encerramento

- [x] `TicketEditabilityFacts.assignedTo`, `NOT_ASSIGNEE`, `TicketEditDetailFacts`, `UpdateTicketByAssignee*`, `canEditTicketDetail`, `isEditableStatus`; removidos `ticketEditButtonStateFor`, `TicketEditButtonState` e afins, `describeTicketAwaitingApproval`; `TicketAssumeDetailSource`, `AssumeTicketTarget`, `ticketAssumeTargetFor`; `resolutionAssigneeFor`; ADR 017 (`df-architect`)
- [x] `updateTicketByAssignee` (renomeada, `editorId`, `assignedTo` na regra); `updateTicketResolution` com `resolutionAssigneeFor` e `atribuicao`; `seedQa` com destinatário nos chamados da janela (`df-data`)
- [x] `editTicket` chamando `updateTicketByAssignee` com `editorId` (`df-actions`)
- [x] `page.tsx` com `canEditTicketDetail` e `ticketAssumeTargetFor`; `AssumeTicketButton` (`app/(app)/tickets/[id]/_components/assume-ticket-button.tsx`); hook `app/(app)/_hooks/use-assume-ticket.ts`, usado também por `queue-row-actions.tsx`; `TicketDetailHeader` com `assumeTarget` e sem `action`; `edit-ticket-blocked-button.tsx` removido (`df-ui`)
- [ ] seed QA rodado de novo pelo usuário (`SEED_QA=true`)
- [ ] cenários do `df-qa`
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm run build`
