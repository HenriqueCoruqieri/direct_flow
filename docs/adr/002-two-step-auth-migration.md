# 002 — Migration de auth em dois passos

## Contexto

A entrada do Better Auth muda `users` em duas direções ao mesmo tempo: entram
`email_verified` e `image`, sai `password_hash` (a senha passa a viver em
`account.password`, ver ADR 001).

Gerado num passo só, o `drizzle-kit` detecta uma coluna saindo e outra entrando na
mesma tabela e abre prompt interativo perguntando se é rename
(`password_hash` → `email_verified`). Prompt interativo não é reproduzível num
fluxo de agentes, e responder errado renomearia a coluna de senha em vez de criar
a de verificação. Editar o SQL à mão está proibido pela regra do projeto.

## Decisão

Duas migrations, ambas geradas integralmente por `drizzle-kit generate`:

- `0001_auth_tables.sql` — cria `session`, `account` e `verification` com as FKs
  para `users` e adiciona `email_verified` e `image` em `users`. Só adição, logo
  sem prompt.
- `0002_drop_password_hash.sql` — remove `password_hash` de `users`. Só remoção,
  logo sem prompt.

Para gerar a `0001`, `db/schema.ts` mantém `password_hash` temporariamente; em
seguida o arquivo volta ao estado final e a `0002` sai do diff restante. O
`db/schema.ts` versionado é o estado final, nunca o intermediário.

## Consequência

- Ordem de aplicação é obrigatória: `0001` antes de `0002`.
- `0002` apaga a senha antiga, então em base com dados a senha precisa estar em
  `account.password` antes. Em desenvolvimento, aplicar as duas e rodar `db:seed`.
- Qualquer futura troca de coluna na mesma tabela segue a mesma receita: uma
  migration para o que entra, outra para o que sai.
- `drizzle-kit check` valida a cadeia de snapshots; `_journal.json` tem as três
  entradas em sequência.
