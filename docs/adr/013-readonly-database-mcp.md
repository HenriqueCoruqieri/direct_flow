# 013 — Consulta ao banco pelos agentes via MCP somente leitura

## Contexto

O `df-qa` precisa conferir no banco o que a tela não mostra: se a transição de
status gravou a linha certa em `ticket_history`, se a transferência entre setores
ficou com o `status` e o `review_note` esperados em `ticket_transfer`, se os
usuários QA do seed existem. O `df-debug` precisa do estado real das linhas para
investigar. Até aqui os dois agentes não tinham ferramenta de banco: improvisavam
com `psql` ou script, usando o `DATABASE_URL` da aplicação, que é o
`neondb_owner` e pode tudo.

Dar a um agente uma credencial de dono do banco transforma qualquer erro de
interpretação em `UPDATE` ou `DELETE` real. E o modo "read-only" de um servidor
MCP não basta sozinho: ele filtra o SQL por lista de comandos, e esse tipo de
filtro já foi contornado em outro servidor de Postgres
(CVE-2026-85787, `set_config()` fora da lista).

## Decisão

**Servidor.** DBHub (`@bytebase/dbhub`), versão fixada no `.mcp.json`, com o nome
`postgres`. Configuração em `dbhub.toml`, versionado e sem segredo: a connection
string vem de `${DB_READONLY_URL}`, que o DBHub lê do `.env` na raiz.

**Três camadas, da mais fraca para a que vale de verdade.**

| Camada                | Onde                                  | O que faz                                                           |
| --------------------- | ------------------------------------- | ------------------------------------------------------------------- |
| Instrução             | `df-qa.md`, `df-debug.md`             | proíbe escrita e proíbe consultar por outro caminho                 |
| Filtro do MCP         | `dbhub.toml` (`readonly`, `max_rows`) | recusa o que não for `SELECT`/`WITH`/`EXPLAIN`; limita a 200 linhas |
| Permissão no Postgres | `db/roles/readonly-role.sql`          | role `df_readonly` só com `SELECT`; escrita falha no banco          |

`default_transaction_read_only` e `statement_timeout` no role são defesa extra,
não barreira: uma sessão pode desligá-los com `SET`. A barreira é o `GRANT`.

**Tabelas fora do alcance.** `account`, `session` e `verification` (Better Auth)
guardam hash de senha e tokens. Nenhum cenário precisa delas, e o que o agente lê
vai parar em relatório versionado. O role não tem acesso a elas. Tabela sensível
nova entra no `REVOKE` do mesmo arquivo.

**Quem usa.** Só `df-qa` e `df-debug`, pelo campo `tools` do agente. Os agentes
que escrevem código não consultam o banco.

**Role criado por SQL, não pelo console do Neon.** Roles criados pelo console
entram em `neon_superuser` e herdam permissão de escrita.

**Host direto.** `DB_READONLY_URL` usa o host sem `-pooler`, para que as
configurações do role valham na sessão sem depender do pooler.

## Consequências

- O role é criado uma vez, à mão, no SQL Editor do Neon. Não é migration: cada
  ambiente decide se quer esse acesso.
- Migration nova roda como `neondb_owner`, então a tabela nova já nasce legível
  pelo role (`ALTER DEFAULT PRIVILEGES`). Se ela for sensível, o `REVOKE` precisa
  ser acrescentado no arquivo e rodado.
- O banco de desenvolvimento hoje é o mesmo Neon em que o seed roda. Se um dia
  existir produção separada, o `DB_READONLY_URL` aponta só para desenvolvimento.
- Para tirar o acesso: `DROP OWNED BY df_readonly; DROP ROLE df_readonly;` e
  remover o servidor do `.mcp.json`.
