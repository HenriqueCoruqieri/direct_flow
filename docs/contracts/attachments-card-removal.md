# Contrato — Remoção do card "Anexos" e do download

Pedido do usuário em 2026-10-13: _"Remova o anexo perto dos comentários e tudo
relacionado a essa feature. Acho que vou seguir sem ela por enquanto."_ Sai o
card "Anexos" do detalhe (entre Detalhes e Comentários) e todo o lado de
**leitura** dos anexos: listagem, rota de download, URL assinada de leitura. O
**envio continua**: criação e Conclusão seguem gravando no R2 e em
`attachment`; os anexos só ficam sem exibição por enquanto.

O desenho removido fica registrado em
`docs/contracts/ticket-attachments-create-and-download.md` e no ADR 018
(revisão de 2026-10-13), para quando voltar.

Commit próprio, separado de `docs/contracts/attachments-assignee-only.md`.

## O que não muda

| Camada                                                                     | Mudança                                                          |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `db/schema.ts`, migration                                                  | nenhuma — `attachment` continua recebendo linhas                 |
| upload (`requestAttachmentUpload`, `AttachmentUploader`…)                  | nenhuma                                                          |
| `createTicket`, `resolveTicket`, `attachment-intake.ts`                    | nenhuma                                                          |
| `AttachmentKindIcon`                                                       | fica — o bloco do upload (`attachment-upload-item.tsx`) o usa    |
| `formatAttachmentSize`, `TICKET_ATTACHMENTS_LABEL`, `NO_ATTACHMENTS_LABEL` | ficam — usados pelo uploader                                     |
| `isAttachmentStorageKey`, `ATTACHMENT_STORED_PREFIX`                       | ficam — guarda do `deleteAttachmentObject` (rollback das cópias) |
| `@aws-sdk/s3-request-presigner`, `R2_ATTACHMENTS_BUCKET`                   | ficam — URL de envio                                             |
| `proxy.ts`                                                                 | nenhuma — o matcher é genérico, não cita `/api/attachments`      |

## O que sai, por agente

### `df-ui`

- **Apagar** `app/(app)/tickets/[id]/_components/ticket-attachments.tsx`
  (`TicketAttachments`).
- `app/(app)/tickets/[id]/page.tsx`: tirar o import de `listTicketAttachments`
  (`:8`) e de `TicketAttachments` (`:46`), o item `listTicketAttachments(ticket.id)`
  do `Promise.all` (`:105-112`, e a variável `attachments` da desestruturação)
  e o `<TicketAttachments attachments={attachments} />` (`:180`). A coluna da
  direita fica `TicketDetailFields` + `TicketComments` (este continua com
  `className="lg:flex-1"`).

### `df-actions`

- **Apagar** `app/api/attachments/[id]/route.ts` (e a pasta
  `app/api/attachments/`).

### `df-data`

- **Apagar** `app/_lib/data/attachments.ts` inteiro: as duas funções
  (`listTicketAttachments`, `findAttachmentForDownload`) saem e o arquivo
  fica vazio.
- `app/_lib/storage/attachments.ts`: remover `createAttachmentDownloadUrl` e
  os imports que ficam sem uso — `ATTACHMENT_DOWNLOAD_URL_TTL_SECONDS`,
  `attachmentContentDisposition`, `isStoredAttachmentKey`. `GetObjectCommand` e
  `getSignedUrl` **ficam** (cabeçalho e URL de envio).

### `df-architect` (fechamento)

- `app/_lib/domain/attachment.ts`: remover `canDownloadAttachment`,
  `attachmentDownloadPath`, `attachmentContentDisposition`, `encodeRfc5987`,
  `asciiFileNameFallback`, `ATTACHMENT_DOWNLOAD_URL_TTL_SECONDS`,
  `ATTACHMENT_DOWNLOAD_FAILED_MESSAGE`, `downloadAttachmentLabel`, e os
  imports que ficam sem uso (`canViewTicket`, `TicketActorFacts`,
  `TicketVisibilityFacts`). `isStoredAttachmentKey` deixa de ser exportada
  (só `isAttachmentStorageKey` a usa).
- `app/_lib/types/attachment.ts`: remover `TicketAttachmentItem` e
  `AttachmentDownloadTarget`. `TicketVisibilityFacts` continua importado
  (`TicketAttachmentFacts`).
- `app/_lib/validation/attachment.ts`: remover `attachmentIdParamSchema`,
  `parseAttachmentIdParam`, a constante `INVALID_ATTACHMENT_MESSAGE` e o
  import de `idSearchParamSchema`.
- `eslint.config.mjs`: tirar `app/api/attachments/**` de
  `ACTION_HELPER_IMPORTERS` e da mensagem da regra (fica só
  `app/_lib/actions/**`).
- Conferir com `grep` em `app/` que nenhum dos nomes acima sobrou.

O orquestrador, com aprovação do usuário, remove a exceção da rota em
`.claude/rules/stack.md` (seção 3) e em `.claude/agents/df-actions.md`.

## Ordem (o `tsc` fica verde a cada onda)

| Onda | Agente(s)               | Por que nesta ordem                                                                                                                                                                                           |
| ---- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | `df-ui` ‖ `df-actions`  | são os consumidores: a página usa `listTicketAttachments`; a rota usa `findAttachmentForDownload`, `createAttachmentDownloadUrl`, `canDownloadAttachment` e `parseAttachmentIdParam`. Um não depende do outro |
| 2    | `df-data`               | sem página nem rota, `data/attachments.ts` e `createAttachmentDownloadUrl` ficam sem importador                                                                                                               |
| 3    | `df-architect`          | sem storage nem rota, os itens de domínio, tipos, validação e ESLint ficam sem uso                                                                                                                            |
| 4    | `df-reviewer` → `df-qa` |                                                                                                                                                                                                               |

## Cenários para o `df-qa`

Usuários de `docs/contracts/qa-seed.md` (`M` = QA Membro Suporte, `A` = QA
Admin Suporte). Títulos começam com `[QA] Sem card`. **Não alterar #65 a
#68.** Pré-requisito do ADR 018 só para CR4 e CR5.

| #   | Quem | Viewport | Ação                                                                                       | Esperado                                                                                                                                                                  |
| --- | ---- | -------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CR1 | M    | 1440×900 | abrir um chamado que **tem** anexos (ex. um `[QA] Anexos…` das Etapas 1 e 2)               | coluna da direita só com `Detalhes` e `Comentários`, nessa ordem; nenhum `section` com título `Anexos` fora da Conclusão; nenhum `a[href^="/api/attachments/"]` na página |
| CR2 | M    | 1440×900 | mesmo chamado, desktop                                                                     | a borda de baixo de `Comentários` alinha com a da Conclusão (diferença ≤ 1 px), como no cenário 34 de `ticket-resolution.md`                                              |
| CR3 | M    | —        | `GET /api/attachments/<id de um anexo existente>` e `GET /api/attachments/abc`, com sessão | `404` do Next nos dois (página padrão de não encontrado), sem `Location` para o R2                                                                                        |
| CR4 | M    | 1440×900 | "Novo chamado" com `print.png` (`[QA] Sem card criação`)                                   | criado; 1 linha em `attachment` (`uploaded_by` = M, `storage_key` `tickets/…`); o detalhe não mostra o anexo                                                              |
| CR5 | M    | 1440×900 | num chamado em que M é destinatário: anexar `dados.csv` na Conclusão e resolver            | resolvido; 1 linha nova em `attachment` com `created_at` = `ticket.resolved_at`; o detalhe não mostra o anexo                                                             |
| CR6 | M    | 390×844  | o chamado de CR1                                                                           | sem rolagem horizontal; ordem das seções sem o card `Anexos`                                                                                                              |
| CR7 | —    | —        | toda a bateria                                                                             | nenhum erro nem aviso de hidratação no console nem no `next-devtools`                                                                                                     |

## Critério de pronto

1. CR1–CR7 aprovados pelo `df-qa`.
2. `grep` em `app/` sem `listTicketAttachments`, `findAttachmentForDownload`,
   `createAttachmentDownloadUrl`, `canDownloadAttachment`,
   `attachmentDownloadPath`, `attachmentContentDisposition`,
   `downloadAttachmentLabel`, `ATTACHMENT_DOWNLOAD_`, `TicketAttachmentItem`,
   `AttachmentDownloadTarget`, `parseAttachmentIdParam`, `api/attachments`.
3. `npx tsc --noEmit`, `npm run lint` e `npm run build` passam; `df-reviewer`
   sem bloqueante.

## Checklist de encerramento

- [x] este contrato; revisões no ADR 018, ADR 015, plano e contratos de anexos (`df-architect`)
- [x] `ticket-attachments.tsx` apagado; `page.tsx` sem o card nem `listTicketAttachments` — coluna da direita = `TicketDetailFields` + `TicketComments` com `lg:flex-1` (`page.tsx:178-186`) (`df-ui`)
- [x] `app/api/attachments/[id]/route.ts` e a pasta apagados; o `build` não lista mais `/api/attachments/[id]` (`df-actions`)
- [x] `data/attachments.ts` apagado; `createAttachmentDownloadUrl` removido e o import do domínio reduzido a `ATTACHMENT_HEADER_BYTES`, `ATTACHMENT_UPLOAD_URL_TTL_SECONDS`, `isAttachmentStorageKey`, `parsePendingAttachmentKey`, `pendingAttachmentKey`, `storedAttachmentKey` (`storage/attachments.ts:11-18`) (`df-data`)
- [x] domínio, tipos, validação e `eslint.config.mjs` limpos; `isStoredAttachmentKey` passou a interna de `domain/attachment.ts` (`df-architect`, fechamento)
- [x] `.claude/rules/stack.md`, `.claude/agents/df-actions.md` e `.claude/agents/df-data.md` sem a rota de download (orquestrador)
- [ ] cenários do `df-qa`
- [x] `npx tsc --noEmit`, `npm run lint`, `npm run build`; `grep` do critério 2 vazio fora de `docs/`
