# Contrato — Card "Anexos" no detalhe do chamado

Etapa 3 do plano `docs/plans/timeline-summary-and-attachments-card.md` (item
2 do escopo e decisão P3 lá, não repetidos aqui), aprovado pelo usuário em
`/consult` em 2026-10-15. As Etapas 1 e 2 estão comitadas (`95e007f`,
`02c4c4d`).

O bloco "Anexos" sai de dentro da Conclusão e vira **card próprio** em
`/tickets/[id]`, logo abaixo da Descrição. Leitura, download, modo edição,
limites, remoção, toasts e bloqueio do "Salvar alterações" continuam
exatamente como em `docs/contracts/attachments-in-edit.md` e
`docs/contracts/attachment-tiles.md`; muda **onde** o bloco está e **qual**
título ele tem.

Ondas: `df-architect` (feito) → `df-ui` → `df-reviewer` → `df-qa`.
`df-data`, `df-actions`, `df-email` e `df-auth` **não entram**.

Altera:

- `docs/contracts/attachments-in-edit.md` — seções `df-ui` "Fora da edição",
  "No modo edição" (posição e título) e "Altura da Conclusão" (revisão de
  2026-10-15 lá).
- `docs/contracts/ticket-attachments-list-and-download.md` — o bloco de
  leitura deixa de estar na Conclusão (revisão de 2026-10-15 lá).
- `docs/contracts/ticket-resolution.md` — ordem da coluna larga do cenário 34
  (revisão de 2026-10-15 lá).

Versões observadas: `next@16.3.5`, `react-hook-form@7.88`, Tailwind v4.

## O que não muda

| Camada                                                        | Mudança                                                                                                     |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `db/schema.ts`, migration                                     | nenhuma                                                                                                     |
| `app/_lib/data/**` (`listTicketAttachments` inclusive)        | nenhuma — a página continua carregando a lista uma vez                                                      |
| `app/_lib/actions/**`, rota `app/api/attachments/[id]`        | nenhuma                                                                                                     |
| `app/_lib/validation/**`, `app/_lib/types/**`                 | nenhuma                                                                                                     |
| `app/_lib/domain/**`                                          | nenhuma — os textos já existem (abaixo)                                                                     |
| quem vê o bloco e quem edita                                  | nenhuma — todos que veem o chamado leem; edição só com `editable && canAttach` e depois de "Editar"         |
| `TicketEditProvider`, `savedAttachmentCount`, `useTicketEdit` | nenhuma — mesmo formulário, mesmos campos, mesmo bloqueio do salvar, mesmo tratamento de códigos            |
| `TicketAttachmentsEditor` (comportamento)                     | nenhum — vagas, limite do uploader, remoção, foco depois de remover, rolagem até o novo, `disabled`, toasts |
| `TicketAttachmentTile`, `AttachmentTileBody`, vazio tracejado | nenhuma                                                                                                     |
| "Novo chamado" (`AttachmentUploader`)                         | nenhuma                                                                                                     |
| e-mail, permissões                                            | nenhuma                                                                                                     |

## Domínio — reaproveitado, nada novo

| Constante                        | Arquivo                                | Texto                                                              |
| -------------------------------- | -------------------------------------- | ------------------------------------------------------------------ |
| `TICKET_ATTACHMENTS_LABEL`       | `app/_lib/domain/ticket.ts:157`        | `Anexos` — título do card                                          |
| `ATTACH_FILE_LABEL`              | `app/_lib/domain/ticket.ts:159`        | `Anexar` (já usado por `AttachmentFilePicker`)                     |
| `NO_ATTACHMENTS_LABEL`           | `app/_lib/domain/ticket.ts:161`        | `Nenhum anexo.` (já usado por `AttachmentsEmpty`)                  |
| `TICKET_ATTACHMENTS_LIMITS_HINT` | `app/_lib/domain/attachment.ts`        | `Até 10 arquivos neste chamado, de até 10 MB cada.`                |
| `describeTicketAttachmentSlots`  | `app/_lib/domain/ticket-attachment.ts` | `Restam N vagas.` / `Resta 1 vaga.` / `Nenhuma vaga restante.`     |
| `TICKET_ATTACHMENTS_EDIT_NOTICE` | `app/_lib/domain/ticket-attachment.ts` | `Inclusões e remoções de anexos só valem ao salvar as alterações.` |
| `canAttachToTicketDetail`        | `app/_lib/domain/ticket-attachment.ts` | sem mudança — decide `canAttach` na página                         |

## `df-ui` — o que criar e mudar

### Estrutura

```
app/(app)/tickets/[id]/_components/ticket-attachments.tsx         novo — Server Component; escolhe leitura ou TicketEditAttachments
app/(app)/tickets/[id]/_components/ticket-attachments-frame.tsx   alterado — passa a ser o próprio card: section + h2
app/(app)/tickets/[id]/_components/ticket-conclusion.tsx          alterado — sem attachments, canAttach e attachmentsBlock
app/(app)/tickets/[id]/_components/resolve-ticket-form.tsx        alterado — sem a prop savedAttachments
app/(app)/tickets/[id]/page.tsx                                   alterado — monta o card entre Descrição e Linha do tempo
```

`ticket-attachment-list.tsx`, `ticket-edit-attachments.tsx` e
`ticket-attachments-editor.tsx` não mudam de assinatura nem de comportamento
(passam a ser renderizados dentro do card em vez de dentro da Conclusão). Sem
pasta nova.

### `TicketAttachments` (novo)

```ts
interface TicketAttachmentsProps {
  attachments: readonly TicketAttachmentItem[]
  editable?: boolean
  canAttach?: boolean
}
```

Server Component, `export default`. Corpo:

- `editable && canAttach` → `<TicketEditAttachments attachments={attachments} />`
  (cliente; fora da edição já devolve a lista de leitura, na edição o editor);
- senão → `<TicketAttachmentList attachments={attachments} />`.

É exatamente o `attachmentsBlock` que hoje mora em
`ticket-conclusion.tsx:39-44`, movido. A condição continua obrigatória, e não
só por regra: `TicketEditAttachments` chama `useTicketEdit`, e o provider só
existe quando `editOptions !== null` (`page.tsx:197-206`), o que `editable`
garante.

### Decisão — o frame vira o card (título e `aria-labelledby`)

**O `section` e o `h2` ficam em `TicketAttachmentsFrame`, não em
`TicketAttachments`.** Motivo: no modo edição a dica, as vagas e o aviso
pertencem ao cabeçalho do card (logo abaixo do título) e são estado do
cliente (`ticket-attachments-editor.tsx:128-144`, vagas recalculadas a cada
inclusão ou remoção, ids de `useId`). Se o `section` e o `h2` ficassem no
Server Component, o cabeçalho seria partido em dois componentes e a descrição
acessível do bloco (`aria-describedby` com ids gerados no cliente) não teria
como subir até o `section`. O frame já é o único lugar que conhece título,
detalhes, faixa, ação e erro, e é usado pelos dois modos — por isso é ele que
vira o card. `TicketAttachments` só escolhe o modo.

Como fica (`ticket-attachments-frame.tsx`):

- raiz: `<section aria-labelledby="ticket-attachments-heading">` com a classe
  de card do detalhe: `flex min-w-0 flex-col gap-3 rounded-xl border
border-border-subtle bg-surface p-5` (mesma moldura e mesmo `gap-3` de
  `ticket-description.tsx:21`);
- título: o `h3` (`:30-32`) vira
  `<h2 id="ticket-attachments-heading" className="font-heading text-base font-semibold">`
  com `TICKET_ATTACHMENTS_LABEL` — mesma classe dos `h2` de Descrição, Linha
  do tempo e Conclusão;
- **um título só**: não existe mais `h3` "Anexos" em lugar nenhum da página.
  O id `ticket-attachments-heading` continua o mesmo (constante interna do
  frame, `:16`) e continua sendo o único: os dois modos são exclusivos e os
  dois passam pelo frame;
- **sai o `role="group"`** (`:37-38`). O que ele fazia — rotular e descrever o
  bloco em edição — passa para o próprio `section`: `aria-labelledby` sempre
  (região "Anexos") e `aria-describedby={describedBy}` só na edição (dica,
  vagas, aviso e, se houver, erro, como hoje em
  `ticket-attachments-editor.tsx:123-125`). Assim a árvore não repete "Anexos"
  três vezes (região › grupo › lista);
- a `ul` mantém `aria-labelledby="ticket-attachments-heading"` (`:57`): a
  lista continua se chamando `Anexos`;
- `aria-live="polite"` em volta da faixa (`announceChanges`) e `listRef` sem
  mudança.

As props do frame (`isEmpty`, `children`, `details`, `action`, `footer`,
`describedBy`, `announceChanges`, `listRef`) ficam; só muda o que elas
produzem.

### Layout

**Fora da edição** (todos, inclusive o destinatário antes de "Editar"):

```
┌ Anexos ──────────────────────────────────────────────┐   h2
│ [bloco][bloco][bloco][bloco][bloco] →  (rola de lado)│   faixa
└──────────────────────────────────────────────────────┘
ou
┌ Anexos ──────────────────────────────────────────────┐
│ ┆ Nenhum anexo.                                     ┆│   vazio tracejado
└──────────────────────────────────────────────────────┘
```

Nenhum `Anexar`, nenhum X, nenhum `input[type=file]` no card. O card tem a
altura do próprio conteúdo (nada de `flex-1`).

**No modo edição** (`isEditing`, só quem tem `editable && canAttach`):

```
┌──────────────────────────────────────────────────────┐
│ Anexos                                               │   h2           ┐
│ Até 10 arquivos neste chamado, de até 10 MB cada.    │   dica         │ cabeçalho
│ Restam N vagas.                                      │   vagas        │ (gap-1 entre
│ ⓘ Inclusões e remoções de anexos só valem ao salvar… │   aviso        ┘  os itens)
│ [bloco ✕][bloco ✕][novo ✕] →                         │   faixa ou vazio tracejado
│ [📎 Anexar]                                          │   canto inferior esquerdo
│ <erro do campo, se houver>                           │   FieldError
└──────────────────────────────────────────────────────┘
```

- **Cabeçalho**: `h2` e os três textos num contêiner `flex flex-col gap-1`
  (os textos ficam colados ao título e mais perto dele do que da faixa; o
  `gap-3` do card separa o cabeçalho da faixa). Textos com quebra de linha
  livre, sem botão nenhum no cabeçalho.
- **`Anexar`**: depois da faixa (ou do vazio), alinhado à esquerda, com a
  largura do próprio conteúdo — o contêiner do botão usa `self-start` (ou
  equivalente), nunca estica. Com o `p-5` do card, fica no canto inferior
  esquerdo. A única coisa que pode aparecer abaixo dele é o `FieldError` do
  campo, como hoje (`:156-160`); é raro e pertence ao campo.
- **Ordem de tabulação** dentro do card: links e X dos blocos, na ordem da
  faixa → `Anexar`. Sem `tabindex` positivo. Na página: … campos da Descrição
  em edição → blocos/X → `Anexar` → Linha do tempo → Conclusão → Detalhes →
  Comentários (ordem do DOM; no `lg` a coluna estreita vem depois da larga,
  como hoje).
- O `pt-1` em volta da ação (`:65`) sai: o `gap-3` do card já separa.

O resto do modo edição não muda (`attachments-in-edit.md`, "No modo edição").

### `TicketConclusion` (alterado)

- Saem as props `attachments` e `canAttach`, o `attachmentsBlock`
  (`:39-44`) e os imports de `TicketAttachmentList`, `TicketEditAttachments` e
  `TicketAttachmentItem`.
- Ficam `ticketId`, `state`, `sendToDepartment`, `editable` (ainda usado pela
  solução em edição e pelo `ResolveTicketForm`) e `className`.
- Estados sem o bloco:
  - `resolvable`: `ResolveTicketForm` sem `savedAttachments`;
  - `resolved`: só o contêiner da solução e das datas (`:69-97`), sem o
    fragmento;
  - `awaiting_transfer`: só `LockedSolutionField`;
  - `empty`: só `Nenhuma solução registrada.`.

### `ResolveTicketForm` (alterado)

- Sai a prop `savedAttachments` (`:28`, `:38`) e o `{savedAttachments}`
  (`:139`).
- A barra de ações continua no rodapé (`FOOTER_CLASS = "mt-auto"`, `:33`,
  `:141`, `:145`) e continua escondida durante a edição.

### `page.tsx` (alterado)

Coluna larga (`:165-180`), nesta ordem:

```tsx
<TicketDescription description={ticket.description} editable={editable} />
<TicketAttachments attachments={attachments} editable={editable} canAttach={canAttach} />
<TicketTimeline entries={ticket.history} />
<TicketConclusion ticketId={ticket.id} state={conclusion} sendToDepartment={sendToDepartment} editable={editable} className="lg:flex-1" />
```

`TicketEditProvider` continua recebendo `savedAttachmentCount={attachments.length}`
(`:200`). `canAttach` continua vindo de `canAttachToTicketDetail` (`:97`).

### Efeito no grid

- **Conclusão** mantém `lg:flex-1`: as bordas de baixo de Conclusão e
  Comentários continuam alinhadas (diferença ≤ 1 px).
- No `resolvable`, a sobra de altura fica entre o campo Solução e a barra de
  ações (barra no rodapé, como hoje). Nos estados sem rodapé (`resolved`,
  `awaiting_transfer`, `empty`) e no modo edição (barra escondida), a sobra
  fica abaixo do conteúdo, sem nada inventado para preenchê-la.
- **Anexos** tem a altura do conteúdo, nunca estica. **Linha do tempo** não
  muda (`max-h-62`, Etapa 1).
- Abaixo de `lg` (uma coluna): Descrição → Anexos → Linha do tempo →
  Conclusão → Detalhes → Comentários.

## Cenários para o `df-qa`

Usuários de `docs/contracts/qa-seed.md`: `M` = QA Membro Suporte, `A` = QA
Admin Suporte, `I` = QA Admin Infra (outro setor), `D` = diretor. Títulos
criados começam com `[QA] Card anexos`. Criação só em QA Suporte. **Não
alterar #65 a #68.**

**Pré-requisito:** configuração do ADR 018 (bucket, CORS com
`http://localhost:3000`, ciclo de vida, token com leitura e escrita,
`R2_ATTACHMENTS_BUCKET`). Sem R2, rodar só AN1, AN3, AN4, AN11 a AN14 e AN16 a
AN18 (sem incluir arquivo) e registrar o resto como bloqueado.

Arquivos como em `attachment-tiles.md` e `attachments-in-edit.md`, em
buffers, sem gravar nada no repositório: `print.png`, `dados.csv`,
`notas.txt`, `doc.docx`, `planilha.xlsx`, `apresentacao.pptx`, `logs.zip`,
`imagem.webp`, PNG de 120 caracteres sem espaço.

Preparação (M, pelo "Novo chamado", salvo indicação):

- **C1** — `[QA] Card anexos C1`, destinatário **M**, com 5 arquivos
  (`print.png`, `dados.csv`, `doc.docx`, `planilha.xlsx`, PNG de 120
  caracteres) — faixa com overflow no 390 px; no 1440 o overflow só aparece
  com 6 ou mais anexos (revisão pós-QA de 2026-10-15). O "Novo chamado"
  aceita no máximo 5: o 6º entra pela edição (AN7). `.docx` e `.xlsx`
  precisam de bytes válidos (assinatura ZIP), senão o uploader os descarta.
- **C2** — `[QA] Card anexos C2`, destinatário **M**, sem anexo.
- **C3** — `[QA] Card anexos C3`, destinatário **M**, com `notas.txt`;
  resolvido por M com solução `[QA] resolvido` (estado `resolved`, dentro da
  janela).
- **C4** — A cria `[QA] Card anexos C4`, destinatário **A**, com `print.png`;
  A usa `Enviar para outro setor` → QA Infra (estado `awaiting_transfer`).
  Recusar com `[QA] devolvido` (I) ao fim da bateria.

Medidas: `getBoundingClientRect()` de `section[aria-labelledby="ticket-description-heading"]`,
`section[aria-labelledby="ticket-attachments-heading"]`,
`section[aria-labelledby="ticket-timeline-heading"]`,
`section[aria-labelledby="ticket-conclusion-heading"]` e do card de
Comentários.

| #    | Quem    | Viewport | Ação                                                                                                                     | Esperado                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ---- | ------- | -------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AN1  | M       | 1440×900 | abrir C1, sem `Editar`                                                                                                   | na coluna larga, de cima para baixo: Descrição → **Anexos** → Linha do tempo → Conclusão (`top` crescente, os quatro com a mesma `left`/`width`); Detalhes → Comentários na estreita                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| AN2  | M       | 1440×900 | em C1, sem `Editar`: rolar a faixa de lado; clicar em `print.png`                                                        | `h2` `Anexos`; 5 blocos-link numa linha (com 5 a faixa cabe no 1440: 712 px de 722 úteis); com 6+ blocos (depois do AN7) a faixa tem `scrollWidth > clientWidth` e rola de lado por dentro; documento sem rolagem horizontal (`scrollWidth <= clientWidth`); o card tem a altura do conteúdo (base do card ≈ base da faixa + 20 px de `p-5`); o clique baixa por `GET /api/attachments/<id>` → `302` para o R2                                                                                                                                                                                                                          |
| AN3  | M       | 1440×900 | abrir C2, sem `Editar`                                                                                                   | card `Anexos` com o vazio tracejado `Nenhum anexo.`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| AN4  | A, D    | 1440×900 | abrir C1 e C2 (não destinatários)                                                                                        | mesmo card, mesma posição; sem `Editar`; nenhum `Anexar`, nenhum `button` `Remover …`, nenhum `input[type=file]` na página; o download funciona em C1                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| AN5  | M       | 1440×900 | em C1, `Editar`                                                                                                          | no card, nesta ordem: `h2` `Anexos`, `Até 10 arquivos neste chamado, de até 10 MB cada.`, `Restam 5 vagas.`, aviso `Inclusões e remoções de anexos só valem ao salvar as alterações.`, a faixa (5 blocos com X `Remover <nome>`), `Anexar`. `Anexar`: `top` > `bottom` da faixa; `left` = `left` da faixa (± 1 px); largura < metade da do card (não estica); nenhum botão no cabeçalho; os links continuam baixando                                                                                                                                                                                                                    |
| AN6  | M       | 1440×900 | em C1 editando, `Tab` a partir do último X                                                                               | o foco vai para `Anexar`; o `Tab` seguinte sai do card (Linha do tempo ou Conclusão), nunca volta à faixa                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| AN7  | M       | 1440×900 | em C1 editando: `Anexar` `notas.txt` (`Enviado`) → `Salvar alterações`                                                   | durante: `Restam 4 vagas.`, a faixa rola até o novo. Toast `Chamado #C1 atualizado.`; sai da edição; o card de leitura mostra 6 blocos (`notas.txt` por último), sem `Anexar`                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| AN8  | M       | 1440×900 | em C1 editando: X em `dados.csv` → `Salvar alterações`                                                                   | ao clicar no X: o bloco some, foco em `Anexar`, `Restam 5 vagas.` se o AN7 já salvou o 6º anexo (6 − 1), ou `Restam 6 vagas.` se há 5 salvos (5 − 1). Depois de salvar: um bloco a menos, sem `dados.csv` (5 depois do AN7)                                                                                                                                                                                                                                                                                                                                                                                                             |
| AN9  | M       | 1440×900 | em C1, `Editar` → X em `print.png` → `Anexar` `logs.zip` (`Enviado`) → `Cancelar`                                        | o card volta ao modo leitura com os blocos de antes (`print.png` presente, sem `logs.zip`); nenhum request de `editTicket`; no novo `Editar`, nenhum bloco novo                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| AN10 | M       | 1440×900 | em C2, `Editar` → `Anexar` `imagem.webp` → salvar; depois `Editar` → X → salvar                                          | em edição: vazio tracejado e `Restam 10 vagas.`, `Anexar` abaixo do vazio, à esquerda. Salvo: 1 bloco. Depois do 2º salvar: `Nenhum anexo.` de novo                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| AN11 | M, A, D | 1440×900 | Conclusão em: C1 sem edição (`resolvable`, M); C1 em edição (M); C3 (`resolved`, M); C4 (`awaiting_transfer`, A); C1 (D) | em **nenhum** dos estados a Conclusão contém `Anexos`, `Nenhum anexo.`, bloco de anexo, `Anexar` ou `Remover …`. `resolvable`: Solução + barra `Resolver` (e `Enviar para outro setor`) no rodapé. `resolved`: solução, `Resolvido em`, `Editável até`. `awaiting_transfer`: só o campo travado `Solução` (`LockedSolutionField`) com a mensagem da transferência como valor do `textarea` `readOnly` (o `innerText` da Conclusão mostra só `Conclusão` e `Solução`). `empty`: só `Nenhuma solução registrada.` — em QA Suporte M, A e D têm `Resolver` em C1; usar um chamado `cancelado`/`fechado` visível ao visualizador (ver nota) |
| AN12 | M       | 1440×900 | em C1 e C3, com e sem `Editar`                                                                                           | `document.querySelectorAll('#ticket-attachments-heading').length === 1`; um só `heading` com nome `Anexos` na página (árvore de acessibilidade), de nível **2**; nenhum `h3` `Anexos`; nenhum id duplicado na página (`[id]` agrupado por valor, todos com contagem 1)                                                                                                                                                                                                                                                                                                                                                                  |
| AN13 | M       | 1440×900 | árvore de acessibilidade de C1 sem edição e editando                                                                     | `region` `Anexos` › `heading` 2 `Anexos` + `list` `Anexos` (cada item com `link` `Baixar <nome>`); nenhum `group` `Anexos`. Editando: a região tem descrição com a dica, as vagas e o aviso; cada salvo com `link` e `button` `Remover <nome>` (nenhum botão dentro de link); `button` `Anexar` **depois** da `list`                                                                                                                                                                                                                                                                                                                    |
| AN14 | M       | 1440×900 | C1 e C3 sem edição; C1 editando                                                                                          | `bottom` da Conclusão = `bottom` de Comentários (± 1 px) nos três; no `resolvable` sem edição, a barra `Resolver` encosta no rodapé da Conclusão (`bottom` da barra = `bottom` do card − 20 px, ± 1 px)                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| AN15 | M       | 390×844  | C1 sem edição e editando (com `apresentacao.pptx` incluído em edição, sem salvar)                                        | coluna única na ordem Descrição → Anexos → Linha do tempo → Conclusão → Detalhes → Comentários; documento sem rolagem horizontal; a faixa rola de lado; cabeçalho quebra linha sem estourar o card; X com alvo ≥ 24 px; `Anexar` abaixo da faixa, à esquerda, visível sem rolar a faixa                                                                                                                                                                                                                                                                                                                                                 |
| AN16 | M       | 1440×900 | em C1 editando, mudar só o título e salvar                                                                               | regressão: salva; o card de anexos volta à leitura sem mudança; nenhum bloco perdido                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| AN17 | I       | 1440×900 | abrir C4 (destinatário da transferência pendente)                                                                        | card `Anexos` só leitura com 1 bloco, na mesma posição; sem `Anexar`, sem X; depois recusar com `[QA] devolvido`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| AN18 | —       | —        | toda a bateria                                                                                                           | nenhum erro nem aviso de hidratação no console nem no `next-devtools`; nenhum erro de CORS; nenhum e-mail novo                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

Notas:

- **AN11, estado `empty`.** O estado vem de `ticketConclusionStateFor`
  (`app/_lib/domain/ticket-resolution.ts:115`): ativo, sem transferência
  pendente e o visualizador não pode resolver — ou chamado inativo. Na bateria
  de 2026-10-15, M, A e D tinham `Resolver` em C1 e nenhum chamado de QA
  Suporte ficou em `empty` (os `recusado` voltam à fila e são `resolvable`); o
  estado só foi alcançado por D em chamados `cancelado` da Diretoria (#12,
  #28), só em leitura. Esse é o caminho válido até existir regra de seed ou
  cenário de cancelamento em QA; o que importa é a Conclusão sem anexos.
- **AN12.** Com o diálogo "Novo chamado" **fechado**: aberto, o uploader da
  criação tem o próprio título `Anexos` (que não é heading de página).
- Os cenários AE1–AE27 de `attachments-in-edit.md` continuam valendo para o
  comportamento; onde eles dizem "Conclusão" ou "`h3` `Anexos`", vale "card
  `Anexos`" e "`h2` `Anexos`" (revisão de 2026-10-15 lá).

## Critério de pronto

1. AN1–AN18 aprovados pelo `df-qa`.
2. Nenhuma referência a anexo em `ticket-conclusion.tsx` e
   `resolve-ticket-form.tsx` (`grep -n "ttachment" ` vazio nos dois).
3. Um só heading "Anexos" na página, `h2`, com id único; sem `role="group"`
   no bloco.
4. `npx tsc --noEmit`, `npm run lint` e `npm run build` passam; `df-reviewer`
   sem bloqueante.

## Revisão de 2026-10-15 (pós-QA)

Ambiguidades apontadas pelo `df-qa` em
`docs/test-reports/2026-10-15-attachments-card.md` (Observações 1 a 5),
corrigidas acima. Nenhuma muda o comportamento esperado do código; todas
ajustam preparação ou expectativa do cenário.

- **AN2 e C1.** Cinco blocos de 136 px com `gap-2` somam 712 px
  (5 × 136 + 4 × 8), e a faixa tem 722 px úteis no 1440 (card de 756 px menos
  `p-5` e borda). Com 5 anexos a faixa **não** rola no desktop; a rolagem
  lateral no 1440 exige 6 ou mais (com 6, `scrollWidth` 864). No 390 já rola
  com 5. Como o "Novo chamado" aceita no máximo 5, o 6º entra pela edição — o
  AN7 cumpre esse papel, e a parte de overflow do AN2 é conferida depois dele.
- **AN8.** `Restam N vagas.` depende da ordem: `Restam 5 vagas.` só vale com
  o 6º anexo já salvo pelo AN7; com 5 salvos o correto é `Restam 6 vagas.`.
- **AN11, `empty`.** M, A e D têm `Resolver` em C1, então nenhum dos papéis
  de QA vê C1 em `empty`. O caminho real foi D em chamados `cancelado` da
  Diretoria (#12, #28), só leitura. Também passa a constar A na coluna "Quem"
  (C4 é aberto por A).
- **AN11, `awaiting_transfer`.** O texto anterior ("só a mensagem da
  transferência") era impreciso. O código (`ticket-conclusion.tsx:83-85`)
  renderiza só `LockedSolutionField`, cujo rótulo é `Solução` e cujo valor
  (`textarea` `readOnly`) é `state.message`, vindo de
  `describeTransferAwaitingConclusion` (`app/_lib/domain/ticket-resolution.ts:136`).
  É o desenho esperado e o que o QA observou (`innerText` `Conclusão|Solução`,
  mensagem no valor do campo). A seção "`TicketConclusion` (alterado)" já
  dizia isso corretamente.
- **Fora do escopo.** O uploader do "Novo chamado" descarta `.docx`/`.xlsx`
  sem a assinatura ZIP (`PK\x03\x04`) sem fazer request (Observação 3 do
  relatório). É comportamento anterior desta etapa (`attachment-tiles.md`,
  `attachments-in-edit.md`) e o uploader está fora do plano; só a preparação
  de C1 passou a exigir bytes válidos. Se o descarte silencioso precisar de
  aviso, vira tarefa própria.

## Checklist de encerramento

- [x] este contrato; revisões de 2026-10-15 em `attachments-in-edit.md`,
      `ticket-attachments-list-and-download.md` e `ticket-resolution.md`; plano
      com as Etapas 1 e 2 concluídas (`df-architect`)
- [x] `TicketAttachments`, frame como card (`section` + `h2`, sem `group`),
      Conclusão e `ResolveTicketForm` sem anexos, `page.tsx` com o card entre
      Descrição e Linha do tempo (`df-ui`)
- [x] `df-reviewer` — APROVADO, sem bloqueante
- [x] cenários do `df-qa` — 18 de 18
      (`docs/test-reports/2026-10-15-attachments-card.md`)
- [x] `npx tsc --noEmit`, `npm run lint`, `npm run build`
- [x] revisão pós-QA de 2026-10-15 (`df-architect`)
