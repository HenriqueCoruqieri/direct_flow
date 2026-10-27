# Contrato — Prioridade na abertura e SLA por chamado

Plano: `docs/plans/ticket-priority-and-sla.md` (aprovado em 2026-10-26). As
decisões de produto estão lá e não se repetem aqui. Decisão técnica: ADR 019
(`docs/adr/019-sla-in-calendar-hours-computed-not-stored.md`).

Contratos alterados por este (cada um ganhou uma nota de revisão apontando
para cá): `ticket-creation.md`, `dashboard-overview.md`, `my-tickets.md`,
`department-queue.md`.

Versões observadas: `next@16.3.5`, `zod@4.6.5`, `drizzle-orm@0.45.2`,
`react-hook-form@7.88`, `@hookform/resolvers@5.9`.

> **Revisão de 2026-10-26 — prioridade definida pela tag**
> (`docs/contracts/tag-priority.md`, ADR 020). A prioridade do chamado passa a
> ser `resolveTicketPriority(tag.priority, escolhida)`: tag com prioridade
> impõe a dela (Select travado na abertura, valor enviado ignorado no
> servidor); tag sem prioridade mantém a escolha livre descrita aqui. A
> prioridade é resolvida e gravada uma vez, na abertura, e o SLA deste contrato
> parte dela; trocar a tag depois ou mudar a prioridade da tag no cadastro não
> altera `ticket.priority` nem o vencimento de chamados existentes. O schema
> deixa de ser "sem mudança": `tag.priority` entra pela migration
> `0019_tag_priority`.

> **Revisão de 2026-10-26 — prioridade sem pré-seleção**
> (`docs/contracts/tag-priority.md`). O Select de prioridade da abertura não
> vem mais com Média: começa vazio, com o placeholder `Nenhuma`
> (`TICKET_PRIORITY_PLACEHOLDER`), e o autor escolhe (a menos que a tag
> trave). `createTicketSchema.priority` perde o `default` e passa a ser
> obrigatória; `INITIAL_TICKET_PRIORITY` sai do domínio;
> `NewTicketFormDefaults.priority` vira `TicketPriority | undefined` e
> `buildNewTicketFormOptions` devolve `undefined`. O default `media` da coluna
> `ticket.priority` no banco continua (sem migration). Os trechos abaixo já
> estão atualizados.

---

## Tabelas, enums e migration

**Nenhuma mudança de schema. Nenhuma migration.**

- `ticket.priority` (enum `ticket_priority`: `baixa`, `media`, `alta`,
  `critica`), `ticket.created_at`, `ticket.resolved_at`, `ticket.status`.
- `ticket_history.to_priority` no evento `criacao`.
- `ticket.due_at` continua **sem gravação e sem leitura**: o vencimento é
  calculado (ADR 019).

## Domínio — `app/_lib/domain/ticket-due.ts`

```ts
export const TICKET_PRIORITY_DUE_HOURS = {
  critica: 3,
  alta: 6,
  media: 12,
  baixa: 24,
} satisfies Record<TicketPriority, number>

export const ticketDueWindowMs: (priority: TicketPriority) => number
export const ticketDueAt: (facts: TicketDueFacts) => Date
export const isTicketOverdue: (facts: TicketDueFacts, now: Date) => boolean

export const TICKET_SLA_LABEL = "SLA"
export const TICKET_SLA_SETTLED_LABELS = {
  met: "No prazo",
  missed: "Fora do prazo",
} satisfies Record<TicketSettledSlaStatus, string>
export const TICKET_SLA_OVERDUE_LABEL = "Vencido"

export const ticketSlaFor: (facts: TicketSlaFacts, now: Date) => TicketSla
export const isTicketSlaOverdue: (sla: TicketSla) => boolean
export const isTicketSlaRunning: (sla: TicketSla) => sla is TicketRunningSla
export const describeTicketSla: (sla: TicketSla) => string
```

| Nome                        | Semântica                                                                                                                                                                                                                                                                                                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TICKET_PRIORITY_DUE_HOURS` | Prazo em horas **inteiras** e corridas (24×7) desde `createdAt`. Única fonte do prazo: nenhum literal de horas em SQL nem em UI. O card "Maiores atrasos" herda os novos valores sem mudança de código                                                                                                                                                                    |
| `ticketDueAt`               | `createdAt + prazo`. Não pausa em transferência nem em aprovação; não reinicia ao mudar de setor                                                                                                                                                                                                                                                                          |
| `isTicketOverdue`           | `dueAt < now`, **estrito** (como antes; o SQL usa o mesmo `<`)                                                                                                                                                                                                                                                                                                            |
| `ticketSlaFor`              | Status **ativo** (`isActiveTicketStatus`: tudo menos `resolvido`, `fechado`, `cancelado`; `aguardando_aprovacao` conta como ativo) → `on_time` ou `overdue` (`dueAt < now`). Não ativo com `resolvedAt` → `met` ou `missed` (`dueAt < resolvedAt` é `missed`; no instante exato, `met`). Não ativo sem `resolvedAt` (cancelado direto, ou dado inconsistente) → `neutral` |
| `isTicketSlaOverdue`        | `true` só para `overdue`. É a **única** condição do vermelho. `missed` não fica vermelho (o chamado já saiu da fila; o texto "Fora do prazo" basta)                                                                                                                                                                                                                       |
| `isTicketSlaRunning`        | Type guard: `true` para `on_time` e `overdue` (SLA correndo), estreitando para `TicketRunningSla`. Única fonte da regra "está correndo": `describeTicketSla` usa este helper, e a UI também, em vez de comparar `status` à mão                                                                                                                                            |
| `describeTicketSla`         | `isTicketSlaRunning` (`on_time`/`overdue`) → `formatDateTime(dueAt)` (`18/09/2026 14:32`); `met`/`missed` → `TICKET_SLA_SETTLED_LABELS`; `neutral` → `EMPTY_VALUE_LABEL` (`—`)                                                                                                                                                                                            |
| `TICKET_SLA_OVERDUE_LABEL`  | Texto acessível que acompanha o vermelho (a cor sozinha não informa): `sr-only` ou `title`, a critério do `df-ui`                                                                                                                                                                                                                                                         |
| `TICKET_SLA_LABEL`          | Cabeçalho da coluna e rótulo do campo no card Detalhes                                                                                                                                                                                                                                                                                                                    |

### Revisão 2026-10-26 — célula SLA das tabelas em tempo restante

```ts
export const TICKET_SLA_RUNNING_LABELS = {
  on_time: "Expira em",
  overdue: "Expirado",
} satisfies Record<TicketRunningSlaStatus, string>

export const describeTicketSlaCell: (sla: TicketSla, now: Date) => TicketSlaCell
```

| Nome                        | Semântica                                                                                                                                                                                                                                                                                                                                   |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `describeTicketSlaCell`     | Texto da célula SLA das **tabelas** (`/tickets`, `/queue`). `on_time` → `{ label: "Expira em", value: formatTimeUntil(dueAt, now) }` (ex. `55min`); `overdue` → `{ label: "Expirado", value: ... }` com sinal (ex. `-6min`); `met`/`missed`/`neutral` → `{ label: null, value: describeTicketSla(sla) }` (`No prazo`, `Fora do prazo`, `—`) |
| `TICKET_SLA_RUNNING_LABELS` | Rótulo da primeira linha da célula quando o SLA está correndo                                                                                                                                                                                                                                                                               |

- O card Detalhes de `/tickets/[id]` **não muda**: continua com
  `describeTicketSla` (data/hora do vencimento) e `TICKET_SLA_OVERDUE_LABEL`
  acessível.
- Na tabela, o vermelho continua sendo só `isTicketSlaOverdue(sla)` e vale
  para as duas linhas ou só para o valor, a critério do `df-ui`. O rótulo
  visível "Expirado" já informa sem depender da cor, então o
  `TICKET_SLA_OVERDUE_LABEL` em `sr-only` deixa de ser necessário na tabela.
- `label === null` → a célula tem uma linha só (`value`).
- Em `on_time`/`overdue` a célula pode manter `<time dateTime={toISO(sla.dueAt)}>`
  e usar `formatDateTime(sla.dueAt)` como `title`, a critério do `df-ui`.
- **Texto estático.** O tempo restante é calculado com o `now` da página
  (Server Component) e **só se atualiza quando a página recarrega**. Nada de
  `new Date()` nem de timer no componente cliente (hidratação). Um chamado
  com `Expira em 2min` passa a `Expirado -1min` só no próximo carregamento.

Formatação (`app/_lib/date.ts`):

```ts
export const formatSignedDuration: (durationMs: number) => string
export const formatTimeUntil: (value: DateInput, now: DateInput) => string
```

- `formatSignedDuration`: formato compacto de `formatDuration` sobre o valor
  absoluto (`55min`, `2h 10min`, `1d 3h`), com `-` (hífen) à frente quando
  negativo. Abaixo de 1 minuto em valor absoluto: `<1min` (positivo ou zero) e
  `-<1min` (negativo). Minutos truncados, nunca arredondados para cima.
- `formatTimeUntil(value, now)`: `formatSignedDuration(value − now)`. `now` é
  **obrigatório** (sem default) para forçar o `now` da página. O sinal bate com
  o status: `dueAt < now` (estrito) ⇔ negativo ⇔ `overdue`; no instante exato,
  `<1min` e `on_time`.
- `formatDuration` e `durationParts` não mudam (o card do dashboard continua
  com `< 1min`).

### Coluna Prioridade nas tabelas

- `/tickets` e `/queue` ganham a coluna "Prioridade" **entre "Aberto em" e
  "SLA"**: cabeçalho `TICKET_PRIORITY_FIELD_LABEL`, valor
  `TICKET_PRIORITY_LABELS[row.priority]`. As linhas já trazem `priority`
  (`MyTicketListItem`, `DepartmentQueueListItem`); sem mudança em `df-data`.
- Mesmo cuidado da coluna SLA: Aprovações (`ApprovalListItem` sem `priority`)
  fica sem a coluna e compila.
- Sem filtro nem ordenação nova.

`app/_lib/domain/ticket.ts`:

```ts
export const TICKET_PRIORITY_FIELD_LABEL = "Prioridade"
export const TICKET_PRIORITY_PLACEHOLDER = "Nenhuma"
```

- `TICKET_PRIORITY_FIELD_LABEL`: rótulo do Select no formulário de abertura e
  do campo no card Detalhes. `OVERDUE_COLUMN_LABELS.priority` passou a usá-lo.
- `TICKET_PRIORITY_PLACEHOLDER`: placeholder do Select vazio. Não é opção nem
  valor: não vira `SelectItem` e não passa na validação.
- `INITIAL_TICKET_PRIORITY` foi removido (revisão de 2026-10-26).
  `buildNewTicketFormOptions` devolve `defaults.priority = undefined`.
- Ordem das opções do Select: `TICKET_PRIORITIES` (Baixa, Média, Alta,
  Crítica); rótulos de `TICKET_PRIORITY_LABELS`.

`app/_lib/domain/dashboard.ts`:

```ts
export const ticketCountLabel: (count: number) => string
export const backlogValueLabel: (overview: DashboardOverview) => string
export const backlogHint: (overview: DashboardOverview) => string
```

- `ticketCountLabel(count)`: `1 chamado`, senão `N chamados` (`0 chamados`).
  Já existia (privado, usado por `topTagVolumeHint`); agora exportado.
- `backlogValueLabel(overview)`: **valor** do card Backlog —
  `ticketCountLabel(max(overdueBacklogCount, 0))`. Ex.: `4 chamados`,
  `1 chamado`, `0 chamados` (sem backlog ou com backlog sem atrasados).
- `backlogHint(overview)`: **linha de apoio** — `backlogCount > 0` →
  `formatTotalHours(backlogAgeMs)` + ` em backlog` (ex. `36h em backlog`);
  `backlogCount = 0` → `EMPTY_BACKLOG_HINT`. O antigo sufixo ` · N em atraso`
  saiu (a contagem de atrasados virou o valor).
- **Saíram**: `ILLUSTRATIVE_HANDLING_TIME_MS`, `illustrativeBacklogMs`,
  `backlogHoursHint`. Continuam: `ILLUSTRATIVE_LABEL`,
  `ILLUSTRATIVE_DESCRIPTION`, `ILLUSTRATIVE_FIRST_RESPONSE_MS`,
  `firstResponseHint` (card Tempo médio).

## Tipos — `app/_lib/types/`

`ticket-due.ts`:

```ts
export interface TicketDueFacts {
  createdAt: Date
  priority: TicketPriority
}

export interface TicketSlaFacts extends TicketDueFacts {
  status: TicketStatus
  resolvedAt: Date | null
}

export type TicketRunningSlaStatus = "on_time" | "overdue"
export type TicketSettledSlaStatus = "met" | "missed"

export interface TicketRunningSla {
  status: TicketRunningSlaStatus
  dueAt: Date
}

export interface TicketSettledSla {
  status: TicketSettledSlaStatus
  dueAt: Date
  resolvedAt: Date
}

export interface TicketNeutralSla {
  status: "neutral"
  dueAt: Date
}

export type TicketSla = TicketRunningSla | TicketSettledSla | TicketNeutralSla
export type TicketSlaStatus = TicketSla["status"]

export interface TicketSlaCell {
  label: string | null
  value: string
}
```

`TicketDetail`, `MyTicketListItem` e `DepartmentQueueListItem` satisfazem
`TicketSlaFacts` estruturalmente.

`ticket.ts`:

- `InsertTicketValues` ganha `priority: TicketPriority` (obrigatório).
- `NewTicketFormDefaults` ganha `priority: TicketPriority | undefined`
  (`undefined` = Select vazio).

`my-tickets.ts` — `MyTicketListItem` ganha `priority: TicketPriority` e
`resolvedAt: Date | null`.

`department-queue.ts` — `DepartmentQueueListItem` ganha `priority:
TicketPriority` e `resolvedAt: Date | null`.

`dashboard.ts` — `DashboardOverview` ganha:

| Campo                 | Definição                                                                                                                               |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `backlogAgeMs`        | Soma, em ms, de `now − created_at` dos chamados do backlog do setor (mesmo filtro de `backlogCount`). Cada parcela ≥ 0. `0` sem backlog |
| `overdueBacklogCount` | Chamados do backlog do setor com `vencimento < now` (mesma expressão e mesmo `<` de `listOverdueTickets`). Sempre `≤ backlogCount`      |

Os dois **não dependem do período**, como `backlogCount`.

## Validação — `app/_lib/validation/ticket.ts`

```ts
export const ticketPrioritySchema = z.enum(TICKET_PRIORITIES, {
  error: "Selecione a prioridade do chamado.",
})

export const createTicketSchema = ticketFieldsSchema.extend({
  priority: ticketPrioritySchema.optional().pipe(ticketPrioritySchema),
  attachments: uploadedAttachmentsSchema.optional(),
})

export type CreateTicketInput = z.infer<typeof createTicketSchema>
export type CreateTicketFormValues = z.input<typeof createTicketSchema>
```

- `priority` entra **só** em `createTicketSchema`. `editTicketSchema` não muda
  (sem edição de prioridade depois da abertura).
- `priority` é **obrigatória**, sem default. O `.optional().pipe(...)` só
  existe para o tipo de entrada: `CreateTicketFormValues["priority"]` é
  `TicketPriority | undefined` (o form começa vazio) e
  `CreateTicketInput["priority"]` é `TicketPriority`. Em tempo de execução,
  ausente ou `undefined` falha no `pipe` com `Selecione a prioridade do
chamado.` (path `priority`), igual a um valor fora do enum. A action não
  muda: `safeParse` já devolve o erro de campo.
- A entrada e a saída do schema divergem (`priority` opcional na entrada,
  obrigatória na saída). Por isso o tipo novo
  `CreateTicketFormValues`: o formulário usa
  `useForm<CreateTicketFormValues, unknown, CreateTicketInput>`, e o
  `handleSubmit` entrega `CreateTicketInput` (com `priority`). Sem isso o
  `zodResolver` não fecha o tipo (`new-ticket-dialog.tsx:64` e `:129` quebram
  hoje).

## `df-data` — o que criar e mudar

### Helper único de vencimento — `app/_lib/data/ticket-due.ts` (novo)

```ts
export const ticketDueAtSql: SQL<Date>
```

A expressão `ticket.created_at + make_interval(hours => case ticket.priority
when ... end)`, montada percorrendo `TICKET_PRIORITIES` com
`TICKET_PRIORITY_DUE_HOURS` (o mesmo `case` que hoje vive dentro de
`listOverdueTickets`, extraído sem mudar). É a **única** expressão de
vencimento em SQL do projeto: `listOverdueTickets` e `findDashboardOverview`
importam daqui; nenhum outro arquivo monta o `case`. A comparação de atraso é
sempre `sql\`${ticketDueAtSql} < ${now}\``.

### `app/_lib/data/dashboard.ts`

```ts
export async function findDashboardOverview(
  departmentId: number,
  range: DateRange,
  now: Date,
): Promise<DashboardOverview>
```

- Ganha `now` (o mesmo `new Date()` da página, que já é passado a
  `listOverdueTickets`).
- `backlogAgeMs` e `overdueBacklogCount` saem da **mesma** consulta que já
  calcula `backlogCount` (a de `from ticket where current_department_id =
$departmentId`), como colunas agregadas a mais, sem nova ida ao banco:

```sql
coalesce(sum(extract(epoch from greatest($now::timestamptz - t.created_at, interval '0')) * 1000)
  filter (where t.status in (:BACKLOG_TICKET_STATUSES)), 0) as backlog_age_ms,
(count(*) filter (where t.status in (:BACKLOG_TICKET_STATUSES)
  and (:ticketDueAtSql) < $now))::int as overdue_backlog_count
```

- `backlog_age_ms` vem como `numeric` (string): `Number(...)`; sem linha → `0`.
- O filtro de backlog é o mesmo `isBacklogStatus` já usado em `backlogCount`.
- `listOverdueTickets` passa a usar `ticketDueAtSql` no `where` e no `order
by`; o resto não muda. `dueAt` de cada linha continua vindo de `ticketDueAt`
  do domínio.

### `app/_lib/data/tickets.ts` — `insertTicket`

- `insert into ticket`: `priority: values.priority` (no lugar de
  `INITIAL_TICKET_PRIORITY`).
- `insert into ticket_history` (`criacao`): `toPriority: values.priority`.
- O import de `INITIAL_TICKET_PRIORITY` sai se ficar sem uso.

### Listas

- `listMyTickets` (`app/_lib/data/my-tickets.ts`) e `listQueueTickets`
  (`app/_lib/data/department-queue.ts`) passam a selecionar `priority:
ticket.priority` e `resolvedAt: ticket.resolved_at`. Filtros, ordenação e
  contagens não mudam.

## `df-actions` — o que mudar

`createTicket` (`app/_lib/actions/tickets.ts`): repassa
`priority: parsed.data.priority` a `insertTicket`. Entrada continua
`CreateTicketInput` (validada por `createTicketSchema.safeParse`); retorno e
códigos de erro não mudam. Sem nova revalidação.

## `df-ui` — o que mudar

### `now`

Toda tela que mostra SLA usa o **mesmo `now` da página** (Server Component),
passado por props até o componente cliente. Nunca `new Date()` dentro de
componente `"use client"` (diverge entre servidor e cliente e quebra a
hidratação). `/tickets`, `/queue`, `/tickets/[id]` e `/dashboard` já criam
`now` na página.

### Coluna SLA — `app/(app)/_components/ticket-list-columns.tsx`

- Coluna `sla`, cabeçalho `TICKET_SLA_LABEL`, **logo após "Aberto em"** em
  `/tickets` (`my-tickets-table.tsx`) e `/queue`
  (`department-queue-table.tsx`).
- Célula: `const sla = ticketSlaFor(row, now)`; texto `describeTicketSla(sla)`;
  `tabular-nums`, `whitespace-nowrap`. `isTicketSlaOverdue(sla)` →
  `text-destructive` (token do tema, funciona no escuro) mais
  `TICKET_SLA_OVERDUE_LABEL` acessível; senão `text-muted-foreground`, como
  "Aberto em". Em `on_time`/`overdue`, `<time dateTime={toISO(sla.dueAt)}>`.
- `approvals-table.tsx` também usa `createTicketListColumns` e
  `ApprovalListItem` **não** tem `priority` nem `resolvedAt` (a tela de
  Aprovações está fora do escopo). Portanto o `TicketListRow` genérico não
  ganha os campos: a coluna SLA nasce num construtor à parte no mesmo arquivo,
  restrito a linhas com `TicketSlaFacts` (ex.: `interface TicketSlaListRow
extends TicketListRow, TicketSlaFacts` em `ticket-list-row.ts` e
  `createTicketSlaColumn<TRow extends TicketSlaListRow>(now: Date)`), montado
  dentro do componente da tabela com `useMemo` sobre `now`. A forma exata é do
  `df-ui`; o requisito é Aprovações compilar sem a coluna.
- Sem filtro nem ordenação nova nesta coluna.

### Detalhe `/tickets/[id]`

- `ticket-detail-fields.tsx` (card "Detalhes") ganha dois campos:
  `TICKET_PRIORITY_FIELD_LABEL` → `TICKET_PRIORITY_LABELS[ticket.priority]`, e
  `TICKET_SLA_LABEL` → mesma célula da tabela (`ticketSlaFor(ticket, now)`,
  `describeTicketSla`, vermelho só em `overdue`). Posição: um grupo próprio logo
  depois de "Aberto em" (Prioridade e SLA juntos). Recebe `now` da página.
- `ticket-detail-header.tsx`: o badge "Prioridade X" sai, junto com a prop
  `priority` e `PRIORITY_DOT_CLASSES` se ficarem sem uso. `page.tsx` deixa de
  passar `priority` ao cabeçalho.

### Formulário de abertura — `app/(app)/_components/new-ticket-dialog.tsx`

- Select de prioridade (`Controller`), rótulo `TICKET_PRIORITY_FIELD_LABEL`,
  opções `TICKET_PRIORITIES` com `TICKET_PRIORITY_LABELS`, começa vazio
  (`options.defaults.priority = undefined`) com o placeholder
  `TICKET_PRIORITY_PLACEHOLDER` (`Nenhuma`). Mesmo padrão do `TicketTypeField`
  (campo próprio, ex. `ticket-priority-field.tsx`, ao lado do tipo).
- `useForm<CreateTicketFormValues, unknown, CreateTicketInput>` (ver
  Validação). O `form.reset(options.defaults)` volta a vazio (`Nenhuma`).
- Depende de `df-actions` (Onda 2) para a prioridade chegar ao banco.

### Início — card Backlog (`dashboard-overview.tsx`)

- `findDashboardOverview(departmentId, range, now)`: o componente recebe `now`
  da página.
- Título `DASHBOARD_OVERVIEW_LABELS.backlog` ("Backlog"), sem mudança.
- Valor: `backlogValueLabel(overview)` (no lugar de `overview.backlogCount`).
- Rodapé: `<StatHint text={backlogHint(overview)} />` **sem** `illustrative`,
  em qualquer caso (a função já devolve `EMPTY_BACKLOG_HINT` quando
  `backlogCount = 0`); o ternário com `EMPTY_BACKLOG_HINT` no componente pode
  sair.
- O card Tempo médio continua com `firstResponseHint()` e a marca Ilustrativo.

## Textos

| Uso                       | Texto                                           |
| ------------------------- | ----------------------------------------------- |
| Cabeçalho/rótulo SLA      | `SLA`                                           |
| Resolvido dentro do prazo | `No prazo`                                      |
| Resolvido fora do prazo   | `Fora do prazo`                                 |
| Acessível do vermelho     | `Vencido`                                       |
| Tabela, ativo no prazo    | `Expira em` / `55min` (`<1min` abaixo de 1 min) |
| Tabela, ativo vencido     | `Expirado` / `-6min` (`-<1min` abaixo de 1 min) |
| Rótulo do Select          | `Prioridade`                                    |
| Placeholder do Select     | `Nenhuma`                                       |
| Erro do Select            | `Selecione a prioridade do chamado.`            |
| Backlog, valor            | `4 chamados` · `1 chamado` · `0 chamados`       |
| Backlog, linha de apoio   | `36h em backlog` · `Nenhum chamado em backlog`  |

## Riscos (técnicos)

1. **Retroatividade** (ADR 019): todos os chamados existentes são `media` e
   passam de 24h para 12h; muitos ficam vermelhos logo após o deploy.
2. **Hidratação**: `now` criado no cliente diverge do servidor. Sempre o da
   página.
3. **Vermelho estático**: só muda ao recarregar.
4. **Horas acumuladas crescem sem parar**; o sinal é o valor do card (atrasados).

## Critério de pronto

1. Chamado aberto como Crítica: `ticket.priority = critica`,
   `ticket_history.to_priority = critica` na `criacao`; vencimento = abertura +
   3h no card Detalhes e na coluna SLA.
2. Chamado ativo vencido em vermelho (`text-destructive`) em `/tickets`,
   `/queue` e no detalhe, com texto acessível "Vencido".
3. Resolvido/fechado mostra "No prazo" ou "Fora do prazo" conforme
   `resolvedAt`; cancelado sem `resolvedAt` mostra `—`.
4. Card Backlog: valor = atrasados (`X chamados`) e linha `Xh em backlog`
   iguais à consulta abaixo, sem "Ilustrativo".
5. Aprovações sem coluna SLA, compilando.
6. `npx tsc --noEmit`, `npm run lint`, `npm run build`.

## Cenários do `df-qa`

Consulta de conferência (`BS` = backlog do setor `S`, só leitura):

```sql
select count(*) as backlog,
  floor(coalesce(sum(extract(epoch from greatest(now() - created_at, interval '0'))), 0) / 3600) as horas,
  count(*) filter (where created_at + case priority
    when 'critica' then interval '3 hours'
    when 'alta' then interval '6 hours'
    when 'media' then interval '12 hours'
    when 'baixa' then interval '24 hours' end < now()) as em_atraso
from ticket
where current_department_id = :S
  and status in ('aberto','em_analise','encaminhado','recusado','em_andamento')
```

| #    | Passo                                                                  | Esperado                                                                                                                                                                                                             |
| ---- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PS1  | Abrir "Novo chamado"                                                   | Select "Prioridade" vazio, com o placeholder `Nenhuma`; opções Baixa, Média, Alta, Crítica (sem item "Nenhuma"). Enviar sem escolher → `Selecione a prioridade do chamado.` no campo, nenhuma linha nova em `ticket` |
| PS2  | Criar como Crítica                                                     | banco: `priority = critica` e `to_priority = critica` na `criacao`; detalhe: Prioridade "Crítica", SLA = abertura + 3h (`DD/MM/AAAA HH:mm`)                                                                          |
| PS3  | Fechar e reabrir o dialog                                              | volta vazio (`Nenhuma`)                                                                                                                                                                                              |
| PS4  | Detalhe                                                                | cabeçalho sem badge de prioridade; Prioridade e SLA no card Detalhes                                                                                                                                                 |
| PS5  | `/tickets` e `/queue`                                                  | colunas "Aberto em", "Prioridade", "SLA" nessa ordem; ativo no prazo: "Expira em" + tempo restante, neutro; ativo vencido: "Expirado" + `-tempo`, em vermelho; recarregar atualiza o tempo                           |
| PS6  | Resolvido dentro e fora do prazo (conferir `resolved_at` × vencimento) | "No prazo" / "Fora do prazo", sem vermelho                                                                                                                                                                           |
| PS7  | Cancelado sem `resolved_at`                                            | `—`                                                                                                                                                                                                                  |
| PS8  | Início, card Backlog                                                   | título "Backlog"; valor `{em_atraso} chamados` (`1 chamado`); linha `{horas}h em backlog` (`backlog = 0` → `0 chamados` e `Nenhum chamado em backlog`), sem "Ilustrativo"; Tempo médio continua com "Ilustrativo"    |
| PS9  | Aprovações                                                             | sem coluna SLA, sem erro                                                                                                                                                                                             |
| PS10 | Console e dev server em todas as telas acima                           | nenhum erro nem aviso de hidratação                                                                                                                                                                                  |

## Checklist de encerramento

- [x] `TICKET_PRIORITY_DUE_HOURS`, `ticketSlaFor` e tipos do SLA, `TICKET_PRIORITY_FIELD_LABEL`, `backlogHint`, `createTicketSchema.priority`, `CreateTicketFormValues`, tipos das listas e do overview, contratos, ADR 019 (`df-architect`)
- [x] `ticketDueAtSql`, `findDashboardOverview` com `now`, `insertTicket` com prioridade, listas com `priority`/`resolvedAt` (`df-data`)
- [x] `createTicket` repassa a prioridade (`df-actions`)
- [x] coluna SLA, card Detalhes, cabeçalho sem badge, card Backlog, Select de prioridade (`df-ui`)
- [x] `npx tsc --noEmit`, `npm run lint`, `npm run build`; `df-reviewer` (aprovado com atenções)
- [ ] PS1–PS10 (`df-qa`) — não executado: o MCP `postgres` estava indisponível na sessão
