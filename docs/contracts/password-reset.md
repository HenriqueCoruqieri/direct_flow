# Contrato — Esqueci minha senha (redefinição por e-mail)

Entrada das ondas 1, 2 e 3. Continua `docs/contracts/auth.md` (login, sessão,
`Actor`) e não altera nada do que está lá. Esta é a primeira feature que envia
e-mail no projeto: o Resend entra aqui.

Versões observadas: `better-auth@1.7.5`, `next@16.3.5`, `zod@4.6.5`,
`resend@6.28.1`.

A seção `df-email` foi reescrita depois da Onda 1: o template é `.ts` com função
que devolve HTML, não `.tsx` com componente React. O motivo está em
"Por que o template não é componente React" e em `docs/adr/006-…`.

Duas seções foram reescritas depois de entregues, e a divergência com a previsão
original é a parte que importa: `proxy.ts` ficou com uma regra só e devolveu o
redirecionamento de quem já está logado para `app/(auth)/login/page.tsx`
(`docs/adr/008-…`), e `RESEND_API_KEY` ausente passou a falhar fora de
desenvolvimento.

## Decisões fixadas pelo usuário

1. O pedido do link é um **dialog no `/login`**, não uma página.
2. A resposta do pedido é **sempre idêntica**, exista ou não a conta:
   `Se houver uma conta com esse e-mail, enviamos as instruções de redefinição.`
3. Link válido por **15 minutos**, **uso único**.
4. A tela de redefinição mostra o **e-mail mascarado** (`he••••••@gmail.com`),
   nunca o nome nem o e-mail completo.
5. Senha nova: **8 a 128 caracteres**, sem exigência de composição, mais
   confirmação que precisa bater.
6. **Todas as sessões** do usuário são revogadas depois do reset.
7. Usuário com `isActive: false` **não recebe e-mail**; a resposta ao pedido é a
   mesma mensagem genérica.

## Por que a mensagem é sempre a mesma

Uma mensagem diferente para e-mail inexistente transforma o formulário em
**oráculo de enumeração de contas**: qualquer pessoa descobre, sem autenticação e
em lote, quem tem conta no Direct Flow. Como as contas são corporativas e o
e-mail é o login, a lista vazada é diretamente acionável para ataque de senha.

Consequência aceita: quem digita um e-mail errado recebe a mesma confirmação e
não descobre o erro pela tela. É o custo, e é deliberado.

Por isso a mensagem de sucesso é **uma constante só**, devolvida em **todos** os
caminhos do pedido:

- e-mail não existe;
- e-mail existe e está ativo (único caso em que o e-mail sai de fato);
- e-mail existe e `isActive = false`;
- o envio pelo Resend falhou (erro registrado no log do servidor).

O único retorno diferente do pedido é **formato de e-mail inválido**
(`INVALID_INPUT`), que não revela existência de conta — só diz que o texto
digitado não é um e-mail. Ninguém "melhora" isso depois: alterar qualquer um dos
quatro caminhos acima para uma mensagem própria reabre a enumeração. Ver
`docs/adr/004-resposta-identica-no-pedido-de-redefinicao.md`.

## Tabelas, enums e migration

**Nenhuma tabela nova. Nenhuma coluna nova. Nenhuma migration.**

O token vive na tabela `verification`, que já existe em `db/auth-schema.ts` desde
a etapa de login (era declarada por exigência do core e agora passa a ser usada):

| Coluna       | Conteúdo no fluxo de reset               |
| ------------ | ---------------------------------------- |
| `identifier` | `reset-password:<token>`                 |
| `value`      | `users.id` do dono do token, como string |
| `expiresAt`  | `now() + 15 min`                         |

O token é gravado em **texto puro** (`generateId(24)`), não hasheado — é o desenho
do Better Auth, não uma escolha nossa. Ele é de uso único: `resetPassword`
consome a linha com `consumeVerificationValue`, que **deleta** o registro. Um
segundo POST com o mesmo token não encontra nada e é indistinguível de token
expirado — os dois dão `INVALID_TOKEN`.

`db/schema.ts` não muda. `users` não ganha coluna.

## Domínio — `app/_lib/domain/`

Primeiras funções puras do projeto. Padrão estabelecido: **um arquivo por
assunto**, `kebab-case`, sem `index.ts` de barril, só exportações nomeadas, zero
I/O (nada de banco, sessão, `process.env`, React ou `Date.now()`).

### `app/_lib/domain/email.ts`

```ts
maskEmail(email: string): string
```

Regra de mascaramento (decidida aqui e não repetida em nenhum outro lugar):

- separa no **último** `@` (o local part pode conter `@` entre aspas; o último é
  sempre o separador de domínio);
- a parte visível do local part é `min(2, floor(local.length / 2))` caracteres:
  nunca mais da metade do local part, no máximo 2;
- o resto do local part é substituído por **exatamente 6 bullets** (`••••••`),
  independentemente do tamanho real — o número de bullets não é o número de
  caracteres escondidos, então o comprimento do e-mail também não vaza;
- o domínio fica **intacto**;
- entrada sem formato usável (sem `@`, local part vazio, domínio vazio) devolve
  só `••••••`, sem domínio. A função nunca ecoa de volta uma entrada que não
  reconheceu.

| Entrada                 | Saída                |
| ----------------------- | -------------------- |
| `heoliveirac@gmail.com` | `he••••••@gmail.com` |
| `abcd@x.com`            | `ab••••••@x.com`     |
| `abc@x.com`             | `a••••••@x.com`      |
| `ab@b.com`              | `a••••••@b.com`      |
| `a@b.com`               | `••••••@b.com`       |
| `sem-arroba`            | `••••••`             |

Por que o domínio fica visível: é o que dá ao usuário a informação que ele
precisa — em qual caixa procurar o e-mail — e é a parte que menos identifica
alguém (é compartilhada por toda a empresa ou por todo o Gmail). Mascarar o
domínio tiraria o reconhecimento sem aumentar a privacidade.

Por que no máximo 2 caracteres, e menos ainda em local part curto: com
`a@b.com`, mostrar 1 de 1 caractere exibiria o e-mail inteiro. A fórmula
`floor(length / 2)` garante que nunca se mostra mais da metade.

### `app/_lib/domain/password-reset.ts`

```ts
PASSWORD_RESET_TTL_MINUTES: number // 15
PASSWORD_RESET_TTL_SECONDS: number // 900, derivado do anterior
```

Fonte única dos 15 minutos. Existem porque o mesmo prazo aparece em três
lugares com **unidades diferentes**: `resetPasswordTokenExpiresIn` do Better Auth
é em **segundos**, o corpo do e-mail fala em **minutos** e o texto da tela também.
Três literais divergiriam na primeira mudança. `df-auth` usa
`PASSWORD_RESET_TTL_SECONDS`; quem monta o e-mail passa
`PASSWORD_RESET_TTL_MINUTES` em `expiresInMinutes`.

## Validação — `app/_lib/validation/auth.ts`

`loginSchema` e `LoginInput` **não mudam**. O arquivo ganhou dois schemas e, por
DRY, o campo de e-mail passou a ser uma constante interna (`emailField`)
compartilhada com `loginSchema` — mesmas regras, mesmas mensagens, um lugar só.

```ts
export const requestPasswordResetSchema: z.ZodObject<{ email }>
export type RequestPasswordResetInput = { email: string }

export const resetPasswordSchema // z.object({ password, confirmPassword }) + refine
export type ResetPasswordInput = { password: string; confirmPassword: string }
```

| Campo             | Regra                          | Mensagem                                               |
| ----------------- | ------------------------------ | ------------------------------------------------------ |
| `email`           | string, `trim`, obrigatório    | `Informe seu e-mail.`                                  |
| `email`           | formato (`z.email()`)          | `E-mail inválido.`                                     |
| `password`        | obrigatório                    | `Informe a nova senha.`                                |
| `password`        | mínimo 8                       | `A senha precisa ter no mínimo 8 caracteres.`          |
| `password`        | máximo 128                     | `A senha precisa ter no máximo 128 caracteres.`        |
| `confirmPassword` | obrigatório                    | `Confirme a nova senha.`                               |
| objeto            | `password === confirmPassword` | `As senhas não conferem.` — **path `confirmPassword`** |

- O erro de divergência é reportado **no campo de confirmação**, não no objeto:
  é lá que o React Hook Form vai exibi-lo.
- Sem exigência de composição (maiúscula, dígito, símbolo). 8 a 128 é exatamente
  a janela que o Better Auth impõe (`minPasswordLength` / `maxPasswordLength`),
  então `PASSWORD_TOO_SHORT` / `PASSWORD_TOO_LONG` da biblioteca só aparecem se
  alguém contornar o schema.
- `password` **não** leva `trim`: espaço é caractere de senha válido.
- Schemas puros, sem I/O: o mesmo objeto serve ao `zodResolver` no cliente e ao
  `safeParse` na action.

## Tipos — `app/_lib/types/email.ts`

```ts
export interface PasswordResetEmailInput {
  to: string
  userName: string
  resetUrl: string
  expiresInMinutes: number
}
```

`df-email` **não consulta banco e não conhece Better Auth**: recebe tudo pronto.
`to` é o e-mail completo (é o destinatário real — mascarar aqui não faria
sentido); `userName` é `users.name`; `resetUrl` é a URL já montada pelo Better
Auth (ver "O caminho do link"); `expiresInMinutes` vem de
`PASSWORD_RESET_TTL_MINUTES`.

## O caminho do link

O Better Auth monta a URL assim (`api/routes/password.mjs:80-81`):

```
<BETTER_AUTH_URL>/api/auth/reset-password/<token>?callbackURL=<encodeURIComponent(redirectTo)>
```

`ctx.context.baseURL` já inclui o basePath `/api/auth` — não o acrescente de
novo. Essa é a URL que chega em `sendResetPassword({ url })` e é ela que vai no
e-mail, sem reescrita.

O GET nesse endpoint (`/api/auth/reset-password/:token`) não redefine nada: ele
valida a existência e a validade do token e **redireciona 302**:

| Situação                               | Destino                             |
| -------------------------------------- | ----------------------------------- |
| token existe e não expirou             | `<callbackURL>?token=<token>`       |
| token ausente, inexistente ou expirado | `<callbackURL>?error=INVALID_TOKEN` |
| `callbackURL` vazio                    | `/api/auth/error` — tela do pacote  |

**`callbackURL` é obrigatório.** Sem ele o usuário cai em `/api/auth/error`, uma
tela genérica do Better Auth, e o fluxo morre ali. Ou seja: `redirectTo` no corpo
de `requestPasswordReset` não é opcional para nós.

**`callbackURL` precisa começar com `/`.** O destino é resolvido com
`new URL(callbackURL, ctx.baseURL)` e `baseURL` é `.../api/auth`: `"/reset-password"`
resolve para `<origin>/reset-password`, mas `"reset-password"` resolveria para
`<origin>/api/auth/reset-password` — o endpoint da própria API.

Caminho relativo passa no `originCheck` (`allowRelativePaths: true` para
`callbackURL` e `redirectTo`), então não é preciso montar URL absoluta nem mexer
em `trustedOrigins`.

O GET **não consome** o token: ele continua valendo até o POST de `resetPassword`.
Isso é o que permite a tela carregar o e-mail mascarado e só então gastar o token.

### Rota da tela de redefinição: `/reset-password`

`app/(auth)/reset-password/page.tsx` (dono `df-auth`, é `app/(auth)/**`).

Nome em inglês para acompanhar as rotas que já existem (`/login`, `/dashboard`) —
o projeto usa inglês na URL e português na interface. Não há colisão com o
endpoint do Better Auth: aquele vive sob `/api/auth/reset-password/<token>`.

`redirectTo` enviado pela camada de auth é, portanto, a string `"/reset-password"`.

## `df-email` — o que existe (Onda 1 entregue)

Pacote: `resend`, e só ele. Nenhuma dependência de renderização foi instalada —
ver **"Por que o template não é componente React"** logo abaixo antes de propor
qualquer mudança aqui.

Variáveis: `RESEND_API_KEY`, `EMAIL_FROM` (já em `.env.example`).

`app/_lib/email/client.ts` — instância e configuração, separada do envio.

```ts
export const resend: Resend | null
export const emailFrom: string | undefined
```

`resend` é `null` quando `RESEND_API_KEY` não está definida, e isso só é
alcançável em desenvolvimento: fora dele o módulo **lança no carregamento**. Ver
"`RESEND_API_KEY` ausente" abaixo.

`app/_lib/email/password-reset.ts`

```ts
sendPasswordResetEmail(input: PasswordResetEmailInput): Promise<void>
```

- Importa o tipo de `@/app/_lib/types/email` e o HTML de `@/emails/password-reset`.
- Resolve em sucesso; **lança** em falha de envio (não devolve booleano nem
  objeto de resultado — quem chama é o callback do Better Auth, que já trata
  exceção; ver "Onde o erro de envio é engolido").
- Sem `RESEND_API_KEY` **em desenvolvimento** (`resend === null`): registra
  `console.info` com destinatário, assunto e `resetUrl`, e **resolve sem enviar**. É
  o modo de desenvolvimento sem conta no Resend — o link sai no log do servidor e o
  fluxo pode ser percorrido inteiro.
- Sem `RESEND_API_KEY` **fora de desenvolvimento**: **lança**, tanto no
  carregamento de `client.ts` quanto no envio. Ver "`RESEND_API_KEY` ausente"
  abaixo.
- Sem `EMAIL_FROM`, já com `RESEND_API_KEY` presente: **lança**.
- Não importa `app/_lib/auth/**` (seção 2 do `stack.md`), não toca banco, não
  monta URL e não decide se deve enviar: essa decisão é de quem chama.

`emails/password-reset.ts` — template. **`.ts`, não `.tsx`:** função pura que
devolve a string HTML, sem JSX e sem React.

```ts
export interface PasswordResetEmailProps
  extends Omit<PasswordResetEmailInput, "to"> {}

renderPasswordResetEmailHtml(props: PasswordResetEmailProps): string
```

As props seguem derivadas de `PasswordResetEmailInput` menos `to` — o
destinatário é assunto de quem envia, não do corpo. O HTML é um documento completo
(`<!doctype html>`) com estilos inline, e a string vai no campo `html` de
`resend.emails.send`. O campo `react` do SDK **não** é usado em nenhum lugar do
projeto.

Sobre a supressão de lint no template: derivar o tipo em vez de reescrever os três
campos é o correto — o tipo tem uma fonte só —, mas a forma acima obriga
`// eslint-disable-next-line @typescript-eslint/no-empty-object-type` por causa do
corpo de interface vazio. Como `PasswordResetEmailProps` não é mais prop de
componente React e sim tipo utilitário derivado,
`type PasswordResetEmailProps = Omit<PasswordResetEmailInput, "to">` atende à seção
5 do `stack.md` ("`type` só para … tipos utilitários"), passa no
`consistent-type-definitions` (que só reclama de alias de objeto literal) e
dispensa a supressão. É a forma a preferir neste template e nos futuros.

Conteúdo mínimo obrigatório: saudação com `userName`, botão/link para `resetUrl`,
a frase de validade usando `expiresInMinutes`, e o aviso de que o link é de uso
único e que, se não foi ele quem pediu, basta ignorar o e-mail. **O template não
recebe e não exibe senha, token cru separado do link, nem dados de setor/papel.**

Assunto do e-mail: `Redefinição de senha — Direct Flow`.

### Por que o template não é componente React

Esta seção do contrato prescrevia `emails/password-reset.tsx` e afirmava que o
`resend` já traz o renderizador. **As duas coisas estavam erradas**, e a correção
está aqui para que ninguém "melhore" o template depois de volta para JSX:

1. `@react-email/render` é `peerDependency` **opcional** do `resend@6.28.1`, não
   dependência embutida (`resend/dist/index.mjs:219-227` faz
   `await import("@react-email/render")` dentro de `try/catch`). Sem instalá-la, o
   campo `react` lança em runtime — e como a exceção cai no `try/catch` de
   `sendResetPassword`, o e-mail simplesmente não sai e o usuário vê a mensagem
   genérica de sucesso.
2. `renderToStaticMarkup` de `react-dom/server` **derruba o build**. O envio é
   chamado pelo callback `sendResetPassword`, dentro da instância do Better Auth,
   então o módulo de e-mail é alcançável por `app/api/auth/[...all]/route.ts` e por
   todo Server Component que lê sessão. O Turbopack recusa com erro, não aviso.

Vale para todo template de e-mail do projeto, não só para este. Reverter exige
aprovação para instalar `@react-email/render` **e** tirar o envio de dentro do
callback do Better Auth. Ver
`docs/adr/006-template-de-e-mail-como-funcao-que-devolve-html.md`.

### `RESEND_API_KEY` ausente

Chave faltando é **misconfiguração fora de desenvolvimento**, e falha como tal.
Decisão do usuário; o caminho de log continua existindo, mas só em
`NODE_ENV === "development"`.

- `app/_lib/email/client.ts` lança no **carregamento do módulo** quando não há
  chave e não é desenvolvimento. A falha aparece no boot do servidor, não na
  primeira tentativa de envio.
- `sendPasswordResetEmail` lança também no envio, pela mesma condição. É
  redundante de propósito: as duas guardas cobrem carregamento e chamada, e nenhuma
  depende de a outra ter rodado.
- O `console.info` com `to` e `resetUrl` fica inalcançável fora de
  desenvolvimento, porque a exceção acontece antes. Isso resolve a exposição do
  token em log: a URL contém o token em texto puro, e quem lê o log poderia
  redefinir a senha de quem pediu o link.
- Exceção deliberada: `NEXT_PHASE === PHASE_PRODUCTION_BUILD` desativa a guarda de
  carregamento, senão `npm run build` exigiria a chave só para compilar. Em build
  nada é enviado, então não há o que proteger.

Assimetria que sobra, e é aceita: `EMAIL_FROM` continua falhando apenas no envio,
não no boot. Quem configurar o ambiente de produção trata as duas como
obrigatórias.

## `df-auth` — o que criar

### Opções novas na instância (`app/_lib/auth/auth.ts`)

Dentro de `emailAndPassword`, mantendo `enabled` e `disableSignUp` como estão:

```ts
resetPasswordTokenExpiresIn: PASSWORD_RESET_TTL_SECONDS,
revokeSessionsOnPasswordReset: true,
sendResetPassword: async ({ user, url }) => { ... },
```

- `resetPasswordTokenExpiresIn` é em **segundos** (default 3600). Use a constante
  de `@/app/_lib/domain/password-reset`, nunca `900` literal.
- `revokeSessionsOnPasswordReset` é `false` por default; ligar é requisito do
  usuário (decisão 6). Ele roda `deleteUserSessions(userId)` depois de gravar a
  senha nova.
- Sem `sendResetPassword` configurado, o endpoint responde
  `BAD_REQUEST / RESET_PASSWORD_DISABLED` e nada é enviado.

### O callback `sendResetPassword`

Assinatura real: `(data: { user, url, token }, request?: Request) => Promise<void>`.

Responsabilidades, nesta ordem:

1. **Checar `isActive`.** O fluxo de reset **não** passa pelo hook
   `databaseHooks.session.create.before`, onde mora a checagem de usuário
   desativado do login (`docs/contracts/auth.md`, "Erros de login"). Sem esta
   checagem aqui, usuário desativado receberia o link e redefiniria a senha.
   `user` chega tipado como o `User` do core, então narrowing com `in`, o mesmo
   padrão já usado em `auth.ts` no hook de sessão — **não** `as`:

   ```ts
   if ("isActive" in user && user.isActive === false) return
   ```

   Retornar sem enviar é o comportamento correto: o endpoint segue e responde
   sucesso normalmente, e a action devolve a mensagem genérica.

2. **Chamar `sendPasswordResetEmail`** com
   `{ to: user.email, userName: user.name, resetUrl: url, expiresInMinutes: PASSWORD_RESET_TTL_MINUTES }`.
   `url` vai **cru**, sem reescrita: ele já contém token e `callbackURL`.

3. **Engolir o erro de envio.** Envolver a chamada em `try/catch`, registrar com
   `console.error("[sendResetPassword]", error)` e **não** relançar.

#### Onde o erro de envio é engolido, e por quê

Se o callback lançar, o Better Auth propaga o erro, o endpoint devolve 500 e a
action teria de responder algo diferente da mensagem genérica — o que faria a
resposta variar por motivo interno e, pior, criaria um canal em que a resposta
diferente correlaciona com "a conta existe e tentamos enviar". A mensagem tem de
ser constante (ver o começo deste documento), então a falha de envio vira
**registro no log do servidor**, não mudança de resposta. Consequência aceita: um
usuário cujo e-mail falhou vê a confirmação e não recebe nada; a evidência está
no log.

### Wrappers que a action consome — `app/_lib/auth/password-reset.ts`

Arquivo novo em `app/_lib/auth/`, separado de `session.ts` (uma
responsabilidade por arquivo). `app/_lib/actions/**` continua sem importar
`better-auth`.

```ts
export type ResetPasswordFailure =
  | "INVALID_TOKEN"
  | "PASSWORD_TOO_SHORT"
  | "PASSWORD_TOO_LONG"

requestPasswordResetEmail(input: RequestPasswordResetInput): Promise<void>
resetPasswordWithToken(input: { token: string; password: string }): Promise<ResetPasswordFailure | null>
findMaskedEmailForResetToken(token: string): Promise<string | null>
```

**`requestPasswordResetEmail`**

```ts
await auth.api.requestPasswordReset({
  body: { email: input.email, redirectTo: "/reset-password" },
})
```

- Sem `headers`: nada neste caminho depende de cookie ou sessão, e sem
  `ctx.request` o `originCheck` é dispensado.
- Resolve `void` em todos os casos de negócio — inclusive e-mail inexistente, que
  o próprio Better Auth já responde como sucesso silencioso, com corpo idêntico e
  com trabalho falso (`generateId` + lookup dummy) para não vazar a existência da
  conta pelo **tempo de resposta** (`api/routes/password.mjs:57-72`). Não tente
  "melhorar" esse caminho.
- `APIError` inesperado (ex.: `RESET_PASSWORD_DISABLED`) é **relançado** para a
  action registrar no log. A action continua devolvendo a mensagem genérica.

**`resetPasswordWithToken`**

```ts
await auth.api.resetPassword({
  body: { newPassword: input.password, token: input.token },
})
```

- `null` em sucesso; código de falha quando o `APIError` for conhecido
  (`error.body?.code`), seguindo o padrão de `signInWithPassword`
  (`app/_lib/auth/session.ts:45-66`). Erro desconhecido é relançado.
- Códigos do Better Auth a traduzir: `INVALID_TOKEN` (inclui `USER_NOT_FOUND`,
  que nesta feature só ocorre com token órfão e não merece caso próprio),
  `PASSWORD_TOO_SHORT`, `PASSWORD_TOO_LONG`.
- **Token expirado e token já usado são indistinguíveis**: os dois chegam como
  `INVALID_TOKEN`, porque consumir o token deleta a linha. Não tente diferenciar
  — e a mensagem ao usuário já cobre os dois casos.
- A checagem de `isActive` **não** se repete aqui: usuário desativado nunca
  recebeu link, logo não tem token válido.
- Em sucesso, chama `signOutSession()` antes de devolver `null`. O `resetPassword`
  do Better Auth revoga as sessões no banco, mas não apaga o cookie **deste**
  navegador; sem o sign-out o usuário volta a `/login` com cookie de aparência
  válida e sessão inexistente, que é a divergência do ADR 008. Falha do sign-out é
  registrada no log e **não** muda o retorno: a senha já foi trocada, e devolver
  erro faria o usuário repetir um reset que funcionou.

**`findMaskedEmailForResetToken`** — resolve token para e-mail mascarado **sem
consumir** o token:

```ts
const ctx = await auth.$context
const verification = await ctx.internalAdapter.findVerificationValue(
  `reset-password:${token}`,
)
if (!verification || verification.expiresAt < new Date()) return null
const owner = await ctx.internalAdapter.findUserById(verification.value)
if (!owner) return null
return maskEmail(owner.email)
```

- `findVerificationValue` **não** checa expiração: a comparação com `new Date()`
  é obrigatória (é o que o próprio endpoint de callback faz).
- `verification.value` é o `users.id` como string e é o que `findUserById`
  espera — não converta.
- Devolve `null` para token ausente, expirado, já consumido ou órfão. A tela
  trata os quatro do mesmo jeito.
- `maskEmail` vem de `@/app/_lib/domain/email`. A função de auth é a **única**
  que vê o e-mail completo nesse caminho; a action e a UI só recebem o mascarado.
- Ver `docs/adr/005-token-de-reset-resolvido-pelo-internal-adapter.md` para por
  que isso não é uma query em `app/_lib/data/`.

### Ponto em aberto — pedido de redefinição sem limite de tentativas

`requestPasswordResetEmail` chama `auth.api.requestPasswordReset` direto da camada
de auth. O Better Auth tem regra de limite para esse endpoint (60s / máximo 3), mas
ela roda no `onRequest` do router do pacote, e a chamada direta não passa pelo
router — logo, **não há limite nenhum** no fluxo entregue. Dá para disparar e-mail
em laço para um endereço arbitrário: mail bomb, queima de cota do Resend e uma
linha em `verification` por pedido.

Decidido registrar e resolver antes do deploy, porque a camada certa (limite na
borda do host, limitador do próprio Better Auth com storage em banco, ou
implementação nossa na action) depende de onde a aplicação for hospedada. O mesmo
furo existe em `signInWithPassword`; os dois se resolvem na mesma passada. Ver
`docs/adr/007-limite-de-tentativas-em-login-e-pedido-de-redefinicao.md`.

Restrição para quem implementar: sob limite, a resposta do pedido continua **byte a
byte a mesma** das outras (seção "Por que a mensagem é sempre a mesma"). Um
`Muitas tentativas para este e-mail.` vira oráculo de existência de conta e desfaz
o ADR 004.

### `proxy.ts` (entregue, e diferente do que este contrato previa)

`authRoutes` **não existe**. O proxy ficou com **uma** regra:

```ts
const publicRoutes = ["/login", "/reset-password"]
```

- rota em `publicRoutes` → passa
- fora dela, cookie de sessão ausente → `redirect("/login")`

`/reset-password` precisa ser alcançável **sem** sessão e **não** pode ser
redirecionada para `/dashboard` quando existe cookie (quem clica no link pode
estar logado em outra conta, ou com sessão velha no mesmo navegador; mandá-lo ao
dashboard mata o fluxo e deixa a senha sem redefinir). Com uma regra só, isso sai
de graça.

A regra "já está logado, vai para o dashboard" **mudou de camada**: mora em
`app/(auth)/login/page.tsx`, Server Component que chama `getSession()` e
redireciona quando existe sessão **no banco**. A versão de duas regras decidia isso
no proxy a partir da presença do cookie, e presença de cookie não é sessão —
`getSessionCookie` não confere assinatura, expiração nem banco
(`better-auth/dist/cookies/index.mjs:261-270`). Depois do reset, que revoga as
sessões e deixa o cookie no navegador, as duas camadas discordavam e o par
proxy/`/dashboard` entrava em ciclo; o `df-debug` mediu 12 redirecionamentos sem
convergir. Ver `docs/adr/008-redirecionamento-de-sessao-fora-do-proxy.md`.

O `matcher` **não muda**: `/((?!api/auth|_next/static|_next/image|.*\..*).*)` já
exclui `/api/auth/**`, então o GET do callback do Better Auth não passa pelo
proxy — se passasse, seria redirecionado para `/login` e o token nunca chegaria à
tela.

## `df-actions` — o que criar

`app/_lib/actions/password-reset.ts` (arquivo novo; `auth.ts` continua com
`signIn`/`signOut`). Mesma convenção de retorno de `docs/contracts/auth.md`:
`ok` literal, `message` já em PT-BR pronta para exibição, `code` opcional para
quem quiser reagir a um caso específico, sucesso que redireciona não retorna
valor.

```ts
interface RequestPasswordResetSuccess {
  ok: true
  message: string
}

interface RequestPasswordResetFailure {
  ok: false
  message: string
  code: "INVALID_INPUT"
}

type RequestPasswordResetResult =
  | RequestPasswordResetSuccess
  | RequestPasswordResetFailure

type ResetPasswordErrorCode = "INVALID_TOKEN" | "INVALID_INPUT"

interface ResetPasswordResult {
  ok: false
  message: string
  code?: ResetPasswordErrorCode
}

requestPasswordReset(input: RequestPasswordResetInput): Promise<RequestPasswordResetResult>
resetPassword(input: ResetPasswordInput & { token: string }): Promise<ResetPasswordResult | void>
```

Mensagens (constantes no próprio arquivo, como `LOGIN_ERROR_MESSAGE`):

| Constante                     | Texto                                                                         |
| ----------------------------- | ----------------------------------------------------------------------------- |
| sucesso do pedido             | `Se houver uma conta com esse e-mail, enviamos as instruções de redefinição.` |
| `INVALID_INPUT` (pedido)      | `E-mail inválido.`                                                            |
| `INVALID_TOKEN`               | `Este link expirou ou já foi usado. Peça um novo.`                            |
| `INVALID_INPUT` (redefinição) | `A senha precisa ter entre 8 e 128 caracteres.`                               |
| falha inesperada              | `Não foi possível concluir agora. Tente novamente.`                           |

**`requestPasswordReset`**

1. `requestPasswordResetSchema.safeParse(input)`; inválido → `ok: false`,
   `code: "INVALID_INPUT"`.
2. `await requestPasswordResetEmail(parsed.data)` dentro de `try/catch`.
3. Sucesso **e** exceção capturada (com `console.error("[requestPasswordReset]", error)`)
   devolvem **o mesmo** `{ ok: true, message: <sucesso do pedido> }`. Este `ok: true`
   no caminho de erro é intencional e é o coração da decisão 2: a resposta não
   pode variar com o que aconteceu do lado do servidor.
4. Não redireciona: o dialog continua aberto e troca o formulário pela mensagem.
5. Não chama `app/_lib/data/**` e não checa existência de conta — quem sabe se a
   conta existe é o Better Auth, e a action nem precisa saber.

**`resetPassword`**

1. `resetPasswordSchema.safeParse({ password, confirmPassword })`; inválido →
   `code: "INVALID_INPUT"` com a mensagem de tamanho.
2. `token` vazio → `code: "INVALID_TOKEN"`, sem chamar auth.
3. `await resetPasswordWithToken({ token, password })` em `try/catch`.
4. Tradução da falha do wrapper:

   | `ResetPasswordFailure`                     | `code`          | Mensagem                 |
   | ------------------------------------------ | --------------- | ------------------------ |
   | `INVALID_TOKEN`                            | `INVALID_TOKEN` | link expirado / já usado |
   | `PASSWORD_TOO_SHORT` / `PASSWORD_TOO_LONG` | `INVALID_INPUT` | 8 a 128 caracteres       |

5. Exceção inesperada: `console.error("[resetPassword]", error)` e
   `{ ok: false, message: <falha inesperada> }`, **sem** `code`.
6. Sucesso: `redirect("/login?reset=success")` — daí o `| void`. Como todas as
   sessões foram revogadas, o destino natural é o login, e o parâmetro é o que
   permite a tela de login confirmar o que aconteceu.

A action **não** escreve SQL, **não** fala com a instância do Better Auth e
**não** envia e-mail: o envio acontece dentro do callback da biblioteca (seção 2
do `stack.md`, terceira bala).

## `df-data` — o que criar

**Nada.** Nenhuma query nova nesta feature. Toda leitura e escrita acontece
dentro do Better Auth (tabelas `verification` e `account`), por caminhos que
`app/_lib/data/**` não deve duplicar — ver ADR 005.

## `df-ui` — o que criar

Somente o primitivo do shadcn que ainda não existe:

- `npx shadcn@latest add dialog` → `app/_components/ui/dialog.tsx`, com o import
  de `cn` trocado para `@/app/_lib/utils` e os comentários do CLI removidos
  (seção 5 do `stack.md`).

`button`, `input`, `field`, `label` e `sonner` já estão em
`app/_components/ui/`. Nenhum componente compartilhado novo em
`app/_components/`, nenhum token novo no `@theme`, nenhuma mudança em
`app/_lib/utils.ts`.

## Telas (`df-auth`, `app/(auth)/**`)

- `app/(auth)/login/_components/forgot-password-dialog.tsx` — dialog aberto por
  um link "Esqueci minha senha" dentro de `login-form.tsx`. Um campo de e-mail
  (`requestPasswordResetSchema` + `zodResolver`), botão de envio e, depois da
  resposta, **a mensagem genérica no lugar do formulário** — não um toast que
  desaparece, porque o usuário precisa ler a instrução de ir ao e-mail. O dialog
  não revela nada além dessa mensagem.
- `app/(auth)/reset-password/page.tsx` — Server Component. Em Next 16
  `searchParams` é `Promise`:
  `{ searchParams: Promise<{ [key: string]: string | string[] | undefined }> }`.
  - `error=INVALID_TOKEN` ou `token` ausente → estado de link inválido, com
    caminho de volta para `/login` para pedir outro.
  - `token` presente → `findMaskedEmailForResetToken(token)`; `null` cai no mesmo
    estado de link inválido. Com valor, renderiza o formulário mostrando **só o
    e-mail mascarado** (decisão 4): nunca `userName`, nunca o e-mail completo,
    nunca setor ou papel.
  - O `token` é passado ao formulário como campo oculto/prop e devolvido à action;
    não vai para o log nem para nenhum texto visível além da URL.
- `app/(auth)/login/page.tsx` — lê `searchParams.reset`; com `"success"`, exibe
  `Senha redefinida. Entre com a nova senha.` Chama também `getSession()` e
  redireciona para `/dashboard` quando já existe sessão — essa decisão saiu do
  `proxy.ts` e passou a morar aqui (ADR 008).
- Nada disso entra em `app/_components/`; se faltar componente compartilhado,
  `df-auth` pede ao `df-ui` e encerra o turno.

## Variáveis de ambiente

Já acrescentadas em `.env.example` pelo `df-architect`:

| Variável         | Para quê                                                                     |
| ---------------- | ---------------------------------------------------------------------------- |
| `RESEND_API_KEY` | chave da API do Resend (`df-email`); **obrigatória fora de desenvolvimento** |
| `EMAIL_FROM`     | remetente dos e-mails, formato `Nome <endereco@dominio>`                     |

**Não existe `APP_URL`.** O link de redefinição é montado a partir de
`BETTER_AUTH_URL`, que o Better Auth entrega em `ctx.context.baseURL` dentro do
callback `sendResetPassword` — o template recebe a URL pronta e não consulta
`process.env`. Uma segunda variável para a mesma URL pública seria duas fontes de
verdade para o mesmo dado, e enquanto nenhum e-mail precisar de link de navegação
próprio ela seria variável reservada "para depois", o que a seção 1 do
`stack.md` recusa. O primeiro e-mail que precisar apontar para uma tela da
aplicação a introduz então, junto com o arquivo que a lê, e registra aqui.

## Checklist de encerramento da feature

1. `npx tsc --noEmit`, `npm run lint` e `npm run build` passam.
2. Nenhuma migration gerada (confirme `db/migrations/` intocado).
3. A resposta do pedido é byte a byte a mesma nos quatro caminhos da seção
   "Por que a mensagem é sempre a mesma".
4. `verification` fica sem linha após um reset bem-sucedido, e as sessões do
   usuário foram apagadas.
5. Segundo clique no mesmo link cai em `INVALID_TOKEN`.
6. `emails/` não tem nenhum `.tsx` e nada no projeto importa `react-dom/server`
   nem o campo `react` do `resend` (ADR 006).
7. Com `RESEND_API_KEY` definida, o e-mail chega; sem ela, **em
   desenvolvimento**, o `resetUrl` aparece no log do servidor e o restante do fluxo
   funciona igual. Sem ela fora de desenvolvimento, o servidor falha no boot.
