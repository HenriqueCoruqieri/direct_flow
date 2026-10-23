# Contrato — Início: visão geral do setor

Plano: `docs/plans/dashboard-overview.md` (aprovado em 2026-10-23). Contrato
anterior do Início: `docs/contracts/dashboard.md` — shell, filtro de período,
URL e validação continuam valendo como lá; os cards foram substituídos por este
documento. Fuso: ADR 009.

Versões observadas: `next@16.3.5`, `zod@4.6.5`, `dayjs@1.11.23`,
`drizzle-orm@0.45.2`.

---

## Etapa 1 — grade da página e linha 1

### O que muda e o que não muda

| Muda                                                                                              | Não muda                                                                   |
| ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `findDashboardSummary` sai; entra `findDashboardOverview`                                         | `app/_lib/validation/dashboard.ts` (parse, serialize, URL)                 |
| `DashboardSummary` e `DashboardTopTag` saem; entram `DashboardOverview` e `DashboardOverviewCard` | `PeriodFilter`, `PRESET_PERIODS`, período padrão `hoje`, título e data     |
| 2 cards → 4 cards; o "Principal ofensor" do topo sai (volta na Etapa 2, linha 2, como ranking)    | Escopo `ticket.current_department_id` = setor da sessão, Diretoria inclusa |
| Duração em `app/_lib/date.ts`; textos e ilustrativos em `app/_lib/domain/dashboard.ts`            | `DASHBOARD_PATH` (actions continuam revalidando `/dashboard`)              |

### Tabelas, enums e migration

**Nenhuma mudança de schema. Nenhuma migration.** O fluxo lê:

- `ticket` — `current_department_id`, `status`, `created_at`, `resolved_at`
- `ticket_transfer` — `to_department_id`, `status`, `reviewed_at`
- enums `ticket_status` e `approval_status`

Índices que atendem: `ticket_dept_status_idx`
(`current_department_id, status, created_at desc`), pelo prefixo; e
`transfer_inbox_idx` (`to_department_id, status, created_at desc`), pelo
prefixo `to_department_id, status`. `resolved_at` e `reviewed_at` não têm
índice e ficam como filtro sobre as linhas do setor. Nenhum índice novo: com o
volume atual não se justifica. Se o `EXPLAIN` do `df-data` mostrar problema,
reporte e o `df-architect` cria.

### Datas — `app/_lib/date.ts` (acréscimos)

```ts
export const MINUTE_MS: number
export const HOUR_MS: number

export const durationParts: (durationMs: number) => DurationPart[]
export const formatDuration: (durationMs: number) => string
export const formatTotalHours: (durationMs: number) => string
```

| Função             | Semântica                                                                                                                                                                                                                          |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `durationParts`    | Duração em ms → partes `{ value, unit }`, **truncada** em minutos. Negativo vale 0. `< 1 min` → `[{ "< 1", "min" }]`; `< 1 h` → `[min]`; `< 1 d` → `[h]` ou `[h, min]` (minuto 0 some); `≥ 1 d` → `[d]` ou `[d, h]` (minutos caem) |
| `formatDuration`   | Partes juntadas: `< 1min` · `22min` · `3h` · `3h 40min` · `1d 2h` · `2d`. Sem espaço entre número e unidade, espaço entre partes                                                                                                   |
| `formatTotalHours` | Total em horas inteiras (truncado), milhar em pt-BR: `36h`, `2.000h`. Não converte para dias                                                                                                                                       |

`durationParts` existe para a UI desenhar a unidade menor que o número (o
"min" de "3h 40min"). Ninguém monta duração à mão; texto corrido usa
`formatDuration`.

### Tipos

`app/_lib/types/duration.ts` (novo):

```ts
export type DurationUnit = "d" | "h" | "min"

export interface DurationPart {
  value: string
  unit: DurationUnit
}
```

`app/_lib/types/dashboard.ts` (substituído):

```ts
export type DashboardOverviewCard =
  "ticketCount" | "resolutionRate" | "averageResolution" | "backlog"

export interface DashboardOverview {
  ticketCount: number
  receivedTransferCount: number
  resolvedTicketCount: number
  averageResolutionMs: number | null
  backlogCount: number
}
```

| Campo                   | Definição                                                                                                                                                   |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ticketCount`           | Chamados do setor com `created_at` no período, todos os status                                                                                              |
| `receivedTransferCount` | `ticket_transfer` com `status = 'aprovado'`, `to_department_id` = setor e `reviewed_at` no período                                                          |
| `resolvedTicketCount`   | Dos chamados de `ticketCount`, os com status em `DASHBOARD_RESOLVED_STATUSES` (`resolvido`, `fechado`). Sempre `≤ ticketCount`                              |
| `averageResolutionMs`   | Média, em ms, de `resolved_at − created_at` dos chamados do setor com `resolved_at` no período e status em `DASHBOARD_RESOLVED_STATUSES`. `null` sem nenhum |
| `backlogCount`          | Chamados do setor com status em `BACKLOG_TICKET_STATUSES`. **Não depende do período**                                                                       |

`resolvedTicketCount` e `averageResolutionMs` têm coortes diferentes de
propósito: a taxa olha os chamados **abertos** no período; o tempo médio olha
os **resolvidos** no período (um chamado aberto no mês passado e resolvido
hoje entra no tempo de Hoje, não na taxa de Hoje).

### Domínio — `app/_lib/domain/dashboard.ts`

```ts
export const DASHBOARD_PATH = "/dashboard"
export const DASHBOARD_OVERVIEW_LABELS: Record<DashboardOverviewCard, string>
export const DASHBOARD_RESOLVED_STATUSES: readonly TicketStatus[]
export const BACKLOG_TICKET_STATUSES: readonly ActiveTicketStatus[]

export const NO_TICKETS_IN_PERIOD_HINT = "Nenhum chamado no período"
export const NO_RESOLUTIONS_IN_PERIOD_HINT =
  "Nenhum chamado resolvido no período"
export const EMPTY_BACKLOG_HINT = "Nenhum chamado em backlog"

export const receivedTransfersHint: (count: number) => string
export const resolutionRatePercent: (
  resolvedCount: number,
  ticketCount: number,
) => number | null
export const formatResolutionRate: (percent: number) => string

export const ILLUSTRATIVE_LABEL = "Ilustrativo"
export const ILLUSTRATIVE_DESCRIPTION =
  "Valor de exemplo: o sistema ainda não mede este dado."
export const ILLUSTRATIVE_FIRST_RESPONSE_MS: number
export const ILLUSTRATIVE_HANDLING_TIME_MS: number
export const firstResponseHint: () => string
export const illustrativeBacklogMs: (backlogCount: number) => number
export const backlogHoursHint: (backlogCount: number) => string
```

| Nome                             | Semântica                                                                                                                                                                                                        |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DASHBOARD_OVERVIEW_LABELS`      | `Chamados no período`, `Taxa de resolução`, `Tempo médio de resolução`, `Backlog`                                                                                                                                |
| `DASHBOARD_RESOLVED_STATUSES`    | `resolvido`, `fechado`                                                                                                                                                                                           |
| `BACKLOG_TICKET_STATUSES`        | `= DEPARTMENT_QUEUE_OPEN_STATUSES`: `aberto`, `em_analise`, `encaminhado`, `recusado`, `em_andamento`. Sem `aguardando_aprovacao` (justificativa no plano: ADR 016, o pendente vive em Aprovações e não na Fila) |
| `receivedTransfersHint`          | `0` → `Nenhum recebido de outros setores`; `1` → `+1 recebido de outros setores`; `N` → `+N recebidos de outros setores`                                                                                         |
| `resolutionRatePercent`          | `ticketCount ≤ 0` → `null` (sem divisão por zero). Senão `floor(resolved / ticketCount × 100)`, com `resolved` limitado a `[0, ticketCount]`. 100 só se todos resolvidos                                         |
| `formatResolutionRate`           | `75` → `75%`                                                                                                                                                                                                     |
| `ILLUSTRATIVE_FIRST_RESPONSE_MS` | 22 min                                                                                                                                                                                                           |
| `ILLUSTRATIVE_HANDLING_TIME_MS`  | 2 h por chamado (TMA de exemplo)                                                                                                                                                                                 |
| `firstResponseHint`              | `1ª resposta em 22min`                                                                                                                                                                                           |
| `illustrativeBacklogMs`          | `backlogCount × 2h` (negativo vale 0)                                                                                                                                                                            |
| `backlogHoursHint`               | `18` → `36h em backlog`                                                                                                                                                                                          |

Vazio de valor continua sendo `EMPTY_VALUE_LABEL` (`—`) de
`app/_lib/domain/labels.ts`.

### `df-data` — `app/_lib/data/dashboard.ts`

**Remover** `findDashboardSummary` (sem alias) e criar:

```ts
export async function findDashboardOverview(
  departmentId: number,
  range: DateRange,
): Promise<DashboardOverview>
```

Duas leituras em `Promise.all`.

**1. Agregado de `ticket`** — uma varredura das linhas do setor, com
`filter`:

```sql
select
  count(*) filter (where t.created_at >= $start and t.created_at < $end)::int
    as ticket_count,
  count(*) filter (
    where t.created_at >= $start and t.created_at < $end
      and t.status in (:DASHBOARD_RESOLVED_STATUSES)
  )::int as resolved_ticket_count,
  avg(extract(epoch from (t.resolved_at - t.created_at)) * 1000) filter (
    where t.resolved_at >= $start and t.resolved_at < $end
      and t.status in (:DASHBOARD_RESOLVED_STATUSES)
  ) as average_resolution_ms,
  count(*) filter (where t.status in (:BACKLOG_TICKET_STATUSES))::int
    as backlog_count
from ticket t
where t.current_department_id = $departmentId
```

**2. Aceites recebidos**:

```sql
select count(*)::int
from ticket_transfer tr
where tr.to_department_id = $departmentId
  and tr.status = 'aprovado'
  and tr.reviewed_at >= $start and tr.reviewed_at < $end
```

Detalhes que o contrato fixa:

- Os conjuntos de status vêm das constantes do domínio
  (`DASHBOARD_RESOLVED_STATUSES`, `BACKLOG_TICKET_STATUSES`) via `inArray` ou
  `sql` parametrizado; nenhum status literal no SQL de `ticket`. O `'aprovado'`
  de `approval_status` pode ser literal tipado (`"aprovado" satisfies
ApprovalStatus` ou o tipo do enum), como nas demais leituras de transferência.
- `count` como `int` (o `pg` entrega `bigint` como string). `avg` sobre
  `numeric` volta como string ou `null`: converter com `Number(...)` só quando
  não for `null`; sem linha → `averageResolutionMs: null`.
- Intervalo sempre meio-aberto (`>=` e `<`), nunca `between` nem `<=`.
- Setor sem chamados: `{ ticketCount: 0, receivedTransferCount: 0,
resolvedTicketCount: 0, averageResolutionMs: null, backlogCount: 0 }`, sem
  erro.
- `reviewed_at` nulo nunca passa no filtro (transferência pendente ou
  cancelada não conta).
- Rodar `EXPLAIN ANALYZE` das duas leituras para QA Suporte e a Diretoria e
  colar o plano na resposta.

### `df-actions`

**Nada.** Sem mutação nova.

### `df-ui` — o que fazer

**Arquivos**: `app/(app)/dashboard/page.tsx`,
`app/(app)/dashboard/_components/dashboard-stats.tsx` (pode ser renomeado para
`dashboard-overview.tsx`; se renomear, renomeie o esqueleto junto),
`dashboard-stats-skeleton.tsx`, `stat-card.tsx`. Nada em `app/_components/`
sem necessidade; a marca de ilustrativo e a barra são do Início e moram em
`app/(app)/dashboard/_components/`.

**Grade da página.** Debaixo do cabeçalho (título, data, filtro), uma coluna
de linhas com o mesmo espaçamento vertical; a largura máxima `lg:max-w-3xl`
sai (a linha 1 ocupa a largura do conteúdo). Cada linha é um bloco próprio com
o seu `Suspense` e o seu esqueleto, para que as Etapas 2 e 3 entrem como
irmãos sem mexer na linha 1:

- Linha 1: `grid` de 4 cards — 1 coluna abaixo de `sm`, 2 colunas de `sm` a
  `xl`, 4 colunas a partir de `xl`. Ordem fixa: Chamados no período · Taxa de
  resolução · Tempo médio de resolução · Backlog.
- Linhas 2 e 3 (etapas futuras): grade de 5 colunas a partir de `lg`, esquerda
  `col-span-3`, direita `col-span-2`, empilhando abaixo de `lg`. Na Etapa 1
  **não** renderizar placeholder vazio para elas.
- O `key={serializeDashboardParams(selection)}` do `Suspense` continua, para o
  esqueleto aparecer na troca de período.

**Leitura**: o Server Component da linha 1 chama
`findDashboardOverview(actor.departmentId, range)` uma vez e passa números
prontos aos cards. Nada de fórmula na UI: taxa por `resolutionRatePercent`,
textos pelas funções e constantes do domínio, duração por `durationParts`.

**Os 4 cards** (mesmo cartão de hoje: `surface`, `border-subtle`,
`rounded-2xl`, rótulo pequeno, valor grande `font-heading text-display`, linha
de apoio). Rótulos de `DASHBOARD_OVERVIEW_LABELS`.

| Card                     | Valor                                                                                                                                                 | Embaixo do valor                                                                                                                                                                                                                          |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chamados no período      | `ticketCount`                                                                                                                                         | `receivedTransfersHint(receivedTransferCount)`                                                                                                                                                                                            |
| Taxa de resolução        | `formatResolutionRate(p)`, `p = resolutionRatePercent(resolvedTicketCount, ticketCount)`; `p === null` → `—`                                          | `p !== null`: barra horizontal 0–100% (cor primária, trilho neutro, largura `p%`), `role="progressbar"` com `aria-valuenow`/`aria-valuemin`/`aria-valuemax` e nome = rótulo do card. `p === null`: `NO_TICKETS_IN_PERIOD_HINT`, sem barra |
| Tempo médio de resolução | `averageResolutionMs !== null`: `durationParts(...)`, número no tamanho do valor e unidade menor (ex. `text-base`), espaço entre partes. `null` → `—` | não nulo: `firstResponseHint()` + marca ilustrativa. Nulo: `NO_RESOLUTIONS_IN_PERIOD_HINT`, sem marca                                                                                                                                     |
| Backlog                  | `backlogCount`                                                                                                                                        | `> 0`: `backlogHoursHint(backlogCount)` + marca ilustrativa. `0`: `EMPTY_BACKLOG_HINT`, sem marca                                                                                                                                         |

- **Barra**: não existe `progress` em `app/_components/ui/`. Se usar o
  primitivo do shadcn, `npx shadcn@latest add progress` (trocar o import do
  `cn`) é do `df-ui`; uma `div` com `role="progressbar"` também atende. A
  altura da barra ocupa o lugar da linha de apoio, para os 4 cards ficarem com
  a mesma altura.
- **Marca ilustrativa**: texto visível `ILLUSTRATIVE_LABEL` ("Ilustrativo"),
  pequeno, estilo neutro (ex. `Badge` `outline`), ao lado da linha de apoio,
  com `ILLUSTRATIVE_DESCRIPTION` em `Tooltip` (ou `title`). Não basta cor nem
  ícone sozinho: o texto "Ilustrativo" precisa estar na tela e na árvore de
  acessibilidade. Ela marca **só** a linha de apoio; o valor grande do card é
  real e não leva marca.
- O valor grande não trunca nos formatos esperados (`3h 40min`, `1d 2h`, `100%`,
  números de 4 dígitos). A linha de apoio pode truncar com `title` do texto
  inteiro.
- O "Principal ofensor" sai do topo; `tagValueSize` e `ticketCountLabel` de
  `dashboard-stats.tsx` saem junto se ficarem sem uso.

**Esqueleto**: mesma grade da linha 1 com 4 cartões (rótulo, valor, linha de
apoio), `aria-busy` e `aria-label="Carregando indicadores"` como hoje.

### `tsc` entre ondas

Com a Onda 0 entregue, `npx tsc --noEmit` acusa **um** erro, no arquivo que o
`df-data` vai reescrever:

```
app/_lib/data/dashboard.ts(3,15): error TS2305: Module '"@/app/_lib/types/dashboard"' has no exported member 'DashboardSummary'.
```

`app/(app)/dashboard/_components/dashboard-stats.tsx` não acusa erro hoje (usa
o retorno inferido), mas para de compilar quando `findDashboardSummary` sair:
`df-data` e `df-ui` entregam juntos.

### Cenários do `df-qa`

Usuários de `docs/contracts/qa-seed.md`: `D` = Diretor, `A` = QA Admin
Suporte, `M` = QA Membro Suporte, `I` = QA Admin Infra. `S`/`F`/`DIR` = ids de
QA Suporte, QA Infra e Diretoria. Títulos começam com `[QA] Visão geral`.
**Não alterar #65 a #68.** Escrita só em QA Suporte e QA Infra, pela
interface; na Diretoria só leitura.

Bordas de período no banco (São Paulo), para usar como `:inicio`/`:fim`:

```sql
select
  date_trunc('day',   now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo' as hoje_ini,
  (date_trunc('day',  now() at time zone 'America/Sao_Paulo') + interval '1 day') at time zone 'America/Sao_Paulo' as hoje_fim,
  date_trunc('week',  now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo' as semana_ini,
  (date_trunc('week', now() at time zone 'America/Sao_Paulo') + interval '7 days') at time zone 'America/Sao_Paulo' as semana_fim,
  date_trunc('month', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo' as mes_ini,
  (date_trunc('month', now() at time zone 'America/Sao_Paulo') + interval '1 month') at time zone 'America/Sao_Paulo' as mes_fim
```

Personalizado `de..ate`: `:inicio = (:de)::timestamp at time zone
'America/Sao_Paulo'`, `:fim = ((:ate)::date + 1)::timestamp at time zone
'America/Sao_Paulo'`.

Consulta `OV(dep, inicio, fim)`:

```sql
select
  count(*) filter (where t.created_at >= :inicio and t.created_at < :fim) as chamados,
  count(*) filter (where t.created_at >= :inicio and t.created_at < :fim
                     and t.status in ('resolvido','fechado')) as resolvidos,
  floor(avg(extract(epoch from (t.resolved_at - t.created_at))) filter (
    where t.resolved_at >= :inicio and t.resolved_at < :fim
      and t.status in ('resolvido','fechado')) / 60) as media_min,
  count(*) filter (where t.status in
    ('aberto','em_analise','encaminhado','recusado','em_andamento')) as backlog
from ticket t
where t.current_department_id = :dep
```

Consulta `RT(dep, inicio, fim)`:

```sql
select count(*) from ticket_transfer tr
where tr.to_department_id = :dep and tr.status = 'aprovado'
  and tr.reviewed_at >= :inicio and tr.reviewed_at < :fim
```

Esperado na tela a partir das consultas:

- Taxa = `floor(100 × resolvidos / chamados)` + `%`; `chamados = 0` → `—`.
- Tempo médio a partir de `media_min` (`m`): `m < 1` → `< 1min`; `m < 60` →
  `{m}min`; `m < 1440` → `{h}h {min}min` (sem a parte zerada); senão
  `{d}d {h}h` (sem `h` se zero). `null` → `—`.
- Horas ilustrativas = `backlog × 2` + `h em backlog` (milhar com ponto).

Preparação (interface):

1. Como A, abrir `/dashboard` e anotar os 4 números de Hoje (antes).
2. Como M, criar em QA Suporte `[QA] Visão geral resolvido` e resolvê-lo
   (autor resolve o próprio chamado) → `#V1`.
3. Como I, criar em QA Infra `[QA] Visão geral recebido` e enviá-lo para QA
   Suporte → `#V2`. Anotar o backlog de A (recarregar) **antes** do aceite.
4. Como A, no detalhe de `#V2`, "Atender" → `#V2` aceito.

| #    | Quem  | Ação                                                                                       | Esperado                                                                                                                                                                                                                                                    |
| ---- | ----- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OV1  | A     | `/dashboard` (Hoje), ≥ 1280 px                                                             | 4 cards numa linha, nesta ordem: Chamados no período · Taxa de resolução · Tempo médio de resolução · Backlog. Nenhum texto "Principal ofensor" na página                                                                                                   |
| OV2  | A     | Hoje, depois da preparação                                                                 | os 4 valores e as linhas de apoio batem com `OV(S, hoje)` e `RT(S, hoje)`; `RT ≥ 1` (por `#V2`) e a linha diz `+N recebido(s) de outros setores` com singular em `N = 1`                                                                                    |
| OV3  | A     | Semana                                                                                     | bate com `OV(S, semana)` / `RT(S, semana)`; backlog igual ao de Hoje                                                                                                                                                                                        |
| OV4  | A     | Mês                                                                                        | bate com `OV(S, mês)` / `RT(S, mês)`; os `[QA] Janela` resolvidos no mês entram no tempo médio (espera-se formato com `d` se a média passar de 1 dia); backlog igual                                                                                        |
| OV5  | A     | Personalizado de 3 dias que inclua hoje                                                    | bate com `OV`/`RT` do intervalo (fim = dia seguinte ao `ate`)                                                                                                                                                                                               |
| OV6  | A     | Personalizado num dia sem nenhum chamado de QA Suporte (conferir com `OV`, ex. 2026-01-01) | `0`; `Nenhum recebido de outros setores`; Taxa `—` + `Nenhum chamado no período`, sem barra; Tempo `—` + `Nenhum chamado resolvido no período`, **sem** marca Ilustrativo; Backlog igual ao de Hoje                                                         |
| OV7  | A     | Comparar os números de Hoje antes/depois da preparação                                     | `#V1`: chamados +1, resolvidos da coorte +1 (taxa recalculada), tempo médio inclui `#V1` (provavelmente `< 1min` ou poucos minutos), backlog inalterado. `#V2`: chamados +1 já no envio (pendente conta no total)                                           |
| OV8  | A     | Backlog antes e depois do aceite de `#V2`                                                  | **antes** do aceite o backlog **não** conta `#V2` (`aguardando_aprovacao`); depois do aceite, +1 (`em_andamento`). Bate com a coluna `backlog` de `OV`                                                                                                      |
| OV9  | A     | Linhas de apoio dos cards 3 e 4 com dados                                                  | card 3: `1ª resposta em 22min` com o texto `Ilustrativo` visível ao lado; card 4: `{backlog × 2}h em backlog` com `Ilustrativo`; tooltip/título com "Valor de exemplo: o sistema ainda não mede este dado."; cards 1 e 2 e os valores grandes **sem** marca |
| OV10 | A     | Taxa com dados                                                                             | barra com largura proporcional ao `%`; `role="progressbar"` com `aria-valuenow` = número do `%`                                                                                                                                                             |
| OV11 | A     | Trocar Hoje → Semana → Mês → Personalizado                                                 | esqueleto de 4 cartões aparece na troca (se perceptível); valores mudam conforme `OV`; URL como no contrato anterior; `?periodo=lixo` cai em Hoje                                                                                                           |
| OV12 | I     | `/dashboard`, Hoje e Mês                                                                   | números de QA Infra (`OV(F, …)`, `RT(F, …)`), não os de QA Suporte; o envio de `#V2` **não** conta como recebido para QA Infra                                                                                                                              |
| OV13 | D     | `/dashboard`, Hoje e Mês                                                                   | números da Diretoria (`OV(DIR, …)`, `RT(DIR, …)`), não a soma dos setores                                                                                                                                                                                   |
| OV14 | A     | 390×844                                                                                    | 4 cards empilhados em 1 coluna, sem rolagem horizontal; valores grandes inteiros (sem `…`); filtro e cabeçalho cabem                                                                                                                                        |
| OV15 | A     | 1024 px e 1279 px                                                                          | 2×2, mesma ordem (linha 1: Chamados, Taxa; linha 2: Tempo, Backlog); cartões da mesma linha com a mesma altura                                                                                                                                              |
| OV16 | todos | toda a bateria                                                                             | console do navegador e dev server (`next-devtools`) sem erro nem aviso de hidratação; nenhuma escrita além da preparação                                                                                                                                    |

Notas para não reportar como defeito:

- `+N recebidos` conta aceites por `reviewed_at` e **não** é parcela do total
  (que conta por `created_at`).
- A taxa arredonda para baixo: `199/200` é `99%`.
- O tempo médio de Hoje pode incluir chamado aberto em outro dia.

### Critério de pronto da Etapa 1

1. Linha 1 com os 4 cards na ordem fixada, números iguais a `OV`/`RT` em Hoje,
   Semana, Mês e Personalizado; backlog constante entre períodos.
2. Vazios conforme OV6; marca Ilustrativo só onde o contrato manda (OV9).
3. 390 px empilhado, sem rolagem horizontal; 2×2 entre `sm` e `xl`; 4 em linha
   a partir de `xl`.
4. Grade da página com a linha 1 em bloco próprio (com `Suspense`), pronta
   para as linhas 2 e 3 sem tocar nela.
5. `npx tsc --noEmit`, `npm run lint`, `npm run build`; `df-reviewer` sem
   bloqueante; `df-qa` aprova OV1–OV16.

### Checklist da Etapa 1

- [x] `DashboardOverview`, `DashboardOverviewCard`, `DurationPart`; duração em `app/_lib/date.ts`; domínio do Início; plano e este contrato; nota em `docs/contracts/dashboard.md` (`df-architect`)
- [ ] `findDashboardOverview` no lugar de `findDashboardSummary`, com `EXPLAIN` na resposta (`df-data`)
- [ ] Grade da página, 4 cards, barra, marca ilustrativa, esqueleto; "Principal ofensor" fora do topo (`df-ui`)
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm run build`; `df-reviewer`
- [ ] Cenários OV1–OV16 (`df-qa`)
