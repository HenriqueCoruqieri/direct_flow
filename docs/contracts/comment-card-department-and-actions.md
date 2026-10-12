# Contrato — Card de comentário: setor do autor e ações só com ícone

Etapa 3 do plano `docs/plans/ticket-detail-layout-and-comment-card.md` (item 3
do escopo; decisões P3-A a P6-A lá, não repetidas aqui). Este documento é a
referência técnica: tipo, query, componentes, composição de gatilhos e
cenários. Ondas: `df-architect` (tipo) → `df-data` ‖ `df-ui` → `df-reviewer` →
`df-qa`.

Ele **altera** três contratos, que continuam valendo no que não é tocado aqui e
trazem uma revisão de 2026-10-12 apontando para cá:

- `docs/contracts/ticket-resolution.md` — forma de `TicketMessageItem` e a
  query do `listTicketMessages`
- `docs/contracts/queue-default-and-comment-edit.md` (etapa 6) — botão "Editar"
  do comentário
- `docs/contracts/queue-tabs-comment-delete-and-attend.md` (seção 2) — botão
  "Excluir" do comentário

Versões observadas: `next@16.3.5`, `drizzle-orm@0.45.2`, `radix-ui@1.6.7`
(`@radix-ui/react-tooltip@1.2.16`, `@radix-ui/react-alert-dialog@1.1.23`,
`@radix-ui/react-slot@1.3.3`, `@radix-ui/react-popper@1.3.7`,
`@floating-ui/dom@1.8.0`), Tailwind v4. O `package.json` declara
`"radix-ui": "^1.6.7"`; só o `package-lock.json` fixa as versões acima.

**Revisão pós-QA (2026-10-12).** O CC8 falhou no primeiro relatório
(`docs/test-reports/2026-10-12-comment-card-department-and-actions.md`): o
tooltip não abria no foco por teclado quando o foco rolava a lista. Seções
alteradas: "Tooltip (P6-A)", "Composição dos gatilhos", "Tooltip e foco
devolvido" (assinatura do hook), nova "Tooltip e rolagem da lista", "Riscos"
(6 e 7) e cenários CC2, CC8 e CC9.

## Escopo técnico em uma frase

Cada comentário passa a mostrar, no fim do cabeçalho, um badge com o setor
**atual** do autor (join `users.department_id → department` no
`listTicketMessages`); "Editar" e "Excluir" descem para uma linha própria
abaixo do texto, alinhada à direita, só com ícone e tooltip.

## O que não muda

| Camada                                     | Mudança                                                                                                  |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `db/schema.ts`, migration                  | nenhuma — `users.department_id` já é `not null` com FK `restrict` para `department` (`db/schema.ts:122`) |
| `app/_lib/validation/**` (Zod)             | nenhuma                                                                                                  |
| `app/_lib/date.ts`                         | nenhuma                                                                                                  |
| regras de `app/_lib/domain/**`             | nenhuma — quem vê, edita e exclui comentário continua igual                                              |
| `app/_lib/actions/**`                      | nenhuma — `editTicketComment` e `deleteTicketComment` iguais                                             |
| demais funções de `ticket-messages.ts`     | nenhuma — `insertTicketMessage`, `updateTicketMessage`, `deleteTicketMessage`                            |
| e-mail, auth, storage                      | nenhuma                                                                                                  |
| `TicketCommentForm` (novo comentário)      | nenhuma                                                                                                  |
| modo de edição do comentário               | nenhuma — `Textarea` + `Cancelar`/`Salvar` como hoje (`ticket-comment-editor.tsx:135-195`)               |
| `AlertDialog` de exclusão (conteúdo)       | nenhuma — título, descrição, botões, pendência e resultados como hoje                                    |
| `aria-label` de "Editar" e "Excluir"       | nenhuma — `Editar comentário de {autor} de {data/hora}` e `Excluir comentário de {autor} de {data/hora}` |
| `ScrollToEndArea` e a lista de comentários | nenhuma                                                                                                  |

**Fora:** setor do autor **no momento** do comentário (seria coluna
`message.department_id` com backfill; descartado em P3); qualquer mudança de
permissão.

## Tipos — `app/_lib/types/ticket-comments.ts` (feito nesta onda)

```ts
export interface TicketMessageItem {
  id: number
  authorId: number
  authorName: string
  authorDepartmentName: string // novo
  content: string
  visibility: MessageVisibility
  createdAt: Date
  updatedAt: Date
}
```

- `authorDepartmentName` = `department.name` do setor **atual** do autor. Se o
  autor trocar de setor, todos os comentários dele passam a mostrar o setor
  novo (P3-A, aceito).
- Nunca vazio nem nulo: `users.department_id` é `not null`, a FK é `restrict` e
  `department.name` é `not null`. Setor inativo continua aparecendo pelo nome,
  como pessoa inativa já aparece pelo nome.
- O tipo continua plano e serializável (atravessa Server → Client no
  `TicketCommentEditor`, via `defaults`; o badge é renderizado no Server
  Component `TicketCommentItem`).

**Quem constrói `TicketMessageItem`:** só `listTicketMessages`
(`app/_lib/data/ticket-messages.ts:24`, dono `df-data`). Conferido em
2026-10-12: nenhum fixture, seed ou outro select monta o tipo. Os demais usos
são `Pick<TicketMessageItem, "id">` e `Pick<TicketMessageItem, "id" |
"content">` em `app/_lib/domain/ticket-comments.ts`, que não são afetados.

**Quebra esperada até a Onda 1:** `app/_lib/data/ticket-messages.ts(32,3)`
`TS2322` (`authorDepartmentName` ausente no retorno). É o único erro de `tsc`
deixado por esta onda; o `df-data` corrige abaixo.

## Domínio — `app/_lib/domain/ticket-comments.ts`

Textos reaproveitados (valores reais, conferidos em 2026-10-12):

| Constante              | Valor       | Uso nesta etapa                                                     |
| ---------------------- | ----------- | ------------------------------------------------------------------- |
| `EDIT_COMMENT_LABEL`   | `"Editar"`  | conteúdo do tooltip do lápis; prefixo do `aria-label` (como hoje)   |
| `DELETE_COMMENT_LABEL` | `"Excluir"` | conteúdo do tooltip da lixeira; prefixo do `aria-label` (como hoje) |

Texto novo (feito nesta onda):

```ts
export const COMMENT_AUTHOR_DEPARTMENT_LABEL = "Setor"
```

Uso: prefixo **só para leitor de tela** dentro do badge
(`<span className="sr-only">{COMMENT_AUTHOR_DEPARTMENT_LABEL}: </span>`). Sem
ele, o cabeçalho é lido como "QA Membro Suporte, 12/10/2026 14:32, Privado, QA
Suporte", e o nome do setor solto não diz o que é; com ele, "…, Setor: QA
Suporte". Visualmente o badge mostra só o nome.

## `df-data` — `listTicketMessages` (alterado)

`app/_lib/data/ticket-messages.ts:24`. Uma mudança só:

- acrescentar `.innerJoin(department, eq(department.id, user.departmentId))`
  depois do join com `user` (`ticket-messages.ts:43`), importando `department`
  de `@/db/schema`;
- selecionar `authorDepartmentName: department.name`.

`inner join` é seguro: `users.department_id` é `not null` com FK, então o join
não descarta nenhuma mensagem. Escopo de visibilidade (`visibleToViewer`),
filtro por `ticketId`, ordem (`created_at asc, id asc`), assinatura e retorno
ficam como estão. O índice `user_department_idx` existe, mas o join é pela PK
de `department`; nenhum índice novo.

## `df-ui` — o que mudar

### Estrutura

```
app/(app)/tickets/[id]/_components/ticket-comment-item.tsx            alterado — badge do setor no cabeçalho
app/(app)/tickets/[id]/_components/ticket-comment-body.tsx            alterado — ações em linha própria abaixo do texto
app/(app)/tickets/[id]/_components/ticket-comment-editor.tsx          alterado — lápis só-ícone com tooltip
app/(app)/tickets/[id]/_components/delete-ticket-comment-button.tsx   alterado — lixeira só-ícone com tooltip
app/(app)/tickets/[id]/_hooks/use-focus-return-tooltip.ts             novo — ver "Tooltip e foco devolvido" e "Tooltip e rolagem da lista"
```

Nenhum arquivo novo em `app/_components/`. `TooltipProvider` **já está
montado** na raiz (`app/layout.tsx:56`, `delayDuration` padrão do primitivo = 0,
`app/_components/ui/tooltip.tsx:9`): cada botão usa só `Tooltip`,
`TooltipTrigger` e `TooltipContent`, sem provider próprio. Precedente de uso:
`app/(app)/registry/_components/reactivate-registry-button.tsx:44`.

### Cabeçalho — badge do setor (`TicketCommentItem`)

Último filho da `div` do cabeçalho (`ticket-comment-item.tsx:58`, `flex
flex-wrap items-center gap-x-2 gap-y-1`), depois de nome, data, `(editado)` e
`Privado`:

```tsx
<Badge variant="outline" className="ml-auto max-w-full">
  <span className="sr-only">{COMMENT_AUTHOR_DEPARTMENT_LABEL}: </span>
  <span className="truncate">{message.authorDepartmentName}</span>
</Badge>
```

| Aspecto             | Decisão                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Posição             | `ml-auto` empurra o badge para a borda direita da linha. Se não couber, o `flex-wrap` o leva para a linha de baixo, onde o `ml-auto` continua a alinhá-lo à direita                                                                                                                                                                                                             |
| Em todo comentário  | sem condição: público, privado, do próprio setor ou de outro                                                                                                                                                                                                                                                                                                                    |
| Ordem com `Privado` | `Privado` fica onde está (junto dos metadados, à esquerda); o setor é sempre o último                                                                                                                                                                                                                                                                                           |
| Nome longo          | **truncar com reticências**. O `Badge` é `inline-flex`, `whitespace-nowrap`, `overflow-hidden` e `shrink-0` (`app/_components/ui/badge.tsx:8`): `max-w-full` limita o badge à largura do cabeçalho, e o texto vai num `span` `truncate` (reticência não aparece em texto solto de um contêiner flex; o `overflow-hidden` do `span` zera o tamanho mínimo automático dele)       |
| Sem `title`         | o nome inteiro continua no DOM e é lido por inteiro pelo leitor de tela; `title` não abre por teclado nem por toque e alguns leitores o anunciam em dobro. Segue o precedente do projeto, que trunca sem `title` (`app/(app)/_components/app-sidebar.tsx:83`, `mobile-header.tsx:27`). Nome de setor tem no máximo 80 caracteres (`REGISTRY_NAME_MAX_LENGTH`, `registry.ts:11`) |
| Sem ícone           | o badge mostra só o nome; o `LockIcon` continua exclusivo do `Privado`                                                                                                                                                                                                                                                                                                          |

### Corpo — ações abaixo do texto (`TicketCommentBody`)

A `div` lado a lado (`ticket-comment-body.tsx:8`) dá lugar a uma coluna: o texto
ocupa a largura toda e as ações vão numa linha própria abaixo, alinhadas à
direita (P4-A).

```tsx
<div className="flex flex-col gap-1">
  {children}
  {hasActions ? <div className="flex justify-end gap-1">{actions}</div> : null}
</div>
```

- A linha de ações só existe se houver ação (mesma checagem de hoje:
  `actions !== undefined && actions !== null`). Comentário sem permissão não
  ganha linha vazia nem espaço extra.
- Props de `TicketCommentBody` (`children`, `actions?`) **não mudam**; quem o
  chama (`TicketCommentItem` e `TicketCommentEditor`) não precisa saber do novo
  arranjo.
- Ordem das ações: lápis, depois lixeira (como hoje). Ordem de Tab igual à
  visual.
- Ajuste fino opcional, a critério do `df-ui`: margem negativa (`-mr-1`/`-mb-1`)
  para o ícone encostar visualmente na borda do texto; não é exigido.

### Botões só com ícone

Os dois botões passam de `size="xs"` com ícone + texto para `size="icon-sm"`
(`size-7`, `app/_components/ui/button.tsx:32`) só com ícone, em 14px (P5-A).

| Aspecto            | Lápis (`TicketCommentEditor`)                                        | Lixeira (`DeleteTicketCommentButton`)                                                                                                        |
| ------------------ | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `variant` / `size` | `ghost` / `icon-sm`                                                  | `ghost` / `icon-sm`                                                                                                                          |
| Ícone              | `<PencilIcon aria-hidden="true" className="size-3.5" />`             | `<Trash2Icon aria-hidden="true" className="size-3.5" />`                                                                                     |
| Cor                | `text-muted-foreground` (hover do `ghost` → `foreground`, como hoje) | **sempre** `text-destructive`                                                                                                                |
| Hover / aberto     | o do `ghost` (`hover:bg-muted`)                                      | `hover:bg-destructive/10 hover:text-destructive aria-expanded:bg-destructive/10 aria-expanded:text-destructive dark:hover:bg-destructive/20` |
| Texto visível      | nenhum (o `{EDIT_COMMENT_LABEL}` sai do botão)                       | nenhum (o `{DELETE_COMMENT_LABEL}` sai do botão)                                                                                             |
| `aria-label`       | o de hoje (`editAriaLabel`)                                          | o de hoje (`ariaLabel`)                                                                                                                      |

- **Tamanho do ícone explícito:** `icon-sm` não define tamanho de `svg`; sem a
  classe, vale a regra base do `Button` (`[&_svg:not([class*='size-'])]:size-4`,
  16px). Hoje, com `xs`, o ícone tem 12px (`size-3`). Por isso `size-3.5` no
  ícone.
- **`data-icon="inline-start"` sai:** só servia para o padding assimétrico das
  variantes com texto.
- **Por que as sobreposições na lixeira:** o `ghost` troca a cor para
  `hover:text-foreground` e `aria-expanded:text-foreground`
  (`button.tsx:18`); sem as classes acima, a lixeira ficaria cinza-escura no
  hover e enquanto o `AlertDialog` está aberto (o `AlertDialogTrigger` põe
  `aria-expanded="true"`). O fundo no hover segue a paleta da variante
  `destructive` (`button.tsx:20`). O anel de foco é o padrão do `Button`.
- `disabled={isPending}` da lixeira continua.

### Tooltip (P6-A)

Conteúdo: `EDIT_COMMENT_LABEL` no lápis, `DELETE_COMMENT_LABEL` na lixeira, via
`TooltipContent hideWhenDetached` de `app/_components/ui/tooltip.tsx`, lado
padrão (`top`). O conteúdo vai para um portal, então a área de rolagem da lista
(`overflow-y-auto`) não o corta; por isso mesmo o `hideWhenDetached` é
obrigatório: sem ele, um balão que continua aberto enquanto a lista rola
ficaria flutuando por cima do resto da página com o botão já fora da área
visível.

Quando abre:

| Entrada                                                                          | Tooltip                                                                                                                                   |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| mouse sobre o botão                                                              | abre (sem atraso, `delayDuration` 0 do provider); fecha ao sair                                                                           |
| foco por `Tab` / `Shift+Tab`                                                     | abre, **inclusive quando o foco faz a lista rolar** para mostrar o botão; fecha no `blur` ou com `Esc`                                    |
| rolagem da lista (roda do mouse, teclado) com o botão focado por teclado         | continua aberto; fica invisível enquanto o botão está fora da área visível da lista e reaparece quando o botão volta (`hideWhenDetached`) |
| rolagem com o botão sem foco de teclado (só hover)                               | fecha (comportamento do Radix)                                                                                                            |
| clique no botão                                                                  | fecha (comportamento do Radix no `pointerdown`/`click`)                                                                                   |
| toque                                                                            | não abre (o Radix ignora `pointerType === "touch"`)                                                                                       |
| **foco devolvido por código** (fim da edição; `AlertDialog` fechado sem excluir) | **não abre**. Abre de novo no próximo hover ou no próximo foco por teclado                                                                |

Leitor de tela: com o tooltip aberto, o Radix liga o trigger ao conteúdo por
`aria-describedby`; o botão é anunciado como "Editar comentário de … , Editar"
(nome pelo `aria-label`, descrição pelo tooltip). Redundância aceita: o nome
acessível continua sendo o `aria-label` de hoje.

### Composição dos gatilhos

**Lixeira — tooltip por fora, dialog por dentro:**

```tsx
<AlertDialog open={open} onOpenChange={handleOpenChange}>
  <Tooltip {...tooltipProps}>
    <TooltipTrigger asChild {...triggerProps}>
      <AlertDialogTrigger asChild>
        <Button … aria-label={ariaLabel}>
          <Trash2Icon aria-hidden="true" className="size-3.5" />
        </Button>
      </AlertDialogTrigger>
    </TooltipTrigger>
    <TooltipContent hideWhenDetached>{DELETE_COMMENT_LABEL}</TooltipContent>
  </Tooltip>

  <AlertDialogContent onCloseAutoFocus={handleCloseAutoFocus}>…igual…</AlertDialogContent>
</AlertDialog>
```

- Os dois `asChild` viram `Slot`, que **soma** os handlers (`onClick`,
  `onFocus`, `onPointerDown`…) e **compõe** os `ref`s
  (`@radix-ui/react-slot@1.3.3`, `getElementRef` lê `props.ref` no React 19).
  O `Button` recebe os dois conjuntos; nenhum anula o outro.
- Ordem escolhida (padrão da documentação do shadcn): `Tooltip` envolve o
  `AlertDialogTrigger`, e os dois ficam **dentro** do `AlertDialog` (raiz sem
  DOM). `AlertDialogContent` continua **fora** do `Tooltip`.
- O `ref` que o `AlertDialog` usa para devolver o foco (`context.triggerRef`,
  focado em `onCloseAutoFocus` pelo próprio Radix,
  `node_modules/@radix-ui/react-dialog/dist/index.mjs:154-157`) chega ao
  `Button` pelo `AlertDialogTrigger`; o `ref` do `TooltipTrigger` (posição do
  balão) também. Nada muda em `handleCloseAutoFocus`: depois de excluir, ele
  chama `preventDefault()` e foca o `h2#ticket-comments-heading`; ao cancelar,
  sai cedo e o Radix foca a lixeira.
- `data-state` conflita (os dois gatilhos o definem; prevalece o do tooltip). Não
  afeta nada: nenhuma classe do `Button` usa `data-state`; o estado do dialog
  continua exposto por `aria-expanded`, que é o que o `ghost` estiliza.

**Lápis:**

```tsx
<Tooltip {...tooltipProps}>
  <TooltipTrigger asChild {...triggerProps}>
    <Button ref={editButtonRef} … aria-label={editAriaLabel} onClick={startEditing}>
      <PencilIcon aria-hidden="true" className="size-3.5" />
    </Button>
  </TooltipTrigger>
  <TooltipContent hideWhenDetached>{EDIT_COMMENT_LABEL}</TooltipContent>
</Tooltip>
```

O `editButtonRef` fica **no `Button`** (não no `TooltipTrigger`): o `Slot`
compõe o `ref` do filho com o do trigger, e o `useEffect` que devolve o foco
depois da edição (`ticket-comment-editor.tsx:54-64`) continua chamando
`editButtonRef.current?.focus()` no elemento certo.

### Tooltip e foco devolvido

**Problema (risco 2 do plano).** O `TooltipTrigger` abre o tooltip em qualquer
`focus` que não venha de um `pointerdown` no próprio botão
(`@radix-ui/react-tooltip@1.2.16`, `dist/index.mjs:208-210`). Foco devolvido por
código conta: ao cancelar a exclusão, o Radix foca a lixeira e o balão
`Excluir` aparece; ao salvar ou cancelar a edição, `editButtonRef.current?.focus()`
abre `Editar`. Para quem usou o mouse, o balão fica parado na tela até um clique
fora ou `Esc` (não há `pointerleave`, o ponteiro não está sobre o botão).

**Comportamento exigido:** foco devolvido por código **não** abre o tooltip; o
foco (com o anel, quando houver) vai para o botão normalmente. Hover e
`Tab`/`Shift+Tab` continuam abrindo.

**Mecanismo implementado** (`use-focus-return-tooltip.ts`):

- tooltip **controlado** (`open` + `onOpenChange`) com uma marca de "próximo
  foco é devolvido" (`useRef<boolean>`);
- quem devolve o foco liga a marca (`markFocusReturn()`) **imediatamente
  antes**: em `handleCloseAutoFocus`, no ramo de cancelar (antes do `return`
  cedo); no `useEffect` da edição, antes de `editButtonRef.current?.focus()`;
- em `onOpenChange(true)` com a marca ligada: desliga a marca e **não** abre;
- `triggerProps.onBlur` desliga a marca (garante que ela não sobreviva e
  bloqueie um hover posterior).

Por que funciona: no modo controlado o Radix chama `onOpenChange` de forma
síncrona dentro do `focus` (`handleOpen` → `setOpen` → callback,
`@radix-ui/react-use-controllable-state`), então a marca é consumida pelo
próprio foco devolvido; o hover passa por outro caminho
(`onTriggerEnter`) depois que a marca já foi desligada. Usar
`event.preventDefault()` no `onFocus` para pular o handler do Radix **não** é
aceito: dependeria de detalhe do evento sintético do React num evento não
cancelável.

Os dois botões usam o mesmo hook, no `_hooks` da rota (colocation, seção 5 do
`stack.md`), com exportação nomeada:

```ts
useFocusReturnTooltip(): UseFocusReturnTooltipResult

interface UseFocusReturnTooltipResult {
  tooltipProps: { open: boolean; onOpenChange: (open: boolean) => void }
  triggerProps: {
    onFocus: (event: FocusEvent<HTMLElement>) => void
    onBlur: () => void
  }
  markFocusReturn: () => void
}
```

(No código cada objeto aninhado é `interface` nomeada:
`FocusReturnTooltipProps`, `FocusReturnTooltipTriggerProps`.) `tooltipProps`
vai no `Tooltip`, `triggerProps` no `TooltipTrigger` (o `Slot` compõe os dois
handlers com os do Radix e os do `AlertDialogTrigger`), e `markFocusReturn` é
chamado por quem devolve o foco. O antigo `onTriggerBlur` deixou de existir:
`triggerProps.onBlur` o substitui, e `triggerProps.onFocus` guarda o elemento
focado para o tratamento de rolagem abaixo.

### Tooltip e rolagem da lista

**Problema (falha do CC8 no primeiro relatório).** O conteúdo do tooltip
registra, enquanto está montado, um listener de `scroll` com captura em
`window` que fecha o balão quando o elemento rolado contém o trigger
(`node_modules/@radix-ui/react-tooltip/dist/index.mjs:316-326`, dentro do
`TooltipContentImpl`, declarado na linha 297). No foco por teclado, o navegador
rola a lista de comentários (160px de altura a 1440×900) para mostrar o botão
logo depois de o `focus` abrir o tooltip; o Radix fecha em seguida, e quem
navega por teclado perde o rótulo justamente nos botões que estavam fora da
área visível.

**Comportamento exigido:** com o botão focado por teclado (`:focus-visible`), a
rolagem de um ancestral **não** fecha o tooltip. Fecha no `blur`, com `Esc` e
no clique, como antes. Enquanto o botão está fora da área visível da lista, o
balão fica invisível (`hideWhenDetached`) e reaparece quando o botão volta.

**Mecanismo implementado** (`use-focus-return-tooltip.ts:32-78`):

- na montagem do hook, dois listeners de `scroll` com captura: um em `window`
  (`markScrollWhileFocused`) e um em `document` (`clearScrollWhileFocused`);
- o de `window` liga a flag `scrollWhileFocusedRef` só se, naquele despacho, o
  tooltip está aberto (`openRef`), há trigger focado (guardado por
  `triggerProps.onFocus`), o elemento rolado contém o trigger e o trigger casa
  com `:focus-visible`; senão, desliga;
- `onOpenChange(false)` com a flag ligada é ignorado;
- o de `document` desliga a flag no mesmo despacho, logo depois (no caminho de
  captura, `window` vem antes de `document`); assim a flag vale só para o
  fechamento disparado por aquele `scroll`, e um `Esc` ou `blur` posterior
  fecha normalmente;
- `triggerProps.onBlur` também desliga a flag e esquece o trigger;
- `hideWhenDetached` no `TooltipContent` passa ao Popper o middleware `hide`
  com `referenceHidden` (`@radix-ui/react-popper@1.3.7`,
  `dist/index.mjs:161-163` e `214-217`: `visibility: hidden` e
  `pointer-events: none`); a posição é recalculada pelos listeners de `scroll`
  que o `autoUpdate` do Floating UI põe nos ancestrais roláveis
  (`@floating-ui/dom@1.8.0`, `dist/floating-ui.dom.mjs:635`).

Rolagem com o botão só sob o mouse (sem `:focus-visible`) continua fechando o
balão, como no Radix: o tratamento é para quem navega por teclado.

**Dependência de detalhes internos do Radix (não documentados).** O mecanismo
só funciona porque, em `@radix-ui/react-tooltip@1.2.16`:

1. o fechamento por rolagem é um listener de **captura em `window`**
   (`dist/index.mjs:323`);
2. ele é registrado num `useEffect` do `TooltipContentImpl`
   (`dist/index.mjs:316-326`), que só existe com o conteúdo montado, isto é,
   depois de o tooltip abrir. O nosso listener, registrado na montagem do
   botão, vem antes na lista de `window` e roda primeiro, ligando a flag antes
   de o Radix chamar `onClose`;
3. nenhum listener do Radix escuta `scroll` em `document` (os únicos
   `addEventListener` do arquivo estão nas linhas 206, 268-269, 290, 313 e
   323; o de 313 é o evento interno `TOOLTIP_OPEN`). Se houvesse, ele rodaria
   depois do nosso `clearScrollWhileFocused` e fecharia o balão.

O `package.json` declara `"radix-ui": "^1.6.7"`; só o lockfile fixa a versão.
Uma atualização que mude qualquer um dos três pontos faz o CC8 voltar a falhar
**em silêncio** (sem erro de tipo, de lint ou de build). Por isso:

- **toda atualização de `radix-ui`** (ou de `@radix-ui/react-tooltip`,
  `@radix-ui/react-popper`, `@floating-ui/dom` no lockfile) exige repetir o
  CC8 e os CC9–CC13 no navegador antes de comitar;
- quem atualiza confere os três pontos acima no `dist/index.mjs` da nova
  versão e, se as linhas mudarem, atualiza as referências deste contrato.

Exceções conhecidas, só em desenvolvimento e sem quebra: (a) Fast Refresh com o
tooltip aberto remonta o efeito do hook depois do do Radix e inverte a ordem
dos listeners em `window` até o próximo ciclo de abrir e fechar; (b)
`cacheComponents` / `<Activity>` (hoje desligado em `next.config.ts`) faria o
mesmo ao reexibir uma árvore oculta. Nos dois casos o efeito é o comportamento
anterior (o balão fecha ao rolar), não erro.

## Riscos

1. **Badge em coluna estreita** (risco 3 do plano). Na coluna `lg` (1/3 da
   largura) e a 390px, o badge costuma descer de linha quando há `(editado)` e
   `Privado`; desce alinhado à direita. Nome longo trunca.
2. **Setor atual, não histórico** (P3-A). Comentário antigo de quem mudou de
   setor mostra o setor novo. Aceito.
3. **Tooltip e foco devolvido.** Tratado acima. Sem o tratamento, o balão abre
   sozinho depois de cancelar a exclusão e depois de editar.
4. **Ícone só com tooltip.** Em toque, não há tooltip; o significado vem do
   ícone (lápis, lixeira vermelha) e do `aria-label`. Aceito em P6-A.
5. **Área de toque.** `icon-sm` tem 28px, abaixo dos 44px recomendados para
   toque; o mesmo dos botões `xs` de hoje (24px de altura). Não tratado nesta
   etapa.
6. **Tooltip depende de detalhe interno do Radix.** O tooltip aberto durante a
   rolagem da lista depende de três detalhes não documentados de
   `@radix-ui/react-tooltip@1.2.16` (ver "Tooltip e rolagem da lista"), e o
   `^1.6.7` do `package.json` deixa uma atualização mudá-los sem aviso. A
   quebra é silenciosa: o balão volta a fechar quando o foco rola a lista.
   Mitigação: repetir CC8–CC13 a cada atualização de `radix-ui` e conferir as
   linhas citadas.
7. **Ordem dos listeners em desenvolvimento.** Fast Refresh com o tooltip
   aberto (e `cacheComponents`/`<Activity>`, se um dia for ligado) inverte a
   ordem dos listeners de `scroll` até o próximo ciclo; o balão fecha ao rolar,
   como antes da correção. Sem efeito em produção hoje. Se `cacheComponents`
   for ligado, o CC8 entra na verificação dessa mudança.

## Cenários para o `df-qa`

Usuários de `docs/contracts/qa-seed.md`: `M` = QA Membro Suporte, `A` = QA
Admin Suporte, `I` = QA Admin Infra. Títulos e textos criados começam com
`[QA]`; criação só em QA Suporte. **Não alterar #65 a #68.** Não alterar setor
de nenhum usuário QA (o seed não corrige depois). "O cabeçalho" = primeira
`div` do `li` do comentário; "a linha de ações" = a `div` com os botões abaixo
do texto; "o lápis" e "a lixeira" = `button` com `aria-label` começando por
`Editar comentário de` e `Excluir comentário de`.

### Preparação

1. Diretor: `I` ativo em QA Infra (reativar se preciso). A: `[QA] Acesso` ativa
   em QA Suporte.
2. Como M, "Novo chamado" `[QA] Card de comentário`, tag `[QA] Acesso`,
   destinatário `QA Membro Suporte` → `#C` (`em_andamento`, M).
3. Como M, em `/tickets/C`: comentário público `[QA] c1 público de M`;
   comentário privado `[QA] c2 privado de M`.
4. Como A, em `/tickets/C`: comentário público `[QA] c3 de A`.
5. Como M, "Enviar para outro setor" → QA Infra, comentário
   `[QA] c4 envio para Infra` (vira `message` pública de M).
6. Como I, em `/tickets/C`, "Atender"; depois comentário público
   `[QA] c5 de Infra` e comentário privado `[QA] c6 privado de Infra`.

Estado esperado: `#C` em QA Infra; comentários de M e A (setor QA Suporte) e de
I (setor QA Infra). Gabarito do banco:

```sql
select m.id, u.name, d.name as setor, m.visibility, m.content
from message m
join users u on u.id = m.user_id
join department d on d.id = u.department_id
where m.ticket_id = :C
order by m.created_at, m.id
```

### Bateria

**Ordem obrigatória:** o CC2 roda **antes** do CC13, que exclui c6; sem isso a
ausência de c6 para M não fica provada. Se a bateria for agrupada por usuário
(todos os de I primeiro), o CC2 vai logo depois da Preparação.

| #    | Quem  | Viewport | Ação                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Esperado                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---- | ----- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CC1  | I     | 1440×900 | abrir `/tickets/C`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | I vê os 6 comentários (o privado de M aparece porque o chamado está em QA Infra). Em **cada** um, um badge de contorno com o nome do setor igual à coluna `setor` do gabarito: c1, c2, c3, c4 → `QA Suporte`; c5, c6 → `QA Infra`. O badge aparece também nos privados (c2, c6), ao lado do selo `Privado`, que continua com o cadeado                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| CC2  | M     | 1440×900 | **antes do CC13** (c6 ainda existe no banco; conferir pelo gabarito), abrir `/tickets/C`                                                                                                                                                                                                                                                                                                                                                                                                                   | M vê c1–c5 e **não** vê c6 (privado de outro setor; regra inalterada): nenhum `li` com `[QA] c6 privado de Infra` no DOM, embora a linha esteja no gabarito; badges iguais ao CC1 para os que vê                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| CC3  | I     | 1440×900 | em `/tickets/C`, para cada comentário, medir `getBoundingClientRect()` do badge e do cabeçalho                                                                                                                                                                                                                                                                                                                                                                                                             | `badge.right` = `cabeçalho.right` (±1px) em todos; o badge é o **último** filho do cabeçalho (depois de nome, data, `(editado)` se houver e `Privado` se houver); quando está na mesma linha do nome, fica à direita de todos; quando desce de linha (`badge.top > nome.bottom`), continua com `right` = `cabeçalho.right`. Registrar quais desceram                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| CC4  | I     | 390×844  | repetir o CC3                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | mesmas regras; **sem rolagem horizontal** (`document.documentElement.scrollWidth <= document.documentElement.clientWidth`); nenhum badge passa da borda do card (`badge.right <= li.right`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| CC5  | I     | 1440×900 | árvore de acessibilidade do cabeçalho de c5                                                                                                                                                                                                                                                                                                                                                                                                                                                                | lida como `QA Admin Infra`, data/hora, `Setor: QA Infra` (o `Setor:` é só para leitor de tela; na tela o badge mostra só `QA Infra`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| CC6  | I     | 1440×900 | em `/tickets/C`, observar c5 (de I) e c1 (de M)                                                                                                                                                                                                                                                                                                                                                                                                                                                            | c5: texto ocupando a largura toda do card; **abaixo** dele, uma linha com lápis e lixeira, nessa ordem, alinhada à direita (`acoes.right` ≈ `li.right − padding`); **nenhum** texto `Editar`/`Excluir` visível nos botões; cada botão com 28×28px; ícone com 14×14px (`svg` `getBoundingClientRect`), maior que os 12px de antes; lixeira vermelha (`color` computado = `--destructive`) já sem hover; lápis cinza. c1 (de M, I não edita): **sem** linha de ações (nenhum `button` dentro do `li`; nenhum espaço vazio abaixo do texto)                                                                                                                                                                                                                                                                       |
| CC7  | I     | 1440×900 | passar o mouse sobre a lixeira de c5; depois sobre o lápis                                                                                                                                                                                                                                                                                                                                                                                                                                                 | lixeira: fundo avermelhado claro e ícone continua vermelho (não fica cinza nem preto); tooltip `Excluir` acima do botão. Lápis: tooltip `Editar`. Ao tirar o mouse, o tooltip some                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| CC8  | I     | 1440×900 | mouse fora dos botões. (a) Do campo de novo comentário, `Shift+Tab` repetido: lixeira de c6, lápis de c6, lixeira de c5, lápis de c5, depois `Tab`/`Shift+Tab` entre eles; em cada passo, contar eventos `scroll` (captura em `window`) e ler `[data-slot="tooltip-content"]` 600 ms depois. (b) Num passo em que o foco rolou a lista, `Esc`. (c) Com um botão focado por teclado e o balão aberto, rolar a `Lista de comentários` com a roda do mouse até o botão sair da área visível e depois de volta | foco com anel visível em todos os passos. (a) tooltip `Editar` no lápis e `Excluir` na lixeira **em todo passo**, tanto nos que rolaram a lista (≥ 1 evento `scroll`) quanto nos que não rolaram; registrar quais passos rolaram (se nenhum rolar, rolar a lista até o topo antes e repetir). (b) `Esc` fecha o balão sem tirar o foco, também depois de um passo que rolou. (c) o balão fica invisível (`visibility: hidden` no conteúdo) enquanto o botão está fora da área visível da lista, sem flutuar sobre o resto da página, e volta visível junto do botão quando ele reaparece; o foco não sai do botão. `aria-label` intactos (`Editar comentário de QA Admin Infra de {data/hora}`, `Excluir comentário de QA Admin Infra de {data/hora}`). **Repetir a cada atualização de `radix-ui`** (risco 6) |
| CC9  | I     | 1440×900 | clicar no lápis de c5; mudar o texto para `[QA] c5 de Infra editado`; clicar `Salvar`                                                                                                                                                                                                                                                                                                                                                                                                                      | modo de edição igual ao de antes: o **formulário** (textarea com foco, `Cancelar` e `Salvar`) não tem badge nem botões só-ícone; o cabeçalho do `li` não muda e o badge do setor **continua visível** nele durante a edição; toast `Comentário atualizado.`; texto novo e `(editado)` no cabeçalho, com o badge ainda no fim; o **foco volta ao lápis** de c5 (`document.activeElement` = o lápis) e **nenhum tooltip aberto** (nenhum `[data-slot="tooltip-content"]` no DOM)                                                                                                                                                                                                                                                                                                                                 |
| CC10 | I     | 1440×900 | foco no lápis de c5, `Enter` (entra em edição); `Tab` até `Cancelar`, `Enter`; depois `Shift+Tab` e `Tab` de volta ao lápis                                                                                                                                                                                                                                                                                                                                                                                | ao cancelar: texto inalterado, foco no lápis, **nenhum tooltip aberto**; depois de sair e voltar com `Tab`, o tooltip `Editar` abre                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| CC11 | I     | 1440×900 | clicar na lixeira de c6; no `AlertDialog`, clicar `Cancelar`; depois passar o mouse sobre a lixeira                                                                                                                                                                                                                                                                                                                                                                                                        | dialog `Excluir comentário?` com o conteúdo de antes; enquanto aberto, a lixeira atrás continua vermelha; ao cancelar, c6 continua na tela e no banco, o **foco volta à lixeira** de c6 e **nenhum tooltip aberto**; no hover seguinte, o tooltip `Excluir` abre normalmente                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| CC12 | I     | 1440×900 | foco na lixeira de c6 por `Tab`, `Enter` (abre o dialog), `Esc` (fecha)                                                                                                                                                                                                                                                                                                                                                                                                                                    | foco de volta na lixeira com anel; **nenhum tooltip aberto**; c6 intacto                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| CC13 | I     | 1440×900 | lixeira de c6 → `Excluir` no dialog                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `Excluindo…` durante o envio; toast `Comentário excluído.`; c6 some da tela e do banco; o foco vai para o título `Comentários` (`document.activeElement.id === "ticket-comments-heading"`); contador do título diminui 1; nenhum tooltip aberto                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| CC14 | I     | 1440×900 | depois do CC13, a lista de comentários                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | a região `Lista de comentários` continua rolando por dentro (`scrollHeight > clientHeight` se houver comentários suficientes; caso contrário, registrar) e, depois de publicar `[QA] c7 de Infra`, rola sozinha até ele; c7 já nasce com badge `QA Infra` e linha de ações                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| CC15 | M     | 390×844  | abrir `/tickets/C`; observar c1                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | badge `QA Suporte` à direita (na mesma linha ou abaixo); linha de ações abaixo do texto, à direita, só ícones; tocar no lápis entra em edição (sem tooltip ao toque é aceito); `Cancelar` volta ao texto                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| CC16 | todos | —        | toda a bateria                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | nenhum erro nem aviso de hidratação no console nem no `next-devtools` (em especial, nenhum aviso de `ref` em componente de função vindo do `Slot`); nenhum e-mail                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

Não coberto no navegador: troca de setor do autor (exigiria alterar usuário QA,
que o seed não restaura). A semântica "setor atual" é conferida pelo
`df-reviewer` no código (join por `users.department_id`, sem coluna nova em
`message`) e pelo gabarito do CC1.

## Critério de pronto

1. Cenários CC1–CC16 aprovados pelo `df-qa`.
2. `listTicketMessages` com o join e o campo; nenhuma outra função de
   `ticket-messages.ts` alterada.
3. Nenhum `size="xs"` nem texto `{EDIT_COMMENT_LABEL}`/`{DELETE_COMMENT_LABEL}`
   dentro dos botões de ação do comentário; os dois textos só como conteúdo do
   tooltip e prefixo do `aria-label`.
4. `npx tsc --noEmit`, `npm run lint` e `npm run build` passam; `df-reviewer`
   sem bloqueante.

## Checklist de encerramento

- [x] `authorDepartmentName` em `TicketMessageItem`; `COMMENT_AUTHOR_DEPARTMENT_LABEL` em `domain/ticket-comments.ts` (`df-architect`)
- [ ] `listTicketMessages` com `inner join department` e `authorDepartmentName` (`df-data`)
- [ ] badge do setor no cabeçalho; `TicketCommentBody` em coluna; lápis e lixeira `icon-sm` só-ícone com tooltip; foco devolvido sem tooltip; tooltip mantido na rolagem com foco de teclado e `hideWhenDetached` (`df-ui`)
- [ ] cenários do `df-qa`
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm run build`
