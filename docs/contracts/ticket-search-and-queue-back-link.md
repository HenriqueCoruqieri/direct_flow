# Contrato — Busca de chamado no topo e voltar para a fila

Entrada das ondas 1 e 2. Plano fechado em `/consult` (decisões do usuário não
repetidas aqui). Este documento é a referência técnica: assinaturas, consulta,
textos e cenários. Ele **altera** dois contratos, que continuam valendo no que
não é tocado aqui e trazem uma revisão de 2026-10-08 apontando para cá:

- `docs/contracts/my-tickets.md` — busca da tabela sai; link de voltar do
  detalhe passa a depender da origem
- `docs/contracts/department-queue.md` — busca da tabela sai; linha e `#` da
  Fila abrem o detalhe com origem

Decisão de canal: `docs/adr/015-type-ahead-search-via-server-action.md`.

Versões observadas: `next@16.3.5`, `drizzle-orm@0.45.2`, `zod@4.6.5`,
`@tanstack/react-table@9.2.4`.

## Escopo técnico em uma frase

Sem schema e sem migration: uma Server Action de **leitura** (exceção do ADR 015) busca até 8 chamados visíveis por prefixo de número ou trecho de título
para um combobox na barra superior; as tabelas de Meus chamados e da Fila
perdem a busca própria; o detalhe aberto pela Fila carrega `?from=queue` com
aba, período e setor e mostra "Fila do setor" no link de voltar.

## Decisões do arquiteto (não fixadas no plano)

| Tema                           | Decisão                                                                                                                                                                                                                                                                                                          |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Modos exclusivos               | Número **ou** título, nunca os dois. Só dígitos (após `#` opcional) → só número; `404` não busca títulos com "404". Por isso o grupo "título" nunca convive com os grupos "número" na mesma resposta; a ordem "exato → prefixo → título" vale como regra única, mas cada consulta usa só a parte do seu modo     |
| Comparação de número em texto  | Número exato e prefixo comparam `ticket.id::text` com os dígitos **como digitados**. `0012` não acha o #12 (nenhum id começa com `0`): lista vazia. Evita a divergência entre "exato" (`id = 12`) e "prefixo" (`'0012%'`)                                                                                        |
| Máximo de dígitos              | 10 (`String(POSTGRES_INTEGER_MAX).length`). Mais que isso nenhum id casa: o parser devolve `null` (lista vazia sem ir ao banco)                                                                                                                                                                                  |
| Máximo de texto                | `TICKET_SEARCH_MAX_LENGTH = TICKET_TITLE_MAX_LENGTH` (200), medido depois do `trim`                                                                                                                                                                                                                              |
| `#` no modo título             | Só um `#` inicial é removido, e só para o teste de número. No modo título o texto vai inteiro (`#ab` busca `%#ab%`; `# 12` é título)                                                                                                                                                                             |
| Ordem dentro do grupo          | `id desc`. `id` é `serial`, segue a ordem de criação, é determinístico e usa a chave primária (`created_at` pode empatar)                                                                                                                                                                                        |
| Status                         | Todos os status entram (inclusive `fechado` e `cancelado`): a busca é por chamado conhecido                                                                                                                                                                                                                      |
| Resultado da action            | União `TicketSearchResponse` (`ok: true` com `results` / `ok: false` com `message`), como as demais actions do projeto: erro de banco não pode virar "Nenhum chamado encontrado". Os tipos ficam em `app/_lib/types/ticket-search.ts` (não no arquivo da action) para o `df-ui` tipar sem esperar o `df-actions` |
| Nome da action                 | `searchTickets` (sem sufixo `Action`), como `assumeTicket`, `sendTicket`                                                                                                                                                                                                                                         |
| Parser compartilhado           | `parseTicketSearchQuery` roda no cliente (decide se chama a action) e na action (decide se chama o banco). Mesma regra dos dois lados                                                                                                                                                                            |
| Onde mora a regra do voltar    | `app/_lib/validation/ticket-detail-origin.ts`, ao lado de `departmentQueueHref`: depende de `periodFilterHref` e `parseDepartmentQueueParams`, que são de validação, e o domínio nunca importa validação. Constantes (`from`, `queue`, origem padrão, link padrão) no domínio                                    |
| Setor da origem não autorizado | A origem guarda o `setor` da URL só validado em formato. O link de voltar pode levar `setor=5` forjado por quem não é diretoria; a página da Fila já descarta com `applicableQueueDepartmentId`. O detalhe não consulta setores para isso                                                                        |

## Tabelas, enums e migration

Nada novo. Leitura de `ticket` (`id`, `title`, `status`, `created_by`,
`assigned_to`, `current_department_id`). Sem índice novo: `id::text like` e
`ilike '%…%'` não usam índice; o volume do projeto não justifica `pg_trgm`
(reavaliar se a busca ficar lenta).

---

## Tipos

### `app/_lib/types/ticket-search.ts` (novo)

```ts
export interface TicketNumberSearchQuery {
  mode: "number"
  digits: string
}

export interface TicketTitleSearchQuery {
  mode: "title"
  text: string
}

export type TicketSearchQuery = TicketNumberSearchQuery | TicketTitleSearchQuery

export interface TicketSearchResult {
  id: number
  title: string
  status: TicketStatus
}

export interface TicketSearchSuccess {
  ok: true
  results: TicketSearchResult[]
}

export interface TicketSearchFailure {
  ok: false
  message: string
}

export type TicketSearchResponse = TicketSearchSuccess | TicketSearchFailure
```

### `app/_lib/types/ticket-detail-origin.ts` (novo)

```ts
export interface TicketDetailMyTicketsOrigin {
  source: "my_tickets"
}

export interface TicketDetailQueueOrigin {
  source: "queue"
  location: DepartmentQueueLocation
}

export type TicketDetailOrigin =
  TicketDetailMyTicketsOrigin | TicketDetailQueueOrigin

export interface TicketDetailBackLink {
  href: string
  label: string
}
```

Visualizador da busca: `TicketViewerFacts` (`app/_lib/types/ticket.ts`,
`userId`, `departmentId`, `isBoard`), o mesmo de `canViewTicket`.

## Domínio

### `app/_lib/domain/ticket-search.ts` (novo)

| Nome                            | Valor                                                                           |
| ------------------------------- | ------------------------------------------------------------------------------- |
| `TICKET_SEARCH_LIMIT`           | `8`                                                                             |
| `TICKET_SEARCH_DEBOUNCE_MS`     | `250`                                                                           |
| `TICKET_SEARCH_TEXT_MIN_LENGTH` | `2` (modo título; o modo número aceita 1 dígito)                                |
| `TICKET_SEARCH_MAX_LENGTH`      | `TICKET_TITLE_MAX_LENGTH` (200)                                                 |
| `TICKET_SEARCH_LABEL`           | `Buscar por n° ou título do chamado` (rótulo)                                   |
| `TICKET_SEARCH_PLACEHOLDER`     | igual ao rótulo                                                                 |
| `TICKET_SEARCH_RESULTS_LABEL`   | `Chamados encontrados` (rótulo acessível da lista)                              |
| `TICKET_SEARCH_LOADING_MESSAGE` | `Buscando…`                                                                     |
| `TICKET_SEARCH_EMPTY_MESSAGE`   | `Nenhum chamado encontrado`                                                     |
| `TICKET_SEARCH_FAILURE_MESSAGE` | `Não foi possível buscar agora. Tente novamente.`                               |
| `TICKET_SEARCH_FAILURE`         | `TicketSearchFailure` = `{ ok: false, message: TICKET_SEARCH_FAILURE_MESSAGE }` |

`TICKET_SEARCH_FAILURE` é a única definição do objeto de falha: a action o
devolve (sessão ausente, fatos da conta ausentes, erro de banco) e o cliente o
usa no `.catch` da chamada à action (falha de rede). Nenhum dos dois monta o
objeto à mão. `TICKET_SEARCH_RESULTS_LABEL` vai no `label` do `CommandList`.

### `app/_lib/domain/ticket-detail-origin.ts` (novo)

| Nome                       | Valor / semântica                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------------------ |
| `TICKET_DETAIL_FROM_PARAM` | `"from"` — chave da origem na URL do detalhe                                                     |
| `TICKET_DETAIL_FROM_QUEUE` | `"queue"` — único valor reconhecido; tipo literal amarrado a `TicketDetailQueueOrigin["source"]` |
| `MY_TICKETS_ORIGIN`        | `{ source: "my_tickets" }` — origem sem `from` ou com valor desconhecido                         |
| `MY_TICKETS_BACK_LINK`     | `{ href: MY_TICKETS_PATH, label: MY_TICKETS_LABEL }` (`/tickets`, `Meus chamados`)               |

### Regra de visibilidade — referência cruzada

A busca devolve **exatamente** os chamados que `canViewTicket`
(`app/_lib/domain/ticket.ts:148`) deixaria abrir:

```
viewer.isBoard
  or ticket.created_by = viewer.userId
  or ticket.assigned_to = viewer.userId
  or ticket.current_department_id = viewer.departmentId
```

A regra vive em dois lugares: a função pura e o `WHERE` de
`searchVisibleTickets`. **Qualquer mudança em `canViewTicket` (por exemplo, o
admin do setor de destino vendo chamado aguardando aprovação) exige mudar a
consulta no mesmo commit**, e o cenário B10 compara os dois.

## Validação

### `app/_lib/validation/ticket-search.ts` (novo)

```ts
export const ticketSearchQuerySchema // z.string().trim().max(200).transform(classify)
export type TicketSearchQueryInput = z.input<typeof ticketSearchQuerySchema> // string
export const parseTicketSearchQuery: (raw: unknown) => TicketSearchQuery | null
```

Classificação, depois do `trim`:

| Entrada (já sem espaços nas pontas)                  | Resultado                              |
| ---------------------------------------------------- | -------------------------------------- |
| não-string, ou mais de 200 caracteres                | `null`                                 |
| `#` opcional + só dígitos, de 1 a 10 dígitos         | `{ mode: "number", digits }` (sem `#`) |
| `#` opcional + só dígitos, mais de 10                | `null`                                 |
| qualquer outro texto com 2 ou mais caracteres        | `{ mode: "title", text }` (texto todo) |
| qualquer outro texto com menos de 2 (`""`, `a`, `#`) | `null`                                 |

Exemplos conferidos: `1` → número `1`; `#12` → número `12`; `0012` →
número `0012`; `ab` → título; `#a` → título `#a`; `# 12` → título; `50%_x` →
título `50%_x` (o escape é do SQL, abaixo); `12345678901` → `null`.

`null` nunca é erro para quem usa: o cliente não chama a action e a action
devolve lista vazia. As mensagens do schema (`Busca inválida.`) não são
exibidas.

### `app/_lib/validation/ticket-detail-origin.ts` (novo)

```ts
export const parseTicketDetailOrigin: (
  raw: RawSearchParams,
  today: DateKey,
) => TicketDetailOrigin
export const queueTicketDetailHref: (
  location: DepartmentQueueLocation,
  ticketId: number,
) => string
export const ticketDetailBackLinkFor: (
  origin: TicketDetailOrigin,
) => TicketDetailBackLink
```

| Nome                      | Semântica                                                                                                                                                                                                                                         |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `parseTicketDetailOrigin` | Primeiro valor de `from` (`firstSearchParam`) igual a `queue` → `{ source: "queue", location: parseDepartmentQueueParams(raw, today) }` (aba, período e setor com os mesmos padrões e `catch` da Fila). Qualquer outro caso → `MY_TICKETS_ORIGIN` |
| `queueTicketDetailHref`   | `periodFilterHref(ticketDetailPath(id), { from: "queue", ...departmentQueueKeepParams(tab, departmentId) }, period)`. Ex.: `/tickets/125?from=queue&tab=closed&setor=7&periodo=semana`                                                            |
| `ticketDetailBackLinkFor` | `queue` → `{ href: departmentQueueHref(location), label: DEPARTMENT_QUEUE_LABEL }`; `my_tickets` → `MY_TICKETS_BACK_LINK`                                                                                                                         |

O `href` de voltar é sempre **remontado** a partir de valores validados
(`/queue` + chaves conhecidas): nada da URL é repassado como destino, então
não há open redirect. Valores inválidos caem nos padrões da Fila (`tab=open`,
`periodo=todos`, sem setor).

---

## `df-data`

### `app/_lib/data/ticket-search.ts` (novo) — `searchVisibleTickets`

```ts
export async function searchVisibleTickets(
  viewer: TicketViewerFacts,
  query: TicketSearchQuery,
  limit: number,
): Promise<TicketSearchResult[]>
```

SQL esperado (forma; a escrita em Drizzle é do `df-data`):

```sql
select t.id, t.title, t.status
from ticket t
where <visibilidade>
  and <termo>
order by <ordem>
limit $limit
```

- **Visibilidade**: com `viewer.isBoard`, nenhuma condição. Senão
  `(t.created_by = $userId or t.assigned_to = $userId or t.current_department_id = $departmentId)`.
  É a tradução de `canViewTicket` (referência cruzada acima).
- **Termo, modo número**: `t.id::text like $digits || '%'`, com o padrão
  `digits + "%"` passado como parâmetro do template `sql` do Drizzle (o mesmo
  `${ticket.id}::text` serve à ordem). `digits` só tem dígitos: nenhum escape
  necessário.
- **Termo, modo título**: `t.title ilike '%' || $escaped || '%'`, com
  `escaped = text.replace(/[\\%_]/g, "\\$&")`. A barra invertida é o escape
  padrão do `LIKE` no Postgres; ela própria também é escapada. Sem `ESCAPE`
  explícito.
- **Ordem, modo número**: `(t.id::text = $digits) desc, t.id desc` — o número
  exato primeiro, depois os prefixos do mais recente para o mais antigo.
- **Ordem, modo título**: `t.id desc`.
- `limit` vem do chamador (`TICKET_SEARCH_LIMIT`); a função não o fixa.
- Sem `join`: o item mostra só número, título e status. Valores sempre por
  parâmetro, nunca concatenados no SQL.

## `df-actions`

### `app/_lib/actions/ticket-search.ts` (novo) — `searchTickets`

```ts
"use server"

export const searchTickets = async (
  input: string,
): Promise<TicketSearchResponse>
```

Fluxo:

1. `getSession()`; nulo → `TICKET_SEARCH_FAILURE`.
2. `parseTicketSearchQuery(input)`; `null` → `{ ok: true, results: [] }` (sem
   ir ao banco).
3. `getAccountFacts()`; nulo → mesma falha do passo 1.
4. `viewer: TicketViewerFacts = { userId: actor.id, departmentId: facts.departmentId, isBoard: facts.isBoard }`.
5. `searchVisibleTickets(viewer, query, TICKET_SEARCH_LIMIT)` em `try`; erro →
   `console.error("[searchTickets]", error)` e falha.
6. `{ ok: true, results }`.

Sem `revalidatePath`, sem `redirect`, sem gravar cookie (ADR 015). Não checa
`isActive` nem `mustChangePassword`: o detalhe também não checa ao exibir, e a
busca não revela nada que o detalhe não mostre.

## `df-ui`

### Busca no topo — `app/(app)/_components/ticket-search.tsx` (novo, `"use client"`)

Sem props. Combobox com `Popover` + `Command` de `app/_components/ui/`
(`Command` com `shouldFilter={false}`: quem filtra é o servidor).

- **Campo**: `CommandInput` (ou o `Input` atual como âncora do `Popover`, a
  critério do `df-ui`) com o visual do campo de hoje (ícone de busca à
  esquerda, mesmas classes). Rótulo `sr-only` `TICKET_SEARCH_LABEL`,
  placeholder `TICKET_SEARCH_PLACEHOLDER`. O `role="search"` continua no
  contêiner.
- **Quando busca**: a cada mudança do texto, `parseTicketSearchQuery(text)`.
  `null` → nenhuma chamada, lista fechada (ou vazia, sem mensagem). Senão,
  agenda a chamada para `TICKET_SEARCH_DEBOUNCE_MS` depois; nova digitação
  cancela o agendamento.
- **Resposta atrasada**: cada chamada guarda o texto (ou um contador) que a
  originou; ao chegar, só é aplicada se ainda for o texto atual. As demais são
  descartadas. A action é despachada uma por vez pelo Next (ADR 015); o
  descarte é o que evita mostrar resultado de um texto antigo.
- **Estados da lista** (aberta enquanto o campo tem foco e o texto é válido):
  - carregando (sem resposta para o texto atual): `TICKET_SEARCH_LOADING_MESSAGE`;
  - `ok` com itens: até 8 `CommandItem`, na ordem recebida;
  - `ok` sem itens: `CommandEmpty` com `TICKET_SEARCH_EMPTY_MESSAGE`;
  - `ok: false`: `message` no lugar da lista (sem toast). Se a chamada à
    action rejeitar (rede), o cliente trata como `TICKET_SEARCH_FAILURE`.
- **Rótulo da lista**: `TICKET_SEARCH_RESULTS_LABEL` no `CommandList`.
- **Item**: `formatTicketNumber(id)` · `title` (truncado) ·
  `<TicketStatusBadge status={status} />`. `value` do `CommandItem` único por
  chamado (ex.: `String(id)`); `onSelect` navega.
- **Enter / seleção**: o `cmdk` destaca o primeiro item, então Enter abre o
  primeiro. Navegação com `router.push(ticketDetailPath(id))`, **sem origem**
  (o detalhe mostra "Meus chamados"). Ao navegar: fecha a lista e limpa o
  campo. Sem itens (lista vazia, carregando ou falha), Enter não navega.
- **Escape** fecha a lista; clique fora também.
- Não importa `app/_lib/data`, `app/_lib/auth`, `@/db/*` nem `drizzle-orm`:
  chama só `searchTickets` de `@/app/_lib/actions/ticket-search`. Conferir no
  `node_modules/next/dist/docs/` a forma de chamar Server Function em handler
  de evento no Next 16.

### `AppTopBarFrame` (`app/(app)/_components/app-top-bar-frame.tsx`)

Troca o `label` + `Input` sem comportamento por `<TicketSearch />`, mantendo o
contêiner `role="search"` e a largura (`max-w-105 flex-1`). Vale também para
`app/(app)/dashboard/error.tsx`, que usa o mesmo frame. O texto antigo
`Buscar por #, título ou tag` sai.

### Tabelas sem busca

- `app/(app)/tickets/_components/my-tickets-table.tsx` e
  `app/(app)/queue/_components/department-queue-table.tsx` deixam de passar
  `search` ao `DataTable`.
- `TICKET_LIST_SEARCH` sai de `app/(app)/_components/ticket-list-filters.ts`.
- Em `createTicketListColumns`, a coluna `search` (accessor
  `` `#id título` ``, `filterFn: "includesString"`) virou `title` (accessor
  `row.title`, sem `filterFn`, mesma célula truncada e cabeçalho `Título`).
- Filtros (Status, Tipo, Tag, Destinatário) e período não mudam. Cadastros não
  mudam (o `DataTable` continua aceitando `search`).

### Link do detalhe a partir da Fila

- `createTicketListColumns` passa a receber a função do link do `#`:

  ```ts
  const createTicketListColumns = <TRow extends TicketListRow>(
    detailHref: (ticketId: number) => string,
  ) => { ... }
  ```

  Meus chamados passa `ticketDetailPath` (colunas continuam em escopo de
  módulo). A Fila passa `(id) => queueTicketDetailHref(location, id)`.

- `DepartmentQueueTable` ganha a prop `location: DepartmentQueueLocation` (a
  **aplicada** pela página, depois de `applicableQueueDepartmentId`). Colunas
  e `rowHref` saem de `useMemo` sobre `location`:
  `rowHref={(row) => queueTicketDetailHref(location, row.id)}`.
- `ticketRowHref` continua para Meus chamados.
- O `#` continua `Link`: abrir em nova aba leva a origem junto.

### Detalhe — `app/(app)/tickets/[id]/page.tsx`

- Passa a receber `searchParams` (`PageProps<"/tickets/[id]">`).
- `const backLink = ticketDetailBackLinkFor(parseTicketDetailOrigin(await searchParams, todayKey(now)))`
  (`todayKey` de `@/app/_lib/date`, com o mesmo `now` da página).
- O `Link` da linha 95 usa `backLink.href` e `backLink.label` no lugar de
  `MY_TICKETS_PATH`/`MY_TICKETS_LABEL`.
- `generateMetadata` não muda (não lê `searchParams`).
- As actions do detalhe só fazem `revalidatePath`, sem `redirect`: a URL com
  `?from=…` sobrevive a editar, comentar, resolver e enviar.

---

## Cenários do `df-qa`

Usuários de `docs/contracts/qa-seed.md`: `M` = QA Membro Suporte, `A` = QA
Admin Suporte, `D` = Diretor, `I` = QA Admin Infra (se ativo). `S` = id de QA
Suporte. Preparação, como M: criar `[QA] Busca alfa` (padrão) → `#B1`; como I
(ou, se inativo, pular os cenários com I): criar em QA Infra `[QA] Busca infra
alfa` → `#B2`. Anotar `max(id)` de `ticket` e todos os ids que começam com o
mesmo dígito de `#B1`. Nenhum cenário grava, exceto a preparação e os do bloco
"voltar" que editam/comentam/resolvem.

| #   | Quem     | Ação                                                                                                                            | Esperado                                                                                                                                                                                                                                                                     |
| --- | -------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | M        | qualquer tela do app; inspecionar o campo do topo                                                                               | rótulo acessível e placeholder `Buscar por n° ou título do chamado`; nada de `Buscar por #, título ou tag`                                                                                                                                                                   |
| B2  | M        | digitar `a`; esperar 1 s                                                                                                        | nenhum request de action; nenhuma lista com mensagem                                                                                                                                                                                                                         |
| B3  | M        | digitar `#` + id de `#B1`                                                                                                       | `Buscando…` e, depois, `#B1` como **primeiro** item com título e badge de status; demais itens são ids que começam com esses dígitos, em ordem decrescente                                                                                                                   |
| B4  | M        | digitar só o primeiro dígito de `#B1`                                                                                           | até 8 itens, todos com id começando por esse dígito; se o próprio dígito for um id visível, ele vem primeiro; resto em id decrescente; comparar com `select id from ticket where id::text like 'd%' and <visibilidade de M> order by (id::text = 'd') desc, id desc limit 8` |
| B5  | M        | digitar `busca ALFA`                                                                                                            | `#B1` listado (sem diferenciar maiúsculas); `#B2` **não** listado (outro setor, M não é autor nem destinatário)                                                                                                                                                              |
| B6  | M        | digitar `zzqq-sem-resultado`; Enter                                                                                             | `Nenhum chamado encontrado`; Enter não navega (URL inalterada)                                                                                                                                                                                                               |
| B7  | M        | digitar `#B1` (id); com a lista mostrando o resultado, Enter                                                                    | navega para `/tickets/<B1>` **sem** query string; link de voltar `Meus chamados` → `/tickets`; campo limpo e lista fechada                                                                                                                                                   |
| B8  | M        | digitar `%` + `_` (`%_`); depois `100%`                                                                                         | os dois: só chamados cujo título contém literalmente `%_` / `100%` (provavelmente nenhum → `Nenhum chamado encontrado`); nunca a lista de "todos"                                                                                                                            |
| B9  | M        | digitar rápido `bu`, `bus`, `busc`, `busca` (menos de 250 ms entre teclas)                                                      | um request só (para `busca`), ou, se mais de um, a lista final corresponde a `busca`                                                                                                                                                                                         |
| B10 | A, I, D  | cada um digita `[QA] Busca`                                                                                                     | A: `#B1` sim (setor atual), `#B2` não. I: `#B2` sim (setor atual e autor), `#B1` não. D: os dois (diretoria). Para cada item listado, abrir o detalhe: nenhum 404 (a busca e `canViewTicket` concordam)                                                                      |
| B11 | D e M    | (autor de outro setor; opcional) D move M para QA Infra em Cadastros → Pessoas; M digita `[QA] Busca`; D devolve M a QA Suporte | enquanto movido, M acha `#B1` (autor) e o abre sem 404, e não acha chamados de QA Suporte dos quais não é autor nem destinatário. Se não puder coordenar, registrar como não executado. Ao final, M ativo em QA Suporte                                                      |
| B12 | M        | `/tickets?tab=opened&periodo=todos` e `/queue`                                                                                  | nenhuma das duas tabelas tem campo de busca; filtros e período continuam                                                                                                                                                                                                     |
| B13 | M        | forjar `searchTickets` com payload `123` (número), `"x".repeat(201)` e `""`                                                     | as três: `{ ok: true, results: [] }`; nenhum erro no dev server                                                                                                                                                                                                              |
| B14 | D        | `/queue`; escolher QA Suporte; aba Fechados; período Semana; clicar no meio de uma linha                                        | URL `/tickets/<id>?from=queue&tab=closed&setor=S&periodo=semana`; link de voltar `Fila do setor`; clicar → `/queue?tab=closed&setor=S&periodo=semana`, com Fechados, Semana e QA Suporte selecionados                                                                        |
| B15 | D        | mesmo estado do B14; abrir o `#` de uma linha em nova aba                                                                       | a nova aba tem a mesma URL com origem e o mesmo link de voltar                                                                                                                                                                                                               |
| B16 | M        | `/queue?tab=open&periodo=personalizado&de=<7 dias atrás>&ate=<hoje>`; abrir uma linha                                           | URL do detalhe com `from=queue&tab=open&periodo=personalizado&de=…&ate=…`; voltar restaura o mesmo intervalo                                                                                                                                                                 |
| B17 | M        | abrir `#B1` pela Fila; "Editar" → mudar o título → salvar; publicar um comentário; resolver                                     | depois de cada ação a URL mantém `?from=queue&…` e o link continua `Fila do setor` com o mesmo destino                                                                                                                                                                       |
| B18 | M        | abrir um chamado por `/tickets` (linha e `#`)                                                                                   | URL `/tickets/<id>` sem query; link `Meus chamados` → `/tickets`                                                                                                                                                                                                             |
| B19 | M        | abrir à mão `/tickets/<B1>?from=evil`, `?from=https://exemplo.com`, `?from=queue&tab=x&setor=abc&periodo=lixo`                  | os dois primeiros: `Meus chamados` → `/tickets`. O terceiro: `Fila do setor` → `/queue?tab=open&periodo=todos`                                                                                                                                                               |
| B20 | M        | abrir à mão `/tickets/<B1>?from=queue&setor=<id de QA Infra>`; clicar em voltar                                                 | link `/queue?tab=open&setor=<id>&periodo=todos`; a Fila mostra QA Suporte (o setor forjado é ignorado pela página, membro não é diretoria)                                                                                                                                   |
| B21 | M        | 390×844: digitar na busca                                                                                                       | lista cabe na largura; itens legíveis, título truncado                                                                                                                                                                                                                       |
| B22 | qualquer | toda a bateria                                                                                                                  | nenhum erro nem aviso de hidratação no dev server (`next-devtools`); nenhuma linha nova em `ticket`, `ticket_history` ou `message` fora da preparação e do B17                                                                                                               |

"Request de action" = `POST` com cabeçalho `Next-Action`. Títulos criados
começam com `[QA]`; escrita só em QA Suporte e QA Infra. **Não alterar #65 a
#68.**

## Riscos

1. **Regra de visibilidade duplicada** em `canViewTicket` e no SQL (ADR 015).
   Mitigação: referência cruzada aqui e cenário B10.
2. **`404` não acha título com "404".** Consequência dos modos exclusivos
   aprovados. Se o usuário reclamar, a extensão natural é: só dígitos **sem**
   `#` busca número e título; com `#`, só número.
3. **Varredura sequencial** em `ticket` a cada busca (`id::text like`,
   `ilike '%…%'`). Aceito no volume atual; `pg_trgm` fica para quando houver
   lentidão medida.
4. **Fila de actions do cliente.** Uma mutação disparada enquanto a busca está
   em curso espera a busca terminar (ADR 015).
5. **Renovação de sessão** dentro de `searchTickets` pode rerrenderizar a
   página atual (ADR 015). Não muda o resultado.

## Checklist de encerramento

- [x] Tipos, domínio, `parseTicketSearchQuery`, `parseTicketDetailOrigin`, `queueTicketDetailHref`, `ticketDetailBackLinkFor`, ADR 015 (`df-architect`)
- [ ] `searchVisibleTickets` (`df-data`)
- [ ] `searchTickets` (`df-actions`)
- [ ] `TicketSearch`, `AppTopBarFrame`, tabelas sem busca, `createTicketListColumns(detailHref)`, `location` na Fila, link de voltar no detalhe (`df-ui`)
- [ ] Linha da seção 2 do `stack.md` apontando para o ADR 015 (orquestrador, com aprovação do usuário)
- [ ] Cenários do `df-qa`
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm run build`; `df-reviewer` sem bloqueante
