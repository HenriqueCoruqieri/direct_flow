# 006 — Template de e-mail é função que devolve HTML, não componente React

## Contexto

O contrato de "Esqueci minha senha" prescrevia `emails/password-reset.tsx`, um
componente React, partindo de duas premissas que a implementação da Onda 1
mostrou serem falsas.

**Premissa 1 — "o pacote `resend` já traz o renderizador".** Não traz. Em
`resend@6.28.1`, o campo `react` de `emails.send` cai em
`node_modules/resend/dist/index.mjs:219-227`:

```js
async function render(node) {
  let render
  try {
    ;({ render } = await import("@react-email/render"))
  } catch {
    throw new Error(
      "Failed to render React component. Make sure to install `@react-email/render` or `@react-email/components`.",
    )
  }
  return render(node)
}
```

`@react-email/render` é `peerDependency` marcada `optional: true` em
`resend/package.json` — não está instalada e não vem com o pacote. Sem instalá-la,
passar `react` **lança em runtime**, dentro do `try/catch` de `sendResetPassword`,
ou seja: o e-mail nunca sai e o usuário vê a mensagem genérica de sucesso. Falha
silenciosa, o pior formato possível para este fluxo. Instalar o pacote é
dependência nova, fora da lista do `df-email` (seção 4 do `stack.md`).

**Premissa 2 — "dá para renderizar com `react-dom/server`".** Não dá, neste
projeto. O envio é disparado pelo callback `sendResetPassword`, que vive **dentro
da instância do Better Auth** (`app/_lib/auth/auth.ts`). Logo o módulo de e-mail é
alcançável a partir de `app/api/auth/[...all]/route.ts` e de todo Server Component
que lê sessão. `renderToStaticMarkup` arrasta `react-dom/server` para esse grafo, e
o Turbopack **recusa o build com erro**, não com aviso. O custo não é local ao
arquivo de template: é o build inteiro.

## Decisão

O template é `emails/password-reset.ts` — sem JSX — exportando uma função pura
que devolve a string HTML:

```ts
renderPasswordResetEmailHtml(props: PasswordResetEmailProps): string
```

`app/_lib/email/password-reset.ts` chama essa função e passa o resultado no campo
`html` de `resend.emails.send`. O campo `react` **não** é usado em nenhum lugar do
projeto.

As props continuam derivadas do contrato de tipos, não reescritas:
`Omit<PasswordResetEmailInput, "to">`. O corpo obrigatório do e-mail
(saudação, link, validade, aviso de uso único) não muda — muda só o mecanismo de
renderização.

Vale para **todo** template de e-mail deste projeto, não só para este. Enquanto o
envio for chamado de dentro da instância do Better Auth, nenhum template vira
componente React.

## Consequência

- Zero dependência nova. `npm install resend` continua sendo a única instalação do
  `df-email`, e o build fica verde.
- O HTML é escrito à mão, em template string. Estilos vão inline, como e-mail
  exige de qualquer forma, e não há componentes reaproveitáveis entre templates
  até que exista um segundo template que justifique extrair algo.
- Sem preview do React Email (`email dev`). A conferência visual é manual: chamar
  a função e abrir a string no navegador.
- **Trocar isto por componente React não é melhoria, é regressão de build.** Quem
  quiser reverter precisa antes (a) obter aprovação para instalar
  `@react-email/render` e (b) tirar o envio de dentro do callback do Better Auth,
  para que o template deixe de ser alcançável pelo grafo de Server Components. Sem
  essas duas coisas, o resultado é erro de build ou e-mail que não sai.
- O `df-reviewer` trata `emails/**.tsx` e `import ... from "react-dom/server"`
  como bloqueante enquanto este ADR estiver em vigor.
