# Contrato — Autenticação (etapa 2: login funcionando)

Entrada das ondas 1 e 2. A etapa 1 (`docs/contracts/login.md`) entregou só o
layout; esta etapa liga o formulário ao Better Auth, cria sessão e protege
`/dashboard`.

## Decisões fixadas pelo usuário

- Better Auth 1.7.5, provider `emailAndPassword`, `disableSignUp: true`. Não
  existe cadastro público: contas nascem do seed e, depois, do admin de setor.
- `advanced.database.generateId: "serial"` — o id de todas as tabelas de auth é
  `integer` gerado pelo banco. As FKs `integer` que apontam para `users.id` em
  `ticket`, `ticket_transfer`, `ticket_history`, `message` e `attachment`
  **não mudam**.
- A tabela `users` **fica em `db/schema.ts`** (dona: `df-architect`).
  `db/auth-schema.ts` (dono: `df-auth`) declara apenas `session`, `account` e
  `verification`, e importa `user` de `@/db/schema` para a FK `userId`.
- A senha passa a morar em `account.password`, registro com
  `providerId: "credential"`. `users.password_hash` deixa de existir.

## Tabelas e enums

### `users` — o que muda (`db/schema.ts`)

| Coluna           | Antes           | Agora                            |
| ---------------- | --------------- | -------------------------------- |
| `password_hash`  | `text not null` | **removida**                     |
| `email_verified` | —               | `boolean not null default false` |
| `image`          | —               | `text` (nullable)                |

Inalterados: `id` (`integer` identity), `name`, `email`, `role`,
`department_id`, `is_active`, `deactivated_at`, `last_login_at`, `created_at`,
`updated_at`, e os índices `user_email_lower_idx`, `user_department_idx`,
`user_department_role_idx`.

Por que `email_verified` e `image` entram: o modelo `user` do core do Better
Auth sempre tem os dois. Sem eles, a validação de schema
(`advanced.database.validateSchema`, ligada por padrão) reporta `missing-column`
e o login não sai do lugar.

Por que `password_hash` sai: a mesma validação reporta
`unexpected-required-column` para coluna `not null` sem default que o Better
Auth não escreve — e ele nunca escreve senha em `user`, só em
`account.password`. Manter a coluna derrubaria o login.

Colunas próprias do Direct Flow que **permanecem** em `users` (`role`,
`department_id`, `is_active`, `deactivated_at`, `last_login_at`) são toleradas
porque têm default ou são nullable.

Nenhum enum novo. `role` continua `admin | member`.

### Tabelas do Better Auth (`db/auth-schema.ts`, dono `df-auth`)

Shape do core com `generateId: "serial"`. Nomes de propriedade Drizzle em
`camelCase` (é por eles que o adapter compara colunas), nomes SQL em
`snake_case`. Todo timestamp é `timestamp with time zone`.

`session`

| Propriedade | SQL          | Tipo                                     |
| ----------- | ------------ | ---------------------------------------- |
| `id`        | `id`         | integer, PK, gerado pelo banco           |
| `expiresAt` | `expires_at` | timestamptz, not null                    |
| `token`     | `token`      | text, not null, **unique**               |
| `createdAt` | `created_at` | timestamptz, not null                    |
| `updatedAt` | `updated_at` | timestamptz, not null                    |
| `ipAddress` | `ip_address` | text, nullable                           |
| `userAgent` | `user_agent` | text, nullable                           |
| `userId`    | `user_id`    | integer, not null, FK `users.id` cascade |

`account`

| Propriedade             | SQL                        | Tipo                                     |
| ----------------------- | -------------------------- | ---------------------------------------- |
| `id`                    | `id`                       | integer, PK, gerado pelo banco           |
| `accountId`             | `account_id`               | text, not null                           |
| `providerId`            | `provider_id`              | text, not null                           |
| `userId`                | `user_id`                  | integer, not null, FK `users.id` cascade |
| `accessToken`           | `access_token`             | text, nullable                           |
| `refreshToken`          | `refresh_token`            | text, nullable                           |
| `idToken`               | `id_token`                 | text, nullable                           |
| `accessTokenExpiresAt`  | `access_token_expires_at`  | timestamptz, nullable                    |
| `refreshTokenExpiresAt` | `refresh_token_expires_at` | timestamptz, nullable                    |
| `scope`                 | `scope`                    | text, nullable                           |
| `password`              | `password`                 | text, nullable                           |
| `createdAt`             | `created_at`               | timestamptz, not null                    |
| `updatedAt`             | `updated_at`               | timestamptz, not null                    |

Para login por senha: `providerId = "credential"`, `accountId = String(user.id)`,
`password` = hash do Better Auth.

`verification`

| Propriedade  | SQL          | Tipo                           |
| ------------ | ------------ | ------------------------------ |
| `id`         | `id`         | integer, PK, gerado pelo banco |
| `identifier` | `identifier` | text, not null                 |
| `value`      | `value`      | text, not null                 |
| `expiresAt`  | `expires_at` | timestamptz, not null          |
| `createdAt`  | `created_at` | timestamptz, not null          |
| `updatedAt`  | `updated_at` | timestamptz, not null          |

Detalhe que o `df-auth` precisa respeitar: o adapter Drizzle localiza a tabela
pela **chave do objeto `schema`** entregue a ele, não pelo nome SQL. A chave de
`users` tem de ser `user` (`{ user, session, account, verification }`).

`verification` não é usada nesta etapa (sem verificação de e-mail nem reset de
senha ainda), mas existe porque o core a exige.

## Tipos — `app/_lib/types/actor.ts`

```ts
export interface Actor {
  id: number
  name: string
  email: string
  role: Role
  departmentId: number
}

export type { Role }
```

`Actor` é a identidade que os helpers de sessão devolvem e que o domínio recebe.
Existe porque o Better Auth expõe `session.user.id` como **string**: o `df-auth`
converte para número ao montar o `Actor`, e nenhuma camada abaixo recebe a
sessão crua. Regra prática: **UI, Server Actions e camada de dados não importam
`better-auth`** — tipam contra `Actor`. Os únicos importadores legítimos fora de
`app/_lib/auth/**` são os pontos de integração com o framework e com o hash:

| Arquivo                          | Import                | Por quê                                             |
| -------------------------------- | --------------------- | --------------------------------------------------- |
| `app/api/auth/[...all]/route.ts` | `better-auth/next-js` | `toNextJsHandler`, handler obrigatório do pacote    |
| `proxy.ts`                       | `better-auth/cookies` | `getSessionCookie`, leitura do cookie sem I/O       |
| `db/seed.ts`                     | `better-auth/crypto`  | `hashPassword`, mesmo algoritmo verificado no login |

`Role` é reexportado aqui para que a UI tenha uma fonte legal do tipo sem
importar `@/db/*` (proibido pela seção 2 do `stack.md`).

## Validação — `app/_lib/validation/auth.ts`

`loginSchema` e `LoginInput` **não mudam** (ver `docs/contracts/login.md`). O
mesmo schema serve ao `zodResolver` no cliente e ao `safeParse` na action.

## Domínio — `app/_lib/domain/`

Nenhuma função nesta etapa. Autorização por setor aparece com o fluxo de
tickets.

## Auth (`df-auth`) — helpers publicados

Em `app/_lib/auth/` (`auth.ts` para a instância, `session.ts` para os helpers):

```ts
getSession(): Promise<Actor | null>
requireSession(): Promise<Actor>
requireDepartmentAdmin(departmentId: number): Promise<Actor>
```

- `getSession` — lê a sessão do request, devolve `Actor` ou `null`. Não redireciona.
- `requireSession` — `getSession()` ou `redirect("/login")`.
- `requireDepartmentAdmin` — `requireSession()` e, se não for
  `role === "admin"` do `departmentId` informado, nega. Entra no contrato agora
  para que as ondas seguintes já tipem contra ela; o primeiro uso real é no
  fluxo de tickets.

Todos são `async` e só rodam no servidor.

Além desses, `app/_lib/auth/session.ts` publica os dois wrappers que a action
consome, para que `app/_lib/actions/**` não fale com a instância do Better Auth:

```ts
signInWithPassword(input: LoginInput): Promise<SignInFailure | null>
signOutSession(): Promise<void>
type SignInFailure = "INVALID_CREDENTIALS" | "USER_DEACTIVATED"
```

`signInWithPassword` devolve `null` em sucesso e o código de falha quando o
Better Auth responde `APIError` conhecido; erro inesperado é relançado para a
action tratar como falha genérica.

### Ponto em aberto — `isActive` em sessão já aberta

`requireSession` (`app/_lib/auth/session.ts:24-28`) valida apenas a existência da
sessão; não relê `users.is_active`. Consequência: um usuário desativado **depois**
de ter feito login continua navegando até a sessão expirar, porque a checagem de
`is_active` acontece só na criação da sessão (ver hook abaixo).

Hoje a exposição é nula — não existe tela de desativação de usuário, e o único
caminho para `is_active = false` é alteração manual no banco. A decisão de onde
essa checagem passa a morar — dentro de `requireSession`, num hook de request do
Better Auth, ou como revogação explícita das sessões do usuário no momento da
desativação — precisa ser tomada **antes** de a gestão de usuários existir. Ver
`docs/adr/003-checagem-de-is-active-em-sessao-aberta.md`.

Até lá, `requireSession()` **não** é garantia de usuário ativo. Quem precisar dessa
garantia carrega o registro e checa `is_active` explicitamente.

### Erros de login

Códigos que a action devolve e a UI exibe:

| Código                | Mensagem (PT-BR)             | Quando                                    |
| --------------------- | ---------------------------- | ----------------------------------------- |
| `INVALID_CREDENTIALS` | `E-mail ou senha inválidos.` | e-mail inexistente **ou** senha errada    |
| `USER_DEACTIVATED`    | `Usuário desativado.`        | senha correta e `users.is_active = false` |

`USER_DEACTIVATED` só aparece **depois** de a senha estar correta — antes disso a
resposta é sempre `INVALID_CREDENTIALS`, para não revelar existência de conta.

Onde a checagem mora: no hook `databaseHooks.session.create.before` da instância
do Better Auth (`app/_lib/auth/auth.ts:33-49`). Ele roda depois de a senha ser
conferida e **antes** de a linha de `session` ser criada e o cookie emitido:
lança `APIError("FORBIDDEN", { code: "USER_DEACTIVATED" })`, então a sessão do
usuário desativado **nunca chega a existir**. Não há sessão aberta e depois
encerrada. `signInWithPassword` traduz esse `code` para `"USER_DEACTIVATED"` e a
action o transforma em mensagem.

O hook irmão `create.after` grava `users.last_login_at` — só executa quando a
sessão foi de fato criada.

Além dos dois códigos da tabela, a action cobre a **falha inesperada** (banco
fora, configuração quebrada, `APIError` de código desconhecido): registra o erro
no log do servidor e devolve `Não foi possível entrar agora. Tente novamente.`
**sem** `code`, porque não é falha de negócio e a UI não tem nada de específico a
dizer.

## Data (`df-data`)

`app/_lib/data/users.ts`

```ts
getUserById(id: number): Promise<User | null>
```

`User` é `typeof user.$inferSelect` de `@/db/schema`. Devolve `null` quando não
existe; não filtra por `is_active` (quem decide é a action ou a UI).

`db/seed.ts` — idempotente, roda com `dotenv`:

1. `department` com `name = SEED_DEPARTMENT_NAME`, se ainda não existir.
2. `users` com `email = SEED_ADMIN_EMAIL`, `name = SEED_ADMIN_NAME`,
   `role = "admin"`, `departmentId` do setor acima, `emailVerified: true`.
3. `account` com `userId` do user criado, `accountId: String(user.id)`,
   `providerId: "credential"`,
   `password: await hashPassword(SEED_ADMIN_PASSWORD)` — `hashPassword` vem de
   `better-auth/crypto`. É obrigatório usar esse hash: é o mesmo algoritmo que o
   Better Auth usa para verificar no login.

O banco está com todas as tabelas em 0 linhas e nenhum hash jamais gravado, então
não há migração de senha a fazer. As sequences `users_id_seq` e
`department_id_seq` já avançaram (5 e 10) — ids do seed não começam em 1, e isso
não é problema.

Restrição do `id`: todas as PKs são `GENERATED ALWAYS AS IDENTITY`. Nem o seed nem
o Better Auth podem passar `id` no insert — o Postgres recusa. É o motivo de
`generateId: "serial"`. Pegue o id com `.returning({ id: ... })` para montar o
`account`.

## Server Actions (`df-actions`)

`app/_lib/actions/auth.ts`

```ts
type LoginErrorCode = "INVALID_CREDENTIALS" | "USER_DEACTIVATED"

interface SignInResult {
  ok: false
  message: string
  code?: LoginErrorCode
}

signIn(input: LoginInput): Promise<SignInResult | void>
signOut(): Promise<void>
```

- `signIn` — `loginSchema.safeParse(input)`; se inválido, devolve
  `INVALID_CREDENTIALS`. Autentica chamando `signInWithPassword` de
  `app/_lib/auth/session.ts` e converte a falha devolvida em `SignInResult`. Em
  sucesso, `redirect("/dashboard")` — por isso o caminho de sucesso não retorna
  valor (`void`).
- Só existe retorno de **falha**: `ok` é literalmente `false`. `message` já vem em
  PT-BR, pronta para o toast, para a UI não manter um segundo mapa de mensagens
  (seria a mesma regra em dois lugares).
- `code` é **opcional** de propósito: as duas falhas de negócio da tabela de erros
  trazem código; falha inesperada (banco fora, configuração quebrada) devolve só a
  mensagem genérica, sem código, porque não há código de negócio que a descreva.
  Quem quiser reagir a um caso específico faz narrowing em `code`; quem só exibe
  usa `message`.
- `signOut` — encerra a sessão via `signOutSession` e `redirect("/login")`.
- A action não escreve SQL nem fala com o Better Auth direto: a sessão sai dos
  wrappers de `app/_lib/auth/session.ts`. A checagem de `is_active` no login **não**
  é feita aqui nem via `app/_lib/data/users.ts` — ela mora no hook
  `session.create.before` (ver "Erros de login").
- `LoginErrorCode` e `SignInResult` são publicados pelo `df-actions` junto da
  action (são detalhe de retorno dela, não tipo de domínio). `LoginErrorCode` é
  alias de `SignInFailure`, exportado por `app/_lib/auth/session.ts`.

## UI (`df-ui` e `df-auth`)

- `app/(auth)/login/_components/login-form.tsx` (`df-auth`) — troca o toast
  provisório "Autenticação em breve" pela chamada a `signIn`. Erro devolvido vira
  mensagem visível no formulário (Sonner ou mensagem de campo), usando o texto
  PT-BR da tabela de erros.
- `app/dashboard/page.tsx` (`df-ui`) — Server Component. Chama
  `requireSession()` para obter o `Actor` e, em seguida,
  `getUserById(actor.id)` para os dados completos. Sem `"use client"`, sem
  `@/db/*`. Se `getUserById` devolver `null`, `notFound()`.

  **A segunda chamada é intencional e não deve ser "otimizada".** O `Actor` de
  `requireSession()` já traz nome, e-mail e papel, então `getUserById(actor.id)` é
  redundante para renderizar a tela — e é exatamente esse o ponto: o usuário pediu
  que o nome exibido viesse **de uma chamada ao banco**. Essa ida e volta é a prova
  de que `Actor.id`, convertido de `string` (como o Better Auth expõe
  `session.user.id`) para `number`, chega íntegro na camada de dados e casa com a
  PK `integer` de `users`. Se a conversão quebrar, o dashboard cai em `notFound()`
  em vez de renderizar dados de sessão que pareceriam corretos. Remover a chamada
  remove a verificação; quem quiser removê-la precisa antes ter outro lugar onde
  essa conversão seja exercitada de ponta a ponta.

- Botão **Sair** ligado a `signOut` (`df-ui`), em Client Component mínimo ou
  `<form action={signOut}>`.
- Proteção de rota em `proxy.ts` (`df-auth`), conforme o Next 16.

## Variáveis de ambiente

| Variável               | Para quê                                  |
| ---------------------- | ----------------------------------------- |
| `BETTER_AUTH_SECRET`   | assinatura de sessão/cookies              |
| `BETTER_AUTH_URL`      | URL base da aplicação                     |
| `SEED_ADMIN_NAME`      | nome do admin criado pelo seed            |
| `SEED_ADMIN_EMAIL`     | e-mail do admin criado pelo seed          |
| `SEED_ADMIN_PASSWORD`  | senha em texto do admin, hasheada no seed |
| `SEED_DEPARTMENT_NAME` | setor do admin criado pelo seed           |

`DATABASE_URL` continua como está.

## Migration

São **duas** migrations, geradas pelo `df-architect` com `drizzle-kit generate`
**depois** de `db/auth-schema.ts` existir. `drizzle.config.ts` já lê
`["./db/schema.ts", "./db/auth-schema.ts"]`. Quem aplica (`db:migrate`) é o
usuário, nesta ordem:

| Ordem | Arquivo                       | Conteúdo                                                                                                                 |
| ----- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 1     | `0001_auth_tables.sql`        | `create table session`, `account`, `verification` (+ FKs para `users`); `add column email_verified` e `image` em `users` |
| 2     | `0002_drop_password_hash.sql` | `drop column password_hash` em `users`                                                                                   |

A divisão em duas existe porque, num passo só, o `drizzle-kit` vê uma coluna
saindo e outra entrando na mesma tabela e abre prompt interativo perguntando se é
rename (`password_hash` → `email_verified`). Separando, cada passo é gerado sem
prompt e sem SQL escrito à mão. Ver `docs/adr/002-migration-de-auth-em-dois-passos.md`.

Ordem importa: `0002` remove a coluna de senha antiga, então só deve ser aplicada
quando as senhas existirem em `account.password`. Em base de desenvolvimento o
caminho é aplicar as duas e rodar `db:seed`.
