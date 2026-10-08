# Contrato — Abas da Fila, exclusão de comentário e "Atender"

Entrada das ondas 1 e 2 de três mudanças aprovadas pelo usuário em 2026-10-08.
Este documento é a referência técnica: assinaturas, sequências, textos e
cenários. Ele **altera** contratos anteriores, que continuam valendo no que não
é tocado aqui:

- `docs/contracts/department-queue.md` — abas da Fila e significado de "Em
  aberto" (revisão de 2026-10-08 aponta para cá)
- `docs/contracts/queue-default-and-comment-edit.md` — etapa 6 (comentários):
  o autor passa também a excluir
- `docs/contracts/ticket-assignee.md` e `department-queue.md` — o destinatário
  ganha um ato próprio sobre o status (`encaminhado` → `em_andamento`)

Padrões de outcome, resultado de action, travas e conflito vêm de
`department-queue.md` (`assignTicket`, `describeTicketAssignmentConflict`) e de
`queue-default-and-comment-edit.md` (`updateTicketMessage`, `editTicketComment`).

Versões observadas: `next@16.3.5`, `drizzle-orm@0.45.2`, `zod@4.6.5`,
`react-hook-form@7.88`.

## Escopo técnico em uma frase

Sem schema e sem migration: a Fila passa a ter sete abas, cada uma definida por
status **e** por critério de destinatário, ambos no domínio; o autor de um
comentário o apaga de verdade (`delete`), pela mesma regra da edição; o
destinatário de um chamado `encaminhado` o põe `em_andamento` com uma linha
`mudanca_status`, numa transação que reconfere a regra e devolve conflito se o
chamado mudou.

## Decisões do arquiteto (não fixadas no plano)

| Tema                               | Decisão                                                                                                                                                                                                                                                                                                                                                                 |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Forma do critério de destinatário  | `assignee: "any" \| "unassigned" \| "assigned"` em cada `DepartmentQueueTabRule` (`DepartmentQueueAssigneeCriterion`). Toda aba declara o seu, inclusive as que não filtram (`"any"`): a tabela `satisfies` obriga a decidir quando uma aba nova entrar                                                                                                                 |
| Valores na URL                     | `all`, `open`, `forwarded`, `in_progress`, `resolved`, `closed`, `cancelled`. `open` mantém o nome (URLs antigas continuam válidas) apesar de agora significar "na fila"                                                                                                                                                                                                |
| "Todos" = `TICKET_STATUSES`        | Os oito status, com `assignee: "any"`. Não é "sem filtro": a condição continua `current_department_id = $1 and status in (…)`, igual às outras abas, e o tipo da regra não ganha caso especial                                                                                                                                                                          |
| Contagens sem objeto literal       | `mapDepartmentQueueTabs(fn)` no domínio devolve `Record<DepartmentQueueTab, T>` chamando `fn` uma vez por aba. É o único lugar com as sete chaves escritas; o `tsc` exige a aba nova ali. O `df-data` usa para montar as colunas do `select` **e** o zero de fallback                                                                                                   |
| Exclusão reaproveita a edição      | `ticketCommentDeleteBlockFor` delega a `ticketCommentEditBlockFor`, e `TicketCommentDeleteBlockReason` é alias de `TicketCommentEditBlockReason`. Duas funções nomeadas (e não uma só chamada nos dois lugares) para que a regra de exclusão possa divergir depois sem tocar UI, data e action de novo                                                                  |
| Exclusão: outcome                  | `deleted` (não `saved`), `not_found`, `not_deletable`. Sem `no_changes`                                                                                                                                                                                                                                                                                                 |
| Exclusão: `not_found` na action    | `Este comentário não existe mais. Confira a lista atualizada.` (`TICKET_COMMENT_GONE_MESSAGE`). Cobre a exclusão já feita em outra aba (caso real) e o id forjado (que recebe o mesmo texto, sem confirmar nada)                                                                                                                                                        |
| Exclusão: `ticket.updated_at`      | Não muda (como publicar e editar comentário). Nenhuma linha em `ticket_history`                                                                                                                                                                                                                                                                                         |
| "Atender": nome da função de dados | `startTicketWork`. A action é `attendTicket`                                                                                                                                                                                                                                                                                                                            |
| "Atender": de/para                 | Constantes `ATTENDABLE_TICKET_STATUS = "encaminhado"` e `ATTENDED_TICKET_STATUS = "em_andamento"` (`domain/ticket-assignment.ts`). Não reaproveita `statusAfterReassignment`: atender não troca destinatário. As abas Encaminhados e Em andamento usam as mesmas constantes                                                                                             |
| "Atender": regra                   | Ativo → sem troca de senha → **é o destinatário** → sem transferência pendente → status `encaminhado`. Setor não entra: o destinatário sempre vê o chamado (`canViewTicket`), e a regra de resolver também o aceita fora do setor (risco 4 de `ticket-assignee.md`)                                                                                                     |
| "Atender": conflito × recusa       | Motivos de quem age (`ACTOR_INACTIVE`, `PASSWORD_CHANGE_REQUIRED`) → `not_attendable` (`FORBIDDEN`). Motivos de estado do chamado (`NOT_ASSIGNEE`, `AWAITING_APPROVAL`, `STATUS_NOT_ATTENDABLE`) → `conflict`: quem tem o botão viu o chamado `encaminhado` com ele, então qualquer diferença é mudança desde a carga. `isTicketAttendConflict(reason)` faz a separação |
| "Atender": gravação condicional    | Por trava + reconferência, como `assignTicket`: `ticket` `for update`, regra do domínio sobre a linha travada, `update … where id = $1`. O `where` **não** repete `status`/`assigned_to` (a regra fica fora do SQL); a trava garante que nada mudou entre a conferência e a escrita                                                                                     |
| "Atender": schema                  | Só `{ ticketId }`. O estado esperado (`encaminhado` com quem age) é exatamente o que a regra exige, então um `expected*` vindo do cliente não acrescentaria nada                                                                                                                                                                                                        |
| "Atender": `first_response_at`     | Não é gravado. Nenhum fluxo grava a coluna hoje; usá-la é decisão de produto à parte                                                                                                                                                                                                                                                                                    |
| "Atender": `canAttendTicketDetail` | Recebe o formato do detalhe (`pendingTransfer` objeto ou nulo) e converte para `hasPendingTransfer`, como `ticketEditButtonStateFor`. A página não monta fatos à mão                                                                                                                                                                                                    |
| "Atender" na Fila                  | Fora do escopo: o botão é só do detalhe                                                                                                                                                                                                                                                                                                                                 |

## Tabelas, enums e migration

Nada novo. **Sem migration** (decisão aprovada).

| Tabela            | Uso nesta entrega                                                                                                                                              |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ticket`          | Fila: `status`, `assigned_to`, `current_department_id`. "Atender": lê sob `for update`; grava `status` e `updated_at`                                          |
| `ticket_history`  | "Atender": uma linha `mudanca_status` (`from_status = 'encaminhado'`, `to_status = 'em_andamento'`, `changed_by`, `changed_at`)                                |
| `ticket_transfer` | "Atender": existência de `status = 'pendente'`                                                                                                                 |
| `message`         | Exclusão: `delete` da linha (`id`, `ticket_id`)                                                                                                                |
| `attachment`      | Exclusão: linhas com `(message_id, ticket_id)` do comentário caem em cascata pela FK `attachment_message_ticket_fk` (`on delete cascade`). Nenhuma existe hoje |

Índices que atendem: `ticket_dept_status_idx` (`current_department_id, status,
created_at desc`) para lista e contagem das abas (o critério de destinatário
filtra sobre o resultado do índice).

---

## 1. Abas da Fila

### Tipos — `app/_lib/types/department-queue.ts` (alterado)

```ts
export type DepartmentQueueTab = (typeof DEPARTMENT_QUEUE_TABS)[number]
// "all" | "open" | "forwarded" | "in_progress" | "resolved" | "closed" | "cancelled"

export type DepartmentQueueAssigneeCriterion = "any" | "unassigned" | "assigned"

export interface DepartmentQueueTabRule {
  label: string
  statuses: readonly TicketStatus[]
  assignee: DepartmentQueueAssigneeCriterion // novo
  emptyTitle: string
  emptyDescription: string
}

export type DepartmentQueueTabCounts = Record<DepartmentQueueTab, number> // ganhou 3 chaves
```

`DepartmentQueueLocation`, `DepartmentQueueListItem` e `DepartmentQueueRowActions`
não mudam.

### Domínio

`app/_lib/domain/department-queue-tabs.ts`:

```ts
export const DEPARTMENT_QUEUE_TABS = [
  "all",
  "open",
  "forwarded",
  "in_progress",
  "resolved",
  "closed",
  "cancelled",
] as const
```

A ordem do array é a ordem das abas na tela.

`app/_lib/domain/department-queue.ts`:

```ts
export const DEFAULT_DEPARTMENT_QUEUE_TAB: DepartmentQueueTab // "open" (sem mudança)
export const DEPARTMENT_QUEUE_TAB_RULES // satisfies Record<DepartmentQueueTab, DepartmentQueueTabRule>
export const mapDepartmentQueueTabs: <T>(
  map: (tab: DepartmentQueueTab) => T,
) => Record<DepartmentQueueTab, T> // novo
```

| Aba (`?tab=`) | `label`      | `statuses`                   | `assignee`   | `emptyTitle`                | `emptyDescription`                                                                                    |
| ------------- | ------------ | ---------------------------- | ------------ | --------------------------- | ----------------------------------------------------------------------------------------------------- |
| `all`         | Todos        | `TICKET_STATUSES` (os 8)     | `any`        | Nenhum chamado no setor     | Os chamados que estiverem no setor aparecem aqui, em qualquer status.                                 |
| `open`        | Em aberto    | `ACTIVE_TICKET_STATUSES`     | `unassigned` | Nenhum chamado em aberto    | Os chamados na fila do setor, ainda sem destinatário, aparecem aqui até alguém assumir ou recebê-los. |
| `forwarded`   | Encaminhados | `[ATTENDABLE_TICKET_STATUS]` | `assigned`   | Nenhum chamado encaminhado  | Os chamados do setor encaminhados para alguém aparecem aqui até o destinatário começar o atendimento. |
| `in_progress` | Em andamento | `[ATTENDED_TICKET_STATUS]`   | `any`        | Nenhum chamado em andamento | Os chamados do setor em atendimento aparecem aqui até serem resolvidos.                               |
| `resolved`    | Resolvidos   | `[RESOLVED_TICKET_STATUS]`   | `any`        | (sem mudança)               | (sem mudança)                                                                                         |
| `closed`      | Fechados     | `["fechado"]`                | `any`        | (sem mudança)               | (sem mudança)                                                                                         |
| `cancelled`   | Cancelados   | `["cancelado"]`              | `any`        | (sem mudança)               | (sem mudança)                                                                                         |

`ACTIVE_TICKET_STATUSES` = `aberto`, `em_analise`, `encaminhado`,
`aguardando_aprovacao`, `em_andamento`. `ATTENDABLE_TICKET_STATUS` =
`encaminhado`; `ATTENDED_TICKET_STATUS` = `em_andamento` (seção 3).

| `assignee`   | Condição sobre `ticket.assigned_to` |
| ------------ | ----------------------------------- |
| `any`        | nenhuma                             |
| `unassigned` | `is null`                           |
| `assigned`   | `is not null`                       |

**As abas deixam de particionar.** "Todos" contém todas; das demais, os
estados que o código de hoje produz caem em exatamente uma:

| Estado alcançável hoje                        | Aba                                  |
| --------------------------------------------- | ------------------------------------ |
| `aberto`, sem destinatário (criação na fila)  | Em aberto                            |
| `encaminhado`, sem destinatário (devolvido)   | Em aberto (com o selo "Encaminhado") |
| `encaminhado`, com destinatário               | Encaminhados                         |
| `em_andamento`, com destinatário              | Em andamento                         |
| `resolvido` / `fechado` / `cancelado`         | Resolvidos / Fechados / Cancelados   |
| `aguardando_aprovacao` sem destinatário (#66) | Em aberto                            |

Fora dessa lista (dados antigos ou fluxo futuro), ver riscos 1 e 2.

`departmentQueueEmptyCopy`, `queueRowActionsFor` e os demais nomes não mudam.

**`mapDepartmentQueueTabs`** — `{ all: map("all"), open: map("open"), … }`, uma
chamada por aba, na ordem de `DEPARTMENT_QUEUE_TABS`.

### Validação

Nada a codar. `departmentQueueSearchParamsSchema` usa `z.enum(DEPARTMENT_QUEUE_TABS)`
com `.catch(DEFAULT_DEPARTMENT_QUEUE_TAB)`: os quatro valores novos passam a ser
aceitos e `?tab=open` continua levando a "Em aberto". O link de volta do
detalhe (`queueTicketDetailHref`, `ticket-detail-origin.ts`) herda os valores.

### `df-data` — `app/_lib/data/department-queue.ts` (alterado)

Assinaturas iguais:

```ts
export async function listQueueTickets(
  departmentId: number,
  tab: DepartmentQueueTab,
  range: DateRange | null = null,
): Promise<DepartmentQueueListItem[]>

export async function countQueueTicketsByTab(
  departmentId: number,
  range: DateRange | null = null,
): Promise<DepartmentQueueTabCounts>
```

**`queueTabCondition`** (helper privado único, usado pelas duas) passa a ser:

```
current_department_id = $departmentId
and status in (<DEPARTMENT_QUEUE_TAB_RULES[tab].statuses>)
and <condição de DEPARTMENT_QUEUE_TAB_RULES[tab].assignee>
```

- A condição de destinatário sai de uma tabela privada
  `satisfies Record<DepartmentQueueAssigneeCriterion, SQL | undefined>`
  (`any` → nenhuma; `unassigned` → `isNull(ticket.assignedTo)`; `assigned` →
  `isNotNull(ticket.assignedTo)`). Critério novo no tipo quebra o `tsc` até ser
  traduzido. Forma exata (`and(...)` com `undefined`, ou `sql` composto) é do
  `df-data`; o helper continua devolvendo `SQL`.
- Status e critério vêm **só** de `DEPARTMENT_QUEUE_TAB_RULES`.

**`countQueueTicketsByTab`** — mesma consulta única, com as colunas montadas por
`mapDepartmentQueueTabs((tab) => sql<number>\`(count(*) filter (where
${queueTabCondition(departmentId, tab)}))::int\`.mapWith(Number))`e o resultado`row ?? mapDepartmentQueueTabs(() => 0)`. Sai o objeto literal de quatro chaves
(hoje quebra o `tsc`: `app/_lib/data/department-queue.ts:82`). Cada contagem
continua igual ao tamanho da lista da aba no mesmo período.

### `df-actions`

Nada. Quem já revalida `/queue` continua; `attendTicket` (seção 3) entra na
tabela "Quem revalida `/queue`" de `department-queue.md`.

### `df-ui`

Nada obrigatório. As abas saem de `DEPARTMENT_QUEUE_TABS.map(...)` com
`DEPARTMENT_QUEUE_TAB_RULES[tab].label` e `counts[tab]` (`queue/page.tsx`); o
filtro Status sai de `DEPARTMENT_QUEUE_TAB_RULES[tab].statuses` (aparece em
Todos com 8 opções e em Em aberto com 5; some em Encaminhados e Em andamento,
que têm um status só); o estado vazio, de `departmentQueueEmptyCopy`. O
`TicketListTabs` já tem `overflow-x-auto`. Conferir no mobile se a aba ativa
fica visível ao abrir uma aba à direita (ex.: `?tab=cancelled`); se não ficar,
`scrollIntoView` na aba atual é decisão do `df-ui`.

---

## 2. Excluir comentário

### Tipos — `app/_lib/types/ticket-comments.ts` (acrescido)

```ts
export type TicketCommentDeleteBlockReason = TicketCommentEditBlockReason

export interface DeleteTicketMessageValues {
  ticketId: number
  messageId: number
  actorId: number
}

export interface TicketMessageDeleted {
  status: "deleted"
  ticketId: number
  messageId: number
}

export interface TicketMessageNotDeletable {
  status: "not_deletable"
}

export type DeleteTicketMessageOutcome =
  TicketMessageDeleted | TicketNotFound | TicketMessageNotDeletable

export interface DeleteTicketCommentTarget {
  ticketId: number
  messageId: number
}
```

`DeleteTicketCommentTarget` tem o formato de `DeleteTicketCommentInput`: é o
que o item passa à action.

### Domínio — `app/_lib/domain/ticket-comments.ts` (acrescido)

```ts
export const DELETE_COMMENT_LABEL // "Excluir"
export const DELETE_COMMENT_PENDING_LABEL // "Excluindo…"
export const DELETE_COMMENT_DIALOG_TITLE // "Excluir comentário?"
export const DELETE_COMMENT_DIALOG_DESCRIPTION
export const TICKET_COMMENT_DELETED_MESSAGE // "Comentário excluído."
export const TICKET_COMMENT_GONE_MESSAGE

export const ticketCommentDeleteBlockFor: (
  actor: TicketActorFacts,
  ticket: TicketCommentFacts,
  message: TicketMessageAuthorFacts,
  now: Date,
) => TicketCommentDeleteBlockReason | null
export const canDeleteTicketComment: (
  actor: TicketActorFacts,
  ticket: TicketCommentFacts,
  message: TicketMessageAuthorFacts,
  now: Date,
) => boolean
export const buildDeleteTicketCommentTarget: (
  ticketId: number,
  message: Pick<TicketMessageItem, "id">,
) => DeleteTicketCommentTarget
```

| Nome                             | Semântica                                                                                                                                                               |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ticketCommentDeleteBlockFor`    | Hoje = `ticketCommentEditBlockFor`: inativo → troca de senha → `CANNOT_VIEW` → `TICKET_FINISHED` (`isTicketLocked`) → `NOT_COMMENT_AUTHOR`. Vale para público e privado |
| `canDeleteTicketComment`         | `ticketCommentDeleteBlockFor(...) === null`. **A** regra do botão e da transação                                                                                        |
| `buildDeleteTicketCommentTarget` | `{ ticketId, messageId: message.id }`                                                                                                                                   |

| Constante                           | Texto                                                                                           |
| ----------------------------------- | ----------------------------------------------------------------------------------------------- |
| `DELETE_COMMENT_DIALOG_DESCRIPTION` | `O comentário será removido do chamado para todos que o veem. Esta ação não pode ser desfeita.` |
| `TICKET_COMMENT_GONE_MESSAGE`       | `Este comentário não existe mais. Confira a lista atualizada.`                                  |

### Validação — `app/_lib/validation/ticket-comments.ts` (acrescido)

```ts
export const deleteTicketCommentSchema // z.object({ ticketId: ticketIdSchema, messageId: messageIdSchema })
export type DeleteTicketCommentInput = z.infer<typeof deleteTicketCommentSchema>
// { ticketId: number; messageId: number }
```

Mesmos esquemas de id da edição: `Chamado inválido.` / `Comentário inválido.`
(inteiro positivo até o limite de `integer`). Quem exclui nunca vem do cliente:
`actorId` forjado é descartado pelo `z.object`.

### `df-data` — `app/_lib/data/ticket-messages.ts`

**`deleteTicketMessage` (novo)**

```ts
export async function deleteTicketMessage(
  values: DeleteTicketMessageValues,
): Promise<DeleteTicketMessageOutcome>
```

Uma transação, mesma forma de `updateTicketMessage`:

1. **Chamado** — `created_by, assigned_to, current_department_id, status,
resolved_at` de `ticket` `for share`. Sem linha → `not_found`.
2. `now = new Date()` uma vez.
3. **Quem exclui** — `users ⋈ department` `for share of users`. Sem linha →
   `not_deletable`. Monta `TicketActorFacts`.
4. `!canViewTicket(actor, ticketRow)` → `not_found`.
5. **Comentário** — `select user_id, visibility from message where id =
$messageId and ticket_id = $ticketId for update`. Sem linha → `not_found`.
6. `!canSeeTicketMessage(actor, ticketRow, { authorId, visibility })` →
   `not_found` (privado de terceiro que a pessoa não vê não é confirmado).
7. `!canDeleteTicketComment(actor, ticketRow, { authorId }, now)` →
   `not_deletable`.
8. `delete from message where id = $messageId and ticket_id = $ticketId`. Os
   anexos do comentário caem em cascata. Nada em `ticket`, `ticket_history`.
9. `{ status: "deleted", ticketId, messageId }`.

- **"Só apaga se autor e chamado batem"**: o chamado pelo `where` (passos 5 e
  8), o autor pela regra do passo 7 sobre a linha travada.
- **Precedência**: `not_found` (chamado) → `not_deletable` (sem linha de quem
  age) → `not_found` (chamado invisível) → `not_found` (comentário inexistente,
  de outro chamado ou invisível) → `not_deletable` (regra).
- **Travas**: `ticket` (`for share`) → `users` (`for share`) → `message`
  (`for update`), a mesma ordem de `insertTicketMessage` e `updateTicketMessage`.
  Duas exclusões simultâneas: a segunda espera a trava do passo 5 e, depois do
  commit da primeira, não encontra a linha → `not_found`. Edição concorrente com
  exclusão: quem chegar depois recebe `not_found`.

**Auditoria futura (porta aberta).** Toda exclusão passa por
`deleteTicketMessage` e toda leitura de comentários por `listTicketMessages`.
Um rastro, se o usuário quiser, seria: coluna `message.deleted_at` (migration),
`deleteTicketMessage` trocando o `delete` por `update … set deleted_at = now`, e
`listTicketMessages` devolvendo o item como placeholder `Comentário excluído`
(sem conteúdo). Nenhum outro arquivo de dados precisaria mudar. **Exclusões
feitas antes disso não terão rastro**: a linha some do banco.

### `df-actions` — `app/_lib/actions/ticket-comments.ts` (acrescido)

```ts
export type DeleteTicketCommentErrorCode =
  "INVALID_INPUT" | "FORBIDDEN" | "NOT_FOUND"

export interface DeleteTicketCommentSuccess {
  ok: true
  message: string
}

export interface DeleteTicketCommentFailure {
  ok: false
  message: string
  code?: DeleteTicketCommentErrorCode
}

export type DeleteTicketCommentResult =
  DeleteTicketCommentSuccess | DeleteTicketCommentFailure

export const deleteTicketComment: (
  input: DeleteTicketCommentInput,
) => Promise<DeleteTicketCommentResult>
```

Forma igual à de `editTicketComment`: `getSession()` → `safeParse` →
`deleteTicketMessage({ ...parsed.data, actorId: actor.id })` em `try/catch` →
mapeamento (`satisfies Record<Exclude<DeleteTicketMessageOutcome["status"],
"deleted">, DeleteTicketCommentFailure>`) → `deleted`:
`revalidatePath(ticketDetailPath(outcome.ticketId))` e
`TICKET_COMMENT_DELETED_MESSAGE`.

| Situação        | `code`          | Mensagem                                                                                                          |
| --------------- | --------------- | ----------------------------------------------------------------------------------------------------------------- |
| sem sessão      | `FORBIDDEN`     | `Você não tem permissão para excluir este comentário.`                                                            |
| schema          | `INVALID_INPUT` | primeira mensagem do Zod                                                                                          |
| `not_found`     | `NOT_FOUND`     | `TICKET_COMMENT_GONE_MESSAGE`                                                                                     |
| `not_deletable` | `FORBIDDEN`     | `Você não pode excluir este comentário.`                                                                          |
| exceção         | —               | `Não foi possível excluir o comentário agora. Tente novamente.` (`console.error("[deleteTicketComment]", error)`) |

Só o detalhe é revalidado (Meus chamados e a Fila não mostram comentários).
Sem e-mail. Sem storage: nenhum anexo existe hoje (risco 4).

### `df-ui`

- **`page.tsx`** (`/tickets/[id]`): cada entrada ganha `canDelete:
canDeleteTicketComment(actor, ticket, message, now)`, com o mesmo `now`. A UI
  não deriva `canDelete` de `canEdit`, mesmo sendo iguais hoje.
- **`ticket-comment-item.tsx`**: `TicketCommentEntry` ganha `canDelete:
boolean`. Com ele, botão `DELETE_COMMENT_LABEL` (pequeno, discreto, ao lado
  do "Editar"; ícone `lucide-react` opcional, ex.: `Trash2Icon`), com
  `aria-label` `${DELETE_COMMENT_LABEL} comentário de {autor} de {data/hora}`
  (mesmo padrão do "Editar"). Some enquanto o comentário está em edição
  (recomendação).
- **Confirmação**: `AlertDialog` do shadcn (se ainda não existir em
  `app/_components/ui/`, `npx shadcn@latest add alert-dialog` e trocar o import
  do `cn`). Título `DELETE_COMMENT_DIALOG_TITLE`, descrição
  `DELETE_COMMENT_DIALOG_DESCRIPTION`, botões `Cancelar` e `DELETE_COMMENT_LABEL`
  (variante destrutiva). Na confirmação, `useTransition` +
  `deleteTicketComment(buildDeleteTicketCommentTarget(ticketId, message))`;
  pendente: botão desabilitado com `DELETE_COMMENT_PENDING_LABEL` e o dialog
  não fecha.
- Resultado:
  - `ok` → `toast.success(message)`, fecha; a revalidação tira o item.
  - `NOT_FOUND`, `FORBIDDEN` → `toast.error(message)`, fecha, `router.refresh()`.
  - `INVALID_INPUT` ou sem código → `toast.error(message)`, fecha.
- Foco ao fechar sem excluir: volta ao botão "Excluir" (padrão do
  `AlertDialog`). Depois de excluir, o item some; o foco vai para um lugar
  estável da lista (decisão do `df-ui`; sugestão: o título "Comentários").
- Componente cliente não importa `app/_lib/data`, `app/_lib/auth`, `@/db/*`.

### Textos — exclusão

| Onde            | Texto                                                                                                                                |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Botão           | `Excluir` / `Excluindo…`                                                                                                             |
| Dialog          | `Excluir comentário?` / `O comentário será removido do chamado para todos que o veem. Esta ação não pode ser desfeita.` / `Cancelar` |
| Sucesso         | `Comentário excluído.`                                                                                                               |
| Já excluído     | `Este comentário não existe mais. Confira a lista atualizada.`                                                                       |
| Recusas         | `Você não pode excluir este comentário.` / `Você não tem permissão para excluir este comentário.`                                    |
| Erro inesperado | `Não foi possível excluir o comentário agora. Tente novamente.`                                                                      |

---

## 3. "Atender"

### Tipos — `app/_lib/types/ticket-assignment.ts` (acrescido)

```ts
export type TicketAttendStateBlockReason =
  "NOT_ASSIGNEE" | "AWAITING_APPROVAL" | "STATUS_NOT_ATTENDABLE"

export type TicketAttendBlockReason =
  TicketAssignmentActorBlockReason | TicketAttendStateBlockReason

export interface TicketAttendDetailFacts extends TicketVisibilityFacts {
  status: TicketStatus
  pendingTransfer: TicketPendingTransferTarget | null
}

export interface StartTicketWorkValues {
  ticketId: number
  actorId: number
}

export interface TicketWorkStarted {
  status: "saved"
  ticketId: number
}

export interface TicketNotAttendable {
  status: "not_attendable"
}

export interface TicketAttendConflict {
  status: "conflict"
  currentStatus: TicketStatus
  currentAssigneeId: number | null
  currentAssigneeName: string | null
  hasPendingTransfer: boolean
}

export type StartTicketWorkOutcome =
  | TicketWorkStarted
  | TicketNotFound // de types/ticket-edit.ts
  | TicketNotAttendable
  | TicketAttendConflict
```

`TicketDetail` satisfaz `TicketAttendDetailFacts` sem conversão. A transação
usa `TicketAssignmentFacts` (já existente).

### Domínio — `app/_lib/domain/ticket-assignment.ts` (acrescido)

```ts
export const ATTENDABLE_TICKET_STATUS // "encaminhado"
export const ATTENDED_TICKET_STATUS // "em_andamento"
export const ATTEND_TICKET_LABEL // "Atender"
export const ATTEND_TICKET_PENDING_LABEL // "Atendendo…"
export const TICKET_NOT_ATTENDABLE_MESSAGE // "Não é possível atender este chamado agora."

export const ticketAttendBlockFor: (
  actor: TicketActorFacts,
  ticket: TicketAssignmentFacts,
) => TicketAttendBlockReason | null
export const canAttendTicket: (
  actor: TicketActorFacts,
  ticket: TicketAssignmentFacts,
) => boolean
export const canAttendTicketDetail: (
  actor: TicketActorFacts,
  ticket: TicketAttendDetailFacts,
) => boolean
export const isTicketAttendConflict: (
  reason: TicketAttendBlockReason,
) => boolean
export const describeTicketAttended: (ticketId: number) => string
export const describeTicketAttendConflict: (
  conflict: TicketAttendConflict,
  actorId: number,
) => string
```

**`ticketAttendBlockFor`** — primeiro motivo que vale, nesta ordem:

| #   | Motivo                     | Condição                              | Conflito? |
| --- | -------------------------- | ------------------------------------- | --------- |
| 1   | `ACTOR_INACTIVE`           | `!actor.isActive`                     | não       |
| 2   | `PASSWORD_CHANGE_REQUIRED` | `actor.mustChangePassword`            | não       |
| 3   | `NOT_ASSIGNEE`             | `assignedTo !== actor.userId`         | sim       |
| 4   | `AWAITING_APPROVAL`        | `hasPendingTransfer`                  | sim       |
| 5   | `STATUS_NOT_ATTENDABLE`    | `status !== ATTENDABLE_TICKET_STATUS` | sim       |

A coluna "Conflito?" é a tabela privada de `isTicketAttendConflict`
(`satisfies Record<TicketAttendBlockReason, boolean>`).

| Nome                           | Semântica                                                                                                                 |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `canAttendTicket`              | `ticketAttendBlockFor(...) === null`. **A** regra da transação                                                            |
| `canAttendTicketDetail`        | `canAttendTicket(actor, { ...visibilidade, status, hasPendingTransfer: pendingTransfer !== null })`. **A** regra do botão |
| `describeTicketAttended`       | `Você começou a atender o chamado #12.`                                                                                   |
| `describeTicketAttendConflict` | primeira que vale, abaixo                                                                                                 |

| Condição do conflito                       | Texto                                                                    |
| ------------------------------------------ | ------------------------------------------------------------------------ |
| `currentAssigneeId === null`               | `Este chamado voltou para a fila do setor. Confira a página atualizada.` |
| `currentAssigneeId !== actorId`, nome nulo | `Este chamado não está mais com você. Confira a página atualizada.`      |
| `currentAssigneeId !== actorId`            | `Este chamado agora está com Ana.`                                       |
| `hasPendingTransfer`                       | `Este chamado aguarda a aprovação de uma transferência.`                 |
| `currentStatus === ATTENDED_TICKET_STATUS` | `Você já está atendendo este chamado.`                                   |
| outro status                               | `O status deste chamado mudou para Resolvido.` (`TICKET_STATUS_LABELS`)  |

### Validação — `app/_lib/validation/ticket-assignment.ts` (acrescido)

```ts
export const attendTicketSchema // z.object({ ticketId: ticketIdSchema })
export type AttendTicketInput = z.infer<typeof attendTicketSchema> // { ticketId: number }
```

`Chamado inválido.` para id ausente, não numérico, `0`, negativo ou acima de
`integer`. `actorId` forjado é descartado.

### `df-data` — `app/_lib/data/tickets.ts`

**`startTicketWork` (novo)**

```ts
export async function startTicketWork(
  values: StartTicketWorkValues,
): Promise<StartTicketWorkOutcome>
```

Uma transação, nesta ordem (mesma forma de `assignTicket`):

1. **Chamado** — `select created_by, assigned_to, current_department_id, status
from ticket where id = $ticketId for update`. Sem linha → `not_found`.
2. **Quem age** — `users ⋈ department` `for share of users` (`department_id`,
   `role`, `is_active`, `must_change_password`, `is_board`). Sem linha →
   `not_attendable`. Monta `TicketActorFacts`.
3. `!canViewTicket(actor, ticketRow)` → `not_found`.
4. **Transferência pendente** — `select id from ticket_transfer where ticket_id
= $1 and status = 'pendente' limit 1`.
5. **Regra** — `reason = ticketAttendBlockFor(actor, { ...ticketRow,
hasPendingTransfer })`.
   - `reason === null` → passo 6.
   - `isTicketAttendConflict(reason)` → nome do destinatário atual (`select name
from users where id = ticketRow.assignedTo`, só se não nulo e diferente de
     `actorId`; senão `null`) e `{ status: "conflict", currentStatus:
ticketRow.status, currentAssigneeId: ticketRow.assignedTo,
currentAssigneeName, hasPendingTransfer }`.
   - senão → `not_attendable`.
6. **Grava** — `changedAt = new Date()` uma vez; `update ticket set status =
ATTENDED_TICKET_STATUS, updated_at = changedAt where id = $ticketId`
   (**nada mais**: `assigned_to`, prioridade, setores, `resolved_at`,
   `first_response_at` intactos); `insert into ticket_history` `{ ticketId,
changedBy: actorId, event: "mudanca_status", fromStatus: ticketRow.status,
toStatus: ATTENDED_TICKET_STATUS, changedAt }`. Nenhuma `atribuicao`.
7. `{ status: "saved", ticketId }`.

- **Precedência**: `not_found` (chamado) → `not_attendable` (sem linha de quem
  age) → `not_found` (invisível) → `not_attendable` (motivo de quem age) →
  `conflict` (motivo de estado).
- **Travas**: `ticket` (`for update`) → `users` (`for share`), a ordem de
  `assignTicket`. Atender, Assumir, Enviar, Editar e Resolver no mesmo chamado
  se serializam pelo `for update` do passo 1: quem chega depois relê o estado
  gravado e cai em conflito (ou na recusa do próprio fluxo).
- **Gravação condicional** = trava + regra do domínio sobre a linha travada. O
  `where` do `update` não repete status nem destinatário (regra fora do SQL).
- `from_status` vem da linha travada; pela regra, é sempre `encaminhado`.

### `df-actions` — `app/_lib/actions/ticket-assignment.ts` (acrescido)

```ts
export type AttendTicketErrorCode =
  "INVALID_INPUT" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT"

export interface AttendTicketSuccess {
  ok: true
  message: string
}

export interface AttendTicketFailure {
  ok: false
  message: string
  code?: AttendTicketErrorCode
}

export type AttendTicketResult = AttendTicketSuccess | AttendTicketFailure

export const attendTicket: (
  input: AttendTicketInput,
) => Promise<AttendTicketResult>
```

1. `getSession()`; sem sessão → `FORBIDDEN`,
   `Você não tem permissão para atender este chamado.`
2. `safeParse`; falha → `INVALID_INPUT` com a primeira mensagem.
3. `startTicketWork({ ticketId, actorId: actor.id })` em `try/catch`. Exceção →
   `console.error("[attendTicket]", error)` e falha sem código:
   `Não foi possível atender o chamado agora. Tente novamente.`
4. Mapeamento:

| Outcome          | `code`      | Mensagem                                               |
| ---------------- | ----------- | ------------------------------------------------------ |
| `not_found`      | `NOT_FOUND` | `TICKET_NOT_FOUND_MESSAGE` (`Chamado não encontrado.`) |
| `not_attendable` | `FORBIDDEN` | `TICKET_NOT_ATTENDABLE_MESSAGE`                        |
| `conflict`       | `CONFLICT`  | `describeTicketAttendConflict(outcome, actor.id)`      |

5. `saved` → `revalidatePath(ticketDetailPath(outcome.ticketId))`,
   `revalidatePath(DEPARTMENT_QUEUE_PATH)`, `revalidatePath(MY_TICKETS_PATH)`;
   mensagem `describeTicketAttended(outcome.ticketId)`.

- A action não lê `getAccountFacts()` nem decide permissão: a transação decide.
- **Sem e-mail.**
- Entra na tabela "Quem revalida `/queue`" de `department-queue.md`.

### `df-ui` — detalhe (`/tickets/[id]`)

- **`page.tsx`**: `const canAttend = canAttendTicketDetail(actor, ticket)`
  (sem leitura nova); passa ao cabeçalho.
- **Botão** `ATTEND_TICKET_LABEL` (componente cliente novo na rota, ex.:
  `app/(app)/tickets/[id]/_components/attend-ticket-button.tsx`), ao lado do
  "Editar", nos dois modos do cabeçalho:
  - **não editável** (`TicketDetailHeader` sem `editable`): no mesmo grupo do
    `action` de hoje (o "Editar" bloqueado, quando houver). Com transferência
    pendente o "Atender" nunca aparece, então os dois não disputam espaço hoje;
    a forma do slot (prop nova, ex. `attendAction`) é do `df-ui`.
  - **editável** (`TicketEditHeading`): antes do "Editar", no mesmo
    `div.flex.gap-2`. **Recomendação**: some enquanto `isEditing` (ficam só
    Cancelar e Salvar) e volta ao sair da edição.
- Clique: `useTransition` + `attendTicket({ ticketId })`; pendente: botão
  desabilitado com `ATTEND_TICKET_PENDING_LABEL` (e `aria-busy`).
- Resultado:
  - `ok` → `toast.success(message)`; a revalidação troca o badge para "Em
    andamento", acrescenta a linha do tempo e o botão some.
  - `CONFLICT`, `NOT_FOUND`, `FORBIDDEN` → `toast.error(message)` e
    `router.refresh()`.
  - `INVALID_INPUT` ou sem código → `toast.error(message)`.
- Linha do tempo: nada a codar (`mudanca_status` já tem rótulo e frase:
  `Alterou o status de Encaminhado para Em andamento.`, com `{nome} · {data}`).
- Componente cliente não importa `app/_lib/data`, `app/_lib/auth`, `@/db/*`.

### Textos — "Atender"

| Onde            | Texto                                                               |
| --------------- | ------------------------------------------------------------------- |
| Botão           | `Atender` / `Atendendo…`                                            |
| Sucesso         | `Você começou a atender o chamado #12.`                             |
| Conflito        | tabela de `describeTicketAttendConflict`                            |
| Não pode        | `Não é possível atender este chamado agora.`                        |
| Sem sessão      | `Você não tem permissão para atender este chamado.`                 |
| Erro inesperado | `Não foi possível atender o chamado agora. Tente novamente.`        |
| Linha do tempo  | `Alterou o status de Encaminhado para Em andamento.` (já existente) |

---

## Riscos

1. **Dados antigos fora das abas de status.** Chamados criados antes da regra
   de status por atribuição (`queue-default-and-comment-edit.md`, etapa 4) podem
   estar `aberto` com destinatário (destinatário = autor era o padrão). Esses, e
   `em_analise`/`aguardando_aprovacao` com destinatário (nenhum fluxo cria
   hoje), aparecem **só** em "Todos".
2. **Dados antigos em duas abas.** `em_andamento` sem destinatário (só legado:
   hoje devolver à fila põe `encaminhado`) aparece em "Em aberto" **e** em "Em
   andamento". Com os riscos 1 e 2, a soma das abas sem "Todos" é `Todos − L1 +
L2` (consultas no cenário QT3); para os estados alcançáveis hoje, `L1 = L2 = 0`.
3. **"Em aberto" mostra "Encaminhado".** Chamado `encaminhado` devolvido à fila
   (sem destinatário) aparece em "Em aberto" com o selo "Encaminhado". É o
   critério aprovado ("pendente de atendimento na fila").
4. **Anexo de comentário excluído.** A linha de `attachment` cai em cascata,
   mas o objeto no R2 não é apagado. Hoje nenhum anexo existe; quando existir,
   `deleteTicketComment` precisa apagar os objetos por `app/_lib/storage/` (e
   `deleteTicketMessage` devolver as chaves).
5. **Exclusão sem rastro.** Hard delete: nem o conteúdo nem o fato da exclusão
   ficam registrados. Ver "Auditoria futura".
6. **Conflito antes da permissão no "Atender".** Quem forja `attendTicket` num
   chamado que vê mas do qual não é destinatário recebe o conflito (`Este
chamado agora está com {nome}.`) em vez de `FORBIDDEN`. O nome já aparece no
   detalhe; nada é gravado (mesmo desenho do risco 6 de `department-queue.md`).
7. **Destinatário fora do setor atende.** Pessoa movida de setor que continua
   destinatária vê o chamado e pode atendê-lo (como pode resolvê-lo).
8. **"Em aberto" deixa de mostrar chamados assumidos.** Quem usava "Em aberto"
   como "tudo que está ativo" passa a usar "Todos" (com o filtro Status) ou as
   abas novas.

## Critério de pronto

1. Sete abas na ordem do domínio, padrão "Em aberto", contagens iguais à
   consulta QT2 para QA Suporte e para a Diretoria.
2. Exclusão apaga só a linha de `message` (e anexos em cascata); nada em
   `ticket` nem `ticket_history`; recusas sem efeito.
3. "Atender" grava exatamente `status`, `updated_at` e uma `mudanca_status`;
   conflitos e recusas sem efeito; sem e-mail.
4. Nenhuma migration.
5. `npx tsc --noEmit`, `npm run lint` e `npm run build` passam; `df-reviewer`
   sem bloqueante.

## Cenários para o `df-qa`

Regras gerais de `queue-default-and-comment-edit.md` ("Cenários — regras
gerais"): `M` = QA Membro Suporte, `A` = QA Admin Suporte, `D` = Diretor, `S` =
id de QA Suporte; títulos `[QA]`; escrita só em QA Suporte; **não alterar #65 a
#68**; "request de action" = `POST` com `Next-Action`; anotar `max(id)` de
`ticket_history` e `message` antes de cada cenário que diz "nada gravado".

**Preparação** (como M, "Novo chamado", tag ativa de QA Suporte):

- `[QA] Aba fila` com `Fila de QA Suporte` → `#G1` (`aberto`, sem destinatário)
- `[QA] Aba encaminhado` com `QA Admin Suporte` → `#G2` (`encaminhado`, A)
- `[QA] Aba andamento` com `QA Membro Suporte` → `#G3` (`em_andamento`, M)
- `[QA] Aba devolvido` com `QA Admin Suporte` → `#G4`; depois "Editar" →
  `Fila de QA Suporte` → salvar (`encaminhado`, sem destinatário)
- `[QA] Atender do autor` com `QA Admin Suporte` → `#G5`; depois, como A,
  "Enviar" o `#G5` para QA Membro Suporte (`encaminhado`, M — autor e
  destinatário)
- `[QA] Atender conflito` com `QA Admin Suporte` → `#G6` (`encaminhado`, A)
- `[QA] Comentários excluíveis` com a fila → `#K2`; em `#K2`, M publica `[QA]
Excluir público` (`d1`), privado `[QA] Excluir privado` (`d2`) e `[QA] Mais
um` (`d4`); A publica `[QA] Público do admin` (`d3`). Anotar os ids.

### Abas da Fila

Consulta de referência **QT2** (trocar `S` pelo setor):

```sql
select
  count(*) as todos,
  count(*) filter (where status in ('aberto','em_analise','encaminhado','aguardando_aprovacao','em_andamento') and assigned_to is null) as em_aberto,
  count(*) filter (where status = 'encaminhado' and assigned_to is not null) as encaminhados,
  count(*) filter (where status = 'em_andamento') as em_andamento,
  count(*) filter (where status = 'resolvido') as resolvidos,
  count(*) filter (where status = 'fechado') as fechados,
  count(*) filter (where status = 'cancelado') as cancelados
from ticket where current_department_id = S
```

| #    | Quem  | Ação                                                                                                                                                                                                                                          | Esperado                                                                                                                                                                                                                                                     |
| ---- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| QT1  | M     | `/queue`                                                                                                                                                                                                                                      | abas na ordem **Todos, Em aberto, Encaminhados, Em andamento, Resolvidos, Fechados, Cancelados**, cada uma com contagem; **Em aberto** ativa (`aria-current="page"`)                                                                                         |
| QT2  | banco | consulta QT2 para `S`                                                                                                                                                                                                                         | os sete números batem com as abas                                                                                                                                                                                                                            |
| QT3  | banco | `L1 = count(*) where current_department_id = S and status in ('aberto','em_analise','aguardando_aprovacao') and assigned_to is not null`; `L2 = count(*) where current_department_id = S and status = 'em_andamento' and assigned_to is null` | soma das seis abas sem Todos = `todos − L1 + L2`. Registrar `L1` e `L2` no relatório (legado, riscos 1 e 2)                                                                                                                                                  |
| QT4  | M     | clicar cada aba                                                                                                                                                                                                                               | Em aberto: `#G1`, `#G4` (com selo "Encaminhado") e `#K2`, sem `#G2`, `#G3`, `#G5`, `#G6`. Encaminhados: `#G2`, `#G5`, `#G6`. Em andamento: `#G3`. Todos: todos os da preparação. Em cada aba, os ids = os da condição QT2 correspondente, mais novo primeiro |
| QT5  | M     | `/queue?tab=open&periodo=todos`, `?tab=all`, `?tab=forwarded`, `?tab=in_progress`, `?tab=todos`, `?tab=em_andamento`, `?tab=Open`                                                                                                             | os quatro primeiros abrem a aba correspondente; os três últimos abrem Em aberto com Todos; nenhum erro                                                                                                                                                       |
| QT6  | M     | filtros em Todos, Em aberto, Encaminhados e Em andamento                                                                                                                                                                                      | Status: 8 opções em Todos, 5 em Em aberto (sem "Resolvido"), **ausente** em Encaminhados e Em andamento. Destinatário em Em aberto: só `Sem destinatário`; em Encaminhados: só pessoas                                                                       |
| QT7  | M     | em Encaminhados, trocar o período para Hoje e Semana; trocar de aba                                                                                                                                                                           | URLs `?tab=forwarded&periodo=hoje` etc.; ao trocar de aba o período se mantém; contagens = QT2 com o intervalo                                                                                                                                               |
| QT8  | D     | `/queue?setor=S`; clicar Encaminhados; depois o filtro Setor → Diretoria                                                                                                                                                                      | URL `?tab=forwarded&setor=S&periodo=todos`; contagens = QT2 de `S`; ao trocar para Diretoria a aba continua Encaminhados, `setor` sai da URL, contagens = QT2 da Diretoria                                                                                   |
| QT9  | D     | setor sem chamado numa aba nova (conferir no banco), com Todos; depois Hoje                                                                                                                                                                   | textos da tabela de abas (ex.: `Nenhum chamado encaminhado` / `Os chamados do setor encaminhados para alguém aparecem aqui até o destinatário começar o atendimento.`); com Hoje: `Nenhum chamado neste período`                                             |
| QT10 | M     | de Encaminhados, abrir `#G2`; usar o link de voltar                                                                                                                                                                                           | o detalhe abre com `?from=queue&tab=forwarded…`; `Fila do setor` volta para Encaminhados com o mesmo período                                                                                                                                                 |
| QT11 | A     | "Assumir" no `#G1` (Em aberto)                                                                                                                                                                                                                | `#G1` sai de Em aberto e entra em Em andamento; contagens das duas abas mudam em 1; Todos inalterado                                                                                                                                                         |
| QT12 | M     | `/queue` em 390×844; abrir `?tab=cancelled`                                                                                                                                                                                                   | as sete abas alcançáveis por rolagem horizontal, sem quebrar a página; a aba ativa visível (ou registrar que exige rolar)                                                                                                                                    |

### Excluir comentário

| #    | Quem  | Ação                                                                                                                    | Esperado                                                                                                                                                                                               |
| ---- | ----- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| CD1  | M     | `/tickets/K2`                                                                                                           | "Excluir" (e "Editar") só em `d1`, `d2` e `d4`; nenhum em `d3`                                                                                                                                         |
| CD2  | M     | "Excluir" em `d1` → "Cancelar"                                                                                          | dialog `Excluir comentário?` com a descrição do contrato; Cancelar fecha, foco volta ao botão; nenhum request; `d1` continua                                                                           |
| CD3  | M     | "Excluir" em `d1` → confirmar                                                                                           | durante o envio `Excluindo…`; toast `Comentário excluído.`; `d1` some da lista                                                                                                                         |
| CD4  | banco | depois do CD3                                                                                                           | `select count(*) from message where id = d1` = 0; `select count(*) from attachment where message_id = d1` = 0; `max(id)` de `ticket_history` igual ao anotado; `ticket.updated_at` do `#K2` inalterado |
| CD5  | M     | excluir `d2` (privado)                                                                                                  | mesmo resultado do CD3/CD4                                                                                                                                                                             |
| CD6  | A e M | A abre `/tickets/K2` e forja `deleteTicketComment` com `messageId = d4`; M forja com `messageId = d3`                   | A não vê "Excluir" em `d4`; os dois requests devolvem `{ ok: false, code: "FORBIDDEN", message: "Você não pode excluir este comentário." }`; `d3` e `d4` continuam no banco                            |
| CD7  | M     | forjar `messageId = 999999`; depois `messageId = d4` com `ticketId = #G1`                                               | os dois: `Este comentário não existe mais. Confira a lista atualizada.` (`NOT_FOUND`); nada apagado                                                                                                    |
| CD8  | M     | forjar `messageId = "abc"`, `0`, `1e12`                                                                                 | `Comentário inválido.` (`INVALID_INPUT`); nada apagado                                                                                                                                                 |
| CD9  | M     | duas abas em `/tickets/K2`; excluir `d4` na aba 1; na aba 2 (sem recarregar) "Excluir" em `d4` → confirmar              | aba 2: toast `Este comentário não existe mais. Confira a lista atualizada.` e a lista recarrega sem `d4`                                                                                               |
| CD10 | M     | publicar `d5`; aba 1 abre a edição de `d5`; aba 2 exclui `d5`; aba 1 salva                                              | aba 1: `Comentário não encontrado.` (mensagem da edição); nada gravado                                                                                                                                 |
| CD11 | M     | (se houver) comentário de M em chamado `fechado`/`cancelado` (consulta do E6.14 de `queue-default-and-comment-edit.md`) | sem "Excluir"; forjar → `Você não pode excluir este comentário.`. Sem linha → não executado                                                                                                            |
| CD12 | D     | `/tickets/K2` (vê internos)                                                                                             | nenhum "Excluir" em comentário de outra pessoa                                                                                                                                                         |
| CD13 | M     | 390×844: "Excluir" num comentário                                                                                       | dialog cabe na tela; botões alcançáveis                                                                                                                                                                |
| CD14 | M     | linha do tempo do `#K2` antes e depois                                                                                  | igual (excluir comentário não gera histórico)                                                                                                                                                          |

### "Atender"

| #    | Quem         | Ação                                                                                                                                                            | Esperado                                                                                                                                                                                                                                                                 |
| ---- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AT1  | A            | `/tickets/G2`                                                                                                                                                   | botão "Atender" no cabeçalho; sem "Editar" (A não é autor)                                                                                                                                                                                                               |
| AT2  | A            | "Atender" no `#G2`                                                                                                                                              | `Atendendo…` durante o envio; toast `Você começou a atender o chamado #G2.`; badge `Em andamento`; botão some; linha do tempo ganha "Mudança de status" `Alterou o status de Encaminhado para Em andamento.` por QA Admin Suporte                                        |
| AT3  | banco        | depois do AT2                                                                                                                                                   | `#G2`: `status = 'em_andamento'`, `assigned_to = A` (inalterado), `updated_at` = `changed_at` da linha nova; `ticket_history`: **uma** linha nova, `mudanca_status`, `from_status = 'encaminhado'`, `to_status = 'em_andamento'`, `changed_by = A`; nenhuma `atribuicao` |
| AT4  | M            | `/queue`                                                                                                                                                        | `#G2` saiu de Encaminhados e está em Em andamento; contagens mudaram em 1                                                                                                                                                                                                |
| AT5  | M            | `/tickets/G5` (autor e destinatário, `encaminhado`)                                                                                                             | "Atender" e "Editar" lado a lado. Clicar "Editar": conforme decisão do `df-ui` (recomendação: "Atender" some, ficam Cancelar e Salvar); "Cancelar" → os dois de volta                                                                                                    |
| AT6  | M            | "Atender" no `#G5`                                                                                                                                              | toast de sucesso; `Em andamento`; "Editar" continua; "Atender" some                                                                                                                                                                                                      |
| AT7  | vários       | M em `/tickets/G6`; A em `/tickets/G3`; A em `/tickets/G4`; D em `/tickets/G6`; M em `/tickets/G1`                                                              | nenhum "Atender" (não é destinatário; `em_andamento`; na fila; Diretor não destinatário; fila)                                                                                                                                                                           |
| AT8  | M            | request de `attendTicket` para `#G6` (destinatário A)                                                                                                           | `{ ok: false, code: "CONFLICT", message: "Este chamado agora está com QA Admin Suporte." }` (risco 6); nada gravado                                                                                                                                                      |
| AT9  | A, duas abas | as duas em `/tickets/G6`; "Atender" na aba 1; depois na aba 2 sem recarregar                                                                                    | aba 1: sucesso. Aba 2: toast `Você já está atendendo este chamado.` e a página atualiza (badge Em andamento, sem botão); no banco, **uma** `mudanca_status` nova para `#G6`                                                                                              |
| AT10 | A e M        | preparar `[QA] Atender devolvido` (M → A) → `#G7`; A abre `/tickets/G7`; M devolve `#G7` à `Fila de QA Suporte` pelo "Editar"; A clica "Atender" sem recarregar | A recebe `Este chamado voltou para a fila do setor. Confira a página atualizada.` e a página atualiza sem o botão; nenhuma `mudanca_status` da tentativa                                                                                                                 |
| AT11 | A e D        | preparar `#G8` (M → A); A abre `/tickets/G8`; D (`/queue?setor=S`) envia `#G8` para M; A clica "Atender"                                                        | `Este chamado agora está com QA Membro Suporte.`; nada gravado pela tentativa                                                                                                                                                                                            |
| AT12 | A            | request de `attendTicket` com `ticketId = "abc"`, `0`, `1e12`; depois id de um chamado da Diretoria                                                             | os três primeiros: `Chamado inválido.` (`INVALID_INPUT`); o último: `NOT_FOUND`, `Chamado não encontrado.`; nada gravado                                                                                                                                                 |
| AT13 | A            | request de `attendTicket` para `#66` (transferência pendente) e para `[QA] Janela aberta` (`resolvido`)                                                         | A não é destinatário de nenhum dos dois: `CONFLICT` com a frase de `describeTicketAttendConflict` para o destinatário atual (conferir no banco); nunca sucesso; nada gravado                                                                                             |
| AT14 | M e A        | preparar `[QA] Atender mobile` (M → A); A abre o detalhe em 390×844                                                                                             | "Atender" e "Editar" cabem no cabeçalho (quebram linha se precisar), alcançáveis                                                                                                                                                                                         |
| AT15 | qualquer     | toda a bateria                                                                                                                                                  | nenhum e-mail disparado pelo "Atender" (sem chamada ao Resend nos logs do dev server); nenhum erro nem aviso de hidratação (MCP `next-devtools`)                                                                                                                         |

Ao final: M e A ativos em QA Suporte.

## Checklist de encerramento

- [x] `DEPARTMENT_QUEUE_TABS` (7), `DepartmentQueueAssigneeCriterion`, `assignee` nas regras, textos novos e de "Em aberto", `mapDepartmentQueueTabs` (`df-architect`)
- [x] `TicketCommentDeleteBlockReason`, `DeleteTicketMessageValues`/`Outcome`, `DeleteTicketCommentTarget`, `ticketCommentDeleteBlockFor`, `canDeleteTicketComment`, `buildDeleteTicketCommentTarget`, textos, `deleteTicketCommentSchema` (`df-architect`)
- [x] `TicketAttend*`, `StartTicketWork*`, `ATTENDABLE_TICKET_STATUS`/`ATTENDED_TICKET_STATUS`, `ticketAttendBlockFor`, `canAttendTicket`, `canAttendTicketDetail`, `isTicketAttendConflict`, `describeTicketAttended`, `describeTicketAttendConflict`, textos, `attendTicketSchema` (`df-architect`)
- [ ] `queueTabCondition` com critério de destinatário e contagens por `mapDepartmentQueueTabs`; `deleteTicketMessage`; `startTicketWork` (`df-data`)
- [ ] `deleteTicketComment`; `attendTicket` (`df-actions`)
- [ ] "Excluir" com `AlertDialog` no item do comentário; "Atender" no cabeçalho nos dois modos (`df-ui`)
- [ ] cenários do `df-qa`
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm run build`
