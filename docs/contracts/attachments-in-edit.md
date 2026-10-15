# Contrato — Anexar e remover anexos só no "Editar"

Etapa 3 do plano `docs/plans/comment-history-and-attachments-in-edit.md`,
aprovado pelo usuário em `/consult` em 2026-10-14. As Etapas 1 e 2 estão
comitadas (`173afa9`, `535b6e1`, `c424a73`, `cbe0c58`).

> Revisão de 2026-10-14, pós-QA (`docs/test-reports/2026-10-14-attachments-in-edit.md`,
> nota 2): o AE20 listava M entre quem abre E5 durante a transferência
> pendente. M não vê o chamado nesse momento: não o criou, não é o
> destinatário e o setor atual deixou de ser o dele, e `canViewTicket`
> (`app/_lib/domain/ticket.ts:172-182`) devolve `false`; o `404` é a regra
> correta, já coberta pelo LA13. O cenário passa a usar só A (criador de E5) e
> I (setor de destino). Sem mudança de código.

> Revisão de 2026-10-14, pedido do usuário (com screenshot): no modo edição,
> `Anexar` sai do lado direito do cabeçalho do bloco "Anexos" e vai para
> **abaixo** da faixa de blocos (ou do vazio `Nenhum anexo.`), alinhado à
> esquerda. O cabeçalho (título, dica, contador, aviso) fica igual, sem o
> botão. A ordem de tabulação passa a ser blocos/X → `Anexar`. Nenhuma regra
> de comportamento muda (sem vaga, foco depois de remover, `disabled` durante o
> envio). Cenários alterados: AE3, AE23 e AE24.

> Revisão de 2026-10-15, Etapa 2 do plano
> `docs/plans/timeline-summary-and-attachments-card.md`
> (`docs/contracts/attachment-history.md`): a **regra 7** deixa de valer.
> Incluir e remover anexo não grava mais `anexo_incluido`/`anexo_removido` em
> `ticket_history` (os dois valores saem de `history_event` e as linhas
> antigas são apagadas pela migration `0017`); cada inclusão e exclusão vira
> uma linha `inclusao`/`exclusao` em `attachment_history`, que nenhuma tela
> lê. Edição só de anexos não aparece na linha do tempo. Os trechos que citam
> `anexo_*` (schema, passos 3 e 4 do histórico, textos da linha do tempo,
> AE4, AE6, AE8, AE9, AE10, AE12, AE15, AE18) ficam como registro da etapa e
> não são mais critério; o resto do contrato continua valendo.

O anexo deixa de entrar pela resolução e passa a entrar **e sair** pelo modo de
edição do chamado. Nada vai para o banco até "Salvar alterações"; "Cancelar"
descarta tudo.

Este contrato **altera**:

- `docs/contracts/attachments-assignee-only.md` — o uploader da Conclusão sai;
  a regra `canAttachToTicket` continua, agora aplicada no "Editar".
- `docs/contracts/ticket-attachments-on-resolution.md` — `resolveTicket` deixa
  de receber anexos.
- `docs/contracts/ticket-attachments-list-and-download.md` — o bloco "Anexos"
  ganha modo edição; a transição `Novos anexos` acaba.
- ADR 018 — revisão de 2026-10-14 (Etapa 3): remoção pela interface.

Ondas: `df-architect` (feito) → `df-data` → `df-actions` ‖ `df-ui` →
`df-architect` (fechamento) → `df-reviewer` → `df-qa`. `df-email` e `df-auth`
não entram.

Versões observadas: `next@16.3.5`, `zod@4.6.5`, `drizzle-orm@0.45.2`,
`react-hook-form@7.88`, `@aws-sdk/client-s3@^3.1140`.

## Regras de negócio

1. **Quem inclui e remove:** `canAttachToTicket` (sem mudança de regra): conta
   ativa sem troca de senha pendente, **destinatário** atual e
   `canEditTicket`. Na prática, quem vê o botão "Editar".
2. **Onde:** só no modo edição do chamado (`/tickets/[id]`, depois de
   "Editar"), no próprio bloco "Anexos" da Conclusão. Fora da edição o bloco é
   só leitura e download, para todos (Etapa 2).
3. **Quando vale:** só em "Salvar alterações", na mesma transação dos demais
   campos. "Cancelar" descarta: removidos voltam, novos somem (o que subiu para
   `pending/` expira em 1 dia pelo ciclo de vida do bucket).
4. **Remover anexo de outra pessoa** é permitido, inclusive os da criação.
   Sem diálogo de confirmação: a remoção só vale ao salvar, e "Cancelar"
   desfaz.
5. **Teto: `TICKET_ATTACHMENTS_MAX = 10` por chamado**, contado como
   salvos − removidos + novos. Só **incluir** é limitado: um salvamento que só
   remove nunca é recusado pelo teto. A criação ("Novo chamado") continua com
   até 5 por envio (`ATTACHMENT_MAX_FILES`), abaixo do teto.
6. **Remoção apaga** a linha de `attachment` (na transação) **e** o objeto no R2
   (**depois** do commit, melhor esforço; falha só gera log — órfão aceito).
7. **Linha do tempo:** uma linha `anexo_incluido` ou `anexo_removido` por
   arquivo, com o nome do arquivo em `note`.
8. **`no_changes`** considera anexos: incluir ou remover já é mudança.
9. **Troca de destinatário e anexo no mesmo salvamento** passa: a checagem usa
   quem salva, que sob a trava do chamado ainda é o destinatário. Os anexos são
   gravados com `uploaded_by` = quem salvou, e só depois o chamado muda de mãos.
10. **Conclusão sem anexo:** sai o uploader do formulário de resolver. Resolver
    não grava mais `attachment`.

## Banco

### `db/schema.ts` (feito)

`history_event` ganha dois valores, no fim (`db/schema.ts:79-80`):

```ts
"anexo_incluido",
"anexo_removido",
```

`attachment` **não muda**. Sem `updated_at`, sem coluna nova.

### Migration (gerada; aplicada pelo usuário em 2026-10-14)

`db/migrations/0015_history_event_attachments.sql`, gerada por
`npm run db:generate -- --name=history_event_attachments`:

```sql
ALTER TYPE "public"."history_event" ADD VALUE 'anexo_incluido';--> statement-breakpoint
ALTER TYPE "public"."history_event" ADD VALUE 'anexo_removido';
```

Não destrutiva. O orquestrador pede ao usuário que a aplique
(`npm run db:migrate`) **antes** de rodar o código do `df-data` desta etapa:
sem os valores no enum, o `insert` de `anexo_*` falha e o salvamento inteiro é
desfeito.

### Linhas gravadas por salvamento

| Tabela           | Linha                                                                                                                                                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `attachment`     | incluída: `ticket_id`, `message_id` **nulo**, `uploaded_by` = quem salva, `file_name` (do pedido, com `trim`), `mime_type` da tabela, `size_bytes` do `HEAD`, `storage_key` `tickets/<uuid>.<ext>`, `created_at` = `changedAt` |
| `attachment`     | removida: `DELETE` da linha (só `message_id` nulo e do chamado)                                                                                                                                                                |
| `ticket_history` | `anexo_incluido` / `anexo_removido`: `changed_by` = quem salva, `note` = nome do arquivo, `changed_at` = `changedAt`, demais colunas nulas                                                                                     |
| `ticket`         | `updated_at` = `changedAt` (inclusive quando só anexos mudaram)                                                                                                                                                                |

No `anexo_removido`, o nome vem da **linha apagada** (`file_name` do banco),
nunca do cliente.

## Domínio (feito)

### `app/_lib/domain/attachment.ts`

| Item                               | Linha  | Valor                                               |
| ---------------------------------- | ------ | --------------------------------------------------- |
| `TICKET_ATTACHMENTS_MAX`           | `:23`  | `10`                                                |
| `TICKET_ATTACHMENTS_LIMITS_HINT`   | `:342` | `Até 10 arquivos neste chamado, de até 10 MB cada.` |
| `TICKET_ATTACHMENTS_LIMIT_MESSAGE` | `:344` | `O chamado pode ter no máximo 10 anexos.`           |

Ficam aqui (e não em `ticket-attachment.ts`) porque a validação e o uploader
cliente os importam e não precisam carregar as regras de edição.
`ATTACHMENT_MAX_FILES`, `ATTACHMENT_LIMITS_HINT` e `ATTACHMENT_TOO_MANY_MESSAGE`
continuam valendo para a criação.

### `app/_lib/domain/ticket-attachment.ts`

| Item                                     | Linha | Semântica                                                                                             |
| ---------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------- |
| `ATTACHMENT_ASSIGNEE_ONLY_MESSAGE`       | `:17` | **texto alterado**: `Só o destinatário do chamado pode incluir ou remover anexos.`                    |
| `ATTACHMENT_REMOVAL_NOT_FOUND_MESSAGE`   | `:20` | `Um dos anexos removidos não está mais neste chamado. Revise os anexos e salve de novo.`              |
| `TICKET_ATTACHMENTS_EDIT_NOTICE`         | `:23` | `Inclusões e remoções de anexos só valem ao salvar as alterações.`                                    |
| `canAttachToTicket`                      | `:26` | sem mudança                                                                                           |
| `canAttachToTicketDetail`                | `:35` | sem mudança                                                                                           |
| `ticketAttachmentCountAfterEdit(counts)` | `:52` | `saved − removed + added`                                                                             |
| `hasTicketAttachmentChanges(counts)`     | `:56` | `added > 0 \|\| removed > 0`                                                                          |
| `exceedsTicketAttachmentsLimit(counts)`  | `:60` | `added > 0 && countAfterEdit > TICKET_ATTACHMENTS_MAX` — só incluir é limitado                        |
| `ticketAttachmentSlotsLeft(counts)`      | `:66` | `max(0, TICKET_ATTACHMENTS_MAX − countAfterEdit)` — vagas para o contador e para o limite do uploader |
| `describeTicketAttachmentSlots(slots)`   | `:71` | `≤ 0` → `Nenhuma vaga restante.`; `1` → `Resta 1 vaga.`; senão `Restam N vagas.`                      |
| `areTicketAttachments(ids, savedIds)`    | `:77` | todo id de `ids` está em `savedIds`                                                                   |
| `ticketAttachmentEditRefusalFor(…)`      | `:82` | decisão única da action (antes do R2) e da transação (sob trava). Ver abaixo                          |

```ts
export const ticketAttachmentEditRefusalFor = (
  actor: TicketEditorFacts,
  ticket: TicketEditabilityFacts,
  edit: TicketAttachmentEdit,
  now: Date,
): TicketEditRefusal | null
```

Ordem, parando na primeira:

1. sem mudança de anexo (`added = 0` e nenhum id removido) → `null` (a função
   não opina; nem consulta a regra de quem anexa);
2. `!canAttachToTicket(actor, ticket, now)` → `"attachments_not_allowed"`;
3. algum id removido fora de `edit.savedIds` → `"attachment_not_found"`;
4. `exceedsTicketAttachmentsLimit` → `"attachments_limit"`;
5. `null`.

`removed` é contado sem repetição (`new Set(removedIds).size`); o schema já
recusa repetição, a contagem só não confia nisso.

**Por que `attachments_not_allowed` hoje é inalcançável depois do
`canEditTicket`.** Quem chega ao passo 2 já passou por `canEditTicket` na
action e na transação, e `canEditTicket` implica as outras duas partes de
`canAttachToTicket` (ver `attachments-assignee-only.md`, "As três partes"). O
passo existe para que a regra de anexo não dependa de o "Editar" continuar
sendo só do destinatário (ADR 017). Um não destinatário que forja o pedido
recebe a recusa de **edição** (`Você não pode editar este chamado.`).

### `app/_lib/domain/ticket-edit.ts`

`buildTicketEditFormOptions` (`:102`) passa a devolver `defaults` com
`attachments: []` e `removedAttachmentIds: []` (`:116-117`). `form.reset(options.defaults)`
no "Editar" e no "Cancelar" zera as duas listas.

`describeTicketEditNote`, `diffTicketEdit` e `hasTicketEditChanges` **não
mudam**: anexos não entram na nota da linha `edicao` (têm linhas próprias).

### `app/_lib/domain/ticket-history.ts`

| Evento           | Rótulo (`HISTORY_EVENT_LABELS`, `:25-26`) | Texto (`describeHistoryEntry`, `:154-155`) | Nomeia o ator no texto (`:174-175`) |
| ---------------- | ----------------------------------------- | ------------------------------------------ | ----------------------------------- |
| `anexo_incluido` | `Anexo incluído`                          | `Incluiu um anexo.`                        | não                                 |
| `anexo_removido` | `Anexo removido`                          | `Removeu um anexo.`                        | não                                 |

O nome do arquivo aparece pela `note`, que a linha do tempo já mostra num
quadro abaixo do texto (`ticket-timeline.tsx:78-82`), como a nota da `edicao`.
Por isso o texto não repete o nome. O ator e a data saem na legenda, como em
`edicao`. Nenhuma mudança em `ticket-timeline.tsx`.

## Tipos (feito)

### `app/_lib/types/attachment.ts`

```ts
export interface TicketAttachmentEditCounts {
  // :138
  saved: number
  removed: number
  added: number
}

export interface TicketAttachmentEdit {
  // :144
  savedIds: readonly number[]
  removedIds: readonly number[]
  addedCount: number
}
```

`TicketAttachmentFacts` (`:129`) e `TicketAttachmentItem` (`:132`) **ficam**:
a checagem antes do R2 da edição os usa.

### `app/_lib/types/ticket-edit.ts`

```ts
export interface UpdateTicketByAssigneeValues extends TicketEditValues {
  ticketId: number
  editorId: number
  handoffComment?: string
  addedAttachments?: readonly StoredAttachmentValues[] // :100
  removedAttachmentIds?: readonly number[] // :101
}

export interface TicketEditSaved {
  status: "saved"
  ticketId: number
  tagChanged: boolean
  removedStorageKeys?: string[] // :108
}

export type TicketEditRefusal =
  // :115
  "attachments_not_allowed" | "attachment_not_found" | "attachments_limit"

export interface TicketNotEditable {
  status: "not_editable"
  reason?: TicketEditRefusal // :122
}

export interface EditTicketFormDefaults {
  // …campos de hoje
  attachments: UploadedAttachmentRef[] // :150
  removedAttachmentIds: number[] // :151
}
```

**Decisão: recusa de anexo como `reason` de `not_editable`, e não como status
novo.** Mesmo motivo de `TicketNotResolvable.reason`
(`attachments-assignee-only.md`): o `EDIT_OUTCOME_FAILURES` de `editTicket` é
`satisfies Record<…status sem "saved", …>` (`app/_lib/actions/tickets.ts:227-258`).
Um status novo quebraria o `tsc` assim que o `df-data` o devolvesse, antes de
o `df-actions` rodar. Com `reason` opcional: a action de hoje trata a recusa
como `not_editable` genérico; a da Onda 2 dá a cada motivo o código próprio.
Sem `reason` = recusa da edição em si, como hoje.

**Por que opcionais e permanentes** (`addedAttachments`,
`removedAttachmentIds`, `removedStorageKeys`, `reason`): "ausente = nenhum",
como `attachments?` em `InsertTicketValues`. Exigir qualquer um deles quebraria
o `tsc` entre ondas, e torná-los obrigatórios no fechamento deixaria `?? []`
morto no código da action. Depois da Onda 2 a action sempre passa as listas e
o `df-data` sempre devolve `removedStorageKeys` (vazio ou não) no `saved`.

`EditTicketFormDefaults` ganha os dois campos **obrigatórios**: só
`buildTicketEditFormOptions` o constrói.

## Validação (feito)

### `app/_lib/validation/attachment.ts`

```ts
const uploadedAttachmentListSchema = (max: number, tooManyMessage: string) => …  // :73, interno
export const uploadedAttachmentsSchema    // :85 — (5, ATTACHMENT_TOO_MANY_MESSAGE), sem mudança de comportamento
export const ticketAttachmentsToAddSchema // :92 — (10, TICKET_ATTACHMENTS_LIMIT_MESSAGE)
export const attachmentIdSchema           // :99 — inteiro positivo até POSTGRES_INTEGER_MAX, "Anexo inválido."
export const removedAttachmentIdsSchema   // :103 — array de attachmentIdSchema, máx. 10, sem repetição, "Anexo inválido."
```

`uploadedAttachmentsSchema` virou uma instância da fábrica interna; regras e
mensagens idênticas (máx. 5, chaves sem repetição, chave de espera válida,
extensão da chave = do nome).

### `app/_lib/validation/ticket.ts`

```ts
export const editTicketSchema = ticketFieldsSchema.extend({
  ticketId: ticketIdSchema,
  solution: ticketSolutionSchema.optional(),
  handoffComment: handoffCommentSchema.optional(),
  attachments: ticketAttachmentsToAddSchema.optional(), // :101
  removedAttachmentIds: removedAttachmentIdsSchema.optional(), // :102
})
```

- **`attachments`**: referências `pending/` dos arquivos **novos** (mesmo nome
  e mesmo item do `createTicketSchema`, para o uploader se ligar igual). Máx.
  10 por pedido: o schema não sabe quantos já estão salvos; o teto real
  (salvos − removidos + novos) é da action e da transação.
- **`removedAttachmentIds`**: ids de `attachment` a apagar. Máx. 10 (um chamado
  nunca passa de 10: criação 5 + resolução 5, e não existe reabertura), sem
  repetição. Se são do chamado e de `message_id` nulo, só o banco sabe.
- Os dois **opcionais**, não `default([])`: com `default`, entrada e saída do
  schema divergem e `useForm<EditTicketInput>` com `zodResolver` deixa de
  compilar. Ausente = lista vazia.
- O schema não sabe quem é o usuário: `pending/<id da sessão>/` é conferido no
  `storePendingAttachments`, como na criação.

## `df-data` — o que mudar

### `app/_lib/data/tickets.ts` — `updateTicketByAssignee` (alterado, `:314-526`)

Mesma transação, mesmas travas, mesmos outcomes. Imports novos:
`ticketAttachmentEditRefusalFor` e `hasTicketAttachmentChanges` de
`@/app/_lib/domain/ticket-attachment`; `isNull` de `drizzle-orm` (já importado).

`added = values.addedAttachments ?? []`, `removedIds = values.removedAttachmentIds ?? []`.

**Precedência final** (as quatro primeiras são as de hoje):

1. `not_found` — chamado inexistente (`for update` do chamado).
2. `not_editable` — quem edita sem linha (`lockActorFacts`).
3. `not_found` — `!canViewTicket`.
4. `not_editable` — `!canEditTicket` (`:357-371`).
5. `not_editable` — solução enviada e `!canEditSolution` (`:373-375`).
6. **anexos (novo)** — só se `added.length > 0 || removedIds.length > 0`:
   - `select id, file_name, storage_key from attachment where ticket_id = $1
and message_id is null order by created_at asc, id asc for update`;
   - `refusal = ticketAttachmentEditRefusalFor(editor, { assignedTo,
currentDepartmentId, status, resolvedAt, hasPendingTransfer }, { savedIds,
removedIds, addedCount: added.length }, now)` — os mesmos fatos e o mesmo
     `now` do `canEditTicket` do passo 4;
   - `refusal !== null` → `{ status: "not_editable", reason: refusal }`.
7. `invalid_tag` (como hoje).
8. `invalid_assignee` (como hoje).
9. `no_changes` — **agora** só quando
   `!hasTicketEditChanges(changes) && !hasTicketAttachmentChanges({ saved, removed: removedIds.length, added: added.length })`.
10. `comment_required` (como hoje).
11. gravação.

A contagem do teto é feita **sob a trava** do chamado (passo 1, `for update`):
todo escritor de `attachment` com `message_id` nulo trava o chamado antes
(`insertTicket` o cria; a edição o trava). O `for update` nas linhas de
`attachment` é a segunda trava pedida no plano (risco 4, "Corrida no teto") e
segura as linhas que vão ser apagadas. O Postgres não aceita `for update` com
`count(*)`: a contagem é o tamanho do resultado.

**Gravação**, nesta ordem (mesmo `changedAt = now`):

1. mensagem de passagem (`handoffComment`), como hoje;
2. `update ticket` como hoje — **sempre**, inclusive quando só anexos mudaram
   (`updated_at = changedAt`; título, descrição e tipo regravados iguais);
3. `ticket_tag`, como hoje;
4. `delete from attachment where ticket_id = $1 and message_id is null and id in (removedIds) returning storage_key`
   — só com `removedIds` não vazia;
5. `insert into attachment` dos `added` (`messageId: null`,
   `uploadedBy: editorId`, `createdAt: changedAt`, demais do
   `StoredAttachmentValues`) — só com `added` não vazia (o Drizzle recusa
   `values([])`);
6. `ticket_history`, **nesta ordem de `id`**:

| #   | `event`          | Quando                                                                  | Colunas                                              |
| --- | ---------------- | ----------------------------------------------------------------------- | ---------------------------------------------------- |
| 1   | `edicao`         | **só se** `hasTicketEditChanges(changes)`                               | `note = describeTicketEditNote(changes)` (como hoje) |
| 2   | `mudanca_tag`    | `changes.tag` (como hoje)                                               | como hoje                                            |
| 3   | `anexo_removido` | uma por id removido, na ordem da consulta do passo 6 (`created_at, id`) | `note` = `file_name` da linha apagada                |
| 4   | `anexo_incluido` | uma por item de `added`, na ordem da lista                              | `note` = `fileName`                                  |
| 5   | `atribuicao`     | `changes.assignee` (como hoje)                                          | como hoje                                            |
| 6   | `mudanca_status` | `nextStatus !== status` (como hoje)                                     | como hoje                                            |

Por que esta ordem: primeiro o que muda **no conteúdo** do chamado (campos,
tag, anexos — "trocar um arquivo" lê como removeu e depois incluiu), depois o
que muda **de mãos** (destinatário e status). Quem incluiu ou removeu ainda
era o destinatário naquele momento, e a linha do tempo conta isso. A linha
`edicao` deixa de existir quando só anexos mudaram: sem ela, a nota seria
`Nenhuma alteração.`

A linha do tempo ordena por `changed_at, id`
(`app/_lib/data/tickets.ts:217`); como todas têm o mesmo `changedAt`, a ordem
é a dos `id`. Um `insert` por linha (como hoje) ou um `insert` com várias
linhas na ordem acima — o que o `df-data` preferir, desde que os `id` saiam
nessa ordem.

7. retorno: `{ status: "saved", ticketId, tagChanged, removedStorageKeys }`,
   com as chaves do `returning` do passo 4 (vazia sem remoção).

Não confere tipo, tamanho nem chave dos `added`: chegam verificados da
action. Erro de banco (inclusive `storage_key` duplicado) lança e desfaz tudo.

### `app/_lib/data/tickets.ts` — `updateTicketResolution` (alterado, `:559-671`)

Resolver não grava mais anexo:

- sai `const attachments = values.attachments ?? []` e a recusa
  `attachments_not_allowed` (`:607-618`): o outcome nunca mais traz `reason`;
- sai o `insert` em `attachment` (`:654-667`);
- sai o import de `canAttachToTicket` (`:24`) se ficar sem uso no arquivo.

`changedAt` continua no início da transação; `resolvedAt` no `for update` pode
ficar ou sair (era o fato de `canAttachToTicket`). O campo
`UpdateTicketResolutionValues.attachments` ainda existe até o fechamento: o
`df-data` o ignora.

### `findTicketAttachmentFacts` e `listTicketAttachments` — **ficam, sem mudança**

A checagem antes do R2 de `editTicket` usa as duas (visibilidade e regra pelo
primeiro; ids salvos pelo segundo). Nenhuma função de dados nova.

## `df-actions` — o que mudar

### `app/_lib/actions/attachment-intake.ts` — `discardRemovedAttachments` (novo)

```ts
export const discardRemovedAttachments = async (
  storageKeys: readonly string[],
  logScope: string,
): Promise<void>
```

Apaga os objetos definitivos de anexos removidos, melhor esforço:
`deleteAttachmentObjectsQuietly(storageKeys, \`${logScope} remove\`)`. Nunca
lança. Lista vazia → nada. `deleteAttachmentObject` já ignora chave que não é
de anexo (`isAttachmentStorageKey`).

### `app/_lib/actions/tickets.ts` — `editTicket` (alterado, `:268-300`)

```ts
export type EditTicketErrorCode =
  | "INVALID_INPUT"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "INVALID_TAG"
  | "INVALID_ASSIGNEE"
  | "NO_CHANGES"
  | "HANDOFF_COMMENT_REQUIRED"
  | "INVALID_ATTACHMENT"
  | "ATTACHMENT_NOT_FOUND"
  | "ATTACHMENTS_LIMIT"
```

`EditTicketSuccess`, `EditTicketFailure` e `EditTicketResult` mantêm a forma.
Entrada: `EditTicketInput` (com `attachments?` e `removedAttachmentIds?`).

```ts
const EDIT_LOG_SCOPE = "[editTicket]"

const ATTACHMENT_EDIT_FAILURES = {
  attachments_not_allowed: {
    ok: false,
    code: "FORBIDDEN",
    message: ATTACHMENT_ASSIGNEE_ONLY_MESSAGE,
  },
  attachment_not_found: {
    ok: false,
    code: "ATTACHMENT_NOT_FOUND",
    message: ATTACHMENT_REMOVAL_NOT_FOUND_MESSAGE,
  },
  attachments_limit: {
    ok: false,
    code: "ATTACHMENTS_LIMIT",
    message: TICKET_ATTACHMENTS_LIMIT_MESSAGE,
  },
} satisfies Record<TicketEditRefusal, EditTicketFailure>
```

Sequência:

1. `getSession()`; `null` → `EDIT_FORBIDDEN_FAILURE` (como hoje).
2. `editTicketSchema.safeParse(input)`; falha → `INVALID_INPUT` (como hoje).
3. `const { attachments: refs = [], removedAttachmentIds = [], ...fields } = parsed.data`.
4. Em `try`:
   1. **Checagem antes do R2, só se `refs.length > 0`** (no padrão do
      `resolveTicket` atual, `app/_lib/actions/ticket-resolution.ts:128-154`):
      1. `now = new Date()`;
         `[facts, ticketFacts, saved] = await Promise.all([getAccountFacts(), findTicketAttachmentFacts(fields.ticketId), listTicketAttachments(fields.ticketId)])`;
      2. `!facts || !canUploadAttachment(facts)` → `EDIT_OUTCOME_FAILURES.not_editable`;
      3. monta `TicketActorFacts` (`userId: actor.id` + `facts`);
      4. `!ticketFacts || !canViewTicket(actorFacts, ticketFacts)` → `EDIT_OUTCOME_FAILURES.not_found`;
      5. `!canEditTicket(actorFacts, ticketFacts, now)` → `not_editable`;
      6. `fields.solution !== undefined && !canEditSolution(ticketFacts.status)` → `not_editable`;
      7. `refusal = ticketAttachmentEditRefusalFor(actorFacts, ticketFacts, { savedIds: saved.map(({ id }) => id), removedIds: removedAttachmentIds, addedCount: refs.length }, now)`;
         `refusal !== null` → `ATTACHMENT_EDIT_FAILURES[refusal]`.
   2. `intake = await storePendingAttachments(refs, actor.id, EDIT_LOG_SCOPE)`;
      `rejected` → `{ ok: false, code: "INVALID_ATTACHMENT", message: describeInvalidAttachment(intake.fileName) }`.
   3. `stored = intake.attachments`.
   4. `outcome = await updateTicketByAssignee({ ...fields, editorId: actor.id, addedAttachments: stored, removedAttachmentIds })`.
5. `catch` → `console.error(EDIT_LOG_SCOPE, error)`,
   `discardStoredAttachments(stored, EDIT_LOG_SCOPE)`, `EDIT_UNEXPECTED_FAILURE`.
6. `outcome.status !== "saved"` → `discardStoredAttachments(stored, EDIT_LOG_SCOPE)`;
   depois `outcome.status === "not_editable" && outcome.reason !== undefined`
   → `ATTACHMENT_EDIT_FAILURES[outcome.reason]`; senão
   `EDIT_OUTCOME_FAILURES[outcome.status]` (como hoje).
7. `saved` → `await Promise.all([discardPendingAttachments(refs, EDIT_LOG_SCOPE), discardRemovedAttachments(outcome.removedStorageKeys ?? [], EDIT_LOG_SCOPE)])`;
   revalida como hoje (`ticketDetailPath`, `MY_TICKETS_PATH`,
   `DEPARTMENT_QUEUE_PATH`; `DASHBOARD_PATH` se `tagChanged`); devolve
   `describeTicketEdited` como hoje.

Notas:

- **Só remoção** (ou nada de anexo) não passa pela checagem do passo 4.1 nem
  toca o R2 antes do commit: quem decide é a transação. O R2 só é tocado no
  passo 7, depois do commit.
- **A ordem do passo 4.1 é a da transação** (visibilidade → `canEditTicket` →
  solução → anexos), para que a mesma entrada receba a mesma recusa nos dois
  pontos. A diferença é a conta, conferida antes de tudo (como no
  `resolveTicket` atual): conta inutilizável recebe `FORBIDDEN` mesmo para um
  chamado que não vê, o que não revela nada.
- O passo 4.1 não confere tag nem destinatário: um pedido com anexo novo e tag
  inválida copia e depois apaga as cópias (`invalid_tag` na transação), o mesmo
  desenho aceito na criação.
- `refs` nunca vai para `updateTicketByAssignee` (a desestruturação do passo 3
  o separa). Em nenhuma falha a action apaga `pending/`: a pessoa corrige e
  salva de novo com os mesmos arquivos.
- **Commit sem confirmação** (ADR 018, "Linha sem objeto"): se
  `updateTicketByAssignee` lançar depois de o `COMMIT` chegar ao banco, as
  linhas novas apontam para cópias apagadas e os objetos dos removidos ficam
  no R2 sem linha. Raro, aceito, fica no log.

Respostas, na ordem das checagens:

| Situação                                                                                                                                         | `code`                  | Mensagem                                                                                 | R2 tocado                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| salvo                                                                                                                                            | —                       | `Chamado #42 atualizado.`                                                                | pending apagado; removidos apagados depois do commit |
| sem sessão                                                                                                                                       | `FORBIDDEN`             | `Você não tem permissão para editar este chamado.`                                       | não                                                  |
| schema falhou (inclusive > 10 novos, id inválido ou repetido)                                                                                    | `INVALID_INPUT`         | primeira `issue.message`                                                                 | não                                                  |
| com novos: conta inutilizável                                                                                                                    | `FORBIDDEN`             | `Você não pode editar este chamado.`                                                     | não                                                  |
| com novos: chamado inexistente ou que não vê                                                                                                     | `NOT_FOUND`             | `Chamado não encontrado.`                                                                | não                                                  |
| com novos: não pode editar (não é destinatário, fora do setor, transferência pendente, encerrado, fora da janela) ou solução fora do `resolvido` | `FORBIDDEN`             | `Você não pode editar este chamado.`                                                     | não                                                  |
| com novos: `attachments_not_allowed`                                                                                                             | `FORBIDDEN`             | `Só o destinatário do chamado pode incluir ou remover anexos.`                           | não                                                  |
| com novos: id removido fora do chamado                                                                                                           | `ATTACHMENT_NOT_FOUND`  | `Um dos anexos removidos não está mais neste chamado. Revise os anexos e salve de novo.` | não                                                  |
| com novos: passa do teto                                                                                                                         | `ATTACHMENTS_LIMIT`     | `O chamado pode ter no máximo 10 anexos.`                                                | não                                                  |
| anexo novo recusado (verificação ou cópia)                                                                                                       | `INVALID_ATTACHMENT`    | `Não foi possível anexar "<nome>". Remova o arquivo e anexe de novo.`                    | conforme intake                                      |
| transação: `not_editable` com `reason`                                                                                                           | conforme a tabela acima | idem                                                                                     | cópias apagadas                                      |
| transação: demais outcomes                                                                                                                       | como hoje               | como hoje                                                                                | cópias apagadas                                      |
| falha inesperada                                                                                                                                 | —                       | `Não foi possível salvar o chamado agora. Tente novamente.`                              | cópias apagadas                                      |

Sem anexo novo, `ATTACHMENT_NOT_FOUND` só pode vir da transação, e
`ATTACHMENTS_LIMIT` nunca acontece (só remover não tem teto).

### `app/_lib/actions/ticket-resolution.ts` — `resolveTicket` (alterado)

Volta ao que era antes dos anexos na Conclusão:

```ts
export type ResolveTicketErrorCode = "INVALID_INPUT" | "FORBIDDEN" | "NOT_FOUND"
```

- saem `refs`, a checagem antes do R2 (`:128-154`),
  `storePendingAttachments`, `discardStoredAttachments`,
  `discardPendingAttachments`, `ATTACHMENTS_NOT_ALLOWED_FAILURE`,
  `invalidAttachment`, o ramo do `reason` (`:179-184`) e os imports que ficarem
  sem uso (`attachment-intake`, `getAccountFacts`, `findTicketAttachmentFacts`,
  `canUploadAttachment`, `describeInvalidAttachment`, `canViewTicket`,
  `canAttachToTicket`, `ATTACHMENT_ASSIGNEE_ONLY_MESSAGE`, `canResolveTicket`,
  `StoredAttachmentValues`, `TicketActorFacts`);
- `updateTicketResolution({ ticketId, solution, resolverId: actor.id })`;
- `parsed.data.attachments` é ignorado até o fechamento tirar o campo do schema.

Sequência, códigos e mensagens de resolver sem anexo: idênticos aos de
`docs/contracts/ticket-resolution.md`.

## `df-ui` — o que mudar

### Estrutura

```
app/(app)/_components/attachment-tile-body.tsx                  novo — miolo comum: ícone + extensão, nome (2 linhas), tamanho
app/(app)/_components/attachments-empty.tsx                     novo — vazio tracejado "Nenhum anexo."
app/(app)/_components/attachment-upload-item.tsx                alterado — usa o miolo; largura fixa quando em faixa
app/(app)/_components/attachment-uploader.tsx                   alterado — usa o vazio; limite e lista configuráveis para o modo edição; sai a prop title se ficar sem uso
app/(app)/_hooks/use-attachment-uploads.ts                      alterado — limite e mensagem de excesso configuráveis
app/(app)/tickets/[id]/_components/ticket-attachment-tile.tsx   alterado — usa o miolo; X opcional, irmão do link
app/(app)/tickets/[id]/_components/ticket-attachment-list.tsx   alterado — usa o vazio
app/(app)/tickets/[id]/_components/ticket-edit-attachments.tsx  novo — cliente; fora da edição devolve a lista de leitura; na edição, o bloco editável
app/(app)/tickets/[id]/_components/ticket-conclusion.tsx        alterado — bloco editável no lugar da lista, quando editable && canAttach
app/(app)/tickets/[id]/_components/resolve-ticket-form.tsx      alterado — sem uploader, sem canAttach, sem aviso
app/(app)/tickets/[id]/_components/ticket-edit-provider.tsx     alterado — estado de envio, bloqueio do salvar, códigos novos
app/(app)/tickets/[id]/_hooks/use-ticket-edit.ts                alterado — contexto
app/(app)/tickets/[id]/_components/ticket-edit-heading.tsx      alterado — "Salvar alterações" com bloqueio
```

Os nomes dos arquivos novos são sugestão; a divisão é do `df-ui`. O que o
contrato fixa:

- **Herdado da Etapa 2 — peça única.** O miolo do bloco salvo
  (`ticket-attachment-tile.tsx:25-37`) e o do bloco de envio
  (`attachment-upload-item.tsx:42-51`) viram **um** componente no
  `_components/` do grupo `(app)`; o vazio tracejado
  (`ticket-attachment-list.tsx:22` e `attachment-uploader.tsx:142`) também.
  Fica no grupo (e não em `app/_components/`) porque conhece anexo de chamado
  e só o grupo `(app)` usa. Sem subpasta.
- `ResolveTicketForm` perde as props `canAttach` (e o reset de `uploadsBusy`
  que dependia dela, `:57-63`), o `Controller name="attachments"`, o aviso e o
  título `Novos anexos`; a barra de ações é sempre a própria
  (`:213-215`). Com isso `TicketConclusion` repassa `canAttach` só ao bloco de
  anexos.
- `resolveTicket` continua recebendo `ResolveTicketInput`; até o fechamento o
  formulário ainda tem `attachments: []` nos `defaults`, e é isso que vai.

### Fora da edição

Igual à Etapa 2, para **todos**, inclusive o destinatário: `h3` `Anexos`,
faixa rolável de blocos-link, ou vazio tracejado. Nenhum `Anexar`, nenhum X,
nenhum `input[type=file]` na Conclusão. O bloco é renderizado **uma vez** (id
`ticket-attachments-heading` único).

### No modo edição (`isEditing && canAttach`)

O bloco de leitura é **substituído** (não duplicado) pelo editável, no mesmo
lugar e com o mesmo `h3` `Anexos` e o mesmo id:

```
cabeçalho (flex-wrap):
  [h3 Anexos]
  [dica   "Até 10 arquivos neste chamado, de até 10 MB cada."]    TICKET_ATTACHMENTS_LIMITS_HINT
  [vagas  "Restam N vagas."]                                       describeTicketAttachmentSlots
  [aviso  ⓘ "Inclusões e remoções de anexos só valem ao salvar as alterações."]  TICKET_ATTACHMENTS_EDIT_NOTICE
faixa (overflow-x-auto, p-1, scroll-p-1):
  <ul aria-labelledby="ticket-attachments-heading" class="flex w-max gap-2">
    salvos não removidos (ordem do servidor)    → link de download + X "Remover <nome>"
    novos (ordem de seleção)                    → status (Enviando… / Enviado / Falha no envio), erro, X
  </ul>
ou, sem nenhum (salvos − removidos + novos = 0): vazio tracejado "Nenhum anexo."
[📎 Anexar]                                       abaixo da faixa (ou do vazio), alinhado à esquerda
erro do campo attachments (FieldError), se houver
```

- **Posição do `Anexar`**: fora do cabeçalho, logo abaixo da faixa (ou do
  vazio tracejado), alinhado à esquerda, com a largura do próprio conteúdo
  (não estica). O cabeçalho tem só título, dica, contador e aviso.
- **Ordem de tabulação** dentro do bloco: links e X dos blocos, na ordem da
  faixa → `Anexar`. Sem `tabindex` positivo; a ordem vem da posição no DOM.

- **Uma faixa só**, as mesmas regras da Etapa 2: uma linha, rolagem de lado só
  dentro da faixa, barra nativa visível, anel de foco inteiro (`p-1` +
  `scroll-p-1`), blocos de largura fixa (`w-34`) e mesma altura, documento
  nunca rola de lado. Salvos e novos usam o **mesmo miolo**; o bloco novo
  acrescenta a linha de status e o erro.
- **X do salvo** é irmão do `<a>` dentro do `<li>` (posicionado no canto, como
  no bloco de envio), **nunca** dentro do link (interativo dentro de
  interativo). Nome acessível `removeAttachmentLabel(fileName)`
  (`Remover <nome>`). O link continua baixando durante a edição.
- **Remover salvo**: o bloco some da faixa na hora (sem riscado, sem desfazer
  individual; quem quer de volta usa "Cancelar"). O id vai para
  `removedAttachmentIds` do formulário. Sem diálogo de confirmação (regra 4).
- **Remover novo**: como hoje no uploader (aborta o envio em curso).
- **Foco depois de remover** (salvo ou novo): vai para `Anexar`, como no
  uploader de hoje (`attachment-uploader.tsx:65-68`).
- **Incluir**: os blocos novos entram no fim; a faixa rola até o último
  (`scrollIntoView({ block: "nearest", inline: "nearest" })`, sem animação),
  para o bloco recém-incluído ficar à vista.
- **Contador de vagas**: `ticketAttachmentSlotsLeft({ saved, removed, added })`,
  com `added` = itens do uploader (inclusive os com falha, que ocupam vaga até
  sair). Texto `describeTicketAttachmentSlots`. Faz parte da descrição do
  grupo (`aria-describedby`), **não** é `aria-live` (a lista já anuncia
  inclusões).
- **Limite do uploader no modo edição** = vagas restantes. Selecionar mais
  arquivos do que as vagas: entram os primeiros, na ordem da seleção; os
  demais são recusados com `toast.error(TICKET_ATTACHMENTS_LIMIT_MESSAGE)` (id
  fixo, sem empilhar), mesmo comportamento de hoje com o 6º arquivo na
  criação. Nunca há `PUT` para o recusado.
- **Sem vaga** (`slots = 0`): `Anexar` continua visível e focável, com
  `aria-disabled`, visual de desabilitado e `aria-describedby` apontando para o
  contador; clique (ou `Enter`) **não** abre o seletor e mostra
  `toast.info(TICKET_ATTACHMENTS_LIMIT_MESSAGE)` (id fixo). Mesmo padrão do
  `BlockedActionTrigger` (`app/_components/blocked-action-trigger.tsx`).
  Remover qualquer bloco libera a vaga e o botão volta.
- **Criação não muda**: no "Novo chamado" o uploader continua com título
  `Anexos`, dica `Até 5 arquivos de até 10 MB cada.`, limite 5 e
  `Anexe no máximo 5 arquivos.`; lista em grade como hoje.
- **390 px**: o cabeçalho (dica, contador, aviso) quebra linha; a faixa rola de
  lado; `Anexar` continua abaixo da faixa, à esquerda, visível sem rolar a
  faixa; o X é alvo ≥ 24 px; nada estoura o card.

Se o destinatário não tem `canAttach` mas está editando (hoje impossível na
página: `canAttach` ⇔ `canEditTicketDetail`), o bloco fica só leitura também
na edição.

### Estado no `TicketEditProvider`

- O formulário (`useForm<EditTicketInput>`) ganha os campos `attachments`
  (refs do uploader, por `Controller`, como no resolver de hoje) e
  `removedAttachmentIds` (ids, por `Controller` ou `setValue`). Os `defaults`
  já trazem os dois vazios (`buildTicketEditFormOptions`), então
  `form.reset(options.defaults)` no "Editar" e no "Cancelar" os zera.
- **O uploader só fica montado durante a edição.** "Cancelar" e "Salvar" com
  sucesso desmontam o bloco editável: o estado interno do hook some e os
  `PUT` em curso são abortados (limpeza de `useAttachmentUploads`). Diferente
  do formulário de resolver (que esconde sem desmontar), aqui descartar **é** o
  comportamento pedido. O próximo "Editar" começa vazio.
- **Estado de envio** (`AttachmentUploaderBusy`) mora no provider (exposto
  pelo contexto, como `isSubmitting`), alimentado por `onBusyChange` do
  uploader e devolvido a `"idle"` em `startEditing`, `cancelEditing` e no
  sucesso (o uploader desmontado não avisa).
- **"Salvar alterações" bloqueado** enquanto `busy !== "idle"`, no padrão do
  "Resolver" de hoje (`resolve-ticket-form.tsx:101-111` e `:127-153`):
  `aria-disabled`, visual de desabilitado, `aria-describedby` para um
  `<span class="sr-only">` com `attachmentUploadsBlockMessage(busy)`; o
  clique **não** valida nem chama a action e mostra `toast.info` com a
  mensagem (id fixo). "Cancelar" nunca é bloqueado por envio.
- **Teto no cliente**: se, ao salvar,
  `exceedsTicketAttachmentsLimit({ saved, removed, added })` (só acontece
  depois de um `router.refresh()` que trouxe anexos de outra aba), mesmo
  bloqueio, com `toast.error(TICKET_ATTACHMENTS_LIMIT_MESSAGE)`.
- **Ids removidos sempre atuais**: quando a lista salva muda por revalidação,
  ids que não estão mais nela saem de `removedAttachmentIds` (ajuste de estado
  na renderização ou equivalente). O pedido nunca leva id que o bloco não
  mostra.
- `aria-busy` e "Salvando…" como hoje durante `isSubmitting`; o X e o `Anexar`
  ficam `disabled` durante o envio do formulário.

### Resultado de `editTicket` no provider

| `code` / resultado                                                    | Comportamento                                                                                                                                                            |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ok`                                                                  | como hoje: `toast.success`, sai da edição; a revalidação traz o bloco de leitura já com os incluídos (no fim) e sem os removidos, e a linha do tempo com as linhas novas |
| `NO_CHANGES`                                                          | como hoje (`toast.info`, sai da edição). Só acontece sem campo **e** sem anexo alterado                                                                                  |
| `INVALID_ATTACHMENT`                                                  | `toast.error`; continua editando, valores e lista mantidos, sem `router.refresh()`. A pessoa tira o arquivo indicado e salva de novo                                     |
| `ATTACHMENT_NOT_FOUND`                                                | `toast.error` + `router.refresh()`; continua editando. A lista salva atualiza e os ids que sumiram saem de `removedAttachmentIds`; salvar de novo passa                  |
| `ATTACHMENTS_LIMIT`                                                   | `toast.error` + `router.refresh()`; continua editando. O contador reflete os anexos novos de outra aba; a pessoa remove e salva                                          |
| `FORBIDDEN` (inclusive a de anexo), `NOT_FOUND`                       | como hoje: `toast.error`, sai da edição, `router.refresh()`                                                                                                              |
| `INVALID_TAG`, `INVALID_ASSIGNEE`, `HANDOFF_COMMENT_REQUIRED`, demais | como hoje; lista do uploader e removidos mantidos                                                                                                                        |

### Altura da Conclusão (herdado da Etapa 2) — decisão

O card continua com `lg:flex-1` (as bordas de baixo de Conclusão e
Comentários seguem alinhadas, cenário 34 de `ticket-resolution.md`). No estado
`resolvable`, a barra de ações (`Enviar para outro setor` · `Resolver`) vai
para o **rodapé** do card (`mt-auto` no contêiner da barra): a sobra de altura
fica entre o conteúdo e a barra, como num card com rodapé, e não solta abaixo
da faixa. Nos demais estados (`resolved`, `awaiting_transfer`, `empty`) não há
rodapé; a sobra fica abaixo do bloco, sem conteúdo inventado para preenchê-la.
No modo edição a barra está escondida e o bloco editável cresce para baixo.

## Ordem das ondas (`tsc` verde a cada uma)

| Onda | Agente(s)                   | O que                                                                                                                                                                                                                                                                                                                        |
| ---- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0    | `df-architect` (feito)      | enum + migration, domínio, tipos, validação, este contrato, plano, ADR 018. Tudo novo é aditivo ou opcional: a action de hoje espalha `parsed.data` em `updateTicketByAssignee` e compila (propriedade a mais vinda de spread não é checada); `attachments: []` e `removedAttachmentIds: []` nos `defaults` passam no schema |
| —    | usuário                     | aplica `0015_history_event_attachments.sql` antes de exercitar a Onda 1                                                                                                                                                                                                                                                      |
| 1    | `df-data`                   | `updateTicketByAssignee` (anexos, `reason`, `no_changes`, histórico, `removedStorageKeys`); `updateTicketResolution` sem anexo. A action de hoje trata `not_editable` com `reason` como `not_editable` genérico e ignora `removedStorageKeys` — compila                                                                      |
| 2    | `df-actions` ‖ `df-ui`      | `editTicket`, `discardRemovedAttachments`, `resolveTicket` sem anexo ‖ peça única do bloco, bloco editável, resolver sem uploader, rodapé da Conclusão — em paralelo. O **provider** (`ticket-edit-provider.tsx`) é a última peça do `df-ui`, depois de o `df-actions` publicar os códigos novos (ver abaixo)                |
| 3    | `df-architect` (fechamento) | remove o que ficou sem uso (lista abaixo), confere com `grep`                                                                                                                                                                                                                                                                |
| 4    | `df-reviewer`               |                                                                                                                                                                                                                                                                                                                              |
| 5    | `df-qa`                     |                                                                                                                                                                                                                                                                                                                              |

**Atenção na Onda 2.** Comparar `result.code === "ATTACHMENTS_LIMIT"` antes de
o literal existir em `EditTicketErrorCode` é erro de `tsc` ("no overlap"). É a
dependência 3 do `CLAUDE.md` (`df-ui` → `df-actions` para mutação): o
orquestrador só libera o provider depois de o `df-actions` terminar. O resto
do `df-ui` não depende da action.

### Fechamento do `df-architect` (Onda 3)

Sai, depois de `grep` sem uso em `app/`:

- `attachments` de `resolveTicketSchema` (`app/_lib/validation/ticket-resolution.ts:12`)
  e o import de `uploadedAttachmentsSchema` ali;
- `attachments?` de `UpdateTicketResolutionValues`
  (`app/_lib/types/ticket-resolution.ts:63`);
- `TicketResolutionRefusal` e `TicketNotResolvable.reason`
  (`app/_lib/types/ticket-resolution.ts:71-76`);
- `attachments` de `ResolveTicketFormDefaults` (`:84`) e de
  `buildResolveTicketFormDefaults` (`app/_lib/domain/ticket-resolution.ts:158-160`);
  o import de `UploadedAttachmentRef` e `StoredAttachmentValues` onde ficarem
  sem uso;
- `RESOLUTION_ATTACHMENTS_NOTICE` e `RESOLUTION_NEW_ATTACHMENTS_LABEL`
  (`app/_lib/domain/ticket-resolution.ts:31-34`).

**Ficam** (em uso pela edição): `findTicketAttachmentFacts`,
`TicketAttachmentFacts`, `listTicketAttachments`, `canAttachToTicket`,
`canAttachToTicketDetail`, `ATTACHMENT_ASSIGNEE_ONLY_MESSAGE`,
`uploadedAttachmentsSchema` (criação), `ATTACHMENT_LIMITS_HINT` (criação),
`TICKET_ATTACHMENTS_LABEL`, `NO_ATTACHMENTS_LABEL`, `ATTACH_FILE_LABEL`,
`removeAttachmentLabel`. A prop `title` do `AttachmentUploader` sai na Onda 2
pelo `df-ui` se o modo edição não a usar.

## Riscos

1. **Órfão no R2.** Remoção com commit feito e `DeleteObject` falho deixa
   objeto em `tickets/` sem linha. Fica no log `[editTicket] remove` (mesmo
   risco do ADR 010/018). Sem R2 configurado, remover continua funcionando no
   banco e cada objeto vira esse log.
2. **Formulário antigo de resolver com anexo.** Uma aba aberta antes do deploy
   envia `attachments` no `resolveTicket`; depois do fechamento, o `z.object`
   descarta o campo e a resolução segue sem anexo. Entre a Onda 2 e o
   fechamento, a action já o ignora. Os arquivos ficam em `pending/` e expiram.
3. **Troca de destinatário + anexo no mesmo salvamento.** Passa (regra 9).
4. **Corrida no teto.** Duas abas do mesmo destinatário podem, cada uma, achar
   que cabem; a contagem é refeita na transação, sob a trava do chamado e com
   `for update` nas linhas, e a segunda recebe `ATTACHMENTS_LIMIT` (as cópias
   dela são apagadas).
5. **Corrida na remoção.** Duas abas removendo o mesmo anexo: a segunda
   recebe `ATTACHMENT_NOT_FOUND`, atualiza e salva de novo (vira
   `NO_CHANGES` se não sobrou mudança).
6. **Ordem de aplicação.** O código da Onda 1 falha sem os valores novos do
   enum (só quando há anexo no salvamento); a migration vem antes.
7. **Cópia antes da autorização final.** Mesmo desenho da criação: a checagem
   antes do R2 cobre o caso normal; uma recusa da transação depois da cópia
   (corrida, tag inválida) custa até 10 cópias, apagadas em seguida.

## Cenários para o `df-qa`

Usuários de `docs/contracts/qa-seed.md`: `M` = QA Membro Suporte, `A` = QA
Admin Suporte, `I` = QA Admin Infra (outro setor), `D` = diretor. Títulos
criados começam com `[QA] Anexos na edição`. Criação só em QA Suporte. **Não
alterar #65 a #68.**

**Pré-requisitos:** migration `0015_history_event_attachments.sql` aplicada; a
configuração do ADR 018 (bucket, CORS com `http://localhost:3000`, ciclo de
vida, token com leitura e escrita, `R2_ATTACHMENTS_BUCKET`). Sem R2, rodar só
AE1, AE2, AE7, AE13 (parte só de remoção), AE14, AE17, AE19, AE20, AE21 (sem
anexo) e AE25, e registrar o resto como bloqueado.

Arquivos como em `ticket-attachments-create-and-download.md` e
`attachment-tiles.md`, em buffers, sem gravar nada no repositório:
`print.png`, `relatório ação.pdf`, `dados.csv`, `planilha.xlsx`, `doc.docx`,
`notas.txt`, `apresentacao.pptx`, `logs.zip`, `backup.rar`, `imagem.webp`, PNG
de 120 caracteres sem espaço.

**Chave forjada.** Nos pedidos forjados (`Next-Action` de `editTicket`), a
chave `pending/` é real e de quem forja: `requestAttachmentUpload` + `PUT`
feitos por ele no "Novo chamado", sem enviar o diálogo. "R2 não tocado" se
confere pela ausência de log `[editTicket] rollback` no `next-devtools` e pela
chave continuar em `pending/`. Os campos não-anexo do pedido forjado são os
valores atuais do chamado (para que nada além de anexo mude).

Preparação (M, pelo "Novo chamado", salvo indicação):

- **E1** — `[QA] Anexos na edição E1`, destinatário **M**, com `print.png` e
  `dados.csv`.
- **E2** — `[QA] Anexos na edição E2`, destinatário **A**, com `notas.txt`
  (anexo de M num chamado de A).
- **E3** — `[QA] Anexos na edição E3`, destinatário **M**, com 5 arquivos
  (`planilha.xlsx`, `doc.docx`, `notas.txt`, `apresentacao.pptx`, PNG de 120
  caracteres).
- **E4** — `[QA] Anexos na edição E4`, destinatário **M**, sem anexo.
- **E5** — A cria `[QA] Anexos na edição E5`, destinatário **A**, com
  `print.png`.
- **E6** — `[QA] Anexos na edição E6`, destinatário **M**, com `print.png`
  (para a corrida AE15).

Consultas de apoio (MCP `postgres`, só leitura):

```sql
select id, ticket_id, message_id, uploaded_by, file_name, size_bytes, storage_key, created_at
from attachment where ticket_id = <N> order by created_at, id;

select id, event, changed_by, note, changed_at
from ticket_history where ticket_id = <N> order by changed_at, id;
```

| #    | Quem | Viewport | Ação                                                                                                                                                                                                                | Esperado                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---- | ---- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AE1  | M    | 1440×900 | abrir E1 (M é destinatário, chamado `resolvable`), **sem** clicar em `Editar`                                                                                                                                       | Conclusão: Solução → `Anexos` com 2 blocos-link (sem X) → barra **sem** `Anexar`; nenhum `Novos anexos`, nenhum aviso `Os anexos são salvos só ao resolver…`, nenhum `input[type=file]` na página                                                                                                                                                                                                                                                                                                                                            |
| AE2  | A, D | 1440×900 | abrir E1 (não destinatários)                                                                                                                                                                                        | sem `Editar`; `Anexos` só leitura com 2 blocos, sem X, sem `Anexar`; download funciona                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| AE3  | M    | 1440×900 | em E1, `Editar`                                                                                                                                                                                                     | o bloco vira editável no mesmo lugar: `h3` `Anexos`, dica `Até 10 arquivos neste chamado, de até 10 MB cada.`, `Restam 8 vagas.`, aviso `Inclusões e remoções de anexos só valem ao salvar as alterações.`, sem botão no cabeçalho; 2 blocos com X `Remover print.png` / `Remover dados.csv`; `Anexar` abaixo da faixa, alinhado à esquerda (borda esquerda do botão na da faixa; topo do botão abaixo da base da faixa); `Tab` a partir do último X vai para `Anexar`; os links continuam baixando; só **um** `#ticket-attachments-heading` |
| AE4  | M    | 1440×900 | em E1 editando, `Anexar` → `notas.txt` (`Enviado`) → `Salvar alterações`                                                                                                                                            | durante: `Restam 7 vagas.`, a faixa rolou até o novo. Toast `Chamado #E1 atualizado.`; sai da edição; bloco de leitura com 3 blocos (`notas.txt` por último). Banco: linha nova com `message_id` nulo, `uploaded_by` = M, `created_at` = `changed_at` da linha de histórico; histórico ganhou **só** `anexo_incluido` com `note = notas.txt` (nenhuma `edicao`). Linha do tempo: `Anexo incluído`, `QA Membro Suporte · <data>`, `Incluiu um anexo.`, quadro `notas.txt`                                                                     |
| AE5  | M    | 1440×900 | em E1, `Editar` → `Anexar` `logs.zip` (`Enviado`) → `Cancelar`; depois `Editar` de novo                                                                                                                             | após cancelar: 3 blocos, sem `logs.zip`; nenhum request de `editTicket`; `max(id)` de `attachment` e de `ticket_history` inalterados. No novo `Editar`, nenhum bloco novo, `Restam 7 vagas.`                                                                                                                                                                                                                                                                                                                                                 |
| AE6  | M    | 1440×900 | em E1: guardar o `Location` de `GET /api/attachments/<id de dados.csv>` (`maxRedirects: 0`); `Editar` → X em `dados.csv` → `Salvar alterações`; em até 60 s, `GET` no `Location` guardado                           | ao clicar no X: o bloco some, o foco vai para `Anexar`, `Restam 8 vagas.`. Depois de salvar: 2 blocos; banco sem a linha; histórico com `anexo_removido`, `note = dados.csv`, `changed_by` = M; `GET /api/attachments/<id antigo>` → `404`; o `GET` no `Location` guardado → `404` do R2 (`NoSuchKey`); nenhum log `[editTicket] remove` no `next-devtools`                                                                                                                                                                                  |
| AE7  | M    | 1440×900 | em E1, `Editar` → X em `print.png` → `Cancelar`                                                                                                                                                                     | o bloco volta; nenhum request de `editTicket`; banco inalterado                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| AE8  | M    | 1440×900 | em E1, `Editar`: título + ` (editado)`, X em `print.png`, `Anexar` `imagem.webp` → salvar                                                                                                                           | histórico, mesmo `changed_at`, `id` crescente: `edicao` (`Alterou título.`) → `anexo_removido` (`print.png`) → `anexo_incluido` (`imagem.webp`); linha do tempo na mesma ordem                                                                                                                                                                                                                                                                                                                                                               |
| AE9  | M    | 1440×900 | em E1, `Editar`: `Anexar` `doc.docx`, destinatário → **A**, comentário de passagem `[QA] passagem com anexo` → salvar                                                                                               | salvo; histórico: `edicao` (`Alterou destinatário.`) → `anexo_incluido` (`doc.docx`) → `atribuicao` → `mudanca_status` (se houver); `doc.docx` com `uploaded_by` = M; M perde o `Editar`; A, ao abrir, tem `Editar` e, editando, X em todos os blocos                                                                                                                                                                                                                                                                                        |
| AE10 | A    | 1440×900 | em E2 (destinatário A; `notas.txt` enviado por M), `Editar` → X em `notas.txt` → salvar                                                                                                                             | salvo; bloco vazio tracejado `Nenhum anexo.`; histórico `anexo_removido`, `changed_by` = A, `note = notas.txt`                                                                                                                                                                                                                                                                                                                                                                                                                               |
| AE11 | M    | 1440×900 | em E3 (5 anexos), `Editar` → selecionar 6 arquivos de uma vez → depois de `Enviado`, clicar `Anexar` → salvar; depois `Editar`, X em um bloco, `Cancelar`                                                           | `Restam 5 vagas.` antes; entram os 5 primeiros da seleção, toast `O chamado pode ter no máximo 10 anexos.`, nenhum `PUT` para o 6º; `Nenhuma vaga restante.`; `Anexar` com `aria-disabled`, o clique mostra o mesmo texto como toast e **não** abre o seletor (nenhum evento `filechooser`). Salvo: 10 blocos. Na 2ª edição, depois do X: `Resta 1 vaga.` e `Anexar` sem `aria-disabled`                                                                                                                                                     |
| AE12 | M    | —        | E3 com 10: forjar `editTicket` com 1 chave `pending/` real de M em `attachments` e `removedAttachmentIds: []`; depois o mesmo com `removedAttachmentIds: [<id de um anexo de E3>]`                                  | 1º: `{ ok: false, code: "ATTACHMENTS_LIMIT", message: "O chamado pode ter no máximo 10 anexos." }`, banco inalterado, nenhum log `[editTicket] rollback`. 2º: salvo (10 − 1 + 1 = 10), `anexo_removido` antes de `anexo_incluido`                                                                                                                                                                                                                                                                                                            |
| AE13 | A, D | —        | E4 (destinatário M): A forja `editTicket` com `removedAttachmentIds: [<id qualquer de E1>]`; D forja com `attachments: [<chave real de D>]`                                                                         | os dois: `{ ok: false, code: "FORBIDDEN", message: "Você não pode editar este chamado." }`; banco inalterado; nenhum log `[editTicket] rollback` (D nem copiou)                                                                                                                                                                                                                                                                                                                                                                              |
| AE14 | M    | —        | E1: forjar `editTicket` com `removedAttachmentIds: [<id de anexo de E2>]`; depois com `[999999999]`; depois com `[0]` e com `[5, 5]`                                                                                | 1º e 2º: `{ ok: false, code: "ATTACHMENT_NOT_FOUND", message: "Um dos anexos removidos não está mais neste chamado. Revise os anexos e salve de novo." }`, nada apagado; 3º: `INVALID_INPUT` `Anexo inválido.`                                                                                                                                                                                                                                                                                                                               |
| AE15 | M    | 1440×900 | E6, duas abas: aba 1 `Editar` → X em `print.png`; aba 2 `Editar` → X em `print.png` → salvar; aba 1 `Salvar alterações`; aba 1 salvar de novo                                                                       | aba 1, 1º clique: toast `Um dos anexos removidos…`, continua editando, a página atualiza (bloco vazio); 2º clique: `Nenhuma alteração para salvar.` e sai da edição. Histórico com **um** `anexo_removido`                                                                                                                                                                                                                                                                                                                                   |
| AE16 | M    | 1440×900 | em E1, `Editar`; atrasar o `PUT` 10 s; `Anexar` `print.png`; durante `Enviando…` clicar `Salvar alterações` (`force: true`); depois abortar o `PUT` de outro arquivo e clicar de novo; remover o com falha e salvar | 1º: toast `Aguarde o envio dos anexos terminar.`, nenhum request de `editTicket`; botão com `aria-disabled` e descrição. 2º: `Remova os anexos com falha antes de continuar.`. Depois de remover o com falha e o envio terminar: salva                                                                                                                                                                                                                                                                                                       |
| AE17 | M    | 1440×900 | em E1, `Editar` → `Salvar alterações` sem mudar nada; depois `Editar` → só X em um bloco → salvar                                                                                                                   | 1º: `Nenhuma alteração para salvar.` (regressão). 2º: `Chamado #E1 atualizado.` (só remover é mudança)                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| AE18 | M    | 1440×900 | em E4 (sem anexo, `resolvable`), resolver com solução válida; depois `Editar` → `Anexar` `print.png` → salvar                                                                                                       | ao resolver: nenhum uploader nem `Novos anexos` na Conclusão. Resolvido dentro da janela: `Editar` presente, bloco editável com `Restam 10 vagas.`; salvo; histórico `resolucao` → … → `anexo_incluido`                                                                                                                                                                                                                                                                                                                                      |
| AE19 | M    | 1440×900 | abrir `[QA] Janela vencida` do seed (resolvido fora da janela; M é destinatário); forjar `editTicket` com `removedAttachmentIds: []` e `attachments: [<chave real de M>]`                                           | sem `Editar`; bloco só leitura; forjado: `FORBIDDEN` `Você não pode editar este chamado.`, nenhum log de rollback                                                                                                                                                                                                                                                                                                                                                                                                                            |
| AE20 | A, I | 1440×900 | A, em E5, `Enviar para outro setor` → QA Infra (fica pendente); A (criador) e I abrem E5; A forja `editTicket` com `removedAttachmentIds: [<id do print.png de E5>]`                                                | nos dois: sem `Editar`, sem `Anexar`, sem X; bloco só leitura com 1 bloco. Forjado: `FORBIDDEN` `Você não pode editar este chamado.`; linha intacta. Depois, I recusa com `[QA] devolvido`                                                                                                                                                                                                                                                                                                                                                   |
| AE21 | M    | —        | regressão da resolução: criar `[QA] Anexos na edição E7` (destinatário M) e forjar `resolveTicket` com solução válida e `attachments: [<chave real de M>]`                                                          | resolvido (`Chamado #E7 resolvido.`); **nenhuma** linha em `attachment` para E7; nenhum log `[resolveTicket]`                                                                                                                                                                                                                                                                                                                                                                                                                                |
| AE22 | M    | 1440×900 | em E1, interceptar o `PUT` trocando o corpo por bytes `4D 5A` do mesmo tamanho; `Anexar` um PDF de 1 KB (`Enviado`) → salvar                                                                                        | toast `Não foi possível anexar "<nome>". Remova o arquivo e anexe de novo.`; continua editando com o bloco na lista; banco inalterado                                                                                                                                                                                                                                                                                                                                                                                                        |
| AE23 | M    | 390×844  | E3 com 10, `Editar`                                                                                                                                                                                                 | documento sem rolagem horizontal; a faixa rola de lado; cabeçalho quebra linha sem estourar; X de cada bloco alcançável e com ≥ 24 px; `Anexar` visível abaixo da faixa, à esquerda, sem rolar a faixa                                                                                                                                                                                                                                                                                                                                       |
| AE24 | M    | 1440×900 | árvore de acessibilidade de E1 em edição, com 1 novo `Enviando…`                                                                                                                                                    | `heading` 3 `Anexos`; `list` `Anexos`; cada salvo com `link` `Baixar <nome>` e `button` `Remover <nome>`, nenhum botão dentro de link; o novo com o status em texto acessível (`<nome>: Enviando…`); `button` `Anexar` **depois** da `list` na árvore; `Salvar alterações` com `aria-disabled` e descrição `Aguarde o envio dos anexos terminar.`                                                                                                                                                                                            |
| AE25 | M    | 1440×900 | "Novo chamado"                                                                                                                                                                                                      | uploader com título `Anexos`, dica `Até 5 arquivos de até 10 MB cada.`, 6º arquivo recusado com `Anexe no máximo 5 arquivos.` (regressão)                                                                                                                                                                                                                                                                                                                                                                                                    |
| AE26 | M    | 1440×900 | E1 sem edição, no estado `resolvable`, e um chamado `resolved`                                                                                                                                                      | `resolvable`: a barra `Resolver` encosta no rodapé do card (sobra entre o bloco e a barra); bordas de baixo de Conclusão e Comentários alinhadas (diferença ≤ 1 px)                                                                                                                                                                                                                                                                                                                                                                          |
| AE27 | —    | —        | toda a bateria                                                                                                                                                                                                      | nenhum erro nem aviso de hidratação no console nem no `next-devtools`; nenhum id duplicado (`#ticket-attachments-heading` = 1, editando ou não); nenhum erro de CORS fora das interceptações; nenhum e-mail novo                                                                                                                                                                                                                                                                                                                             |

Notas:

- **AE13 × `attachments_not_allowed`.** O texto
  `Só o destinatário do chamado pode incluir ou remover anexos.` não aparece
  em nenhum cenário: hoje quem não é destinatário para em `canEditTicket`
  antes (ver "Domínio"). O `df-reviewer` confere o mapeamento no código.
- **AE6.** Se o `Location` expirar antes do `GET` (60 s), repetir guardando-o
  imediatamente antes de salvar. O que importa é o objeto não existir mais.
- **AE15.** O `router.refresh()` atualiza a lista salva; o id que sumiu sai de
  `removedAttachmentIds`, por isso o 2º clique vira `NO_CHANGES`.
- **Corrida no teto dentro da transação** (risco 4) não é reproduzível pelo
  navegador; o `df-reviewer` confere a contagem sob trava no código.

### Limites conhecidos (QA de 2026-10-14)

- **Ordem de execução.** O AE9 passa E1 para A, e M deixa de ser destinatário.
  Na rodada de 2026-10-14 o AE2 rodou em E3, o AE14 em E4 e o AE16, o AE17 e o
  AE24 num chamado extra (#237, criado por M), com o mesmo papel e a mesma
  regra. Ao repetir: rodar o AE9 por último ou num chamado próprio.
- **Rolagem até o bloco recém-incluído** (AE4, AE11, AE23) ficou sem evidência
  direta: no AE4 a faixa não tinha overflow, e no AE11 e no AE23 o overflow foi
  visto sem conferir a rolagem automática até o último bloco.
- **Logs do servidor.** O arquivo lido pelo `get_logs` do `next-devtools` não
  mostra `console.error` do servidor. "Sem log `[editTicket] rollback`/`remove`"
  vale só para o que esse arquivo registra.

## Critério de pronto

1. AE1–AE27 aprovados pelo `df-qa`.
2. Migration `0015_history_event_attachments.sql` aplicada.
3. `ticketAttachmentEditRefusalFor` chamada em dois pontos no servidor:
   `editTicket` antes de `storePendingAttachments` (só com novos) e
   `updateTicketByAssignee` sob trava, com a contagem vinda de `select … for
update`. Nenhum outro arquivo reescreve teto ou "é do chamado".
4. Objeto do R2 dos removidos apagado **só** depois do commit
   (`discardRemovedAttachments` com `removedStorageKeys`).
5. Nenhum `attachment` gravado por `updateTicketResolution`; o formulário de
   resolver sem uploader.
6. Fechamento feito: os itens da lista do fechamento removidos sem uso
   restante (`grep` vazio em `app/`).
7. `npx tsc --noEmit`, `npm run lint` e `npm run build` passam; `df-reviewer`
   sem bloqueante.

## Checklist de encerramento

- [x] `history_event` com `anexo_incluido` e `anexo_removido` (`db/schema.ts:79-80`); migration `0015_history_event_attachments.sql` gerada, não aplicada; domínio (`TICKET_ATTACHMENTS_MAX`, `TICKET_ATTACHMENTS_LIMITS_HINT`, `TICKET_ATTACHMENTS_LIMIT_MESSAGE`, `ATTACHMENT_REMOVAL_NOT_FOUND_MESSAGE`, `TICKET_ATTACHMENTS_EDIT_NOTICE`, texto de `ATTACHMENT_ASSIGNEE_ONLY_MESSAGE`, contagem, vagas, `ticketAttachmentEditRefusalFor`, rótulos e textos da linha do tempo, `defaults` com as duas listas); tipos (`TicketAttachmentEditCounts`, `TicketAttachmentEdit`, `TicketEditRefusal`, `TicketNotEditable.reason`, `addedAttachments`, `removedAttachmentIds`, `removedStorageKeys`, `EditTicketFormDefaults`); validação (`ticketAttachmentsToAddSchema`, `attachmentIdSchema`, `removedAttachmentIdsSchema`, `editTicketSchema`); este contrato, plano e ADR 018 (`df-architect`)
- [x] migration aplicada (usuário); conferida pelo MCP `postgres`: `enum_range(null::history_event)` traz `anexo_incluido` e `anexo_removido`
- [x] `updateTicketByAssignee` em `app/_lib/data/tickets.ts:317`: `editabilityFacts` (`:360`), usados no `canEditTicket` (`:368`) e na recusa de anexo; passo de anexos sob trava (`select … for update` `:379-396`, `ticketAttachmentEditRefusalFor` `:398-413`); `no_changes` com `hasTicketAttachmentChanges` (`:460-469`); `removedStorageKeys` do `delete … returning` (`:527-541`, devolvido em `:635`); histórico num `insert` só (`:629`), com o nome de cada `anexo_removido` vindo da linha travada (`:582-592`) e `anexo_incluido` na ordem da lista (`:594-602`). `updateTicketResolution` (`:671`) sem anexo (`df-data`)
- [x] `app/_lib/actions/tickets.ts`: `EditTicketErrorCode` (`:208`) com `INVALID_ATTACHMENT`, `ATTACHMENT_NOT_FOUND`, `ATTACHMENTS_LIMIT`; `ATTACHMENT_EDIT_FAILURES` (`:295`); `attachmentEditFailureFor` (`:323`); cópia (`:397`); rollback (`:416`, `:421`); R2 dos removidos depois do commit (`:430`). `discardRemovedAttachments` em `app/_lib/actions/attachment-intake.ts:149`. `resolveTicket` sem anexo (`app/_lib/actions/ticket-resolution.ts`) (`df-actions`)
- [x] peça única em `app/(app)/_components/`: `attachment-tile-body.tsx`, `attachments-empty.tsx`, `attachment-file-picker.tsx` (novos); `use-attachment-uploads.ts` com `maxFiles` e `tooManyMessage`; `attachment-uploader.tsx` sem `title`/`notice`/`actions`. Bloco editável: `ticket-attachments-frame.tsx`, `ticket-edit-attachments.tsx`, `ticket-attachments-editor.tsx` (novos); `ticket-attachment-tile.tsx` com X opcional; efeito em `ticket-attachments-editor.tsx:87-89` tira de `removedAttachmentIds` os ids que sumiram da lista salva. `resolve-ticket-form.tsx` sem uploader, barra no rodapé com `mt-auto` (`:141`, `:145`); `hidden-while-editing.tsx` com `className`. Provider (`ticket-edit-provider.tsx`): `uploadsBusy` (`:39`), teto no cliente (`:57-64`, `:156-157`), `ATTACHMENT_NOT_FOUND`/`ATTACHMENTS_LIMIT` com `router.refresh()` (`:141-145`), `INVALID_ATTACHMENT` mantém a edição sem refresh (`:133`); `ticket-edit-heading.tsx` com bloqueio do "Salvar alterações"; página passa `savedAttachmentCount` (`page.tsx:200`). Decisões: "Anexar" sem vaga **não** usa `BlockedActionTrigger` (o `Slot` aponta `aria-describedby` para a mensagem dele e soma o `onClick`, o que abriria o seletor); `Controller` no lugar de `useController` por causa de `react-hooks/refs` (`df-ui`)
- [x] fechamento: `resolveTicketSchema.attachments` e o import de `uploadedAttachmentsSchema` (`app/_lib/validation/ticket-resolution.ts`); `UpdateTicketResolutionValues.attachments`, `TicketResolutionRefusal`, `TicketNotResolvable.reason`, `ResolveTicketFormDefaults.attachments` e os imports de `StoredAttachmentValues`/`UploadedAttachmentRef` (`app/_lib/types/ticket-resolution.ts`); `RESOLUTION_ATTACHMENTS_NOTICE`, `RESOLUTION_NEW_ATTACHMENTS_LABEL` e `attachments: []` de `buildResolveTicketFormDefaults` (`app/_lib/domain/ticket-resolution.ts`). `grep` em `app/` vazio para todos; os nomes só aparecem em `docs/` (`df-architect`)
- [x] `df-reviewer`: APROVADO COM ATENÇÕES. ATENÇÃO de DRY do "Anexar" corrigida pelo `df-ui`: `BlockableOutlineButton` aceita `disabled` (`app/_components/blockable-outline-button.tsx:6`) e `attachment-file-picker.tsx:50-60` o usa. ATENÇÃO do efeito em `ticket-attachments-editor.tsx:87-89` aceita como decisão: roda a cada renderização, mas é guardado por `hasStaleRemovedIds`; antes dele, o `exceedsLimit` do provider conta por uma renderização ids que já não existem, sem afetar o pedido enviado
- [x] cenários do `df-qa`: 27 de 27 (`docs/test-reports/2026-10-14-attachments-in-edit.md`); AE20 revisado (ver revisão no topo) e limites em "Limites conhecidos"
- [x] `npx tsc --noEmit`, `npm run lint`, `npm run build` (Onda 0 e fechamento)
