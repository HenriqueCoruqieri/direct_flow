# 018 — Anexos de chamado por envio direto ao R2

## Contexto

O chamado passa a aceitar anexos (plano `docs/plans/ticket-attachments.md`):
até 5 arquivos de até 10 MB por envio, na criação e, na Etapa 2, na Conclusão.
O ADR 010 já reservou um bucket **privado** `attachments`, com leitura só por
URL assinada de curta vida, e decidiu que o avatar vai pelo `FormData` de uma
Server Action porque tem poucos KB.

Para anexo isso não serve:

- Server Action limita o corpo a 1 MB por padrão
  (`node_modules/next/dist/docs/01-app/02-guides/server-actions.md:83`). Subir o
  limite (`serverActions.bodySizeLimit`) vale para todas as actions do app.
- A Vercel corta o corpo da requisição de função em cerca de 4,5 MB, sem
  configuração que mude isso. Cinco arquivos de 10 MB nunca passariam pelo
  servidor.
- O tipo informado pelo navegador (`File.type`) não é confiável: no Windows, o
  `.rar` chega como `application/octet-stream` ou vazio, e o `.zip` como
  `application/x-zip-compressed`.

## Decisão

**1. Envio direto navegador → R2 por URL pré-assinada (PUT).** O navegador
pede à action `requestAttachmentUpload` uma URL de envio para um arquivo
(nome e tamanho declarados). A action valida, confere que a conta está ativa
e sem troca de senha pendente (`canUploadAttachment`) e devolve a URL, a chave
e o `Content-Type` que o PUT tem de usar. A URL vale **5 minutos**
(`ATTACHMENT_UPLOAD_URL_TTL_SECONDS`) e assina `Content-Type` (da tabela de
tipos, nunca do navegador) e `Content-Length` (o tamanho declarado).

**2. Área de espera `pending/` com ciclo de vida.** A chave de envio é
`pending/<userId>/<uuid>.<ext>`. Nada nessa área é anexo de chamado: é só um
arquivo que o usuário subiu. Uma regra de ciclo de vida do bucket apaga
`pending/` com mais de 1 dia. **Sem cron.** Arquivo removido da lista antes de
enviar, aba fechada no meio do formulário ou falha de validação simplesmente
expiram.

**3. A action que grava confere tudo de novo, no R2.** Ao criar o chamado (e,
na Etapa 2, ao resolver), a action recebe a lista `{ key, fileName }` e, para
cada item, nesta ordem:

1. a chave é `pending/<id da sessão>/…` (`isPendingAttachmentKeyOf`) e a
   extensão dela é a do nome;
2. `HEAD` no objeto: existe, tamanho real entre 1 byte e 10 MB; guarda o
   `ETag`;
3. `GET` com `Range: bytes=0-4095` e `If-Match: <ETag>`: lê o cabeçalho
   (`ATTACHMENT_HEADER_BYTES`) e decide o tipo por **extensão do nome +
   assinatura dos primeiros bytes** (`detectAttachmentType`).

Só depois de **todos** passarem:

4. `CopyObject` (cópia dentro do R2, sem tráfego pelo servidor) para a chave
   definitiva `tickets/<uuid novo>.<ext>`, com `CopySourceIfMatch: <ETag>` e o
   `ContentType` da tabela. O `If-Match` fecha a janela em que alguém
   reenviaria outro conteúdo para a mesma URL entre a verificação e a cópia;
5. transação no banco: chamado e linhas de `attachment` (`message_id` nulo,
   `size_bytes` do `HEAD`, `mime_type` da tabela);
6. apaga os objetos de `pending/` (melhor esforço; o ciclo de vida cobre).

A chave definitiva **não** contém o id do chamado: a cópia acontece antes da
transação que cria o chamado. Usa um UUID novo, não o da espera, para que dois
envios da mesma chave de espera nunca produzam o mesmo objeto definitivo (e a
limpeza de um nunca apague o do outro).

Se a cópia falhar no meio, ou se o banco falhar (ou recusar a tag ou o
destinatário) depois da cópia, a action apaga as cópias já feitas e registra no
log. Os objetos de `pending/` **ficam**: o usuário corrige o formulário e
reenvia sem subir os arquivos de novo.

**4. Tipos aceitos** — uma tabela só, `ATTACHMENT_TYPES` em
`app/_lib/domain/attachment.ts`, de extensão para `Content-Type` gravado e
regra de conteúdo:

| Extensão             | `Content-Type` gravado                            | Conteúdo exigido                              |
| -------------------- | ------------------------------------------------- | --------------------------------------------- |
| `png`                | `image/png`                                       | `89 50 4E 47 0D 0A 1A 0A`                     |
| `jpg`, `jpeg`        | `image/jpeg`                                      | `FF D8 FF`                                    |
| `webp`               | `image/webp`                                      | `RIFF` nos bytes 0-3 e `WEBP` nos bytes 8-11  |
| `pdf`                | `application/pdf`                                 | `%PDF-` no byte 0                             |
| `txt`, `log`         | `text/plain`                                      | sem byte `00` nos primeiros 4096 bytes        |
| `csv`                | `text/csv`                                        | sem byte `00` nos primeiros 4096 bytes        |
| `docx`/`xlsx`/`pptx` | `application/vnd.openxmlformats-officedocument.…` | `50 4B 03 04` (são ZIP; a extensão desempata) |
| `zip`                | `application/zip`                                 | `50 4B 03 04`                                 |
| `rar`                | `application/vnd.rar`                             | `52 61 72 21 1A 07` (RAR 4 e RAR 5)           |

Fora: SVG, HTML, executáveis e qualquer outra extensão. Texto não tem
assinatura; a regra "sem byte nulo no cabeçalho" recusa binário renomeado
(um `.exe` tem bytes nulos logo no cabeçalho PE) e aceita UTF-8 e
Windows-1252. Texto em UTF-16 é recusado (tem bytes nulos); é raro e aceito.

**5. Download por rota, exceção da seção 3 do `stack.md`.**
`GET /api/attachments/[id]` (dono `df-actions`): confere a sessão, lê o anexo e
os fatos do chamado por `app/_lib/data/`, autoriza com `canDownloadAttachment`
(conta ativa, sem troca de senha pendente e `canViewTicket`), pede ao storage
uma URL `GET` assinada de **60 s** com
`ResponseContentDisposition: attachment; filename="…"; filename*=UTF-8''…`
(nome original, RFC 5987 para acento) e responde `307` para ela, com
`Cache-Control: private, no-store`. Anexo inexistente, de chamado que a pessoa
não vê ou id inválido → `404`, sem distinguir os casos. Na tela é um
`<a href>` comum.

É rota, e não Server Action, porque o link precisa conferir a permissão **no
clique**: uma URL assinada embutida na página expiraria antes de a pessoa
clicar e vazaria acesso sem sessão para quem recebesse o HTML. A rota não grava
nada e não escreve SQL.

**Classificação da `requestAttachmentUpload`.** Não é leitura iniciada pelo
cliente (a exceção do ADR 015 não se estende a ela): é a **preparação de uma
escrita**. A action autoriza e emite uma credencial de gravação de curta vida no
bucket; a escrita em si é o PUT do navegador. Não toca o banco e por isso não
revalida nada. Segue a forma de qualquer action de mutação.

## Riscos aceitos

- **Conteúdo de ZIP e RAR não é inspecionado.** O servidor nunca descompacta e
  não há antivírus. Um compactado pode trazer executável. O risco é de quem
  baixa, como num anexo de e-mail interno; o download sai sempre com
  `Content-Disposition: attachment`, nunca é exibido inline pelo app.
- **DOCX × ZIP só pela extensão.** Um ZIP renomeado para `.docx` passa como
  DOCX (e o Word não abre); um DOCX renomeado para `.zip` passa como ZIP. Os
  dois são o mesmo formato; nenhum deles vira conteúdo executável por isso.
- **Assinatura prova o formato, não o arquivo inteiro.** Um PDF com cabeçalho
  certo e corpo corrompido é aceito. PDF com bytes antes de `%PDF-` (permitido
  pela especificação, raro) é recusado.
- **`Content-Length` assinado.** Se o R2 não recusar um PUT com tamanho
  diferente do assinado, o `HEAD` da action recusa o arquivo e o ciclo de vida
  limpa a área de espera. O limite de 10 MB nunca depende só do R2.
- **Cota de espera.** Cada pedido de URL permite subir até 10 MB em `pending/`,
  sem limite de pedidos por usuário. Custo de armazenamento de um dia, para
  conta ativa autenticada. Entra na mesma decisão de limite de chamadas do
  ADR 007 e do ADR 010 (`updateAvatar`).
- **Órfão de cópia.** Se a limpeza das cópias falhar depois de um erro de
  banco, sobra objeto em `tickets/` sem linha em `attachment`. Fica no log;
  não há rotina de limpeza (mesmo risco aceito no ADR 010).
- **Linha sem objeto (inverso do órfão de cópia).** Se `insertTicket` lançar
  depois de o `COMMIT` ter chegado ao banco (conexão perdida antes da
  confirmação), o `catch` da `createTicket` trata como falha e apaga as cópias
  em `tickets/`. O chamado e as linhas de `attachment` existem, mas apontam
  para objetos que não existem mais. A rota de download não confere a
  existência do objeto: gera a URL assinada e responde `307`, e o R2 devolve
  `404` direto ao navegador, fora da tela do app. A pessoa recebe "falha
  inesperada" e pode reenviar o formulário, o que cria um segundo chamado com
  cópias novas (os objetos de `pending/` ficaram). Raro, aceito; fica no log.
- **Previews da Vercel.** O CORS libera origens fixas; um deploy de preview
  com URL própria não consegue enviar anexo até a origem dele entrar na regra.
- **Checksum do SDK.** O `@aws-sdk/client-s3` instalado calcula checksum CRC32
  por padrão (`requestChecksumCalculation: "WHEN_SUPPORTED"`) e o põe na URL
  pré-assinada como checksum de corpo vazio, o que faz o PUT do navegador
  falhar. O cliente R2 passa a usar `"WHEN_REQUIRED"` (contrato da Etapa 1).

## Configuração no painel da Cloudflare (feita pelo usuário)

1. **R2 → Create bucket**: nome à escolha (ex. `direct-flow-attachments`),
   **sem** acesso público (não ligar `r2.dev` nem domínio customizado). Se o
   `r2.dev` já tiver sido ligado (Settings → Public Development URL), desligue:
   o anexo só sai por URL assinada da rota de download, e a URL pública
   deixaria qualquer objeto do bucket acessível sem sessão.
2. **Bucket → Settings → CORS policy → Add CORS policy**, com o domínio de
   produção no lugar do exemplo:

   ```json
   [
     {
       "AllowedOrigins": [
         "http://localhost:3000",
         "https://seu-dominio-de-producao"
       ],
       "AllowedMethods": ["PUT"],
       "AllowedHeaders": ["content-type"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

   Só `PUT`: o download é navegação de topo (redirecionamento), que não passa
   por CORS. `Content-Length` não entra em `AllowedHeaders` porque o navegador
   o define sozinho.

3. **Bucket → Settings → Object lifecycle rules → Add rule**: nome
   `pending-1-dia`, prefixo `pending/`, ação **Delete objects** após **1 dia**.
4. **R2 → Manage API tokens**: o token de `R2_ACCESS_KEY_ID` precisa de
   **Object Read & Write** também neste bucket. Se ele foi criado só para o
   bucket de avatares, edite o escopo (ou crie outro e troque as três
   variáveis `R2_*`).
5. **`.env` e Vercel**: `R2_ATTACHMENTS_BUCKET=<nome do bucket>`, só o
   **nome** criado no passo 1 (ex. `direct-flow-attachments`), nunca uma URL.
   Diferente do bucket de avatares, este não tem `R2_*_PUBLIC_URL`: não existe
   URL pública (`https://pub-….r2.dev`) para ele. Pôr a URL no lugar do nome
   faz o storage falhar com `InvalidBucketName`.

## Consequências

- Anexo nunca passa pelo servidor da aplicação; o limite de 1 MB das actions
  continua intocado.
- `app/_lib/storage/` passa a usar `@aws-sdk/s3-request-presigner` (dono
  `df-data`), e continua sendo o único lugar que conhece bucket e credencial.
- O anexo é permanente depois de enviado: não há remoção pela interface.
  Excluir o chamado (não existe hoje) apagaria as linhas por `cascade`, mas não
  os objetos.
- Quem vê o chamado vê todos os anexos; não há anexo privado. `listTicketAttachments`
  e a rota de download só consideram anexos com `message_id` nulo, para que
  um anexo de comentário interno, se um dia existir, não vaze por aqui.
- Sem migration: a tabela `attachment` já tinha as colunas necessárias.

## Revisão de 2026-10-13 — download e card removidos

Por decisão do usuário ("vou seguir sem ela por enquanto"), saíram o card
"Anexos" do detalhe, `listTicketAttachments`, `findAttachmentForDownload`,
`createAttachmentDownloadUrl`, `canDownloadAttachment`,
`attachmentContentDisposition` e a rota `GET /api/attachments/[id]`, com a
exceção dela na seção 3 do `stack.md`
(`docs/contracts/attachments-card-removal.md`). As decisões 1 a 4 continuam:
criação e Conclusão gravam no R2 e em `attachment`, mas nada exibe nem baixa os
anexos. A decisão 5 e as consequências sobre leitura ficam registradas aqui e
em `docs/contracts/ticket-attachments-create-and-download.md` para quando a
leitura voltar; voltar exige de novo a exceção da rota no `stack.md`.

Os riscos "Linha sem objeto" e "conteúdo de ZIP/RAR" deixam de alcançar quem
usa o app enquanto não houver download. O passo 2 da configuração (CORS) já
liberava só `PUT` e não muda.
