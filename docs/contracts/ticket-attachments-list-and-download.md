# Contrato — Lista de anexos na Conclusão e download

Etapa 2 do plano `docs/plans/comment-history-and-attachments-in-edit.md`,
aprovado pelo usuário em `/consult` em 2026-10-14. A Etapa 1 foi comitada em
`173afa9`.

A leitura de anexos removida em 2026-10-13
(`docs/contracts/attachments-card-removal.md`) volta, mas **dentro da
Conclusão** de `/tickets/[id]`, e não como card próprio na coluna da direita.
O desenho do download é o da decisão 5 do ADR 018 e de
`docs/contracts/ticket-attachments-create-and-download.md` (seções
`findAttachmentForDownload`, `createAttachmentDownloadUrl` e a rota), com os
ajustes listados aqui. A revisão de 2026-10-14 do ADR 018 registra a volta.

Ondas: `df-architect` (feito) → `df-data` → `df-actions` ‖ `df-ui` →
`df-reviewer` → `df-qa`. `df-email` e `df-auth` não entram.

Versões observadas: `next@16.3.5`, `zod@4.6.5`, `drizzle-orm@0.45.2`,
`@aws-sdk/client-s3@^3.1140`, `lucide-react@1.47.0`, Tailwind v4.

> **Revisão de 2026-10-14 — fim da transição.** Na Etapa 3
> (`docs/contracts/attachments-in-edit.md`) o bloco ganha modo edição
> (`Anexar` e X, só para o destinatário depois de "Editar") e o uploader
> `Novos anexos` do formulário de resolver sai, com
> `RESOLUTION_NEW_ATTACHMENTS_LABEL`. Fora da edição, tudo o que está aqui
> continua valendo. Os cenários LA2, LA8 e LA10 (que anexam pelo formulário
> de resolver) deixam de valer.

## O que não muda

| Camada                                                                         | Mudança                                                                                                                         |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `db/schema.ts`, migration                                                      | nenhuma — `attachment` já tem tudo                                                                                              |
| envio (`requestAttachmentUpload`, `useAttachmentUploads`, `attachment-intake`) | nenhuma                                                                                                                         |
| `createTicket`, `resolveTicket`, `insertTicket`, `updateTicketResolution`      | nenhuma — continuam gravando `attachment` com `message_id` nulo                                                                 |
| diálogo "Novo chamado"                                                         | nenhuma — o uploader continua com o título `Anexos`                                                                             |
| `AttachmentKindIcon`, `formatAttachmentSize`, `attachmentExtensionLabel`       | nenhuma — reusados pelo bloco de leitura                                                                                        |
| `proxy.ts`                                                                     | nenhuma — o matcher (`proxy.ts:20`) cobre `/api/attachments/<id>` (sem ponto no caminho) e redireciona para `/login` sem cookie |
| `eslint.config.mjs`                                                            | nenhuma — a rota não importa `app/_lib/actions/attachment-intake` (ver "ESLint")                                                |
| coluna da direita do detalhe                                                   | nenhuma — continua `TicketDetailFields` + `TicketComments`; o bloco mora na Conclusão                                           |
| CORS do bucket (passo 2 do ADR 018)                                            | nenhuma — download é navegação de topo, só `PUT` precisa de CORS                                                                |
| e-mail                                                                         | nenhum                                                                                                                          |

## Regras de negócio

- **Quem vê o bloco:** quem vê o chamado (`canViewTicket`, já aplicado pela
  página antes de listar). Não há anexo privado.
- **Quem baixa:** `canDownloadAttachment` — conta ativa, sem troca de senha
  pendente e `canViewTicket`. É a mesma regra da página, com as duas checagens
  de conta que a rota precisa fazer sozinha (a rota não passa pelo layout).
- **Quais anexos:** só `message_id` nulo (criação e Conclusão; na Etapa 3,
  edições), em `created_at asc, id asc`. Anexo de comentário, se um dia
  existir, não aparece nem baixa por aqui.
- **Estados:** o bloco aparece em `resolvable`, `resolved`,
  `awaiting_transfer` e `empty`, e continua visível no modo edição.

## Domínio — `app/_lib/domain/attachment.ts` (feito)

Restaurados da versão anterior a `9b2718e`, com dois acréscimos
(`ATTACHMENT_NOT_FOUND_MESSAGE` e a exportação de `isStoredAttachmentKey`):

| Item                                                                                     | Linha  | Semântica                                                                                                                                                                                                                                    |
| ---------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ATTACHMENT_DOWNLOAD_URL_TTL_SECONDS`                                                    | `:29`  | `60` — validade da URL `GET` assinada                                                                                                                                                                                                        |
| `isStoredAttachmentKey(key): boolean`                                                    | `:261` | volta a ser exportada: `tickets/<uuid>.<ext da tabela>`. Guarda de `createAttachmentDownloadUrl`                                                                                                                                             |
| `canDownloadAttachment(actor: TicketActorFacts, ticket: TicketVisibilityFacts): boolean` | `:272` | `actor.isActive && !actor.mustChangePassword && canViewTicket(actor, ticket)`                                                                                                                                                                |
| `attachmentDownloadPath(attachmentId: number): string`                                   | `:278` | `/api/attachments/<id>`                                                                                                                                                                                                                      |
| `attachmentContentDisposition(fileName: string): string`                                 | `:290` | `attachment; filename="<ASCII: fora de 0x20–0x7E, aspas e barra invertida → _>"; filename*=UTF-8''<RFC 5987>`. Ex.: `relatório ação.pdf` → `attachment; filename="relat_rio a__o.pdf"; filename*=UTF-8''relat%C3%B3rio%20a%C3%A7%C3%A3o.pdf` |
| `ATTACHMENT_NOT_FOUND_MESSAGE`                                                           | `:340` | `Anexo não encontrado.` — corpo de todo `404` da rota (antes era constante local da rota)                                                                                                                                                    |
| `ATTACHMENT_DOWNLOAD_FAILED_MESSAGE`                                                     | `:342` | `Não foi possível baixar o anexo agora. Tente novamente.` — corpo do `503`                                                                                                                                                                   |
| `downloadAttachmentLabel(fileName: string): string`                                      | `:367` | `Baixar <nome>` — nome acessível do bloco                                                                                                                                                                                                    |

`encodeRfc5987` e `asciiFileNameFallback` são internas (`:282-288`).

Reusados sem mudança: `TICKET_ATTACHMENTS_LABEL` (`Anexos`) e
`NO_ATTACHMENTS_LABEL` (`Nenhum anexo.`) em `app/_lib/domain/ticket.ts:157,161`.

### `app/_lib/domain/ticket-resolution.ts` (feito, transitório)

```ts
export const RESOLUTION_NEW_ATTACHMENTS_LABEL = "Novos anexos" // :34
```

Título do uploader do formulário de resolver durante a Etapa 2 (ver
"Transição"). Sai na Etapa 3, junto de `RESOLUTION_ATTACHMENTS_NOTICE`.

## Tipos — `app/_lib/types/attachment.ts` (feito)

```ts
export interface TicketAttachmentItem {
  // :132
  id: number
  fileName: string
  sizeBytes: number
}

export interface AttachmentDownloadTarget {
  // :138
  fileName: string
  storageKey: string
  ticket: TicketVisibilityFacts
}
```

Diferenças para a versão anterior, ajustadas ao que o bloco e a rota usam:
`TicketAttachmentItem` perdeu `uploadedByName` e `createdAt` (o bloco mostra
só ícone, extensão, nome e tamanho, então a consulta não precisa do `join`
com `users`); `AttachmentDownloadTarget` perdeu `id` (a rota já tem o id).

## Validação — `app/_lib/validation/attachment.ts` (feito)

```ts
export const attachmentIdParamSchema   // :82 — idSearchParamSchema("Anexo inválido.")
export const parseAttachmentIdParam = (value: string): number | null   // :86
```

Inteiro positivo sem zero à esquerda, até `POSTGRES_INTEGER_MAX`; fora disso,
`null`. Mesmo formato de `parseTicketIdParam`.

## `df-data` — o que criar

### `app/_lib/data/attachments.ts` (novo)

```ts
export async function listTicketAttachments(
  ticketId: number,
): Promise<TicketAttachmentItem[]>
```

- `select id, file_name, size_bytes from attachment where ticket_id = $1 and
message_id is null order by created_at asc, id asc`. Sem `join`.
- Não autoriza: quem chama (a página) já aplicou `canViewTicket`.

```ts
export async function findAttachmentForDownload(
  attachmentId: number,
): Promise<AttachmentDownloadTarget | null>
```

- `attachment inner join ticket on ticket.id = attachment.ticket_id`,
  `where attachment.id = $1 and attachment.message_id is null`, `limit 1`.
- Devolve `{ fileName, storageKey, ticket: { createdBy, assignedTo,
currentDepartmentId } }`; não achou → `null`.

Versão anterior para referência: `git show 9b2718e^:app/_lib/data/attachments.ts`.

### `app/_lib/storage/attachments.ts` (alterado)

```ts
export async function createAttachmentDownloadUrl(
  storageKey: string,
  fileName: string,
): Promise<string>
```

- `!isStoredAttachmentKey(storageKey)` → lança
  `Error("[storage] Chave definitiva de anexo inválida.")`.
- `getSignedUrl(r2Client(), new GetObjectCommand({ Bucket:
readStorageEnv("R2_ATTACHMENTS_BUCKET"), Key: storageKey,
ResponseContentDisposition: attachmentContentDisposition(fileName) }), {
expiresIn: ATTACHMENT_DOWNLOAD_URL_TTL_SECONDS })`.
- Não confere a existência do objeto (risco "linha sem objeto" do ADR 018).

Imports do domínio ganham `ATTACHMENT_DOWNLOAD_URL_TTL_SECONDS`,
`attachmentContentDisposition` e `isStoredAttachmentKey`. Versão anterior:
`git show 9b2718e^:app/_lib/storage/attachments.ts`.

## `df-actions` — o que criar

### `app/api/attachments/[id]/route.ts` (novo)

Exceção da seção 3 do `.claude/rules/stack.md` (devolvida pelo orquestrador
em 2026-10-14). Assinatura:

```ts
export const GET = async (
  request: NextRequest,
  ctx: RouteContext<"/api/attachments/[id]">,
): Promise<Response>
```

(`RouteContext` é global depois da geração de tipos,
`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md:107-121`.)

Passos, iguais aos da versão anterior
(`git show 9b2718e^:"app/api/attachments/[id]/route.ts"`):

1. `id = parseAttachmentIdParam((await ctx.params).id)`; `null` → `404`.
2. `getSession()`; sem sessão → `NextResponse.redirect(new URL("/login",
request.url))`. Sem cookie, quem responde antes é o `proxy.ts`; com cookie
   inválido ou de sessão revogada, é este passo.
3. `Promise.all([getAccountFacts(), findAttachmentForDownload(id)])`; se
   **lançar**, log `[attachments:download]` e `503`. Qualquer um `null` →
   `404`.
4. Monta `TicketActorFacts` (`userId: session.id` + fatos, como
   `app/(app)/tickets/[id]/page.tsx:78-85`);
   `!canDownloadAttachment(actor, target.ticket)` → `404`.
5. `createAttachmentDownloadUrl(target.storageKey, target.fileName)`; erro →
   log `[attachments:download]` e `503`.
6. `NextResponse.redirect(url, 307)` com `Cache-Control: private, no-store`.

Respostas de erro: texto puro (`Content-Type: text/plain; charset=utf-8`),
`Cache-Control: private, no-store`. Todo `404` tem o **mesmo** corpo,
`ATTACHMENT_NOT_FOUND_MESSAGE`, sem distinguir id inválido, anexo
inexistente, anexo de comentário e chamado que a pessoa não vê. `503` tem
`ATTACHMENT_DOWNLOAD_FAILED_MESSAGE`. Não grava, não revalida, não escreve
SQL, não importa `attachment-intake`.

### ESLint

`ACTION_HELPER_IMPORTERS` (`eslint.config.mjs:45`) fica só com
`app/_lib/actions/**`: a rota não usa o módulo auxiliar. Se a rota precisar
dele, o `df-actions` para e reporta, e o `df-architect` devolve
`app/api/attachments/**` à lista e à mensagem da regra.

## `df-ui` — o que criar e mudar

### Estrutura

```
app/(app)/tickets/[id]/_components/ticket-attachment-list.tsx   novo — TicketAttachmentList: título, vazio ou faixa rolável de blocos
app/(app)/tickets/[id]/_components/ticket-attachment-tile.tsx   novo — TicketAttachmentTile: um <li> com o link de download
app/(app)/tickets/[id]/_components/ticket-conclusion.tsx        alterado — prop attachments; bloco em todos os estados, fora do que some na edição
app/(app)/tickets/[id]/_components/resolve-ticket-form.tsx      alterado — ordem Solução → Anexos → (Novos anexos) → barra
app/(app)/_components/attachment-uploader.tsx                   alterado — prop opcional title
app/(app)/tickets/[id]/page.tsx                                 alterado — listTicketAttachments no Promise.all; attachments para a Conclusão
```

Colocation (seção 5 do `stack.md`): o bloco só existe em `/tickets/[id]`,
então mora no `_components/` da rota. `AttachmentKindIcon` continua no
`_components/` do grupo `(app)`, onde já está.

Os dois componentes novos são Server Components (sem `"use client"`, sem
hook): só links e texto. Um elemento de Server Component pode ser passado como
prop `React.ReactNode` a um Client Component (`ResolveTicketForm`).

### Props

```ts
interface TicketAttachmentListProps {
  attachments: readonly TicketAttachmentItem[]
}

interface TicketAttachmentTileProps {
  attachment: TicketAttachmentItem
}

interface TicketConclusionProps {
  // …props de hoje
  attachments: readonly TicketAttachmentItem[]
}

interface AttachmentUploaderProps {
  // …props de hoje
  title?: string // padrão TICKET_ATTACHMENTS_LABEL
}
```

`ResolveTicketForm` recebe o que a mecânica escolhida pedir (ver "Ordem no
`resolvable`"); a forma das props dele é do `df-ui`.

### `page.tsx`

`listTicketAttachments(ticket.id)` entra no `Promise.all` de
`app/(app)/tickets/[id]/page.tsx:105-111`, **depois** do `canViewTicket`
(`:86`). O resultado vai para `<TicketConclusion attachments={…} />`
(`:169`).

### Bloco — `TicketAttachmentList`

```
<div class="flex min-w-0 flex-col gap-1.5">
  <h3 id="ticket-attachments-heading">Anexos</h3>
  vazio:  <p> Nenhum anexo. </p>                      tracejado, igual ao uploader (attachment-uploader.tsx:140)
  senão:  <div class="min-w-0 overflow-x-auto …">     faixa rolável
            <ul aria-labelledby="ticket-attachments-heading" class="flex w-max gap-2 …">
              <TicketAttachmentTile /> × n
            </ul>
          </div>
</div>
```

- **Título:** `<h3>` (a Conclusão é `<h2>`), texto `TICKET_ATTACHMENTS_LABEL`,
  com o mesmo visual do título do uploader (`text-sm font-medium`, como o
  `FieldTitle` em `attachment-uploader.tsx:106`). Id fixo, porque o bloco é
  renderizado **uma vez só** por página (ver "Edição").
- **Vazio:** `<p>` com `NO_ATTACHMENTS_LABEL`, mesmas classes do vazio do
  uploader (`rounded-lg border border-dashed border-border-strong px-3 py-4
text-center text-sm text-muted-foreground`). Sem `<ul>`.
- **Uma linha só.** `<ul>` em `flex` sem quebra (`w-max` ou `flex-nowrap`),
  dentro de um contêiner `overflow-x-auto` com `min-w-0`. Quando os blocos
  passam da largura, **só o contêiner** rola de lado; o documento nunca. Sem
  rolagem vertical dentro do contêiner (`scrollHeight <= clientHeight`).
- **Barra de rolagem visível**, a nativa. Não esconder (`scrollbar-none` ou
  equivalente): é o que o usuário de mouse sem roda horizontal arrasta.
  Trackpad e `Shift`+roda funcionam nativamente.
- **Foco não cortado.** O contêiner rolável recorta o que passa da borda dele,
  inclusive o anel de foco (`ring-3`, 3 px para fora). O contêiner tem folga
  interna de pelo menos 4 px (`p-1`) e `scroll-padding` igual (`scroll-p-1`),
  para que o anel do primeiro e do último bloco apareça inteiro e o bloco
  focado não encoste na borda ao rolar.
- **Teclado.** Cada bloco é um link e entra na ordem de tabulação; ao receber
  foco, o navegador rola o contêiner até ele. Por isso o contêiner **não**
  ganha `tabIndex` nem `role="region"`: a área rolável já é operável por
  teclado porque tem conteúdo focável (é o critério da regra
  `scrollable-region-focusable` do axe), e um ponto de tabulação extra sem
  ação só atrasaria quem navega. O nome da lista é o título, por
  `aria-labelledby` no `<ul>`: o leitor de tela anuncia "Anexos, lista, n
  itens".
- **Sem animação** de rolagem programática (`scroll-behavior` padrão).

Larguras de referência: o bloco tem largura fixa de 8,5 rem (136 px, a
coluna mínima do uploader) e `gap-2`. Em 390 px a área útil da Conclusão é
cerca de 300 px: cabem 2 blocos e uma fresta do 3º, que sinaliza que há mais.
Em 1440 px, a faixa ocupa a largura da coluna larga e rola a partir de uns 4–5
blocos, conforme a largura da barra lateral.

### Bloco do anexo — `TicketAttachmentTile`

```
<li class="w-34 shrink-0">
  <a href={attachmentDownloadPath(id)}
     aria-label={downloadAttachmentLabel(fileName)}
     aria-describedby="ticket-attachment-<id>-size"
     class="flex h-full flex-col items-center gap-1 rounded-lg bg-surface-muted px-2 pt-3 pb-2.5 text-center
            outline-none focus-visible:ring-3 focus-visible:ring-ring/50 + estado de hover">
    <AttachmentKindIcon fileName={fileName} />           ícone + extensão (aria-hidden, como no upload)
    <span title={fileName} class="line-clamp-2 w-full text-xs font-medium wrap-anywhere">{fileName}</span>
    <span id="ticket-attachment-<id>-size" class="text-xs text-muted-foreground tabular-nums">
      {formatAttachmentSize(sizeBytes)}
    </span>
  </a>
</li>
```

- Mesmo desenho do `AttachmentUploadItem`, **sem** status, erro e X.
- `<a>` comum, **não** `next/link` (é rota de API que redireciona), sem
  `target` e sem atributo `download` (o nome vem do `Content-Disposition`).
- **Nome acessível** `Baixar <nome>`; **descrição** acessível o tamanho
  (`aria-describedby` no `<span>` do tamanho). O `aria-label` substitui o
  conteúdo no nome; sem a descrição o tamanho se perderia para o leitor de
  tela.
- **Nome visível** em até 2 linhas, depois reticências; nome sem espaço quebra
  em qualquer ponto (`wrap-anywhere`) em vez de alargar o bloco. `title` com o
  nome completo; o DOM tem o nome inteiro.
- Todos os blocos com a mesma altura (`h-full` no `<a>`, itens do `flex`
  esticados).
- **Hover** visível e distinto do repouso, com token do tema (ex.:
  `hover:bg-accent`), que funcione no tema claro e no escuro. Alvo de toque
  ≥ 24 px (o bloco tem ~136 × 100 px).
- Ids derivados do id do anexo (`ticket-attachment-<id>-size`), únicos na
  página.

### Posição na Conclusão, por estado

| Estado              | Ordem visual dentro da Conclusão                                                          |
| ------------------- | ----------------------------------------------------------------------------------------- |
| `resolvable`        | Solução → **Anexos** → (transição: **Novos anexos**, só com `canAttach`) → barra de ações |
| `resolved`          | Solução (travada) → "Resolvido em" / "Editável até" → **Anexos**                          |
| `awaiting_transfer` | mensagem da transferência → **Anexos**                                                    |
| `empty`             | "Nenhuma solução registrada." → **Anexos**                                                |

No `resolved`, as legendas de data ficam coladas na solução, que é a quem
pertencem; o bloco vem depois. Espaçamento entre a parte de cima e o bloco:
o `gap-4` da Conclusão.

### Ordem no `resolvable`

Hoje a barra de ações está dentro do `<form>` (`resolve-ticket-form.tsx:102-136`
e `:147-189`) e o formulário inteiro some na edição. O requisito:

1. Ordem visual: Solução → Anexos → (Novos anexos) → barra de ações.
2. O bloco Anexos **não** faz parte do `<form>` e não some na edição.
3. `Resolver` continua submetendo o formulário (clique e teclado); `Enviar
para outro setor` continua abrindo o diálogo.
4. Ao entrar e sair da edição, o que foi digitado na Solução e os envios do
   uploader continuam, como hoje (o `HiddenWhileEditing` só esconde, não
   desmonta).

A mecânica é do `df-ui`. Uma que atende: o `<form id={formId}>` passa a
conter só a Solução; o bloco Anexos vem depois, fora do `<form>`; o uploader
(controlado por `Controller` com `control={form.control}`, que não depende do
DOM do `<form>`) e a barra vêm em seguida, com o botão de envio `type="submit"
form={formId}`. Na edição, a parte de cima (Solução) e a de baixo (uploader e
barra) ficam escondidas, e o bloco Anexos fica visível abaixo do substituto
"Nenhuma solução registrada.".

### Edição

- O bloco é renderizado **uma vez** na página, fora de todo
  `HiddenWhileEditing`, e aparece igual antes, durante e depois da edição.
  Não pode haver uma cópia escondida (id duplicado, `<h3>` repetido na árvore
  de acessibilidade).
- No `resolved` em edição com a solução editável, o campo de solução
  (`TicketEditSolution`) toma o lugar da solução travada e o bloco continua
  abaixo das legendas.
- Na Etapa 2 o bloco não tem modo edição: nada de X nem `Anexar` nele (vem na
  Etapa 3).

### Transição até a Etapa 3 (decisão)

Nesta etapa o destinatário (`canAttach`) ainda anexa pelo formulário de
resolver. Para não haver duas seções `Anexos` ao mesmo tempo:

- O `AttachmentUploader` ganha a prop opcional `title` (padrão
  `TICKET_ATTACHMENTS_LABEL`). O formulário de resolver passa
  `RESOLUTION_NEW_ATTACHMENTS_LABEL` (`Novos anexos`); o diálogo "Novo
  chamado" não passa nada e continua `Anexos`. O título nomeia o grupo do
  uploader (`aria-labelledby`), então o grupo passa a se chamar "Novos
  anexos".
- O uploader fica **depois** do bloco Anexos e antes da barra: primeiro o que
  já está salvo, depois o que vai ser salvo ao resolver (o aviso
  `RESOLUTION_ATTACHMENTS_NOTICE` continua, quando há envio para outro setor).
- Depois de resolver, os arquivos novos aparecem no bloco Anexos
  (`resolveTicket` já revalida `/tickets/[id]`,
  `app/_lib/actions/ticket-resolution.ts:190`).

Por que esta e não outra:

- **Esconder o bloco para quem tem `canAttach`** violaria o requisito de
  mostrar o bloco a todo mundo que vê o chamado, em todos os estados.
- **Juntar salvos e novos numa seção só** é o que a Etapa 3 faz no modo
  edição; construir isso agora dentro do formulário de resolver seria
  descartado.
- Com a escolhida, a Etapa 3 só **apaga**: o uploader do formulário de
  resolver, `RESOLUTION_NEW_ATTACHMENTS_LABEL` e
  `RESOLUTION_ATTACHMENTS_NOTICE`. A ordem final (Solução → Anexos → barra)
  já está montada e não muda. A prop `title` fica se a Etapa 3 usar; senão
  sai no fechamento dela.

## Ordem das ondas (`tsc` verde a cada uma)

| Onda | Agente(s)              | Por que nesta ordem                                                                                                                                                         |
| ---- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0    | `df-architect` (feito) | domínio, tipos, validação e este contrato. Os itens novos ficam sem importador, o que não quebra o `tsc`                                                                    |
| 1    | `df-data`              | `listTicketAttachments`, `findAttachmentForDownload`, `createAttachmentDownloadUrl`. Dependem só da Onda 0                                                                  |
| 2    | `df-actions` ‖ `df-ui` | a rota usa as três funções da Onda 1; a página usa `listTicketAttachments`. Um não depende do outro: o bloco só monta a URL (`attachmentDownloadPath`), sem importar a rota |
| 3    | `df-reviewer`          | inclui o `find` de rotas de API com a exceção `api/attachments/[id]` (`.claude/agents/df-reviewer.md`)                                                                      |
| 4    | `df-qa`                |                                                                                                                                                                             |

## Riscos

Os do ADR 018 que voltam a alcançar quem usa o app:

1. **URL assinada reaproveitável por 60 s** por quem a recebeu (ex.: copiada
   da barra de downloads). Depois disso o R2 recusa.
2. **ZIP/RAR sem inspeção.** Download sempre como `attachment`, nunca exibido
   pelo app.
3. **Linha sem objeto.** A rota não confere a existência do objeto; o R2
   responde `404` direto ao navegador.
4. **Configuração do R2.** Sem bucket, token com leitura ou
   `R2_ATTACHMENTS_BUCKET`, a rota responde `503`. A página não é afetada: a
   lista vem só do banco.
5. **Erro do download sai da página.** Como o bloco é um link comum, um `404`
   ou `503` troca a página pela resposta de texto. Aceito, como na versão
   anterior: o caso normal é baixar sem sair da página.

## Cenários para o `df-qa`

Usuários de `docs/contracts/qa-seed.md`: `M` = QA Membro Suporte, `A` = QA
Admin Suporte, `I` = QA Admin Infra (outro setor), `D` = diretor. Títulos
criados começam com `[QA] Lista de anexos`. Criação só em QA Suporte. **Não
alterar #65 a #68.**

**Pré-requisito:** a configuração do ADR 018 (bucket, CORS com
`http://localhost:3000`, ciclo de vida, token com leitura e escrita,
`R2_ATTACHMENTS_BUCKET`). Sem ela, rodar só LA11–LA15, LA21 e LA22 (não
precisam de R2: K3 é sem anexo, e a rota recusa antes de tocar o storage) e
registrar o resto como bloqueado.

Arquivos como em `ticket-attachments-create-and-download.md` ("Como gerar os
arquivos de teste") e `attachment-tiles.md`, em buffers, sem gravar nada no
repositório: `print.png`, `relatório ação.pdf` (pequeno basta: `%PDF-1.4\n` +
1 KB `0x20` + `\n%%EOF`), `dados.csv`, `planilha.xlsx`, `doc.docx`,
`notas.txt`, `apresentacao.pptx`, `logs.zip`, `backup.rar`, `imagem.webp`, e o
PNG de 120 caracteres sem espaço (`a`×116 + `.png`).

Preparação:

- **K1** — M cria `[QA] Lista de anexos K1`, destinatário **A**, com
  `print.png`, `relatório ação.pdf`, `dados.csv`. Aberto, A é destinatário.
- **K2** — M cria `[QA] Lista de anexos K2`, destinatário **M**, com 5
  arquivos (`planilha.xlsx`, `doc.docx`, `notas.txt`, `apresentacao.pptx`, PNG
  de 120 caracteres); M resolve K2 anexando mais 5 (`logs.zip`, `backup.rar`,
  `imagem.webp`, `print.png`, `dados.csv`). Resolvido, **10** anexos, janela
  de edição aberta.
- **K3** — M cria `[QA] Lista de anexos K3`, destinatário fila, **sem**
  anexo.

Consulta de apoio (MCP `postgres`, só leitura):

```sql
select id, ticket_id, message_id, file_name, size_bytes, storage_key, created_at
from attachment where ticket_id = <N> order by created_at, id;
```

| #    | Quem | Viewport | Ação                                                                                                                                                           | Esperado                                                                                                                                                                                                                                                                                |
| ---- | ---- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LA1  | M    | 1440×900 | abrir K1 (M é autor, não resolve: estado `empty`)                                                                                                              | na Conclusão: "Nenhuma solução registrada." e, abaixo, `h3` `Anexos` com 3 blocos na ordem da consulta; cada bloco com ícone, extensão (`PNG`, `PDF`, `CSV`), nome e tamanho, sem status nem X; nenhum `section` `Anexos` na coluna da direita                                          |
| LA2  | A    | 1440×900 | abrir K1 (A é destinatário: `resolvable` com `canAttach`)                                                                                                      | ordem: campo Solução → `Anexos` (3 blocos) → `Novos anexos` (dica, `Nenhum anexo.`, uploader) → barra (`Anexar`, `Enviar para outro setor`, `Resolver`). Só **um** título `Anexos` visível na Conclusão; o grupo do uploader tem nome acessível `Novos anexos`                          |
| LA3  | D    | 1440×900 | abrir K1 (diretoria: `resolvable` sem `canAttach`)                                                                                                             | Solução → `Anexos` (3 blocos) → barra (sem `Anexar`, sem `Novos anexos`)                                                                                                                                                                                                                |
| LA4  | A    | 1440×900 | em K1, clicar em cada bloco (esperar o evento de download)                                                                                                     | os 3 baixam sem sair da página; `suggestedFilename` igual ao nome original, inclusive `relatório ação.pdf`; tamanho igual ao de `size_bytes`                                                                                                                                            |
| LA5  | M, D | —        | M e D baixam um anexo de K1 (clique)                                                                                                                           | ambos baixam (autor e diretoria)                                                                                                                                                                                                                                                        |
| LA6  | A    | —        | `page.request.get('/api/attachments/<id do PDF de K1>', { maxRedirects: 0 })`                                                                                  | `307`; `Location` no host do R2 com `X-Amz-Expires=60`; `Cache-Control` contém `no-store`. `GET` imediato no `Location` → `200`, `Content-Disposition` com `attachment;` e `filename*=UTF-8''relat%C3%B3rio%20a%C3%A7%C3%A3o.pdf`                                                       |
| LA7  | A    | —        | repetir LA6, guardar o `Location`, esperar 65 s e fazer `GET` nele                                                                                             | o R2 recusa (`403`, `Request has expired`)                                                                                                                                                                                                                                              |
| LA8  | A    | 1440×900 | em K1, digitar uma solução, anexar `notas.txt` em `Novos anexos` e `Resolver`                                                                                  | resolvido; estado `resolved`: Solução travada → `Resolvido em` / `Editável até` → `Anexos` com **4** blocos (o novo por último); `Novos anexos` não aparece mais                                                                                                                        |
| LA9  | A    | 1440×900 | em K1 resolvido, `Editar`; depois `Cancelar`                                                                                                                   | durante a edição, `Anexos` com os 4 blocos continua visível, abaixo do campo de solução e das legendas; os links continuam baixando; depois de cancelar, igual a antes                                                                                                                  |
| LA10 | M    | 1440×900 | criar `[QA] Lista de anexos K4` (destinatário M, com `print.png`); abrir, digitar `abc` na Solução, anexar `dados.csv` em `Novos anexos`; `Editar`; `Cancelar` | durante a edição: "Nenhuma solução registrada." → `Anexos` (1 bloco), sem Solução, sem `Novos anexos`, sem barra; depois de cancelar, Solução com `abc` e o bloco `dados.csv` `Enviado` ainda no uploader                                                                               |
| LA11 | A    | 1440×900 | em K3 (sem anexo), A envia para QA Infra pelo `Enviar para outro setor` (deixa pendente); M abre K3                                                            | M vê `awaiting_transfer`: a mensagem da transferência → `Anexos` com `Nenhum anexo.` (tracejado), sem `<ul>`. Depois do cenário, I recusa a transferência com justificativa `[QA] devolvido`                                                                                            |
| LA12 | M    | 1440×900 | abrir K3 **antes** de LA11 (M é autor de chamado na fila: `resolvable` sem `canAttach`)                                                                        | Solução → `Anexos` com `Nenhum anexo.` (tracejado, sem `<ul>`) → barra (sem `Anexar`, sem `Novos anexos`)                                                                                                                                                                               |
| LA13 | I    | —        | logado como I: abrir `/tickets/<K1>`; `GET /api/attachments/<id de K1>`, `/api/attachments/999999999`, `/api/attachments/abc`, `/api/attachments/0`            | página: `404` do Next. Rota: os quatro `404`, corpo `Anexo não encontrado.` idêntico, sem `Location`                                                                                                                                                                                    |
| LA14 | —    | —        | contexto **sem cookies**: `GET /api/attachments/<id de K1>` com `maxRedirects: 0`                                                                              | redireciona para `/login` (`Location` absoluto ou relativo); nenhum `Location` para o R2 (quem responde é o `proxy.ts`)                                                                                                                                                                 |
| LA15 | —    | —        | contexto novo só com o cookie `better-auth.session_token=invalido` (domínio `localhost`): `GET /api/attachments/<id de K1>` com `maxRedirects: 0`              | redireciona para `/login`; nenhum `Location` para o R2 (quem responde é a rota, passo 2)                                                                                                                                                                                                |
| LA16 | M    | 1440×900 | abrir K2 (10 anexos, `resolved`)                                                                                                                               | 10 blocos numa linha só; o contêiner da faixa tem `scrollWidth > clientWidth` e `scrollHeight <= clientHeight`; o documento tem `scrollWidth <= clientWidth`; todos os blocos com a mesma largura e a mesma altura; o PNG de 120 caracteres em no máximo 2 linhas, com `title` completo |
| LA17 | M    | 1440×900 | em K2, `Tab` a partir do campo anterior até passar pelos 10 blocos                                                                                             | cada bloco recebe foco na ordem, com anel visível **inteiro** (não cortado na borda do contêiner, inclusive o 1º e o 10º); o contêiner rola sozinho até o bloco focado; o contêiner não é um ponto de tabulação próprio; `Enter` no bloco focado baixa o arquivo                        |
| LA18 | M    | 390×844  | abrir K2; depois K2 em `Editar`                                                                                                                                | documento sem rolagem horizontal (`scrollWidth <= clientWidth`); a faixa rola de lado sozinha; 2 blocos inteiros e uma fresta do 3º visíveis antes de rolar; na edição, igual                                                                                                           |
| LA19 | M    | 1440×900 | árvore de acessibilidade da Conclusão em K2                                                                                                                    | `heading` nível 3 `Anexos`; `list` com nome `Anexos` e 10 `listitem`; cada `link` com nome `Baixar <nome>` e descrição igual ao tamanho exibido (ex.: `1 KB`); nenhum `region` extra                                                                                                    |
| LA20 | M    | 1440×900 | K1 e K2 no tema escuro                                                                                                                                         | blocos, nomes, tamanhos, extensões e ícones legíveis com as cores do `.dark`; hover e anel de foco visíveis                                                                                                                                                                             |
| LA21 | M    | 1440×900 | abrir o diálogo "Novo chamado"                                                                                                                                 | o uploader do diálogo continua com o título `Anexos` (regressão da prop `title`)                                                                                                                                                                                                        |
| LA22 | —    | —        | toda a bateria                                                                                                                                                 | nenhum erro nem aviso de hidratação no console nem no `next-devtools`; nenhum id duplicado na página (`document.querySelectorAll('[id="ticket-attachments-heading"]').length === 1` em todos os estados, editando ou não)                                                               |

Notas:

- **LA2 × LA3.** O que distingue o uploader é `canAttach`
  (`canAttachToTicketDetail`): só o destinatário. A e D resolvem K1, mas só A
  anexa.
- **LA7.** A expiração é do R2, não do app; o texto exato do erro pode variar.
  O que importa é não ser `200`.
- **LA11.** Recusar com justificativa devolve K3 a QA Suporte (ADR 016). Se a
  transferência ficar pendente por falha no meio, registrar o id no relatório.
- **Anexo de comentário** (`message_id` não nulo) não tem cenário: o app não
  grava nenhum, e o `df-qa` só lê o banco. O filtro é conferido pelo
  `df-reviewer` no código das duas funções de dados.

## Critério de pronto

1. LA1–LA22 aprovados pelo `df-qa`.
2. `app/api/attachments/[id]/route.ts` sem SQL, sem `drizzle-orm`/`@/db`, sem
   `attachment-intake`; nenhum arquivo de UI importa `app/_lib/storage/`.
3. `listTicketAttachments` e `findAttachmentForDownload` filtram
   `message_id is null`.
4. O bloco é renderizado uma vez por página e fica fora de todo
   `HiddenWhileEditing`.
5. `npx tsc --noEmit`, `npm run lint` e `npm run build` passam; o `build`
   lista `/api/attachments/[id]`; `df-reviewer` sem bloqueante.

## Checklist de encerramento

- [x] domínio (`canDownloadAttachment`, `attachmentDownloadPath`, `attachmentContentDisposition`, `downloadAttachmentLabel`, `ATTACHMENT_DOWNLOAD_URL_TTL_SECONDS`, `ATTACHMENT_NOT_FOUND_MESSAGE`, `ATTACHMENT_DOWNLOAD_FAILED_MESSAGE`, `isStoredAttachmentKey` exportada, `RESOLUTION_NEW_ATTACHMENTS_LABEL`), tipos (`TicketAttachmentItem`, `AttachmentDownloadTarget`), validação (`parseAttachmentIdParam`); revisão no ADR 018; plano e este contrato (`df-architect`)
- [x] `app/_lib/data/attachments.ts` — `listTicketAttachments` e `findAttachmentForDownload`, os dois com `isNull(messageId)` (`:20` e `:37`); `createAttachmentDownloadUrl` em `app/_lib/storage/attachments.ts:160` (`df-data`)
- [x] `app/api/attachments/[id]/route.ts` — `404` com corpo único `ATTACHMENT_NOT_FOUND_MESSAGE`, `503` com log `[attachments:download]`, `/login` sem sessão, `307` com `Cache-Control: private, no-store` (`df-actions`)
- [x] `ticket-attachment-list.tsx`, `ticket-attachment-tile.tsx`, `ticket-conclusion.tsx`, `resolve-ticket-form.tsx` (`<form>` só com a Solução; "Resolver" com `form={formId}`), `page.tsx:109` (`listTicketAttachments` no `Promise.all`), prop `title` em `attachment-uploader.tsx:41` (`df-ui`)
- [x] cenários do `df-qa`: 22 de 22 aprovados, `docs/test-reports/2026-10-14-ticket-attachments-list-and-download.md`. LA3 rodou com K4 (#230) porque K1 já tinha sido resolvido em LA8; ao repetir a bateria, rodar LA3 **antes** de LA8
- [x] `npx tsc --noEmit`, `npm run lint`, `npm run build` passaram; `df-reviewer` APROVADO COM ATENÇÕES (levadas à Etapa 3 e a `/refactor` em `docs/plans/comment-history-and-attachments-in-edit.md`)
