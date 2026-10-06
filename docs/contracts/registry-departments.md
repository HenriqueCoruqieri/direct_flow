# Contrato — Cadastros → Setores

Entrada das ondas 1 e 2. Plano em `docs/plans/registry-departments.md`, que manda
nas decisões. Poder global da Diretoria em
`docs/adr/011-board-department-with-global-power.md`.

Versões observadas: `next@16.3.5`, `better-auth@1.7.5`, `drizzle-orm@0.45.2`,
`zod@4.6.5`.

> **Atualizado pela feature Tags** (`docs/contracts/registry-tags.md`):
> `listDepartments` ordena com a Diretoria primeiro; a guarda de diretor saiu do
> layout de `/registry` e foi para `app/(app)/registry/departments/page.tsx`
> (o layout agora aceita diretor **ou** admin de setor); o menu passou a ser
> montado por `registryNavItemsFor`; `director.ts` deriva de
> `getRegistryAccess`; os limites de nome viraram `REGISTRY_NAME_*` e os schemas
> usam as fábricas de `app/_lib/validation/registry.ts`. As seções abaixo já
> refletem isso.

> **Atualizado pela feature Pessoas** (`docs/contracts/registry-people.md`):
> novo carimbo `department.is_unassigned` (setor **Não alocado**: único, sempre
> ativo, nunca Diretoria; criado pela migration `0006`). A regra de desativação
> não muda para os demais setores; o Não alocado nunca desativa
> (`checkDepartmentDeactivation` → `IS_UNASSIGNED`, precedência `IS_BOARD` →
> `IS_UNASSIGNED` → `HAS_ACTIVE_USERS` → `HAS_OPEN_TICKETS`; `DepartmentErrorCode`
> ganha `"IS_UNASSIGNED"`). Renomear é permitido. `DepartmentListItem`,
> `DepartmentDependencies` e `DepartmentOption` ganham `isUnassigned`;
> `listDepartments` e `listDepartmentOptions` ordenam `is_board desc`,
> `is_unassigned asc`, `lower(name)`, `id`. A UI identifica os dois setores
> especiais por `departmentBadgeFor` e esconde "Desativar" nos dois. Quem está na
> Diretoria passa a ser sempre admin (ADR 011, nota de Pessoas).

## Revisão de 2026-10-05 — bloqueio que cita só o que bloqueia e atalho para Pessoas

Plano: `docs/plans/pending-improvements.md`, Entrega A. Os filtros pela URL do
lado de Pessoas estão em `docs/contracts/registry-people.md` (revisão da mesma
data). Sem schema, sem migration, sem mudança em `df-data`, `df-actions` ou
`df-auth`.

**O bug.** `describeDepartmentDeactivationBlock` terminava sempre com "Mova as
pessoas para outro setor e conclua ou encaminhe os chamados antes.", mesmo num
bloqueio só por chamados. A função passa a citar **só** o que bloqueia, com
singular e plural. A tabela "Mensagens produzidas" (seção Domínio) já está
atualizada; a mensagem da action `setDepartmentActive` muda sozinha, porque é a
mesma função.

### Domínio — `app/_lib/domain/department.ts` (acrescido)

```ts
export const isDepartmentDeactivationLocked: (
  check: DepartmentDeactivationCheck,
) => boolean

export const deactivationBlockPeopleHref: (
  departmentId: number,
  block: DepartmentDeactivationBlocked,
) => string | null
```

`isDepartmentDeactivationLocked` é **a** resposta para "o botão Desativar
aparece?": `true` quando o `check` de `checkDepartmentDeactivation` é bloqueio
permanente (`IS_BOARD` ou `IS_UNASSIGNED`), e aí a UI oculta o botão; `false`
para `{ ok: true }` e para bloqueio por dependência (`HAS_ACTIVE_USERS`,
`HAS_OPEN_TICKETS`), que mostram o dialog. Recebe o `check` inteiro, então a UI
passa o resultado direto, sem testar `ok` nem `reason`. O mesmo predicado é
usado por `deactivationBlockPeopleHref`.

| Caso                                          | Retorno                                       |
| --------------------------------------------- | --------------------------------------------- |
| `IS_BOARD` ou `IS_UNASSIGNED`                 | `null` (o dialog nem aparece para esses dois) |
| `activeUsers > 0`                             | `/registry/people?setor=<id>&status=ativo`    |
| `activeUsers === 0` (bloqueio só por chamado) | `null`                                        |

É **a** resposta para "o dialog mostra Ver pessoas?": não nulo → mostra, com
este `href`. A UI não testa `activeUsers` nem monta URL. O `href` vem de
`activeDepartmentPeopleHref` (`app/_lib/domain/people-filters.ts`, ver
`registry-people.md`), a única forma de montar o link filtrado de Pessoas.

### `df-ui` — o que muda

**`app/(app)/registry/_components/deactivate-registry-dialog.tsx`**

- Prop nova, opcional: `blockedLink?: DeactivateRegistryDialogLink | null`, com
  `interface DeactivateRegistryDialogLink { label: string; href: string }`
  (nome sugerido; é uma `interface` nomeada por causa do `| null`).
- Só é usada quando o dialog está no estado bloqueado (`blockedReason` não
  nulo). Com o link, o rodapé fica: **"Entendi"** (`AlertDialogCancel`, como
  hoje) e, à direita, **o link** como botão primário (`Button asChild` com
  `Link` do `next/link`), texto `blockedLink.label`.
- Sem a prop (ou `null`), o dialog é idêntico ao de hoje. Tags e Pessoas não
  passam a prop e não mudam.
- O título continua "Não é possível desativar"; a descrição continua sendo
  `blockedReason`.

**`app/(app)/registry/departments/_components/department-row-actions.tsx`**

```tsx
const isLocked = isDepartmentDeactivationLocked(check)
const peopleHref = check.ok ? null : deactivationBlockPeopleHref(department.id, check)
...
blockedLink={peopleHref === null ? null : { label: "Ver pessoas", href: peopleHref }}
```

- Texto exato do botão: **`Ver pessoas`**.
- O clique navega na mesma aba; a troca de rota desmonta a tabela de Setores e
  o dialog junto. Nenhum estado precisa ser limpo à mão.

### Mensagens (as quatro variações de bloqueio por dependência)

| Caso              | Texto exato                                                                                                                                                     |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 pessoa          | `Não é possível desativar este setor: ele tem 1 pessoa ativa. Mova a pessoa para outro setor antes.`                                                            |
| 3 pessoas         | `Não é possível desativar este setor: ele tem 3 pessoas ativas. Mova as pessoas para outro setor antes.`                                                        |
| 1 chamado         | `Não é possível desativar este setor: ele tem 1 chamado em aberto. Conclua ou encaminhe o chamado antes.`                                                       |
| 2 chamados        | `Não é possível desativar este setor: ele tem 2 chamados em aberto. Conclua ou encaminhe os chamados antes.`                                                    |
| 3 pessoas e 1 ch. | `Não é possível desativar este setor: ele tem 3 pessoas ativas e 1 chamado em aberto. Mova as pessoas para outro setor e conclua ou encaminhe o chamado antes.` |
| 1 pessoa e 2 ch.  | `Não é possível desativar este setor: ele tem 1 pessoa ativa e 2 chamados em aberto. Mova a pessoa para outro setor e conclua ou encaminhe os chamados antes.`  |

### Cenários para o `df-qa` (bloqueio e atalho)

Regras de dados de `docs/contracts/qa-seed.md`: tudo o que for criado começa
com `[QA]`. O setor de teste é `[QA] Bloqueio` (se já existir de uma rodada
anterior, reativá-lo e reaproveitá-lo; se o nome estiver ocupado, usar
`[QA] Bloqueio 2`; o mesmo vale para a tag `[QA] Bloqueio tag`). Contagens conferidas no banco (MCP `postgres`, só leitura):
`select count(*) from users where department_id = $1 and is_active` e
`select count(*) from ticket where current_department_id = $1 and status in
('aberto','em_analise','encaminhado','aguardando_aprovacao','em_andamento')`.

| #   | Quem              | Ação                                                                                                                                                                  | Esperado                                                                                                                                                                                                                                                  |
| --- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Diretor           | Setores → criar `[QA] Bloqueio`; Desativar                                                                                                                            | dialog de confirmação normal ("Desativar [QA] Bloqueio?"); **Cancelar**. Colunas Pessoas ativas 0 e Chamados em aberto 0                                                                                                                                  |
| A2  | Diretor           | Pessoas → editar QA Membro Suporte → setor `[QA] Bloqueio`; voltar a Setores → Desativar em `[QA] Bloqueio`                                                           | **só pessoas**: "Não é possível desativar"; texto `… ele tem 1 pessoa ativa. Mova a pessoa para outro setor antes.`; nenhuma menção a chamados; botões "Entendi" e "Ver pessoas"                                                                          |
| A3  | Diretor           | no dialog de A2, clicar "Ver pessoas"                                                                                                                                 | URL `/registry/people?setor=<id de [QA] Bloqueio>&status=ativo`; botão "Filtros" com contagem 2; no popover, Setor `[QA] Bloqueio` e Status Ativo marcados; lista = só QA Membro Suporte; o número de linhas é igual à coluna Pessoas ativas e à consulta |
| A4  | Diretor           | em A3, desmarcar Setor no popover; depois "Limpar filtros"; depois recarregar a página                                                                                | desmarcar Setor: lista com todas as pessoas ativas; "Limpar filtros": todas as pessoas, contagem do botão zerada; a URL não muda; recarregar reaplica Setor + Ativo (risco 3 do plano)                                                                    |
| A4a | Diretor           | Tags → criar `[QA] Bloqueio tag` no setor `[QA] Bloqueio`                                                                                                             | tag criada e ativa no setor. Pré-requisito do A5: sem tag ativa no setor, "Novo chamado" fica desabilitado (`DEPARTMENT_WITHOUT_TAGS`)                                                                                                                    |
| A5  | QA Membro Suporte | entrar e abrir um chamado `[QA] Bloqueio de setor` (nasce em `[QA] Bloqueio`) com a tag `[QA] Bloqueio tag`                                                           | criado; no banco, `current_department_id` = id de `[QA] Bloqueio`                                                                                                                                                                                         |
| A6  | Diretor           | Setores → Desativar em `[QA] Bloqueio`                                                                                                                                | **ambos**: `… ele tem 1 pessoa ativa e 1 chamado em aberto. Mova a pessoa para outro setor e conclua ou encaminhe o chamado antes.`; "Ver pessoas" presente                                                                                               |
| A7  | Diretor           | Pessoas → mover QA Membro Suporte de volta para QA Suporte; Setores → Desativar em `[QA] Bloqueio`                                                                    | **só chamados**: `… ele tem 1 chamado em aberto. Conclua ou encaminhe o chamado antes.`; **sem** "Mova a pessoa/as pessoas"; **sem** botão "Ver pessoas"; só "Entendi"                                                                                    |
| A8  | Diretor           | abrir `[QA] Bloqueio de setor` e resolvê-lo (diretor resolve qualquer chamado); Tags → Desativar `[QA] Bloqueio tag`; Setores → Desativar `[QA] Bloqueio` → confirmar | dialog de confirmação normal; toast "Setor desativado."; a tag e o setor ficam inativos (estado final da rodada)                                                                                                                                          |
| A9  | Diretor           | Desativar em Diretoria e em Não alocado                                                                                                                               | o botão continua oculto nos dois (nada muda)                                                                                                                                                                                                              |
| A10 | Diretor           | Tags e Pessoas: abrir o dialog de desativar de qualquer linha                                                                                                         | idênticos aos de hoje, sem botão de link                                                                                                                                                                                                                  |
| A11 | qualquer          | navegar por A1–A10                                                                                                                                                    | nenhum erro nem aviso de hidratação no dev server (MCP `next-devtools`)                                                                                                                                                                                   |

Os cenários de URL inválida e do admin de setor estão em
`docs/contracts/registry-people.md`, revisão de 2026-10-05.

## Decisões fixadas pelo usuário (resumo do plano)

| Tema           | Decisão                                                                                                                                                    |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quem é diretor | Quem está **ativo** num setor com `is_board = true`. O poder vem do setor, não da pessoa. Não existe role novo. Só pode existir uma Diretoria              |
| Onde se checa  | Consulta ao banco a cada checagem. **Não** vai para cookie nem sessão: mover alguém de setor revoga o poder na próxima requisição. `Actor` não muda        |
| Seed           | Cria sempre o setor `Diretoria` com `is_board = true` e o admin do seed nele. `SEED_DEPARTMENT_NAME` deixa de existir                                      |
| Navegação      | Item "Cadastros" recolhível na sidebar; o subitem Setores só para diretor (itens por acesso em `docs/contracts/registry-tags.md`); aberto em `/registry/*` |
| Rota           | `/registry/departments`, só diretor (guarda na página). Não-diretor recebe **404**, para a página não se revelar                                           |
| Escopo         | Listar, criar, renomear, ativar/desativar. **Sem exclusão**                                                                                                |
| Desativar      | Só sem pessoas ativas e sem chamados em aberto no setor. A Diretoria nunca. Renomear a Diretoria é permitido                                               |
| Nome           | `trim`, 2 a 80 caracteres, único sem diferenciar maiúsculas (inclusive contra inativos)                                                                    |
| E-mail         | Nenhum                                                                                                                                                     |

## Tabelas, enums e migration

### `department` (`db/schema.ts`, alterado)

| Coluna / restrição            | Definição                                                            |
| ----------------------------- | -------------------------------------------------------------------- |
| `is_board`                    | `boolean not null default false` — o carimbo da Diretoria            |
| `department_single_board_idx` | `unique index on (is_board) where is_board` — no máximo uma          |
| `department_board_active`     | `check (not is_board or is_active)` — a Diretoria nunca fica inativa |
| `department_name_lower_idx`   | já existia: `unique index on lower(name)`, vale para inativos        |

A regra "Diretoria não desativa" existe em dois níveis de propósito: o domínio
(`checkDepartmentDeactivation`) dá a mensagem certa ao usuário; o `check` no
banco garante que nenhum caminho fora da action (seed, SQL manual) quebre a
regra. Não é duplicação de regra de negócio, é a mesma regra com a trava física.

Tipo Drizzle: `Department` (`$inferSelect`) ganha `isBoard: boolean`.

### Migration `db/migrations/0003_department_board.sql`

```sql
ALTER TABLE "department" ADD COLUMN "is_board" boolean DEFAULT false NOT NULL;
CREATE UNIQUE INDEX "department_single_board_idx" ON "department" USING btree ("is_board") WHERE is_board;
ALTER TABLE "department" ADD CONSTRAINT "department_board_active" CHECK (not is_board or is_active);
```

Aditiva. Nenhum setor existente é marcado. Quem aplica (`npm run db:migrate`) é o
usuário. Ver "Riscos" sobre o banco local.

### Lidas pelo fluxo

- `users` — `department_id`, `is_active` (contagem de pessoas ativas; checagem de diretor)
- `ticket` — `current_department_id`, `status` (contagem de chamados em aberto)

## Tipos — `app/_lib/types/`

### `app/_lib/types/department.ts` (novo)

```ts
export interface DepartmentListItem {
  id: number
  name: string
  isActive: boolean
  isBoard: boolean
  activeUsers: number
  openTickets: number
  createdAt: Date
}

export interface DepartmentDependencies {
  isBoard: boolean
  activeUsers: number
  openTickets: number
}

export type DepartmentDeactivationBlockReason =
  "IS_BOARD" | "HAS_ACTIVE_USERS" | "HAS_OPEN_TICKETS"

export interface DepartmentDeactivationAllowed {
  ok: true
}

export interface DepartmentDeactivationBlocked {
  ok: false
  reason: DepartmentDeactivationBlockReason
  activeUsers: number
  openTickets: number
}

export type DepartmentDeactivationCheck =
  DepartmentDeactivationAllowed | DepartmentDeactivationBlocked

export interface DepartmentSaved {
  status: "saved"
  id: number
}

export interface DepartmentNameTaken {
  status: "name_taken"
}

export interface DepartmentNotFound {
  status: "not_found"
}

export interface DepartmentDeactivationRefused {
  status: "blocked"
  block: DepartmentDeactivationBlocked
}

export type InsertDepartmentOutcome = DepartmentSaved | DepartmentNameTaken

export type UpdateDepartmentNameOutcome =
  DepartmentSaved | DepartmentNameTaken | DepartmentNotFound

export type UpdateDepartmentActiveOutcome =
  DepartmentSaved | DepartmentNotFound | DepartmentDeactivationRefused
```

- `activeUsers` — `count(users)` com `department_id = id` e `is_active`.
- `openTickets` — `count(ticket)` com `current_department_id = id` e
  `status` em `OPEN_TICKET_STATUSES`.
- Os três `*Outcome` são o retorno das funções de dados de escrita. Violação de
  unicidade e setor inexistente são **resultado**, não exceção. Exceção fica para
  falha inesperada (banco fora).
- `DepartmentDeactivationBlocked` carrega **as duas** contagens mesmo quando o
  motivo é um só: a mensagem cita tudo o que falta resolver de uma vez.

### `app/_lib/types/ticket.ts` (novo)

```ts
export type { TicketStatus }
```

Reexporta `TicketStatus` de `@/db/schema` (só tipo), para domínio e UI tiparem
status sem importar `@/db/*` — mesmo padrão de `Role` em `actor.ts`.

### `app/_lib/types/actor.ts` — **sem mudança**

`Actor` não ganha `isDirector`. Ser diretor é consultado, não carregado.

## Domínio — `app/_lib/domain/`

### `app/_lib/domain/ticket.ts` (novo)

```ts
export type OpenTicketStatus =
  | "aberto"
  | "em_analise"
  | "encaminhado"
  | "aguardando_aprovacao"
  | "em_andamento"
export const isOpenTicketStatus: (
  status: TicketStatus,
) => status is OpenTicketStatus
export const OPEN_TICKET_STATUSES: readonly OpenTicketStatus[]
```

A classificação vive num mapa `satisfies Record<TicketStatus, boolean>`: se o
enum `ticket_status` ganhar valor novo, o `tsc` quebra aqui até alguém dizer se o
status novo é "em aberto". `OpenTicketStatus` e `OPEN_TICKET_STATUSES` são
derivados desse mapa. Fechados: `resolvido`, `fechado`, `cancelado`.

O domínio não importa o valor de runtime do enum (`ticketStatusEnum`) para não
arrastar `drizzle-orm` ao bundle do cliente.

Uso no Drizzle: `inArray(ticket.status, [...OPEN_TICKET_STATUSES])` — o spread
existe porque o array é `readonly` e `inArray` pede array mutável.

### `app/_lib/domain/department.ts` (novo)

```ts
export const BOARD_DEPARTMENT_NAME = "Diretoria"

export const checkDepartmentDeactivation: (
  dependencies: DepartmentDependencies,
) => DepartmentDeactivationCheck

export const describeDepartmentDeactivationBlock: (
  block: DepartmentDeactivationBlocked,
) => string
```

| Nome                                  | Semântica                                                                                                                                                                                   |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BOARD_DEPARTMENT_NAME`               | Nome com que o **seed** cria a Diretoria. Só isso: o poder vem de `is_board`, nunca do nome. Ninguém compara nome com esta constante para decidir permissão                                 |
| `checkDepartmentDeactivation`         | Precedência: `IS_BOARD` → `HAS_ACTIVE_USERS` → `HAS_OPEN_TICKETS` → `{ ok: true }`. Só responde sobre **desativar**; ativar não tem pré-condição                                            |
| `describeDepartmentDeactivationBlock` | Mensagem PT-BR do bloqueio, com as contagens e plural correto, citando só o que bloqueia (revisão de 2026-10-05). Única fonte do texto: a action devolve, a UI usa a mesma função no dialog |

Os limites de nome (2 e 80) moram em `app/_lib/domain/registry.ts`
(`REGISTRY_NAME_MIN_LENGTH`, `REGISTRY_NAME_MAX_LENGTH`), compartilhados com tags.
`DEPARTMENT_NAME_MIN_LENGTH`/`MAX_LENGTH` foram removidos.

Mensagens produzidas (revistas em 2026-10-05; variações de singular na revisão
do topo):

| Caso                 | Texto                                                                                                                                                           |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `IS_BOARD`           | `A Diretoria não pode ser desativada.`                                                                                                                          |
| `IS_UNASSIGNED`      | `O setor de pessoas não alocadas não pode ser desativado.`                                                                                                      |
| só pessoas (ex.: 3)  | `Não é possível desativar este setor: ele tem 3 pessoas ativas. Mova as pessoas para outro setor antes.`                                                        |
| só chamados (ex.: 1) | `Não é possível desativar este setor: ele tem 1 chamado em aberto. Conclua ou encaminhe o chamado antes.`                                                       |
| ambos                | `Não é possível desativar este setor: ele tem 3 pessoas ativas e 1 chamado em aberto. Mova as pessoas para outro setor e conclua ou encaminhe o chamado antes.` |

### `app/_lib/domain/status.ts` (novo)

```ts
export const describeActiveStatus: (isActive: boolean) => string
```

`true` → `Ativo`, `false` → `Inativo`. Coluna "Status" da tabela de setores.
`describeAccountStatus` (`app/_lib/domain/user.ts`) passou a ser alias desta
função — o perfil continua funcionando sem mudança e o texto existe num lugar só.

## Validação — `app/_lib/validation/department.ts` (novo)

```ts
export const departmentNameSchema // registryNameSchema("Informe o nome do setor.")
export const departmentIdSchema // registryIdSchema("Setor inválido.")

export const createDepartmentSchema // z.object({ name })
export type CreateDepartmentInput = { name: string }

export const renameDepartmentSchema // z.object({ id, name })
export type RenameDepartmentInput = { id: number; name: string }

export const setDepartmentActiveSchema // z.object({ id, isActive })
export type SetDepartmentActiveInput = { id: number; isActive: boolean }
```

| Campo      | Regra                        | Mensagem                                      |
| ---------- | ---------------------------- | --------------------------------------------- |
| `name`     | ausente ou vazio após `trim` | `Informe o nome do setor.`                    |
| `name`     | < 2 após `trim`              | `O nome precisa ter no mínimo 2 caracteres.`  |
| `name`     | > 80 após `trim`             | `O nome precisa ter no máximo 80 caracteres.` |
| `id`       | inteiro positivo             | `Setor inválido.`                             |
| `isActive` | boolean                      | `Situação inválida.`                          |

Unicidade **não** é checada no schema (não há banco no cliente). Quem descobre é
`df-data`, pela violação de `department_name_lower_idx`.

O `name` que sai do `safeParse` já vem com `trim`. É esse valor, e não o input
cru, que segue para `app/_lib/data/`.

## `df-auth` — o que criar

### `app/_lib/auth/director.ts` (novo)

```ts
export const requireDirector: () => Promise<Actor>
export const getDirector: () => Promise<Actor | null>
export const getIsDirector: () => Promise<boolean>
```

| Função            | Sem sessão           | Com sessão, não diretor | Diretor         | Quem usa                                        |
| ----------------- | -------------------- | ----------------------- | --------------- | ----------------------------------------------- |
| `requireDirector` | `redirect("/login")` | `notFound()`            | devolve `Actor` | `app/(app)/registry/layout.tsx` e páginas       |
| `getDirector`     | `redirect("/login")` | `null`                  | devolve `Actor` | Server Actions (traduzem `null` em `FORBIDDEN`) |
| `getIsDirector`   | `false`              | `false`                 | `true`          | `app/(app)/layout.tsx`, para a sidebar          |

- Todas partem de `getSession()`/`requireSession()` de `app/_lib/auth/session.ts`
  e derivam de `getRegistryAccess()` (`app/_lib/auth/registry-access.ts`, ver
  `docs/contracts/registry-tags.md`): diretor é `isDirectorAccess(access)`. A
  consulta (`users` + join `department`) é uma só por request, compartilhada com
  a sidebar e a guarda de Tags.
- `is_active` do usuário entra na consulta: diretor desativado perde o poder na
  hora, independentemente do ADR 003.
- **Por que a action não usa `requireDirector`:** `notFound()` dentro de Server
  Action não produz resposta útil ao formulário. A action precisa de um "não"
  que ela transforma em `{ ok: false, code: "FORBIDDEN" }`; por isso existe
  `getDirector`.
- **Onde mora o SQL:** a consulta é feita em `app/_lib/auth/director.ts`
  importando `@/db` e `@/db/schema` diretamente, como a instância do Better Auth
  já faz em `app/_lib/auth/auth.ts`. **Não** passa por `app/_lib/data/`: a seção 2
  do `stack.md` não tem a seta `auth → data`, e criá-la para uma consulta de
  identidade abriria dependência nova entre camadas. `auth → db` já existe. Ver
  ADR 011.
- `Actor` e `session.ts` não mudam.

## `df-data` — o que criar

### `app/_lib/data/departments.ts` (novo)

```ts
export async function listDepartments(): Promise<DepartmentListItem[]>
export async function insertDepartment(
  name: string,
): Promise<InsertDepartmentOutcome>
export async function updateDepartmentName(
  id: number,
  name: string,
): Promise<UpdateDepartmentNameOutcome>
export async function updateDepartmentActive(
  id: number,
  isActive: boolean,
): Promise<UpdateDepartmentActiveOutcome>
```

Os nomes das funções de dados não repetem os das actions (`createDepartment`
etc.) para a action poder importar os dois lados sem alias.

**`listDepartments()`**

- Todos os setores, ativos e inativos, com a Diretoria primeiro: ordem
  `is_board desc`, `lower(name)` ascendente, `id`. Mesma ordem de
  `listDepartmentOptions()`.
- `activeUsers` e `openTickets` pela definição em "Tipos" — subconsultas
  correlacionadas ou `left join` com `count` agrupado; `count` do Postgres volta
  como `bigint`, então converter para `number` (ex.: `count()` do Drizzle, que já
  devolve `number`). Setor sem pessoas nem chamados vem com `0`, nunca `null`.
- Não filtra por permissão: quem chama já passou por `requireDirector`.

**`insertDepartment(name)`**

- `insert ... returning id`. `is_active` e `is_board` ficam no default (`true`,
  `false`). **Nunca** cria setor com `is_board = true` — só o seed faz isso.
- Violação de unicidade em `department_name_lower_idx` → `{ status: "name_taken" }`.
- Como detectar: o Drizzle 0.45 embrulha o erro do `pg` em `DrizzleQueryError`
  (`drizzle-orm/errors`); o erro do driver está em `error.cause`. Checar
  `code === "23505"` **e** `constraint === "department_name_lower_idx"` com
  narrowing (`instanceof`, `in`, `typeof`), sem `as`. Qualquer outro erro é
  relançado.

**`updateDepartmentName(id, name)`**

- `update ... set name, updated_at where id returning id`. Zero linhas →
  `not_found`. Unicidade como em `insertDepartment` → `name_taken`.
- Renomear para o mesmo nome com outra caixa (`ti` → `TI`) é permitido: o índice
  compara com a própria linha.
- Vale para a Diretoria. `is_board` nunca é tocado aqui.

**`updateDepartmentActive(id, isActive)`**

Tudo numa transação:

1. `select id, is_board from department where id = $1 for update`. Nenhuma linha
   → `not_found`.
2. Se `isActive === true` → `update` e `saved`. Ativar não tem pré-condição.
3. Se `isActive === false`: conta `activeUsers` e `openTickets` **dentro da
   transação**, chama `checkDepartmentDeactivation({ isBoard, activeUsers, openTickets })`
   de `@/app/_lib/domain/department`; bloqueado →
   `{ status: "blocked", block }` sem `update`; liberado → `update` e `saved`.
4. Mesmo valor que já está gravado não é erro: faz o `update` (só `updated_at`
   muda) e devolve `saved`.

Por que `for update`: toda inserção ou troca de `users.department_id` e
`ticket.current_department_id` que aponte para este setor precisa de
`FOR KEY SHARE` na linha de `department` (checagem da FK), e isso espera o
`FOR UPDATE`. Enquanto a desativação decide, ninguém entra no setor. Ver risco 3.

A contagem de "dependências" não vira função pública separada: a UI já recebe as
contagens de `listDepartments()`, e a action não precisa delas fora da transação.

### `db/seed.ts` (alterado)

- Remove `requiredEnv("SEED_DEPARTMENT_NAME")` e todo uso da variável.
- Garante a Diretoria: procura `department where is_board`; se não existir, cria
  com `name = BOARD_DEPARTMENT_NAME` (de `@/app/_lib/domain/department`),
  `is_board = true`, `is_active = true`. Se já existir, usa a existente **como
  está** (pode ter sido renomeada — é permitido).
- Colisão de nome: se já existir um setor comum chamado "Diretoria" sem carimbo,
  o `insert` viola `department_name_lower_idx`. O seed **aborta** com mensagem
  clara (`Seed abortado: já existe um setor "Diretoria" sem o carimbo de diretoria.`)
  em vez de carimbar setor alheio. Não acontece em banco novo.
- O admin (`SEED_ADMIN_*`, `role: "admin"`) é criado nesse setor, na mesma
  transação, como hoje.
- Admin já existente continua sendo pulado (idempotência). O seed **não** move
  admin antigo para a Diretoria — ver risco 1.
- O seed demo continua usando `departmentId` do admin, que agora é a Diretoria.

## `df-actions` — o que criar

### `app/_lib/actions/departments.ts` (novo, `"use server"`)

Mesma convenção de `app/_lib/actions/profile.ts`: `ok` literal, `message` em
PT-BR pronta para o toast, `code` opcional só em falha de negócio.

```ts
export type DepartmentErrorCode =
  | "INVALID_INPUT"
  | "FORBIDDEN"
  | "NAME_TAKEN"
  | "NOT_FOUND"
  | "IS_BOARD"
  | "HAS_ACTIVE_USERS"
  | "HAS_OPEN_TICKETS"

export interface DepartmentActionSuccess {
  ok: true
  message: string
}

export interface DepartmentActionFailure {
  ok: false
  message: string
  code?: DepartmentErrorCode
}

export type DepartmentActionResult =
  DepartmentActionSuccess | DepartmentActionFailure

export const createDepartment: (
  input: CreateDepartmentInput,
) => Promise<DepartmentActionResult>
export const renameDepartment: (
  input: RenameDepartmentInput,
) => Promise<DepartmentActionResult>
export const setDepartmentActive: (
  input: SetDepartmentActiveInput,
) => Promise<DepartmentActionResult>
```

Sequência comum às três:

1. `const actor = await getDirector()`; `null` → `FORBIDDEN`. **Antes** do parse:
   não-diretor não recebe nem erro de validação.
2. `<schema>.safeParse(input)`; inválido → `INVALID_INPUT` com a primeira
   `issue.message`.
3. Função de dados em `try/catch`; exceção → `console.error("[<action>]", error)`
   e falha inesperada, sem `code`.
4. Traduz o `Outcome` (tabela abaixo).
5. Sucesso → `revalidatePath` e `{ ok: true, message }`.

| Situação                             | `code`             | Mensagem                                                                                     |
| ------------------------------------ | ------------------ | -------------------------------------------------------------------------------------------- |
| setor criado                         | —                  | `Setor criado.`                                                                              |
| setor renomeado                      | —                  | `Setor renomeado.`                                                                           |
| setor ativado                        | —                  | `Setor ativado.`                                                                             |
| setor desativado                     | —                  | `Setor desativado.`                                                                          |
| não é diretor                        | `FORBIDDEN`        | `Você não tem permissão para gerenciar setores.`                                             |
| schema falhou                        | `INVALID_INPUT`    | primeira `issue.message` do Zod                                                              |
| `name_taken`                         | `NAME_TAKEN`       | `Já existe um setor com esse nome. Se ele estiver inativo, reative-o em vez de criar outro.` |
| `not_found`                          | `NOT_FOUND`        | `Setor não encontrado.`                                                                      |
| `blocked`, motivo `IS_BOARD`         | `IS_BOARD`         | `describeDepartmentDeactivationBlock(block)`                                                 |
| `blocked`, motivo `HAS_ACTIVE_USERS` | `HAS_ACTIVE_USERS` | `describeDepartmentDeactivationBlock(block)` (cita pessoas e, se houver, chamados)           |
| `blocked`, motivo `HAS_OPEN_TICKETS` | `HAS_OPEN_TICKETS` | `describeDepartmentDeactivationBlock(block)`                                                 |
| falha inesperada                     | —                  | `Não foi possível salvar o setor agora. Tente novamente.`                                    |

`code` do bloqueio é `block.reason`, sem mapa intermediário: os literais são os
mesmos.

Revalidação:

- `createDepartment` e `setDepartmentActive` → `revalidatePath("/registry/departments")`.
- `renameDepartment` → `revalidatePath("/(app)", "layout")`: o nome do setor
  aparece na sidebar ("Setor · Papel") e no perfil de todos os membros, então o
  layout do grupo inteiro é invalidado (inclui `/registry/departments`).

Nenhuma action recebe o id do ator nem decide permissão por conta própria: quem
decide é `getDirector()`. Nenhuma escreve SQL.

## `df-ui` — o que criar

### Pacotes e primitivos

- `npm install @tanstack/react-table`
- `npx shadcn@latest add table collapsible badge alert-dialog` — depois, trocar o
  import do `cn` para `@/app/_lib/utils` (seção 5 do `stack.md`).

### `app/(app)/layout.tsx` (alterado)

- Nesta feature chamava `getIsDirector()`. **Hoje** chama `getRegistryAccess()`
  de `@/app/_lib/auth/registry-access` no mesmo `Promise.all` das outras
  leituras e passa `registryItems={registryNavItemsFor(access)}` para
  `AppSidebar`.

### Sidebar — `app/(app)/_components/`

Como entregue nesta feature: `AppSidebar` com `isDirector: boolean`, Pessoas e
Tags como "em breve". **Hoje** (Tags e Pessoas):

- `AppSidebar` recebe `registryItems: RegistryNavItem[]` (de
  `registryNavItemsFor`); "Cadastros" aparece quando a lista não é vazia.
- `RegistryNav` (`registry-nav.tsx`), com `Collapsible` do shadcn e ícone
  `FolderIcon`. Aberto por padrão quando `pathname` está numa das seções; o
  usuário pode recolher. Leitura de `pathname` exige Client Component.
- Subitens, todos com link: diretor vê **Pessoas**, **Setores**
  (`/registry/departments`) e **Tags**; admin de setor vê Pessoas e Tags.
- Esconder o item **não** é a proteção: a guarda é o layout de `/registry` e,
  para Setores, `requireDirector` na página.

### `app/(app)/registry/layout.tsx` (novo)

- `await requireRegistryAccess()` e renderiza `children`: passa diretor **e**
  admin de setor (antes era `requireDirector()`). Sem acesso → 404.
- Não existe `app/(app)/registry/page.tsx` nesta feature: `/registry` sem
  subrota é 404 para todos.

### `app/(app)/registry/departments/page.tsx` (novo, Server Component)

- `await requireDirector()` **na página**, antes de ler: o layout deixa passar o
  admin de setor, e Setores continua só da Diretoria.
- `listDepartments()` de `@/app/_lib/data/departments` e passa a lista ao
  componente de tabela.
- Botão "Novo setor" abre o formulário de criação.

### `app/_components/data-table/` (novo — pasta aprovada pelo usuário)

Tabela genérica sobre TanStack Table (`const DataTable = <TData,>(props: DataTableProps<TData>) => {}`),
com toolbar de busca por texto, cabeçalho e corpo. Nasce aqui porque Pessoas e
Tags vão reusar. Ganhou depois a prop `filters` (popover com checkboxes,
`filterFn: "inValues"`); API em "Peças compartilhadas" de
`docs/contracts/registry-people.md`.

### `app/(app)/registry/departments/_components/` (novo)

- Colunas: **Nome** (com `Badge` "Diretoria" quando `isBoard`), **Status**
  (`describeActiveStatus(isActive)` em `Badge`), **Pessoas ativas**
  (`activeUsers`), **Chamados em aberto** (`openTickets`), **Criado em**
  (`formatDate(createdAt)` de `@/app/_lib/date`), **Ações**.
- Busca por nome no cliente (filtro de coluna do TanStack, `includesString`).
- Filtro **Status** (`activeStatusFilter` de `app/(app)/registry/_components/`)
  pela prop `filters` do `DataTable`: opções Ativo e Inativo, coluna `isActive`
  com `filterFn: "inValues"`. Sem opção marcada, lista todos.
- Ações por linha (`department-row-actions.tsx`) em `RegistryRowActions`, slots
  `rename` (`fit`) e `status` (`md`); o slot `status` fica vazio para Diretoria
  e Não alocado.
- Formulário de criar e de renomear: React Hook Form + `zodResolver` com
  `createDepartmentSchema` nos dois modos, porque o único campo digitado é
  `name` (a regra é `departmentNameSchema`, a mesma dos dois schemas). No modo
  renomear, o `id` vem da linha da tabela, não do formulário; o input completo
  (`{ id, name }`) é validado pela action com `renameDepartmentSchema`.
  `NAME_TAKEN` vira erro no campo `name` com `result.message`; o resto vira
  toast (Sonner).
- Ativar/desativar: `AlertDialog` de confirmação na desativação; chama
  `setDepartmentActive`. Falha exibe `result.message`.
- Botão "Desativar" da Diretoria não aparece (ou aparece desabilitado). Para os
  demais, a UI **pode** desabilitar quando `activeUsers > 0 || openTickets > 0`,
  mostrando o motivo com
  `describeDepartmentDeactivationBlock(checkDepartmentDeactivation(...))` quando
  `ok === false`. É a mesma regra da action, não uma cópia. A action continua
  sendo a autoridade (contagem pode ter mudado desde o render).
- Nenhum import de `@/db/*`, `drizzle-orm` ou `app/_lib/auth` em Client Component.

## Riscos

1. **Banco local precisa ser recriado.** A migration não marca setor existente
   como Diretoria, e o seed pula quando o admin já existe — então num banco já
   populado ninguém vira diretor e `/registry` dá 404 para todos. Caminho em
   desenvolvimento: recriar o banco, `npm run db:migrate`, `npm run db:seed`.
   (Alternativa manual, só se o usuário preferir não recriar:
   `update department set is_board = true where id = <setor do admin>`. Não é
   automatizada: carimbar setor por palpite é pior que não carimbar.)
2. **Encaminhamento pendente para setor desativado.** Um `ticket_transfer`
   `pendente` com `to_department_id` de um setor que acaba de ser desativado não
   conta como "chamado em aberto" do destino (o chamado ainda está na origem).
   Fica para a feature de encaminhamento: recusar destino inativo ao solicitar e
   ao aprovar.
3. **Corrida na desativação.** Recontagem e `update` na mesma transação, com
   `FOR UPDATE` no setor, bloqueiam entrada de pessoa ou chamado **por troca de
   FK**. Continua aberta uma janela pequena para mudanças que não tocam a FK:
   reativar uma pessoa que já é do setor, ou reabrir um chamado que já está nele.
   Aceito: hoje nenhuma das duas telas existe, e quando existirem podem travar o
   setor com `FOR SHARE` se precisarem.
4. **Custo da checagem de diretor.** Uma consulta indexada (PK de `users` + PK de
   `department`) por request em `(app)`. Aceito em troca da revogação imediata.

## Variáveis de ambiente

| Variável               | Mudança                                              |
| ---------------------- | ---------------------------------------------------- |
| `SEED_DEPARTMENT_NAME` | **removida** de `.env.example`; o seed não a lê mais |

Quem tiver a variável no `.env` pode apagá-la; ela é ignorada.

## Checklist de encerramento da feature

- [ ] `requireDirector`, `getDirector`, `getIsDirector` em `app/_lib/auth/director.ts` (`df-auth`)
- [ ] `listDepartments`, `insertDepartment`, `updateDepartmentName`, `updateDepartmentActive` em `app/_lib/data/departments.ts` (`df-data`)
- [ ] seed cria a Diretoria com `is_board` e o admin nela; nenhuma ocorrência de `SEED_DEPARTMENT_NAME` no projeto (`df-data`)
- [ ] `createDepartment`, `renameDepartment`, `setDepartmentActive` em `app/_lib/actions/departments.ts` (`df-actions`)
- [ ] item "Cadastros" na sidebar só para diretor; `/registry/departments` com tabela, criar, renomear, ativar/desativar (`df-ui`)
- [ ] não-diretor em `/registry/departments` recebe 404; action chamada por não-diretor devolve `FORBIDDEN` (`df-debug`)
- [ ] mover o admin para outro setor tira o item "Cadastros" na próxima navegação, sem novo login (`df-debug`)
- [ ] criar/renomear com nome existente (inclusive inativo, outra caixa) → `NAME_TAKEN` (`df-debug`)
- [ ] desativar setor com pessoa ativa ou chamado em aberto é recusado com as contagens; Diretoria nunca desativa (`df-debug`)
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm run build`
