# Contrato — Anexos em blocos (upload)

Ajuste visual da feature de anexos (plano `docs/plans/ticket-attachments.md`),
pedido do usuário em 2026-10-13, sobre a Etapa 2 ainda não comitada. A lista
de anexos deixa de ser um item por linha e vira **blocos lado a lado**, com o
ícone do tipo em cima. Vale para o `AttachmentUploader` (diálogo "Novo
chamado" e Conclusão). O card "Anexos" do detalhe, que também ganharia os
blocos, foi removido no mesmo dia (`docs/contracts/attachments-card-removal.md`).

Ondas: `df-architect` (feito) → `df-ui` → `df-reviewer` → `df-qa`.
`df-data` e `df-actions` **não entram**.

Altera, só na forma da lista, `docs/contracts/ticket-attachments-create-and-download.md`
(seção `df-ui`: "Lista", `AttachmentUploadItem`) e
`docs/contracts/ticket-attachments-on-resolution.md` (seção "Layout"). Fluxo,
textos, bloqueios, limites e ações continuam como lá.

Versões observadas: `lucide-react@1.47.0`, Tailwind v4, `next@16.3.5`.

## O que não muda

| Camada                                       | Mudança                                                              |
| -------------------------------------------- | -------------------------------------------------------------------- |
| `db/schema.ts`, migration                    | nenhuma                                                              |
| `app/_lib/data/**`                           | nenhuma — a categoria sai do nome do arquivo (ver "Fonte")           |
| `app/_lib/actions/**`, `app/_lib/storage/**` | nenhuma                                                              |
| `app/_lib/validation/**`                     | nenhuma                                                              |
| `useAttachmentUploads`                       | nenhuma — mesmo estado, mesma fila, mesmo limite de 5, mesmos toasts |
| props do `AttachmentUploader`                | nenhuma por este contrato                                            |
| ordem dos anexos                             | ordem de seleção                                                     |
| foco depois de remover                       | volta ao botão `Anexar`, como hoje                                   |

## Domínio — `app/_lib/domain/` (feito)

### `app/_lib/domain/attachment-kinds.ts` (novo)

```ts
export const ATTACHMENT_KINDS = [
  "pdf",
  "text",
  "spreadsheet",
  "document",
  "presentation",
  "image",
  "archive",
] as const
```

Arquivo próprio pelo mesmo motivo de `my-tickets-tabs.ts`: `types/attachment.ts`
deriva o tipo dele com `import type`, sem ciclo com `domain/attachment.ts`.

### `app/_lib/types/attachment.ts` (alterado)

```ts
export type AttachmentKind = (typeof ATTACHMENT_KINDS)[number]

export interface AttachmentTypeSpec {
  contentType: AttachmentContentType
  kind: AttachmentKind
  check: AttachmentContentCheck
}
```

### `app/_lib/domain/attachment.ts` (alterado)

Cada entrada de `ATTACHMENT_TYPES` ganha `kind`. Como a tabela é
`satisfies Record<AttachmentExtension, AttachmentTypeSpec>` e `kind` é
obrigatório, **extensão nova sem categoria é erro de compilação** (conferido:
remover o `kind` do `rar` dá `TS2741`); categoria fora de `ATTACHMENT_KINDS`
também.

| Categoria (`kind`) | Extensões                    |
| ------------------ | ---------------------------- |
| `pdf`              | `pdf`                        |
| `text`             | `txt`, `log`                 |
| `spreadsheet`      | `csv`, `xlsx`                |
| `document`         | `docx`                       |
| `presentation`     | `pptx`                       |
| `image`            | `png`, `jpg`, `jpeg`, `webp` |
| `archive`          | `zip`, `rar`                 |

Funções novas:

```ts
export const attachmentKindFor = (fileName: string): AttachmentKind | null
export const attachmentExtensionLabel = (fileName: string): string | null
export const describeAttachmentUploadStatus = (
  fileName: string,
  status: AttachmentUploadStatus,
): string
```

| Função                           | Semântica                                                                                                                          |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `attachmentKindFor`              | `ATTACHMENT_TYPES[ext].kind` da extensão de `attachmentExtensionOf(fileName)`; `null` se a extensão não está na tabela             |
| `attachmentExtensionLabel`       | extensão da tabela em maiúsculas: `relatório.pdf` → `PDF`, `foto.JPEG` → `JPEG`, `logs.zip` → `ZIP`; `null` nos mesmos casos acima |
| `describeAttachmentUploadStatus` | `<nome>: <ATTACHMENT_UPLOAD_STATUS_LABELS[status]>` — ex.: `dados.csv: Enviado`. Texto anunciado do status de cada bloco           |

### Fonte da categoria: o nome do arquivo

O pedido preferia o `mime_type` gravado. A decisão foi a **extensão do
`fileName`**, como fonte única para o ícone **e** para o rótulo:

- o rótulo precisa da extensão, e o MIME não a recupera (`text/plain` é TXT ou
  LOG; `image/jpeg` é JPG ou JPEG). Usar MIME para o ícone e nome para o
  rótulo seriam duas fontes;
- o `mime_type` gravado **é derivado** da extensão do nome:
  `attachmentFileNameSchema` exige extensão da tabela, `detectAttachmentType`
  confere o conteúdo contra ela, e o `mime_type` vem de
  `ATTACHMENT_TYPES[extensão].contentType`. Toda linha de `attachment` gravada
  pelo app tem as duas coisas coerentes por construção;
- o upload só tem o nome (o `File.type` não é confiável e nunca é usado).
  Uma leitura futura dos anexos gravados usa a mesma função sobre
  `file_name`, **sem** mudança no `df-data`.

Na UI, `null` → ícone neutro de arquivo, sem rótulo (no upload não acontece:
o arquivo sem extensão da tabela é recusado antes de virar bloco).

## `df-data` — nada a fazer

## `df-ui` — o que criar e mudar

### Estrutura

```
app/(app)/_components/attachment-kind-icon.tsx               novo — AttachmentKindIcon: ícone da categoria + extensão, decorativo
app/(app)/_components/attachment-upload-item.tsx             alterado — vira bloco
app/(app)/_components/attachment-uploader.tsx                alterado — <ul> em grade
app/globals.css                                              alterado — tokens de cor por categoria e tamanho de texto --text-micro
app/_lib/utils.ts                                            alterado — "micro" registrado em text no createCn
```

`AttachmentKindIcon` vai para o `_components` do **grupo** `(app)`, ao lado do
`AttachmentUploadItem` que o usa (o uploader serve o diálogo, presente em todo
o grupo, e a Conclusão de `/tickets/[id]`). Conhece "anexo", então não vai
para `app/_components/`. Sem `"use client"` e sem hook: componente de
apresentação, que também serviria a um Server Component.

### `AttachmentKindIcon`

```ts
interface AttachmentKindIconProps {
  fileName: string
  className?: string
}
```

- Calcula `attachmentKindFor(fileName)` e `attachmentExtensionLabel(fileName)`.
- Renderiza **um** wrapper `aria-hidden="true"` com o ícone (`size-8`) e,
  abaixo, a extensão em letra pequena (`text-micro`, 11px, `font-semibold`,
  `tracking-wide`, `text-muted-foreground` — texto visível precisa de 4,5:1,
  por isso a extensão não leva a cor da categoria). Tudo decorativo: o nome do
  arquivo, que contém a extensão, já está no bloco e no nome acessível.
- O mapa categoria → ícone/cor vive **aqui**, nunca no domínio:

```ts
interface AttachmentKindVisual {
  icon: LucideIcon
  className: string
}

const KIND_VISUALS = { … } satisfies Record<AttachmentKind, AttachmentKindVisual>
```

`satisfies Record<AttachmentKind, …>` faz categoria nova sem ícone virar erro
de compilação na UI, do mesmo jeito que extensão nova sem categoria vira no
domínio. `kind === null` → `FileIcon` com `text-muted-foreground`, sem
extensão.

| Categoria      | Ícone (`lucide-react`) | Classe no SVG renderizado | Cor (token)                        |
| -------------- | ---------------------- | ------------------------- | ---------------------------------- |
| `pdf`          | `FileTextIcon`         | `lucide-file-text`        | vermelho — `text-file-pdf`         |
| `text`         | `FileIcon`             | `lucide-file`             | neutro — `text-muted-foreground`   |
| `spreadsheet`  | `FileSpreadsheetIcon`  | `lucide-file-spreadsheet` | verde — `text-file-spreadsheet`    |
| `document`     | `FileTextIcon`         | `lucide-file-text`        | azul — `text-file-document`        |
| `presentation` | `PresentationIcon`     | `lucide-presentation`     | laranja — `text-file-presentation` |
| `image`        | `FileImageIcon`        | `lucide-file-image`       | roxo — `text-file-image`           |
| `archive`      | `LibraryIcon`          | `lucide-library`          | âmbar — `text-file-archive`        |

Nomes e classes conferidos na versão instalada (1.47.0): os seis existem, com
os aliases `*Icon`; renderizados, saem com as classes da tabela. Usar os
aliases `*Icon` (padrão do projeto, `XIcon`, `InfoIcon`): `File` sozinho
sombrearia o tipo global `File` do DOM.

PDF e DOCX usam o mesmo ícone; a cor e a extensão os separam. A informação
nunca depende só da cor (WCAG 1.4.1): extensão visível em todo bloco.

**Tokens (`app/globals.css`).** Sete tokens novos: seis de cor e um de
tamanho de texto.

Cor — seis tokens, no padrão de
`--tipo-*`/`--status-*`: `--file-pdf`, `--file-spreadsheet`,
`--file-document`, `--file-presentation`, `--file-image`, `--file-archive`,
em `:root` e `.dark`, registrados em `@theme inline` como `--color-file-*`.
Sugestão de valores, que já têm contraste conferido nas superfícies do
projeto: os mesmos hex de `--status-cancelado`, `--status-resolvido`,
`--status-aberto`, `--status-recusado`, `--status-em-analise` e
`--status-aguardando-aprovacao`, claro e escuro. **Valores copiados, não
`var(--status-*)`**: ícone de arquivo não pode mudar quando a cor de status
mudar. Cores de categoria não entram na escala de tamanho do `text-*`; mesmo
assim, conferir que o `cn` trata `text-file-*` como cor e, se não tratar,
registrar no `createCn` (`stack.md`, seção 5).

Tamanho de texto — `--text-micro: 0.6875rem` (11px) com
`--text-micro--line-height: 0.875rem` (14px), no `@theme inline`, ao lado de
`--text-caption`/`--text-title`/`--text-display`. Existe para a extensão do
`AttachmentKindIcon` (`text-micro`): o bloco pede ~10–11px e a escala padrão
do Tailwind para em `text-xs` (12px). Nome fora da escala padrão, então
registrado no `createCn` de `app/_lib/utils.ts` na chave `text`, junto de
`caption`, `title` e `display` (`stack.md`, seção 5); sem isso o `cn` o
trataria como cor e o descartaria em conflito com `text-muted-foreground`.

### Grade (`<ul>` do uploader)

- `<ul className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-2">`.
  `auto-fill` (não `auto-fit`): um anexo sozinho fica do tamanho de uma
  coluna, não estica na largura toda.
- Cada `<li>` com `min-w-0` (item de grade tem `min-width: auto` e um nome sem
  espaço o alargaria além da coluna — foi o que quebrou no AT20).
- Colunas esperadas: diálogo em desktop ~3; Conclusão em 1440 px conforme a
  largura da coluna larga; 390 px 2 (diálogo e Conclusão). Abaixo de ~280 px
  de área útil, 1 coluna. Nunca rolagem horizontal: a única largura mínima é
  8,5 rem (136 px).
- Blocos da mesma linha ficam com a mesma altura (`stretch` da grade); o
  bloco usa `h-full`.
- Vazio: igual a hoje (`<p>` tracejado `NO_ATTACHMENTS_LABEL`).
- Sem altura máxima nem rolagem própria (no máximo 5).

### Bloco do upload — `AttachmentUploadItem`

Props sem mudança (`fileName`, `sizeBytes`, `status`, `error`, `disabled?`,
`onRemove`).

```
<li class="min-w-0">
  <div class="relative flex h-full min-w-0 flex-col items-center gap-1 rounded-lg bg-surface-muted px-2 pt-3 pb-2.5 text-center">
    [X]                         absolute top-1 right-1, Button ghost size="icon-sm" (28 px)
    <AttachmentKindIcon />      ícone + extensão (aria-hidden)
    nome                        text-xs font-medium, até 2 linhas
    tamanho                     text-xs text-muted-foreground tabular-nums
    status                      ícone de status 3.5 + rótulo, text-xs
    erro (se houver)            text-xs text-destructive, quebra normal
  </div>
</li>
```

Tamanho aproximado: 136–200 px de largura, ~128–150 px de altura (mais com
erro). O ícone central não fica sob o X: o X ocupa o canto, o ícone o centro.

- **Nome:** `w-full line-clamp-2 wrap-anywhere`, `title={fileName}`. Até 2
  linhas, depois reticências; nome sem espaço quebra em qualquer ponto em vez
  de alargar o bloco. O DOM tem o nome inteiro (leitor de tela lê completo); o
  `title` mostra o completo ao passar o mouse. Com o fim cortado, a extensão
  continua visível no rótulo acima.
- **Status:** ícone de status de hoje (`Loader2Icon` girando com
  `motion-reduce:animate-none`, `CircleCheckIcon` `text-primary`,
  `CircleAlertIcon` `text-destructive`), `aria-hidden`. Rótulo visível
  `ATTACHMENT_UPLOAD_STATUS_LABELS[status]` com `aria-hidden="true"`, ao lado
  de um `<span className="sr-only">{describeAttachmentUploadStatus(fileName, status)}</span>`.
  Assim a região `aria-live="polite"` que já envolve a lista anuncia
  `dados.csv: Enviado`, e não um `Enviado` solto sem dizer de qual arquivo
  (com cinco blocos, o rótulo sozinho é ambíguo).
- **Erro:** a mensagem (`error`) continua visível e completa, abaixo do status
  (não truncar: é a instrução de o que fazer).
- **X:** `aria-label={removeAttachmentLabel(fileName)}`, `disabled` como hoje,
  `type="button"`. 28 px ≥ alvo mínimo de 24 px (WCAG 2.5.8). Foco visível.
  Ordem de tabulação: os X na ordem dos blocos, depois o resto do formulário.

### Moldura e posição

Sem mudança: seção do uploader com título, dica, aviso (Conclusão) e `Anexar`,
como hoje.

## Cenários para o `df-qa`

Usuários de `docs/contracts/qa-seed.md` (`M` = QA Membro Suporte, `A` = QA
Admin Suporte). Títulos começam com `[QA] Blocos`. Criação e resolução só em
QA Suporte. **Não alterar #65 a #68.** Pré-requisito: configuração do ADR 018
(como nas Etapas 1 e 2). Arquivos gerados como nos contratos anteriores
(buffers em memória), sem gravar nada no repositório. Além dos da Etapa 1:

| Arquivo                 | Conteúdo                                             |
| ----------------------- | ---------------------------------------------------- |
| `relatorio.pdf`         | `%PDF-1.4\n` + 1 KB `0x20` + `\n%%EOF`               |
| `notas.txt`             | `abc\n`                                              |
| `servidor.log`          | `linha 1\nlinha 2\n`                                 |
| `apresentacao.pptx`     | `50 4B 03 04` + 1 KB aleatório                       |
| `logs.zip` (1 KB)       | `50 4B 03 04` + 1 KB aleatório                       |
| `foto.jpg`, `foto.jpeg` | `FF D8 FF E0` + 1 KB aleatório                       |
| `imagem.webp`           | `RIFF` + 4 bytes quaisquer + `WEBP` + 1 KB aleatório |

**Como conferir ícone e cor.** O ícone é o `svg` dentro do wrapper
`aria-hidden` do bloco: a classe dele contém a da tabela de
`AttachmentKindIcon` (`lucide-file-text`, `lucide-library`…). A cor é
`getComputedStyle(svg).color`, comparada com o valor de
`getComputedStyle(document.documentElement).getPropertyValue('--file-<categoria>')`
(texto: com `--text-muted`/`muted-foreground`). PDF e DOCX têm o mesmo ícone e
cores **diferentes**.

| #    | Quem | Viewport | Ação                                                                                                                                                | Esperado                                                                                                                                                                                                                                                                                                                                                                                 |
| ---- | ---- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AK1  | M    | 1440×900 | "Novo chamado": anexar `print.png`, `relatorio.pdf`, `notas.txt`, `planilha.xlsx`, `doc.docx`                                                       | 5 blocos lado a lado (mais de um por linha; `<ul>` com 5 `<li>`); em cada um, de cima para baixo: ícone, extensão (`PNG`, `PDF`, `TXT`, `XLSX`, `DOCX`), nome, tamanho, status. Ícone e cor: `lucide-file-image`/imagem, `lucide-file-text`/pdf, `lucide-file`/neutro, `lucide-file-spreadsheet`/planilha, `lucide-file-text`/documento (cor ≠ do PDF). Status `Enviando…` → `Enviado`   |
| AK2  | M    | 1440×900 | seguir AK1: título `[QA] Blocos criação`, resto preenchido, destinatário **M** → `Abrir chamado`                                                    | chamado `K1` criado com 5 linhas em `attachment` (fluxo da Etapa 1 inalterado); o detalhe não exibe anexos (`attachments-card-removal.md`)                                                                                                                                                                                                                                               |
| AK3  | M    | 1440×900 | em K1 (M é destinatário): Conclusão, anexar `apresentacao.pptx`, `backup.rar`, `logs.zip`, `dados.csv`, `servidor.log`; resolver com solução válida | no uploader: `PPTX` `lucide-presentation`/laranja, `RAR` e `ZIP` `lucide-library`/âmbar, `CSV` `lucide-file-spreadsheet`/verde, `LOG` `lucide-file`/neutro; resolvido; **10** linhas em `attachment` para K1                                                                                                                                                                             |
| AK4  | M    | 1440×900 | "Novo chamado": anexar `foto.jpg`, `foto.jpeg`, `imagem.webp`; depois cancelar                                                                      | três blocos `lucide-file-image`/roxo com `JPG`, `JPEG`, `WEBP`; ao cancelar e reabrir, lista vazia (`Nenhum anexo.`)                                                                                                                                                                                                                                                                     |
| AK5  | M    | 1440×900 | atrasar o PUT em 10 s; anexar `print.png`; depois abortar o PUT (`route.abort()`) e anexar `dados.csv`                                              | cada bloco tem o próprio status: o 1º com spinner e `Enviando…` até virar `Enviado`; o 2º com `Falha no envio` e a mensagem `Falha no envio. Remova o arquivo e tente de novo.` completa, sem corte, dentro do bloco. Na árvore de acessibilidade, o status do bloco é `print.png: Enviando…`/`print.png: Enviado` e `dados.csv: Falha no envio` (dentro da região `aria-live="polite"`) |
| AK6  | M    | 1440×900 | com 3 blocos, remover o do meio pelo X                                                                                                              | o X fica no canto superior direito do bloco, nome acessível `Remover <nome>`, alcançável por Tab; após remover, ficam 2 blocos na ordem e o foco volta ao `Anexar`                                                                                                                                                                                                                       |
| AK7  | M    | 1440×900 | com 5 blocos, selecionar um 6º; e um lote de 6 com a lista vazia                                                                                    | igual ao AT11: nunca mais de 5 blocos, toast `Anexe no máximo 5 arquivos.`; nenhum bloco a mais aparece nem por um instante                                                                                                                                                                                                                                                              |
| AK8  | M    | 1440×900 | tentar `setup.pdf` e `pagina.html`                                                                                                                  | nenhum bloco criado; toasts da Etapa 1 (AT7)                                                                                                                                                                                                                                                                                                                                             |
| AK9  | M    | 1440×900 | anexar o PNG de 120 caracteres sem espaço (`a`×116 + `.png`)                                                                                        | bloco da mesma largura dos outros (largura do `<li>` = largura da coluna); nome em no máximo 2 linhas com reticências; `title` com o nome completo; o texto do nó tem os 120 caracteres; extensão `PNG` visível acima                                                                                                                                                                    |
| AK10 | M    | 390×844  | "Novo chamado" com o PNG de 120 caracteres e `relatório ação.pdf`; depois a Conclusão de um chamado em que M é destinatário, com os mesmos          | sem rolagem horizontal (`scrollWidth <= clientWidth` no documento e no `[role="dialog"]`); 2 colunas de blocos no diálogo e na Conclusão; X alcançável; rodapé do diálogo alcançável                                                                                                                                                                                                     |
| AK13 | M    | 1440×900 | "Novo chamado" no tema escuro, com os arquivos de AK1                                                                                               | ícones com as cores do `.dark` (`--file-*` escuros), extensões, nomes e status legíveis                                                                                                                                                                                                                                                                                                  |
| AK14 | —    | —        | toda a bateria                                                                                                                                      | nenhum erro nem aviso de hidratação no console nem no `next-devtools`; nenhum erro de CORS fora dos cenários com interceptação; nenhum e-mail                                                                                                                                                                                                                                            |

AK11 e AK12 (link e árvore de acessibilidade do card do detalhe) saíram com o
card; a numeração dos demais fica, para casar com o relatório de QA de
2026-10-13.

Regressões: AT2, AT12–AT14 e AR8–AR10 continuam valendo, com quem anexa na
Conclusão sendo o destinatário (`attachments-assignee-only.md`); a forma dos
itens que eles descrevem passa a ser a deste contrato.

## Critério de pronto

1. AK1–AK10, AK13 e AK14 aprovados pelo `df-qa`.
2. `attachmentKindFor`, `attachmentExtensionLabel` e
   `describeAttachmentUploadStatus` usados pela UI; nenhum outro arquivo
   decide categoria por extensão ou MIME.
3. Mapa de ícones só em `app/(app)/_components/attachment-kind-icon.tsx`, com
   `satisfies Record<AttachmentKind, …>`.
4. `npx tsc --noEmit`, `npm run lint` e `npm run build` passam; `df-reviewer`
   sem bloqueante.

## Checklist de encerramento

- [x] `ATTACHMENT_KINDS`, `AttachmentKind`, `kind` em `AttachmentTypeSpec` e em cada entrada de `ATTACHMENT_TYPES`, `attachmentKindFor`, `attachmentExtensionLabel`, `describeAttachmentUploadStatus`; plano e este contrato (`df-architect`)
- [ ] `AttachmentKindIcon`, tokens `--file-*` e `--text-micro`, blocos no `AttachmentUploadItem`, grade no `AttachmentUploader` (`df-ui`)
- [ ] cenários do `df-qa`
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm run build`
