# Contrato — Anexos no novo chamado (botão bloqueado e área vazia)

Etapa 2 do plano `docs/plans/ticket-detail-layout-and-comment-card.md` (item 2
do escopo; decisão P2-A lá, não repetida aqui). Este documento é a referência
técnica: constantes, componentes, estrutura e cenários. Ondas: `df-architect`
(constantes) → `df-ui` → `df-reviewer` → `df-qa`.

Ele **altera** `docs/contracts/ticket-creation.md` (seção `NewTicketDialog`) e
`docs/contracts/ticket-resolution.md` (lugar de
`TICKET_ATTACHMENTS_SOON_MESSAGE` e nome do componente do "Anexar" da
Conclusão). Os dois continuam valendo no que não é tocado aqui e trazem uma
revisão de 2026-10-12 apontando para cá.

Versões observadas: `next@16.3.5`, Tailwind v4.

> Revisão de 2026-10-13: no diálogo de novo chamado, a seção `Anexos` deixa de
> ser placeholder — `docs/contracts/ticket-attachments-create-and-download.md`
> prevalece (seletor real, `createTicketSchema.attachments`);
> `new-ticket-attachments.tsx` (`NewTicketAttachments`) foi apagado e a seção
> vive em `app/(app)/_components/attachment-uploader.tsx`. Na Conclusão, o
> `AttachmentsSoonButton` e `TICKET_ATTACHMENTS_SOON_MESSAGE` continuam como
> descritos aqui até a Etapa 2 do plano `docs/plans/ticket-attachments.md`.

## Escopo técnico em uma frase

O "Anexar" bloqueado da Conclusão sobe para o `_components` do grupo `(app)`
com nome genérico e passa a aparecer também no dialog de novo chamado, numa
seção `Anexos` logo abaixo da Descrição que, por ora, mostra `Nenhum anexo.`.

## O que não muda

| Camada                                                                | Mudança                                                             |
| --------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `db/schema.ts`, migration                                             | nenhuma (a tabela `attachment` não é tocada)                        |
| `app/_lib/validation/**` (Zod)                                        | nenhuma — `createTicketSchema` e `CreateTicketInput` sem campo novo |
| `app/_lib/types/**`                                                   | nenhuma — `NewTicketFormAvailable` e `defaults` iguais              |
| `app/_lib/date.ts`                                                    | nenhuma                                                             |
| `app/_lib/data/**`, `app/_lib/storage/**`                             | nenhuma                                                             |
| `app/_lib/actions/**` (`createTicket`)                                | nenhuma — mesma entrada, mesmos outcomes                            |
| e-mail, auth                                                          | nenhuma                                                             |
| `BlockedActionTrigger`, `BlockableOutlineButton` (`app/_components/`) | nenhuma                                                             |

**Fora:** upload, seletor de arquivo (`<input type="file">`), arrastar e soltar,
R2, a tabela `attachment` e qualquer estado de anexo no formulário.

## Domínio — `app/_lib/domain/ticket.ts` (feito nesta onda)

```ts
export const TICKET_ATTACHMENTS_LABEL = "Anexos"
export const ATTACH_FILE_LABEL = "Anexar"
export const NO_ATTACHMENTS_LABEL = "Nenhum anexo."
export const TICKET_ATTACHMENTS_SOON_MESSAGE =
  "Anexos estarão disponíveis em breve."
```

| Constante                         | Uso                                                                                                                             |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `TICKET_ATTACHMENTS_LABEL`        | título visível da seção de anexos (hoje no dialog; amanhã também no detalhe)                                                    |
| `ATTACH_FILE_LABEL`               | texto do botão "Anexar" (nome acessível do botão)                                                                               |
| `NO_ATTACHMENTS_LABEL`            | estado vazio da área de anexos                                                                                                  |
| `TICKET_ATTACHMENTS_SOON_MESSAGE` | **movida** de `app/_lib/domain/ticket-resolution.ts`, sem re-export lá. Texto do toast e do `span` `sr-only` do botão bloqueado |

Por que os rótulos no domínio: é o padrão do projeto para texto de ação e de
estado vazio que mais de uma tela usa ou vai usar (`NO_COMMENTS_LABEL`,
`NO_SOLUTION_LABEL`, `TICKET_CREATOR_LABEL`, `SEND_TO_DEPARTMENT_LABEL`,
`EDIT_COMMENT_LABEL`). Quando o upload existir, o detalhe do chamado e a
Conclusão usarão os mesmos textos.

**Quebra esperada até a Onda 1:** `app/(app)/tickets/[id]/_components/conclusion-blocked-actions.tsx`
importa `TICKET_ATTACHMENTS_SOON_MESSAGE` de `@/app/_lib/domain/ticket-resolution`
e deixa de compilar (`TS2305`). O arquivo é do `df-ui`, que o move e corrige o
import abaixo. É o único erro de `tsc` deixado por esta onda.

## `df-ui` — o que mudar

### Estrutura

```
app/(app)/tickets/[id]/_components/conclusion-blocked-actions.tsx  git mv → app/(app)/_components/attachments-soon-button.tsx
app/(app)/_components/attachments-soon-button.tsx                  AttachmentsSoonButton (era ConclusionBlockedActions)
app/(app)/tickets/[id]/_components/resolve-ticket-form.tsx         alterado — só o import e o nome do componente
app/(app)/_components/new-ticket-attachments.tsx                   novo (sugestão) — NewTicketAttachments, a seção "Anexos"
app/(app)/_components/new-ticket-dialog.tsx                        alterado — a seção abaixo do Controller de "description"
```

`git mv` para manter o histórico. Nenhum outro arquivo importa
`conclusion-blocked-actions` (conferido em 2026-10-12).

O componente sobe ao `_components` do **grupo** `(app)` porque passa a ser
usado por duas rotas do mesmo grupo (o dialog vive no topo de todas as telas do
grupo; a Conclusão, em `/tickets/[id]`) — colocation, seção 5 do `stack.md`.
Não vai para `app/_components/`: conhece um conceito do domínio (anexo do
chamado).

A seção `Anexos` como componente próprio (`NewTicketAttachments`) é sugestão,
no padrão dos campos do dialog já extraídos (`TicketTitleField`,
`TicketDescriptionField`…). Escrevê-la inline no dialog também atende ao
contrato.

### `AttachmentsSoonButton`

Sem props. Mesmo JSX de hoje, com os textos do domínio:

```tsx
import { PaperclipIcon } from "lucide-react"

import BlockableOutlineButton from "@/app/_components/blockable-outline-button"
import BlockedActionTrigger from "@/app/_components/blocked-action-trigger"
import {
  ATTACH_FILE_LABEL,
  TICKET_ATTACHMENTS_SOON_MESSAGE,
} from "@/app/_lib/domain/ticket"

const AttachmentsSoonButton = () => {
  return (
    <BlockedActionTrigger message={TICKET_ATTACHMENTS_SOON_MESSAGE}>
      <BlockableOutlineButton blocked>
        <PaperclipIcon aria-hidden="true" className="size-4" />
        {ATTACH_FILE_LABEL}
      </BlockableOutlineButton>
    </BlockedActionTrigger>
  )
}

export default AttachmentsSoonButton
```

Comportamento — o mesmo de hoje, definido em `docs/contracts/ticket-creation.md`,
"Comportamento do botão de ação bloqueada":

| Entrada        | Hover / foco                                | Ativação                                          |
| -------------- | ------------------------------------------- | ------------------------------------------------- |
| Mouse          | **nada** aparece (sem tooltip, sem `title`) | clique → `toast.info` com a mensagem              |
| Teclado        | só o anel de foco                           | `Enter` ou `Espaço` → `toast.info` com a mensagem |
| Toque          | —                                           | toque → `toast.info` com a mensagem               |
| Leitor de tela | mensagem anunciada pelo `aria-describedby`  | idem                                              |

- **Não submete.** Conferido em `app/_components/blockable-outline-button.tsx:13`:
  `type = "button"` é o padrão e o componente não o recebe aqui. Além disso,
  `BlockedActionTrigger` chama `event.preventDefault()` no clique
  (`app/_components/blocked-action-trigger.tsx:19`). Dentro do `<form>` do
  dialog, nem clique nem `Enter`/`Espaço` no botão disparam o envio.
- `aria-disabled="true"` sem `disabled` nativo: continua na ordem de Tab.
- Toast com `id` estável (`useId` no `BlockedActionTrigger`): cliques
  repetidos não empilham.
- O componente não tem `"use client"` (como hoje): quem o torna cliente é o
  `BlockedActionTrigger`. Funciona dentro do dialog (cliente) e do
  `ResolveTicketForm` (cliente).

### `ResolveTicketForm`

Troca `import ConclusionBlockedActions from "./conclusion-blocked-actions"` por
`import AttachmentsSoonButton from "../../../_components/attachments-soon-button"`
(caminho relativo, como `send-to-department-dialog.tsx:39` já faz com
`handoff-comment-field`) e `<ConclusionBlockedActions />` por
`<AttachmentsSoonButton />`, na mesma posição da linha de botões. Nenhuma outra
mudança.

### Seção `Anexos` no `NewTicketDialog`

**Posição:** dentro do `div.flex.flex-col.gap-4` dos campos, **logo depois**
do `Controller` de `description` e **antes** do de `type`. Ordem de Tab
resultante: Título → Descrição → Anexar → Tipo → Tags → Destinatário →
Cancelar → Abrir chamado.

**Estrutura:**

```tsx
<div role="group" aria-labelledby={labelId} className="flex flex-col gap-1.5">
  <div className="flex items-center justify-between gap-2">
    <FieldTitle id={labelId}>{TICKET_ATTACHMENTS_LABEL}</FieldTitle>
    <AttachmentsSoonButton />
  </div>
  <p className="rounded-lg border border-dashed border-border-strong px-3 py-4 text-center text-sm text-muted-foreground">
    {NO_ATTACHMENTS_LABEL}
  </p>
</div>
```

`labelId` via `useId`. `FieldTitle` é de `app/_components/ui/field.tsx`.

Decisões e por quê:

| Decisão                                                         | Motivo                                                                                                                                                                                                                                                                                                                                                         |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `role="group"` + `aria-labelledby` no título visível            | O leitor de tela anuncia "Anexos, grupo" ao entrar com Tab no botão, ligando o botão e o estado vazio ao título. É o mesmo mecanismo do `Field` do shadcn (`role="group"`)                                                                                                                                                                                     |
| Título com `FieldTitle` (`div`), **não** `FieldLabel`/`<label>` | Não há controle de formulário a rotular: `<label>` sem `htmlFor` válido é semântica errada. `FieldTitle` dá o mesmo visual dos rótulos vizinhos (`text-sm font-medium`)                                                                                                                                                                                        |
| Sem `<fieldset>`/`<legend>`                                     | O `<legend>` tem renderização especial e não entra numa linha flex ao lado do botão sem gambiarra; `role="group"` dá o mesmo anúncio                                                                                                                                                                                                                           |
| Botão **à direita na linha do título**                          | Mantém o dialog compacto (ele já rola em tela baixa) e o botão não muda de lugar quando a lista existir e crescer abaixo. Em 390px, título e botão cabem na mesma linha                                                                                                                                                                                        |
| Estado vazio como `<p>`, **sem** `<ul>`                         | Uma `<ul>` com um `<li>` "Nenhum anexo." seria anunciada como "lista, 1 item" (contagem falsa); uma `<ul>` vazia é anunciada de forma inconsistente entre leitores. É o padrão do projeto: `NO_COMMENTS_LABEL` e "Nenhum evento registrado." são `<p>` fora da lista. Quando o upload existir, a `<ul>` de anexos substitui o `<p>` (contrato daquela feature) |
| Área com `border-dashed border-border-strong`                   | Precedente visual de estado vazio: `app/(app)/_components/ticket-list-empty-state.tsx:13`. Texto `text-sm text-muted-foreground`, como os outros estados vazios                                                                                                                                                                                                |
| Sem live region                                                 | O conteúdo da área não muda nesta etapa                                                                                                                                                                                                                                                                                                                        |

**Fora do formulário:** nenhum `Controller`, nenhum `register`, nenhum campo
novo em `createTicketSchema`/`CreateTicketInput`, nenhum valor em
`options.defaults`. `onSubmit`, `createTicket(values)`, `form.reset`,
`handleOpenChange` e `closeAndDiscard` ficam como estão.

**Toast dentro do dialog modal.** O toast do "Anexar" aparece com o dialog
aberto. Interagir com o toast (clicar nele, arrastá-lo para dispensar) **não
pode fechar o dialog nem descartar o rascunho**. Hoje isso já é possível com o
`toast.error` do envio sem `code`; passa a ser comum, porque todo clique no
"Anexar" gera toast. A proteção tem **duas partes**, e nenhuma funciona
sozinha.

_Por que só `onInteractOutside` não basta._ Com um modal do Radix aberto, a
camada dispensável põe `body.style.pointerEvents = "none"`
(`node_modules/@radix-ui/react-dismissable-layer/dist/index.mjs:113`) e o
overlay do Dialog recebe `pointerEvents: "auto"`
(`node_modules/@radix-ui/react-dialog/dist/index.mjs:122`). O toaster do
Sonner é filho do `body` e o Sonner 2.0.8 não devolve `pointer-events` ao
toast visível: o clique atravessa o toast e cai no overlay. O `event.target`
do `onInteractOutside` passa a ser o overlay, a guarda por
`[data-sonner-toaster]` nunca casa e o dialog fecha.

_Parte 1 — regra global_ (`app/globals.css:323-325`, em `@layer base`):

```css
[data-sonner-toast] {
  pointer-events: auto;
}
```

Devolve o clique ao toast mesmo com o `body` em `pointer-events: none`. Toast
**invisível** continua sem clique: o CSS do Sonner entra sem camada
(`node_modules/sonner/dist/index.mjs:457`,
`[data-sonner-toast][data-visible=false]{opacity:0;pointer-events:none}`) e
declaração sem camada vence qualquer `@layer`. Fora de modal o toast já recebia
clique; nada muda.

_Parte 2 — guarda no dialog_ (`app/(app)/_components/new-ticket-dialog.tsx:74-81`,
ligada em `onInteractOutside` na linha 123): `keepOpenOnToast` chama
`event.preventDefault()` quando `event.target` está dentro de
`[data-sonner-toaster]`. Mesmo padrão de `keepOpenOnAnchor`
(`app/(app)/_components/ticket-search.tsx:114`). Com a parte 1, o alvo passa a
ser o toast e a guarda casa.

_Efeito no app inteiro._ A regra da parte 1 é global, então vale para todo
modal do Radix:

| Onde                                                                                                                                                                                                                           | Antes                                                               | Agora                                                                                           | Avaliação                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| (a) `Dialog` **sem** guarda: `department-form-dialog`, `person-form-dialog`, `tag-form-dialog`, `send-ticket-dialog`, `send-to-department-dialog`, `decline-transfer-dialog`, `remove-avatar-dialog`, `forgot-password-dialog` | clique no toast atravessa, cai no overlay e fecha o dialog          | clique chega ao toast, mas o Radix o vê como "fora do conteúdo" e fecha o dialog do mesmo jeito | sem regressão. Estender a guarda a eles fica **fora** desta etapa |
| (b) `AlertDialog`: `delete-ticket-comment-button`, `deactivate-registry-dialog`, `restore-password-dialog`                                                                                                                     | não fecha por clique fora; o toast não recebia clique nem arrasto   | continua sem fechar por clique fora; o toast agora pode ser clicado e arrastado para dispensar  | melhora                                                           |
| (c) Conteúdo do modal **sob** o toast visível                                                                                                                                                                                  | o clique atravessava o toast e chegava ao overlay (não ao conteúdo) | o toast intercepta o clique enquanto está visível                                               | mudança nova, descrita abaixo                                     |

Sobre (c): o `<Toaster position="top-center" />` (`app/layout.tsx:57`) fica no
topo da tela. Abaixo de 600px de largura o toaster ocupa a largura toda e cobre
o topo do dialog, **inclusive o `X` de fechar**, durante a vida do toast. Depois
que o toast some (ou é dispensado), o que estava por baixo volta a responder. É
o mesmo comportamento de qualquer toast fora de modal, que sempre cobriu o que
estivesse sob ele; não é tratado nesta etapa.

**Rolagem e largura:** o `DialogContent` mantém
`max-h-[calc(100dvh-2rem)] gap-6 overflow-y-auto p-6 sm:max-w-lg`. A seção não
tem largura fixa; o texto do estado vazio quebra linha se precisar.

## Riscos

1. **A área tracejada sugere arrastar e soltar.** Soltar um arquivo sobre o
   dialog faz o navegador abrir o arquivo (comportamento padrão de qualquer
   página do projeto hoje), descartando o rascunho. Não é tratado nesta
   etapa: o texto da área é `Nenhum anexo.`, não um convite a arrastar, e o
   botão diz que anexos estão chegando.
2. **Toast sobre o dialog.** Tratado com a regra global
   `[data-sonner-toast] { pointer-events: auto; }` mais a guarda
   `keepOpenOnToast` no `NewTicketDialog` (ver "Toast dentro do dialog
   modal"); a guarda sozinha não funciona. Efeitos no app: os outros `Dialog`
   sem guarda continuam fechando ao clicar no toast, como antes (estender a
   proteção a eles fica fora desta etapa); `AlertDialog` ganha toast clicável
   e arrastável; e, enquanto visível, o toast passa a interceptar cliques no
   conteúdo do modal sob ele, o que abaixo de 600px inclui o `X` de fechar do
   dialog até o toast sumir.
3. **Dialog mais alto.** A seção soma cerca de 6rem; em telas baixas o dialog
   rola mais cedo. Esperado.

## Cenários para o `df-qa`

Usuários de `docs/contracts/qa-seed.md`: `M` = QA Membro Suporte. Títulos
criados começam com `[QA]`; criação só em QA Suporte. **Não alterar #65 a
#68.** "O botão" = `button` de nome `Anexar` dentro do grupo `Anexos` do dialog
`Novo chamado`.

| #    | Quem | Viewport | Ação                                                                                                                                                                                                                                                                                                              | Esperado                                                                                                                                                                                                                                                                                                                                            |
| ---- | ---- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NA1  | M    | 1440×900 | abrir "Novo chamado"                                                                                                                                                                                                                                                                                              | logo abaixo do campo Descrição e acima de Tipo: título `Anexos` com o botão `Anexar` (ícone de clipe) à direita na mesma linha; abaixo, área tracejada com `Nenhum anexo.`; o grupo existe na árvore de acessibilidade (`role="group"`, nome `Anexos`); **não** há `<ul>`/`<li>` nem `input[type=file]` na seção                                    |
| NA2  | M    | 1440×900 | passar o mouse sobre o botão                                                                                                                                                                                                                                                                                      | botão esmaecido (`opacity-50`), cursor `not-allowed`, sem mudança de fundo; **nada** aparece (sem tooltip, sem `title`)                                                                                                                                                                                                                             |
| NA3  | M    | 1440×900 | com o foco na Descrição, `Tab`                                                                                                                                                                                                                                                                                    | o foco vai para o botão `Anexar`, com anel visível; **nada** aparece além do anel; a árvore de acessibilidade mostra o botão com `aria-disabled="true"` e descrição `Anexos estarão disponíveis em breve.`; o próximo `Tab` leva ao Tipo                                                                                                            |
| NA4  | M    | 1440×900 | preencher Título `[QA] Anexos rascunho` e uma Descrição válida; clicar no botão                                                                                                                                                                                                                                   | toast informativo `Anexos estarão disponíveis em breve.`; o dialog continua aberto, os valores continuam lá, nenhum seletor de arquivo abre, nenhum erro de validação aparece (o formulário não foi enviado); nenhum chamado novo no banco (`select count(*) from ticket where title = '[QA] Anexos rascunho'` = 0)                                 |
| NA5  | M    | 1440×900 | no mesmo rascunho, foco no botão, `Enter`; depois `Espaço`; depois clicar no botão mais 3 vezes                                                                                                                                                                                                                   | cada ativação mostra o mesmo toast; os toasts **não empilham** (um só visível); o foco continua no botão; dialog aberto, valores mantidos, sem envio, sem seletor de arquivo                                                                                                                                                                        |
| NA6  | M    | 1440×900 | com o toast visível, clicar nele; depois deixá-lo sumir                                                                                                                                                                                                                                                           | o dialog **continua aberto** e o rascunho intacto; o clique chega ao toast (não atravessa para o overlay). Se fechar, registrar como falha (ver "Toast dentro do dialog modal")                                                                                                                                                                     |
| NA7  | M    | 1440×900 | preencher todos os campos (Título `[QA] Anexos criação`, Descrição válida, Tipo, tag `[QA] Acesso`, Destinatário `Fila de QA Suporte`), clicar `Anexar` uma vez e depois `Abrir chamado`                                                                                                                          | toast `Chamado #N criado.`; dialog fecha; no banco, uma linha em `ticket` com esse título, uma `ticket_tag`, uma `ticket_history` `criacao`; **nenhuma** linha em `attachment` para o chamado (`select count(*) from attachment where ticket_id = N` = 0)                                                                                           |
| NA8  | M    | 1440×900 | abrir o dialog, digitar no Título, `Cancelar`; reabrir. Repetir fechando pelo `X` e por `Esc`                                                                                                                                                                                                                     | ao reabrir, campos vazios (reset inalterado) e a seção `Anexos` igual à de NA1                                                                                                                                                                                                                                                                      |
| NA9  | M    | 1440×900 | abrir `/tickets/N` (chamado de NA7, `aberto`, na fila de QA Suporte, sem destinatário; M é o autor e resolve)                                                                                                                                                                                                     | card Conclusão com o campo Solução e, na linha de botões, `Anexar` bloqueado no mesmo lugar de antes, com o mesmo visual; clique, `Enter` e `Espaço` → toast `Anexos estarão disponíveis em breve.`; a solução **não** é enviada (status continua `aberto` no banco)                                                                                |
| NA10 | M    | 390×844  | abrir "Novo chamado"                                                                                                                                                                                                                                                                                              | título `Anexos` e botão na mesma linha, sem corte; área com `Nenhum anexo.` visível; **sem rolagem horizontal** (`document.documentElement.scrollWidth <= document.documentElement.clientWidth`, e o mesmo para o `[role="dialog"]`); o dialog rola por dentro até o rodapé (`scrollHeight > clientHeight` no `[role="dialog"]`, rodapé alcançável) |
| NA11 | M    | 390×844  | tocar no botão                                                                                                                                                                                                                                                                                                    | toast aparece; dialog aberto; sem seletor de arquivo                                                                                                                                                                                                                                                                                                |
| NA12 | M    | —        | toda a bateria                                                                                                                                                                                                                                                                                                    | nenhum erro nem aviso de hidratação no console nem no `next-devtools`; nenhum e-mail                                                                                                                                                                                                                                                                |
| NA13 | M    | 390×844  | abrir "Novo chamado", digitar no Título, tocar em `Anexar`; com o toast visível, tocar no `X` do dialog; esperar o toast sumir (ou dispensá-lo) e tocar no `X` de novo                                                                                                                                            | com o toast visível e sobre o `X` (conferir com `elementFromPoint` no centro do `X`), o toque cai no toast (efeito esperado, ver "Toast dentro do dialog modal" item c) e o dialog **continua aberto**, rascunho intacto; depois que o toast some, o `X` volta a responder e fecha o dialog; ao reabrir, campos vazios                              |
| NA14 | M    | 1440×900 | em `/tickets/N` (chamado de NA7), publicar dois comentários `[QA] c1` e `[QA] c2`; excluir `[QA] c1` (gera o toast de sucesso) e, com o toast visível, abrir a exclusão de `[QA] c2` (`AlertDialog`); clicar no toast e arrastá-lo para dispensar; depois `Cancelar`; reabrir a exclusão de `[QA] c2` e confirmar | o toast responde ao clique e é dispensado pelo arrasto; o `AlertDialog` **não fecha** por essa interação; `Cancelar` fecha sem excluir (`[QA] c2` continua na tela e no banco); a confirmação exclui normalmente (`[QA] c2` some da tela e do banco), com novo toast de sucesso                                                                     |

## Critério de pronto

1. Cenários NA1–NA14 aprovados pelo `df-qa`.
2. Nenhuma referência a `ConclusionBlockedActions` ou
   `conclusion-blocked-actions` fora de `docs/`; nenhuma importação de
   `TICKET_ATTACHMENTS_SOON_MESSAGE` de `ticket-resolution`.
3. `npx tsc --noEmit`, `npm run lint` e `npm run build` passam; `df-reviewer`
   sem bloqueante.

## Checklist de encerramento

- [x] constantes em `app/_lib/domain/ticket.ts`; `TICKET_ATTACHMENTS_SOON_MESSAGE` fora de `ticket-resolution.ts` (`df-architect`)
- [ ] `git mv` para `app/(app)/_components/attachments-soon-button.tsx` (`AttachmentsSoonButton`, textos do domínio), `ResolveTicketForm` com o nome novo, seção `Anexos` no `NewTicketDialog` (`df-ui`)
- [ ] cenários do `df-qa`
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm run build`
