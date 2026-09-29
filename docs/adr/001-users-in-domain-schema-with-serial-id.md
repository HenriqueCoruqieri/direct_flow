# 001 — `users` fica no schema de domínio, com id serial

## Contexto

O Better Auth gera o próprio schema e, por padrão, coloca `user` junto de
`session`, `account` e `verification` num arquivo regenerável, com id `text`
(cuid). No Direct Flow a tabela `users` carrega colunas de domínio (`role`,
`department_id`, `is_active`, `deactivated_at`, `last_login_at`) e é referenciada
por FK `integer` em cinco tabelas já migradas (`ticket`, `ticket_transfer`,
`ticket_history`, `message`, `attachment`).

Adotar o padrão significaria (a) trocar o tipo de todas essas FKs para `text` e
(b) deixar as colunas de domínio num arquivo que o gerador sobrescreve.

## Decisão

- `users` permanece em `db/schema.ts`, propriedade do `df-architect`, com
  `id integer` gerado pelo banco. Ganha `email_verified` e `image` por exigência
  do core do Better Auth e perde `password_hash`.
- `db/auth-schema.ts`, propriedade do `df-auth`, declara apenas `session`,
  `account` e `verification`, e importa `user` de `@/db/schema`.
- `advanced.database.generateId: "serial"`: o id de todas as tabelas de auth vem
  do banco, não do Better Auth.
- A senha vive em `account.password` (`providerId: "credential"`).
- `drizzle.config.ts` lê os dois arquivos, então as migrations saem do mesmo
  `drizzle-kit generate` (em dois passos, ver ADR 002).

## Consequência

- Nenhuma FK muda de tipo; `0001` é aditiva em `users` mais três tabelas novas e
  `0002` remove `password_hash`.
- Regenerar o schema do Better Auth nunca toca colunas de domínio.
- `session.user.id` chega da biblioteca como **string**; a conversão para número
  acontece uma vez, em `app/_lib/auth/`, ao montar o `Actor`
  (`app/_lib/types/actor.ts`). Nenhuma camada abaixo vê a sessão crua.
- Colunas extras em `users` só são aceitas pela validação de schema do Better
  Auth se forem nullable ou tiverem default — restrição a respeitar em toda
  coluna futura dessa tabela.
