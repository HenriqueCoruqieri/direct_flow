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

Etapa 1 concluída e commitada (001ed83).

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

---

## Etapa 2 — Principal ofensor

### O que muda e o que não muda

- O card "Principal ofensor" passa a ter as duas versões, trocadas pelo
  switch da Etapa 1 (mesmo provider, mesmo `DashboardViewPane`).
- O Coletivo do card fica **idêntico** ao de hoje (Etapa 2 de
  `docs/contracts/dashboard-overview.md`).
- Maiores atrasos, gráfico e Transferências **não mudam**: no Individual
  continuam mostrando o Coletivo.
- Rótulo do card, `TOP_TAGS_LIMIT`, ordenação, barras, esqueleto, `col-span`
  e altura: iguais.

### Tabelas, enums e migration

Sem mudança de schema, sem migration, sem índice novo. Coluna lida além das
de hoje: `ticket.assigned_to` (índice `ticket_assigned_to_idx`).

### Definições (Individual, "eu" = usuário da sessão)

| Termo                                | Definição                                                                                                                                     |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Meus chamados no período**         | `ticket.current_department_id` = setor **e** `ticket.assigned_to` = eu **e** `created_at` no período, todos os status. É o `chamados` de `IM` |
| **Ranking**                          | tags do setor (`tag.department_id` = setor) nos meus chamados do período, mesma ordenação e mesmo `limit` do Coletivo                         |
| **Denominador do "% do volume"**     | meus chamados no período (linha acima): o critério do Coletivo com `assigned_to` = eu                                                         |
| **Tag de outro setor / tag inativa** | mesmas regras do Coletivo: inativa conta; de outro setor não entra no ranking, mas o chamado entra no denominador                             |

O mesmo recorte vale para as duas leituras (total e ranking). "Meu" é o
destinatário **atual**, como na Etapa 1.

### Tipos — `app/_lib/types/dashboard.ts` (acréscimo)

```ts
export type DashboardTopTagsByMode = DashboardByMode<DashboardTopTags>
```

`DashboardTopTags` e `DashboardTopTag` **não mudam**: cada modo é um
`DashboardTopTags` completo, então `topTagVolumeHint`, `tagBarPercent` e
`TopTagItem` servem aos dois modos sem mudança.

### Domínio — `app/_lib/domain/dashboard.ts` (acréscimo)

| Export                                             | Valor / semântica                                                                                                                               |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `NO_OWN_TICKETS_IN_PERIOD_HINT`                    | `"Nenhum chamado seu no período"` — a string da Etapa 1, agora constante; `DASHBOARD_OVERVIEW_EMPTY_HINTS.individual.noTickets` aponta para ela |
| `NO_OWN_TAGGED_TICKETS_IN_PERIOD_HINT`             | `"Nenhum chamado seu com tag no período"`                                                                                                       |
| `NO_TAGGED_TICKETS_IN_PERIOD_HINTS`                | por modo: `coletivo` = `NO_TAGGED_TICKETS_IN_PERIOD_HINT` (inalterado), `individual` = `NO_OWN_TAGGED_TICKETS_IN_PERIOD_HINT`                   |
| `topTagsEmptyHint(ticketCount, mode = "coletivo")` | `ticketCount > 0` → `NO_TAGGED_TICKETS_IN_PERIOD_HINTS[mode]`; senão → `DASHBOARD_OVERVIEW_EMPTY_HINTS[mode].noTickets`. Coletivo igual a hoje  |

Sem mudança: `TOP_TAGS_CARD_LABEL`, `TOP_TAGS_LIMIT`, `tagVolumePercent`,
`topTagVolumeHint`, `tagBarPercent`, `NO_TAGGED_TICKETS_IN_PERIOD_HINT`,
`NO_TICKETS_IN_PERIOD_HINT`. A chamada atual `topTagsEmptyHint(ticketCount)`
continua compilando e igual.

"Meus chamados sem tag" inclui o caso de chamados meus só com tag de outro
setor (aceitos de fora), como no Coletivo. Não é defeito.

### `df-data` — `app/_lib/data/dashboard.ts`

Assinatura alterada (parâmetro opcional no fim; sem ele, comportamento e SQL
**idênticos** aos de hoje):

```ts
export async function listDashboardTopTags(
  departmentId: number,
  range: DateRange,
  limit: number,
  assigneeId?: number,
): Promise<DashboardTopTags>
```

- Com `assigneeId`, as **duas** leituras do `Promise.all` (total e ranking)
  ganham `and t.assigned_to = $assigneeId` no predicado de recorte que já
  existe (`createdInRange`). Em Drizzle:
  `assigneeId === undefined ? undefined : eq(ticket.assignedTo, assigneeId)`
  dentro do `and(...)` — o `and` descarta `undefined`, então o Coletivo sai
  com o SQL de hoje. Nada de função duplicada.
- Índice: `ticket_assigned_to_idx` ou o de setor de hoje, à escolha do
  planejador; o ranking mantém o `join` de hoje, com o filtro no lado de
  `ticket`.
- Sem chamados meus: `{ ticketCount: 0, tags: [] }`.
- Rodar `EXPLAIN ANALYZE` das duas leituras com e sem `assigneeId` para o
  Administrador de QA Suporte e colar na resposta; o plano do Coletivo não
  pode mudar.

### `df-actions`, `df-auth`, `df-email`

Nada.

### `df-ui` — o que fazer

`DashboardTopTags` (servidor) passa a receber `userId` (o `actor.id` de
`page.tsx`, como `DashboardOverview`) e faz **duas** chamadas num
`Promise.all`:

```ts
const [coletivo, individual] = await Promise.all([
  listDashboardTopTags(departmentId, range, TOP_TAGS_LIMIT),
  listDashboardTopTags(departmentId, range, TOP_TAGS_LIMIT, userId),
])
const topTags: DashboardTopTagsByMode = { coletivo, individual }
```

**Estrutura.** O `DashboardPanel` (com `xl:col-span-3`, `aria-labelledby` e o
`h2` de `TOP_TAGS_CARD_LABEL`) fica **um só**, fora dos painéis de modo; só o
**conteúdo** abaixo do título vai em `DashboardViewPane`, um por modo
(`DASHBOARD_VIEW_MODES.map`). Motivos: o `DashboardPanel` é o item da grade
da linha 2 (um `div hidden` em volta dele perderia o `col-span`), e o `h2` tem
`id` fixo (`TITLE_ID`), que duplicaria. Nome sugerido para a peça extraída:
`_components/dashboard-top-tags-content.tsx` (servidor), recebendo
`topTags: DashboardTopTags` e `mode: DashboardViewMode` e desenhando
exatamente o que o card desenha hoje abaixo do título.

| Onde           | Antes                           | Agora                                 |
| -------------- | ------------------------------- | ------------------------------------- |
| linha de vazio | `topTagsEmptyHint(ticketCount)` | `topTagsEmptyHint(ticketCount, mode)` |

O resto (destaque, `topTagVolumeHint`, lista, barras, `EMPTY_VALUE_LABEL`) é
o mesmo nos dois modos, cada um com os próprios números.

**Modo inativo.** Como na Etapa 1: `hidden` no `div` do `DashboardViewPane`,
sem classe de `display` nele. O `DashboardPanel` é `flex flex-col`; o `div`
do painel é um item comum do flex e o conteúdo dentro dele segue o fluxo de
bloco, como hoje.

**Suspense e esqueleto.** O `Suspense` com `key` de `page.tsx` e o
`DashboardTopTagsSkeleton` ficam como estão: um esqueleto só.

### Consultas de conferência (`df-qa`)

Contas, ids, banco só leitura e bordas `:inicio`/`:fim` como na Etapa 1 deste
contrato.

Consulta `ITT(dep, eu, inicio, fim)` — ranking do Individual:

```sql
select tg.id, tg.name, count(*)::int as n
from ticket_tag tt
join tag tg on tg.id = tt.tag_id
join ticket t on t.id = tt.ticket_id
where t.current_department_id = :dep and tg.department_id = :dep
  and t.assigned_to = :eu
  and t.created_at >= :inicio and t.created_at < :fim
group by tg.id, tg.name
order by n desc, lower(tg.name) asc, tg.id asc
limit 6
```

Denominador: coluna `chamados` de `IM(dep, eu, inicio, fim)` da Etapa 1.

Esperado no Individual: lista = `ITT`, mesma ordem e contagens; destaque = 1ª
linha; `N chamado(s) · X% do volume` com `X = floor(100 × n / chamados)`
(`< 1%` se `n > 0` e o floor der 0). `ITT` vazio: `—` e
`Nenhum chamado seu com tag no período` se `chamados > 0`, ou
`Nenhum chamado seu no período` se `chamados = 0`; sem lista.

### Cenários do `df-qa`

| #    | Quem   | Ação                                                                                                                                          | Esperado                                                                                                                                                                          |
| ---- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PO1  | A      | `/dashboard` Hoje, Coletivo                                                                                                                   | card igual ao de antes: bate com `TT(S, hoje)` e `OV(S, hoje)` do contrato do Coletivo                                                                                            |
| PO2  | A      | Individual em Hoje, Semana, Mês e Personalizado de 3 dias com hoje                                                                            | em cada período, lista = `ITT`, percentual pelo `chamados` de `IM`; linha 1 continua batendo com a Etapa 1                                                                        |
| PO3  | A      | Coletivo em Semana e Mês                                                                                                                      | idêntico ao Coletivo de antes (`TT`/`OV`)                                                                                                                                         |
| PO4  | M      | Individual em Hoje e Mês                                                                                                                      | lista = `ITT` com `:eu` do Membro, diferente da de A quando os destinatários diferem; Coletivo de M igual ao de A                                                                 |
| PO5  | A      | Individual num Personalizado sem chamado meu (conferir com `IM`, ex. 2026-01-01)                                                              | `—` + `Nenhum chamado seu no período`, sem lista                                                                                                                                  |
| PO6  | A ou M | Individual num período com `chamados > 0` e `ITT` vazio (achar com `IM` + `ITT`; se não houver, registrar como não executado, sem criar dado) | `—` + `Nenhum chamado seu com tag no período`, sem lista                                                                                                                          |
| PO7  | A      | DevTools → Rede, limpar; alternar Coletivo ↔ Individual várias vezes                                                                          | **nenhuma** requisição; console sem erro; o card troca junto com a linha 1                                                                                                        |
| PO8  | A      | marcar Individual; F5                                                                                                                         | volta a Coletivo, card com os números do Coletivo; URL inalterada                                                                                                                 |
| PO9  | A      | Individual, trocar o período pelo filtro                                                                                                      | continua em Individual; card com o `ITT` do novo período                                                                                                                          |
| PO10 | A      | árvore de acessibilidade (Playwright `getByRole` / snapshot), nos dois modos                                                                  | **um** título "Principal ofensor" (um `h2`, um `section` rotulado); só **uma** lista do card exposta; itens do modo oculto fora da árvore e do foco; nenhum `id` duplicado no DOM |
| PO11 | A      | 390×844, nos dois modos                                                                                                                       | sem rolagem horizontal; destaque e lista sem estourar                                                                                                                             |
| PO12 | A      | 1280 px, nos dois modos                                                                                                                       | card na mesma posição e largura (~3/5) da linha 2; Maiores atrasos mostra o Coletivo também no Individual — não é defeito                                                         |
| PO13 | todos  | toda a bateria                                                                                                                                | console e dev server (`next-devtools`) sem erro nem aviso de hidratação; nenhuma escrita no banco                                                                                 |

Não executáveis nesta rodada: Diretoria (login do Diretor recusado).

Notas para não reportar como defeito:

- A soma dos percentuais pode ser menor que 100% (chamado sem tag ou com tag
  de outro setor), como no Coletivo.
- Um chamado meu aceito de outro setor com tag da origem conta no
  denominador e não no ranking.
- Maiores atrasos, gráfico e Transferências ainda no Coletivo no Individual.

### Critério de pronto da Etapa 2

1. Individual bate com `ITT`/`IM` em todos os períodos (PO2, PO4).
2. Coletivo idêntico ao de antes (PO1, PO3).
3. Estados vazios do Individual (PO5, PO6).
4. Troca sem requisição; F5 volta a Coletivo; modo sobrevive à troca de
   período (PO7, PO8, PO9).
5. Um título só; modo oculto fora da árvore e do foco (PO10).
6. 390 px sem rolagem horizontal; layout da linha 2 inalterado (PO11, PO12).
7. `npx tsc --noEmit`, `npm run lint`, `npm run build`; `df-reviewer` sem
   bloqueante; `df-qa` aprova PO1–PO13 (Diretoria não executada).

### `tsc` entre ondas

A assinatura nova é compatível (parâmetro opcional no fim, `mode` com
padrão), então nada deixa de compilar entre as ondas.

### Checklist da Etapa 2

- [x] Este contrato e o plano; `DashboardTopTagsByMode`;
      `NO_OWN_TICKETS_IN_PERIOD_HINT`, `NO_OWN_TAGGED_TICKETS_IN_PERIOD_HINT`,
      `NO_TAGGED_TICKETS_IN_PERIOD_HINTS`, `topTagsEmptyHint` com `mode`
      (`df-architect`)
- [x] `listDashboardTopTags` com `assigneeId?`, `EXPLAIN ANALYZE` com e sem
      pessoa na resposta (`df-data`)
- [x] `DashboardTopTags` com `userId`, duas chamadas em `Promise.all`,
      conteúdo por modo em `DashboardViewPane`, `page.tsx` (`df-ui`)
- [x] `npx tsc --noEmit`, `npm run lint`, `npm run build`; `df-reviewer`
      (aprovado, sem atenções)
- [x] Cenários PO1–PO13 (`df-qa`): 13 de 13 após reteste
      (`docs/test-reports/2026-10-28-dashboard-individual-mode-top-tags.md`)

Etapa 2 concluída e commitada em aacf2ed.

### Limites conhecidos da Etapa 2

- **Plano de execução.** Com o volume atual (248 chamados) o planejador usa
  Seq Scan e não `ticket_assigned_to_idx`. Esperado em tabela pequena; o
  índice entra quando o volume crescer.
- **Diretoria não executada.** Login do Diretor recusado no QA.

---

## Etapa 3 — Maiores atrasos

### O que muda e o que não muda

- O card "Maiores atrasos" passa a ter as duas versões, trocadas pelo switch
  da Etapa 1 (mesmo provider, mesmo `DashboardViewPane`).
- O Coletivo do card fica **idêntico** ao de hoje (Etapa 2 de
  `docs/contracts/dashboard-overview.md`, com as revisões de 2026-10-24 e
  2026-10-26): mesmas linhas, ordem, limite, colunas, link do Nº e link
  "Ver na fila" (`/queue?tab=all&periodo=todos`).
- No Individual, o link "Ver na fila" do cabeçalho leva a Meus chamados, aba
  "Atribuídos a mim". O texto do link é o mesmo nos dois modos.
- Gráfico e Transferências **não mudam**: no Individual continuam mostrando o
  Coletivo.
- Rótulo do card, `OVERDUE_TICKETS_LIMIT` (5), colunas, formato do
  vencimento, esqueleto (um só), `col-span` (`xl:col-span-2`) e altura:
  iguais. O card continua **independente do período** (o `Suspense` dele
  segue sem `key`).

### Tabelas, enums e migration

Sem mudança de schema, sem migration, sem índice novo. Coluna lida além das
de hoje: `ticket.assigned_to` (índice `ticket_assigned_to_idx`).

### Definições (Individual, "eu" = usuário da sessão)

| Termo                       | Definição                                                                                                                                                                                                               |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Meus chamados atrasados** | `ticket.current_department_id` = setor **e** `ticket.assigned_to` = eu **e** status em `OVERDUE_TICKET_STATUSES` (os do backlog) **e** vencimento `<` agora. É o critério do Coletivo com `assigned_to` = eu, nada mais |
| **Ordem e limite**          | os do Coletivo: vencimento mais antigo primeiro, depois `created_at`, depois `id`; `limit` = `OVERDUE_TICKETS_LIMIT`                                                                                                    |
| **Vencimento**              | o do Coletivo: `ticketDueAtSql` / `ticketDueAt` (`created_at` + horas da prioridade, `TICKET_PRIORITY_DUE_HOURS`), comparação estrita `<`                                                                               |

"Meu" é o destinatário **atual**, como nas Etapas 1 e 2. A contagem
`overdueBacklogCount` do card Backlog no Individual (Etapa 1) usa o mesmo
critério, então o valor do Backlog no Individual e a tabela de atrasos do
Individual descrevem o mesmo conjunto (a tabela mostra até 5).

### Tipos — `app/_lib/types/dashboard.ts` (acréscimo)

```ts
export type DashboardOverdueByMode = DashboardByMode<DashboardOverdueTicket[]>

export interface DashboardOverdueEmptyCopy {
  title: string
  description: string
}
```

`DashboardOverdueTicket` **não muda**.

### Domínio — `app/_lib/domain/dashboard.ts` (acréscimo)

| Export                          | Valor / semântica                                                                                                                                                                       |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OVERDUE_MY_TICKETS_TAB`        | `"assigned"` (`MyTicketsTab`) — aba "Atribuídos a mim" de Meus chamados, destino do "Ver na fila" no Individual. Par de `OVERDUE_QUEUE_TAB` (inalterado)                                |
| `EMPTY_OWN_OVERDUE_TITLE`       | `"Nenhum chamado seu em atraso"`                                                                                                                                                        |
| `EMPTY_OWN_OVERDUE_DESCRIPTION` | `"Os chamados do setor destinados a você com vencimento já passado aparecem aqui."`                                                                                                     |
| `EMPTY_OVERDUE_COPY`            | por modo (`satisfies Record<DashboardViewMode, DashboardOverdueEmptyCopy>`): `coletivo` = `EMPTY_OVERDUE_TITLE`/`EMPTY_OVERDUE_DESCRIPTION` (inalterados), `individual` = as duas acima |

Sem mudança: `OVERDUE_CARD_LABEL`, `OVERDUE_QUEUE_LINK_LABEL`,
`OVERDUE_QUEUE_TAB`, `OVERDUE_TICKETS_LIMIT`, `OVERDUE_TICKET_STATUSES`,
`OVERDUE_COLUMN_LABELS`, `EMPTY_OVERDUE_TITLE`, `EMPTY_OVERDUE_DESCRIPTION`.
A aba é constante própria, e não `DEFAULT_MY_TICKETS_TAB`: o destino é uma
decisão deste card, não "a aba padrão de Meus chamados", que pode mudar.

### Validação — `app/_lib/validation/dashboard.ts` (acréscimo)

| Export                    | Valor / semântica                                                                                                                                                                               |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OVERDUE_MY_TICKETS_HREF` | `myTicketsTabHref(OVERDUE_MY_TICKETS_TAB, DEFAULT_MY_TICKETS_PERIOD)` → `/tickets?tab=assigned&periodo=todos`. Mesmo montador que as abas de Meus chamados usam em `app/(app)/tickets/page.tsx` |
| `OVERDUE_QUEUE_HREFS`     | por modo (`satisfies Record<DashboardViewMode, string>`): `coletivo` = `OVERDUE_QUEUE_HREF` (inalterado), `individual` = `OVERDUE_MY_TICKETS_HREF`                                              |

Mora em `validation/` pelo mesmo motivo do `OVERDUE_QUEUE_HREF`: os montadores
de URL (`departmentQueueHref`, `myTicketsTabHref`) moram lá. Período "Todos"
porque o atraso não depende do período, como no Coletivo. A aba "Atribuídos a
mim" lista **todos** os meus ativos, de qualquer setor e inclusive aguardando
aprovação; a tabela do Individual é um subconjunto dela (do setor, atrasados).

### `df-data` — `app/_lib/data/dashboard.ts`

Assinatura alterada (parâmetro opcional no fim; sem ele, comportamento e SQL
**idênticos** aos de hoje):

```ts
export async function listOverdueTickets(
  departmentId: number,
  now: Date,
  limit: number,
  assigneeId?: number,
): Promise<DashboardOverdueTicket[]>
```

- Com `assigneeId`, o `and(...)` do `where` ganha
  `assigneeId === undefined ? undefined : eq(ticket.assignedTo, assigneeId)`;
  o `and` descarta `undefined`, então o Coletivo sai com o SQL de hoje. Nada de
  função duplicada; `orderBy`, `limit` e o mapeamento de `dueAt` não mudam.
- Sem atrasados meus: `[]`.
- Rodar `EXPLAIN ANALYZE` com e sem `assigneeId` para o Administrador de QA
  Suporte e colar na resposta; o plano do Coletivo não pode mudar.

### `df-actions`, `df-auth`, `df-email`

Nada.

### `df-ui` — o que fazer

`DashboardOverdue` (servidor) passa a receber `userId` (o `actor.id` de
`page.tsx`, como `DashboardTopTags`) e faz **duas** chamadas num
`Promise.all`:

```ts
const [coletivo, individual] = await Promise.all([
  listOverdueTickets(departmentId, now, OVERDUE_TICKETS_LIMIT),
  listOverdueTickets(departmentId, now, OVERDUE_TICKETS_LIMIT, userId),
])
const overdueByMode: DashboardOverdueByMode = { coletivo, individual }
```

**Estrutura.** Diferente da Etapa 2, aqui o cabeçalho também varia (o link),
então são **dois** pontos com `DashboardViewPane`, ambos **dentro** de um
único `DashboardPanel`:

```tsx
<DashboardPanel aria-labelledby={TITLE_ID} className="xl:col-span-2">
  <DashboardOverdueHeader titleId={TITLE_ID} />
  {DASHBOARD_VIEW_MODES.map((mode) => (
    <DashboardViewPane key={mode} mode={mode}>
      <DashboardOverdueContent
        tickets={overdueByMode[mode]}
        mode={mode}
        now={now}
        selection={selection}
      />
    </DashboardViewPane>
  ))}
</DashboardPanel>
```

- O `DashboardPanel` fica **um só** (item da grade da linha 2, com o
  `col-span`), e o `h2` com `TITLE_ID` fica **um só**, fora dos painéis de
  modo. Nenhum `id` dentro de `DashboardViewPane`.
- **Cabeçalho.** `DashboardPanelHeader` deixa de receber `href`/`linkLabel`
  e passa a receber o título e a ação como `children`:
  `{ title: string; titleId?: string; children: ReactNode }`, desenhando a
  mesma linha de hoje (`flex items-center justify-between gap-3`, `h2` à
  esquerda, `children` à direita). O link sai para uma peça nova,
  `_components/dashboard-panel-link.tsx` (servidor),
  `{ href: string; label: string }`, com as classes do link de hoje mais
  `whitespace-nowrap`. Motivo do `whitespace-nowrap`: no Atrasos o item do
  flex passa a ser o `div` do `DashboardViewPane`, não o `Link`, e o
  `shrink-0` do link deixa de valer; sem quebra de linha, a largura mínima do
  `div` é o texto inteiro e o link não quebra, como hoje.
- `DashboardOverdueHeader` (servidor, sem props novas):

  ```tsx
  <DashboardPanelHeader title={OVERDUE_CARD_LABEL} titleId={titleId}>
    {DASHBOARD_VIEW_MODES.map((mode) => (
      <DashboardViewPane key={mode} mode={mode}>
        <DashboardPanelLink
          href={OVERDUE_QUEUE_HREFS[mode]}
          label={OVERDUE_QUEUE_LINK_LABEL}
        />
      </DashboardViewPane>
    ))}
  </DashboardPanelHeader>
  ```

- `DashboardTransfersHeader` passa a passar
  `<DashboardPanelLink href={TRANSFERS_APPROVALS_HREF} label={TRANSFERS_APPROVALS_LINK_LABEL} />`
  como `children`; visual idêntico (o `Link` continua item direto do flex,
  com `shrink-0`).
- `OVERDUE_QUEUE_HREF` deixa de ser importado pela UI (o Coletivo chega por
  `OVERDUE_QUEUE_HREFS.coletivo`, mesmo valor).
- **Conteúdo.** Peça extraída: `_components/dashboard-overdue-content.tsx`
  (servidor), recebendo `tickets: DashboardOverdueTicket[]`,
  `mode: DashboardViewMode`, `now: Date` e `selection: PeriodSelection`, e
  desenhando exatamente o que o card desenha hoje abaixo do cabeçalho (estado
  vazio com `mt-3` ou a `Table` com `mt-3`). O link do Nº continua
  `dashboardTicketDetailHref(selection, ticket.id)` (origem `dashboard`) nos
  dois modos.

| Onde              | Antes                       | Agora                                  |
| ----------------- | --------------------------- | -------------------------------------- |
| vazio, título     | `EMPTY_OVERDUE_TITLE`       | `EMPTY_OVERDUE_COPY[mode].title`       |
| vazio, descrição  | `EMPTY_OVERDUE_DESCRIPTION` | `EMPTY_OVERDUE_COPY[mode].description` |
| link do cabeçalho | `OVERDUE_QUEUE_HREF`        | `OVERDUE_QUEUE_HREFS[mode]`            |

**Modo inativo.** Como nas Etapas 1 e 2: `hidden` no `div` do
`DashboardViewPane`, sem classe de `display` nele. Nos dois pontos (link e
conteúdo) o painel oculto sai do layout, da árvore de acessibilidade e do
foco. A tabela não tem `id`; não há `id` duplicado.

**Suspense e esqueleto.** `page.tsx`: só acrescenta `userId={actor.id}` em
`DashboardOverdue`; o `Suspense` continua sem `key`. O
`DashboardOverdueSkeleton` **não muda de código**: ele já desenha
`<DashboardOverdueHeader />`, que passa a trazer o link por modo. Funciona
porque o provider envolve todo o conteúdo da página, fora dos `Suspense`
(Etapa 1); o esqueleto continua um só, com as linhas de hoje.

### Consultas de conferência (`df-qa`)

Contas, ids e banco só leitura como na Etapa 1 deste contrato. As horas de
vencimento são as **atuais** (`TICKET_PRIORITY_DUE_HOURS`: crítica 3, alta 6,
média 12, baixa 24) — a `AT(dep)` de `docs/contracts/dashboard-overview.md`
ainda traz as horas antigas; use as daqui também para o Coletivo.

Consulta `IAT(dep, eu)` — atrasos (situação atual). Sem a linha
`and t.assigned_to = :eu` ela é a `AT(dep)` do Coletivo:

```sql
with v as (
  select t.id, t.title, t.priority, t.created_at,
    t.created_at + case t.priority
      when 'critica' then interval '3 hours'
      when 'alta'    then interval '6 hours'
      when 'media'   then interval '12 hours'
      when 'baixa'   then interval '24 hours' end as vencimento
  from ticket t
  where t.current_department_id = :dep
    and t.assigned_to = :eu
    and t.status in ('aberto','em_analise','encaminhado','recusado','em_andamento')
)
select id, title, priority,
  to_char(vencimento at time zone 'America/Sao_Paulo', 'YYYY-MM-DD HH24:MI') as vencimento_sp
from v
where vencimento < now()
order by vencimento asc, created_at asc, id asc
limit 5
```

Esperado no Individual: linhas = `IAT`, mesma ordem; colunas e formato do
Vencimento como no Coletivo (`D mmm, HH:mm`, com ano fora do ano corrente).
Total de meus atrasados (a mesma consulta sem `limit`) = coluna `em_atraso`
de `IM` da Etapa 1. `IAT` vazio: `Nenhum chamado seu em atraso` +
`Os chamados do setor destinados a você com vencimento já passado aparecem aqui.`,
sem tabela, link "Ver na fila" presente.

### Cenários do `df-qa`

| #    | Quem   | Ação                                                                                                                  | Esperado                                                                                                                                                                                                          |
| ---- | ------ | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MA1  | A      | `/dashboard`, Coletivo                                                                                                | card igual ao de antes: linhas = `AT(S)` (horas atuais), mesma ordem e limite; "Ver na fila" → `/queue?tab=all&periodo=todos`                                                                                     |
| MA2  | A      | Individual                                                                                                            | linhas = `IAT(S, A)`, mesma ordem, no máximo 5; total sem `limit` = `em_atraso` de `IM`; nenhuma linha com destinatário diferente de A                                                                            |
| MA3  | M      | Individual e Coletivo                                                                                                 | Individual = `IAT(S, M)`, diferente do de A quando os destinatários diferem; Coletivo de M igual ao de A                                                                                                          |
| MA4  | A ou M | Individual com `IAT` vazio (achar a conta pela consulta; se nenhuma tiver `IAT` vazio, NÃO EXECUTADO, sem criar dado) | `Nenhum chamado seu em atraso` + descrição pessoal, sem tabela, link "Ver na fila" presente                                                                                                                       |
| MA5  | A      | Individual, clicar "Ver na fila"                                                                                      | `/tickets?tab=assigned&periodo=todos`, Meus chamados com a aba "Atribuídos a mim" ativa; os chamados da tabela do Individual estão na lista                                                                       |
| MA6  | A      | Coletivo, clicar "Ver na fila"                                                                                        | `/queue?tab=all&periodo=todos`, como hoje (RW9 do contrato do Coletivo)                                                                                                                                           |
| MA7  | A      | Individual, clicar o Nº de uma linha; depois o "voltar" do chamado                                                    | abre `/tickets/{id}` com origem `dashboard` (`from=dashboard` e o período do Início na URL), como no Coletivo; o voltar leva ao Início no mesmo período                                                           |
| MA8  | A      | DevTools → Rede, limpar; alternar Coletivo ↔ Individual várias vezes                                                  | **nenhuma** requisição; console sem erro; tabela, vazio e link do cabeçalho trocam junto com a linha 1 e o Principal ofensor                                                                                      |
| MA9  | A      | marcar Individual; F5                                                                                                 | volta a Coletivo, card com `AT(S)` e link da Fila; URL inalterada                                                                                                                                                 |
| MA10 | A      | Individual, trocar o período pelo filtro                                                                              | continua em Individual; tabela inalterada (`IAT` não depende do período); links do Nº com o novo período                                                                                                          |
| MA11 | A      | árvore de acessibilidade (Playwright `getByRole` / snapshot), nos dois modos                                          | **um** título "Maiores atrasos" (um `h2`, um `section` rotulado); **um** link "Ver na fila" e **uma** tabela expostos; links e linhas do modo oculto fora da árvore e do foco (Tab); nenhum `id` duplicado no DOM |
| MA12 | A      | 390×844, nos dois modos                                                                                               | título pode quebrar em linhas; "Ver na fila" numa linha só, ao lado do título, sem quebrar nem ser espremido; sem rolagem horizontal da página                                                                    |
| MA13 | A      | 1280 px, nos dois modos                                                                                               | card na mesma posição e largura (~2/5) da linha 2, mesma altura do Principal ofensor; cabeçalho de Transferências igual ao de antes (link à direita, sem quebra)                                                  |
| MA14 | A      | recarregar `/dashboard` com rede lenta (DevTools, throttling) e olhar o esqueleto de atrasos                          | um esqueleto só, com cabeçalho "Maiores atrasos" e um "Ver na fila" exposto; sem erro de hidratação                                                                                                               |
| MA15 | todos  | toda a bateria                                                                                                        | console e dev server (`next-devtools`) sem erro nem aviso de hidratação; nenhuma escrita no banco                                                                                                                 |

Não executáveis nesta rodada: Diretoria (login do Diretor recusado).

Notas para não reportar como defeito:

- A aba "Atribuídos a mim" mostra mais chamados que a tabela: todos os meus
  ativos, de qualquer setor, inclusive aguardando aprovação e não atrasados.
- O card não muda com o período, nos dois modos; só os links do Nº levam o
  período.
- Gráfico e Transferências ainda no Coletivo no Individual.

### Critério de pronto da Etapa 3

1. Individual bate com `IAT` e com `em_atraso` de `IM` (MA2, MA3).
2. Coletivo idêntico ao de antes (MA1, MA6).
3. Estado vazio do Individual (MA4).
4. Links: "Ver na fila" por modo e Nº com origem `dashboard` (MA5, MA6, MA7).
5. Troca sem requisição; F5 volta a Coletivo; modo sobrevive à troca de
   período (MA8, MA9, MA10).
6. Um título, um link e uma tabela expostos; modo oculto fora da árvore e do
   foco; sem `id` duplicado (MA11, MA14).
7. 390 px sem rolagem horizontal; layout da linha 2 e cabeçalho de
   Transferências inalterados (MA12, MA13).
8. `npx tsc --noEmit`, `npm run lint`, `npm run build`; `df-reviewer` sem
   bloqueante; `df-qa` aprova MA1–MA15 (Diretoria não executada).

### `tsc` entre ondas

`listOverdueTickets` ganha parâmetro opcional no fim: compatível. A troca de
`href`/`linkLabel` por `children` em `DashboardPanelHeader` quebra os dois
chamadores (`dashboard-overdue-header.tsx`, `dashboard-transfers-header.tsx`),
que são do `df-ui` e mudam na mesma onda; nada fora do `df-ui` depende disso.

### Checklist da Etapa 3

- [x] Este contrato e o plano; `DashboardOverdueByMode`,
      `DashboardOverdueEmptyCopy`; `OVERDUE_MY_TICKETS_TAB`,
      `EMPTY_OWN_OVERDUE_TITLE`, `EMPTY_OWN_OVERDUE_DESCRIPTION`,
      `EMPTY_OVERDUE_COPY`; `OVERDUE_MY_TICKETS_HREF`, `OVERDUE_QUEUE_HREFS`
      (`df-architect`)
- [x] `listOverdueTickets` com `assigneeId?`, `EXPLAIN ANALYZE` com e sem
      pessoa na resposta (`df-data`)
- [x] `DashboardOverdue` com `userId`, duas chamadas em `Promise.all`,
      `DashboardOverdueContent` por modo, `DashboardPanelHeader` com
      `children`, `DashboardPanelLink`, link por modo no
      `DashboardOverdueHeader`, `page.tsx` (`df-ui`)
- [x] `npx tsc --noEmit`, `npm run lint`, `npm run build`; `df-reviewer`
      (aprovado com atenções: MA12 ajustado neste contrato; `shrink-0` sem
      efeito no cabeçalho de atrasos fica só como observação)
- [x] Cenários MA1–MA15 (`df-qa`): 14 de 15, MA14 em parte
      (`docs/test-reports/2026-10-28-dashboard-individual-mode-overdue.md`)

Etapa 3 concluída e commitada em 704b725.

### Limites conhecidos da Etapa 3

- **MA14 em parte.** O render é rápido demais para flagrar o esqueleto de
  carregamento no navegador.
- **Só o Membro distingue os modos.** Todos os atrasados atuais do setor estão
  com o Administrador, então para ele Coletivo e Individual mostram a mesma
  lista.
- **Diretoria não executada.** Login do Diretor recusado no QA.

---

## Etapa 4 — Abertos × resolvidos

### O que muda e o que não muda

- O card "Abertos × resolvidos" passa a ter as duas versões, trocadas pelo
  switch da Etapa 1 (mesmo provider, mesmo `DashboardViewPane`).
- O Coletivo do card fica **idêntico** ao de hoje (revisão 2026-10-24 de
  `docs/contracts/dashboard-overview.md`, "o gráfico da linha 3 segue o
  período"): baldes por granularidade, baldes futuros `null`, último ponto,
  eixo, tooltip, tabela acessível, vazio, esqueleto.
- Transferências **não muda**: no Individual continua mostrando o Coletivo.
- Título, linha do período (`activityPeriodLabel`), granularidade, baldes,
  legenda (séries, rótulos e cores), `col-span` (`xl:col-span-3`), altura,
  `Suspense` com `key` e esqueleto: iguais nos dois modos.

### Tabelas, enums e migration

Sem mudança de schema, sem migration, sem índice novo. Coluna lida além das
de hoje: `ticket.assigned_to` (índice `ticket_assigned_to_idx`).

### Definições (Individual, "eu" = usuário da sessão)

| Termo          | Definição                                                                                                                                                                                    |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Baldes**     | os do Coletivo: `timeBuckets(range, activityGranularityFor(range))`, mesma granularidade e mesmos baldes futuros `null` nos dois modos                                                       |
| **Abertos**    | por balde: `ticket.current_department_id` = setor **e** `ticket.assigned_to` = eu **e** `created_at` no balde, todos os status. É a série do Coletivo com `assigned_to` = eu                 |
| **Resolvidos** | por balde: `current_department_id` = setor **e** `assigned_to` = eu **e** `resolved_at` no balde **e** status em `DASHBOARD_RESOLVED_STATUSES`. É a série do Coletivo com `assigned_to` = eu |
| **Vazio**      | `isActivityEmpty(points)` sobre os pontos do modo: todos os registrados em `0`                                                                                                               |

"Meu" é o destinatário **atual**, como nas Etapas 1 a 3.

**Coerência com a linha 1 (verificada, sem divergência).** As definições do
gráfico coletivo e da linha 1 coincidem hoje, e por isso coincidem também no
Individual:

- `timeBuckets` cobre `[range.start, range.end)` sem buraco nem sobreposição
  (`app/_lib/date.ts:218`, com `spanBuckets` em `:203`: dias contíguos de
  `firstDayKey` a `lastDayKey`).
- Abertos usa `created_at` no balde com `current_department_id` = setor, todos
  os status: é o `createdInRange` de "Chamados no período"
  (`app/_lib/data/dashboard.ts:80` no Coletivo, `:90` no Individual, ambos sob
  o `where current_department_id = $dep` de `:102`).
- Resolvidos usa `resolved_at` no balde + `DASHBOARD_RESOLVED_STATUSES` com o
  mesmo setor: é o `periodResolvedCount` (`:81` e `:91`), numerador da Taxa
  (`resolutionRateFor`).
- Baldes futuros viram `null`, mas não há `created_at` nem `resolved_at` no
  futuro, então nada se perde na soma.

Portanto: **soma de Abertos = "Chamados no período"** e **soma de Resolvidos =
numerador "X resolvidos de Y" da Taxa**, em cada modo e em qualquer período.
O **denominador** da Taxa ("recebidos") **não** é série do gráfico: aceites de
outro setor no período entram nos recebidos e só entram em Abertos se o
chamado foi criado no período. Não comparar.

### Tipos — `app/_lib/types/dashboard.ts` (acréscimo, já publicado)

```ts
export type DashboardActivityByMode = DashboardByMode<DashboardActivityPoint[]>

export interface DashboardActivityEmptyCopy {
  title: string
  descriptions: Record<TimeBucketGranularity, string>
}
```

`DashboardActivityCount`, `DashboardActivityPoint` e `DashboardActivitySeries`
**não mudam**: cada modo é uma lista completa de pontos, então
`buildActivitySeries`, `isActivityEmpty`, `recordedActivityPoints`,
`activityLastPointIndex` e o `ActivityChart` servem aos dois modos.

### Domínio — `app/_lib/domain/dashboard.ts` (acréscimo, já publicado)

| Export                                                        | Valor / semântica                                                                                                                                                                                    |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EMPTY_ACTIVITY_DESCRIPTIONS`                                 | **mesmo valor** de hoje (`Os chamados abertos e resolvidos no setor aparecem aqui, hora a hora.` etc.), agora montado por um auxiliar privado com a cadência (`hora a hora` … `mês a mês`)           |
| `EMPTY_OWN_ACTIVITY_TITLE`                                    | `"Nenhum chamado seu aberto ou resolvido no período"`                                                                                                                                                |
| `EMPTY_OWN_ACTIVITY_DESCRIPTIONS`                             | por granularidade: `Os chamados do setor destinados a você abertos e resolvidos aparecem aqui, hora a hora.` (e `dia a dia`, `semana a semana`, `mês a mês`), pelo mesmo auxiliar, sem repetir texto |
| `EMPTY_ACTIVITY_COPY`                                         | por modo (`satisfies Record<DashboardViewMode, DashboardActivityEmptyCopy>`): `coletivo` = `EMPTY_ACTIVITY_TITLE`/`EMPTY_ACTIVITY_DESCRIPTIONS` (inalterados), `individual` = as duas acima          |
| `ACTIVITY_OWN_SCOPE_LABEL`                                    | `"seus chamados"`                                                                                                                                                                                    |
| `activityTableCaption(range, granularity, mode = "coletivo")` | Coletivo igual a hoje (`Abertos × resolvidos, 24 out 2026 · por hora`). Individual: `Abertos × resolvidos, seus chamados, 24 out 2026 · por hora`                                                    |

Decisões:

- **Legenda não muda por modo.** Mesmas séries, rótulos e cores; o que varia é
  só se ela aparece (depende do vazio do modo).
- **Caption muda por modo.** A tabela é `sr-only` e quem navega por tabelas
  ouve só o `caption`, sem passar pelo switch; sem o escopo, as duas versões
  teriam o mesmo nome com números diferentes. O título visível continua o
  mesmo nos dois modos, como nos outros cards.

Sem mudança: `ACTIVITY_CARD_LABEL`, `ACTIVITY_LOADING_LABEL`,
`ACTIVITY_SERIES*`, `ACTIVITY_GRANULARITY_LABELS`,
`ACTIVITY_BUCKET_COLUMN_LABELS`, `ACTIVITY_TODAY_LABEL`, `EMPTY_ACTIVITY_TITLE`,
`activityGranularityFor`, `activityPeriodLabel`, `buildActivitySeries` e
auxiliares. A chamada atual `activityTableCaption(range, granularity)` continua
compilando e igual.

### `df-data` — `app/_lib/data/dashboard.ts`

Assinatura alterada (parâmetro opcional no fim; sem ele, comportamento e SQL
**idênticos** aos de hoje):

```ts
export async function listActivityBuckets(
  departmentId: number,
  buckets: readonly TimeBucket[],
  assigneeId?: number,
): Promise<DashboardActivityCount[]>
```

- **Onde entra o filtro: no `on` do `left join`**, entre a condição de setor e
  o `or` das datas, nunca no `where`. No `where`, a linha do balde sem
  chamado meu (`t.*` nulo) seria descartada e o balde sumiria do resultado;
  no `on`, o balde continua saindo com `0`, como no Coletivo.

  ```sql
  left join ticket t
    on t.current_department_id = $dep
    and t.assigned_to = $assigneeId
    and (
      (t.created_at >= b.bucket_start and t.created_at < b.bucket_end)
      or (t.resolved_at >= b.bucket_start and t.resolved_at < b.bucket_end)
    )
  ```

  (a linha `and t.assigned_to = $assigneeId` só existe com `assigneeId`).

- Em Drizzle, um fragmento condicional interpolado nessa posição:

  ```ts
  const assigneeFilter =
    assigneeId === undefined
      ? sql.empty()
      : sql`and t.assigned_to = ${assigneeId}`
  ```

  Escrever `t.assigned_to` cru, como o resto do
  `on`: `${ticket.assignedTo}` sairia qualificado pelo nome da tabela e não
  casaria com o alias `t`. Sem pessoa, o texto do SQL é o de hoje (a menos de
  espaço em branco). Nada de função duplicada; `filter`, `group by`,
  `order by` e o mapeamento não mudam.

- `buckets` vazio → `[]`, sem consulta, nos dois modos.
- Rodar `EXPLAIN ANALYZE` com e sem `assigneeId`, com 24 baldes (Hoje) e 53
  (Personalizado de um ano), para o Administrador de QA Suporte, e colar na
  resposta; o plano do Coletivo não pode mudar.

### `df-actions`, `df-auth`, `df-email`

Nada.

### `df-ui` — o que fazer

`DashboardActivity` (servidor) passa a receber `userId` (o `actor.id` de
`page.tsx`, como os outros cards) e faz **duas** leituras num `Promise.all`,
sobre os **mesmos** baldes:

```ts
const granularity = activityGranularityFor(range)
const buckets = timeBuckets(range, granularity)
const [coletivo, individual] = await Promise.all([
  listActivityBuckets(departmentId, buckets),
  listActivityBuckets(departmentId, buckets, userId),
])
const pointsByMode: DashboardActivityByMode = {
  coletivo: buildActivitySeries(buckets, granularity, coletivo, now),
  individual: buildActivitySeries(buckets, granularity, individual, now),
}
```

**Estrutura.** Como na Etapa 3, o cabeçalho também varia (a legenda depende do
vazio de cada modo), então são **dois** pontos com `DashboardViewPane`, ambos
**dentro** de um único `DashboardPanel`:

```tsx
<DashboardPanel aria-labelledby={TITLE_ID} className="xl:col-span-3">
  <DashboardActivityHeader
    titleId={TITLE_ID}
    periodLabel={activityPeriodLabel(range, granularity)}
  >
    {DASHBOARD_VIEW_MODES.filter(
      (mode) => !isActivityEmpty(pointsByMode[mode]),
    ).map((mode) => (
      <DashboardViewPane key={mode} mode={mode}>
        <ActivityLegend />
      </DashboardViewPane>
    ))}
  </DashboardActivityHeader>
  {DASHBOARD_VIEW_MODES.map((mode) => (
    <DashboardViewPane key={mode} mode={mode} className="flex flex-1 flex-col">
      <DashboardActivityContent
        points={pointsByMode[mode]}
        mode={mode}
        range={range}
        granularity={granularity}
      />
    </DashboardViewPane>
  ))}
</DashboardPanel>
```

- `DashboardPanel` um só (item da grade da linha 3, com o `col-span`); `h2`
  com `TITLE_ID` um só, fora dos painéis de modo. Nenhum `id` dentro de
  `DashboardViewPane`.
- **Legenda.** Só os modos com dados ganham painel no cabeçalho (`filter`):
  modo vazio não tem legenda, e não fica um `div` vazio como item do
  `flex-wrap` (sem largura mas com `gap-x-3`, ele poderia quebrar para a linha
  de baixo em 390 px e somar o `gap-y-1` à altura). Com o modo vazio ativo e o
  outro com dados, o painel do outro está `hidden`: o cabeçalho mostra só
  título e período, como o vazio de hoje.
- **Conteúdo.** Peça extraída: `_components/dashboard-activity-content.tsx`
  (servidor), recebendo `points: DashboardActivityPoint[]`,
  `mode: DashboardViewMode`, `range: DateRange` e
  `granularity: TimeBucketGranularity`, e desenhando exatamente o que o card
  desenha hoje abaixo do cabeçalho (o vazio com `mt-3 … min-h-56 flex-1`, ou o
  `div relative mt-3 min-h-56 flex-1` do gráfico e a `div sr-only` da tabela).

| Onde          | Antes                                      | Agora                                                 |
| ------------- | ------------------------------------------ | ----------------------------------------------------- |
| vazio, título | `EMPTY_ACTIVITY_TITLE`                     | `EMPTY_ACTIVITY_COPY[mode].title`                     |
| vazio, texto  | `EMPTY_ACTIVITY_DESCRIPTIONS[granularity]` | `EMPTY_ACTIVITY_COPY[mode].descriptions[granularity]` |
| `caption`     | `activityTableCaption(range, granularity)` | `activityTableCaption(range, granularity, mode)`      |
| gráfico       | `<ActivityChart points={points} />`        | `<ActivityChart points={points} mode={mode} />`       |
| legenda       | `isEmpty ? null : <ActivityLegend />`      | painel por modo com dados (acima)                     |

**Altura e `flex-1`: `className` em `DashboardViewPane`.** Hoje a área do
gráfico (e o vazio) é `flex-1` dentro do `DashboardPanel`
(`flex h-full flex-col`); em `xl+` quem dita a altura da linha é o card de
transferências e o gráfico preenche o resto. Com o `div` do painel de modo no
meio, o `flex-1` do filho deixaria de valer (o `div` é bloco) e o gráfico
ficaria em `min-h-56`, mudando o Coletivo. Por isso `DashboardViewPane` ganha
`className?: string`, aplicado no `div`, e este card passa
`"flex flex-1 flex-col"`. Isto **revisa** a regra da Etapa 1 ("o `div` não
leva classe de `display`") para este caso, verificado: o preflight do
Tailwind v4 instalado declara
`[hidden]:where(:not([hidden='until-found'])) { display: none !important; }`
(`node_modules/tailwindcss/preflight.css:396`), e o `!important` vence a
utilidade `flex` de qualquer camada. O painel oculto continua
`display: none`. Proibido: `!flex` ou qualquer `display` com `!` no
`className` do painel. Os outros chamadores não passam `className` e ficam
iguais.

**Gráfico em painel oculto: mitigação obrigatória.** Verificado no código do
Recharts instalado (`recharts@3.8.0`):

- `ResponsiveContainer` mede no `useEffect` com `getBoundingClientRect()` e
  observa com `ResizeObserver`
  (`node_modules/recharts/es6/component/ResponsiveContainer.js`). Dentro de
  `display: none` a medida é `0 × 0`: o contexto não desenha o gráfico
  (`ResponsiveContainerContextProvider` devolve `null`) e `warn(...)` emite
  `console.warn("The width(0) and height(0) of chart should be greater than 0 …")`.
  O `warn` tem `isDev = true` fixo (`es6/util/LogUtils.js:2`), então o aviso
  sai também no build de produção. Viola AP16 do contrato do Coletivo.
- Ao revelar, o `ResizeObserver` dispararia (mudança de `0 × 0` para o tamanho
  real) e o gráfico re-mediria; o risco não é tamanho final errado, é o aviso
  e o trabalho inútil no modo oculto.

Mitigação: **o gráfico só é montado no modo ativo.** `ActivityChart`
(cliente) ganha a prop `mode: DashboardViewMode`, lê `useDashboardViewMode()`
e devolve `null` quando `mode !== activeMode` (hooks antes do retorno).
Consequências:

- Ao trocar de modo, o gráfico do modo novo monta já visível e mede o tamanho
  real; o do modo anterior desmonta. Nada de `ResizeObserver` em elemento
  oculto, nenhum aviso. Trocar o período remonta o card (`Suspense` com `key`)
  e só o modo ativo monta.
- Os pontos já vieram do servidor como props: montar não faz requisição.
- Hidratação: o estado inicial é `"coletivo"` no servidor e no cliente, então
  o HTML do servidor já sai com o gráfico do Coletivo e sem o do Individual;
  não há diferença.
- O `div relative mt-3 min-h-56 flex-1` e a tabela `sr-only` continuam no DOM
  nos dois modos (a tabela do modo oculto fica fora da árvore pelo `hidden`).
- O primeiro quadro do gráfico recém-montado usa o `initialDimension` do
  primitivo (320 × 200, `app/_components/ui/chart.tsx:10`) até o efeito medir,
  como já acontece na carga da página. Efeitos de atualização vinda de evento
  discreto (o `change` do rádio) rodam antes da pintura, então não se espera
  quadro visível no tamanho provisório; se o QA perceber um salto, é
  observação, não falha, desde que o tamanho final esteja certo (AR9).
- Por que no `ActivityChart` e não no `DashboardViewPane`: só o Recharts
  precisa medir; os outros cards seguem com o conteúdo no DOM, que é o que dá
  troca instantânea sem remontar. O primitivo `chart.tsx` não é editado.

**`id` duplicado.** Não há: o `ChartContainer` gera o identificador com
`React.useId()` (`chart.tsx:58`) e o usa só em `data-chart` e no `<style>`
escopado, não em atributo `id`; o `ResponsiveContainer` só emite `id` se
recebe a prop, e o primitivo não passa (`chart.tsx:73`); os `clipPath` do
Recharts vêm de `React.useId` (`es6/util/useId.js`), únicos por instância. E,
com a mitigação, há **um** gráfico montado por vez.

**Suspense e esqueleto.** `page.tsx`: só acrescenta `userId={actor.id}` em
`DashboardActivity`; o `Suspense` continua com
`key={serializeDashboardParams(selection)}`. `DashboardActivitySkeleton`
**não muda**: o cabeçalho dele não tem painéis de modo e o esqueleto continua
um só.

### Consultas de conferência (`df-qa`)

Contas, ids, banco só leitura e bordas como na Etapa 1 deste contrato. Sem a
linha `and t.assigned_to = :eu` (nas **duas** subconsultas), cada consulta
abaixo é a do Coletivo (`AH`, `AD`, `AW` da revisão 2026-10-24 do contrato do
Coletivo). Para Semana e Mês, `:ate` = hoje (os dias seguintes são baldes
futuros, sem valor no gráfico).

Consulta `IAH(dep, eu, dia)` — por hora:

```sql
with horas as (
  select :dia::date + make_interval(hours => n) as ini
  from generate_series(0, 23) as n
)
select extract(hour from h.ini)::int as hora,
  (select count(*) from ticket t
    where t.current_department_id = :dep
      and t.assigned_to = :eu
      and t.created_at >= h.ini at time zone 'America/Sao_Paulo'
      and t.created_at < (h.ini + interval '1 hour') at time zone 'America/Sao_Paulo'
  ) as abertos,
  (select count(*) from ticket t
    where t.current_department_id = :dep
      and t.assigned_to = :eu
      and t.status in ('resolvido', 'fechado')
      and t.resolved_at >= h.ini at time zone 'America/Sao_Paulo'
      and t.resolved_at < (h.ini + interval '1 hour') at time zone 'America/Sao_Paulo'
  ) as resolvidos
from horas h
order by h.ini
```

Consulta `IAD(dep, eu, de, ate)` — por dia:

```sql
with dias as (
  select d::date as dia
  from generate_series(:de::date, :ate::date, interval '1 day') d
)
select d.dia,
  (select count(*) from ticket t
    where t.current_department_id = :dep
      and t.assigned_to = :eu
      and t.created_at >= d.dia::timestamp at time zone 'America/Sao_Paulo'
      and t.created_at < (d.dia + 1)::timestamp at time zone 'America/Sao_Paulo'
  ) as abertos,
  (select count(*) from ticket t
    where t.current_department_id = :dep
      and t.assigned_to = :eu
      and t.status in ('resolvido', 'fechado')
      and t.resolved_at >= d.dia::timestamp at time zone 'America/Sao_Paulo'
      and t.resolved_at < (d.dia + 1)::timestamp at time zone 'America/Sao_Paulo'
  ) as resolvidos
from dias d
order by d.dia
```

Consulta `IAS(dep, eu, de, ate, unidade)` — por semana (`unidade = 'week'`)
ou por mês (`unidade = 'month'`), cortados nas pontas:

```sql
with dias as (
  select d::date as dia
  from generate_series(:de::date, :ate::date, interval '1 day') d
), baldes as (
  select min(dia) as ini, max(dia) as fim from dias
  group by date_trunc(:unidade, dia)
)
select b.ini, b.fim,
  (select count(*) from ticket t
    where t.current_department_id = :dep
      and t.assigned_to = :eu
      and t.created_at >= b.ini::timestamp at time zone 'America/Sao_Paulo'
      and t.created_at < (b.fim + 1)::timestamp at time zone 'America/Sao_Paulo'
  ) as abertos,
  (select count(*) from ticket t
    where t.current_department_id = :dep
      and t.assigned_to = :eu
      and t.status in ('resolvido', 'fechado')
      and t.resolved_at >= b.ini::timestamp at time zone 'America/Sao_Paulo'
      and t.resolved_at < (b.fim + 1)::timestamp at time zone 'America/Sao_Paulo'
  ) as resolvidos
from baldes b
order by b.ini
```

Coerência: `sum(abertos)` = `chamados` e `sum(resolvidos)` = `resolvidos` de
`IM(dep, eu, inicio, fim)` da Etapa 1, no mesmo período.

Esperado no Individual: pontos registrados = linhas da consulta do período
(até o balde atual), mesma ordem e rótulos do Coletivo; tabela `sr-only` com
`caption` `Abertos × resolvidos, seus chamados, <período> · por <unidade>`,
primeira coluna `Hora`/`Dia`/`Semana`/`Mês`. Todos os registrados em `0`:
sem legenda, `Nenhum chamado seu aberto ou resolvido no período` +
`Os chamados do setor destinados a você abertos e resolvidos aparecem aqui, <cadência>.`

### Cenários do `df-qa`

| #    | Quem   | Ação                                                                                                                                     | Esperado                                                                                                                                                                                                                                                                   |
| ---- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AR1  | A      | Coletivo em Hoje, Semana, Mês e Personalizado 2026-08-01 a hoje                                                                          | idêntico ao de antes: valores = `AH`/`AD`/`AW` do contrato do Coletivo; `caption` `Abertos × resolvidos, <período>` (sem "seus chamados"); vazio, se houver, com os textos de hoje (AP15)                                                                                  |
| AR2  | A      | Individual em Hoje                                                                                                                       | 24 pontos (`0h`–`23h`), valores até a hora atual = `IAH(S, A, hoje)`, linhas param na hora atual, marcador nela. Se A não tiver atividade hoje, o card cai no vazio (AR8) e AR2 fica NÃO EXECUTADO para "por hora com dados" (coberto por AR5)                             |
| AR3  | A      | Individual em Semana e em Mês                                                                                                            | `por dia`; valores = `IAD(S, A, <início>, hoje)`; nada desenhado nos dias futuros; marcador em "Hoje"                                                                                                                                                                      |
| AR4  | A      | Individual em Personalizado 2026-08-01 a hoje; depois Personalizado 2025-01-01 a hoje                                                    | o primeiro `por semana`, valores = `IAS(…, 'week')`; o segundo (mais de 53 semanas) `por mês`, valores = `IAS(…, 'month')`; primeiro e último baldes cortados pelo intervalo, como no Coletivo                                                                             |
| AR5  | A      | Individual em Personalizado de um dia passado com atividade de A (achar com `IAH`)                                                       | `<dia> · por hora`; 24 pontos registrados, marcador em `23h`; valores = `IAH(S, A, dia)`. Sem dia assim: NÃO EXECUTADO, com a consulta                                                                                                                                     |
| AR6  | A      | Coerência, em cada período de AR2–AR5                                                                                                    | soma de Abertos (tabela `sr-only`) = "Chamados no período" do Individual = `chamados` de `IM`; soma de Resolvidos = o `X` de "X resolvidos de Y" da Taxa do Individual = `resolvidos` de `IM`                                                                              |
| AR7  | M      | Individual em Hoje e Mês; Coletivo em Mês                                                                                                | Individual = consultas com `:eu` do Membro, diferente do de A quando os destinatários diferem; Coletivo de M igual ao de A                                                                                                                                                 |
| AR8  | A ou M | período com atividade do setor e nenhuma minha (achar com `AD`/`IAD` ou `AH`/`IAH`), nos dois modos                                      | Individual: sem legenda; `Nenhum chamado seu aberto ou resolvido no período` + texto pessoal com a cadência da granularidade; card sem encolher (mesma altura do Coletivo). Coletivo no mesmo período: gráfico e legenda. Sem período assim: NÃO EXECUTADO, sem criar dado |
| AR9  | A      | 1280 px: Coletivo → Individual → Coletivo; depois, em Individual, trocar o período; depois redimensionar a janela em Individual e voltar | em cada troca o gráfico visível preenche a área do card (largura do card menos o padding; altura ≥ 224 px e igual à de antes), sem área em branco nem gráfico preso em 320 × 200; eixo e último ponto corretos; tooltip funciona depois de cada troca                      |
| AR10 | A      | árvore de acessibilidade, nos dois modos                                                                                                 | **uma** tabela exposta, com `caption` `Abertos × resolvidos, <período>` no Coletivo e `Abertos × resolvidos, seus chamados, <período>` no Individual; linhas = pontos registrados do modo, valores das consultas                                                           |
| AR11 | A      | DevTools → Rede, limpar; alternar Coletivo ↔ Individual várias vezes                                                                     | **nenhuma** requisição; o card troca junto com a linha 1, Principal ofensor e Maiores atrasos                                                                                                                                                                              |
| AR12 | A      | marcar Individual; F5                                                                                                                    | volta a Coletivo, gráfico do Coletivo; URL inalterada                                                                                                                                                                                                                      |
| AR13 | A      | Individual, trocar o período pelo filtro                                                                                                 | continua em Individual; gráfico com as séries Individuais do período novo                                                                                                                                                                                                  |
| AR14 | A      | 390×844, nos dois modos, Hoje e Mês                                                                                                      | sem rolagem horizontal; legenda pode quebrar para baixo; título, período e legenda sem `…`; rótulos do último ponto inteiros                                                                                                                                               |
| AR15 | A      | árvore e foco (Playwright snapshot e Tab), nos dois modos                                                                                | **um** título "Abertos × resolvidos" (um `h2`, um `section` rotulado); **no máximo uma** legenda exposta; tabela e legenda do modo oculto fora da árvore; nada do modo oculto recebe foco                                                                                  |
| AR16 | A      | DOM, nos dois modos: ids repetidos e `[data-slot="chart"]`                                                                               | nenhum `id` duplicado no documento; **exatamente um** `[data-slot="chart"]` quando o modo ativo tem dados, nenhum quando está vazio                                                                                                                                        |
| AR17 | A      | 1280 px, nos dois modos                                                                                                                  | card na mesma posição e largura (~3/5) da linha 3, mesma altura externa do card de Transferências; Transferências mostra o Coletivo também no Individual — não é defeito                                                                                                   |
| AR18 | A      | recarregar `/dashboard` com rede lenta (throttling) e olhar o esqueleto do gráfico                                                       | um esqueleto só, com título e período, como antes                                                                                                                                                                                                                          |
| AR19 | todos  | toda a bateria                                                                                                                           | console e dev server (`next-devtools`) sem erro, sem aviso de hidratação e **sem aviso do Recharts de largura/altura `0`/`-1`** (na carga, depois de cada troca de modo e de período); nenhuma escrita no banco                                                            |

Não executáveis nesta rodada: Diretoria (login do Diretor recusado).

Notas para não reportar como defeito:

- Soma de Abertos ≠ denominador da Taxa ("recebidos"): os aceites de outro
  setor entram nos recebidos e só entram em Abertos se o chamado foi criado no
  período.
- Um chamado que eu resolvi e que hoje está com outra pessoa sai da minha
  série de Resolvidos (destinatário atual).
- Legenda igual nos dois modos; só o `caption` da tabela acessível cita
  "seus chamados".
- Transferências ainda no Coletivo no Individual.
- Os cosméticos aceitos do Coletivo (cursor sobre balde futuro, rótulos densos
  por hora, sobrepasso do `monotone`) valem igual no Individual.

### Riscos da Etapa 4

- **Aviso do Recharts em painel oculto.** Coberto pela montagem só no modo
  ativo (AR9, AR16, AR19).
- **Coletivo com altura diferente** se o painel de modo não levar
  `flex flex-1 flex-col` (AR17).
- **Hoje sem atividade** do setor ou da conta, como no AP2 do Coletivo: AR2
  pode ficar NÃO EXECUTADO, coberto em parte por AR5.

### Critério de pronto da Etapa 4

1. Individual bate com `IAH`/`IAD`/`IAS` em Hoje, Semana, Mês e Personalizado
   longo, semanal e mensal (AR2–AR5, AR7).
2. Somas coerentes com a linha 1 do Individual (AR6).
3. Coletivo idêntico ao de antes (AR1, AR17).
4. Estado vazio do Individual (AR8).
5. Gráfico no tamanho certo ao trocar de modo e de período (AR9).
6. Tabela `sr-only` correta por modo; um título, no máximo uma legenda e uma
   tabela expostos; modo oculto fora da árvore e do foco; sem `id` duplicado
   (AR10, AR15, AR16).
7. Troca sem requisição; F5 volta a Coletivo; modo sobrevive à troca de
   período (AR11, AR12, AR13).
8. 390 px sem rolagem horizontal; esqueleto inalterado (AR14, AR18).
9. Console sem erro, sem aviso de hidratação nem do Recharts (AR19).
10. `npx tsc --noEmit`, `npm run lint`, `npm run build`; `df-reviewer` sem
    bloqueante; `df-qa` aprova AR1–AR19 (Diretoria não executada).

### `tsc` entre ondas

`listActivityBuckets` ganha parâmetro opcional no fim e `activityTableCaption`
ganha `mode` com padrão: compatíveis. `DashboardViewPane` ganha `className`
opcional. A prop `mode` obrigatória em `ActivityChart` só afeta o `df-ui`, que
muda o chamador na mesma onda.

### Checklist da Etapa 4

- [x] Este contrato e o plano; `DashboardActivityByMode`,
      `DashboardActivityEmptyCopy`; `EMPTY_OWN_ACTIVITY_TITLE`,
      `EMPTY_OWN_ACTIVITY_DESCRIPTIONS`, `EMPTY_ACTIVITY_COPY`,
      `ACTIVITY_OWN_SCOPE_LABEL`, `activityTableCaption` com `mode`
      (`df-architect`)
- [x] `listActivityBuckets` com `assigneeId?` no `on` do `left join`,
      `EXPLAIN ANALYZE` com e sem pessoa, 24 e 53 baldes, na resposta
      (`df-data`)
- [x] `DashboardActivity` com `userId`, duas leituras em `Promise.all`,
      legenda por modo no cabeçalho, `DashboardActivityContent` por modo,
      `className` em `DashboardViewPane`, `ActivityChart` com `mode` montado
      só no modo ativo, `page.tsx` (`df-ui`)
- [x] `npx tsc --noEmit`, `npm run lint`, `npm run build`; `df-reviewer`
      (aprovado sem atenções)
- [x] Cenários AR1–AR19 (`df-qa`): 16 de 19 passaram, 0 falhas; AR17 e AR18
      parciais, AR2 não executado
      (`docs/test-reports/2026-10-28-dashboard-individual-mode-activity.md`)

Etapa 4 concluída, aguardando commit.

### Limites conhecidos da Etapa 4

- **AR2 não executado.** Não havia chamados hoje; o recorte hora a hora fica
  coberto pelo AR5.
- **AR17 parcial.** A proporção de ~3/5 do gráfico não foi medida.
- **AR18 parcial.** O esqueleto de carregamento não foi capturado.
- **Diretoria não executada.** Login do Diretor recusado no QA.
- **Sem índice no plano.** Com 248 chamados o planejador não usa índice;
  esperado nesse volume.
