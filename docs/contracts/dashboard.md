# Contrato — Dashboard Início

Entrada das ondas 1 e 2. Plano aprovado em `docs/plans/dashboard-inicio.md`.
Decisão de fuso em `docs/adr/009-calendario-no-fuso-de-sao-paulo.md`.

Versões observadas: `next@16.3.5`, `zod@4.6.5`, `dayjs@1.11.23`,
`drizzle-orm@0.45.2`.

## Decisões fixadas pelo usuário

| Regra               | Definição                                                                                                                  |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Escopo dos chamados | `ticket.current_department_id = setor do usuário`, igual para admin e membro. Todos os status contam                       |
| Âncora do período   | `ticket.created_at`                                                                                                        |
| Períodos            | Fuso `America/Sao_Paulo`: hoje; semana de segunda a domingo; mês corrente; personalizado com `de` e `ate` inclusivos       |
| Intervalo           | Meio-aberto `[start, end)`                                                                                                 |
| Período padrão      | `mes`                                                                                                                      |
| Tag ofensora        | Tag do próprio setor (`tag.department_id`) mais aplicada nos chamados em escopo no período; empate por nome; nenhuma → `—` |
| Estado do filtro    | URL. Parâmetro inválido cai no padrão, sem erro                                                                            |

## Tabelas, enums e migration

**Nenhuma mudança de schema. Nenhuma migration.** O fluxo lê:

- `ticket` — `id`, `current_department_id`, `created_at`
- `ticket_tag` — `ticket_id`, `tag_id`
- `tag` — `id`, `name`, `department_id`
- `users` e `department` — card do usuário

Índice que atende a contagem: `ticket_dept_status_idx`
(`current_department_id, status, created_at desc`). Não há índice só em
`(current_department_id, created_at)`; com o volume atual não se justifica criar.
Se o `EXPLAIN` do `df-data` mostrar problema, reporte e o `df-architect` cria.

O seed demo escreve em `tag`, `ticket`, `ticket_tag` e `ticket_history`.

## Datas — `app/_lib/date.ts`

Único arquivo do projeto que importa `dayjs`. Plugins `utc`, `timezone` e
`relativeTime`, locale `pt-br`. Ninguém mais importa `dayjs`, `date-fns` (que o
`react-day-picker` traz como transitivo) nem formata data à mão.

**Exceção única, do locale do calendário.** O único import permitido que vem do
`date-fns` é `import { ptBR } from "react-day-picker/locale"`, e só em
`app/(app)/dashboard/_components/custom-period-picker.tsx`. Esse módulo só
repassa `date-fns/locale`. O `ptBR` serve apenas para a prop `locale` do
`Calendar` (nomes de mês e dia, início da semana na segunda). Ele não formata nem
calcula data: o subtítulo, a URL e as conversões continuam saindo de
`@/app/_lib/date`. Import direto de `date-fns` (`date-fns`, `date-fns/*`)
continua proibido em qualquer arquivo. Registrado no ADR 009.

```ts
export const APP_TIME_ZONE = "America/Sao_Paulo"
export type DateInput = Date | string | number

export const formatDate: (value: DateInput) => string
export const formatDateTime: (value: DateInput) => string
export const formatRelative: (value: DateInput, now?: DateInput) => string
export const toISO: (value: DateInput) => string
export const parseISO: (value: string) => Date | null

export const isDateKey: (value: string) => value is DateKey
export const toDateKey: (value: DateInput) => DateKey
export const todayKey: (now?: DateInput) => DateKey
export const addDaysToKey: (key: DateKey, amount: number) => DateKey
export const addMonthsToKey: (key: DateKey, amount: number) => DateKey
export const zonedDateTime: (
  key: DateKey,
  hour?: number,
  minute?: number,
) => Date

export const resolvePeriodRange: (
  selection: PeriodSelection,
  now?: DateInput,
) => DateRange
export const formatRangeLabel: (range: DateRange) => string

export const calendarDateToKey: (value: Date) => DateKey
export const dateKeyToCalendarDate: (key: DateKey) => Date
```

| Função                            | Semântica                                                                                                                                                                 |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `formatDate` / `formatDateTime`   | `24/09/2026` / `24/09/2026 22:30`, sempre no fuso de São Paulo                                                                                                            |
| `formatRelative`                  | `há 3 horas`. `now` só para teste                                                                                                                                         |
| `toISO` / `parseISO`              | ISO 8601 em UTC. `parseISO` devolve `null` para entrada inválida, nunca `Invalid Date`                                                                                    |
| `isDateKey`                       | `YYYY-MM-DD` que existe no calendário (`2026-02-30` é `false`)                                                                                                            |
| `toDateKey`                       | Dia **em São Paulo** do instante. `2026-09-25T01:30Z` → `2026-09-24`                                                                                                      |
| `todayKey`                        | `toDateKey(now)`                                                                                                                                                          |
| `addDaysToKey` / `addMonthsToKey` | Aritmética de calendário sobre a chave; sem fuso. `addMonthsToKey("2026-01-31", 1)` → `2026-02-28`                                                                        |
| `zonedDateTime`                   | Instante da hora de parede `hour:minute` do dia `key` em São Paulo. `zonedDateTime("2026-09-24", 21, 30)` → `2026-09-25T00:30:00Z`. Sem hora: meia-noite                  |
| `resolvePeriodRange`              | Seleção → `[start, end)`. `hoje`: dia atual. `semana`: segunda a domingo da semana atual. `mes`: mês atual inteiro. `personalizado`: `de` 00:00 até o dia depois de `ate` |
| `formatRangeLabel`                | Subtítulo: `24 set 2026` · `1–30 set 2026` · `28 set – 4 out 2026` · `28 dez 2026 – 3 jan 2027`                                                                           |
| `calendarDateToKey`               | `Date` que o calendário devolve (meia-noite **local do navegador**) → chave, lendo os componentes locais                                                                  |
| `dateKeyToCalendarDate`           | Chave → `Date` na meia-noite local do navegador, para `selected` do calendário                                                                                            |

`resolvePeriodRange` e `formatRangeLabel` rodam no servidor e no cliente com o
mesmo resultado; o fuso do processo não interfere.

**Nunca misture os dois pares.** `toDateKey` interpreta um **instante** em São
Paulo; `calendarDateToKey` interpreta um **dia escolhido na tela** no fuso do
navegador. Usar `toDateKey` no retorno do calendário, num navegador em UTC+9,
salva o dia anterior ao clicado.

## Tipos — `app/_lib/types/`

### `app/_lib/types/period.ts`

```ts
export type Period = "hoje" | "semana" | "mes" | "personalizado"
export type PresetPeriod = Exclude<Period, "personalizado">
export type DateKey = string

export interface PresetPeriodSelection {
  periodo: PresetPeriod
}

export interface CustomPeriodSelection {
  periodo: "personalizado"
  de: DateKey
  ate: DateKey
}

export type PeriodSelection = PresetPeriodSelection | CustomPeriodSelection

export interface DateRange {
  start: Date
  end: Date
}
```

`PeriodSelection` é união discriminada por `periodo`: `de` e `ate` só existem
quando `periodo === "personalizado"`, e o compilador obriga o narrowing.

### `app/_lib/types/dashboard.ts`

```ts
export interface DashboardTopTag {
  name: string
  count: number
}

export interface DashboardSummary {
  ticketCount: number
  topTag: DashboardTopTag | null
}
```

### `app/_lib/types/user.ts`

```ts
export interface UserProfile {
  id: number
  name: string
  email: string
  role: Role
  departmentId: number
  departmentName: string
}
```

## Domínio — `app/_lib/domain/`

### `app/_lib/domain/period.ts`

```ts
export const PERIODS = ["hoje", "semana", "mes", "personalizado"] as const
export const PRESET_PERIODS = ["hoje", "semana", "mes"] as const
export const DEFAULT_PERIOD: PresetPeriod = "mes"
export const PERIOD_LABELS: Record<Period, string>
```

`PERIOD_LABELS`: `Hoje`, `Semana`, `Mês`, `Personalizado`. As pílulas iteram
`PERIODS` e leem o rótulo daqui.

### `app/_lib/domain/user.ts`

```ts
export const ROLE_LABELS: Record<Role, string>
export const getFirstName: (name: string) => string
export const getInitials: (name: string) => string
export const describeMembership: (departmentName: string, role: Role) => string
```

| Função               | Semântica                                                                                           |
| -------------------- | --------------------------------------------------------------------------------------------------- |
| `ROLE_LABELS`        | `admin` → `Administrador`, `member` → `Membro`. Substitui o `roleLabel` de `app/dashboard/page.tsx` |
| `getFirstName`       | Primeira palavra do nome, para `Olá, <primeiro nome>`                                               |
| `getInitials`        | Primeira letra do primeiro e do último nome, maiúsculas. `Henrique Oliveira` → `HO`; `Ana` → `A`    |
| `describeMembership` | `Suporte · Administrador` — linha do card da sidebar e do cabeçalho mobile                          |

## Validação — `app/_lib/validation/dashboard.ts`

```ts
export type RawSearchParams = Record<string, string | string[] | undefined>

export const dashboardSearchParamsSchema: z.ZodDiscriminatedUnion<...>
export type DashboardSearchParams = z.infer<typeof dashboardSearchParamsSchema>

export const parseDashboardParams: (raw: RawSearchParams) => PeriodSelection
export const serializeDashboardParams: (selection: PeriodSelection) => string
```

`dashboardSearchParamsSchema` é união discriminada por `periodo`:

- `hoje` | `semana` | `mes` → só `periodo`; `de`/`ate` presentes são descartados
- `personalizado` → `de` e `ate` obrigatórios, ambos `isDateKey`, e `ate >= de`
  (erro em `ate`: "A data final precisa ser igual ou posterior à inicial.")

**`parseDashboardParams` nunca lança.** Pega o primeiro valor de cada chave
repetida (`?periodo=hoje&periodo=mes` → `hoje`), roda `safeParse` e, se falhar
por qualquer motivo — `periodo` ausente ou desconhecido, personalizado sem data,
data inexistente, `ate < de` —, devolve `{ periodo: "mes" }`.

**`serializeDashboardParams`** é o inverso: `periodo=hoje` ou
`periodo=personalizado&de=2026-09-01&ate=2026-09-10`, sem `?`. É a única forma de
montar a URL do filtro — pílulas e calendário usam essa função.

O schema importa `isDateKey` de `@/app/_lib/date`; `dayjs` roda no navegador, então
o schema continua utilizável no cliente.

## URL do filtro

```
/dashboard                                         → mes (padrão)
/dashboard?periodo=hoje
/dashboard?periodo=semana
/dashboard?periodo=mes
/dashboard?periodo=personalizado&de=2026-09-01&ate=2026-09-10
```

## `df-data` — o que criar

### `app/_lib/data/dashboard.ts`

```ts
export async function getDashboardSummary(
  departmentId: number,
  range: DateRange,
): Promise<DashboardSummary>
```

Duas leituras (podem rodar em `Promise.all`):

1. **Contagem** — `count(*)` de `ticket` com
   `current_department_id = departmentId` e
   `created_at >= range.start and created_at < range.end`. Todos os status.
   Devolver `number` (`count(*)::int` ou `Number(...)`; o `pg` entrega `bigint`
   como string).
2. **Tag ofensora** — `ticket_tag ⋈ tag ⋈ ticket` com o mesmo filtro de ticket
   **e** `tag.department_id = departmentId`, `group by tag.id, tag.name`,
   `order by count(*) desc, lower(tag.name) asc, tag.id asc`, `limit 1`.
   Sem linha → `topTag: null`.

Detalhes que o contrato fixa:

- Tag inativa **conta** se estava aplicada: o dashboard mede o que aconteceu no
  período, não o catálogo atual.
- Agrupar por `tag.id`, não por nome: duas tags homônimas (uma inativa) são tags
  diferentes.
- Tag de outro setor aplicada a chamado encaminhado para cá **não** entra.
- Intervalo sempre meio-aberto: `gte` + `lt`, nunca `between` nem `lte`.
- Setor sem chamados: `{ ticketCount: 0, topTag: null }`, sem erro.

### `app/_lib/data/users.ts` — acrescentar

```ts
export async function getUserProfile(
  userId: number,
): Promise<UserProfile | null>
```

`users ⋈ department` por `users.department_id`, devolve `UserProfile`
(`departmentName = department.name`). Usuário inexistente → `null`.

### `app/_lib/data/users.ts` — remover `getUserById`

Remover `getUserById` de `app/_lib/data/users.ts`. O único consumidor era
`app/dashboard/page.tsx`, que foi removido. O `df-architect` conferiu com grep que
só resta a própria declaração. Remova junto os imports que ficarem sem uso (o tipo
`User`, se `getUserProfile` não o usar). Pelo KISS, função sem uso não fica.

### `db/seed.ts` — bloco demo

Roda **depois** do bloco atual e **independente** dele (o bloco atual retorna cedo
quando o admin já existe; o demo precisa rodar nesse caso também). Condições,
todas obrigatórias:

1. `process.env.SEED_DEMO === "true"` (qualquer outro valor: não roda, sem log de
   erro)
2. existe usuário com `SEED_ADMIN_EMAIL` (o setor alvo é o `department_id` dele)
3. o setor não tem nenhum `ticket` com `current_department_id` igual ao dele

Tudo numa transação. Datas **só** por `@/app/_lib/date` (`todayKey`,
`addDaysToKey`, `addMonthsToKey`, `zonedDateTime`, `resolvePeriodRange`,
`toDateKey`); o seed não importa `dayjs`.

**Tags (4)**, `department_id` do setor: `Acesso`, `Rede`, `Impressora`,
`Sistema`. Se já houver tag ativa com o mesmo nome (`lower(name)`) no setor,
reusa — o índice `tag_name_per_department_idx` rejeita duplicata.

**Chamados (~30)**, distribuídos em relação a `now = new Date()`:

| Faixa                        | Qtde | Como gerar                                                                                                    |
| ---------------------------- | ---- | ------------------------------------------------------------------------------------------------------------- |
| hoje                         | ~6   | `zonedDateTime(todayKey(), h, m)` com hora ≤ agora                                                            |
| ontem, 21h–23h59 de Brasília | ~4   | `zonedDateTime(addDaysToKey(todayKey(), -1), 21..23, m)` — em UTC já é "hoje"; é o teste do fuso              |
| esta semana, antes de ontem  | ~6   | dias entre `toDateKey(resolvePeriodRange({ periodo: "semana" }).start)` e anteontem; parte deles às 21h–23h59 |
| este mês, antes da semana    | ~7   | dias entre o dia 1 e o dia anterior à segunda-feira                                                           |
| mês anterior                 | ~7   | dias de `addMonthsToKey(primeiro do mês, -1)` até o último dia do mês anterior; incluir o último dia às 22h   |

- **Nenhum `created_at` no futuro.** Faixa vazia (hoje é segunda, dia 1 etc.)
  simplesmente não recebe chamados; redistribuir para outra faixa válida.
- Tag dominante diferente por faixa para as pílulas mudarem o card da tag: por
  exemplo `Acesso` domina hoje, `Rede` domina o mês, `Impressora` domina o mês
  anterior. Incluir pelo menos um empate e pelo menos um chamado sem tag.
- Ao final, logar o esperado de cada pílula calculado **em JS** sobre as datas
  geradas (`resolvePeriodRange` + contagem): chamados e tag ofensora de `hoje`,
  `semana` e `mes`. É o gabarito da verificação manual.

Colunas de cada `ticket` (NOT NULL sem default precisam de valor):

| Coluna                                          | Valor                                                                                                                                                                                  |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`                                         | 3–200 caracteres (check `ticket_title_length`), texto realista                                                                                                                         |
| `description`                                   | texto curto                                                                                                                                                                            |
| `type`                                          | variado entre os 6 valores de `ticket_type`                                                                                                                                            |
| `status`                                        | variado, **só** entre `aberto`, `em_analise`, `em_andamento`, `resolvido`, `fechado` e `cancelado`; `resolvido`/`fechado` preenchem `resolved_at`/`closed_at` ≥ `created_at` e ≤ agora |
| `priority`                                      | variado                                                                                                                                                                                |
| `created_by`                                    | id do admin                                                                                                                                                                            |
| `origin_department_id`, `current_department_id` | setor do admin                                                                                                                                                                         |
| `created_at`, `updated_at`                      | instante gerado; `updated_at` = maior entre `created_at`, `resolved_at`, `closed_at`                                                                                                   |

Cada ticket ganha linha em `ticket_history` com `event: "criacao"`,
`changed_by` = admin, `to_status` = status inicial, `changed_at = created_at`
(o ciclo de vida é documentado desde a criação). Tickets com status final ganham
também a linha `mudanca_status` correspondente, datada do `resolved_at`/`closed_at`.
`ticket_tag.created_at = ticket.created_at`.

**Status proibidos no seed demo: `encaminhado` e `aguardando_aprovacao`.** Os dois
só existem com uma linha em `ticket_transfer`, e o seed demo não cria
transferências. Um chamado nesses status sem a transferência correspondente fica
incoerente quando a tela de Aprovações existir. Os status permitidos são
`aberto`, `em_analise`, `em_andamento`, `resolvido`, `fechado` e `cancelado`.

## `df-actions` — o que criar

**Nada.** O fluxo não tem mutação nova. O logout do menu do usuário reusa
`signOut` de `app/_lib/actions/auth.ts`.

## `df-ui` — o que criar

### Estrutura

```
app/(app)/layout.tsx                    Server  — shell: sidebar, barra superior, cabeçalho mobile
app/(app)/dashboard/page.tsx            Server  — Início
app/(app)/_components/*                 componentes usados só pelo grupo (app)
app/dashboard/                          REMOVER inteiro (page.tsx e _components/)
```

`app/(app)/dashboard/page.tsx` e `app/dashboard/page.tsx` resolvem para o mesmo
`/dashboard` e o build falha com os dois; a remoção entra na mesma entrega que
cria o grupo. A URL `/dashboard` não muda (`proxy.ts` e o redirecionamento do
login continuam valendo).

`sign-out-button.tsx` sai de `app/dashboard/_components/` para
`app/(app)/_components/`. Tema continua em `app/_components/theme/`.

### `app/(app)/layout.tsx` (Server Component)

```ts
const actor = await requireSession()
const profile = await getUserProfile(actor.id)
if (!profile) notFound()
```

- Sidebar (`lg` para cima): logo, item único "Início" (`House`) ativo em
  `/dashboard`, card do usuário no rodapé com `getInitials(profile.name)`,
  `profile.name` e `describeMembership(profile.departmentName, profile.role)`.
- O card abre dropdown com **Tema** e **Sair**. É Client Component; recebe as
  strings já prontas por props (nunca `profile` inteiro com dados que não usa) e
  o "Sair" é `<form action={signOut}>`.
- O item ativo depende do pathname: se virar Client Component por
  `usePathname`, isole só o item.
- Barra superior no layout: busca (placeholder "Buscar por #, título ou tag") e
  "Novo chamado", ambos sem ação. Busca sem `onChange` e sem estado.
- Abaixo de `lg`: sidebar oculta; cabeçalho mobile com avatar,
  `Olá, ${getFirstName(profile.name)}` e `describeMembership(...)`.

### `app/(app)/dashboard/page.tsx` (Server Component)

```tsx
interface DashboardPageProps {
  searchParams: Promise<RawSearchParams>
}

const DashboardPage = async ({ searchParams }: DashboardPageProps) => {
  const actor = await requireSession()
  const selection = parseDashboardParams(await searchParams)
  const range = resolvePeriodRange(selection)
  const summary = await getDashboardSummary(actor.departmentId, range)
  ...
}
```

(`PageProps<"/dashboard">`, helper global do Next 16, também serve.)

A página chama `requireSession()` de novo: layout não re-renderiza em toda
navegação e não é guarda da página.

- Título "Início" e subtítulo `formatRangeLabel(range)`.
- Cards: **Chamados no período** → `summary.ticketCount`; **Principal tag
  ofensora** → `summary.topTag?.name` e `summary.topTag.count`, ou `—` quando
  `null`.

### Filtro de período

- Pílulas `Hoje`, `Semana`, `Mês`: **`Link`** para
  `` `/dashboard?${serializeDashboardParams({ periodo })}` ``, ativa quando
  `selection.periodo === periodo`. Server Component; rótulos de `PERIOD_LABELS`.
- `Personalizado`: **único Client Component** do filtro. Popover + Calendar do
  shadcn em modo `range`. Recebe `selection` por props; o valor inicial do
  calendário, quando `selection.periodo === "personalizado"`, vem de
  `dateKeyToCalendarDate(selection.de/ate)`. Ao confirmar, converte com
  `calendarDateToKey` e faz
  `router.push(`/dashboard?${serializeDashboardParams({ periodo: "personalizado", de, ate })}`)`.
  Um clique só (sem `to`) vale como `de = ate`.
- Nenhum import de `dayjs` nem de `date-fns` na UI. A única exceção é
  `import { ptBR } from "react-day-picker/locale"` neste componente, só para a
  prop `locale` do `Calendar` (ver "Datas").

## Variáveis de ambiente

Acrescentada em `.env.example` pelo `df-architect`:

| Variável    | Para quê                                                                                                       |
| ----------- | -------------------------------------------------------------------------------------------------------------- |
| `SEED_DEMO` | `true` faz o seed inserir tags e chamados de demonstração no setor do admin. Padrão `false`; nunca em produção |

## Checklist de encerramento da feature

- [ ] `getDashboardSummary` e `getUserProfile` criados; `getUserById` removida (`df-data`)
- [ ] seed demo com gabarito no log (`df-data`)
- [ ] `app/(app)/` criado e `app/dashboard/` removido (`df-ui`)
- [ ] nenhuma data formatada ou calculada fora de `@/app/_lib/date`
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm run build`
