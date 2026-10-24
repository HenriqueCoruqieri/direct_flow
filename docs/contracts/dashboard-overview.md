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

> **Revisão 2026-10-23 — substitui a taxa desta etapa.** `resolvedTicketCount`
> e `resolutionRatePercent` saem: a taxa passa a ser resolvidos no período
> (por `resolved_at`, a coorte do tempo médio) ÷ recebidos no período
> (chamados distintos abertos no setor ou aceitos por ele no período,
> `periodReceivedCount`), sem teto em 100%. Ver "Revisão
> 2026-10-23 — taxa de resolução sobre o que o setor recebeu", no fim do
> documento.

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

> **Revisão 2026-10-24.** O link do Nº passa a ser
> `dashboardTicketDetailHref(selection, id)` (origem `dashboard`). Ver
> "Revisão 2026-10-24 — voltar do chamado para o Início", no fim do documento.

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

> **Revisão 2026-10-24 — substitui o parágrafo acima.** `incomingTransferTicketHref`
> passa a ser `(selection: PeriodSelection, ticketId: number) => string` e usa a
> origem `dashboard`: o voltar leva ao Início no mesmo período, não a
> Aprovações. Ver "Revisão 2026-10-24 — voltar do chamado para o Início", no
> fim do documento. O TR8 abaixo fica substituído pelo VD3.

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

Etapa 3a concluída e comitada em 2026-10-23 (`0b69f4d`).

---

## Etapa 3b — linha 3, esquerda: Últimos 7 dias

> Revista em 2026-10-24: o card passou a seguir o período e se chama
> "Abertos × resolvidos". Onde as duas divergem, vale a seção "Revisão
> 2026-10-24 — o gráfico da linha 3 segue o período", no fim deste documento.

Gráfico de linhas com duas séries (Abertos × Resolvidos), um ponto por dia, de
6 dias atrás até hoje. Regras de gráfico: linha "Gráficos" da tabela e
parágrafo "**Gráficos:**" da seção 1 de `.claude/rules/stack.md`; trecho
"Gráficos" de `.claude/agents/df-ui.md`. Nada das linhas 1 e 2 nem do card de
transferências muda.

### Tabelas, enums e migration

**Nenhuma mudança de schema. Nenhuma migration.** O fluxo lê:

- `ticket` — `id`, `current_department_id`, `status`, `created_at`, `resolved_at`
- enum `ticket_status`

Índice que atende: `ticket_dept_status_idx`
(`current_department_id, status, created_at desc`), pelo prefixo
`current_department_id`. `resolved_at` continua sem índice e filtra as linhas
do setor (como na Etapa 1). Nenhum índice novo; se o `EXPLAIN` mostrar
problema, reporte.

### Definições

| Série      | Por dia `d` (fuso SP, `[início de d, início de d+1)`)                                                                   |
| ---------- | ----------------------------------------------------------------------------------------------------------------------- |
| Abertos    | `count` de `ticket` com `current_department_id` = setor e `created_at` em `d`, **todos os status**                      |
| Resolvidos | `count` de `ticket` com `current_department_id` = setor, `resolved_at` em `d` e status em `DASHBOARD_RESOLVED_STATUSES` |

- 7 pontos sempre: hoje e os 6 dias anteriores. Dia sem chamado vale `0`.
- **Não segue o filtro de período.** Hoje é o dia do `now` da página.
- **Resolvidos filtra status `resolvido`/`fechado`**, como o tempo médio da
  Etapa 1: as duas métricas olham a mesma coorte ("resolvido em `d`"), e um
  chamado com `resolved_at` preenchido mas de volta a um status ativo não conta
  como resolvido em nenhum dos dois cards.
- Abertos segue o card "Chamados no período" (todos os status, inclusive
  `cancelado` e `aguardando_aprovacao`): a soma dos 7 pontos de Abertos é igual
  ao "Chamados no período" de um Personalizado com os mesmos 7 dias.
- Escopo por `current_department_id`, como toda a página: chamado aberto em
  outro setor e transferido para cá conta como aberto aqui no dia em que foi
  criado lá.
- Vazio = **todos** os 14 valores em `0` (`isDailyActivityEmpty`). Basta um
  valor `> 0` em qualquer série para o gráfico aparecer.

### Datas — `app/_lib/date.ts` (acréscimo)

```ts
export const lastDayWindows: (count: number, now?: DateInput) => DayWindow[]
export const formatWeekdayDay: (key: DateKey) => string
export const formatWeekdayLong: (key: DateKey) => string
```

`DayWindow` em `app/_lib/types/period.ts`:

```ts
export interface DayWindow extends DateRange {
  key: DateKey
}
```

| Função              | Semântica                                                                                                                                                                                                      |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lastDayWindows`    | `count` dias terminando em hoje (fuso SP), **do mais antigo para hoje**; cada um com `key` (`YYYY-MM-DD`), `start` = `zonedDateTime(key)` e `end` = `zonedDateTime(key + 1 dia)`. `count` truncado, mínimo `1` |
| `formatWeekdayDay`  | `2026-10-09` → `Sex 9`: dia da semana abreviado do locale `pt-br` com a primeira letra maiúscula, dia sem zero à esquerda (`Sáb 10`, `Dom 11`)                                                                 |
| `formatWeekdayLong` | `2026-10-09` → `sexta-feira, 9 de outubro`. Para tooltip e leitor de tela, onde `Sex 9` soa mal                                                                                                                |

As bordas vêm de `zonedDateTime`/`addDaysToKey` (risco 6 do plano): nada de
`date_trunc` nem `at time zone` no SQL da aplicação. O Brasil não tem horário
de verão desde 2019, mas a borda é calculada dia a dia, então um dia de 23h ou
25h continuaria certo.

### Tipos — `app/_lib/types/dashboard.ts` (acréscimo)

```ts
export type DashboardDailyActivitySeries = "opened" | "resolved"

export interface DashboardDailyCount {
  key: DateKey
  openedCount: number
  resolvedCount: number
}

export interface DashboardDailyActivityPoint {
  key: DateKey
  label: string
  longLabel: string
  opened: number
  resolved: number
}
```

- `DashboardDailyCount` é o que o `df-data` devolve (uma linha por dia).
- `DashboardDailyActivityPoint` é o ponto que o componente do gráfico recebe.
  As chaves `opened`/`resolved` são as de `DashboardDailyActivitySeries`, para
  servirem de `dataKey` do Recharts e de chave do `ChartConfig` sem mapa
  intermediário. `label` vai no eixo X; `longLabel` no tooltip e na tabela
  acessível.

### Domínio — `app/_lib/domain/dashboard.ts` (acréscimo)

```ts
export const DAILY_ACTIVITY_DAYS = 7
export const DAILY_ACTIVITY_CARD_LABEL = `Últimos ${DAILY_ACTIVITY_DAYS} dias`
export const DAILY_ACTIVITY_LOADING_LABEL = `Carregando últimos ${DAILY_ACTIVITY_DAYS} dias`
export const DAILY_ACTIVITY_SERIES: readonly ["opened", "resolved"]
export const DAILY_ACTIVITY_SERIES_LABELS: Record<
  DashboardDailyActivitySeries,
  string
>
export const DAILY_ACTIVITY_SERIES_COLORS: Record<
  DashboardDailyActivitySeries,
  string
>
export const DAILY_ACTIVITY_DAY_COLUMN_LABEL = "Dia"
export const DAILY_ACTIVITY_TODAY_LABEL = "Hoje"
export const EMPTY_DAILY_ACTIVITY_TITLE: string
export const EMPTY_DAILY_ACTIVITY_DESCRIPTION: string

export const dailyActivityDayLabel: (key: DateKey, today: DateKey) => string
export const buildDailyActivitySeries: (
  days: readonly DayWindow[],
  counts: readonly DashboardDailyCount[],
  today: DateKey,
) => DashboardDailyActivityPoint[]
export const isDailyActivityEmpty: (
  points: readonly DashboardDailyActivityPoint[],
) => boolean
```

| Nome                               | Semântica                                                                                                                                                                                   |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DAILY_ACTIVITY_DAYS`              | 7. O título, o rótulo de carregamento e o texto do vazio são montados a partir dela                                                                                                         |
| `DAILY_ACTIVITY_LOADING_LABEL`     | `Carregando últimos 7 dias`. `aria-label` do esqueleto do card                                                                                                                              |
| `DAILY_ACTIVITY_SERIES`            | Ordem das séries na legenda, no tooltip e nas colunas da tabela acessível: `opened`, `resolved`                                                                                             |
| `DAILY_ACTIVITY_SERIES_LABELS`     | `opened` → `Abertos` · `resolved` → `Resolvidos`                                                                                                                                            |
| `DAILY_ACTIVITY_SERIES_COLORS`     | `opened` → `var(--status-aberto)` (azul) · `resolved` → `var(--status-resolvido)` (verde). Tokens do tema com valor claro e escuro em `app/globals.css`; ver "Por que não `--chart-N`"      |
| `DAILY_ACTIVITY_DAY_COLUMN_LABEL`  | Cabeçalho da coluna de dia na tabela acessível                                                                                                                                              |
| `DAILY_ACTIVITY_TODAY_LABEL`       | Rótulo do último ponto no eixo X                                                                                                                                                            |
| `EMPTY_DAILY_ACTIVITY_TITLE`       | `Nenhum chamado aberto ou resolvido nos últimos 7 dias`                                                                                                                                     |
| `EMPTY_DAILY_ACTIVITY_DESCRIPTION` | `Os chamados abertos e resolvidos no setor aparecem aqui, dia a dia.`                                                                                                                       |
| `dailyActivityDayLabel`            | `key === today` → `Hoje`; senão `formatWeekdayDay(key)`                                                                                                                                     |
| `buildDailyActivitySeries`         | Um ponto por item de `days`, **na ordem de `days`**; contagem casada por `key`; dia sem linha em `counts` vale `0` (negativo vale `0`); linha de `counts` sem dia correspondente é ignorada |
| `isDailyActivityEmpty`             | `true` se todos os pontos têm `opened = 0` e `resolved = 0` (lista vazia também é `true`)                                                                                                   |

**Por que não `--chart-N`.** `--chart-1` já é `var(--status-aberto)`, mas
`--chart-2` é `--status-em-andamento` (verde-azulado), não o verde de
resolvido. Usar os tokens de status direto liga a cor ao significado (o azul de
"Abertos" é o do selo `aberto`, o verde de "Resolvidos" é o do selo
`resolvido`) e não obriga a mexer na paleta `--chart-*`. Os dois têm variante
escura. Se a paleta de gráficos for redesenhada, a troca é só nesta constante.

### `df-data` — `app/_lib/data/dashboard.ts`

```ts
export async function listDailyActivity(
  departmentId: number,
  days: readonly DayWindow[],
): Promise<DashboardDailyCount[]>
```

Recebe as janelas prontas de `lastDayWindows` (não recebe `now` nem calcula
borda). `days` vazio → `[]`, sem consulta.

**Decisão: `values` com as bordas vindas de `date.ts` + `left join`, não
`generate_series` nem `group by` de data.** `generate_series` e
`group by (created_at at time zone …)::date` poriam o fuso e o corte do dia
dentro do SQL, contra o risco 6 do plano e o ADR 009 (a borda de dia tem uma
fonte só, `app/_lib/date.ts`). Com `values`, o SQL só compara instantes com
`>=`/`<`, como todas as outras leituras do Início, e devolve uma linha por dia
mesmo sem chamado (o `left join` garante os zeros; o domínio ainda completa,
por segurança). É uma consulta só, com uma varredura das linhas do setor.

```sql
select d.day_key,
  count(t.id) filter (
    where t.created_at >= d.day_start and t.created_at < d.day_end
  )::int as opened_count,
  count(t.id) filter (
    where t.resolved_at >= d.day_start and t.resolved_at < d.day_end
      and t.status in (:DASHBOARD_RESOLVED_STATUSES)
  )::int as resolved_count
from (values
  ($key0::text, $start0::timestamptz, $end0::timestamptz),
  …
  ($key6::text, $start6::timestamptz, $end6::timestamptz)
) as d(day_key, day_start, day_end)
left join ticket t
  on t.current_department_id = $departmentId
  and (
    (t.created_at >= d.day_start and t.created_at < d.day_end)
    or (t.resolved_at >= d.day_start and t.resolved_at < d.day_end)
  )
group by d.day_key
order by d.day_key
```

- Linhas do `values` montadas com `sql.join` sobre `days`, cada uma
  `(${day.key}::text, ${day.start}::timestamptz, ${day.end}::timestamptz)`
  no template `sql`. Não passar array JS dentro do `sql` esperando `unnest`: o
  Drizzle expande array como lista de parâmetros, não como array do Postgres.
- Status de `DASHBOARD_RESOLVED_STATUSES` via `inArray` ou `sql`
  parametrizado, nunca literal.
- `count(t.id)`, não `count(*)`: no dia sem chamado o `left join` traz uma
  linha com `t` nulo, que `count(t.id)` conta como 0.
- O `or` no `on` é necessário: um chamado criado num dia e resolvido em outro
  entra nos dois dias, cada vez numa série; criado e resolvido no mesmo dia
  entra uma vez e conta nas duas.
- `count` como `int` (o `pg` entrega `bigint` como string).
- Ordem por `day_key` (texto `YYYY-MM-DD` ordena como data).
- Rodar `EXPLAIN ANALYZE` para Suporte (14) e Diretoria (11) e colar na
  resposta. O `or` pode levar o planner a um Seq Scan em `ticket`; com o volume
  atual, aceito abaixo de alguns ms. Reportar linhas e tempo.

### `df-actions`, `df-auth`, `df-email`

**Nada.** Sem mutação.

### `df-ui` — o que fazer

**Instalar o primitivo**: `npx shadcn@latest add chart` (traz `recharts` e cria
`app/_components/ui/chart.tsx`). Depois, trocar o import do `cn` para
`@/app/_lib/utils` e conferir se o CLI tocou em `app/globals.css` (as
variáveis `--chart-1`…`--chart-5` já existem; se o CLI acrescentou ou
sobrescreveu algo, reverter para o que estava). Antes de usar a API, consultar
o `context7` na versão do `recharts` instalada.

**Arquivos** em `app/(app)/dashboard/_components/` (nomes sugeridos):

- `dashboard-daily-activity.tsx` — Server Component: lê, monta a série,
  desenha cabeçalho, tabela acessível e vazio;
- `daily-activity-chart.tsx` — `"use client"`, só o gráfico;
- `dashboard-daily-activity-skeleton.tsx`.

`page.tsx`: o card entra como **primeiro filho** da grade da linha 3
(`xl:col-span-3`); o card de transferências não muda (o `xl:col-start-4` pode
ficar ou sair).

**Leitura** (Server Component), com o mesmo `now` da página:

```ts
const days = lastDayWindows(DAILY_ACTIVITY_DAYS, now)
const counts = await listDailyActivity(departmentId, days)
const points = buildDailyActivitySeries(days, counts, todayKey(now))
```

O componente cliente recebe `points` por props (só `string` e `number`,
serializáveis), não importa `app/_lib/data/` nem `app/_lib/auth/` e não chama
função de data para montar rótulo: os rótulos chegam prontos, o que também
evita divergência de hidratação pelo fuso do navegador.

**Um `Suspense`, sem `key` de período**, com o esqueleto. O card não depende do
período; sem `key` o React mantém o gráfico na troca de filtro em vez de piscar
o esqueleto (mesmo motivo de atrasos e transferências).

**Cabeçalho**: `DAILY_ACTIVITY_CARD_LABEL` à esquerda, no mesmo estilo de
título dos outros cards (`DashboardPanel` e cabeçalhos já existentes). À
direita, a legenda: um item por série, na ordem de `DAILY_ACTIVITY_SERIES`, com
um traço curto (~12 px) na cor da série e o rótulo de
`DAILY_ACTIVITY_SERIES_LABELS` em texto. Pode ser o `ChartLegend` do primitivo
ou marcação própria no cabeçalho; se for própria, o traço é `aria-hidden`. Em
390 px a legenda pode quebrar para baixo do título; nunca truncar.

**Gráfico** (`ChartContainer` + `LineChart` e elementos do `recharts`):

- `ChartConfig` montado das constantes do domínio: `opened` →
  `{ label: DAILY_ACTIVITY_SERIES_LABELS.opened, color: DAILY_ACTIVITY_SERIES_COLORS.opened }`,
  idem `resolved`. Na `Line`, `stroke="var(--color-opened)"` /
  `"var(--color-resolved)"` (as variáveis que o `ChartContainer` cria a partir
  do config). Nenhum hex.
- Duas `Line` (`type` `monotone` ou `linear`, decisão do `df-ui`),
  `dataKey="opened"` e `dataKey="resolved"`, traço ~2 px, **sem** ponto nos dias
  intermediários (`dot={false}`) e `isAnimationActive={false}` (o componente
  recebe props de novo a cada troca de filtro; animação repetindo seria
  ruído).
- **Último ponto**: só no índice `points.length - 1`, um marcador (círculo
  cheio na cor da série, ~4 px de raio, contorno na cor da superfície do card)
  e o valor em rótulo (`LabelList` com `content` que só desenha no último
  índice, ou `dot` customizado), `tabular-nums`, pequeno. Abertos **acima** do
  ponto e Resolvidos **abaixo**, para não se sobreporem quando os valores forem
  iguais ou próximos. Valor `0` também mostra o rótulo.
- **Eixo X**: `dataKey="label"`, sem linha de eixo nem tick mark, texto
  pequeno `text-muted-foreground`, **os 7 rótulos sempre visíveis**
  (`interval={0}`), "Hoje" no fim. Margem lateral suficiente para "Hoje" e o
  rótulo do último ponto não serem cortados.
- **Eixo Y**: à esquerda, `allowDecimals={false}`, começando em 0
  (`domain={[0, "auto"]}` ou equivalente), sem linha de eixo, ticks discretos
  `text-muted-foreground`, largura para 2–3 dígitos.
- **Grade**: `CartesianGrid vertical={false}`, só horizontais, traço fino na
  cor de borda do tema (token).
- **Tooltip**: `ChartTooltip` + `ChartTooltipContent` do primitivo; título =
  `longLabel` do ponto (via `labelFormatter` lendo o payload), uma linha por
  série com rótulo e valor.

**Acessibilidade** — o gráfico não pode ser a única forma do dado:

- O SVG fica fora da árvore de acessibilidade (`aria-hidden="true"` no
  contêiner do gráfico). Escolha `aria-hidden` + tabela, não `role="img"`.
- Junto, uma `table` dentro de uma `<div className="sr-only">`, com
  `caption` = `DAILY_ACTIVITY_CARD_LABEL`, cabeçalhos
  `DAILY_ACTIVITY_DAY_COLUMN_LABEL` · `Abertos` · `Resolvidos` (na ordem de
  `DAILY_ACTIVITY_SERIES`), uma linha por ponto: `longLabel` do dia e os dois
  números. Pode ficar no Server Component.
- O `sr-only` fica na `<div>` em volta, **nunca** direto no `<table>`: com
  `display: table` o navegador não aplica `width: 1px` nem `overflow: hidden`,
  a tabela mantém a largura do conteúdo e alargava a página a 390 px (falha
  LD10 do `df-qa`, `docs/test-reports/2026-10-23-dashboard-daily-activity.md`;
  corrigido em `app/(app)/dashboard/_components/dashboard-daily-activity.tsx`).
- A legenda tem texto; cor nunca é a única diferença entre as séries.

**Vazio** (`isDailyActivityEmpty(points)`): cabeçalho com o título e **sem**
legenda; no lugar do gráfico, `EMPTY_DAILY_ACTIVITY_TITLE` +
`EMPTY_DAILY_ACTIVITY_DESCRIPTION`, texto pequeno e neutro como os outros
vazios, centralizado na área do gráfico (que mantém a altura mínima, para o
card não encolher). Sem gráfico e sem tabela `sr-only`. Motivo de não desenhar
as linhas em zero: duas retas no 0 com eixo `0–0` parecem gráfico quebrado e
não dizem nada além do texto.

**Altura (regra contra o card de transferências).**

- Em `xl+` as duas colunas da linha 3 têm a mesma altura (stretch do grid) e os
  dois cards são `h-full`. O card do gráfico é `flex flex-col`; a área do
  gráfico é `relative flex-1 min-h-56` e o `ChartContainer` fica
  `absolute inset-0` com `aspect-auto` (tirando o `aspect-video` padrão do
  primitivo). Assim o SVG ocupa a altura que sobrar e **não** contribui com
  altura intrínseca para a linha: sem isso o `ResponsiveContainer` do Recharts
  pode entrar em laço de medição e esticar a linha.
- Em `xl+` quem dita a altura da linha é o card de transferências (cabeçalho, 3
  mini-cards e até 5 itens). Com transferências vazio ou curto, dita o mínimo
  do gráfico (`min-h-56`, 224 px de área).
- Critério a 1280 px: os dois cards com a mesma altura externa; no card do
  gráfico, entre o eixo X e a borda inferior só o padding (nenhum vão); nenhum
  dos dois com rolagem.
- Abaixo de `xl`: largura total, área com a altura mínima, acima do card de
  transferências.
- Nunca altura fixa em px no card nem `overflow-hidden` cortando eixo ou
  rótulo. `INCOMING_TRANSFERS_LIMIT` continua 5; se a medição pedir outro
  número, o `df-ui` reporta e o `df-architect` muda a constante.

**Esqueleto**: cabeçalho (título e dois blocos curtos de legenda) e um bloco da
altura mínima da área do gráfico; `aria-busy` e
`aria-label={DAILY_ACTIVITY_LOADING_LABEL}`, nunca o texto escrito à mão; mesmo `xl:col-span-3` e `h-full`
em `xl+`, para a grade não pular.

**Responsivo**: 390 px sem rolagem horizontal, os 7 rótulos do eixo X
visíveis. Se colidirem mesmo com fonte pequena, o `df-ui` reporta a largura
medida em vez de esconder rótulo ou trocar o formato (formato novo é helper
novo em `app/_lib/date.ts`).

### Riscos da Etapa 3b

1. **Abertos por `current_department_id`.** Chamado transferido para cá conta
   no dia em que foi criado lá; transferido para fora sai do histórico daqui. É
   a regra da página inteira; registrado para o `df-qa` não tratar como
   defeito.
2. **Gráfico congelado.** "Hoje" é o dia do render; com a página aberta na
   virada do dia, o gráfico só anda na próxima navegação.
3. **Recharts no cliente.** Primeira biblioteca de gráfico do projeto, no
   bundle do Início. Aceito (decisão do usuário, regra no `stack.md`).
4. **Rótulos do eixo em 390 px.** Sete rótulos de até 6 caracteres em ~300 px
   de plotagem: cabe com fonte de 11–12 px, mas é o ponto mais provável de
   ajuste.

### Cenários do `df-qa`

Contas fornecidas pelo orquestrador: `D` = Diretor (Diretoria, `DIR` = 11; o
login foi recusado na última rodada — se continuar, os cenários de `D` ficam
NÃO EXECUTADO com a consulta e os valores esperados no relatório), `A` =
Administrador de Suporte, `M` = Membro de Suporte (`S` = 14). **Só leitura**:
nenhum cenário cria, altera ou resolve chamado.

Consulta `DA(dep)`, uma linha por dia, do mais antigo para hoje:

```sql
with dias as (
  select ((now() at time zone 'America/Sao_Paulo')::date - (6 - n)) as dia
  from generate_series(0, 6) as n
)
select
  d.dia,
  (select count(*) from ticket t
    where t.current_department_id = :dep
      and t.created_at >= d.dia::timestamp at time zone 'America/Sao_Paulo'
      and t.created_at < (d.dia + 1)::timestamp at time zone 'America/Sao_Paulo'
  ) as abertos,
  (select count(*) from ticket t
    where t.current_department_id = :dep
      and t.status in ('resolvido', 'fechado')
      and t.resolved_at >= d.dia::timestamp at time zone 'America/Sao_Paulo'
      and t.resolved_at < (d.dia + 1)::timestamp at time zone 'America/Sao_Paulo'
  ) as resolvidos
from dias d
order by d.dia
```

(`generate_series` e `at time zone` aqui são só da conferência; a aplicação não
os usa.) Rótulo esperado por `dia`: `Dom` `Seg` `Ter` `Qua` `Qui` `Sex` `Sáb` +
dia do mês sem zero; o último é `Hoje`. Exemplo para 2026-10-23 (sexta):
`Sáb 17 · Dom 18 · Seg 19 · Ter 20 · Qua 21 · Qui 22 · Hoje`.

| #    | Quem  | Ação                                                     | Esperado                                                                                                                                                                                                 |
| ---- | ----- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LD1  | A     | `/dashboard` Hoje, 1280 px                               | linha 3: "Últimos 7 dias" à esquerda (~3/5), "Transferências entre setores" à direita (~2/5), alinhados com os cards da linha 2. Linhas 1 e 2 e o card de transferências iguais aos das Etapas 1, 2 e 3a |
| LD2  | A     | Cabeçalho                                                | título "Últimos 7 dias" à esquerda; legenda à direita com "Abertos" (traço azul) e "Resolvidos" (traço verde), nessa ordem, com texto visível                                                            |
| LD3  | A     | Eixo X                                                   | 7 rótulos, do mais antigo à esquerda até "Hoje" à direita, iguais aos esperados a partir de `DA(S)`; nenhum escondido nem cortado                                                                        |
| LD4  | A     | Valores por dia (tooltip em cada dia e tabela acessível) | `abertos`/`resolvidos` de cada dia = `DA(S)`; dia sem chamado = `0`; tooltip com a data por extenso (`sexta-feira, 16 de outubro`)                                                                       |
| LD5  | A     | Último ponto                                             | marcador por série só no ponto "Hoje" (nenhum nos outros dias) e os valores de hoje em rótulo, Abertos acima e Resolvidos abaixo, sem sobreposição; `0` aparece se o valor for 0                         |
| LD6  | A     | Eixo Y, grade e cores                                    | marcas inteiras a partir de 0 (sem `0,5`); grade só horizontal, discreta; cor computada das linhas = `--status-aberto` e `--status-resolvido`                                                            |
| LD7  | A     | Trocar para Semana, Mês, Personalizado e voltar a Hoje   | o gráfico **não** muda e não mostra esqueleto; os outros cards seguem as regras deles                                                                                                                    |
| LD8  | A     | Altura a 1280 px                                         | os dois cards da linha 3 com a mesma altura externa; o gráfico ocupa a altura disponível, sem vão abaixo do eixo X além do padding; área ≥ 224 px; sem rolagem interna                                   |
| LD9  | A     | 1024 px                                                  | gráfico em largura total acima do card de transferências; área ≥ 224 px; sem rolagem horizontal                                                                                                          |
| LD10 | A     | 390×844                                                  | sem rolagem horizontal; os 7 rótulos do eixo X visíveis e legíveis; legenda pode quebrar abaixo do título, sem `…`; rótulos do último ponto inteiros                                                     |
| LD11 | A     | Acessibilidade                                           | o SVG fora da árvore de acessibilidade; tabela com caption "Últimos 7 dias", colunas Dia · Abertos · Resolvidos e 7 linhas = `DA(S)`, dia por extenso                                                    |
| LD12 | A     | Tema escuro (se houver alternância)                      | linhas azul e verde legíveis sobre a superfície escura; grade e eixos visíveis                                                                                                                           |
| LD13 | M     | `/dashboard` Hoje                                        | mesmo gráfico de A (é do setor, não do papel)                                                                                                                                                            |
| LD14 | D     | `/dashboard` Hoje                                        | valores = `DA(DIR)`; nada de Suporte. Login recusado: NÃO EXECUTADO, com `DA(11)` anotado                                                                                                                |
| LD15 | todos | Setor com `DA` inteiro em 0 (conferir pela consulta)     | sem legenda; "Nenhum chamado aberto ou resolvido nos últimos 7 dias" + descrição na área do gráfico, card sem encolher. Se nenhum setor acessível tiver a semana zerada: NÃO EXECUTADO, com a consulta   |
| LD16 | A     | Coerência com a linha 1                                  | Personalizado de 6 dias atrás até hoje: "Chamados no período" = soma de Abertos dos 7 pontos                                                                                                             |
| LD17 | todos | Toda a bateria                                           | console e dev server sem erro, sem aviso de hidratação e sem aviso do Recharts sobre largura/altura `0` ou `-1`; TR1–TR16 da 3a continuam valendo                                                        |

Notas para não reportar como defeito:

- O gráfico ignora o filtro de período (é sempre a última semana).
- Resolvidos conta pela data de resolução e só com status `resolvido`/`fechado`.
- Chamado criado e resolvido no mesmo dia conta nas duas séries daquele dia.
- Chamado transferido para o setor conta em Abertos no dia em que foi criado,
  mesmo que tenha chegado depois.

### Critério de pronto da Etapa 3b

1. Card à esquerda da linha 3 em `xl+`, largura total abaixo; transferências
   inalterado.
2. Os 14 valores iguais a `DA` (LD4) e rótulos do eixo conforme LD3.
3. Legenda, último ponto, eixos, grade e cores por token conforme LD2, LD5 e
   LD6; vazio conforme LD15; tabela acessível conforme LD11.
4. Altura conforme LD8; 390 px sem rolagem horizontal (LD10).
5. Recharts só dentro do `ChartContainer`; nenhum hex; componente do gráfico
   `"use client"` recebendo `points` prontos; nenhum `date_trunc` nem
   `at time zone` no SQL da aplicação; nenhum status literal no SQL.
6. `npx tsc --noEmit`, `npm run lint`, `npm run build`; `df-reviewer` sem
   bloqueante; `df-qa` aprova LD1–LD17 (LD14 e LD15 podem ficar NÃO EXECUTADO
   com a consulta).

### Checklist da Etapa 3b

- [x] `lastDayWindows`, `formatWeekdayDay`, `formatWeekdayLong`; `DayWindow`; tipos da série; constantes, cores, vazio, `dailyActivityDayLabel`, `buildDailyActivitySeries`, `isDailyActivityEmpty`; esta seção e o plano (`df-architect`)
- [x] `listDailyActivity`, com `EXPLAIN` na resposta (`df-data`: `Nested Loop Left Join` com `Join Filter` do `or` sobre Seq Scan filtrado pelo setor, ~0,2 ms com 223 chamados; sem índice novo)
- [x] `chart` instalado (`recharts@3.8.0` via `npx shadcn@latest add chart`, import do `cn` trocado), card, gráfico, legenda, último ponto, tabela acessível, vazio, esqueleto, linha 3 completa (`df-ui`)
- [x] `npx tsc --noEmit`, `npm run lint`, `npm run build`; `df-reviewer` (aprovado com atenções, todas tratadas)
- [x] Cenários LD1–LD17 (`df-qa`: 14 de 17 na primeira rodada, LD10 falho e corrigido; reteste do LD10 aprovado; LD14 e LD15 não executados; `docs/test-reports/2026-10-23-dashboard-daily-activity.md`)

### Limites conhecidos da Etapa 3b

- **LD14 e LD15 não executados.** O login do Diretor foi recusado de novo, e a
  Diretoria (`DA(11)`, os 7 dias em 0) é o único setor acessível com a semana
  zerada. O estado vazio do gráfico (sem legenda, título e descrição na área do
  gráfico, card sem encolher) ficou **sem validação no navegador**.
- **Casos não observados.** Nenhum dia com valor além de hoje e nenhum
  Resolvidos maior que 0 na semana de Suporte: a forma da linha com vários
  pontos não nulos e a série verde acima de 0 não foram vistas na tela.
- **Tooltip de "Hoje".** Como o último ponto fica na borda direita do plot, o
  tooltip de "Hoje" só abre com o cursor a ~4 px dessa borda. O valor de hoje
  continua visível no rótulo do último ponto e na tabela acessível.

Etapa 3b concluída em 2026-10-23, aguardando commit.

---

## Revisão 2026-10-24 — voltar do chamado para o Início

Pedido do usuário: o chamado aberto a partir do Início ("Maiores atrasos", da
Etapa 2, e a lista de "Transferências entre setores", da Etapa 3a) tem que
voltar para o **Início**, no mesmo período que estava selecionado. Antes,
"Maiores atrasos" linkava sem origem (o voltar caía em "Meus chamados") e
Transferências usava `from=approvals` (o voltar caía em Aprovações). A regra
passa a ser: o voltar leva para a tela de onde a pessoa saiu. Isso também vale
para Transferências, mesmo que o chamado pendente exista em Aprovações, porque
quem clicou estava no Início.

### Tipos — `app/_lib/types/ticket-detail-origin.ts`

```ts
export interface TicketDetailDashboardOrigin {
  source: "dashboard"
  period: PeriodSelection
}

export type TicketDetailOrigin =
  | TicketDetailMyTicketsOrigin
  | TicketDetailQueueOrigin
  | TicketDetailApprovalsOrigin
  | TicketDetailDashboardOrigin
```

`PeriodSelection`, e não `PeriodFilterSelection`: o Início não tem "Todos".

### Domínio

| Arquivo                                   | Acréscimo                                               |
| ----------------------------------------- | ------------------------------------------------------- |
| `app/_lib/domain/ticket-detail-origin.ts` | `TICKET_DETAIL_FROM_DASHBOARD = "dashboard"`            |
| `app/_lib/domain/dashboard.ts`            | `DASHBOARD_LABEL = "Início"` (rótulo do link de voltar) |

### Validação

```ts
// app/_lib/validation/dashboard.ts
export const dashboardHref: (selection: PeriodSelection) => string
export const dashboardTicketDetailHref: (
  selection: PeriodSelection,
  ticketId: number,
) => string
```

| Nome                        | Valor                                                                                   |
| --------------------------- | --------------------------------------------------------------------------------------- |
| `dashboardHref`             | `/dashboard?periodo=mes`; Personalizado → `/dashboard?periodo=personalizado&de=…&ate=…` |
| `dashboardTicketDetailHref` | `/tickets/{id}?from=dashboard&periodo=mes` (mesma serialização de período do Início)    |

`incomingTransferTicketHref` foi removido: só repassava para `dashboardTicketDetailHref`, que o item de transferência agora chama direto.

`app/_lib/validation/ticket-detail-origin.ts`:

- `parseTicketDetailOrigin`: `from=dashboard` →
  `{ source: "dashboard", period: parseDashboardParams(raw, today) }`. Período
  ausente ou inválido (inclusive `periodo=todos`) cai no padrão do Início,
  `Hoje`.
- `ticketDetailBackLinkFor`: origem `dashboard` →
  `{ href: dashboardHref(period), label: "Início" }`.
- `from=queue`, `from=approvals` e sem `from` (Meus chamados, busca do topo):
  sem mudança.

`validation/dashboard.ts` deixou de importar `validation/ticket-detail-origin.ts`
(monta o link com `ticketDetailPath` e as constantes de domínio); o import vai
agora no sentido contrário, sem ciclo.

### `df-data`, `df-actions`, `df-auth`, `df-email`

Nada.

### `df-ui` — o que fazer

1. `app/(app)/dashboard/page.tsx`: passar `selection` para `DashboardOverdue` e
   `DashboardTransfers` (e desta para cada `IncomingTransferItem`).
2. `dashboard-overdue.tsx:89`: `ticketDetailPath(ticket.id)` →
   `dashboardTicketDetailHref(selection, ticket.id)`.
3. `incoming-transfer-item.tsx:31`:
   `dashboardTicketDetailHref(selection, transfer.ticketId)`.
4. O link "Ver em Aprovações" do card (`TRANSFERS_APPROVALS_HREF`) e o
   `OVERDUE_QUEUE_HREF` não mudam.

### Cenários do `df-qa`

| #   | Papel | Passo                                                                                                                              | Esperado                                                                                                                                                                                     |
| --- | ----- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| VD1 | A     | `/dashboard?periodo=mes`, clicar no Nº de um chamado em "Maiores atrasos"; usar o link de voltar                                   | URL `/tickets/{id}?from=dashboard&periodo=mes`; link "Início" → `/dashboard?periodo=mes`, filtro em "Mês"                                                                                    |
| VD2 | A     | Mesmo de VD1 com Personalizado (ex.: dos últimos 10 dias até hoje)                                                                 | o voltar leva a `/dashboard?periodo=personalizado&de=…&ate=…` com as mesmas datas e o rótulo de intervalo igual                                                                              |
| VD3 | A     | `/dashboard?periodo=mes` e depois Personalizado; clicar num item de "Transferências entre setores"; voltar                         | URL com `from=dashboard` e o período; link "Início" volta ao Início no mesmo período (substitui o TR8)                                                                                       |
| VD4 | A     | `/tickets/{id}?from=dashboard&periodo=todos` à mão; depois abrir chamados por Meus chamados, Fila, Aprovações e pela busca do topo | o primeiro volta para `/dashboard?periodo=hoje`; os demais mantêm o voltar de antes ("Meus chamados", "Fila do setor" com aba e período, "Aprovações" com período, "Meus chamados" na busca) |

---

## Revisão 2026-10-24 — o gráfico da linha 3 segue o período

Pedido do usuário (opção A): o card da Etapa 3b, antes "Últimos 7 dias",
passa a **acompanhar o filtro de período** do Início. Esta seção **substitui**
as definições da Etapa 3b onde elas mudam; o que não está aqui (cores por
token, regra de altura, `aria-hidden` + tabela `sr-only` com o `sr-only` na
`<div>`, vazio sem legenda, `isAnimationActive={false}`, só `ChartContainer`)
continua valendo.

Sem mudança de schema, sem migration, sem índice novo.

### Definições

**Balde** é o intervalo `[start, end)` de um ponto do gráfico, em fuso SP
(ADR 009), com bordas vindas de `app/_lib/date.ts`. A granularidade depende só
do **intervalo resolvido** (`resolvePeriodRange`), não do nome do período:

| Dias no intervalo                                        | Granularidade | Pontos          | Quem cai aqui                                |
| -------------------------------------------------------- | ------------- | --------------- | -------------------------------------------- |
| 1                                                        | `hour`        | 24 (0h–23h)     | Hoje; Personalizado com `de = ate`           |
| 2 a 31 (`ACTIVITY_MAX_DAY_BUCKETS`)                      | `day`         | 2 a 31          | Semana (7), Mês (28–31), Personalizado curto |
| 32 ou mais, até 53 semanas (`ACTIVITY_MAX_WEEK_BUCKETS`) | `week`        | até 53          | Personalizado longo (até ~1 ano)             |
| mais de 53 semanas                                       | `month`       | 1 por mês civil | Personalizado de mais de ~1 ano              |

- **Personalizado de um dia vai por hora**, não por dia: um ponto só não
  desenha linha. É a extensão natural de "Hoje por hora" (um Personalizado de
  um dia é o mesmo recorte do Hoje, em outra data).
- **Teto de semanas: 53.** Acima disso (Personalizado de mais de um ano; a
  validação não limita o tamanho do intervalo, só impede terminar depois de
  hoje), por mês civil. Não há teto para meses: o custo da consulta é linear em
  baldes × chamados do setor (ver `df-data`), e 10 anos dão 120 pontos.
- **Semana de segunda a domingo** (`WEEK_STARTS_ON`, igual ao preset Semana).
  Nas pontas do Personalizado a semana é **cortada pelo intervalo**: o balde vai
  de `max(segunda, de)` a `min(domingo, ate)`, e o rótulo mostra só os dias
  cobertos (`1–2 ago`, `19–24 out`). O mesmo corte vale para o mês nas pontas.
- **Baldes futuros ficam no eixo, sem valor.** Semana e Mês cobrem a semana e o
  mês inteiros (`resolvePeriodRange`), e Hoje vai até 23h. Balde com
  `start > now` tem `opened`/`resolved` = `null`: o eixo X mostra o período
  inteiro (24 horas, 7 dias, o mês todo) e as linhas **param no balde atual**.
  Não `0`: zero numa hora que ainda não chegou afirma "nada aconteceu", o que é
  falso, e puxaria a linha para baixo no fim do gráfico. Não cortar o eixo: com
  corte, às 0h30 o Hoje teria 1 ponto (sem linha) e a forma do gráfico mudaria
  a cada hora. O balde atual (`start ≤ now < end`) é parcial e aparece com o que
  já aconteceu. O Personalizado não tem balde futuro (`ate ≤ hoje`, validação de
  `customPeriodSchema`).
- Séries **sem mudança**: Abertos = `created_at` no balde, todos os status;
  Resolvidos = `resolved_at` no balde e status em `DASHBOARD_RESOLVED_STATUSES`.
  Escopo `current_department_id`. Consequência: a **soma de Abertos de todos os
  pontos = "Chamados no período"** da linha 1, em qualquer período.
- Vazio: todos os valores registrados em `0` (os `null` não contam).

### Tipos

`app/_lib/types/period.ts` — `DayWindow` sai, entra:

```ts
export type TimeBucketGranularity = "hour" | "day" | "week" | "month"

export interface TimeBucket extends DateRange {
  key: string
}
```

`key` por granularidade, ordenável como texto e única no intervalo: `hour` →
`2026-10-24T14`; `day` → `2026-10-24`; `week` e `month` → o primeiro dia
**coberto** do balde (`2026-08-01` para a semana cortada de 1–2 ago,
`2026-08-03` para a seguinte).

`app/_lib/types/dashboard.ts` — renomeados (o nome "daily" ficou falso):

| Antes                          | Agora                     | Mudança                                   |
| ------------------------------ | ------------------------- | ----------------------------------------- |
| `DashboardDailyActivitySeries` | `DashboardActivitySeries` | só nome                                   |
| `DashboardDailyCount`          | `DashboardActivityCount`  | `key: string` (era `DateKey`, mesmo tipo) |
| `DashboardDailyActivityPoint`  | `DashboardActivityPoint`  | `opened`/`resolved`: `number \| null`     |

### Datas — `app/_lib/date.ts`

Sai `lastDayWindows` (sem outro uso). Ficam `formatWeekdayDay` e
`formatWeekdayLong`. Entram:

```ts
export const rangeDayCount: (range: DateRange) => number
export const rangeWeekCount: (range: DateRange) => number
export const timeBuckets: (
  range: DateRange,
  granularity: TimeBucketGranularity,
) => TimeBucket[]
export const formatTimeBucket: (
  bucket: TimeBucket,
  granularity: TimeBucketGranularity,
) => string
export const formatTimeBucketLong: (
  bucket: TimeBucket,
  granularity: TimeBucketGranularity,
) => string
```

| Função                 | Semântica                                                                                                                                                                                                                                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rangeDayCount`        | dias civis (SP) cobertos por `[start, end)`; `0` se vazio                                                                                                                                                                                                                                                     |
| `rangeWeekCount`       | semanas segunda–domingo tocadas pelo intervalo (2026-08-01 a 2026-10-24 → 13)                                                                                                                                                                                                                                 |
| `timeBuckets`          | baldes do mais antigo ao mais novo, cobrindo o intervalo sem buraco nem sobreposição; bordas por `zonedDateTime`/`addDaysToKey` (nada de fuso no SQL)                                                                                                                                                         |
| `formatTimeBucket`     | eixo X — `hour`: `14h`; `day`: `Sex 9`; `week`: `12–18 out`, `29 set–5 out`, `12 out` (balde de um dia); `month`: `out/26`                                                                                                                                                                                    |
| `formatTimeBucketLong` | tooltip e tabela — `hour`: `14h às 15h` (o último: `23h às 0h`); `day`: `sexta-feira, 9 de outubro`; `week`: `12 a 18 de outubro de 2026`, `29 de setembro a 5 de outubro de 2026`, `29 de dezembro de 2025 a 4 de janeiro de 2026`; `month` inteiro: `outubro de 2026`, cortado: `1 a 24 de outubro de 2026` |

O mês leva o ano no rótulo curto (`out/26`) e a semana não: o mês só aparece em
intervalo de mais de um ano, onde o mesmo mês se repete no eixo; a semana cobre
até um ano, e a linha do período embaixo do título dá o ano.

### Domínio — `app/_lib/domain/dashboard.ts`

Saem `DAILY_ACTIVITY_DAYS`, `DAILY_ACTIVITY_CARD_LABEL`,
`DAILY_ACTIVITY_LOADING_LABEL`, `DAILY_ACTIVITY_DAY_COLUMN_LABEL`,
`EMPTY_DAILY_ACTIVITY_TITLE`, `EMPTY_DAILY_ACTIVITY_DESCRIPTION`,
`dailyActivityDayLabel`, `buildDailyActivitySeries` e `isDailyActivityEmpty`.
Renomeados sem mudar valor: `DAILY_ACTIVITY_SERIES` → `ACTIVITY_SERIES`,
`DAILY_ACTIVITY_SERIES_LABELS` → `ACTIVITY_SERIES_LABELS`,
`DAILY_ACTIVITY_SERIES_COLORS` → `ACTIVITY_SERIES_COLORS`,
`DAILY_ACTIVITY_TODAY_LABEL` → `ACTIVITY_TODAY_LABEL`. Entram:

```ts
export const ACTIVITY_MAX_DAY_BUCKETS = 31
export const ACTIVITY_MAX_WEEK_BUCKETS = 53
export const ACTIVITY_CARD_LABEL = "Abertos × resolvidos"
export const ACTIVITY_LOADING_LABEL = "Carregando abertos × resolvidos"
export const ACTIVITY_GRANULARITY_LABELS: Record<TimeBucketGranularity, string>
export const ACTIVITY_BUCKET_COLUMN_LABELS: Record<
  TimeBucketGranularity,
  string
>
export const EMPTY_ACTIVITY_TITLE =
  "Nenhum chamado aberto ou resolvido no período"
export const EMPTY_ACTIVITY_DESCRIPTIONS: Record<TimeBucketGranularity, string>

export const activityGranularityFor: (range: DateRange) => TimeBucketGranularity
export const activityPeriodLabel: (
  range: DateRange,
  granularity: TimeBucketGranularity,
) => string
export const activityTableCaption: (
  range: DateRange,
  granularity: TimeBucketGranularity,
) => string
export const isFutureBucket: (bucket: TimeBucket, now: Date) => boolean
export const activityBucketLabel: (
  bucket: TimeBucket,
  granularity: TimeBucketGranularity,
  now: Date,
) => string
export const buildActivitySeries: (
  buckets: readonly TimeBucket[],
  granularity: TimeBucketGranularity,
  counts: readonly DashboardActivityCount[],
  now: Date,
) => DashboardActivityPoint[]
export const isRecordedActivityPoint: (point: DashboardActivityPoint) => boolean
export const recordedActivityPoints: (
  points: readonly DashboardActivityPoint[],
) => DashboardActivityPoint[]
export const activityLastPointIndex: (
  points: readonly DashboardActivityPoint[],
) => number
export const isActivityEmpty: (
  points: readonly DashboardActivityPoint[],
) => boolean
```

| Nome                            | Semântica                                                                                                                                                            |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ACTIVITY_GRANULARITY_LABELS`   | `por hora` · `por dia` · `por semana` · `por mês`                                                                                                                    |
| `ACTIVITY_BUCKET_COLUMN_LABELS` | primeira coluna da tabela acessível: `Hora` · `Dia` · `Semana` · `Mês` (era sempre `Dia`)                                                                            |
| `EMPTY_ACTIVITY_DESCRIPTIONS`   | `Os chamados abertos e resolvidos no setor aparecem aqui, hora a hora.` (e `dia a dia`, `semana a semana`, `mês a mês`)                                              |
| `activityGranularityFor`        | tabela das Definições: 1 dia → `hour`; ≤ 31 dias → `day`; ≤ 53 semanas → `week`; senão `month`                                                                       |
| `activityPeriodLabel`           | linha embaixo do título: `formatRangeLabel(range)` + `·` + granularidade — `24 out 2026 · por hora`, `19–25 out 2026 · por dia`, `1 ago – 24 out 2026 · por semana`  |
| `activityTableCaption`          | `caption` da tabela: `Abertos × resolvidos, 24 out 2026 · por hora`                                                                                                  |
| `isFutureBucket`                | `bucket.start > now`                                                                                                                                                 |
| `activityBucketLabel`           | `day` e o balde é hoje → `Hoje`; senão `formatTimeBucket`. A hora atual não ganha rótulo especial                                                                    |
| `buildActivitySeries`           | um ponto por balde, na ordem dos baldes; contagem casada por `key`; sem linha → `0`; negativo → `0`; balde futuro → `null` nas duas séries; linha sem balde ignorada |
| `isRecordedActivityPoint`       | `opened` e `resolved` não nulos (o balde já começou)                                                                                                                 |
| `recordedActivityPoints`        | só os pontos registrados, na ordem: linhas da tabela acessível (que não lista hora nem dia futuro)                                                                   |
| `activityLastPointIndex`        | índice do último ponto registrado (o balde atual em Hoje, Semana e Mês; o último no Personalizado); `-1` se nenhum. Onde vão o marcador e os rótulos de valor        |
| `isActivityEmpty`               | todos os pontos com `opened` e `resolved` em `0` ou `null` (lista vazia → `true`)                                                                                    |

### `df-data` — `app/_lib/data/dashboard.ts`

Renomear `listDailyActivity` → **`listActivityBuckets`**. O SQL serve como
está: já recebe `{ key, start, end }` genéricos e só compara instantes.

```ts
export async function listActivityBuckets(
  departmentId: number,
  buckets: readonly TimeBucket[],
): Promise<DashboardActivityCount[]>
```

- Trocar `DayWindow` → `TimeBucket` e `DashboardDailyCount` →
  `DashboardActivityCount`. Renomear os aliases do `values`
  (`day_key/day_start/day_end` → `bucket_key/bucket_start/bucket_end`) e o tipo
  da linha é opcional, só legibilidade.
- `buckets` vazio → `[]`, sem consulta. `order by` pela chave continua certo
  (as chaves ordenam como texto).
- **Custo.** O plano da 3b era `Nested Loop Left Join` com o `or` como
  `Join Filter` sobre as linhas do setor: o trabalho é baldes × chamados do
  setor. Hoje são 24 baldes, Mês até 31, Personalizado semanal até 53 e mensal
  sem teto. Com ~223 chamados no setor, 53 baldes ≈ 12 mil comparações. Rodar
  `EXPLAIN ANALYZE` com 24 baldes (Hoje) e com 53 (Personalizado de um ano)
  para Suporte (14) e colar na resposta. Se passar de alguns ms, reportar; a
  saída seria pré-filtrar as linhas do setor pelo intervalo inteiro
  (`min(start)`/`max(end)`) antes do `join`, sem mudar o resultado.

### `df-actions`, `df-auth`, `df-email`

Nada.

### `df-ui` — o que muda

Renomear os arquivos (`dashboard-daily-activity*.tsx`, `daily-activity-*.tsx`)
é opcional; os identificadores importados mudam conforme as tabelas acima.

**Leitura**, com o `range` e o `now` da página:

```ts
const granularity = activityGranularityFor(range)
const buckets = timeBuckets(range, granularity)
const counts = await listActivityBuckets(departmentId, buckets)
const points = buildActivitySeries(buckets, granularity, counts, now)
```

O card passa a receber `range` (além de `now`); o componente cliente continua
recebendo `points` prontos (agora `number | null`, ainda serializável).

**`Suspense` com `key={serializeDashboardParams(selection)}`**, como a linha 1
e "Principal ofensor": o card agora depende do período, e com a `key` o
esqueleto aparece na troca em vez de o gráfico antigo ficar na tela sob o
filtro novo. Atrasos e transferências continuam **sem** `key`.

**Cabeçalho**: título `ACTIVITY_CARD_LABEL` e, embaixo dele, em texto
secundário, `activityPeriodLabel(range, granularity)`. Legenda à direita como
antes; em 390 px pode quebrar para baixo, sem `…`. O esqueleto também recebe e
mostra o período (é síncrono, não depende da consulta), com
`aria-label={ACTIVITY_LOADING_LABEL}`.

**Gráfico**:

- `connectNulls` desligado (padrão): os baldes futuros (`null`) ficam como
  espaço vazio à direita, sem linha.
- **Último ponto** em `activityLastPointIndex(points)`, não mais em
  `points.length - 1` (em Hoje, Semana e Mês ele fica no meio do eixo). Mesmo
  desenho da 3b: Abertos acima, Resolvidos abaixo, `0` também rotulado.
- **Eixo X**: até 7 pontos, `interval={0}` (todos os rótulos, como na 3b). Com
  mais de 7 (Hoje 24, Mês, Personalizado), `interval="preserveStartEnd"` com
  `minTickGap` pequeno: o Recharts mede o texto e omite os rótulos que
  colidiriam, mantendo o primeiro e o último. Rótulo **omitido**, nunca cortado
  nem sobreposto; o valor de cada ponto continua no tooltip e na tabela. Margem
  direita suficiente para o último rótulo (`23h`, `Sáb 31`, `19–24 out`,
  `out/26`).
- **Tooltip**: título = `longLabel`. Em balde futuro, nenhum tooltip (nem `0`):
  o `content` devolve `null` quando o ponto não é registrado.
- Altura: sem mudança de regra. O cabeçalho ganha uma linha (o período); a área
  do gráfico continua `flex-1 min-h-56`, e em `xl+` quem dita a altura da linha
  continua sendo o card de transferências.

**Tabela acessível**: `caption` = `activityTableCaption(range, granularity)`;
primeira coluna `ACTIVITY_BUCKET_COLUMN_LABELS[granularity]`; linhas =
`recordedActivityPoints(points)` com `longLabel`. **Vazio**:
`EMPTY_ACTIVITY_TITLE` + `EMPTY_ACTIVITY_DESCRIPTIONS[granularity]`, mesmo
desenho da 3b.

### Riscos da revisão

1. **Rótulos omitidos com muitos pontos.** Com 24 a 53 pontos o eixo não mostra
   todos os rótulos em 390 px (nem em 1280 com 31 dias). É a escolha: omitir em
   vez de cortar.
2. **Alvo do tooltip estreito** com 31–53 pontos; aceito.
3. **Personalizado muito longo.** Sem teto de meses; um intervalo de décadas dá
   centenas de pontos mensais quase todos em zero. Não é caso real hoje.

### Cenários do `df-qa`

Contas: `A` = Administrador de Suporte, `M` = Membro de Suporte (`S` = 14).
**Só leitura.** Datas de exemplo para hoje = sábado, 2026-10-24.

Consulta `AH(dep, dia)` — por hora (`dia` = hoje no Hoje):

```sql
with horas as (
  select :dia::date + make_interval(hours => n) as ini
  from generate_series(0, 23) as n
)
select extract(hour from h.ini)::int as hora,
  (select count(*) from ticket t
    where t.current_department_id = :dep
      and t.created_at >= h.ini at time zone 'America/Sao_Paulo'
      and t.created_at < (h.ini + interval '1 hour') at time zone 'America/Sao_Paulo'
  ) as abertos,
  (select count(*) from ticket t
    where t.current_department_id = :dep
      and t.status in ('resolvido', 'fechado')
      and t.resolved_at >= h.ini at time zone 'America/Sao_Paulo'
      and t.resolved_at < (h.ini + interval '1 hour') at time zone 'America/Sao_Paulo'
  ) as resolvidos
from horas h
order by h.ini
```

Consulta `AD(dep, de, ate)` — por dia: a `DA` da 3b com
`select d::date as dia from generate_series(:de::date, :ate::date, interval '1 day') d`
no lugar do `with dias`.

Consulta `AW(dep, de, ate)` — por semana cortada:

```sql
with dias as (
  select d::date as dia
  from generate_series(:de::date, :ate::date, interval '1 day') d
), semanas as (
  select min(dia) as ini, max(dia) as fim from dias
  group by date_trunc('week', dia)
)
select s.ini, s.fim,
  (select count(*) from ticket t
    where t.current_department_id = :dep
      and t.created_at >= s.ini::timestamp at time zone 'America/Sao_Paulo'
      and t.created_at < (s.fim + 1)::timestamp at time zone 'America/Sao_Paulo'
  ) as abertos,
  (select count(*) from ticket t
    where t.current_department_id = :dep
      and t.status in ('resolvido', 'fechado')
      and t.resolved_at >= s.ini::timestamp at time zone 'America/Sao_Paulo'
      and t.resolved_at < (s.fim + 1)::timestamp at time zone 'America/Sao_Paulo'
  ) as resolvidos
from semanas s
order by s.ini
```

(`generate_series`, `date_trunc` e `at time zone` só na conferência; a
aplicação não os usa.)

| #    | Quem  | Ação                                                                                                     | Esperado                                                                                                                                                                                                                               |
| ---- | ----- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AP1  | A     | `/dashboard` Hoje, 1280 px                                                                               | título "Abertos × resolvidos"; embaixo `24 out 2026 · por hora`; legenda Abertos/Resolvidos se o setor teve chamado aberto ou resolvido hoje; se o período estiver vazio, vale AP15 (sem legenda)                                      |
| AP2  | A     | Hoje: eixo e valores                                                                                     | eixo de `0h` a `23h` (24 pontos; rótulos intermediários podem ser omitidos, nenhum cortado); tooltip `14h às 15h`; valores de cada hora até a atual = `AH(S, hoje)`; as linhas param na hora atual, nada desenhado nas horas seguintes |
| AP3  | A     | Hoje: último ponto e tabela                                                                              | marcador e valores na hora atual (não em `23h`); tabela acessível com caption `Abertos × resolvidos, 24 out 2026 · por hora`, coluna `Hora`, uma linha por hora de `0h` até a atual (nenhuma futura)                                   |
| AP4  | A     | Semana                                                                                                   | `19–25 out 2026 · por dia`; os 7 rótulos visíveis `Seg 19 · Ter 20 · Qua 21 · Qui 22 · Sex 23 · Hoje · Dom 25`; valores = `AD(S, 2026-10-19, 2026-10-24)`; nada desenhado no domingo; marcador em "Hoje"                               |
| AP5  | A     | Mês                                                                                                      | `1–31 out 2026 · por dia`; 31 pontos, rótulos omitidos sem corte, `Qui 1` e `Sáb 31` visíveis; valores = `AD(S, 2026-10-01, 2026-10-24)`; as linhas param em "Hoje"                                                                    |
| AP6  | A     | Personalizado 2026-10-10 a 2026-10-24                                                                    | `10–24 out 2026 · por dia`; 15 pontos de `Sáb 10` a `Hoje`; valores = `AD`; marcador no último                                                                                                                                         |
| AP7  | A     | Personalizado 2026-08-01 a 2026-10-24                                                                    | `1 ago – 24 out 2026 · por semana`; 13 pontos, primeiro `1–2 ago`, último `19–24 out`; tooltip `1 a 2 de agosto de 2026`; tabela com coluna `Semana`; valores = `AW(S, 2026-08-01, 2026-10-24)`                                        |
| AP8  | A     | Personalizado de um dia passado com chamado no setor (`AH(S, dia)` com algum valor > 0; ex.: 2026-10-23) | `<dia> · por hora` (ex.: `23 out 2026 · por hora`); 24 pontos, todos registrados (dia passado), marcador em `23h`; valores = `AH(S, dia)`. Dia sem chamado cai no vazio: é AP15, não AP8                                               |
| AP9  | A     | Coerência com a linha 1, em AP1, AP4, AP5, AP6 e AP7                                                     | soma de Abertos dos pontos (tabela acessível) = "Chamados no período"                                                                                                                                                                  |
| AP10 | A     | Trocar Hoje → Semana → Mês → Personalizado → Hoje                                                        | a cada troca o card mostra o esqueleto (com o período novo) e volta com título, linha do período e pontos do período novo; atrasos e transferências sem esqueleto                                                                      |
| AP11 | A     | 1280 px, cada período                                                                                    | os dois cards da linha 3 com a mesma altura externa; área do gráfico ≥ 224 px; sem rolagem interna                                                                                                                                     |
| AP12 | A     | 390×844, Hoje, Mês e AP7                                                                                 | sem rolagem horizontal; rótulos do eixo legíveis e não sobrepostos; título, período e legenda sem `…`; rótulos do último ponto inteiros                                                                                                |
| AP13 | A     | Passar o cursor em balde futuro (Hoje, hora seguinte; Mês, dia 31)                                       | nenhum tooltip, nenhum `0`                                                                                                                                                                                                             |
| AP14 | M     | `/dashboard` Hoje e Mês                                                                                  | mesmos pontos de A (é do setor, não do papel)                                                                                                                                                                                          |
| AP15 | todos | Período sem chamado do setor (ex.: Personalizado de um dia sem chamado, pela `AH`)                       | sem legenda; "Nenhum chamado aberto ou resolvido no período" + "…, hora a hora."; card sem encolher. Se não houver dia assim: NÃO EXECUTADO, com a consulta                                                                            |
| AP16 | todos | Toda a bateria                                                                                           | console e dev server sem erro, sem aviso de hidratação, sem aviso do Recharts de largura/altura `0`/`-1`; VD1–VD4 e TR1–TR16 continuam valendo                                                                                         |

LD3, LD4, LD7, LD11, LD13, LD15 e LD16 da 3b ficam **substituídos** por
AP2–AP15; LD7 ("não muda com o período") deixa de valer. Notas para não
reportar como defeito: rótulo do eixo omitido com muitos pontos (o valor está
no tooltip e na tabela); semana cortada nas pontas do Personalizado;
Personalizado de um dia por hora; nada desenhado nos baldes futuros.

### Checklist da revisão

- [x] `TimeBucket`, `TimeBucketGranularity`, tipos renomeados; `rangeDayCount`, `rangeWeekCount`, `timeBuckets`, `formatTimeBucket`, `formatTimeBucketLong`; constantes, `activityGranularityFor`, `buildActivitySeries` e auxiliares; esta seção e o plano (`df-architect`)
- [x] `listActivityBuckets`, com `EXPLAIN` de 24 e 53 baldes (`df-data`): `Nested Loop Left Join` com o `or` como `Join Filter` sobre Seq Scan filtrado pelo setor 14, 0,17 ms com 24 baldes e 0,27 ms com 53; sem pré-filtro
- [x] card com `range`, `Suspense` com `key`, período no cabeçalho e no esqueleto, último ponto, eixo, tooltip, tabela (`df-ui`)
- [x] `npx tsc --noEmit`, `npm run lint`, `npm run build`; `df-reviewer` (aprovado com atenções, só de processo)
- [x] AP1–AP16 (`df-qa`): 14 de 16, 0 falhas, AP2 e AP3 não executados — `docs/test-reports/2026-10-24-dashboard-activity-period.md`

### Limites conhecidos

1. **AP2 e AP3 não executados.** Suporte não tinha chamado aberto nem resolvido
   no dia do teste, então Hoje só mostrou o vazio. A granularidade por hora foi
   coberta em parte pelo dia passado 2026-10-23 (AP8: 24 pontos, tooltips e
   valores); o balde atual no meio do eixo por hora não foi visto. Rodar de
   novo quando o setor tiver atividade no dia.
2. **Esqueleto só em carga direta ou recarga.** No clique do filtro o Next
   mantém a tela antiga até a resposta chegar (a navegação é uma transition) e
   o fallback do `Suspense` com `key` não aparece. É comportamento da
   navegação, não do `Suspense`, e vale igual para a linha 1 e "Principal
   ofensor". AP10 conta como aprovado pela troca de conteúdo, sem exigir o
   esqueleto no clique.
3. **Cosméticos aceitos.** Cursor vertical do Recharts sobre balde futuro, sem
   tooltip (AP13 continua valendo: nenhum tooltip, nenhum `0`); eixo por hora
   com rótulos densos e espaçamento irregular (`preserveStartEnd`); curva
   `monotone` com sobrepasso entre pontos.

## Revisão 2026-10-23 — taxa de resolução sobre o que o setor recebeu

Mudança de regra aprovada pelo usuário, sem `/consult`. A taxa da Etapa 1 era
coorte (dos chamados **abertos** no período, quantos estão resolvidos) e não
responde "o setor dá conta do que entra?": no teste, 3 abertos e 4 resolvidos
num dia deram 50%. Esta seção **substitui** a definição da taxa da Etapa 1
(campo `resolvedTicketCount`, função `resolutionRatePercent`, linha "Taxa de
resolução" da tabela de cards, coluna `resolvidos` da consulta `OV`, a parte
da taxa em OV7 e OV10). O card 1 ("Chamados no período"), os cards 3 e 4 e o
gráfico **não mudam**.

Sem mudança de schema, sem migration, sem índice novo.

### Definições

| Termo                     | Definição                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Recebidos no período**  | Chamados **distintos** que entraram no setor no período: abertos no setor (`ticket.origin_department_id` = setor e `created_at` no período, todos os status) **ou** aceitos de outro setor (`ticket_transfer` `aprovado`, `to_department_id` = setor, `reviewed_at` no período). União por `ticket.id`: cada chamado conta uma vez. Transferência pendente não entra |
| **Resolvidos no período** | Chamados do setor com `resolved_at` no período e status em `DASHBOARD_RESOLVED_STATUSES` (`resolvido`, `fechado`). Reaberto sai da conta enquanto estiver reaberto. Mesma coorte do "Tempo médio de resolução" e da série "Resolvidos" do gráfico                                                                                                                    |
| **Taxa**                  | `floor(resolvidos × 100 / recebidos)`. **Pode passar de 100%** (o setor resolveu estoque de períodos anteriores)                                                                                                                                                                                                                                                     |

O "Y" de "X resolvidos de Y" é calculado no banco (`periodReceivedCount`) e
**não** é `ticketCount + receivedTransferCount`. Ele difere do card 1, e isso é
aceito: o card 1 ("Chamados no período" e "+N recebidos") não muda e continua
contando por `current_department_id`.

Casos de borda da união:

| Caso                                                                              | Conta em "recebidos" do setor?                                                              |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Aberto em outro setor, enviado e aceito pelo setor no mesmo período               | **uma** vez (pelo aceite)                                                                   |
| Aberto no setor e transferido para fora no mesmo período                          | **sim**, no setor de origem (pela abertura); e também no destino, se ele aceitar no período |
| Aberto no setor, enviado para fora e devolvido (aceito de volta) no mesmo período | **uma** vez                                                                                 |
| Aberto em outro setor e enviado ao setor, ainda pendente                          | não (no card 1 já conta)                                                                    |
| Aceito no período, aberto em período anterior                                     | sim (pelo aceite)                                                                           |
| Dois aceites do mesmo chamado pelo setor no período (ida, volta e nova ida)       | **uma** vez                                                                                 |

"Resolvidos" continua por `current_department_id`: um chamado aberto no setor e
transferido para fora conta como recebido na origem e, se resolvido, como
resolvido no destino.

### Tipos — `app/_lib/types/dashboard.ts`

`resolvedTicketCount` **sai** (só a taxa usava). Entram `periodReceivedCount`,
`periodResolvedCount` e o resultado da taxa:

```ts
export interface DashboardOverview {
  ticketCount: number
  receivedTransferCount: number
  periodReceivedCount: number
  periodResolvedCount: number
  averageResolutionMs: number | null
  backlogCount: number
}

export interface DashboardMeasuredResolutionRate {
  kind: "measured"
  percent: number
  barPercent: number
  resolvedCount: number
  receivedCount: number
}

export interface DashboardUnreceivedResolutionRate {
  kind: "unreceived"
  resolvedCount: number
}

export interface DashboardEmptyResolutionRate {
  kind: "empty"
}

export type DashboardResolutionRate =
  | DashboardMeasuredResolutionRate
  | DashboardUnreceivedResolutionRate
  | DashboardEmptyResolutionRate
```

| Campo                 | Definição                                                                                           |
| --------------------- | --------------------------------------------------------------------------------------------------- |
| `periodReceivedCount` | Recebidos no período (definição acima), chamados distintos, calculado no banco                      |
| `periodResolvedCount` | Resolvidos no período (definição acima). `averageResolutionMs === null` ⇔ `periodResolvedCount = 0` |

### Domínio — `app/_lib/domain/dashboard.ts`

`resolutionRatePercent` **sai**. Entram:

```ts
export const RESOLUTION_BAR_MAX_PERCENT = 100
export const resolutionRateFor: (
  overview: DashboardOverview,
) => DashboardResolutionRate
export const resolvedOfReceivedHint: (
  resolvedCount: number,
  receivedCount: number,
) => string
export const resolvedWithoutReceivedHint: (resolvedCount: number) => string
```

`formatResolutionRate` e `NO_TICKETS_IN_PERIOD_HINT` continuam.

| Nome                          | Semântica                                                                                                                                                                                                                                                                                |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `resolutionRateFor`           | `received = periodReceivedCount`, `resolved = periodResolvedCount` (negativos valem 0). `received > 0` → `measured`, `percent = floor(resolved × 100 / received)` **sem teto**, `barPercent = min(percent, 100)`. `received = 0` e `resolved > 0` → `unreceived`. Os dois zero → `empty` |
| `resolvedOfReceivedHint`      | `(4, 8)` → `4 resolvidos de 8`; `(1, 3)` → `1 resolvido de 3`; `(0, 5)` → `0 resolvidos de 5`. Singular só em `resolved = 1`; o `Y` vai sem substantivo                                                                                                                                  |
| `resolvedWithoutReceivedHint` | `2` → `2 resolvidos, nenhum recebido`; `1` → `1 resolvido, nenhum recebido`                                                                                                                                                                                                              |
| `RESOLUTION_BAR_MAX_PERCENT`  | `100`: teto da largura da barra e `aria-valuemax`                                                                                                                                                                                                                                        |

O percentual multiplica antes de dividir (`resolved × 100 / received`) para não
errar por ponto flutuante: `29 / 100 × 100` dá `28,999…` e cairia para `28%`.
`tagVolumePercent` (Etapa 2) passa a usar a mesma conta interna; o resultado só
muda nos casos que antes saíam um ponto abaixo do certo.

### `df-data` — `app/_lib/data/dashboard.ts`

Em `findDashboardOverview`, no agregado de `ticket`, `resolvedTicketCount`
(coorte por `created_at`) **sai** e entra `periodResolvedCount`, com o
**mesmo** filtro do `avg` do tempo médio:

```sql
count(*) filter (
  where t.resolved_at >= $start and t.resolved_at < $end
    and t.status in (:DASHBOARD_RESOLVED_STATUSES)
)::int as period_resolved_count
```

Em Drizzle, um `sql<number>` com `(count(*) filter (where ${resolvedInRange}
and ${isResolvedStatus}))::int`, reaproveitando os dois predicados que já
existem na função. Sem linha → `periodResolvedCount: 0`.

**Terceira leitura, `periodReceivedCount`**, no mesmo `Promise.all`: contagem
da **união distinta** das duas origens. `union` (não `union all`) é o que
elimina o repetido:

```sql
select count(*)::int as period_received_count
from (
  select t.id as ticket_id
  from ticket t
  where t.origin_department_id = $departmentId
    and t.created_at >= $start and t.created_at < $end
  union
  select tr.ticket_id
  from ticket_transfer tr
  where tr.to_department_id = $departmentId
    and tr.status = 'aprovado'
    and tr.reviewed_at >= $start and tr.reviewed_at < $end
) as received
```

- Em Drizzle: `union` de `drizzle-orm/pg-core` sobre os dois `select`, com
  `.as("received")` e `count()` por fora (ou `sql` parametrizado equivalente).
  Consultar o `context7` para a forma da versão instalada.
- `'aprovado'` como literal tipado, igual à leitura de aceites que já existe.
- Intervalo meio-aberto; `reviewed_at` nulo nunca passa.
- Sem linha → `periodReceivedCount: 0`.
- A leitura de aceites (`receivedTransferCount`) continua como está: é o
  "+N recebidos" do card 1.
- Índices: `ticket_origin_department_idx` (só `origin_department_id`) e
  `transfer_inbox_idx` (`to_department_id`, `status`, `created_at`). Sem índice
  novo; rodar `EXPLAIN ANALYZE` da leitura nova para QA Suporte e a Diretoria
  e colar na resposta.

### `df-actions`, `df-auth`, `df-email`

Nada.

### `df-ui` — o que muda

`dashboard-overview.tsx`: a fórmula sai da UI. `const rate =
resolutionRateFor(overview)` e decisão por `rate.kind`:

| `rate.kind`  | Valor grande                                                  | Embaixo do valor                                                                                                          |
| ------------ | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `measured`   | `formatResolutionRate(rate.percent)` (valor real, ex. `133%`) | barra com largura `rate.barPercent%` **e**, abaixo dela, `resolvedOfReceivedHint(rate.resolvedCount, rate.receivedCount)` |
| `unreceived` | `EMPTY_VALUE_LABEL` (`—`)                                     | `resolvedWithoutReceivedHint(rate.resolvedCount)`, sem barra                                                              |
| `empty`      | `EMPTY_VALUE_LABEL` (`—`)                                     | `NO_TICKETS_IN_PERIOD_HINT`, sem barra (como hoje)                                                                        |

`resolution-progress.tsx` (barra):

- largura = `barPercent` (nunca acima de 100%);
- `role="progressbar"`, `aria-label` = rótulo do card, `aria-valuemin={0}`,
  `aria-valuemax={RESOLUTION_BAR_MAX_PERCENT}`, `aria-valuenow={barPercent}`
  (o ARIA exige `valuenow` dentro de `[min, max]`) e
  `aria-valuetext={formatResolutionRate(percent)}` com o valor **real**: o
  leitor de tela anuncia `133%`, nunca `100%`. Até 100 os dois coincidem.
  A barra recebe as duas grandezas (`percent` e `barPercent`) por props.

**Altura.** A altura externa dos 4 cards da linha 1 continua a de hoje, igual
entre eles, e o esqueleto não muda. A linha de apoio do `StatCard` é `h-5`
(20 px); barra e texto cabem nela empilhados: barra `h-1` (4 px) em cima,
`StatHint` (`text-xs`, altura de linha 16 px) embaixo, sem `gap` — 4 + 16 = 20. Basta o `footer` do card 2 ser uma coluna (`w-full`) com
`ResolutionProgress` + `StatHint`; `StatCard` e `StatHint` não mudam. Se o
desenho pedir mais respiro, a alternativa permitida é aumentar a linha de apoio
**dos 4** cards e do esqueleto juntos, nunca só a do card 2. O texto trunca
com `title`, como os outros.

### Exemplos

"Abertos no setor" é por `origin_department_id`; "Aceitas" são os chamados
aceitos no período que **não** estão entre os abertos (a união já descontou o
repetido).

**Os exemplos do usuário com a regra nova.** Os números do usuário vinham do
card 1 (`current_department_id`), não da união. Eles continuam valendo nas
condições abaixo; fora delas, o valor muda pelo motivo indicado.

- **Semana, 8 recebidos e 4 resolvidos (50%):** vale se os 6 do card 1 foram
  abertos no próprio setor e as 2 aceitas são de chamados abertos antes da
  semana. Se as 2 aceitas foram abertas **na semana** em outro setor, elas já
  estavam entre os 6 do card 1 (o envio troca o `current_department_id`); os
  abertos no setor são 4, os recebidos são 6 e a taxa é **66%** (linha "Semana,
  aceitas abertas na própria semana"). Os recebidos também sobem se o setor
  abriu chamados na semana e os transferiu para fora: eles saem do card 1 e
  continuam contando aqui.
- **Dia, 3 recebidos e 4 resolvidos (133%):** com 0 aceites, vale se os 3 do
  card 1 foram abertos no próprio setor e nenhum chamado aberto no setor nesse
  dia foi transferido para fora; cada um transferido soma 1 aos recebidos (com
  um, `4 resolvidos de 4`, 100%). Um chamado de outro setor enviado ao setor e
  ainda pendente está nos 3 do card 1 mas não nos recebidos (com um, `4
resolvidos de 2`, 200%).

O `df-qa` confirma os dois casos reais com a consulta `RR` (RR1).

| Caso                                      | Abertos no setor | Aceitas | Recebidos | Resolvidos | Valor  | Barra     | Linha                           |
| ----------------------------------------- | ---------------- | ------- | --------- | ---------- | ------ | --------- | ------------------------------- |
| Semana do usuário                         | 6                | 2       | 8         | 4          | `50%`  | metade    | `4 resolvidos de 8`             |
| Semana, aceitas abertas na própria semana | 4                | 2       | 6         | 4          | `66%`  | 66%       | `4 resolvidos de 6`             |
| Dia do teste                              | 3                | 0       | 3         | 4          | `133%` | cheia     | `4 resolvidos de 3`             |
| Só estoque, nada entrou                   | 0                | 0       | 0         | 2          | `—`    | sem barra | `2 resolvidos, nenhum recebido` |
| Um resolvido, nada entrou                 | 0                | 0       | 0         | 1          | `—`    | sem barra | `1 resolvido, nenhum recebido`  |
| Um resolvido de três                      | 3                | 0       | 3         | 1          | `33%`  | 33%       | `1 resolvido de 3`              |
| Entrou, nada resolvido                    | 5                | 0       | 5         | 0          | `0%`   | vazia     | `0 resolvidos de 5`             |
| Período vazio                             | 0                | 0       | 0         | 0          | `—`    | sem barra | `Nenhum chamado no período`     |
| Arredondamento                            | 200              | 0       | 200       | 199        | `99%`  | 99%       | `199 resolvidos de 200`         |

### Cenários do `df-qa`

Mesmas contas, bordas de período e preparação da Etapa 1. Consulta `RR(dep,
inicio, fim)`:

```sql
with abertos as (
  select t.id from ticket t
  where t.origin_department_id = :dep
    and t.created_at >= :inicio and t.created_at < :fim
), aceitos as (
  select tr.ticket_id as id from ticket_transfer tr
  where tr.to_department_id = :dep and tr.status = 'aprovado'
    and tr.reviewed_at >= :inicio and tr.reviewed_at < :fim
)
select
  (select count(*) from abertos) as abertos,
  (select count(distinct id) from aceitos) as aceitos,
  (select count(*) from (select id from abertos union select id from aceitos) u)
    as recebidos,
  (select count(*) from ticket t
    where t.current_department_id = :dep
      and t.status in ('resolvido', 'fechado')
      and t.resolved_at >= :inicio and t.resolved_at < :fim) as resolvidos
```

Taxa = `floor(resolvidos × 100 / recebidos)`. `recebidos ≤ abertos + aceitos`;
a diferença é o repetido que a união descontou.

| #    | Quem  | Ação                                                                             | Esperado                                                                                                                                                                                                                                                                                                                    |
| ---- | ----- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RR1  | A     | `/dashboard` Hoje, Semana, Mês e Personalizado de 3 dias                         | valor = taxa de `RR(S, …)` (pode passar de 100%); linha `{resolvidos} resolvido(s) de {recebidos}`; card 1 continua igual a `OV`/`RT` da Etapa 1 (não a `abertos`/`aceitos` desta consulta)                                                                                                                                 |
| RR2  | A     | Período com `resolvidos > recebidos > 0` (procurar com `RR`; ex. o dia do teste) | valor acima de `100%` (ex. `133%`), barra cheia sem passar do trilho; `aria-valuenow="100"`, `aria-valuemax="100"`, `aria-valuetext` com o valor real (`133%`). Se não houver período assim: NÃO EXECUTADO, com a consulta                                                                                                  |
| RR3  | A     | Período com `recebidos > 0` e `resolvidos ≤ recebidos`                           | largura da barra = `%`; `aria-valuenow` = número de `aria-valuetext`                                                                                                                                                                                                                                                        |
| RR4  | A     | Personalizado num dia com `recebidos = 0` e `resolvidos > 0` (procurar com `RR`) | `—`, sem barra, `{N} resolvido(s), nenhum recebido` (singular em 1). Se não houver dia assim: NÃO EXECUTADO, com a consulta                                                                                                                                                                                                 |
| RR5  | A     | Personalizado num dia sem nada (OV6)                                             | `—` + `Nenhum chamado no período`, sem barra                                                                                                                                                                                                                                                                                |
| RR6  | A     | Preparação da Etapa 1, Hoje antes/depois                                         | `#V1` (criado e resolvido hoje em QA Suporte): recebidos de A +1 e resolvidos +1. `#V2` (aberto em QA Infra): recebidos de A **não** mudam no envio (pendente) e sobem **+1** no aceite, resolvidos igual. Para I, `#V2` conta +1 em recebidos de QA Infra desde a abertura e continua contando depois do aceite em Suporte |
| RR7  | A     | Coerência no mesmo período                                                       | `X` da linha = soma da série Resolvidos do gráfico (tabela acessível), contando **até hoje**: o gráfico não mostra baldes futuros, então em Semana e Mês a comparação vale para a parte do período até hoje; card 3 em `—` ⇔ `X = 0`                                                                                        |
| RR8  | A     | 1280, 1024 e 390 px, em período com dados e com `—`                              | os cards da mesma linha da grade com a mesma altura externa, igual à de antes da revisão e à do esqueleto; linha da taxa inteira ou truncada com `title`; sem rolagem horizontal                                                                                                                                            |
| RR9  | I, D  | `/dashboard` Hoje e Mês                                                          | bate com `RR(F, …)` e `RR(DIR, …)`                                                                                                                                                                                                                                                                                          |
| RR10 | todos | toda a bateria                                                                   | console e dev server sem erro nem aviso de hidratação                                                                                                                                                                                                                                                                       |

A parte da taxa em OV7 e OV10 fica **substituída** por RR1–RR6; a coluna
`resolvidos` da consulta `OV` deixa de valer. Notas para não reportar como
defeito: taxa acima de 100%; `Y` diferente do card 1; chamado aberto no setor
e transferido para fora no período contando como recebido na origem (e, se
aceito no período, também no destino).

### Checklist da revisão

- [x] `periodReceivedCount`, `periodResolvedCount` e `DashboardResolutionRate` nos tipos; `resolutionRateFor`, `resolvedOfReceivedHint`, `resolvedWithoutReceivedHint`, `RESOLUTION_BAR_MAX_PERCENT`; `resolutionRatePercent` fora; esta seção e o plano (`df-architect`)
- [x] `periodResolvedCount` no lugar de `resolvedTicketCount` e leitura nova `periodReceivedCount` (união distinta, com `EXPLAIN`) em `findDashboardOverview`, filtro de aceite compartilhado em `acceptedInRange` (`df-data`). `EXPLAIN`: união com Bitmap Index Scan em `ticket_origin_department_idx` + Seq Scan em `ticket_transfer`, ~0,15 ms para Suporte e Diretoria, sem índice novo
- [x] card 2 com `resolutionRateFor`, barra limitada, `aria-valuetext` real, linha nova na mesma altura (`df-ui`)
- [x] `npx tsc --noEmit`, `npm run lint`, `npm run build`; `df-reviewer` APROVADO COM ATENÇÕES (DRY em `findDashboardOverview`, corrigido com `acceptedInRange`; `EXPLAIN` colado acima)
- [x] RR1–RR10 (`df-qa`): 7 de 10, 0 falhas; RR4, RR6 e RR9 não executados (`docs/test-reports/2026-10-23-dashboard-resolution-rate.md`)

### Limites conhecidos da revisão

- **RR4 não executado.** O Suporte não tem dia com `recebidos = 0` e `resolvidos > 0`; o cenário fica para quando houver um chamado aberto em outro dia e resolvido no setor.
- **RR6 e RR9 não executados.** Dependem de contas de QA Infra (`#V2`, I) e do Diretor (D), não fornecidas.
- **Relógio do banco 24 h à frente do da máquina do app** no momento do teste (`now()` do banco 2026-10-25 01:01 UTC × máquina 2026-10-24 01:03 UTC). Chamado novo ganha `created_at` no dia seguinte ao "Hoje" do app, o que distorce testes de "hoje" e a comparação de RR7 em Semana e Mês. É de ambiente, não da regra; alinhar os relógios antes de testar com chamados novos.
