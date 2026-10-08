# Contrato — Meus chamados

Entrada das ondas 1 e 2. As decisões estão no plano, `docs/plans/my-tickets.md`,
e não são repetidas aqui. Este documento é a referência técnica: assinaturas,
consultas, textos e cenários. Padrões de tabela e filtros vêm de
`docs/contracts/registry-people.md` ("Peças compartilhadas"); o de parâmetro na
URL, de `docs/contracts/dashboard.md`.

Versões observadas: `next@16.3.5`, `drizzle-orm@0.45.2`, `zod@4.6.5`,
`@tanstack/react-table@9.2.4`, `lucide-react@1.47.0`.

## Escopo técnico em uma frase

Só leitura. Nenhuma tabela, enum, coluna, índice ou migration nova; nenhuma
Server Action; nenhuma gravação. Duas telas (`/tickets` e `/tickets/[id]`), três
funções de dados e os rótulos de todos os valores de `ticket_status`,
`ticket_priority` e `history_event`.

A edição pelo autor no detalhe (botão "Editar", `edicao` no histórico) tem
contrato próprio: `docs/contracts/ticket-edit.md`.

> Revisão de 2026-10-05 (`docs/contracts/ticket-edit-window.md`): o período
> padrão desta tela passa de `Todos` para **`Hoje`** (adendo abaixo
> atualizado); `Todos` é escrito na URL (`periodo=todos`); `myTicketsTabHref`
> exige o período. Na linha do tempo, `changedByName` pode ser nulo (linha do
> sistema): `findTicketDetail` faz `left join` em `users` por `changed_by`, e a
> UI mostra `describeHistoryActor(entry)` (`Sistema` quando nulo). Os cenários
> 23, 31, 32 e 33 do adendo foram reescritos abaixo para o novo padrão; a
> versão anterior está no histórico do git. `ALL_TIME_SELECTION` deixou de ser
> usado com o novo padrão e foi removido de `domain/period.ts`; o tipo
> `AllTimeSelection` continua em `types/period.ts`.

> Revisão de 2026-10-05 (`docs/plans/pending-improvements.md`, Entrega A):
> período personalizado com `de`/`ate` depois de hoje passa a ser inválido
> (cai em `Hoje`) e o calendário desabilita os dias futuros. `customPeriodSchema`
> e `myTicketsPeriodSchema` viram fábricas de `today`; `parseMyTicketsPeriod`
> recebe `today`. Detalhe em "Revisão de 2026-10-05 — datas futuras", no fim do
> adendo do filtro por data. Vale igual para o Início (`dashboard.md`).

> Revisão de 2026-10-05 (`docs/contracts/ticket-assignee.md`, Entrega B): no
> detalhe, os rótulos `Aberto por` e `Responsável` passam a `Criador` e
> `Destinatário` (`TICKET_CREATOR_LABEL`, `TICKET_ASSIGNEE_LABEL`), com os
> mesmos valores. Na linha do tempo, `criacao` acrescenta
> ` e o atribuiu a {nome}` quando o destinatário gravado é outra pessoa
> (`TicketHistoryEntry` ganha `changedById` e `toAssigneeId`), e as frases de
> `atribuicao` dizem "destinatário" no lugar de "responsável". As abas não
> mudam: com o destinatário padrão = autor, todo chamado novo aparece em
> "Abertos por mim" **e** em "Atribuídos a mim". As tabelas abaixo já estão
> atualizadas.

> Revisão de 2026-10-06 (`docs/contracts/department-queue.md`): a Fila do
> setor usa os mesmos presets e o mesmo schema de período. A fonte passou a ser
> `ALL_TIME_PERIOD_PRESETS` (`domain/period.ts`) e `allTimePeriodSchema(today)`
> (`validation/period.ts`); `MY_TICKETS_PERIOD_PRESETS` e `myTicketsPeriodSchema`
> continuam exportados como aliases, com o mesmo valor e o mesmo tipo.

> Revisão de 2026-10-06 (aba Resolvidos, aprovada pelo usuário): as abas passam
> a ser **Abertos por mim · Atribuídos a mim · Resolvidos · Fechados ·
> Cancelados** (`?tab=resolved`). "Abertos por mim" e "Atribuídos a mim" usam
> `ACTIVE_TICKET_STATUSES` (não finais **sem** `resolvido`); "Resolvidos" é
> relação `author`, `statuses: ["resolvido"]`. As quatro abas de `author`
> continuam particionando os chamados do autor. Consequência aceita: quem
> resolveu chamado de outra pessoa (destinatário) deixa de vê-lo aqui; continua
> na Fila do setor. Mesma mudança na Fila (`docs/contracts/department-queue.md`).
> `NON_FINAL_TICKET_STATUSES` e `isNonFinalTicketStatus` **não** mudam (edição,
> comentários e janela continuam tratando `resolvido` como não final). As
> tabelas de domínio e os cenários 2, 3, 4, 10, 24 e 27 abaixo já estão
> atualizados; cenários novos em "Cenários da aba Resolvidos".

> Revisão de 2026-10-06 (`docs/contracts/queue-default-and-comment-edit.md`,
> que prevalece no que diverge): (etapa 2) no detalhe, Destinatário nulo mostra
> `Fila de {setor do chamado}` (`describeTicketAssignee`) no lugar de `—`.
> (etapa 5) na linha do tempo, as frases de `criacao` e `atribuicao` passam a
> **começar pelo nome de quem agiu** e, no encaminhamento, a citar o setor
> **atual** dessa pessoa (`TicketHistoryEntry.changedByDepartmentName`, por
> join em `users.department_id`): `{user} abriu o chamado em {setor}.`,
> `{user} abriu e assumiu o chamado.`,
> `{user} do setor {setor} abriu o chamado e o encaminhou para {nome}.`,
> `{user} assumiu o chamado.`,
> `{user} do setor {setor} encaminhou o chamado para {nome}.`,
> `{user} devolveu o chamado à fila de {setor}.` A frase "sem o nome de quem
> fez" da tabela de `ticket-history.ts` abaixo deixa de valer para esses dois
> eventos (`historyEntryNamesActor`), e as linhas `criacao` e `atribuicao` da
> tabela ficam superadas. Demais eventos e rótulos não mudam. As frases são
> montadas na leitura e valem também para eventos antigos.

> Revisão de 2026-10-08 (`docs/contracts/ticket-search-and-queue-back-link.md`,
> que prevalece no que diverge): a tabela **perde o campo de busca**
> (`TICKET_LIST_SEARCH` sai; o `DataTable` não recebe `search`); a busca por
> número ou título passa a ser a do topo, com sugestões, sobre todos os
> chamados visíveis. Filtros e período não mudam. O `#` da coluna número usa a
> função recebida por `createTicketListColumns(detailHref)` (aqui,
> `ticketDetailPath`). No detalhe, o link de voltar sai de
> `ticketDetailBackLinkFor(parseTicketDetailOrigin(searchParams, today))`:
> sem `?from=queue` continua `Meus chamados` → `/tickets` (o que vale para
> quem abre por esta tela e pela busca do topo); com `?from=queue`, `Fila do
setor` com aba, período e setor. Ficam superados: o item "Busca" da tabela,
> os riscos 1 e 4 e os cenários 9, 11 (parte da busca), 23 (posição do
> seletor "abaixo do campo de busca") e 29 (parte da busca).

## Adendo — filtro por data de abertura

Acrescentado em 2026-10-01. Decisões no plano (`docs/plans/my-tickets.md`, seção
"Filtro por data de abertura"). Continua só leitura: nenhuma migration, nenhuma
action.

### Regra

| Item      | Definição                                                                                                                                                    |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Âncora    | `ticket.created_at` (data de abertura)                                                                                                                       |
| Períodos  | `Todos` (sem filtro), `Hoje` (**padrão desta tela** desde 2026-10-05), `Semana`, `Mês`, `Personalizado`. Os quatro últimos com a mesma resolução do Início   |
| Intervalo | Meio-aberto `[start, end)` no fuso `America/Sao_Paulo` (ADR 009), por `resolvePeriodRange`                                                                   |
| Alcance   | Lista **e** contagens de todas as abas usam o mesmo intervalo                                                                                                |
| URL       | `?tab=&periodo=&de=&ate=`. Todo período é escrito na URL, inclusive `periodo=todos`; ausência de `periodo` = `Hoje`                                          |
| Inválido  | `periodo` desconhecido, personalizado sem data, data inexistente, `ate < de` ou data depois de hoje (desde 2026-10-05) → `Hoje`, sem erro e sem redirecionar |
| Valores   | Em português na URL (`hoje`, `semana`, `mes`, `personalizado`, `todos`), como no Início. A tradução é decisão separada                                       |
| Início    | Não muda: sem `Todos`, padrão `Hoje`. `/dashboard?periodo=todos` cai em `Hoje`                                                                               |

URLs:

```
/tickets?tab=opened                                              → Hoje
/tickets?tab=opened&periodo=todos                                → Todos
/tickets?tab=opened&periodo=hoje
/tickets?tab=closed&periodo=semana
/tickets?tab=opened&periodo=personalizado&de=2026-09-01&ate=2026-09-10
```

### Tipos — `app/_lib/types/period.ts` (acrescido)

```ts
export type AllTimePeriod = "todos"
export type PeriodOption = Period | AllTimePeriod
export type PresetPeriodOption = Exclude<PeriodOption, "personalizado">

export interface AllTimeSelection {
  periodo: AllTimePeriod
}

export type PeriodFilterSelection = PeriodSelection | AllTimeSelection
```

`Period`, `PresetPeriod` e `PeriodSelection` não mudaram: o Início continua
tipado sem `todos`, e `resolvePeriodRange` continua sem caso para ele. Quem
aceita `Todos` usa `PeriodFilterSelection`.

### `app/_lib/types/my-tickets.ts` (acrescido)

```ts
export interface MyTicketsEmptyCopy {
  title: string
  description: string
}
```

### Domínio

`app/_lib/domain/period.ts`:

```ts
export const ALL_TIME_SELECTION: AllTimeSelection // { periodo: "todos" } (removido em 2026-10-05, sem uso)
export const PERIOD_LABELS // satisfies Record<PeriodOption, string>; ganhou todos: "Todos"
```

`app/_lib/domain/my-tickets.ts`:

```ts
export const MY_TICKETS_PERIOD_PRESETS // ["todos", "hoje", "semana", "mes"] as const
export const DEFAULT_MY_TICKETS_PERIOD: PeriodFilterSelection // { periodo: "hoje" } (era ALL_TIME_SELECTION até 2026-10-05)
export const MY_TICKETS_EMPTY_PERIOD: MyTicketsEmptyCopy
export const myTicketsEmptyCopy: (
  tab: MyTicketsTab,
  period: PeriodFilterSelection,
) => MyTicketsEmptyCopy
```

- **O conjunto de períodos é por tela.** O Início itera `PRESET_PERIODS`
  (`hoje`, `semana`, `mes`); Meus chamados itera `MY_TICKETS_PERIOD_PRESETS`.
  Os dois seguidos de `Personalizado`. Rótulo de qualquer um vem de
  `PERIOD_LABELS`.
- `myTicketsEmptyCopy`: com `Todos`, o título e a descrição da aba
  (`MY_TICKETS_TAB_RULES[tab]`, como hoje); com qualquer outro período,
  `MY_TICKETS_EMPTY_PERIOD`:

  | Campo         | Texto                                                                                         |
  | ------------- | --------------------------------------------------------------------------------------------- |
  | `title`       | `Nenhum chamado neste período`                                                                |
  | `description` | `Nenhum chamado desta aba foi aberto no período escolhido. Escolha outro período ou “Todos”.` |

### Datas — `app/_lib/date.ts` (acrescido)

```ts
export const resolvePeriodFilterRange: (
  selection: PeriodFilterSelection,
  now?: DateInput,
) => DateRange | null
```

`todos` → `null` (sem filtro); qualquer outro → `resolvePeriodRange(selection)`.
É a única tradução de `Todos`; ninguém testa `periodo === "todos"` para decidir
o intervalo.

### Validação

`app/_lib/validation/period.ts` (novo) — peças comuns aos filtros de período,
extraídas de `validation/dashboard.ts` sem mudar o comportamento do Início:

```ts
export const customPeriodSchema // (today: DateKey) => schema desde 2026-10-05; personalizado: de/ate isDateKey, ate >= de, ate <= today
export interface RawPeriodParams {
  periodo: string | undefined
  de: string | undefined
  ate: string | undefined
}
export const readPeriodParams: (raw: RawSearchParams) => RawPeriodParams
export const serializePeriodParams: (selection: PeriodFilterSelection) => string
export const periodFilterHref: (
  pathname: string,
  keep: Readonly<Record<string, string>>,
  selection: PeriodFilterSelection,
) => string
```

| Função                  | Semântica                                                                                                                                               |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `readPeriodParams`      | Primeiro valor de `periodo`, `de` e `ate` (`firstSearchParam`)                                                                                          |
| `serializePeriodParams` | `todos` → `periodo=todos` (era `""` até 2026-10-05); `hoje` → `periodo=hoje`; personalizado → `periodo=personalizado&de=…&ate=…`                        |
| `periodFilterHref`      | **A** forma de montar o link de um filtro de período: `keep` primeiro (ex.: `{ tab }`), depois o período. Sem nenhum parâmetro → só `pathname`, sem `?` |

`app/_lib/validation/dashboard.ts`: mesma API (`dashboardSearchParamsSchema`,
`parseDashboardParams`, `serializeDashboardParams`), agora montada sobre as
peças acima.

`app/_lib/validation/my-tickets.ts` (acrescido):

```ts
export const myTicketsPeriodSchema // (today: DateKey) => discriminatedUnion: enum(MY_TICKETS_PERIOD_PRESETS) | customPeriodSchema(today)
export type MyTicketsPeriodParams = z.infer<
  ReturnType<typeof myTicketsPeriodSchema>
>

export const parseMyTicketsPeriod: (
  raw: RawSearchParams,
  today: DateKey, // desde 2026-10-05
) => PeriodFilterSelection
export const myTicketsTabHref: (
  tab: MyTicketsTab,
  period: PeriodFilterSelection, // obrigatório desde 2026-10-05
) => string
```

- `parseMyTicketsPeriod` nunca lança; inválido → `DEFAULT_MY_TICKETS_PERIOD`
  (`Hoje`). Aba e período são lidos **independentemente**: aba inválida com
  período válido mantém o período, e vice-versa.
- `myTicketsTabHref(tab, period)` = `periodFilterHref("/tickets", { tab }, period)`.
  As abas passam o período atual, que sempre sai na URL (`…&periodo=todos`
  inclusive).

### `df-data` — `app/_lib/data/my-tickets.ts` (alterado)

```ts
export async function listMyTickets(
  userId: number,
  tab: MyTicketsTab,
  range: DateRange | null = null,
): Promise<MyTicketListItem[]>

export async function countMyTicketsByTab(
  userId: number,
  range: DateRange | null = null,
): Promise<MyTicketsTabCounts>
```

- Um helper privado só, usado pelas duas funções, ao lado de `tabCondition`:
  `range === null` → nenhuma condição; senão
  `ticket.created_at >= range.start and ticket.created_at < range.end`
  (`gte` + `lt`; nunca `between` nem `lte`).
- `listMyTickets`: `where tabCondition(userId, tab) and <período>`.
- `countMyTicketsByTab`: o `where` externo vira
  `(created_by = $1 or assigned_to = $1) and <período>`; os `filter` por aba não
  mudam. Assim cada contagem é exatamente o tamanho da lista da aba no mesmo
  período.
- Sem `range`, o resultado é idêntico ao de hoje.
- Índice: `ticket_created_by_idx` / `ticket_assigned_to_idx` continuam
  atendendo (o volume por pessoa é pequeno). Se o `EXPLAIN` mostrar problema,
  reporte.

### `df-ui`

**Seletor reaproveitado.** `PeriodFilter`, `CustomPeriodPicker` e
`period-pill-variants` passam a ter dois usuários no grupo `(app)` e sobem de
`app/(app)/dashboard/_components/` para `app/(app)/_components/` (colocation).
Ficam genéricos por props, sem saber de tela:

```ts
interface PeriodFilterProps {
  pathname: string
  keep?: Readonly<Record<string, string>>
  presets: readonly PresetPeriodOption[]
  selection: PeriodFilterSelection
}

interface CustomPeriodPickerProps {
  pathname: string
  keep?: Readonly<Record<string, string>>
  selection: PeriodFilterSelection
}
```

- Pílulas: `presets.map`, `href={periodFilterHref(pathname, keep ?? {}, { periodo })}`,
  rótulo `PERIOD_LABELS[periodo]`, ativa quando `selection.periodo === periodo`.
- Picker: no "Aplicar",
  `router.push(periodFilterHref(pathname, keep ?? {}, { periodo: "personalizado", de, ate }), { scroll: false })`.
  O resto (calendário, `ptBR`, `WEEK_STARTS_ON`, conversões) não muda.
- Início: `<PeriodFilter pathname="/dashboard" presets={PRESET_PERIODS} selection={selection} />`.
  Comportamento e URLs idênticos aos de hoje.
- A exceção do `react-day-picker/locale` (ADR 009) acompanha o arquivo:
  passa a valer só em `app/(app)/_components/custom-period-picker.tsx`.

**`/tickets` — `page.tsx`:**

```tsx
const raw = await searchParams
const now = new Date()
const tab = parseMyTicketsTab(raw)
const period = parseMyTicketsPeriod(raw, todayKey(now))
const range = resolvePeriodFilterRange(period, now)
const [tickets, counts] = await Promise.all([
  listMyTickets(actor.id, tab, range),
  countMyTicketsByTab(actor.id, range),
])
```

- O seletor (`<PeriodFilter pathname={MY_TICKETS_PATH} keep={{ tab }} presets={MY_TICKETS_PERIOD_PRESETS} selection={period} />`)
  fica **abaixo do campo de busca da tabela**. O `DataTable` ganha uma prop
  opcional para isso (sugestão: `toolbarFooter?: React.ReactNode`, renderizada
  abaixo da linha de busca e filtros; sem ela, nada muda em Pessoas, Setores e
  Tags). A página monta o `PeriodFilter` (Server Component) e o passa como prop
  para `MyTicketsTable`, que o repassa ao `DataTable`.
- **Lista vazia**: a tabela não é montada (como hoje), mas o seletor continua
  visível, no mesmo lugar, acima do estado vazio. Sem isso, um período sem
  chamados deixaria a pessoa sem como voltar. O estado vazio usa
  `myTicketsEmptyCopy(tab, period)`.
- `MyTicketsTabs` recebe `period` e usa `myTicketsTabHref(tab, period)`: trocar
  de aba mantém o período; trocar de período mantém a aba.
- `key` da tabela: `myTicketsTabHref(tab, period)` (aba **e** período). Trocar o
  período zera busca e filtros da tabela, pelo mesmo motivo da aba: as opções de
  Tag são derivadas das linhas.
- Com período diferente de `Todos`, subtítulo `formatRangeLabel(range)` ao lado
  do título, como no Início. Com `Todos`, sem subtítulo.
- A busca e os filtros da tabela continuam no cliente, sobre as linhas que o
  servidor já filtrou pelo período.

### Revisão de 2026-10-05 — datas futuras

Plano: `docs/plans/pending-improvements.md`, Entrega A. Vale para **Meus
chamados e Início**; o lado do Início está em `docs/contracts/dashboard.md`
(revisão da mesma data). Motivo: um período futuro mostrava "0 chamados" e se
passava por "não houve chamados".

**Regra.** Período personalizado cujo `ate` é depois de hoje (no calendário de
São Paulo, ADR 009) é inválido. Como `ate >= de` já é exigido, `de` futuro
também cai. Inválido segue a regra que já existia: padrão da tela (`Hoje` nas
duas), sem erro, sem redirecionar, sem aviso. **Não há recorte**: um período
`01/10 – 31/10` consultado em 05/10 é recusado inteiro, não vira `01/10 – 05/10`.
Hoje é permitido (`ate = hoje` é válido).

#### Validação — o que muda na assinatura

| Antes                                            | Depois                                                                 |
| ------------------------------------------------ | ---------------------------------------------------------------------- |
| `customPeriodSchema` (schema)                    | `customPeriodSchema(today: DateKey)` (fábrica)                         |
| `myTicketsPeriodSchema` (schema)                 | `myTicketsPeriodSchema(today: DateKey)` (fábrica)                      |
| `dashboardSearchParamsSchema` (schema)           | `dashboardSearchParamsSchema(today: DateKey)` (fábrica)                |
| `parseMyTicketsPeriod(raw)`                      | `parseMyTicketsPeriod(raw, today: DateKey)`                            |
| `parseDashboardParams(raw)`                      | `parseDashboardParams(raw, today: DateKey)`                            |
| `MyTicketsPeriodParams = z.infer<typeof schema>` | `z.infer<ReturnType<typeof myTicketsPeriodSchema>>` (mesmo tipo)       |
| `DashboardSearchParams = z.infer<typeof schema>` | `z.infer<ReturnType<typeof dashboardSearchParamsSchema>>` (mesmo tipo) |

- `today` é **parâmetro** porque validação é pura: o schema não lê o relógio.
  Quem chama passa `todayKey(now)` de `@/app/_lib/date` (dia de São Paulo).
- Refinamento novo em `customPeriodSchema(today)`: `ate <= today`, erro em `ate`
  `O período não pode terminar depois de hoje.` (mensagem nunca exibida: o
  parse cai no padrão).
- Os dois `parse*` continuam nunca lançando; o retorno não mudou de tipo.
- `serializePeriodParams`, `periodFilterHref`, `myTicketsTabHref` e
  `serializeDashboardParams` não mudam.

#### Datas — `app/_lib/date.ts` (acrescido)

```ts
export const todayCalendarDate: (now?: DateInput) => Date
```

`dateKeyToCalendarDate(todayKey(now))`: a meia-noite **local do navegador** do
dia de hoje **em São Paulo**. É o "hoje" que o calendário usa para limitar as
datas. Nunca `new Date()` direto no calendário: num navegador fora de São Paulo
perto da meia-noite, o dia local é outro.

#### `df-ui` — o que muda

**`app/(app)/tickets/page.tsx`** — uma leitura do relógio por request, como
`app/(app)/tickets/[id]/page.tsx` já faz:

```tsx
const now = new Date()
const period = parseMyTicketsPeriod(raw, todayKey(now))
const range = resolvePeriodFilterRange(period, now)
```

**`app/(app)/dashboard/page.tsx`** — ver `dashboard.md`, revisão de 2026-10-05
(mesma forma, com `parseDashboardParams` e `resolvePeriodRange`).

**`app/(app)/_components/custom-period-picker.tsx`** (um arquivo só, vale nas
duas telas):

- Estado novo `const [today, setToday] = useState(todayCalendarDate)`
  (inicializador preguiçoso) e `setToday(todayCalendarDate())` **ao abrir** o
  popover, em `handleOpenChange`, junto com o `setRange` que já existe. Assim a
  aba aberta de um dia para o outro não fica com o "hoje" de ontem. O valor não
  entra na marcação do servidor (o `Calendar` só é montado com o popover
  aberto), então não há diferença de hidratação.
- `Calendar` ganha `disabled={{ after: today }}` (dias depois de hoje não
  clicáveis; hoje continua clicável) e `endMonth={today}` (a navegação não
  passa do mês atual). As duas props existem no `react-day-picker@10`.
- O resto não muda: `locale={ptBR}`, `weekStartsOn={WEEK_STARTS_ON}`,
  conversões com `calendarDateToKey`, `router.push(periodFilterHref(...))`.
- O servidor continua sendo a autoridade: mesmo que um dia futuro chegue à URL
  (link antigo, relógio do navegador adiantado), a página cai em `Hoje`.

## Tabelas e enums lidos

| Tabela            | Colunas lidas                                                                                                                                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ticket`          | `id`, `title`, `description`, `type`, `status`, `priority`, `created_by`, `assigned_to`, `origin_department_id`, `current_department_id`, `created_at`                                                             |
| `ticket_tag`      | `ticket_id`, `tag_id` (no máximo uma linha por chamado, `ticket_tag_single_per_ticket_idx`)                                                                                                                        |
| `tag`             | `id`, `name`                                                                                                                                                                                                       |
| `department`      | `id`, `name`                                                                                                                                                                                                       |
| `users`           | `id`, `name`                                                                                                                                                                                                       |
| `ticket_transfer` | `id`, `ticket_id`, `from_department_id`, `to_department_id`, `requested_by`, `request_reason`, `status`, `created_at` (só `status = 'pendente'`; no máximo uma por chamado, `transfer_one_pending_per_ticket_idx`) |
| `ticket_history`  | todas as colunas                                                                                                                                                                                                   |

Enums: `ticket_type`, `ticket_status`, `ticket_priority`, `history_event`
(todos já existentes). Índices que atendem: `ticket_created_by_idx`,
`ticket_assigned_to_idx`, `history_ticket_idx`, `transfer_ticket_idx`.

## Tipos — `app/_lib/types/`

### `app/_lib/types/my-tickets.ts` (novo)

```ts
import type { MY_TICKETS_TABS } from "@/app/_lib/domain/my-tickets-tabs"

export type MyTicketsTab = (typeof MY_TICKETS_TABS)[number]

export type MyTicketsRelation = "author" | "assignee"

export interface MyTicketsTabRule {
  label: string
  relation: MyTicketsRelation
  statuses: readonly TicketStatus[]
  emptyTitle: string
  emptyDescription: string
}

export type MyTicketsTabCounts = Record<MyTicketsTab, number>

export interface MyTicketListItem {
  id: number
  title: string
  type: TicketType
  status: TicketStatus
  tagId: number | null
  tagName: string | null
  currentDepartmentId: number
  currentDepartmentName: string
  createdAt: Date
}
```

- `MyTicketsTab` é derivado da lista `MY_TICKETS_TABS`, a fonte única das abas
  (ver `app/_lib/domain/my-tickets-tabs.ts` abaixo). Acrescentar uma aba é
  acrescentar à lista; o `satisfies Record<MyTicketsTab, MyTicketsTabRule>` de
  `MY_TICKETS_TAB_RULES` passa a exigir a regra dela.
- `MyTicketsRelation`: `author` filtra por `ticket.created_by`, `assignee` por
  `ticket.assigned_to`.
- `tagId`/`tagName` nulos: chamados antigos sem tag (3 no banco).

### `app/_lib/types/ticket.ts` (acrescido)

```ts
export interface TicketViewerFacts {
  userId: number
  departmentId: number
  isBoard: boolean
}

export interface TicketVisibilityFacts {
  createdBy: number
  assignedTo: number | null
  currentDepartmentId: number
}

export interface TicketPendingTransfer {
  id: number
  fromDepartmentName: string
  toDepartmentId: number
  toDepartmentName: string
  requestedByName: string
  requestedAt: Date
  requestReason: string | null
}

export interface TicketHistoryEntry {
  id: number
  event: HistoryEvent
  changedAt: Date
  changedByName: string
  fromStatus: TicketStatus | null
  toStatus: TicketStatus | null
  fromPriority: TicketPriority | null
  toPriority: TicketPriority | null
  fromDepartmentName: string | null
  toDepartmentName: string | null
  fromAssigneeName: string | null
  toAssigneeName: string | null
  fromTagName: string | null
  toTagName: string | null
  note: string | null
}

export interface TicketDetail extends TicketVisibilityFacts {
  id: number
  title: string
  description: string
  type: TicketType
  status: TicketStatus
  priority: TicketPriority
  authorName: string
  assigneeName: string | null
  originDepartmentId: number
  originDepartmentName: string
  currentDepartmentName: string
  tagId: number | null
  tagName: string | null
  createdAt: Date
  pendingTransfer: TicketPendingTransfer | null
  history: TicketHistoryEntry[]
}
```

> `tagId` foi acrescentado por `docs/contracts/ticket-edit.md` (o dialog de
> edição pré-seleciona a tag atual). `findTicketDetail` passa a selecioná-lo
> (`tag.id`, nulo sem `ticket_tag`).

- `TicketDetail` estende `TicketVisibilityFacts`: o detalhe carregado entra
  direto em `canViewTicket`, sem conversão.
- Os `*Name` do histórico são nulos **só** quando o id correspondente é nulo
  (todas as FKs de `ticket_history` são `restrict`: o alvo nunca some).
- `requestedAt` é `ticket_transfer.created_at`.
- `TicketHistoryEntry` é plano (sem objetos aninhados) para ser serializável e
  simples de montar com `left join`.

## Domínio — `app/_lib/domain/`

### `app/_lib/domain/ticket.ts` (acrescido)

```ts
export const TICKET_STATUS_LABELS: Record<TicketStatus, string>
export const TICKET_STATUSES: readonly TicketStatus[]
export type NonFinalTicketStatus // união derivada: tudo menos fechado e cancelado
export const NON_FINAL_TICKET_STATUSES: readonly NonFinalTicketStatus[]
export const RESOLVED_TICKET_STATUS // "resolvido" as const satisfies TicketStatus
export type ActiveTicketStatus // Exclude<NonFinalTicketStatus, typeof RESOLVED_TICKET_STATUS>
export const isActiveTicketStatus: (
  status: TicketStatus,
) => status is ActiveTicketStatus
export const ACTIVE_TICKET_STATUSES: readonly ActiveTicketStatus[]
export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string>

export const ticketDetailPath: (ticketId: number) => string
export const canViewTicket: (
  viewer: TicketViewerFacts,
  ticket: TicketVisibilityFacts,
) => boolean
export const describePendingTransfer: (
  transfer: TicketPendingTransfer,
) => string
```

Sem mudança de API em `OPEN_TICKET_STATUSES`, `OpenTicketStatus` e
`isOpenTicketStatus`: passaram a derivar de `TICKET_STATUSES`, com o mesmo
resultado. **"Em aberto" e "não final" são conceitos diferentes**: `resolvido`
não está em aberto (não conta para desativar setor) mas não é final (ainda
aceita edição e comentário dentro da janela de 7 dias). Cada um tem sua tabela
de flags (`satisfies Record<TicketStatus, boolean>`), e as duas quebram o `tsc`
se surgir status novo.

Desde 2026-10-06, as abas de andamento das listas ("Abertos por mim",
"Atribuídos a mim", "Em aberto" da Fila) usam `ACTIVE_TICKET_STATUSES`: não
final **menos** `resolvido`, que ganhou aba própria. É uma derivação, não uma
terceira tabela de flags: `isActiveTicketStatus = isNonFinalTicketStatus(s) &&
s !== RESOLVED_TICKET_STATUS`. Hoje o conjunto coincide com
`OPEN_TICKET_STATUSES`, mas são decisões diferentes (aba de lista × trava de
desativação de setor) e ficam separadas, como atribuíveis × resolvíveis na
Fila. `RESOLVED_TICKET_STATUS` passou de `TicketStatus` para o literal
`"resolvido"` (`as const satisfies TicketStatus`), o que permite o `Exclude`;
quem o usava como `TicketStatus` continua compilando.

| Nome                        | Semântica                                                                                                                                                                        |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TICKET_STATUS_LABELS`      | Única fonte dos rótulos de status (tabela abaixo)                                                                                                                                |
| `TICKET_STATUSES`           | Os 8 valores de `ticket_status`, na ordem do enum. Derivado das chaves de `TICKET_STATUS_LABELS`                                                                                 |
| `NON_FINAL_TICKET_STATUSES` | `aberto`, `em_analise`, `encaminhado`, `aguardando_aprovacao`, `em_andamento`, `resolvido`. Final = `fechado` ou `cancelado`                                                     |
| `ACTIVE_TICKET_STATUSES`    | `NON_FINAL_TICKET_STATUSES` sem `resolvido`: `aberto`, `em_analise`, `encaminhado`, `aguardando_aprovacao`, `em_andamento`. Abas de andamento das listas (desde 2026-10-06)      |
| `TICKET_PRIORITY_LABELS`    | Única fonte dos rótulos de prioridade                                                                                                                                            |
| `ticketDetailPath`          | `66` → `/tickets/66`. Única forma de montar o link do detalhe (Meus chamados agora, Fila e Aprovações depois)                                                                    |
| `canViewTicket`             | `true` se **qualquer** fato vale: é o autor (`createdBy`), é o responsável (`assignedTo`), está no setor **atual** (`currentDepartmentId`), é diretor (`isBoard`). Senão `false` |
| `describePendingTransfer`   | `Aguardando aprovação de QA Infra` (nome do setor de destino)                                                                                                                    |

`canViewTicket` é **a** regra de visibilidade do detalhe. Fila e Aprovações a
reaproveitam; o caso "admin do setor de destino vê chamado aguardando aprovação"
entra na feature de Aprovações, acrescentando um fato aqui, não em outro lugar.
O setor do viewer vem de `getAccountFacts()` (consulta fresca), nunca de
`actor.departmentId` (cookie).

Rótulos:

| `ticket_status`        | Rótulo               |
| ---------------------- | -------------------- |
| `aberto`               | Aberto               |
| `em_analise`           | Em análise           |
| `encaminhado`          | Encaminhado          |
| `aguardando_aprovacao` | Aguardando aprovação |
| `em_andamento`         | Em andamento         |
| `resolvido`            | Resolvido            |
| `fechado`              | Fechado              |
| `cancelado`            | Cancelado            |

| `ticket_priority` | Rótulo  |
| ----------------- | ------- |
| `baixa`           | Baixa   |
| `media`           | Média   |
| `alta`            | Alta    |
| `critica`         | Crítica |

### `app/_lib/domain/my-tickets-tabs.ts` (novo)

```ts
export const MY_TICKETS_TABS = [
  "opened",
  "assigned",
  "resolved",
  "closed",
  "cancelled",
] as const
```

Arquivo-folha, sem import. Existe separado para que `app/_lib/types/my-tickets.ts`
derive `MyTicketsTab` dele (`import type`) sem ciclo: `types/my-tickets.ts` →
`domain/my-tickets-tabs.ts`, e `domain/my-tickets.ts` → `types/my-tickets.ts` e
`domain/my-tickets-tabs.ts`. É o mesmo papel que `db/schema.ts` cumpre para os
enums do banco. Consumidores continuam importando `MY_TICKETS_TABS` de
`@/app/_lib/domain/my-tickets`, que o reexporta.

### `app/_lib/domain/my-tickets.ts` (novo)

```ts
export { MY_TICKETS_TABS } from "@/app/_lib/domain/my-tickets-tabs"
export const MY_TICKETS_PATH = "/tickets"
export const MY_TICKETS_LABEL = "Meus chamados"
export const DEFAULT_MY_TICKETS_TAB: MyTicketsTab = "opened"
export const MY_TICKETS_TAB_RULES = {
  /* uma entrada por aba, tabela abaixo */
} satisfies Record<MyTicketsTab, MyTicketsTabRule>
```

`MY_TICKETS_TABS` dá a ordem das abas; `MY_TICKETS_TAB_RULES` é **o** lugar da
regra de cada aba. Lista, contagem e tela leem daqui; ninguém repete status nem
coluna.

| Aba (`?tab=`) | `label`          | `relation` | `statuses`                 | `emptyTitle`                    | `emptyDescription`                                                                                                                                      |
| ------------- | ---------------- | ---------- | -------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `opened`      | Abertos por mim  | `author`   | `ACTIVE_TICKET_STATUSES`   | Nenhum chamado em andamento     | Os chamados que você abrir aparecem aqui até serem resolvidos ou cancelados.                                                                            |
| `assigned`    | Atribuídos a mim | `assignee` | `ACTIVE_TICKET_STATUSES`   | Nenhum chamado atribuído a você | Os chamados pelos quais você for responsável aparecem aqui até serem resolvidos ou cancelados.                                                          |
| `resolved`    | Resolvidos       | `author`   | `[RESOLVED_TICKET_STATUS]` | Nenhum chamado resolvido        | Os chamados que você abriu e foram resolvidos aparecem aqui até o fechamento automático, 7 dias após a resolução. (`7` = `RESOLUTION_EDIT_WINDOW_DAYS`) |
| `closed`      | Fechados         | `author`   | `["fechado"]`              | Nenhum chamado fechado          | Os chamados que você abriu e foram fechados aparecem aqui.                                                                                              |
| `cancelled`   | Cancelados       | `author`   | `["cancelado"]`            | Nenhum chamado cancelado        | Os chamados que você abriu e foram cancelados aparecem aqui.                                                                                            |

Propriedades que o desenho garante:

- As quatro abas de `author` (Abertos por mim, Resolvidos, Fechados,
  Cancelados) particionam os chamados que a pessoa abriu: todo chamado dela
  está em exatamente uma delas (`ACTIVE` + `resolvido` + `fechado` +
  `cancelado` = os 8 status).
- Um chamado em que a pessoa é autora **e** responsável aparece em "Abertos por
  mim" e em "Atribuídos a mim" enquanto está em andamento. As contagens são por
  aba; a soma não é o total de chamados distintos.
- "Atribuídos a mim" não tem aba de resolvidos: um chamado resolvido em que a
  pessoa é só destinatária (não autora) sai de Meus chamados e continua
  visível na Fila do setor e no detalhe (decisão do usuário, 2026-10-06).
- Nenhuma aba lista `resolvido` junto com outro status: o filtro Status
  some em Resolvidos (um status só) e nunca oferece "Resolvido" em Abertos por
  mim e Atribuídos a mim.
- Um `resolvido` com a janela já vencida e ainda não fechado pelo cron continua
  em Resolvidos (a aba lê o status gravado) até o cron gravar `fechado`.
- Todo chamado listado em qualquer aba passa em `canViewTicket` para a mesma
  pessoa (ela é autora ou responsável): nenhuma linha leva a 404.

### `app/_lib/domain/ticket-history.ts` (novo)

```ts
export const HISTORY_EVENT_LABELS: Record<HistoryEvent, string>
export const describeHistoryEntry: (entry: TicketHistoryEntry) => string
```

`HISTORY_EVENT_LABELS` é o título do item da linha do tempo;
`describeHistoryEntry` é a frase do item, sem o nome de quem fez (a UI mostra
`changedByName` à parte). As duas são `satisfies Record<HistoryEvent, ...>`:
valor novo no enum quebra o `tsc` até ganhar rótulo e frase.

| `history_event`            | Rótulo                   | Frase (todos os campos presentes)                                | Variações                                                                                                                                                 |
| -------------------------- | ------------------------ | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `criacao`                  | Abertura                 | `Abriu o chamado em QA Suporte com status Aguardando aprovação.` | sem setor: omite ` em …`; sem status: omite ` com status …`; destinatário ≠ autor (desde 2026-10-05): acrescenta ` e o atribuiu a {nome}`                 |
| `mudanca_status`           | Mudança de status        | `Alterou o status de Aberto para Em andamento.`                  | só destino: `… para X.`; só origem: `… de X.`; nenhum: `Alterou o status.`                                                                                |
| `mudanca_prioridade`       | Mudança de prioridade    | `Alterou a prioridade de Média para Alta.`                       | mesmas variações                                                                                                                                          |
| `atribuicao`               | Atribuição               | `Trocou o destinatário de Ana para Bruno.`                       | só destino: `Atribuiu o chamado a Bruno.`; só origem: `Removeu o destinatário Ana.`; nenhum: `Alterou o destinatário.` (era "responsável" até 2026-10-05) |
| `transferencia_solicitada` | Transferência solicitada | `Solicitou a transferência de QA Suporte para QA Infra.`         | mesmas variações de `de … para …`                                                                                                                         |
| `transferencia_aprovada`   | Transferência aprovada   | `Aprovou a transferência de QA Suporte para QA Infra.`           | idem                                                                                                                                                      |
| `transferencia_rejeitada`  | Transferência recusada   | `Recusou a transferência de QA Suporte para QA Infra.`           | idem                                                                                                                                                      |
| `reabertura`               | Reabertura               | `Reabriu o chamado com status Aberto.`                           | sem status: `Reabriu o chamado.`                                                                                                                          |
| `encerramento`             | Encerramento             | `Encerrou o chamado com status Fechado.`                         | sem status: `Encerrou o chamado.`                                                                                                                         |
| `mudanca_tag`              | Mudança de tag           | `Trocou a tag de Acesso para Rede.`                              | só destino: `Definiu a tag Rede.`; só origem: `Removeu a tag Acesso.`; nenhum: `Alterou a tag.`                                                           |
| `edicao`                   | Edição                   | `Editou o chamado.`                                              | sempre a mesma frase; o que mudou vem na `note` (`Alterou título e tipo (Dúvida → Bug).`), ver `ticket-edit.md`                                           |
| `resolucao`                | Resolução                | `Resolveu o chamado.`                                            | sempre a mesma frase; a solução fica no card Conclusão, ver `ticket-resolution.md`                                                                        |

Hoje o banco só tem `criacao`, `mudanca_status` (seed demo) e
`transferencia_solicitada`. As outras frases existem para a tela já exibir o que
Aprovações, Atribuição e Conclusão gravarem, sem voltar aqui.

`note` não entra na frase: a UI a mostra abaixo, quando não nula.

Nomes exibidos são os **atuais** (setor renomeado aparece com o nome novo em
eventos antigos): o histórico guarda ids, e o contrato não muda isso.

### `app/_lib/domain/labels.ts` (novo)

```ts
export const EMPTY_VALUE_LABEL = "—"
```

Rótulo exibido no lugar de um valor ausente (tag nula, sem responsável, último
acesso nulo, nenhuma tag ofensora). É texto que o usuário lê, como
`NEVER_ACCESSED_LABEL`, então mora no domínio e ninguém escreve `"—"` na UI.
Vale para a aplicação toda, não só para esta feature. O `df-ui` troca os quatro
usos soltos de hoje:

| Arquivo                                                       | Uso                           |
| ------------------------------------------------------------- | ----------------------------- |
| `app/(app)/tickets/_components/my-tickets-table.tsx`          | constante local `EMPTY_VALUE` |
| `app/(app)/tickets/[id]/_components/ticket-detail-fields.tsx` | constante local `EMPTY_VALUE` |
| `app/(app)/dashboard/_components/dashboard-stats.tsx`         | tag ofensora ausente          |
| `app/(app)/profile/_components/account-details.tsx`           | último acesso nulo            |

Onde já existe rótulo específico do caso (`NEVER_ACCESSED_LABEL` na tabela de
pessoas), ele continua valendo; `EMPTY_VALUE_LABEL` é o genérico.

## Validação — `app/_lib/validation/`

### `app/_lib/validation/search-params.ts` (novo)

```ts
export type RawSearchParams = Record<string, string | string[] | undefined>
export const firstSearchParam: (
  value: string | string[] | undefined,
) => string | undefined
```

Saiu de `validation/dashboard.ts` (era o `firstValue` privado) para o dashboard e
Meus chamados usarem a mesma regra: chave repetida vale pelo primeiro valor.
`parseDashboardParams` não mudou de comportamento.

### `app/_lib/validation/my-tickets.ts` (novo)

```ts
export const myTicketsSearchParamsSchema // z.object({ tab: z.enum(MY_TICKETS_TABS) })
export type MyTicketsSearchParams = { tab: MyTicketsTab }

export const parseMyTicketsTab: (raw: RawSearchParams) => MyTicketsTab
export const myTicketsTabHref: (tab: MyTicketsTab) => string
```

- **`parseMyTicketsTab` nunca lança.** Primeiro valor de `tab`; ausente,
  desconhecido ou com caixa diferente (`Closed`) → `DEFAULT_MY_TICKETS_TAB`
  (`opened`), sem erro e sem redirecionar. Mesmo padrão do `periodo` do
  dashboard: URL velha ou digitada errado mostra a aba padrão em vez de quebrar.
  A URL continua como está (não há `redirect` para a canônica).
- **`myTicketsTabHref`** é a única forma de montar o link de aba:
  `/tickets?tab=opened`. Sempre com o parâmetro, inclusive na aba padrão.
  Ganhou o segundo argumento `period` no adendo do filtro por data.

### `app/_lib/validation/ticket.ts` (acrescido)

```ts
export const TICKET_ID_MAX = 2_147_483_647
export const ticketIdParamSchema // string → number
export const parseTicketIdParam: (value: string) => number | null
```

- Aceita só dígitos sem zero à esquerda (`/^[1-9]\d*$/`) e até `TICKET_ID_MAX`
  (limite do `integer` do Postgres). `0`, `-1`, `1e2`, ` 12`, `0x10`, `007`,
  `12a`, vazio e `2147483648` → `null`.
- Por que não `z.coerce.number()`: ele aceita `1e2`, `0x10` e espaços, e um
  número acima do `integer` faria o `pg` lançar `out of range` (500) em vez de 404.
- Mensagem `Chamado inválido.` existe só por convenção; a página nunca a mostra
  (`null` → `notFound()`).

## `df-auth` — nada novo

`requireSession()` dá `actor.id`; `getAccountFacts()` dá `departmentId` e
`isBoard` frescos (com `cache`, mesma consulta do layout). O layout `(app)` já
manda `mustChangePassword` para `/set-password`.

## `df-data` — o que criar

### `app/_lib/data/my-tickets.ts` (novo)

```ts
export async function listMyTickets(
  userId: number,
  tab: MyTicketsTab,
): Promise<MyTicketListItem[]>

export async function countMyTicketsByTab(
  userId: number,
): Promise<MyTicketsTabCounts>
```

> Assinaturas atualizadas no adendo do filtro por data: as duas ganharam
> `range: DateRange | null = null`.

Arquivo próprio porque é uma visão por pessoa; o que é do chamado em si
(`insertTicket`, `findTicketDetail`) fica em `tickets.ts`.

**Condição de aba, num helper privado só**, usado pelas duas funções:

```ts
const tabCondition = (userId: number, tab: MyTicketsTab): SQL => {
  const rule = MY_TICKETS_TAB_RULES[tab]
  const column =
    rule.relation === "author" ? ticket.createdBy : ticket.assignedTo
  return and(eq(column, userId), inArray(ticket.status, [...rule.statuses]))
}
```

(Forma ilustrativa; o essencial é: coluna e status vêm **só** de
`MY_TICKETS_TAB_RULES`, e lista e contagem usam o mesmo helper. Assim a contagem
e a lista não podem divergir.)

**`listMyTickets(userId, tab)`**

- `ticket inner join department on department.id = ticket.current_department_id
left join ticket_tag on ticket_tag.ticket_id = ticket.id left join tag on
tag.id = ticket_tag.tag_id where tabCondition(userId, tab)`.
- Ordem: `ticket.created_at desc, ticket.id desc` (mais novo primeiro).
- Devolve `MyTicketListItem[]`; `currentDepartmentName = department.name`,
  `tagId`/`tagName` nulos quando não há `ticket_tag`.
- Sem paginação, sem limite.

**`countMyTicketsByTab(userId)`** — **uma** consulta:

```sql
select
  count(*) filter (where <tabCondition(userId, 'opened')>)::int    as opened,
  count(*) filter (where <tabCondition(userId, 'assigned')>)::int  as assigned,
  count(*) filter (where <tabCondition(userId, 'resolved')>)::int  as resolved,
  count(*) filter (where <tabCondition(userId, 'closed')>)::int    as closed,
  count(*) filter (where <tabCondition(userId, 'cancelled')>)::int as cancelled
from ticket
where created_by = $1 or assigned_to = $1
```

- Montada iterando `MY_TICKETS_TABS` (``sql`count(*) filter (where ${tabCondition(...)})`.mapWith(Number)``),
  não com as colunas escritas à mão.
- Sempre devolve uma chave por aba (`MyTicketsTabCounts`); pessoa sem chamado
  → todas `0`.

### `app/_lib/data/tickets.ts` (acrescido)

```ts
export async function findTicketDetail(id: number): Promise<TicketDetail | null>
```

Três leituras, podem ir em `Promise.all`. Chamado inexistente → `null` (as
outras duas voltam vazias e são descartadas).

1. **Chamado** — `ticket` ⋈ `users` (autor, inner) ⟕ `users` (responsável,
   alias) ⋈ `department` (origem, alias) ⋈ `department` (atual, alias) ⟕
   `ticket_tag` ⟕ `tag`, `where ticket.id = $1`. Aliases com `alias()` de
   `drizzle-orm/pg-core` (`users` e `department` aparecem duas vezes).
2. **Transferência pendente** — `ticket_transfer where ticket_id = $1 and status
= 'pendente'` ⋈ `department` (origem e destino, aliases) ⋈ `users`
   (`requested_by`). Zero linhas → `pendingTransfer: null`. O índice
   `transfer_one_pending_per_ticket_idx` garante no máximo uma.
3. **Histórico** — `ticket_history where ticket_id = $1` ⋈ `users`
   (`changed_by`) ⟕ `department` ×2 ⟕ `users` ×2 (responsáveis) ⟕ `tag` ×2,
   **`order by changed_at asc, id asc`** (mais antigo primeiro; o `id` desempata
   linhas gravadas no mesmo instante, como `criacao` e
   `transferencia_solicitada`).

Detalhes que o contrato fixa:

- A função **não** decide quem pode ver. Quem chama aplica `canViewTicket`.
- Não filtra por `is_active` de nada: setor, tag ou pessoa inativos continuam
  aparecendo pelo nome no detalhe e no histórico.
- `relational queries` (`db.query.ticket.findFirst({ with })`) também servem,
  desde que o retorno seja exatamente `TicketDetail`. Decisão do `df-data`.

## `df-actions` — nada

Nenhuma mutação. Não entra em nenhuma onda.

## `df-ui` — o que criar e mudar

### Estrutura

```
app/(app)/_components/app-sidebar.tsx                       alterado — item "Meus chamados"
app/(app)/_components/ticket-status-badge.tsx               novo — badge de status (Fila vai reusar)
app/_components/data-table/data-table.tsx                   alterado — prop rowHref
app/(app)/tickets/page.tsx                                  novo — Server Component, lista
app/(app)/tickets/_components/my-tickets-tabs.tsx           novo — abas (Link), Server
app/(app)/tickets/_components/my-tickets-table.tsx          novo — "use client", DataTable
app/(app)/tickets/_components/my-tickets-empty-state.tsx    novo — estado vazio da aba
app/(app)/tickets/[id]/page.tsx                             novo — Server Component, detalhe
app/(app)/tickets/[id]/_components/ticket-timeline.tsx      novo — linha do tempo, Server
app/(app)/tickets/[id]/_components/pending-transfer-notice.tsx novo — aviso, Server
```

Nomes de arquivo internos de `[id]/_components/` (cabeçalho, campos) ficam a
critério do `df-ui`, respeitando colocation.

### Menu lateral — `app-sidebar.tsx`

- Novo `NavItem` logo abaixo de "Início": `href={MY_TICKETS_PATH}`,
  `label={MY_TICKETS_LABEL}`, ícone `TicketIcon` (`lucide-react`). Para qualquer
  pessoa logada, inclusive no Não alocado: sem condição.
- `NavItem` já marca ativo em `/tickets` e em `/tickets/66`
  (`pathname.startsWith(href + "/")`).
- O cabeçalho mobile não tem navegação hoje (nem para Cadastros); nada muda nele.

### `/tickets` — `app/(app)/tickets/page.tsx` (Server Component)

```tsx
export const metadata: Metadata = { title: MY_TICKETS_LABEL }

const MyTicketsPage = async ({ searchParams }: PageProps<"/tickets">) => {
  const actor = await requireSession()
  const tab = parseMyTicketsTab(await searchParams)
  const [tickets, counts] = await Promise.all([
    listMyTickets(actor.id, tab),
    countMyTicketsByTab(actor.id),
  ])
  ...
}
```

> Leitura de período, intervalo e seletor: ver o adendo do filtro por data.

- `<AppTopBar />` no topo, como no Início. A busca dele continua sem função.
- Título `MY_TICKETS_LABEL` (`h1`).
- `<MyTicketsTabs current={tab} counts={counts} />`.
- `tickets.length === 0` → `<MyTicketsEmptyState tab={tab} />` (sem toolbar de
  busca e filtros). Senão `<MyTicketsTable key={tab} tab={tab} tickets={tickets} />`.
  O `key={tab}` zera busca e filtros ao trocar de aba: sem ele, um filtro de
  status marcado numa aba sobrevive na outra e esvazia a tabela.

### Abas — `my-tickets-tabs.tsx`

- `<nav aria-label="Abas de Meus chamados">` com um `Link` por item de
  `MY_TICKETS_TABS`, na ordem, `href={myTicketsTabHref(id)}`.
- Rótulo `MY_TICKETS_TAB_RULES[id].label` seguido da contagem `counts[id]`
  (número visível, ex.: badge/pílula com `tabular-nums`).
- Ativa: `aria-current="page"` quando `id === current`.
- **Links, não `role="tablist"`.** Cada aba é navegação (entra no histórico, e
  "voltar" do navegador volta para a aba anterior), não troca de painel em
  JavaScript. Sem `"use client"`.

### Tabela — `my-tickets-table.tsx` (`"use client"`)

Props: `tab: MyTicketsTab`, `tickets: MyTicketListItem[]`.

Colunas (`createColumnHelper<DataTableFeatures, MyTicketListItem>`), **em escopo
de módulo**, nesta ordem:

| Coluna      | `id`        | Valor / célula                                                                                                                       |
| ----------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| #           | `id`        | `Link` para `ticketDetailPath(id)` com texto `formatTicketNumber(id)`, `tabular-nums`. É o alvo de teclado e leitor de tela da linha |
| Título      | `title`     | accessor `row.title`, sem `filterFn`; célula `row.title` (truncado). Até 2026-10-08 era `search` (`#id título`, `includesString`)    |
| Tipo        | `type`      | `TICKET_TYPE_LABELS[type]`, `filterFn: "inValues"`                                                                                   |
| Tag         | `tag`       | accessorFn `row.tagId === null ? "none" : String(row.tagId)`, `filterFn: "inValues"`; célula `row.tagName ?? EMPTY_VALUE_LABEL`      |
| Setor atual | —           | `row.currentDepartmentName`                                                                                                          |
| Status      | `status`    | `<TicketStatusBadge status={...} />`, `filterFn: "inValues"`                                                                         |
| Aberto em   | `createdAt` | `formatDate(createdAt)` de `@/app/_lib/date`, `tabular-nums`                                                                         |

- **Busca**: removida em 2026-10-08 (revisão no topo). Antes:
  `search={{ columnId: "search", ... }}` com `includesString`; a busca agora é
  a do topo (`docs/contracts/ticket-search-and-queue-back-link.md`).
- **Filtros** (`filters`, `DataTableFilters`), nesta ordem:
  - **Status** — opções `MY_TICKETS_TAB_RULES[tab].statuses` com
    `TICKET_STATUS_LABELS`. **Só quando a aba tem mais de um status** (em
    Fechados e Cancelados o grupo seria inútil e fica fora).
  - **Tipo** — `TICKET_TYPES` com `TICKET_TYPE_LABELS`.
  - **Tag** — tags presentes em `tickets`, sem repetir id, ordenadas pelo nome,
    `value: String(tagId)`; mais a opção `{ value: "none", label: "Sem tag" }`
    no fim, só se alguma linha tiver `tagId === null`. Grupo omitido se não
    houver opção.
  - Monte `filters` com `useMemo` sobre `[tab, tickets]`.
- **Sem paginação.** `emptyMessage = MY_TICKETS_TAB_RULES[tab].emptyTitle` (só
  aparece se a tabela for montada vazia, o que a página evita).
- **Linha inteira abre o detalhe**: `rowHref={(row) => ticketDetailPath(row.id)}`
  (prop nova do `DataTable`, abaixo). Pode ser constante de módulo.

### `DataTable` — prop nova `rowHref` (`app/_components/data-table/data-table.tsx`)

```ts
interface DataTableProps<TData extends RowData> {
  ...
  rowHref?: (row: TData) => string
}
```

- Com `rowHref`, cada `TableRow` ganha `cursor-pointer` e `onClick` que faz
  `router.push(rowHref(row.original))` (`useRouter` de `next/navigation`).
- O clique que nasce dentro de `a`, `button` ou `input` é ignorado pelo
  `onClick` da linha (o elemento já trata o próprio clique): use
  `event.target instanceof Element && event.target.closest("a, button, input")`.
- Sem `tabIndex` nem `role` na `tr`: o acesso por teclado e o "abrir em nova
  aba" são do `Link` da coluna #. A linha clicável é atalho de mouse/toque.
- Sem `rowHref`, comportamento idêntico ao de hoje (Pessoas, Setores, Tags).

### Estado vazio — `my-tickets-empty-state.tsx`

Props: `tab: MyTicketsTab`. Mostra `MY_TICKETS_TAB_RULES[tab].emptyTitle` e
`emptyDescription` (textos na tabela de abas acima), com ícone `lucide-react`
decorativo (`aria-hidden`). **Sem botão** ("Novo chamado" já está na barra).
Com o filtro por data, o texto vem de `myTicketsEmptyCopy(tab, period)` (as
props passam a ser `tab` e `period`, ou o próprio `MyTicketsEmptyCopy`, a
critério do `df-ui`).

### Badge de status — `app/(app)/_components/ticket-status-badge.tsx`

Props: `status: TicketStatus`. Texto `TICKET_STATUS_LABELS[status]`. Variante ou
cor por status num mapa `satisfies Record<TicketStatus, ...>` dentro do próprio
componente (aparência é decisão de UI; o mapa garante cobertura dos 8 valores).
Fica em `app/(app)/_components/` porque a Fila vai usar.

### `/tickets/[id]` — `app/(app)/tickets/[id]/page.tsx` (Server Component)

```tsx
const TicketDetailPage = async ({ params }: PageProps<"/tickets/[id]">) => {
  const actor = await requireSession()
  const id = parseTicketIdParam((await params).id)
  if (id === null) notFound()

  const [facts, ticket] = await Promise.all([
    getAccountFacts(),
    findTicketDetail(id),
  ])
  if (!facts || !ticket) notFound()

  const viewer: TicketViewerFacts = {
    userId: actor.id,
    departmentId: facts.departmentId,
    isBoard: facts.isBoard,
  }
  if (!canViewTicket(viewer, ticket)) notFound()
  ...
}
```

- **Sem permissão é 404, igual a inexistente**: quem sonda ids não distingue
  "não existe" de "existe e não é seu".
- `generateMetadata`: `title` = `Chamado ${formatTicketNumber(id)}` quando
  `parseTicketIdParam` aceita, senão `Chamado`. **Sem consultar o banco**: o
  título não pode vazar nada de chamado alheio.
- **O título "Chamado #<id>" só vale quando o detalhe é exibido.** Em qualquer
  404 (id inválido, chamado inexistente ou alheio) o `notFound()` faz o Next
  descartar o título de `generateMetadata` e usar o título padrão de not-found
  (`404: This page could not be found.`). É o comportamento esperado e o mais
  seguro: a aba do navegador também não distingue "não existe" de "não é seu".
  Nada a fazer na página para reproduzir "Chamado #<id>" no 404. Um
  `not-found.tsx` futuro pode trocar esse título, desde que não inclua o id
  pedido nem nada do chamado.
- `<AppTopBar />` no topo, como em `/tickets` (continuidade ao abrir a linha).
- Link de volta: `ticketDetailBackLinkFor(parseTicketDetailOrigin(searchParams, today))`
  (revisão de 2026-10-08). Sem `?from=queue`, `MY_TICKETS_LABEL` →
  `MY_TICKETS_PATH`, como antes; com `?from=queue`, `DEPARTMENT_QUEUE_LABEL`
  → `departmentQueueHref(location)`.
- **Cabeçalho**: `formatTicketNumber(id)`, `title` (`h1`), `TicketStatusBadge`,
  prioridade `TICKET_PRIORITY_LABELS[priority]`.
- **Aviso de aprovação** (`pending-transfer-notice.tsx`), só quando
  `ticket.pendingTransfer !== null`: título `describePendingTransfer(transfer)`
  e linha `Solicitada por ${requestedByName} em ${formatDateTime(requestedAt)}`;
  `requestReason`, se não nulo, abaixo. Só leitura, **sem botão**.
- **Campos** (lista de definição `dl`):

  | Rótulo          | Valor                               |
  | --------------- | ----------------------------------- |
  | Tipo            | `TICKET_TYPE_LABELS[type]`          |
  | Tag             | `tagName ?? EMPTY_VALUE_LABEL`      |
  | Setor de origem | `originDepartmentName`              |
  | Setor atual     | `currentDepartmentName`             |
  | Criador         | `authorName`                        |
  | Destinatário    | `assigneeName ?? EMPTY_VALUE_LABEL` |

  Até 2026-10-05 os rótulos eram `Aberto por` e `Responsável`
  (`ticket-assignee.md`).
  | Aberto em | `formatDateTime(createdAt)` |

- **Descrição**: texto puro com quebras preservadas (`whitespace-pre-wrap`),
  nunca HTML (`dangerouslySetInnerHTML` proibido).
- **Linha do tempo** (`ticket-timeline.tsx`): `ol` na ordem recebida (mais
  antigo primeiro). Cada item: `HISTORY_EVENT_LABELS[event]` (título),
  `changedByName`, `formatDateTime(changedAt)` num `<time dateTime={toISO(changedAt)}>`,
  `describeHistoryEntry(entry)` e, se houver, `note`. Histórico vazio (não
  acontece hoje) → `Nenhum evento registrado.`
- **Sem nenhum botão de ação** (concluir, editar, atribuir, aprovar, mensagem,
  anexo). Nada de placeholder "em breve". Exceções posteriores: o botão
  "Editar" do autor (`docs/contracts/ticket-edit.md`); os cards Conclusão e
  Comentários, com "Resolver", "Comentar" e os botões bloqueados "Anexar" e
  "Enviar para outro setor" (`docs/contracts/ticket-resolution.md`). Botão de
  feature futura só entra no padrão de ação bloqueada.

### Regras gerais de UI

- Datas só por `@/app/_lib/date` (`formatDate`, `formatDateTime`, `toISO`).
- `my-tickets-table.tsx` é o único Client Component novo; não importa
  `app/_lib/data`, `app/_lib/auth`, `@/db/*` nem `drizzle-orm`. Recebe as linhas
  por props (`Date` serializa entre Server e Client Component).
- Rótulos de status, prioridade, tipo e evento vêm sempre dos `*_LABELS`;
  nenhum texto de enum escrito na UI. Valor ausente é `EMPTY_VALUE_LABEL`
  (`@/app/_lib/domain/labels`), nunca `"—"` literal.

## Riscos

1. ~~**Dois campos de busca na mesma tela.**~~ Resolvido em 2026-10-08: a
   busca do topo passou a funcionar e a da tabela saiu
   (`docs/contracts/ticket-search-and-queue-back-link.md`).
2. **Abas quase vazias.** "Atribuídos a mim" fica em `0` para todo mundo até
   existir atribuição; Fechados e Cancelados só têm dados do seed demo (autor:
   o diretor). Para os usuários QA, só "Abertos por mim" tem linhas.
3. **Autor e responsável ao mesmo tempo** → o chamado aparece em duas abas;
   contagens não somam o total.
4. ~~**Busca por número é por trecho**~~: superado em 2026-10-08. A busca do
   topo casa número por **prefixo** (`66` acha #66, #660…, não #166).
5. **Visibilidade larga dentro do setor.** Qualquer pessoa do setor atual vê o
   detalhe (descrição inclusive) de qualquer chamado do setor. Decidido.
6. **Admin do destino não vê chamado aguardando aprovação** até a feature de
   Aprovações acrescentar o fato em `canViewTicket`. Ele só o vê hoje se for
   diretor.
7. **Nomes atuais no histórico**: setor, tag ou pessoa renomeados aparecem com o
   nome novo em eventos antigos.
8. **Detalhe carregado antes de autorizar.** `findTicketDetail` roda em paralelo
   com `getAccountFacts` e só depois `canViewTicket` decide. Custo de leitura
   desperdiçado em 404; nada vaza (a resposta é a mesma de inexistente).
9. **Mobile sem navegação**: o item novo só aparece na sidebar (`lg`+). Mesmo
   caso de Cadastros hoje.
10. **Chamados legados sem tag** (3): célula `—` e opção "Sem tag" no filtro.

## Cenários para o `df-qa`

Usuários de `docs/contracts/qa-seed.md`. Nada é gravado pela feature; o teste só
lê (banco pelo MCP `postgres`, role `df_readonly`). Chamados de referência do
relatório `docs/test-reports/2026-10-01-ticket-creation.md`: #65 (`aberto`, QA
Suporte) e #66 (`aguardando_aprovacao`, current QA Suporte, transferência
pendente para QA Infra), ambos de QA Membro Suporte.

Os chamados de QA Membro Suporte **não se limitam a #65 e #66**: testes
anteriores de criação deixaram outros (hoje #67, `aberto`, e #68,
`aguardando_aprovacao` com transferência pendente), e novos testes podem deixar
mais. Onde um cenário fala da lista ou da contagem do membro, o critério é bater
com a consulta ao banco do cenário 3, não com uma lista fixa de ids. #65 e #66
continuam sendo os chamados de referência para o detalhe (cenários 12 a 18).

| #   | Quem              | Ação                                                                                                                                                                                                                                                                                                                                                                                                                                   | Esperado                                                                                                                                                                                                                                                                                                                                         |
| --- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | QA Membro Suporte | abrir o Início                                                                                                                                                                                                                                                                                                                                                                                                                         | sidebar com "Meus chamados" (ícone de ticket) logo abaixo de "Início"; clicar leva a `/tickets`, item ativo                                                                                                                                                                                                                                      |
| 2   | QA Membro Suporte | `/tickets`                                                                                                                                                                                                                                                                                                                                                                                                                             | barra superior presente; título "Meus chamados"; aba "Abertos por mim" ativa (`aria-current="page"`); cinco abas na ordem Abertos por mim, Atribuídos a mim, Resolvidos, Fechados, Cancelados, cada uma com contagem                                                                                                                             |
| 3   | banco, só leitura | para o id de QA Membro Suporte: `select count(*) filter (where created_by=$1 and status not in ('resolvido','fechado','cancelado')), count(*) filter (where assigned_to=$1 and status not in ('resolvido','fechado','cancelado')), count(*) filter (where created_by=$1 and status='resolvido'), count(*) filter (where created_by=$1 and status='fechado'), count(*) filter (where created_by=$1 and status='cancelado') from ticket` | os cinco números batem com as contagens das abas; repetir para o diretor (que tem resolvidos, fechados e cancelados do seed demo)                                                                                                                                                                                                                |
| 4   | QA Membro Suporte | aba Abertos por mim                                                                                                                                                                                                                                                                                                                                                                                                                    | os chamados em andamento do membro (sem `resolvido`), os mesmos da consulta do cenário 3 (inclui #65 e #66, e hoje também #67 e #68), mais novo primeiro; colunas #, Título, Tipo, Tag, Setor atual, Status (badge), Aberto em; #66 com status "Aguardando aprovação" e setor atual QA Suporte; nenhuma paginação                                |
| 5   | QA Membro Suporte | clicar "Atribuídos a mim"                                                                                                                                                                                                                                                                                                                                                                                                              | URL `/tickets?tab=assigned`; contagem 0; estado vazio "Nenhum chamado atribuído a você" com a descrição do contrato; sem tabela, sem botão                                                                                                                                                                                                       |
| 6   | QA Membro Suporte | Fechados, depois Cancelados                                                                                                                                                                                                                                                                                                                                                                                                            | URLs `?tab=closed` e `?tab=cancelled`; estados vazios próprios de cada aba (textos do contrato)                                                                                                                                                                                                                                                  |
| 7   | QA Membro Suporte | depois do cenário 6, "voltar" do navegador duas vezes                                                                                                                                                                                                                                                                                                                                                                                  | volta para Fechados e depois Atribuídos a mim, com a aba ativa e o conteúdo coerentes com a URL                                                                                                                                                                                                                                                  |
| 8   | QA Membro Suporte | `/tickets?tab=xyz`, `/tickets?tab=Closed`, `/tickets?tab=closed&tab=opened`                                                                                                                                                                                                                                                                                                                                                            | os dois primeiros mostram "Abertos por mim" sem erro; o terceiro mostra Fechados (primeiro valor)                                                                                                                                                                                                                                                |
| 9   | Diretor           | `/tickets`, aba Abertos por mim                                                                                                                                                                                                                                                                                                                                                                                                        | busca `#` + número de um chamado listado → só ele (e números que o contêm); busca por trecho do título, em minúsculas → linhas correspondentes; termo sem correspondência → "Nenhum resultado para os filtros aplicados."                                                                                                                        |
| 10  | Diretor           | filtros na aba Abertos por mim                                                                                                                                                                                                                                                                                                                                                                                                         | grupos Status (5 status em andamento, sem "Resolvido"), Tipo (6 tipos), Tag (tags presentes, "Sem tag" se houver legado); marcar um status → só ele; marcar dois → os dois (OU); status + tipo → interseção (E); "Limpar filtros" restaura                                                                                                       |
| 11  | Diretor           | aba Fechados                                                                                                                                                                                                                                                                                                                                                                                                                           | sem grupo Status nos filtros; Tipo e Tag presentes. Marcar um filtro, trocar para Cancelados: filtros e busca zerados                                                                                                                                                                                                                            |
| 12  | QA Membro Suporte | clicar no meio da linha do #66 (fora do link); depois, só teclado: `Tab` até o link `#65`, `Enter`                                                                                                                                                                                                                                                                                                                                     | os dois abrem o detalhe correspondente (`/tickets/66`, `/tickets/65`)                                                                                                                                                                                                                                                                            |
| 13  | QA Membro Suporte | `/tickets/66`                                                                                                                                                                                                                                                                                                                                                                                                                          | cabeçalho #66, título, badge "Aguardando aprovação", prioridade "Média"; Tipo, Tag, Setor de origem QA Suporte, Setor atual QA Suporte, Criador QA Membro Suporte, Destinatário "—" (rótulos desde 2026-10-05), Aberto em; descrição; aviso "Aguardando aprovação de QA Infra" com "Solicitada por QA Membro Suporte em …"; nenhum botão de ação |
| 14  | QA Membro Suporte | linha do tempo do #66                                                                                                                                                                                                                                                                                                                                                                                                                  | dois itens, nesta ordem: "Abertura" — "Abriu o chamado em QA Suporte com status Aguardando aprovação."; "Transferência solicitada" — "Solicitou a transferência de QA Suporte para QA Infra."; ambos com QA Membro Suporte e data/hora. Conferir no banco: `ticket_history` ids 78 e 79                                                          |
| 15  | QA Membro Suporte | `/tickets/65`                                                                                                                                                                                                                                                                                                                                                                                                                          | sem aviso de aprovação; linha do tempo com um item "Abertura" (status Aberto)                                                                                                                                                                                                                                                                    |
| 16  | QA Admin Infra    | `/tickets/65` e `/tickets/66` (current QA Suporte; ele é de QA Infra, não é autor nem responsável)                                                                                                                                                                                                                                                                                                                                     | 404 nos dois (inclusive o #66 que aguarda aprovação de QA Infra: risco 6)                                                                                                                                                                                                                                                                        |
| 17  | QA Admin Suporte  | `/tickets/66`                                                                                                                                                                                                                                                                                                                                                                                                                          | abre (está no setor atual)                                                                                                                                                                                                                                                                                                                       |
| 18  | Diretor           | `/tickets/66`                                                                                                                                                                                                                                                                                                                                                                                                                          | abre (Diretoria)                                                                                                                                                                                                                                                                                                                                 |
| 19  | Diretor           | mover QA Membro Suporte para o Não alocado; o membro abre `/tickets` e `/tickets/66`                                                                                                                                                                                                                                                                                                                                                   | item do menu visível; a aba lista os mesmos chamados do cenário 4 (conferir com o banco); o detalhe abre (autor). Ao fim, mover de volta para QA Suporte                                                                                                                                                                                         |
| 20  | qualquer          | `/tickets/abc`, `/tickets/0`, `/tickets/1e2`, `/tickets/99999999999`, `/tickets/999999`                                                                                                                                                                                                                                                                                                                                                | 404 em todos; nenhum erro no dev server (MCP `next-devtools`)                                                                                                                                                                                                                                                                                    |
| 21  | QA Membro Suporte | título da aba do navegador em `/tickets/66` e `/tickets/<id de chamado alheio>`                                                                                                                                                                                                                                                                                                                                                        | `/tickets/66`: "Chamado #66" (só o número, nunca o título do chamado). Chamado alheio (404): título padrão de not-found (`404: This page could not be found.`), o mesmo de `/tickets/abc` e de id inexistente; nunca "Chamado #<id>" nem nada do chamado                                                                                         |
| 22  | qualquer          | navegar pelas telas da feature                                                                                                                                                                                                                                                                                                                                                                                                         | nenhum erro nem aviso de hidratação no dev server; nenhuma linha nova em `ticket`, `ticket_history`, `ticket_transfer` (comparar `max(id)` antes e depois)                                                                                                                                                                                       |

### Cenários do filtro por data (adendo)

Período no fuso de São Paulo. Para conferir no banco, o intervalo de um dia
`D` é `created_at >= (D::timestamp at time zone 'America/Sao_Paulo') and
created_at < ((D + 1)::timestamp at time zone 'America/Sao_Paulo')`; semana de
segunda a domingo; mês corrente inteiro. O Diretor tem chamados do seed demo
espalhados por hoje, ontem às 21h–23h59, esta semana, este mês e o mês anterior
(`docs/contracts/dashboard.md`, bloco demo): é a pessoa certa para os períodos.

| #   | Quem              | Ação                                                                                                                                                                            | Esperado                                                                                                                                                                                                                                                                         |
| --- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 23  | Diretor           | `/tickets`; depois clicar Todos                                                                                                                                                 | seletor abaixo do campo "Buscar por # ou título", na ordem Todos, Hoje, Semana, Mês, Personalizado; **Hoje** ativo (`aria-current="page"`) com subtítulo da data de hoje. Clicar Todos: URL `/tickets?tab=opened&periodo=todos`, sem subtítulo, contagens iguais às do cenário 3 |
| 24  | Diretor           | clicar Hoje, Semana e Mês, nessa ordem                                                                                                                                          | URLs `/tickets?tab=opened&periodo=hoje`, `…=semana`, `…=mes`; subtítulo `formatRangeLabel` (ex.: `1 out 2026`); lista e as cinco contagens batem com a consulta do cenário 3 acrescida do intervalo, para cada período                                                           |
| 25  | Diretor           | Hoje                                                                                                                                                                            | nenhum chamado criado ontem entre 21h e 23h59 de Brasília aparece, em nenhuma aba (no banco esses já são "hoje" em UTC): é o teste do fuso                                                                                                                                       |
| 26  | Diretor           | Personalizado → escolher de 1 ao 10 do mês anterior → Aplicar                                                                                                                   | URL `…&periodo=personalizado&de=AAAA-MM-01&ate=AAAA-MM-10`; o dia 10 inteiro incluído; lista e contagens batem com o banco; calendário começa na segunda                                                                                                                         |
| 27  | Diretor           | com Semana ativo, clicar nas abas Fechados e Cancelados                                                                                                                         | a aba muda e o período continua Semana (URL mantém `periodo=semana`); contagens das cinco abas continuam no período                                                                                                                                                              |
| 28  | Diretor           | na aba Fechados com Semana, clicar Mês                                                                                                                                          | a aba continua Fechados (`tab=closed`), o período vira Mês                                                                                                                                                                                                                       |
| 29  | Diretor           | marcar um filtro de Tipo e digitar na busca; depois trocar o período                                                                                                            | busca e filtros zerados ao trocar o período                                                                                                                                                                                                                                      |
| 30  | QA Membro Suporte | escolher um período sem chamados (Personalizado num mês antigo)                                                                                                                 | sem tabela; o seletor continua visível; estado vazio "Nenhum chamado neste período" com a descrição do contrato; contagens 0; clicar Todos volta à lista                                                                                                                         |
| 31  | qualquer          | `/tickets?periodo=xyz`, `?periodo=Hoje`, `?periodo=personalizado`, `?periodo=personalizado&de=2026-09-10&ate=2026-09-01`, `?periodo=personalizado&de=2026-02-30&ate=2026-03-01` | todos mostram Hoje ativo e a lista da aba no dia de hoje, sem erro                                                                                                                                                                                                               |
| 32  | qualquer          | `/tickets?tab=xyz&periodo=semana` e `/tickets?tab=closed&periodo=xyz`                                                                                                           | o primeiro: aba Abertos por mim com Semana; o segundo: Fechados com Hoje (aba e período caem no padrão independentemente)                                                                                                                                                        |
| 33  | qualquer          | `/tickets?tab=opened&periodo=todos` e `/tickets?tab=opened`                                                                                                                     | o primeiro com Todos ativo e a lista completa; o segundo igual a `/tickets?tab=opened&periodo=hoje`                                                                                                                                                                              |
| 34  | qualquer          | após 24 e 27, "voltar" do navegador                                                                                                                                             | cada passo volta com aba, período, lista e contagens coerentes com a URL                                                                                                                                                                                                         |
| 35  | Diretor           | Início                                                                                                                                                                          | sem pílula Todos; abre em Hoje; Hoje/Semana/Mês/Personalizado funcionam como antes (cartões iguais ao gabarito do seed); `/dashboard?periodo=todos` mostra Hoje                                                                                                                  |
| 36  | qualquer          | navegar pelos cenários 23–35                                                                                                                                                    | nenhum erro nem aviso de hidratação no dev server; nenhuma linha nova em `ticket`, `ticket_history`, `ticket_transfer`                                                                                                                                                           |

### Cenários de datas futuras (revisão de 2026-10-05)

`HOJE` = data de hoje em São Paulo (`AAAA-MM-DD`); `AMANHA` e `ONTEM`, os
vizinhos. Valem para as duas telas; onde diz "nas duas telas", repetir em
`/dashboard` e em `/tickets?tab=opened`.

| #   | Quem     | Ação                                                                                                                   | Esperado                                                                                                                                                                                      |
| --- | -------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 37  | Diretor  | nas duas telas, abrir Personalizado                                                                                    | os dias depois de hoje aparecem desabilitados (não selecionáveis, `aria-disabled` / `disabled` no botão do dia); hoje e dias passados selecionáveis; o botão de próximo mês fica desabilitado |
| 38  | Diretor  | nas duas telas, tentar clicar num dia futuro do mês atual                                                              | nada é selecionado; "Aplicar" continua desabilitado se nada foi escolhido                                                                                                                     |
| 39  | Diretor  | nas duas telas, escolher `ONTEM`–`HOJE` → Aplicar                                                                      | URL com `periodo=personalizado&de=ONTEM&ate=HOJE`; Personalizado ativo; números batem com o banco (consulta do cenário 3 com o intervalo)                                                     |
| 40  | qualquer | `/dashboard?periodo=personalizado&de=HOJE&ate=AMANHA` e `/tickets?tab=opened&periodo=personalizado&de=HOJE&ate=AMANHA` | os dois mostram **Hoje** ativo, subtítulo da data de hoje e os números de Hoje; nenhum erro                                                                                                   |
| 41  | qualquer | `…&periodo=personalizado&de=AMANHA&ate=AMANHA` e `…&de=2099-01-01&ate=2099-01-31`, nas duas telas                      | Hoje ativo; nenhum erro                                                                                                                                                                       |
| 42  | qualquer | `…&periodo=personalizado&de=HOJE&ate=HOJE`, nas duas telas                                                             | válido: Personalizado ativo, subtítulo da data de hoje                                                                                                                                        |
| 43  | Diretor  | `/tickets?tab=closed&periodo=personalizado&de=ONTEM&ate=AMANHA`                                                        | aba Fechados mantida, período Hoje (aba e período continuam independentes)                                                                                                                    |
| 44  | qualquer | navegar por 37–43                                                                                                      | nenhum erro nem aviso de hidratação no dev server (MCP `next-devtools`); nenhuma linha nova em `ticket`, `ticket_history`, `ticket_transfer`                                                  |

### Cenários da aba Resolvidos (revisão de 2026-10-06)

`M` = QA Membro Suporte, `A` = QA Admin Suporte (`docs/contracts/qa-seed.md`).
Consulta de referência = cenário 3 (cinco contagens). Escrita só nos cenários
49 e 50, com títulos `[QA]`.

| #   | Quem              | Ação                                                                                                                                                | Esperado                                                                                                                                                                                                                                                   |
| --- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 45  | M e Diretor       | `/tickets?tab=opened&periodo=todos`                                                                                                                 | cinco abas na ordem Abertos por mim, Atribuídos a mim, Resolvidos, Fechados, Cancelados; as cinco contagens batem com a consulta do cenário 3                                                                                                              |
| 46  | M e Diretor       | clicar Resolvidos                                                                                                                                   | URL `/tickets?tab=resolved&periodo=todos`; lista = `select id from ticket where created_by = $1 and status = 'resolvido' order by created_at desc, id desc`; todas as linhas com badge "Resolvido"; **sem** grupo Status nos filtros; Tipo e Tag presentes |
| 47  | M e Diretor       | Abertos por mim e Atribuídos a mim (Todos)                                                                                                          | nenhuma linha com badge "Resolvido"; grupo Status com 5 opções (Aberto, Em análise, Encaminhado, Aguardando aprovação, Em andamento), **sem** "Resolvido"                                                                                                  |
| 48  | banco, só leitura | para M e para o Diretor: `select count(*) from ticket where created_by = $1`                                                                        | igual à soma das contagens de Abertos por mim, Resolvidos, Fechados e Cancelados com Todos (partição das abas de autor)                                                                                                                                    |
| 49  | M                 | criar `[QA] Aba resolvidos` (destinatário padrão M) → anotar contagens (Todos) → resolver no detalhe → voltar a `/tickets?tab=opened&periodo=todos` | o chamado sai de Abertos por mim e de Atribuídos a mim (cada contagem −1) e aparece em Resolvidos (+1), sem recarregar manualmente (revalidação de `/tickets`)                                                                                             |
| 50  | M, depois A       | M cria `[QA] Resolvido pelo admin` com destinatário A; A resolve no detalhe; A abre Meus chamados (Todos) em todas as abas; M abre Resolvidos       | para A: o chamado em nenhuma aba de Meus chamados (consequência aceita), e presente em `/queue?tab=resolved`. Para M: listado em Resolvidos                                                                                                                |
| 51  | Diretor           | Resolvidos com Semana; clicar Mês; depois clicar Fechados; "voltar" do navegador                                                                    | `tab=resolved&periodo=semana` → `tab=resolved&periodo=mes` (aba mantida) → `tab=closed&periodo=mes` (período mantido); voltar restaura Resolvidos com Mês; contagens sempre no período                                                                     |
| 52  | M                 | Resolvidos com Todos, se não houver resolvido (senão, conferir só o texto do período); depois um Personalizado sem chamados                         | Todos vazio: "Nenhum chamado resolvido" / "Os chamados que você abriu e foram resolvidos aparecem aqui até o fechamento automático, 7 dias após a resolução."; outro período vazio: "Nenhum chamado neste período"                                         |
| 53  | qualquer          | `/tickets?tab=resolved`, `/tickets?tab=Resolved`, `/tickets?tab=resolvido`                                                                          | o primeiro: Resolvidos com Hoje; os outros dois: Abertos por mim com Hoje; nenhum erro                                                                                                                                                                     |
| 54  | qualquer          | navegar por 45–53                                                                                                                                   | nenhum erro nem aviso de hidratação no dev server; nenhuma linha nova em `ticket`, `ticket_history`, `ticket_transfer` além das de 49 e 50                                                                                                                 |

## Critério de pronto

1. Cenários 1–22 aprovados pelo `df-qa`. Do adendo, cenários 23–36. Da revisão
   de 2026-10-06, cenários 45–54.
2. Contagens das abas iguais à consulta do cenário 3 para pelo menos duas
   pessoas.
3. Nenhuma linha gravada pela feature; nenhuma migration; nenhuma action.
4. `npx tsc --noEmit`, `npm run lint` e `npm run build` passam; `df-reviewer`
   sem bloqueante.

## Checklist de encerramento da feature

- [x] tipos, domínio (`TICKET_STATUS_LABELS`, `TICKET_PRIORITY_LABELS`, `NON_FINAL_TICKET_STATUSES`, `canViewTicket`, `MY_TICKETS_TAB_RULES`, `HISTORY_EVENT_LABELS`, `describeHistoryEntry`) e validação (`parseMyTicketsTab`, `parseTicketIdParam`) (`df-architect`)
- [ ] `listMyTickets`, `countMyTicketsByTab` em `app/_lib/data/my-tickets.ts`; `findTicketDetail` em `app/_lib/data/tickets.ts` (`df-data`)
- [ ] item do menu, `/tickets`, `/tickets/[id]`, `TicketStatusBadge`, `rowHref` no `DataTable` (`df-ui`)
- [ ] cenários do `df-qa`
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm run build`

Adendo do filtro por data:

- [x] `PeriodFilterSelection`, `PERIOD_LABELS.todos`, `MY_TICKETS_PERIOD_PRESETS`, `myTicketsEmptyCopy`, `resolvePeriodFilterRange`, `validation/period.ts`, `parseMyTicketsPeriod`, `myTicketsTabHref(tab, period)` (`df-architect`)
- [ ] `range` em `listMyTickets` e `countMyTicketsByTab` (`df-data`)
- [ ] `PeriodFilter`/`CustomPeriodPicker` genéricos em `app/(app)/_components/`, slot no `DataTable`, `/tickets` com período, abas mantendo o período, estado vazio por período (`df-ui`)
- [ ] cenários 23–36 do `df-qa`

Revisão de 2026-10-05 (datas futuras):

- [x] `customPeriodSchema(today)`, `myTicketsPeriodSchema(today)`, `dashboardSearchParamsSchema(today)`, `parseMyTicketsPeriod(raw, today)`, `parseDashboardParams(raw, today)`, `todayCalendarDate` (`df-architect`)
- [ ] `today` nas páginas `/tickets` e `/dashboard`; `disabled`/`endMonth` no `CustomPeriodPicker` (`df-ui`)
- [ ] cenários 37–44 do `df-qa`

Revisão de 2026-10-06 (aba Resolvidos):

- [x] `ACTIVE_TICKET_STATUSES`, `ActiveTicketStatus`, `isActiveTicketStatus`, `RESOLVED_TICKET_STATUS` literal, `resolved` em `MY_TICKETS_TABS` e `MY_TICKETS_TAB_RULES` (`df-architect`)
- [ ] `resolved: 0` na contagem inicial de `countMyTicketsByTab` (`df-data`)
- [ ] nada no `df-ui`: abas, estado vazio e filtro Status saem das regras
- [ ] cenários 45–54 do `df-qa`
