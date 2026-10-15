# Contrato — Linha do tempo resumida por ação

Etapa 1 do plano `docs/plans/timeline-summary-and-attachments-card.md` (itens
3 e 4 do escopo; decisão P2 lá, não repetida aqui). Este documento é a
referência técnica: domínio, componente, medidas e cenários. Ondas:
`df-architect` → `df-ui` → `df-reviewer` → `df-qa`.

Ele **altera** `docs/contracts/ticket-timeline-scroll.md` (altura máxima e
cenários TS2/TS3/TS4), que continua valendo no que não é tocado aqui e traz uma
revisão de 2026-10-15 apontando para cá.

> Revisão de 2026-10-15, pós-QA (`docs/test-reports/2026-10-15-timeline-summary.md`,
> observação 1): trocar o destinatário no "Editar" exige o campo "Comentário"
> (`requiresHandoffComment`), e o passo 3 da preparação não o mencionava. O
> passo 3 passa a preencher `[QA] Repassando para o membro.` antes de salvar;
> o SU2 registra o comentário público que isso grava. Sem mudança de código.

> Revisão de 2026-10-15, Etapa 2 (`docs/contracts/attachment-history.md`):
> `anexo_incluido` e `anexo_removido` saem de `history_event` e de
> `HISTORY_EVENT_SUMMARY_RANK`. A linha "Editar só anexos" da tabela de ações
> compostas e o SU13 deixam de valer: edição só de anexos não grava mais nada
> em `ticket_history` e não aparece na linha do tempo. O rastro fica em
> `attachment_history`.

Versões observadas: `next@16.3.5`, Tailwind v4 (escala `--spacing` padrão,
`0.25rem`).

## Escopo técnico em uma frase

Só domínio e UI: a linha do tempo de `/tickets/[id]` mostra uma entrada por
ação (a de maior prioridade entre as linhas gravadas pela mesma ação) e tem
altura máxima de cerca de 3 eventos simples; o `ticket_history` continua
gravando e devolvendo todas as linhas.

## O que não muda

| Camada                                  | Mudança                                                                                                                       |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `db/schema.ts`, migration               | nenhuma — `history_event` continua com `anexo_incluido` e `anexo_removido` até a Etapa 2                                      |
| `app/_lib/validation/**` (Zod)          | nenhuma                                                                                                                       |
| `app/_lib/types/**`                     | nenhuma — `TicketHistoryEntry` (`app/_lib/types/ticket.ts`) já tem `id`, `event`, `changedAt` e `changedById`                 |
| `app/_lib/date.ts`                      | nenhuma                                                                                                                       |
| `app/_lib/data/**` (`findTicketDetail`) | nenhuma — continua devolvendo **todas** as linhas, em `changed_at` crescente, `id` crescente (`app/_lib/data/tickets.ts:220`) |
| `app/_lib/actions/**`                   | nenhuma                                                                                                                       |
| e-mail, auth                            | nenhuma                                                                                                                       |

Frases e rótulos dos eventos (`describeHistoryEntry`, `HISTORY_EVENT_LABELS`,
`historyEntryNamesActor`), marcadores, traço vertical e formato de data ficam
como estão. Quem quiser o histórico completo (relatório futuro, fora do
escopo) lê `ticket.history` sem passar pelo resumo.

## Domínio — `app/_lib/domain/ticket-history.ts`

### `HISTORY_EVENT_SUMMARY_RANK` (`:182`)

```ts
export const HISTORY_EVENT_SUMMARY_RANK = {
  criacao: 100,
  edicao: 90,
  resolucao: 80,
  transferencia_solicitada: 70,
  transferencia_aprovada: 70,
  transferencia_rejeitada: 70,
  reabertura: 70,
  encerramento: 70,
  atribuicao: 50,
  mudanca_prioridade: 20,
  mudanca_tag: 10,
  mudanca_status: 10,
  anexo_incluido: 10,
  anexo_removido: 10,
} satisfies Record<HistoryEvent, number>
```

Maior valor = fica na tela. Só a **ordem** importa; os números têm folga para
o usuário reordenar na revisão da linha do tempo (decisão P2) sem renumerar
tudo. Esquecer um evento novo do enum é erro de compilação (`satisfies`).

| Faixa | Eventos                                                                                                       | Por quê                                                                                                                               |
| ----- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 100   | `criacao`                                                                                                     | a abertura é a ação que define o grupo, se um dia vier composta                                                                       |
| 90    | `edicao`                                                                                                      | ordem obrigatória do plano: `edicao` > `resolucao` > `atribuicao` > efeitos colaterais                                                |
| 80    | `resolucao`                                                                                                   | idem                                                                                                                                  |
| 70    | `transferencia_solicitada`, `transferencia_aprovada`, `transferencia_rejeitada`, `reabertura`, `encerramento` | hoje sempre sozinhas; são ações "de primeira ordem" e devem vencer `atribuicao`/`mudanca_status` se um dia passarem a gravá-las junto |
| 50    | `atribuicao`                                                                                                  | ordem obrigatória; vence os efeitos colaterais (ex.: Assumir)                                                                         |
| 20    | `mudanca_prioridade`                                                                                          | hoje nunca gravada pela aplicação; mudança de campo, abaixo de qualquer ação nomeada                                                  |
| 10    | `mudanca_tag`, `mudanca_status`, `anexo_incluido`, `anexo_removido`                                           | efeitos colaterais de uma ação maior                                                                                                  |

### `summarizeTicketTimeline` (`:213`)

```ts
export const summarizeTicketTimeline = (
  entries: readonly TicketHistoryEntry[],
): TicketHistoryEntry[]
```

| Aspecto            | Regra                                                                                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Entrada            | as linhas de **um** chamado, como `findTicketDetail` devolve (`changed_at`, `id` crescentes). A função não filtra por chamado                                 |
| Grupo (uma ação)   | mesma chave (`changedAt.getTime()`, `changedById`). `changedById` nulo (cron de encerramento, `changed_by` nulo) é uma chave válida e distinta de qualquer id |
| Quem fica          | a de maior `HISTORY_EVENT_SUMMARY_RANK[event]`                                                                                                                |
| Empate             | a de **menor `id`** (a gravada primeiro). Decidido pelo `id`, não pela posição na entrada, então não depende da ordem recebida                                |
| Ordem da saída     | a da entrada: cada sobrevivente fica na posição em que estava, as outras linhas do grupo somem. Com a entrada cronológica, a saída é cronológica              |
| Grupo de uma linha | passa como está (todas as ações de uma linha só ficam inalteradas)                                                                                            |
| Pureza             | sem I/O; devolve array novo e não altera a entrada; os objetos devolvidos são os mesmos da entrada (sem cópia)                                                |
| Vazio              | `[]` → `[]`. Entrada não vazia nunca dá saída vazia                                                                                                           |

Efeito nas ações compostas de hoje (`app/_lib/data/tickets.ts`):

| Ação                                                             | Linhas gravadas (ordem de `id`)                                                                              | Fica na tela                                                                                                                                   |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Editar (`updateTicketByAssignee`, `:559-629`) com campo alterado | `edicao` + (`mudanca_tag`) + (`anexo_removido`…) + (`anexo_incluido`…) + (`atribuicao`) + (`mudanca_status`) | `Edição`, com a observação (`Alterou tag e destinatário.` etc.)                                                                                |
| Editar só anexos (sem `edicao`) — **transitório até a Etapa 2**  | `anexo_removido`… + `anexo_incluido`…                                                                        | um só: o de menor `id` (o primeiro `Anexo removido`, ou o primeiro `Anexo incluído` se não houve remoção), com o nome do arquivo na observação |
| Editar só anexos + destinatário — transitório                    | `anexo_*`… + `atribuicao` + (`mudanca_status`)                                                               | `Atribuição` (não acontece hoje: trocar destinatário já grava `edicao`)                                                                        |
| Resolver (`updateTicketResolution`, `:733-751`)                  | (`atribuicao`) + `resolucao`                                                                                 | `Resolução`                                                                                                                                    |
| Assumir/encaminhar (`assignTicket`, `:879-897`)                  | `atribuicao` + (`mudanca_status`)                                                                            | `Atribuição`                                                                                                                                   |
| Seed QA: `[QA] Janela aberta`/`vencida` (`db/seed.ts:305-330`)   | `criacao` (em `created_at`) + `atribuicao` + `resolucao` (os dois em `resolved_at`)                          | `Abertura` e `Resolução` (2 eventos, eram 3)                                                                                                   |
| Demais (abertura, Atender, transferência, recusa, encerramento)  | uma linha                                                                                                    | sem mudança                                                                                                                                    |

Na Etapa 2 os `anexo_*` saem do enum e do mapa; a linha transitória deixa de
existir (edição só de anexos não aparece mais na linha do tempo — risco 2 do
plano).

## `df-ui` — o que mudar

### Estrutura

```
app/(app)/tickets/[id]/_components/ticket-timeline.tsx   alterado — resume as entradas e recalibra a altura
```

`page.tsx` **não muda**: continua passando `entries={ticket.history}` (a
lista completa). Quem resume é o `TicketTimeline`, porque o resumo é regra de
apresentação da linha do tempo e um único arquivo concentra a mudança.

### `TicketTimeline` (Server Component, inalterado na forma)

```tsx
import { summarizeTicketTimeline } from "@/app/_lib/domain/ticket-history"

interface TicketTimelineProps {
  entries: TicketHistoryEntry[]
}

const TicketTimeline = ({ entries }: TicketTimelineProps) => {
  const visibleEntries = summarizeTicketTimeline(entries)
  ...
}
```

- Tudo o que hoje usa `entries` dentro do componente passa a usar a lista
  resumida: o teste de vazio, o `map` da `<ol>`, o `isLast` e o `itemCount`
  do `ScrollToEndArea` (`itemCount={visibleEntries.length}`). Assim a rolagem
  ao fim dispara quando aparece uma entrada nova **na tela** — toda ação nova
  acrescenta exatamente uma.
- Nome da variável a critério do `df-ui`.
- Estado vazio, rótulo da região (`Eventos da linha do tempo`), heading,
  textos e classes dos itens: inalterados.

### Altura máxima — ~3 eventos simples

Calibragem de `docs/contracts/ticket-timeline-scroll.md` ("Calibragem da
altura máxima"): evento simples que não é o último = **5.25rem**; o último não
tem `pb-5` (4rem).

- 3 eventos simples: 2 × 5.25 + 4 = **14.5rem** (232px).
- 4 eventos simples: 3 × 5.25 + 4 = **19.75rem** (316px).

Faixa: **[14.5rem, 19.75rem)** — cabem 3 sem rolar, o 4º já rola.
Recomendação do arquiteto: `max-h-62` (15.5rem, 248px), com folga para
arredondamento sem mostrar boa parte de um 4º evento. O `df-ui` calibra no
navegador e pode ajustar dentro da faixa. Só `max-h-*`, nunca `h-*`; **a mesma
classe em todas as larguras** (sem variante `lg:`).

Aproximação aceita (risco 7 do plano): com o resumo, `Edição` sempre traz
observação e fica mais alta; descrição que quebra linha em tela estreita
também. Nesses casos cabem menos de 3 sem rolar.

### Efeito no grid

Nenhuma mudança no grid (`page.tsx`, `lg:items-stretch`). A coluna larga fica
mais baixa; Conclusão e Comentários continuam com as bases alinhadas.

## Riscos

1. **Fusão indevida** (risco 3 do plano): duas ações distintas, mesmo autor,
   mesmo milissegundo, mesmo chamado. Cada ação grava numa transação que trava
   o chamado (`for update`), o que torna isso praticamente impossível.
2. **Detalhe que some da tela** (risco 4 do plano): o destinatário escolhido
   na edição, o status resultante, o "assumiu" antes de resolver. O banco
   mantém as linhas.
3. **Transitório da edição só de anexos**: mostra um único `Anexo …` mesmo com
   vários arquivos, até a Etapa 2.
4. **Linhas antigas gravadas fora da aplicação** (seed, migrations) com
   instantes iguais e o mesmo autor também são resumidas — é o caso dos
   `[QA] Janela …` (tabela acima), e é o desejado.

## Cenários para o `df-qa`

Usuários de `docs/contracts/qa-seed.md`: `M` = QA Membro Suporte, `A` = QA
Admin Suporte, `I` = QA Admin Infra. Títulos criados começam com `[QA]`;
criação só em QA Suporte. **Não alterar #65 a #68.** Medidas na região como
em `docs/contracts/ticket-timeline-scroll.md` (TS3): `browser_evaluate` sobre
`document.querySelector('[role="region"][aria-label="Eventos da linha do tempo"]')`
(abaixo, "a região") — `clientHeight`, `scrollHeight`, `scrollTop`, e
`getBoundingClientRect().height` dos `li` da `<ol>`. Banco: MCP `postgres`
(só leitura), `select id, event, changed_at, changed_by, note from ticket_history where ticket_id = X order by changed_at, id`.

### Preparação

- A: `[QA] Acesso` e `[QA] Edição B` ativas em QA Suporte.
- **Chamado longo** `#T1`, gerado pela UI (cada passo é verificado na bateria):
  1. Como M, "Novo chamado" `[QA] Resumo longo`, destinatário
     `Fila de QA Suporte`, tag `[QA] Acesso`.
  2. Como A, `Assumir`.
  3. Como A, "Editar" → tag `[QA] Edição B` e destinatário `QA Membro Suporte`
     → campo "Comentário" `[QA] Repassando para o membro.` (obrigatório ao
     trocar o destinatário; revisão de 2026-10-15) → "Salvar alterações".
  4. Como M, `Atender`.
  5. Como M, "Editar" → tag `[QA] Acesso` → "Salvar alterações".
- **Chamado de resolução** `#T2`: como M, "Novo chamado" `[QA] Resumo
resolução`, destinatário `Fila de QA Suporte`, tag `[QA] Acesso`.
- **Chamado de transferência** `#T3`: como M, "Novo chamado" `[QA] Resumo
transferência`, destinatário `Fila de QA Suporte`, tag `[QA] Acesso`.

### Bateria

| #    | Quem  | Viewport | Ação                                                                                                                                 | Esperado                                                                                                                                                                                                                                                                                                                                                                                                                |
| ---- | ----- | -------- | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SU1  | A     | 1440×900 | passo 2 (Assumir) em `#T1`                                                                                                           | tela: 2 eventos — `Abertura` e `Atribuição` (`QA Admin Suporte assumiu o chamado.`); **nenhum** `Mudança de status`. Banco: 3 linhas — `criacao`, `atribuicao`, `mudanca_status`; as duas últimas com o mesmo `changed_at` e `changed_by` = A                                                                                                                                                                           |
| SU2  | A     | 1440×900 | passo 3 (Editar tag + destinatário) em `#T1`                                                                                         | toast `Chamado #T1 atualizado.`; tela: 3 eventos, o novo é **só** `Edição` com a observação `Alterou tag e destinatário.`; **nenhum** `Mudança de tag`, `Atribuição` ou `Mudança de status` novo. Banco: 4 linhas novas com o mesmo `changed_at` e `changed_by` = A, na ordem de `id`: `edicao`, `mudanca_tag`, `atribuicao`, `mudanca_status` (7 no total); 1 comentário público novo `[QA] Repassando para o membro.` |
| SU3  | M     | 1440×900 | passo 4 (Atender) em `#T1`                                                                                                           | tela: um evento novo `Mudança de status` (ação de uma linha, inalterada). Banco: 1 linha nova `mudanca_status`                                                                                                                                                                                                                                                                                                          |
| SU4  | M     | 1440×900 | passo 5 (Editar só a tag) em `#T1`                                                                                                   | tela: um evento novo, só `Edição` com `Alterou tag.`; total de 5 eventos na tela. Banco: 2 linhas novas (`edicao`, `mudanca_tag`), 10 no total                                                                                                                                                                                                                                                                          |
| SU5  | A     | 1440×900 | em `#T2` (fila, sem destinatário), resolver pela Conclusão com `[QA] Solução do resumo.`                                             | tela: 2 eventos — `Abertura` e `Resolução`; **nenhum** `Atribuição`. Banco: `criacao`, `atribuicao` (`to_assignee_id` = A), `resolucao`, as duas últimas com o mesmo `changed_at` e `changed_by` = A                                                                                                                                                                                                                    |
| SU6  | M     | 1440×900 | abrir o `[QA] Janela aberta` de maior `id` (só leitura)                                                                              | tela: 2 eventos — `Abertura` e `Resolução` (o seed grava `atribuicao` e `resolucao` no mesmo instante). Banco: 3 linhas                                                                                                                                                                                                                                                                                                 |
| SU7  | A, I  | 1440×900 | em `#T3`, A "Enviar para outro setor" → QA Infra; I abre `#T3` e aceita (`Atender`)                                                  | tela de I: `Abertura`, `Transferência solicitada`, `Transferência aprovada`, cada uma com o texto de hoje (`docs/contracts/department-transfer.md`). Banco: uma linha por ação                                                                                                                                                                                                                                          |
| SU8  | M     | 1440×900 | em `/tickets/T1` (5 eventos na tela), medir a altura `h` de um `li` simples que não seja o último (`Abertura` ou `Atribuição`)       | `scrollHeight > clientHeight`; `clientHeight` da região entre `3h − 20` e `4h − 20` px (cabem ~3 eventos simples, o 4º não); registrar `h`, `clientHeight` e a classe `max-h-*` usada                                                                                                                                                                                                                                   |
| SU9  | M     | 1440×900 | recarregar `/tickets/T1` sem rolar                                                                                                   | a região abre no fim: o último evento (`Edição`, `Alterou tag.`) inteiro visível e `scrollTop + clientHeight === scrollHeight` (±1px); a página não rolou até a linha do tempo                                                                                                                                                                                                                                          |
| SU10 | M     | 1440×900 | em `/tickets/T1`, "Editar" → título `[QA] Resumo longo editado` → salvar                                                             | a lista ganha **um** evento (`Edição`, `Alterou título.`) e a região rola sozinha até ele; a altura da `section` da linha do tempo não muda                                                                                                                                                                                                                                                                             |
| SU11 | M     | 1440×900 | em `/tickets/T1`, comparar a base do card Conclusão com a do card Comentários                                                        | bases alinhadas (`lg:items-stretch`); registrar as alturas das duas colunas e da `section` da linha do tempo                                                                                                                                                                                                                                                                                                            |
| SU12 | M     | 390×844  | abrir `/tickets/T1`                                                                                                                  | mesma altura máxima (sem variante por largura), rolagem interna, abre no último evento; **sem rolagem horizontal** (`document.documentElement.scrollWidth <= document.documentElement.clientWidth`)                                                                                                                                                                                                                     |
| SU13 | M     | 1440×900 | (só se o R2 estiver configurado) em `/tickets/T1` como destinatário, "Editar" → anexar 2 arquivos pequenos, sem mudar campo → salvar | **não vale mais desde a Etapa 2** (revisão de 2026-10-15; ver `attachment-history.md`, AH6). Texto original: um evento novo só, `Anexo incluído`, com o nome do **primeiro** arquivo na observação. Banco: 2 linhas `anexo_incluido` com o mesmo `changed_at`. Sem R2, registrar como não executado                                                                                                                     |
| SU14 | todos | —        | toda a bateria                                                                                                                       | nenhum erro nem aviso de hidratação no console nem no `next-devtools`                                                                                                                                                                                                                                                                                                                                                   |

## Critério de pronto

1. Cenários SU1–SU14 aprovados pelo `df-qa` (SU13 pode ficar "não executado"
   sem R2).
2. `TicketTimeline` usa `summarizeTicketTimeline` e nenhum outro arquivo
   reimplementa o agrupamento (o `df-reviewer` confere por `grep` de
   `getTime()` e `changedById` em `app/(app)/**`).
3. `page.tsx` continua passando `ticket.history` completo.
4. `npx tsc --noEmit`, `npm run lint` e `npm run build` passam; `df-reviewer`
   sem bloqueante.

## Checklist de encerramento

- [x] `HISTORY_EVENT_SUMMARY_RANK` e `summarizeTicketTimeline` em `app/_lib/domain/ticket-history.ts` (`df-architect`)
- [x] revisão de 2026-10-15 em `docs/contracts/ticket-timeline-scroll.md` (`df-architect`)
- [x] `TicketTimeline` resumindo as entradas, `itemCount` das resumidas e altura máxima recalibrada (`df-ui`)
- [x] cenários do `df-qa`: 14 de 14, relatório `docs/test-reports/2026-10-15-timeline-summary.md`
- [x] `npx tsc --noEmit`, `npm run lint`, `npm run build` (etapa comitada em `95e007f`)
- [x] revisões de 2026-10-15: comentário obrigatório no passo 3 e efeito da Etapa 2 no SU13 (`df-architect`)
