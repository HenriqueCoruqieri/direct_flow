# 008 — Redirecionamento de quem já está logado sai do proxy

## Contexto

O `proxy.ts` tinha duas regras: sem cookie e fora das rotas públicas, vai para
`/login`; **com** cookie e dentro de `authRoutes`, vai para `/dashboard`. A segunda
usava `getSessionCookie(request)` como prova de que havia sessão.

`getSessionCookie` não prova isso. Ela lê o cookie e devolve o valor
(`node_modules/better-auth/dist/cookies/index.mjs:261-270`): não confere
assinatura, não confere expiração e não toca o banco. É um palpite barato, útil
para filtrar tráfego anônimo e nada além disso.

Com a redefinição de senha, o palpite passou a errar de forma observável. O reset
revoga as sessões do usuário no banco, mas o cookie continuava no navegador. O que
acontecia então: o proxy via cookie em `/login` e mandava para `/dashboard`; o
`/dashboard` chamava `requireSession()`, não achava sessão no banco e mandava para
`/login`; o proxy via o mesmo cookie e mandava de volta. O `df-debug` mediu 12
redirecionamentos sem convergir.

A causa não é o cookie obsoleto — é haver **duas camadas decidindo o mesmo
redirecionamento a partir de fontes de verdade diferentes**: o proxy a partir da
presença do cookie, a página a partir da linha em `session`. Enquanto as duas
concordam, o ciclo não aparece; qualquer divergência entre cookie e banco o produz.
Cookie obsoleto é só o jeito mais fácil de criar a divergência.

## Decisão

O `proxy.ts` tem **uma** regra: rota em `publicRoutes` passa; fora dela, cookie
ausente vai para `/login`. `authRoutes` deixa de existir e o proxy não decide mais
"já está logado".

Toda decisão que dependa de a sessão existir **de verdade** é tomada em Server
Component, com `getSession()` ou `requireSession()`, que leem o banco:

- `app/(auth)/login/page.tsx` chama `getSession()` e só redireciona para
  `/dashboard` quando há `Actor`.
- `resetPasswordWithToken` (`app/_lib/auth/password-reset.ts`) chama
  `signOutSession()` depois do reset bem-sucedido, para o cookie não sobreviver à
  revogação das sessões.

Presença de cookie é filtro, nunca autorização.

## Consequência

- A próxima rota protegida herda a regra: a guarda vai na `page` ou no `layout`
  com `requireSession()`, e o proxy continua com a mesma regra única. Adicionar
  caminho novo ao proxy exige revisitar este ADR.
- Requisição autenticada a `/login` custa uma leitura de sessão no banco. É o preço
  de ter uma fonte de verdade só, e ele incide numa tela.
- Divergência entre cookie e banco deixa de virar ciclo e passa a custar um salto:
  `/dashboard` → `/login`.
- **Ponto em aberto:** cookie obsoleto que chegue por outro caminho — desativação
  de usuário, limpeza manual de `session` — permanece no navegador até o próximo
  login ou sign-out. Hoje é inofensivo, porque toda checagem autoritativa bate no
  banco e o efeito visível é aquele salto. Está na mesma família do ADR 003: quem
  implementar a desativação de usuário decide, junto com o lugar da checagem de
  `is_active`, se também limpa o cookie ou aceita o salto.
