# 004 — Resposta idêntica no pedido de redefinição de senha

## Contexto

O formulário de "esqueci minha senha" recebe um e-mail sem autenticação nenhuma.
Se a resposta distinguir "enviamos" de "esse e-mail não existe", o formulário
passa a responder, em lote e anonimamente, quem tem conta no Direct Flow. As
contas são corporativas e o e-mail é o próprio login, então a lista obtida é
diretamente acionável.

Três caminhos internos poderiam vazar pela resposta: conta inexistente, conta com
`is_active = false` (que por decisão do usuário não recebe e-mail) e falha de
envio no Resend.

O Better Auth já cobre o primeiro caso: e-mail inexistente devolve `status: true`
com o **mesmo corpo** do caso de sucesso e ainda executa trabalho falso
(`generateId(24)` e um lookup em `verification` com identificador dummy) para não
vazar a diferença pelo tempo de resposta (`api/routes/password.mjs:57-72`). Os
outros dois caminhos são nossos.

## Decisão

A action `requestPasswordReset` devolve **sempre** `{ ok: true, message }` com a
mesma constante — `Se houver uma conta com esse e-mail, enviamos as instruções de
redefinição.` — nos quatro caminhos: conta inexistente, conta ativa (único em que
o e-mail sai), conta desativada e falha de envio.

Consequências práticas do "sempre":

- o callback `sendResetPassword` retorna sem enviar quando `isActive === false`,
  em vez de lançar;
- o callback captura o erro do Resend, registra com `console.error` e **não**
  relança: se lançasse, o endpoint responderia 500 e a resposta variaria;
- a action captura exceção inesperada, registra no log e devolve o mesmo
  `ok: true`.

O único retorno diferente é `INVALID_INPUT` para texto que não é um e-mail —
informação sobre o que foi digitado, não sobre quem tem conta.

## Consequência

- Quem erra o e-mail recebe a confirmação e não descobre o erro pela tela. Custo
  aceito e registrado no contrato.
- Falha de envio é invisível ao usuário; a única evidência é o log do servidor.
  Se isso incomodar, a saída é observabilidade (alerta no log, painel do Resend),
  nunca mudar a mensagem.
- `ok: true` no caminho de erro parece bug para quem lê a action fora de contexto.
  Está documentado em `docs/contracts/password-reset.md` justamente para não ser
  "corrigido".
- Qualquer mensagem nova nesse fluxo — inclusive rate limit, se um dia existir —
  tem de ser avaliada contra este ADR antes de entrar.
