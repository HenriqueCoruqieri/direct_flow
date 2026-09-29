# Contrato — Cadastros → Pessoas

Entrada das ondas 1 e 2. Plano em `docs/plans/registry-people.md`, que manda nas
decisões. Senha padrão em `docs/adr/012-default-password-with-mandatory-change.md`;
revogação de sessão em `docs/adr/003-is-active-check-on-open-session.md`;
Diretoria e Não alocado em `docs/adr/011-board-department-with-global-power.md`.
Padrões de tabela, formulário e resultado de action reusados de
`docs/contracts/registry-tags.md`.

Versões observadas: `next@16.3.5`, `better-auth@1.7.5`, `drizzle-orm@0.45.2`,
`zod@4.6.5`, `@tanstack/react-table@9`.

## Decisões fixadas pelo usuário (resumo do plano)

| Tema            | Decisão                                                                                                                                                                                                                                                                        |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Cadastro        | Nome, e-mail, setor (sempre setor real, nunca o Não alocado), papel. Sem exclusão. Sem convite nem e-mail ao criar ou restaurar senha                                                                                                                                          |
| Senha           | Nasce com `DEFAULT_USER_PASSWORD` e `must_change_password = true`. Troca obrigatória em `/set-password` (nova + confirmação, 8–128, diferente da padrão, sem senha atual). "Restaurar senha padrão" volta à padrão, liga a flag e revoga as sessões                            |
| Não alocado     | Setor com `is_unassigned`: único, sempre ativo, nunca Diretoria. Criado pela migration com o nome "Não alocado". Pode ser renomeado, não pode ser desativado, não tem tags. Ninguém é criado nele; só recebe gente movida. Quem está nele loga normalmente                     |
| Diretor         | Gerencia qualquer pessoa. Só ele concede/retira admin. Diretoria ⇒ sempre admin (forçado). Ao tirar alguém da Diretoria, escolhe o novo papel                                                                                                                                  |
| Admin de setor  | Só pessoas `member` do próprio setor ou do Não alocado: edita nome/e-mail, move entre o próprio setor e o Não alocado, desativa/reativa, restaura senha. Cria só membros, só no próprio setor. Não vê papel. Lista mostra o próprio setor e o Não alocado; ações só em membros |
| Acesso suspenso | Admin no Não alocado e quem tem `must_change_password` → `RegistryAccess = none`                                                                                                                                                                                               |
| Travas          | Ninguém desativa a si mesmo. Nunca desativar nem tirar da Diretoria o último diretor ativo (recontagem na transação). Admin forjando alvo fora do alcance → `FORBIDDEN`                                                                                                        |
| Sessão          | Desativar revoga as sessões na hora (ADR 003). Cookie velho custa um salto para `/login` (ADR 008)                                                                                                                                                                             |
| E-mail          | Nenhum                                                                                                                                                                                                                                                                         |

## Tabelas e migration

### `department` (`db/schema.ts`, alterado)

| Coluna / restrição                 | Definição                                                                   |
| ---------------------------------- | --------------------------------------------------------------------------- |
| `is_unassigned`                    | `boolean not null default false` — carimbo do setor Não alocado             |
| `department_single_unassigned_idx` | `unique index on (is_unassigned) where is_unassigned` — no máximo um        |
| `department_unassigned_active`     | `check (not is_unassigned or is_active)` — nunca fica inativo               |
| `department_board_not_unassigned`  | `check (not (is_board and is_unassigned))` — não é Diretoria ao mesmo tempo |

Tipo Drizzle: `Department` ganha `isUnassigned: boolean`. O setor é reconhecido
**pelo carimbo**, nunca pelo nome: `UNASSIGNED_DEPARTMENT_NAME` só existe para
documentar o nome inicial.

### `users` (`db/schema.ts`, alterado)

| Coluna                 | Definição                        |
| ---------------------- | -------------------------------- |
| `must_change_password` | `boolean not null default false` |

Tem default, então a validação de schema do Better Auth tolera a coluna. Não entra
em `additionalFields`: é lida por consulta própria em `app/_lib/auth/`, nunca pela
sessão.

### Migrations (quem aplica, `npm run db:migrate`, é o usuário)

`db/migrations/0005_people_registry.sql` — gerada por `drizzle-kit generate --name people_registry`:

```sql
ALTER TABLE "department" ADD COLUMN "is_unassigned" boolean DEFAULT false NOT NULL;
ALTER TABLE "users" ADD COLUMN "must_change_password" boolean DEFAULT false NOT NULL;
CREATE UNIQUE INDEX "department_single_unassigned_idx" ON "department" USING btree ("is_unassigned") WHERE is_unassigned;
ALTER TABLE "department" ADD CONSTRAINT "department_unassigned_active" CHECK (not is_unassigned or is_active);
ALTER TABLE "department" ADD CONSTRAINT "department_board_not_unassigned" CHECK (not (is_board and is_unassigned));
```

`db/migrations/0006_unassigned_department.sql` — migration **custom**
(`drizzle-kit generate --custom --name unassigned_department`), o jeito previsto
pelo drizzle-kit para SQL de dados; o SQL gerado da `0005` não foi tocado:

```sql
INSERT INTO "department" ("name", "is_active", "is_board", "is_unassigned")
SELECT 'Não alocado', true, false, true
WHERE NOT EXISTS (SELECT 1 FROM "department" WHERE "is_unassigned");
```

Idempotente pelo carimbo. Se já existir um setor comum chamado "Não alocado"
(qualquer caixa), o `INSERT` viola `department_name_lower_idx` e a migration
**falha** — de propósito, para não carimbar setor alheio. O Neon tem só Diretoria,
P&D, Suporte e Administrativo.

### Lidas pelo fluxo

- `users` — tudo acima, mais `image`, `last_login_at`, `created_at`
- `department` — `name`, `is_active`, `is_board`, `is_unassigned`
- `account` — `password` do registro `provider_id = 'credential'` (escrita em
  `app/_lib/data/people.ts`; leitura e verificação só em `app/_lib/auth/`)
- `session` — apagada por `revokeUserSessions` (só `app/_lib/auth/`)

## Tipos — `app/_lib/types/`

### `app/_lib/types/person.ts` (novo)

```ts
export interface PersonManagementFacts {
  role: Role
  departmentId: number
  departmentIsUnassigned: boolean
}

export interface PersonListItem extends PersonManagementFacts {
  id: number
  name: string
  email: string
  image: string | null
  departmentName: string
  departmentIsBoard: boolean
  departmentIsActive: boolean
  isActive: boolean
  lastLoginAt: Date | null
  createdAt: Date
}

export interface ManagedPerson extends PersonManagementFacts {
  id: number
  isActive: boolean
  departmentIsActive: boolean
  departmentIsBoard: boolean
}

export interface PersonDepartmentFacts {
  id: number
  isActive: boolean
  isBoard: boolean
  isUnassigned: boolean
}

export interface AllPeopleScope {
  kind: "all"
}

export interface ManagedDepartmentPeopleScope {
  kind: "department_and_unassigned"
  departmentId: number
}

export type PersonListScope = AllPeopleScope | ManagedDepartmentPeopleScope

export interface PersonPlacementRequest {
  departmentId: number
  role?: Role
}

export type PersonDenialReason =
  | "FORBIDDEN"
  | "DEPARTMENT_NOT_FOUND"
  | "DEPARTMENT_INACTIVE"
  | "DEPARTMENT_UNASSIGNED"
  | "SELF_DEACTIVATION"
  | "SELF_PASSWORD_RESTORE"

export interface PersonActionDenied {
  ok: false
  reason: PersonDenialReason
}

export interface PersonActionAllowed {
  ok: true
}

export type PersonActionCheck = PersonActionAllowed | PersonActionDenied

export interface PersonPlacementAllowed {
  ok: true
  role: Role
  departmentId: number
  departmentChanged: boolean
}

export type PersonPlacementDecision =
  PersonPlacementAllowed | PersonActionDenied

export interface InsertPersonValues {
  name: string
  email: string
  role: Role
  departmentId: number
  passwordHash: string
}

export interface UpdatePersonValues {
  id: number
  name: string
  email: string
  role: Role
  departmentId: number
}

export interface PersonSaved {
  status: "saved"
  id: number
}
export interface PersonEmailTaken {
  status: "email_taken"
}
export interface PersonNotFound {
  status: "not_found"
}
export interface PersonDepartmentInactive {
  status: "department_inactive"
}
export interface PersonLastDirector {
  status: "last_director"
}

export type InsertPersonOutcome =
  PersonSaved | PersonEmailTaken | PersonDepartmentInactive
export type UpdatePersonOutcome =
  | PersonSaved
  | PersonEmailTaken
  | PersonNotFound
  | PersonDepartmentInactive
  | PersonLastDirector
export type UpdatePersonActiveOutcome =
  PersonSaved | PersonNotFound | PersonDepartmentInactive | PersonLastDirector
export type ResetPersonPasswordOutcome = PersonSaved | PersonNotFound
```

- `PersonManagementFacts` é o mínimo que `canManagePerson` precisa; tanto a linha
  da tabela (`PersonListItem`) quanto o registro carregado pela action
  (`ManagedPerson`) a satisfazem. A UI e a action decidem com a **mesma** função.
- `PersonPlacementRequest` é satisfeito por `CreatePersonInput` e
  `UpdatePersonInput` (o domínio não importa `validation/`).
- `departmentChanged` é sempre `true` na criação.
- Outcomes seguem o padrão de setores/tags: conflito e ausência são resultado;
  exceção só para falha inesperada.

### `app/_lib/types/account.ts` (novo)

```ts
export interface AccountState {
  isActive: boolean
  mustChangePassword: boolean
}
```

### `app/_lib/types/registry.ts` (alterado)

`RegistryAccessFacts` ganha `isUnassigned: boolean` (do setor) e
`mustChangePassword: boolean` (da pessoa). O resto não muda.

### `app/_lib/types/department.ts` (alterado)

```ts
export interface DepartmentStamps {
  isBoard: boolean
  isUnassigned: boolean
}

export interface DepartmentListItem {
  /* ... */ isUnassigned: boolean /* novo */
}
export interface DepartmentDependencies extends DepartmentStamps {
  activeUsers: number
  openTickets: number
}
export type DepartmentDeactivationBlockReason =
  "IS_BOARD" | "IS_UNASSIGNED" | "HAS_ACTIVE_USERS" | "HAS_OPEN_TICKETS"
export interface DepartmentOption extends DepartmentStamps {
  id: number
  name: string
  isActive: boolean
}
```

### `app/_lib/types/tag.ts` (alterado)

```ts
export interface TagDepartmentUnassigned {
  status: "department_unassigned"
}
export interface TagDepartmentFacts {
  isActive: boolean
  isUnassigned: boolean
}
export type TagDepartmentBlock = "department_inactive" | "department_unassigned"

export type InsertTagOutcome =
  | TagSaved
  | TagNameTaken
  | TagDepartmentNotFound
  | TagDepartmentInactive
  | TagDepartmentUnassigned
export type UpdateTagActiveOutcome =
  TagSaved | TagNotFound | TagDepartmentInactive | TagDepartmentUnassigned
```

## Domínio — `app/_lib/domain/`

### `app/_lib/domain/registry.ts` (alterado)

- `PEOPLE_REGISTRY_PATH = "/registry/people"` (novo). O item Pessoas do menu
  passa a ter `href: PEOPLE_REGISTRY_PATH` para diretor **e** admin de setor.
- `resolveRegistryAccess`, precedência nova:

| Condição (na ordem)                               | Resultado          |
| ------------------------------------------------- | ------------------ |
| `facts` nulo, `!isActive` ou `mustChangePassword` | `none`             |
| `isBoard`                                         | `director`         |
| `role === "admin"` e `!isUnassigned`              | `department_admin` |
| resto (membro; admin no Não alocado)              | `none`             |

### `app/_lib/domain/department.ts` (alterado)

```ts
export const UNASSIGNED_DEPARTMENT_NAME = "Não alocado"
export const BOARD_DEPARTMENT_BADGE = "Diretoria"
export const UNASSIGNED_DEPARTMENT_BADGE = "Não alocado"
export const departmentBadgeFor: (stamps: DepartmentStamps) => string | null
export const assignableDepartments: (
  options: readonly DepartmentOption[],
) => DepartmentOption[]
```

| Nome                                  | Semântica                                                                                           |
| ------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `departmentBadgeFor`                  | `isBoard` → `"Diretoria"`; `isUnassigned` → `"Não alocado"`; senão `null`. Badge de tabela e filtro |
| `assignableDepartments`               | Opções com `isActive && !isUnassigned`, na ordem recebida. Onde se **cria** pessoa ou tag           |
| `checkDepartmentDeactivation`         | Precedência nova: `IS_BOARD` → `IS_UNASSIGNED` → `HAS_ACTIVE_USERS` → `HAS_OPEN_TICKETS` → ok       |
| `describeDepartmentDeactivationBlock` | `IS_UNASSIGNED` → `O setor de pessoas não alocadas não pode ser desativado.`                        |

### `app/_lib/domain/tag.ts` (alterado)

```ts
export const TAG_DEPARTMENT_UNASSIGNED_MESSAGE: string
export const checkTagDepartment: (
  department: TagDepartmentFacts,
) => TagDepartmentBlock | null
```

- `checkTagDepartment`: `isUnassigned` → `"department_unassigned"`; `!isActive` →
  `"department_inactive"`; senão `null`. É **a** regra de "dá para criar ou
  reativar tag neste setor"; a data layer a aplica dentro da transação.
- `tagCreationDepartments` passa a ser `assignableDepartments`: o Não alocado
  some do select de criação.
- Texto: `O setor de pessoas não alocadas não tem tags. Não é possível criar nem reativar tags nele.`

### `app/_lib/domain/user.ts` (acrescido)

```ts
export const ROLES = ["admin", "member"] as const satisfies readonly Role[]
```

Fonte do `z.enum` de papel e da lista do select. `ROLE_LABELS` não muda.

### `app/_lib/domain/person.ts` (novo)

```ts
export const NEVER_ACCESSED_LABEL = "Nunca acessou"
export const PERSON_DENIAL_MESSAGES: Record<PersonDenialReason, string>
export const LAST_DIRECTOR_MESSAGE: string

export const personScopeFor: (access: GrantedRegistryAccess) => PersonListScope
export const canManagePerson: (
  access: RegistryAccess,
  person: PersonManagementFacts,
) => boolean
export const canAssignRole: (access: RegistryAccess) => boolean
export const forcedRoleFor: (department: DepartmentStamps) => Role | null
export const personCreationDepartments: (
  options: readonly DepartmentOption[],
) => DepartmentOption[]
export const personMoveDepartments: (
  access: GrantedRegistryAccess,
  options: readonly DepartmentOption[],
  currentDepartmentId: number,
) => DepartmentOption[]
export const decidePersonCreation: (
  access: RegistryAccess,
  request: PersonPlacementRequest,
  department: PersonDepartmentFacts | null,
) => PersonPlacementDecision
export const decidePersonUpdate: (
  access: RegistryAccess,
  person: ManagedPerson,
  request: PersonPlacementRequest,
  department: PersonDepartmentFacts | null,
) => PersonPlacementDecision
export const checkPersonActivation: (
  access: RegistryAccess,
  actorId: number,
  person: ManagedPerson,
  isActive: boolean,
) => PersonActionCheck
export const checkPasswordRestore: (
  access: RegistryAccess,
  actorId: number,
  person: ManagedPerson,
) => PersonActionCheck
```

| Nome                        | Semântica                                                                                                                                                                                                                                                                                                                                                     |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `personScopeFor`            | Diretor → `{ kind: "all" }`. Admin → `{ kind: "department_and_unassigned", departmentId }`                                                                                                                                                                                                                                                                    |
| `canManagePerson`           | Diretor → `true` (inclusive a si mesmo). Admin → `role === "member"` **e** (`departmentId` é o do acesso **ou** `departmentIsUnassigned`). `none` → `false`. Decide as ações da linha e autoriza na action                                                                                                                                                    |
| `canAssignRole`             | Só diretor. Decide se o campo Papel aparece                                                                                                                                                                                                                                                                                                                   |
| `forcedRoleFor`             | Setor `isBoard` → `"admin"`; senão `null`. A UI trava o select de papel quando não é `null`                                                                                                                                                                                                                                                                   |
| `personCreationDepartments` | `assignableDepartments`: ativos, sem o Não alocado. Select de criação do diretor                                                                                                                                                                                                                                                                              |
| `personMoveDepartments`     | Sempre inclui o setor atual. Diretor: + todos os ativos (Não alocado incluso). Admin: + o próprio setor e o Não alocado                                                                                                                                                                                                                                       |
| `decidePersonCreation`      | `none` → `FORBIDDEN`. Admin: `departmentId` ≠ o dele → `FORBIDDEN`; `role` presente e ≠ `member` → `FORBIDDEN`. Depois: setor nulo → `DEPARTMENT_NOT_FOUND`; Não alocado → `DEPARTMENT_UNASSIGNED`; inativo → `DEPARTMENT_INACTIVE`. Papel: diretor → `forcedRoleFor ?? role ?? "member"`; admin → `"member"`                                                 |
| `decidePersonUpdate`        | `!canManagePerson` → `FORBIDDEN`. Admin: destino tem de ser o próprio setor ou o Não alocado, senão `FORBIDDEN`; `role` ≠ `member` → `FORBIDDEN`. Setor nulo → `DEPARTMENT_NOT_FOUND`. Troca para setor inativo → `DEPARTMENT_INACTIVE` (ficar num setor inativo é permitido). Papel: diretor → `forcedRoleFor ?? role ?? person.role`; admin → `person.role` |
| `checkPersonActivation`     | `!canManagePerson` → `FORBIDDEN`; desativar a si mesmo → `SELF_DEACTIVATION`; reativar em setor inativo → `DEPARTMENT_INACTIVE`                                                                                                                                                                                                                               |
| `checkPasswordRestore`      | `!canManagePerson` → `FORBIDDEN`; a si mesmo → `SELF_PASSWORD_RESTORE`                                                                                                                                                                                                                                                                                        |

O "último diretor" **não** é regra de domínio: depende de contagem sob trava e mora
na data layer (`last_director`). `LAST_DIRECTOR_MESSAGE` é o texto.

| Chave / constante                              | Texto                                                                                                                 |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `PERSON_DENIAL_MESSAGES.FORBIDDEN`             | `Você não tem permissão para gerenciar esta pessoa.`                                                                  |
| `PERSON_DENIAL_MESSAGES.DEPARTMENT_NOT_FOUND`  | `Setor não encontrado.`                                                                                               |
| `PERSON_DENIAL_MESSAGES.DEPARTMENT_INACTIVE`   | `Este setor está inativo. Não é possível colocar nem reativar pessoas nele.`                                          |
| `PERSON_DENIAL_MESSAGES.DEPARTMENT_UNASSIGNED` | `Ninguém é cadastrado direto no setor de pessoas não alocadas. Escolha outro setor.`                                  |
| `PERSON_DENIAL_MESSAGES.SELF_DEACTIVATION`     | `Você não pode desativar a sua própria conta.`                                                                        |
| `PERSON_DENIAL_MESSAGES.SELF_PASSWORD_RESTORE` | `Para trocar a sua própria senha, use a página do seu perfil.`                                                        |
| `LAST_DIRECTOR_MESSAGE`                        | `Esta é a última pessoa ativa da Diretoria. Coloque outra pessoa na Diretoria antes de desativá-la ou tirá-la de lá.` |

## Validação — `app/_lib/validation/`

### `app/_lib/validation/person.ts` (novo)

```ts
export const PERSON_EMAIL_MAX_LENGTH = 254
export const personNameSchema // registryNameSchema("Informe o nome da pessoa.")
export const personEmailSchema // trim → toLowerCase → obrigatório → ≤ 254 → z.email
export const personRoleSchema // z.enum(ROLES)

export const createPersonSchema // { name, email, departmentId, role? }
export type CreatePersonInput = {
  name: string
  email: string
  departmentId: number
  role?: Role
}
export const updatePersonSchema // { id, name, email, departmentId, role? }
export type UpdatePersonInput = {
  id: number
  name: string
  email: string
  departmentId: number
  role?: Role
}
export const setPersonActiveSchema // { id, isActive }
export type SetPersonActiveInput = { id: number; isActive: boolean }
export const restorePersonPasswordSchema // { id }
export type RestorePersonPasswordInput = { id: number }
```

| Campo          | Regra                         | Mensagem                                                      |
| -------------- | ----------------------------- | ------------------------------------------------------------- |
| `name`         | ausente ou vazio após `trim`  | `Informe o nome da pessoa.`                                   |
| `name`         | < 2 / > 80 após `trim`        | `O nome precisa ter no mínimo 2 caracteres.` / `no máximo 80` |
| `email`        | ausente ou vazio              | `Informe o e-mail.`                                           |
| `email`        | > 254                         | `O e-mail precisa ter no máximo 254 caracteres.`              |
| `email`        | formato                       | `E-mail inválido.`                                            |
| `departmentId` | inteiro positivo              | `Selecione o setor.`                                          |
| `role`         | `admin` ou `member`, opcional | `Papel inválido.`                                             |
| `id`           | inteiro positivo              | `Pessoa inválida.`                                            |
| `isActive`     | boolean                       | `Situação inválida.`                                          |

- **O e-mail sai em minúsculas.** O Better Auth procura o usuário no login por
  igualdade com `email.toLowerCase()` (`internal-adapter.mjs`, `sign-in.mjs`):
  e-mail gravado com maiúscula nunca consegue entrar. Por isso o `toLowerCase`
  está no schema e a data layer grava `parsed.data.email`, nunca o input cru.
- `role` é opcional nos dois schemas: o formulário do admin não tem o campo. Quem
  decide o papel final é `decidePersonCreation`/`decidePersonUpdate`.
- `departmentId` é `number`, sem `coerce` (mesmo motivo de tags): a UI converte
  com `Number(value)` no `onValueChange` do select.
- Unicidade do e-mail não é checada no schema.

### `app/_lib/validation/password.ts` (acrescido)

```ts
export const SAME_AS_DEFAULT_PASSWORD_ERROR =
  "A nova senha precisa ser diferente da senha padrão."
export const definePasswordSchema // { newPassword, confirmPassword } + refine igualdade
export type DefinePasswordInput = {
  newPassword: string
  confirmPassword: string
}
```

Reusa `newPasswordField` (8–128) e `confirmPasswordField`; divergência →
`As senhas não conferem.` em `confirmPassword`. "Diferente da padrão" não cabe no
schema (a padrão não pode ir ao cliente): é checada em `defineInitialPassword`, e
`SAME_AS_DEFAULT_PASSWORD_ERROR` é o texto.

## `df-auth` — o que criar e mudar

### `app/_lib/auth/account-facts.ts` (novo)

```ts
export const getAccountFacts: () => Promise<RegistryAccessFacts | null>
```

- `cache` do React, sem argumentos: **uma** consulta por request, compartilhada
  por `getRegistryAccess`, `getAccountState` e `director.ts`.
- `getSession()`; sem sessão → `null`. Senão `select users.is_active, users.role,
users.department_id, users.must_change_password, department.is_board,
department.is_unassigned from users inner join department ... where users.id =
actor.id limit 1`; linha ausente → `null`. Só o `id` vem do cookie.

### `app/_lib/auth/registry-access.ts` (alterado, mesma API)

`getRegistryAccess` passa a ser `resolveRegistryAccess(await getAccountFacts())`.
A consulta própria sai. `requireRegistryAccess` não muda.

### `app/_lib/auth/account-state.ts` (novo)

```ts
export const getAccountState: () => Promise<AccountState | null>
export const requirePendingPasswordChange: () => Promise<Actor>
```

| Função                         | Sem sessão           | `mustChangePassword = false`              | `mustChangePassword = true`              |
| ------------------------------ | -------------------- | ----------------------------------------- | ---------------------------------------- |
| `getAccountState`              | `null`               | `{ isActive, mustChangePassword: false }` | `{ isActive, mustChangePassword: true }` |
| `requirePendingPasswordChange` | `redirect("/login")` | `redirect("/dashboard")`                  | devolve `Actor`                          |

`requirePendingPasswordChange` com pessoa inativa → `redirect("/login")`.

### `app/_lib/auth/default-password.ts` (novo)

```ts
export type InitialPasswordFailure =
  "NOT_REQUIRED" | "SAME_AS_DEFAULT" | "USER_DEACTIVATED"

export type DefineInitialPasswordInput = Pick<
  DefinePasswordInput,
  "newPassword"
>

export const hashDefaultPassword: () => Promise<string | null>
export const defineInitialPassword: (
  input: DefineInitialPasswordInput,
) => Promise<InitialPasswordFailure | null>
```

**`hashDefaultPassword()`**

- Lê `process.env.DEFAULT_USER_PASSWORD`. Ausente ou vazia → `null` (a action
  traduz em `DEFAULT_PASSWORD_MISSING`). Senão
  `(await auth.$context).password.hash(valor)` — o hash que o login verifica
  (por padrão, `hashPassword` de `better-auth/crypto`, o mesmo do seed).
- Único lugar do projeto que lê a variável. O valor nunca sai desta função.

**`defineInitialPassword({ newPassword })`**

1. `requireSession()`; `getAccountFacts()` fresco. `!isActive` →
   `USER_DEACTIVATED`; `!mustChangePassword` → `NOT_REQUIRED`.
2. `ctx.internalAdapter.findCredentialAccount(String(actor.id))`; se houver
   `password` e `ctx.password.verify({ hash, password: newPassword })` for
   verdadeiro → `SAME_AS_DEFAULT`. Compara com o hash **gravado** (a padrão que a
   pessoa recebeu), não com a variável: funciona mesmo se a variável mudou ou
   sumiu depois.
3. `auth.api.revokeOtherSessions({ headers: await headers() })` — antes de
   gravar: quem entrou com a senha padrão em outro lugar cai.
4. `db.transaction`: `update account set password = <hash novo>, updated_at
where user_id = $1 and provider_id = 'credential'`; `update users set
must_change_password = false, updated_at where id = $1 and
must_change_password returning id` — zero linhas → `NOT_REQUIRED` (outra aba
   já definiu) e a transação é desfeita.
5. `null` em sucesso. A sessão atual continua valendo. Exceção do Better Auth
   ou do banco sobe para a action.

Auth grava `users.must_change_password` e `account.password` direto em `@/db`:
é estado de identidade da própria pessoa (seção 2 do `stack.md`).

### `app/_lib/auth/session.ts` (acrescido)

```ts
export const revokeUserSessions: (userId: number) => Promise<void>
```

`(await auth.$context).internalAdapter.deleteUserSessions(String(userId))`.
Apaga todas as sessões da pessoa. Erro sobe para a action.

### `app/_lib/auth/auth.ts` (alterado)

- `emailAndPassword.onPasswordReset: async ({ user }) => …` →
  `update users set must_change_password = false, updated_at where id =
Number(user.id)`. Quem redefiniu por e-mail já não usa a senha padrão.

### `app/_lib/auth/director.ts` — sem mudança de API

Continua derivando de `getRegistryAccess()`; passa a compartilhar a consulta de
`getAccountFacts`.

### Tela `/set-password` (`app/(auth)/set-password/`, dono `df-auth`)

- `page.tsx` (Server Component): `await requirePendingPasswordChange()`. Título
  "Defina sua senha"; texto explicando que é o primeiro acesso (ou que a senha foi
  restaurada) e que a senha padrão não vale mais depois disso.
- `_components/set-password-form.tsx` (Client): React Hook Form +
  `zodResolver(definePasswordSchema)`, campos **Nova senha** e **Confirmar nova
  senha**, sem senha atual. Chama `definePassword`. `code === "SAME_AS_DEFAULT"`
  → erro no campo `newPassword`; `INVALID_INPUT` → erro no campo; resto → toast.
  Botão secundário "Sair" ligado a `signOut` (`app/_lib/actions/auth.ts`).
- Não entra em `publicRoutes` do `proxy.ts`: exige cookie como qualquer rota
  protegida. O proxy não muda.

## `df-data` — o que criar e mudar

### `app/_lib/data/people.ts` (novo)

```ts
export function isPersonEmailTakenError(error: unknown): boolean
export async function listPeople(
  scope: PersonListScope,
): Promise<PersonListItem[]>
export async function findManagedPerson(
  id: number,
): Promise<ManagedPerson | null>
export async function findPersonDepartment(
  departmentId: number,
): Promise<PersonDepartmentFacts | null>
export async function insertPerson(
  values: InsertPersonValues,
): Promise<InsertPersonOutcome>
export async function updatePersonRecord(
  values: UpdatePersonValues,
): Promise<UpdatePersonOutcome>
export async function updatePersonActive(
  id: number,
  isActive: boolean,
): Promise<UpdatePersonActiveOutcome>
export async function resetPersonPassword(
  id: number,
  passwordHash: string,
): Promise<ResetPersonPasswordOutcome>
```

Nomes não repetem os das actions (`updatePerson` é action; a de dados é
`updatePersonRecord`).

**`isPersonEmailTakenError`** — `isUniqueViolation(error, "user_email_lower_idx")`
de `app/_lib/data/db-errors.ts`.

**`listPeople(scope)`**

- `users inner join department`. `"all"` → sem filtro;
  `"department_and_unassigned"` → `where users.department_id = $1 or
department.is_unassigned`.
- Ativos e inativos, todos os papéis (a UI decide ações por linha).
- Ordem: `lower(users.name)`, `users.id`.

**`findManagedPerson(id)`** — `users` + `department` (`is_active`, `is_board`,
`is_unassigned`) sem trava. `null` se não existe.

**`findPersonDepartment(departmentId)`** — `id`, `is_active`, `is_board`,
`is_unassigned`. `null` se não existe.

**`insertPerson(values)`** — numa transação:

1. `select is_active from department where id = $1 for share`; inativo →
   `department_inactive` (a action já decidiu o resto; isto só fecha a corrida
   com a desativação do setor, como em `insertTag`).
2. `insert into users (name, email, role, department_id, must_change_password)
values (…, true) returning id`. `email_verified` e `is_active` no default.
3. `insert into account (account_id, provider_id, user_id, password, created_at,
updated_at)` com `accountId: String(id)`, `providerId: "credential"`,
   `password: values.passwordHash` — exatamente como `db/seed.ts`. `account` vem
   de `@/db/auth-schema`.
4. `saved`. Violação de `user_email_lower_idx` (capturada fora da transação) →
   `email_taken`.

**`updatePersonRecord(values)`** — numa transação:

1. `select users.department_id, users.is_active, department.is_board from users
join department … where users.id = $1 for update of users`. Nada → `not_found`.
2. Se a pessoa está **ativa**, na Diretoria, e `values.departmentId` é outro setor:
   `select id from department where is_board for update` (serializa quem mexe na
   Diretoria) e conta `users` ativos da Diretoria com `id <> $1`. Zero →
   `last_director`, sem `update`.
3. Se `values.departmentId` mudou: `select is_active from department where id =
$2 for share`; inativo → `department_inactive`.
4. `update users set name, email, role, department_id, updated_at where id`.
   `saved`. Violação de `user_email_lower_idx` → `email_taken`.

**`updatePersonActive(id, isActive)`** — numa transação:

1. Mesma leitura com `for update of users`, trazendo `department.is_active` e
   `is_board`. Nada → `not_found`.
2. `isActive === false`, pessoa ativa e setor `is_board`: trava a Diretoria
   `for update` e conta os outros ativos dela; zero → `last_director`.
3. `isActive === true`: `select is_active from department where id = <setor> for
share`; inativo → `department_inactive`.
4. `update users set is_active, deactivated_at = case when $isActive then null
else coalesce(deactivated_at, now()) end, updated_at`. Mesmo valor não é erro:
   `saved` (é o que torna repetir a desativação seguro).

**`resetPersonPassword(id, passwordHash)`** — numa transação:

1. `update users set must_change_password = true, updated_at where id = $1
returning id`; nada → `not_found`.
2. `update account set password = $2, updated_at where user_id = $1 and
provider_id = 'credential' returning id`; nada → `insert` da conta credencial
   como em `insertPerson`.
3. `saved`.

`app/_lib/data/people.ts` escreve em `account` por decisão do ADR 012
(atomicidade com `users`). Não lê nem verifica senha.

### `app/_lib/data/departments.ts` (alterado)

- `listDepartments` e `listDepartmentOptions` selecionam `isUnassigned`. Ordem
  nova das duas: `is_board desc`, `is_unassigned asc`, `lower(name)`, `id` —
  Diretoria primeiro, Não alocado por último.
- `updateDepartmentActive` lê `is_unassigned` junto com `is_board` (`for update`)
  e passa os dois para `checkDepartmentDeactivation`.

### `app/_lib/data/tags.ts` (alterado)

- `insertTag`: a leitura `for share` do setor traz `is_active` **e**
  `is_unassigned`; `checkTagDepartment(row)` não nulo → devolve
  `{ status: block }` (`department_inactive` ou `department_unassigned`).
- `updateTagActive` (reativação): mesma troca no passo do setor.

## `df-actions` — o que criar e mudar

### `app/_lib/actions/people.ts` (novo, `"use server"`)

```ts
export type PersonErrorCode =
  | "INVALID_INPUT"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "EMAIL_TAKEN"
  | "DEPARTMENT_INACTIVE"
  | "DEPARTMENT_UNASSIGNED"
  | "LAST_DIRECTOR"
  | "SELF_DEACTIVATION"
  | "SELF_PASSWORD_RESTORE"
  | "DEFAULT_PASSWORD_MISSING"
  | "SESSION_REVOKE_FAILED"

export interface PersonActionSuccess {
  ok: true
  message: string
}

export interface PersonActionFailure {
  ok: false
  message: string
  code?: PersonErrorCode
}

export type PersonActionResult = PersonActionSuccess | PersonActionFailure

export const createPerson: (
  input: CreatePersonInput,
) => Promise<PersonActionResult>
export const updatePerson: (
  input: UpdatePersonInput,
) => Promise<PersonActionResult>
export const setPersonActive: (
  input: SetPersonActiveInput,
) => Promise<PersonActionResult>
export const restorePersonPassword: (
  input: RestorePersonPasswordInput,
) => Promise<PersonActionResult>
```

Sequência comum:

1. `const access = await getRegistryAccess()`; `!hasRegistryAccess(access)` →
   `FORBIDDEN`, antes do parse. (`setPersonActive` e `restorePersonPassword`
   também chamam `requireSession()` para ter `actor.id`.)
2. `safeParse`; inválido → `INVALID_INPUT` com a primeira `issue.message`.
3. Tudo que toca dados/auth em `try/catch`; exceção →
   `console.error("[<action>]", error)` e falha inesperada, sem `code`.
4. Sucesso → `revalidatePath("/(app)", "layout")` (nome e setor aparecem na
   sidebar da pessoa e nas contagens de Setores) e `{ ok: true, message }`.

**`createPerson`**: `findPersonDepartment(data.departmentId)` →
`decidePersonCreation(access, data, department)`; negado → código = `reason`.
Depois `hashDefaultPassword()`; `null` → `DEFAULT_PASSWORD_MISSING`. Depois
`insertPerson({ name, email, role: decision.role, departmentId:
decision.departmentId, passwordHash })`.

**`updatePerson`**: `findManagedPerson(data.id)` → `null` → `NOT_FOUND`;
`findPersonDepartment(data.departmentId)`; `decidePersonUpdate(access, person,
data, department)`; `updatePersonRecord({ id, name, email, role: decision.role,
departmentId: decision.departmentId })`.

**`setPersonActive`**: `findManagedPerson` → `NOT_FOUND`;
`checkPersonActivation(access, actor.id, person, data.isActive)`;
`updatePersonActive`. Se desativou (`saved` e `isActive === false`):
`revokeUserSessions(data.id)`; exceção → `revalidatePath` e
`SESSION_REVOKE_FAILED`.

**`restorePersonPassword`**: `findManagedPerson` → `NOT_FOUND`;
`checkPasswordRestore(access, actor.id, person)`; `hashDefaultPassword()` →
`null` → `DEFAULT_PASSWORD_MISSING`; `resetPersonPassword(id, hash)`;
`revokeUserSessions(id)`; exceção → `SESSION_REVOKE_FAILED`.

Nenhuma action decide setor ou papel por conta própria: quem decide é o domínio,
sobre o registro carregado do banco. Nenhuma escreve SQL nem lê
`DEFAULT_USER_PASSWORD`.

| Situação                                      | `code`                     | Mensagem                                                                                                                                                                                                                                                           |
| --------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| pessoa criada                                 | —                          | `Pessoa cadastrada. No primeiro acesso ela vai definir a própria senha.`                                                                                                                                                                                           |
| pessoa atualizada                             | —                          | `Dados atualizados.`                                                                                                                                                                                                                                               |
| pessoa desativada                             | —                          | `Pessoa desativada. As sessões abertas dela foram encerradas.`                                                                                                                                                                                                     |
| pessoa reativada                              | —                          | `Pessoa reativada.`                                                                                                                                                                                                                                                |
| senha restaurada                              | —                          | `Senha restaurada para a padrão. A pessoa vai definir uma nova no próximo acesso.`                                                                                                                                                                                 |
| sem acesso / negado por alcance               | `FORBIDDEN`                | `PERSON_DENIAL_MESSAGES.FORBIDDEN`                                                                                                                                                                                                                                 |
| schema falhou                                 | `INVALID_INPUT`            | primeira `issue.message`                                                                                                                                                                                                                                           |
| pessoa inexistente / `not_found`              | `NOT_FOUND`                | `Pessoa não encontrada.`                                                                                                                                                                                                                                           |
| `DEPARTMENT_NOT_FOUND` (domínio)              | `NOT_FOUND`                | `PERSON_DENIAL_MESSAGES.DEPARTMENT_NOT_FOUND`                                                                                                                                                                                                                      |
| `email_taken`                                 | `EMAIL_TAKEN`              | `Já existe uma pessoa com esse e-mail.`                                                                                                                                                                                                                            |
| `DEPARTMENT_INACTIVE` / `department_inactive` | `DEPARTMENT_INACTIVE`      | `PERSON_DENIAL_MESSAGES.DEPARTMENT_INACTIVE`                                                                                                                                                                                                                       |
| `DEPARTMENT_UNASSIGNED`                       | `DEPARTMENT_UNASSIGNED`    | `PERSON_DENIAL_MESSAGES.DEPARTMENT_UNASSIGNED`                                                                                                                                                                                                                     |
| `last_director`                               | `LAST_DIRECTOR`            | `LAST_DIRECTOR_MESSAGE`                                                                                                                                                                                                                                            |
| `SELF_DEACTIVATION`                           | `SELF_DEACTIVATION`        | `PERSON_DENIAL_MESSAGES.SELF_DEACTIVATION`                                                                                                                                                                                                                         |
| `SELF_PASSWORD_RESTORE`                       | `SELF_PASSWORD_RESTORE`    | `PERSON_DENIAL_MESSAGES.SELF_PASSWORD_RESTORE`                                                                                                                                                                                                                     |
| `hashDefaultPassword()` devolveu `null`       | `DEFAULT_PASSWORD_MISSING` | `A senha padrão não está configurada no servidor. Peça ao responsável pelo sistema para definir DEFAULT_USER_PASSWORD.`                                                                                                                                            |
| revogação falhou depois de gravar             | `SESSION_REVOKE_FAILED`    | desativar: `A pessoa foi desativada, mas as sessões abertas não puderam ser encerradas. Desative de novo para tentar outra vez.` · restaurar: `A senha foi restaurada, mas as sessões abertas não puderam ser encerradas. Restaure de novo para tentar outra vez.` |
| falha inesperada                              | —                          | `Não foi possível salvar a pessoa agora. Tente novamente.`                                                                                                                                                                                                         |

`DEPARTMENT_NOT_FOUND` do domínio sai com `code: "NOT_FOUND"`; os demais
`PersonDenialReason` saem com `code` igual ao `reason`.

### `app/_lib/actions/password-setup.ts` (novo, `"use server"`)

```ts
export type DefinePasswordErrorCode =
  "INVALID_INPUT" | "SAME_AS_DEFAULT" | "USER_DEACTIVATED"

export interface DefinePasswordResult {
  ok: false
  message: string
  code?: DefinePasswordErrorCode
}

export const definePassword: (
  input: DefinePasswordInput,
) => Promise<DefinePasswordResult | void>
```

1. `requireSession()`.
2. `definePasswordSchema.safeParse`; inválido → `INVALID_INPUT`.
3. `defineInitialPassword({ newPassword })` em `try/catch`; exceção → log e
   `Não foi possível definir a senha agora. Tente novamente.` sem `code`.
4. `SAME_AS_DEFAULT` → `SAME_AS_DEFAULT_PASSWORD_ERROR`; `USER_DEACTIVATED` →
   `Usuário desativado.`; `NOT_REQUIRED` → segue para o passo 5 (já está definida).
5. `redirect("/dashboard")` **fora** do `try`. Sucesso não retorna valor, como `signIn`.

Sem e-mail.

### `app/_lib/actions/tags.ts` (alterado)

- `TagErrorCode` ganha `"DEPARTMENT_UNASSIGNED"`.
- `createTag` e `setTagActive`: `outcome.status === "department_unassigned"` →
  `{ ok: false, code: "DEPARTMENT_UNASSIGNED", message:
TAG_DEPARTMENT_UNASSIGNED_MESSAGE }`. **Obrigatório**: sem esse ramo o status
  novo cai no caminho de sucesso (o `tsc` não avisa, porque a action testa status
  a status).

### `app/_lib/actions/departments.ts` (alterado)

- `DepartmentErrorCode` ganha `"IS_UNASSIGNED"`. `code: outcome.block.reason`
  continua sem mapa. Mensagem vem de `describeDepartmentDeactivationBlock`.

## `df-ui` — o que criar e mudar

### `app/(app)/layout.tsx` (alterado)

- Junta `getAccountState()` ao `Promise.all`. `accountState?.mustChangePassword`
  → `redirect("/set-password")` **antes** de montar o layout.
- `/set-password` fica em `app/(auth)/`, fora deste layout: sem ciclo.

### Sidebar — `app/(app)/_components/registry-nav.tsx`

- Ícone `FolderCogIcon` → `FolderIcon` (`lucide-react`). A engrenagem fica
  reservada para a futura tela Configurações.
- `RegistryNav` (antes `CadastrosNav`) não tem mais ramo "em breve":
  `RegistryNavItem.href` é `string` e todo item vira `Link`. Pessoas vem com
  `href: PEOPLE_REGISTRY_PATH` de `registryNavItemsFor`.

### `app/(app)/registry/people/page.tsx` (novo, Server Component)

```ts
const actor = await requireSession()
const access = await requireRegistryAccess()
const isDirector = isDirectorAccess(access)
const [people, departmentOptions] = await Promise.all([
  listPeople(personScopeFor(access)),
  listDepartmentOptions(),
])
```

- Título "Pessoas". Subtítulo: diretor → todas as pessoas; admin → "do seu setor e
  as não alocadas".
- Botão "Nova pessoa". Passa `people`, `access`, `actor.id` e
  `departmentOptions` aos componentes (o admin também precisa das opções, para o
  select de mover).

### `app/(app)/registry/people/_components/` (novo)

- **Tabela** (`DataTable`): **Nome** (avatar com `UserAvatar` de
  `app/(app)/_components/`, `getInitials`, `image`; para o admin, `Badge`
  `departmentBadgeFor` quando a pessoa está no Não alocado), **E-mail**,
  **Setor** (só diretor; nome + `Badge` de `departmentBadgeFor`), **Papel**
  (`ROLE_LABELS`), **Status** (`ActiveStatusBadge`; a lista não exibe troca de
  senha pendente), **Último acesso**
  (`formatDateTime(lastLoginAt)` de `@/app/_lib/date`, ou `NEVER_ACCESSED_LABEL`),
  **Ações**.
- **Busca** por nome **ou** e-mail, entregue como coluna de acesso combinada
  (`id: "name"`, valor `` `${name}\n${email}` ``, `filterFn: "includesString"`).
- **Filtros** pela prop `filters` do `DataTable` (ver "Peças compartilhadas"
  abaixo). As colunas `departmentId`, `role` e `isActive` usam
  `filterFn: "inValues"`.
  - Diretor: **Setor** (`departmentOptions` na ordem recebida, Diretoria
    primeiro e Não alocado por último, `value: String(option.id)`, rótulo de
    `departmentOptionLabel`), **Papel** (`ROLES` com `ROLE_LABELS`) e
    **Status** (`activeStatusFilter`).
  - Admin de setor: **Papel** e **Status**.
- **Ações por linha** (`person-row-actions.tsx`): só quando
  `canManagePerson(access, row)`. Admin vê as linhas de admins do setor sem
  ações. Montadas em `RegistryRowActions` com os slots `edit` (`fit`), `status`
  (`md`) e `restore-password` (`lg`); o slot fica vazio (`action: null`) quando
  a ação não se aplica, e a coluna não desalinha.
  - Editar — sempre.
  - Desativar — oculto quando `row.id === actorId`; reativar desabilitado com
    `PERSON_DENIAL_MESSAGES.DEPARTMENT_INACTIVE` quando `!departmentIsActive`.
    Reusa `DeactivateRegistryDialog` / `ReactivateRegistryButton` de
    `app/(app)/registry/_components/`. Texto: "A pessoa perde o acesso na hora
    e as sessões abertas são encerradas. Você pode reativá-la depois."
  - Restaurar senha padrão — oculto quando `row.id === actorId`; `AlertDialog`
    de confirmação: "A senha volta a ser a padrão, as sessões abertas são
    encerradas e a pessoa vai definir uma nova no próximo acesso."
- **Formulário** (React Hook Form + `zodResolver`):
  - Criar, diretor: `createPersonSchema`; campos Nome, E-mail, Setor
    (`personCreationDepartments(departmentOptions)`), Papel (`ROLES` com
    `ROLE_LABELS`, default `member`). Com `forcedRoleFor(setorEscolhido)` não
    nulo, o select mostra o papel forçado e fica desabilitado.
  - Criar, admin: `createPersonSchema` com `departmentId` fixo
    (`access.departmentId`) em `defaultValues`, sem campo de setor nem de papel.
  - Editar: `updatePersonSchema` com `id` da linha; Setor com
    `personMoveDepartments(access, departmentOptions, row.departmentId)`; Papel
    só quando `canAssignRole(access)`, com a mesma trava de `forcedRoleFor`. Ao
    tirar alguém da Diretoria, o select de papel volta a ficar livre e precisa
    de escolha explícita (default do form = papel atual).
  - `EMAIL_TAKEN` → erro no campo `email`; `INVALID_INPUT` → toast ou campo;
    resto → toast com `result.message`.
- Client Components não importam `@/db/*`, `drizzle-orm`, `app/_lib/data` nem
  `app/_lib/auth`. `access` chega como prop (é objeto serializável).

### Setores — `app/(app)/registry/departments/_components/`

- Coluna Nome: badge por `departmentBadgeFor(row)` (Diretoria e Não alocado).
- `DepartmentRowActions`: o botão Desativar some quando o bloqueio é `IS_BOARD`
  **ou** `IS_UNASSIGNED`. Slots `rename` (`fit`) e `status` (`md`) em
  `RegistryRowActions`.
- Filtro **Status** (`activeStatusFilter`) pela prop `filters`.

### Tags

- `tagCreationDepartments` já exclui o Não alocado.
- O `Select` "Todos os setores" saiu: filtros **Setor** (só diretor, rótulo de
  `departmentOptionLabel`) e **Status** pela prop `filters`. Ações por linha em
  `RegistryRowActions` (`rename` `fit`, `status` `md`). Detalhe em
  `docs/contracts/registry-tags.md`.

### Peças compartilhadas

#### `app/_components/data-table/` (alterado)

`data-table-select-filter.tsx` foi removido. Filtro agora é a prop `filters`.

```ts
interface DataTableProps<TData extends RowData> {
  columns: ReadonlyArray<ColumnDef<DataTableFeatures, TData>>
  data: ReadonlyArray<TData>
  emptyMessage: string
  search?: DataTableSearchConfig
  filters?: ReadonlyArray<DataTableFilter>
}

interface DataTableSearchConfig {
  columnId: string
  label: string
  placeholder?: string
}

export interface DataTableFilterOption {
  value: string
  label: string
}

export interface DataTableFilter {
  columnId: string
  label: string
  options: ReadonlyArray<DataTableFilterOption>
}
```

- `data-table-filters.tsx` (`DataTableFilters`, Client): botão "Filtros" com a
  contagem de opções marcadas; abre um `Popover` com um `FieldSet` por grupo
  (legenda = `label`) e um `Checkbox` por opção; "Limpar filtros" zera todos os
  grupos. Grupo cujo `columnId` não existe nas colunas da tabela é ignorado.
- O valor de filtro da coluna é `string[]` das opções marcadas. A coluna
  filtrada declara `filterFn: "inValues"`.
- `data-table-features.ts` registra dois `filterFns`: `includesString` (busca)
  e `inValues`. `inValues` converte o valor da célula com `String(value)` e
  passa se ele está no array; array vazio remove o filtro (`autoRemove`). Por
  isso `value` da opção é sempre string (`String(id)`, `"true"`/`"false"`).
- Semântica: dentro do grupo, OU (qualquer opção marcada); entre grupos e a
  busca, E (o filtro por coluna do TanStack).
- Tabela vazia por filtro mostra "Nenhum resultado para os filtros aplicados.";
  sem dados, `emptyMessage`.

#### `app/(app)/registry/_components/` (compartilhado pelos três cadastros)

```ts
type RegistryRowActionWidth = "fit" | "md" | "lg"

interface RegistryRowActionSlot {
  id: string
  width: RegistryRowActionWidth
  action: ReactNode
}

interface RegistryRowActionsProps {
  slots: RegistryRowActionSlot[]
}
```

- `registry-row-actions.tsx` (`RegistryRowActions`): linha de ações alinhada à
  direita, um slot por ação em ordem fixa. `fit` ocupa o tamanho do conteúdo,
  `md` = `w-28`, `lg` = `w-40`. Slot com `action: null` guarda a largura, então
  as colunas de ação alinham entre linhas mesmo quando uma ação some.
- `active-status-filter.ts` (`activeStatusFilter: DataTableFilter`): grupo
  **Status** na coluna `isActive`, opções `"true"`/`"false"` com rótulo de
  `describeActiveStatus`.
- `department-option-label.ts` (`departmentOptionLabel`, recebe
  `DepartmentOption` e devolve `string`): nome do setor com as notas entre
  parênteses — badge de `departmentBadgeFor` quando difere do nome, e "inativo".
- `department-name.tsx` (`DepartmentName`, props `name`, `isActive`): nome com
  badge "Setor inativo". Coluna Setor de Pessoas e Tags.
- `DeactivateRegistryDialog` (`name`, `description`, `blockedReason?`,
  `onDeactivate`) e `ReactivateRegistryButton` (`name`, `disabledReason?`,
  `onReactivate`), ambos com callback que devolve `RegistryMutationResult`.

## Riscos

1. **Senha padrão compartilhada.** Quem a conhece pode entrar numa conta nunca
   usada e definir a senha antes da dona. Mitigação: `revokeOtherSessions` ao
   definir, comunicação fora do sistema, primeiro acesso logo após o cadastro.
   Aceito pelo usuário (ADR 012).
2. **Redirecionamento só no layout.** Layouts não re-renderizam em navegação
   client-side (`node_modules/next/dist/docs/01-app/02-guides/authentication.md`).
   Não abre brecha: a flag só liga na criação (sem sessão) ou na restauração (que
   revoga as sessões), então quem tem a flag sempre entra em `(app)` por
   navegação completa. Cadastros recusa por `RegistryAccess = none`. As actions
   de perfil não checam a flag; um request forjado só mexe na própria conta.
3. **Autorização sobre leitura sem trava.** `findManagedPerson` lê antes da
   transação; se outro diretor mudar papel ou setor da pessoa no meio, um admin
   pode agir sobre dado de milissegundos atrás. Aceito. O "último diretor" é
   imune: é recontado sob `FOR UPDATE` da Diretoria.
4. **Falha de revogação.** Gravação feita, sessões não apagadas →
   `SESSION_REVOKE_FAILED`; repetir é seguro (idempotente). Mesmo sem repetir, o
   acesso a Cadastros já cai por `is_active`/flag frescos.
5. **Cookie velho** depois da revogação: um salto `/dashboard` → `/login` (ADR 008).
6. **E-mail com maiúscula** gravado antes desta feature (só o seed grava) não
   consegue logar. Checar `SEED_ADMIN_EMAIL` em minúsculas.
7. **Migration `0006` falha** se já houver setor "Não alocado" sem carimbo. Neon
   checado pelo usuário.
8. **Admin distingue `NOT_FOUND` de `FORBIDDEN`** sondando ids. Aceito, como em tags.
9. **`tsc` quebrado entre ondas.** A Onda 0 muda tipos existentes; até a Onda 1
   entregar, falham: `app/_lib/auth/registry-access.ts` (facts sem os campos
   novos), `app/_lib/data/departments.ts` (`isUnassigned` em
   `listDepartments`, `listDepartmentOptions` e no `checkDepartmentDeactivation`)
   e `app/_lib/actions/departments.ts` (`IS_UNASSIGNED` fora de
   `DepartmentErrorCode`). Nenhum outro arquivo.
10. **Diretoria com membro comum legado.** Quem já estava na Diretoria como
    `member` continua diretor (regra do ADR 011) até ser editado; ao salvar, o
    papel vira `admin`.

## Variáveis de ambiente

| Variável                | Para quê                                                                                           |
| ----------------------- | -------------------------------------------------------------------------------------------------- |
| `DEFAULT_USER_PASSWORD` | Senha com que toda pessoa nasce e para a qual "Restaurar" volta. Lida só por `hashDefaultPassword` |

## Checklist de encerramento da feature

- [ ] `npm run db:migrate` aplicado (usuário); setor "Não alocado" com `is_unassigned` existe
- [ ] `getAccountFacts`, `getAccountState`, `requirePendingPasswordChange`, `hashDefaultPassword`, `defineInitialPassword`, `revokeUserSessions`, `onPasswordReset`; `/set-password` (`df-auth`)
- [ ] `app/_lib/data/people.ts`; `isUnassigned` e nova ordem em `departments.ts`; `checkTagDepartment` em `tags.ts` (`df-data`)
- [ ] `app/_lib/actions/people.ts`, `password-setup.ts`; ramos novos em `tags.ts` e `departments.ts` (`df-actions`)
- [ ] `/registry/people`; redirecionamento no layout `(app)`; `FolderIcon`; badges e trava do Não alocado em Setores (`df-ui`)
- [ ] Pessoa criada entra com a senha padrão e cai em `/set-password`; senha igual à padrão recusada; depois de definir, navega normalmente e outras sessões caem (`df-debug`)
- [ ] Restaurar senha: sessões da pessoa caem; próximo login volta a `/set-password` (`df-debug`)
- [ ] Desativar: a sessão aberta da pessoa cai na próxima requisição; desativar a si mesmo → `SELF_DEACTIVATION`; último diretor → `LAST_DIRECTOR` (desativar e mover) (`df-debug`)
- [ ] Admin: vê o próprio setor + Não alocado; ações só em membros; forjar admin, setor alheio ou papel → `FORBIDDEN`; cria só membro no próprio setor (`df-debug`)
- [ ] Admin movido para o Não alocado perde Cadastros na próxima navegação; realocado, recupera (`df-debug`)
- [ ] Criar pessoa no Não alocado → `DEPARTMENT_UNASSIGNED`; criar/reativar tag no Não alocado → `DEPARTMENT_UNASSIGNED`; desativar o Não alocado → `IS_UNASSIGNED` (`df-debug`)
- [ ] Sem `DEFAULT_USER_PASSWORD`: criar e restaurar → `DEFAULT_PASSWORD_MISSING`; resto do app normal (`df-debug`)
- [ ] E-mail com maiúsculas no cadastro é gravado em minúsculas e o login funciona (`df-debug`)
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm run build`
