# 005 — Token de reset resolvido pelo `internalAdapter`, não por `app/_lib/data/`

## Contexto

A tela de redefinição precisa mostrar o e-mail **mascarado** do dono do token
antes de o usuário enviar a senha nova. Para isso é preciso resolver
`token → users.email` **sem consumir** o token — consumir é o que o POST de
`resetPassword` faz, e ele deleta a linha de `verification`.

O dado está em `verification`, tabela declarada em `db/auth-schema.ts`, com
`identifier = "reset-password:<token>"` e `value = users.id` (string). Duas
opções:

1. função nova em `app/_lib/data/` com Drizzle, montando a string
   `reset-password:<token>`, comparando `expiresAt` e fazendo join com `users`;
2. `auth.$context` → `internalAdapter.findVerificationValue` +
   `findUserById`, dentro de `app/_lib/auth/`.

A opção 1 espalha um detalhe de formato do Better Auth (o prefixo do
`identifier`, o significado de `value`) para a camada de dados, que não tem nada
a ver com o pacote. Se o pacote mudar o prefixo, o bug aparece longe de onde a
decisão foi tomada — e `df-data` não tem motivo para acompanhar release notes do
Better Auth.

## Decisão

`app/_lib/auth/password-reset.ts` publica
`findMaskedEmailForResetToken(token): Promise<string | null>`, implementada com
`auth.$context` e `internalAdapter`. Nenhuma função nova em `app/_lib/data/`.

A função checa `verification.expiresAt < new Date()` explicitamente, porque
`findVerificationValue` não valida expiração (o endpoint de callback do próprio
pacote faz a mesma comparação à mão), e devolve `null` para token ausente,
expirado, já consumido ou órfão — a tela trata os quatro igual. O e-mail completo
nunca sai desta função: ela devolve o resultado de `maskEmail`.

## Consequência

- O conhecimento de como o Better Auth guarda o token fica inteiro em
  `app/_lib/auth/`, do lado de quem configura o pacote.
- Depende de API semi-interna (`$context.internalAdapter`), que pode mudar em
  minor. A mitigação é o isolamento: uma função, um arquivo, uma assinatura
  estável para quem chama. `internalAdapter` já é usado pelo projeto nos
  `databaseHooks` de sessão, então a exposição não é nova.
- `app/_lib/data/**` continua sem nenhuma query sobre tabelas de auth.
- A tela consome só o e-mail mascarado; nem a action nem a UI recebem e-mail
  completo, nome ou id do dono do token.
