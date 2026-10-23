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
- Linhas 2 e 3 (etapas futuras): grade de 5 colunas a partir de `xl`, esquerda
  `col-span-3`, direita `col-span-2`, empilhando abaixo de `xl` (revisado em
  2026-10-23; era `lg`, ver Etapa 2). Na Etapa 1
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
- [x] `findDashboardOverview` no lugar de `findDashboardSummary`, com `EXPLAIN` na resposta (`df-data`)
- [x] Grade da página, 4 cards, barra, marca ilustrativa, esqueleto; "Principal ofensor" fora do topo (`df-ui`)
- [x] `npx tsc --noEmit`, `npm run lint`, `npm run build`; `df-reviewer`
- [x] Cenários OV1–OV16 (`df-qa`)

---

## Etapa 2 — linha 2: Principal ofensor e Maiores atrasos

Etapa 1 concluída (relatório `docs/test-reports/2026-10-23-dashboard-overview.md`,
16/16). Esta seção acrescenta a linha 2 sem tocar na linha 1.

### Tabelas, enums e migration

**Nenhuma mudança de schema. Nenhuma migration.** O fluxo lê:

- `ticket` — `id`, `title`, `priority`, `status`, `current_department_id`, `created_at`
- `ticket_tag` — `ticket_id`, `tag_id` (no máximo **uma** tag por chamado,
  `ticket_tag_single_per_ticket_idx`; por isso a soma dos percentuais nunca
  passa de 100%)
- `tag` — `id`, `name`, `department_id`
- enums `ticket_status` e `ticket_priority`

`ticket.due_at` continua sem gravação e **não** é lido: o vencimento é calculado.

Índices que atendem, sem índice novo:

- Ofensor: `ticket_dept_status_idx` (prefixo `current_department_id`) para o
  recorte do setor, `ticket_tag_single_per_ticket_idx` para o join por
  `ticket_id`, `tag` pela PK.
- Atrasos: `ticket_dept_status_idx` pelo prefixo `current_department_id,
status in (...)`. A expressão de vencimento não é indexável (depende de
  `case` sobre a prioridade) e é avaliada só sobre os ativos do setor; o
  `limit` corta a saída e o Postgres ordena um top-N em memória. QA Suporte tem
  ~104 ativos: irrelevante. Se o `EXPLAIN` mostrar problema, reporte.

### Datas — `app/_lib/date.ts` (acréscimo)

```ts
export const formatShortDateTime: (value: DateInput, now?: DateInput) => string
```

Fuso `America/Sao_Paulo`. Mesmo ano civil de `now` (no fuso) →
`13 out, 12:00`; outro ano → `31 dez 2025, 12:00`. Mês abreviado do locale
`pt-br`, minúsculo, sem ponto. O ano entra porque um chamado atrasado pode ter
vencido no ano anterior, e `13 out` sozinho seria ambíguo.

### Tipos

`app/_lib/types/ticket-due.ts` (novo):

```ts
export interface TicketDueFacts {
  createdAt: Date
  priority: TicketPriority
}
```

`app/_lib/types/dashboard.ts` (acréscimo):

```ts
export type DashboardOverdueColumn = "number" | "title" | "priority" | "dueAt"

export interface DashboardTopTag {
  id: number
  name: string
  ticketCount: number
}

export interface DashboardTopTags {
  ticketCount: number
  tags: DashboardTopTag[]
}

export interface DashboardOverdueTicket {
  id: number
  title: string
  priority: TicketPriority
  dueAt: Date
}
```

| Campo                          | Definição                                                                                                                                           |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DashboardTopTags.ticketCount` | Chamados do setor com `created_at` no período, todos os status — **o mesmo número** do card "Chamados no período". É o denominador do percentual    |
| `DashboardTopTags.tags`        | Até `limit` tags do setor, ordenadas por contagem desc, `lower(name)` asc, `id` asc                                                                 |
| `DashboardTopTag.ticketCount`  | Chamados do recorte acima com essa tag                                                                                                              |
| `DashboardOverdueTicket.dueAt` | `ticketDueAt({ createdAt, priority })`, calculado no `df-data` pela função do domínio sobre a linha lida; o SQL só filtra e ordena pela mesma regra |

### Domínio

`app/_lib/domain/ticket-due.ts` (novo). O prazo é regra do chamado, não do
Início: a feature de prioridade e um futuro "vence em" no detalhe reaproveitam
daqui.

```ts
export const TICKET_PRIORITY_DUE_HOURS = {
  critica: 4,
  alta: 8,
  media: 24,
  baixa: 72,
} satisfies Record<TicketPriority, number>

export const ticketDueWindowMs: (priority: TicketPriority) => number
export const ticketDueAt: (facts: TicketDueFacts) => Date
export const isTicketOverdue: (facts: TicketDueFacts, now: Date) => boolean
```

| Nome                        | Semântica                                                                                                   |
| --------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `TICKET_PRIORITY_DUE_HOURS` | Prazo em **horas inteiras** (o SQL usa `make_interval(hours => int)`; prazo fracionário exige rever o SQL)  |
| `ticketDueWindowMs`         | horas × `HOUR_MS`                                                                                           |
| `ticketDueAt`               | `createdAt + prazo`. Corrido (24×7), sem calendário útil                                                    |
| `isTicketOverdue`           | `dueAt < now`, **estrito**: no instante exato do vencimento ainda não está atrasado (o SQL usa o mesmo `<`) |

`app/_lib/domain/ticket.ts` (acréscimo): `TICKET_PRIORITIES: readonly
TicketPriority[]`, derivado de `TICKET_PRIORITY_LABELS` (mesmo padrão de
`TICKET_TYPES`). É a lista que o `df-data` percorre para montar o `case`.

`app/_lib/domain/dashboard.ts` (acréscimo):

```ts
export const TOP_TAGS_CARD_LABEL = "Principal ofensor"
export const OVERDUE_CARD_LABEL = "Maiores atrasos"
export const OVERDUE_QUEUE_LINK_LABEL = "Ver na fila"
export const OVERDUE_QUEUE_TAB: DepartmentQueueTab = "all"
export const OVERDUE_TICKETS_LIMIT = 5
export const TOP_TAGS_LIMIT = OVERDUE_TICKETS_LIMIT + 1
export const OVERDUE_TICKET_STATUSES: readonly ActiveTicketStatus[]
export const OVERDUE_COLUMN_LABELS: Record<DashboardOverdueColumn, string>
export const NO_TAGGED_TICKETS_IN_PERIOD_HINT =
  "Nenhum chamado com tag no período"
export const EMPTY_OVERDUE_TITLE = "Nenhum chamado em atraso"
export const EMPTY_OVERDUE_DESCRIPTION =
  "Os chamados do setor com vencimento já passado aparecem aqui."

export const topTagsEmptyHint: (ticketCount: number) => string
export const tagVolumePercent: (
  tagCount: number,
  ticketCount: number,
) => number | null
export const topTagVolumeHint: (tagCount: number, ticketCount: number) => string
export const tagBarPercent: (count: number, maxCount: number) => number
```

| Nome                      | Semântica                                                                                                                                                                                                                                             |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OVERDUE_TICKET_STATUSES` | `= BACKLOG_TICKET_STATUSES` (`aberto`, `em_analise`, `encaminhado`, `recusado`, `em_andamento`). Atraso é "backlog vencido": `aguardando_aprovacao` fica fora pelo mesmo motivo do backlog (ADR 016); `resolvido` já saiu da fila                     |
| `OVERDUE_TICKETS_LIMIT`   | 5 linhas na tabela                                                                                                                                                                                                                                    |
| `TOP_TAGS_LIMIT`          | 6 = linhas da tabela + 1. Regra de altura em "`df-ui`"                                                                                                                                                                                                |
| `OVERDUE_QUEUE_TAB`       | `all` ("Todos"): é a **única** aba que contém todos os chamados da lista. "Em aberto" só mostra sem destinatário, "Encaminhados" só com destinatário antes do atendimento, "Em andamento" só `em_andamento`; qualquer outra esconderia linhas do card |
| `OVERDUE_COLUMN_LABELS`   | `Nº`, `Título`, `Prioridade`, `Vencimento`                                                                                                                                                                                                            |
| `topTagsEmptyHint`        | `ticketCount = 0` → `Nenhum chamado no período`; `> 0` (há chamados, nenhum com tag do setor) → `Nenhum chamado com tag no período`                                                                                                                   |
| `tagVolumePercent`        | `ticketCount ≤ 0` → `null`. Senão `floor(tagCount / ticketCount × 100)`, `tagCount` limitado a `[0, ticketCount]`. Mesma regra da taxa de resolução                                                                                                   |
| `topTagVolumeHint`        | `26, 104` → `26 chamados · 25% do volume`; `1, 1` → `1 chamado · 100% do volume`; `1, 300` → `1 chamado · < 1% do volume` (o `floor` daria `0%` para uma tag que existe); `ticketCount = 0` → só `N chamados`                                         |
| `tagBarPercent`           | `count / maxCount × 100`, sem arredondar, limitado a `[0, 100]`; `maxCount ≤ 0` → `0`. A primeira tag vale 100                                                                                                                                        |

Rótulo de prioridade: `TICKET_PRIORITY_LABELS` (`app/_lib/domain/ticket.ts`).
Link do Nº: `ticketDetailPath(id)`; texto do Nº: `formatTicketNumber(id)`.

### Validação — `app/_lib/validation/dashboard.ts` (acréscimo)

```ts
export const OVERDUE_QUEUE_HREF: string
```

`departmentQueueHref({ tab: OVERDUE_QUEUE_TAB, period:
DEFAULT_DEPARTMENT_QUEUE_PERIOD, departmentId: null })` →
`/queue?tab=all&periodo=todos`. Período "Todos" porque o atraso não depende do
período do Início; `departmentId: null` porque a Fila já abre no setor de quem
vê (Diretoria inclusa, `queueDepartmentIdFor`). Mora em `validation/` porque o
montador de URL da Fila mora lá.

### `df-data` — `app/_lib/data/dashboard.ts`

```ts
export async function listDashboardTopTags(
  departmentId: number,
  range: DateRange,
  limit: number,
): Promise<DashboardTopTags>

export async function listOverdueTickets(
  departmentId: number,
  now: Date,
  limit: number,
): Promise<DashboardOverdueTicket[]>
```

`findDashboardOverview` não muda. As duas funções novas são independentes dela
e entre si (cada card tem seu `Suspense`).

**`listDashboardTopTags`** — duas leituras em `Promise.all`:

```sql
select count(*)::int
from ticket t
where t.current_department_id = $departmentId
  and t.created_at >= $start and t.created_at < $end
```

```sql
select tg.id, tg.name, count(*)::int as ticket_count
from ticket_tag tt
join tag tg on tg.id = tt.tag_id
join ticket t on t.id = tt.ticket_id
where t.current_department_id = $departmentId
  and t.created_at >= $start and t.created_at < $end
  and tg.department_id = $departmentId
group by tg.id, tg.name
order by count(*) desc, lower(tg.name) asc, tg.id asc
limit $limit
```

- Tag inativa conta (é histórico). Agrupa por `tag.id`. Tag de outro setor
  (chamado aceito de outro setor com a tag da origem) **não** entra no
  ranking, mas o chamado entra no `ticketCount`.
- Sem chamados: `{ ticketCount: 0, tags: [] }`.

**`listOverdueTickets`** — uma leitura. O prazo **nunca** é literal: o `case`
é montado percorrendo `TICKET_PRIORITIES` com `TICKET_PRIORITY_DUE_HOURS`
(`sql.join`), cada valor como parâmetro com `::int`. O mesmo fragmento serve
ao `where` e ao `order by`:

```sql
-- due := t.created_at + make_interval(hours => case t.priority
--          when $p1 then $h1::int when $p2 then $h2::int ... end)
select t.id, t.title, t.priority, t.created_at
from ticket t
where t.current_department_id = $departmentId
  and t.status in (:OVERDUE_TICKET_STATUSES)
  and (due) < $now
order by (due) asc, t.created_at asc, t.id asc
limit $limit
```

- O `::int` é obrigatório: sem ele os `then` com parâmetro viram `text` e
  `make_interval(hours => text)` não existe.
- `dueAt` de cada linha = `ticketDueAt({ createdAt, priority })`; o
  `created_at` não é devolvido à UI.
- "Maior atraso primeiro" = vencimento mais antigo primeiro.
- `now` vem do chamador (o mesmo `new Date()` da página), não do `now()` do
  banco, para SQL e domínio usarem o mesmo instante.
- Sem atrasados: `[]`.
- Rodar `EXPLAIN ANALYZE` das três leituras para QA Suporte (18) e colar na
  resposta.

### `df-actions`, `df-auth`, `df-email`

**Nada.** Sem mutação.

### `df-ui` — o que fazer

**Arquivos** em `app/(app)/dashboard/_components/` (nomes sugeridos):
`dashboard-top-tags.tsx`, `dashboard-top-tags-skeleton.tsx`,
`dashboard-overdue.tsx`, `dashboard-overdue-skeleton.tsx`; `page.tsx` ganha a
linha 2. A linha 1 não muda. Nada em `app/_components/` sem necessidade.

**Grade.** Abaixo da linha 1, no mesmo `flex-col gap-3`: `grid grid-cols-1
gap-3 xl:grid-cols-5`, Principal ofensor `xl:col-span-3`, Maiores atrasos
`xl:col-span-2`. Abaixo de `xl` empilha (ofensor em cima). Cartão igual ao da
linha 1 (`surface`, `border-subtle`, `rounded-2xl`).

> **Revisão 2026-10-23 (RW15, `docs/test-reports/2026-10-23-dashboard-overview-row2.md`).**
> A versão anterior abria a linha 2 em `lg` (`lg:grid-cols-5`). A 1024 px a
> coluna de "Maiores atrasos" ficava com 284 px, o Título com 49 px e o card
> ganhava rolagem horizontal, contra a regra "nunca causa rolagem horizontal".
> A linha 2 passa a ficar lado a lado (3+2) só a partir de `xl` (1280 px), o
> mesmo breakpoint em que a linha 1 abre em 4 colunas; abaixo de `xl` fica
> empilhada. Toda menção a `lg` nesta seção (grade, esqueleto, regra de altura)
> passa a ler `xl`. A linha 3 (Etapa 3) usa o mesmo breakpoint.

**Dois `Suspense`, um por card** (não um para a linha):

- Ofensor: `key={serializeDashboardParams(selection)}`, esqueleto na troca de
  período, como a linha 1.
- Atrasos: **sem** `key` de período. Ele não depende do período. A leitura se
  refaz a cada troca de filtro com ou sem `key` (a página é dinâmica e o Server
  Component roda de novo a cada navegação); tirar a `key` só evita o esqueleto
  piscando, porque o React mantém o conteúdo atual até o novo chegar.

Cada `Suspense` envolve o card inteiro, e o esqueleto desenha o cartão com o
mesmo `col-span`, para a grade não pular.

**Principal ofensor** — `listDashboardTopTags(actor.departmentId, range,
TOP_TAGS_LIMIT)`:

- Rótulo pequeno `TOP_TAGS_CARD_LABEL`.
- Com `tags.length > 0`: nome da 1ª em destaque (`font-heading`, tamanho do
  valor da linha 1 ou um degrau abaixo; até 2 linhas, `line-clamp-2` com
  `title`); embaixo `topTagVolumeHint(tags[0].ticketCount, ticketCount)`;
  depois a lista com **todas** as tags devolvidas (a 1ª inclusa): nome à
  esquerda (truncado com `title`), contagem à direita (`tabular-nums`), barra
  fina abaixo, cor primária sobre trilho neutro, largura
  `tagBarPercent(tag.ticketCount, tags[0].ticketCount)%`. A barra é
  `aria-hidden` (a contagem já está em texto); a lista é `ul`/`li`.
- Com `tags.length = 0`: `EMPTY_VALUE_LABEL` (`—`) no lugar do nome, linha
  `topTagsEmptyHint(ticketCount)`, sem lista.

**Maiores atrasos** — `listOverdueTickets(actor.departmentId, now,
OVERDUE_TICKETS_LIMIT)`, com o mesmo `now` da página:

- Cabeçalho: título `OVERDUE_CARD_LABEL` à esquerda, link
  `OVERDUE_QUEUE_LINK_LABEL` → `OVERDUE_QUEUE_HREF` à direita (sempre, com ou
  sem linhas).
- Tabela simples (`table` do shadcn ou HTML semântico; **não** TanStack — sem
  ordenação, filtro nem paginação). Cabeçalhos de `OVERDUE_COLUMN_LABELS`.
  - Nº: `formatTicketNumber(id)`, fonte mono, `text-muted-foreground`, link
    para `ticketDetailPath(id)`.
  - Título: truncado em uma linha com `title`; é a coluna que encolhe e nunca
    causa rolagem horizontal.
  - Prioridade: `TICKET_PRIORITY_LABELS[priority]` na cor do token
    `prioridade-*` (`text-prioridade-critica` · `-alta` · `-media` ·
    `-baixa`; `alta` é o âmbar do tema). Já existe um mapa de classes de fundo
    em `app/(app)/tickets/[id]/_components/ticket-detail-header.tsx`
    (`PRIORITY_DOT_CLASSES`); se for compartilhar entre as duas áreas, onde ele
    mora é decisão do `df-ui`. Cor nunca sozinha: o rótulo está sempre na
    célula.
  - Vencimento: `formatShortDateTime(dueAt, now)`, `whitespace-nowrap`, com
    `title={formatDateTime(dueAt)}`.
- Lista vazia: no lugar da tabela, `EMPTY_OVERDUE_TITLE` e
  `EMPTY_OVERDUE_DESCRIPTION`, texto pequeno e neutro.
- Em 390 px a tabela mantém as 4 colunas; o título é o que encolhe. Não
  esconder coluna.

**Regra de "ficou pequeno" (preencher a linha).** No `xl+` as duas colunas da
grade têm a mesma altura (stretch padrão do grid) e cada card é `h-full`. O
tamanho do ranking (`TOP_TAGS_LIMIT` = linhas da tabela + 1) foi escolhido
para que, com dados cheios, o conteúdo dos dois cards tenha altura parecida: o
ofensor tem um bloco de destaque de 3 linhas contra título + cabeçalho da
tabela do lado direito, e cada item do ranking (nome + barra) tem a altura de
uma linha da tabela. Critério verificável a 1280 px com 6 tags e 5 atrasos: a
diferença entre a altura do conteúdo dos dois cards (o bloco de conteúdo, sem
o padding do card; o card inteiro sempre daria 0, porque o grid estica os
dois) é **no máximo a altura de
um item do ranking**. Se for maior:

- ofensor sobrando espaço → o `df-ui` reporta as alturas medidas e o
  `df-architect` sobe `TOP_TAGS_LIMIT` (constante do domínio, nunca número na
  UI);
- tabela sobrando espaço → aumentar o respiro vertical das linhas da tabela,
  não o limite de atrasos.

Nunca cortar item com `overflow-hidden` ou altura fixa, nem esconder item que
veio do banco. Com menos dados (ex. 2 tags), os itens ficam no topo e o card
acompanha a altura da linha. Abaixo de `xl` cada card tem a altura do próprio
conteúdo.

**Esqueletos**: ofensor com rótulo, bloco de destaque e 6 itens; atrasos com
título, link e 5 linhas. `aria-busy` e `aria-label` (`Carregando principal
ofensor`, `Carregando maiores atrasos`).

### Riscos da Etapa 2

1. **Tabela sempre cheia.** Todo chamado nasce `media` (24h) e QA Suporte tem
   ~104 ativos: a lista terá 5 linhas desde o primeiro dia, praticamente "os
   mais antigos". Aceito no plano; o limite curto (5) contém o efeito. Muda
   sozinho quando a feature de prioridade existir, sem tocar na tela.
2. **Prazo corrido.** 24h inclui noite e fim de semana. Calendário útil é outra
   decisão.
3. **Ofensor × "Chamados no período".** O denominador é o número do card 1; a
   soma dos percentuais pode ser menor que 100% (chamado sem tag do setor).
4. **Destaque longo.** O destaque quebra em 2 linhas e trunca depois.

### Cenários do `df-qa`

Mesmos usuários e ids da Etapa 1 (`A`, `M`, `I`, `D`; `S` = 18, `F` = 19,
`DIR` = 11). **Não alterar #64 a #68** nem os chamados `[QA] Janela`. Escrita
só em QA Suporte e QA Infra, pela interface. Bordas de período: as da Etapa 1.

Consulta `TT(dep, inicio, fim)` (ranking):

```sql
select tg.id, tg.name, count(*) as n
from ticket_tag tt
join tag tg on tg.id = tt.tag_id
join ticket t on t.id = tt.ticket_id
where t.current_department_id = :dep and tg.department_id = :dep
  and t.created_at >= :inicio and t.created_at < :fim
group by tg.id, tg.name
order by n desc, lower(tg.name) asc, tg.id asc
limit 6
```

Denominador: coluna `chamados` de `OV(dep, inicio, fim)` da Etapa 1.

Consulta `AT(dep)` (atrasos, situação atual):

```sql
with v as (
  select t.id, t.title, t.priority, t.created_at,
    t.created_at + case t.priority
      when 'critica' then interval '4 hours'
      when 'alta'    then interval '8 hours'
      when 'media'   then interval '24 hours'
      when 'baixa'   then interval '72 hours' end as vencimento
  from ticket t
  where t.current_department_id = :dep
    and t.status in ('aberto','em_analise','encaminhado','recusado','em_andamento')
)
select id, title, priority,
  to_char(vencimento at time zone 'America/Sao_Paulo', 'YYYY-MM-DD HH24:MI') as vencimento_sp
from v
where vencimento < now()
order by vencimento asc, created_at asc, id asc
limit 5
```

Esperado: Vencimento = `vencimento_sp` como `D mmm, HH:mm` (mês abreviado
minúsculo: jan fev mar abr mai jun jul ago set out nov dez), com o ano
(`D mmm AAAA, HH:mm`) quando não for o ano corrente.

Preparação (interface), em ordem:

1. Como A, `/dashboard` Hoje: anotar o ranking do ofensor (antes).
2. Como M, criar em QA Suporte `[QA] Ofensor 1` e `[QA] Ofensor 2` com a mesma
   tag `T1` e `[QA] Ofensor 3` com outra tag `T2` (tags ativas de QA Suporte;
   anotar quais).

| #    | Quem  | Ação                                                               | Esperado                                                                                                                                                                                                                  |
| ---- | ----- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RW1  | A     | `/dashboard` Hoje, 1280 px                                         | abaixo da linha 1, dois cards lado a lado: "Principal ofensor" à esquerda (~3/5), "Maiores atrasos" à direita (~2/5), mesma altura. Linha 1 igual à da Etapa 1                                                            |
| RW2  | A     | Hoje, depois da preparação                                         | lista do ofensor = `TT(S, hoje)`, mesma ordem e contagens; destaque = 1ª linha; `N chamados · X% do volume` com `X = floor(100 × n / chamados)` de `OV(S, hoje)` (`< 1%` se `n > 0` e o floor der 0; singular em `n = 1`) |
| RW3  | A     | Comparar com o "antes"                                             | `T1` +2, `T2` +1; barras proporcionais à 1ª (a 1ª ocupa o trilho todo; metade da contagem, metade da largura)                                                                                                             |
| RW4  | A     | Semana, Mês, Personalizado de 3 dias com hoje                      | ofensor bate com `TT`/`OV` de cada período; esqueleto do ofensor na troca (se perceptível); **a tabela de atrasos não pisca nem muda**                                                                                    |
| RW5  | A     | Personalizado 2026-01-01                                           | ofensor: `—` e `Nenhum chamado no período`, sem lista; atrasos inalterado                                                                                                                                                 |
| RW6  | A     | Período com `chamados > 0` e `TT` vazio (procurar pelas consultas) | `—` e `Nenhum chamado com tag no período`. Se nenhum período assim existir no banco: NÃO EXECUTADO, com a consulta que mostrou                                                                                            |
| RW7  | A     | Maiores atrasos                                                    | linhas = `AT(S)`, mesma ordem; Nº `#id` mono discreto com link para `/tickets/{id}`; Título truncado com `title`; Prioridade "Média" na cor `prioridade-media`; Vencimento = `vencimento_sp` no formato acima             |
| RW8  | A     | Chamados da preparação e `#V2` (#254)                              | **não** aparecem nos atrasos (vencem 24h após a criação)                                                                                                                                                                  |
| RW9  | A     | Clicar "Ver na fila"                                               | `/queue?tab=all&periodo=todos`, aba "Todos", setor QA Suporte; os chamados da tabela de atrasos estão na lista                                                                                                            |
| RW10 | A     | Clicar no Nº de uma linha                                          | detalhe do chamado certo                                                                                                                                                                                                  |
| RW11 | I     | `/dashboard` Hoje e Mês                                            | ofensor = `TT(F, …)`; atrasos = `AT(F)`; nada de QA Suporte                                                                                                                                                               |
| RW12 | D     | `/dashboard` Hoje e Mês                                            | ofensor = `TT(DIR, …)`; atrasos = `AT(DIR)`; "Ver na fila" abre a Fila da Diretoria                                                                                                                                       |
| RW13 | todos | Setor com `AT` vazio (conferir pela consulta)                      | `Nenhum chamado em atraso` + descrição, link "Ver na fila" presente, sem tabela. Se nenhum setor de QA ou a Diretoria tiver `AT` vazio: NÃO EXECUTADO, com a consulta                                                     |
| RW14 | A     | 1280 px, com 6 tags e 5 atrasos                                    | diferença de altura entre o conteúdo dos dois cards (sem o padding do card) ≤ altura de um item do ranking; nenhum item cortado. Reportar as alturas medidas                                                              |
| RW15 | A     | 1024 px e 1280 px (revisado em 2026-10-23)                         | 1024: empilhado, ofensor em cima; 1280: lado a lado (3+2). Nos dois, sem rolagem horizontal da página nem da tabela de atrasos                                                                                            |
| RW16 | A     | 390×844                                                            | empilhado, sem rolagem horizontal da página nem da tabela; 4 colunas visíveis, Título truncado; destaque do ofensor sem estourar                                                                                          |
| RW17 | todos | toda a bateria                                                     | console e dev server sem erro nem aviso de hidratação; linha 1 continua conforme OV1–OV16                                                                                                                                 |

Observações da primeira rodada do `df-qa` (2026-10-23):

- RW14 mede o bloco de conteúdo de cada card, sem o padding. Medido assim
  deu 25 px de diferença, dentro do critério.
- RW11 não foi executado: nenhuma das contas usadas pertence a um setor
  diferente de Suporte e Diretoria. Para executar é preciso uma conta de
  outro setor (ex. QA Infra, conforme o `qa-seed.md`).
- RW13 não foi executado: nenhum setor acessível às contas usadas tem `AT`
  vazio (Suporte 9 de 9, Diretoria 22 de 22), e o teste não resolve nem
  cancela chamados reais para forçar o vazio. O estado vazio da tabela
  continua sem verificação em execução.

Notas para não reportar como defeito:

- A tabela cheia com "Média" e "mais antigos primeiro" é esperada (risco 1).
- A soma dos percentuais do ofensor pode ser menor que 100%.
- O ranking conta só tags do setor; um chamado aceito de outro setor conta no
  denominador e não no ranking.

### Critério de pronto da Etapa 2

1. Linha 2 conforme a grade, cada card com `Suspense` e esqueleto próprios;
   ofensor segue o período, atrasos não.
2. Números e ordem iguais a `TT`/`OV` e `AT`; vazios conforme RW5, RW6 e RW13.
3. Regra de altura (RW14); 390 px sem rolagem horizontal.
4. Prazo só em `TICKET_PRIORITY_DUE_HOURS`; nenhum literal de prazo ou de
   status no SQL da aplicação.
5. `npx tsc --noEmit`, `npm run lint`, `npm run build`; `df-reviewer` sem
   bloqueante; `df-qa` aprova RW1–RW17.

### Checklist da Etapa 2

- [x] `TicketDueFacts`, tipos da linha 2, `ticket-due.ts`, `TICKET_PRIORITIES`, textos e regras em `dashboard.ts`, `formatShortDateTime`, `OVERDUE_QUEUE_HREF`, esta seção (`df-architect`)
- [x] `listDashboardTopTags` e `listOverdueTickets`, com `EXPLAIN` na resposta (`df-data`)
- [x] Linha 2, dois cards, dois `Suspense`, esqueletos, regra de altura (`df-ui`)
- [x] `npx tsc --noEmit`, `npm run lint`, `npm run build`; `df-reviewer`
- [x] Cenários RW1–RW17 (`df-qa`; RW15 reprovado e aprovado no reteste depois da revisão para `xl`; RW11 e RW13 não executados, ver observações acima)

Etapa 2 concluída e comitada em 2026-10-23 (`33cf321`).

---

## Etapa 3a — linha 3, direita: Transferências entre setores

Por decisão do usuário (2026-10-23, um commit por assunto) a linha 3 entra em
duas sub-etapas: **3a** (esta, o card de transferências) e **3b** (Últimos 7
dias, gráfico com Recharts, seção própria depois). Nada da 3b é escrito aqui.

### Tabelas, enums e migration

**Nenhuma mudança de schema. Nenhuma migration.** O fluxo lê:

- `ticket_transfer` — `id`, `ticket_id`, `from_department_id`,
  `to_department_id`, `status`, `reviewed_at`, `created_at`
- `department` — `id`, `name` (setor de origem)
- `ticket` — `id`, `title` (só para o `title` do item da lista)
- enum `approval_status` (`pendente`, `aprovado`, `cancelado`, `rejeitado`)

Índices que atendem, sem índice novo:

- "Aguardando nosso aceite" e a lista: `transfer_inbox_idx`
  (`to_department_id, status, created_at desc`). A contagem usa o prefixo; a
  lista "mais antigas primeiro" lê o mesmo índice de trás para a frente
  (`created_at asc`) e para no `limit`, sem ordenar.
- "Enviados, pendentes" e "Recusados por outros": `transfer_from_department_idx`
  (`from_department_id`); `status` e `reviewed_at` filtram as linhas do setor.
  O volume de transferências por setor é pequeno; se o `EXPLAIN` mostrar
  problema, reporte e o `df-architect` avalia `(from_department_id, status)`.

### Definições

| Contador                | Definição                                                                                                 | Período                        |
| ----------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------ |
| Aguardando nosso aceite | `status = 'pendente'` e `to_department_id` = setor. **Mesmo número do selo de Aprovações**                | não (situação atual)           |
| Enviados, pendentes     | `status = 'pendente'` e `from_department_id` = setor                                                      | não (situação atual)           |
| Recusados por outros    | `status = 'rejeitado'`, `from_department_id` = setor e `reviewed_at` no período (`[start, end)`)          | **sim**, o do filtro do Início |
| Lista                   | As pendentes de "Aguardando nosso aceite", `created_at` asc, `id` asc, até `INCOMING_TRANSFERS_LIMIT` (5) | não (situação atual)           |

- `cancelado` não entra em nenhum contador. `aprovado` já aparece na linha 1
  ("+N recebidos de outros setores").
- "Há X" na lista = `now − ticket_transfer.created_at` (o envio), com o mesmo
  `now` da página.
- Pelo ADR 016 o chamado pendente já está em `current_department_id` = destino
  e fica só em Aprovações (não na Fila). Por isso o card leva o link "Ver em
  Aprovações" e cada item abre o detalhe com a origem `approvals`.

### Datas — `app/_lib/date.ts` (acréscimo)

```ts
export const elapsedMs: (value: DateInput, now?: DateInput) => number
export const formatElapsed: (value: DateInput, now?: DateInput) => string
```

| Função          | Semântica                                                                                                                                           |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `elapsedMs`     | `now − value` em ms; negativo (relógio adiantado) vale 0                                                                                            |
| `formatElapsed` | `< 1 min` → `agora`; senão `há ` + `formatDuration` (`há 22min`, `há 3h 20min`, `há 1d 2h`, `há 2d`). Truncado em minutos como a duração da Etapa 1 |

`formatRelative` (do `dayjs`, "há 3 horas") **não** serve aqui: arredonda e não
dá "3h 20min".

### Tipos — `app/_lib/types/dashboard.ts` (acréscimo)

```ts
export type DashboardTransferCounter = "incoming" | "outgoing" | "rejected"

export type DashboardTransferCounterTone = "highlight" | "alert" | "neutral"

export interface DashboardTransferSummary {
  incomingPendingCount: number
  outgoingPendingCount: number
  rejectedCount: number
}

export interface DashboardIncomingTransfer {
  transferId: number
  ticketId: number
  ticketTitle: string
  fromDepartmentName: string
  sentAt: Date
}
```

`sentAt` = `ticket_transfer.created_at` (mesmo nome de `ApprovalListItem`).

### Domínio

`app/_lib/domain/ticket-transfer.ts` (acréscimo), ao lado do
`REJECTED_TRANSFER_STATUS` que já existe:

```ts
export const PENDING_TRANSFER_STATUS =
  "pendente" as const satisfies ApprovalStatus
```

O `df-data` usa os dois nas leituras novas, sem literal solto.
`countPendingApprovals` continua como está (literal `"pendente"`); trocar é
refatoração fora desta etapa.

`app/_lib/domain/dashboard.ts` (acréscimo):

```ts
export const TRANSFERS_CARD_LABEL = "Transferências entre setores"
export const TRANSFER_COUNTER_LABELS: Record<DashboardTransferCounter, string>
export const REJECTED_TRANSFERS_SCOPE_HINT = "no período"
export const TRANSFERS_APPROVALS_LINK_LABEL = "Ver em Aprovações"
export const INCOMING_TRANSFERS_LIMIT = 5
export const INCOMING_TRANSFER_STALE_HOURS = 4
export const INCOMING_TRANSFER_STALE_MS: number
export const STALE_INCOMING_TRANSFER_LABEL = "Aguardando aceite há 4h ou mais"
export const EMPTY_INCOMING_TRANSFERS_TITLE = "Nenhum chamado aguardando aceite"
export const EMPTY_INCOMING_TRANSFERS_DESCRIPTION: string

export const transferCounterToneFor: (
  counter: DashboardTransferCounter,
  count: number,
) => DashboardTransferCounterTone
export const incomingTransferOriginLabel: (departmentName: string) => string
export const isStaleIncomingTransfer: (sentAt: Date, now: Date) => boolean
```

| Nome                                   | Semântica                                                                                                                                                                                                      |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TRANSFER_COUNTER_LABELS`              | `incoming` → `Aguardando nosso aceite` · `outgoing` → `Enviados, pendentes` · `rejected` → `Recusados por outros`. Ordem na tela: incoming, outgoing, rejected                                                 |
| `REJECTED_TRANSFERS_SCOPE_HINT`        | Marca, no mini-card de recusados, que só ele segue o período. Os outros dois não levam marca (situação atual é o padrão do card, como em "Maiores atrasos")                                                    |
| `TRANSFERS_APPROVALS_LINK_LABEL`       | `Ver em ` + `APPROVALS_LABEL`                                                                                                                                                                                  |
| `INCOMING_TRANSFERS_LIMIT`             | 5 itens, igual a `OVERDUE_TICKETS_LIMIT` por coerência entre as linhas. A regra de altura contra o gráfico é da 3b; se ela pedir outro número, muda aqui, nunca na UI                                          |
| `INCOMING_TRANSFER_STALE_HOURS`        | 4h: o mesmo valor do menor prazo de atendimento (`critica`), como teto para um chamado ficar parado sem ninguém aceitar. Constante própria, não derivada de `TICKET_PRIORITY_DUE_HOURS`: são regras diferentes |
| `STALE_INCOMING_TRANSFER_LABEL`        | Texto acessível do item destacado; montado com `formatDuration`, então acompanha a constante                                                                                                                   |
| `EMPTY_INCOMING_TRANSFERS_DESCRIPTION` | `Os chamados enviados por outros setores aparecem aqui até alguém do setor atender ou recusar.`                                                                                                                |
| `transferCounterToneFor`               | `count ≤ 0` → `neutral` (qualquer contador). `incoming` com `count > 0` → `highlight` (fundo e número `warning`). `rejected` com `count > 0` → `alert` (só o número `warning`). `outgoing` → sempre `neutral`  |
| `incomingTransferOriginLabel`          | `RH` → `de RH`                                                                                                                                                                                                 |
| `isStaleIncomingTransfer`              | `elapsedMs(sentAt, now) ≥ INCOMING_TRANSFER_STALE_MS`, **inclusivo**. Vale para **todo** item acima do limite, não só o primeiro; como a lista é "mais antigas primeiro", os destacados ficam juntos no topo   |

Por que o destaque do "Aguardando" some com `0`: no print o mini-card está
destacado porque há o que aceitar; com zero não há alerta a dar, e manter o
laranja ensinaria o usuário a ignorar a cor.

Número do chamado: `formatTicketNumber(ticketId)` (`app/_lib/domain/ticket.ts`).

### Validação — `app/_lib/validation/dashboard.ts` (acréscimo)

```ts
export const TRANSFERS_APPROVALS_HREF: string
export const incomingTransferTicketHref: (ticketId: number) => string
```

| Nome                         | Valor                                                                                                                                                                           |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TRANSFERS_APPROVALS_HREF`   | `approvalsHref(DEFAULT_APPROVALS_PERIOD)` → `/approvals?periodo=todos`                                                                                                          |
| `incomingTransferTicketHref` | `approvalsTicketDetailHref(DEFAULT_APPROVALS_PERIOD, id)` → `/tickets/{id}?from=approvals&periodo=todos`. No detalhe, o link de retorno rotulado "Aprovações" leva a Aprovações |

Origem `approvals`, e não uma origem "Início" nova, porque o chamado pendente
só existe em Aprovações: voltar para lá depois de atender ou recusar é o
caminho natural, e não exige tipo de origem novo.

### `df-data` — `app/_lib/data/dashboard.ts`

```ts
export async function findTransferSummary(
  departmentId: number,
  range: DateRange,
): Promise<DashboardTransferSummary>

export async function listOldestIncomingTransfers(
  departmentId: number,
  limit: number,
): Promise<DashboardIncomingTransfer[]>
```

Sem `now`: nenhuma das duas leituras depende do instante (o "há X" e o
destaque são calculados na UI com o `now` da página).

**`findTransferSummary`** — duas leituras em `Promise.all`:

1. `countPendingApprovals(departmentId)` de `app/_lib/data/approvals.ts`,
   **reaproveitada** (importada, não copiada) → `incomingPendingCount`. É o que
   garante o mesmo número do selo.
2. Enviados e recusados, uma varredura das transferências que saíram do setor:

```sql
select
  count(*) filter (where tr.status = $pending)::int as outgoing_pending_count,
  count(*) filter (
    where tr.status = $rejected
      and tr.reviewed_at >= $start and tr.reviewed_at < $end
  )::int as rejected_count
from ticket_transfer tr
where tr.from_department_id = $departmentId
```

- `$pending` = `PENDING_TRANSFER_STATUS`, `$rejected` = `REJECTED_TRANSFER_STATUS`.
- Intervalo meio-aberto (`>=`/`<`); `reviewed_at` nulo nunca passa.
- Sem linhas: `{ incomingPendingCount: 0, outgoingPendingCount: 0, rejectedCount: 0 }`.

**`listOldestIncomingTransfers`**:

```sql
select tr.id as transfer_id, t.id as ticket_id, t.title as ticket_title,
  d.name as from_department_name, tr.created_at as sent_at
from ticket_transfer tr
join department d on d.id = tr.from_department_id
join ticket t on t.id = tr.ticket_id
where tr.to_department_id = $departmentId
  and tr.status = $pending
order by tr.created_at asc, tr.id asc
limit $limit
```

- Mesmo filtro de `countPendingApprovals` (destino + pendente), então
  `lista.length = min(incomingPendingCount, limit)`.
- Sem pendentes: `[]`.
- Rodar `EXPLAIN ANALYZE` das três leituras para Suporte (14) e Diretoria (11)
  e colar na resposta.

### `df-actions`, `df-auth`, `df-email`

**Nada.** Sem mutação.

### `df-ui` — o que fazer

**Arquivos** em `app/(app)/dashboard/_components/` (nomes sugeridos):
`dashboard-transfers.tsx`, `dashboard-transfers-skeleton.tsx` e, se ajudar,
`transfer-counter.tsx` (o mini-card) e `incoming-transfer-item.tsx`. `page.tsx`
ganha a linha 3. Linhas 1 e 2 não mudam. Reaproveitar `DashboardPanel`; o
cabeçalho (título + link) segue o de `dashboard-overdue-header.tsx` — se for
generalizar aquele componente, é decisão do `df-ui`.

**Grade da linha 3 (3a).** Abaixo da linha 2, no mesmo `flex-col gap-3`:
`grid grid-cols-1 gap-3 xl:grid-cols-5`, com o card de transferências em
`xl:col-span-2 xl:col-start-4`. Abaixo de `xl` ocupa a largura toda. Em `xl+`
a coluna da esquerda (3/5) fica **vazia** até a 3b: sem placeholder, sem
esqueleto, sem texto "em breve". Quando a 3b entrar, ela acrescenta o card do
gráfico como primeiro filho (`xl:col-span-3`) e nada mais muda; o
`xl:col-start-4` passa a ser redundante e pode ficar ou sair.

**Um `Suspense`, sem `key` de período**, com o esqueleto do card. O card faz
uma leitura só (`Promise.all` de `findTransferSummary(actor.departmentId,
range)` e `listOldestIncomingTransfers(actor.departmentId,
INCOMING_TRANSFERS_LIMIT)`) e recebe `now` da página. Sem `key` pelo mesmo
motivo do card de atrasos: só um contador depende do período, e o esqueleto
piscando na troca de filtro seria pior do que o número mudar no lugar.

**Cabeçalho**: `TRANSFERS_CARD_LABEL` (mesmo estilo do título de "Maiores
atrasos") à esquerda; link `TRANSFERS_APPROVALS_LINK_LABEL` →
`TRANSFERS_APPROVALS_HREF` à direita, sempre (com ou sem pendentes).

**3 mini-cards** lado a lado (`grid grid-cols-3 gap-2`) em todas as larguras,
inclusive 390 px. Ordem: incoming, outgoing, rejected. Cada um: rótulo
pequeno de `TRANSFER_COUNTER_LABELS` em cima (pode quebrar em até 2 linhas,
**nunca** truncar), número grande (`font-heading`, `tabular-nums`) embaixo,
empurrado para o fim (`mt-auto`) para os três números ficarem na mesma linha
de base; os três com a mesma altura (stretch do grid). Marcação sugerida: `dl`
com `dt`/`dd`, ou o rótulo como nome acessível do número.

- Recusados: entre o rótulo e o número, `REJECTED_TRANSFERS_SCOPE_HINT` ("no
  período") em texto menor e `text-muted-foreground`. Fica acima do número,
  para não desalinhar a linha dos números.
- Tom por `transferCounterToneFor(counter, count)`:
  - `highlight`: fundo `bg-warning`, borda `border-warning-border`, número
    `text-warning-foreground`;
  - `alert`: fundo e borda neutros, número `text-warning-foreground`;
  - `neutral`: superfície secundária neutra do tema (a que o `df-ui` já usa),
    número na cor padrão.
  - O rótulo sempre presente garante que cor não é a única informação.

**Lista** (abaixo dos mini-cards, `ul`/`li`, linhas finas `border-border-subtle`
entre itens):

- Cada item é um link inteiro para `incomingTransferTicketHref(ticketId)`, com
  `title={ticketTitle}` e foco visível.
- À esquerda: `formatTicketNumber(ticketId)` em fonte mono,
  `text-muted-foreground`, seguido de
  `incomingTransferOriginLabel(fromDepartmentName)`; o nome do setor trunca em
  uma linha (é o que encolhe).
- À direita: `formatElapsed(sentAt, now)`, `whitespace-nowrap`,
  `tabular-nums`, com `title={formatDateTime(sentAt)}`.
- `isStaleIncomingTransfer(sentAt, now)`: o "há X" em
  `text-warning-foreground font-semibold` e um texto `sr-only` com
  `STALE_INCOMING_TRANSFER_LABEL` (cor nunca sozinha).
- Mostra todos os itens devolvidos (até 5). Com mais pendentes que o limite,
  nada extra: o contador mostra o total e o link leva a Aprovações.

**Vazio** (`incomingPendingCount = 0`, lista `[]`): mini-cards com os números
e tons normais (o "Aguardando" fica `neutral` com `0`), e no lugar da lista
`EMPTY_INCOMING_TRANSFERS_TITLE` + `EMPTY_INCOMING_TRANSFERS_DESCRIPTION`,
texto pequeno e neutro, como o vazio de atrasos. O link "Ver em Aprovações"
continua.

**Esqueleto**: cabeçalho (título e link), 3 mini-cards e 5 linhas.
`aria-busy` e `aria-label="Carregando transferências entre setores"`. Mesmo
`col-span`/`col-start` do card, para a grade não pular.

**Altura**: na 3a o card tem a altura do próprio conteúdo (não há vizinho).
A regra de altura contra o gráfico é da 3b.

### Riscos da Etapa 3a

1. **Coluna vazia em `xl+`.** Entre os commits da 3a e da 3b, a linha 3 tem
   3/5 em branco à esquerda. Aceito: é provisório e evita placeholder falso.
2. **Selo × contador.** Os dois usam `countPendingApprovals`, em leituras
   separadas do mesmo request; só diferem se uma transferência for criada ou
   revisada entre as duas.
3. **"Recusados" no período × o resto situação atual.** Mitigado pela marca
   "no período" no mini-card.
4. **"Há X" congelado.** O tempo é do render (o `now` da página); não conta
   sozinho na tela aberta. Aceito, como os atrasos.

### Cenários do `df-qa`

Parametrizados por setor. Contas reais fornecidas pelo orquestrador na hora
(as mesmas da Etapa 2): `D` = Diretor (Diretoria, `DIR` = 11), `A` =
Administrador de Suporte, `M` = Membro de Suporte (`S` = 14). Não há conta de
outro setor. **Preferir leitura.** Se algum cenário exigir criar
transferência, só com chamado novo de título `[QA] Transferências …`, pela
interface; nunca mexer em chamado que não seja `[QA]`. Bordas de período: as
da Etapa 1.

Consulta `TS(dep, inicio, fim)`:

```sql
select
  (select count(*) from ticket_transfer
    where to_department_id = :dep and status = 'pendente') as aguardando,
  (select count(*) from ticket_transfer
    where from_department_id = :dep and status = 'pendente') as enviados,
  (select count(*) from ticket_transfer
    where from_department_id = :dep and status = 'rejeitado'
      and reviewed_at >= :inicio and reviewed_at < :fim) as recusados
```

Consulta `TL(dep)` (lista):

```sql
select t.id, d.name as origem, t.title,
  to_char(tr.created_at at time zone 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') as enviado_sp,
  floor(extract(epoch from (now() - tr.created_at)) / 60) as minutos
from ticket_transfer tr
join department d on d.id = tr.from_department_id
join ticket t on t.id = tr.ticket_id
where tr.to_department_id = :dep and tr.status = 'pendente'
order by tr.created_at asc, tr.id asc
limit 5
```

"Há X" esperado a partir de `minutos` (`m`): `m < 1` → `agora`; senão `há ` +
o formato de duração da Etapa 1 (`{m}min`, `{h}h {min}min`, `{d}d {h}h`, sem a
parte zerada). Tolerância de 1 min entre a consulta e o render. Destaque
esperado em todo item com `m ≥ 240`.

| #    | Quem    | Ação                                                                                                           | Esperado                                                                                                                                                                                                                                                                                                                         |
| ---- | ------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TR1  | A       | `/dashboard` Hoje, 1280 px                                                                                     | abaixo da linha 2, card "Transferências entre setores" na coluna da direita (~2/5, mesma largura e posição horizontal de "Maiores atrasos"); à esquerda, nada (nem placeholder nem esqueleto). Linhas 1 e 2 iguais às das Etapas 1 e 2                                                                                           |
| TR2  | A       | Hoje                                                                                                           | 3 mini-cards na ordem Aguardando nosso aceite · Enviados, pendentes · Recusados por outros, com `TS(S, hoje)`; "Aguardando" = número do selo de Aprovações no menu (`0` se não houver selo)                                                                                                                                      |
| TR3  | A       | Semana, Mês, Personalizado de 3 dias com hoje, 2026-01-01                                                      | só "Recusados" muda, = `recusados` de `TS(S, …)`; "Aguardando", "Enviados" e a lista iguais em todos os períodos; o card não mostra esqueleto na troca                                                                                                                                                                           |
| TR4  | A       | Mini-card de recusados                                                                                         | texto "no período" visível entre o rótulo e o número; os outros dois sem essa marca; os três números na mesma linha de base                                                                                                                                                                                                      |
| TR5  | A       | Tons                                                                                                           | "Aguardando" com fundo e número `warning` se `aguardando > 0`, neutro se `0`; "Recusados" com número `warning` se `> 0`, neutro se `0`; "Enviados" sempre neutro                                                                                                                                                                 |
| TR6  | A       | Lista                                                                                                          | itens = `TL(S)`, mesma ordem (mais antigo em cima), `#id` mono discreto + `de {origem}`, "há X" à direita conforme a regra acima; `title` do item = título do chamado; `title` do "há X" = `enviado_sp`                                                                                                                          |
| TR7  | A       | Destaque                                                                                                       | itens com `m ≥ 240` com o "há X" em `warning` e texto acessível "Aguardando aceite há 4h ou mais"; itens com `m < 240` sem. Se nenhum item cruzar o limite (ou não houver itens) em nenhum setor acessível: NÃO EXECUTADO, com a consulta                                                                                        |
| TR8  | A       | Clicar num item da lista                                                                                       | `/tickets/{id}?from=approvals&periodo=todos`, detalhe do chamado certo; o link de retorno rotulado "Aprovações" leva a Aprovações                                                                                                                                                                                                |
| TR9  | A       | Clicar "Ver em Aprovações"                                                                                     | `/approvals?periodo=todos`; os chamados da lista estão em Aprovações                                                                                                                                                                                                                                                             |
| TR10 | M       | `/dashboard` Hoje                                                                                              | mesmos números e lista de A (o card é do setor, não do papel)                                                                                                                                                                                                                                                                    |
| TR11 | D       | `/dashboard` Hoje e Mês                                                                                        | números = `TS(DIR, …)`, lista = `TL(DIR)`; nada de Suporte                                                                                                                                                                                                                                                                       |
| TR12 | todos   | Setor com `aguardando = 0` (conferir pela consulta)                                                            | `Nenhum chamado aguardando aceite` + descrição, sem lista; "Aguardando" neutro com `0`; link "Ver em Aprovações" presente. Se nenhum setor acessível tiver `aguardando = 0`: NÃO EXECUTADO, com a consulta                                                                                                                       |
| TR13 | M, A, D | Só se TR2/TR3 não tiverem mostrado nenhum valor diferente de 0 em "Enviados" ou "Recusados": preparação mínima | M cria `[QA] Transferências 1` em Suporte e o envia para a Diretoria → A e M veem "Enviados" +1; D vê "Aguardando" +1 e o item `agora`/`há {m}min` na lista (no fim, por ser o mais novo, se houver menos de 5 pendentes). D recusa com motivo → A vê "Recusados" +1 em Hoje e "Enviados" −1; D vê "Aguardando" −1 e o item some |
| TR14 | A       | 1024 px                                                                                                        | card em largura total abaixo da linha 2; mini-cards lado a lado; sem rolagem horizontal                                                                                                                                                                                                                                          |
| TR15 | A       | 390×844                                                                                                        | mini-cards lado a lado (3 colunas), rótulos em até 2 linhas sem `…`, números inteiros; nome do setor de origem trunca, "há X" inteiro; sem rolagem horizontal                                                                                                                                                                    |
| TR16 | todos   | toda a bateria                                                                                                 | console e dev server sem erro nem aviso de hidratação; linhas 1 e 2 continuam conforme OV e RW                                                                                                                                                                                                                                   |

Notas para não reportar como defeito:

- "Recusados por outros" conta pela data da recusa (`reviewed_at`), não pela
  do envio.
- Transferência `cancelado` não aparece em contador nenhum.
- A lista para em 5 mesmo que "Aguardando" seja maior.
- "Há X" não atualiza sozinho com a página aberta.
- A coluna esquerda vazia em `xl+` é esperada até a 3b.

### Critério de pronto da Etapa 3a

1. Card na direita da linha 3 em `xl+`, largura total abaixo; esquerda vazia
   sem placeholder.
2. Contadores e lista iguais a `TS`/`TL`; "Aguardando" = selo; só "Recusados"
   segue o período (TR3) e mostra a marca (TR4).
3. Tons, destaque e vazio conforme TR5, TR7 e TR12; links conforme TR8 e TR9.
4. 390 px sem rolagem horizontal.
5. Nenhum literal de status de transferência no SQL novo (usa
   `PENDING_TRANSFER_STATUS`/`REJECTED_TRANSFER_STATUS`); nada da 3b no diff.
6. `npx tsc --noEmit`, `npm run lint`, `npm run build`; `df-reviewer` sem
   bloqueante; `df-qa` aprova TR1–TR16.

### Checklist da Etapa 3a

- [x] `elapsedMs`, `formatElapsed`; tipos de transferência do Início; `PENDING_TRANSFER_STATUS`; textos, limite, destaque e tons em `dashboard.ts`; `TRANSFERS_APPROVALS_HREF` e `incomingTransferTicketHref`; esta seção e o plano (`df-architect`)
- [x] `findTransferSummary` e `listOldestIncomingTransfers`, com `EXPLAIN` na resposta (`df-data`; Seq Scan em `ticket_transfer` com 52 linhas, < 0,2 ms, sem índice novo)
- [x] Linha 3 (só a direita), card, mini-cards, lista, vazio, esqueleto (`df-ui`)
- [x] `npx tsc --noEmit`, `npm run lint`, `npm run build`; `df-reviewer` (aprovado com atenções, nenhum bloqueante)
- [x] Cenários TR1–TR16 (`df-qa`: 13 de 16, 0 falhas, 3 não executados; `docs/test-reports/2026-10-23-dashboard-transfers.md`)

### Limites conhecidos da Etapa 3a

- **TR11 e TR12 não executados.** O login do Diretor foi recusado na rodada
  do `df-qa`, e a Diretoria é o único setor acessível com `aguardando = 0`.
  Os valores esperados (`TS(11)` = 0 / 3 / 0 em Mês, `TL(11)` vazia, tela de
  vazio com "Aguardando" neutro e link "Ver em Aprovações") estão anotados no
  relatório para quando o Diretor puder entrar.
- **TR13 desnecessário.** Era preparação condicional; TR2/TR3 já mostraram
  valores diferentes de 0, então a condição não se aplicou.
- **TR5–TR7 cobertos em parte.** Suporte tinha uma só transferência
  pendente, parada há 7d 23h. Não foram observados na tela: "Aguardando"
  neutro com `0`, a ordem com vários itens, item recente sem destaque (e o
  formato `agora`/`há {m}min`) e o limite de 5 itens.

Etapa 3a concluída em 2026-10-23, aguardando commit.
