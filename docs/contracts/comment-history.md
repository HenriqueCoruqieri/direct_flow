# Contrato — Histórico de comentários (`message_history`)

Etapa 1 do plano `docs/plans/comment-history-and-attachments-in-edit.md`,
aprovado pelo usuário em `/consult` em 2026-10-14.

> Revisão de 2026-10-14, falha MH2 (`docs/test-reports/2026-10-14-comment-history.md`):
> a linha `criacao` copiava `changedAt` do `returning` de `insertTicketMessage`.
> O driver devolve `timestamp` como `Date` do JavaScript (milissegundo),
> enquanto `message.created_at` é `defaultNow()` do banco (microssegundo), e
> o histórico ficava ~0,6 ms atrás. Decisão do orquestrador: na linha
> `criacao`, o `df-data` **não informa `changedAt`**. A coluna cai no
> `default now()`. No Postgres, `now()` é o instante de início da transação, e
> `message.created_at` é preenchido pelo mesmo `now()` na mesma transação, então
> os dois ficam idênticos, com microssegundos. O `returning` volta a trazer só
> `id`. `edicao` e `exclusao` não mudam: o `changedAt` delas é o mesmo `Date`
> gravado em `message.updated_at`, e a igualdade já vale (MH3 passou). A
> igualdade exata do MH1 e do MH2 continua. **Dado de teste afetado:** os
> comentários 96 e 98 (linhas 80 e 84 de `message_history`, chamado #226)
> ficaram com a diferença de sub-milissegundo e não são corrigidos (a tabela é
> append-only). A consulta de divergência do MH1 passa a excluí-los. Seções
> alteradas: `insertTicketMessage`, cenários MH1 e MH2, checklist (o item do
> `df-data` volta a ficar aberto).

Antes desta etapa, editar um comentário sobrescrevia `message.content` e
excluir era `DELETE` físico (no arquivo anterior à etapa, commit `50e4fd7`:
`app/_lib/data/ticket-messages.ts:148-151` e `:208-210`; no arquivo atual, os
mesmos trechos estão em `:157-160` e `:241-243`, e continuam assim): o banco
perdia o texto anterior a uma edição e o comentário excluído inteiro. Esta etapa grava cada criação, edição e exclusão numa tabela
de eventos **append-only**, para consulta **direta no banco**. Nenhuma tela lê
a tabela nova.

Ondas: `df-architect` (feito) → `df-data` → `df-reviewer` → `df-qa`.
`df-actions`, `df-ui`, `df-email` e `df-auth` não entram.

Versões observadas: `next@16.3.5`, `drizzle-orm@0.45.2`, `drizzle-kit` do
`package.json`.

## O que não muda

| Camada                                                                          | Mudança                                                                  |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| UI (`/tickets/[id]`, comentários, editor, exclusão)                             | nenhuma                                                                  |
| Server Actions (`addTicketComment`, `editTicketComment`, `deleteTicketComment`) | nenhuma — entradas, códigos e mensagens iguais                           |
| `app/_lib/validation/**`, `app/_lib/domain/**`, `app/_lib/types/**`             | nenhuma — as assinaturas públicas das três funções de dados não mudam    |
| e-mail                                                                          | nenhum                                                                   |
| `listTicketMessages` e qualquer outra leitura                                   | nenhuma — continuam lendo só `message`                                   |
| `ticket_history`                                                                | nenhuma linha nova; comentário continua fora do ciclo de vida do chamado |
| regra de quem edita/exclui (`app/_lib/domain/ticket-comments.ts:118-164`)       | nenhuma — hoje só o autor; `actor_id` existe para quando a regra mudar   |

## Schema — `db/schema.ts` (feito)

### Enum `message_history_event` (`messageHistoryEventEnum`)

`criacao`, `edicao`, `exclusao` — substantivos, no padrão de `history_event`.
Tipo: `MessageHistoryEvent`.

### Tabela `message_history` (`messageHistory`)

| Coluna       | Tipo                             | Regra                                                                             |
| ------------ | -------------------------------- | --------------------------------------------------------------------------------- |
| `id`         | integer identity, PK             | `pk()`                                                                            |
| `message_id` | integer not null                 | **sem foreign key**, de propósito (abaixo)                                        |
| `ticket_id`  | integer not null                 | → `ticket.id`, `on delete cascade` (mesmo de `message` e `ticket_history`)        |
| `actor_id`   | integer not null                 | → `users.id`, `on delete restrict` — quem fez a ação                              |
| `event`      | `message_history_event` not null |                                                                                   |
| `content`    | text not null                    | texto inteiro **depois** do evento; em `exclusao`, o texto no momento da exclusão |
| `visibility` | `message_visibility` not null    | a do comentário no momento do evento                                              |
| `changed_at` | timestamptz not null, `now()`    | mesmo nome de `ticket_history.changed_at`                                         |

Sem `updated_at`: a tabela é append-only. O app só faz `INSERT` nela.

Índices: `message_history_message_idx` (`message_id`, `changed_at`),
`message_history_ticket_idx` (`ticket_id`), `message_history_actor_idx`
(`actor_id`) — o projeto indexa toda FK para `users`.

Relations: `messageHistoryRelations` (`ticket`, `actor`); do outro lado,
`ticketRelations.messageHistory` e `userRelations.messageHistoryActions`.
Tipos: `MessageHistory`, `NewMessageHistory`, `MessageHistoryEvent`.

**Por que `message_id` não tem FK.** `message` é apagada fisicamente. Com
`cascade`, excluir o comentário apagaria o próprio histórico; com `restrict`,
impediria excluir; com `set null`, perderia a ligação com o comentário. A
integridade vem de só a camada de dados gravar na tabela, **na mesma transação**
que muda `message`. Depois de uma exclusão, o `message_id` aponta para uma linha
que não existe mais — é o esperado.

**Por que `actor_id` e não o autor.** Depois da exclusão, `message.user_id` não
existe mais; e se a regra um dia deixar outra pessoa editar ou excluir, o
registro já diz quem foi.

## Migrations (geradas, **não aplicadas**)

| Arquivo                                           | Origem                                                          | Conteúdo                                                          |
| ------------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------- |
| `db/migrations/0013_message_history.sql`          | `drizzle-kit generate --name=message_history`                   | enum, tabela, 2 FKs, 3 índices                                    |
| `db/migrations/0014_backfill_message_history.sql` | `drizzle-kit generate --custom --name=backfill_message_history` | retroativo (abaixo), precedente `0011_align_legacy_transfers.sql` |

Retroativo, uma linha `criacao` por comentário existente:

```sql
INSERT INTO "message_history" ("message_id", "ticket_id", "actor_id", "event", "content", "visibility", "changed_at")
SELECT "id", "ticket_id", "user_id", 'criacao', "content", "visibility", "created_at"
FROM "message"
ORDER BY "created_at", "id";
```

O `ORDER BY` só faz o `id` do histórico seguir a ordem cronológica.

**Limite do retroativo.** Para comentário já editado antes desta etapa, a linha
`criacao` traz o texto **atual** (o original foi sobrescrito) com `changed_at` =
`created_at`. Comentários já excluídos não existem mais e não ganham linha.
Nada disso é recuperável.

Aplicar (`npm run db:migrate`) é ação durável: o orquestrador pede ao usuário.
As duas migrations precisam estar aplicadas **antes** do código do `df-data`
rodar (o `INSERT` falharia sem a tabela) e antes do `df-qa`.

## `df-data` — `app/_lib/data/ticket-messages.ts`

As três funções mantêm assinatura, travas, ordem das checagens e outcomes. O
que muda é uma escrita a mais, **dentro da mesma transação** (`tx`), só no
caminho de sucesso. Import novo: `messageHistory` de `@/db/schema`.

### `insertTicketMessage`

- O `returning` do insert (`:82-85`) traz só `id` (revisão de 2026-10-14:
  `createdAt` sai).
- Logo depois, `tx.insert(messageHistory)` com:
  `messageId` = `created.id`, `ticketId`, `actorId` = `authorId`,
  `event: "criacao"`, `content`, `visibility` (os mesmos gravados em
  `message`). **Sem `changedAt`**: a coluna cai no `default now()`.
- Por que omitir. `message.created_at` também é `defaultNow()`, e o `now()` do
  Postgres é o instante de início da transação. Os dois inserts estão na mesma
  transação, então `changed_at` sai **igual** a `message.created_at`, com
  microssegundos, que é a mesma relação que o retroativo grava. Nem o
  `returning` (que passa por `Date` do JavaScript e perde os microssegundos,
  falha MH2) nem o `now` da linha `:70` (relógio do Node) dão essa igualdade.

### `updateTicketMessage`

- Só depois do `update` (`:157-160`), ou seja, só quando grava. `no_changes`
  (`:155`), `not_found` e `not_editable` não gravam nada.
- `tx.insert(messageHistory)` com: `messageId`, `ticketId`,
  `actorId` = `editorId`, `event: "edicao"`, `content` = o novo,
  `visibility` = `messageRow.visibility` (lida em `:128-136`),
  `changedAt` = `now` — o mesmo valor gravado em `message.updated_at`.

### `deleteTicketMessage`

- O `select ... for update` de `message` (`:204-212`) passa a trazer também
  `content`.
- Depois de `canDeleteTicketComment` (`:227-229`) e **antes** do `delete`
  (`:241-243`), `tx.insert(messageHistory)` com: `messageId`, `ticketId`,
  `actorId`, `event: "exclusao"`, `content` = `messageRow.content`,
  `visibility` = `messageRow.visibility`, `changedAt` = `now` (`:196`).
- `not_found` e `not_deletable` não gravam nada.

### Regras gerais

- Nenhuma função de leitura de `message_history`; nenhuma função nova
  exportada.
- Nenhum `UPDATE` nem `DELETE` em `message_history`, em lugar nenhum do app.
- Falha no insert do histórico derruba a transação inteira: o comentário não é
  criado, editado nem excluído (a action devolve o erro inesperado de hoje).

## Cenários para o `df-qa`

Pré-requisito: `0013` e `0014` aplicadas. Verificação de banco pelo MCP
`postgres` (só leitura, ADR 013). Usuários de `docs/contracts/qa-seed.md`:
`M` = QA Membro Suporte, `A` = QA Admin Suporte. Títulos começam com
`[QA] Histórico de comentários`. **Não alterar #65 a #68.**

Preparação (M, pelo "Novo chamado", QA Suporte): `#H1` =
`[QA] Histórico de comentários`, destinatário **M**.

Consulta-base dos cenários:

```sql
SELECT id, message_id, ticket_id, actor_id, event, content, visibility, changed_at
FROM message_history WHERE ticket_id = <H1> ORDER BY changed_at, id;
```

| #   | Quem | Ação                                                                                                                                     | Esperado                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| --- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MH1 | —    | **primeiro da bateria**, antes de qualquer comentário novo: consultar o banco                                                            | `SELECT count(*) FROM message_history WHERE event = 'criacao'` = `SELECT count(*) FROM message`; nenhuma linha `edicao`/`exclusao`; `SELECT count(*) FROM message m LEFT JOIN message_history h ON h.message_id = m.id AND h.event = 'criacao' WHERE h.id IS NULL OR h.changed_at <> m.created_at OR h.actor_id <> m.user_id OR h.ticket_id <> m.ticket_id OR h.visibility <> m.visibility` = 0. **Na reexecução, ver "MH1 depois da revisão de 2026-10-14", abaixo da tabela** |
| MH2 | M    | em H1, comentar `[QA] texto 1` (público)                                                                                                 | toast de sucesso; 1 linha nova: `event = criacao`, `message_id` = id do comentário, `actor_id` = M, `content = '[QA] texto 1'`, `visibility = publica`, `changed_at` = `message.created_at` **exato, com microssegundos**: `SELECT h.changed_at = m.created_at FROM message_history h JOIN message m ON m.id = h.message_id WHERE h.event = 'criacao' AND h.message_id = <id>` devolve `true` (revisão de 2026-10-14)                                                           |
| MH3 | M    | editar o comentário de MH2 para `[QA] texto 2`                                                                                           | 1 linha nova `edicao`, mesmo `message_id`, `actor_id` = M, `content = '[QA] texto 2'`, `visibility = publica`, `changed_at` = `message.updated_at`; a linha `criacao` continua com `[QA] texto 1`                                                                                                                                                                                                                                                                               |
| MH4 | M    | editar o mesmo comentário salvando o **mesmo** texto (pela tela; se a tela não deixar, forjar `editTicketComment` com o mesmo `content`) | resposta `NO_CHANGES` (`Nenhuma alteração para salvar.`); `max(id)` de `message_history` inalterado                                                                                                                                                                                                                                                                                                                                                                             |
| MH5 | M    | excluir o comentário de MH2                                                                                                              | some da tela; nenhuma linha em `message` com aquele id; 1 linha nova `exclusao`, mesmo `message_id`, `actor_id` = M, `content = '[QA] texto 2'`, `visibility = publica`. Para esse `message_id`, exatamente 3 linhas, na ordem `criacao` → `edicao` → `exclusao`                                                                                                                                                                                                                |
| MH6 | A    | forjar `editTicketComment` e depois `deleteTicketComment` para um comentário de M em H1 (A vê o chamado, não é o autor)                  | as duas recusadas (`FORBIDDEN`, mensagens de hoje); `max(id)` de `message_history` inalterado; o comentário de M intacto                                                                                                                                                                                                                                                                                                                                                        |
| MH7 | M    | em H1, comentário **interno** `[QA] interno 1`; editar para `[QA] interno 2`; excluir                                                    | 3 linhas para o `message_id`, todas com `visibility = interna`, textos `[QA] interno 1`, `[QA] interno 2`, `[QA] interno 2`                                                                                                                                                                                                                                                                                                                                                     |
| MH8 | M, A | regressão da tela de comentários em H1: comentar, editar, excluir, ver o rótulo de editado, ver o comentário interno como A              | comportamento idêntico ao de antes da etapa (`docs/contracts/queue-tabs-comment-delete-and-attend.md`, `queue-default-and-comment-edit.md`)                                                                                                                                                                                                                                                                                                                                     |
| MH9 | —    | toda a bateria                                                                                                                           | nenhum erro nem aviso no console nem no `next-devtools`; nenhum e-mail novo                                                                                                                                                                                                                                                                                                                                                                                                     |

**MH1 depois da revisão de 2026-10-14.** O MH1 passou na primeira execução
(73 linhas do retroativo, divergência 0). A bateria anterior deixou dados no
chamado #226 (comentários 96 e 98 vivos, 94 excluído, linhas 74 a 84 de
`message_history`), então, na reexecução, as contagens `criacao` = `message` e
"nenhuma linha `edicao`/`exclusao`" deixam de valer e **não** são critério. Vale
só a consulta de divergência, excluindo os dois comentários gravados antes da
correção, que ficaram com a diferença de sub-milissegundo (0,553 ms e
0,645 ms) e não são corrigidos, porque a tabela é append-only:

```sql
SELECT count(*) FROM message m
LEFT JOIN message_history h ON h.message_id = m.id AND h.event = 'criacao'
WHERE m.id NOT IN (96, 98)
  AND (h.id IS NULL OR h.changed_at <> m.created_at OR h.actor_id <> m.user_id
       OR h.ticket_id <> m.ticket_id OR h.visibility <> m.visibility);
```

Esperado: `0`, antes **e** depois do restante da bateria. Equivale a considerar
só os comentários do retroativo e os criados depois da correção; se o `df-qa`
preferir o recorte por data, `m.created_at > <instante do deploy da correção>`
no lugar de `m.id NOT IN (96, 98)` também serve, somado à execução original do
MH1 para o retroativo.

Nota: recusa por comentário inexistente (`not_found`) também não grava; não
precisa de cenário próprio — o caminho de código é o mesmo do MH6.

## Critério de pronto

1. MH1–MH9 aprovados pelo `df-qa`.
2. `message_history` só aparece em `db/schema.ts`, nas migrations e em
   `app/_lib/data/ticket-messages.ts` (`grep` em `app/`); nenhum `update` nem
   `delete` sobre ela.
3. As três escritas estão dentro do `db.transaction` da função, depois de todas
   as recusas.
4. `npx tsc --noEmit`, `npm run lint` e `npm run build` passam; `df-reviewer`
   sem bloqueante.

## Checklist de encerramento

- [x] enum `message_history_event`, tabela `message_history`, relations e tipos em `db/schema.ts`; migrations `0013_message_history.sql` e `0014_backfill_message_history.sql`; este contrato e o plano (`df-architect`)
- [x] migrations aplicadas (usuário, via orquestrador): `0013_message_history.sql` e `0014_backfill_message_history.sql` aplicadas pelo usuário em 2026-10-14; conferido pelo MCP `postgres` antes da bateria: 73 comentários, 73 linhas `criacao`, todas iguais a `message`
- [x] `insertTicketMessage`, `updateTicketMessage` e `deleteTicketMessage` gravando `criacao`, `edicao` e `exclusao` na mesma transação (`df-data`). Reaberto em 2026-10-14 (falha MH2) e fechado no mesmo dia: em `insertTicketMessage` (`app/_lib/data/ticket-messages.ts:82-94`), o `returning` traz só `id` e o insert de `criacao` não informa `changedAt`
- [x] contrato revisado pela falha MH2: `criacao` usa o `default now()` (`df-architect`, 2026-10-14)
- [x] cenários do `df-qa`: 10 de 10 na bateria + reteste (MH2 falhou na 1ª execução e passou no Reteste 1; MH1 pelo critério revisto), relatório `docs/test-reports/2026-10-14-comment-history.md`
- [x] `npx tsc --noEmit`, `npm run lint`, `npm run build` (passaram na re-revisão do `df-reviewer`, 2026-10-14)
