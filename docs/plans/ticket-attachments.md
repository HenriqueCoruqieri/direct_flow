# Plano — Anexos de chamado

Aprovado em 2026-10-13 (via `/consult`). Duas etapas, cada uma com o próprio
`/implement` e o próprio commit, nesta ordem. Este documento é registro do
plano; cada etapa tem contrato próprio em `docs/contracts/`, escrito na Onda 0
dela. Decisão técnica em `docs/adr/018-direct-upload-of-ticket-attachments.md`.

Contratos técnicos:

- Etapa 1 — `docs/contracts/ticket-attachments-create-and-download.md`.
- Etapa 2 — `docs/contracts/ticket-attachments-on-resolution.md` (a escrever na
  Onda 0 da Etapa 2).

---

## Escopo

1. **Anexo pertence ao chamado.** `attachment.message_id` fica nulo. Entra em
   dois momentos: na **criação** (diálogo "Novo chamado") e na **Conclusão**,
   gravado junto com "Resolver".
2. **Envio direto navegador → R2** por URL pré-assinada (PUT), até **10 MB
   por arquivo** e **5 arquivos por envio**. A action autoriza e devolve a URL
   de envio para `pending/<userId>/<uuid>.<ext>`; o navegador faz o PUT; a
   action que grava (criar ou resolver) confere cada objeto no R2 (tamanho
   real por `HEAD`, assinatura dos primeiros bytes por `GET` com `Range`),
   copia para `tickets/<uuid>.<ext>` e grava `attachment`. Uma regra de ciclo
   de vida do bucket apaga `pending/` com mais de 1 dia — sem cron.
3. **Tipos aceitos**: PNG, JPEG, WebP, PDF, TXT, CSV, LOG, DOCX, XLSX, PPTX,
   ZIP e RAR. O tipo é decidido pela extensão do nome **e** pela assinatura
   dos primeiros bytes, nunca pelo `File.type` do navegador. O `Content-Type`
   gravado vem da tabela do domínio.
4. **Download** por `GET /api/attachments/[id]`: confere sessão e permissão
   (`canViewTicket`) e redireciona para uma URL assinada de 60 s, com o nome
   original no `Content-Disposition`. Na tela é um `<a href>` comum.
5. **Remover só antes de enviar** (X na lista do formulário). Depois de
   enviado, o anexo é permanente.
6. **Card "Anexos"** no detalhe, coluna da direita, entre os campos do chamado
   (`TicketDetailFields`) e Comentários. Cada item: nome (link de download),
   tamanho, quem enviou, quando. Vazio: `Nenhum anexo.`. Quem vê o chamado vê
   todos os anexos.

**Fora:** anexo em comentário; botão "Anexar" livre no detalhe; remover anexo
já enviado; pré-visualização de imagem; antivírus e inspeção de conteúdo de
ZIP/RAR; arrastar e soltar; e-mail novo.

**Migration:** nenhuma. A tabela `attachment` (`db/schema.ts:341`) já tem
`ticket_id`, `message_id` nulo, `uploaded_by`, `file_name`, `mime_type`,
`size_bytes` (> 0), `storage_key` (único) e `created_at`.

## Decisões do usuário

| #   | Tema               | Decisão                                                                                                      | Alternativa descartada                                                           |
| --- | ------------------ | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| P1  | Onde o anexo entra | **A** — no chamado (`message_id` nulo), na criação e na Conclusão                                            | anexo em comentário; "Anexar" livre no detalhe                                   |
| P2  | Caminho do arquivo | **B** — PUT direto ao R2 por URL pré-assinada, 10 MB por arquivo                                             | `FormData` em Server Action (1 MB padrão; Vercel corta ~4,5 MB)                  |
| P3  | Tipos              | **A + ZIP/RAR** — imagens, PDF, texto, Office, ZIP e RAR; até 5 por envio; decisão por extensão + assinatura | aceitar qualquer tipo; confiar no `File.type`                                    |
| P4  | Download           | **A** — rota que autoriza no clique e redireciona para URL assinada de 60 s                                  | URL assinada embutida na página (expira antes do clique; vaza acesso sem sessão) |
| P5  | Remoção            | **A** — só antes de enviar; o objeto em `pending/` expira                                                    | remover depois de enviado (exigiria histórico de remoção e regra de quem pode)   |

## Configuração externa (feita pelo usuário, antes do QA)

Passo a passo completo no ADR 018: bucket privado, CORS liberando `PUT` com
`content-type` de `http://localhost:3000` e do domínio de produção, regra de
ciclo de vida `pending/` → 1 dia, token R2 com leitura e escrita no bucket e a
variável `R2_ATTACHMENTS_BUCKET` no `.env` e na Vercel.

## Impacto no contrato

- **Domínio** (novo `app/_lib/domain/attachment.ts`): tabela única
  `ATTACHMENT_TYPES` (extensão → `Content-Type` + regra de conteúdo),
  `ATTACHMENT_MAX_BYTES`, `ATTACHMENT_MAX_FILES`, `ATTACHMENT_HEADER_BYTES`,
  `detectAttachmentType`, formato das chaves (`pending/…`, `tickets/…`),
  `canUploadAttachment`, `canDownloadAttachment`,
  `attachmentContentDisposition`, `formatAttachmentSize` e textos de UI.
- **Validação** (novo `app/_lib/validation/attachment.ts`):
  `requestAttachmentUploadSchema`, `uploadedAttachmentSchema`,
  `uploadedAttachmentsSchema`, `parseAttachmentIdParam`.
  `createTicketSchema` ganha `attachments` **opcional**; `editTicketSchema`
  deixa de herdar de `createTicketSchema` e não ganha o campo.
- **Tipos** (novo `app/_lib/types/attachment.ts`); `InsertTicketValues` ganha
  `attachments` opcional; `NewTicketFormDefaults` ganha `attachments: []`.
- **Storage**: novo `app/_lib/storage/attachments.ts`; `readStorageEnv` ganha
  `R2_ATTACHMENTS_BUCKET`; cliente R2 com checksum só quando exigido.
- **Rotas**: `app/api/attachments/[id]/route.ts`, exceção da seção 3 do
  `stack.md` (já registrada pelo orquestrador, com aprovação do usuário).
- **Schema / migration**: nada.

## Etapas

| Etapa | Entrega                                                                                           | Ondas                                                                                                   | Contrato                                                   |
| ----- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| 1     | Infraestrutura (storage, URL de envio, verificação), anexos na criação, download, card no detalhe | `df-architect` → `df-data` ‖ `df-ui` (card) → `df-actions` ‖ `df-ui` (upload) → `df-reviewer` → `df-qa` | `docs/contracts/ticket-attachments-create-and-download.md` |
| 2     | Anexos na Conclusão, gravados junto com "Resolver"; sai o `AttachmentsSoonButton`                 | `df-architect` → `df-data` → `df-actions` ‖ `df-ui` → `df-reviewer` → `df-qa`                           | `docs/contracts/ticket-attachments-on-resolution.md`       |

`df-email` e `df-auth` não entram em nenhuma etapa.

Na Etapa 1, a Conclusão continua com o "Anexar" bloqueado
(`AttachmentsSoonButton` e `TICKET_ATTACHMENTS_SOON_MESSAGE` seguem existindo).
Eles saem na Etapa 2.

## Riscos

1. **Configuração externa.** Sem bucket, CORS, ciclo de vida, escopo do token
   ou `R2_ATTACHMENTS_BUCKET`, o envio falha. O storage lança erro claro na
   primeira chamada (padrão do ADR 010) e o resto do app continua funcionando.
   Previews da Vercel ficam fora do CORS.
2. **R2 respeitar o `Content-Length` assinado.** Se não respeitar, o `HEAD` da
   action recusa o arquivo acima do limite e o ciclo de vida limpa `pending/`.
3. **Órfão de cópia.** Banco falhou depois da cópia e a limpeza também falhou:
   sobra objeto em `tickets/` sem linha. Fica no log (mesmo risco do ADR 010).
4. **DOCX × ZIP só pela extensão.** Os dois têm a mesma assinatura.
5. **Conteúdo compactado não inspecionado.** ZIP/RAR podem trazer executável;
   sem antivírus. Download sempre como `attachment`.
6. **Envio em andamento ao submeter.** A UI bloqueia "Abrir chamado" enquanto
   houver envio em curso ou com falha; a action recusa chave que não é
   `pending/<userId>/` da sessão ou que não existe no bucket.
7. **Checksum do SDK.** O `@aws-sdk/client-s3` instalado põe checksum CRC32 de
   corpo vazio na URL pré-assinada; o cliente R2 passa a
   `requestChecksumCalculation: "WHEN_REQUIRED"`.

## Critério de pronto

Etapa 1:

- Cenários AT1–AT23 do contrato aprovados pelo `df-qa`: PNG, PDF e ZIP de ~9 MB
  anexados na criação aparecem no card e baixam com o nome original; `.exe`
  renomeado para `.pdf` recusado; 11 MB recusado; 6º arquivo recusado; remover
  antes de enviar não gera linha; download sem sessão não abre; quem não vê o
  chamado recebe 404; a URL assinada expira; layout em 390px; dev server sem
  erro.
- `npx tsc --noEmit`, `npm run lint` e `npm run build` passam; `df-reviewer`
  sem bloqueante.

Etapa 2: definido no contrato dela.
