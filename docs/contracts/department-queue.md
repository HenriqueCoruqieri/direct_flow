# Contrato — Fila do setor

Entrada das ondas 1 e 2. As decisões estão no plano,
`docs/plans/department-queue.md`, e não são repetidas aqui. Este documento é a
referência técnica: assinaturas, consultas, sequências, textos e cenários.
Padrões reaproveitados:

- abas, período, tabela, `rowHref` e estado vazio de `docs/contracts/my-tickets.md`
- regra de destinatário válido e `listTicketAssigneeOptions` de
  `docs/contracts/ticket-assignee.md`
- parâmetro `?setor=` lido independentemente e validado contra as opções de
  `docs/contracts/registry-people.md` (revisão de 2026-10-05)
- outcomes, resultado de action e travas de `docs/contracts/ticket-edit.md` e
  `docs/contracts/ticket-resolution.md`

Versões observadas: `next@16.3.5`, `drizzle-orm@0.45.2`, `zod@4.6.5`,
`@tanstack/react-table@9.2.4`, `react-hook-form@7.88`.

> Revisão de 2026-10-06 (aba Resolvidos, aprovada pelo usuário): as abas
> passam a ser **Em aberto · Resolvidos · Fechados · Cancelados**
> (`?tab=resolved`). "Em aberto" usa `ACTIVE_TICKET_STATUSES` (não finais
> **sem** `resolvido`, `docs/contracts/my-tickets.md`); "Resolvidos" é o setor
> atual com `statuses: ["resolvido"]`. As quatro abas continuam particionando os
> chamados do setor. Botões da linha não mudam: `resolvido` nunca foi
> atribuível, então nenhuma linha de Resolvidos tem "Assumir" nem "Enviar".
> Tabelas, Q2, Q3, Q6 e Q15 abaixo já estão atualizados; cenários novos em
> "Aba Resolvidos".

## Escopo técnico em uma frase

Uma tela nova (`/queue`), duas leituras e uma escrita: a escrita troca só
`ticket.assigned_to` (e `updated_at`) e grava uma `atribuicao`, numa transação
que reconfere a regra do domínio e o destinatário que a pessoa viu. Sem schema,
sem migration, sem e-mail.

## Decisões do arquiteto (não fixadas no plano)

| Tema                                         | Decisão                                                                                                                                                                                                                                                                                                                                                        |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Uma função de dados ou duas                  | **Uma**, `assignTicket(values)`, com `mode: "assume" \| "send"` em união discriminada. A sequência é a mesma; muda só a regra do domínio e de onde vem o novo destinatário                                                                                                                                                                                     |
| Conflito antes da regra                      | A conferência de `expectedAssigneeId` vem **antes** da regra do domínio. Se outra pessoa assumiu, a regra de "Assumir" também recusaria (`ALREADY_TAKEN`), e a pessoa receberia um "não é possível" genérico no lugar de "já foi assumido por {nome}". Quem chega ao conflito já passou em `canViewTicket`, e o detalhe mostra o destinatário: o nome não vaza |
| Conflito sendo a própria pessoa              | `Você já assumiu este chamado.` (mesmo usuário em duas abas). Por isso o outcome traz `currentAssigneeId` além do nome                                                                                                                                                                                                                                         |
| Conflito sem destinatário                    | `Este chamado ficou sem destinatário. Confira a lista atualizada.` Hoje é inalcançável (ninguém grava `assigned_to` nulo; `users` não é apagado), mas o texto existe por totalidade                                                                                                                                                                            |
| Conflito com destinatário                    | `Este chamado já foi assumido por {nome}.` (texto do usuário), também quando o atual recebeu o chamado por "Enviar"                                                                                                                                                                                                                                            |
| Destinatário igual ao atual no "Enviar"      | O combobox **não lista** o destinatário atual (`sendTargetOptions`). O schema recusa `assigneeId === expectedAssigneeId` (`Escolha um destinatário diferente do atual.`); com o conflito conferido antes, a transação nunca vê essa igualdade, e ainda assim a recusa como `invalid_assignee`                                                                  |
| Mensagem de destinatário inválido no envio   | Nova: `Este destinatário não está disponível. Escolha uma pessoa ativa do setor do chamado.` A da criação/edição diz "do seu setor", errado para o Diretor enviando em outro setor                                                                                                                                                                             |
| `mustChangePassword` no destinatário enviado | Não impede, como na Entrega B (`listTicketAssigneeOptions` inclui essas pessoas). A exigência de "sem troca de senha pendente" vale para **quem age**                                                                                                                                                                                                          |
| `isTicketLocked`                             | Não entra. Os status atribuíveis excluem `resolvido`, o único em que a janela de 7 dias faz diferença; `isNonFinalTicketStatus` dá o motivo `TICKET_FINISHED` e a tabela de atribuíveis dá `STATUS_NOT_ASSIGNABLE`                                                                                                                                             |
| `isUsableTicketAssignee` em "Assumir"        | É a checagem de setor de quem assume: quem assume vira destinatário, então precisa ser destinatário válido (ativo e do setor do chamado). A atividade já foi conferida antes, com motivo próprio                                                                                                                                                               |
| Status atribuíveis × resolvíveis             | Hoje os valores coincidem com `TICKET_STATUS_IS_RESOLVABLE`, mas são tabelas separadas: são decisões diferentes e podem divergir (ex.: Aprovações)                                                                                                                                                                                                             |
| Valor das abas na URL                        | `open`, `resolved`, `closed`, `cancelled` (`?tab=open`), em inglês como as de Meus chamados                                                                                                                                                                                                                                                                    |
| `setor` igual ao próprio setor               | Tratado como ausente (`queueDepartmentParamFor` → `null`): o link canônico da Diretoria para o Diretor é sem `setor`                                                                                                                                                                                                                                           |
| Período no estado vazio                      | Reaproveita `MY_TICKETS_EMPTY_PERIOD` e o tipo `MyTicketsEmptyCopy`: o texto não cita a tela                                                                                                                                                                                                                                                                   |
| Presets e schema de período                  | `ALL_TIME_PERIOD_PRESETS` (`domain/period.ts`) e `allTimePeriodSchema(today)` (`validation/period.ts`) passam a ser a fonte; `MY_TICKETS_PERIOD_PRESETS` e `myTicketsPeriodSchema` viraram aliases, sem mudar valor nem tipo                                                                                                                                   |
| Sucesso                                      | `Você assumiu o chamado #12.` e `Chamado #12 enviado para {nome}.`                                                                                                                                                                                                                                                                                             |
| Revalidação                                  | `/queue`, detalhe e `/tickets`. Início não: o resumo não lê `assigned_to`. Outras escritas que revalidam `/queue`: seção "Quem revalida `/queue`"                                                                                                                                                                                                              |

## Tabelas, enums e migration

Nada novo.

| Tabela             | Uso                                                                                                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ticket`           | lista: `id`, `title`, `type`, `status`, `created_by`, `assigned_to`, `current_department_id`, `created_at`. Escrita: `assigned_to`, `updated_at`        |
| `users`            | lista: `name` do criador e do destinatário. Transação: quem age (`department_id`, `role`, `is_active`, `must_change_password`, `name`) e o destinatário |
| `department`       | transação: `is_board` de quem age. Página do Diretor: opções do filtro (`listDepartmentOptions`)                                                        |
| `ticket_tag`/`tag` | lista: `tag.id`, `tag.name` (no máximo uma por chamado)                                                                                                 |
| `ticket_transfer`  | lista e transação: existência de `status = 'pendente'`                                                                                                  |
| `ticket_history`   | escrita: uma linha `atribuicao` (`changed_by`, `from_assignee_id`, `to_assignee_id`, `changed_at`)                                                      |

Índices que atendem: `ticket_dept_status_idx` (`current_department_id, status,
created_at desc`) para lista e contagem; `transfer_one_pending_per_ticket_idx` /
`transfer_ticket_idx` para a transferência pendente.

## Tipos — `app/_lib/types/`

### `app/_lib/types/ticket-assignment.ts` (novo)

```ts
export interface TicketAssignmentFacts extends TicketVisibilityFacts {
  status: TicketStatus
  hasPendingTransfer: boolean
}

export type TicketAssignmentActorBlockReason =
  "ACTOR_INACTIVE" | "PASSWORD_CHANGE_REQUIRED"

export type TicketAssignmentStateBlockReason =
  "TICKET_FINISHED" | "AWAITING_APPROVAL" | "STATUS_NOT_ASSIGNABLE"

export type TicketAssumeBlockReason =
  | TicketAssignmentActorBlockReason
  | "OUTSIDE_TICKET_DEPARTMENT"
  | TicketAssignmentStateBlockReason
  | "ALREADY_ASSIGNEE"
  | "ALREADY_TAKEN"

export type TicketSendBlockReason =
  | TicketAssignmentActorBlockReason
  | "NOT_DISPATCHER"
  | TicketAssignmentStateBlockReason

export interface AssumeTicketValues {
  mode: "assume"
  ticketId: number
  actorId: number
  expectedAssigneeId: number | null
}

export interface SendTicketValues {
  mode: "send"
  ticketId: number
  actorId: number
  assigneeId: number
  expectedAssigneeId: number | null
}

export type AssignTicketValues = AssumeTicketValues | SendTicketValues

export interface TicketAssignmentSaved {
  status: "saved"
  ticketId: number
  assigneeName: string
}

export interface TicketNotAssignable {
  status: "not_assignable"
}

export interface TicketAssignmentConflict {
  status: "conflict"
  currentAssigneeId: number | null
  currentAssigneeName: string | null
}

export type AssignTicketOutcome =
  | TicketAssignmentSaved
  | TicketNotFound // de types/ticket-edit.ts
  | TicketNotAssignable
  | TicketAssignmentConflict
  | TicketInvalidAssignee // de types/ticket.ts

export interface TicketAssignmentSource {
  id: number
  assignedTo: number | null
}

export interface SendTicketFormDefaults {
  ticketId: number
  expectedAssigneeId: number | null
  assigneeId?: number
}
```

- Quem age é `TicketActorFacts` (`types/ticket.ts`, já existente: `userId`,
  `departmentId`, `isBoard`, `role`, `isActive`, `mustChangePassword`). A página
  monta com `{ userId: actor.id, ...facts }` (`getAccountFacts()`); a transação,
  com a linha travada de `users ⋈ department`.
- `TicketAssignmentFacts` tem o mesmo formato de `TicketResolutionFacts`, mas é
  outro conceito; o item da lista o satisfaz sem conversão.
- `SendTicketFormDefaults` tem o formato de `DefaultValues<SendTicketInput>`:
  `assigneeId` ausente deixa o combobox sem seleção.

### `app/_lib/types/department-queue.ts` (novo)

```ts
export type DepartmentQueueTab = (typeof DEPARTMENT_QUEUE_TABS)[number] // "open" | "closed" | "cancelled"

export interface DepartmentQueueTabRule {
  label: string
  statuses: readonly TicketStatus[]
  emptyTitle: string
  emptyDescription: string
}

export type DepartmentQueueTabCounts = Record<DepartmentQueueTab, number>

export interface DepartmentQueueAccessFacts {
  isUnassigned: boolean
}

export interface DepartmentQueueLocation {
  tab: DepartmentQueueTab
  period: PeriodFilterSelection
  departmentId: number | null
}

export interface DepartmentQueueListItem extends TicketAssignmentFacts {
  id: number
  title: string
  type: TicketType
  tagId: number | null
  tagName: string | null
  creatorName: string
  assigneeName: string | null
  createdAt: Date
}

export interface DepartmentQueueRowActions {
  assume: boolean
  send: boolean
}
```

- `DepartmentQueueListItem` herda `createdBy`, `assignedTo`,
  `currentDepartmentId`, `status` e `hasPendingTransfer`: entra direto em
  `queueRowActionsFor` e em `buildSendTicketFormDefaults`.
- `assigneeName` nulo **só** quando `assignedTo` é nulo (chamados antigos).
- `DepartmentQueueLocation.departmentId`: `null` = setor de quem vê. Na saída de
  `parseDepartmentQueueParams` é o **pedido**; depois de
  `applicableQueueDepartmentId`, o **aplicado**.
- `RegistryAccessFacts` (de `getAccountFacts()`) satisfaz
  `DepartmentQueueAccessFacts`.

## Domínio — `app/_lib/domain/`

### `app/_lib/domain/department-queue-tabs.ts` (novo)

```ts
export const DEPARTMENT_QUEUE_TABS = [
  "open",
  "resolved",
  "closed",
  "cancelled",
] as const
```

Arquivo-folha, mesmo papel de `my-tickets-tabs.ts`: `types/department-queue.ts`
deriva o tipo dele sem ciclo. Consumidores importam de
`@/app/_lib/domain/department-queue`, que o reexporta.

### `app/_lib/domain/ticket-assignment.ts` (novo)

```ts
export const isAssignableStatus: (status: TicketStatus) => boolean
export const isTicketDispatcher: (
  actor: TicketActorFacts,
  departmentId: number,
) => boolean
export const isTicketTaken: (ticket: TicketVisibilityFacts) => boolean

export const ticketAssumeBlockFor: (
  actor: TicketActorFacts,
  ticket: TicketAssignmentFacts,
) => TicketAssumeBlockReason | null
export const canAssumeTicket: (
  actor: TicketActorFacts,
  ticket: TicketAssignmentFacts,
) => boolean
export const ticketSendBlockFor: (
  actor: TicketActorFacts,
  ticket: TicketAssignmentFacts,
) => TicketSendBlockReason | null
export const canSendTicket: (
  actor: TicketActorFacts,
  ticket: TicketAssignmentFacts,
) => boolean

export const sendTargetOptions: (
  assignees: readonly AssigneeOption[],
  currentAssigneeId: number | null,
) => AssigneeOption[]
export const buildSendTicketFormDefaults: (
  ticket: TicketAssignmentSource,
) => SendTicketFormDefaults
export const sendTicketDialogTitle: (ticketId: number) => string
export const describeCurrentAssignee: (assigneeName: string | null) => string
export const describeTicketAssumed: (ticketId: number) => string
export const describeTicketSent: (
  ticketId: number,
  assigneeName: string,
) => string
export const describeTicketAssignmentConflict: (
  conflict: TicketAssignmentConflict,
  actorId: number,
) => string

export const ASSUME_TICKET_LABEL // "Assumir"
export const ASSUME_TICKET_PENDING_LABEL // "Assumindo…"
export const SEND_TICKET_LABEL // "Enviar"
export const SEND_TICKET_PENDING_LABEL // "Enviando…"
export const SEND_TICKET_DIALOG_DESCRIPTION
export const TICKET_NOT_ASSUMABLE_MESSAGE
export const TICKET_NOT_SENDABLE_MESSAGE
export const UNAVAILABLE_SEND_TARGET_MESSAGE
```

**Status atribuíveis** (tabela privada `satisfies Record<TicketStatus, boolean>`;
status novo no enum quebra o `tsc` até ser classificado):

| `aberto` | `em_analise` | `encaminhado` | `aguardando_aprovacao` | `em_andamento` | `resolvido` | `fechado` | `cancelado` |
| -------- | ------------ | ------------- | ---------------------- | -------------- | ----------- | --------- | ----------- |
| sim      | sim          | sim           | não                    | sim            | não         | não       | não         |

**`ticketAssumeBlockFor`** — primeiro motivo que vale, nesta ordem:

| #   | Motivo                      | Condição                                                                   |
| --- | --------------------------- | -------------------------------------------------------------------------- |
| 1   | `ACTOR_INACTIVE`            | `!actor.isActive`                                                          |
| 2   | `PASSWORD_CHANGE_REQUIRED`  | `actor.mustChangePassword`                                                 |
| 3   | `OUTSIDE_TICKET_DEPARTMENT` | `!isUsableTicketAssignee(actor, ticket.currentDepartmentId)` (setor ≠)     |
| 4   | `TICKET_FINISHED`           | `!isNonFinalTicketStatus(status)` (`fechado`, `cancelado`)                 |
| 5   | `AWAITING_APPROVAL`         | `hasPendingTransfer`                                                       |
| 6   | `STATUS_NOT_ASSIGNABLE`     | `!isAssignableStatus(status)` (`resolvido`, `aguardando_aprovacao`)        |
| 7   | `ALREADY_ASSIGNEE`          | `assignedTo === actor.userId`                                              |
| 8   | `ALREADY_TAKEN`             | `isTicketTaken(ticket)`: `assignedTo !== null && assignedTo !== createdBy` |

O Diretor fora do próprio setor para no motivo 3: ele nunca assume em outra
fila. O autor que está no setor do chamado e não é o destinatário pode assumir
(destinatário nulo).

**`ticketSendBlockFor`** — nesta ordem: `ACTOR_INACTIVE` → `PASSWORD_CHANGE_REQUIRED`
→ `NOT_DISPATCHER` (`!isTicketDispatcher(actor, ticket.currentDepartmentId)`) →
`TICKET_FINISHED` → `AWAITING_APPROVAL` → `STATUS_NOT_ASSIGNABLE`. Não olha o
destinatário atual: redistribuir chamado já assumido é permitido.

| Nome                               | Semântica                                                                                                                                                                                        |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `isTicketDispatcher`               | `actor.isBoard` **ou** (`role === "admin"` e `actor.departmentId === departmentId`). A página usa para decidir se carrega atribuíveis                                                            |
| `isTicketTaken`                    | "Já assumido": destinatário definido e diferente do autor                                                                                                                                        |
| `sendTargetOptions`                | A lista sem o destinatário atual. Nulo → a lista inteira                                                                                                                                         |
| `buildSendTicketFormDefaults`      | `{ ticketId: ticket.id, expectedAssigneeId: ticket.assignedTo }`, sem `assigneeId`                                                                                                               |
| `sendTicketDialogTitle`            | `Enviar chamado #12`                                                                                                                                                                             |
| `describeCurrentAssignee`          | `Destinatário atual: Ana.`; nulo → `Este chamado ainda não tem destinatário.` (dica do combobox no dialog)                                                                                       |
| `describeTicketAssumed`            | `Você assumiu o chamado #12.`                                                                                                                                                                    |
| `describeTicketSent`               | `Chamado #12 enviado para Ana.`                                                                                                                                                                  |
| `describeTicketAssignmentConflict` | `currentAssigneeId === actorId` → `Você já assumiu este chamado.`; nome nulo → `Este chamado ficou sem destinatário. Confira a lista atualizada.`; senão `Este chamado já foi assumido por Ana.` |

Textos das constantes:

| Constante                         | Texto                                                                                  |
| --------------------------------- | -------------------------------------------------------------------------------------- |
| `SEND_TICKET_DIALOG_DESCRIPTION`  | `Escolha quem do setor do chamado vai cuidar dele.`                                    |
| `TICKET_NOT_ASSUMABLE_MESSAGE`    | `Não é possível assumir este chamado agora.`                                           |
| `TICKET_NOT_SENDABLE_MESSAGE`     | `Não é possível enviar este chamado agora.`                                            |
| `UNAVAILABLE_SEND_TARGET_MESSAGE` | `Este destinatário não está disponível. Escolha uma pessoa ativa do setor do chamado.` |

### `app/_lib/domain/department-queue.ts` (novo)

```ts
export { DEPARTMENT_QUEUE_TABS } from "@/app/_lib/domain/department-queue-tabs"
export const DEPARTMENT_QUEUE_PATH = "/queue"
export const DEPARTMENT_QUEUE_LABEL = "Fila do setor"
export const DEPARTMENT_QUEUE_DEPARTMENT_PARAM = "setor"
export const DEPARTMENT_QUEUE_DEPARTMENT_FILTER_LABEL = "Setor"
export const NO_ASSIGNEE_LABEL = "Sem destinatário"
export const DEPARTMENT_QUEUE_UNASSIGNED_MESSAGE // = TICKET_CREATION_BLOCK_MESSAGES.DEPARTMENT_UNASSIGNED
export const DEFAULT_DEPARTMENT_QUEUE_TAB: DepartmentQueueTab // "open"
export const DEPARTMENT_QUEUE_PERIOD_PRESETS // = ALL_TIME_PERIOD_PRESETS: ["todos", "hoje", "semana", "mes"]
export const DEFAULT_DEPARTMENT_QUEUE_PERIOD: PeriodFilterSelection // { periodo: "todos" }
export const DEPARTMENT_QUEUE_TAB_RULES // satisfies Record<DepartmentQueueTab, DepartmentQueueTabRule>

export const hasDepartmentQueue: (
  facts: DepartmentQueueAccessFacts | null,
) => boolean
export const queueDepartmentOptions: (
  viewer: TicketViewerFacts,
  options: readonly DepartmentOption[],
) => DepartmentOption[]
export const queueDepartmentParamFor: (
  viewer: TicketViewerFacts,
  departmentId: number,
) => number | null
export const applicableQueueDepartmentId: (
  viewer: TicketViewerFacts,
  requestedDepartmentId: number | null,
  options: readonly DepartmentOption[],
) => number | null
export const queueDepartmentIdFor: (
  viewer: TicketViewerFacts,
  appliedDepartmentId: number | null,
) => number
export const departmentQueueEmptyCopy: (
  tab: DepartmentQueueTab,
  period: PeriodFilterSelection,
) => MyTicketsEmptyCopy
export const queueRowActionsFor: (
  viewer: TicketActorFacts,
  row: TicketAssignmentFacts,
) => DepartmentQueueRowActions
```

Abas (`DEPARTMENT_QUEUE_TAB_RULES`; a relação é sempre "setor atual"):

| Aba (`?tab=`) | `label`    | `statuses`                 | `emptyTitle`             | `emptyDescription`                                                                                                                                  |
| ------------- | ---------- | -------------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `open`        | Em aberto  | `ACTIVE_TICKET_STATUSES`   | Nenhum chamado em aberto | Os chamados que estiverem no setor aparecem aqui até serem resolvidos ou cancelados.                                                                |
| `resolved`    | Resolvidos | `[RESOLVED_TICKET_STATUS]` | Nenhum chamado resolvido | Os chamados do setor que foram resolvidos aparecem aqui até o fechamento automático, 7 dias após a resolução. (`7` = `RESOLUTION_EDIT_WINDOW_DAYS`) |
| `closed`      | Fechados   | `["fechado"]`              | Nenhum chamado fechado   | Os chamados do setor que foram fechados aparecem aqui.                                                                                              |
| `cancelled`   | Cancelados | `["cancelado"]`            | Nenhum chamado cancelado | Os chamados do setor que foram cancelados aparecem aqui.                                                                                            |

As quatro abas particionam os chamados do setor: todo chamado está em exatamente
uma. Todo chamado listado passa em `canViewTicket` para quem vê (está no setor
atual, ou é o Diretor): nenhuma linha leva a 404.

| Nome                          | Semântica                                                                                                                                                                                                       |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hasDepartmentQueue`          | `facts !== null && !facts.isUnassigned`. Item do menu **e** decisão da página entre fila e aviso                                                                                                                |
| `queueDepartmentOptions`      | Diretor: `assignableDepartments(options)` (ativos e fora do Não alocado; a Diretoria entra). Demais: `[]`                                                                                                       |
| `queueDepartmentParamFor`     | `null` quando `departmentId` é o setor de quem vê; senão o próprio id. **A** forma de transformar uma escolha do filtro em valor de URL                                                                         |
| `applicableQueueDepartmentId` | Não diretor, pedido nulo ou id fora de `options` → `null`. Diretor com id válido → `queueDepartmentParamFor(viewer, id)` (o próprio setor também vira `null`)                                                   |
| `queueDepartmentIdFor`        | `applied ?? viewer.departmentId`: o setor cuja fila a página consulta                                                                                                                                           |
| `departmentQueueEmptyCopy`    | `Todos` → título e descrição da aba; outro período → `MY_TICKETS_EMPTY_PERIOD` (`Nenhum chamado neste período` / `Nenhum chamado desta aba foi aberto no período escolhido. Escolha outro período ou “Todos”.`) |
| `queueRowActionsFor`          | `{ assume: canAssumeTicket(viewer, row), send: canSendTicket(viewer, row) }`. **A** decisão dos botões da linha; a UI não repete condição                                                                       |

### `app/_lib/domain/period.ts` e `my-tickets.ts` (alterados, sem mudança de API)

```ts
export const ALL_TIME_PERIOD_PRESETS // ["todos", ...PRESET_PERIODS] as const satisfies readonly PresetPeriodOption[]
export const MY_TICKETS_PERIOD_PRESETS = ALL_TIME_PERIOD_PRESETS
```

## Validação — `app/_lib/validation/`

### `app/_lib/validation/period.ts` (acrescido)

```ts
export const allTimePeriodSchema // (today: DateKey) => discriminatedUnion: enum(ALL_TIME_PERIOD_PRESETS) | customPeriodSchema(today)
```

`myTicketsPeriodSchema` passou a ser `allTimePeriodSchema` (mesmo tipo, mesmo
comportamento).

### `app/_lib/validation/department-queue.ts` (novo)

```ts
export const departmentQueueSearchParamsSchema // z.object({ tab: enum(...).catch("open"), setor: idSearchParamSchema(...).optional().catch(undefined) })
export type DepartmentQueueSearchParams = z.infer<
  typeof departmentQueueSearchParamsSchema
>
export const departmentQueuePeriodSchema // = allTimePeriodSchema
export type DepartmentQueuePeriodParams = z.infer<
  ReturnType<typeof departmentQueuePeriodSchema>
>

export const parseDepartmentQueueParams: (
  raw: RawSearchParams,
  today: DateKey,
) => DepartmentQueueLocation
export const departmentQueueKeepParams: (
  tab: DepartmentQueueTab,
  departmentId: number | null,
) => Readonly<Record<string, string>>
export const departmentQueueHref: (location: DepartmentQueueLocation) => string
```

- **`parseDepartmentQueueParams` nunca lança.** `tab`, período e `setor` são
  lidos **independentemente** (primeiro valor de cada chave). Aba inválida →
  `open`; período inválido (inclusive data futura, `ate < de`, data
  inexistente) → **`Todos`**; `setor` não numérico, `0`, zero à esquerda, acima
  do `integer` → `null`. Validar o `setor` contra as opções e contra o papel de
  quem vê é de `applicableQueueDepartmentId`, não daqui.
- `departmentQueueKeepParams`: `{ tab }` ou `{ tab, setor }` — o `keep` do
  `PeriodFilter` e das abas.
- `departmentQueueHref`: **a** forma de montar link da Fila. Ordem
  `tab`, `setor`, `periodo`, `de`, `ate`. Todo período sai na URL, inclusive
  `periodo=todos`.

```
/queue                                                        → Em aberto, Todos, setor próprio
/queue?tab=open&periodo=todos
/queue?tab=closed&periodo=semana
/queue?tab=open&setor=12&periodo=todos                         → Diretor vendo o setor 12
/queue?tab=open&periodo=personalizado&de=2026-09-01&ate=2026-09-10
```

### `app/_lib/validation/ticket-assignment.ts` (novo)

```ts
export const assumeTicketSchema // z.object({ ticketId, expectedAssigneeId })
export type AssumeTicketInput = {
  ticketId: number
  expectedAssigneeId: number | null
}

export const sendTicketSchema // z.object({ ticketId, assigneeId, expectedAssigneeId }).refine(assigneeId !== expectedAssigneeId)
export type SendTicketInput = {
  ticketId: number
  assigneeId: number
  expectedAssigneeId: number | null
}
```

| Campo                | Regra                                                | Mensagem                                                               |
| -------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------- |
| `ticketId`           | `ticketIdSchema` (inteiro positivo ≤ `integer`)      | `Chamado inválido.`                                                    |
| `assigneeId`         | inteiro positivo ≤ `integer`                         | `Selecione o destinatário.`                                            |
| `expectedAssigneeId` | inteiro positivo ≤ `integer`, ou `null`              | `Não foi possível conferir o destinatário atual. Recarregue a página.` |
| (refine)             | `assigneeId !== expectedAssigneeId`, em `assigneeId` | `Escolha um destinatário diferente do atual.`                          |

- Sem `coerce`: o `Combobox` devolve o id numérico.
- O limite de `integer` evita o risco 8 de `ticket-assignee.md` (id gigante
  forjado virando erro inesperado no banco).
- Quem age **nunca** vem do cliente: chaves extras (`actorId`, `mode`) são
  descartadas pelo `z.object`.
- Se o destinatário é ativo e do setor não é formato: é checado na transação.

## `df-auth` — nada novo

`requireSession()` dá `actor.id` e `actor.name`; `getAccountFacts()` (com
`cache`) dá `departmentId`, `role`, `isBoard`, `isUnassigned`, `isActive` e
`mustChangePassword` frescos.

## `df-data` — o que criar

### `app/_lib/data/department-queue.ts` (novo)

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

**Condição de aba num helper privado só**, usado pelas duas funções (mesmo
desenho de `tabCondition` em `my-tickets.ts`):

```ts
const queueTabCondition = (
  departmentId: number,
  tab: DepartmentQueueTab,
): SQL =>
  sql`(${eq(ticket.currentDepartmentId, departmentId)} and ${inArray(ticket.status, [...DEPARTMENT_QUEUE_TAB_RULES[tab].statuses])})`
```

Status vêm **só** de `DEPARTMENT_QUEUE_TAB_RULES`. O helper de período
(`created_at >= start and created_at < end`, `null` → sem condição) é o mesmo de
Meus chamados; se for extraído para um módulo interno de `app/_lib/data/` para
não existir duas vezes, melhor (decisão do `df-data`).

**`listQueueTickets`**

- `ticket inner join users creator on creator.id = ticket.created_by left join
users assignee on assignee.id = ticket.assigned_to left join ticket_tag left
join tag where queueTabCondition(departmentId, tab) and <período>`. Aliases
  com `alias()` (`users` aparece duas vezes).
- `hasPendingTransfer`: `exists (select 1 from ticket_transfer where ticket_id =
ticket.id and status = 'pendente')`, tipado `sql<boolean>` (o `pg` devolve
  `boolean` para `exists`).
- Ordem `ticket.created_at desc, ticket.id desc`. Sem paginação, sem limite.
- Devolve exatamente `DepartmentQueueListItem` (`creatorName = creator.name`,
  `assigneeName = assignee.name`).
- **Não** decide quem pode ver: quem chama já escolheu o setor pelo domínio.
  Não filtra `is_active` de pessoa nem de tag.

**`countQueueTicketsByTab`** — uma consulta:

```sql
select
  count(*) filter (where <queueTabCondition(d, 'open')>)::int      as open,
  count(*) filter (where <queueTabCondition(d, 'resolved')>)::int  as resolved,
  count(*) filter (where <queueTabCondition(d, 'closed')>)::int    as closed,
  count(*) filter (where <queueTabCondition(d, 'cancelled')>)::int as cancelled
from ticket
where current_department_id = $1 and <período>
```

Montada iterando `DEPARTMENT_QUEUE_TABS`; sempre devolve uma chave por aba (setor
sem chamado → `0`). Cada contagem é exatamente o tamanho da lista da aba no
mesmo período.

### `app/_lib/data/tickets.ts` — `assignTicket` (novo)

```ts
export async function assignTicket(
  values: AssignTicketValues,
): Promise<AssignTicketOutcome>
```

Uma transação, nesta ordem:

1. **Chamado** — `select created_by, assigned_to, current_department_id, status
from ticket where id = $ticketId for update`. Sem linha → `{ status:
"not_found" }`.
2. **Quem age** — `select users.department_id, users.role, users.is_active,
users.must_change_password, users.name, department.is_board from users inner
join department … where users.id = $actorId for share of users`. Sem linha →
   `{ status: "not_assignable" }`. Monta `TicketActorFacts`.
3. **Visibilidade** — `!canViewTicket(actor, ticketRow)` → `{ status:
"not_found" }` (quem não vê não distingue de inexistente).
4. **Transferência pendente** — `select id from ticket_transfer where ticket_id
= $1 and status = 'pendente' limit 1`.
5. **Conflito** — `ticketRow.assignedTo !== values.expectedAssigneeId` →
   `select name from users where id = ticketRow.assignedTo` (só se não nulo) e
   `{ status: "conflict", currentAssigneeId: ticketRow.assignedTo,
currentAssigneeName }`.
6. **Regra** — `mode === "assume"` → `ticketAssumeBlockFor(actor, facts)`;
   `mode === "send"` → `ticketSendBlockFor(actor, facts)`, com `facts = {
...ticketRow, hasPendingTransfer }`. Motivo não nulo → `{ status:
"not_assignable" }`.
7. **Novo destinatário**:
   - `assume`: o próprio `actorId`, nome da linha do passo 2. A regra já
     garantiu que ele é destinatário válido (motivo 3).
   - `send`: `select department_id, is_active, name from users where id =
$assigneeId for share`. Sem linha, `!isUsableTicketAssignee(row,
ticketRow.currentDepartmentId)` ou `values.assigneeId === ticketRow.assignedTo`
     → `{ status: "invalid_assignee" }`.
8. **Grava** — `now = new Date()` uma vez; `update ticket set assigned_to =
<novo>, updated_at = now where id = $ticketId` (**nada mais**: status,
   prioridade, setores, `resolved_at` intactos); `insert into ticket_history`
   `{ ticketId, changedBy: actorId, event: "atribuicao", fromAssigneeId:
ticketRow.assignedTo, toAssigneeId: <novo>, changedAt: now }`. Nenhuma linha
   `edicao`, `mudanca_status` nem outra.
9. `{ status: "saved", ticketId, assigneeName }`.

- **Precedência**: `not_found` (chamado) → `not_assignable` (sem linha de quem
  age) → `not_found` (visibilidade) → `conflict` → `not_assignable` (regra) →
  `invalid_assignee`.
- **Travas, nesta ordem**: `ticket` (`for update`) → `users` de quem age
  (`for share`) → `users` do destinatário (`for share`, só em `send`). Mesma
  ordem de `updateTicketByAuthor` (ticket antes de users). Quem age e
  destinatário podem ser a mesma linha (admin enviando para si): dois `for
share` na mesma transação não conflitam. `updatePersonActive` e
  `updatePersonRecord` pegam `for update` em `users` e não travam `ticket`: sem
  ciclo.
- **Duas atribuições simultâneas** no mesmo chamado: a segunda espera o `for
update` do passo 1, lê o `assigned_to` já gravado e cai no conflito.
- **Regra fora da data layer**: status atribuíveis, setor, papel e "já
  assumido" vêm do domínio; o SQL não repete nenhum deles.

## `df-actions` — o que criar

### `app/_lib/actions/ticket-assignment.ts` (novo, `"use server"`)

```ts
export type AssignTicketErrorCode =
  "INVALID_INPUT" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT" | "INVALID_ASSIGNEE"

export interface AssignTicketSuccess {
  ok: true
  message: string
}

export interface AssignTicketFailure {
  ok: false
  message: string
  code?: AssignTicketErrorCode
}

export type AssignTicketResult = AssignTicketSuccess | AssignTicketFailure

export const assumeTicket: (
  input: AssumeTicketInput,
) => Promise<AssignTicketResult>
export const sendTicket: (input: SendTicketInput) => Promise<AssignTicketResult>
```

Forma (as duas iguais, muda o `mode`):

1. `getSession()`; sem sessão → `FORBIDDEN`,
   `Você não tem permissão para atribuir chamados.`
2. `safeParse`; falha → `INVALID_INPUT` com a primeira mensagem.
3. `assignTicket({ mode: "assume", ticketId, actorId: actor.id,
expectedAssigneeId })` ou `{ mode: "send", …, assigneeId }`, em `try/catch`.
   Exceção → `console.error("[assumeTicket]" | "[sendTicket]", error)` e falha
   sem código: `Não foi possível atribuir o chamado agora. Tente novamente.`
4. Mapeamento (`satisfies Record<…, AssignTicketFailure>` onde for estático):

| Outcome            | `code`             | Mensagem                                                                       |
| ------------------ | ------------------ | ------------------------------------------------------------------------------ |
| `not_found`        | `NOT_FOUND`        | `TICKET_NOT_FOUND_MESSAGE` (`Chamado não encontrado.`)                         |
| `not_assignable`   | `FORBIDDEN`        | assumir: `TICKET_NOT_ASSUMABLE_MESSAGE`; enviar: `TICKET_NOT_SENDABLE_MESSAGE` |
| `conflict`         | `CONFLICT`         | `describeTicketAssignmentConflict(outcome, actor.id)`                          |
| `invalid_assignee` | `INVALID_ASSIGNEE` | `UNAVAILABLE_SEND_TARGET_MESSAGE` (assumir nunca recebe; mapear igual)         |

5. `saved` → `revalidatePath(DEPARTMENT_QUEUE_PATH)`,
   `revalidatePath(ticketDetailPath(outcome.ticketId))`,
   `revalidatePath(MY_TICKETS_PATH)`; mensagem `describeTicketAssumed(ticketId)`
   ou `describeTicketSent(ticketId, outcome.assigneeName)`.

- A action **não** lê `getAccountFacts()` nem decide permissão: a transação
  decide com dados travados. Não carrega a lista de atribuíveis.
- `MY_TICKETS_PATH` alcança o novo destinatário na próxima navegação (página
  dinâmica), como em `ticket-assignee.md`. Sem e-mail.

### Quem revalida `/queue`

Toda escrita que muda o que a Fila mostra (status, aba, título, tipo, tag ou
destinatário) chama `revalidatePath(DEPARTMENT_QUEUE_PATH)` ao salvar:

| Origem                                                        | Quando            | Contrato                |
| ------------------------------------------------------------- | ----------------- | ----------------------- |
| `assumeTicket`, `sendTicket` (`actions/ticket-assignment.ts`) | `saved`           | este documento          |
| `resolveTicket` (`actions/ticket-resolution.ts`)              | `saved`           | `ticket-resolution.md`  |
| `createTicket` (`actions/tickets.ts`)                         | `saved`           | `ticket-assignee.md`    |
| `editTicket` (`actions/tickets.ts`)                           | `saved`, sempre   | `ticket-edit.md`        |
| cron `close-resolved-tickets` (`app/api/cron/.../route.ts`)   | `closedCount > 0` | `ticket-edit-window.md` |

Escrita nova que mude qualquer um desses campos entra nesta tabela.

## `df-ui` — o que criar e mudar

### Estrutura

```
app/(app)/layout.tsx                                        alterado — showDepartmentQueue para a sidebar
app/(app)/_components/app-sidebar.tsx                       alterado — item "Fila do setor"
app/(app)/queue/page.tsx                                    novo — Server Component
app/(app)/queue/_components/department-queue-table.tsx      novo — "use client", DataTable + dialog único
app/(app)/queue/_components/queue-department-filter.tsx     novo — "use client", só Diretor
app/(app)/queue/_components/queue-row-actions.tsx           novo — "use client", Assumir/Enviar
app/(app)/queue/_components/send-ticket-dialog.tsx          novo — "use client", RHF
```

Nomes internos a critério do `df-ui`. **Colocation**: abas, estado vazio,
colunas comuns (#, Título, Tipo, Tag, Status, Aberto em) e o filtro de Tag
passam a ter dois usuários no grupo `(app)`. O que for compartilhado sobe de
`app/(app)/tickets/_components/` para `app/(app)/_components/` (ex.:
`MyTicketsEmptyState` → um estado vazio genérico de lista de chamados; abas
genéricas por props `items`/`ariaLabel`). Sem subpasta nova em
`app/_components/`.

### Menu — `layout.tsx` e `app-sidebar.tsx`

- `layout.tsx`: acrescentar `getAccountFacts()` ao `Promise.all` (é `cache`; a
  mesma consulta de `getRegistryAccess`/`getAccountState`) e passar
  `showDepartmentQueue={hasDepartmentQueue(facts)}`.
- `AppSidebar`: prop `showDepartmentQueue: boolean`; quando `true`, `NavItem`
  logo abaixo de "Meus chamados" com `href={DEPARTMENT_QUEUE_PATH}`,
  `label={DEPARTMENT_QUEUE_LABEL}` e ícone `lucide-react` (sugestão:
  `InboxIcon`). Ativo em `/queue` (o `NavItem` já trata).
- Cabeçalho mobile: nada (fora do escopo).

### `/queue` — `app/(app)/queue/page.tsx` (Server Component)

```tsx
export const metadata: Metadata = { title: DEPARTMENT_QUEUE_LABEL }

const DepartmentQueuePage = async ({ searchParams }: PageProps<"/queue">) => {
  const actor = await requireSession()
  const facts = await getAccountFacts()
  if (!facts) notFound()

  if (!hasDepartmentQueue(facts)) {
    // h1 + aviso DEPARTMENT_QUEUE_UNASSIGNED_MESSAGE; nenhuma outra leitura
  }

  const viewer: TicketActorFacts = { userId: actor.id, ...facts }
  const raw = await searchParams
  const now = new Date()
  const requested = parseDepartmentQueueParams(raw, todayKey(now))
  const departmentOptions = facts.isBoard
    ? queueDepartmentOptions(viewer, await listDepartmentOptions())
    : []
  const departmentParam = applicableQueueDepartmentId(viewer, requested.departmentId, departmentOptions)
  const departmentId = queueDepartmentIdFor(viewer, departmentParam)
  const location = { ...requested, departmentId: departmentParam }
  const range = resolvePeriodFilterRange(location.period, now)

  const [tickets, counts, assignees] = await Promise.all([
    listQueueTickets(departmentId, location.tab, range),
    countQueueTicketsByTab(departmentId, range),
    isTicketDispatcher(viewer, departmentId) ? listTicketAssigneeOptions(departmentId) : [],
  ])
  ...
}
```

(Forma ilustrativa; o essencial: setor decidido só pelo domínio; uma leitura do
relógio por request; atribuíveis só para quem pode enviar naquela fila.)

- **Não alocado**: título `DEPARTMENT_QUEUE_LABEL` (`h1`) e um aviso no visual
  do estado vazio com o único texto `DEPARTMENT_QUEUE_UNASSIGNED_MESSAGE`. Sem
  abas, período, filtro, tabela. Não é 404 (a pessoa tem sessão e pode ter
  chegado por link).
- `<AppTopBar />` no topo, título `DEPARTMENT_QUEUE_LABEL` e, com período
  diferente de Todos, subtítulo `formatRangeLabel(range)` (como Meus chamados).
- **Abas**: `nav aria-label="Abas da Fila do setor"`, uma por item de
  `DEPARTMENT_QUEUE_TABS`, rótulo `DEPARTMENT_QUEUE_TAB_RULES[tab].label` +
  `counts[tab]`, `href={departmentQueueHref({ ...location, tab })}`,
  `aria-current="page"` na atual, `scroll={false}`. Links, não `tablist`.
- **Período**: `<PeriodFilter pathname={DEPARTMENT_QUEUE_PATH}
keep={departmentQueueKeepParams(location.tab, location.departmentId)}
presets={DEPARTMENT_QUEUE_PERIOD_PRESETS} selection={location.period} />`, no
  `toolbarFooter` do `DataTable`, como em Meus chamados.
- **Filtro de Setor** (só `departmentOptions.length > 0`, ou seja, Diretor):
  `Combobox` de escolha única com busca, rótulo
  `DEPARTMENT_QUEUE_DEPARTMENT_FILTER_LABEL`, opções `departmentOptions` (ordem
  recebida; rótulo `name`), valor `departmentId` (o efetivo, então a Diretoria
  vem marcada sem parâmetro). Ao escolher: `router.push(departmentQueueHref({
...location, departmentId: queueDepartmentParamFor(viewer, escolhido) }), {
scroll: false })`. Fica na mesma faixa do período (no `toolbarFooter`) e
  continua visível com a lista vazia.
- **Lista vazia**: sem tabela; período e filtro de Setor visíveis; estado vazio
  com `departmentQueueEmptyCopy(location.tab, location.period)`.
- `key` da tabela: `departmentQueueHref(location)` (aba, período **e** setor
  zeram busca e filtros, porque as opções de Tag e Destinatário vêm das linhas).

### Tabela — `department-queue-table.tsx` (`"use client"`)

Props: `tab`, `tickets: DepartmentQueueListItem[]`, `viewer: TicketActorFacts`,
`assignees: AssigneeOption[]`, `toolbarFooter: React.ReactNode`.

| Coluna       | `id`        | Valor / célula                                                                                                       |
| ------------ | ----------- | -------------------------------------------------------------------------------------------------------------------- |
| #            | `id`        | `Link` para `ticketDetailPath(id)`, `formatTicketNumber(id)` (igual a Meus chamados)                                 |
| Título       | `search`    | igual a Meus chamados (busca por `#` e título)                                                                       |
| Tipo         | `type`      | `TICKET_TYPE_LABELS[type]`, `inValues`                                                                               |
| Tag          | `tag`       | igual a Meus chamados (`"none"` para nulo, célula `tagName ?? EMPTY_VALUE_LABEL`)                                    |
| Criador      | —           | `creatorName`                                                                                                        |
| Destinatário | `assignee`  | accessor `assignedTo === null ? "none" : String(assignedTo)`, `inValues`; célula `assigneeName ?? EMPTY_VALUE_LABEL` |
| Status       | `status`    | `<TicketStatusBadge />`, `inValues`                                                                                  |
| Aberto em    | `createdAt` | `formatDate(createdAt)`                                                                                              |
| Ações        | `actions`   | cabeçalho `sr-only` "Ações"; `queueRowActionsFor(viewer, row)` decide os botões; nenhum → célula vazia               |

- **Filtros**, nesta ordem: Status (só com mais de um status na aba, opções
  `DEPARTMENT_QUEUE_TAB_RULES[tab].statuses`), Tipo (`TICKET_TYPES`), Tag (das
  linhas + `Sem tag`), **Destinatário** (pessoas presentes nas linhas, sem
  repetir id, ordenadas pelo nome, `value: String(assignedTo)`; mais
  `{ value: "none", label: NO_ASSIGNEE_LABEL }` no fim, só se alguma linha tiver
  `assignedTo === null`; grupo omitido sem opção).
- `rowHref={(row) => ticketDetailPath(row.id)}`; sem paginação.
- **Botões**: "Assumir" (`ASSUME_TICKET_LABEL`) e "Enviar" (`SEND_TICKET_LABEL`),
  pequenos, lado a lado. São `button`: o `DataTable` já ignora o clique que
  nasce num `button`.
- **Um dialog só, fora das linhas.** O `SendTicketDialog` fica no nível da
  tabela, aberto com a linha escolhida em estado (`useState<DepartmentQueueListItem | null>`).
  Motivo: evento sintético do React atravessa portal; um dialog renderizado
  dentro da `tr` faria um clique em texto do dialog (ou no popover do combobox)
  borbulhar até o `onClick` da linha e navegar para o detalhe.

### "Assumir" — `queue-row-actions.tsx`

- `useTransition`; no clique, `assumeTicket({ ticketId: row.id,
expectedAssigneeId: row.assignedTo })`. Pendente: botão desabilitado com
  `ASSUME_TICKET_PENDING_LABEL`.
- `ok` → `toast.success(result.message)`. A revalidação da action atualiza a
  linha (destinatário novo, botão some).
- Falha: `toast.error(result.message)`; com `CONFLICT`, `NOT_FOUND` ou
  `FORBIDDEN`, também `router.refresh()` (a linha está velha).

### "Enviar" — `send-ticket-dialog.tsx`

- Título `sendTicketDialogTitle(row.id)`; descrição
  `SEND_TICKET_DIALOG_DESCRIPTION`.
- React Hook Form + `zodResolver(sendTicketSchema)`, `defaultValues =
buildSendTicketFormDefaults(row)`; `ticketId` e `expectedAssigneeId` não têm
  campo visível.
- Um campo: `TicketAssigneeField` (`app/(app)/_components/ticket-assignee-field.tsx`,
  reaproveitado), `Controller` de `assigneeId`, `assignees={sendTargetOptions(assignees, row.assignedTo)}`,
  `hint={describeCurrentAssignee(row.assigneeName)}`.
- Botões `Cancelar` e `SEND_TICKET_LABEL` (pendente:
  `SEND_TICKET_PENDING_LABEL`). Foco inicial no combobox.
- Resultado do `sendTicket`:
  - `ok` → `toast.success(message)`, fecha.
  - `INVALID_ASSIGNEE` → `form.setError("assigneeId", { message }, {
shouldFocus: true })` e `router.refresh()`; continua aberto.
  - `INVALID_INPUT` → `setError("assigneeId", …)` (é o único campo visível).
  - `CONFLICT`, `NOT_FOUND`, `FORBIDDEN` → `toast.error(message)`, fecha,
    `router.refresh()`.
  - sem código → `toast.error(message)`, continua aberto.
- Ao fechar, `reset` com os defaults da próxima linha escolhida.

### Regras gerais de UI

- Datas só por `@/app/_lib/date`; textos de status, tipo e rótulos do domínio;
  ausência é `EMPTY_VALUE_LABEL`.
- Os componentes `"use client"` não importam `app/_lib/data`, `app/_lib/auth`,
  `@/db/*` nem `drizzle-orm`. `viewer` e `assignees` chegam por props.
- Nenhum botão novo no detalhe do chamado.

## Textos

| Onde                          | Texto                                                                                                                                          |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Menu / título                 | `Fila do setor`                                                                                                                                |
| Não alocado                   | `Seu perfil não está associado a nenhum setor, informe sua liderança.`                                                                         |
| Abas                          | `Em aberto`, `Resolvidos`, `Fechados`, `Cancelados`                                                                                            |
| Filtros                       | `Setor` (Diretor), `Destinatário` com `Sem destinatário`                                                                                       |
| Botões                        | `Assumir` / `Assumindo…`, `Enviar` / `Enviando…`, `Cancelar`                                                                                   |
| Dialog                        | `Enviar chamado #12`; `Escolha quem do setor do chamado vai cuidar dele.`                                                                      |
| Dica do combobox              | `Destinatário atual: Ana.` / `Este chamado ainda não tem destinatário.`                                                                        |
| Sucesso                       | `Você assumiu o chamado #12.` / `Chamado #12 enviado para Ana.`                                                                                |
| Conflito                      | `Este chamado já foi assumido por Ana.` / `Você já assumiu este chamado.` / `Este chamado ficou sem destinatário. Confira a lista atualizada.` |
| Não pode                      | `Não é possível assumir este chamado agora.` / `Não é possível enviar este chamado agora.`                                                     |
| Destinatário inválido (envio) | `Este destinatário não está disponível. Escolha uma pessoa ativa do setor do chamado.`                                                         |
| Mesmo destinatário            | `Escolha um destinatário diferente do atual.`                                                                                                  |
| Sem sessão                    | `Você não tem permissão para atribuir chamados.`                                                                                               |
| Erro inesperado               | `Não foi possível atribuir o chamado agora. Tente novamente.`                                                                                  |
| Linha do tempo (`atribuicao`) | `Trocou o destinatário de {de} para {para}.` / `Atribuiu o chamado a {para}.` (já existentes)                                                  |

## Riscos

1. **"Assumido" é inferido** por destinatário ≠ autor. Autor que se escolheu
   de propósito pode ter o chamado assumido por colega; envio de volta ao autor
   torna o chamado "não assumido" de novo.
2. **Sem paginação**: "Em aberto" com Todos cresce sem limite num setor
   movimentado.
3. **O autor perde o "Resolver"** quando alguém assume ou recebe o chamado
   (`isTicketResolver`: com destinatário, resolve o destinatário, além do admin
   do setor e do Diretor). Continua com "Editar".
4. **Lista desatualizada sem tempo real**: mitigada pelo conflito, que recusa
   com o nome de quem assumiu, e pelo `router.refresh()`.
5. **Opções do filtro de Setor**: só setores ativos fora do Não alocado.
   Chamados encerrados que ficaram num setor depois desativado não aparecem em
   fila nenhuma (continuam no detalhe).
6. **Conflito antes da permissão**: um membro que forja "Enviar" com
   `expectedAssigneeId` velho recebe o conflito (com o nome que o detalhe já
   mostra) em vez de `FORBIDDEN`. Nada é gravado.
7. **`viewer` no cliente**: papel, setor e "é Diretor" vão como props para a
   tabela decidir os botões. Não é segredo, e a transação reconfere tudo.

## Critério de pronto

1. Cenários abaixo aprovados pelo `df-qa`.
2. Contagens das abas iguais à consulta Q3 para QA Suporte e para a Diretoria.
3. Cada atribuição grava exatamente `assigned_to`, `updated_at` e uma linha
   `atribuicao`; status inalterado; nada gravado nas recusas.
4. Nenhuma migration; nenhum e-mail.
5. `npx tsc --noEmit`, `npm run lint` e `npm run build` passam; `df-reviewer`
   sem bloqueante.

## Cenários para o `df-qa`

Usuários e setores de `docs/contracts/qa-seed.md`. Títulos criados começam com
`[QA]`; escrita só em QA Suporte (na Diretoria o teste só lê). **Não assumir nem
enviar #65 a #68** (referência de `my-tickets.md`). "Request de action" = `POST`
com cabeçalho `Next-Action`. Anotar `max(id)` de `ticket` e `ticket_history`
antes de cada cenário que diz "nada gravado".

**Preparação**: QA Admin Suporte (`A`) e QA Membro Suporte (`M`) ativos em QA
Suporte. QA Admin Infra (`I`) está **inativo**: não reativar. Anotar pelo banco
os ids de `A`, `M`, `I`, do Diretor (`D`), de QA Suporte (`S`), da Diretoria,
do Não alocado e de QA Infra. Como `M`, criar pelo "Novo chamado" (tag ativa de
QA Suporte):

- `[QA] Fila livre` com destinatário padrão (`M`) → `#F1`
- `[QA] Fila do admin` com destinatário `A` → `#F2`
- `[QA] Fila concorrência` com destinatário padrão (`M`) → `#F3`

### Lista

| #   | Quem              | Ação                                                                                                                                                                                                                                                                   | Esperado                                                                                                                                                                                                                                |
| --- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q1  | M                 | abrir o Início                                                                                                                                                                                                                                                         | sidebar com "Fila do setor" logo abaixo de "Meus chamados"; clicar leva a `/queue`, item ativo                                                                                                                                          |
| Q2  | M                 | `/queue`                                                                                                                                                                                                                                                               | título "Fila do setor"; abas Em aberto (ativa), Resolvidos, Fechados, Cancelados, com contagem; período **Todos** ativo, sem subtítulo; sem filtro Setor; colunas #, Título, Tipo, Tag, Criador, Destinatário, Status, Aberto em, Ações |
| Q3  | banco, só leitura | `select count(*) filter (where status not in ('resolvido','fechado','cancelado')), count(*) filter (where status = 'resolvido'), count(*) filter (where status = 'fechado'), count(*) filter (where status = 'cancelado') from ticket where current_department_id = S` | os quatro números batem com as abas; a aba Em aberto lista os mesmos ids da primeira condição, mais novo primeiro (inclui #F1–#F3, #65–#68)                                                                                             |
| Q4  | M                 | Hoje, Semana, Mês e Personalizado (ontem–hoje)                                                                                                                                                                                                                         | URLs `/queue?tab=open&periodo=hoje` etc.; lista e contagens = consulta Q3 com o intervalo (`docs/contracts/my-tickets.md`, cenários do filtro por data)                                                                                 |
| Q5  | M                 | `/queue?tab=xyz`, `/queue?periodo=xyz`, `/queue?tab=open&periodo=personalizado&de=HOJE&ate=AMANHA`, `/queue?tab=closed&periodo=semana` e depois clicar Cancelados                                                                                                      | os três primeiros: Em aberto com **Todos**, sem erro; o quarto: Fechados com Semana; ao trocar de aba, o período continua Semana                                                                                                        |
| Q6  | M                 | filtros na aba Em aberto, depois em Fechados                                                                                                                                                                                                                           | Em aberto: grupos Status (5, sem "Resolvido"), Tipo (6), Tag, Destinatário (pessoas das linhas e "Sem destinatário", porque #65 não tem); marcar "Sem destinatário" → só chamados com `—`. Fechados: sem grupo Status                   |
| Q7  | M                 | clicar no meio da linha do #F1; voltar; clicar no Título de #F2                                                                                                                                                                                                        | os dois abrem o detalhe                                                                                                                                                                                                                 |
| Q8  | Diretor + M       | Diretor move M para o Não alocado; M abre o Início e `/queue`                                                                                                                                                                                                          | sem item "Fila do setor" no menu; `/queue` mostra o título e `Seu perfil não está associado a nenhum setor, informe sua liderança.`, sem abas nem tabela; nenhum erro. **Ao fim, mover M de volta para QA Suporte**                     |

### Diretor e o filtro de Setor

| #   | Quem    | Ação                                                                                                                        | Esperado                                                                                                                                                                                                           |
| --- | ------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Q9  | Diretor | `/queue`                                                                                                                    | filtro Setor com a Diretoria marcada; opções = `select id, name from department where is_active and not is_unassigned` (sem Não alocado, sem setor inativo); lista e contagens = consulta Q3 com o id da Diretoria |
| Q10 | Diretor | escolher QA Suporte; depois clicar Fechados e Semana; depois voltar a Diretoria no filtro                                   | URL `/queue?tab=open&setor=S&periodo=todos`; lista = consulta Q3 de QA Suporte; abas e período mantêm `setor=S`; ao escolher Diretoria, `setor` sai da URL                                                         |
| Q11 | Diretor | `/queue?setor=abc`, `?setor=0`, `?setor=007`, `?setor=999999`, `?setor=<Não alocado>`, `?setor=<setor inativo>` (se houver) | todos mostram a fila da Diretoria com a Diretoria marcada; nenhum erro                                                                                                                                             |
| Q12 | A e M   | `/queue?setor=<Diretoria>` e `/queue?setor=<QA Infra>`                                                                      | a fila de QA Suporte, igual a `/queue`; sem filtro Setor                                                                                                                                                           |
| Q13 | Diretor | fila da Diretoria                                                                                                           | chamado não final, sem transferência pendente e "não assumido" (destinatário nulo ou = autor) mostra "Assumir" **e** "Enviar". **Não clicar** (escrita fora de QA)                                                 |

### Ações

| #   | Quem              | Ação                                                                                                | Esperado                                                                                                                                                                                                                                             |
| --- | ----------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q14 | M                 | `/queue`, linhas #F1 e #F2                                                                          | #F1: nenhum botão (M já é o destinatário; membro não envia). #F2: nenhum botão (assumido por A)                                                                                                                                                      |
| Q15 | A                 | `/queue`, linhas #F1, #F2, #66; na aba Resolvidos, `[QA] Janela aberta`; qualquer linha em Fechados | #F1: "Assumir" e "Enviar". #F2: só "Enviar" (A já é o destinatário). #66 (aguardando aprovação, transferência pendente): nenhum botão. Resolvidos, Fechados e Cancelados: nenhum botão                                                               |
| Q16 | A                 | "Assumir" no #F1                                                                                    | toast `Você assumiu o chamado #F1.`; a linha passa a Destinatário QA Admin Suporte e fica só com "Enviar"; não navega para o detalhe                                                                                                                 |
| Q17 | banco, só leitura | depois do Q16                                                                                       | `ticket` #F1: `assigned_to = A`, `status` igual ao de antes, `updated_at` = `changed_at` da linha nova; `ticket_history`: **uma** linha nova, `atribuicao`, `changed_by = A`, `from_assignee_id = M`, `to_assignee_id = A`; nenhuma outra linha nova |
| Q18 | M                 | `/tickets/F1`; Meus chamados → Atribuídos a mim (Todos)                                             | linha do tempo com "Atribuição" — `Trocou o destinatário de QA Membro Suporte para QA Admin Suporte.` por QA Admin Suporte; `Destinatário` QA Admin Suporte; **sem** "Resolver" (risco 3), "Editar" presente; #F1 fora de Atribuídos a mim           |
| Q19 | A                 | "Enviar" no #F1                                                                                     | dialog `Enviar chamado #F1`, `Escolha quem do setor do chamado vai cuidar dele.`; dica `Destinatário atual: QA Admin Suporte.`; opções = ativos de QA Suporte **sem** A; clicar em texto do dialog e abrir o combobox não navega                     |
| Q20 | A                 | escolher QA Membro Suporte → Enviar                                                                 | toast `Chamado #F1 enviado para QA Membro Suporte.`; dialog fecha; Destinatário QA Membro Suporte; no banco, `atribuicao` de `A` para `M`, `changed_by = A`, status inalterado                                                                       |
| Q21 | M                 | Meus chamados → Atribuídos a mim (Todos)                                                            | #F1 de volta à lista (revalidação de `/tickets`)                                                                                                                                                                                                     |
| Q22 | Diretor           | `/queue?tab=open&setor=S`, linha #F2                                                                | só "Enviar" em todas as linhas (nunca "Assumir" fora da Diretoria); "Enviar" no #F2: opções sem o Diretor e sem A (atual); enviar para M → toast; no banco `atribuicao` de `A` para `M` com `changed_by = D`                                         |
| Q23 | Diretor           | dialog "Enviar" do #F1 aberto; salvar sem escolher                                                  | `Selecione o destinatário.` no campo; nada gravado                                                                                                                                                                                                   |

### Recusas forjadas e concorrência

| #   | Quem         | Ação                                                                                                                                                                                                                                 | Esperado                                                                                                                                                                                              |
| --- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q24 | M            | request de `sendTicket` para #F1 com `assigneeId = A` e o `expectedAssigneeId` correto                                                                                                                                               | `{ ok: false, code: "FORBIDDEN", message: "Não é possível enviar este chamado agora." }`; nada gravado                                                                                                |
| Q25 | A            | "Enviar" no #F3 forjando `assigneeId` = `D` (Diretoria), depois `I` (inativo, QA Infra), depois `999999`                                                                                                                             | os três: `Este destinatário não está disponível. Escolha uma pessoa ativa do setor do chamado.` no campo, dialog aberto; nada gravado                                                                 |
| Q26 | A            | requests de `sendTicket` para #F2 (destinatário atual `M`, depois do Q22): `assigneeId = M` com `expectedAssigneeId = M`; depois `assigneeId = 1e12`; depois `assigneeId = A`, `expectedAssigneeId = M` e `actorId = M` acrescentado | o primeiro: `Escolha um destinatário diferente do atual.`; o segundo: `Selecione o destinatário.`; ambos `INVALID_INPUT`, nada gravado. O terceiro: gravado com `changed_by = A` (a chave é ignorada) |
| Q27 | A            | request de `assumeTicket` para #66 (transferência pendente) e para `[QA] Janela aberta` com o `expectedAssigneeId` de cada um                                                                                                        | `FORBIDDEN`, `Não é possível assumir este chamado agora.`; nada gravado                                                                                                                               |
| Q28 | A            | request de `assumeTicket` para um chamado da Diretoria (id do banco)                                                                                                                                                                 | `NOT_FOUND`, `Chamado não encontrado.`; nada gravado                                                                                                                                                  |
| Q29 | A, duas abas | as duas em `/queue`; na aba 1, "Assumir" no #F3; na aba 2 (sem recarregar), "Assumir" no #F3                                                                                                                                         | aba 1: sucesso. Aba 2: toast `Você já assumiu este chamado.` e a lista recarrega (#F3 só com "Enviar"); no banco, **uma** `atribuicao` para #F3                                                       |
| Q30 | Diretor e A  | Diretor abre `/queue?setor=S` com #F3 atribuído a A; A envia #F3 para M; o Diretor (sem recarregar) abre "Enviar" no #F3 e envia para QA Membro Suporte                                                                              | o Diretor recebe `Este chamado já foi assumido por QA Membro Suporte.`, o dialog fecha e a lista recarrega; nenhuma linha nova da tentativa do Diretor                                                |
| Q31 | qualquer     | Q1–Q30 em 390×844                                                                                                                                                                                                                    | tabela com rolagem horizontal, botões alcançáveis, dialog cabe na tela; filtro Setor e período utilizáveis                                                                                            |
| Q32 | qualquer     | navegar pelos cenários                                                                                                                                                                                                               | nenhum erro nem aviso de hidratação no dev server (MCP `next-devtools`); nenhuma linha nova em `ticket`, `ticket_history`, `ticket_transfer` fora das gravações esperadas                             |

Ao final: M de volta em QA Suporte e ativo; A ativo; I como estava.

### Aba Resolvidos (revisão de 2026-10-06)

Só leitura. Consulta de referência = Q3 (quatro contagens). Precisa de pelo
menos um `resolvido` em QA Suporte (ex.: `[QA] Janela aberta`, ou os de
`docs/contracts/my-tickets.md`, cenários 49 e 50).

| #   | Quem     | Ação                                                                                                     | Esperado                                                                                                                                                                                                                                  |
| --- | -------- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q33 | M        | `/queue`; clicar Resolvidos                                                                              | abas na ordem Em aberto, Resolvidos, Fechados, Cancelados, contagens = Q3. URL `/queue?tab=resolved&periodo=todos`; lista = ids com `current_department_id = S and status = 'resolvido'`, mais novo primeiro; todas com badge "Resolvido" |
| Q34 | A        | aba Resolvidos                                                                                           | **sem** grupo Status nos filtros; Tipo, Tag e Destinatário presentes; nenhuma linha com "Assumir" ou "Enviar"                                                                                                                             |
| Q35 | M        | aba Em aberto (Todos)                                                                                    | nenhuma linha com badge "Resolvido"; grupo Status com 5 opções, **sem** "Resolvido"                                                                                                                                                       |
| Q36 | M        | Resolvidos com Semana; clicar Mês; clicar Fechados; "voltar" do navegador                                | `tab=resolved&periodo=semana` → `tab=resolved&periodo=mes` → `tab=closed&periodo=mes`; voltar restaura Resolvidos com Mês; contagens = Q3 com o intervalo                                                                                 |
| Q37 | Diretor  | `/queue?tab=resolved&setor=S&periodo=todos`; trocar o filtro Setor para Diretoria e depois para QA Infra | Resolvidos de QA Suporte (= Q3 com `S`), filtro Setor em QA Suporte; ao trocar o setor a aba continua Resolvidos e as contagens batem com Q3 do setor escolhido (`setor` sai da URL na Diretoria); nenhuma linha com botão                |
| Q38 | Diretor  | setor sem `resolvido` (conferir no banco) na aba Resolvidos com Todos; depois Hoje                       | Todos: "Nenhum chamado resolvido" / "Os chamados do setor que foram resolvidos aparecem aqui até o fechamento automático, 7 dias após a resolução."; Hoje vazio: "Nenhum chamado neste período"                                           |
| Q39 | M        | `/queue?tab=resolved`, `/queue?tab=Resolved`, `/queue?tab=resolvido`                                     | o primeiro: Resolvidos com Todos; os outros: Em aberto com Todos; nenhum erro                                                                                                                                                             |
| Q40 | qualquer | navegar por Q33–Q39                                                                                      | nenhum erro nem aviso de hidratação no dev server; nenhuma linha nova em `ticket`, `ticket_history`, `ticket_transfer`                                                                                                                    |

## Checklist de encerramento da feature

- [x] `types/department-queue.ts`, `types/ticket-assignment.ts`, `domain/department-queue-tabs.ts`, `domain/department-queue.ts`, `domain/ticket-assignment.ts`, `ALL_TIME_PERIOD_PRESETS`, `validation/department-queue.ts`, `validation/ticket-assignment.ts`, `allTimePeriodSchema`, este contrato e o plano (`df-architect`)
- [ ] `listQueueTickets`, `countQueueTicketsByTab` em `app/_lib/data/department-queue.ts`; `assignTicket` em `app/_lib/data/tickets.ts` (`df-data`)
- [ ] `assumeTicket`, `sendTicket` em `app/_lib/actions/ticket-assignment.ts` (`df-actions`)
- [ ] menu condicionado, `/queue`, abas, período, filtro de Setor, tabela, botões e dialog (`df-ui`)
- [ ] cenários do `df-qa`
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm run build`

Revisão de 2026-10-06 (aba Resolvidos):

- [x] `resolved` em `DEPARTMENT_QUEUE_TABS` e `DEPARTMENT_QUEUE_TAB_RULES`; "Em aberto" com `ACTIVE_TICKET_STATUSES` (`df-architect`)
- [ ] `resolved: 0` na contagem inicial de `countQueueTicketsByTab` (`df-data`)
- [ ] nada no `df-ui`: abas, estado vazio e filtro Status saem das regras
- [ ] cenários Q33–Q40 do `df-qa`
