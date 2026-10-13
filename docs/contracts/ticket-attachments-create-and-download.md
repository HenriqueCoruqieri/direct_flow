# Contrato — Anexos de chamado: criação e download (Etapa 1)

Etapa 1 de 2 do plano `docs/plans/ticket-attachments.md` (decisões P1–P5 lá,
não repetidas aqui). Decisão técnica e passo a passo do painel da Cloudflare em
`docs/adr/018-direct-upload-of-ticket-attachments.md`. Este documento é a
referência técnica: assinaturas, sequências, textos e cenários.

Ondas: `df-architect` (feito) → `df-data` ‖ `df-ui` (card no detalhe) →
`df-actions` ‖ `df-ui` (upload no diálogo) → `df-reviewer` → `df-qa`.

Ele **altera** `docs/contracts/ticket-creation.md` (entrada de `createTicket`,
`insertTicket`, códigos de erro) e substitui, no diálogo de novo chamado, a
seção "Anexos" de `docs/contracts/new-ticket-attachments-placeholder.md`. Os
dois trazem uma revisão de 2026-10-13 apontando para cá.

Versões observadas: `next@16.3.5`, `zod@4.6.5`, `drizzle-orm@0.45.2`,
`@aws-sdk/client-s3@^3.1140`, Node 24.

## Escopo técnico em uma frase

O diálogo "Novo chamado" ganha um seletor de arquivos que sobe cada arquivo
direto ao R2 (`pending/`) por URL pré-assinada; `createTicket` confere os
objetos no R2, copia para `tickets/` e grava `attachment` na mesma transação do
chamado; o detalhe ganha o card "Anexos" com links para
`GET /api/attachments/[id]`, que autoriza e redireciona para uma URL assinada
de 60 s.

## O que não muda

| Camada                           | Mudança                                                                                |
| -------------------------------- | -------------------------------------------------------------------------------------- |
| `db/schema.ts`, migration        | nenhuma — `attachment` já tem tudo (`db/schema.ts:341`)                                |
| `app/_lib/date.ts`               | nenhuma — data do anexo com `formatDateTime`/`toISO` já existentes                     |
| e-mail, auth, `proxy.ts`         | nenhuma — o `proxy.ts` já exige cookie em `/api/attachments/*` (matcher sem `.`)       |
| Conclusão (`ResolveTicketForm`)  | nenhuma — continua com `AttachmentsSoonButton` e `TICKET_ATTACHMENTS_SOON_MESSAGE`     |
| `editTicket`, `editTicketSchema` | nenhuma de comportamento — o schema deixou de herdar de `createTicketSchema` (ver Zod) |
| `ticket_history`                 | nenhuma linha nova — anexo não é transição; `uploaded_by`/`created_at` já documentam   |

## Tabelas

**Nenhuma mudança de schema. Nenhuma migration.** O fluxo grava e lê:

- `attachment` — grava `ticket_id`, `message_id` (**sempre nulo**),
  `uploaded_by`, `file_name`, `mime_type`, `size_bytes`, `storage_key`,
  `created_at` (= `created_at` do chamado, na criação). Lê só linhas com
  `message_id is null`.
- `users` — lê `name` de quem enviou.
- `ticket` — lê `created_by`, `assigned_to`, `current_department_id` para
  autorizar o download.

Restrições já existentes que valem aqui: `size_bytes > 0`
(`attachment_size_positive`), `storage_key` único, `cascade` a partir de
`ticket`.

## Formato das chaves no bucket

| Área       | Chave                           | Quem cria                         | Vida                           |
| ---------- | ------------------------------- | --------------------------------- | ------------------------------ |
| espera     | `pending/<userId>/<uuid>.<ext>` | PUT do navegador                  | ciclo de vida do bucket: 1 dia |
| definitiva | `tickets/<uuid novo>.<ext>`     | `CopyObject` na action de criação | permanente                     |

`<uuid>` é `crypto.randomUUID()` (minúsculo, com hífens); `<ext>` é a extensão
do nome, minúscula, da tabela de tipos. Montagem e leitura só pelas funções do
domínio (`pendingAttachmentKey`, `storedAttachmentKey`,
`parsePendingAttachmentKey`, `isPendingAttachmentKeyOf`,
`isStoredAttachmentKey`, `isAttachmentStorageKey`).

## Tipos — `app/_lib/types/attachment.ts` (novo, feito)

```ts
export type AttachmentExtension =
  | "png"
  | "jpg"
  | "jpeg"
  | "webp"
  | "pdf"
  | "txt"
  | "csv"
  | "log"
  | "docx"
  | "xlsx"
  | "pptx"
  | "zip"
  | "rar"

export type AttachmentContentType =
  | "image/png"
  | "image/jpeg"
  | "image/webp"
  | "application/pdf"
  | "text/plain"
  | "text/csv"
  | "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  | "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  | "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  | "application/zip"
  | "application/vnd.rar"

export interface AttachmentByteSignature {
  offset: number
  bytes: readonly number[]
}
export interface AttachmentBinaryCheck {
  kind: "binary"
  signature: readonly AttachmentByteSignature[]
}
export interface AttachmentTextCheck {
  kind: "text"
}
export type AttachmentContentCheck = AttachmentBinaryCheck | AttachmentTextCheck
export interface AttachmentTypeSpec {
  contentType: AttachmentContentType
  check: AttachmentContentCheck
}

export interface AttachmentTypeMatch {
  extension: AttachmentExtension
  contentType: AttachmentContentType
}
export interface AttachmentUploadFile extends AttachmentTypeMatch {
  sizeBytes: number
}
export interface PendingAttachmentKeyParts {
  userId: number
  id: string
  extension: AttachmentExtension
}

export interface AttachmentUploadTarget {
  uploadUrl: string
  key: string
  contentType: AttachmentContentType
}

export type RequestAttachmentUploadErrorCode = "INVALID_INPUT" | "FORBIDDEN"
export interface RequestAttachmentUploadSuccess {
  ok: true
  upload: AttachmentUploadTarget
}
export interface RequestAttachmentUploadFailure {
  ok: false
  message: string
  code?: RequestAttachmentUploadErrorCode
}
export type RequestAttachmentUploadResult =
  RequestAttachmentUploadSuccess | RequestAttachmentUploadFailure

export interface UploadedAttachmentRef {
  key: string
  fileName: string
}
export type AttachmentUploadStatus = "uploading" | "uploaded" | "failed"

export interface AttachmentObjectHead {
  sizeBytes: number
  etag: string
}
export interface StoredAttachmentObject {
  storageKey: string
}

export interface StoredAttachmentValues {
  fileName: string
  mimeType: AttachmentContentType
  sizeBytes: number
  storageKey: string
}

export interface TicketAttachmentItem {
  id: number
  fileName: string
  sizeBytes: number
  uploadedByName: string
  createdAt: Date
}

export interface AttachmentDownloadTarget {
  id: number
  fileName: string
  storageKey: string
  ticket: TicketVisibilityFacts
}
```

### `app/_lib/types/ticket.ts` (alterado, feito)

```ts
export interface InsertTicketValues {
  // …campos de hoje
  attachments?: readonly StoredAttachmentValues[]
}

export interface NewTicketFormDefaults {
  title: string
  description: string
  assigneeId: number | null
  attachments: UploadedAttachmentRef[]
}
```

`attachments` em `InsertTicketValues` é **opcional** para não quebrar o
`createTicket` atual entre a Onda 1 e a Onda 2: ausente = nenhum anexo. Depois
da Onda 2 a action sempre passa a lista (vazia ou não).

`buildNewTicketFormOptions` (`app/_lib/domain/ticket.ts`) passou a devolver
`defaults.attachments: []`, para que `form.reset(options.defaults)` esvazie a
lista.

## Domínio — `app/_lib/domain/attachment.ts` (novo, feito)

### Limites e tabela de tipos

```ts
export const ATTACHMENT_MAX_MEGABYTES = 10
export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024
export const ATTACHMENT_MAX_FILES = 5
export const ATTACHMENT_HEADER_BYTES = 4096
export const ATTACHMENT_FILE_NAME_MAX_LENGTH = 255
export const ATTACHMENT_UPLOAD_URL_TTL_SECONDS = 300
export const ATTACHMENT_DOWNLOAD_URL_TTL_SECONDS = 60
export const ATTACHMENT_PENDING_PREFIX = "pending/"
export const ATTACHMENT_STORED_PREFIX = "tickets/"

export const ATTACHMENT_TYPES // satisfies Record<AttachmentExtension, AttachmentTypeSpec>
export const ATTACHMENT_EXTENSIONS: readonly AttachmentExtension[]
export const ATTACHMENT_INPUT_ACCEPT // ".png,.jpg,.jpeg,.webp,.pdf,.txt,.csv,.log,.docx,.xlsx,.pptx,.zip,.rar"
```

A tabela (conteúdo e assinaturas) está no ADR 018, seção 4. `accept` usa
**extensões**, não MIME, pelo mesmo motivo de não confiar no `File.type`.

### Funções

| Função                                                                                   | Semântica                                                                                                                                                                                                                                         |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `attachmentExtensionOf(fileName): AttachmentExtension \| null`                           | extensão depois do último `.`, minúscula, se estiver na tabela. `null` sem ponto, com ponto no início (`.png`) ou no fim                                                                                                                          |
| `isSafeAttachmentFileName(fileName): boolean`                                            | sem controle C0 (`U+0000`–`U+001F`), DEL e C1 (`U+007F`–`U+009F`), sem marca de direção de texto (`U+061C`, `U+200E`, `U+200F`, `U+202A`–`U+202E`, `U+2066`–`U+2069`, evita `fatura<RLO>fdp.png` aparecer como `fatura gnp.pdf`), sem `/` nem `\` |
| `detectAttachmentType(fileName, headBytes): AttachmentTypeMatch \| null`                 | extensão do nome **e** conteúdo dos primeiros bytes. Binário: todos os trechos da assinatura batem nos offsets. Texto: cabeçalho não vazio e sem byte `00`. `null` = recusado. Roda no cliente e no servidor                                      |
| `attachmentTypeFor(extension): AttachmentTypeMatch`                                      | `Content-Type` da tabela para a extensão (o que a URL de envio assina)                                                                                                                                                                            |
| `pendingAttachmentKey(userId, id, extension)`                                            | `pending/<userId>/<id>.<extension>`                                                                                                                                                                                                               |
| `storedAttachmentKey(id, extension)`                                                     | `tickets/<id>.<extension>`                                                                                                                                                                                                                        |
| `PENDING_ATTACHMENT_KEY_PATTERN`                                                         | `RegExp` da chave de espera (userId positivo, UUID minúsculo, extensão minúscula)                                                                                                                                                                 |
| `parsePendingAttachmentKey(key): PendingAttachmentKeyParts \| null`                      | partes da chave de espera; `null` se o formato ou a extensão não valem                                                                                                                                                                            |
| `isPendingAttachmentKeyOf(key, userId): boolean`                                         | a chave é de espera **e** do `userId`                                                                                                                                                                                                             |
| `isStoredAttachmentKey(key): boolean`                                                    | `tickets/<uuid>.<ext da tabela>`                                                                                                                                                                                                                  |
| `isAttachmentStorageKey(key): boolean`                                                   | espera ou definitiva (guarda do `deleteAttachmentObject`)                                                                                                                                                                                         |
| `canUploadAttachment(account: AccountState): boolean`                                    | `isActive && !mustChangePassword`                                                                                                                                                                                                                 |
| `canDownloadAttachment(actor: TicketActorFacts, ticket: TicketVisibilityFacts): boolean` | `isActive && !mustChangePassword && canViewTicket(actor, ticket)`. Quem vê o chamado baixa todos os anexos                                                                                                                                        |
| `attachmentDownloadPath(attachmentId): string`                                           | `/api/attachments/<id>`                                                                                                                                                                                                                           |
| `attachmentContentDisposition(fileName): string`                                         | `attachment; filename="<ASCII, não-ASCII/aspas/barra → _>"; filename*=UTF-8''<RFC 5987>`. Ex.: `Relatório "final" (v2).pdf` → `attachment; filename="Relat_rio _final_ (v2).pdf"; filename*=UTF-8''Relat%C3%B3rio%20%22final%22%20%28v2%29.pdf`   |
| `formatAttachmentSize(bytes): string`                                                    | `500 B`, `12,1 KB`, `9,4 MB` (base 1024, `pt-BR`, até 1 casa)                                                                                                                                                                                     |
| `describeInvalidAttachment(fileName): string`                                            | `Não foi possível anexar "<nome>". Remova o arquivo e anexe de novo.`                                                                                                                                                                             |
| `describeRejectedAttachment(fileName, reason): string`                                   | `<nome>: <motivo>` — toast de recusa no cliente                                                                                                                                                                                                   |
| `removeAttachmentLabel(fileName)` / `downloadAttachmentLabel(fileName)`                  | `Remover <nome>` / `Baixar <nome>` (nome acessível do X e do link)                                                                                                                                                                                |

### Textos

| Constante                                | Texto                                                                                                  |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `ATTACHMENT_TYPE_NOT_ALLOWED_MESSAGE`    | `Tipo de arquivo não aceito. Envie PNG, JPEG, WebP, PDF, TXT, CSV, LOG, DOCX, XLSX, PPTX, ZIP ou RAR.` |
| `ATTACHMENT_CONTENT_MISMATCH_MESSAGE`    | `O conteúdo do arquivo não corresponde à extensão.`                                                    |
| `ATTACHMENT_TOO_LARGE_MESSAGE`           | `O arquivo precisa ter no máximo 10 MB.`                                                               |
| `ATTACHMENT_EMPTY_MESSAGE`               | `O arquivo está vazio.`                                                                                |
| `ATTACHMENT_INVALID_FILE_NAME_MESSAGE`   | `Nome de arquivo inválido.`                                                                            |
| `ATTACHMENT_TOO_MANY_MESSAGE`            | `Anexe no máximo 5 arquivos.`                                                                          |
| `ATTACHMENT_DUPLICATE_MESSAGE`           | `O mesmo envio aparece duas vezes.`                                                                    |
| `ATTACHMENT_INVALID_REFERENCE_MESSAGE`   | `Anexo inválido. Remova-o e anexe de novo.`                                                            |
| `ATTACHMENT_UPLOAD_FORBIDDEN_MESSAGE`    | `Você não pode enviar arquivos agora.`                                                                 |
| `ATTACHMENT_UPLOAD_UNEXPECTED_MESSAGE`   | `Não foi possível preparar o envio agora. Tente novamente.`                                            |
| `ATTACHMENT_UPLOAD_FAILED_MESSAGE`       | `Falha no envio. Remova o arquivo e tente de novo.`                                                    |
| `ATTACHMENT_UPLOADS_IN_PROGRESS_MESSAGE` | `Aguarde o envio dos anexos terminar.`                                                                 |
| `ATTACHMENT_UPLOADS_FAILED_MESSAGE`      | `Remova os anexos com falha antes de continuar.`                                                       |
| `ATTACHMENT_LIMITS_HINT`                 | `Até 5 arquivos de até 10 MB cada.`                                                                    |
| `ATTACHMENT_DOWNLOAD_FAILED_MESSAGE`     | `Não foi possível baixar o anexo agora. Tente novamente.`                                              |
| `ATTACHMENT_UPLOAD_STATUS_LABELS`        | `uploading: "Enviando…"`, `uploaded: "Enviado"`, `failed: "Falha no envio"`                            |

Continuam em `app/_lib/domain/ticket.ts`, sem mudança: `TICKET_ATTACHMENTS_LABEL`
(`Anexos`), `ATTACH_FILE_LABEL` (`Anexar`), `NO_ATTACHMENTS_LABEL`
(`Nenhum anexo.`) e `TICKET_ATTACHMENTS_SOON_MESSAGE` (ainda usado pela
Conclusão; sai na Etapa 2).

## Validação — `app/_lib/validation/attachment.ts` (novo, feito)

```ts
export const attachmentFileNameSchema   // string, trim, 1..255, isSafeAttachmentFileName, extensão na tabela
export const attachmentSizeSchema       // inteiro 1..ATTACHMENT_MAX_BYTES

export const requestAttachmentUploadSchema = z.object({
  fileName: attachmentFileNameSchema,
  sizeBytes: attachmentSizeSchema,
})
export type RequestAttachmentUploadInput = z.infer<typeof requestAttachmentUploadSchema>

export const uploadedAttachmentSchema = z.object({
  key: /* parsePendingAttachmentKey(key) !== null */,
  fileName: attachmentFileNameSchema,
}) /* .refine: extensão da chave === extensão do nome, path ["fileName"] */
export type UploadedAttachmentInput = z.infer<typeof uploadedAttachmentSchema>

export const uploadedAttachmentsSchema  // array, máx. 5, chaves sem repetição
export type UploadedAttachmentsInput = z.infer<typeof uploadedAttachmentsSchema>

export const attachmentIdParamSchema    // idSearchParamSchema("Anexo inválido.")
export const parseAttachmentIdParam = (value: string): number | null
```

O schema **não** sabe quem é o usuário: "a chave é `pending/<id da sessão>/`"
é conferido na action com `isPendingAttachmentKeyOf`.

### `app/_lib/validation/ticket.ts` (alterado, feito)

```ts
const ticketFieldsSchema = z.object({
  title,
  description,
  type,
  tagId,
  assigneeId,
})

export const createTicketSchema = ticketFieldsSchema.extend({
  attachments: uploadedAttachmentsSchema.optional(),
})
export type CreateTicketInput = z.infer<typeof createTicketSchema>

export const editTicketSchema = ticketFieldsSchema.extend({
  ticketId,
  solution,
  handoffComment,
})
```

- `attachments` é **opcional** (não `default([])`): com `default`, a entrada
  e a saída do schema divergem e o `useForm<CreateTicketInput>` com
  `zodResolver` deixa de compilar. Opcional mantém as duas iguais. A action
  trata ausente como `[]`.
- `editTicketSchema` passou a estender `ticketFieldsSchema` para **não**
  herdar `attachments` (a edição espalha `parsed.data` em
  `updateTicketByAssignee`). Campos e mensagens da edição continuam iguais.

## `df-data` — o que criar e mudar

Instala: `npm install @aws-sdk/s3-request-presigner`.

### `app/_lib/storage/client.ts` (alterado)

- `StorageEnvName` ganha `"R2_ATTACHMENTS_BUCKET"`.
- O `S3Client` ganha `requestChecksumCalculation: "WHEN_REQUIRED"` e
  `responseChecksumValidation: "WHEN_REQUIRED"`. Sem isso, a URL pré-assinada
  de PUT sai com `x-amz-checksum-crc32` de corpo vazio e
  `x-amz-sdk-checksum-algorithm`, e o PUT do navegador falha (ADR 018, riscos).
  Não afeta o avatar (o R2 não exige checksum).

### `app/_lib/storage/attachments.ts` (novo)

Mesmas regras do `avatars.ts`: lê `R2_ATTACHMENTS_BUCKET` por `readStorageEnv`
na chamada (erro claro se faltar), importa só `domain`/`types`, nunca
`data`/`auth`/`email`. Toda função recusa chave fora do formato esperado
(lança erro), como `deleteAvatarByUrl` faz com URL de outra origem.

```ts
export async function createAttachmentUploadUrl(
  userId: number,
  file: AttachmentUploadFile,
): Promise<AttachmentUploadTarget>
```

- `key = pendingAttachmentKey(userId, crypto.randomUUID(), file.extension)`.
- `getSignedUrl(r2Client(), new PutObjectCommand({ Bucket, Key: key, ContentType: file.contentType, ContentLength: file.sizeBytes }), { expiresIn: ATTACHMENT_UPLOAD_URL_TTL_SECONDS, signableHeaders: new Set(["content-type", "content-length"]) })`.
  O `S3RequestPresigner` põe `content-type` entre os cabeçalhos não assinados
  por padrão; `signableHeaders` o devolve à assinatura.
- Devolve `{ uploadUrl, key, contentType: file.contentType }`.

```ts
export async function headPendingAttachment(
  key: string,
): Promise<AttachmentObjectHead | null>
```

- Exige `parsePendingAttachmentKey(key) !== null`.
- `HeadObjectCommand`. 404 (`NotFound`) → `null`. Devolve
  `{ sizeBytes: ContentLength, etag: ETag }` (ETag como veio, com aspas).
  `ContentLength` ou `ETag` ausentes → `null`.

```ts
export async function readPendingAttachmentHeader(
  key: string,
  etag: string,
): Promise<Uint8Array | null>
```

- Exige chave de espera. `GetObjectCommand({ Range: "bytes=0-4095", IfMatch: etag })`
  (`ATTACHMENT_HEADER_BYTES - 1`). Corpo por `Body.transformToByteArray()`.
  404 ou 412 → `null`.

```ts
export async function copyPendingAttachment(
  key: string,
  etag: string,
  type: AttachmentTypeMatch,
): Promise<StoredAttachmentObject | null>
```

- Exige chave de espera **e** `type.extension` igual à extensão da chave.
- `storageKey = storedAttachmentKey(crypto.randomUUID(), type.extension)`.
- `CopyObjectCommand({ Bucket, Key: storageKey, CopySource: \`${bucket}/${key}\`, CopySourceIfMatch: etag, MetadataDirective: "REPLACE", ContentType: type.contentType })`.
A chave só tem `[a-z0-9/.-]`, sem codificação extra.
- 404 ou 412 (objeto sumiu ou foi trocado depois da verificação) → `null`.
  Outros erros → lança.

```ts
export async function deleteAttachmentObject(key: string): Promise<void>
```

- Ignora (retorna sem erro) chave que não passa em `isAttachmentStorageKey`.
  `DeleteObjectCommand`.

```ts
export async function createAttachmentDownloadUrl(
  storageKey: string,
  fileName: string,
): Promise<string>
```

- Exige `isStoredAttachmentKey(storageKey)`.
- `getSignedUrl(r2Client(), new GetObjectCommand({ Bucket, Key: storageKey, ResponseContentDisposition: attachmentContentDisposition(fileName) }), { expiresIn: ATTACHMENT_DOWNLOAD_URL_TTL_SECONDS })`.

Erros 404/412 reconhecidos por `error instanceof S3ServiceException` e
`error.$metadata.httpStatusCode`.

### `app/_lib/data/tickets.ts` — `insertTicket` (alterado)

Dentro da transação atual, **depois** do `insert` em `ticket_history`
(`app/_lib/data/tickets.ts:281`), se `values.attachments` tiver itens:

```ts
tx.insert(attachment).values(
  values.attachments.map((item) => ({
    ticketId: created.id,
    messageId: null,
    uploadedBy: values.createdBy,
    fileName: item.fileName,
    mimeType: item.mimeType,
    sizeBytes: item.sizeBytes,
    storageKey: item.storageKey,
    createdAt: created.createdAt,
  })),
)
```

Lista vazia ou ausente → nenhum `insert` (o Drizzle recusa `values([])`).
Outcomes sem mudança (`saved`, `invalid_tag`, `invalid_assignee`). Erro de
banco (inclusive `storage_key` duplicado) lança, como hoje.

### `app/_lib/data/attachments.ts` (novo)

```ts
export async function listTicketAttachments(
  ticketId: number,
): Promise<TicketAttachmentItem[]>
```

- `attachment inner join users on users.id = attachment.uploaded_by`, `where
attachment.ticket_id = $1 and attachment.message_id is null`, ordem
  `created_at asc, id asc`. `uploadedByName = users.name`.
- Não autoriza: quem chama (a página) já aplicou `canViewTicket`.

```ts
export async function findAttachmentForDownload(
  attachmentId: number,
): Promise<AttachmentDownloadTarget | null>
```

- `attachment inner join ticket`, `where attachment.id = $1 and
attachment.message_id is null`, `limit 1`. Devolve `{ id, fileName,
storageKey, ticket: { createdBy, assignedTo, currentDepartmentId } }`.
  Não achou → `null`.

## `df-actions` — o que criar e mudar

### `app/_lib/actions/attachments.ts` (novo, `"use server"`)

```ts
export const requestAttachmentUpload = async (
  input: RequestAttachmentUploadInput,
): Promise<RequestAttachmentUploadResult>
```

1. `getSession()`; sem sessão → `{ ok: false, code: "FORBIDDEN", message: ATTACHMENT_UPLOAD_FORBIDDEN_MESSAGE }`.
2. `getAccountFacts()`; `null` ou `!canUploadAttachment(facts)` → mesmo
   `FORBIDDEN`.
3. `requestAttachmentUploadSchema.safeParse(input)`; falha →
   `{ ok: false, code: "INVALID_INPUT", message: <primeira issue> }`.
4. `extension = attachmentExtensionOf(parsed.data.fileName)` (não nulo depois
   do schema; se nulo, `INVALID_INPUT` com
   `ATTACHMENT_TYPE_NOT_ALLOWED_MESSAGE`).
5. `createAttachmentUploadUrl(actor.id, { ...attachmentTypeFor(extension), sizeBytes })`.
   Erro (inclusive variável ausente) → log `[requestAttachmentUpload]` e
   `{ ok: false, message: ATTACHMENT_UPLOAD_UNEXPECTED_MESSAGE }`.
   **Entregue a mais:** se `getAccountFacts()` (passo 2) **lançar**, mesmo
   tratamento — log `[requestAttachmentUpload]` e falha inesperada, sem
   `code`.
6. `{ ok: true, upload }`. **Sem `revalidatePath`**: nada no banco mudou.

Classificação (ADR 018): **preparação de escrita**, não leitura — não usa a
exceção do ADR 015. Uma chamada por arquivo; o cliente as despacha em fila
(dezenas de ms cada) e faz os PUTs em paralelo.

### `app/_lib/actions/tickets.ts` — `createTicket` (alterado)

`TicketErrorCode` ganha `"INVALID_ATTACHMENT"`. Entrada continua
`CreateTicketInput` (agora com `attachments?`). Sequência:

1. Sessão, `getAccountFacts`, `checkTicketCreation` e `safeParse` — **como
   hoje**.
2. `refs = parsed.data.attachments ?? []`. Lista vazia → pula 3–5 e chama
   `insertTicket` com `attachments: []`. **Chamado sem anexo nunca toca o R2**
   (funciona sem `R2_ATTACHMENTS_BUCKET`).
3. **Verificar todos** (em paralelo, `Promise.all`), para cada `{ key, fileName }`:
   1. `isPendingAttachmentKeyOf(key, actor.id)`; não → falha do item;
   2. `head = await headPendingAttachment(key)`; `null`, `sizeBytes < 1` ou
      `> ATTACHMENT_MAX_BYTES` → falha do item;
   3. `bytes = await readPendingAttachmentHeader(key, head.etag)`; `null` →
      falha do item;
   4. `match = detectAttachmentType(fileName, bytes)`; `null` ou
      `match.extension !== parsePendingAttachmentKey(key).extension` → falha.

   Qualquer falha → `{ ok: false, code: "INVALID_ATTACHMENT", message:
describeInvalidAttachment(<fileName do primeiro item que falhou, na ordem da
lista>) }`, **sem copiar nada**. Erro inesperado do storage → log e
   `UNEXPECTED_FAILURE`.

   **Prioridade entre recusa e erro inesperado (comportamento aceito).** A
   regra "primeiro item na ordem da lista" entre `INVALID_ATTACHMENT` e
   `UNEXPECTED_FAILURE` vale **só na fase de cópia** (passo 4: os resultados
   são percorridos em ordem e o primeiro que não copiou decide, `failure ??=
copy` em `app/_lib/actions/tickets.ts:269`). Na **verificação** o
   `Promise.all` rejeita com a primeira exceção de **qualquer** item: item 0
   recusado + item 1 com erro inesperado do storage → `UNEXPECTED_FAILURE`,
   não `INVALID_ATTACHMENT` do item 0. As duas respostas mantêm o diálogo
   aberto e nada é gravado; a pessoa tenta de novo e, persistindo o erro do
   storage, continua vendo a mensagem genérica. Aceito.

4. **Copiar todos**: `copyPendingAttachment(key, head.etag, match)`. Um
   `null` → apaga as cópias já feitas (melhor esforço) e devolve
   `INVALID_ATTACHMENT` com o nome daquele item. Erro lançado → apaga as cópias
   já feitas, log, `UNEXPECTED_FAILURE`.
5. `insertTicket({ …como hoje, attachments: [{ fileName, mimeType: match.contentType, sizeBytes: head.sizeBytes, storageKey }] })`.
   - lançou → apaga as cópias (melhor esforço, log `[createTicket] rollback`)
     e `UNEXPECTED_FAILURE`;
   - outcome ≠ `saved` (`invalid_tag`, `invalid_assignee`) → apaga as cópias
     e devolve a falha de hoje.
   - Em nenhuma falha a action apaga `pending/`: o usuário corrige e reenvia
     com os mesmos anexos.
6. Sucesso → apaga as chaves de `pending/` (melhor esforço, log), revalida
   como hoje e devolve como hoje.

`fileName` gravado é o do `parsed.data` (já com `trim`). Nada de
`File.type`: o `mime_type` vem de `match.contentType`.

**Commit sem confirmação (risco aceito, ADR 018).** Se `insertTicket` lançar
depois de o `COMMIT` ter chegado ao banco, o `catch` (`tickets.ts:322-325`)
apaga as cópias e devolve `UNEXPECTED_FAILURE`; o chamado e as linhas de
`attachment` ficam apontando para objetos inexistentes. O download gera a URL
assinada sem conferir a existência e o R2 responde `404` ao navegador.

**Nota para a Etapa 2.** A verificação e a cópia (`storePendingAttachments` e
auxiliares — `verifyPendingAttachment`, `copyVerifiedAttachment`,
`deleteAttachmentObjectsQuietly` e os tipos internos,
`app/_lib/actions/tickets.ts:120-281`) são privadas de `tickets.ts`. Na Etapa
2 a Conclusão precisa da mesma sequência; ela será movida para um módulo
compartilhado **sem** `"use server"` em `app/_lib/actions/` (dono
`df-actions`), para não virar endpoint público. A decisão — nome do arquivo e
assinatura exportada — fica registrada no contrato da Etapa 2.

### `app/api/attachments/[id]/route.ts` (novo)

`export const GET = async (request: NextRequest, ctx: RouteContext<"/api/attachments/[id]">): Promise<Response>`
(`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md:107`).

1. `id = parseAttachmentIdParam((await ctx.params).id)`; `null` → `404`.
2. `getSession()`; sem sessão → redireciona para `/login`
   (`NextResponse.redirect(new URL("/login", request.url))`), mesmo destino
   do `proxy.ts`. O contrato aceita o `Location` absoluto ou relativo; o que
   importa é o destino ser `/login` e nunca o R2.

   **Quem responde em cada caso.** O matcher do `proxy.ts:20` cobre
   `/api/attachments/*`, e o proxy (`proxy.ts:12-14`) só confere a
   **presença** do cookie de sessão (`getSessionCookie`), não a validade.
   - **Sem cookie** (AT16): o proxy redireciona antes de a rota rodar; este
     passo 2 nunca é alcançado. O `Location` relativo (`/login`) observado no
     QA da Etapa 1 é o do proxy.
   - **Cookie presente mas inválido, expirado ou de sessão revogada** (AT23):
     passa pelo proxy e chega aqui com `getSession()` nulo; é este passo que
     redireciona.

3. `getAccountFacts()`; `null` → `404`.
4. `target = findAttachmentForDownload(id)`; `null` → `404`.

   **Entregue a mais:** os passos 3 e 4 rodam juntos (`Promise.all`); se
   qualquer um **lançar** (erro de banco), log `[attachments:download]` e
   `503` com `ATTACHMENT_DOWNLOAD_FAILED_MESSAGE`, como no passo 6.

5. Monta `TicketActorFacts` (`userId: session.id` + fatos, como
   `app/(app)/tickets/[id]/page.tsx:77`);
   `!canDownloadAttachment(actor, target.ticket)` → `404`.
6. `url = createAttachmentDownloadUrl(target.storageKey, target.fileName)`;
   erro → log `[attachments:download]` e `503` com
   `ATTACHMENT_DOWNLOAD_FAILED_MESSAGE` em texto puro.
7. `NextResponse.redirect(url, 307)` com
   `Cache-Control: private, no-store`.

Todo `404` é igual (corpo vazio ou texto curto, sem dizer se o anexo existe).
Não revalida, não grava, não escreve SQL.

## `df-ui` — o que criar e mudar

### Estrutura

```
app/(app)/_components/attachment-uploader.tsx                novo — AttachmentUploader ("use client"): seção inteira (título, dica, botão, lista, erro do campo)
app/(app)/_components/attachment-upload-item.tsx             novo — AttachmentUploadItem: um <li> da lista (ícone, nome, tamanho, status, erro, X)
app/(app)/_hooks/use-attachment-uploads.ts                   novo — useAttachmentUploads: seleção, validação, pedido de URL, PUT, remoção, aborto
app/(app)/_components/new-ticket-attachments.tsx             APAGADO — a seção passou inteira para o AttachmentUploader
app/(app)/_components/new-ticket-dialog.tsx                  alterado — campo attachments, bloqueio do envio
app/(app)/tickets/[id]/_components/ticket-attachments.tsx    novo — TicketAttachments (Server Component), card do detalhe
app/(app)/tickets/[id]/page.tsx                              alterado — listTicketAttachments e o card
app/(app)/_components/attachments-soon-button.tsx            sem mudança — continua na Conclusão até a Etapa 2
```

`AttachmentUploader` e o item vão para o `_components` do **grupo**, e o hook
para `app/(app)/_hooks/`: serão usados pelo diálogo (topo de todas as telas do
grupo) e, na Etapa 2, pela Conclusão em `/tickets/[id]`. Conhecem "anexo",
então não vão para `app/_components/`.

### `AttachmentUploader` (entregue)

```ts
interface AttachmentUploaderProps {
  onChange: (value: UploadedAttachmentRef[]) => void
  onBusyChange: (busy: AttachmentUploaderBusy) => void
  disabled?: boolean
  ref?: React.Ref<HTMLButtonElement>
  fieldState: ControllerFieldState
}
```

- **Sem `value`.** O componente é a fonte da lista: a cada mudança chama
  `onChange` com **só** os itens `uploaded` (`{ key, fileName }`). A lista
  visível (com `uploading`/`failed`) é estado do hook. Zerar o formulário
  zera a lista porque o `DialogContent` desmonta ao fechar.
- `ref` vai para o botão `Anexar` (foco quando o RHF aponta erro no campo).
- `fieldState`: erro do campo `attachments` vindo do `zodResolver` aparece em
  `FieldError` abaixo da lista (fallback `ATTACHMENT_INVALID_REFERENCE_MESSAGE`),
  com `aria-invalid` no botão e `aria-describedby` do grupo apontando para ele.
- Ao remover um item, o foco volta ao botão `Anexar`.

Exportados de `app/(app)/_hooks/use-attachment-uploads.ts`:

```ts
export type AttachmentUploaderBusy = "idle" | "uploading" | "failed"
export const attachmentUploadsBlockMessage: (
  busy: AttachmentUploaderBusy,
) => string | null
export interface AttachmentUploadEntry {
  id: number
  file: File
  status: AttachmentUploadStatus
  uploaded: UploadedAttachmentRef | null
  error: string | null
}
export interface AttachmentUploadsControls {
  items: AttachmentUploadEntry[]
  addFiles: (files: readonly File[]) => Promise<void>
  remove: (id: number) => void
}
export const useAttachmentUploads: (options: {
  onChange
  onBusyChange
}) => AttachmentUploadsControls
```

`attachmentUploadsBlockMessage` mapeia `uploading` →
`ATTACHMENT_UPLOADS_IN_PROGRESS_MESSAGE`, `failed` →
`ATTACHMENT_UPLOADS_FAILED_MESSAGE`, `idle` → `null`.

`AttachmentUploadItem` recebe `fileName`, `sizeBytes`, `status`, `error`,
`disabled?` e `onRemove`.

**Seleção.** Botão `Anexar` (`ATTACH_FILE_LABEL`, ícone de clipe, mesmo visual
de hoje, `type="button"`) abre um `<input type="file" multiple
accept={ATTACHMENT_INPUT_ACCEPT}>` oculto. Depois de cada seleção, limpar o
`value` do input (para escolher o mesmo arquivo de novo). Dica
`ATTACHMENT_LIMITS_HINT` visível perto do título.

**Para cada arquivo escolhido, em ordem:**

1. Limite: itens na lista (qualquer status) + novos > `ATTACHMENT_MAX_FILES`
   → aceita até completar 5 e recusa o resto com um toast
   `ATTACHMENT_TOO_MANY_MESSAGE`.
2. `requestAttachmentUploadSchema.safeParse({ fileName: file.name, sizeBytes: file.size })`;
   falha → não entra na lista; toast
   `describeRejectedAttachment(file.name, <primeira issue>)`.
3. `bytes = new Uint8Array(await file.slice(0, ATTACHMENT_HEADER_BYTES).arrayBuffer())`;
   `detectAttachmentType(file.name, bytes) === null` → não entra; toast
   `describeRejectedAttachment(file.name, ATTACHMENT_CONTENT_MISMATCH_MESSAGE)`.
4. Entra na lista como `uploading`. `requestAttachmentUpload(...)`; falha →
   `failed` (guardar a mensagem da action para exibir).
5. `fetch(upload.uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": upload.contentType }, signal })`.
   **O `Content-Type` é o devolvido pela action**, nunca `file.type` — é ele
   que está assinado. `response.ok` → `uploaded` e `onChange` com a lista
   de enviados incluindo `{ key: upload.key, fileName: file.name }`; senão
   (ou erro de rede) → `failed` com `ATTACHMENT_UPLOAD_FAILED_MESSAGE`.

`fetch` sem barra de progresso (decisão: progresso fica fora). Um
`AbortController` por arquivo.

**Lista.** `<ul>` quando houver itens; `<p>` `NO_ATTACHMENTS_LABEL` na área
tracejada quando vazia (padrão do contrato do placeholder). Cada `<li>`: nome
(quebra/trunca sem rolagem horizontal), `formatAttachmentSize(file.size)`,
status (`ATTACHMENT_UPLOAD_STATUS_LABELS`, com ícone de carregamento em
`uploading` e cor de erro em `failed`, mais a mensagem do erro) e botão X
`aria-label={removeAttachmentLabel(name)}`. Status anunciado por região
`aria-live="polite"`.

**Remover (X).** Aborta o PUT se estiver em curso, tira o item da lista e
chama `onChange` sem ele. Nada é apagado no bucket (o objeto de `pending/`
expira).

**Ocupado.** `onBusyChange("uploading")` se algum item está `uploading`;
`"failed"` se nenhum está enviando e algum está `failed`; `"idle"` caso
contrário.

**Desmontagem.** Ao desmontar (o `DialogContent` do Radix desmonta ao fechar),
abortar todos os PUTs em curso.

### `NewTicketDialog`

- `useForm<CreateTicketInput>` sem mudança de tipo; `defaultValues:
options.defaults` já traz `attachments: []`.
- `Controller name="attachments"` renderiza o `AttachmentUploader` direto
  (abaixo de Descrição, acima de Tipo), com `ref={field.ref}`,
  `onChange={field.onChange}`, `onBusyChange={setUploadsBusy}`,
  `disabled={isSubmitting}` e `fieldState`.
- **Envio bloqueado** enquanto `busy !== "idle"` (entregue sem
  `BlockedActionTrigger`): o botão "Abrir chamado" fica com `aria-disabled`,
  visual de desabilitado e `aria-describedby` para um `<span class="sr-only">`
  com a razão; o `onSubmit` do formulário intercepta antes do
  `handleSubmit`, não chama a action e mostra `toast.info` com
  `attachmentUploadsBlockMessage(busy)` (id fixo, sem empilhar).
- `INVALID_ATTACHMENT` **não** tem ramo próprio: cai no ramo genérico
  (`toast.error(result.message)`); só `FORBIDDEN` fecha o diálogo. Diálogo
  continua aberto, valores e lista mantidos.
- Fechar/cancelar: `form.reset(options.defaults)` e `busy` volta a `idle`; a
  lista local some com a desmontagem (e os PUTs são abortados).

### `TicketAttachments` (card do detalhe, Server Component)

- Posição: coluna da direita do grid, **entre** `TicketDetailFields` e
  `TicketComments` (`app/(app)/tickets/[id]/page.tsx:176-182`).
- Moldura igual à de `TicketDetailFields`: `<section aria-labelledby>` com
  `rounded-xl border border-border-subtle bg-surface p-5` e `<h2>`
  `TICKET_ATTACHMENTS_LABEL`.
- Lista `<ul>`; cada item: `<a href={attachmentDownloadPath(id)}
aria-label={downloadAttachmentLabel(fileName)}>` com o nome (link comum,
  **não** `next/link`: é rota de API que redireciona), e abaixo, em
  `text-muted-foreground`, `formatAttachmentSize(sizeBytes)` · `uploadedByName`
  · `<time dateTime={toISO(createdAt)}>{formatDateTime(createdAt)}</time>`.
  Nome longo quebra (`break-words`/`min-w-0`), sem rolagem horizontal em 390px.
- Vazio: `<p>` `NO_ATTACHMENTS_LABEL` (sem `<ul>`).
- `page.tsx`: `listTicketAttachments(ticket.id)` entra no `Promise.all` da
  linha 103, **depois** do `canViewTicket` (linha 85).

## Riscos

1. **Configuração externa** (bucket, CORS, ciclo de vida, escopo do token,
   variável). Sem ela, `requestAttachmentUpload` devolve a mensagem de erro
   inesperado e o download responde `503`; chamado sem anexo continua
   funcionando. Previews da Vercel ficam fora do CORS.
2. **`Content-Length` assinado.** Se o R2 aceitar PUT com tamanho diferente do
   assinado, o `HEAD` em `createTicket` recusa acima de 10 MB (cenário AT9
   registra qual dos dois aconteceu).
3. **Órfão de cópia** quando a limpeza falha depois de erro de banco (log);
   e o inverso, **linha sem objeto**, quando o `COMMIT` chega ao banco mas a
   confirmação se perde (ADR 018).
4. **DOCX × ZIP só pela extensão**; **ZIP/RAR não inspecionados** (ADR 018).
5. **Envio em curso ao submeter.** UI bloqueia; a action recusa chave alheia,
   inexistente ou trocada (`If-Match`).
6. **Fila de Server Actions.** O cliente despacha uma action por vez; cinco
   pedidos de URL em sequência custam dezenas de ms cada. Os PUTs, que são o
   que demora, correm em paralelo.
7. **Chamado sem anexo e R2 fora do ar.** Não é afetado: a action só toca o
   storage quando a lista não está vazia.

## Cenários para o `df-qa`

Usuários de `docs/contracts/qa-seed.md`: `M` = QA Membro Suporte, `A` = QA
Admin Suporte, `I` = QA Admin Infra (outro setor), `D` = diretor. Títulos
criados começam com `[QA] Anexos`. Criação só em QA Suporte. **Não alterar #65
a #68.**

**Pré-requisito:** o usuário confirmou a configuração do ADR 018 (bucket,
CORS com `http://localhost:3000`, ciclo de vida, `R2_ATTACHMENTS_BUCKET` no
`.env`). Sem isso, rodar só AT14–AT16 e AT23 (sem R2) e registrar o resto como
bloqueado.

**Como gerar os arquivos de teste — sem gravar nada no repositório.**
Preferência: buffers em memória com `browser_run_code_unsafe`, usando
`page.setInputFiles('input[type=file]', [{ name, mimeType, buffer }])` com
`Buffer` montado no próprio código (o `mimeType` passado é irrelevante — o app
não o usa). Alternativa: arquivos numa pasta temporária fora do repositório
(scratchpad da sessão) e `browser_file_upload` com os caminhos.

| Arquivo                      | Conteúdo                                                                                                               |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `print.png` (~70 B)          | PNG 1×1 válido (base64 `iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=`) |
| `relatório ação.pdf` (~9 MB) | `%PDF-1.4\n` + 9 × 1024 × 1024 bytes `0x20` + `\n%%EOF`                                                                |
| `logs.zip` (~9 MB)           | `50 4B 03 04` + 9 × 1024 × 1024 bytes aleatórios                                                                       |
| `planilha.xlsx`, `doc.docx`  | `50 4B 03 04` + 1 KB aleatório                                                                                         |
| `backup.rar`                 | `52 61 72 21 1A 07 01 00` + 1 KB aleatório                                                                             |
| `dados.csv`                  | `a;b\n1;2\n` (UTF-8)                                                                                                   |
| `setup.pdf`                  | `4D 5A 90 00` + 4 KB de `00` (executável renomeado)                                                                    |
| `grande.pdf` (11 MB)         | `%PDF-` + 11 × 1024 × 1024 bytes `0x20`                                                                                |
| `nulo.txt`                   | `abc` + `00` + `def`                                                                                                   |
| `pagina.html`, `icone.svg`   | texto qualquer                                                                                                         |

**Como conferir o bucket sem credencial.** O QA não tem MCP do R2: a
existência do objeto definitivo é provada pelo download (`200` com o mesmo
tamanho) e a gravação pelo banco (`attachment.storage_key like 'tickets/%'`).
`pending/` não é conferido (expira sozinho).

Consulta de apoio (MCP `postgres`, só leitura):

```sql
select a.id, a.ticket_id, a.message_id, u.name as uploaded_by, a.file_name,
       a.mime_type, a.size_bytes, a.storage_key, a.created_at
from attachment a join users u on u.id = a.uploaded_by
where a.ticket_id = <N> order by a.id;
```

| #    | Quem | Viewport | Ação                                                                                                                                                                                                                                     | Esperado                                                                                                                                                                                                                                                                                                                                                                                        |
| ---- | ---- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AT1  | M    | 1440×900 | abrir "Novo chamado"                                                                                                                                                                                                                     | seção `Anexos` abaixo de Descrição, botão `Anexar` **ativo** (sem `aria-disabled`), dica `Até 5 arquivos de até 10 MB cada.`, área com `Nenhum anexo.`; existe `input[type=file][multiple]` com `accept` = `.png,.jpg,.jpeg,.webp,.pdf,.txt,.csv,.log,.docx,.xlsx,.pptx,.zip,.rar`                                                                                                              |
| AT2  | M    | 1440×900 | anexar `print.png`, `relatório ação.pdf` e `logs.zip`; aguardar; preencher Título `[QA] Anexos criação`, Descrição, Tipo, tag e Destinatário fila; `Abrir chamado`                                                                       | cada item passa por `Enviando…` → `Enviado`, com tamanho (`9 MB`, etc.); requisições `PUT` ao host `*.r2.cloudflarestorage.com` com `200`; toast `Chamado #N criado.`; no banco, 3 linhas em `attachment` para N: `message_id` nulo, `uploaded_by` = M, `mime_type` `image/png`/`application/pdf`/`application/zip`, `size_bytes` iguais aos dos arquivos, `storage_key` `tickets/<uuid>.<ext>` |
| AT3  | M    | 1440×900 | abrir `/tickets/N`                                                                                                                                                                                                                       | card `Anexos` na coluna da direita, entre `Detalhes` e `Comentários`; 3 itens na ordem de envio, cada um com nome (link), tamanho, `QA Membro Suporte` e data/hora `dd/mm/aaaa hh:mm`                                                                                                                                                                                                           |
| AT4  | M    | 1440×900 | clicar em cada link (esperar o evento de download)                                                                                                                                                                                       | os 3 baixam; `suggestedFilename` igual ao nome original, inclusive `relatório ação.pdf` com acento e espaço; tamanho do baixado igual ao enviado                                                                                                                                                                                                                                                |
| AT5  | M    | —        | `page.request.get('/api/attachments/<id do PDF>', { maxRedirects: 0 })`                                                                                                                                                                  | `307`; `Location` no host do R2 com `X-Amz-Expires=60`; `Cache-Control` contém `no-store`. `GET` imediato no `Location` → `200` com `Content-Disposition` contendo `attachment;` e `filename*=UTF-8''relat%C3%B3rio%20a%C3%A7%C3%A3o.pdf`                                                                                                                                                       |
| AT6  | M    | —        | repetir o `GET` no mesmo `Location` de AT5 depois de 65 s                                                                                                                                                                                | `403` do R2 (URL expirada); um novo `GET` em `/api/attachments/<id>` volta a funcionar                                                                                                                                                                                                                                                                                                          |
| AT7  | M    | 1440×900 | no diálogo, tentar `setup.pdf`; depois `nulo.txt`; depois `pagina.html` e `icone.svg`                                                                                                                                                    | nenhum entra na lista; toasts `setup.pdf: O conteúdo do arquivo não corresponde à extensão.`, `nulo.txt: O conteúdo…`, `pagina.html: Tipo de arquivo não aceito. …`, `icone.svg: Tipo de arquivo não aceito. …`; **nenhum** `PUT` ao R2 e nenhuma chamada a `requestAttachmentUpload` para eles                                                                                                 |
| AT8  | M    | 1440×900 | tentar `grande.pdf` (11 MB)                                                                                                                                                                                                              | não entra; toast `grande.pdf: O arquivo precisa ter no máximo 10 MB.`; nenhum `PUT`                                                                                                                                                                                                                                                                                                             |
| AT9  | M    | 1440×900 | interceptar o PUT (`page.route('**/*.r2.cloudflarestorage.com/**', …)`) trocando o corpo por 11 MB que começam com `%PDF-`; anexar um PDF válido de 1 KB; se ficar `Enviado`, preencher e `Abrir chamado` (`[QA] Anexos PUT adulterado`) | **ou** o PUT falha (item `Falha no envio`) — o R2 respeita o `Content-Length` assinado —, **ou** a criação devolve o toast `Não foi possível anexar "…". Remova o arquivo e anexe de novo.` e **nenhum** chamado com esse título existe. Registrar qual dos dois ocorreu                                                                                                                        |
| AT10 | M    | 1440×900 | interceptar o PUT trocando o corpo por bytes do **mesmo tamanho** começando com `4D 5A`; anexar um PDF válido; `Abrir chamado` (`[QA] Anexos troca de conteúdo`)                                                                         | item fica `Enviado` (o navegador não sabe); a criação devolve `Não foi possível anexar "<nome>". …`; diálogo aberto com os valores; nenhum chamado com esse título; nenhuma linha nova em `attachment`                                                                                                                                                                                          |
| AT11 | M    | 1440×900 | selecionar 6 PNGs de uma vez (`a1.png`…`a6.png`); depois, com 5 na lista, selecionar mais 1                                                                                                                                              | 5 entram; toast `Anexe no máximo 5 arquivos.` (momento: ver notas de execução); a 6ª tentativa também é recusada com o mesmo toast; nunca mais de 5 itens                                                                                                                                                                                                                                       |
| AT12 | M    | 1440×900 | anexar `planilha.xlsx`, `doc.docx`, `backup.rar` e `dados.csv`; remover `doc.docx` pelo X depois de `Enviado`; `Abrir chamado` (`[QA] Anexos remoção`)                                                                                   | X com nome acessível `Remover doc.docx`; após remover, a lista tem 3; o chamado tem **3** linhas em `attachment` (`xlsx`, `rar`, `csv`, com `mime_type` da tabela) e nenhuma `doc.docx`                                                                                                                                                                                                         |
| AT13 | M    | 1440×900 | atrasar o PUT em 10 s (`page.route` com espera); anexar `print.png` e, durante `Enviando…`, clicar `Abrir chamado` com o resto preenchido (`[QA] Anexos em curso`)                                                                       | o envio **não** acontece; aparece `Aguarde o envio dos anexos terminar.`; nenhum chamado com esse título. Depois de `Enviado`, `Abrir chamado` cria o chamado com 1 anexo                                                                                                                                                                                                                       |
| AT14 | M    | 1440×900 | abortar o PUT (`route.abort()`); anexar `print.png`; tentar `Abrir chamado`; remover o item; `Abrir chamado` (`[QA] Anexos falha`)                                                                                                       | item `Falha no envio` com `Falha no envio. Remova o arquivo e tente de novo.`; o envio é bloqueado com `Remova os anexos com falha antes de continuar.`; após remover, o chamado é criado **sem** anexo (0 linhas)                                                                                                                                                                              |
| AT15 | M    | 1440×900 | criar `[QA] Anexos sem anexo` sem anexar nada; abrir o detalhe                                                                                                                                                                           | chamado criado como antes; card `Anexos` com `Nenhum anexo.` (sem `<ul>`)                                                                                                                                                                                                                                                                                                                       |
| AT16 | —    | —        | em contexto **sem cookies**, `GET /api/attachments/<id de AT2>`                                                                                                                                                                          | redireciona para `/login`; nenhum `Location` para o R2                                                                                                                                                                                                                                                                                                                                          |
| AT17 | I    | —        | logado como I (outro setor, não envolvido), `GET /api/attachments/<id de AT2>`; depois `GET /api/attachments/999999999` e `/api/attachments/abc`                                                                                         | os três respondem `404`, sem `Location` e sem diferença entre eles                                                                                                                                                                                                                                                                                                                              |
| AT18 | D, A | —        | D e A abrem `/tickets/N` (AT2) e baixam um anexo                                                                                                                                                                                         | ambos veem o card com os 3 itens e baixam (`307` → `200`): diretoria vê tudo, A está no setor atual do chamado                                                                                                                                                                                                                                                                                  |
| AT19 | A    | 1440×900 | criar a tag `[QA] Anexos temporária`; M abre o diálogo, anexa `print.png` (`Enviado`), escolhe essa tag; A desativa a tag; M clica `Abrir chamado`; M escolhe outra tag e reenvia (`[QA] Anexos tag`)                                    | 1º envio: erro de tag no campo (`INVALID_TAG`) com o texto `Esta tag não está disponível. Escolha uma tag ativa do seu setor.` e o campo de volta a `Selecione a tag`, diálogo aberto, anexo ainda `Enviado`; 2º envio: chamado criado com **1** anexo, que baixa normalmente (a área de espera não foi apagada na falha)                                                                       |
| AT20 | M    | 390×844  | abrir o diálogo, anexar `relatório ação.pdf` e um PNG de nome com 120 caracteres **sem espaço** (`a`×116 + `.png`); depois abrir `/tickets/N` (AT2)                                                                                      | diálogo e card sem rolagem horizontal (`scrollWidth <= clientWidth` no documento e no `[role="dialog"]`); nomes longos, inclusive sem espaço, quebram/truncam dentro do diálogo; X alcançável; rodapé do diálogo alcançável; no detalhe, o card `Anexos` aparece depois de `Detalhes` e antes de `Comentários`                                                                                  |
| AT21 | M    | 1440×900 | abrir um chamado em que M é destinatário e salvar uma edição de título pelo "Editar"                                                                                                                                                     | edição salva como antes (regressão do `editTicketSchema`); nenhuma linha nova em `attachment`                                                                                                                                                                                                                                                                                                   |
| AT22 | M    | —        | toda a bateria                                                                                                                                                                                                                           | nenhum erro nem aviso de hidratação no console nem no `next-devtools`; nenhum erro de CORS no console fora dos cenários com interceptação; nenhum e-mail                                                                                                                                                                                                                                        |
| AT23 | —    | —        | em contexto novo, só com o cookie `better-auth.session_token=invalido` (domínio `localhost`), `GET /api/attachments/<id de AT2>` com `maxRedirects: 0`                                                                                   | redireciona para `/login` (`3xx`, `Location` absoluto ou relativo); nenhum `Location` para o R2. Prova que o passo 2 da rota roda: o cookie passa pelo `proxy.ts` (que só confere presença) e `getSession()` volta nulo                                                                                                                                                                         |

**Notas de execução (ambiguidades registradas no QA da Etapa 1).**

- **AT13 e AT14 — clique no botão bloqueado.** Com o envio bloqueado, o botão
  `Abrir chamado` fica com `aria-disabled` (não `disabled`), e o Playwright não
  o considera acionável: o clique comum espera até o timeout. Nesses cenários,
  clicar com `force: true` (`locator.click({ force: true })`). É o
  comportamento esperado, não falha: o clique chega ao `onSubmit`, que
  intercepta e mostra a mensagem de bloqueio.
- **AT11 — quando o toast de limite aparece.** O hook
  (`app/(app)/_hooks/use-attachment-uploads.ts:188-216`) percorre os arquivos
  um a um: confere a vaga (`:192`), lê os primeiros bytes de forma assíncrona
  (`:197`), confere a vaga de novo (`:205`, para o caso de outra seleção ter
  ocupado a vaga durante a leitura) e só então põe o item em `Enviando…`. O
  toast `Anexe no máximo 5 arquivos.` sai **uma vez, ao fim do lote**
  (`:213-215`), não no arquivo recusado. Momento observável:
  - **lote de 6 com a lista vazia:** o toast aparece depois de os 5 aceitos
    estarem na lista como `Enviando…`, sem esperar o pedido de URL nem o
    `PUT`. Ler o toast logo após o `setInputFiles` pode vir vazio; esperar
    por ele (`await expect(page.getByText('Anexe no máximo 5 arquivos.')).toBeVisible()`)
    em vez de ler na hora.
  - **1 arquivo com 5 na lista:** recusado já na primeira conferência, sem
    leitura assíncrona; o toast aparece logo após a seleção.
  - O toast tem id fixo: se o do lote anterior ainda estiver visível, o novo
    o substitui em vez de empilhar. Para provar a 2ª recusa, esperar o
    primeiro sumir antes de selecionar de novo.
- **AT16 — quem redireciona.** Sem cookie, quem responde é o `proxy.ts`
  (`:12-14`; o matcher em `:20` cobre `/api/attachments/*`), antes de a rota
  rodar; o `Location` relativo (`/login`) observado no QA da Etapa 1 é dele,
  não de `app/api/attachments/[id]/route.ts:44`. O cenário passa com
  `Location` absoluto ou relativo; reprova só se o destino não for `/login`
  ou se apontar para o R2. O redirecionamento da **rota** é coberto por AT23.
- **AT19 — texto do erro.** O erro sai em `FieldError` do campo Tags com o
  texto exato `Esta tag não está disponível. Escolha uma tag ativa do seu setor.`
  (`app/_lib/actions/tickets.ts:79`). Como o diálogo chama `router.refresh()`
  junto com o erro, a tag desativada some das opções e o campo volta a mostrar
  o placeholder `Selecione a tag`. Os dois juntos são o esperado.
- **AT20 — nome sem espaço é o caso que importa.** Nome longo **com**
  espaços quebra naturalmente e não prova nada; o critério é o PNG de 120
  caracteres **sem espaço** (`a`×116 + `.png`), medido no documento e no
  `[role="dialog"]`. Foi o que quebrou no QA da Etapa 1 (`[role="dialog"]`
  com `scrollWidth` 1073 contra `clientWidth` 343), corrigido com `min-w-0`
  no `<form>` de `app/(app)/_components/new-ticket-dialog.tsx:154`.
- **AT23 — cookie adulterado.** Criar contexto sem estado
  (`browser.newContext()`) e `context.addCookies([{ name: 'better-auth.session_token', value: 'invalido', domain: 'localhost', path: '/' }])`.
  Não precisa de R2 nem de anexo existente: a rota confere a sessão antes de
  carregar o anexo, então qualquer id numérico serve. Aqui o `Location` vem
  da rota (`route.ts:44`) e tende a ser absoluto
  (`http://localhost:3000/login`); os dois formatos passam.

## Critério de pronto

1. Cenários AT1–AT23 aprovados pelo `df-qa` (AT9 aprovado em qualquer um dos
   dois resultados, registrado).
2. Nenhum arquivo fora de `app/_lib/storage/` importa `@aws-sdk/*`; nenhum
   arquivo de UI importa `app/_lib/storage/`; a rota de download não escreve
   SQL nem grava.
3. `npx tsc --noEmit`, `npm run lint` e `npm run build` passam; `df-reviewer`
   sem bloqueante.

## Checklist de encerramento

- [x] tipos, domínio, Zod, `.env.example`, ADR 018, plano e este contrato (`df-architect`)
- [x] `@aws-sdk/s3-request-presigner`; `client.ts`; `storage/attachments.ts`; `insertTicket`; `data/attachments.ts` (`df-data`)
- [x] `requestAttachmentUpload`; `createTicket`; `app/api/attachments/[id]/route.ts` (`df-actions`)
- [x] `TicketAttachments` e `page.tsx` (Onda 1); `AttachmentUploader`, `AttachmentUploadItem`, `useAttachmentUploads`, `NewTicketDialog` e remoção de `new-ticket-attachments.tsx` (Onda 2) (`df-ui`)
- [x] correções do `df-reviewer`: `isSafeAttachmentFileName` recusa C1 e marcas de direção; ADR 018 e este contrato alinhados ao entregue (`df-architect`)
- [ ] configuração do painel da Cloudflare (usuário)
- [ ] cenários do `df-qa`
- [x] `npx tsc --noEmit`, `npm run lint`, `npm run build`
