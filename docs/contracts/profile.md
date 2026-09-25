# Contrato — Perfil do usuário

Entrada das ondas 1 e 2. Plano aprovado em `docs/plans/perfil-do-usuario.md`, que
manda nas decisões. Armazenamento em
`docs/adr/010-armazenamento-de-arquivos-no-cloudflare-r2.md`. Limite de
tentativas da troca de senha no adendo do
`docs/adr/007-limite-de-tentativas-em-login-e-pedido-de-redefinicao.md`.

Versões observadas: `next@16.3.5`, `better-auth@1.7.5`, `zod@4.6.5`, Node 24.

## Decisões fixadas pelo usuário (resumo do plano)

| Tema            | Decisão                                                                                                        |
| --------------- | -------------------------------------------------------------------------------------------------------------- |
| Acesso          | "Meu perfil" no menu do card do usuário, entre "Tema" e "Sair"; o mesmo menu no mobile                         |
| URL             | `/perfil`, grupo `(app)`, com sidebar; nenhum item da sidebar ativo                                            |
| O que se altera | Só a própria senha e a própria foto. O resto é somente leitura                                                 |
| Troca de senha  | Exige senha atual; revoga as **outras** sessões e mantém a atual; envia e-mail "Sua senha foi alterada"        |
| Foto            | R2, bucket público `avatars`; redução a 256×256 no navegador; envio por Server Action; chave nova a cada envio |
| Remover foto    | Apaga o arquivo no R2 e zera `users.image`                                                                     |

## Tabelas, enums e migration

**Nenhuma mudança de schema. Nenhuma migration.** O fluxo lê e escreve:

- `users` — lê `id`, `name`, `email`, `role`, `department_id`, `image`,
  `is_active`, `created_at`, `last_login_at`; escreve `image` e `updated_at`
- `department` — lê `name`
- `account` e `session` — só pelo Better Auth, dentro de `changePassword`

## Tipos — `app/_lib/types/`

### `app/_lib/types/user.ts` (alterado)

```ts
export interface UserProfile {
  id: number
  name: string
  email: string
  role: Role
  departmentId: number
  departmentName: string
  image: string | null
  isActive: boolean
  createdAt: Date
  lastLoginAt: Date | null
}
```

### `app/_lib/types/avatar.ts` (novo)

```ts
export type AvatarMimeType = "image/webp" | "image/png"
export type AvatarExtension = "webp" | "png"

export interface UploadedAvatar {
  url: string
}
```

### `app/_lib/types/email.ts` (acrescentado)

```ts
export interface PasswordChangedEmailInput {
  to: string
  userName: string
  changedAt: Date
}
```

`changedAt` chega como `Date`; quem formata é o template, com `formatDateTime` de
`@/app/_lib/date`.

## Domínio — `app/_lib/domain/`

### `app/_lib/domain/avatar.ts` (novo)

```ts
export const AVATAR_SIZE_PX = 256
export const AVATAR_MAX_BYTES = 512 * 1024
export const AVATAR_WEBP_QUALITY = 0.9
export const AVATAR_MIME_TYPES = ["image/webp", "image/png"] as const
export const AVATAR_EXTENSIONS: Record<AvatarMimeType, AvatarExtension>
export const AVATAR_FORM_FIELD = "avatar"

export const AVATAR_SOURCE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
] as const
export const AVATAR_SOURCE_MAX_MEGABYTES = 20
export const AVATAR_SOURCE_MAX_BYTES = 20 * 1024 * 1024
export const AVATAR_INPUT_ACCEPT: string

export const isAvatarMimeType: (value: string) => value is AvatarMimeType
export const detectAvatarMimeType: (bytes: Uint8Array) => AvatarMimeType | null
```

| Nome                       | Semântica                                                                                                                                                                                                                          |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AVATAR_SIZE_PX`           | Lado do quadrado final, em px. O canvas do navegador desenha nesse tamanho                                                                                                                                                         |
| `AVATAR_MAX_BYTES`         | Teto do arquivo **já reduzido** que a action aceita: 512 KB. Um PNG RGBA de 256×256 tem 256 KB de pixels sem compressão nenhuma, então WebP e PNG reais cabem com folga, e o total fica bem abaixo do 1 MB da Server Action        |
| `AVATAR_WEBP_QUALITY`      | Segundo argumento de `canvas.toBlob(cb, "image/webp", q)`                                                                                                                                                                          |
| `AVATAR_MIME_TYPES`        | Tipos que a action aceita e que o bucket recebe. Só o que o canvas produz                                                                                                                                                          |
| `AVATAR_EXTENSIONS`        | Tipo → extensão da chave no bucket (`webp`, `png`)                                                                                                                                                                                 |
| `AVATAR_FORM_FIELD`        | Nome do campo no `FormData`. Cliente faz `formData.append(AVATAR_FORM_FIELD, file)`, action faz `formData.get(AVATAR_FORM_FIELD)`                                                                                                  |
| `AVATAR_SOURCE_MIME_TYPES` | Tipos que o `<input type="file">` deixa escolher. São **entrada da redução**, não o que é enviado                                                                                                                                  |
| `AVATAR_SOURCE_MAX_BYTES`  | Teto do arquivo escolhido (20 MB), só para o navegador não travar decodificando uma foto enorme. Nunca chega ao servidor                                                                                                           |
| `AVATAR_INPUT_ACCEPT`      | `AVATAR_SOURCE_MIME_TYPES.join(",")`, pronto para a prop `accept` do `<input>`                                                                                                                                                     |
| `isAvatarMimeType`         | Narrowing de `string` (ex.: `file.type`, `blob.type`) para `AvatarMimeType`. É o que dá o tipo certo para `AVATAR_EXTENSIONS[...]` e para `uploadAvatar` sem `as`                                                                  |
| `detectAvatarMimeType`     | Lê a assinatura do conteúdo, não o tipo declarado: PNG = `89 50 4E 47 0D 0A 1A 0A` nos bytes 0-7; WebP = `RIFF` nos bytes 0-3 **e** `WEBP` nos bytes 8-11. Qualquer outra coisa (texto, JPEG, WAV em RIFF, arquivo curto) → `null` |

### `app/_lib/domain/user.ts` (acrescentado)

```ts
export const describeAccountStatus: (isActive: boolean) => string
```

`true` → `Ativo`, `false` → `Inativo`. Campo "Situação" da tela de perfil.
`ROLE_LABELS`, `getInitials`, `getFirstName` e `describeMembership` continuam como
estão e servem ao perfil (papel, iniciais, linha "Setor · Papel").

## Validação — `app/_lib/validation/`

### `app/_lib/validation/password.ts` (novo)

```ts
export const PASSWORD_MISMATCH_ERROR = "As senhas não conferem."
export const newPasswordField: z.ZodString
export const confirmPasswordField: z.ZodString

export const changePasswordSchema // z.object({ currentPassword, newPassword, confirmPassword }) + 2 refines
export type ChangePasswordInput = {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}
```

`newPasswordField` é a regra de força de senha extraída de `resetPasswordSchema`,
com as mesmas mensagens; `confirmPasswordField` idem. `resetPasswordSchema`
(`app/_lib/validation/auth.ts`) passou a usar os dois e a constante de
divergência. **O comportamento do reset não mudou**: mesmas regras, mesmas
mensagens, mesmos caminhos de erro, mesmo `ResetPasswordInput`.

| Campo             | Regra                             | Mensagem                                                            |
| ----------------- | --------------------------------- | ------------------------------------------------------------------- |
| `currentPassword` | obrigatório                       | `Informe a senha atual.`                                            |
| `newPassword`     | obrigatório                       | `Informe a nova senha.`                                             |
| `newPassword`     | mínimo 8                          | `A senha precisa ter no mínimo 8 caracteres.`                       |
| `newPassword`     | máximo 128                        | `A senha precisa ter no máximo 128 caracteres.`                     |
| `confirmPassword` | obrigatório                       | `Confirme a nova senha.`                                            |
| objeto            | `newPassword === confirmPassword` | `As senhas não conferem.` — path `confirmPassword`                  |
| objeto            | `newPassword !== currentPassword` | `A nova senha precisa ser diferente da atual.` — path `newPassword` |

- Nenhum campo de senha leva `trim`.
- `currentPassword` não tem mínimo nem máximo: a senha atual é a que está no
  banco, e quem decide se confere é o Better Auth.
- As regras de objeto rodam mesmo com erro de campo (Zod 4, conferido com
  `tsx`). Com a confirmação vazia, o campo `confirmPassword` recebe as duas
  mensagens: a de obrigatório e a de divergência. O `resetPasswordSchema` sempre
  se comportou assim, e o `field` do shadcn mostra a primeira.

### `app/_lib/validation/avatar.ts` (novo)

```ts
export const AVATAR_FORMAT_ERROR =
  "Formato de imagem não aceito. Use WebP ou PNG."

export const avatarFileSchema: z.ZodFile
export type AvatarFileInput = File

export const avatarSourceFileSchema: z.ZodFile
export type AvatarSourceFileInput = File
```

| Schema                   | Regra                              | Mensagem                                                |
| ------------------------ | ---------------------------------- | ------------------------------------------------------- |
| `avatarFileSchema`       | é `File`                           | `Selecione uma imagem.`                                 |
|                          | ao menos 1 byte                    | `Selecione uma imagem.`                                 |
|                          | até `AVATAR_MAX_BYTES`             | `A imagem ficou grande demais. Tente outra.`            |
|                          | tipo em `AVATAR_MIME_TYPES`        | `AVATAR_FORMAT_ERROR`                                   |
| `avatarSourceFileSchema` | é `File`, ao menos 1 byte          | `Selecione uma imagem.`                                 |
|                          | até `AVATAR_SOURCE_MAX_BYTES`      | `A imagem precisa ter no máximo 20 MB.`                 |
|                          | tipo em `AVATAR_SOURCE_MIME_TYPES` | `Formato não aceito. Use JPEG, PNG, WebP, GIF ou AVIF.` |

- `avatarFileSchema` é o do **arquivo reduzido**: a action roda
  `safeParse(formData.get(AVATAR_FORM_FIELD))` e o cliente pode rodar o mesmo
  sobre o `File` montado a partir do blob do canvas, antes de enviar.
  `formData.get` devolve `File | string | null`; `string` e `null` caem em
  `Selecione uma imagem.` Funciona no servidor porque `File` é global no Node 24,
  e o `FormData` da Server Action entrega `File`.
- `avatarSourceFileSchema` é só do navegador, no `onChange` do `<input>`, antes
  de decodificar. Não vai para a action.
- O tipo de `file.type` depois do `safeParse` continua `string`. Para chegar a
  `AvatarMimeType` use `isAvatarMimeType(file.type)`; nunca `as`.
- O schema confere só o tipo **declarado** (`file.type`), que o cliente escolhe.
  Quem confere o conteúdo é `detectAvatarMimeType`, na action (ver "df-actions").
  O `df-debug` mostrou um arquivo de texto declarado `image/png` passando pelo
  schema e sendo publicado no bucket.
- `AVATAR_FORMAT_ERROR` é exportado para a action usar na rejeição por conteúdo,
  sem repetir o texto.

## `df-data` — o que criar

### `app/_lib/data/users.ts`

**Renomear `getUserProfile` para `findUserProfile`** (convenção de
`.claude/agents/df-data.md`: `find`/`list`/`count`/`insert`/`update`/`delete`,
nunca `get`) e acrescentar os campos novos:

```ts
export async function findUserProfile(
  userId: number,
): Promise<UserProfile | null>
```

- `users ⋈ department` por `users.department_id`, como hoje, selecionando também
  `user.image`, `user.isActive`, `user.createdAt`, `user.lastLoginAt`.
- Usuário inexistente → `null`. Não filtra por `is_active`: quem decide é a
  action.
- `getUserProfile` deixa de existir (sem alias). O único consumidor hoje é
  `app/(app)/layout.tsx`, que o `df-ui` troca nesta feature.
- `getDashboardSummary` passa a se chamar `findDashboardSummary` (mesma
  convenção), em `app/_lib/data/dashboard.ts`, sem alias. O `df-ui` troca o import
  em `app/(app)/dashboard/_components/dashboard-stats.tsx`. Ver
  `docs/contracts/dashboard.md`.

Até esta função existir, `npx tsc --noEmit` falha em
`app/_lib/data/users.ts:24` porque `UserProfile` ganhou quatro campos. É esperado
e se resolve na Onda 1.

```ts
export async function updateUserImage(
  userId: number,
  image: string | null,
): Promise<void>
```

- `update users set image = $image, updated_at = now() where id = $userId`.
- Não confere se a linha existia, não apaga arquivo, não conhece R2.

### `app/_lib/storage/` (novo, dono `df-data`)

Instala `@aws-sdk/client-s3`. Nenhum outro lugar do projeto importa o pacote.
Não importa `app/_lib/data/`, `app/_lib/auth/` nem `app/_lib/email/`. Pode
importar `app/_lib/domain/avatar` e `app/_lib/types/avatar`.

**Variáveis** — lidas na **primeira chamada**, nunca no carregamento do módulo.
Faltando alguma, lança
`Error("[storage] Variável de ambiente <NOME> não configurada.")`. Lançar no
carregamento derrubaria `app/_lib/actions/profile.ts` inteiro, e com ele a troca
de senha, que não usa R2 (risco 5 do plano).

| Variável                | Uso                                                         |
| ----------------------- | ----------------------------------------------------------- |
| `R2_ACCOUNT_ID`         | endpoint `https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com` |
| `R2_ACCESS_KEY_ID`      | `credentials.accessKeyId`                                   |
| `R2_SECRET_ACCESS_KEY`  | `credentials.secretAccessKey`                               |
| `R2_AVATARS_BUCKET`     | `Bucket` de upload e exclusão de avatar                     |
| `R2_AVATARS_PUBLIC_URL` | prefixo público, **sem barra final**                        |

**`app/_lib/storage/client.ts`** — interno do storage (a action não importa):

```ts
export const r2Client: () => S3Client
export const readStorageEnv: (name: StorageEnvName) => string
```

- `r2Client()` cria o `S3Client` na primeira chamada e reaproveita depois:
  `region: "auto"`, `endpoint` acima, credenciais acima.
- `readStorageEnv` devolve o valor ou lança a mensagem acima. `StorageEnvName` é a
  união dos cinco nomes, declarada no próprio arquivo.
- Nomes internos são livres; o que o contrato fixa é o comportamento.

**`app/_lib/storage/avatars.ts`** — o que a action importa:

```ts
interface AvatarFile {
  body: Uint8Array
  contentType: AvatarMimeType
}

export async function uploadAvatar(
  userId: number,
  file: AvatarFile,
): Promise<UploadedAvatar>

export async function deleteAvatarByUrl(url: string): Promise<void>
```

`uploadAvatar`

- Chave: `avatars/<userId>/<crypto.randomUUID()>.<AVATAR_EXTENSIONS[contentType]>`.
- `PutObjectCommand` com `Bucket: R2_AVATARS_BUCKET`, `Key`, `Body`,
  `ContentType: contentType` e `CacheControl: "public, max-age=31536000, immutable"`
  (a chave nunca é reescrita, então o cache pode ser eterno).
- Devolve `{ url: `${R2_AVATARS_PUBLIC_URL}/${key}` }`.
- Não valida tamanho nem tipo (a action já validou), não toca banco.
- Falha do R2 → lança.

`deleteAvatarByUrl`

- Só apaga se `url` começar com `${R2_AVATARS_PUBLIC_URL}/` **e** a chave
  derivada (o resto da URL) começar com `avatars/`. Qualquer outra URL — de outra
  origem, do seed, vazia — **retorna sem fazer nada e sem lançar**. É o que impede
  `users.image` com valor alheio de virar exclusão de objeto arbitrário.
- Com URL do bucket: `DeleteObjectCommand` com a chave derivada. Objeto já
  inexistente não é erro (o R2 responde sucesso).
- Falha do R2 → **lança**. Decisão: o storage não decide política de log; a
  action captura e registra (ver "df-actions"). Sem esta regra, cada chamador
  precisaria adivinhar se a falha foi engolida.

## `df-auth` — o que criar

### `app/_lib/auth/password-change.ts` (novo)

Arquivo separado de `session.ts` e `password-reset.ts`, no mesmo padrão.

```ts
export type PasswordChangeFailure =
  "INVALID_CURRENT_PASSWORD" | "PASSWORD_TOO_SHORT" | "PASSWORD_TOO_LONG"

export type ChangeUserPasswordInput = Pick<
  ChangePasswordInput,
  "currentPassword" | "newPassword"
>

export const changeUserPassword: (
  input: ChangeUserPasswordInput,
) => Promise<PasswordChangeFailure | null>
```

Implementação:

```ts
await auth.api.changePassword({
  body: {
    currentPassword: input.currentPassword,
    newPassword: input.newPassword,
    revokeOtherSessions: true,
  },
  headers: await headers(),
})
```

- `null` em sucesso. O retorno do Better Auth (`{ token, user }`) é descartado.
- `APIError` com `error.body?.code`:

  | Código do Better Auth            | Devolve                      |
  | -------------------------------- | ---------------------------- |
  | `INVALID_PASSWORD`               | `"INVALID_CURRENT_PASSWORD"` |
  | `PASSWORD_TOO_SHORT`             | `"PASSWORD_TOO_SHORT"`       |
  | `PASSWORD_TOO_LONG`              | `"PASSWORD_TOO_LONG"`        |
  | qualquer outro, e não-`APIError` | relança                      |

  Os relançados previstos: `UNAUTHORIZED` (sessão sumiu entre o
  `requireSession` da action e a chamada), `CREDENTIAL_ACCOUNT_NOT_FOUND` (conta
  sem senha — não existe no projeto, todas nascem com `credential`),
  `USER_DEACTIVATED` e `FAILED_TO_GET_SESSION` (ver abaixo).

- **Só pode ser chamada de Server Action.** O cookie novo depende de
  `cookies().set`, que só grava em Server Action e Route Handler. Chamada de
  Server Component troca a senha, apaga todas as sessões e **não** grava o
  cookie novo: o usuário cai no `/login`.

### O que o `changePassword` do Better Auth faz (1.7.5)

Fonte: `node_modules/better-auth/dist/api/routes/update-user.mjs`.

| Linha   | O que acontece                                                                                                                                                                                                                                                  |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 75-91   | Corpo: `newPassword: string`, `currentPassword: string`, `revokeOtherSessions?: boolean`                                                                                                                                                                        |
| 93      | `use: [sensitiveSessionMiddleware]` — relê a sessão **no banco**, ignorando cache de cookie (`api/routes/session.mjs:284-311`). Sem sessão: `UNAUTHORIZED`                                                                                                      |
| 162-170 | Tamanho da **nova** senha antes de tudo: `PASSWORD_TOO_SHORT` (< `minPasswordLength`, 8) e `PASSWORD_TOO_LONG` (> `maxPasswordLength`, 128)                                                                                                                     |
| 171-172 | Conta `credential` do usuário; sem ela ou sem hash: `CREDENTIAL_ACCOUNT_NOT_FOUND`                                                                                                                                                                              |
| 173-177 | Senha atual errada: `APIError("BAD_REQUEST")` com `code: "INVALID_PASSWORD"` (mensagem `Invalid password`, `@better-auth/core/dist/error/codes.mjs:9`)                                                                                                          |
| 179     | Grava o hash novo em `account.password`                                                                                                                                                                                                                         |
| 180-189 | Com `revokeOtherSessions: true`: `deleteUserSessions` apaga **todas** as sessões do usuário, inclusive a atual (181); `createSession` cria uma nova (182); `setSessionCookie` escreve o cookie dela na resposta (184-187); `token` = token da sessão nova (188) |
| 190-193 | Devolve `{ token: string \| null, user }`. `token` é `null` quando `revokeOtherSessions` é falso                                                                                                                                                                |

Ordem que importa: o tamanho da nova é checado **antes** da senha atual; com
senha nova curta e atual errada, o erro é `PASSWORD_TOO_SHORT`. O schema do
projeto já barra a senha curta antes, então na prática `INVALID_PASSWORD` é o
único que chega.

### Como o cookie da sessão atual sobrevive

"Mantém a atual" é, na verdade, **substitui a atual**: a linha de `session` do
navegador que pediu a troca é apagada junto com as outras e nasce outra, com
token novo. O navegador só continua logado se receber o cookie novo, e é o
plugin `nextCookies` que o entrega:

1. `setSessionCookie` (linha 184) põe o `Set-Cookie` da sessão nova em
   `ctx.context.responseHeaders`.
2. O hook `after` do `nextCookies`
   (`node_modules/better-auth/dist/integrations/next-js.mjs:72-99`) roda em toda
   chamada de `auth.api.*` que não veio do router (`_flag !== "router"`), lê esse
   `set-cookie`, e grava cada cookie com `cookies().set(...)` de `next/headers`.
3. Dentro de Server Action, `cookies().set` vai para a resposta e o Next
   re-renderiza a rota atual no mesmo round-trip
   (`node_modules/next/dist/docs/01-app/02-guides/server-actions.md:47`).

Condições para isso funcionar, todas já atendidas em `app/_lib/auth/auth.ts`:
`nextCookies()` registrado e **último** em `plugins` (o pacote avisa se não for,
`next-js.mjs:44-45`), e sem `cookieCache` de sessão. Fora de Server Action o
`cookies().set` lança e o plugin engole o erro em silêncio (`next-js.mjs:93-95`)
— daí a restrição acima.

Consequências da sessão nova, que o `df-debug` confere na Onda 3:

- **Os hooks de sessão rodam.** `createSession` passa por
  `databaseHooks.session.create` com o contexto do endpoint
  (`node_modules/better-auth/dist/db/with-hooks.mjs:8-19`), então `ctx` existe e
  o `SESSION_CONTEXT_MISSING` não dispara.
- **`last_login_at` é atualizado** pelo `create.after`. Trocar a senha conta
  como "último acesso" no perfil. Aceito: o usuário acabou de se autenticar com a
  senha atual.
- **Usuário desativado com sessão aberta** (ADR 003): o `create.before` lança
  `USER_DEACTIVATED` **depois** de a senha ter sido gravada e as sessões
  apagadas. Para não chegar a esse estado, a action checa `isActive` antes de
  chamar (ver "df-actions").
- A sessão nova tem `expiresAt` recalculado a partir de agora.

### Limite de tentativas

A regra do Better Auth para `/change-password` (10s / máximo 3,
`node_modules/better-auth/dist/api/rate-limiter/index.mjs:302-309`) só vale pelo
router. Pela chamada direta não há limite. Registrado como **terceiro ponto de
chamada** no adendo do ADR 007; não se resolve nesta feature.

## `df-email` — o que criar

### `app/_lib/email/password-changed.ts`

```ts
export const sendPasswordChangedEmail: (
  input: PasswordChangedEmailInput,
) => Promise<void>
```

- Mesmo comportamento de `sendPasswordResetEmail` diante de configuração: sem
  `RESEND_API_KEY` em desenvolvimento, `console.info` com `to` e assunto e
  resolve sem enviar; fora de desenvolvimento, lança; sem `EMAIL_FROM`, lança;
  falha do Resend, lança. Quem engole o erro é a action.
- Assunto: `Sua senha foi alterada — Direct Flow`.
- Com dois envios no projeto, o bloco "sem chave / sem remetente / enviar /
  checar erro" passa a existir duas vezes. Extrair para uma função interna de
  `app/_lib/email/` é decisão do `df-email`, e é recomendada (DRY).

### `emails/password-changed.ts` (padrão do ADR 006: `.ts`, função que devolve HTML)

```ts
export type PasswordChangedEmailProps = Omit<PasswordChangedEmailInput, "to">

export const renderPasswordChangedEmailHtml: (
  props: PasswordChangedEmailProps,
) => string
```

Conteúdo obrigatório:

- saudação com `userName`;
- `A senha da sua conta no Direct Flow foi alterada em <formatDateTime(changedAt)> (horário de Brasília).`
  — `formatDateTime` de `@/app/_lib/date`, nunca formatação à mão;
- que as outras sessões abertas foram encerradas;
- se foi o próprio usuário, não precisa fazer nada;
- **se não foi ele**: redefinir a senha agora pela opção "Esqueci minha senha"
  na tela de login **e** avisar o administrador do setor.

Sem link nem botão: não existe `APP_URL` (decisão registrada em
`docs/contracts/password-reset.md`, "Variáveis de ambiente"), e este e-mail não
justifica criá-la. O template não recebe nem exibe senha, IP, setor ou papel.

`userName` é interpolado em HTML: escape `&`, `<`, `>`, `"` e `'` antes de
interpolar. O template de reset atual não escapa; vale corrigir os dois na mesma
passada.

## `df-actions` — o que criar

### `app/_lib/actions/profile.ts` (novo, `"use server"`)

Mesma convenção das actions existentes: `ok` literal, `message` em PT-BR pronta
para o toast, `code` opcional só em falha de negócio. Nenhuma recebe `userId`: o
usuário vem sempre de `requireSession()`. Nenhuma fala com Better Auth, SQL ou
S3 direto.

```ts
export type ChangePasswordErrorCode =
  "INVALID_INPUT" | "INVALID_CURRENT_PASSWORD" | "USER_DEACTIVATED"

export interface ChangePasswordSuccess {
  ok: true
  message: string
}

export interface ChangePasswordFailure {
  ok: false
  message: string
  code?: ChangePasswordErrorCode
}

export type ChangePasswordResult = ChangePasswordSuccess | ChangePasswordFailure

export type AvatarErrorCode = "INVALID_INPUT" | "USER_DEACTIVATED"

export interface UpdateAvatarSuccess {
  ok: true
  message: string
  image: string
}

export interface RemoveAvatarSuccess {
  ok: true
  message: string
}

export interface AvatarFailure {
  ok: false
  message: string
  code?: AvatarErrorCode
}

export type UpdateAvatarResult = UpdateAvatarSuccess | AvatarFailure
export type RemoveAvatarResult = RemoveAvatarSuccess | AvatarFailure

export const changePassword: (
  input: ChangePasswordInput,
) => Promise<ChangePasswordResult>
export const updateAvatar: (formData: FormData) => Promise<UpdateAvatarResult>
export const removeAvatar: () => Promise<RemoveAvatarResult>
```

Mensagens (constantes no arquivo):

| Situação                           | `code`                     | Mensagem                                                    |
| ---------------------------------- | -------------------------- | ----------------------------------------------------------- |
| senha alterada                     | —                          | `Senha alterada. As outras sessões foram encerradas.`       |
| schema de senha falhou             | `INVALID_INPUT`            | primeira `issue.message` do Zod                             |
| `PASSWORD_TOO_SHORT` / `_TOO_LONG` | `INVALID_INPUT`            | `A senha precisa ter entre 8 e 128 caracteres.`             |
| senha atual errada                 | `INVALID_CURRENT_PASSWORD` | `Senha atual incorreta.`                                    |
| usuário desativado                 | `USER_DEACTIVATED`         | `Usuário desativado.`                                       |
| falha inesperada na senha          | —                          | `Não foi possível alterar a senha agora. Tente novamente.`  |
| foto atualizada                    | —                          | `Foto atualizada.`                                          |
| foto removida                      | —                          | `Foto removida.`                                            |
| arquivo inválido                   | `INVALID_INPUT`            | primeira `issue.message` do Zod                             |
| falha inesperada na foto           | —                          | `Não foi possível atualizar a foto agora. Tente novamente.` |

**`changePassword(input)`**

1. `const actor = await requireSession()`.
2. `changePasswordSchema.safeParse(input)`; inválido → `INVALID_INPUT`.
3. `const profile = await findUserProfile(actor.id)`; `null` → falha inesperada;
   `!profile.isActive` → `USER_DEACTIVATED`, sem chamar auth (ADR 003: quem
   precisa da garantia checa; aqui ela evita a troca pela metade descrita em
   "df-auth").
4. `changeUserPassword({ currentPassword, newPassword })` em `try/catch`;
   exceção → `console.error("[changePassword]", error)` e falha inesperada.
5. Falha devolvida → tabela acima.
6. Sucesso → `sendPasswordChangedEmail({ to: profile.email, userName: profile.name, changedAt: new Date() })`
   em `try/catch` próprio; exceção → `console.error("[changePassword] email", error)`
   e **segue**: a senha já mudou, e devolver erro faria o usuário tentar de novo
   com a senha que não é mais a atual.
7. Devolve sucesso. **Sem `revalidatePath` e sem `redirect`**: o cookie novo
   gravado pelo `nextCookies` já faz o Next re-renderizar a rota atual.

**`updateAvatar(formData)`**

1. `const actor = await requireSession()`.
2. `avatarFileSchema.safeParse(formData.get(AVATAR_FORM_FIELD))`; inválido →
   `INVALID_INPUT` com a primeira `issue.message`.
   Depois, `const body = new Uint8Array(await file.arrayBuffer())` e
   `const contentType = detectAvatarMimeType(body)`. Se `contentType` for `null`
   **ou** diferente de `file.type` → `INVALID_INPUT` com `AVATAR_FORMAT_ERROR`
   (importado de `@/app/_lib/validation/avatar`), sem tocar R2 nem banco. O tipo
   detectado já é `AvatarMimeType`, então `isAvatarMimeType` deixa de ser
   necessário aqui.
3. `findUserProfile(actor.id)`; `null` → falha inesperada; inativo →
   `USER_DEACTIVATED`. Guarde `previous = profile.image`.
4. `uploadAvatar(actor.id, { body, contentType })` — `contentType` é o tipo
   **detectado**, nunca `file.type`,
   em `try/catch`; exceção → log e falha inesperada (nada mudou).
5. `updateUserImage(actor.id, url)` em `try/catch`; exceção → log, tentar
   `deleteAvatarByUrl(url)` (também em `try/catch`, só log) e falha inesperada.
6. Se `previous` existe e é diferente de `url`: `deleteAvatarByUrl(previous)` em
   `try/catch`, exceção só vira log (risco 4 do plano). **Sempre depois** do
   passo 5.
7. `revalidatePath("/(app)", "layout")` — invalida o layout do grupo `(app)`
   (sidebar e cabeçalho) e as páginas abaixo dele, `/perfil` inclusive, sem tocar
   `(auth)`. Grupo de rota no caminho é aceito pelo Next 16
   (`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidatePath.md:160-162`).
8. `{ ok: true, message: "Foto atualizada.", image: url }`.

**`removeAvatar()`**

1. `requireSession()`; `findUserProfile`; `null` → falha inesperada; inativo →
   `USER_DEACTIVATED`.
2. `profile.image` já nulo → sucesso direto (idempotente), sem tocar banco nem R2.
3. `updateUserImage(actor.id, null)` em `try/catch`; exceção → log e falha
   inesperada.
4. `deleteAvatarByUrl(previous)` em `try/catch`, exceção só vira log.
5. `revalidatePath("/(app)", "layout")` e `{ ok: true, message: "Foto removida." }`.

## `df-ui` — o que criar

### `app/(app)/layout.tsx`

- Import `findUserProfile` no lugar de `getUserProfile`; o resto igual.
- Passa `image={profile.image}` para `AppSidebar` e `MobileHeader`, que repassam
  ao `UserAvatar`. Continua sem passar `profile` inteiro.

### `app/(app)/_components/user-menu.tsx`

Item **"Meu perfil"** entre o submenu "Tema" e o separador de "Sair":
`DropdownMenuItem asChild` com `<Link href="/perfil">`, ícone `UserRoundIcon` do
`lucide-react`. Vale para desktop e mobile, que já usam o mesmo `UserMenu`.

### `app/(app)/_components/user-avatar.tsx`

```ts
type UserAvatarSize = "sm" | "lg" | "xl"

interface UserAvatarProps {
  initials: string
  image?: string | null
  size?: UserAvatarSize
  className?: string
}
```

- `AvatarImage` com `src={image ?? undefined}` e `alt=""` (o `Avatar` já é
  `aria-hidden`; o nome está no texto ao lado), `AvatarFallback` com as iniciais
  como hoje. Sem `image`, ou com erro de carregamento, fica o fallback.
- `xl` = 96px (`size-24`), usado no topo do perfil. `sm` na sidebar e `lg` no
  cabeçalho mobile, como hoje.
- `<img>` do primitivo, não `next/image`: `next.config.ts` não muda (ADR 010).

### `app/(app)/perfil/page.tsx` (Server Component)

```tsx
export const metadata: Metadata = { title: "Meu perfil" }

const ProfilePage = async () => {
  const actor = await requireSession()
  const profile = await findUserProfile(actor.id)
  if (!profile) notFound()
  ...
}
```

`requireSession()` na página e não só no layout (ADR 008 e contrato do
dashboard: o layout não é guarda da página). Nenhum item da sidebar fica ativo,
porque `/perfil` não está na navegação.

Seções, na linguagem visual do Início (cards com raio 18px, `surface`, borda
`border-subtle`):

1. **Topo** — `UserAvatar` `xl`, `profile.name`,
   `describeMembership(profile.departmentName, profile.role)`, botões "Alterar
   foto" e "Remover" (este só quando `profile.image` existe). Os botões vivem no
   Client Component de envio (abaixo); a página passa `image` e `initials` por
   props.
2. **Dados da conta** — somente leitura, com o aviso
   `Para alterar, fale com o administrador do setor.`

   | Rótulo        | Valor                                                             |
   | ------------- | ----------------------------------------------------------------- |
   | Nome          | `profile.name`                                                    |
   | E-mail        | `profile.email`                                                   |
   | Setor         | `profile.departmentName`                                          |
   | Papel         | `ROLE_LABELS[profile.role]`                                       |
   | Situação      | `describeAccountStatus(profile.isActive)`                         |
   | Membro desde  | `formatDate(profile.createdAt)`                                   |
   | Último acesso | `profile.lastLoginAt ? formatDateTime(profile.lastLoginAt) : "—"` |

   `email_verified` não aparece.

3. **Segurança** — formulário de troca de senha inline.

Datas só por `@/app/_lib/date`.

### `app/(app)/perfil/_components/avatar-uploader.tsx` (Client Component)

Props: `image: string | null`, `initials: string`. Fluxo:

1. `<input type="file" accept={AVATAR_INPUT_ACCEPT}>` escondido, aberto pelo
   botão "Alterar foto".
2. `avatarSourceFileSchema.safeParse(file)`; falha → toast com a mensagem.
3. `createImageBitmap(file, { imageOrientation: "from-image" })` (respeita a
   rotação EXIF de foto de celular).
4. Canvas `AVATAR_SIZE_PX × AVATAR_SIZE_PX`; recorte central:
   `side = min(w, h)`, `sx = (w - side) / 2`, `sy = (h - side) / 2`,
   `drawImage(bitmap, sx, sy, side, side, 0, 0, AVATAR_SIZE_PX, AVATAR_SIZE_PX)`.
5. `canvas.toBlob(cb, "image/webp", AVATAR_WEBP_QUALITY)`. Se o blob vier `null`
   ou com `type` diferente de `image/webp` (Safari devolve PNG), gere de novo com
   `"image/png"`. Narrowing do tipo final com `isAvatarMimeType(blob.type)`.
6. `new File([blob], `avatar.${AVATAR_EXTENSIONS[type]}`, { type })`,
   `avatarFileSchema.safeParse` (mesmo schema da action), e
   `formData.append(AVATAR_FORM_FIELD, file)`.
7. `await updateAvatar(formData)` dentro de `startTransition`, botões desabilitados
   durante o envio; `ok` → `toast.success(message)`, senão `toast.error(message)`.
   O `revalidatePath` da action atualiza sidebar, cabeçalho e perfil sem recarregar.
8. "Remover" chama `removeAvatar()` com o mesmo tratamento.

Nenhum número mágico no componente: tamanho, qualidade, tipos, extensão e nome do
campo vêm de `app/_lib/domain/avatar.ts`.

### `app/(app)/perfil/_components/change-password-form.tsx` (Client Component)

- React Hook Form + `zodResolver(changePasswordSchema)` + `field` do shadcn, no
  padrão dos formulários de `app/(auth)/`.
- Três campos `type="password"`: "Senha atual" (`autoComplete="current-password"`),
  "Nova senha" e "Confirmar nova senha" (`autoComplete="new-password"`).
- Resultado de `changePassword(values)`:
  - `ok` → `toast.success(message)` e `form.reset()`;
  - `code === "INVALID_CURRENT_PASSWORD"` →
    `form.setError("currentPassword", { message })`, sem toast;
  - `code === "INVALID_INPUT"` → `form.setError("newPassword", { message })`, sem
    toast. Com o schema rodando no cliente, esse código só chega do servidor pelo
    tamanho da senha nova (`PASSWORD_TOO_SHORT` / `PASSWORD_TOO_LONG` do Better
    Auth), então o campo certo é "Nova senha";
  - qualquer outra falha (`USER_DEACTIVATED`, inesperada) → `toast.error(message)`.

## Variáveis de ambiente

Acrescentadas em `.env.example` pelo `df-architect`. Valores preenchidos pelo
usuário no `.env` (feito em 2026-09-24).

| Variável                | Para quê                                                             |
| ----------------------- | -------------------------------------------------------------------- |
| `R2_ACCOUNT_ID`         | conta Cloudflare; monta o endpoint S3 do R2                          |
| `R2_ACCESS_KEY_ID`      | chave de acesso do token R2                                          |
| `R2_SECRET_ACCESS_KEY`  | segredo do token R2                                                  |
| `R2_AVATARS_BUCKET`     | nome do bucket público de fotos                                      |
| `R2_AVATARS_PUBLIC_URL` | URL pública do bucket, **sem barra final**; prefixo de `users.image` |

## Checklist de encerramento da feature

- [ ] `findUserProfile` com os campos novos, `updateUserImage`, `app/_lib/storage/` (`df-data`)
- [ ] `changeUserPassword` em `app/_lib/auth/password-change.ts` (`df-auth`)
- [ ] `sendPasswordChangedEmail` e `emails/password-changed.ts` (`df-email`)
- [ ] `changePassword`, `updateAvatar`, `removeAvatar` (`df-actions`)
- [ ] item "Meu perfil", `UserAvatar` com foto, `/perfil` completo (`df-ui`)
- [ ] nenhuma ocorrência de `getUserProfile` no projeto
- [ ] nenhum import de `@aws-sdk/client-s3` fora de `app/_lib/storage/`
- [ ] senha atual errada não muda nada; certa mantém esta sessão e derruba as outras; e-mail chega (`df-debug`)
- [ ] upload grava no R2, atualiza sidebar/cabeçalho/perfil e apaga o antigo; remover apaga e volta às iniciais (`df-debug`)
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm run build`
