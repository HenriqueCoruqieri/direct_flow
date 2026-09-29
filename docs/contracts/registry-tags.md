# Contrato — Cadastros → Tags

Entrada das ondas 1 e 2. Plano em `docs/plans/registry-tags.md`, que manda nas
decisões. Poder da Diretoria e entrada do admin de setor em
`docs/adr/011-board-department-with-global-power.md`. Padrões de tabela,
formulário e resultado de action reusados de `docs/contracts/registry-departments.md`.

Versões observadas: `next@16.3.5`, `better-auth@1.7.5`, `drizzle-orm@0.45.2`,
`zod@4.6.5`, `@tanstack/react-table@9`.

> **Atualizado pela feature Pessoas** (`docs/contracts/registry-people.md`):
> o setor **Não alocado** (`department.is_unassigned`) não tem tags. Criar ou
> reativar tag nele devolve `DEPARTMENT_UNASSIGNED`
> (`TAG_DEPARTMENT_UNASSIGNED_MESSAGE`), decidido por `checkTagDepartment`
> (`app/_lib/domain/tag.ts`) dentro da transação de `insertTag` e
> `updateTagActive`; `InsertTagOutcome` e `UpdateTagActiveOutcome` ganham
> `TagDepartmentUnassigned`; `TagErrorCode` ganha `"DEPARTMENT_UNASSIGNED"`.
> `tagCreationDepartments` passou a ser `assignableDepartments` (ativos, sem o
> Não alocado). `DepartmentOption` ganhou `isUnassigned` e
> `listDepartmentOptions` ordena o Não alocado por último. O item Pessoas do menu
> deixou de ser "em breve" (`PEOPLE_REGISTRY_PATH`). `resolveRegistryAccess`
> devolve `none` também para admin no Não alocado e para quem tem
> `must_change_password`. O filtro de setor em `Select` deu lugar à prop
> `filters` do `DataTable` (popover com checkboxes, Setor e Status) e as ações por
> linha passaram a usar `RegistryRowActions`; os dois estão descritos em
> "Peças compartilhadas" do contrato de Pessoas. As seções abaixo descrevem a
> feature Tags já com essas mudanças; onde divergirem, vale o contrato de Pessoas.

## Decisões fixadas pelo usuário (resumo do plano)

| Tema          | Decisão                                                                                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Quem gerencia | Diretor: tags de **qualquer** setor. Admin de setor (`role = admin`, ativo): só tags do **próprio** setor. Membro comum: nada (404). Diretor tem precedência |
| Acesso        | Uma consulta fresca ao banco por request (`getRegistryAccess`), com `cache` do React. Nunca ler `role` do cookie                                             |
| Menu          | Diretor: Pessoas, Setores, Tags. Admin de setor: Pessoas, Tags. Membro: sem "Cadastros"                                                                      |
| Guardas       | `/registry/*` exige diretor **ou** admin de setor; `/registry/departments` exige diretor na própria página                                                   |
| Escopo        | Listar, criar, renomear, ativar/desativar. Sem exclusão. Tag nunca muda de setor                                                                             |
| Desativar     | Sempre permitido                                                                                                                                             |
| Nome          | `trim`, 2–80 caracteres; único no setor **contando inativas**, sem diferenciar maiúsculas                                                                    |
| Setor inativo | Não se cria nem se reativa tag nele (`DEPARTMENT_INACTIVE`). Renomear e desativar continuam permitidos                                                       |
| Autorização   | Renomear e ativar/desativar autorizam pelo setor **gravado** na tag (`findTagDepartment`), nunca pelo input                                                  |
| E-mail        | Nenhum                                                                                                                                                       |

## Tabelas e migration

### `tag` (`db/schema.ts`, alterado)

| Restrição                     | Antes                                                 | Agora                                                  |
| ----------------------------- | ----------------------------------------------------- | ------------------------------------------------------ |
| `tag_name_per_department_idx` | `unique (department_id, lower(name)) where is_active` | `unique (department_id, lower(name))`, todas as linhas |

Colunas sem mudança: `id`, `name`, `department_id` (FK `restrict`),
`is_active`, `created_at`, `updated_at`.

### Migration `db/migrations/0004_tag_name_unique_including_inactive.sql`

```sql
DROP INDEX "tag_name_per_department_idx";
CREATE UNIQUE INDEX "tag_name_per_department_idx" ON "tag" USING btree ("department_id",lower("name"));
```

O `df-debug` confirmou que o Neon não tem duplicatas entre ativas e inativas, então
o `CREATE UNIQUE INDEX` não falha. Quem aplica (`npm run db:migrate`) é o usuário.

### Lidas pelo fluxo

- `department` — `name`, `is_active`, `is_board` (coluna Setor, opções, trava de setor inativo)
- `ticket_tag` — contagem de chamados por tag
- `users` — `is_active`, `role`, `department_id` (acesso; só em `app/_lib/auth/`)

## Tipos — `app/_lib/types/`

### `app/_lib/types/registry.ts` (novo)

```ts
export interface RegistryAccessFacts {
  isActive: boolean
  role: Role
  departmentId: number
  isBoard: boolean
  isUnassigned: boolean
  mustChangePassword: boolean
}

export interface DirectorAccess {
  kind: "director"
  departmentId: number
}

export interface DepartmentAdminAccess {
  kind: "department_admin"
  departmentId: number
}

export interface NoRegistryAccess {
  kind: "none"
}

export type GrantedRegistryAccess = DirectorAccess | DepartmentAdminAccess

export type RegistryAccess = GrantedRegistryAccess | NoRegistryAccess

export type RegistrySection = "people" | "departments" | "tags"

export interface RegistryNavItem {
  section: RegistrySection
  label: string
  href: string
}
```

- `RegistryAccessFacts` é a linha que `getRegistryAccess` lê do banco; a decisão
  sai dela por `resolveRegistryAccess` (domínio).
- `departmentId` do acesso vem do **banco**, não do cookie. É esse valor, e não
  `actor.departmentId`, que decide o setor do admin.
- `RegistryNavItem.href` é sempre a rota da seção (`*_REGISTRY_PATH`): não
  existe item de menu sem link.

### `app/_lib/types/tag.ts` (novo)

```ts
export interface TagListItem {
  id: number
  name: string
  departmentId: number
  departmentName: string
  departmentIsActive: boolean
  isActive: boolean
  ticketCount: number
  createdAt: Date
}

export interface AllDepartmentsTagScope {
  kind: "all"
}

export interface SingleDepartmentTagScope {
  kind: "department"
  departmentId: number
}

export type TagListScope = AllDepartmentsTagScope | SingleDepartmentTagScope

export interface TagSaved {
  status: "saved"
  id: number
}

export interface TagNameTaken {
  status: "name_taken"
  existingIsActive: boolean
}

export interface TagNotFound {
  status: "not_found"
}

export interface TagDepartmentNotFound {
  status: "department_not_found"
}

export interface TagDepartmentInactive {
  status: "department_inactive"
}

export type InsertTagOutcome =
  TagSaved | TagNameTaken | TagDepartmentNotFound | TagDepartmentInactive

export type UpdateTagNameOutcome = TagSaved | TagNameTaken | TagNotFound

export type UpdateTagActiveOutcome =
  TagSaved | TagNotFound | TagDepartmentInactive
```

- `ticketCount` — `count(ticket_tag)` com `tag_id = id`, chamados de qualquer
  status. `0`, nunca `null`.
- `departmentIsActive` — permite à UI desabilitar "Ativar" numa tag de setor
  inativo com a mesma regra que a data layer aplica.
- `TagNameTaken.existingIsActive` — situação da tag **que já tem o nome**, para
  a mensagem sugerir reativá-la.
- Outcomes seguem o padrão de setores: conflito e ausência são **resultado**;
  exceção é só falha inesperada.

### `app/_lib/types/department.ts` (acrescido)

```ts
export interface DepartmentOption {
  id: number
  name: string
  isBoard: boolean
  isActive: boolean
}
```

## Domínio — `app/_lib/domain/`

### `app/_lib/domain/registry.ts` (novo)

```ts
export const REGISTRY_NAME_MIN_LENGTH = 2
export const REGISTRY_NAME_MAX_LENGTH = 80
export const PEOPLE_REGISTRY_PATH = "/registry/people"
export const DEPARTMENTS_REGISTRY_PATH = "/registry/departments"
export const TAGS_REGISTRY_PATH = "/registry/tags"

export const resolveRegistryAccess: (
  facts: RegistryAccessFacts | null,
) => RegistryAccess
export const hasRegistryAccess: (
  access: RegistryAccess,
) => access is GrantedRegistryAccess
export const isDirectorAccess: (
  access: RegistryAccess,
) => access is DirectorAccess
export const registryNavItemsFor: (access: RegistryAccess) => RegistryNavItem[]
```

| Nome                    | Semântica                                                                                                                                                      |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `REGISTRY_NAME_*`       | Limites de nome de **todo** cadastro (setor e tag). Substituem `DEPARTMENT_NAME_MIN_LENGTH`/`MAX_LENGTH`, removidos                                            |
| `*_REGISTRY_PATH`       | Rotas dos cadastros; usadas pelo menu e pelo `revalidatePath` das actions                                                                                      |
| `resolveRegistryAccess` | `null`, usuário inativo ou `mustChangePassword` → `none`; setor `is_board` → `director`; `role = admin` fora do Não alocado → `department_admin`; senão `none` |
| `hasRegistryAccess`     | `kind !== "none"`. Type guard para chegar a `GrantedRegistryAccess`                                                                                            |
| `isDirectorAccess`      | `kind === "director"`. Decide coluna/filtro de setor na UI e o acesso a Setores                                                                                |
| `registryNavItemsFor`   | Diretor: Pessoas, Setores, Tags. Admin: Pessoas, Tags. Todos com `href`. `none`: `[]` (a sidebar não mostra "Cadastros")                                       |

### `app/_lib/domain/tag.ts` (novo)

```ts
export const TAG_DEPARTMENT_INACTIVE_MESSAGE: string
export const canManageTagsOf: (
  access: RegistryAccess,
  departmentId: number,
) => boolean
export const tagScopeFor: (access: GrantedRegistryAccess) => TagListScope
export const tagCreationDepartments: (
  options: readonly DepartmentOption[],
) => DepartmentOption[]
export const describeTagNameTaken: (existingIsActive: boolean) => string
```

| Nome                              | Semântica                                                                                                                             |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `canManageTagsOf`                 | Diretor → `true` para qualquer setor. Admin → `true` só se `departmentId` é o do acesso. `none` → `false`. **A** regra de autorização |
| `tagScopeFor`                     | Diretor → `{ kind: "all" }`. Admin → `{ kind: "department", departmentId }`. Entrada de `listTags`                                    |
| `tagCreationDepartments`          | Só as opções com `isActive`, na ordem recebida. Alimenta o select do formulário de criação do diretor                                 |
| `describeTagNameTaken`            | Mensagem de `NAME_TAKEN` (tabela abaixo)                                                                                              |
| `TAG_DEPARTMENT_INACTIVE_MESSAGE` | Texto de `DEPARTMENT_INACTIVE`, também usável pela UI para explicar "Ativar" desabilitado                                             |

| Caso                              | Texto                                                                                       |
| --------------------------------- | ------------------------------------------------------------------------------------------- |
| `describeTagNameTaken(true)`      | `Já existe uma tag com esse nome neste setor.`                                              |
| `describeTagNameTaken(false)`     | `Já existe uma tag inativa com esse nome neste setor. Se quiser usar esse nome, reative-a.` |
| `TAG_DEPARTMENT_INACTIVE_MESSAGE` | `Este setor está inativo. Não é possível criar nem reativar tags nele.`                     |

### `app/_lib/domain/department.ts` (alterado)

`DEPARTMENT_NAME_MIN_LENGTH` e `DEPARTMENT_NAME_MAX_LENGTH` saíram (viraram
`REGISTRY_NAME_*`). Não havia uso fora de `app/_lib/validation/department.ts`.

### Reusado sem mudança

`describeActiveStatus` (`app/_lib/domain/status.ts`) para a coluna Status.

## Validação — `app/_lib/validation/`

### `app/_lib/validation/registry.ts` (novo)

```ts
export const registryNameSchema: (requiredMessage: string) => ZodString
export const registryIdSchema: (message: string) => ZodNumber
export const registryActiveSchema: ZodBoolean
```

Fábricas compartilhadas por setor e tag: `trim` → obrigatório → mínimo 2 →
máximo 80; inteiro positivo; boolean (`Situação inválida.`).

### `app/_lib/validation/department.ts` (alterado, mesma API)

Passa a montar os schemas com as fábricas acima. Mensagens idênticas.
`departmentIdSchema` agora é exportado (antes era `departmentIdField`, privado).

### `app/_lib/validation/tag.ts` (novo)

```ts
export const tagNameSchema

export const createTagSchema // z.object({ departmentId, name })
export type CreateTagInput = { departmentId: number; name: string }

export const renameTagSchema // z.object({ id, name })
export type RenameTagInput = { id: number; name: string }

export const setTagActiveSchema // z.object({ id, isActive })
export type SetTagActiveInput = { id: number; isActive: boolean }
```

| Campo          | Regra                        | Mensagem                                      |
| -------------- | ---------------------------- | --------------------------------------------- |
| `name`         | ausente ou vazio após `trim` | `Informe o nome da tag.`                      |
| `name`         | < 2 após `trim`              | `O nome precisa ter no mínimo 2 caracteres.`  |
| `name`         | > 80 após `trim`             | `O nome precisa ter no máximo 80 caracteres.` |
| `departmentId` | inteiro positivo             | `Selecione o setor.`                          |
| `id`           | inteiro positivo             | `Tag inválida.`                               |
| `isActive`     | boolean                      | `Situação inválida.`                          |

`departmentId` é `number`, sem `coerce` (manteria o tipo de entrada `unknown` e
quebraria o `zodResolver`). O select entrega string: a UI converte com
`Number(value)` no `onValueChange`. Unicidade não é checada no schema.

## `df-auth` — o que criar e mudar

### `app/_lib/auth/registry-access.ts` (novo)

```ts
export const getRegistryAccess: () => Promise<RegistryAccess>
export const requireRegistryAccess: () => Promise<GrantedRegistryAccess>
```

| Função                  | Sem sessão           | Sem acesso (`none`) | Com acesso                       | Quem usa                                               |
| ----------------------- | -------------------- | ------------------- | -------------------------------- | ------------------------------------------------------ |
| `getRegistryAccess`     | `{ kind: "none" }`   | `{ kind: "none" }`  | `director` ou `department_admin` | `app/(app)/layout.tsx`, actions de tags, `director.ts` |
| `requireRegistryAccess` | `redirect("/login")` | `notFound()`        | devolve o acesso                 | `app/(app)/registry/layout.tsx`, `/registry/tags`      |

- `getRegistryAccess` é embrulhada em `cache` do React (sem argumentos): no
  máximo **uma** consulta por request, compartilhada por layout, página e
  `director.ts`.
- A consulta: `select users.is_active, users.role, users.department_id,
department.is_board from users inner join department on users.department_id =
department.id where users.id = actor.id limit 1`, com `actor` vindo de
  `getSession()`. Linha ausente → `resolveRegistryAccess(null)`. A linha vai
  inteira para `resolveRegistryAccess` de `@/app/_lib/domain/registry`; o arquivo
  de auth **não** reimplementa a precedência.
- Nunca lê `role` ou `departmentId` do `Actor`/cookie para decidir: só o `id`.
- É leitura de identidade e permissão (seção 2 do `stack.md`): `@/db` direto, sem
  `app/_lib/data/`.

### `app/_lib/auth/director.ts` (alterado, mesma API)

```ts
export const requireDirector: () => Promise<Actor>
export const getDirector: () => Promise<Actor | null>
export const getIsDirector: () => Promise<boolean>
```

- O helper privado `isActiveBoardMember` sai. As três passam a derivar de
  `getRegistryAccess()` + `isDirectorAccess()`:
  - `requireDirector`: `requireSession()`; se não for diretor, `notFound()`.
  - `getDirector`: `requireSession()`; diretor → `actor`, senão `null`.
  - `getIsDirector`: `isDirectorAccess(await getRegistryAccess())`.
- Resultado: uma consulta só por request, mesmo quando layout (`getRegistryAccess`)
  e página de Setores (`requireDirector`) rodam no mesmo render.
- Comportamento observável idêntico ao de hoje para diretor e não-diretor.
  `app/_lib/actions/departments.ts` não muda.

## `df-data` — o que criar

### `app/_lib/data/tags.ts` (novo)

```ts
export async function listTags(scope: TagListScope): Promise<TagListItem[]>
export async function insertTag(
  departmentId: number,
  name: string,
): Promise<InsertTagOutcome>
export async function updateTagName(
  id: number,
  name: string,
): Promise<UpdateTagNameOutcome>
export async function updateTagActive(
  id: number,
  isActive: boolean,
): Promise<UpdateTagActiveOutcome>
export async function findTagDepartment(id: number): Promise<number | null>
```

**`listTags(scope)`**

- `tag` com `inner join department`. `scope.kind === "department"` → `where
tag.department_id = scope.departmentId`; `"all"` → sem filtro.
- Ativas e inativas.
- `ticketCount`: `db.$count(ticketTag, eq(ticketTag.tagId, tag.id))`.
- Ordem: `department.is_board desc`, `lower(department.name)`, `lower(tag.name)`,
  `tag.id`. (Com escopo de um setor, as duas primeiras são constantes.)
- Não filtra por permissão além do escopo recebido: quem monta o escopo é
  `tagScopeFor(access)`.

**`listDepartmentOptions()`**, em `app/_lib/data/departments.ts` (acrescida)

```ts
export async function listDepartmentOptions(): Promise<DepartmentOption[]>
```

- **Todos** os setores (ativos e inativos), `id`, `name`, `is_board`, `is_active`.
- Ordem: `is_board desc`, `lower(name)`, `id` — Diretoria primeiro, como em
  `listDepartments`.
- Inativos entram para o **filtro** achar tags de setor desativado; a criação usa
  `tagCreationDepartments(options)`, que deixa só os ativos.

**`insertTag(departmentId, name)`** — numa transação:

1. `select is_active from department where id = $1 for share`. Sem linha →
   `department_not_found`. `is_active = false` → `department_inactive`.
2. `insert into tag (department_id, name) returning id` → `saved`.
3. Violação `23505` em `tag_name_per_department_idx` → busca a tag existente
   (`department_id = $1 and lower(name) = lower($2)`) e devolve
   `{ status: "name_taken", existingIsActive }`.

O `for share` impede que o setor seja desativado entre a checagem e o `insert`
(a desativação de setor pega `for update`).

A detecção do erro segue `isDepartmentNameTakenError` de
`app/_lib/data/departments.ts`: `DrizzleQueryError` → `cause instanceof
DatabaseError` → `code === "23505"` e `constraint ===
"tag_name_per_department_idx"`. Sem `as`. Sugestão: generalizar o helper para
receber o nome da constraint, em vez de copiar. Como a violação aborta a
transação no Postgres, a busca da tag existente roda **fora** dela (depois do
`catch`), com `db`.

**`updateTagName(id, name)`**

- `update tag set name, updated_at where id returning id`. Zero linhas →
  `not_found`. Violação de unicidade → mesma busca de `insertTag` (usando o
  `department_id` da própria tag) → `name_taken` com `existingIsActive`.
- Mudar só a caixa do próprio nome (`rh` → `RH`) é permitido: o índice compara com
  a própria linha.
- `department_id` nunca é alterado.

**`updateTagActive(id, isActive)`** — numa transação:

1. `select department_id from tag where id = $1 for update`. Sem linha → `not_found`.
2. `isActive === false` → `update` e `saved`. Desativar não tem pré-condição.
3. `isActive === true` → `select is_active from department where id = <department_id> for share`;
   inativo → `department_inactive`, sem `update`; ativo → `update` e `saved`.
4. Mesmo valor já gravado não é erro: `update` (só `updated_at` muda) e `saved`.

**`findTagDepartment(id)`**

- `select department_id from tag where id = $1`. Devolve o número ou `null`.
- Base da autorização de renomear e ativar/desativar. Como a tag nunca muda de
  setor, não há janela entre esta leitura e a escrita.

## `df-actions` — o que criar

### `app/_lib/actions/tags.ts` (novo, `"use server"`)

Mesmo formato de `app/_lib/actions/departments.ts`.

```ts
export type TagErrorCode =
  | "INVALID_INPUT"
  | "FORBIDDEN"
  | "NAME_TAKEN"
  | "NOT_FOUND"
  | "DEPARTMENT_INACTIVE"

export interface TagActionSuccess {
  ok: true
  message: string
}

export interface TagActionFailure {
  ok: false
  message: string
  code?: TagErrorCode
}

export type TagActionResult = TagActionSuccess | TagActionFailure

export const createTag: (input: CreateTagInput) => Promise<TagActionResult>
export const renameTag: (input: RenameTagInput) => Promise<TagActionResult>
export const setTagActive: (
  input: SetTagActiveInput,
) => Promise<TagActionResult>
```

Sequência:

1. `const access = await getRegistryAccess()`; `!hasRegistryAccess(access)` →
   `FORBIDDEN`, **antes** do parse.
2. `<schema>.safeParse(input)`; inválido → `INVALID_INPUT` com a primeira
   `issue.message`.
3. Autorização por setor:
   - `createTag`: `canManageTagsOf(access, data.departmentId)`; `false` →
     `FORBIDDEN` (admin mandando setor alheio).
   - `renameTag` e `setTagActive`: `const departmentId = await
findTagDepartment(data.id)`; `null` → `NOT_FOUND`;
     `!canManageTagsOf(access, departmentId)` → `FORBIDDEN`. O setor vem do banco,
     nunca do input.
4. Função de dados em `try/catch` (inclui `findTagDepartment`); exceção →
   `console.error("[<action>]", error)` e falha inesperada, sem `code`.
5. Traduz o `Outcome`; sucesso → `revalidatePath(TAGS_REGISTRY_PATH)` e
   `{ ok: true, message }`.

| Situação                               | `code`                | Mensagem                                                     |
| -------------------------------------- | --------------------- | ------------------------------------------------------------ |
| tag criada                             | —                     | `Tag criada.`                                                |
| tag renomeada                          | —                     | `Tag renomeada.`                                             |
| tag ativada                            | —                     | `Tag ativada.`                                               |
| tag desativada                         | —                     | `Tag desativada.`                                            |
| sem acesso ou setor alheio             | `FORBIDDEN`           | `Você não tem permissão para gerenciar as tags deste setor.` |
| schema falhou                          | `INVALID_INPUT`       | primeira `issue.message` do Zod                              |
| `name_taken`                           | `NAME_TAKEN`          | `describeTagNameTaken(outcome.existingIsActive)`             |
| `not_found` / `findTagDepartment` null | `NOT_FOUND`           | `Tag não encontrada.`                                        |
| `department_not_found`                 | `NOT_FOUND`           | `Setor não encontrado.`                                      |
| `department_inactive`                  | `DEPARTMENT_INACTIVE` | `TAG_DEPARTMENT_INACTIVE_MESSAGE`                            |
| falha inesperada                       | —                     | `Não foi possível salvar a tag agora. Tente novamente.`      |

Nenhuma action lê o `Actor` para decidir setor nem escreve SQL.

## `df-ui` — o que criar e mudar

### Primitivo

- `npx shadcn@latest add select` — depois, trocar o import do `cn` para
  `@/app/_lib/utils`.

### `app/(app)/layout.tsx` (alterado)

- Troca `getIsDirector()` por `getRegistryAccess()` (no mesmo `Promise.all`).
- Passa `registryItems={registryNavItemsFor(access)}` para `AppSidebar`.

### Sidebar — `app/(app)/_components/`

- `AppSidebar`: prop `isDirector` sai; entra `registryItems: RegistryNavItem[]`.
  "Cadastros" aparece quando `registryItems.length > 0`.
- `RegistryNav` (`registry-nav.tsx`): recebe `items: RegistryNavItem[]`; cada
  item é um `Link` para `item.href`, com `aria-current="page"` na seção atual.
  `key` = `item.section`. O grupo abre por padrão quando `pathname` está em
  algum `item.href`.

### `app/(app)/registry/layout.tsx` (alterado)

- `await requireRegistryAccess()` no lugar de `requireDirector()`.

### `app/(app)/registry/departments/page.tsx` (alterado)

- Passa a chamar `await requireDirector()` antes de `listDepartments()`. Admin de
  setor agora passa pelo layout; sem isso, ele veria Setores.

### `app/(app)/registry/tags/page.tsx` (novo, Server Component)

```ts
const access = await requireRegistryAccess()
const isDirector = isDirectorAccess(access)
const [tags, departmentOptions] = await Promise.all([
  listTags(tagScopeFor(access)),
  isDirector ? listDepartmentOptions() : Promise.resolve([]),
])
```

- Título "Tags". Botão "Nova tag".
- Passa `tags`, `isDirector`, `departmentOptions` e, para o admin,
  `access.departmentId` (setor fixo) aos componentes.
- Nome do setor do admin no subtítulo, se desejado: `findUserProfile` já dá
  `departmentName`; não é obrigatório.

### `app/(app)/registry/tags/_components/` (novo)

- Tabela com `DataTable` de `app/_components/data-table/`. Colunas: **Nome**,
  **Setor** (só diretor; `DepartmentName` com badge "Setor inativo" quando
  `!departmentIsActive`), **Status** (`ActiveStatusBadge`),
  **Chamados** (`ticketCount`), **Criado em** (`formatDate` de
  `@/app/_lib/date`), **Ações**.
- Busca por nome (filtro de coluna `includesString`, como Setores).
- Filtros pela prop `filters` do `DataTable` (botão "Filtros" com popover de
  checkboxes; API em "Peças compartilhadas" de
  `docs/contracts/registry-people.md`). As colunas `departmentId` e `isActive`
  usam `filterFn: "inValues"`.
  - Diretor: grupo **Setor** (`columnId: "departmentId"`, opções de
    `departmentOptions` na ordem recebida, Diretoria primeiro e Não alocado por
    último, `value: String(option.id)`, rótulo de `departmentOptionLabel`) e
    grupo **Status** (`activeStatusFilter`).
  - Admin de setor: só **Status**.
  - Nenhuma opção marcada no grupo = grupo sem filtro. Dentro do grupo as opções
    somam (OU); entre grupos, todas precisam bater (E).
- Formulário criar/renomear: React Hook Form + `zodResolver`.
  - Criar, diretor: `createTagSchema`, campo `departmentId` em `Select` com
    `tagCreationDepartments(departmentOptions)`, convertendo com `Number(value)`.
  - Criar, admin: `createTagSchema` com `departmentId` fixo em `defaultValues`
    (`access.departmentId`), sem campo visível.
  - Renomear: só `name` no formulário (valide com `renameTagSchema.pick({ name: true })`
    ou `createTagSchema.pick({ name: true })`); o `id` vem da linha; a action
    valida o input completo com `renameTagSchema`.
  - `NAME_TAKEN` → erro no campo `name` com `result.message`; resto → toast.
- Ativar/desativar: desativar com `AlertDialog` de confirmação ("a tag deixa de
  ser oferecida em chamados novos; chamados existentes não mudam"). "Ativar"
  desabilitado quando `!departmentIsActive`, explicando com
  `TAG_DEPARTMENT_INACTIVE_MESSAGE`. A action continua sendo a autoridade.
- Ações por linha (`tag-row-actions.tsx`) em `RegistryRowActions`, com os slots
  `rename` (`fit`, `TagFormDialog mode="rename"`) e `status` (`md`,
  `DeactivateRegistryDialog` ou `ReactivateRegistryButton`).
- Client Components não importam `@/db/*`, `drizzle-orm`, `app/_lib/data` nem
  `app/_lib/auth`.

## Riscos

1. **Migration com duplicatas.** Se o banco de alguém tiver ativa e inativa com o
   mesmo nome no mesmo setor, o `CREATE UNIQUE INDEX` falha. O Neon foi checado e
   está limpo; banco local recriado pelo seed não tem tags.
2. **Admin em setor inativo.** Um admin ativo num setor inativo (só acontece por
   corrida ou SQL manual, já que desativar exige setor sem pessoas ativas) mantém
   acesso: vê e pode renomear/desativar as tags, mas não criar nem reativar.
   Aceito.
3. **Tag em chamado futuro.** A feature de chamados precisa oferecer só tags
   ativas de setor ativo; o índice agora completo não muda isso.
4. **Admin sondando ids.** Id inexistente dá `NOT_FOUND`, id de outro setor dá
   `FORBIDDEN`: um admin distingue os dois. Aceito; não revela nome nem setor.
5. **Custo.** Continua uma consulta de acesso por request em `(app)`; a de
   `director.ts` deixa de existir.

## Checklist de encerramento da feature

- [ ] `getRegistryAccess`, `requireRegistryAccess` em `app/_lib/auth/registry-access.ts`; `director.ts` derivado deles (`df-auth`)
- [ ] `listTags`, `insertTag`, `updateTagName`, `updateTagActive`, `findTagDepartment` em `app/_lib/data/tags.ts`; `listDepartmentOptions` em `app/_lib/data/departments.ts` (`df-data`)
- [ ] `createTag`, `renameTag`, `setTagActive` em `app/_lib/actions/tags.ts` (`df-actions`)
- [ ] sidebar por acesso; `/registry` com `requireRegistryAccess`; `/registry/departments` com `requireDirector`; `/registry/tags` completa (`df-ui`)
- [ ] membro comum: sem "Cadastros" e 404 em `/registry/tags` e `/registry/departments` (`df-debug`)
- [ ] admin de setor: vê Pessoas e Tags; 404 em `/registry/departments`; tabela só do setor dele, sem coluna nem filtro de setor (`df-debug`)
- [ ] admin forjando `departmentId` na criação ou `id` de tag alheia → `FORBIDDEN` (`df-debug`)
- [ ] nome repetido no setor (outra caixa, inclusive inativa) → `NAME_TAKEN` com a mensagem certa; mesmo nome em outro setor é aceito (`df-debug`)
- [ ] criar ou reativar em setor inativo → `DEPARTMENT_INACTIVE` (`df-debug`)
- [ ] rebaixar o admin para membro tira "Cadastros" na próxima navegação, sem novo login (`df-debug`)
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm run build`
