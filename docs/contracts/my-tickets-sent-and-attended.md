# Contrato — Meus chamados: abas "Enviados e recusados" e "Atendidos"

Prevalece sobre `docs/contracts/my-tickets.md` e sobre as abas de Meus chamados
descritas em `docs/contracts/department-transfer.md` no que diverge. Decisão
técnica: `docs/adr/028-last-transfer-drives-sent-and-attended-tabs.md`.

Versões observadas: `next@16.3.5`, `drizzle-orm@0.45.2`, `zod@4.6.5`.

## Escopo em uma frase

Nenhuma tabela, coluna, enum, índice ou migration nova; nenhuma Server Action
nova. Duas abas saem, duas entram, `listMyTickets` e `countMyTicketsByTab`
passam a conhecer o **último envio** do chamado, e quem fez o último envio
passa a ver o chamado (`canViewTicket`, seção "Acesso do remetente").

## Abas

Ordem (`MY_TICKETS_TABS`, `app/_lib/domain/my-tickets-tabs.ts`):

| Chave       | Rótulo               | Regra                                                                                                                            |
| ----------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `assigned`  | Atribuídos a mim     | igual a hoje: `assigned_to = eu`, `ACTIVE_TICKET_STATUSES`, escopo `any`. **Aba padrão** (`DEFAULT_MY_TICKETS_TAB`)              |
| `sent`      | Enviados e recusados | último envio com `requested_by = eu` **e** (`pendente` + chamado `aguardando_aprovacao` **ou** `rejeitado` + chamado `recusado`) |
| `attended`  | Atendidos            | último envio com `requested_by = eu`, `aprovado`, chamado em status ativo e `assigned_to = reviewed_by` desse envio              |
| `resolved`  | Resolvidos           | igual a hoje                                                                                                                     |
| `closed`    | Fechados             | igual a hoje                                                                                                                     |
| `cancelled` | Cancelados           | igual a hoje                                                                                                                     |

Saem `opened` ("Abertos por mim") e `awaiting` ("Aguardando aprovação").
A Fila do setor não muda.

**Último envio** = a linha de `ticket_transfer` do chamado com maior
`(created_at, id)`. Chamado sem nenhuma linha em `ticket_transfer` nunca está
em `sent` nem em `attended`.

### O que o código grava hoje (verificado)

| Movimento                                           | Onde                                                                 | Grava `ticket_transfer`?                                                                                                   |
| --------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Enviar para outro setor, com ou sem destinatário    | `requestTicketTransfer` (`app/_lib/data/tickets.ts:1320`)            | sim, `pendente`; o destinatário vai em `to_user_id` (`:1455`). Destino é sempre **outro** setor (`isUsableTransferTarget`) |
| Aceitar o envio                                     | `approveTicketTransfer` (`:1539`)                                    | atualiza para `aprovado`, `reviewed_by` = quem aceitou; o chamado fica com `assigned_to` = quem aceitou e `em_andamento`   |
| Recusar o envio                                     | `rejectTicketTransfer` (`:1698`)                                     | atualiza para `rejeitado`; o chamado volta ao setor de origem, `recusado`                                                  |
| Assumir ou enviar a outra pessoa **do mesmo setor** | `assignTicket` (`:1082`)                                             | **não**; grava só `ticket_history.atribuicao`, sem aceite                                                                  |
| Trocar o destinatário na edição ou na resolução     | `updateTicketByAssignee` (`:466`), `updateTicketResolution` (`:994`) | **não**; grava só `atribuicao`                                                                                             |

Consequências:

- "Envio para outro analista" pendente só existe **entre setores** (o
  destinatário em `to_user_id`). Envio dentro do setor é imediato, não tem
  aceite e não entra em `sent` (nunca está pendente nem recusado).
- O repasse que não grava `ticket_transfer` é captado em `attended` pela
  condição `assigned_to = reviewed_by` (ADR 028): se quem aceitou passa o
  chamado a outra pessoa, devolve à fila ou alguém assume, o chamado sai de
  "Atendidos" do remetente.
- Envio pendente bloqueia resolver, cancelar e editar
  (`hasPendingTransfer` em `ticket-resolution.ts`, `ticket-actions.ts`,
  `ticket-edit.ts`), e `recusado` só é gravado por `rejectTicketTransfer`.
  Por isso `pendente` ⇔ `aguardando_aprovacao` e `rejeitado` ⇔ `recusado` no
  último envio; o filtro pelo status do chamado em `sent` é redundância
  deliberada, que tira o chamado da aba no instante em que o status muda.

## Tipos — `app/_lib/types/my-tickets.ts` (alterado)

```ts
export type MyTicketsOwnershipRelation = "author" | "assignee"

export type MyTicketsRelation =
  MyTicketsOwnershipRelation | "lastTransferRequester"

export type MyTicketsDepartmentScope = "origin" | "any"

export interface MyTicketsTabRuleBase {
  label: string
  statuses: readonly TicketStatus[]
  emptyTitle: string
  emptyDescription: string
}

export interface MyTicketsOwnershipTabRule extends MyTicketsTabRuleBase {
  relation: MyTicketsOwnershipRelation
  departmentScope: MyTicketsDepartmentScope
}

export interface MyTicketsLastTransferMatch {
  transferStatus: ApprovalStatus
  ticketStatuses: readonly TicketStatus[]
  assigneeIsReviewer: boolean
}

export interface MyTicketsLastTransferTabRule extends MyTicketsTabRuleBase {
  relation: "lastTransferRequester"
  lastTransfer: readonly MyTicketsLastTransferMatch[]
}

export type MyTicketsTabRule =
  MyTicketsOwnershipTabRule | MyTicketsLastTransferTabRule
```

`MyTicketsTabRule` passa a ser união discriminada por `relation`.
`departmentScope` só existe nas regras de `author`/`assignee`. `statuses`
continua em todas as regras (a UI monta o filtro de Status com ele); nas
regras de último envio, é a união dos `ticketStatuses` dos `lastTransfer`.

`MyTicketsTab`, `MyTicketsTabCounts`, `MyTicketsEmptyCopy` e
`MyTicketListItem` não mudam de forma; `MyTicketsTab` passa a ser
`"assigned" | "sent" | "attended" | "resolved" | "closed" | "cancelled"`.

## Domínio

### `app/_lib/domain/ticket-transfer.ts` (acrescido)

```ts
export const APPROVED_TRANSFER_STATUS =
  "aprovado" as const satisfies ApprovalStatus
```

### `app/_lib/domain/my-tickets.ts` (alterado)

`MY_TICKETS_TAB_RULES` (`satisfies Record<MyTicketsTab, MyTicketsTabRule>`):

| Chave      | `relation`              | `lastTransfer`                                                                                                            | `statuses`                                            |
| ---------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `sent`     | `lastTransferRequester` | `{ pendente, [aguardando_aprovacao], assigneeIsReviewer: false }`, `{ rejeitado, [recusado], assigneeIsReviewer: false }` | `aguardando_aprovacao`, `recusado`                    |
| `attended` | `lastTransferRequester` | `{ aprovado, ACTIVE_TICKET_STATUSES sem aguardando_aprovacao e sem recusado, assigneeIsReviewer: true }`                  | `aberto`, `em_analise`, `encaminhado`, `em_andamento` |

As de `assigned`, `resolved`, `closed` e `cancelled` são as de hoje.
`attended` exclui `aguardando_aprovacao` e `recusado` porque nenhum dos dois
convive com último envio `aprovado` (ver "O que o código grava hoje"); com
isso o filtro de Status da aba não mostra opção que nunca tem linha.

Textos de estado vazio (com período `Todos`; outro período continua com
`MY_TICKETS_EMPTY_PERIOD`):

| Aba        | `emptyTitle`                       | `emptyDescription`                                                                                                                                           |
| ---------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `sent`     | Nenhum chamado enviado ou recusado | Os chamados que você enviar para outro setor aparecem aqui enquanto aguardam o aceite do destino e, se forem recusados, até você dar um novo encaminhamento. |
| `attended` | Nenhum chamado atendido            | Os chamados que você enviou e foram aceitos pelo destino aparecem aqui enquanto continuam com quem os aceitou, até serem resolvidos ou cancelados.           |

`mapMyTicketsTabs` passa a montar `assigned`, `sent`, `attended`, `resolved`,
`closed`, `cancelled`. `DEFAULT_MY_TICKETS_TAB` continua `assigned`.
`myTicketsEmptyCopy` não muda.

## Validação — nada novo

`myTicketsSearchParamsSchema` usa `z.enum(MY_TICKETS_TABS)`. **Aba antiga na
URL** (`?tab=opened`, `?tab=awaiting`, ou qualquer valor fora da lista) falha
na validação e `parseMyTicketsTab` devolve `DEFAULT_MY_TICKETS_TAB`
(`assigned`), mantendo o `periodo` da URL. Não há redirecionamento nem
reescrita da URL: a página renderiza "Atribuídos a mim" com a URL como veio, e
o próximo clique em aba ou período escreve `tab=` válido. Nenhum link do
código aponta para `opened` ou `awaiting` (o atalho do Início usa
`OVERDUE_MY_TICKETS_TAB = "assigned"`).

## `df-data` — `app/_lib/data/my-tickets.ts` (alterado)

Assinaturas **não mudam**:

```ts
export async function listMyTickets(
  userId: number,
  tab: MyTicketsTab,
  range: DateRange | null = null,
): Promise<MyTicketListItem[]>

export async function countMyTicketsByTab(
  userId: number,
  range: DateRange | null = null,
): Promise<MyTicketsTabCounts>
```

O que muda por dentro:

1. **Subconsulta do último envio**, uma só, usada pelas duas funções:

   ```sql
   select distinct on (ticket_id) ticket_id, requested_by, status, reviewed_by
   from ticket_transfer
   order by ticket_id, created_at desc, id desc
   ```

   Em Drizzle: `db.selectDistinctOn([ticketTransfer.ticketId], {...})
.from(ticketTransfer).orderBy(ticketTransfer.ticketId,
desc(ticketTransfer.createdAt), desc(ticketTransfer.id)).as("last_transfer")`,
   com `left join` em `ticket.id`. O índice `transfer_ticket_idx (ticket_id,
created_at desc)` atende. **Não** filtrar por `requested_by` dentro da
   subconsulta: o último envio é o do chamado, não o do usuário.

2. **`tabCondition(userId, tab)`** narra por `rule.relation` (anote
   `const rule: MyTicketsTabRule = MY_TICKETS_TAB_RULES[tab]`):
   - `author` / `assignee`: como hoje (`eq(coluna, userId)`,
     `inArray(ticket.status, rule.statuses)`,
     `DEPARTMENT_SCOPE_CONDITIONS[rule.departmentScope]`).
   - `lastTransferRequester`:

     ```
     last_transfer.requested_by = userId
     and ( OR, para cada match de rule.lastTransfer:
           last_transfer.status = match.transferStatus
           and ticket.status in match.ticketStatuses
           and (match.assigneeIsReviewer ? ticket.assigned_to = last_transfer.reviewed_by : true) )
     ```

     `ticket.assigned_to = reviewed_by` com qualquer lado nulo é falso, que é o
     desejado (chamado na fila não está "atendido").

3. **`countMyTicketsByTab`**: o `where` de base passa a ser
   `created_by = eu or assigned_to = eu or last_transfer.requested_by = eu`
   (mais o período), com o mesmo `left join`. As colunas continuam montadas
   por `mapMyTicketsTabs`, sem objeto literal.

4. `listMyTickets` mantém select, joins, período e ordenação; ganha só o
   `left join` do último envio.

Erro de tipo esperado até essa mudança: `app/_lib/data/my-tickets.ts:30`
(`rule.departmentScope` não existe nas regras de último envio).

## Acesso do remetente (decisão do usuário, 2026-11-18)

Quem é `requested_by` do **último** envio do chamado passa em `canViewTicket`:
abre o detalhe, comenta (só comentário público: gravar o interno exige
`canWriteInternalComment`, igual a `canSeeInternalComments`, subseção
"Comentário interno") e baixa anexos. Não
edita, não resolve, não assume, não atende e não envia: essas regras exigem
destinatário ou setor e não mudam. Perde o acesso quando **outra pessoa** faz
um envio mais recente. Revisa o ADR 016; decisão no ADR 028.

### Comentário interno: só grava quem pode ler (revisão de 2026-11-18)

Regra: **só grava comentário interno quem pode ver comentário interno**
(`canSeeInternalComments`: diretoria ou setor atual do chamado). Antes, o
remetente do último envio (e, já antes desta feature, o autor de fora do
setor atual) passava em `canCommentOnTicket` e podia gravar um comentário
`interna` que ele mesmo não conseguia ler depois de sair do setor.

O bloqueio entra numa função própria, e não em `ticketCommentBlockFor`,
porque `ticketCommentBlockFor` também é a base de editar e excluir
comentário (`ticketCommentEditBlockFor`, `ticketCommentDeleteBlockFor`), que
não mudam a visibilidade da mensagem. Editar e excluir o próprio comentário
interno continuam como estão.

Tipos (`app/_lib/types/ticket-comments.ts`):

```ts
export type TicketCommentWriteBlockReason =
  TicketCommentBlockReason | "INTERNAL_NOT_ALLOWED"

export interface TicketCommentFormOpen {
  state: "open"
  allowInternal: boolean
}
```

Domínio (`app/_lib/domain/ticket-comments.ts`):

```ts
export const canWriteInternalComment = (
  writer: TicketViewerFacts,
  ticket: Pick<TicketVisibilityFacts, "currentDepartmentId">,
): boolean

export const ticketCommentWriteBlockFor = (
  commenter: TicketActorFacts,
  ticket: TicketCommentFacts,
  visibility: MessageVisibility,
  now: Date,
): TicketCommentWriteBlockReason | null

export const canWriteTicketComment = (
  commenter: TicketActorFacts,
  ticket: TicketCommentFacts,
  visibility: MessageVisibility,
  now: Date,
): boolean
```

- `canWriteInternalComment` = `canSeeInternalComments`, com nome de escrita
  para que a regra de gravar e a de ler não se separem.
- `ticketCommentWriteBlockFor` devolve primeiro o bloqueio de
  `ticketCommentBlockFor`; sem ele, `INTERNAL_NOT_ALLOWED` quando
  `visibility` é `interna` e `canWriteInternalComment` é falso.
- `ticketCommentFormStateFor` passa a devolver
  `{ state: "open", allowInternal }`, com
  `allowInternal = canWriteInternalComment(commenter, ticket)`.

Quem chama o quê:

- **`df-data`** — `insertTicketMessage` (`app/_lib/data/ticket-messages.ts:80`)
  troca `canCommentOnTicket(commenter, ticketRow, now)` por
  `canWriteTicketComment(commenter, ticketRow, visibility, now)`, dentro da
  transação que já trava o chamado (`for share`) e o autor. Falha continua
  `{ status: "not_commentable" }`. A regra fica aqui, e não na action, porque
  o setor atual do chamado só é confiável dentro da trava: um envio que
  termine entre a leitura da action e o `insert` mudaria a resposta. Feito; com isso `canCommentOnTicket` ficou sem chamador e foi **removida** do domínio (2026-11-18), para não restar uma segunda forma da regra que pula `INTERNAL_NOT_ALLOWED`.
- **`df-actions`** — `addTicketComment` (`app/_lib/actions/ticket-comments.ts`)
  já passa `visibility: messageVisibilityFor(parsed.data.isPrivate)` para
  `insertTicketMessage`; **nenhuma mudança de código**. A recusa chega como
  `not_commentable` e sai como `FORBIDDEN` com
  "Você não pode comentar neste chamado." (mapa `ADD_OUTCOME_FAILURES`).
- **`df-ui`** — o checkbox "Comentário privado"
  (`app/(app)/tickets/[id]/_components/ticket-comment-form.tsx:86`) **só é
  renderizado** quando `form.allowInternal` é verdadeiro; não fica
  desabilitado. Um controle desabilitado anuncia uma opção que a pessoa
  nunca vai ter, e sem ele o valor padrão `isPrivate: false`
  (`buildTicketCommentFormDefaults`) é o que vai para a action.
  `app/(app)/tickets/[id]/_components/ticket-comments.tsx:71` repassa
  `allowInternal={form.allowInternal}` ao `TicketCommentForm`, que ganha a
  prop `allowInternal: boolean`.

### Tipos — `app/_lib/types/ticket.ts` (alterado)

```ts
export interface TicketVisibilityFacts {
  createdBy: number
  assignedTo: number | null
  currentDepartmentId: number
  lastTransferRequestedBy: number | null
}
```

`lastTransferRequestedBy` = `ticket_transfer.requested_by` da linha mais
recente do chamado (`created_at desc, id desc`), ou `null` sem envio. Campo
obrigatório: toda interface que estende `TicketVisibilityFacts` o herda
(`TicketDetail`, `TicketActionsFacts`, `TicketActionsDetailFacts`,
`TicketAssignmentFacts`, `TicketAttendDetailFacts`, `TicketCommentFacts`,
`TicketResolutionFacts`, `TicketConclusionFacts`, `TicketTransferReviewFacts`,
`TicketAttachmentFacts` em `types/attachment.ts:128`, o `ticket` de
`AttachmentDownloadTarget` (`types/attachment.ts:150`) e, por `TicketAssignmentFacts`,
`DepartmentQueueListItem`).

### Domínio (alterado)

| Função                                                                                                                | Mudança                                                                                                                                                                                                                                                                                |
| --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `canViewTicket` (`domain/ticket.ts:185`)                                                                              | passa também quando `ticket.lastTransferRequestedBy === viewer.userId`                                                                                                                                                                                                                 |
| `canViewTicketAfterTransfer` (`domain/ticket-transfer.ts:209`)                                                        | monta os fatos pós-envio com `lastTransferRequestedBy: viewer.userId` (quem envia é o novo último remetente), então **sempre verdadeira** para quem envia                                                                                                                              |
| `canViewTicketAfterDecline` (`domain/ticket-transfer.ts:444`)                                                         | monta os fatos pós-recusa com `lastTransferRequestedBy: transfer.requestedBy` (o envio recusado continua sendo o último)                                                                                                                                                               |
| `canFollowTicketTransferReview`, `canDownloadAttachment`, `ticketCommentBlockFor`                                     | sem mudança de código; herdam a regra nova por chamarem `canViewTicket`                                                                                                                                                                                                                |
| `canWriteInternalComment`, `ticketCommentWriteBlockFor`, `canWriteTicketComment` (`domain/ticket-comments.ts`, novas) | gravar comentário `interna` exige `canSeeInternalComments`; `ticketCommentFormStateFor` devolve `allowInternal` no estado `open`. Subseção "Comentário interno"                                                                                                                        |
| montadores de fatos a partir do detalhe                                                                               | repassam `lastTransferRequestedBy`: `ticketActionsCardStateFor` (`ticket-actions.ts`), `assignmentFactsFromDetail` (`ticket-assignment.ts`), `ticketConclusionStateFor` (`ticket-resolution.ts:115`), `canSendTicketToDepartmentDetail` e `ticketAttendKindFor` (`ticket-transfer.ts`) |

### `df-data` — todo ponto que monta `TicketVisibilityFacts`

Sugestão: um helper único em `app/_lib/data/` (dono `df-data`), por exemplo
uma subconsulta escalar
`(select requested_by from ticket_transfer where ticket_id = ticket.id order by created_at desc, id desc limit 1)`,
usada como coluna `lastTransferRequestedBy` em todos os selects abaixo. Nas
transações que travam o chamado com `for update`, nenhum envio novo entra no
meio (todo envio trava o chamado antes), então o valor lido é consistente.

Linhas de `npx tsc --noEmit` em 2026-11-18 (erro de tipo esperado em cada uma):

| Arquivo e linha                                   | Função                                              | Quem depende                                                                                                |
| ------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `app/_lib/data/tickets.ts:290`                    | `findTicketDetail` (`TicketDetail`)                 | `app/(app)/tickets/[id]/page.tsx:99` (`canViewTicket` → `notFound`) e todas as decisões de botão do detalhe |
| `app/_lib/data/tickets.ts:498`                    | `updateTicketByAssignee`                            | action de edição (`app/_lib/actions/tickets.ts`)                                                            |
| `app/_lib/data/tickets.ts:930`, `:944`            | `updateTicketActions`                               | action de "Ações"                                                                                           |
| `app/_lib/data/tickets.ts:991`                    | `findTicketAttachmentFacts`                         | `attachmentEditFailureFor`, `app/_lib/actions/tickets.ts:363`                                               |
| `app/_lib/data/tickets.ts:1020`, `:1034`, `:1042` | `updateTicketResolution`                            | action de resolução                                                                                         |
| `app/_lib/data/tickets.ts:1105`, `:1139`          | `assignTicket`                                      | actions Assumir e Enviar (`app/_lib/actions/`)                                                              |
| `app/_lib/data/tickets.ts:1253`, `:1268`          | `startTicketWork`                                   | action Atender                                                                                              |
| `app/_lib/data/tickets.ts:1351`, `:1365`, `:1491` | `requestTicketTransfer` (inclui `actorKeepsAccess`) | `sendTicketToDepartment`, `app/_lib/actions/ticket-transfer.ts:320`                                         |
| `app/_lib/data/tickets.ts:1569`, `:1595`          | `approveTicketTransfer`                             | action de aceite                                                                                            |
| `app/_lib/data/tickets.ts:1728`, `:1757`, `:1901` | `rejectTicketTransfer` (inclui `actorKeepsAccess`)  | `declineTicketTransfer`, `app/_lib/actions/ticket-transfer.ts:404`                                          |
| `app/_lib/data/ticket-messages.ts:76`, `:78`      | `insertTicketMessage`                               | action de comentar                                                                                          |
| `app/_lib/data/ticket-messages.ts:126`, `:151`    | `updateTicketMessage`                               | action de editar comentário                                                                                 |
| `app/_lib/data/ticket-messages.ts:202`, `:227`    | `deleteTicketMessage`                               | action de excluir comentário                                                                                |
| `app/_lib/data/attachments.ts:45`                 | `findAttachmentForDownload`                         | rota `app/api/attachments/[id]/route.ts:68` (`canDownloadAttachment`)                                       |
| `app/_lib/data/department-queue.ts:59`            | `listQueueTickets` (`DepartmentQueueListItem`)      | tabela da Fila (`canAssumeTicket`; o campo não muda o resultado ali)                                        |
| `app/_lib/data/my-tickets.ts:30`                  | `tabCondition` (regras novas das abas)              | `/tickets`                                                                                                  |

**Sem erro de tipo, mas precisa mudar:** `app/_lib/data/ticket-search.ts:11`
(`visibilityCondition`, que espelha `canViewTicket` em SQL para a busca do
topo e para `searchTickets`, ADR 015). Ganha um quarto ramo no `or`: o
`requested_by` do último envio = `viewer.userId`. Sem isso o remetente abre o
chamado pelo link, mas não o encontra na busca.

### `df-actions` — o que conferir

- Nenhuma assinatura muda. As actions recebem os fatos já carregados do
  `df-data`.
- `sendTicketToDepartment` (`app/_lib/actions/ticket-transfer.ts:320`):
  `actorKeepsAccess` passa a vir **sempre** verdadeiro, então a action sempre
  segue o ramo "com acesso" (`revalidatePath` do detalhe). O ramo sem acesso
  fica sem uso no envio. Pode ficar como está (não quebra), ou ser
  simplificado numa limpeza depois.
- `declineTicketTransfer` (`:404`): sem mudança de comportamento, salvo
  quando quem recusa é o próprio remetente do envio recusado (passa a manter o
  acesso).
- Rota `app/api/attachments/[id]/route.ts`: sem mudança de código; passa a
  liberar o download ao remetente quando `findAttachmentForDownload` trouxer o
  campo.
- As actions que gravam envio, aceite, recusa, atribuição, resolução e
  cancelamento já revalidam `/tickets`; conferir só que continuam revalidando.

### `df-ui` — o que muda

- `/tickets`: nada além de ler as regras. `app/(app)/tickets/page.tsx` itera
  `MY_TICKETS_TABS` e lê `label`, contagem e `myTicketsEmptyCopy`;
  `my-tickets-table.tsx` lê `statuses` e `emptyTitle`, que existem nas duas
  formas de regra. Não ler `relation`, `departmentScope` nem `lastTransfer`
  na UI. Nenhum texto da tela cita "Abertos por mim" ou "Aguardando
  aprovação" como aba.
- `/tickets/[id]`: nenhuma mudança de código. A página já decide com
  `canViewTicket` e com as regras de domínio, que recebem o campo novo pelo
  `TicketDetail`.
- `send-to-department-dialog.tsx:116`: o ramo `keepsAccess` falso deixa de
  ocorrer. Depois de enviar, o remetente continua no detalhe, que agora mostra
  o envio pendente. Não exige mudança.

## Decisões registradas

- **Repasse dentro do setor de destino (P2): mantido** `assigneeIsReviewer:
true`. "Atendidos" exige que o chamado continue com quem aceitou
  (`assigned_to = reviewed_by`); repassar, devolver à fila ou outra pessoa
  assumir tira o chamado da aba do remetente (MT9).
- **Envio dentro do próprio setor (P3): fora.** "Enviar" para outra pessoa do
  mesmo setor (`assignTicket`) não tem aceite e não grava `ticket_transfer`,
  então **não** entra em "Enviados e recusados" nem em "Atendidos" e não dá
  acesso por esta regra.
- **Resolvido em outro setor (MT10): comportamento aceito.** Chamado aceito e
  resolvido no setor de destino sai de "Atendidos" do remetente e não entra em
  "Resolvidos" dele, mesmo sendo autor, porque Resolvidos mantém o escopo
  `origin`.

## Cenários para o `df-qa`

`M` = QA Membro Suporte, `A` = QA Admin Suporte, `I` = QA Admin Infra
(`docs/contracts/qa-seed.md`). Títulos de chamados criados começam com `[QA]`.
Período `Todos` em todos os cenários, salvo quando dito. Consulta de
referência do último envio:

```sql
select distinct on (ticket_id) ticket_id, requested_by, status, reviewed_by
from ticket_transfer order by ticket_id, created_at desc, id desc
```

| #    | Quem        | Ação                                                                                                                                         | Esperado                                                                                                                                                                                                   |
| ---- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MT1  | M e Diretor | `/tickets` pelo menu                                                                                                                         | seis abas na ordem Atribuídos a mim, Enviados e recusados, Atendidos, Resolvidos, Fechados, Cancelados; Atribuídos a mim ativa (`aria-current="page"`); **sem** "Abertos por mim" e "Aguardando aprovação" |
| MT2  | qualquer    | `/tickets?tab=opened&periodo=todos`, `/tickets?tab=awaiting&periodo=semana`, `/tickets?tab=xyz`                                              | os três mostram Atribuídos a mim, sem erro; o segundo mantém o período Semana; clicar outra aba escreve `tab=` válido na URL                                                                               |
| MT3  | M           | criar `[QA] Enviados ida` em QA Suporte → anotar contagens → no detalhe, "Enviar para outro setor" → QA Infra, sem destinatário              | sai de Atribuídos a mim (−1) e entra em Enviados e recusados (+1) com badge "Aguardando aprovação"; não aparece em Atendidos; banco: último envio com `requested_by` = M, `pendente`                       |
| MT4  | I, depois M | I aceita `[QA] Enviados ida` em Aprovações; M abre Meus chamados                                                                             | para M: sai de Enviados e recusados (−1) e entra em Atendidos (+1), badge "Em andamento"; para I: em Atribuídos a mim; banco: último envio `aprovado`, `reviewed_by` = I = `assigned_to`                   |
| MT5  | I, depois M | caso de uso do usuário, devolução: I envia `[QA] Enviados ida` para QA Suporte com destinatário M; I e M abrem Meus chamados                 | para M: sai de Atendidos (−1); para I: entra em Enviados e recusados (+1). I abre a linha e o detalhe carrega (acesso do remetente, MT17)                                                                  |
| MT6  | M, depois I | M aceita a devolução em Aprovações; M e I abrem Meus chamados                                                                                | para M: em Atribuídos a mim (+1), não em Atendidos; para I: sai de Enviados e recusados (−1) e entra em Atendidos (+1)                                                                                     |
| MT7  | M, depois I | criar `[QA] Enviados recusa`, enviar a QA Infra; I recusa com motivo; M abre Meus chamados                                                   | para M: em Enviados e recusados com badge "Recusado" **e** em Atribuídos a mim (se a recusa devolveu a M — sobreposição aceita); para I: em nenhuma das abas novas                                         |
| MT8  | M           | em `[QA] Enviados recusa` (recusado), M atende, resolve ou reenvia a QA Infra                                                                | atender ou resolver: sai de Enviados e recusados assim que o status deixa `recusado`; reenviar: continua em Enviados e recusados, agora com "Aguardando aprovação" (novo último envio `pendente` de M)     |
| MT9  | M, I        | criar `[QA] Atendidos repasse`, enviar a QA Infra, I aceita (M vê em Atendidos); I usa "Devolver à fila" ou envia a outra pessoa de QA Infra | sai de Atendidos de M (−1) no repasse, sem nova linha em `ticket_transfer` (P2, `assigneeIsReviewer: true`). Se não houver segunda pessoa ativa em QA Infra, usar "Devolver à fila"                        |
| MT10 | M, I        | criar `[QA] Atendidos resolve`, enviar a QA Infra, I aceita e resolve                                                                        | sai de Atendidos de M (−1) e **não** entra em Resolvidos de M (Resolvidos tem escopo `origin` e o chamado está em QA Infra); M continua abrindo pela busca do topo, por ser autor                          |
| MT11 | M, I        | criar `[QA] Atendidos reenvio`, enviar a QA Infra, I aceita; I envia para QA Suporte sem destinatário                                        | sai de Atendidos de M (último envio passa a ser de I, `pendente`); entra em Enviados e recusados de I                                                                                                      |
| MT12 | M           | criar `[QA] Fila parada` em QA Suporte **sem** destinatário (vai para a fila)                                                                | em nenhuma aba de Meus chamados de M; presente na Fila do setor de QA Suporte                                                                                                                              |
| MT13 | banco       | para M, A, I: contagens de Enviados e recusados e Atendidos (Todos) contra a consulta de referência + `ticket.status` e `assigned_to`        | batem com as regras da seção "Abas"                                                                                                                                                                        |
| MT14 | M           | em Enviados e recusados, abrir o filtro de Status; depois em Atendidos                                                                       | Enviados e recusados: só "Aguardando aprovação" e "Recusado"; Atendidos: "Aberto", "Em análise", "Encaminhado", "Em andamento"                                                                             |
| MT15 | M           | Enviados e recusados e Atendidos vazios com Todos; depois com um Personalizado sem chamados                                                  | Todos: os textos da tabela de estado vazio deste contrato; outro período: "Nenhum chamado neste período"                                                                                                   |
| MT16 | qualquer    | navegar por MT1–MT15                                                                                                                         | nenhum erro nem aviso de hidratação no dev server; nenhuma linha nova em `ticket`, `ticket_history`, `ticket_transfer` além das geradas pelas ações dos cenários                                           |

Observação do MT10: **comportamento aceito pelo usuário** (2026-11-18).
Resolvidos mantém o escopo `origin` (revisão de 2026-10-08 de
`my-tickets.md`), então o chamado resolvido em outro setor sai de Meus
chamados do autor remetente.

### Cenários do acesso do remetente

Preparação (escrita, títulos `[QA]`): M cria `[QA] Acesso remetente` em QA
Suporte com **um anexo** e destinatário M, e escreve um comentário
**interno**. M envia o chamado para QA Infra; I aceita; I envia o chamado de
volta para QA Suporte com destinatário M. Daí em diante I não é autor, não é
destinatário, não está em QA Suporte e não é da diretoria. O único motivo de I
ver o chamado é ser o `requested_by` do último envio.

| #    | Quem        | Ação                                                                                                                                                                                                                                               | Esperado                                                                                                                                                                                                                                                                                                                                                                               |
| ---- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MT17 | I           | Enviados e recusados → clicar `[QA] Acesso remetente`                                                                                                                                                                                              | o detalhe abre (sem "Chamado não encontrado"); mostra o envio pendente para QA Suporte                                                                                                                                                                                                                                                                                                 |
| MT18 | I           | no detalhe, procurar os botões                                                                                                                                                                                                                     | **sem** Editar, Resolver, Assumir, Atender, Enviar, Enviar para outro setor, Aceitar e Recusar; o card de Ações fica só leitura                                                                                                                                                                                                                                                        |
| MT19 | I           | escrever e salvar um comentário                                                                                                                                                                                                                    | o comentário aparece no detalhe; banco: linha nova em `message` com `user_id` = I e `visibility = 'publica'`; o comentário interno de M **não** aparece para I                                                                                                                                                                                                                         |
| MT20 | I           | clicar no anexo                                                                                                                                                                                                                                    | `GET /api/attachments/{id}` redireciona para a URL assinada e o arquivo baixa                                                                                                                                                                                                                                                                                                          |
| MT21 | I           | requisições diretas de edição, resolução e "Ações" para `[QA] Acesso remetente`                                                                                                                                                                    | recusadas (`FORBIDDEN` ou `NOT_EDITABLE`, conforme o contrato de cada action); nada gravado em `ticket`, `ticket_history` ou `attachment`                                                                                                                                                                                                                                              |
| MT22 | I           | busca do topo pelo número de `[QA] Acesso remetente`                                                                                                                                                                                               | o chamado aparece nas sugestões (`visibilityCondition` com o ramo do último envio)                                                                                                                                                                                                                                                                                                     |
| MT23 | M, depois I | M aceita a devolução; I abre Atendidos e o detalhe                                                                                                                                                                                                 | o chamado está em Atendidos de I e o detalhe continua abrindo (o último envio ainda é de I, agora `aprovado`)                                                                                                                                                                                                                                                                          |
| MT24 | M, depois I | M envia `[QA] Acesso remetente` para um terceiro setor ativo, nem QA Infra nem QA Suporte (se o seed não tiver, A cadastra `[QA] Terceiro` em Cadastros → Setores); I tenta de novo MT17, MT19, MT20 e MT22                                        | I **perde o acesso**: o detalhe dá "Chamado não encontrado", o comentário volta `NOT_FOUND`, o anexo dá 404, a busca não traz o chamado, e ele some de Atendidos de I. Banco: último envio com `requested_by` = M                                                                                                                                                                      |
| MT25 | A           | abrir um chamado de M que esteja com A como destinatário em QA Suporte e enviá-lo para QA Infra                                                                                                                                                    | A **continua no detalhe** depois do envio (antes, saía para o link de voltar). O detalhe mostra o envio pendente, e o chamado está em Enviados e recusados de A                                                                                                                                                                                                                        |
| MT26 | I, depois M | com o chamado ainda em QA Suporte e I só remetente (antes do MT24): I abre o formulário de comentário; depois envia direto `addTicketComment` com `{ ticketId, content: "[QA] interno forjado", isPrivate: true }`; M abre o detalhe para comparar | para I, o formulário **não tem** o checkbox "Comentário privado" (nem desabilitado); a requisição volta `FORBIDDEN` com "Você não pode comentar neste chamado." e nenhuma linha nova em `message` nem em `message_history`. Para M (QA Suporte, setor atual) o checkbox aparece. Banco: `select count(*) from message where ticket_id = {id} and content = '[QA] interno forjado'` = 0 |
| MT27 | qualquer    | navegar por MT17–MT26                                                                                                                                                                                                                              | nenhum erro nem aviso de hidratação no dev server; linhas novas só as das ações descritas                                                                                                                                                                                                                                                                                              |

## Ficam superados

- Em `docs/contracts/my-tickets.md`: as abas "Abertos por mim" e "Aguardando
  aprovação" e todo cenário que as cita (ordem dos cenários 2, 45 e 55; o
  `tab=opened` explícito dos cenários 23, 24, 49, 53 e 57, que agora cai em
  Atribuídos a mim; a partição do cenário 48).
- Em `docs/contracts/department-transfer.md`: a aba "Aguardando aprovação" de
  Meus chamados (Etapa 1) e a ordem das abas do cenário TR5. O chamado
  pendente de quem enviou passa a estar em "Enviados e recusados". Também fica
  superado o risco "Quem enviou e perde o acesso" (tabela de decisões) e, no
  envio, o ramo `actorKeepsAccess` falso (passo 5 da action e saída do
  detalhe). Cenários que esperam "Chamado não encontrado" (TR13, RJ14 e afins) valem
  só se o usuário do cenário não for o remetente do último envio; se for, ele
  passa a ter acesso ao detalhe. Marcados como superados no próprio
  documento, com nota de revisão de 2026-11-18 no topo:
  - a linha "Quem enviou e perde o acesso" da tabela de decisões;
  - o parágrafo "Quem continua vendo o chamado depois do envio" (resultado
    do teste adaptado da Etapa 2);
  - o risco 5 "Quem envia perde o acesso" (e, com ele, a saída do detalhe
    esperada em TR3 e TR9).
- Em `docs/contracts/department-queue.md` (notas de revisão de 2026-11-18):
  a citação de "Abertos por mim" como usuária de `isNotAwaitingApproval`
  (revisão de `aguardando_aprovacao` fora da Fila) e a exceção "quem agiu
  perde o acesso" da tabela de revalidação, que deixa de ocorrer no envio e
  continua só na recusa.
- Em `docs/contracts/ticket-edit-window.md` e demais contratos que usam
  `?tab=opened` como ponto de partida: a URL cai em Atribuídos a mim.

## Critério de pronto

1. `npx tsc --noEmit`, `npm run lint` e `npm run build` passam.
2. `app/_lib/data/my-tickets.ts` monta a condição a partir de
   `MY_TICKETS_TAB_RULES`, sem repetir status ou estado de envio no SQL.
3. MT1–MT27 passam.

## Pendência para um `/refactor`

`canViewTicketAfterTransfer` (`app/_lib/domain/ticket-transfer.ts:209`) é
hoje sempre verdadeira para quem envia (monta os fatos com
`lastTransferRequestedBy: viewer.userId`), então o `actorKeepsAccess` que
`requestTicketTransfer` calcula com ela (`app/_lib/data/tickets.ts:1498`), o
ramo sem acesso de `sendTicketToDepartment`
(`app/_lib/actions/ticket-transfer.ts`) e o ramo `keepsAccess` falso de
`send-to-department-dialog.tsx:116` são código morto no envio. Ficam como
estão nesta feature; a remoção é de um `/refactor` futuro, que cruza
`df-architect`, `df-data`, `df-actions` e `df-ui`. Na recusa
(`canViewTicketAfterDecline`, `actorKeepsAccess` de `rejectTicketTransfer`)
o cálculo continua vivo e não entra nessa limpeza.
