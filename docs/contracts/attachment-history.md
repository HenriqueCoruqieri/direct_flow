# Contrato — Histórico de anexos (`attachment_history`)

Etapa 2 do plano `docs/plans/timeline-summary-and-attachments-card.md`
(decisão P1 = A lá, não repetida aqui), aprovado pelo usuário em `/consult` em
2026-10-15. Mesmo padrão de `docs/contracts/comment-history.md`.

Antes desta etapa, incluir e remover anexo gravava `anexo_incluido` e
`anexo_removido` em `ticket_history` (`docs/contracts/attachments-in-edit.md`,
regra 7), e a linha do tempo os mostrava. A remoção apagava a linha de
`attachment` (`DELETE` físico), então o banco só guardava o nome do arquivo
removido, em `ticket_history.note`. Esta etapa:

1. tira os anexos da linha do tempo: os dois valores saem de `history_event`
   e as linhas existentes são apagadas;
2. grava cada inclusão e exclusão numa tabela **append-only**
   `attachment_history`, com os dados completos do arquivo, para consulta
   **direta no banco**. Nenhuma tela lê a tabela nova.

Ondas: `df-architect` (feito) → **usuário aplica as migrations** → `df-data` →
`df-reviewer` → `df-qa`. `df-actions`, `df-ui`, `df-email` e `df-auth` não
entram.

Versões observadas: `next@16.3.5`, `drizzle-orm@0.45.2`, `drizzle-kit@0.31`.

## O que não muda

| Camada                                                               | Mudança                                                                                                              |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| UI (`/tickets/[id]`, "Editar", "Novo chamado", Conclusão)            | nenhuma — a linha do tempo deixa de receber `anexo_*` só porque o banco deixa de tê-los; o card "Anexos" é a Etapa 3 |
| Server Actions (`createTicket`, `editTicket`, `resolveTicket`)       | nenhuma — entradas, códigos, mensagens e limpeza no R2 iguais                                                        |
| `app/_lib/validation/**`, `app/_lib/types/**`                        | nenhuma                                                                                                              |
| assinaturas públicas de `insertTicket` e `updateTicketByAssignee`    | nenhuma — mesmos valores de entrada e mesmos outcomes (`removedStorageKeys` continua)                                |
| leituras (`findTicketDetail`, `findTicketAttachmentFacts`, download) | nenhuma — continuam lendo `attachment` e `ticket_history`                                                            |
| rota `app/api/attachments/[id]` e `app/_lib/storage/**`              | nenhuma                                                                                                              |
| e-mail                                                               | nenhum                                                                                                               |
| regras de quem anexa e remove                                        | nenhuma (`docs/contracts/attachments-in-edit.md`, regras 1–6 e 8–10)                                                 |

## Schema — `db/schema.ts` (feito)

### Enum `attachment_history_event` (`attachmentHistoryEventEnum`)

`inclusao`, `exclusao` — substantivos, no padrão de `history_event` e
`message_history_event`. Tipo: `AttachmentHistoryEvent`.

### Tabela `attachment_history` (`attachmentHistory`)

| Coluna          | Tipo                                | Regra                                                                      |
| --------------- | ----------------------------------- | -------------------------------------------------------------------------- |
| `id`            | integer identity, PK                | `pk()`                                                                     |
| `attachment_id` | integer not null                    | **sem foreign key**, de propósito (abaixo)                                 |
| `ticket_id`     | integer not null                    | → `ticket.id`, `on delete cascade` (mesmo de `attachment`)                 |
| `actor_id`      | integer not null                    | → `users.id`, `on delete restrict` — quem incluiu ou removeu               |
| `event`         | `attachment_history_event` not null |                                                                            |
| `file_name`     | text not null                       | cópia de `attachment.file_name` no momento do evento                       |
| `mime_type`     | text not null                       | cópia de `attachment.mime_type`                                            |
| `size_bytes`    | integer not null                    | cópia de `attachment.size_bytes`                                           |
| `storage_key`   | text not null                       | cópia de `attachment.storage_key` (chave definitiva no R2); **sem** unique |
| `changed_at`    | timestamptz not null, `now()`       | mesmo nome de `ticket_history.changed_at` e `message_history.changed_at`   |

Sem `updated_at`: append-only. O app só faz `INSERT` nela.

Índices: `attachment_history_attachment_idx` (`attachment_id`, `changed_at`),
`attachment_history_ticket_idx` (`ticket_id`), `attachment_history_actor_idx`
(`actor_id`).

Relations: `attachmentHistoryRelations` (`ticket`, `actor`); do outro lado,
`ticketRelations.attachmentHistory` e `userRelations.attachmentHistoryActions`.
Tipos: `AttachmentHistory`, `NewAttachmentHistory`, `AttachmentHistoryEvent`.

**Por que `attachment_id` não tem FK.** `attachment` é apagada fisicamente na
remoção. Com `cascade`, remover o anexo apagaria o próprio histórico; com
`restrict`, impediria remover; com `set null`, perderia a ligação. A
integridade vem de só a camada de dados gravar na tabela, **na mesma
transação** que muda `attachment`. Depois de uma exclusão, o `attachment_id`
aponta para uma linha que não existe mais — é o esperado.

**Por que `storage_key` não é único.** O mesmo arquivo tem duas linhas
(`inclusao` e, se removido, `exclusao`) com a mesma chave.

**Por que `actor_id` e não `uploaded_by`.** Na exclusão, quem age é quem salva
a edição, que pode não ser quem enviou (regra 4 de
`attachments-in-edit.md`).

### `history_event` (`historyEventEnum`)

Perde `anexo_incluido` e `anexo_removido`. Fica com: `criacao`,
`mudanca_status`, `mudanca_prioridade`, `atribuicao`,
`transferencia_solicitada`, `transferencia_aprovada`,
`transferencia_rejeitada`, `reabertura`, `encerramento`, `mudanca_tag`,
`edicao`, `resolucao`.

## Domínio — `app/_lib/domain/ticket-history.ts` (feito)

`anexo_incluido` e `anexo_removido` saíram de `HISTORY_EVENT_LABELS`,
`HISTORY_EVENT_DESCRIBERS`, `HISTORY_EVENT_NAMES_ACTOR` e
`HISTORY_EVENT_SUMMARY_RANK`. Os quatro mapas continuam com
`satisfies Record<HistoryEvent, …>`, então o compilador garante que estão
completos. Nenhuma função muda de assinatura.

## Migrations (geradas, **não aplicadas**)

| Arquivo                                                    | Origem                                                             | Conteúdo                                                                              | Destrutiva |
| ---------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------- | ---------- |
| `db/migrations/0016_attachment_history.sql`                | `drizzle-kit generate --name=attachment_history`                   | enum `attachment_history_event`, tabela, 2 FKs, 3 índices                             | não        |
| `db/migrations/0017_backfill_attachment_history.sql`       | `drizzle-kit generate --custom --name=backfill_attachment_history` | retroativo de `attachment_history`; `DELETE` das linhas `anexo_*` de `ticket_history` | **sim**    |
| `db/migrations/0018_history_event_without_attachments.sql` | `drizzle-kit generate --name=history_event_without_attachments`    | recria `history_event` sem os dois valores                                            | **sim**    |

A divisão segue a ordem obrigatória: a tabela precisa existir antes do
retroativo, e o `DELETE` precisa rodar antes da recriação do tipo (a conversão
de volta para o enum falharia com linhas `anexo_*`). Para gerar a `0016` com o
tipo antigo intacto, o enum foi gerado com os dois valores ainda presentes; a
`0018` saiu depois de removê-los. Os snapshots ficam coerentes: um
`drizzle-kit generate` depois disso responde `No schema changes`.

### `0017` — retroativo e limpeza

```sql
INSERT INTO "attachment_history" ("attachment_id", "ticket_id", "actor_id", "event", "file_name", "mime_type", "size_bytes", "storage_key", "changed_at")
SELECT "id", "ticket_id", "uploaded_by", 'inclusao', "file_name", "mime_type", "size_bytes", "storage_key", "created_at"
FROM "attachment"
ORDER BY "created_at", "id";
DELETE FROM "ticket_history" WHERE "event" IN ('anexo_incluido', 'anexo_removido');
```

Uma `inclusao` por anexo vivo, `actor_id` = `uploaded_by`, `changed_at` =
`created_at`. O `ORDER BY` só faz o `id` do histórico seguir a ordem
cronológica.

### `0018` — recriação do tipo (gerada pelo drizzle-kit)

```sql
ALTER TABLE "ticket_history" ALTER COLUMN "event" SET DATA TYPE text;
DROP TYPE "public"."history_event";
CREATE TYPE "public"."history_event" AS ENUM('criacao', …, 'edicao', 'resolucao');
ALTER TABLE "ticket_history" ALTER COLUMN "event" SET DATA TYPE "public"."history_event" USING "event"::"public"."history_event";
```

Equivale ao roteiro "rename → create → alter → drop": a coluna passa por
`text`, o tipo é recriado e a coluna volta com cast. Mantida como o
drizzle-kit gerou: a ordem está certa e `ticket_history.event` é a única
coluna com esse tipo, sem default, índice parcial nem `check` que dependa dele
(conferido em `db/schema.ts` e nas migrations `0000`–`0015`).

### O que se perde

- As linhas `anexo_incluido`/`anexo_removido` de `ticket_history`. As de
  inclusão de anexos ainda vivos são recriadas como `inclusao` pelo retroativo.
  As de **remoção** antigas não têm equivalente (o anexo já não existe em
  `attachment`), então não há `exclusao` retroativa. Aceito na P1 (o banco só
  tem dado de teste).
- Para anexo incluído e depois removido antes da etapa, nenhuma linha em
  `attachment_history`.

### Aplicar

`npm run db:migrate` é ação durável: o orquestrador pede ao usuário. As três
precisam estar aplicadas **antes** do código do `df-data` rodar e antes do
`df-qa`. **Código e migration entram juntos** (risco 5 do plano): o
`app/_lib/data/tickets.ts` de hoje grava `anexo_*`, que deixa de existir no
tipo depois da `0018`; com a migration aplicada e o código antigo, salvar
edição com anexo lança erro de enum.

## `df-data` — `app/_lib/data/tickets.ts`

Hoje o `npx tsc --noEmit` falha só em:

- `app/_lib/data/tickets.ts:588` — `event: "anexo_removido"`
- `app/_lib/data/tickets.ts:598` — `event: "anexo_incluido"`

As duas funções mantêm assinatura, travas, ordem das checagens e outcomes. O
que muda são escritas a mais em `attachment_history`, **dentro da mesma
transação** (`tx`), só no caminho de sucesso. Import novo: `attachmentHistory`
de `@/db/schema`.

### `insertTicket` (`:233`)

- O `tx.insert(attachment)` (`:298-311`) ganha `.returning(...)` com `id`,
  `fileName`, `mimeType`, `sizeBytes` e `storageKey`.
- Logo depois, `tx.insert(attachmentHistory).values(...)` com uma linha por
  anexo devolvido: `attachmentId` = `id`, `ticketId` = `created.id`,
  `actorId` = `values.createdBy`, `event: "inclusao"`, os quatro campos do
  arquivo vindos do `returning`, e **`changedAt` = `created.createdAt`** — o
  mesmo `Date` já gravado em `attachment.created_at` (`:308`).
- Por que informar `changedAt` aqui, ao contrário do `criacao` de
  `message_history` (revisão MH2 de `comment-history.md`): lá, `message.created_at`
  vinha do `default now()` do banco, com microssegundos. Aqui
  `attachment.created_at` é gravado explicitamente com o `Date` do JavaScript
  (milissegundos); omitir `changedAt` daria `now()` com microssegundos e
  **diferente** do `created_at` do anexo. Os dois recebem o mesmo `Date`, então
  ficam idênticos.
- Sem anexos, nenhuma linha (o bloco continua dentro do `if` de `:298`).

### `updateTicketByAssignee` (`:317`)

- **Exclusão.** O `delete(attachment)` (`:530-539`) passa a devolver `id`,
  `fileName`, `mimeType`, `sizeBytes` e `storageKey`. `removedStorageKeys`
  continua derivado dele. Para cada linha apagada, uma `exclusao`:
  `attachmentId` = `id`, `ticketId`, `actorId` = `editorId`, os quatro campos
  **da linha apagada**, `changedAt` = `changedAt`. Vale só o que o `delete`
  devolveu (o que de fato saiu do banco).
- **Inclusão.** O `insert(attachment)` (`:545-556`) ganha `.returning(...)` com
  `id`, `fileName`, `mimeType`, `sizeBytes`, `storageKey`. Para cada linha, uma
  `inclusao`: `attachmentId` = `id`, `ticketId`, `actorId` = `editorId`, os
  quatro campos, `changedAt` = `changedAt` (o mesmo `Date` gravado em
  `attachment.created_at`, `:554`).
- As `exclusao` vêm antes das `inclusao` (mesma ordem das escritas em
  `attachment`). Pode ser um `insert` só com as duas listas ou um por bloco; a
  ordem de `id` dentro de cada bloco não é critério.
- **Sai** o empurrar de `anexo_removido`/`anexo_incluido` em `historyRows`
  (`:582-602`). `savedAttachments` continua: é usado na recusa
  (`ticketAttachmentEditRefusalFor`, `:398-413`) e no `no_changes`
  (`:460-469`).
- **`tx.insert(ticketHistory).values(historyRows)` (`:629`) só roda quando
  `historyRows.length > 0`.** Numa edição só de anexos, `historyRows` fica
  vazio, e o Drizzle lança com lista vazia (risco 1 do plano). Essa edição
  salva normalmente, sem linha em `ticket_history`.

### Regras gerais

- Nenhuma função de leitura de `attachment_history`; nenhuma função nova
  exportada.
- Nenhum `UPDATE` nem `DELETE` em `attachment_history`, em lugar nenhum do app.
- Falha no insert do histórico derruba a transação inteira: o chamado não é
  criado nem editado (a action devolve o erro inesperado de hoje e faz a
  limpeza no R2 de hoje).
- Nenhum outro caminho grava ou apaga `attachment` hoje (`grep` de
  `insert(attachment)`/`delete(attachment)` em `app/_lib/data/` e
  `db/seed.ts`). Anexo de comentário (`message_id` não nulo) não é criado por
  nenhum caminho; se um dia for, a exclusão do comentário (cascade em
  `attachment_message_ticket_fk`) também precisará gravar `exclusao`.

## Cenários para o `df-qa`

Pré-requisito: `0016`, `0017` e `0018` aplicadas e o código do `df-data`
pronto. R2 configurado (a QA da Etapa 1 anexou com sucesso). Banco pelo MCP
`postgres` (só leitura, ADR 013). Usuários de `docs/contracts/qa-seed.md`:
`M` = QA Membro Suporte, `A` = QA Admin Suporte. Títulos começam com
`[QA] Histórico de anexos`. **Não alterar #65 a #68.** Arquivos pequenos
(`.txt`, `.png`), nomes distintos por cenário.

Consulta-base:

```sql
SELECT id, attachment_id, ticket_id, actor_id, event, file_name, mime_type, size_bytes, storage_key, changed_at
FROM attachment_history WHERE ticket_id = <X> ORDER BY changed_at, id;
```

Divergência entre anexos vivos e as respectivas `inclusao` (deve ser `0`
sempre, antes e depois da bateria):

```sql
SELECT count(*) FROM attachment a
LEFT JOIN attachment_history h ON h.attachment_id = a.id AND h.event = 'inclusao'
WHERE h.id IS NULL OR h.changed_at <> a.created_at OR h.actor_id <> a.uploaded_by
   OR h.ticket_id <> a.ticket_id OR h.file_name <> a.file_name OR h.mime_type <> a.mime_type
   OR h.size_bytes <> a.size_bytes OR h.storage_key <> a.storage_key;
```

Preparação: nenhuma além dos cenários (AH3 cria `#H1`).

| #    | Quem | Ação                                                                                                                       | Esperado                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---- | ---- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AH1  | —    | **primeiro da bateria**, antes de qualquer anexo novo                                                                      | `SELECT count(*) FROM attachment_history` = `SELECT count(*) FROM attachment`; todas `inclusao`; nenhuma `exclusao`; consulta de divergência = `0`                                                                                                                                                                                                                                                                                                                                                                                                |
| AH2  | —    | junto com o AH1                                                                                                            | `SELECT enum_range(null::history_event)` sem `anexo_incluido` e `anexo_removido` (12 valores); `SELECT enum_range(null::attachment_history_event)` = `{inclusao,exclusao}`; nenhuma linha em `ticket_history` com `event::text LIKE 'anexo%'`                                                                                                                                                                                                                                                                                                     |
| AH3  | M    | "Novo chamado" `[QA] Histórico de anexos`, QA Suporte, destinatário **M**, com `ah-a.txt` e `ah-b.png` → criar             | chamado `#H1` criado com 2 anexos. Banco: 2 linhas `inclusao` para `#H1`, `actor_id` = M, `attachment_id` = ids em `attachment`, `file_name`/`mime_type`/`size_bytes`/`storage_key` iguais aos de `attachment`, `changed_at` = `attachment.created_at` **exato** (consulta de divergência = `0`); `ticket_history` de `#H1` só com `criacao`                                                                                                                                                                                                      |
| AH4  | M    | em `#H1`, "Editar" → X em `ah-a.txt`, `Anexar` `ah-c.txt` → **sem mudar campo** → "Salvar alterações"                      | **salva sem erro**: toast `Chamado #H1 atualizado.`; sai da edição; anexos `ah-b.png` e `ah-c.txt`. Banco: `ticket_history` de `#H1` **sem linha nova** (continua só `criacao`); `attachment_history` com 2 linhas novas, mesmo `changed_at`: `exclusao` de `ah-a.txt` (mesmo `attachment_id`, `storage_key`, `size_bytes`, `mime_type` da linha de AH3; `actor_id` = M) e `inclusao` de `ah-c.txt` com `changed_at` = `attachment.created_at`; `exclusao` com `id` menor que a `inclusao`; nenhuma linha em `attachment` para o id de `ah-a.txt` |
| AH5  | M    | em `#H1`, conferir a linha do tempo depois do AH4                                                                          | só `Abertura`; nenhum `Anexo incluído`/`Anexo removido`; nenhum evento novo                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| AH6  | M    | em `#H1`, "Editar" → título `[QA] Histórico de anexos (editado)` + `Anexar` `ah-d.txt` + X em `ah-b.png` → salvar          | toast de sucesso; linha do tempo ganha **um** evento, `Edição` com `Alterou título.`; nenhum evento de anexo. Banco: 1 linha `edicao` em `ticket_history`; em `attachment_history`, `exclusao` de `ah-b.png` e `inclusao` de `ah-d.txt` com o mesmo `changed_at` da `edicao`                                                                                                                                                                                                                                                                      |
| AH7  | A    | em `#H1` (A não é destinatário), forjar `editTicket` removendo `ah-c.txt`                                                  | recusado como hoje (`attachments-in-edit.md`); `max(id)` de `attachment_history` e de `ticket_history` inalterados                                                                                                                                                                                                                                                                                                                                                                                                                                |
| AH8  | M    | em `#H1`, "Editar" sem nenhuma mudança → salvar                                                                            | `Nenhuma alteração para salvar.`; `max(id)` de `attachment_history` inalterado                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| AH9  | M, A | regressão de download: em `#H1`, clicar em `ah-c.txt` e `ah-d.txt` (M); `GET /api/attachments/<id de ah-a.txt>` (removido) | os dois baixam com o conteúdo enviado; o removido → `404`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| AH10 | —    | ao fim da bateria                                                                                                          | consulta de divergência = `0`; `SELECT count(*) FROM attachment_history WHERE event = 'exclusao' AND attachment_id IN (SELECT id FROM attachment)` = `0`                                                                                                                                                                                                                                                                                                                                                                                          |
| AH11 | —    | toda a bateria                                                                                                             | nenhum erro nem aviso no console nem no `next-devtools`; nenhum log `[editTicket]` de erro; nenhum e-mail novo                                                                                                                                                                                                                                                                                                                                                                                                                                    |

AH7 forjado: chamar a action `editTicket` com a sessão de A e
`removedAttachmentIds: [<id de ah-c.txt>]`, demais campos iguais aos atuais.

## Critério de pronto

1. AH1–AH11 aprovados pelo `df-qa`.
2. `attachment_history` só aparece em `db/schema.ts`, nas migrations e em
   `app/_lib/data/tickets.ts` (`grep` em `app/`); nenhum `update` nem `delete`
   sobre ela.
3. Nenhum `anexo_incluido`/`anexo_removido` em `app/`, `db/schema.ts` e
   `db/seed.ts`.
4. `tx.insert(ticketHistory)` em `updateTicketByAssignee` protegido por
   `historyRows.length > 0`.
5. `npx tsc --noEmit`, `npm run lint` e `npm run build` passam; `df-reviewer`
   sem bloqueante.

## Revisões em outros documentos

- `docs/contracts/attachments-in-edit.md` — revisão de 2026-10-15: regra 7 deixa
  de valer; cenários que citam `anexo_*` ficam como registro.
- `docs/contracts/timeline-summary.md` — revisão de 2026-10-15: SU13 e a linha
  "Editar só anexos" deixam de valer; e, à parte, o passo 3 da preparação
  ganhou o campo "Comentário" (observação 1 do relatório da Etapa 1).
- `docs/plans/timeline-summary-and-attachments-card.md` — Etapa 1 concluída;
  Etapa 2 aponta para este contrato.
- `docs/adr/018-direct-upload-of-ticket-attachments.md` cita as linhas
  `anexo_*` na seção "Linha do tempo": é registro da decisão da época e não é
  reescrito; este contrato a substitui nesse ponto.

## Checklist de encerramento

- [x] enum `attachment_history_event`, tabela `attachment_history`, relations e tipos; `history_event` sem `anexo_*` em `db/schema.ts`; migrations `0016`, `0017`, `0018`; domínio sem `anexo_*`; este contrato, revisões e plano (`df-architect`)
- [ ] migrations aplicadas (usuário, via orquestrador)
- [ ] `insertTicket` e `updateTicketByAssignee` gravando `inclusao`/`exclusao`, sem `anexo_*`, com o `insert` de `ticket_history` protegido (`df-data`)
- [ ] cenários do `df-qa`
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm run build`
