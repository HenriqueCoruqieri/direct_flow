# Contrato — Aba "Aprovações"

Aprovado pelo usuário em `/consult` em 2026-10-15. Plano em
`docs/plans/approvals.md`. Este documento é a referência técnica: tipos,
domínio, validação, consulta, telas e cenários.

Relação com o ADR 016 (`docs/adr/016-transfer-moves-ticket-before-acceptance.md`):
o ADR diz que a "caixa de aprovações" do desenho original foi superada. Continua
superada no sentido do ADR — **ninguém aprova numa caixa**; aceite e recusa
seguem no detalhe do chamado ("Atender" e "Recusar"), por qualquer pessoa do
setor de destino. Esta aba é só a **lista** das transferências pendentes
recebidas pelo setor de quem vê, com atalho para o detalhe. O ADR ganhou nota de
revisão de 2026-10-15 apontando para cá.

> Revisão de 2026-10-27 (`docs/contracts/department-transfer.md`, seção
> "Revisão de 2026-10-27 — Destinatário no envio", que prevalece no que
> diverge): o envio pode indicar um **destinatário** do setor de destino. A
> lista continua com **todas** as pendentes do setor, inclusive as endereçadas
> a outra pessoa, e ganha a coluna e o filtro **"Para"**
> (`TRANSFER_RECIPIENT_LABEL`), com o nome do destinatário efetivo ou
> `Fila do setor` (`describeTransferRecipient`). `ApprovalListItem` ganhou
> `toDepartmentId` e `recipient`. Com destinatário, só ele atende ou recusa no
> detalhe; os colegas só veem. O contador não muda (conta todas). Onde este
> documento diz "por qualquer pessoa do setor de destino", leia "sem
> destinatário".

Versões observadas: `next@16.3.5`, `drizzle-orm@0.45.2`, `zod@4.6.5`,
`@tanstack/react-table@9.2.4`.

## Escopo técnico em uma frase

Sem schema e sem migration: uma página `/approvals` lista os chamados com
`ticket_transfer` **pendente** cujo `to_department_id` é o setor de quem vê,
filtrada pela **data do envio**; o item do menu mostra a contagem dessas
pendências, calculada pelo layout `(app)`.

## Decisões do arquiteto (não fixadas no plano)

| Tema                         | Decisão                                                                                                                                                                                                                                                                                                                                        |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fonte da pendência           | `ticket_transfer.status = 'pendente'` e `to_department_id = setor de quem vê`. Não filtra `ticket.status` nem `ticket.current_department_id`: pelo ADR 016 (e pela migration `0011`), toda pendente aponta para o setor atual do chamado e todo chamado com pendente está em `aguardando_aprovacao`. Lista e contagem usam **o mesmo** `where` |
| Ordem                        | `ticket_transfer.created_at desc, ticket_transfer.id desc` — o envio mais recente primeiro, como as outras listas (mais recente primeiro). Casa com o índice `transfer_inbox_idx` (`to_department_id, status, created_at desc`)                                                                                                                |
| Período                      | Filtra `ticket_transfer.created_at` (data do envio), **não** `ticket.created_at`. É a única lista do projeto assim. Mesmos presets e parâmetros (`periodo`, `de`, `ate`) da Fila; padrão `todos`                                                                                                                                               |
| Contador                     | Sem período: conta **todas** as pendentes do setor. Não depende do filtro da página                                                                                                                                                                                                                                                            |
| Setor "Não alocado"          | `approvalsDepartmentIdFor` devolve `null`; a página não consulta o banco e mostra o vazio; o layout não conta (sem selo). O item do menu aparece mesmo assim (decisão 1)                                                                                                                                                                       |
| Copy do vazio                | Uma só, valha o período que valer: título `Nenhum chamado aguardando aprovação`, descrição `Nenhum chamado foi encaminhado para este setor no período informado` (frase do usuário, sem ponto final, literal)                                                                                                                                  |
| "Quem enviou"                | Fica fora da linha: nenhuma coluna o mostra e o detalhe já o exibe no aviso de transferência pendente. Não é selecionado (KISS)                                                                                                                                                                                                                |
| Selo                         | Até 99; acima, `99+`. O nome acessível sempre leva o número real (`Aprovações, 120 aguardando`)                                                                                                                                                                                                                                                |
| Origem do detalhe            | Nova origem `from=approvals` + período, como a da Fila. Link de voltar `Aprovações` → `/approvals?periodo=…`                                                                                                                                                                                                                                   |
| Contador depois de "Recusar" | Resolvido na UI: `router.refresh()` logo depois do `router.replace(leaveHref)` no ramo sem acesso. A action não muda (seção "Atualização do contador")                                                                                                                                                                                         |

## Tabelas, enums e migration

Nada novo. Leitura de `ticket_transfer` (`id`, `ticket_id`,
`from_department_id`, `to_department_id`, `status`, `created_at`), `ticket`
(`id`, `title`, `type`, `status`, `created_at`), `department` (`name` da
origem), `ticket_tag` e `tag` (tag única do chamado). Índice usado:
`transfer_inbox_idx` (`db/schema.ts:261-265`).

---

## Tipos

### `app/_lib/types/approvals.ts` (novo)

```ts
export interface ApprovalsAccessFacts {
  departmentId: number
  isUnassigned: boolean
}

export interface ApprovalListItem {
  id: number
  title: string
  type: TicketType
  status: TicketStatus
  tagId: number | null
  tagName: string | null
  createdAt: Date
  transferId: number
  fromDepartmentId: number
  fromDepartmentName: string
  sentAt: Date
}

export interface ApprovalsNavBadge {
  text: string
  accessibleLabel: string
}
```

`ApprovalListItem` satisfaz `TicketListRow` (`app/(app)/_components/ticket-list-row.ts`)
estruturalmente: as colunas compartilhadas de `createTicketListColumns` servem
sem adaptação. `id` é o do **chamado**; `transferId` só serve de chave estável
se o `df-ui` precisar. `createdAt` é a abertura do chamado; `sentAt` é
`ticket_transfer.created_at`. `AccountFacts` (de `getAccountFacts`) satisfaz
`ApprovalsAccessFacts`.

### `app/_lib/types/ticket-detail-origin.ts` (alterado)

```ts
export interface TicketDetailApprovalsOrigin {
  source: "approvals"
  period: PeriodFilterSelection
}

export type TicketDetailOrigin =
  | TicketDetailMyTicketsOrigin
  | TicketDetailQueueOrigin
  | TicketDetailApprovalsOrigin
```

## Domínio

### `app/_lib/domain/approvals.ts` (novo)

| Nome                              | Valor / semântica                                                                                                                                             |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `APPROVALS_PATH`                  | `"/approvals"`                                                                                                                                                |
| `APPROVALS_LABEL`                 | `"Aprovações"` (menu, título da página, `metadata.title`, link de voltar)                                                                                     |
| `APPROVALS_PERIOD_PRESETS`        | `ALL_TIME_PERIOD_PRESETS` (`todos`, `hoje`, `semana`, `mes`)                                                                                                  |
| `DEFAULT_APPROVALS_PERIOD`        | `{ periodo: "todos" }`                                                                                                                                        |
| `APPROVALS_EMPTY`                 | `MyTicketsEmptyCopy` = `{ title: "Nenhum chamado aguardando aprovação", description: "Nenhum chamado foi encaminhado para este setor no período informado" }` |
| `APPROVALS_FROM_DEPARTMENT_LABEL` | `"Veio de"` (cabeçalho da coluna e rótulo do filtro)                                                                                                          |
| `APPROVALS_SENT_AT_LABEL`         | `"Enviado em"`                                                                                                                                                |
| `APPROVALS_BADGE_MAX`             | `99`                                                                                                                                                          |

```ts
approvalsDepartmentIdFor(facts: ApprovalsAccessFacts | null): number | null
formatApprovalsBadgeCount(count: number): string
approvalsNavBadgeFor(count: number): ApprovalsNavBadge | null
```

| Função                      | Semântica                                                                                                                                                      |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `approvalsDepartmentIdFor`  | `null` se `facts` é `null` ou `isUnassigned`; senão `facts.departmentId`. Vale para a Diretoria também: devolve o id da Diretoria (só o que foi enviado a ela) |
| `formatApprovalsBadgeCount` | `count > 99` → `"99+"`; senão `String(count)`                                                                                                                  |
| `approvalsNavBadgeFor`      | `count <= 0` → `null` (sem selo). Senão `{ text: formatApprovalsBadgeCount(count), accessibleLabel: "Aprovações, {count} aguardando" }`                        |

### `app/_lib/domain/ticket-detail-origin.ts` (alterado)

`TICKET_DETAIL_FROM_APPROVALS = "approvals"`, tipo literal amarrado a
`TicketDetailApprovalsOrigin["source"]`.

## Validação

### `app/_lib/validation/approvals.ts` (novo)

```ts
export const approvalsPeriodSchema // = allTimePeriodSchema
export type ApprovalsPeriodParams = z.infer<
  ReturnType<typeof approvalsPeriodSchema>
>
export const parseApprovalsPeriod: (
  raw: RawSearchParams,
  today: DateKey,
) => PeriodFilterSelection
export const approvalsHref: (period: PeriodFilterSelection) => string
```

- `parseApprovalsPeriod`: `readPeriodParams(raw)` contra
  `allTimePeriodSchema(today)`; inválido (período desconhecido, data futura,
  `ate < de`) → `DEFAULT_APPROVALS_PERIOD` (`todos`), como a Fila.
- `approvalsHref(period)` = `periodFilterHref("/approvals", {}, period)`. Ex.:
  `/approvals?periodo=semana`, `/approvals?periodo=personalizado&de=2026-10-01&ate=2026-10-15`.

### `app/_lib/validation/ticket-detail-origin.ts` (alterado)

```ts
export const approvalsTicketDetailHref: (
  period: PeriodFilterSelection,
  ticketId: number,
) => string
```

| Nome                        | Semântica                                                                                                                                       |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `parseTicketDetailOrigin`   | `from=queue` como antes; `from=approvals` → `{ source: "approvals", period: parseApprovalsPeriod(raw, today) }`; qualquer outro → Meus chamados |
| `approvalsTicketDetailHref` | `periodFilterHref(ticketDetailPath(id), { from: "approvals" }, period)`. Ex.: `/tickets/125?from=approvals&periodo=hoje`                        |
| `ticketDetailBackLinkFor`   | `approvals` → `{ href: approvalsHref(period), label: "Aprovações" }`; `queue` e `my_tickets` sem mudança                                        |

O `href` de voltar continua remontado a partir de valores validados (sem open
redirect).

---

## `df-data`

### `app/_lib/data/approvals.ts` (novo)

```ts
export async function listPendingApprovals(
  departmentId: number,
  range: DateRange | null = null,
): Promise<ApprovalListItem[]>

export async function countPendingApprovals(
  departmentId: number,
): Promise<number>
```

Mesma forma de `listQueueTickets(departmentId, tab, range)`: `range` vem de
`resolvePeriodFilterRange(period, now)` (`null` = Todos).

SQL esperado de `listPendingApprovals` (forma; a escrita em Drizzle é do
`df-data`):

```sql
select t.id, t.title, t.type, t.status,
       tg.id as tag_id, tg.name as tag_name, t.created_at,
       tr.id as transfer_id, tr.from_department_id,
       d.name as from_department_name, tr.created_at as sent_at
from ticket_transfer tr
join ticket t on t.id = tr.ticket_id
join department d on d.id = tr.from_department_id
left join ticket_tag tt on tt.ticket_id = t.id
left join tag tg on tg.id = tt.tag_id
where tr.to_department_id = $departmentId
  and tr.status = 'pendente'
  [and tr.created_at >= $start and tr.created_at < $end]
order by tr.created_at desc, tr.id desc
```

`countPendingApprovals`:

```sql
select count(*)::int
from ticket_transfer tr
where tr.to_department_id = $departmentId
  and tr.status = 'pendente'
```

> Revisão de 2026-10-28 (`docs/contracts/dashboard-individual-mode.md`,
> Etapa 5): `countPendingApprovals(departmentId, recipientId?)`. Com
> `recipientId`, acrescenta `and tr.to_user_id = $recipientId` (usado só pelo
> modo Individual do Início). Sem ele, este SQL e o selo do menu não mudam.

- O intervalo é semiaberto (`>= start`, `< end`), como `ticketPeriodCondition`,
  mas sobre `ticket_transfer.created_at`. Sugestão: `transferPeriodCondition`
  ao lado de `ticketPeriodCondition` em `app/_lib/data/period-condition.ts`.
- `'pendente'` vem do enum `approval_status`; use a coluna tipada
  (`eq(ticketTransfer.status, "pendente")`), não string solta em `sql`.
- `ticket_tag` tem no máximo uma linha por chamado
  (`ticket_tag_single_per_ticket_idx`): o `left join` não duplica linha.
- `transfer_one_pending_per_ticket_idx` garante uma pendente por chamado: a
  lista nunca repete chamado.
- Os dois filtros e a ordem são cobertos por `transfer_inbox_idx`. Sem índice
  novo.
- `count` com `.mapWith(Number)` (ou equivalente), devolvendo `0` sem linha.

## `df-actions`, `df-auth`, `df-email`

Nada. Nenhuma action nova nem alterada; ver "Atualização do contador".

## `df-ui`

### Página — `app/(app)/approvals/page.tsx` (nova, Server Component)

```ts
export const metadata: Metadata = { title: APPROVALS_LABEL }
const ApprovalsPage = async ({ searchParams }: PageProps<"/approvals">) => { … }
```

Fluxo:

1. `await requireSession()`; `facts = await getAccountFacts()`; sem `facts` →
   `notFound()` (como a Fila).
2. `now = new Date()`; `period = parseApprovalsPeriod(await searchParams, todayKey(now))`;
   `range = resolvePeriodFilterRange(period, now)`.
3. `departmentId = approvalsDepartmentIdFor(facts)`;
   `tickets = departmentId === null ? [] : await listPendingApprovals(departmentId, range)`.
4. Layout igual ao da Fila **sem** `TicketListTabs`: `AppTopBar`; `h1`
   `APPROVALS_LABEL`; ao lado, `formatRangeLabel(range)` quando `range !== null`.
5. Filtro de período: `PeriodFilter` com `pathname={APPROVALS_PATH}`,
   `keep={{}}`, `presets={APPROVALS_PERIOD_PRESETS}`, `selection={period}`.
   Vai no `toolbarFooter` da tabela, ou acima do vazio (mesmo arranjo da
   Fila).
6. `tickets.length === 0` → filtro + `<TicketListEmptyState {...APPROVALS_EMPTY} />`
   (inclusive para Não alocado). Senão `<ApprovalsTable key={approvalsHref(period)} … />`.

### Tabela — `app/(app)/approvals/_components/approvals-table.tsx` (novo, `"use client"`)

Props: `tickets: ApprovalListItem[]`, `period: PeriodFilterSelection`,
`toolbarFooter: React.ReactNode`.

Colunas, nesta ordem (as da Fila, sem Ações, com "Destinatário" trocado por
"Veio de" e "Enviado em"):

| Coluna     | Origem                                                                                                                                                                                                                           |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `#`        | `shared.number`                                                                                                                                                                                                                  |
| Título     | `shared.title`                                                                                                                                                                                                                   |
| Tipo       | `shared.type`                                                                                                                                                                                                                    |
| Tag        | `shared.tag`                                                                                                                                                                                                                     |
| Veio de    | nova, id `fromDepartment`: accessor `String(row.fromDepartmentId)`, `filterFn: "inValues"`, célula `row.fromDepartmentName`, cabeçalho `APPROVALS_FROM_DEPARTMENT_LABEL` (**visível**, diferente do Destinatário oculto da Fila) |
| Status     | `shared.status` (sempre `Aguardando aprovação`; mantido pelo padrão visual das listas)                                                                                                                                           |
| Aberto em  | `shared.createdAt`                                                                                                                                                                                                               |
| Enviado em | nova, id `sentAt`: `formatDate(row.sentAt)` com as mesmas classes de "Aberto em" (`text-muted-foreground tabular-nums`)                                                                                                          |

- `shared = createTicketListColumns<ApprovalListItem>((id) => approvalsTicketDetailHref(period, id))`.
- `rowHref = (row) => approvalsTicketDetailHref(period, row.id)`.
- Filtros: `TICKET_TYPE_FILTER`, `ticketTagFiltersFor(tickets)` e
  `idNameFiltersFor(tickets, (t) => ({ id: t.fromDepartmentId, name: t.fromDepartmentName }), { columnId: "fromDepartment", label: APPROVALS_FROM_DEPARTMENT_LABEL, noneLabel: EMPTY_VALUE_LABEL })`.
  Sem filtro de Status (um status só; `ticketStatusFiltersFor` já devolve `[]`).
- `emptyMessage` do `DataTable` (filtros sem resultado): `APPROVALS_EMPTY.title`.
- Sem `search` no `DataTable`, sem ações na linha (fora do escopo).

### Menu — `app/(app)/_components/nav-item.tsx` e `app-sidebar.tsx`

- `NavItem` ganha a prop opcional `badge?: ApprovalsNavBadge | null` (ou uma
  `interface` própria de mesma forma `{ text; accessibleLabel }` — escolha do
  `df-ui`). Com selo:
  - o `Link` recebe `aria-label={badge.accessibleLabel}` (começa pelo rótulo
    visível, então o nome visível continua contido no acessível);
  - o selo é um `span` `aria-hidden="true"` à direita (`ml-auto`), com
    `bg-warning text-warning-foreground`, texto `badge.text`, `tabular-nums`,
    pílula pequena (min-width para um dígito ficar redondo);
  - sem selo, o `NavItem` fica exatamente como hoje (nenhum `aria-label`).
- `AppSidebar` ganha `approvalsBadge: ApprovalsNavBadge | null` e renderiza,
  **depois** do item da Fila (e antes de Cadastros), **sempre** (sem condição):
  `<NavItem href={APPROVALS_PATH} label={APPROVALS_LABEL} icon={<ArrowRightLeftIcon aria-hidden="true" />} badge={approvalsBadge} />`.
- Navegação mobile não muda (fora do escopo): o selo não aparece abaixo de
  `lg`.

### Layout — `app/(app)/layout.tsx`

Depois do `Promise.all` atual (precisa de `accountFacts`):

```ts
const approvalsDepartmentId = approvalsDepartmentIdFor(accountFacts)
const pendingApprovals =
  approvalsDepartmentId === null ? 0 : await countPendingApprovals(approvalsDepartmentId)
…
<AppSidebar … approvalsBadge={approvalsNavBadgeFor(pendingApprovals)} />
```

É uma consulta sequencial a mais por render do layout, coberta pelo índice. Sem
`try/catch`: o layout trata as outras leituras do mesmo jeito.

### Atualização do contador

O layout `(app)` só re-renderiza quando o servidor manda a árvore a partir da
raiz: recarga, `router.refresh()` ou Server Action que revalida. Navegação
client-side comum reaproveita o layout. Por caso:

| Evento                                  | Contador de quem agiu                                                                                                                                                                                                                                                                                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Atender** (`acceptTicketTransfer`)    | Atualiza sozinho. A action sempre revalida (`app/_lib/actions/ticket-transfer.ts:345-348`); com revalidação, o Next 16 renderiza a resposta da action **a partir da raiz** e o cliente aplica com `FreshnessPolicy.RefreshAll` (`next/dist/client/components/router-reducer/reducers/server-action-reducer.js:294-297`), layout incluído. Nada a mudar |
| **Recusar**, quem recusou mantém acesso | Igual ao Atender: a action revalida (`ticket-transfer.ts:384-389`)                                                                                                                                                                                                                                                                                     |
| **Recusar**, quem recusou perde acesso  | A action **não** revalida (ADR 016) e a UI faz `router.replace(leaveHref)`: o layout ficaria com o número velho. **Mudança no `df-ui`**: em `decline-transfer-dialog.tsx:90-92`, chamar `router.refresh()` logo depois de `router.replace(leaveHref)`                                                                                                  |
| **Enviar para outro setor**             | O contador de quem envia não muda: o envio só cria pendente para **outro** setor, e quem já tem pendente recebida não pode reenviar (`AWAITING_APPROVAL`). O destino vê ao recarregar ou navegar com refresh (decisão 4A). Nada a mudar                                                                                                                |

Por que `replace` seguido de `refresh` funciona: a fila de ações do roteador
(`next/dist/client/components/app-router-instance.js:138-160`) só deixa uma
**navegação** passar na frente da ação pendente; o `refresh` entra no fim da
fila e roda depois do `replace`, sobre a URL nova, buscando a árvore desde a
raiz. Custo aceito: a lista de destino é pedida duas vezes nesse ramo. Não
envolver em `startTransition` próprio nem trocar a ordem. O `leaveHref` é o
`backLink.href` (para quem veio de Aprovações, `/approvals?periodo=…`), então a
pessoa cai na lista já sem o chamado recusado e com o selo atualizado.

O ramo de erro "stale" do mesmo dialog já chama `router.refresh()`; o ramo
`keepsAccess` não precisa (a action revalida).

### Detalhe

Nenhuma mudança em `app/(app)/tickets/[id]/page.tsx`: ele já usa
`parseTicketDetailOrigin` e `ticketDetailBackLinkFor`, que passam a reconhecer
`from=approvals`. "Atender" e "Recusar" continuam só no detalhe.

---

## Cenários do `df-qa`

Usuários de `docs/contracts/qa-seed.md`: `D` = Diretor, `A` = QA Admin
Suporte, `M` = QA Membro Suporte, `I` = QA Admin Infra. `S`/`F` = ids de QA
Suporte/QA Infra; `DIR` = id da Diretoria. Títulos começam com `[QA]`. **Não
alterar #65 a #68.** Escrita só em QA Suporte e QA Infra; na Diretoria só ler e
aprovar.

Preparação:

1. Como M, criar em QA Suporte `[QA] Aprovação 1`, `[QA] Aprovação 2` e
   `[QA] Aprovação 3` → `#P1`, `#P2`, `#P3`.
2. Escolher no banco um chamado `[QA]` ativo de QA Suporte, sem pendente, com
   `created_at` **anterior a hoje** (fora de #65–#68) → `#P4`. Sem nenhum,
   registrar P6 como não executado.
3. Como A, no detalhe: enviar `#P1`, `#P2` e `#P4` para QA Infra e `#P3` para a
   Diretoria.
4. Anotar, para conferência:
   `select tr.to_department_id, count(*) from ticket_transfer tr where tr.status = 'pendente' group by 1`.

Consulta de referência `AP(dep, início, fim)`:

```sql
select t.id, d.name, tr.created_at
from ticket_transfer tr join ticket t on t.id = tr.ticket_id
join department d on d.id = tr.from_department_id
where tr.to_department_id = :dep and tr.status = 'pendente'
  [and tr.created_at >= :inicio and tr.created_at < :fim]
order by tr.created_at desc, tr.id desc
```

| #    | Quem  | Ação                                                                                                | Esperado                                                                                                                                                                                                      |
| ---- | ----- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AP1  | M     | qualquer tela, menu lateral (≥ 1024 px)                                                             | item `Aprovações` com ícone de setas, logo depois de `Fila do setor` e antes de `Cadastros` (se houver); selo e nome acessível = total de `AP(S)` (hoje `1`, por `#64`; ver nota de revisão)                  |
| AP2  | I     | menu                                                                                                | selo cor `warning` com o total de `AP(F)` (inclui `#P1`, `#P2`, `#P4`); nome acessível do link `Aprovações, N aguardando`; o número do selo não é lido duas vezes                                             |
| AP3  | I     | `/approvals` sem query                                                                              | período `Todos` selecionado; sem barra de abas; linhas = `AP(F)` na mesma ordem (envio mais recente primeiro); colunas `#`, Título, Tipo, Tag, Veio de, Status, Aberto em, Enviado em; Veio de = `QA Suporte` |
| AP4  | D     | menu e `/approvals`                                                                                 | selo = total de `AP(DIR)`; lista tem `#P3` e **não** tem `#P1`, `#P2`, `#P4` (enviados a QA Infra)                                                                                                            |
| AP5  | A e M | `/approvals`                                                                                        | lista = `AP(S)`, na mesma ordem (hoje só `#64`, Veio de = `Diretoria`); nenhum dos `#P*`. A copy do vazio é conferida em AP7, AP14 e AP15                                                                     |
| AP6  | I     | período `Hoje`                                                                                      | `#P4` aparece (enviado hoje) mesmo com "Aberto em" anterior a hoje; bate com `AP(F, hoje)`                                                                                                                    |
| AP7  | I     | período Personalizado com `de` = `ate` = dia de abertura de `#P4`; depois, um dia sem envio         | `#P4` **não** aparece (o filtro é pela data do envio); no dia sem envio, título `Nenhum chamado aguardando aprovação` e o texto `Nenhum chamado foi encaminhado para este setor no período informado`         |
| AP8  | I     | `/approvals?periodo=lixo`, `?periodo=personalizado&de=<amanhã>&ate=<amanhã>`                        | os dois caem em `Todos`                                                                                                                                                                                       |
| AP9  | I     | clicar no meio da linha de `#P1` com período `Hoje`                                                 | URL `/tickets/<P1>?from=approvals&periodo=hoje`; link de voltar `Aprovações` → `/approvals?periodo=hoje`; abrir o `#` em nova aba leva a mesma URL                                                            |
| AP10 | I     | no detalhe de `#P1` (vindo de Aprovações), "Atender"                                                | sem recarregar: selo diminui 1 (some se chegar a 0); voltar para Aprovações: `#P1` fora da lista; banco: transferência `aprovado`, chamado `em_andamento` com `assigned_to` = I                               |
| AP11 | I     | no detalhe de `#P2` (vindo de Aprovações), "Recusar" com motivo                                     | volta para `/approvals?periodo=…` **sem recarga manual**; `#P2` fora da lista; selo diminuído 1 (ou ausente se 0); banco: transferência `rejeitado`, chamado `recusado` em QA Suporte                         |
| AP12 | I     | a partir de AP11, F5                                                                                | mesmo número do selo de antes do F5 (o refresh já tinha atualizado)                                                                                                                                           |
| AP13 | A     | detalhe de `#P2` (devolvido); enviar de novo para QA Infra; depois I recarrega                      | I vê o selo +1 só depois de recarregar (decisão 4A, sem polling); `#P2` volta à lista                                                                                                                         |
| AP14 | D     | detalhe de `#P3` vindo de Aprovações; "Atender"                                                     | selo de D diminui sem recarregar; `#P3` sai da lista; se a lista ficar vazia, a copy do AP7                                                                                                                   |
| AP15 | D e M | (opcional) D move M para o setor Não alocado em Cadastros → Pessoas; M abre `/approvals`; D devolve | menu de M com `Aprovações` sem selo; página com a copy do vazio do AP7; nenhum erro. Se não puder coordenar, não executado. Ao final, M ativo em QA Suporte                                                   |
| AP16 | I     | `/tickets/<P2>?from=approvals&periodo=xyz` à mão                                                    | link `Aprovações` → `/approvals?periodo=todos`                                                                                                                                                                |
| AP17 | I     | 390×844 em `/approvals`                                                                             | título, data e filtro de período cabem; tabela com rolagem horizontal, sem estourar a página; menu lateral oculto (navegação mobile fora do escopo)                                                           |
| AP18 | todos | toda a bateria                                                                                      | console do navegador e dev server (`next-devtools`) sem erro nem aviso de hidratação; nenhuma escrita fora da preparação, AP10, AP11, AP13, AP14 e AP15                                                       |

> Revisão de 2026-10-15 (pós-QA, `docs/test-reports/2026-10-15-approvals.md`):
> AP1 e AP5 supunham `AP(S)` vazio, mas o banco de desenvolvimento tem a
> pendente `#64` (Diretoria → QA Suporte, desde 01/10), registrada em
> `docs/contracts/qa-seed.md`. Selo `1` e uma linha em QA Suporte são o
> esperado; os dois cenários passaram a comparar com `AP(S)` em vez de supor o
> vazio. A frase do vazio fica coberta por AP7 (dia sem envio), AP14 e AP15.
>
> Limites conhecidos da bateria:
>
> - **AP13** verifica só o estado final (selo +1 e `#P2` de volta depois de
>   I entrar). Com uma sessão por vez no navegador, o "selo antigo antes de
>   recarregar" não é observável; o comportamento é o aceito pela decisão 4A.
> - **Selo `99+`** não exercitado: o banco não tem mais de 99 pendentes para um
>   setor. A regra vive em `formatApprovalsBadgeCount` e não tem teste de
>   interface.

## Riscos

1. **Contador desatualizado para quem não agiu.** Envio de outro setor (ou
   aceite de um colega) só aparece no selo depois de recarregar ou de uma ação
   que revalide; a página `/approvals` é dinâmica e pode mostrar mais ou menos
   linhas que o selo. Aceito pela decisão 4A.
2. **Duas requisições no ramo "Recusar sem acesso"** (`replace` + `refresh`).
   Aceito; a alternativa (revalidar na action) traz de volta a corrida do 404
   descrita no ADR 016.
3. **Consulta extra em toda página do app** (`countPendingApprovals` no
   layout), sequencial depois de `getAccountFacts`. Coberta por índice; custo
   baixo.
4. **Invariante do ADR 016.** Lista e contagem confiam que toda pendente aponta
   para o setor atual do chamado. Se algum caminho futuro quebrar isso, o
   chamado aparece na aba de um setor que não o vê (404 ao abrir).

## Critério de pronto

1. Item `Aprovações` para todos, após a Fila, com selo `warning` só quando > 0 e
   nome acessível com o número.
2. `/approvals` lista exatamente `AP(setor)`, ordenada por envio desc, período
   pela data do envio, padrão Todos; vazio com a frase do usuário (inclusive Não
   alocado).
3. Linha e `#` abrem o detalhe com `from=approvals`; voltar restaura o período.
4. Selo atualiza sem recarga após Atender e após Recusar (com e sem acesso).
5. `tsc`, lint e build passam; `df-reviewer` sem bloqueante; `df-qa` aprova AP1–AP18.

## Checklist de encerramento

- [x] Tipos, domínio, validação, origem `approvals` do detalhe, este contrato, plano, nota no ADR 016 (`df-architect`)
- [x] `listPendingApprovals`, `countPendingApprovals` (`df-data`)
- [x] Página `/approvals`, `ApprovalsTable`, `NavItem` com selo, item no `AppSidebar`, contagem no layout, `router.refresh()` no `DeclineTransferDialog` (`df-ui`)
- [x] `npx tsc --noEmit`, `npm run lint`, `npm run build`; `df-reviewer` aprovado
- [x] Cenários AP1–AP18 (`df-qa`, 18 de 18, `docs/test-reports/2026-10-15-approvals.md`)
- [x] Nota de revisão pós-QA (AP1, AP5, limites conhecidos) e `#64` em `docs/contracts/qa-seed.md`

**Status:** concluído em 2026-10-15, aguardando commit.
