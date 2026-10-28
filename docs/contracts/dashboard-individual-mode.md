# Contrato — Início: modo Individual

Plano: `docs/plans/dashboard-individual-mode.md` (aprovado em 2026-10-27).
Regras do Coletivo: `docs/contracts/dashboard-overview.md` — continuam valendo
sem mudança, inclusive a taxa da revisão de 2026-10-23 e as revisões de
2026-10-26 do Backlog. Fuso: ADR 009.

Versões observadas: `next@16.3.5`, `zod@4.6.5`, `dayjs@1.11.23`,
`drizzle-orm@0.45.2`.

---

## Etapa 1 — switch e linha 1

### O que muda e o que não muda

- Entra o switch "Coletivo | Individual" e a linha 1 (os quatro indicadores)
  passa a ter as duas versões.
- Linhas 2 e 3 (Principal ofensor, Maiores atrasos, gráfico, Transferências)
  **não mudam** nesta etapa: no Individual continuam mostrando o Coletivo.
- URL, filtro de período, esqueletos, ordem e altura dos cards: iguais.

### Tabelas, enums e migration

Sem mudança de schema, sem migration, sem índice novo. Colunas lidas:
`ticket.assigned_to` (índice `ticket_assigned_to_idx`), `ticket.current_department_id`,
`ticket.origin_department_id`, `ticket.status`, `ticket.created_at`,
`ticket.resolved_at`, `ticket.priority`, `ticket_transfer.to_department_id`,
`ticket_transfer.status`, `ticket_transfer.reviewed_at`,
`ticket_transfer.reviewed_by` (índice `transfer_reviewed_by_idx`).

### Definições (Individual, "eu" = usuário da sessão)

| Termo                   | Definição                                                                                                                                                                                                                                                                                                                    |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Meu**                 | `ticket.assigned_to` = eu, entre os chamados do setor da sessão (`current_department_id` = setor). É o destinatário **atual**, não o histórico                                                                                                                                                                               |
| **Chamados no período** | meus, com `created_at` no período (todos os status)                                                                                                                                                                                                                                                                          |
| **+N aceitos por você** | `ticket_transfer` `aprovado`, `to_department_id` = setor, `reviewed_at` no período **e** `reviewed_by` = eu. Não é parcela do total, como no Coletivo                                                                                                                                                                        |
| **Recebidos por mim**   | os **recebidos do setor** (regra de 2026-10-23: abertos no setor por `origin_department_id` **ou** aceitos de outro setor, união distinta por `ticket.id`) que são **meus** hoje: `ticket.assigned_to` = eu **e** `ticket.current_department_id` = setor, nos dois ramos da união. É a mesma definição de "meu" do numerador |
| **Resolvidos por mim**  | meus, `resolved_at` no período e status em `DASHBOARD_RESOLVED_STATUSES`                                                                                                                                                                                                                                                     |
| **Taxa**                | `floor(resolvidos por mim × 100 / recebidos por mim)`, pela mesma `resolutionRateFor`. Pode passar de 100%                                                                                                                                                                                                                   |
| **Tempo médio**         | média de `resolved_at − created_at` dos resolvidos por mim                                                                                                                                                                                                                                                                   |
| **Backlog**             | meus, status em `BACKLOG_TICKET_STATUSES`; valor = quantos estão em atraso; linha de apoio = soma da idade dos meus em backlog                                                                                                                                                                                               |

Por que "recebidos por mim" usa o destinatário atual e não o histórico de
atribuição (`ticket_history.to_assignee_id`): mantém a mesma definição de "meu"
de todos os outros cards e sai na mesma consulta da união que já existe, sem
ler o histórico. Consequências aceitas:

| Caso                                                                                         | Recebidos por mim?                                                                                  |
| -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Aberto no setor no período e hoje destinado a mim, ainda no setor                            | sim                                                                                                 |
| Aceito por mim no período (o aceite me torna destinatário)                                   | sim                                                                                                 |
| Aceito por mim e depois repassado a um colega                                                | não (conta no "+N" do card 1, mas não na taxa)                                                      |
| Aberto ou aceito no setor, destinado a mim e depois transferido para fora                    | não, mesmo que `assigned_to` ainda fosse eu: `current_department_id` saiu do setor                  |
| Aberto no setor e enviado a outro setor para uma pessoa específica, ainda pendente (c956bc5) | não para ninguém: o chamado já está no setor de destino com `assigned_to` nulo até o aceite         |
| O mesmo envio, depois de aceito pela pessoa indicada                                         | no setor de destino, sim para quem aceitou (ramo dos aceites); no setor de origem, não para ninguém |
| Aberto no setor sem destinatário e resolvido por mim (vira meu)                              | sim                                                                                                 |

Numerador e denominador usam o mesmo "meu" (`assigned_to` = eu **e**
`current_department_id` = setor). Sem a condição de setor no denominador, um
chamado que saiu do setor e por qualquer motivo ainda apontasse para mim
contaria como recebido e nunca como resolvido, puxando a taxa para baixo.

### Tipos — `app/_lib/types/dashboard.ts` (acréscimo)

```ts
import type { DASHBOARD_VIEW_MODES } from "@/app/_lib/domain/dashboard-view-modes"

export type DashboardViewMode = (typeof DASHBOARD_VIEW_MODES)[number]

export type DashboardByMode<T> = Record<DashboardViewMode, T>

export type DashboardOverviewByMode = DashboardByMode<DashboardOverview>

export interface DashboardOverviewEmptyHints {
  noTickets: string
  noResolutions: string
  emptyBacklog: string
}
```

- `DashboardOverview` **não muda**: cada modo é um `DashboardOverview`
  completo. É o que deixa `resolutionRateFor`, `backlogValueLabel` e
  `backlogHint` reaproveitáveis sem duplicação.
- `DashboardByMode<T>` é o molde das próximas etapas (`DashboardByMode<DashboardTopTags>` etc.).
- A lista é a fonte única: `DASHBOARD_VIEW_MODES` mora em
  `app/_lib/domain/dashboard-view-modes.ts` (arquivo folha, sem import, mesmo
  padrão de `department-queue-tabs.ts`) e é reexportada por
  `app/_lib/domain/dashboard.ts`. A união é derivada dela, então um modo novo
  entra só na lista e o compilador cobra rótulos e textos de vazio.

### Domínio — `app/_lib/domain/dashboard.ts` (acréscimo)

| Export                                            | Valor / semântica                                                                                                                                                                                                                                         |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DASHBOARD_VIEW_MODES`                            | `["coletivo", "individual"] as const` — ordem do switch; reexport de `dashboard-view-modes.ts`                                                                                                                                                            |
| `DEFAULT_DASHBOARD_VIEW_MODE`                     | `"coletivo"`                                                                                                                                                                                                                                              |
| `DASHBOARD_VIEW_MODE_LABELS`                      | `{ coletivo: "Coletivo", individual: "Individual" }`                                                                                                                                                                                                      |
| `DASHBOARD_VIEW_MODE_GROUP_LABEL`                 | `"Visão dos indicadores"` — rótulo acessível do grupo                                                                                                                                                                                                     |
| `DASHBOARD_OVERVIEW_EMPTY_HINTS`                  | por modo. `coletivo`: os três textos de hoje (`NO_TICKETS_IN_PERIOD_HINT`, `NO_RESOLUTIONS_IN_PERIOD_HINT`, `EMPTY_BACKLOG_HINT`). `individual`: `Nenhum chamado seu no período`, `Nenhum resolvido por você no período`, `Nenhum chamado seu em backlog` |
| `receivedTransfersHint(count, mode = "coletivo")` | Coletivo como hoje. Individual: `0` → `Nenhum aceito por você`; `1` → `+1 aceito por você`; `N` → `+N aceitos por você`                                                                                                                                   |
| `backlogHint(overview, mode = "coletivo")`        | igual a hoje; com `backlogCount = 0` devolve `DASHBOARD_OVERVIEW_EMPTY_HINTS[mode].emptyBacklog`                                                                                                                                                          |

Sem mudança: `resolutionRateFor`, `resolvedOfReceivedHint`,
`resolvedWithoutReceivedHint` (`2 resolvidos, nenhum recebido` serve aos dois
modos), `formatResolutionRate`, `backlogValueLabel`, `firstResponseHint`,
`DASHBOARD_OVERVIEW_LABELS` (os rótulos dos cards são os mesmos nos dois
modos; o switch diz qual está ativo). Os parâmetros `mode` têm padrão
`"coletivo"`, então chamadas atuais continuam compilando e iguais.

### `df-data` — `app/_lib/data/dashboard.ts`

Assinatura alterada:

```ts
export async function findDashboardOverview(
  departmentId: number,
  range: DateRange,
  now: Date,
  userId: number,
): Promise<DashboardOverviewByMode>
```

Devolve `{ coletivo, individual }`. O `coletivo` tem de sair **idêntico** ao
retorno de hoje. As três leituras do `Promise.all` continuam três — nenhuma
consulta nova; cada uma ganha as colunas do Individual.

**1. Agregado de `ticket`** (mesmo `where current_department_id = $dep`). Seja
`mine = (t.assigned_to = $userId)`. Para cada coluna existente, uma gêmea com
`and mine` no `filter`:

```sql
count(*) filter (where <createdInRange> and t.assigned_to = $userId)::int                                   as mine_ticket_count,
count(*) filter (where <resolvedInRange> and <isResolvedStatus> and t.assigned_to = $userId)::int           as mine_period_resolved_count,
avg(extract(epoch from (t.resolved_at - t.created_at)) * 1000)
  filter (where <resolvedInRange> and <isResolvedStatus> and t.assigned_to = $userId)                       as mine_average_resolution_ms,
count(*) filter (where <isBacklogStatus> and t.assigned_to = $userId)::int                                  as mine_backlog_count,
coalesce(sum(extract(epoch from greatest($now::timestamptz - t.created_at, interval '0')) * 1000)
  filter (where <isBacklogStatus> and t.assigned_to = $userId), 0)                                          as mine_backlog_age_ms,
count(*) filter (where <isBacklogStatus> and <ticketDueAtSql> < $now and t.assigned_to = $userId)::int      as mine_overdue_backlog_count
```

Em Drizzle: um predicado `const isMine = eq(ticket.assignedTo, userId)`
reaproveitado nos `sql<…>` como os outros. `assigned_to` nulo nunca passa.

**2. Aceites** (mesmo `where acceptedInRange`): acrescentar

```sql
count(*) filter (where tr.reviewed_by = $userId)::int as mine_received_transfer_count
```

**3. Recebidos (`periodReceivedCount`)** — a união ganha uma coluna `mine` e a
contagem passa a `count(distinct …)`, que é o que permite as duas contagens
saírem da mesma leitura. Aqui o `where` não restringe `current_department_id`
(o ramo de origem filtra por `origin_department_id`, o de aceites por
`to_department_id`), então a coluna `mine` precisa carregar a condição de setor
explicitamente:

```sql
select
  count(distinct received.ticket_id)::int                                  as period_received_count,
  (count(distinct received.ticket_id) filter (where received.mine))::int   as mine_period_received_count
from (
  select t.id as ticket_id,
         (t.assigned_to = $userId and t.current_department_id = $dep) as mine
  from ticket t
  where t.origin_department_id = $dep
    and t.created_at >= $start and t.created_at < $end
  union all
  select tr.ticket_id,
         (t.assigned_to = $userId and t.current_department_id = $dep) as mine
  from ticket_transfer tr
  inner join ticket t on t.id = tr.ticket_id
  where tr.to_department_id = $dep
    and tr.status = 'aprovado'
    and tr.reviewed_at >= $start and tr.reviewed_at < $end
) as received
```

- `union all` + `count(distinct ticket_id)` dá exatamente o mesmo número da
  `union` atual para o Coletivo. A coluna `mine` depende só do chamado
  (destinatário atual), então as duas metades concordam para o mesmo
  `ticket_id` e o `distinct` não distorce o Individual. Com `union` (sem
  `all`) e a coluna `mine`, o Coletivo continuaria certo, mas trocar para
  `count(distinct)` é o que deixa explícito que cada chamado conta uma vez.
- `t.assigned_to = $userId` com `assigned_to` nulo dá `null`, e o `filter`
  trata `null` como falso. Não precisa de `coalesce`.
- Em Drizzle: um segundo predicado
  `const isMineInDepartment = and(isMine, eq(ticket.currentDepartmentId, departmentId))`
  usado na coluna `mine` dos **dois** ramos. O agregado de `ticket` (leitura 1)
  continua com `isMine`, porque o `where` dele já é `current_department_id = $dep`.
- Em Drizzle: `unionAll` de `drizzle-orm/pg-core` sobre os dois `select`
  (o segundo com `innerJoin(ticket, …)`), `.as("received")`, e por fora
  `countDistinct`/`sql` com `filter`. Consultar o `context7` para a forma na
  versão instalada; `sql` parametrizado equivalente também serve.
- Índices: os de hoje mais a PK de `ticket` no join. Rodar `EXPLAIN ANALYZE`
  das três leituras para o Administrador de QA Suporte e colar na resposta,
  comparando com o plano atual: o Coletivo não pode piorar de forma
  perceptível.

Montagem do retorno: o `coletivo` exatamente como hoje; o `individual` com os
`mine_*` nos campos de mesmo nome (`ticketCount` ← `mine_ticket_count`,
`receivedTransferCount` ← `mine_received_transfer_count`,
`periodReceivedCount` ← `mine_period_received_count` etc.), com as mesmas
conversões (`Number(...)` nos `numeric`, `null` no `avg` vazio, `0` sem linha).

### `df-actions`, `df-auth`, `df-email`

Nada.

### `df-ui` — o que fazer

Pasta `app/(app)/dashboard/`. Peças novas (nomes sugeridos):

| Arquivo                                        | Tipo     | Papel                                                                                                  |
| ---------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------ |
| `_hooks/use-dashboard-view-mode.ts`            | cliente  | contexto do modo e o hook `useDashboardViewMode()` que devolve `{ mode, setMode }`                     |
| `_components/dashboard-view-mode-provider.tsx` | cliente  | `useState<DashboardViewMode>(DEFAULT_DASHBOARD_VIEW_MODE)` e o provider do contexto; recebe `children` |
| `_components/dashboard-view-mode-switch.tsx`   | cliente  | o switch                                                                                               |
| `_components/dashboard-view-pane.tsx`          | cliente  | `({ mode, children })` → `<div hidden={mode !== atual}>{children}</div>`                               |
| `_components/dashboard-overview-cards.tsx`     | servidor | a grade atual dos 4 cards, recebendo `overview: DashboardOverview` e `mode: DashboardViewMode`         |

**Onde fica o estado.** O provider envolve **todo** o conteúdo da página em
`page.tsx` (cabeçalho, filtro e as três linhas), **fora** dos `Suspense`. É o
mesmo provider que as Etapas 2 a 5 vão usar: cada card novo só envolve as duas
versões em `DashboardViewPane`. Sem URL, cookie, `localStorage` ou
`sessionStorage`. Consequência esperada: trocar o período é navegação na mesma
rota, o provider não é desmontado e o modo escolhido **se mantém**; recarregar
(F5) volta para Coletivo.

**Switch.**

- Posição: na mesma linha do `PeriodFilter`, à direita dele
  (`flex flex-wrap items-center justify-between gap-3` ou equivalente). Em
  telas estreitas pode quebrar para a linha de baixo; nunca rolagem
  horizontal.
- Visual: trilho em pílula com as duas opções em texto
  (`DASHBOARD_VIEW_MODE_LABELS`, na ordem de `DASHBOARD_VIEW_MODES`) e um
  indicador que **desliza** para a opção ativa (`translate-x` com
  `transition`, `motion-reduce:transition-none`). Texto sempre visível nas
  duas opções; a ativa se distingue por contraste **e** pela posição do
  indicador, não só pela cor. Cores só por token.
- Semântica: rádio nativo. Um contêiner `role="radiogroup"` com
  `aria-label={DASHBOARD_VIEW_MODE_GROUP_LABEL}` (ou `fieldset` com `legend`
  `sr-only`), e duas `<input type="radio" name=… className="sr-only">` com
  `<label>`. O navegador dá de graça: Tab entra no grupo pela opção marcada,
  setas trocam, leitor anuncia "Coletivo, rádio, marcado, 1 de 2". Sem
  `onKeyDown` próprio. Foco visível no rótulo
  (`has-[:focus-visible]:ring-…` ou equivalente) com o token `ring`.
- `onChange` → `setMode`. Nenhuma navegação, nenhum `router.*`, nenhuma
  action: a troca não pode gerar requisição.

**Linha 1.** `DashboardOverview` (servidor) passa a receber `userId` (o
`actor.id` da sessão, vindo de `page.tsx`), chama
`findDashboardOverview(departmentId, range, now, userId)` **uma** vez e
renderiza:

```tsx
<>
  <DashboardViewPane mode="coletivo">
    <DashboardOverviewCards overview={overviews.coletivo} mode="coletivo" />
  </DashboardViewPane>
  <DashboardViewPane mode="individual">
    <DashboardOverviewCards overview={overviews.individual} mode="individual" />
  </DashboardViewPane>
</>
```

(ou um `DASHBOARD_VIEW_MODES.map`). Em `DashboardOverviewCards`, o que hoje
está fixo passa a vir do modo:

| Onde                    | Antes                           | Agora                                                |
| ----------------------- | ------------------------------- | ---------------------------------------------------- |
| card 1, linha de apoio  | `receivedTransfersHint(count)`  | `receivedTransfersHint(count, mode)`                 |
| card 2, `kind: "empty"` | `NO_TICKETS_IN_PERIOD_HINT`     | `DASHBOARD_OVERVIEW_EMPTY_HINTS[mode].noTickets`     |
| card 3, sem média       | `NO_RESOLUTIONS_IN_PERIOD_HINT` | `DASHBOARD_OVERVIEW_EMPTY_HINTS[mode].noResolutions` |
| card 4, linha de apoio  | `backlogHint(overview)`         | `backlogHint(overview, mode)`                        |

O resto do card (valor, barra, `firstResponseHint` ilustrativo, rótulos) fica
igual nos dois modos.

**Modo inativo.** `hidden` no `div` do `DashboardViewPane`: sai do layout, da
árvore de acessibilidade, da ordem de foco e do `getByRole` do Playwright. O
`div` **não** leva classe de `display` (`grid`, `flex`, `contents`), que
venceria o `hidden`; a grade fica no filho. `inert` é dispensável com
`hidden`. Como o estado inicial é `"coletivo"` no servidor e no cliente, o HTML
do servidor já sai com o Individual oculto e não há diferença de hidratação.

**Esqueleto.** `DashboardOverviewSkeleton` inalterado: um conjunto de 4
cartões, não dois.

### Riscos da Etapa 1

- Coletivo diferente do de hoje por mudança na união: `count(distinct)` sobre
  `union all` tem de bater com a `union` atual. Coberto por IM5.
- Diretoria: o Individual mostra só os chamados destinados à pessoa dentro da
  Diretoria. Sem conta de Diretor no QA; fica não executado.
- Linhas 2 e 3 ainda no Coletivo quando o switch está em Individual: esperado
  nesta etapa.

### Cenários do `df-qa`

Contas (Suporte; o orquestrador passa as senhas): `A` = Administrador
`cazalbe@gmail.com`, `M` = Membro `rodalv@gmail.com`. Banco **só leitura**
(MCP `postgres`); nenhuma escrita, nem pela interface. Ids: `:eu` = `users.id`
da conta logada (`select id from users where lower(email) = lower(:email)`);
`:dep` = `department_id` dela. Bordas `:inicio`/`:fim` como na Etapa 1 de
`docs/contracts/dashboard-overview.md` (consulta das bordas em São Paulo).

Consulta `IM(dep, eu, inicio, fim)` — cards 1, 3 e 4:

```sql
select
  count(*) filter (where t.created_at >= :inicio and t.created_at < :fim) as chamados,
  count(*) filter (where t.resolved_at >= :inicio and t.resolved_at < :fim
                     and t.status in ('resolvido','fechado')) as resolvidos,
  floor(avg(extract(epoch from (t.resolved_at - t.created_at))) filter (
    where t.resolved_at >= :inicio and t.resolved_at < :fim
      and t.status in ('resolvido','fechado')) / 60) as media_min,
  count(*) filter (where t.status in
    ('aberto','em_analise','encaminhado','recusado','em_andamento')) as backlog,
  floor(coalesce(sum(extract(epoch from greatest(now() - t.created_at, interval '0')))
    filter (where t.status in ('aberto','em_analise','encaminhado','recusado','em_andamento')), 0) / 3600) as horas_backlog,
  count(*) filter (where t.status in ('aberto','em_analise','encaminhado','recusado','em_andamento')
    and t.created_at + case t.priority
      when 'critica' then interval '3 hours'
      when 'alta' then interval '6 hours'
      when 'media' then interval '12 hours'
      when 'baixa' then interval '24 hours' end < now()) as em_atraso
from ticket t
where t.current_department_id = :dep and t.assigned_to = :eu
```

Consulta `IA(dep, eu, inicio, fim)` — "+N aceitos por você":

```sql
select count(*) from ticket_transfer tr
where tr.to_department_id = :dep and tr.status = 'aprovado'
  and tr.reviewed_by = :eu
  and tr.reviewed_at >= :inicio and tr.reviewed_at < :fim
```

Consulta `IR(dep, eu, inicio, fim)` — recebidos (setor e meus):

```sql
select count(distinct r.ticket_id) as recebidos_setor,
  count(distinct r.ticket_id) filter (where r.mine) as recebidos_meus
from (
  select t.id as ticket_id,
         (t.assigned_to = :eu and t.current_department_id = :dep) as mine
  from ticket t
  where t.origin_department_id = :dep
    and t.created_at >= :inicio and t.created_at < :fim
  union all
  select tr.ticket_id,
         (t.assigned_to = :eu and t.current_department_id = :dep)
  from ticket_transfer tr join ticket t on t.id = tr.ticket_id
  where tr.to_department_id = :dep and tr.status = 'aprovado'
    and tr.reviewed_at >= :inicio and tr.reviewed_at < :fim
) r
```

Esperado na tela (Individual): Chamados = `chamados`; linha `+N aceito(s) por
você` com `N = IA` (`0` → `Nenhum aceito por você`); Taxa =
`floor(100 × resolvidos / recebidos_meus)%` com `X resolvido(s) de Y`
(`recebidos_meus = 0` e `resolvidos > 0` → `—` + `X resolvido(s), nenhum
recebido`; os dois `0` → `—` + `Nenhum chamado seu no período`); Tempo médio a
partir de `media_min`, formatos da Etapa 1 do contrato do Coletivo (`null` →
`—` + `Nenhum resolvido por você no período`); Backlog = `em_atraso` como
`X chamado(s)` e linha `{horas_backlog}h em backlog` (`backlog = 0` → `Nenhum
chamado seu em backlog`). Diferença de 1 h no `horas_backlog` por causa do
instante da consulta não é defeito.

| #    | Quem  | Ação                                                                             | Esperado                                                                                                                                                                                                                                                |
| ---- | ----- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| IM1  | A     | abrir `/dashboard`                                                               | switch visível à direita do filtro de período, mesma linha (≥ 1280 px), com "Coletivo" e "Individual" escritos; "Coletivo" marcado; cards com os números do Coletivo                                                                                    |
| IM2  | A     | marcar "Individual"; recarregar (F5)                                             | depois do F5 volta a "Coletivo" e aos números do Coletivo. URL inalterada na troca e no F5 (`?periodo=…` só)                                                                                                                                            |
| IM3  | A     | DevTools → Rede, limpar; alternar Coletivo ↔ Individual várias vezes             | **nenhuma** requisição (nem documento, nem RSC, nem fetch); console sem erro                                                                                                                                                                            |
| IM4  | A     | Individual em Hoje, Semana, Mês e Personalizado de 3 dias com hoje               | os 4 cards batem com `IM`, `IA` e `IR` (`recebidos_meus`) do período; backlog igual entre períodos                                                                                                                                                      |
| IM5  | A     | Coletivo em Hoje e Mês                                                           | idêntico ao Coletivo de hoje: bate com `OV`/`RT` do contrato do Coletivo (com as revisões de 2026-10-23 e 2026-10-26) e com `recebidos_setor` de `IR`                                                                                                   |
| IM6  | M     | Individual em Hoje e Mês                                                         | números do Membro (`IM`/`IA`/`IR` com `:eu` do Membro), diferentes dos de A quando os destinatários diferem; Coletivo de M igual ao de A no mesmo período                                                                                               |
| IM7  | A     | Individual num Personalizado sem chamado meu (conferir com `IM`, ex. 2026-01-01) | Chamados `0` + `Nenhum aceito por você`; Taxa `—` + `Nenhum chamado seu no período`, sem barra; Tempo `—` + `Nenhum resolvido por você no período`, sem marca Ilustrativo; Backlog igual ao de Hoje (ou `0 chamados` + `Nenhum chamado seu em backlog`) |
| IM8  | A     | Individual, trocar o período pelo filtro                                         | o modo **continua** Individual depois da troca de período (o estado não vive na URL, mas a página não é recarregada); só o F5 volta a Coletivo                                                                                                          |
| IM9  | A     | só teclado: Tab até o switch, setas esquerda/direita, Tab para sair              | foco visível no switch; setas trocam a opção e os cards trocam junto; Tab sai do grupo em um passo; nenhum card do modo oculto recebe foco                                                                                                              |
| IM10 | A     | árvore de acessibilidade (Playwright `getByRole` / snapshot)                     | um `radiogroup` com nome "Visão dos indicadores" e dois `radio` ("Coletivo", "Individual") com `checked` correto; só **um** conjunto de 4 cards exposto; a barra de progresso aparece uma vez no máximo                                                 |
| IM11 | A     | 390×844, nos dois modos                                                          | sem rolagem horizontal; switch e filtro cabem (switch pode ir para a linha de baixo); texto das duas opções inteiro                                                                                                                                     |
| IM12 | A     | trocar o período com o Individual marcado e observar o carregamento              | esqueleto de **4** cartões (um conjunto só), como hoje                                                                                                                                                                                                  |
| IM13 | A     | Individual, olhar linhas 2 e 3                                                   | iguais ao Coletivo (não migradas nesta etapa) — não é defeito                                                                                                                                                                                           |
| IM14 | todos | toda a bateria                                                                   | console e dev server (`next-devtools`) sem erro nem aviso de hidratação; nenhuma escrita no banco                                                                                                                                                       |

Não executáveis nesta rodada: Diretoria (login do Diretor recusado).

Notas para não reportar como defeito:

- "+N aceitos por você" conta por quem aceitou (`reviewed_by`); "recebidos"
  da taxa conta pelo destinatário atual. Um chamado aceito por mim e repassado
  conta no "+N" e não na taxa.
- A taxa individual pode passar de 100%.
- Rótulos dos cards são os mesmos nos dois modos.

### Critério de pronto da Etapa 1

1. Abre em Coletivo; F5 com Individual volta a Coletivo (IM1, IM2).
2. Troca sem requisição (IM3).
3. Individual bate com `IM`/`IA`/`IR` em todos os períodos (IM4, IM6, IM7).
4. Coletivo idêntico ao de antes (IM5).
5. Switch acessível; modo oculto fora da árvore e do foco (IM9, IM10).
6. 390 px sem rolagem horizontal (IM11); esqueleto inalterado (IM12).
7. `npx tsc --noEmit`, `npm run lint`, `npm run build`; `df-reviewer` sem
   bloqueante; `df-qa` aprova IM1–IM14 (Diretoria não executada).

### `tsc` entre ondas

Depois do `df-data`, `app/(app)/dashboard/_components/dashboard-overview.tsx`
deixa de compilar (falta `userId` e o retorno virou `{ coletivo, individual }`)
até o `df-ui` entrar. Esperado entre as ondas; os dois fecham juntos.

### Checklist da Etapa 1

- [x] Plano, este contrato e nota em `docs/contracts/dashboard-overview.md`;
      `DashboardViewMode`, `DashboardByMode`, `DashboardOverviewByMode`,
      `DashboardOverviewEmptyHints`; modos, rótulos e textos de vazio no
      domínio (`df-architect`)
- [x] `findDashboardOverview` com `userId` e os dois modos nas três leituras,
      `EXPLAIN ANALYZE` na resposta (`df-data`)
- [x] Revisão do `df-reviewer`: coluna `mine` da união com
      `isMineInDepartment` nos dois ramos (`df-data`)
- [x] Provider, hook, switch, `DashboardViewPane`, `DashboardOverviewCards`,
      `page.tsx` (`df-ui`)
- [x] `npx tsc --noEmit`, `npm run lint`, `npm run build`; `df-reviewer`
      (aprovado com atenções, todas tratadas)
- [x] Cenários IM1–IM14 (`df-qa`): 13 de 14, 0 falhas, IM12 em parte
      (`docs/test-reports/2026-10-27-dashboard-individual-mode.md`)

Etapa 1 concluída, aguardando commit.

### Limites conhecidos da Etapa 1

- **Esqueleto na troca de período.** O esqueleto de 4 cartões aparece no
  carregamento do documento; na troca de período o roteador mantém a tela
  anterior até a resposta chegar e o esqueleto não aparece. Vale igualmente
  para o Coletivo (o contrato do Coletivo já diz "se perceptível"). Não é
  defeito.
- **Diretoria não executada.** Sem conta de Diretor com login no QA.

### Decisões pós-QA

- **Modo ao sair e voltar de `/dashboard`.** Navegar para outra rota e voltar
  remonta a página e o provider, então o modo volta a Coletivo. É o
  comportamento esperado, coerente com "não persiste": o modo só sobrevive à
  troca de período dentro da própria página (IM8).
- **Backlog com `0 chamados` e `Nh em backlog`.** O valor grande é a contagem
  dos **atrasados** do backlog (`overdueBacklogCount`) e a linha de apoio é a
  idade somada de **todo** o backlog, nos dois modos, pelas mesmas funções
  (`backlogValueLabel`, `backlogHint`). Backlog sem atraso mostra `0 chamados`
  com horas. Coerente com o Coletivo; não é defeito.
