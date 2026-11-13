# Contrato — Operação: TMR e quantidade de chamados em atraso (Etapa B)

Os dois objetivos só da equipe da Operação mudam:

- **Backlog** → **Quantidade de chamados em atraso** (`overdueTickets`);
- **Aceite de transferências** → **TMR** (`tmr`, tempo médio de resposta).

SLA, TMA e horas em atraso (pessoa e equipe) e a aba Produção não mudam. O
card Backlog do Início (`BACKLOG_TICKET_STATUSES`, contrato
`dashboard-overview.md`) **também não muda**: é outro indicador.

Decisões do usuário em 2026-11-12. ADR novo:
`docs/adr/025-tmr-and-overdue-tickets-goals.md`; notas de revisão nos ADRs
022 e 023. Contrato base: `docs/contracts/operations.md` (revisado nas seções
afetadas). Prazo gravado: `docs/contracts/department-due-hours.md` (ADR 024).
Fuso: ADR 009. Nomenclatura: "objetivo", nunca "meta", em todo texto novo.

## Regras fixadas (não reabrir)

| Tema                   | Regra                                                                                                                                                                                                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Nível                  | Os dois objetivos são **só da equipe**. Nenhuma versão individual. "N de M cumpriram" continua só com SLA, TMA e horas em atraso                                                                                                                                         |
| Mês                    | `[1º do mês 00:00 SP, agora)` = `monthToDateRange(now)`, como o resto da Operação                                                                                                                                                                                        |
| Chamados em atraso     | União, **sem repetir chamado**, de: (1) resolvido/fechado no mês em S com `resolved_at > due_at`; (2) ativo em S (`OVERDUE_TICKET_STATUSES`) com `due_at < now`; (3) enviado **por** S no mês com `from_due_at < created_at` da transferência. Aderente se `n <= limite` |
| Envio vencido          | Conta para o setor de **origem** no mês do envio, qualquer que seja o desfecho (pendente, aceito, recusado). Se voltar por recusa e continuar vencido em S, é o mesmo chamado: conta uma vez                                                                             |
| Não contam             | resolvido no prazo; cancelado; pendente no destino (`due_at` nulo); resolvido em mês anterior                                                                                                                                                                            |
| TMR                    | Média da duração das **esperas** do setor que contam no mês. Aderente se `TMR <= tmr_max_hours × 1h`                                                                                                                                                                     |
| Espera conta em        | **mês em que termina**; aberta → mês corrente, com duração até `now`. Duração inteira, sem cortar no dia 1º (ADR 025)                                                                                                                                                    |
| Sem espera no mês      | **Aderente**, valor 0 (`0h`). Nunca "Sem dados"                                                                                                                                                                                                                          |
| `tmr_max_hours` nulo   | Setor com objetivo salvo antes desta etapa: TMR aparece **"Sem objetivo"** (`no_target`), não reprova, sem marcador no gauge. Salvar o formulário exige o campo                                                                                                          |
| Colunas                | `backlog_limit` → `overdue_tickets_limit` (rename, valores mantidos); `transfer_acceptance_min_percent` apagada; `tmr_max_hours` nova, nula                                                                                                                              |
| Recusa devida/indevida | **Fora do escopo** (trabalho futuro do ADR 025). Toda recusa penaliza o TMR do destino pela espera `transferencia_recebida`                                                                                                                                              |

## Esperas de fila — o que abre e o que fecha

Uma espera = chamado na fila de um setor sem resposta. **No máximo uma aberta
por chamado.** O ato que fecha uma e abre outra fecha **primeiro**, na mesma
transação, com o mesmo instante (`changedAt`).

| `reason`                 | Setor (`department_id`)                     | Abre (`started_at`)                                                                                       | Fecha (`ended_at`)                                                                  |
| ------------------------ | ------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `abertura`               | origem (`values.originDepartmentId`)        | `insertTicket` **sem destinatário** (`opensQueueWaitAtCreation(target)`, status `aberto`), em `createdAt` | primeiro ato da lista "Atos que fecham" abaixo                                      |
| `transferencia_recebida` | destino (`toDepartmentId`)                  | `requestTicketTransfer`, em `changedAt` (= `ticket_transfer.created_at`)                                  | `approveTicketTransfer` ou `rejectTicketTransfer`, em `changedAt` (= `reviewed_at`) |
| `devolucao_por_recusa`   | origem (`pendingTransfer.fromDepartmentId`) | `rejectTicketTransfer`, em `changedAt` (= `reviewed_at`), **depois** de fechar a `transferencia_recebida` | primeiro ato da lista "Atos que fecham"                                             |

**Fluxo real conferido** (`app/_lib/data/tickets.ts`, 2026-11-12):

- A fila de fato é a aba **Em aberto** da Fila do setor
  (`DEPARTMENT_QUEUE_TAB_RULES.open`: status abertos e **sem destinatário**).
  Atribuir a um colega ("Enviar", `assignTicket` modo `send`) tira o chamado
  dela; por isso **fecha** a espera, assim como Assumir.
- Na recusa o chamado volta à origem com status `recusado`, já com o
  solicitante como destinatário quando ele está ativo no setor
  (`declineReturnAssigneeFor`). Ele fica em **Encaminhados** até alguém
  responder. Por isso a espera de devolução fecha quando o status **deixa
  `recusado`**, não quando ganha destinatário.
- Chamado aberto já com destinatário (o próprio autor → `em_andamento`, um
  colega → `encaminhado`) **não abre** espera.
- Devolver à fila (destinatário apagado em `updateTicketByAssignee`) **não
  abre** espera (ADR 025, consequência aceita).
- Não existe hoje caminho que cancele chamado ou transferência. Se um dia
  existir, ele fecha a espera aberta no instante do cancelamento.

### Atos que fecham (por função de `app/_lib/data/tickets.ts`)

| Função                         | Fecha a espera aberta?                                             | Abre?                           |
| ------------------------------ | ------------------------------------------------------------------ | ------------------------------- |
| `insertTicket`                 | —                                                                  | `abertura`, só sem destinatário |
| `assignTicket` (assume e send) | **sim**, sempre (`changedAt`)                                      | não                             |
| `startTicketWork`              | **sim**, sempre (`changedAt`)                                      | não                             |
| `updateTicketByAssignee`       | **sim**, só quando `nextStatus !== ticketRow.status` (`changedAt`) | não                             |
| `updateTicketResolution`       | **sim**, sempre (`changedAt`)                                      | não                             |
| `requestTicketTransfer`        | **sim**, a da origem (`changedAt`)                                 | `transferencia_recebida`        |
| `approveTicketTransfer`        | **sim**, a `transferencia_recebida` (`changedAt`)                  | não                             |
| `rejectTicketTransfer`         | **sim**, a `transferencia_recebida` (`changedAt`)                  | `devolucao_por_recusa`          |
| `closeExpiredResolvedTickets`  | não (resolvido não tem espera aberta)                              | não                             |

"Fecha sempre" quando não há espera aberta é um `update` sem linha afetada:
não precisa checar antes. Só uma espera aberta existe por chamado, então
fechar "a aberta" nunca é ambíguo.

## Schema — `db/schema.ts` (`df-architect`, pronto)

Migrations **geradas, não aplicadas** (o usuário aplica, nesta ordem):

- `db/migrations/0027_tmr_overdue_tickets_goals.sql` (drizzle-kit; o rename foi
  respondido no prompt, SQL conferido: `ALTER TABLE "department_goal" RENAME
COLUMN "backlog_limit" TO "overdue_tickets_limit"`, sem drop/add)
- `db/migrations/0028_backfill_ticket_queue_wait.sql` (custom, só dados)

### Enum `queue_wait_reason` (novo)

`abertura` · `transferencia_recebida` · `devolucao_por_recusa`. Tipo
`QueueWaitReason` (`db/schema.ts`, reexportado em
`app/_lib/types/queue-wait.ts`).

### `ticket_queue_wait` (nova)

| Coluna                     | Tipo                   | Regra                                                                                                       |
| -------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------- |
| `id`                       | `integer` identity PK  | `pk()`                                                                                                      |
| `ticket_id`                | `integer not null`     | FK `ticket.id` **on delete cascade**                                                                        |
| `department_id`            | `integer not null`     | FK `department.id` **on delete restrict**                                                                   |
| `reason`                   | `queue_wait_reason`    | not null                                                                                                    |
| `started_at`               | `timestamptz not null` | instante do ato que abre                                                                                    |
| `ended_at`                 | `timestamptz` nulo     | nulo enquanto aberta; `check ended_at is null or ended_at >= started_at` (`queue_wait_ended_after_started`) |
| `created_at`, `updated_at` | `timestamptz not null` | `timestamps`                                                                                                |

Índices: `queue_wait_ticket_idx (ticket_id, started_at)`;
`queue_wait_department_ended_idx (department_id, ended_at)` (agregação mensal:
`ended_at` no mês ou `is null`); `queue_wait_one_open_per_ticket_idx` único
parcial em `ticket_id where ended_at is null`.

Relations: `ticketQueueWaitRelations` (`ticket`, `department`),
`ticketRelations.queueWaits`, `departmentRelations.queueWaits`. Tipos
`TicketQueueWait` / `NewTicketQueueWait`.

### `department_goal` (alterada)

| Coluna                            | Antes                      | Depois                                                                                                        |
| --------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `backlog_limit`                   | `integer not null`, `>= 0` | **renomeada** `overdue_tickets_limit`, mesmo tipo; check `department_goal_overdue_tickets_limit_non_negative` |
| `transfer_acceptance_min_percent` | `smallint not null`, 1–100 | **apagada** (com o check)                                                                                     |
| `tmr_max_hours`                   | —                          | `smallint` **nulo**, check `department_goal_tmr_max_hours_positive` (`>= 1`)                                  |

### Backfill (`0028_backfill_ticket_queue_wait.sql`)

Idempotente (`not exists` por `ticket_id + reason + started_at`), três
`insert … select`:

1. `transferencia_recebida`: toda `ticket_transfer`. `started_at =
created_at`; `ended_at` = nulo se `pendente`, senão
   `greatest(coalesce(reviewed_at, updated_at), created_at)`.
2. `abertura`: todo `ticket_history` `criacao` com `to_status = 'aberto'` e
   `to_assignee_id is null`. Setor = `to_department_id` (ou a origem do
   chamado). Término = o menor entre o `changed_at` do primeiro histórico
   posterior (por `id`) de `atribuicao`, `mudanca_status`,
   `transferencia_*`, `resolucao`, `encerramento`, `reabertura` e o
   `created_at` do primeiro envio posterior.
3. `devolucao_por_recusa`: todo `ticket_history` `transferencia_rejeitada`
   com `to_department_id` (a origem) não nulo, mesma regra de término.

Sem término: aberta se o chamado ainda está no estado da espera (`aberto` sem
destinatário / `recusado`); senão não é criada. Não toca `ticket`,
`ticket_transfer` nem `ticket_history`.

## Tipos (`df-architect`, pronto)

### `app/_lib/types/operations.ts` (alterado)

```ts
export interface DepartmentGoals {
  slaMinPercent: number
  tmaMaxHours: number
  overdueHoursLimit: number
  overdueTicketsLimit: number
  tmrMaxHours: number | null
}
export interface TeamTmrFacts {
  queueWaitCount: number
  averageQueueWaitMs: number | null
}
export interface TeamGoalFacts extends PersonGoalFacts, TeamTmrFacts {
  overdueTicketCount: number
  members: TeamMemberGoalFacts[]
}

export type GoalAdherence =
  "adherent" | "not_adherent" | "no_data" | "no_target"
export type MeasuredGoalAdherence = Exclude<
  GoalAdherence,
  "no_data" | "no_target"
>
export interface UntargetedGoalEvaluation {
  indicator: GoalIndicator
  adherence: "no_target"
  value: number | null
  target: null
}
export type GoalEvaluation =
  MeasuredGoalEvaluation | UnmeasuredGoalEvaluation | UntargetedGoalEvaluation

export interface GoalGauge {
  max: number
  fillPercent: number
  targetPercent: number | null
}
```

`GoalIndicator` (de `GOAL_INDICATORS`) = `"sla" | "tma" | "overdue" |
"overdueTickets" | "tmr"`; `TeamOnlyGoalIndicator` = `"overdueTickets" |
"tmr"`. **Sai** `TeamTransferReviewFacts` (`approvedCount`, `rejectedCount`) e
`backlogCount`.

`tmrMaxHours` é nulo em `DepartmentGoals` porque é o que o banco devolve; o Zod
exige o número, e `DepartmentGoalsInput` (com `number`) continua atribuível a
`DepartmentGoals`.

### `app/_lib/types/queue-wait.ts` (novo)

```ts
export type { QueueWaitReason } // de @/db/schema
export interface OpenQueueWaitValues {
  ticketId: number
  departmentId: number
  reason: QueueWaitReason
  startedAt: Date
}
```

## Validação — `app/_lib/validation/department-goals.ts` (`df-architect`, pronto)

`departmentGoalsSchema` = `{ slaMinPercent, tmaMaxHours, overdueHoursLimit,
overdueTicketsLimit, tmrMaxHours }`, os cinco obrigatórios (FormField deriva o
asterisco). `saveDepartmentGoalsSchema` e os tipos inferidos mantêm o nome.

| Campo                 | Faixa  | "Informe…" (vazio, `NaN`, fração, abaixo do mínimo)                   | Máximo                             |
| --------------------- | ------ | --------------------------------------------------------------------- | ---------------------------------- |
| `overdueTicketsLimit` | 0–9999 | `Informe o limite de chamados em atraso, em chamados, a partir de 0.` | `O valor máximo é 9.999 chamados.` |
| `tmrMaxHours`         | 1–999  | `Informe o TMR máximo, em horas inteiras, a partir de 1.`             | `O valor máximo é 999 horas.`      |

Os outros três campos não mudam.

## Domínio (`df-architect`, pronto)

### `app/_lib/domain/department-goals.ts`

| Export                                         | Valor / semântica                                                                                                                                                                                                                                                                                                                                                                                |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `TEAM_ONLY_GOAL_INDICATORS`                    | `["overdueTickets", "tmr"]`                                                                                                                                                                                                                                                                                                                                                                      |
| `GOAL_OVERDUE_TICKETS_MAX`                     | `9999` (substitui `GOAL_BACKLOG_MAX`)                                                                                                                                                                                                                                                                                                                                                            |
| `GOAL_TMR_HOURS_MIN` / `GOAL_TMR_HOURS_MAX`    | `1` / `999`                                                                                                                                                                                                                                                                                                                                                                                      |
| `GOAL_INDICATOR_RULES`                         | `overdueTickets`: count/max; `tmr`: duration/max                                                                                                                                                                                                                                                                                                                                                 |
| `GOAL_FIELD_BY_INDICATOR`                      | `overdueTickets → overdueTicketsLimit`, `tmr → tmrMaxHours`                                                                                                                                                                                                                                                                                                                                      |
| `GOAL_INDICATOR_LABELS`                        | `overdueTickets: "Quantidade de chamados em atraso"`, `tmr: "TMR"`                                                                                                                                                                                                                                                                                                                               |
| `GOAL_INDICATOR_SHORT_LABELS`                  | `chamados em atraso`, `TMR`                                                                                                                                                                                                                                                                                                                                                                      |
| `GOAL_ADHERENCE_LABELS`                        | ganha `no_target: "Sem objetivo"`                                                                                                                                                                                                                                                                                                                                                                |
| `GOAL_NO_DATA_HINTS`                           | `overdueTickets: "Nenhum chamado em atraso no mês"`, `tmr: "Nenhuma espera na fila no mês"` (nunca exibidos: os dois sempre têm valor)                                                                                                                                                                                                                                                           |
| `GOAL_TARGET_PREFIXES`                         | `overdueTickets: "Limite"`, `tmr: "Objetivo"` → `Limite ≤ 4 chamados`, `Objetivo ≤ 2h`                                                                                                                                                                                                                                                                                                           |
| `GOAL_NO_TARGET_LABEL` / `GOAL_NO_TARGET_HINT` | `Objetivo não definido` (no lugar de `goalTargetLabel`) / `O objetivo deste indicador ainda não foi definido.` (no lugar de `goalSupportLine`)                                                                                                                                                                                                                                                   |
| `tmrFor(facts: TeamTmrFacts): number`          | `queueWaitCount > 0` e média não nula → `max(média, 0)`; senão **0**                                                                                                                                                                                                                                                                                                                             |
| `overdueTicketCountFor(facts: TeamGoalFacts)`  | `max(overdueTicketCount, 0)`                                                                                                                                                                                                                                                                                                                                                                     |
| `goalTargetFor(indicator, goals)`              | agora `number \| null`: `null` quando a coluna é nula                                                                                                                                                                                                                                                                                                                                            |
| `evaluateGoal`                                 | alvo nulo → `{ adherence: "no_target", value, target: null }` (antes de checar valor); valor nulo → `no_data`; senão aderente/não aderente                                                                                                                                                                                                                                                       |
| `evaluateTeamGoals`                            | as cinco: `overdueTickets` com `overdueTicketCountFor`, `tmr` com `tmrFor`                                                                                                                                                                                                                                                                                                                       |
| `goalSummaryFor`                               | só `not_adherent` reprova; `no_data` e `no_target`, não                                                                                                                                                                                                                                                                                                                                          |
| `goalShortfallSentence`                        | `6 chamados em atraso no mês: 2 chamados acima do limite de 4 chamados.` · `TMR de 3h 20min: 1h 20min acima do limite de 2h.`                                                                                                                                                                                                                                                                    |
| `goalGaugeFor`                                 | `targetPercent: null` quando não há alvo (sem marcador). Escala de duração/contagem usa o alvo, ou o valor quando não há alvo: `max(2 × referência, 4h / 4)`                                                                                                                                                                                                                                     |
| `DEPARTMENT_GOALS_FIELD_COPY`                  | `overdueTicketsLimit`: `Limite de chamados em atraso` · `Quantidade máxima de chamados em atraso no mês: resolvidos fora do prazo, abertos com o prazo vencido e enviados a outro setor já vencidos.` · `chamados`. `tmrMaxHours`: `TMR máximo` · `Tempo médio de resposta máximo no mês: da chegada do chamado à fila do setor até alguém assumir, aceitar, recusar, enviar ou resolver.` · `h` |
| `TEAM_ONLY_GOAL_FIELDS`                        | `["overdueTicketsLimit", "tmrMaxHours"]`                                                                                                                                                                                                                                                                                                                                                         |

**Rótulo do campo:** o pedido diz `TMR máximo (h)`. O diálogo mostra
`label` com a unidade como sufixo do input (`NumberUnitField`, como o
`TMA máximo` + `h`), então o rótulo ficou `TMR máximo` e a unidade `h`. Se o
usuário quiser o `(h)` no próprio rótulo, muda só a string.

Conferido com `tsx` (2026-11-12), objetivo SLA 90 / TMA 8h / atraso 10h /
chamados 4 / TMR 2h, 6 chamados em atraso, 3 esperas com média 3h20 →
`overdueTickets` `Não aderente` `6 chamados` `Limite ≤ 4 chamados`
`2 chamados acima do limite`; `tmr` `Não aderente` `3h 20min` `Objetivo ≤ 2h`
`1h 20min acima do limite`; resumo `Objetivo não atingido · não aderente em
chamados em atraso e TMR`. Sem espera → `tmr` `Aderente` `0h`. `tmrMaxHours`
nulo → `Sem objetivo`, `Objetivo não definido`, `targetPercent: null`, resumo
`Objetivo atingido`.

### `app/_lib/domain/operations.ts`

| Export                               | Mudança                                                                                                                                         |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `GOALS_UNDEFINED_EDITOR_DESCRIPTION` | `Defina os objetivos de SLA, TMA, horas em atraso, quantidade de chamados em atraso e TMR. Eles valem para cada pessoa do setor e para o time.` |
| `operationsTabContext("time", now)`  | `Objetivos da equipe de novembro, de 1º/11 até hoje` (era `Objetivos do setor · backlog é de agora`; nada mais é "de agora")                    |

### `app/_lib/domain/goal-indicators.ts`

`GOAL_INDICATORS = ["sla", "tma", "overdue", "overdueTickets", "tmr"]` (ordem
de exibição).

### `app/_lib/domain/queue-wait.ts` (novo)

| Export                             | Valor                                                             |
| ---------------------------------- | ----------------------------------------------------------------- |
| `OPENING_QUEUE_WAIT_REASON`        | `"abertura"`                                                      |
| `RECEIVED_QUEUE_WAIT_REASON`       | `"transferencia_recebida"`                                        |
| `DECLINED_QUEUE_WAIT_REASON`       | `"devolucao_por_recusa"`                                          |
| `opensQueueWaitAtCreation(target)` | `target === "queue"` (`assigneeTargetFor(createdBy, assigneeId)`) |

## Tabela de renomes (para os donos de cada caminho)

| Antigo                                                                                   | Novo                                                           | Onde aparece fora dos meus caminhos                                             |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| coluna `backlog_limit` / `departmentGoal.backlogLimit`                                   | `overdue_tickets_limit` / `departmentGoal.overdueTicketsLimit` | `app/_lib/data/department-goals.ts` (`df-data`)                                 |
| coluna `transfer_acceptance_min_percent` / `departmentGoal.transferAcceptanceMinPercent` | **sai**; entra `tmr_max_hours` / `departmentGoal.tmrMaxHours`  | `app/_lib/data/department-goals.ts` (`df-data`)                                 |
| `DepartmentGoals.backlogLimit`                                                           | `DepartmentGoals.overdueTicketsLimit`                          | `data/department-goals.ts` (`df-data`); `department-goals-dialog.tsx` (`df-ui`) |
| `DepartmentGoals.transferAcceptanceMinPercent`                                           | `DepartmentGoals.tmrMaxHours` (`number \| null`)               | idem                                                                            |
| `TeamGoalFacts.backlogCount`                                                             | `TeamGoalFacts.overdueTicketCount`                             | `data/department-goals.ts` (`df-data`)                                          |
| `TeamTransferReviewFacts` (`approvedCount`, `rejectedCount`)                             | `TeamTmrFacts` (`queueWaitCount`, `averageQueueWaitMs`)        | `data/department-goals.ts` (`df-data`)                                          |
| indicador `"backlog"`                                                                    | `"overdueTickets"`                                             | nenhum componente usa a chave literal (conferido)                               |
| indicador `"transferAcceptance"`                                                         | `"tmr"`                                                        | idem                                                                            |
| `GOAL_BACKLOG_MAX`                                                                       | `GOAL_OVERDUE_TICKETS_MAX`                                     | só validação (minha)                                                            |
| `transferAcceptancePercentFor`                                                           | `tmrFor` (semântica nova)                                      | nenhum                                                                          |
| `GoalAdherence` (3 valores)                                                              | + `"no_target"`                                                | `goal-adherence-badge.tsx`, `goal-gauge.tsx` (`df-ui`)                          |
| `GoalGauge.targetPercent: number`                                                        | `number \| null`                                               | `goal-gauge-card.tsx`, `goal-gauge.tsx` (`df-ui`)                               |

Fora da Operação, nenhum símbolo com "backlog" muda: `BACKLOG_TICKET_STATUSES`,
`DashboardBacklog*` e o card do Início ficam. `TicketTransferReview*`
(revisão de transferência no detalhe do chamado) não tem relação com o
objetivo e fica.

## `df-data` — o que criar e alterar

### `app/_lib/data/queue-waits.ts` (novo)

```ts
export async function openQueueWait(
  tx: Transaction,
  values: OpenQueueWaitValues,
): Promise<void>
export async function closeOpenQueueWait(
  tx: Transaction,
  ticketId: number,
  endedAt: Date,
): Promise<void>
```

- `openQueueWait`: `insert into ticket_queue_wait (ticket_id, department_id,
reason, started_at)`; `ended_at` nulo. Violar o índice único parcial é bug do
  chamador (não fechou antes): deixar o erro subir e abortar a transação.
- `closeOpenQueueWait`: `update ticket_queue_wait set ended_at = $endedAt,
updated_at = $endedAt where ticket_id = $id and ended_at is null`. Sem linha
  → nada. `endedAt` é o `changedAt` do ato (nunca anterior a `started_at`; o
  check do banco garante).

### `app/_lib/data/tickets.ts` — gravação em cada ato

Seguir a tabela "Atos que fecham". Detalhes:

| Função                   | Chamada (dentro do `db.transaction`, depois das validações e antes do `return saved`)                                                                                                                                                  |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `insertTicket`           | se `opensQueueWaitAtCreation(assigneeTargetFor(values.createdBy, values.assigneeId))`: `openQueueWait(tx, { ticketId: created.id, departmentId: values.originDepartmentId, reason: OPENING_QUEUE_WAIT_REASON, startedAt: createdAt })` |
| `assignTicket`           | `closeOpenQueueWait(tx, ticketId, changedAt)`                                                                                                                                                                                          |
| `startTicketWork`        | `closeOpenQueueWait(tx, ticketId, changedAt)`                                                                                                                                                                                          |
| `updateTicketByAssignee` | se `nextStatus !== ticketRow.status`: `closeOpenQueueWait(tx, ticketId, changedAt)`                                                                                                                                                    |
| `updateTicketResolution` | `closeOpenQueueWait(tx, ticketId, changedAt)`                                                                                                                                                                                          |
| `requestTicketTransfer`  | `closeOpenQueueWait(tx, ticketId, changedAt)` **e depois** `openQueueWait(tx, { ticketId, departmentId: toDepartmentId, reason: RECEIVED_QUEUE_WAIT_REASON, startedAt: changedAt })`                                                   |
| `approveTicketTransfer`  | `closeOpenQueueWait(tx, ticketId, changedAt)`                                                                                                                                                                                          |
| `rejectTicketTransfer`   | `closeOpenQueueWait(tx, ticketId, changedAt)` **e depois** `openQueueWait(tx, { ticketId, departmentId: pendingTransfer.fromDepartmentId, reason: DECLINED_QUEUE_WAIT_REASON, startedAt: changedAt })`                                 |

Nenhuma assinatura pública de `tickets.ts` muda. As actions não mudam.

### `app/_lib/data/department-goals.ts` (alterado)

- `findDepartmentGoals`: selecionar `overdueTicketsLimit:
departmentGoal.overdueTicketsLimit` e `tmrMaxHours: departmentGoal.tmrMaxHours`
  (no lugar de `backlogLimit` e `transferAcceptanceMinPercent`).
- `upsertDepartmentGoals`: gravar `overdueTicketsLimit` e `tmrMaxHours` (no
  lugar dos dois antigos), em `values` e no `set`.
- `findPersonGoalFacts`: **sem mudança**.
- `findTeamGoalFacts`: assinatura igual; devolve `TeamGoalFacts` novo.
  - consulta 1 (agregado do time): **sai** `backlog_count` (e o import de
    `BACKLOG_TICKET_STATUSES`);
  - consulta 2 (`ticket_transfer` aprovadas/recusadas): **sai**, trocada pela
    agregação do TMR;
  - **nova** agregação do TMR e **nova** contagem de chamados em atraso
    (abaixo), no mesmo `Promise.all`;
  - membros e envios das horas em atraso: sem mudança.

**TMR do setor** (`$ms` = `month.start`, `$now` = `now`):

```sql
select count(*)::int as queue_wait_count,
       (avg(extract(epoch from (coalesce(w.ended_at, $now::timestamptz) - w.started_at)) * 1000))::float8
         as average_queue_wait_ms
from ticket_queue_wait w
where w.department_id = $dep
  and (w.ended_at is null or (w.ended_at >= $ms and w.ended_at < $now))
```

`avg` de zero linhas é `null` → `averageQueueWaitMs: null`, `queueWaitCount: 0`
(o domínio dá 0 e aderente). Usa `queue_wait_department_ended_idx`.

**Chamados em atraso do setor:**

```sql
select count(*)::int as overdue_ticket_count from (
  select t.id as ticket_id from ticket t
  where t.current_department_id = $dep and t.due_at is not null
    and (
      (t.status in (<DASHBOARD_RESOLVED_STATUSES>)
        and t.resolved_at >= $ms and t.resolved_at < $now
        and t.resolved_at > t.due_at)
      or (t.status in (<OVERDUE_TICKET_STATUSES>) and t.due_at < $now)
    )
  union
  select tr.ticket_id from ticket_transfer tr
  where tr.from_department_id = $dep and tr.from_due_at is not null
    and tr.created_at >= $ms and tr.created_at < $now
    and tr.from_due_at < tr.created_at
) x
```

`union` (não `union all`) é o que garante "um chamado no máximo uma vez por
setor no mês". Em Drizzle: `union` de dois `select({ ticketId })` como subquery
(`.as("overdue_tickets")`) e `count(*)` por fora, ou `sql` cru com as colunas
tipadas; statuses importados de `app/_lib/domain/dashboard.ts` como hoje.

`overdueTicketCount = row?.overdueTicketCount ?? 0`; `queueWaitCount` e
`averageQueueWaitMs` da linha do TMR (`?? 0` / `?? null`).

### `db/seed.ts`

- `seedDemo`: cada chamado criado com `initialStatus = "aberto"` grava uma
  espera `abertura` no setor do chamado, `started_at = blueprint.createdAt`;
  `ended_at` nulo se o status final é `aberto`, senão o `changedAt` da segunda
  linha de histórico (`resolvedAt`/`closedAt`) ou `updatedAt`. Chamados criados
  em outro status não têm espera.
- `seedQaWindowTickets` (chamado resolvido do QA, criado já com destinatário):
  nenhuma espera.
- Se algum seed passar a criar transferência, segue a tabela de atos.

## `df-actions`

`app/_lib/actions/department-goals.ts` (`saveDepartmentGoals`): **sem mudança
de código**. Ele valida com `saveDepartmentGoalsSchema` e passa os cinco campos
a `upsertDepartmentGoals`; os campos novos chegam pelo schema. Comportamento
novo: `tmrMaxHours` é obrigatório (`INVALID_INPUT` com a mensagem do Zod se
faltar), `overdueTicketsLimit` substitui o backlog, e o percentual de aceite
deixa de existir (enviar `transferAcceptanceMinPercent` é campo desconhecido,
ignorado pelo `z.object`). Nenhuma action de chamado muda: as esperas são
gravadas dentro de `app/_lib/data/`.

## `df-auth` e `df-email`

Nada.

## `df-ui` — o que muda

### Correções de compilação (obrigatórias)

| Arquivo                                                        | Mudança                                                                                                                                                                                    |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `app/(app)/operations/_components/department-goals-dialog.tsx` | `valuesFor`: `overdueTicketsLimit: goals?.overdueTicketsLimit`, `tmrMaxHours: goals?.tmrMaxHours ?? undefined` (nulo vira vazio: campo obrigatório, asterisco e erro "Informe…" ao salvar) |
| `app/(app)/operations/_components/goal-adherence-badge.tsx`    | `no_target` em `ADHERENCE_CLASSES` e `ADHERENCE_ICONS`, mesmo tom neutro do `no_data` (ícone neutro, ex.: `MinusIcon` ou `CircleDashedIcon`)                                               |
| `app/(app)/operations/_components/goal-gauge.tsx`              | `no_target` em `GAUGE_COLORS` (`var(--muted-foreground)`); `targetPercent: number \| null` na prop, e **sem marcador** quando nulo                                                         |
| `app/(app)/operations/_components/goal-gauge-card.tsx`         | repassa `gauge.targetPercent` (agora anulável)                                                                                                                                             |

### Tela

- Aba **Equipe**: os cinco cards na ordem de `GOAL_INDICATORS`; os dois
  últimos passam a ser `Quantidade de chamados em atraso` e `TMR`. Todos os
  textos (título, valor, alvo, linha de apoio, resumo, frase do não aderente)
  vêm do domínio: nada de texto local. Se o card comportar uma descrição, usar
  `Tempo médio de resposta` como subtítulo do card TMR — pedir a constante ao
  `df-architect` antes de escrever o texto no componente.
- Contexto sob o cabeçalho da aba Equipe: `operationsTabContext` já devolve o
  texto novo.
- Diálogo **Editar objetivos**: o grupo `TEAM_ONLY_GOALS_GROUP_LABEL` passa a
  ter `Limite de chamados em atraso` (`chamados`) e `TMR máximo` (`h`), na
  ordem de `TEAM_ONLY_GOAL_FIELDS`, pelo mesmo `NumberUnitField`.
- Conferir que nenhum componente tem texto local com "backlog", "aceite" ou
  "meta".

## Cenários para o `df-qa` (prefixo `TO`)

Aplicar `0027` e `0028` antes. Contas de admin e membro de dois setores (S e T)
e um Diretor.

| #    | Cenário                                                                                                                                | Esperado                                                                                                                                                                                               |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| TO1  | Pós-migration: `department_goal` de um setor que tinha backlog 40                                                                      | `overdue_tickets_limit = 40`; `transfer_acceptance_min_percent` não existe; `tmr_max_hours` nulo                                                                                                       |
| TO2  | Equipe de setor com objetivo antigo (sem TMR)                                                                                          | Card TMR `Sem objetivo`, `Objetivo não definido`, `O objetivo deste indicador ainda não foi definido.`, gauge sem marcador; resumo não cita TMR                                                        |
| TO3  | Abrir "Editar objetivos" nesse setor                                                                                                   | `Limite de chamados em atraso` com 40; `TMR máximo` vazio com asterisco; salvar sem preencher → `Informe o TMR máximo, em horas inteiras, a partir de 1.`                                              |
| TO4  | TMR `0`, `1000`, `1,5`; chamados em atraso `-1`, `10000`                                                                               | Mensagens da tabela de Validação; nada grava                                                                                                                                                           |
| TO5  | Salvar TMR 2 e limite 4                                                                                                                | Toast `Objetivos gravados.`; banco com `tmr_max_hours = 2`, `overdue_tickets_limit = 4`                                                                                                                |
| TO6  | Abrir chamado **sem destinatário** em S                                                                                                | Uma linha `abertura`, `department_id = S`, `started_at = ticket.created_at`, `ended_at` nulo                                                                                                           |
| TO7  | Abrir chamado já com destinatário (o próprio autor; um colega)                                                                         | Nenhuma linha em `ticket_queue_wait`                                                                                                                                                                   |
| TO8  | Assumir o chamado de TO6                                                                                                               | `ended_at` = instante do `atribuicao` no histórico                                                                                                                                                     |
| TO9  | Outro chamado na fila: "Enviar" a um colega                                                                                            | Espera `abertura` fechada no envio interno                                                                                                                                                             |
| TO10 | Outro chamado na fila: o autor resolve                                                                                                 | Espera fechada na resolução                                                                                                                                                                            |
| TO11 | Enviar chamado de S para T                                                                                                             | Espera aberta de S (se havia) fechada; nova `transferencia_recebida` em T aberta, `started_at = ticket_transfer.created_at`; no máximo uma aberta por chamado                                          |
| TO12 | Aceitar em T                                                                                                                           | `transferencia_recebida` fechada em `reviewed_at`; nenhuma espera nova                                                                                                                                 |
| TO13 | Recusar em T                                                                                                                           | `transferencia_recebida` fechada em `reviewed_at` (conta para **T**); `devolucao_por_recusa` aberta em **S** com o mesmo instante                                                                      |
| TO14 | Em S, o solicitante clica Atender no recusado (repetir com Assumir, Enviar a colega, reenviar a outro setor, resolver)                 | `devolucao_por_recusa` fechada no ato; editar só o título do recusado **não** fecha                                                                                                                    |
| TO15 | Equipe de T e de S depois de TO11–TO14                                                                                                 | TMR de cada setor = média das esperas dele que terminaram no mês ou estão abertas (consulta abaixo), na formatação `formatHoursMinutes`                                                                |
| TO16 | Setor sem nenhuma espera no mês                                                                                                        | TMR `0h`, `Aderente`                                                                                                                                                                                   |
| TO17 | Espera aberta há mais tempo que o limite                                                                                               | TMR cresce a cada recarga (duração até agora) e fica `Não aderente` quando a média passa do limite                                                                                                     |
| TO18 | Chamados em atraso: resolvido fora do prazo no mês; ativo vencido; resolvido no prazo; cancelado; resolvido com atraso em mês anterior | Contam só os dois primeiros                                                                                                                                                                            |
| TO19 | Enviar de S para T um chamado já vencido                                                                                               | Conta em S no mês (consulta abaixo); em T só se vencer lá depois do aceite                                                                                                                             |
| TO20 | O chamado de TO19 é recusado e volta vencido a S                                                                                       | S conta o chamado **uma vez**                                                                                                                                                                          |
| TO21 | Card Backlog do Início                                                                                                                 | Igual a antes (status de `BACKLOG_TICKET_STATUSES`, valor grande em atraso); não confundir com o objetivo                                                                                              |
| TO22 | Textos da Equipe                                                                                                                       | Títulos `Quantidade de chamados em atraso` e `TMR`; contexto `Objetivos da equipe de <mês>, de 1º/<mm> até hoje`; alvo `Limite ≤ 4 chamados` / `Objetivo ≤ 2h`; nada com "backlog", "aceite" ou "meta" |
| TO23 | Backfill: comparar esperas reconstruídas com o histórico de 3 chamados com envio e recusa                                              | `started_at`/`ended_at` batem com `ticket_transfer` e com os eventos do histórico; nenhum chamado com duas esperas abertas (consulta abaixo)                                                           |
| TO24 | Diretor com `?setor=T` na Equipe                                                                                                       | TMR e chamados em atraso de T                                                                                                                                                                          |
| TO25 | Membro                                                                                                                                 | Vê os cinco cards; não edita (como OP1)                                                                                                                                                                |

### Consultas de conferência (`postgres`, só leitura)

`$dep` = setor; `$start` = 1º do mês 00:00 `America/Sao_Paulo`.

```sql
-- TMR do setor no mês (TO15–TO17)
select count(*) as esperas,
       avg(coalesce(ended_at, now()) - started_at) as tmr,
       round((avg(extract(epoch from (coalesce(ended_at, now()) - started_at))) / 3600)::numeric, 2) as tmr_horas
from ticket_queue_wait
where department_id = $dep
  and (ended_at is null or (ended_at >= $start and ended_at < now()));

-- detalhe das esperas do setor
select w.ticket_id, w.reason, w.started_at, w.ended_at,
       coalesce(w.ended_at, now()) - w.started_at as duracao
from ticket_queue_wait w
where w.department_id = $dep
  and (w.ended_at is null or (w.ended_at >= $start and w.ended_at < now()))
order by w.started_at;

-- Chamados em atraso do setor no mês (TO18–TO20)
select count(*) from (
  select t.id from ticket t
  where t.current_department_id = $dep and t.due_at is not null
    and ((t.status in ('resolvido','fechado') and t.resolved_at >= $start and t.resolved_at < now() and t.resolved_at > t.due_at)
      or (t.status in ('aberto','em_analise','encaminhado','recusado','em_andamento') and t.due_at < now()))
  union
  select tr.ticket_id from ticket_transfer tr
  where tr.from_department_id = $dep and tr.from_due_at is not null
    and tr.created_at >= $start and tr.created_at < now()
    and tr.from_due_at < tr.created_at
) x;

-- invariantes (TO11, TO23): devem devolver 0
select ticket_id from ticket_queue_wait where ended_at is null
group by ticket_id having count(*) > 1;

select count(*) from ticket_transfer tr
where tr.status = 'pendente' and not exists (
  select 1 from ticket_queue_wait w
  where w.ticket_id = tr.ticket_id and w.reason = 'transferencia_recebida' and w.ended_at is null);

select count(*) from ticket_queue_wait w join ticket t on t.id = w.ticket_id
where w.ended_at is null and t.status in ('resolvido','fechado','cancelado');

-- linha do tempo de um chamado (TO6–TO14)
select 'espera' as fonte, reason::text as evento, department_id, started_at as em, ended_at
from ticket_queue_wait where ticket_id = $ticket
union all
select 'historico', event::text, to_department_id, changed_at, null
from ticket_history where ticket_id = $ticket
order by em;
```

(Os status de "ativo" vêm de `OVERDUE_TICKET_STATUSES`; conferir no código se
mudarem.)

## `npx tsc --noEmit` depois da Onda 0 (esperado, por dono)

| Arquivo                                                        | Linhas                         | Dono      | Causa                                                                                |
| -------------------------------------------------------------- | ------------------------------ | --------- | ------------------------------------------------------------------------------------ |
| `app/_lib/data/department-goals.ts`                            | 87, 88, 97, 109, 110, 116, 257 | `df-data` | colunas e campos renomeados; `backlogCount`, `approvedCount`, `rejectedCount` saíram |
| `app/(app)/operations/_components/department-goals-dialog.tsx` | 51, 52                         | `df-ui`   | `backlogLimit`, `transferAcceptanceMinPercent`                                       |
| `app/(app)/operations/_components/goal-adherence-badge.tsx`    | 13, 19, 26, 31                 | `df-ui`   | `GoalAdherence` ganhou `no_target`                                                   |
| `app/(app)/operations/_components/goal-gauge.tsx`              | 14, 92                         | `df-ui`   | `GoalAdherence` ganhou `no_target`                                                   |
| `app/(app)/operations/_components/goal-gauge-card.tsx`         | 32                             | `df-ui`   | `targetPercent` anulável                                                             |

## Riscos

- Um ato esquecido deixa espera aberta para sempre (TMR piora sem motivo) ou
  nunca aberta. TO6–TO14 cobrem cada ato; a terceira invariante acima pega
  espera aberta em chamado encerrado.
- Esperas abertas antigas pesam muito no mês corrente (duração inteira). É a
  regra escolhida: não responder deve pesar.
- Backfill de dados anteriores ao ADR 016 pode ser impreciso; não aparece na
  tela porque só o mês corrente é exibido (ADR 025).

## Checklist

### Onda 0 — `df-architect` (pronto)

- [x] `db/schema.ts`: enum `queue_wait_reason`, `ticket_queue_wait`,
      `department_goal` (rename, drop, coluna nova), relations, tipos
- [x] `0027_tmr_overdue_tickets_goals.sql` (gerada, rename conferido) e
      `0028_backfill_ticket_queue_wait.sql` (custom), não aplicadas
- [x] `types/operations.ts`, `types/queue-wait.ts`,
      `validation/department-goals.ts`, `domain/department-goals.ts`,
      `domain/goal-indicators.ts`, `domain/operations.ts`,
      `domain/queue-wait.ts`
- [x] ADR 025; notas nos ADRs 022 e 023; `operations.md` revisado

### Onda 1 — `df-data` (pronto)

- [x] `app/_lib/data/queue-waits.ts`
- [x] os oito atos de `tickets.ts`
- [x] `department-goals.ts` (leitura, upsert, TMR, chamados em atraso)
- [x] `db/seed.ts` (`seedDemo`)

### Onda 1/2 — `df-ui` (pronto)

- [x] correções de compilação (diálogo, selo, gauge com `no_target`)
- [x] conferência de textos na Equipe e no diálogo

### Onda 2 — `df-actions` (pronto)

- [x] nada a mudar; `tsc` limpo em `actions/department-goals.ts`

### Onda 3/4

- [ ] `df-reviewer`: lint, tsc, build, camadas
- [ ] `df-qa`: TO1–TO25
