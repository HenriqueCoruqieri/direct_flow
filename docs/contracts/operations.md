# Contrato — Operação (metas operacionais por setor)

Item de menu **Operação**, com três abas: **Minha meta**, **Time** e
**Produção**. Cada setor tem uma meta vigente (SLA, TMA, horas em atraso,
backlog, aceite de transferências), avaliada sobre o mês corrente para cada
pessoa e para o time. Produção mostra os resolvidos por pessoa num período
escolhido.

Sem `docs/plans/` (pedido do usuário). ADRs:
`docs/adr/022-department-goals-single-row-month-to-date.md` e
`docs/adr/023-overdue-hours-accrued-within-month.md` (rodada 2: horas em atraso
acumuladas no mês). Fuso: ADR 009. SLA: ADR 019 (intacto). Diretor: ADR 011.

Versões observadas: `next@16.3.5`, `zod@4.6.5`, `drizzle-orm@0.45.2`,
`dayjs@1.11.23`, `recharts@3.8.0`, `react-hook-form@7.88`.

## Decisões fixadas (não reabrir)

| Tema                    | Decisão                                                                                                                                                                                                                                       |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Menu                    | "Operação", visível a **todos** os papéis, logo abaixo de "Início" (antes de "Meus chamados"), ícone `MonitorIcon` do `lucide-react` (decisão do usuário, substitui `GaugeIcon` e a posição entre Aprovações e Cadastros). Rota `/operations` |
| Abas                    | `Minha meta` \| `Time` \| `Produção`, no visual do switch Coletivo\|Individual do Início, mas com **estado na URL** (`?aba=`), uma navegação por troca                                                                                        |
| Meta                    | **Uma vigente por setor**, sem histórico, sem meta por mês, sem meta individual distinta. A meta de cada pessoa é a do setor dela                                                                                                             |
| Mês                     | Resultado de metas é sempre o **mês corrente** em São Paulo: `[1º do mês 00:00 SP, agora)` (`monthToDateRange(now)`). O filtro de período **não** afeta metas                                                                                 |
| Quem edita              | Admin do **próprio** setor ou **Diretor** (qualquer setor ativo e alocável). Membro só vê. Consulta fresca ao banco (`getRegistryAccess`, ADR 011)                                                                                            |
| Não alocado             | Não tem metas, não aparece no seletor do Diretor; quem está nele vê só a mensagem `OPERATIONS_UNASSIGNED_MESSAGE` (como a Fila do setor)                                                                                                      |
| Diretoria               | Pode ter metas. A "Minha meta" do Diretor é avaliada com a meta da Diretoria                                                                                                                                                                  |
| Seletor do Diretor      | `?setor=<id>` só para Diretor; ignorado para os demais. Inválido, inativo ou Não alocado → setor da sessão. Afeta **Time** e **Produção**; **Minha meta** é sempre o setor da sessão (é a meta da própria pessoa)                             |
| Mesma meta, dois níveis | SLA mínimo, TMA máximo e limite de horas em atraso valem **com o mesmo número** para cada pessoa e para o time. Backlog e aceite só para o time                                                                                               |
| Horas em atraso         | **Acumulam no mês** (rodada 2, ADR 023): conta o atraso de cada chamado que caiu dentro do mês corrente, inclusive de chamados já resolvidos no mês. Resolver não reduz o número; zera no dia 1º. Substitui a foto dos ativos da rodada 1     |
| Fora do escopo          | Histórico de metas, meta individual, meta de produção, e-mail, mudar horas de SLA por prioridade, polling                                                                                                                                     |

## Definições

"Meu" = a mesma noção do modo Individual do Início
(`docs/contracts/dashboard-individual-mode.md`): `ticket.assigned_to = pessoa`
**e** `ticket.current_department_id = setor`. "Do setor" (time) =
`ticket.current_department_id = setor`, qualquer destinatário.

| Indicador (rótulo)                                           | Recorte                                                                                                                                                | Cálculo                                                                                                                                                                          | Aderente se           |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| **SLA no prazo** (`sla`)                                     | meus (time: do setor) com `resolved_at ∈ [início do mês, agora)` e status em `DASHBOARD_RESOLVED_STATUSES` (`resolvido`, `fechado`)                    | `floor(no prazo × 100 / resolvidos)`; no prazo = `resolved_at <= ticketDueAtSql` (o inverso exato do `missed` de `ticketSlaFor`)                                                 | `% >= meta`           |
| **Tempo médio de resolução** (`tma`)                         | mesmo recorte do SLA                                                                                                                                   | média de `resolved_at − created_at`, em ms                                                                                                                                       | `média <= meta h`     |
| **Horas em atraso** (`overdue`)                              | **mês**: meus (time: do setor) que são (a) `resolvido`/`fechado` com `resolved_at ∈ [início do mês, agora)` ou (b) status em `OVERDUE_TICKET_STATUSES` | por chamado: `fim − max(ticketDueAtSql, início do mês)`, só se positivo; fim = `resolved_at` em (a), `now` em (b). Soma em ms (0 se nenhum). Ver "Horas em atraso do mês" abaixo | `soma <= limite h`    |
| **Backlog** (`backlog`, só time)                             | **agora**: do setor, status em `BACKLOG_TICKET_STATUSES`                                                                                               | contagem (todos, vencidos ou não)                                                                                                                                                | `n <= limite`         |
| **Aceite de transferências** (`transferAcceptance`, só time) | `ticket_transfer.to_department_id = setor`, `reviewed_at ∈ [início do mês, agora)`, status `aprovado` ou `rejeitado` (`pendente`/`cancelado` fora)     | `floor(aprovadas × 100 / (aprovadas + rejeitadas))`                                                                                                                              | `% >= meta`           |
| **Meta cumprida** (pessoa)                                   | cada pessoa **ativa** do setor (`users.department_id = setor`, `is_active`), admin incluído                                                            | SLA, TMA e horas em atraso da pessoa, com a meta do setor                                                                                                                        | nenhum "Não aderente" |
| **N de M cumpriram** (time)                                  | M = pessoas ativas do setor                                                                                                                            | N = quantas têm "Meta cumprida"                                                                                                                                                  | —                     |
| **Meta do time**                                             | os cinco indicadores do time                                                                                                                           | —                                                                                                                                                                                | nenhum "Não aderente" |
| **Produção**                                                 | período do filtro (`resolvePeriodRange`), uma barra por pessoa ativa do setor (zero incluído)                                                          | meus com `resolved_at ∈ período` e status em `DASHBOARD_RESOLVED_STATUSES`; ordem: contagem desc, nome (`lower`) asc, id asc                                                     | —                     |

### Horas em atraso do mês (rodada 2, ADR 023)

Para cada chamado do recorte, o atraso que caiu dentro de `[início do mês, now)`
(início do mês = 1º 00:00 `America/Sao_Paulo`, `monthToDateRange(now).start`):

- **início** = `max(vencimento, início do mês)`, vencimento = `ticketDueAtSql`
  (ADR 019)
- **fim** = `resolved_at` se o status está em `DASHBOARD_RESOLVED_STATUSES`
  (`resolvido`, `fechado`) **e** `resolved_at ∈ [início do mês, now)`; `now` se o
  status está em `OVERDUE_TICKET_STATUSES` (mantido igual a
  `BACKLOG_TICKET_STATUSES`: `aberto`, `em_analise`, `encaminhado`, `recusado`,
  `em_andamento`, conforme `app/_lib/domain/dashboard.ts`)
- conta `fim − início` **só se `fim > início`**; soma de todos.

Não contam: resolvido/fechado com `resolved_at` antes do mês; cancelado (com ou
sem `resolved_at`); resolvido dentro do prazo; ativo ainda não vencido.

Exemplos (fixados pelo usuário):

| Chamado                                                 | Conta em novembro                     |
| ------------------------------------------------------- | ------------------------------------- |
| 6h atrasado até o fim de 30/11, mais 10h em dezembro    | 6h (as 10h contam em dezembro)        |
| vencido desde agosto, resolvido em 05/11 10:00          | de 01/11 00:00 até 05/11 10:00 (106h) |
| vencido em 03/11 08:00, resolvido em 03/11 14:00        | 6h — resolver não tira da conta       |
| vencido em 10/11 08:00, ainda aberto, agora 11/11 08:00 | 24h, e segue crescendo                |
| resolvido em 28/10 com atraso                           | 0                                     |
| cancelado                                               | 0                                     |

O fato continua se chamando `overdueMs` (sem renomear, para cada camada compilar
sozinha); só a semântica mudou.

Regras de dado ausente:

- **Sem resolvidos no mês** → SLA e TMA = "Sem dados" e **não reprovam**.
- **Sem transferência revisada no mês** → Aceite = "Sem dados", não reprova.
- Horas em atraso e backlog sempre têm valor (zero é valor).
- Arredondamento: percentuais com **floor** (como `resolutionRateFor`).
  Comparar o floor com a meta inteira é equivalente a comparar o valor exato
  (`floor(x) >= m ⇔ x >= m` para `m` inteiro). TMA e horas em atraso são
  comparados em ms contra `meta × HOUR_MS`, sem arredondar.

Consequências aceitas (registrar no QA, não são defeito):

- Pessoa sem nenhum chamado no mês e sem atraso "cumpriu" (nada reprova).
- O limite de horas em atraso do time é o mesmo número do individual, mas o
  time soma o atraso de todos — tende a reprovar antes.
- O valor do Backlog aqui é a **contagem total** em backlog; no card Backlog do
  Início o valor grande é a contagem **em atraso**. São indicadores diferentes.
- Chamado transferido para fora sai do "meu" e do "do setor" na hora, inclusive
  dos resolvidos do mês (mesma consequência do modo Individual).
- Por isso o atraso do mês de um chamado vai **inteiro** com ele: transferido,
  o setor de destino herda as horas do mês (inclusive as acumuladas antes de
  chegar); trocado o responsável, as horas do mês passam ao novo responsável.
- Horas em atraso não diminuem dentro do mês (resolver só para o relógio),
  exceto pelas saídas do recorte acima.

## Schema — `db/schema.ts` (`df-architect`, pronto)

Tabela nova `department_goal` (migration `db/migrations/0024_department_goal.sql`,
gerada, **não aplicada**; não destrutiva, sem backfill):

| Coluna                            | Tipo                   | Regra                                                                                   |
| --------------------------------- | ---------------------- | --------------------------------------------------------------------------------------- |
| `id`                              | `integer` identity PK  | padrão `pk()`                                                                           |
| `department_id`                   | `integer not null`     | FK `department.id` **on delete cascade**; índice único `department_goal_department_idx` |
| `sla_min_percent`                 | `smallint not null`    | `check between 1 and 100`                                                               |
| `tma_max_hours`                   | `smallint not null`    | `check >= 1`                                                                            |
| `overdue_hours_limit`             | `smallint not null`    | `check >= 0`                                                                            |
| `backlog_limit`                   | `integer not null`     | `check >= 0`                                                                            |
| `transfer_acceptance_min_percent` | `smallint not null`    | `check between 1 and 100`                                                               |
| `updated_by`                      | `integer` nulo         | FK `users.id` **on delete set null**; índice `department_goal_updated_by_idx`           |
| `created_at`, `updated_at`        | `timestamptz not null` | padrão `timestamps` (`updated_at` com `$onUpdate`)                                      |

Por que cascade em `department_id`: ver ADR 022 (a meta não existe sem o setor;
setor nunca é apagado pela aplicação).

Relations: `departmentGoalRelations` (`department`, `updater`),
`departmentRelations.goal` (one), `userRelations.updatedDepartmentGoals`
(many). Tipos `DepartmentGoal` / `NewDepartmentGoal`.

Nenhum índice novo em `ticket` ou `ticket_transfer`: as leituras usam
`ticket_dept_status_idx`, `ticket_assigned_to_idx` e `transfer_inbox_idx`.

## Tipos — `app/_lib/types/operations.ts` (`df-architect`, pronto)

```ts
export type OperationsTab = "minha-meta" | "time" | "producao" // de OPERATIONS_TABS
export interface OperationsLocation {
  tab: OperationsTab
  period: PeriodSelection
  departmentId: number | null
}
export interface OperationsAccessFacts {
  isUnassigned: boolean
}

export type GoalIndicator =
  "sla" | "tma" | "overdue" | "backlog" | "transferAcceptance"
export type PersonGoalIndicator = "sla" | "tma" | "overdue"
export type TeamOnlyGoalIndicator = "backlog" | "transferAcceptance"
export type GoalUnit = "percent" | "duration" | "count"
export type GoalDirection = "min" | "max"
export interface GoalIndicatorRule {
  unit: GoalUnit
  direction: GoalDirection
}

export interface DepartmentGoals {
  slaMinPercent: number
  tmaMaxHours: number
  overdueHoursLimit: number
  backlogLimit: number
  transferAcceptanceMinPercent: number
}
export interface DepartmentGoalsRecord extends DepartmentGoals {
  departmentId: number
  updatedAt: Date
  updatedByName: string | null
}
export interface GoalTargetDepartment extends DepartmentAvailability {
  id: number
}

export interface GoalResolutionFacts {
  resolvedCount: number
  slaMetCount: number
  averageResolutionMs: number | null
}
export interface PersonGoalFacts extends GoalResolutionFacts {
  overdueMs: number
}
export interface TeamMemberGoalFacts extends PersonGoalFacts {
  userId: number
  name: string
  image: string | null
}
export interface TeamTransferReviewFacts {
  approvedCount: number
  rejectedCount: number
}
export interface TeamGoalFacts
  extends PersonGoalFacts, TeamTransferReviewFacts {
  backlogCount: number
  members: TeamMemberGoalFacts[]
}

export type GoalAdherence = "adherent" | "not_adherent" | "no_data"
export interface MeasuredGoalEvaluation {
  indicator: GoalIndicator
  adherence: "adherent" | "not_adherent"
  value: number
  target: number
}
export interface UnmeasuredGoalEvaluation {
  indicator: GoalIndicator
  adherence: "no_data"
  value: null
  target: number
}
export type GoalEvaluation = MeasuredGoalEvaluation | UnmeasuredGoalEvaluation
export type GoalEvaluations<T extends GoalIndicator> = Record<T, GoalEvaluation>

export interface GoalMetSummary {
  met: true
}
export interface GoalNotMetSummary {
  met: false
  failed: GoalIndicator[]
}
export type GoalSummary = GoalMetSummary | GoalNotMetSummary

export interface PersonGoalResult {
  evaluations: GoalEvaluations<PersonGoalIndicator>
  summary: GoalSummary
}
export interface TeamGoalResult {
  evaluations: GoalEvaluations<GoalIndicator>
  summary: GoalSummary
  metCount: number
  memberCount: number
}

export interface GoalGauge {
  max: number
  fillPercent: number
  targetPercent: number
}
export interface GoalFieldCopy {
  label: string
  description: string
  unit: string
}
export interface OperationsEmptyCopy {
  title: string
  description: string
}
export interface TeamProductionEntry {
  userId: number
  name: string
  image: string | null
  resolvedCount: number
}
```

**Unidade de `value` e `target` na avaliação:** `percent` → inteiro 0–100;
`duration` → **ms** (a meta em horas já vem multiplicada por `HOUR_MS`);
`count` → chamados. Valor e meta sempre na mesma unidade.

**`overdueMs` (rodada 2):** nome e tipo mantidos em `PersonGoalFacts`,
`TeamMemberGoalFacts` e `TeamGoalFacts`; o valor passa a ser as **horas em
atraso do mês**, em ms (seção "Horas em atraso do mês"). Nenhum tipo mudou.

Os dados (`df-data`) devolvem só **fatos** (`PersonGoalFacts`, `TeamGoalFacts`,
`TeamProductionEntry[]`); a avaliação é do domínio. Assim a mesma regra de
aderência serve à tela e a qualquer uso futuro, sem SQL decidindo meta.

## Validação (`df-architect`, pronto)

### `app/_lib/validation/department-goals.ts`

```ts
export const departmentGoalsSchema: z.ZodObject<{
  slaMinPercent
  tmaMaxHours
  overdueHoursLimit
  backlogLimit
  transferAcceptanceMinPercent
}>
export type DepartmentGoalsInput = z.infer<typeof departmentGoalsSchema>

export const saveDepartmentGoalsSchema = departmentGoalsSchema.extend({
  departmentId: departmentIdSchema,
})
export type SaveDepartmentGoalsInput = z.infer<typeof saveDepartmentGoalsSchema>
```

Cada campo é `z.int()` com faixa. Vazio, `NaN`, fracionário, abaixo do mínimo →
mensagem "Informe…"; acima do máximo → "O valor máximo é…".

| Campo                          | Faixa  | "Informe…" (tipo, inteiro, mínimo)                                       | Máximo                             |
| ------------------------------ | ------ | ------------------------------------------------------------------------ | ---------------------------------- |
| `slaMinPercent`                | 1–100  | `Informe o SLA mínimo, de 1 a 100.`                                      | `O valor máximo é 100%.`           |
| `tmaMaxHours`                  | 1–999  | `Informe o TMA máximo, em horas inteiras, a partir de 1.`                | `O valor máximo é 999 horas.`      |
| `overdueHoursLimit`            | 0–9999 | `Informe o limite de horas em atraso, em horas inteiras, a partir de 0.` | `O valor máximo é 9.999 horas.`    |
| `backlogLimit`                 | 0–9999 | `Informe o limite de backlog, em chamados, a partir de 0.`               | `O valor máximo é 9.999 chamados.` |
| `transferAcceptanceMinPercent` | 1–100  | `Informe a taxa de aceite de transferências, de 1 a 100.`                | `O valor máximo é 100%.`           |

Os tetos 999/9999 são de sanidade (cabem em `smallint`); o banco só confere os
pisos e a faixa 1–100 dos percentuais.

**FormField:** `departmentGoalsSchema` é `ZodObject` puro; os cinco campos saem
**obrigatórios** por derivação (conferido: `isFieldRequired` = `true` nos cinco).
O formulário passa `departmentGoalsSchema` ao `zodResolver` **e** ao
`FormSchemaProvider`. O `departmentId` não é campo do formulário: o componente o
junta ao valor validado na hora de chamar a action.

**Input numérico:** o campo guarda `number`. No `onChange`, o `df-ui` converte:
`event.target.value === "" ? undefined : event.target.valueAsNumber`. Vazio vira
`undefined` (asterisco volta, erro "Informe…" ao salvar); texto inválido vira
`NaN` (mesmo erro). `defaultValues`: os números da meta vigente, ou `undefined`
nos cinco quando não há meta.

### `app/_lib/validation/operations.ts`

| Export                                   | Semântica                                                                                                                                                                                          |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `operationsSearchParamsSchema`           | `{ aba: enum(OPERATIONS_TABS).catch("minha-meta"), setor: idSearchParamSchema.optional().catch(undefined) }`                                                                                       |
| `operationsPeriodSchema(today)`          | `hoje`/`semana`/`mes` ou `personalizado` com `customPeriodSchema(today)` (mesmas regras do Início: datas válidas, `ate >= de`, `ate <= today`). Sem "todos"                                        |
| `parseOperationsParams(raw, today)`      | `OperationsLocation`. Qualquer parâmetro inválido cai no default sem erro: aba `minha-meta`, período `{ periodo: "mes" }`, `departmentId: null`. **Não** sabe se a pessoa é Diretor                |
| `operationsKeepParams(tab, deptId)`      | `{ aba }` ou `{ aba, setor }`                                                                                                                                                                      |
| `serializeOperationsParams(location)`    | query sem `?`, ordem `aba`, `setor`, `periodo`, `de`, `ate`. `aba` e `periodo` sempre presentes                                                                                                    |
| `operationsHref(location)`               | `/operations?…`                                                                                                                                                                                    |
| `operationsTabHref(location, tab)`       | mesma localização com outra aba (período e setor preservados)                                                                                                                                      |
| `operationsCanonicalHref(raw, location)` | `null` se `raw` já é a forma canônica de `location`; senão o href canônico. A página chama com a localização **aplicada** (setor já filtrado por `applicableOperationsDepartmentId`) e redireciona |

O período fica na URL nas três abas (para a volta a Produção manter o filtro),
mas só Produção o usa (`usesOperationsPeriod`).

## Datas — `app/_lib/date.ts` (`df-architect`, pronto, acréscimos)

| Export                       | Semântica                                                                        |
| ---------------------------- | -------------------------------------------------------------------------------- |
| `monthToDateRange(now)`      | `{ start: 1º do mês corrente 00:00 em SP, end: now }`                            |
| `formatMonthYear(value)`     | `novembro de 2026` (mês em SP, minúsculo)                                        |
| `formatDateAtTime(value)`    | `11/11/2026 às 14:32`                                                            |
| `formatHoursMinutes(ms)`     | horas sem virar dias: `0h`, `< 1min`, `45min`, `6h`, `1h 20min`, `1.234h`        |
| `formatMonthName(value)`     | `novembro` (mês em SP, minúsculo)                                                |
| `formatMonthFirstDay(value)` | `1º/11` (primeiro dia do mês em SP)                                              |
| `formatInteger(value)`       | inteiro em pt-BR sem casas: `1.234`. Fonte única (substitui `formatGoalInteger`) |

## Domínio (`df-architect`, pronto)

### `app/_lib/domain/operations.ts`

| Export                                                                    | Valor / semântica                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPERATIONS_PATH` / `OPERATIONS_LABEL`                                    | `"/operations"` / `"Operação"`                                                                                                                                                                                                                                    |
| `OPERATIONS_TABS`                                                         | `["minha-meta", "time", "producao"] as const` (reexport da folha `operations-tabs.ts`)                                                                                                                                                                            |
| `OPERATIONS_TAB_LABELS`                                                   | `Minha meta`, `Time`, `Produção`                                                                                                                                                                                                                                  |
| `OPERATIONS_TAB_GROUP_LABEL`                                              | `"Visão da operação"` (rótulo acessível do grupo de abas)                                                                                                                                                                                                         |
| `OPERATIONS_TAB_PARAM` / `OPERATIONS_DEPARTMENT_PARAM`                    | `"aba"` / `"setor"`                                                                                                                                                                                                                                               |
| `OPERATIONS_DEPARTMENT_FILTER_LABEL`                                      | `"Setor"`                                                                                                                                                                                                                                                         |
| `DEFAULT_OPERATIONS_TAB` / `DEFAULT_OPERATIONS_PERIOD`                    | `"minha-meta"` / `{ periodo: "mes" }`                                                                                                                                                                                                                             |
| `OPERATIONS_PERIOD_PRESETS`                                               | `PRESET_PERIODS` (para o `PeriodFilter`)                                                                                                                                                                                                                          |
| `usesOperationsPeriod(tab)` / `usesOperationsDepartment(tab)`             | só `producao` / `time` e `producao`. Filtro de período e seletor de setor só aparecem nessas abas                                                                                                                                                                 |
| `OPERATIONS_UNASSIGNED_MESSAGE`, `hasOperations(facts)`                   | texto do Não alocado (o mesmo da Fila); `facts !== null && !facts.isUnassigned`                                                                                                                                                                                   |
| `operationsDepartmentOptions(viewer, options)`                            | Diretor: `assignableDepartments(options)` (ativos, sem Não alocado, Diretoria incluída); demais: `[]`                                                                                                                                                             |
| `applicableOperationsDepartmentId(viewer, requested, options)`            | não-Diretor ou `null` → `null`; id fora de `options` → `null`; id = setor da sessão → `null`; senão o id                                                                                                                                                          |
| `operationsDepartmentIdFor(viewer, applied)`                              | `applied ?? viewer.departmentId`                                                                                                                                                                                                                                  |
| `canEditDepartmentGoals(access, target)`                                  | `false` se o setor não é alocável (inativo ou Não alocado); Diretor → `true`; admin de setor → `access.departmentId === target.id`; `none` → `false`                                                                                                              |
| `goalsUndefinedCopy(canEdit)`                                             | título `Metas ainda não definidas`; descrição do membro ou do editor (textos do pedido, em `GOALS_UNDEFINED_*`)                                                                                                                                                   |
| `operationsSubtitle(departmentName, goals, now)`                          | `Suporte · metas de novembro de 2026 · definidas por Ana em 10/11/2026`. Sem meta: só `Suporte · metas de novembro de 2026`. `updatedByName` nulo: `· definidas em …`                                                                                             |
| `MY_GOAL_CARD_LABEL`, `TEAM_GOAL_CARD_LABEL`, `TEAM_MET_COUNT_CARD_LABEL` | `Minha meta`, `Meta do time`, `Pessoas que cumpriram a meta`                                                                                                                                                                                                      |
| `PRODUCTION_CARD_LABEL`, `PRODUCTION_LOADING_LABEL`                       | `Chamados resolvidos por pessoa`, `Carregando chamados resolvidos por pessoa`                                                                                                                                                                                     |
| `PRODUCTION_SCROLL_REGION_LABEL`                                          | `Gráfico de barras da produção; os valores estão na tabela a seguir` (`aria-label` da região rolável focável do gráfico; distinto do `caption` da tabela `sr-only`)                                                                                               |
| `productionCountLabel(n)`, `productionEntryLabel(entry)`                  | `1 resolvido` / `3 resolvidos`; `Ana Souza: 3 resolvidos` (rótulo acessível da barra e linha da tabela `sr-only`)                                                                                                                                                 |
| `operationsTabContext(tab, now)`                                          | linha de contexto sob o cabeçalho. Minha meta: `Suas metas de novembro, de 1º/11 até hoje` (mês em SP); Time: `Metas do setor · backlog é de agora` (rodada 2: horas em atraso deixaram de ser "de agora"); Produção: `O período do gráfico fica no próprio card` |
| `GOALS_LOADING_LABEL`                                                     | `Carregando metas` (`aria-label` do esqueleto das abas de meta)                                                                                                                                                                                                   |
| `PRODUCTION_PANEL_TITLE`                                                  | `Produção da equipe` (título do card de Produção)                                                                                                                                                                                                                 |
| `peopleCountLabel(n)`                                                     | `1 pessoa` / `12 pessoas`                                                                                                                                                                                                                                         |
| `productionTotalFor(entries)`                                             | soma de `resolvedCount` (negativo conta 0)                                                                                                                                                                                                                        |
| `productionSubtitle(entries)`                                             | `Chamados resolvidos por pessoa · 37 resolvidos no período · 12 pessoas` (`1 resolvido`, `1 pessoa` no singular)                                                                                                                                                  |
| `productionScrollHint(n)`                                                 | `Arraste para ver as 12 pessoas.` (só exibido com mais de 5 pessoas, então sempre plural na prática)                                                                                                                                                              |
| `PRODUCTION_SELF_LABEL`                                                   | `Você` (rótulo do eixo X na barra da pessoa da sessão)                                                                                                                                                                                                            |
| `isProductionEmpty(entries)`, `productionEmptyCopy(entries)`              | lista vazia → `PRODUCTION_NO_MEMBERS_COPY`; todos zero → `PRODUCTION_EMPTY_COPY` (`Nenhum chamado resolvido no período`); senão `null` (mostra o gráfico)                                                                                                         |

### `app/_lib/domain/department-goals.ts`

| Export                                                                                                                                                                 | Valor / semântica                                                                                                                                                                                                                                                                                                                                                       |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GOAL_INDICATORS`, `PERSON_GOAL_INDICATORS`, `TEAM_ONLY_GOAL_INDICATORS`                                                                                               | ordem de exibição: SLA, TMA, horas em atraso, (backlog, aceite)                                                                                                                                                                                                                                                                                                         |
| `GOAL_PERCENT_MIN/MAX`, `GOAL_TMA_HOURS_MIN/MAX`, `GOAL_HOURS_LIMIT_MAX`, `GOAL_BACKLOG_MAX`                                                                           | faixas do Zod (1/100, 1/999, 9999, 9999)                                                                                                                                                                                                                                                                                                                                |
| `GOAL_INDICATOR_RULES`                                                                                                                                                 | unidade e direção: `sla`/`transferAcceptance` percent/min; `tma`/`overdue` duration/max; `backlog` count/max                                                                                                                                                                                                                                                            |
| `GOAL_FIELD_BY_INDICATOR`                                                                                                                                              | indicador → coluna de `DepartmentGoals`                                                                                                                                                                                                                                                                                                                                 |
| `GOAL_INDICATOR_LABELS`                                                                                                                                                | `SLA no prazo`, `Tempo médio de resolução`, `Horas em atraso`, `Backlog`, `Aceite de transferências`                                                                                                                                                                                                                                                                    |
| `GOAL_INDICATOR_SHORT_LABELS`                                                                                                                                          | para o resumo: `SLA`, `TMA`, `horas em atraso`, `backlog`, `aceite de transferências`                                                                                                                                                                                                                                                                                   |
| `GOAL_ADHERENCE_LABELS`                                                                                                                                                | `Aderente`, `Não aderente`, `Sem dados` (texto do selo)                                                                                                                                                                                                                                                                                                                 |
| `slaPercentFor(facts)`, `averageResolutionFor(facts)`, `transferAcceptancePercentFor(facts)`                                                                           | `null` sem base (sem resolvidos / sem revisadas); percentuais com floor                                                                                                                                                                                                                                                                                                 |
| `goalTargetFor(indicator, goals)`                                                                                                                                      | meta na unidade da avaliação (horas × `HOUR_MS` para duração)                                                                                                                                                                                                                                                                                                           |
| `isWithinGoal(indicator, value, target)`                                                                                                                               | `min` → `>=`; `max` → `<=`                                                                                                                                                                                                                                                                                                                                              |
| `evaluateGoal(indicator, value, goals)`                                                                                                                                | `value === null` → `no_data`; senão `adherent`/`not_adherent`                                                                                                                                                                                                                                                                                                           |
| `evaluatePersonGoals(goals, facts)` / `evaluateTeamGoals(goals, facts)`                                                                                                | três / cinco avaliações                                                                                                                                                                                                                                                                                                                                                 |
| `goalSummaryFor(evaluations)` / `isGoalMet(evaluations)`                                                                                                               | `failed` = indicadores `not_adherent`, na ordem recebida. `no_data` não reprova                                                                                                                                                                                                                                                                                         |
| `isPersonGoalMet(goals, facts)`, `goalMetCountFor(goals, members)`                                                                                                     | por pessoa (SLA, TMA, horas em atraso)                                                                                                                                                                                                                                                                                                                                  |
| `personGoalResultFor(goals, facts)` → `PersonGoalResult`                                                                                                               | o que a aba Minha meta renderiza                                                                                                                                                                                                                                                                                                                                        |
| `teamGoalResultFor(goals, facts)` → `TeamGoalResult`                                                                                                                   | o que a aba Time renderiza; `metCount`/`memberCount` de `facts.members`                                                                                                                                                                                                                                                                                                 |
| `goalSummaryLabel(summary)`                                                                                                                                            | `Meta cumprida` ou `Meta não cumprida · não aderente em TMA` / `… em SLA e TMA` / `… em SLA, TMA e horas em atraso`                                                                                                                                                                                                                                                     |
| `goalMetCountLabel(n, m)`                                                                                                                                              | `3 de 5 cumpriram`, `1 de 5 cumpriu`; `m = 0` → `Nenhuma pessoa ativa no setor`                                                                                                                                                                                                                                                                                         |
| `goalValueLabel(evaluation)`                                                                                                                                           | `92%`, `5h 12min`, `0h`, `6 chamados`; sem dados → `—`                                                                                                                                                                                                                                                                                                                  |
| `goalScaleLabel(indicator, value)`                                                                                                                                     | rótulo das pontas do gauge (`0` e `gauge.max`), na formatação por unidade de `goalValueLabel`: `0%`/`100%`, `0h`/`16h`, `0 chamados`/`80 chamados`                                                                                                                                                                                                                      |
| `goalTargetLabel(evaluation)`                                                                                                                                          | como no Figma: `Meta ≥ 90%` (SLA, aceite), `Meta ≤ 8h` (TMA), `Limite ≤ 10h` (horas em atraso), `Limite ≤ 40 chamados` (backlog). Prefixo em `GOAL_TARGET_PREFIXES` (por indicador), símbolo em `GOAL_DIRECTION_SYMBOLS` (`min` → `≥`, `max` → `≤`)                                                                                                                     |
| `PERSON_GOAL_MET_DESCRIPTION` / `TEAM_GOAL_MET_DESCRIPTION`                                                                                                            | `Você está aderente nas metas individuais do mês: SLA, TMA e horas em atraso.` / `O time está aderente nos cinco indicadores do mês.`                                                                                                                                                                                                                                   |
| `goalShortfallSentence(evaluation: MeasuredGoalEvaluation)`                                                                                                            | uma frase por indicador não aderente: `SLA de 80%: 10 p.p. abaixo da meta de 90%.`, `TMA de 9h 20min: 1h 20min acima do limite de 8h.`, `12h em atraso no mês: 2h acima do limite de 10h.` (rodada 2: era `12h em atraso: …`), `Backlog de 52 chamados: 12 chamados acima do limite de 40 chamados.`, `Aceite de transferências de 60%: 20 p.p. abaixo da meta de 80%.` |
| `personGoalSummaryDescription(result)` / `teamGoalSummaryDescription(result)`                                                                                          | descrição do resumo do topo. Cumprida → `*_GOAL_MET_DESCRIPTION`; não cumprida → as frases de `goalShortfallSentence` dos não aderentes, na ordem de exibição, separadas por espaço. `no_data` não gera frase                                                                                                                                                           |
| `goalMetCountDescription(n, m)` / `GOAL_MET_COUNT_RULE_DESCRIPTION`                                                                                                    | `3 de 5 pessoas cumpriram as três metas individuais (SLA, TMA e horas em atraso).`; `1 de 1 pessoa cumpriu …`. `m = 0` → a regra: `Cumpre a meta quem está aderente nas três metas individuais: SLA, TMA e horas em atraso.`                                                                                                                                            |
| `goalSupportLine(evaluation)`                                                                                                                                          | percent: `3 p.p. acima da meta` / `Faltam 3 p.p.` / `Na meta`. Duração: `1h 20min acima do limite` / `Folga de 6h` / `No limite`. Contagem: `2 chamados acima do limite` / `Folga de 4 chamados` / `No limite`. Sem dados: `Nenhum chamado resolvido no mês` (SLA, TMA) ou `Nenhuma transferência revisada no mês`                                                      |
| `goalGaugeMaxFor(evaluation)` / `goalGaugeFor(evaluation)`                                                                                                             | escala: percent 0–100; duração 0–`max(2 × meta, 4h)`; contagem 0–`max(2 × meta, 4)`. `fillPercent` e `targetPercent` em 0–100 (posição na escala, com clamp). Sem dados: `fillPercent = 0`                                                                                                                                                                              |
| `DEPARTMENT_GOALS_FIELD_COPY`                                                                                                                                          | rótulo, descrição e unidade de cada campo do diálogo. Rodada 2: descrição de `overdueHoursLimit` = `Soma máxima das horas em atraso no mês, incluindo chamados já resolvidos.`                                                                                                                                                                                          |
| `PERSON_AND_TEAM_GOAL_FIELDS` / `TEAM_ONLY_GOAL_FIELDS`                                                                                                                | campos de cada grupo, na ordem                                                                                                                                                                                                                                                                                                                                          |
| `PERSON_AND_TEAM_GOALS_GROUP_LABEL` / `TEAM_ONLY_GOALS_GROUP_LABEL`                                                                                                    | `Metas de cada pessoa e do time` / `Metas só do time`                                                                                                                                                                                                                                                                                                                   |
| `EDIT_DEPARTMENT_GOALS_LABEL`, `DEFINE_DEPARTMENT_GOALS_LABEL`, `SAVE_DEPARTMENT_GOALS_LABEL`, `SAVE_DEPARTMENT_GOALS_PENDING_LABEL`, `DEPARTMENT_GOALS_SAVED_MESSAGE` | `Editar metas`, `Definir metas`, `Salvar metas`, `Salvando…`, `Metas salvas.`                                                                                                                                                                                                                                                                                           |
| `goalsLastChangeLabel(record)`                                                                                                                                         | `Última alteração por Ana em 10/11/2026 às 14:32.` (sem autor: `Última alteração em …`)                                                                                                                                                                                                                                                                                 |

Conferido com `tsx` (2026-11-11): meta SLA 90 / TMA 8h / atraso 4h; pessoa com
9 de 10 no prazo e média 9h19 → SLA `Aderente` `Na meta`, TMA `Não aderente`
`1h 19min acima do limite`, atraso `0h` `Folga de 4h`, resumo
`Meta não cumprida · não aderente em TMA`. Time sem resolvidos e 5h de atraso →
SLA/TMA/Aceite `Sem dados`, resumo `… não aderente em horas em atraso`; membros
(sem dados; 1 de 2 no prazo) → `1 de 2 cumpriu`. `2026-11-01T02:30Z` →
mês de **outubro** (23h30 em SP).

## `df-data` — o que criar

### `app/_lib/data/department-goals.ts` (novo)

```ts
export async function findDepartmentGoals(
  departmentId: number,
): Promise<DepartmentGoalsRecord | null>
export async function upsertDepartmentGoals(
  departmentId: number,
  goals: DepartmentGoals,
  actorId: number,
): Promise<void>
export async function findPersonGoalFacts(
  departmentId: number,
  userId: number,
  month: DateRange,
  now: Date,
): Promise<PersonGoalFacts>
export async function findTeamGoalFacts(
  departmentId: number,
  month: DateRange,
  now: Date,
): Promise<TeamGoalFacts>
export async function findTeamProduction(
  departmentId: number,
  range: DateRange,
): Promise<TeamProductionEntry[]>
```

- **`findDepartmentGoals`**: `department_goal` `left join users on updated_by`;
  `updatedByName = users.name` ou `null`.
- **`upsertDepartmentGoals`**: `insert … on conflict (department_id) do update
set` os cinco limites, `updated_by = actorId`, `updated_at = now()`.
  `created_at` não muda no update. Nunca apaga.
- **`findPersonGoalFacts`** — uma consulta em `ticket`, `where
current_department_id = $dep and assigned_to = $user`:

  ```sql
  count(*) filter (where <resolvedInMonth>)::int                                        as resolved_count,
  count(*) filter (where <resolvedInMonth> and t.resolved_at <= <ticketDueAtSql>)::int  as sla_met_count,
  avg(extract(epoch from (t.resolved_at - t.created_at)) * 1000)
    filter (where <resolvedInMonth>)                                                     as average_resolution_ms,
  coalesce(sum(extract(epoch from (<overdueEnd> - <overdueStart>)) * 1000)
    filter (where <overdueEligible> and <overdueEnd> > <overdueStart>), 0)::float8 as overdue_ms
  ```

  `<resolvedInMonth>` = `t.resolved_at >= month.start and t.resolved_at <
month.end and t.status in (<DASHBOARD_RESOLVED_STATUSES>)`. `<ticketDueAtSql>`
  é **a** expressão de `app/_lib/data/ticket-due.ts` (não reescrever). `avg`
  devolve `null` sem linhas; converter `numeric` → `number`.

  **Horas em atraso do mês (rodada 2, ADR 023)** — substitui a expressão antiga
  (`sum($now − due) filter (status ativo and due < $now)`):

  ```sql
  <overdueStart>    = greatest(<ticketDueAtSql>, $monthStart::timestamptz)
  <overdueEnd>      = case when t.status in (<DASHBOARD_RESOLVED_STATUSES>)
                        then t.resolved_at else $now::timestamptz end
  <overdueEligible> = (<resolvedInMonth>) or t.status in (<OVERDUE_TICKET_STATUSES>)
  ```

  `$monthStart` = `month.start`, `$now` = `now` (o mesmo instante de
  `month.end`). Resolvido/fechado fora do mês e cancelado não passam em
  `<overdueEligible>`; ativo não vencido, vencido só depois de agora e resolvido
  no prazo caem em `<overdueEnd> > <overdueStart>`. Em Drizzle: trocar o
  `overdueMs` de `goalFactColumns(month, now)` por essa soma (um helper privado
  no próprio arquivo, por exemplo `monthOverdueMsSql(month, now)`), com
  `ticketDueAtSql`, `DASHBOARD_RESOLVED_STATUSES` e `OVERDUE_TICKET_STATUSES`
  importados como hoje. Assinaturas, nomes de coluna (`overdue_ms`) e o
  `coalesce(…, 0)::float8` dos membros ficam iguais; o time e cada pessoa (subquery
  `goal_facts`, `group by assigned_to`) herdam a regra por usarem a mesma
  `goalFactColumns`.

- **`findTeamGoalFacts`** — três leituras em `Promise.all`:
  1. o mesmo agregado acima **sem** o filtro de `assigned_to`, mais
     `count(*) filter (where t.status in (<BACKLOG_TICKET_STATUSES>))::int as backlog_count`;
  2. `ticket_transfer` com `to_department_id = $dep and reviewed_at >=
month.start and reviewed_at < month.end`: `count filter (status =
'aprovado')` e `count filter (status = 'rejeitado')`;
  3. membros: `users` ativos do setor (`department_id = $dep and is_active`)
     `left join` (agregado da consulta 1 por `assigned_to`, com o mesmo `where
current_department_id = $dep`, `group by assigned_to`). Membro sem linha →
     `resolvedCount 0, slaMetCount 0, averageResolutionMs null, overdueMs 0`.
     Ordem `lower(name), id`.
- **`findTeamProduction`** — `users` ativos do setor `left join ticket on
assigned_to = users.id and current_department_id = $dep and resolved_at >=
range.start and resolved_at < range.end and status in
(<DASHBOARD_RESOLVED_STATUSES>)`, `group by users.id`, `count(ticket.id)::int`
  (zero incluído). `order by count desc, lower(name) asc, users.id asc`.
- Setor do seletor e nome: **reaproveitar** `listDepartmentOptions()` (já
  existe) para o Diretor. Para o nome/disponibilidade de um setor só, criar em
  `app/_lib/data/departments.ts`:

  ```ts
  export async function findDepartmentOption(
    departmentId: number,
  ): Promise<DepartmentOption | null>
  ```

  (`id, name, isBoard, isUnassigned, isActive` de um setor). A action usa como
  `GoalTargetDepartment`; a página usa para o nome no subtítulo.

## `df-actions` — o que criar

### `app/_lib/actions/department-goals.ts` (novo)

```ts
export type DepartmentGoalsErrorCode =
  "INVALID_INPUT" | "FORBIDDEN" | "NOT_FOUND"
export interface DepartmentGoalsActionSuccess {
  ok: true
  message: string
}
export interface DepartmentGoalsActionFailure {
  ok: false
  message: string
  code?: DepartmentGoalsErrorCode
}
export type DepartmentGoalsActionResult =
  DepartmentGoalsActionSuccess | DepartmentGoalsActionFailure

export const saveDepartmentGoals: (
  input: SaveDepartmentGoalsInput,
) => Promise<DepartmentGoalsActionResult>
```

Ordem (padrão de `actions/departments.ts`):

1. `requireSession()` / `getSession()` para o `actor.id`; `getRegistryAccess()`
   (fresco, ADR 011). `access.kind === "none"` → `FORBIDDEN`.
2. `saveDepartmentGoalsSchema.safeParse(input)`; falha → `INVALID_INPUT` com a
   primeira mensagem.
3. Admin de setor com `departmentId !== access.departmentId` → `FORBIDDEN`
   **antes** de ler o setor (não revela se o id existe).
4. `findDepartmentOption(departmentId)`; `null` → `NOT_FOUND`
   (`Setor não encontrado.`).
5. `!canEditDepartmentGoals(access, target)` → `FORBIDDEN` (cobre setor inativo
   e Não alocado, também para o Diretor).
6. `upsertDepartmentGoals(departmentId, goals, actor.id)`; erro inesperado →
   `console.error("[saveDepartmentGoals]", error)` e falha sem código
   (`Não foi possível salvar as metas agora. Tente novamente.`).
7. `revalidatePath(OPERATIONS_PATH)`; sucesso com
   `DEPARTMENT_GOALS_SAVED_MESSAGE`.

Mensagem de `FORBIDDEN`: `Você não tem permissão para editar as metas deste
setor.`

Sem e-mail, sem histórico, sem revalidar o layout (o menu não depende de meta).

## `df-auth` e `df-email`

Nada. A guarda da página é `requireSession()` + `getAccountFacts()` (existentes);
`getRegistryAccess()` já existe.

## `df-ui` — o que montar

### Navegação

`app/(app)/_components/app-nav.tsx`: novo `NavItem` com `OPERATIONS_PATH`,
`OPERATIONS_LABEL` e o ícone `MonitorIcon` do `lucide-react`, sempre
visível, logo abaixo de Início (antes de Meus chamados). Conferir
`mobile-nav.tsx` (o mesmo item, na mesma posição).

### Textos do domínio (substituem as constantes locais do `df-ui`)

| Componente                              | Hoje (local)                                                               | Trocar por                                                                                                         |
| --------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `operations-header.tsx`                 | `TAB_CONTEXT[location.tab]`                                                | `operationsTabContext(location.tab, now)` — o cabeçalho passa a receber `now: Date` da página                      |
| `my-goal-panel.tsx`                     | `MET_DESCRIPTION` / `NOT_MET_DESCRIPTION`                                  | `personGoalSummaryDescription(result)`                                                                             |
| `team-goal-panel.tsx`                   | `MET_DESCRIPTION` / `NOT_MET_DESCRIPTION`                                  | `teamGoalSummaryDescription(result)`                                                                               |
| `goal-met-count-card.tsx`               | `MET_COUNT_DESCRIPTION`                                                    | `goalMetCountDescription(metCount, memberCount)`                                                                   |
| `production-panel-frame.tsx`            | `PRODUCTION_TITLE`                                                         | `PRODUCTION_PANEL_TITLE`                                                                                           |
| `production-panel.tsx`                  | `peopleCountLabel`, `productionSubtitle`, "Arraste para ver as N pessoas." | `peopleCountLabel`, `productionSubtitle(entries)`, `productionScrollHint(entries.length)` (de `domain/operations`) |
| `production-chart.tsx`                  | `SELF_LABEL`                                                               | `PRODUCTION_SELF_LABEL`                                                                                            |
| `goal-panel-skeleton.tsx`               | `GOALS_LOADING_LABEL` local                                                | `GOALS_LOADING_LABEL` de `domain/operations`                                                                       |
| `department-goals-dialog.tsx`           | `DialogDescription` com só o nome do setor                                 | `departmentGoalsDialogDescription(departmentName)` (de `domain/department-goals`)                                  |
| `goal-gauge-card.tsx`                   | `scaleLabel` (monta uma avaliação falsa para `goalValueLabel`)             | `goalScaleLabel(evaluation.indicator, 0)` / `goalScaleLabel(evaluation.indicator, gauge.max)`                      |
| `production-chart.tsx` (região rolável) | `aria-label` igual ao `caption` da tabela                                  | `PRODUCTION_SCROLL_REGION_LABEL` (de `domain/operations`)                                                          |

Os textos de resumo e de contexto mudaram em relação aos locais (seguem o
Figma aprovado): o resumo não cumprido agora diz **quanto** falta em cada
indicador, e o contexto de Minha meta nomeia o mês.

### Rodada 2 — o que muda no `df-ui`

- **Textos**: nada a trocar. Todos já vêm do domínio
  (`operationsTabContext`, `goalShortfallSentence` via
  `*GoalSummaryDescription`, `DEPARTMENT_GOALS_FIELD_COPY`) e mudam sozinhos.
  Conferir só que nenhum texto local repete "de agora" ou "ativos vencidos".
- **Gauge com valor longo (observação 1 do QA de 2026-11-11, corrigir nesta
  rodada)**: em `goal-gauge-card.tsx` / `goal-value.tsx`, o valor
  `goalValueLabel` com 4+ dígitos e minutos (`4.456h 8min`, `81.916h 22min`)
  passa da largura do buraco do arco (144 px) e encosta no anel. Com o atraso
  acumulado, valores assim ficam comuns. O texto deve caber no arco em qualquer
  largura até `81.916h 22min` (ex.: tamanho de fonte que reduz com o
  comprimento, ou valor abaixo do arco quando não cabe), sem truncar e sem mudar
  o texto: o rótulo continua sendo o de `goalValueLabel`. Se o `df-ui` preferir
  um rótulo mais curto para o gauge (ex.: sem minutos a partir de 100h), pede o
  helper ao `df-architect` em vez de formatar localmente.

### Decisões de layout já tomadas pelo `df-ui` (registro)

- **Gauge**: meio arco de 144×80 px (`ChartContainer` com
  `initialDimension={{ width: 144, height: 80 }}`), `RadialBar` com `shape`
  próprio que desenha o `Sector` do valor e, no mesmo `<g>`, o traço da meta no
  ângulo de `targetPercent`, 4 px além do anel por dentro e por fora. Não usa
  `Customized`.
- **Avatar no topo da barra**: `UserAvatar` dentro de `foreignObject` no
  `content` do `LabelList`. Risco Safari aceito (ver Riscos); se o QA achar
  falha, a saída é SVG puro.
- **Largura do gráfico de Produção**: 64 px por pessoa (barra de 40 px + folga),
  como `minWidth` de um contêiner interno com `overflow-x-auto`; a página nunca
  rola na horizontal.
- **Aviso de arrastar**: `productionScrollHint` só abaixo de `sm` e só com mais
  de 5 pessoas; `aria-hidden` (é instrução visual, a tabela `sr-only` cobre o
  leitor de tela).
- **Abas**: links (`next/link`) dentro de `<nav>` rotulado
  `OPERATIONS_TAB_GROUP_LABEL`, com `aria-current="page"` na ativa.
- **Produção acessível**: gráfico `aria-hidden`; tabela `sr-only` com
  `productionEntryLabel` por pessoa e `caption` `PRODUCTION_CARD_LABEL`.

### Rota `app/(app)/operations/page.tsx`

1. `requireSession()`, `getAccountFacts()` (`notFound()` se nulo).
   `!hasOperations(facts)` → `h1` "Operação" + `TicketListEmptyState` com
   `OPERATIONS_UNASSIGNED_MESSAGE` (como `queue/page.tsx`).
2. `viewer: TicketViewerFacts`; `now = new Date()`;
   `parseOperationsParams(raw, todayKey(now))`; opções do Diretor
   (`operationsDepartmentOptions(viewer, await listDepartmentOptions())`);
   localização aplicada com `applicableOperationsDepartmentId`;
   `operationsCanonicalHref(raw, location)` → `redirect` se não nulo.
3. `departmentId = usesOperationsDepartment(tab) ? operationsDepartmentIdFor(viewer, location.departmentId) : viewer.departmentId`.
4. Lê só o que a aba ativa precisa:
   - **Minha meta**: `findDepartmentGoals(viewer.departmentId)` e, se houver
     meta, `findPersonGoalFacts(viewer.departmentId, actor.id, monthToDateRange(now), now)` → `personGoalResultFor`.
   - **Time**: `findDepartmentGoals(departmentId)` e, se houver,
     `findTeamGoalFacts(departmentId, month, now)` → `teamGoalResultFor`.
   - **Produção**: `findTeamProduction(departmentId, resolvePeriodRange(location.period, now))`.
     Produção não depende de meta.
5. `canEdit = canEditDepartmentGoals(await getRegistryAccess(), target)`, com
   `target` de `findDepartmentOption(departmentId)`.
6. Cabeçalho: `h1` "Operação"; subtítulo `operationsSubtitle(nome, meta, now)`
   nas abas de meta; em Produção, `formatRangeLabel(range)` como no Início.
   Abas (`role="radiogroup"` não serve, pois cada opção é link): grupo de links
   com `aria-current="page"` na ativa, rotulado `OPERATIONS_TAB_GROUP_LABEL`,
   visual da pílula do `DashboardViewModeSwitch`. Hrefs por
   `operationsTabHref`. Botão "Editar metas" (`canEdit` e meta existente) no
   cabeçalho das abas de meta.
7. Seletor de setor (só Diretor, só em Time e Produção) no padrão do
   `QueueListFilters`, com `operationsHref({ ...location, departmentId: operationsDepartmentParamFor(viewer, id) })`.
   `PeriodFilter` com `presets={OPERATIONS_PERIOD_PRESETS}` só em Produção,
   mantendo `aba` e `setor` (`operationsKeepParams`).

### Abas de meta

- Sem meta: estado vazio com `goalsUndefinedCopy(canEdit)`; com `canEdit`,
  botão `DEFINE_DEPARTMENT_GOALS_LABEL` que abre o mesmo diálogo vazio.
- Com meta: um card por indicador (Minha meta: 3; Time: 5) com título
  `GOAL_INDICATOR_LABELS`, gauge, `goalValueLabel`, selo
  `GOAL_ADHERENCE_LABELS[adherence]` (tons por token: aderente =
  `--status-resolvido` ou equivalente; não aderente = `--destructive`; sem dados
  = neutro), `goalTargetLabel` e `goalSupportLine`. Resumo no topo com
  `goalSummaryLabel`. Time: card extra com `goalMetCountLabel`.
- **Gauge**: `"use client"`, Recharts `RadialBarChart` dentro do
  `ChartContainer`, meio arco ou arco completo (decisão de layout do `df-ui`),
  `PolarAngleAxis type="number" domain={[0, 100]}` e o dado
  `goalGaugeFor(evaluation).fillPercent`; marcador da meta em
  `targetPercent` (ex.: um traço por `Customized`/forma própria, calculado a
  partir do ângulo). Confirmar a API do `RadialBar` no `context7` para
  `recharts@3.8`. Cor só por token. Texto do valor fora do SVG ou com
  `aria-hidden` no SVG e o valor em texto acessível.

### Aba Produção

- `"use client"`, `BarChart` vertical dentro do `ChartContainer`, uma barra por
  `TeamProductionEntry`, na ordem recebida. Avatar `UserAvatar size="sm"`
  (`getInitials(name)`, `image`) no topo de cada barra via `LabelList` com
  `content` customizado (um `foreignObject` ou `<image>`/`<text>` SVG; o
  `df-ui` escolhe).
- **Rolagem horizontal**: com muitas pessoas, o gráfico ganha largura mínima
  `pessoas × (34px do avatar sm + folga)`; o contêiner rola na horizontal em vez
  de espremer a barra. Constante de layout no próprio componente.
- `productionEmptyCopy(entries)` não nulo → estado vazio no lugar do gráfico.
- Tabela `sr-only` com `productionEntryLabel` (mesmo padrão do Abertos ×
  resolvidos).

### Diálogo "Editar metas"

No padrão de `app/(app)/registry/departments/_components/department-edit-dialog.tsx`:
`useForm` com `zodResolver(departmentGoalsSchema)`, `FormSchemaProvider` com o
mesmo schema, `FormField` em cada campo, unidade como sufixo
(`DEPARTMENT_GOALS_FIELD_COPY[campo].unit`), descrição abaixo
(`.description`). Dois grupos, com `PERSON_AND_TEAM_GOALS_GROUP_LABEL` /
`TEAM_ONLY_GOALS_GROUP_LABEL` e os campos de `PERSON_AND_TEAM_GOAL_FIELDS` /
`TEAM_ONLY_GOAL_FIELDS`. Rodapé `goalsLastChangeLabel(record)` quando há meta.
Submit chama `saveDepartmentGoals({ ...values, departmentId })`; sucesso → toast
`message` e fecha; falha → toast `message` e mantém aberto.

### Estados e responsivo

- `loading.tsx`/`Suspense` com esqueleto dos cards e do gráfico (mesma altura).
- Mobile (390 px): abas, seletor e filtro quebram linha; cards em uma coluna;
  sem rolagem horizontal da página (só a do gráfico de Produção).

## Cenários para o `df-qa`

| #    | Papel                | Cenário                                                                                        | Esperado                                                                                                                                                                                                                                |
| ---- | -------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OP1  | Membro               | menu e `/operations` sem meta definida                                                         | item "Operação" visível; estado vazio com o texto do membro; sem botão de editar                                                                                                                                                        |
| OP2  | Admin                | mesma tela sem meta                                                                            | texto do editor + "Definir metas"; salvar cria a linha (`department_goal`, `updated_by` = admin)                                                                                                                                        |
| OP3  | Admin                | editar com valores fora da faixa (0, 101, vazio, 1,5)                                          | mensagens do Zod da tabela de Validação; nada grava                                                                                                                                                                                     |
| OP4  | Admin de outro setor | action forjada com `departmentId` de outro setor                                               | `FORBIDDEN`; banco inalterado                                                                                                                                                                                                           |
| OP5  | Membro               | action forjada para o próprio setor                                                            | `FORBIDDEN`                                                                                                                                                                                                                             |
| OP6  | Diretor              | action com id inexistente / do Não alocado / de setor inativo                                  | `NOT_FOUND` / `FORBIDDEN` / `FORBIDDEN`                                                                                                                                                                                                 |
| OP7  | Diretor              | `?setor=` de outro setor em Time e Produção; editar a meta dele                                | números e meta do setor escolhido; salvar grava no setor escolhido. Minha meta continua sendo a da Diretoria                                                                                                                            |
| OP8  | Membro               | `?setor=<outro>` na URL                                                                        | ignorado; redireciona para a URL canônica sem `setor`                                                                                                                                                                                   |
| OP9  | Todos                | `?aba=x`, `?periodo=x`, `?de` futuro, `?setor=abc`                                             | defaults sem erro (aba Minha meta, período Mês), URL canônica                                                                                                                                                                           |
| OP10 | Não alocado          | `/operations`                                                                                  | só a mensagem do Não alocado                                                                                                                                                                                                            |
| OP11 | Admin                | conferência numérica de Minha meta e Time com o banco (`postgres` MCP, consultas abaixo)       | SLA, TMA, horas em atraso, backlog, aceite e "N de M" iguais aos do banco                                                                                                                                                               |
| OP12 | Admin                | mês sem resolvidos                                                                             | SLA e TMA "Sem dados", não entram no "não aderente em"                                                                                                                                                                                  |
| OP13 | Admin                | Produção com 3 e com 12 pessoas ativas                                                         | uma barra por pessoa (zeros inclusive), ordem desc e empate por nome; com 12 no mobile, rolagem horizontal só no gráfico                                                                                                                |
| OP14 | Admin                | Produção num período sem resolvidos                                                            | estado vazio "Nenhum chamado resolvido no período"                                                                                                                                                                                      |
| OP15 | Todos                | temas claro e escuro                                                                           | gauges, selos e barras legíveis, cores por token                                                                                                                                                                                        |
| OP16 | Todos                | 390×844 nas três abas                                                                          | sem rolagem horizontal da página; diálogo cabe                                                                                                                                                                                          |
| OP17 | Admin                | salvar e reabrir o diálogo                                                                     | valores salvos; rodapé "Última alteração por <admin> em dd/mm/aaaa às hh:mm."; subtítulo com "definidas por <admin> em dd/mm/aaaa"                                                                                                      |
| OP18 | Admin                | rebaixado a membro com a tela aberta, depois salva                                             | `FORBIDDEN` (acesso lido fresco)                                                                                                                                                                                                        |
| OP19 | Admin                | (rodada 2) resolver um chamado atrasado do próprio setor e recarregar Minha meta e Time        | horas em atraso **não caem**: o valor fica igual ao de antes da resolução (só para de crescer); confere com a consulta abaixo                                                                                                           |
| OP20 | Admin                | (rodada 2) chamado vencido antes de 1º do mês                                                  | conta só de 1º 00:00 SP em diante: a contribuição dele na consulta é `fim − $start`, nunca `fim − due`                                                                                                                                  |
| OP21 | Admin                | (rodada 2) chamado resolvido com atraso em mês anterior; chamado cancelado                     | nenhum dos dois entra na soma                                                                                                                                                                                                           |
| OP22 | Admin                | (rodada 2) virada de mês, só por consulta (o relógio do app não muda)                          | a consulta com `$start` = 1º do mês seguinte 00:00 SP e `now()` trocado por `$start + interval '5 min'` dá 5 min por chamado ativo vencido; resolvidos do mês anterior somem                                                            |
| OP23 | Todos                | (rodada 2) gauge de horas em atraso com valor longo (`4.456h 8min` ou maior), desktop e 390 px | o texto do valor cabe no arco, sem encostar no anel e sem truncar (observação 1 de 2026-11-11)                                                                                                                                          |
| OP24 | Admin                | (rodada 2) textos                                                                              | contexto do Time `Metas do setor · backlog é de agora`; descrição do campo no diálogo `Soma máxima das horas em atraso no mês, incluindo chamados já resolvidos.`; resumo não cumprido com `… em atraso no mês: … acima do limite de …` |

OP10, OP13 (12 pessoas) e OP18 ficaram não executados na rodada 1 por falta de
conta/dado; continuam valendo se houver como rodar.

### Consultas de conferência (`postgres`, só leitura)

Trocar `$dep`, `$user`; `$start` = 1º do mês 00:00 `America/Sao_Paulo`.

```sql
-- SLA, TMA e backlog do time (remova o comentário do assigned_to para a pessoa)
with t as (
  select *, created_at + make_interval(hours => case priority
    when 'critica' then 3 when 'alta' then 6 when 'media' then 12 when 'baixa' then 24 end) as due
  from ticket where current_department_id = $dep -- and assigned_to = $user
)
select
  count(*) filter (where resolved_at >= $start and resolved_at < now() and status in ('resolvido','fechado')) as resolvidos,
  count(*) filter (where resolved_at >= $start and resolved_at < now() and status in ('resolvido','fechado') and resolved_at <= due) as no_prazo,
  avg(resolved_at - created_at) filter (where resolved_at >= $start and resolved_at < now() and status in ('resolvido','fechado')) as tma,
  count(*) filter (where status in ('aberto','em_analise','encaminhado','recusado','em_andamento')) as backlog
from t;

-- Horas em atraso do mês (rodada 2, ADR 023); mesmo recorte do bloco acima
with t as (
  select id, number, status, resolved_at,
    greatest(created_at + make_interval(hours => case priority
      when 'critica' then 3 when 'alta' then 6 when 'media' then 12 when 'baixa' then 24 end), $start) as ini,
    case when status in ('resolvido','fechado') then resolved_at else now() end as fim
  from ticket
  where current_department_id = $dep -- and assigned_to = $user
    and ((status in ('resolvido','fechado') and resolved_at >= $start and resolved_at < now())
      or status in ('aberto','em_analise','encaminhado','recusado','em_andamento'))
)
select
  coalesce(sum(fim - ini) filter (where fim > ini), interval '0') as atraso,
  round((coalesce(sum(extract(epoch from (fim - ini))) filter (where fim > ini), 0) / 3600)::numeric, 2) as atraso_horas
from t;
-- detalhe por chamado (OP19–OP21): troque o select acima por
-- select number, status, ini, fim, fim - ini as contribuicao from t where fim > ini order by contribuicao desc;

select status, count(*) from ticket_transfer
where to_department_id = $dep and reviewed_at >= $start and reviewed_at < now()
group by status;
```

(As horas por prioridade vêm de `TICKET_PRIORITY_DUE_HOURS`; os status de
backlog, de `BACKLOG_TICKET_STATUSES`. Conferir no código se mudarem.)

## Riscos

- **Recharts `RadialBar` + marcador:** não há primitivo de "linha de meta" em
  gráfico radial; o marcador é desenhado no `shape` do `RadialBar` (resolvido
  pelo `df-ui`).
- **Avatar no topo da barra:** o `df-ui` escolheu `foreignObject` (Safari tem
  histórico de bugs com HTML dentro de SVG: posição e recorte). O `df-qa` deve
  conferir no WebKit do Playwright; se falhar, a alternativa é SVG pura
  (`<image>` + `<circle>` + iniciais em `<text>`).
- **Desempenho:** horas em atraso e SLA usam `case` sobre a prioridade, sem
  índice (ADR 019). Avaliado só sobre os chamados do setor; aceitável no volume
  atual. A rodada 2 passa a somar também os resolvidos do mês, que já eram lidos
  pelo SLA na mesma varredura: sem leitura nova.
- **Gauge de horas em atraso:** com o atraso acumulado (ADR 023), valores de 4
  ou 5 dígitos de horas ficam comuns; ver "Rodada 2 — o que muda no `df-ui`".
  Observação do `df-qa` (rodada 2): em 390 px, um valor de 6 dígitos de horas
  provavelmente encosta no anel do gauge; não verificado, porque nenhum valor
  desse tamanho existe nos dados atuais.
- **Mudança de meta no meio do mês** reavalia o mês inteiro (ADR 022).
- **Limite de horas em atraso igual para pessoa e time** (decisão do usuário)
  tende a reprovar o time antes — explicado na descrição do campo.

## Checklist

- [x] `db/schema.ts` + `0024_department_goal.sql` (gerada, não aplicada) (`df-architect`)
- [x] ADR 022 (`df-architect`)
- [x] `types/operations.ts`, `validation/department-goals.ts`,
      `validation/operations.ts`, `domain/operations.ts`,
      `domain/operations-tabs.ts`, `domain/goal-indicators.ts`,
      `domain/department-goals.ts`, acréscimos em `date.ts` (`df-architect`)
- [x] `data/department-goals.ts` + `findDepartmentOption` (`df-data`)
- [x] `actions/department-goals.ts` (`df-actions`)
- [x] nav, rota, abas, gauges, produção, diálogo, estados (`df-ui`)
- [x] relatório do `df-qa` em `docs/test-reports/` —
      `2026-11-11-operations.md`: 15 de 18 passaram, 0 falhas (OP10 e OP18 não
      executados, OP13 parcial)

### Rodada 2 — horas em atraso acumuladas no mês (ADR 023)

- [x] ADR 023 e referência no ADR 022; textos do domínio
      (`DEPARTMENT_GOALS_FIELD_COPY.overdueHoursLimit.description`,
      `GOAL_NO_DATA_HINTS.overdue`, frase de `goalShortfallSentence` para
      `overdue`, `operationsTabContext("time")`); contrato (`df-architect`)
- [x] `overdueMs` de `goalFactColumns` com a expressão nova —
      `monthOverdueMsSql` em `data/department-goals.ts` (`df-data`)
- [x] gauge com valor longo cabendo no arco — `goal-value.tsx` com fonte por
      comprimento do valor (`df-ui`)
- [x] revisão do `df-reviewer`: APROVADO, sem atenções
- [x] relatório do `df-qa` (OP11 com a consulta nova, OP19–OP24) —
      `2026-11-11-operations.md`, seção Rodada 2: 6 de 7 passaram, 0 falhas
      (OP21 parcial: cancelados só na Diretoria, que não tem meta; valor de 6
      dígitos não existe nos dados)
