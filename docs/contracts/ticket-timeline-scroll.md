# Contrato — Linha do tempo com rolagem interna

Etapa 1 do plano `docs/plans/ticket-detail-layout-and-comment-card.md` (item 1
do escopo; decisão P1 lá, não repetida aqui). Este documento é a referência
técnica: componentes, medidas e cenários. Ondas: `df-ui` → `df-reviewer` →
`df-qa`.

Ele **altera** `docs/contracts/ticket-resolution.md` (seção "Grid"), que
continua valendo no que não é tocado aqui e traz uma revisão de 2026-10-12
apontando para cá.

> **Revisão de 2026-10-15 — linha do tempo resumida e ~3 eventos**
> (`docs/contracts/timeline-summary.md`, que prevalece no que diverge). A
> linha do tempo passa a mostrar **uma entrada por ação**
> (`summarizeTicketTimeline`, `app/_lib/domain/ticket-history.ts`): linhas com
> o mesmo `changed_at` e o mesmo `changed_by` viram a de maior prioridade
> (`HISTORY_EVENT_SUMMARY_RANK`). A altura máxima cai para cerca de **3**
> eventos simples, faixa [14.5rem, 19.75rem), recomendação `max-h-62`; a
> faixa [25rem, 30.25rem) e o `max-h-104` abaixo ficam como registro. Deixam
> de valer como escritos: **TS2** (o `#T2` mostra 4 eventos, não 7, e o
> último é `Edição`, não `Mudança de tag`), **TS3** (a faixa passa a
> `3h − 20` a `4h − 20` px) e **TS4** (cada edição acrescenta **um** evento,
> `Edição`, não dois). O chamado curto do TS1 (`[QA] Janela aberta`) mostra 2
> eventos, não 3. `ScrollToEndArea`, rolagem ao fim, acessibilidade e o
> restante deste contrato continuam valendo.

Versões observadas: `next@16.3.5`, Tailwind v4 (escala `--spacing` padrão,
`0.25rem`).

## Escopo técnico em uma frase

Só UI: a `<ol>` da linha do tempo passa a ficar dentro da mesma área de
rolagem que os comentários já usam, renomeada para um nome genérico, com
altura máxima de cerca de 5 eventos simples e abrindo no último evento.

## O que não muda

| Camada                                  | Mudança                                                                                            |
| --------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `db/schema.ts`, migration               | nenhuma                                                                                            |
| `app/_lib/validation/**` (Zod)          | nenhuma                                                                                            |
| `app/_lib/domain/**`                    | nenhuma                                                                                            |
| `app/_lib/types/**`                     | nenhuma                                                                                            |
| `app/_lib/date.ts`                      | nenhuma                                                                                            |
| `app/_lib/data/**` (`findTicketDetail`) | nenhuma — a ordem continua `changed_at` crescente, `id` crescente (`app/_lib/data/tickets.ts:214`) |
| `app/_lib/actions/**`                   | nenhuma                                                                                            |
| e-mail, auth                            | nenhuma                                                                                            |

Textos, frases dos eventos (`app/_lib/domain/ticket-history.ts`), marcadores,
traço vertical entre eventos e formato de data da linha do tempo ficam como
estão.

## `df-ui` — o que mudar

### Estrutura

```
app/(app)/tickets/[id]/_components/comments-scroll-area.tsx  renomeado → scroll-to-end-area.tsx
app/(app)/tickets/[id]/_components/scroll-to-end-area.tsx    "use client" — ScrollToEndArea (era CommentsScrollArea)
app/(app)/tickets/[id]/_components/ticket-comments.tsx       alterado — só o import e o nome do componente
app/(app)/tickets/[id]/_components/ticket-timeline.tsx       alterado — <ol> dentro de ScrollToEndArea
```

Sugestão: `git mv` no arquivo renomeado, para manter o histórico. Nenhum outro
arquivo importa `comments-scroll-area` (conferido em 2026-10-12).

### `ScrollToEndArea` (`"use client"`, renomeado)

O componente continua no `_components` da rota: só `/tickets/[id]` o usa
(colocation, seção 5 do `stack.md`). Muda **apenas o nome** — do arquivo, do
componente e da interface de props. Interface e comportamento iguais aos de
hoje:

```tsx
interface ScrollToEndAreaProps {
  itemCount: number
  label: string
  className?: string
  children: React.ReactNode
}

const ScrollToEndArea = (props: ScrollToEndAreaProps) => {}

export default ScrollToEndArea
```

| Aspecto        | Comportamento (inalterado)                                                                                           |
| -------------- | -------------------------------------------------------------------------------------------------------------------- |
| Rolagem ao fim | `useEffect` com dependência `[itemCount]`: `scrollTop = scrollHeight`. Roda na montagem e sempre que a contagem muda |
| Acessibilidade | `role="region"`, `aria-label={label}`, `tabIndex={0}` (alcançável por Tab, rola com setas e PageUp/PageDown)         |
| Foco visível   | `outline-none focus-visible:ring-3 focus-visible:ring-ring/50`                                                       |
| Classes base   | `overflow-y-auto overscroll-contain rounded-lg`, mais `className` via `cn`                                           |

### `TicketComments`

Troca `CommentsScrollArea` por `ScrollToEndArea` (import e JSX). O `label`
(`Lista de comentários`), o `className`
(`max-h-96 lg:absolute lg:inset-0 lg:max-h-none`), a estrutura e o
comportamento **não mudam**.

### `TicketTimeline` (Server Component)

Continua Server Component; só a `<ol>` passa a ser filha do `ScrollToEndArea`
(Server Component renderizando Client Component com `children` é o padrão já
usado em `TicketComments`).

```tsx
{
  entries.length === 0 ? (
    <p className="text-sm text-muted-foreground">Nenhum evento registrado.</p>
  ) : (
    <ScrollToEndArea
      itemCount={entries.length}
      label="Eventos da linha do tempo"
      className="max-h-…"
    >
      <ol className="flex flex-col">…itens como hoje…</ol>
    </ScrollToEndArea>
  )
}
```

- **Rótulo da região**: `Eventos da linha do tempo` — distinto do heading
  `Linha do tempo` (`h2#ticket-timeline-heading`, que continua rotulando a
  `section`), no mesmo padrão de `Lista de comentários` × `Comentários`.
- **Estado vazio**: `Nenhum evento registrado.` inalterado e **fora** da área
  de rolagem (sem região focável vazia).
- **Altura**: só `max-h-*`, nunca `h-*`. Com poucos eventos o card fica do
  tamanho do conteúdo; com muitos, para de crescer. A mesma classe em todas as
  larguras (sem variante `lg:`).
- **Folga para a barra de rolagem**: opcional (`pr-*` na `<ol>`), a critério do
  `df-ui`, se a barra encostar no texto.

### Calibragem da altura máxima

"Evento simples" = título + linha de autor/data + descrição de uma linha, sem
observação (`entry.note` nulo). Pelas classes atuais do item, em `rem`:

| Parte do item                        | Classe    | Altura      |
| ------------------------------------ | --------- | ----------- |
| título (`h3`)                        | `text-sm` | 1.25rem     |
| `gap-1`                              | —         | 0.25rem     |
| autor/data                           | `text-xs` | 1rem        |
| `gap-1`                              | —         | 0.25rem     |
| descrição (uma linha)                | `text-sm` | 1.25rem     |
| espaço até o próximo (não no último) | `pb-5`    | 1.25rem     |
| **evento simples, não último**       |           | **5.25rem** |

- 5 eventos simples: 4 × 5.25 + 4 = **25rem** (400px).
- 6 eventos simples: 5 × 5.25 + 4 = **30.25rem** (484px).

A altura máxima fica em **[25rem, 30.25rem)**: cabem 5 sem rolar, o 6º já
rola. Recomendação do arquiteto: `max-h-104` (26rem), que deixa folga para
arredondamento sem mostrar metade de um 6º evento a ponto de parecer que
cabe. O `df-ui` calibra no navegador e pode ajustar dentro da faixa.

Aproximação aceita (decisão P1 do plano): evento com observação (`edicao`
sempre tem, recusa e encerramento automático também) ou descrição que quebra
linha em tela estreita fazem caber menos de 5 sem rolar.

### Efeito no grid do detalhe

O grid (`page.tsx:160`, `lg:items-stretch`) não muda. Como a linha do tempo
deixa de crescer além da altura máxima, a coluna larga fica mais baixa em
chamados com muitos eventos, e o card Comentários (`lg:flex-1`, lista em
`absolute inset-0`) deixa de esticar por causa dela. Descrição ou Conclusão
longas continuam esticando a linha do grid e, com ela, os Comentários — fora
do escopo (plano, "Fora").

## Riscos

1. **"5 eventos" é aproximado** (acima).
2. **Pulo para o fim.** A rolagem ao fim depende de `itemCount`: se um evento
   novo entra (revalidação depois de uma ação) enquanto a pessoa lê o começo do
   histórico, a lista pula para o fim. Mesmo comportamento dos comentários
   hoje. Sem evento novo (por exemplo, `router.refresh()` sem mudança), a
   posição é mantida.
3. **Duas regiões roláveis na mesma página.** Tab passa pela linha do tempo e
   depois pelos comentários (ordem do DOM em `lg`: coluna larga primeiro).

## Cenários para o `df-qa`

Usuários de `docs/contracts/qa-seed.md`: `M` = QA Membro Suporte, `A` = QA
Admin Suporte. Títulos criados começam com `[QA]`; criação só em QA Suporte.
**Não alterar #65 a #68.** Medidas no navegador por `browser_evaluate` sobre
`document.querySelector('[role="region"][aria-label="Eventos da linha do tempo"]')`
(abaixo, "a região"): `clientHeight`, `scrollHeight`, `scrollTop`, e
`getBoundingClientRect().height` dos `li` filhos da `<ol>`.

### Preparação

- A: `[QA] Acesso` e `[QA] Edição B` ativas em QA Suporte.
- **Chamado curto** (≤ 5 eventos): o `[QA] Janela aberta` de maior `id` ainda
  `resolvido` (seed: `criacao` → `atribuicao` → `resolucao`, três eventos
  simples). Se não houver, como M, "Novo chamado" `[QA] Linha do tempo curta`
  na `Fila de QA Suporte`, tag `[QA] Acesso` (um evento: Abertura) → `#T1`.
- **Chamado longo** (> 5 eventos), gerado pela UI:
  1. Como M, "Novo chamado" `[QA] Linha do tempo longa`, destinatário
     `Fila de QA Suporte`, tag `[QA] Acesso` → `#T2` (1 evento: Abertura).
  2. Como A, em `/tickets/T2`, `Assumir` (+ Atribuição, + Mudança de status =
     3 eventos).
  3. Como A, "Editar" → tag `[QA] Edição B` → salvar (+ Edição com
     observação, + Mudança de tag = 5).
  4. Como A, "Editar" → tag `[QA] Acesso` → salvar (+ 2 = 7 eventos).
- Alternativa só leitura (se a preparação falhar): escolher um chamado com
  muitos eventos pelo banco —
  `select ticket_id, count(*) from ticket_history group by ticket_id order by count(*) desc limit 5`
  — e abri-lo com um usuário que o veja (Diretor para os do seed demo na
  Diretoria). Só leitura: nenhuma ação nesses chamados.

### Bateria

| #    | Quem  | Viewport | Ação                                                                                                      | Esperado                                                                                                                                                                                                                                                                                           |
| ---- | ----- | -------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TS1  | M     | 1440×900 | abrir o chamado curto                                                                                     | todos os eventos visíveis; **sem** barra de rolagem: `scrollHeight === clientHeight` na região; a região existe (`role="region"`, nome `Eventos da linha do tempo`); o card tem a altura do conteúdo (sem espaço vazio abaixo do último evento)                                                    |
| TS2  | A     | 1440×900 | abrir `/tickets/T2` (7 eventos)                                                                           | `scrollHeight > clientHeight`; ao carregar, **sem rolar**, o último evento (`Mudança de tag`, `Trocou a tag de [QA] Edição B para [QA] Acesso.`) está inteiro visível e `scrollTop + clientHeight === scrollHeight` (±1px); a página em si não rolou para a linha do tempo                         |
| TS3  | A     | 1440×900 | em `/tickets/T2`, medir a altura de um `li` simples que não seja o último (ex.: Atribuição) = `h`         | `clientHeight` da região entre `5h − 20` e `6h − 20` px (cabem ~5 eventos simples, o 6º não); registrar `h`, `clientHeight` e a classe `max-h-*` usada                                                                                                                                             |
| TS4  | A     | 1440×900 | em `/tickets/T2`, anotar a altura da `section` da linha do tempo; "Editar" → tag `[QA] Edição B` → salvar | toast `Chamado #T2 atualizado.`; a linha do tempo ganha 2 eventos e **a altura da `section` não muda**; a região rola sozinha até o novo último evento (`Mudança de tag`), visível sem rolar                                                                                                       |
| TS5  | A     | 1440×900 | em `/tickets/T2`, rolar a região até o topo com a roda do mouse e recarregar (F5)                         | depois do recarregamento, a região abre de novo no fim                                                                                                                                                                                                                                             |
| TS6  | A     | 1440×900 | em `/tickets/T2`, pressionar Tab a partir do link de voltar até a região                                  | a região recebe foco com anel visível (`focus-visible`); com foco nela, `ArrowUp`/`PageUp` diminuem `scrollTop` e `ArrowDown`/`End` levam de volta ao fim; o leitor de tela anuncia a região `Eventos da linha do tempo` e a lista com N itens                                                     |
| TS7  | A     | 1440×900 | em `/tickets/T2`, comparar a base do card Conclusão com a base do card Comentários                        | as duas bases continuam alinhadas (`lg:items-stretch` mantido); a altura da coluna larga é a soma de Descrição, linha do tempo limitada e Conclusão — os Comentários não esticam além disso por causa da linha do tempo. Registrar as alturas das duas colunas e da `section` da linha do tempo    |
| TS8  | A     | 1440×900 | em `/tickets/T2`, publicar o comentário `[QA] Comentário depois da rolagem da linha do tempo.`            | comentários funcionam como antes: a lista de comentários (`role="region"`, nome `Lista de comentários`) rola sozinha até o novo comentário; a linha do tempo não muda de altura nem de posição de rolagem (comentário não gera evento)                                                             |
| TS9  | A     | 390×844  | abrir `/tickets/T2`                                                                                       | linha do tempo com altura máxima e rolagem interna, abrindo no último evento; **sem rolagem horizontal** na página (`document.documentElement.scrollWidth <= document.documentElement.clientWidth`); a lista de comentários continua com a própria altura máxima (`max-h-96`) e rolando por dentro |
| TS10 | M     | 390×844  | abrir o chamado curto                                                                                     | sem barra de rolagem na linha do tempo (`scrollHeight === clientHeight`, salvo se descrições quebrarem linha a ponto de passar da altura máxima — registrar)                                                                                                                                       |
| TS11 | todos | —        | toda a bateria                                                                                            | nenhum erro nem aviso de hidratação no console nem no `next-devtools`; nenhum e-mail                                                                                                                                                                                                               |

O estado vazio (`Nenhum evento registrado.`) não é alcançável pela UI (todo
chamado nasce com `criacao`); a verificação de que ele fica fora da área de
rolagem é do `df-reviewer`, no código.

## Critério de pronto

1. Cenários TS1–TS11 aprovados pelo `df-qa`.
2. Nenhuma referência a `CommentsScrollArea` ou `comments-scroll-area` fora de
   `docs/`.
3. `npx tsc --noEmit`, `npm run lint` e `npm run build` passam; `df-reviewer`
   sem bloqueante.

## Checklist de encerramento

- [ ] `comments-scroll-area.tsx` → `scroll-to-end-area.tsx` (`ScrollToEndArea`), `TicketComments` com o nome novo, `TicketTimeline` com a `<ol>` dentro de `ScrollToEndArea` e altura máxima calibrada (`df-ui`)
- [ ] cenários do `df-qa`
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm run build`
