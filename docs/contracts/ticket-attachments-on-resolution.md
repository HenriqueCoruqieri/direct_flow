# Contrato — Anexos de chamado: Conclusão (Etapa 2)

Etapa 2 de 2 do plano `docs/plans/ticket-attachments.md` (decisões P1–P5 lá,
não repetidas aqui). Decisão técnica em
`docs/adr/018-direct-upload-of-ticket-attachments.md`. Toda a infraestrutura
(storage, URL de envio, verificação, download, card "Anexos") vem da Etapa 1,
`docs/contracts/ticket-attachments-create-and-download.md`, e **não muda**.

Ondas: `df-architect` (feito) → `df-data` → `df-actions` ‖ `df-ui` →
`df-architect` (fechamento: remove `TICKET_ATTACHMENTS_SOON_MESSAGE`) →
`df-reviewer` → `df-qa`.

Ele **altera** `docs/contracts/ticket-resolution.md` (entrada de
`resolveTicket`, `updateTicketResolution`, `ResolveTicketForm`, o "Anexar"
bloqueado da Conclusão). Aquele contrato traz uma revisão de 2026-10-13
apontando para cá.

> **Revisão de 2026-10-13 — só o destinatário anexa.** O uploader da Conclusão
> só aparece, e `resolveTicket` só aceita anexos, quando `canAttachToTicket`
> é verdadeira (poder "Editar" e ser o destinatário). A checagem antes do R2
> (passo 4.1 abaixo) passa a usar `findTicketAttachmentFacts` e
> `canAttachToTicket`, e `updateTicketResolution` ganha a recusa
> `not_resolvable` + `reason: "attachments_not_allowed"`. Admin do setor,
> diretoria e autor de chamado na fila resolvem sem anexo. Prevalece
> `docs/contracts/attachments-assignee-only.md`; os cenários AR1–AR3,
> AR6–AR13, AR18 e AR19 (que anexam como autor na fila ou como admin sem ser
> destinatário) ficam superados pelos AO1–AO15 de lá. Para repetir algum deles,
> o chamado precisa ter como destinatário quem anexa.

> **Revisão de 2026-10-13 — card removido.** O card "Anexos" do detalhe e o
> download saíram (`docs/contracts/attachments-card-removal.md`). As menções
> abaixo ao card da direita e a `GET /api/attachments/<id>` (AR1, AR3, AR5,
> AR6, AR7, AR14, AR16) ficam como registro; os anexos da Conclusão continuam
> gravados em `attachment`, sem exibição.

Versões observadas: `next@16.3.5`, `zod@4.6.5`, `drizzle-orm@0.45.2`,
`react-hook-form@7.88`.

## Escopo técnico em uma frase

O formulário da Conclusão ganha o mesmo `AttachmentUploader` do "Novo
chamado"; `resolveTicket` confere os objetos de `pending/`, copia para
`tickets/` e `updateTicketResolution` grava as linhas de `attachment` na mesma
transação da resolução; a verificação e a cópia saem de `actions/tickets.ts`
para um módulo auxiliar compartilhado, sem mudar `createTicket`.

## O que não muda

| Camada                                                        | Mudança                                                                                                 |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `db/schema.ts`, migration                                     | nenhuma                                                                                                 |
| `app/_lib/storage/**`                                         | nenhuma — as mesmas cinco funções da Etapa 1                                                            |
| `requestAttachmentUpload`                                     | nenhuma — mesma regra para pedir URL (`canUploadAttachment`), na criação ou na Conclusão                |
| rota de download, `listTicketAttachments`                     | nenhuma — já listam todo anexo com `message_id` nulo, sem distinguir origem                             |
| `TicketAttachments` (card do detalhe)                         | nenhuma — os anexos da Conclusão entram na mesma lista, pela ordem `created_at asc, id asc`             |
| `createTicket`                                                | nenhuma de comportamento — só passa a usar o módulo auxiliar (cenários AT da Etapa 1 continuam valendo) |
| "Enviar para outro setor" (`sendTicketToDepartment`, diálogo) | nenhuma — não recebe anexos                                                                             |
| quem resolve (`canResolveTicket`)                             | nenhuma                                                                                                 |
| `ticket_history`                                              | nenhuma linha nova — continua `atribuicao` (se houver) + `resolucao`; anexo não é transição             |
| e-mail, auth, `proxy.ts`                                      | nenhuma                                                                                                 |

## Tabelas

**Nenhuma mudança de schema. Nenhuma migration.** A resolução passa a gravar
também em `attachment`:

| Coluna        | Valor na resolução                                                                    |
| ------------- | ------------------------------------------------------------------------------------- |
| `ticket_id`   | o chamado resolvido                                                                   |
| `message_id`  | **nulo**                                                                              |
| `uploaded_by` | `resolverId` (quem resolveu)                                                          |
| `file_name`   | nome do `parsed.data` (com `trim`)                                                    |
| `mime_type`   | `match.contentType` da tabela do domínio                                              |
| `size_bytes`  | tamanho real do `HEAD`                                                                |
| `storage_key` | `tickets/<uuid novo>.<ext>`                                                           |
| `created_at`  | `changedAt` da resolução (= `ticket.resolved_at` = `changed_at` da linha `resolucao`) |

## Tipos — `app/_lib/types/` (feito)

### `app/_lib/types/ticket-resolution.ts` (alterado)

```ts
export interface UpdateTicketResolutionValues {
  ticketId: number
  solution: string
  resolverId: number
  attachments?: readonly StoredAttachmentValues[]
}

export interface ResolveTicketFormDefaults {
  ticketId: number
  solution: string
  attachments: UploadedAttachmentRef[]
}
```

`attachments` em `UpdateTicketResolutionValues` é **opcional** pelo mesmo
motivo da Etapa 1: o `resolveTicket` atual continua compilando entre a Onda 1
e a Onda 2. Ausente = nenhum anexo. Depois da Onda 2 a action sempre passa a
lista (vazia ou não).

### `app/_lib/types/attachment.ts` (acrescido)

Os tipos de resultado do módulo auxiliar, que até aqui eram privados de
`actions/tickets.ts`, passam a ser públicos (duas actions os usam):

```ts
export interface AttachmentsStored {
  status: "stored"
  attachments: StoredAttachmentValues[]
}

export interface AttachmentRejected {
  status: "rejected"
  fileName: string
}

export type AttachmentsIntake = AttachmentsStored | AttachmentRejected
```

Os tipos internos da verificação e da cópia (`VerifiedAttachment`,
`CopiedAttachment`, `AttachmentCopyFailed`, `AttachmentCheck`,
`AttachmentCopy`) ficam privados do módulo auxiliar.

## Domínio — `app/_lib/domain/ticket-resolution.ts` (feito)

```ts
export const RESOLUTION_ATTACHMENTS_NOTICE =
  "Os anexos são salvos só ao resolver. Ao enviar para outro setor, eles não vão junto."

export const buildResolveTicketFormDefaults = (
  ticketId: number,
): ResolveTicketFormDefaults => ({ ticketId, solution: "", attachments: [] })
```

`RESOLUTION_ATTACHMENTS_NOTICE` é o aviso de que anexo da Conclusão só vale
com "Resolver". Onde aparece: ver `df-ui`.

Os demais textos são os da Etapa 1 (`ATTACHMENT_*`, `TICKET_ATTACHMENTS_LABEL`,
`ATTACH_FILE_LABEL`, `NO_ATTACHMENTS_LABEL`, `describeInvalidAttachment`).

### `TICKET_ATTACHMENTS_SOON_MESSAGE` — sai no fechamento

Hoje o único uso é `app/(app)/_components/attachments-soon-button.tsx`, que o
`df-ui` apaga nesta etapa (grep em 2026-10-13: nenhum outro uso em `app/`).
Removê-la agora quebraria o `tsc` entre as ondas, então ela **fica** até o
`df-ui` terminar. No fechamento (depois do `df-ui`, antes do `df-reviewer`), o
`df-architect` a remove de `app/_lib/domain/ticket.ts`. `TICKET_ATTACHMENTS_LABEL`,
`ATTACH_FILE_LABEL` e `NO_ATTACHMENTS_LABEL` continuam (são usados pelo
uploader e pelo card).

> Fechamento de 2026-10-13: removida. `grep` em `app/` sem uso antes da
> remoção; `TICKET_ATTACHMENTS_LABEL`, `ATTACH_FILE_LABEL` e
> `NO_ATTACHMENTS_LABEL` seguem em uso em
> `app/(app)/_components/attachment-uploader.tsx` e
> `app/(app)/tickets/[id]/_components/ticket-attachments.tsx`, e ficam.

## Validação — `app/_lib/validation/ticket-resolution.ts` (feito)

```ts
export const resolveTicketSchema = z.object({
  ticketId: ticketIdSchema,
  solution: ticketSolutionSchema,
  attachments: uploadedAttachmentsSchema.optional(),
})

export type ResolveTicketInput = z.infer<typeof resolveTicketSchema>
```

- `attachments` é **opcional** (não `default([])`), pelo mesmo motivo do
  `createTicketSchema`: com `default`, entrada e saída divergem e o
  `useForm<ResolveTicketInput>` com `zodResolver` deixa de compilar. A action
  trata ausente como `[]`.
- As regras e mensagens do item e da lista são as do
  `uploadedAttachmentsSchema` (máx. 5, chaves sem repetição, chave de espera
  válida, extensão da chave = extensão do nome). O schema não sabe quem é o
  usuário: `pending/<id da sessão>/` é conferido na action.
- Campos e mensagens de `ticketId` e `solution` não mudam.

## `df-data` — o que mudar

### `app/_lib/data/tickets.ts` — `updateTicketResolution` (alterado)

Mesma transação, mesmas travas, mesmos outcomes, mesma precedência. Uma
mudança só: no caminho `saved`, **depois** do `insert` da linha `resolucao`
em `ticket_history` (`app/_lib/data/tickets.ts:598-605`) e antes do `return`,
se `values.attachments` tiver itens:

```ts
tx.insert(attachment).values(
  attachments.map((item) => ({
    ticketId,
    messageId: null,
    uploadedBy: resolverId,
    fileName: item.fileName,
    mimeType: item.mimeType,
    sizeBytes: item.sizeBytes,
    storageKey: item.storageKey,
    createdAt: changedAt,
  })),
)
```

- Lista vazia ou ausente → **nenhum** `insert` (o Drizzle recusa
  `values([])`), igual ao `insertTicket`.
- Saídas antecipadas (`not_found`, `not_resolvable`) não gravam nada, como
  hoje. A action desfaz as cópias nesses casos.
- Erro de banco (inclusive `storage_key` duplicado) lança e desfaz a
  transação inteira: nem resolução, nem histórico, nem anexo.
- Não confere nada do anexo (tipo, tamanho, chave): chega verificado da action.

## `df-actions` — o que criar e mudar

### `app/_lib/actions/attachment-intake.ts` (novo, **sem** `"use server"`)

Módulo auxiliar compartilhado (exceção registrada em
`.claude/agents/df-actions.md`). Primeira linha `import "server-only"` — o
Next 16 trata esse import internamente, sem pacote instalado, e traz a
declaração de tipo (`node_modules/next/types/global.d.ts`;
`node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md:584-604`).
Sem `"use server"`, nenhuma função dele vira endpoint. Só
`app/_lib/actions/**` e `app/api/attachments/**` o importam. Não autentica,
não revalida, não escreve SQL: importa só `app/_lib/storage/attachments`,
`app/_lib/domain/attachment`, `app/_lib/validation/attachment` e
`app/_lib/types/attachment`.

**Quem pode importar é garantido pelo ESLint** (`no-restricted-imports` em
`eslint.config.mjs`). Em todo `app/**`, exceto `app/_lib/actions/**` e
`app/api/attachments/**`, importar `**/_lib/actions/attachment-intake` (alias
`@/…` ou caminho relativo, com ou sem extensão) é erro de lint. O motivo: o
módulo não autentica, então um Server Component que o importasse verificaria e
copiaria anexos sem sessão. Futuros módulos auxiliares de `app/_lib/actions/`
entram na lista `ACTION_HELPER_MODULES` do mesmo arquivo; a lista de quem pode
importar é `ACTION_HELPER_IMPORTERS`. Uma rota em `app/api/cron/**` que precise
de um módulo auxiliar exige acrescentar o caminho a essa lista.

Conteúdo: o que hoje está em `app/_lib/actions/tickets.ts:129-282`
(`VerifiedAttachment`…`storePendingAttachments`), **movido sem mudança de
comportamento**, com o prefixo de log parametrizado. Exportados:

```ts
export const storePendingAttachments = async (
  refs: readonly UploadedAttachmentInput[],
  userId: number,
  logScope: string,
): Promise<AttachmentsIntake>

export const discardStoredAttachments = async (
  attachments: readonly StoredAttachmentValues[],
  logScope: string,
): Promise<void>

export const discardPendingAttachments = async (
  refs: readonly UploadedAttachmentInput[],
  logScope: string,
): Promise<void>
```

| Função                      | Semântica                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `storePendingAttachments`   | Exatamente a sequência da Etapa 1 (contrato dela, `createTicket` passos 3 e 4): lista vazia → `{ status: "stored", attachments: [] }` sem tocar o R2; verifica todos em paralelo (`isPendingAttachmentKeyOf(key, userId)`, `HEAD`, tamanho por `attachmentSizeSchema`, cabeçalho com `If-Match`, `detectAttachmentType` + extensão da chave); primeira recusa na ordem da lista → `rejected` sem copiar; copia todos; algum `null` ou erro na cópia → apaga as cópias feitas (log `${logScope} rollback`) e devolve `rejected` (primeiro na ordem) ou **relança** o erro. Erro inesperado na verificação **lança** (o `Promise.all` rejeita com a primeira exceção de qualquer item, comportamento aceito na Etapa 1) |
| `discardStoredAttachments`  | Apaga os `storageKey` (`deleteAttachmentObject`, `Promise.allSettled`), melhor esforço; cada falha vira `console.error(\`${logScope} rollback\`, key, reason)`. Nunca lança. Lista vazia → nada                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `discardPendingAttachments` | Apaga as chaves de `pending/` (`refs.map(({ key }) => key)`), melhor esforço; falha vira `console.error(\`${logScope} cleanup\`, key, reason)`. Nunca lança                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

`logScope` é o nome da action entre colchetes (`"[createTicket]"`,
`"[resolveTicket]"`). Com `"[createTicket]"`, as mensagens de log ficam
idênticas às de hoje (`[createTicket] rollback`, `[createTicket] cleanup`).

### `app/_lib/actions/tickets.ts` — `createTicket` (refatorado, mesmo comportamento)

- Remove os tipos e funções movidos e o import de `app/_lib/storage/attachments`.
- `storePendingAttachments(refs, actor.id, "[createTicket]")`.
- O `catch` e o outcome ≠ `saved` chamam
  `discardStoredAttachments(stored, "[createTicket]")`, onde `stored` é a lista
  de `intake.attachments` (vazia até a cópia terminar, como o `storedKeys` de
  hoje).
- Sucesso chama `discardPendingAttachments(refs, "[createTicket]")`.
- Sequência, códigos, mensagens e revalidações **inalterados**.

### `app/_lib/actions/ticket-resolution.ts` — `resolveTicket` (alterado)

```ts
export type ResolveTicketErrorCode =
  "INVALID_INPUT" | "FORBIDDEN" | "NOT_FOUND" | "INVALID_ATTACHMENT"
```

`ResolveTicketSuccess`, `ResolveTicketFailure`, `ResolveTicketResult` e a
entrada (`ResolveTicketInput`, agora com `attachments?`) mantêm a forma.

Sequência:

1. `getSession()`; `null` → `FORBIDDEN_FAILURE` (como hoje).
2. `resolveTicketSchema.safeParse(input)`; falha → `INVALID_INPUT` com a
   primeira issue (como hoje).
3. `refs = parsed.data.attachments ?? []`.
4. Em `try`:
   1. **Só se `refs.length > 0`**: `facts = await getAccountFacts()`;
      `null` ou `!canUploadAttachment(facts)` → `OUTCOME_FAILURES.not_resolvable`
      (`FORBIDDEN`, `Você não pode resolver este chamado.`), **sem tocar o R2**.
      Conta inativa ou com troca de senha pendente nunca resolveria (a
      transação recusaria), e a checagem evita cópias inúteis.
   2. `intake = await storePendingAttachments(refs, actor.id, "[resolveTicket]")`;
      `rejected` → `{ ok: false, code: "INVALID_ATTACHMENT", message: describeInvalidAttachment(intake.fileName) }`.
   3. `stored = intake.attachments`.
   4. `outcome = await updateTicketResolution({ ticketId, solution, resolverId: actor.id, attachments: stored })`.
5. `catch` → `console.error("[resolveTicket]", error)`,
   `discardStoredAttachments(stored, "[resolveTicket]")` (vazia se a falha foi
   antes da cópia) e `UNEXPECTED_FAILURE`.
6. Outcome ≠ `saved` (`not_found`, `not_resolvable`) →
   `discardStoredAttachments(stored, "[resolveTicket]")` e a falha de hoje.
7. `saved` → `discardPendingAttachments(refs, "[resolveTicket]")`, revalida
   como hoje (`ticketDetailPath`, `MY_TICKETS_PATH`, `DEPARTMENT_QUEUE_PATH`)
   e devolve `describeTicketResolved` como hoje.

- **Resolver sem anexo** (lista vazia ou ausente) segue exatamente o caminho
  de hoje: não chama `getAccountFacts`, não toca o R2, funciona sem
  `R2_ATTACHMENTS_BUCKET`.
- Em nenhuma falha a action apaga `pending/`: a pessoa corrige e reenvia com
  os mesmos anexos.
- A permissão de resolver continua decidida **na transação**
  (`canResolveTicket` sob trava). A cópia acontece antes; se a transação
  recusar, as cópias são apagadas (passo 6). Isso é o mesmo desenho da
  criação (tag recusada depois da cópia) e o mesmo risco aceito de órfão de
  cópia (ADR 018).
- **Commit sem confirmação** (ADR 018, "Linha sem objeto"): vale igual aqui.
  Se `updateTicketResolution` lançar depois de o `COMMIT` ter chegado ao
  banco, o chamado fica `resolvido` com linhas de `attachment` apontando para
  cópias apagadas. Raro, aceito, fica no log.

| Situação                                 | `code`               | Mensagem                                                              |
| ---------------------------------------- | -------------------- | --------------------------------------------------------------------- |
| resolvido                                | —                    | `Chamado #42 resolvido.`                                              |
| sem sessão                               | `FORBIDDEN`          | `Você não tem permissão para resolver este chamado.`                  |
| schema falhou                            | `INVALID_INPUT`      | primeira `issue.message`                                              |
| conta sem permissão de envio, com anexos | `FORBIDDEN`          | `Você não pode resolver este chamado.`                                |
| anexo recusado (verificação ou cópia)    | `INVALID_ATTACHMENT` | `Não foi possível anexar "<nome>". Remova o arquivo e anexe de novo.` |
| `not_found`                              | `NOT_FOUND`          | `Chamado não encontrado.`                                             |
| `not_resolvable`                         | `FORBIDDEN`          | `Você não pode resolver este chamado.`                                |
| falha inesperada (banco ou storage)      | —                    | `Não foi possível resolver o chamado agora. Tente novamente.`         |

`sendTicketToDepartment` **não muda** e não recebe anexos.

## `df-ui` — o que mudar

### Estrutura

```
app/(app)/_components/attachment-uploader.tsx              alterado — prop opcional notice
app/(app)/tickets/[id]/_components/resolve-ticket-form.tsx alterado — campo attachments, bloqueio do Resolver, aviso
app/(app)/_components/attachments-soon-button.tsx          APAGADO — sem uso depois desta etapa
```

`ticket-conclusion.tsx`, `ticket-attachments.tsx`, `page.tsx`,
`send-to-department-dialog.tsx`, `new-ticket-dialog.tsx`,
`use-attachment-uploads.ts` e `attachment-upload-item.tsx` não precisam mudar.

### `AttachmentUploader` — prop `notice`

```ts
interface AttachmentUploaderProps {
  onChange: (value: UploadedAttachmentRef[]) => void
  onBusyChange: (busy: AttachmentUploaderBusy) => void
  disabled?: boolean
  notice?: string
  ref?: React.Ref<HTMLButtonElement>
  fieldState: ControllerFieldState
}
```

- `notice` presente → um `<p id={noticeId}>` logo abaixo da dica
  `ATTACHMENT_LIMITS_HINT`, no mesmo bloco do título (mesmo estilo da dica,
  `text-xs text-muted-foreground`; ícone `InfoIcon` opcional com
  `aria-hidden`). Sempre visível, com ou sem itens na lista: a pessoa lê antes
  de escolher arquivo.
- `aria-describedby` do grupo: com erro, o erro (como hoje); sem erro,
  `hintId` e, se houver, `noticeId` (separados por espaço).
- Sem `notice` (diálogo "Novo chamado") → nada muda.

### `ResolveTicketForm`

- `useForm<ResolveTicketInput>` sem mudança de tipo; `defaultValues: defaults`
  já traz `attachments: []` (`buildResolveTicketFormDefaults`).
- **Ordem no card**: campo `Solução` → `AttachmentUploader` → linha de botões.
  O `AttachmentsSoonButton` sai da linha de botões (o "Anexar" agora é o do
  uploader, no cabeçalho da seção). A linha fica `[Enviar para outro setor]`
  (se houver) `[Resolver]`, alinhada à direita, como hoje.
- `Controller name="attachments"` renderiza o `AttachmentUploader` com
  `ref={field.ref}`, `onChange={field.onChange}`,
  `onBusyChange={setUploadsBusy}`, `disabled={isSubmitting}`, `fieldState` e
  `notice={sendToDepartment !== null ? RESOLUTION_ATTACHMENTS_NOTICE : undefined}`.
  O aviso só aparece quando o botão "Enviar para outro setor" existe: é a
  única saída da Conclusão em que os anexos se perdem. Sem esse botão (ex.:
  autor sem destinatário), resolver é o único caminho e o aviso não diz nada.
- **"Resolver" bloqueado** enquanto `uploadsBusy !== "idle"`, no mesmo padrão
  do "Abrir chamado" da Etapa 1 (`new-ticket-dialog.tsx:129-139` e `:259-284`):
  `aria-disabled`, visual de desabilitado
  (`cursor-not-allowed opacity-50 hover:bg-primary`), `aria-describedby` para
  um `<span class="sr-only">` com `attachmentUploadsBlockMessage(busy)`; o
  `onSubmit` do `<form>` intercepta **antes** do `handleSubmit` (nem valida a
  solução), não chama a action e mostra `toast.info` com a mensagem (id fixo,
  sem empilhar).
- **"Enviar para outro setor" não é bloqueado** por anexos (decisão desta
  etapa). Ele abre o diálogo normalmente durante envio em curso, com falha ou
  com anexos enviados; continua desabilitado só durante `isSubmitting` (como
  hoje). Motivo: os anexos não vão com o envio em nenhum caso, então bloquear
  sugeriria o contrário; o aviso `RESOLUTION_ATTACHMENTS_NOTICE` já está à
  vista. Depois de enviar, o card passa a `awaiting_transfer` (ou a pessoa sai
  do chamado), o formulário desmonta, os PUTs em curso são abortados e o
  ciclo de vida limpa `pending/`. Nenhuma linha nova em `attachment`.
- **Resultado do `resolveTicket`**:
  - `ok` → `toast.success(result.message)`. **Sem `form.reset`**: o
    `revalidatePath` leva o card a `resolved`, o formulário desmonta e a lista
    do uploader some com ele. Um `reset` não esvaziaria o uploader (ele não
    recebe `value`) e faria a solução piscar vazia antes da troca do card.
  - `INVALID_INPUT` → `setError("solution", …)` como hoje; lista mantida.
  - `INVALID_ATTACHMENT` → sem ramo próprio: cai no genérico
    (`toast.error(result.message)`), solução e lista mantidas, sem
    `router.refresh()`. A pessoa remove o item indicado e reenvia.
  - `FORBIDDEN`/`NOT_FOUND` → `toast.error` e `router.refresh()`, como hoje.
  - sem `code` → `toast.error`, valores e lista mantidos.
- **Falha de validação no cliente** (solução vazia ou curta): o
  `handleSubmit` não chama a action; a lista do uploader fica como está
  (estado do hook), sem reenviar arquivo.
- **Modo de edição** (`HiddenWhileEditing`): o formulário fica oculto mas
  montado; envios em curso continuam e a lista volta intacta ao sair da
  edição. Nada a fazer.

### Layout

- O card Conclusão (`className="lg:flex-1"` em `page.tsx:175`) cresce para
  baixo com a lista; a coluna larga continua ditando a altura da linha do grid
  e os Comentários acompanham (`ticket-resolution.md`, "Grid"). Não pôr altura
  máxima nem rolagem própria na lista do uploader (no máximo 5 itens).
- 390px: nome longo sem espaço quebra dentro do card (o `AttachmentUploadItem`
  já tem `min-w-0`/`wrap-break-word`); conferir que o `<form>` da Conclusão e
  a coluna (`min-w-0` em `page.tsx:164`) não deixam o conteúdo estourar. Se
  estourar, `min-w-0` no `<form>` do `ResolveTicketForm`, como foi preciso no
  diálogo (`new-ticket-dialog.tsx:154`).
- Linha de botões: `flex-wrap` (já existe) para "Enviar para outro setor" e
  "Resolver" quebrarem em 390px.

> Revisão de 2026-10-13: a lista do uploader passou a ser em blocos
> (`docs/contracts/attachment-tiles.md`); a regra de não estourar em 390px
> continua, agora pela grade com `min-w-0` em cada `<li>`.

## Riscos

1. **Configuração externa** (ADR 018). Sem R2, resolver **com** anexo dá
   falha inesperada (o pedido de URL já falha antes, na seleção); resolver
   **sem** anexo continua funcionando.
2. **Cópia antes da autorização final.** A transação é quem decide se a
   pessoa resolve; a cópia acontece antes. Um pedido forjado para chamado não
   resolvível gasta até 5 cópias, apagadas em seguida. A chave precisa ser
   `pending/<id da sessão>/`, e a conta precisa passar em
   `canUploadAttachment`. Aceito.
3. **Órfão de cópia** e **linha sem objeto**: mesmos riscos da criação
   (ADR 018).
4. **Anexos perdidos no envio para outro setor.** Decidido: não vão junto; o
   aviso deixa claro e o ciclo de vida limpa `pending/`.
5. **Extração do módulo.** Erro na movimentação quebraria a criação com
   anexo; os cenários AR14–AR15 são a regressão.
6. **`TICKET_ATTACHMENTS_SOON_MESSAGE` entre ondas.** Fica até o fechamento;
   se o `df-architect` não for acionado, sobra constante sem uso (o `tsc` não
   acusa).

## Cenários para o `df-qa`

Usuários de `docs/contracts/qa-seed.md`: `M` = QA Membro Suporte, `A` = QA
Admin Suporte, `I` = QA Admin Infra, `D` = diretor. Títulos criados começam
com `[QA] Anexos resolução`. Criação e resolução só em QA Suporte. **Não
alterar #65 a #68.** Arquivos de teste e consulta de apoio: os da Etapa 1
(contrato dela, "Cenários para o `df-qa`"), sem gravar nada no repositório.

**Pré-requisito:** configuração do ADR 018 confirmada pelo usuário. Sem ela,
rodar só AR10, AR11, AR16 e AR19 e registrar o resto como bloqueado.

**Preparação.** M cria, pelo "Novo chamado":

- `#P1` = `[QA] Anexos resolução autor`, destinatário **fila**, com
  `print.png` anexado na criação (M resolve como autor sem destinatário; sem
  botão "Enviar para outro setor").
- `#P2` = `[QA] Anexos resolução admin`, fila, sem anexo (A resolve; A vê
  "Enviar para outro setor").
- `#P3` = `[QA] Anexos resolução envio`, fila, sem anexo (A anexa e envia
  para QA Infra).
- `#P4` = `[QA] Anexos resolução validação`, fila, sem anexo.
- `#P5` = `[QA] Anexos resolução recusas`, fila, sem anexo.

E A cria `#P6` = `[QA] Anexos resolução do admin`, destinatário **A**, sem
anexo (M é `member`, não é autor nem destinatário: não resolve).

Entre cenários no mesmo chamado, recarregar a página para começar com a lista
do uploader vazia.

| #    | Quem | Viewport | Ação                                                                                                                                                                                     | Esperado                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ---- | ---- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AR1  | M    | 1440×900 | abrir `/tickets/P1`                                                                                                                                                                      | card Conclusão: `Solução`, depois seção `Anexos` com `Anexar` **ativo** (sem `aria-disabled`), dica `Até 5 arquivos de até 10 MB cada.`, `Nenhum anexo.`, `input[type=file][multiple]` com o mesmo `accept` da Etapa 1; **sem** o aviso `Os anexos são salvos só ao resolver…` (não há "Enviar para outro setor"); botão `Resolver`; nenhum "Anexar" esmaecido na linha de botões. Card `Anexos` da direita com o `print.png` da criação |
| AR2  | A    | 1440×900 | abrir `/tickets/P2`                                                                                                                                                                      | igual ao AR1, mais o aviso `Os anexos são salvos só ao resolver. Ao enviar para outro setor, eles não vão junto.` abaixo da dica, e a linha de botões `Enviar para outro setor` · `Resolver`                                                                                                                                                                                                                                             |
| AR3  | M    | 1440×900 | em P1, anexar `relatório ação.pdf` (~9 MB) e `dados.csv`; aguardar `Enviado`; solução `[QA] Resolvido com evidências anexadas.` → `Resolver`                                             | `PUT` ao R2 com `200` para cada um; toast `Chamado #P1 resolvido.`; card passa a `resolved`; card `Anexos` da direita com **3** itens, na ordem `print.png` (criação), `relatório ação.pdf`, `dados.csv`, os dois novos com `QA Membro Suporte` e a data/hora da resolução                                                                                                                                                               |
| AR4  | —    | —        | banco, depois do AR3                                                                                                                                                                     | 2 linhas novas em `attachment` para P1: `message_id` nulo, `uploaded_by` = M, `mime_type` `application/pdf` e `text/csv`, `size_bytes` iguais aos arquivos, `storage_key` `tickets/<uuid>.<ext>`, `created_at` = `ticket.resolved_at` = `changed_at` da linha `resolucao`; `ticket_history` sem linha de anexo (só `atribuicao`, se houver, e `resolucao`)                                                                               |
| AR5  | M, D | 1440×900 | baixar os dois anexos novos de P1 (M); D abre P1 e baixa um                                                                                                                              | os downloads saem com o nome original (`relatório ação.pdf` com acento e espaço) e o mesmo tamanho; `GET /api/attachments/<id>` → `307` para o R2                                                                                                                                                                                                                                                                                        |
| AR6  | A    | 1440×900 | em P2, anexar `print.png` e `backup.rar`; remover `backup.rar` pelo X; resolver com solução válida                                                                                       | toast `Chamado #P2 resolvido.`; só **1** linha nova em `attachment` (`print.png`, `uploaded_by` = A); card mostra 1 item                                                                                                                                                                                                                                                                                                                 |
| AR7  | A    | 1440×900 | em P3, anexar `print.png` (`Enviado`); clicar `Enviar para outro setor` → QA Infra, comentário `[QA] Envio com anexo na Conclusão.` → enviar                                             | o botão abre o diálogo normalmente (não bloqueado pelo anexo); envio feito como antes; card Conclusão passa a `awaiting_transfer`; card `Anexos` com `Nenhum anexo.`; **nenhuma** linha em `attachment` para P3                                                                                                                                                                                                                          |
| AR8  | A    | 1440×900 | atrasar o PUT em 10 s; em P4, anexar `print.png`; durante `Enviando…`: (a) clicar `Resolver` (`force: true`) com a solução vazia; (b) clicar `Enviar para outro setor` e cancelar        | (a) toast `Aguarde o envio dos anexos terminar.`; **nenhum** request de `resolveTicket`; nenhuma mensagem de validação na Solução; (b) o diálogo abre e fecha normalmente, o envio do anexo continua                                                                                                                                                                                                                                     |
| AR9  | A    | 1440×900 | em P4, abortar o PUT (`route.abort()`); anexar `dados.csv`; clicar `Resolver` (`force: true`)                                                                                            | item `Falha no envio`; toast `Remova os anexos com falha antes de continuar.`; nenhum request de action                                                                                                                                                                                                                                                                                                                                  |
| AR10 | A    | 1440×900 | em P4 (recarregado), anexar `print.png` (`Enviado`); `Resolver` com a solução vazia; depois `curta`; depois solução válida → `Resolver`                                                  | `Descreva a solução.`, depois `A solução precisa ter no mínimo 10 caracteres.`, sem request de action; o item continua `Enviado` nas duas; no 3º clique, resolvido com **1** anexo **sem novo `PUT`** (contar requisições ao R2)                                                                                                                                                                                                         |
| AR11 | A    | 1440×900 | em P5: tentar `setup.pdf`, `grande.pdf` (11 MB) e, com 5 PNGs na lista, um 6º                                                                                                            | os mesmos toasts e recusas do AT7, AT8 e AT11 da Etapa 1; nenhum `PUT` para os recusados; nunca mais de 5 itens                                                                                                                                                                                                                                                                                                                          |
| AR12 | A    | 1440×900 | em P5 (recarregado), interceptar o PUT trocando o corpo por bytes do mesmo tamanho começando com `4D 5A`; anexar um PDF válido de 1 KB; solução válida → `Resolver`                      | item `Enviado`; toast `Não foi possível anexar "<nome>". Remova o arquivo e anexe de novo.`; P5 continua **não** resolvido (status e `ticket_history` inalterados); solução e lista mantidas; nenhuma linha em `attachment` para P5                                                                                                                                                                                                      |
| AR13 | A, M | —        | forjar `resolveTicket` (`Next-Action`): (a) A, em P5, com `attachments` contendo uma chave `pending/<id de M>/…` real de um envio de M; (b) M, com anexo próprio válido, `ticketId` = P6 | (a) `Não foi possível anexar "…"` (`INVALID_ATTACHMENT`); (b) `Você não pode resolver este chamado.`; nos dois, nenhuma linha nova em `attachment`, `max(id)` de `ticket_history` inalterado                                                                                                                                                                                                                                             |
| AR14 | M    | 1440×900 | regressão da Etapa 1: criar `[QA] Anexos resolução regressão` com `print.png` e `logs.zip`                                                                                               | igual ao AT2/AT3: toast de criação, 2 linhas em `attachment` com `created_at` = do chamado, card com os 2, download funciona                                                                                                                                                                                                                                                                                                             |
| AR15 | M, A | 1440×900 | regressão da Etapa 1: repetir AT10 (troca de conteúdo na criação) e AT19 (tag desativada no meio, reenvio com outra tag)                                                                 | mesmos resultados da Etapa 1: AT10 sem chamado nem linha; AT19 com o 2º envio criando o chamado com **1** anexo (a área de espera não foi apagada na falha)                                                                                                                                                                                                                                                                              |
| AR16 | M    | 1440×900 | abrir P6 (M não resolve) e P1 depois de resolvido                                                                                                                                        | P6: `Nenhuma solução registrada.`, sem seção de anexos no card Conclusão, sem `Anexar`; P1: solução travada, sem uploader. Card `Anexos` da direita presente nos dois                                                                                                                                                                                                                                                                    |
| AR17 | M    | 1440×900 | resolver um chamado sem anexar nada (`[QA] Anexos resolução sem anexo`)                                                                                                                  | resolução como antes (`ticket-resolution.md`, cenário 5); nenhuma linha em `attachment`                                                                                                                                                                                                                                                                                                                                                  |
| AR18 | A    | 390×844  | em um chamado resolvível de QA Suporte, anexar o PNG de 120 caracteres sem espaço (`a`×116 + `.png`) e `relatório ação.pdf`                                                              | sem rolagem horizontal no documento (`scrollWidth <= clientWidth`); nome quebra dentro do card; X alcançável; aviso legível; `Enviar para outro setor` e `Resolver` quebram de linha sem estourar; ordem das seções como em `ticket-resolution.md`, cenário 36                                                                                                                                                                           |
| AR19 | A    | 1440×900 | desktop: em um chamado resolvível com 3 anexos na lista do uploader                                                                                                                      | o card Conclusão cresce para baixo; a borda de baixo dele e a de Comentários seguem alinhadas (diferença ≤ 1 px), como no cenário 34 de `ticket-resolution.md`                                                                                                                                                                                                                                                                           |
| AR20 | —    | —        | toda a bateria                                                                                                                                                                           | nenhum erro nem aviso de hidratação no console nem no `next-devtools`; nenhum erro de CORS fora dos cenários com interceptação; nenhum e-mail novo                                                                                                                                                                                                                                                                                       |

Notas de execução: as da Etapa 1 valem (clique com `force: true` em botão
`aria-disabled`; momento do toast de limite; id fixo dos toasts). Em AR13(a),
a chave de M sai da resposta do `requestAttachmentUpload` capturada na sessão
de M; o ciclo de vida apaga o objeto em 1 dia, então rodar no mesmo dia.

## Critério de pronto

1. Cenários AR1–AR20 aprovados pelo `df-qa`.
2. `app/_lib/actions/attachment-intake.ts` sem `"use server"`, com
   `import "server-only"` na primeira linha, importado só por
   `app/_lib/actions/tickets.ts` e `app/_lib/actions/ticket-resolution.ts`;
   `actions/tickets.ts` não importa mais `app/_lib/storage/`.
3. `attachments-soon-button.tsx` apagado e `TICKET_ATTACHMENTS_SOON_MESSAGE`
   removida, sem uso restante (`grep` vazio em `app/`).
4. `npx tsc --noEmit`, `npm run lint` e `npm run build` passam; `df-reviewer`
   sem bloqueante.

## Checklist de encerramento

- [x] `resolveTicketSchema.attachments`; `ResolveTicketFormDefaults.attachments`; `UpdateTicketResolutionValues.attachments`; `AttachmentsStored`/`AttachmentRejected`/`AttachmentsIntake` públicos; `RESOLUTION_ATTACHMENTS_NOTICE`; plano e este contrato (`df-architect`)
- [x] `updateTicketResolution` grava `attachment` depois da linha `resolucao`, com `messageId: null`, `uploadedBy: resolverId` e `createdAt: changedAt`; lista vazia ou ausente sem `insert` (`app/_lib/data/tickets.ts:607-620`) (`df-data`)
- [x] `app/_lib/actions/attachment-intake.ts` com `import "server-only"` na linha 1, sem `"use server"`, exportando `discardStoredAttachments` (`:129`), `discardPendingAttachments` (`:139`) e `storePendingAttachments` (`:149`); importado só por `actions/tickets.ts:5-9` e `actions/ticket-resolution.ts:5-9`. `createTicket` usa `CREATE_LOG_SCOPE = "[createTicket]"` (`actions/tickets.ts:116-171`) e não importa mais `app/_lib/storage/`. `resolveTicket` com `INVALID_ATTACHMENT` (`actions/ticket-resolution.ts:31-32`), `canUploadAttachment` só com anexos (`:110-115`), cópia, gravação e descarte (`:117-143`) (`df-actions`)
- [x] `AttachmentUploader.notice` com `<p id={noticeId}>` e `InfoIcon` abaixo da dica, `aria-describedby` com `hintId noticeId` sem erro (`app/(app)/_components/attachment-uploader.tsx:31`, `:70-96`); `ResolveTicketForm` com `Controller name="attachments"` entre Solução e botões, aviso só com "Enviar para outro setor", "Resolver" bloqueado por `attachmentUploadsBlockMessage` com `toast.info` antes do `handleSubmit`, sem `form.reset` no sucesso, `min-w-0` no `<form>` (`app/(app)/tickets/[id]/_components/resolve-ticket-form.tsx:54-126`, `:141-166`); `attachments-soon-button.tsx` apagado (`df-ui`)
- [x] `TICKET_ATTACHMENTS_SOON_MESSAGE` removida de `app/_lib/domain/ticket.ts`; as demais constantes do placeholder seguem em uso e ficam; notas de revisão em `new-ticket-attachments-placeholder.md` e `ticket-resolution.md` (`df-architect`, fechamento)
- [ ] cenários do `df-qa`
- [x] `npx tsc --noEmit`, `npm run lint`, `npm run build` (fechamento, 2026-10-13)
