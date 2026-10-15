# Contrato — Envio do chamado para outro setor, com aceite e recusa

Regras aprovadas pelo usuário em 2026-10-08, entregues em **três etapas**, cada
uma um commit. Este documento cobre as três de uma vez para que não se
contradigam; cada etapa tem sua seção com as assinaturas de cada agente. As
três etapas têm código publicado pelo `df-architect` (a Etapa 2 e a Etapa 3
em 2026-10-09); a seção de cada uma é o contrato das ondas seguintes dela.

Decisão de desenho: `docs/adr/016-transfer-moves-ticket-before-acceptance.md`.

Este documento **altera** contratos anteriores, que continuam valendo no que não
é tocado aqui (cada um tem revisão de 2026-10-08 apontando para cá):

- `docs/contracts/my-tickets.md` — aba nova e escopo de setor de origem
- `docs/contracts/department-queue.md` — `aguardando_aprovacao` passa a ser
  alcançável na Fila do destino
- `docs/contracts/ticket-edit.md` — precedência de `AWAITING_APPROVAL`
- `docs/contracts/queue-tabs-comment-delete-and-attend.md` — "Atender" ganha o
  caso do aceite (Etapa 2) e `recusado` (Etapa 3)

Padrões de outcome, trava, conflito e resultado de action vêm de
`department-queue.md` (`assignTicket`) e
`queue-tabs-comment-delete-and-attend.md` (`startTicketWork`, `attendTicket`).

> Revisão de 2026-10-12 (`docs/contracts/assignee-edit-and-assume.md`, ADR
> 017, que prevalece no que diverge): a edição passou a ser **do destinatário
> atual**. Com o envio pendente, o chamado está na fila do destino sem
> destinatário: **ninguém** vê "Editar" (nem esmaecido; o botão bloqueado e
> `describeTicketAwaitingApproval` saíram). Quem aceita vira destinatário e
> passa a editar; no destino, a primeira edição exige uma tag do setor de
> destino (recategoriza). Na recusa, quem recebe o chamado de volta (o
> solicitante, se válido) edita. **Ficam superados**: a linha "Edição pelo
> autor com envio pendente" da tabela de decisões, a seção
> "`app/_lib/domain/ticket-edit.ts` (alterado)" da Etapa 1 (a ordem de
> `ticketEditBlockFor` agora põe `AWAITING_APPROVAL` depois do setor), o
> "'Editar' **bloqueado**" dos cenários TR6 e TR11 (sem "Editar" nenhum), o
> item "o 'Editar' bloqueado (autor) e o 'Atender' (destino)" das notas de UI
> da Etapa 2 e o nome `TICKET_STATUS_IS_EDITABLE_BY_AUTHOR` da tabela de mapas
> da Etapa 3 (agora `TICKET_STATUS_IS_EDITABLE`, "Editar" do destinatário,
> mesmos valores). O "`Editar` (A é autor)" do RJ7 continua valendo pelo
> motivo novo: A é o destinatário devolvido.

> Revisão de 2026-10-12, comentário na troca (`docs/contracts/handoff-comment.md`,
> que prevalece no que diverge): o envio para outro setor passa a exigir um
> **comentário** (`comment` em `sendTicketToDepartmentSchema` e em
> `RequestTicketTransferValues`), gravado como `message` `publica` de quem
> enviou e em `ticket_transfer.request_reason`, na mesma transação e com o
> mesmo instante. Com isso o card Conclusão do chamado aguardando aprovação
> mostra o comentário (`describeTransferAwaitingConclusion`, sem mudança de
> código) e o aviso amarelo o mostra abaixo de `Solicitada por …`.
> `SEND_TO_DEPARTMENT_DIALOG_DESCRIPTION` ganhou a frase sobre o comentário. O
> `reason` da recusa passou a usar o mesmo schema-base (`commentTextSchema`),
> com as mesmas mensagens. **Ficam superados**: a linha `request_reason`
> ("Nulo: o envio não pede motivo") da tabela de decisões, o
> `request_reason` nulo do TR4 (agora é o comentário) e, em todo cenário que
> envia para outro setor (TR3, TR9–TR11, TR16, RJ16 e as preparações de
> aceite e recusa), o envio sem comentário: preencher um comentário `[QA] …`.

> Revisão de 2026-10-15 (`docs/contracts/approvals.md` e revisão de mesma data
> em `docs/contracts/department-queue.md`, que prevalecem no que diverge): o
> chamado enviado continua indo para o setor de destino
> (`current_department_id`, sem destinatário, `aguardando_aprovacao`), mas
> **não aparece mais na Fila** do destino, em aba nenhuma (nem "Em aberto"
> nem "Todos", nem nas contagens). Ele é listado na aba **"Aprovações"**
> (`/approvals`) do destino até ser aceito ou recusado. Depois do aceite, entra
> em Em andamento da Fila do destino; depois da recusa, volta à Fila da origem
> como antes. `SEND_TO_DEPARTMENT_DIALOG_DESCRIPTION` passou a
> `O chamado sai da fila deste setor e vai para a lista de Aprovações do setor escolhido, aguardando aprovação até alguém de lá atendê-lo. O comentário fica público no chamado e aparece no aviso de aprovação.`
> **Ficam superados**: o "Fila: nada a codar. O chamado enviado aparece em
> 'Em aberto' do destino" da Etapa 1, a linha "Em aberto" da tabela "Fila do
> setor — abas" da Etapa 3 no que diz respeito a `aguardando_aprovacao`, e
> todo cenário que procura o chamado pendente na Fila do destino (procurar em
> `/approvals`). Cenários novos em `department-queue.md` (QA1–QA3).

Versões observadas: `next@16.3.5`, `drizzle-orm@0.45.2`, `zod@4.6.5`,
`react-hook-form@7.88`.

## Escopo técnico em uma frase, por etapa

- **Etapa 1** — sem mudança de schema; uma migration **só de dados**
  (`0011_align_legacy_transfers`) alinha os dados legados ao modelo novo. Uma
  transação move o chamado para
  a fila de outro setor (`current_department_id`, `assigned_to = null`,
  `aguardando_aprovacao`), cria a `ticket_transfer` pendente e grava uma linha
  `transferencia_solicitada`; Meus chamados ganha a aba "Aguardando aprovação"
  e as abas do autor passam a exigir que o chamado esteja no setor de origem.
- **Etapa 2** — sem schema e sem migration: qualquer pessoa do setor de destino
  aceita ("Atender"), numa transação que trava chamado e transferência, atribui
  a si, põe `em_andamento`, aprova a transferência e grava
  `transferencia_aprovada`.
- **Etapa 3** — uma migration não destrutiva (`ADD VALUE 'recusado'`): o
  destino recusa com motivo obrigatório; o motivo vira comentário público, a
  transferência fica `rejeitado`, e o chamado volta ao setor de onde saiu como
  `recusado`, com o solicitante (ou na fila, se ele não for mais válido).

## Decisões do arquiteto (não fixadas nas regras do usuário)

| Tema                                       | Decisão                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vocabulário                                | O ato do usuário é "enviar para outro setor" (`SendToDepartment`: regra, schema, action, textos). A entidade é a transferência (`Transfer`: `ticket_transfer`, funções de dados, outcomes). O "Enviar" para pessoa (`sendTicket`, `canSendTicket`) continua separado                                                                                                                                                                                                                                        |
| Nomes das funções                          | Dados usam o vocabulário do banco: `requestTicketTransfer`, `approveTicketTransfer` (`aprovado`), `rejectTicketTransfer` (`rejeitado`). Actions usam o da tela: `sendTicketToDepartment`, `acceptTicketTransfer`, `declineTicketTransfer`. Assim a action nunca importa função de dados com o próprio nome                                                                                                                                                                                                  |
| Arquivos                                   | `app/_lib/{types,domain,validation}/ticket-transfer.ts` e `app/_lib/actions/ticket-transfer.ts` (novos). As funções de dados ficam em `app/_lib/data/tickets.ts`, ao lado de `assignTicket` e `startTicketWork` (mesmas travas e `lockActorFacts`)                                                                                                                                                                                                                                                          |
| Schema do envio                            | `{ ticketId, toDepartmentId, expectedDepartmentId }`. O `expectedDepartmentId` (setor do chamado que a pessoa viu) **é acréscimo do arquiteto** ao `{ ticketId, toDepartmentId }` pedido: a Diretoria é despachante global e continuaria podendo enviar um chamado que mudou de setor enquanto o diálogo estava aberto, mandando de um setor que ela não escolheu. Mesmo papel do `expectedAssigneeId` no "Enviar"                                                                                          |
| Status permitidos para enviar              | Mapa `TICKET_STATUS_IS_DEPARTMENT_SENDABLE` (`satisfies Record<TicketStatus, boolean>`): `aberto`, `encaminhado`, `em_andamento`. Na Etapa 3 a chave `recusado: true` entra e o `tsc` obriga                                                                                                                                                                                                                                                                                                                |
| Quem envia                                 | `isTicketDispatcher(actor, currentDepartmentId)` (admin do setor atual ou diretoria) **ou** destinatário atual. Destinatário que mudou de setor continua podendo (como atende e resolve — risco 8)                                                                                                                                                                                                                                                                                                          |
| Destinos                                   | `assignableDepartments` menos o setor atual: ativos, não "Não alocado", **Diretoria incluída**                                                                                                                                                                                                                                                                                                                                                                                                              |
| Histórico                                  | **Uma** linha por ato, com todos os de/para que ele muda (setor, status, destinatário). Sem `mudanca_status` nem `atribuicao` extra (ADR 016)                                                                                                                                                                                                                                                                                                                                                               |
| `request_reason`                           | Nulo: o envio não pede motivo. `describeTransferAwaitingConclusion` cai em `Aguardando aprovação de {destino}`                                                                                                                                                                                                                                                                                                                                                                                              |
| Quem enviou e perde o acesso               | Admin do setor de origem ou destinatário que não é autor nem diretoria deixa de passar em `canViewTicket` no instante do envio. O outcome traz `actorKeepsAccess`; a action devolve `keepsAccess`; sem acesso, a UI sai do detalhe para o link de voltar (`backLink.href`) e a action **não** chama `revalidatePath` nenhum (ver passo 5 da action)                                                                                                                                                         |
| Frase da linha do tempo (envio)            | `{usuário} do setor {setor} encaminhou o chamado para a fila de {destino}.` **Revisão de 2026-10-09, aceita pelo usuário:** o setor é o `from_department` da linha de histórico (de onde o chamado saiu), não mais o setor atual de quem agiu. Motivo: o diretor enviando para a própria Diretoria gerava "do setor Diretoria … para a fila de Diretoria" (relatório QA da Etapa 2, #142). Vale para linhas antigas (montada na leitura)                                                                    |
| Recusa: conflito para quem perdeu o acesso | Quem recusou (ou um colega do mesmo setor) deixa de ver o chamado no instante da recusa. Sem exceção, o clique atrasado em "Atender"/"Recusar" daria `not_found`. `canFollowTicketTransferReview` deixa passar quem é do setor de destino **da transferência que viu** (`transferId`) quando ela está `rejeitado`; o conflito sai com `reason: "TRANSFER_DECLINED"` e um texto que não revela nada além do que a pessoa já sabia. Vale para aceite e recusa (revisão do passo 3 de `approveTicketTransfer`) |
| Recusa: meta da linha do tempo             | `historyEntryNamesActor("transferencia_rejeitada")` continua `false`: a frase nomeia o setor (`QA Infra recusou o chamado.`) e a meta mostra quem recusou. O comentário com o motivo pode ser apagado pelo autor, então o nome não pode morar só nele (revisão da decisão anterior, que era `true`)                                                                                                                                                                                                         |
| Edição pelo autor com envio pendente       | `ticketEditBlockFor` passa a checar `AWAITING_APPROVAL` **antes** de `OUTSIDE_EDITOR_DEPARTMENT`. Sem isso, o autor (agora fora do setor atual) perderia o botão "Editar" bloqueado com `Aguarde a solução ou devolutiva de {destino}`, que foi desenhado para este caso. O resultado da transação não muda (`not_editable`)                                                                                                                                                                                |
| Abas do autor                              | Campo novo `departmentScope: "origin" \| "any"` em `MyTicketsTabRule` (`MyTicketsDepartmentScope`). `origin` = `current_department_id = origin_department_id`. Toda aba declara o seu                                                                                                                                                                                                                                                                                                                       |
| Nome da aba nova                           | `awaiting` (`?tab=awaiting`), rótulo `Aguardando aprovação`                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Contagens sem objeto literal               | `mapMyTicketsTabs(fn)` no domínio, como `mapDepartmentQueueTabs`. O `df-data` monta colunas **e** fallback por ele                                                                                                                                                                                                                                                                                                                                                                                          |
| Aceite pela diretoria (Etapa 2)            | **Só se a diretoria for o setor de destino.** Aceitar atribui o chamado a quem aceitou, e o projeto exige que destinatário seja do setor do chamado (`isUsableTicketAssignee`; "Assumir" já recusa diretor de fora). Despachante global não vira destinatário de outro setor                                                                                                                                                                                                                                |
| "Atender" com dois casos (Etapa 2)         | Um botão, dois caminhos: `ticketAttendKindFor` devolve `"start_work"` (destinatário em `encaminhado`, action `attendTicket` existente) ou `"accept_transfer"` (setor de destino com envio pendente, action `acceptTicketTransfer`). Duas transações separadas: travam linhas diferentes e têm outcomes diferentes                                                                                                                                                                                           |
| Expectativa no aceite e na recusa          | `transferId` da transferência pendente que a pessoa viu. Envio refeito entre a carga e o clique vira conflito (`TRANSFER_CHANGED`)                                                                                                                                                                                                                                                                                                                                                                          |
| Recusa: quem pode (Etapa 3)                | A mesma regra do aceite, por delegação (`ticketTransferDeclineBlockFor` → `ticketTransferReviewBlockFor`), como a exclusão de comentário delega à edição                                                                                                                                                                                                                                                                                                                                                    |
| Recusa: para onde volta                    | `from_department_id` da transferência (o setor que enviou), que é o de origem do chamado no caso comum                                                                                                                                                                                                                                                                                                                                                                                                      |
| Recusa: nota no histórico                  | `note` nula. O motivo fica no comentário público e em `ticket_transfer.review_note`; repetir na linha do tempo duplicaria o texto na tela                                                                                                                                                                                                                                                                                                                                                                   |
| `recusado` no enum (Etapa 3)               | Logo depois de `encaminhado` na lista do `pgEnum` (`ADD VALUE … BEFORE 'aguardando_aprovacao'`). Não destrutivo                                                                                                                                                                                                                                                                                                                                                                                             |
| Revalidação                                | Envio e recusa mudam o setor do chamado: `/queue`, `/tickets`, `/dashboard` (o Início conta por setor atual) e o detalhe se quem agiu mantém acesso. Aceite (revisão de 2026-10-09): quem aceita **sempre** mantém acesso (vira destinatário), então revalida sempre detalhe, `/queue`, `/tickets` e `/dashboard`                                                                                                                                                                                           |
| E-mail                                     | Nenhum, em nenhuma etapa                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Placeholder `TICKET_TRANSFER_SOON_MESSAGE` | Continuou exportado na Etapa 1 só para não quebrar o `df-ui` no meio da onda. **Removido** de `domain/ticket-resolution.ts` na Onda 0 da Etapa 2 (2026-10-09; nenhum arquivo fora de `docs/` o citava)                                                                                                                                                                                                                                                                                                      |

## Tabelas, enums e migration

| Etapa | Mudança de schema                                                                                             |
| ----- | ------------------------------------------------------------------------------------------------------------- |
| 1     | nenhuma; migration só de dados `0011_align_legacy_transfers` (seção "Migration de dados" da Etapa 1)          |
| 2     | nenhuma                                                                                                       |
| 3     | `ticket_status` ganha `recusado` (migration `0012`, seção da Etapa 3; era `0011` antes da migration de dados) |

| Tabela            | Uso                                                                                                                                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ticket`          | envio: `current_department_id`, `assigned_to`, `status`, `updated_at`. Aceite: `assigned_to`, `status`, `updated_at`. Recusa: os três primeiros e `updated_at`. Meus chamados lê `origin_department_id` |
| `ticket_transfer` | envio: `insert` pendente. Aceite: `status = 'aprovado'`, `reviewed_by`, `reviewed_at`, `updated_at`. Recusa: `status = 'rejeitado'`, os mesmos e `review_note`                                          |
| `ticket_history`  | uma linha por ato: `transferencia_solicitada`, `transferencia_aprovada`, `transferencia_rejeitada`                                                                                                      |
| `message`         | recusa: `insert` do motivo como comentário `publica`                                                                                                                                                    |
| `department`      | envio: destino `for share` (`name`, `is_active`, `is_unassigned`)                                                                                                                                       |
| `users`           | quem age (`lockActorFacts`); recusa: solicitante (`is_active`, `department_id`)                                                                                                                         |

Restrições existentes que o fluxo usa: `transfer_one_pending_per_ticket_idx`
(no máximo uma pendente por chamado) e `transfer_different_departments`
(`from <> to`). Índices: `transfer_ticket_idx` para achar a pendente,
`ticket_dept_status_idx` para as filas, `ticket_created_by_idx` para Meus
chamados (a condição `current_department_id = origin_department_id` filtra
sobre o resultado; volume por pessoa é pequeno).

---

## Etapa 1 — Enviar para outro setor

### Tipos — `app/_lib/types/ticket-transfer.ts` (novo)

```ts
export type TicketDepartmentSendStateBlockReason =
  "NOT_SENDER" | "TICKET_FINISHED" | "AWAITING_APPROVAL" | "STATUS_NOT_SENDABLE"

export type TicketDepartmentSendBlockReason =
  TicketAssignmentActorBlockReason | TicketDepartmentSendStateBlockReason

export type TicketDepartmentSendDetailFacts = TicketAttendDetailFacts

export interface TransferTargetFacts extends DepartmentAvailability {
  id: number
}

export interface RequestTicketTransferValues {
  ticketId: number
  actorId: number
  toDepartmentId: number
  expectedDepartmentId: number
}

export interface TicketTransferRequested {
  status: "saved"
  ticketId: number
  toDepartmentName: string
  actorKeepsAccess: boolean
}

export interface TicketNotTransferable {
  status: "not_transferable"
}

export interface TicketInvalidTransferTarget {
  status: "invalid_target"
}

export type TicketTransferConflictReason =
  TicketDepartmentSendStateBlockReason | "DEPARTMENT_CHANGED"

export interface TicketTransferConflict {
  status: "conflict"
  reason: TicketTransferConflictReason
  currentStatus: TicketStatus
  currentDepartmentName: string
  pendingTransferDepartmentName: string | null
}

export type RequestTicketTransferOutcome =
  | TicketTransferRequested
  | TicketNotFound
  | TicketNotTransferable
  | TicketTransferConflict
  | TicketInvalidTransferTarget

export interface TicketTransferSource {
  id: number
  currentDepartmentId: number
}

export interface SendToDepartmentFormDefaults {
  ticketId: number
  expectedDepartmentId: number
  toDepartmentId?: number
}
```

- `TicketDetail` satisfaz `TicketDepartmentSendDetailFacts` e
  `TicketTransferSource` sem conversão. A transação usa `TicketAssignmentFacts`
  (já existente).
- `DepartmentOption` satisfaz `TransferTargetFacts`; a linha de `department`
  lida com `for share` também.
- `pendingTransferDepartmentName`: nome do destino da transferência pendente
  encontrada na transação, ou `null` se não há.

### Domínio

`app/_lib/domain/ticket.ts` (acrescido):

```ts
export const AWAITING_APPROVAL_TICKET_STATUS // "aguardando_aprovacao" as const satisfies TicketStatus
```

`app/_lib/domain/ticket-assignment.ts` (alterado): o helper privado de motivos
de quem age passa a ser exportado, sem mudar o comportamento:

```ts
export const ticketActorBlockFor: (
  actor: TicketActorFacts,
) => TicketAssignmentActorBlockReason | null // ACTOR_INACTIVE → PASSWORD_CHANGE_REQUIRED
```

`app/_lib/domain/ticket-transfer.ts` (novo):

```ts
export const isDepartmentSendableStatus: (status: TicketStatus) => boolean
export const TRANSFER_REQUESTED_TICKET_STATUS // = AWAITING_APPROVAL_TICKET_STATUS

export const isTicketDepartmentSender: (
  actor: TicketActorFacts,
  ticket: TicketVisibilityFacts,
) => boolean
export const ticketDepartmentSendBlockFor: (
  actor: TicketActorFacts,
  ticket: TicketAssignmentFacts,
) => TicketDepartmentSendBlockReason | null
export const canSendTicketToDepartment: (
  actor: TicketActorFacts,
  ticket: TicketAssignmentFacts,
) => boolean
export const canSendTicketToDepartmentDetail: (
  actor: TicketActorFacts,
  ticket: TicketDepartmentSendDetailFacts,
) => boolean
export const isTicketDepartmentSendConflict: (
  reason: TicketDepartmentSendBlockReason,
) => reason is TicketDepartmentSendStateBlockReason

export const isUsableTransferTarget: (
  target: TransferTargetFacts,
  currentDepartmentId: number,
) => boolean
export const transferTargetOptions: (
  options: readonly DepartmentOption[],
  currentDepartmentId: number,
) => DepartmentOption[]
export const canViewTicketAfterTransfer: (
  viewer: TicketViewerFacts,
  ticket: TicketVisibilityFacts,
  toDepartmentId: number,
) => boolean

export const buildSendToDepartmentFormDefaults: (
  ticket: TicketTransferSource,
) => SendToDepartmentFormDefaults
export const sendToDepartmentDialogTitle: (ticketId: number) => string
export const describeTicketSentToDepartment: (
  ticketId: number,
  departmentName: string,
) => string
export const describeTicketTransferConflict: (
  conflict: TicketTransferConflict,
) => string
```

**Status que aceitam envio** (`TICKET_STATUS_IS_DEPARTMENT_SENDABLE`, privado):

| Status                 | Envia? |
| ---------------------- | ------ |
| `aberto`               | sim    |
| `em_analise`           | não    |
| `encaminhado`          | sim    |
| `aguardando_aprovacao` | não    |
| `em_andamento`         | sim    |
| `resolvido`            | não    |
| `fechado`              | não    |
| `cancelado`            | não    |

**`ticketDepartmentSendBlockFor`** — primeiro motivo que vale, nesta ordem:

| #   | Motivo                     | Condição                                                                                                | Conflito? |
| --- | -------------------------- | ------------------------------------------------------------------------------------------------------- | --------- |
| 1   | `ACTOR_INACTIVE`           | `!actor.isActive`                                                                                       | não       |
| 2   | `PASSWORD_CHANGE_REQUIRED` | `actor.mustChangePassword`                                                                              | não       |
| 3   | `NOT_SENDER`               | `!isTicketDispatcher(actor, currentDepartmentId) && assignedTo !== actor.userId`                        | sim       |
| 4   | `TICKET_FINISHED`          | `!isNonFinalTicketStatus(status)` (`fechado`, `cancelado`)                                              | sim       |
| 5   | `AWAITING_APPROVAL`        | `hasPendingTransfer`                                                                                    | sim       |
| 6   | `STATUS_NOT_SENDABLE`      | `!isDepartmentSendableStatus(status)` (`resolvido`, `em_analise`, `aguardando_aprovacao` sem pendência) | sim       |

A coluna "Conflito?" é a tabela privada de `isTicketDepartmentSendConflict`
(`satisfies Record<TicketDepartmentSendBlockReason, boolean>`), que é também
type guard: no ramo verdadeiro o motivo já é
`TicketDepartmentSendStateBlockReason`, pronto para o outcome.

| Nome                                | Semântica                                                                                                                                    |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `canSendTicketToDepartment`         | `ticketDepartmentSendBlockFor(...) === null`. **A** regra da transação                                                                       |
| `canSendTicketToDepartmentDetail`   | mesma regra com `hasPendingTransfer: pendingTransfer !== null`. **A** regra do botão                                                         |
| `isUsableTransferTarget`            | `isAssignableDepartment(target) && target.id !== currentDepartmentId`. **A** regra do destino na transação                                   |
| `transferTargetOptions`             | `assignableDepartments(options)` sem o setor atual. **As** opções do diálogo (Diretoria entra; inativos e "Não alocado" não)                 |
| `canViewTicketAfterTransfer`        | `canViewTicket(viewer, { createdBy, assignedTo: null, currentDepartmentId: toDepartmentId })`: quem agiu ainda vê o chamado depois do envio? |
| `buildSendToDepartmentFormDefaults` | `{ ticketId: ticket.id, expectedDepartmentId: ticket.currentDepartmentId }` (sem `toDepartmentId`: o combobox começa vazio)                  |
| `sendToDepartmentDialogTitle`       | `Enviar chamado #12 para outro setor`                                                                                                        |
| `describeTicketSentToDepartment`    | `Chamado #12 enviado para a fila de QA Infra.`                                                                                               |
| `describeTicketTransferConflict`    | primeira que vale, abaixo                                                                                                                    |

| Condição do conflito                         | Texto                                                                                   |
| -------------------------------------------- | --------------------------------------------------------------------------------------- |
| `pendingTransferDepartmentName !== null`     | `Este chamado já foi enviado para QA Infra e aguarda aprovação.`                        |
| `!isDepartmentSendableStatus(currentStatus)` | `O status deste chamado mudou para Resolvido.` (`TICKET_STATUS_LABELS`)                 |
| `reason === "DEPARTMENT_CHANGED"`            | `Este chamado agora está no setor QA Infra. Confira a página atualizada.`               |
| outro (`NOT_SENDER`)                         | `Você não pode mais enviar este chamado para outro setor. Confira a página atualizada.` |

Constantes de texto:

| Constante                                   | Texto                                                                                                                      |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `SEND_TO_DEPARTMENT_LABEL`                  | `Enviar para outro setor`                                                                                                  |
| `SEND_TO_DEPARTMENT_SUBMIT_LABEL`           | `Enviar`                                                                                                                   |
| `SEND_TO_DEPARTMENT_PENDING_LABEL`          | `Enviando…`                                                                                                                |
| `SEND_TO_DEPARTMENT_DIALOG_DESCRIPTION`     | `O chamado sai da fila deste setor e vai para a fila do setor escolhido, aguardando aprovação até alguém de lá atendê-lo.` |
| `TRANSFER_TARGET_LABEL`                     | `Setor de destino`                                                                                                         |
| `TRANSFER_TARGET_PLACEHOLDER`               | `Selecione o setor`                                                                                                        |
| `NO_TRANSFER_TARGETS_MESSAGE`               | `Não há outro setor ativo para receber este chamado.`                                                                      |
| `TICKET_NOT_SENDABLE_TO_DEPARTMENT_MESSAGE` | `Não é possível enviar este chamado para outro setor agora.`                                                               |
| `UNAVAILABLE_TRANSFER_TARGET_MESSAGE`       | `Este setor não está disponível. Escolha outro setor ativo.`                                                               |

**Invariante usada pela UI:** quem passa em `canSendTicketToDepartmentDetail`
também tem `ticketConclusionStateFor(...).state === "resolvable"`. Prova:
diretoria, admin do setor atual e destinatário são resolvedores
(`isTicketResolver`); os status que aceitam envio estão todos entre os
resolvíveis; transferência pendente e motivos de quem age bloqueiam os dois. Na
Etapa 3, `recusado` entra como `true` nos dois mapas. Se o `df-ui` encontrar
caso que contradiga, reporta.

### `app/_lib/domain/ticket-edit.ts` (alterado)

`ticketEditBlockFor` passa a ser: inativo → troca de senha → `NOT_AUTHOR` →
**`AWAITING_APPROVAL`** → `OUTSIDE_EDITOR_DEPARTMENT` → `TICKET_FINISHED` →
`STATUS_NOT_EDITABLE`. Consequência: o autor, com o chamado na fila de outro
setor aguardando aprovação, vê o "Editar" bloqueado com
`Aguarde a solução ou devolutiva de {destino}` (`ticketEditButtonStateFor`, sem
mudança). Depois do aceite (sem pendência, fora do setor) o botão some, como
antes.

### Linha do tempo — `app/_lib/domain/ticket-history.ts` (alterado)

| Evento                     | Frase                                                                                | Sem destino                                                                   | `historyEntryNamesActor` |
| -------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- | ------------------------ |
| `transferencia_solicitada` | `QA Admin Suporte do setor QA Suporte encaminhou o chamado para a fila de QA Infra.` | `QA Admin Suporte do setor QA Suporte encaminhou o chamado para outro setor.` | **`true`** (era `false`) |

> Revisão de 2026-10-09 (aceita pelo usuário): o `{setor}` da frase é o
> `from_department` da própria linha (`fromDepartmentName` de
> `TicketHistoryEntry`), não o setor atual de quem agiu. Diretor que envia de
> QA Suporte para a Diretoria: `Henrique do setor QA Suporte encaminhou o
chamado para a fila de Diretoria.` (antes: `do setor Diretoria`). Para quem é
> do setor de origem nada muda.

Sem setor de origem na linha: `QA Admin Suporte encaminhou…`. Linha de
sistema: `Sistema encaminhou…`. O rótulo do item continua `Transferência
solicitada`. A frase vale também para linhas antigas (é montada na leitura).

### Meus chamados — tipos e domínio

`app/_lib/types/my-tickets.ts` (alterado):

```ts
export type MyTicketsDepartmentScope = "origin" | "any"

export interface MyTicketsTabRule {
  label: string
  relation: MyTicketsRelation
  statuses: readonly TicketStatus[]
  departmentScope: MyTicketsDepartmentScope // novo
  emptyTitle: string
  emptyDescription: string
}
```

| `departmentScope` | Condição                                                     |
| ----------------- | ------------------------------------------------------------ |
| `origin`          | `ticket.current_department_id = ticket.origin_department_id` |
| `any`             | nenhuma                                                      |

`app/_lib/domain/my-tickets-tabs.ts`: `["opened", "awaiting", "assigned",
"resolved", "closed", "cancelled"]` (a ordem é a da tela).

`app/_lib/domain/my-tickets.ts`:

```ts
export const MY_TICKETS_TAB_RULES // satisfies Record<MyTicketsTab, MyTicketsTabRule>
export const mapMyTicketsTabs: <T>(
  map: (tab: MyTicketsTab) => T,
) => Record<MyTicketsTab, T> // novo
```

| Aba (`?tab=`) | `label`              | `relation` | `statuses`                                              | `departmentScope` | `emptyTitle`                        | `emptyDescription`                                                                                                             |
| ------------- | -------------------- | ---------- | ------------------------------------------------------- | ----------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `opened`      | Abertos por mim      | `author`   | `ACTIVE_TICKET_STATUSES` **sem** `aguardando_aprovacao` | `origin`          | Nenhum chamado em andamento         | Os chamados que você abrir aparecem aqui enquanto estiverem no setor em que foram abertos, até serem resolvidos ou cancelados. |
| `awaiting`    | Aguardando aprovação | `author`   | `[AWAITING_APPROVAL_TICKET_STATUS]`                     | `any`             | Nenhum chamado aguardando aprovação | Os chamados que você abriu e foram enviados para outro setor aparecem aqui enquanto aguardam o aceite do setor de destino.     |
| `assigned`    | Atribuídos a mim     | `assignee` | `ACTIVE_TICKET_STATUSES`                                | `any`             | (sem mudança)                       | (sem mudança)                                                                                                                  |
| `resolved`    | Resolvidos           | `author`   | `[RESOLVED_TICKET_STATUS]`                              | `origin`          | (sem mudança)                       | (sem mudança)                                                                                                                  |
| `closed`      | Fechados             | `author`   | `["fechado"]`                                           | `origin`          | (sem mudança)                       | (sem mudança)                                                                                                                  |
| `cancelled`   | Cancelados           | `author`   | `["cancelado"]`                                         | `origin`          | (sem mudança)                       | (sem mudança)                                                                                                                  |

Propriedades:

- As abas de autor **deixam de cobrir** todos os chamados da pessoa: chamado
  dela em posse de outro setor e fora de `aguardando_aprovacao` (aceito no
  destino, ou dado antigo) não aparece em aba nenhuma. Continua visível pela
  busca do topo e por link (`canViewTicket` não muda). As abas de autor
  continuam **disjuntas** entre si.
- `aguardando_aprovacao` aparece em "Aguardando aprovação" mesmo fora do setor
  de origem, e nunca em "Abertos por mim".
- Na Etapa 3, `recusado` (ativo) entra sozinho em "Abertos por mim" (quando o
  chamado voltou ao setor de origem) e em "Atribuídos a mim" (do solicitante).
- `mapMyTicketsTabs` é o único lugar com as seis chaves escritas.

### Validação — `app/_lib/validation/ticket-transfer.ts` (novo)

```ts
export const sendTicketToDepartmentSchema // z.object({ ticketId, toDepartmentId, expectedDepartmentId }).refine(to !== expected)
export type SendTicketToDepartmentInput = z.infer<
  typeof sendTicketToDepartmentSchema
>
// { ticketId: number; toDepartmentId: number; expectedDepartmentId: number }
```

| Campo                  | Regra                                                          | Mensagem                                                                   |
| ---------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `ticketId`             | `ticketIdSchema`                                               | `Chamado inválido.`                                                        |
| `toDepartmentId`       | inteiro positivo até o limite de `integer`                     | `Selecione o setor de destino.`                                            |
| `expectedDepartmentId` | idem                                                           | `Não foi possível conferir o setor atual do chamado. Recarregue a página.` |
| refinamento            | `toDepartmentId !== expectedDepartmentId`, em `toDepartmentId` | `Escolha um setor diferente do atual.`                                     |

Quem envia nunca vem do cliente: `actorId` forjado é descartado pelo
`z.object`.

### `df-data`

#### `app/_lib/data/tickets.ts` — `requestTicketTransfer` (novo)

```ts
export async function requestTicketTransfer(
  values: RequestTicketTransferValues,
): Promise<RequestTicketTransferOutcome>
```

Uma transação, nesta ordem (forma de `assignTicket`):

1. **Chamado** — `select created_by, assigned_to, current_department_id, status
from ticket where id = $ticketId for update`. Sem linha → `not_found`.
2. **Quem age** — `lockActorFacts(tx, actorId)`. Sem linha → `not_transferable`.
3. `!canViewTicket(actor, ticketRow)` → `not_found`.
4. **Pendente** — `select ticket_transfer.id, department.name from
ticket_transfer join department on department.id = to_department_id where
ticket_id = $1 and status = 'pendente' limit 1`.
5. **Regra** — `reason = ticketDepartmentSendBlockFor(actor, { ...ticketRow,
hasPendingTransfer })`.
   - `reason !== null && !isTicketDepartmentSendConflict(reason)` →
     `not_transferable`.
   - senão, se `ticketRow.currentDepartmentId !== values.expectedDepartmentId`
     → conflito com `reason: "DEPARTMENT_CHANGED"`.
   - senão, se `reason !== null` → conflito com esse `reason`.
   - Conflito: `{ status: "conflict", reason, currentStatus: ticketRow.status,
currentDepartmentName (select name from department where id =
ticketRow.currentDepartmentId), pendingTransferDepartmentName (nome do
passo 4 ou null) }`.
6. **Destino** — `select id, name, is_active, is_unassigned from department
where id = $toDepartmentId for share`. Sem linha ou
   `!isUsableTransferTarget(row, ticketRow.currentDepartmentId)` →
   `invalid_target`.
7. **Grava** — `changedAt = new Date()` uma vez:
   - `update ticket set current_department_id = $to, assigned_to = null,
status = TRANSFER_REQUESTED_TICKET_STATUS, updated_at = changedAt where id
= $ticketId` (nada mais: prioridade, origem, `resolved_at`, `solution`
     intactos);
   - `insert into ticket_transfer` `{ ticketId, fromDepartmentId:
ticketRow.currentDepartmentId, toDepartmentId, requestedBy: actorId,
requestReason: null, status: "pendente", createdAt: changedAt, updatedAt:
changedAt }`;
   - `insert into ticket_history` **uma** linha `{ ticketId, changedBy:
actorId, event: "transferencia_solicitada", fromStatus: ticketRow.status,
toStatus: TRANSFER_REQUESTED_TICKET_STATUS, fromDepartmentId:
ticketRow.currentDepartmentId, toDepartmentId, fromAssigneeId:
ticketRow.assignedTo, toAssigneeId: null, changedAt }`.
8. `{ status: "saved", ticketId, toDepartmentName: destino.name,
actorKeepsAccess: canViewTicketAfterTransfer(actor, ticketRow,
toDepartmentId) }`.

- **Precedência**: `not_found` (chamado) → `not_transferable` (sem linha de
  quem age) → `not_found` (invisível) → `not_transferable` (motivo de quem age)
  → `conflict` (setor mudou) → `conflict` (estado) → `invalid_target`.
- **Travas**: `ticket` (`for update`) → `users` (`for share`) → `department`
  destino (`for share`). A desativação de setor trava `department` `for update`
  e conta os chamados abertos depois: se ela vier antes, o envio relê o setor
  inativo e devolve `invalid_target`; se vier depois, conta o chamado recém
  chegado e recusa a desativação.
- A segunda pendente é impossível sob a trava do passo 1; se o índice
  `transfer_one_pending_per_ticket_idx` disparar, a exceção sobe (erro
  inesperado na action).

#### `app/_lib/data/my-tickets.ts` (alterado)

Assinaturas iguais (`listMyTickets`, `countMyTicketsByTab`).

- `tabCondition(userId, tab)` ganha a condição de
  `MY_TICKETS_TAB_RULES[tab].departmentScope`, de uma tabela privada
  `satisfies Record<MyTicketsDepartmentScope, SQL | undefined>` (`origin` →
  `eq(ticket.currentDepartmentId, ticket.originDepartmentId)`; `any` →
  nenhuma). Escopo novo no tipo quebra o `tsc` até ser traduzido.
- `countMyTicketsByTab`: colunas por `mapMyTicketsTabs((tab) => …)` e resultado
  `row ?? mapMyTicketsTabs(() => 0)`. Sai o objeto literal de cinco chaves, que
  **hoje quebra o `tsc`** (`app/_lib/data/my-tickets.ts:72`, falta `awaiting`).
- O `where` externo não muda (`created_by = $1 or assigned_to = $1`).

Nada novo para as opções de destino: a página usa `listDepartmentOptions()`
(`app/_lib/data/departments.ts`, já existente).

### `df-actions` — `app/_lib/actions/ticket-transfer.ts` (novo)

```ts
export type SendTicketToDepartmentErrorCode =
  "INVALID_INPUT" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT" | "INVALID_TARGET"

export interface SendTicketToDepartmentSuccess {
  ok: true
  message: string
  keepsAccess: boolean
}

export interface SendTicketToDepartmentFailure {
  ok: false
  message: string
  code?: SendTicketToDepartmentErrorCode
}

export type SendTicketToDepartmentResult =
  SendTicketToDepartmentSuccess | SendTicketToDepartmentFailure

export const sendTicketToDepartment: (
  input: SendTicketToDepartmentInput,
) => Promise<SendTicketToDepartmentResult>
```

1. `getSession()`; sem sessão → `FORBIDDEN`,
   `Você não tem permissão para enviar este chamado para outro setor.`
2. `safeParse`; falha → `INVALID_INPUT` com a primeira mensagem.
3. `requestTicketTransfer({ ...parsed.data, actorId: actor.id })` em
   `try/catch`. Exceção → `console.error("[sendTicketToDepartment]", error)` e
   falha sem código:
   `Não foi possível enviar o chamado para outro setor agora. Tente novamente.`
4. Mapeamento (tabela estática `satisfies Record<…, SendTicketToDepartmentFailure>`
   para os status sem dado, como em `ticket-assignment.ts`):

| Outcome            | `code`           | Mensagem                                    |
| ------------------ | ---------------- | ------------------------------------------- |
| `not_found`        | `NOT_FOUND`      | `TICKET_NOT_FOUND_MESSAGE`                  |
| `not_transferable` | `FORBIDDEN`      | `TICKET_NOT_SENDABLE_TO_DEPARTMENT_MESSAGE` |
| `conflict`         | `CONFLICT`       | `describeTicketTransferConflict(outcome)`   |
| `invalid_target`   | `INVALID_TARGET` | `UNAVAILABLE_TRANSFER_TARGET_MESSAGE`       |

5. `saved`:
   - `outcome.actorKeepsAccess` verdadeiro → `revalidatePath(ticketDetailPath(id))`,
     `revalidatePath(DEPARTMENT_QUEUE_PATH)`, `revalidatePath(MY_TICKETS_PATH)`
     e `revalidatePath(DASHBOARD_PATH)`;
   - `outcome.actorKeepsAccess` falso → **nenhum** `revalidatePath`.
     Retorno `{ ok: true, message: describeTicketSentToDepartment(id,
outcome.toDepartmentName), keepsAccess: outcome.actorKeepsAccess }`.

- `DASHBOARD_PATH` vem de `@/app/_lib/domain/dashboard` (não declarar
  constante local na action).
- **Por que nada é revalidado sem acesso.** No Next 16 instalado, qualquer
  `revalidatePath` dentro de uma Server Action marca a action como
  revalidadora sem conferir o caminho
  (`node_modules/next/dist/server/web/spec-extension/revalidate.js`, `TODO:
only revalidate if the path matches` → `pathWasRevalidated =
ActionDidRevalidateStaticAndDynamic`), e o handler só deixa de re-renderizar
  a página atual quando nada foi revalidado
  (`node_modules/next/dist/server/app-render/action-handler.js`,
  `skipPageRendering` com `pathWasRevalidated === undefined` ou
  `ActionDidNotRevalidate`). Revalidar só `/queue` já faria o servidor
  re-renderizar o detalhe na resposta, e quem perdeu o acesso receberia o
  404 disputando com o `router.replace` da UI (cenários TR3/TR9). Sem
  revalidar não há perda: `/queue`, `/tickets` e `/dashboard` são dinâmicas, e
  a navegação para `backLink.href` busca dados novos.

- A action não lê `getAccountFacts()` nem decide permissão: a transação decide.
- Sem e-mail. Sem `redirect()`: a saída do detalhe é da UI (mantém o toast).
- Entra na tabela "Quem revalida `/queue`" de `department-queue.md`.

### `df-ui`

**Detalhe (`/tickets/[id]`, `page.tsx`):**

- `const canSendToDepartment = canSendTicketToDepartmentDetail(actor, ticket)`.
- Só com ele verdadeiro, `listDepartmentOptions()` entra no `Promise.all` que
  já existe; `transferTargetOptions(options, ticket.currentDepartmentId)` dá as
  opções. Página passa adiante: as opções, `buildSendToDepartmentFormDefaults(ticket)`
  e `backLink.href` (para onde sair sem acesso).
- **Lugar do botão**: o "Enviar para outro setor" bloqueado de
  `conclusion-blocked-actions.tsx` (com `TICKET_TRANSFER_SOON_MESSAGE`) é
  substituído pelo botão real quando `canSendToDepartment`; sem ele, o botão
  **some** (não fica bloqueado com "em breve"). O "Anexar" continua como está.
  Pela invariante acima, o botão só existe dentro do estado `resolvable` da
  Conclusão. Se o gatilho fica dentro do `<form>` de resolver, `type="button"`.
- **Diálogo** (componente cliente novo na rota, ex.:
  `app/(app)/tickets/[id]/_components/send-to-department-dialog.tsx`):
  `Dialog` do shadcn; título `sendToDepartmentDialogTitle(id)`; descrição
  `SEND_TO_DEPARTMENT_DIALOG_DESCRIPTION`; campo `TRANSFER_TARGET_LABEL` com o
  combobox compartilhado (`app/_components/combobox-field.tsx`/`combobox.tsx`)
  e placeholder `TRANSFER_TARGET_PLACEHOLDER`; React Hook Form +
  `zodResolver(sendTicketToDepartmentSchema)` com os defaults do domínio.
  Opções vazias → `NO_TRANSFER_TARGETS_MESSAGE` no lugar do campo e envio
  desabilitado. Botões `Cancelar` e `SEND_TO_DEPARTMENT_SUBMIT_LABEL`;
  pendente: desabilitado com `SEND_TO_DEPARTMENT_PENDING_LABEL` e o diálogo não
  fecha.
- Resultado:
  - `ok` → `toast.success(message)`; com `keepsAccess`, fecha (a revalidação
    traz o selo "Aguardando aprovação", o aviso de transferência pendente e a
    linha do tempo); sem `keepsAccess`, `router.replace(leaveHref)` (a action
    não revalida nada, então a resposta não traz o detalhe re-renderizado como
    404).
  - `INVALID_TARGET` → erro no campo (`setError("toDepartmentId")`), diálogo
    aberto, `router.refresh()` para recarregar as opções.
  - `CONFLICT`, `NOT_FOUND`, `FORBIDDEN` → `toast.error(message)`, fecha,
    `router.refresh()`.
  - `INVALID_INPUT` ou sem código → `toast.error(message)`.
- Componente cliente não importa `app/_lib/data`, `app/_lib/auth`, `@/db/*`.

**Meus chamados (`/tickets`):** nada a codar além de conferir. A aba sai de
`MY_TICKETS_TABS`/`MY_TICKETS_TAB_RULES` e a contagem de `counts[tab]`. O
filtro Status some em "Aguardando aprovação" (um status só) e "Abertos por mim"
passa a oferecer quatro status. Seis abas: conferir a rolagem horizontal no
mobile.

**Linha do tempo:** nada a codar (`historyEntryNamesActor` já tira o
`{nome} ·` da linha de meta para `transferencia_solicitada`).

**Fila:** nada a codar. O chamado enviado aparece em "Em aberto" do destino com
o selo "Aguardando aprovação" e sem "Assumir"/"Enviar" (`AWAITING_APPROVAL`).

### Textos — Etapa 1

| Onde             | Texto                                                                                                                                                      |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Botão            | `Enviar para outro setor`                                                                                                                                  |
| Diálogo          | `Enviar chamado #12 para outro setor` / descrição da tabela de constantes / `Setor de destino` / `Selecione o setor` / `Cancelar` / `Enviar` / `Enviando…` |
| Sem opções       | `Não há outro setor ativo para receber este chamado.`                                                                                                      |
| Sucesso          | `Chamado #12 enviado para a fila de QA Infra.`                                                                                                             |
| Conflitos        | tabela de `describeTicketTransferConflict`                                                                                                                 |
| Destino inválido | `Este setor não está disponível. Escolha outro setor ativo.`                                                                                               |
| Não pode         | `Não é possível enviar este chamado para outro setor agora.`                                                                                               |
| Sem sessão       | `Você não tem permissão para enviar este chamado para outro setor.`                                                                                        |
| Erro inesperado  | `Não foi possível enviar o chamado para outro setor agora. Tente novamente.`                                                                               |
| Linha do tempo   | `{usuário} do setor {setor} encaminhou o chamado para a fila de {destino}.`                                                                                |
| Aba              | `Aguardando aprovação` / `Nenhum chamado aguardando aprovação` / descrição da tabela de abas                                                               |

### Migration de dados — `db/migrations/0011_align_legacy_transfers.sql`

Revisão de 2026-10-08, aprovada pelo usuário. Sem mudança de schema (o
snapshot `0011` é igual ao `0010`); só dados. Gerada por
`npx drizzle-kit generate --custom --name=align_legacy_transfers` e aplicada
por `npm run db:migrate`, como as demais.

**Por quê.** Antes da regra nova o banco tinha dois tipos de chamado em
`aguardando_aprovacao` que o modelo da ADR 016 não prevê:

| Caso                                                                                        | Achado no banco de desenvolvimento (2026-10-08)                            |
| ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| transferência `pendente` com o chamado ainda no setor de origem (`current ≠ to_department`) | 5: #64 (11→18), #66, #68, #70 (18→19), #73 (11→13); todos sem destinatário |
| `aguardando_aprovacao` **sem** transferência `pendente` (seed antigo)                       | 4: #9, #17, #25, #33 (todos no setor 11)                                   |

Não havia transferência aprovada, rejeitada nem cancelada, nem nenhum chamado
com transferência pendente fora de `aguardando_aprovacao`.

**Regras** (por condição, sem id fixo; duas instruções na mesma transação do
migrator, nesta ordem):

| #   | Condição                                                                                     | Efeito                                                                                                 | Histórico                        |
| --- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------- |
| 1   | existe `ticket_transfer` `pendente` do chamado e `current_department_id <> to_department_id` | `current_department_id = to_department_id`, `assigned_to = null`, `updated_at = now()`; status intacto | nenhum                           |
| 2   | `status = 'aguardando_aprovacao'` e **não** existe `ticket_transfer` `pendente`              | `status = 'aberto'`, `updated_at = now()`                                                              | uma `mudanca_status` por chamado |

```sql
UPDATE "ticket" AS "t"
SET "current_department_id" = "tt"."to_department_id",
  "assigned_to" = NULL,
  "updated_at" = now()
FROM "ticket_transfer" AS "tt"
WHERE "tt"."ticket_id" = "t"."id"
  AND "tt"."status" = 'pendente'
  AND "t"."current_department_id" <> "tt"."to_department_id";

WITH "reopened" AS (
  UPDATE "ticket" AS "t"
  SET "status" = 'aberto', "updated_at" = now()
  WHERE "t"."status" = 'aguardando_aprovacao'
    AND NOT EXISTS (SELECT 1 FROM "ticket_transfer" AS "tt"
                    WHERE "tt"."ticket_id" = "t"."id" AND "tt"."status" = 'pendente')
  RETURNING "t"."id"
)
INSERT INTO "ticket_history" ("ticket_id", "changed_by", "event", "from_status", "to_status", "note", "changed_at")
SELECT "reopened"."id", NULL, 'mudanca_status', 'aguardando_aprovacao', 'aberto',
  'Ajuste de dados: o chamado aguardava aprovação sem envio pendente para outro setor e voltou para Aberto.', now()
FROM "reopened";
```

**Histórico — decisão.**

- **Regra 2 grava** uma linha `mudanca_status` por chamado reaberto,
  `changed_by` nulo ("Sistema", migration `0010`), `from/to_status =
aguardando_aprovacao/aberto` e `note` com o motivo. O status visível muda, e
  o histórico é o registro do ciclo de vida: sem a linha, a linha do tempo
  mostraria o chamado em "Aberto" sem nenhum evento que explique a saída de
  "Aguardando aprovação". A linha nasce do `RETURNING` do próprio `UPDATE`, então
  só existe para quem de fato mudou. Na tela: `Mudança de status` ·
  `Alterou o status de Aguardando aprovação para Aberto.` · nota · `Sistema`.
  Mesmo padrão do encerramento automático (`AUTO_CLOSE_NOTE`).
- **Regra 1 não grava.** A linha `transferencia_solicitada` de cada um já
  existe e já tem `from/to_department_id` (11→18 etc.); a frase da linha do
  tempo é montada na leitura a partir do `to_department_id` dela
  (`… encaminhou o chamado para a fila de {destino}.`), e isso passa a ser
  verdade com a migration. Uma segunda linha descreveria o mesmo ato duas vezes,
  contra a ADR 016 (uma linha por ato). Essas linhas antigas têm
  `from/to_status` nulos; ficam como estão (`ticket_history` é append-only).
- `ticket_transfer` e as linhas existentes de `ticket_history` não são
  alteradas.

**Idempotência.** Depois da regra 1, `current_department_id = to_department_id`
e a condição não casa mais; depois da regra 2, o status é `aberto` e o `UPDATE`
não devolve linha, então o `INSERT … SELECT FROM reopened` não grava nada.
Rodar de novo (ou rodar num banco novo, antes do seed) não muda nada. O
drizzle-kit, de qualquer forma, só aplica a `0011` uma vez.

**Efeito esperado no banco de desenvolvimento** (consultas de leitura de
2026-10-08, antes de aplicar):

| Medida                                                    | Antes | Depois |
| --------------------------------------------------------- | ----- | ------ |
| chamados em `aguardando_aprovacao`                        | 9     | 5      |
| pendentes com `current_department_id <> to_department_id` | 5     | 0      |
| `aguardando_aprovacao` sem transferência pendente         | 4     | 0      |
| `ticket_transfer` (total / pendentes)                     | 5 / 5 | 5 / 5  |
| `ticket_history` (total)                                  | 245   | 249    |
| `mudanca_status` com `changed_by` nulo                    | 0     | 4      |

### Cenários para o `df-qa` — Etapa 1

Regras gerais de `queue-default-and-comment-edit.md`: `M` = QA Membro
Suporte, `A` = QA Admin Suporte, `I` = QA Admin Infra, `D` = Diretor; `S` e `F`
= ids de QA Suporte e QA Infra; títulos `[QA]`; **não alterar #65 a #68**;
"request de action" = `POST` com `Next-Action`; anotar `max(id)` de
`ticket_history` e `ticket_transfer` antes de cada cenário que diz "nada
gravado". Chamados enviados nesta etapa ficam em `aguardando_aprovacao` até a
Etapa 2 existir (não há como desfazer): use só os da preparação.

**Preparação** (como M, "Novo chamado", tag ativa de QA Suporte, salvo
indicação):

- `[QA] Envio fila` com `Fila de QA Suporte` → `#T1` (`aberto`, sem destinatário)
- `[QA] Envio encaminhado` com `QA Admin Suporte` → `#T2` (`encaminhado`, A)
- `[QA] Envio andamento` com `QA Membro Suporte` → `#T3` (`em_andamento`, M)
- como A: `[QA] Envio por destinatário` com `QA Membro Suporte` → `#T4`
  (`encaminhado`, M; autor A)
- `[QA] Envio corrida` com a fila → `#T5`
- `[QA] Envio privado` com a fila → `#T6`; A publica nele o comentário privado
  `[QA] Privado da origem` (`p1`)
- `[QA] Envio forjado` com `QA Admin Suporte` → `#T7` (`encaminhado`, A; autor
  M) — não enviar pela tela

Consulta **MT** (abas de M; trocar `M` pelo id):

```sql
select
  count(*) filter (where created_by = M and status in ('aberto','em_analise','encaminhado','em_andamento') and current_department_id = origin_department_id) as abertos,
  count(*) filter (where created_by = M and status = 'aguardando_aprovacao') as aguardando,
  count(*) filter (where assigned_to = M and status in ('aberto','em_analise','encaminhado','aguardando_aprovacao','em_andamento')) as atribuidos,
  count(*) filter (where created_by = M and status = 'resolvido' and current_department_id = origin_department_id) as resolvidos,
  count(*) filter (where created_by = M and status = 'fechado' and current_department_id = origin_department_id) as fechados,
  count(*) filter (where created_by = M and status = 'cancelado' and current_department_id = origin_department_id) as cancelados
from ticket
```

| #    | Quem     | Ação                                                                                                                                                                                                                                                                                                                                                               | Esperado                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TR0  | banco    | antes da preparação: `select count(*) from ticket t join ticket_transfer tt on tt.ticket_id = t.id and tt.status = 'pendente' where t.current_department_id <> tt.to_department_id` e `select count(*) from ticket t where status = 'aguardando_aprovacao' and not exists (select 1 from ticket_transfer tt where tt.ticket_id = t.id and tt.status = 'pendente')` | os dois `0` (migration `0011` aplicada); cada chamado reaberto por ela tem **uma** `mudanca_status` com `changed_by` nulo e a nota de ajuste; #64, #66, #68, #70, #73 aparecem na Fila do setor de destino com o selo `Aguardando aprovação`                                                                                                                                                                                                                                                 |
| TR1  | M        | `/tickets/T1`                                                                                                                                                                                                                                                                                                                                                      | Conclusão com o formulário de resolver; **sem** "Enviar para outro setor" (nem bloqueado); "Anexar" continua bloqueado                                                                                                                                                                                                                                                                                                                                                                       |
| TR2  | A        | `/tickets/T1` → "Enviar para outro setor"                                                                                                                                                                                                                                                                                                                          | diálogo `Enviar chamado #T1 para outro setor`; opções = `select name from department where is_active and not is_unassigned and id <> S order by name` (inclui QA Infra e Diretoria; sem QA Suporte, sem "Não alocado")                                                                                                                                                                                                                                                                       |
| TR3  | A        | enviar `#T1` para QA Infra                                                                                                                                                                                                                                                                                                                                         | `Enviando…` durante o envio; toast `Chamado #T1 enviado para a fila de QA Infra.`; A sai para `Meus chamados` (link de voltar) **sem** passar por 404; abrir `/tickets/T1` depois dá 404                                                                                                                                                                                                                                                                                                     |
| TR4  | banco    | depois do TR3                                                                                                                                                                                                                                                                                                                                                      | `#T1`: `current_department_id = F`, `assigned_to` nulo, `status = 'aguardando_aprovacao'`, `origin_department_id = S`; `ticket_transfer`: uma linha nova `pendente`, `from = S`, `to = F`, `requested_by = A`, `request_reason` nulo, `reviewed_*` nulos; `ticket_history`: **uma** linha nova `transferencia_solicitada`, `changed_by = A`, `from/to_department = S/F`, `from/to_status = aberto/aguardando_aprovacao`, `from/to_assignee` nulos; nenhuma `mudanca_status` nem `atribuicao` |
| TR5  | M        | `/tickets` com `Todos`                                                                                                                                                                                                                                                                                                                                             | abas na ordem **Atribuídos a mim · Abertos por mim · Aguardando aprovação · Resolvidos · Fechados · Cancelados**, com Atribuídos a mim ativa (desde 2026-10-12, revisão de `my-tickets.md`; era Abertos por mim · Aguardando aprovação · Atribuídos a mim · …, com Abertos por mim ativa); `#T1` só em Aguardando aprovação (sem filtro Status); contagens = consulta MT                                                                                                                     |
| TR6  | M        | abrir `#T1` pela busca do topo                                                                                                                                                                                                                                                                                                                                     | detalhe abre; selo `Aguardando aprovação`; aviso de transferência pendente; "Editar" **bloqueado** com `Aguarde a solução ou devolutiva de QA Infra`; Conclusão com o aviso de espera; comentário permitido; linha do tempo: item `Transferência solicitada` com `QA Admin Suporte do setor QA Suporte encaminhou o chamado para a fila de QA Infra.` e a meta só com a data                                                                                                                 |
| TR7  | I        | `/queue`                                                                                                                                                                                                                                                                                                                                                           | `#T1` em **Em aberto** com selo `Aguardando aprovação`, sem "Assumir" nem "Enviar"; QT2 de `F` (contrato da Fila) bate; no detalhe, nenhum "Atender", "Enviar para outro setor" nem formulário de resolver                                                                                                                                                                                                                                                                                   |
| TR8  | A        | `/queue`                                                                                                                                                                                                                                                                                                                                                           | `#T1` não aparece em aba nenhuma de QA Suporte; QT2 de `S` bate                                                                                                                                                                                                                                                                                                                                                                                                                              |
| TR9  | M        | `/tickets/T4` (M destinatário, não autor) → enviar para QA Infra                                                                                                                                                                                                                                                                                                   | botão visível; sucesso; M sai do detalhe para `Meus chamados`; `#T4` sai de "Atribuídos a mim" de M                                                                                                                                                                                                                                                                                                                                                                                          |
| TR10 | D        | `/tickets/T2` → enviar para Diretoria                                                                                                                                                                                                                                                                                                                              | botão visível; Diretoria entre as opções; sucesso; D **continua** no detalhe, que mostra `Aguardando aprovação`; frase `{D} do setor QA Suporte encaminhou o chamado para a fila de Diretoria.` (revisão de 2026-10-09; era `do setor Diretoria`)                                                                                                                                                                                                                                            |
| TR11 | M        | `/tickets/T3` (M autor e destinatário) → enviar para QA Infra                                                                                                                                                                                                                                                                                                      | sucesso; M continua no detalhe (é autor); "Editar" bloqueado com a mensagem de espera                                                                                                                                                                                                                                                                                                                                                                                                        |
| TR12 | A e D    | as duas sessões em `/tickets/T5` com o diálogo aberto; A envia para QA Infra; D envia para Diretoria sem recarregar                                                                                                                                                                                                                                                | D: toast `Este chamado já foi enviado para QA Infra e aguarda aprovação.` e a página atualiza; no banco, **uma** transferência para `#T5`                                                                                                                                                                                                                                                                                                                                                    |
| TR13 | A        | request de `sendTicketToDepartment` para `[QA] Janela aberta` (`resolvido`) e para `#T1` (pendente, A sem acesso)                                                                                                                                                                                                                                                  | o primeiro: `CONFLICT`, `O status deste chamado mudou para Resolvido.`; o segundo: `NOT_FOUND`, `Chamado não encontrado.`; nada gravado                                                                                                                                                                                                                                                                                                                                                      |
| TR14 | M        | `/tickets/T7` (sem botão); request de `sendTicketToDepartment` para `#T7` com `expectedDepartmentId = S`                                                                                                                                                                                                                                                           | `CONFLICT`, `Você não pode mais enviar este chamado para outro setor. Confira a página atualizada.` (risco 6); nada gravado                                                                                                                                                                                                                                                                                                                                                                  |
| TR15 | A        | requests num chamado `aberto` de QA Suporte: `toDepartmentId = S` com `expectedDepartmentId = S`; `toDepartmentId = "abc"`, `0`; `toDepartmentId = 999999`; `toDepartmentId` = id de "Não alocado"; `expectedDepartmentId = F`                                                                                                                                     | `Escolha um setor diferente do atual.` (`INVALID_INPUT`); `Selecione o setor de destino.` (`INVALID_INPUT`); `INVALID_TARGET` nos dois seguintes; `CONFLICT` `Este chamado agora está no setor QA Suporte. Confira a página atualizada.`; nada gravado em nenhum                                                                                                                                                                                                                             |
| TR16 | I e M    | antes de enviar `#T6`: I não vê `p1`; A envia `#T6` para QA Infra; I e M abrem `#T6`                                                                                                                                                                                                                                                                               | I passa a ver `p1` (risco 1, aceito); M (autor, não autor de `p1`) deixa de ver `p1`; A não abre mais o chamado                                                                                                                                                                                                                                                                                                                                                                              |
| TR17 | banco    | `select count(*) from ticket where current_department_id <> origin_department_id and status <> 'aguardando_aprovacao'`                                                                                                                                                                                                                                             | registrar o número no relatório (chamados que somem das abas de autor — risco 2)                                                                                                                                                                                                                                                                                                                                                                                                             |
| TR18 | M        | 390×844: `/tickets` com seis abas; diálogo de envio (como A, num chamado novo)                                                                                                                                                                                                                                                                                     | abas alcançáveis por rolagem; diálogo cabe, combobox e botões alcançáveis                                                                                                                                                                                                                                                                                                                                                                                                                    |
| TR19 | qualquer | toda a bateria                                                                                                                                                                                                                                                                                                                                                     | nenhum e-mail (sem chamada ao Resend nos logs); nenhum erro nem aviso de hidratação (`next-devtools`)                                                                                                                                                                                                                                                                                                                                                                                        |

Ao final: M e A ativos em QA Suporte.

---

## Etapa 2 — Atender no destino (aceite)

Código publicado pelo `df-architect` em 2026-10-09 (Onda 0 da Etapa 2). Sem
schema e sem migration.

> Revisão de 2026-10-09, ao codar (prevalece sobre o texto anterior desta
> seção):
>
> 1. `OUTSIDE_TARGET_DEPARTMENT` também vale quando quem age não é do setor
>    atual do chamado (o `currentDepartmentId` dele), mesmo sendo do destino
>    da pendente. Depois da `0011` toda pendente aponta para o
>    setor atual (ADR 016), então a checagem não muda nenhum caso real; ela só
>    impede que um dado fora da invariante faça o aceite atribuir o chamado a
>    alguém de fora do setor dele (`isUsableTicketAssignee`).
> 2. `describeTicketTransferReviewConflict`: com destinatário que não é quem
>    age, o texto passa a `Este chamado já foi aceito e agora está com Ana.`
>    (era `já foi atendido por Ana`: depois do aceite o chamado pode ter sido
>    reenviado a outra pessoa, e "agora está com" continua verdadeiro). Novo
>    caso: destinatário é quem age mas o status não é `em_andamento` →
>    `Este chamado já está com você. Confira a página atualizada.`
> 3. Revalidação do aceite: detalhe, `/queue`, `/tickets` **e `/dashboard`**,
>    sempre (quem aceita vira destinatário, logo mantém acesso). Hoje o Início
>    conta por setor atual e período de criação, que o aceite não muda; o
>    `/dashboard` entra para que a regra seja a mesma de todo ato de
>    transferência e não precise ser revista quando o Início passar a contar
>    por status.
> 4. `canAttendTicketDetail` foi removido: o detalhe passou a
>    `ticketAttendTargetFor` e a função ficou sem uso. `TicketAttendDetailFacts`
>    continua, base de `TicketDepartmentSendDetailFacts`.
> 5. Acréscimo: `ticketAttendTargetFor` e o tipo `TicketAttendTarget` (união
>    discriminada por `kind`), para o botão receber uma prop só.

### Regra

- **Quem**: pessoa **do setor de destino** da transferência pendente, que é
  também o setor atual do chamado (`actor.departmentId ===
pendingTransfer.toDepartmentId === ticket.currentDepartmentId`), ativa, sem
  troca de senha. Membro ou admin, indiferente. Diretoria só quando o destino
  é a própria Diretoria (decisão acima): a regra é por setor, não por
  `isBoard`, então não há caso especial no código.
- **Quando**: há transferência pendente e o status é `aguardando_aprovacao`.
- **Efeito** (uma transação): `assigned_to` = quem aceitou, `status` =
  `em_andamento` (`ATTENDED_TICKET_STATUS`), transferência `aprovado` com
  `reviewed_by`/`reviewed_at`; uma linha `transferencia_aprovada`.
- O "Atender" do destinatário em `encaminhado` continua igual
  (`startTicketWork`).

### Tipos — `app/_lib/types/ticket-transfer.ts` (acrescido)

```ts
export interface TicketPendingTransferReview {
  id: number
  toDepartmentId: number
}

export interface TicketTransferReviewFacts extends TicketVisibilityFacts {
  status: TicketStatus
  pendingTransfer: TicketPendingTransferReview | null
}

export interface TicketTransferReviewSource extends TicketTransferReviewFacts {
  id: number
}

export type TicketTransferReviewActorBlockReason =
  TicketAssignmentActorBlockReason | "OUTSIDE_TARGET_DEPARTMENT"

export type TicketTransferReviewStateBlockReason =
  "NO_PENDING_TRANSFER" | "STATUS_NOT_AWAITING"

export type TicketTransferReviewBlockReason =
  TicketTransferReviewActorBlockReason | TicketTransferReviewStateBlockReason

export type TicketAttendKind = "start_work" | "accept_transfer"

export interface AcceptTicketTransferTarget {
  ticketId: number
  transferId: number
}

export interface TicketStartWorkAttendTarget {
  kind: "start_work"
  ticketId: number
}

export interface TicketAcceptTransferAttendTarget extends AcceptTicketTransferTarget {
  kind: "accept_transfer"
}

export type TicketAttendTarget =
  TicketStartWorkAttendTarget | TicketAcceptTransferAttendTarget

export interface ApproveTicketTransferValues {
  ticketId: number
  transferId: number
  actorId: number
}

export interface TicketTransferApproved {
  status: "saved"
  ticketId: number
}

export interface TicketTransferNotReviewable {
  status: "not_reviewable"
}

export type TicketTransferReviewConflictReason =
  TicketTransferReviewStateBlockReason | "TRANSFER_CHANGED"

export interface TicketTransferReviewConflict {
  status: "conflict"
  reason: TicketTransferReviewConflictReason
  currentStatus: TicketStatus
  currentDepartmentName: string
  currentAssigneeId: number | null
  currentAssigneeName: string | null
}

export type ApproveTicketTransferOutcome =
  | TicketTransferApproved
  | TicketNotFound
  | TicketTransferNotReviewable
  | TicketTransferReviewConflict
```

`TicketDetail` satisfaz `TicketTransferReviewFacts` (`TicketPendingTransfer`
tem `id` e `toDepartmentId`).

### Domínio — `app/_lib/domain/ticket-transfer.ts` (acrescido)

```ts
export const ticketTransferReviewBlockFor: (
  actor: TicketActorFacts,
  ticket: TicketTransferReviewFacts,
) => TicketTransferReviewBlockReason | null
export const canAcceptTicketTransfer: (
  actor: TicketActorFacts,
  ticket: TicketTransferReviewFacts,
) => boolean
export const isTicketTransferReviewConflict: (
  reason: TicketTransferReviewBlockReason,
) => reason is TicketTransferReviewStateBlockReason
export const ticketAttendKindFor: (
  actor: TicketActorFacts,
  ticket: TicketTransferReviewFacts,
) => TicketAttendKind | null
export const buildAcceptTicketTransferTarget: (
  ticket: TicketTransferReviewSource,
) => AcceptTicketTransferTarget | null
export const ticketAttendTargetFor: (
  actor: TicketActorFacts,
  ticket: TicketTransferReviewSource,
) => TicketAttendTarget | null
export const describeTicketTransferReviewConflict: (
  conflict: TicketTransferReviewConflict,
  actorId: number,
) => string
```

`TicketDetail` satisfaz `TicketTransferReviewSource`.

**`ticketTransferReviewBlockFor`** — primeiro motivo que vale:

| #   | Motivo                      | Condição                                                                                                | Conflito? |
| --- | --------------------------- | ------------------------------------------------------------------------------------------------------- | --------- |
| 1   | `ACTOR_INACTIVE`            | `!actor.isActive`                                                                                       | não       |
| 2   | `PASSWORD_CHANGE_REQUIRED`  | `actor.mustChangePassword`                                                                              | não       |
| 3   | `NO_PENDING_TRANSFER`       | `pendingTransfer === null`                                                                              | sim       |
| 4   | `OUTSIDE_TARGET_DEPARTMENT` | `actor.departmentId !== pendingTransfer.toDepartmentId \|\| actor.departmentId !== currentDepartmentId` | não       |
| 5   | `STATUS_NOT_AWAITING`       | `status !== AWAITING_APPROVAL_TICKET_STATUS`                                                            | sim       |

A coluna "Conflito?" é a tabela privada de `isTicketTransferReviewConflict`
(`satisfies Record<TicketTransferReviewBlockReason, boolean>`), type guard como
o do envio: no ramo verdadeiro o motivo já é
`TicketTransferReviewStateBlockReason`, pronto para o outcome.

`NO_PENDING_TRANSFER` vem antes do setor de propósito: quem perde a corrida do
aceite (a pendente já virou `aprovado`) recebe conflito com texto ("Você já
está atendendo…", "já foi aceito…"), não a recusa genérica.

| Nome                                   | Semântica                                                                                                                                                                                                                                                                                                                                                    |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `canAcceptTicketTransfer`              | `ticketTransferReviewBlockFor(...) === null`. **A** regra do botão e da transação                                                                                                                                                                                                                                                                            |
| `ticketAttendKindFor`                  | `canAcceptTicketTransfer` → `"accept_transfer"`; senão `canAttendTicket(actor, { …, hasPendingTransfer: pendingTransfer !== null })` → `"start_work"`; senão `null`                                                                                                                                                                                          |
| `buildAcceptTicketTransferTarget`      | `{ ticketId, transferId: pendingTransfer.id }`, ou `null` sem pendente                                                                                                                                                                                                                                                                                       |
| `ticketAttendTargetFor`                | `ticketAttendKindFor` já com o alvo da action: `{ kind: "start_work", ticketId }`, `{ kind: "accept_transfer", ticketId, transferId }` ou `null`. **A** entrada do botão no detalhe: uma prop só, discriminada por `kind`, sem o caso impossível "aceite sem pendente" que `attendKind` + `target \| null` deixaria aberto no tipo (acréscimo de 2026-10-09) |
| `describeTicketTransferReviewConflict` | primeira que vale, tabela abaixo                                                                                                                                                                                                                                                                                                                             |

`ticketAttendKindFor` checa o aceite primeiro: o botão "Atender" de quem é do
setor de destino nunca cai no `attendTicket` com pendência (o "Atender" antigo
exige destinatário, e o chamado pendente não tem).

**`describeTicketTransferReviewConflict(conflict, actorId)`** — primeira
linha que vale:

| #   | Condição                                                           | Texto                                                                   |
| --- | ------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| 1   | `currentAssigneeId === actorId` e `currentStatus === em_andamento` | `Você já está atendendo este chamado.`                                  |
| 2   | `currentAssigneeId === actorId` (outro status)                     | `Este chamado já está com você. Confira a página atualizada.`           |
| 3   | `reason === "TRANSFER_CHANGED"`                                    | `O envio deste chamado mudou. Confira a página atualizada.`             |
| 4   | `currentAssigneeName !== null`                                     | `Este chamado já foi aceito e agora está com Ana.`                      |
| 5   | outro                                                              | `Este chamado não aguarda mais aprovação. Confira a página atualizada.` |

A Etapa 3 acrescenta, entre as linhas 3 e 4, `reason === "TRANSFER_DECLINED"`
→ `Este chamado já foi recusado e devolvido ao setor que o enviou.` (a recusa
devolve com destinatário, que a linha 4 descreveria como aceite). Revisão de
2026-10-09: a condição é o motivo, não `currentStatus === "recusado"`, e o
texto não cita setor; ver "Conflito da recusa" na Etapa 3. O passo 3 de
`approveTicketTransfer` também muda na Etapa 3 (mesma seção).

Sucesso e recusa genérica **reaproveitam** os textos do "Atender":
`describeTicketAttended(ticketId)` e `TICKET_NOT_ATTENDABLE_MESSAGE`. O botão
continua `Atender` / `Atendendo…`.

Linha do tempo (`ticket-history.ts`): `transferencia_aprovada` passa a
`{usuário} do setor {setor} aceitou o chamado e começou a atendê-lo.`
(`describeActorWithDepartment`, setor **atual** de quem agiu, como no envio),
`historyEntryNamesActor` → `true` (a meta mostra só a data). Sem setor:
`QA Admin Infra aceitou…`; linha de sistema: `Sistema aceitou…`. O rótulo do
item continua `Transferência aprovada`.

`TICKET_TRANSFER_SOON_MESSAGE` saiu de `ticket-resolution.ts` (grep em
2026-10-09: nenhum uso fora de `docs/`).

### Validação — `app/_lib/validation/ticket-transfer.ts` (acrescido)

```ts
export const acceptTicketTransferSchema // z.object({ ticketId: ticketIdSchema, transferId })
export type AcceptTicketTransferInput = z.infer<
  typeof acceptTicketTransferSchema
>
// { ticketId: number; transferId: number }
```

`transferId`: inteiro positivo até o limite de `integer`, mensagem
`Não foi possível conferir o envio deste chamado. Recarregue a página.`

### `df-data` — `app/_lib/data/tickets.ts` — `approveTicketTransfer` (novo)

```ts
export async function approveTicketTransfer(
  values: ApproveTicketTransferValues,
): Promise<ApproveTicketTransferOutcome>
```

1. **Chamado** `for update` (`created_by`, `assigned_to`,
   `current_department_id`, `status`). Sem linha → `not_found`.
2. `lockActorFacts`. Sem linha → `not_reviewable`.
3. `!canViewTicket` → `not_found`.
4. **Pendente** — `select id, from_department_id, to_department_id from
ticket_transfer where ticket_id = $1 and status = 'pendente' limit 1 for
update`. Sem linha → `pendingTransfer = null`; com linha →
   `{ id, toDepartmentId }` (a linha inteira serve: `TicketPendingTransferReview`
   é estrutural e `fromDepartmentId` sobra para o passo 6).
5. **Regra** — `reason = ticketTransferReviewBlockFor(actor, { createdBy,
assignedTo, currentDepartmentId, status, pendingTransfer })`, nesta ordem:
   - `reason !== null && !isTicketTransferReviewConflict(reason)` →
     `not_reviewable`;
   - `reason !== null` (conflito; o type guard já estreitou para
     `TicketTransferReviewStateBlockReason`) → `conflict` com esse `reason`;
   - `pendente.id !== values.transferId` → `conflict` com
     `reason: "TRANSFER_CHANGED"`.
   - Conflito: `{ status: "conflict", reason, currentStatus: ticketRow.status,
currentDepartmentName (select name from department where id =
ticketRow.currentDepartmentId), currentAssigneeId: ticketRow.assignedTo,
currentAssigneeName (select name from users where id = assignedTo, só se
não nulo; senão null) }`.
6. **Grava** (`changedAt` uma vez):
   - `update ticket set assigned_to = actorId, status = ATTENDED_TICKET_STATUS,
updated_at = changedAt`;
   - `update ticket_transfer set status = 'aprovado', reviewed_by = actorId,
reviewed_at = changedAt, updated_at = changedAt where id = pendente.id`;
   - **uma** linha `transferencia_aprovada` `{ changedBy: actorId, fromStatus:
ticketRow.status, toStatus: ATTENDED_TICKET_STATUS, fromDepartmentId:
pendente.fromDepartmentId, toDepartmentId: pendente.toDepartmentId,
fromAssigneeId: ticketRow.assignedTo, toAssigneeId: actorId, changedAt }`.
7. `{ status: "saved", ticketId }`.

- **Precedência**: `not_found` (chamado) → `not_reviewable` (sem linha de quem
  age) → `not_found` (invisível) → `not_reviewable` (inativo, troca de senha,
  fora do setor de destino) → `conflict` (sem pendente, status) → `conflict`
  (`TRANSFER_CHANGED`).
- **Travas**: `ticket` (`for update`) → `users` (`for share`) →
  `ticket_transfer` (`for update`). Dois aceites simultâneos: o segundo espera o
  passo 1 e, depois do commit do primeiro, não acha pendente →
  `NO_PENDING_TRANSFER` → `Este chamado já foi aceito e agora está com {nome}.`
  (ou `Você já está atendendo este chamado.` se for a mesma pessoa em duas
  abas).
- Nada além de `ticket` (`assigned_to`, `status`, `updated_at`), a
  `ticket_transfer` pendente e uma `ticket_history`: setor, prioridade, origem,
  `resolved_at`, `solution` e `first_response_at` intactos (como no "Atender").
- Sem `mudanca_status` nem `atribuicao` extra (ADR 016).

### `df-actions` — `app/_lib/actions/ticket-transfer.ts` (acrescido)

```ts
export type AcceptTicketTransferErrorCode =
  "INVALID_INPUT" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT"

export interface AcceptTicketTransferSuccess {
  ok: true
  message: string
}

export interface AcceptTicketTransferFailure {
  ok: false
  message: string
  code?: AcceptTicketTransferErrorCode
}

export type AcceptTicketTransferResult =
  AcceptTicketTransferSuccess | AcceptTicketTransferFailure

export const acceptTicketTransfer: (
  input: AcceptTicketTransferInput,
) => Promise<AcceptTicketTransferResult>
```

| Situação         | `code`          | Mensagem                                                                                                        |
| ---------------- | --------------- | --------------------------------------------------------------------------------------------------------------- |
| sem sessão       | `FORBIDDEN`     | `Você não tem permissão para atender este chamado.`                                                             |
| schema           | `INVALID_INPUT` | primeira mensagem do Zod                                                                                        |
| `not_found`      | `NOT_FOUND`     | `TICKET_NOT_FOUND_MESSAGE`                                                                                      |
| `not_reviewable` | `FORBIDDEN`     | `TICKET_NOT_ATTENDABLE_MESSAGE`                                                                                 |
| `conflict`       | `CONFLICT`      | `describeTicketTransferReviewConflict(outcome, actor.id)`                                                       |
| exceção          | —               | `Não foi possível atender o chamado agora. Tente novamente.` (`console.error("[acceptTicketTransfer]", error)`) |
| `saved`          | —               | `describeTicketAttended(ticketId)`; revalida sempre detalhe, `/queue`, `/tickets` e `/dashboard`                |

1. `getSession()`; sem sessão → falha `FORBIDDEN` da tabela.
2. `acceptTicketTransferSchema.safeParse(input)`; falha → `INVALID_INPUT`.
3. `approveTicketTransfer({ ...parsed.data, actorId: actor.id })` em
   `try/catch`.
4. Mapeamento: tabela estática `satisfies Record<…, AcceptTicketTransferFailure>`
   para `not_found` e `not_reviewable`; `conflict` pelo texto do domínio.
5. `saved` → `revalidatePath(ticketDetailPath(id))`,
   `revalidatePath(DEPARTMENT_QUEUE_PATH)`, `revalidatePath(MY_TICKETS_PATH)`,
   `revalidatePath(DASHBOARD_PATH)` (de `@/app/_lib/domain/dashboard`). **Sem**
   `keepsAccess`: quem aceita vira destinatário e `canViewTicket` passa por
   `assignedTo`, então a re-renderização do detalhe na resposta é a desejada
   (ao contrário do envio).

- `TICKET_NOT_FOUND_MESSAGE`, `TICKET_NOT_ATTENDABLE_MESSAGE` e
  `describeTicketAttended` vêm do domínio. A mensagem de sem sessão e a de
  erro inesperado têm o mesmo texto das do `attendTicket`, mas são declaradas
  em `actions/ticket-transfer.ts`, como as do envio: arquivo `"use server"` só
  exporta função assíncrona, então as constantes de
  `actions/ticket-assignment.ts` não são importáveis.
- Sem e-mail, sem `redirect()`. A action não decide permissão: a transação
  decide.
- Entra na tabela "Quem revalida `/queue`" de `department-queue.md`.

### `df-ui` — Etapa 2

- **Detalhe (`page.tsx`)**: `const attendTarget = ticketAttendTargetFor(actor,
ticket)` no lugar de `canAttendTicketDetail(actor, ticket)`. `TicketDetail`
  satisfaz `TicketTransferReviewSource` sem conversão (conferido no `tsc`).
- **Cabeçalho**: `canAttend?: boolean` dá lugar a
  `attendTarget?: TicketAttendTarget | null`; o botão aparece quando não é
  nulo, no mesmo lugar de hoje (inclusive dentro de `TicketEditHeading`).
- **`AttendTicketButton`**: recebe `target: TicketAttendTarget`. Mesmo rótulo
  (`ATTEND_TICKET_LABEL` / `ATTEND_TICKET_PENDING_LABEL`), mesmo ícone.
  `target.kind === "start_work"` → `attendTicket({ ticketId: target.ticketId })`;
  `"accept_transfer"` → `acceptTicketTransfer({ ticketId: target.ticketId,
transferId: target.transferId })`. Tratamento de resultado igual ao de hoje
  (sucesso → toast; `CONFLICT`/`NOT_FOUND`/`FORBIDDEN` → toast e
  `router.refresh()`). Os dois tipos de resultado têm a mesma forma
  (`ok`, `message`, `code?`); os códigos do aceite são subconjunto dos do
  "Atender".
- **Depois do aceite**, sem código novo: a revalidação traz o selo
  `Em andamento`, o destinatário, o fim do aviso de pendência, a Conclusão com
  o formulário de resolver (agora destinatário) e a linha do tempo com a frase
  nova.
- **Meus chamados do autor**: nada a codar. O chamado aceito sai de
  "Aguardando aprovação" (status deixou de ser `aguardando_aprovacao`) e não
  entra em "Abertos por mim" (`departmentScope: "origin"`, e ele está no setor
  de destino). Continua acessível pela busca e por link (risco 2). A action
  revalida `/tickets`.
- Com transferência pendente, o "Editar" bloqueado (autor) e o "Atender"
  (destino) nunca aparecem para a mesma pessoa, a não ser autor que é do setor
  de destino; nesse caso os dois ficam lado a lado.
- Fila: nada (o aceite é só pelo detalhe; a linha do destino continua sem
  botão).
- Componente cliente importa `TicketAttendTarget` só como `import type`.

### Cenários para o `df-qa` — Etapa 2

Usa os chamados enviados na Etapa 1 (`#T1` em QA Infra). Recomendação ao
`df-data` (seed QA): acrescentar `qa.member.infra@directflow.test`
(`QA Membro Infra`, `member`, QA Infra) para testar aceite por membro; sem
ele, os cenários usam I.

| #    | Quem      | Ação                                                                                                                     | Esperado                                                                                                                                                                                                                                                                                                        |
| ---- | --------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1  | I         | `/tickets/T1`                                                                                                            | botão `Atender`                                                                                                                                                                                                                                                                                                 |
| AC2  | I         | "Atender" no `#T1`                                                                                                       | toast `Você começou a atender o chamado #T1.`; selo `Em andamento`; destinatário I; aviso de pendência some; linha do tempo `QA Admin Infra do setor QA Infra aceitou o chamado e começou a atendê-lo.`                                                                                                         |
| AC3  | banco     | depois do AC2                                                                                                            | `#T1`: `assigned_to = I`, `status = 'em_andamento'`, `current_department_id = F`; transferência `aprovado`, `reviewed_by = I`, `reviewed_at` = `changed_at` da linha nova; **uma** linha `transferencia_aprovada` com de/para de setor `S/F`, status `aguardando_aprovacao/em_andamento`, destinatário `null/I` |
| AC4  | M         | `/tickets` com Todos                                                                                                     | `#T1` não está em Aguardando aprovação nem em Abertos por mim; consulta MT bate                                                                                                                                                                                                                                 |
| AC5  | I         | `/tickets` e `/queue`                                                                                                    | `#T1` em Atribuídos a mim; na Fila de QA Infra, em Em andamento                                                                                                                                                                                                                                                 |
| AC6  | D         | `/tickets/T5` (pendente para QA Infra)                                                                                   | sem "Atender" (D não é de QA Infra)                                                                                                                                                                                                                                                                             |
| AC7  | D         | aceitar o chamado enviado para a Diretoria no TR10                                                                       | sucesso; D vira destinatário                                                                                                                                                                                                                                                                                    |
| AC8  | I, 2 abas | as duas em `/tickets/T5`; "Atender" na aba 1; depois na aba 2 sem recarregar                                             | aba 2: `Você já está atendendo este chamado.`; **uma** `transferencia_aprovada`                                                                                                                                                                                                                                 |
| AC8b | I e MI    | só com `QA Membro Infra` (MI) no seed: os dois num chamado novo pendente em QA Infra; I aceita; MI aceita sem recarregar | MI: `Este chamado já foi aceito e agora está com QA Admin Infra.`; a página de MI atualiza; **uma** `transferencia_aprovada`                                                                                                                                                                                    |
| AC9  | M         | request de `acceptTicketTransfer` para `#T3` (M autor, setor de origem)                                                  | `FORBIDDEN`, `Não é possível atender este chamado agora.`; nada gravado                                                                                                                                                                                                                                         |
| AC10 | I         | request com `transferId` de outra transferência; com `"abc"`, `0`                                                        | `CONFLICT` `O envio deste chamado mudou. Confira a página atualizada.`; `INVALID_INPUT`; nada gravado                                                                                                                                                                                                           |
| AC11 | A         | o "Atender" antigo (destinatário em `encaminhado`) num chamado novo                                                      | continua funcionando (`AT2` de `queue-tabs-comment-delete-and-attend.md`)                                                                                                                                                                                                                                       |
| AC12 | qualquer  | toda a bateria                                                                                                           | sem e-mail; sem erro de hidratação                                                                                                                                                                                                                                                                              |

---

## Etapa 3 — Recusar e status `recusado`

Código e migration publicados pelo `df-architect` em 2026-10-09 (Onda 0 da
Etapa 3). Esta seção substitui a versão de planejamento; o que mudou em relação
a ela está marcado como "revisão".

### Schema e migration

`db/schema.ts`: `ticketStatusEnum` ganhou `"recusado"` logo depois de
`"encaminhado"`. Gerada por `npm run db:generate -- --name
ticket_status_recusado`, sem edição:

```sql
-- db/migrations/0012_ticket_status_recusado.sql
ALTER TYPE "public"."ticket_status" ADD VALUE 'recusado' BEFORE 'aguardando_aprovacao';
```

Não destrutivo; o valor novo não é usado na própria migration (o Postgres
recusa usar um valor de enum na mesma transação em que ele foi criado, e a
`0011` também não o usa). **Não aplicada pelo arquiteto**: o usuário aplica com
`npm run db:migrate`, que roda a `0011` (se ainda pendente) e a `0012`.

### Decisão por mapa de status

Toda tabela `satisfies Record<TicketStatus, …>` recebeu a chave; o `tsc` aponta
as que faltam. `recusado` é **ativo** e se comporta como `encaminhado`, com o
selo próprio.

| Mapa                                   | Arquivo (dono)                                            | `encaminhado` | `recusado`                | Efeito                                                                         |
| -------------------------------------- | --------------------------------------------------------- | ------------- | ------------------------- | ------------------------------------------------------------------------------ |
| `TICKET_STATUS_LABELS`                 | `domain/ticket.ts` (`df-architect`)                       | `Encaminhado` | `Recusado`                | rótulo do selo, do filtro Status e da linha do tempo                           |
| `TICKET_STATUS_IS_OPEN`                | idem                                                      | `true`        | `true`                    | conta como chamado aberto (desativação de setor, `OPEN_TICKET_STATUSES`)       |
| `TICKET_STATUS_IS_FINAL`               | idem                                                      | `false`       | `false`                   | não final ⇒ entra em `ACTIVE_TICKET_STATUSES`                                  |
| `TICKET_STATUS_IS_ASSIGNABLE`          | `domain/ticket-assignment.ts`                             | `true`        | `true`                    | "Assumir" (na fila) e "Enviar" para pessoa                                     |
| `TICKET_STATUS_IS_ASSIGNMENT_DRIVEN`   | idem                                                      | `true`        | `true`                    | reatribuir: fila/colega → `encaminhado`; a si → `em_andamento`                 |
| `TICKET_STATUS_IS_ATTENDABLE` (novo)   | idem                                                      | `true`        | `true`                    | "Atender" do destinatário → `em_andamento` (os demais status: `false`)         |
| `TICKET_STATUS_IS_EDITABLE_BY_AUTHOR`  | `domain/ticket-edit.ts`                                   | `true`        | `true`                    | "Editar" do autor (no setor de origem)                                         |
| `TICKET_STATUS_IS_RESOLVABLE`          | `domain/ticket-resolution.ts`                             | `true`        | `true`                    | Conclusão com o formulário de resolver                                         |
| `TICKET_STATUS_SHOWS_SOLUTION`         | idem                                                      | `false`       | `false`                   | sem solução a exibir                                                           |
| `TICKET_STATUS_IS_DEPARTMENT_SENDABLE` | `domain/ticket-transfer.ts`                               | `true`        | `true`                    | "Enviar para outro setor"                                                      |
| `STATUS_CLASSES`                       | `app/(app)/_components/ticket-status-badge.tsx` (`df-ui`) | (token atual) | **cor própria** (`df-ui`) | hoje quebra o `tsc` (`ticket-status-badge.tsx:20` e `:27`) até receber a chave |

Listas derivadas que mudam sozinhas: `OPEN_TICKET_STATUSES`,
`NON_FINAL_TICKET_STATUSES`, `ACTIVE_TICKET_STATUSES`, `TICKET_STATUSES` (ordem
do enum: `recusado` logo depois de `encaminhado`) e
`ATTENDABLE_TICKET_STATUSES`. A invariante da Etapa 1 ("quem envia para outro
setor também pode resolver") continua: `recusado` é `true` nos dois mapas.

**Atender a partir de `recusado`.** `ATTENDABLE_TICKET_STATUS` (constante
única) **saiu** e deu lugar a:

```ts
export const isAttendableStatus: (status: TicketStatus) => boolean
export const ATTENDABLE_TICKET_STATUSES: readonly TicketStatus[] // ["encaminhado", "recusado"]
```

`ticketAttendBlockFor` usa `!isAttendableStatus(status)` para
`STATUS_NOT_ATTENDABLE`. Nenhum arquivo fora do domínio importava a constante
removida (grep de 2026-10-09).

**Fila do setor — abas.**

| Aba                   | `statuses`                                               | `assignee`   | `recusado` aparece quando                      |
| --------------------- | -------------------------------------------------------- | ------------ | ---------------------------------------------- |
| Em aberto             | `ACTIVE_TICKET_STATUSES` (inclui `recusado`)             | `unassigned` | voltou sem destinatário (solicitante inválido) |
| Encaminhados          | `ATTENDABLE_TICKET_STATUSES` (`encaminhado`, `recusado`) | `assigned`   | voltou com destinatário                        |
| Em andamento e demais | sem mudança                                              | —            | nunca                                          |

Descrição de Encaminhados: `Os chamados do setor encaminhados para alguém, ou
recusados por outro setor e devolvidos, aparecem aqui até o destinatário
começar o atendimento.` O filtro Status passa a aparecer em Encaminhados (dois
valores). As abas continuam particionando os chamados do setor.

**Meus chamados.** Sem mudança de regra: `recusado` é ativo, então entra em
"Atribuídos a mim" do solicitante (destinatário) e em "Abertos por mim" do
autor quando o chamado voltou ao setor de origem (`departmentScope: "origin"`).

**Selo.** O rótulo `Recusado` vem de `TICKET_STATUS_LABELS`; a cor é do `df-ui`,
distinta de `encaminhado` e de `cancelado`.

### Regra da recusa

- **Quem**: a mesma do aceite. `ticketTransferDeclineBlockFor` delega a
  `ticketTransferReviewBlockFor` (tabela da Etapa 2): usuário ativo, sem troca
  de senha, do setor de destino da pendente, que é o setor atual do chamado,
  com o chamado em `aguardando_aprovacao`. Diretoria só se o destino for a
  Diretoria.
- **Motivo**: obrigatório, limites do comentário (`TICKET_COMMENT_MIN_LENGTH` a
  `TICKET_COMMENT_MAX_LENGTH`, com `trim`).
- **Efeito** (uma transação): comentário **público** de quem recusou com o
  motivo; transferência `rejeitado` com `reviewed_by`, `reviewed_at` e
  `review_note` = motivo; chamado volta para `current_department_id` =
  `from_department_id` da transferência, `status = 'recusado'`, `assigned_to`
  = `requested_by` se ele estiver ativo e no setor de volta
  (`declineReturnAssigneeFor`), senão `null` (fila); **uma** linha
  `transferencia_rejeitada`.

### Tipos — `app/_lib/types/ticket-transfer.ts` (acrescido)

```ts
export type { ApprovalStatus } // reexportado de @/db/schema

export type TicketTransferReviewConflictReason =
  | TicketTransferReviewStateBlockReason
  | "TRANSFER_CHANGED"
  | "TRANSFER_DECLINED" // novo

export interface TicketReviewedTransferFacts {
  toDepartmentId: number
  status: ApprovalStatus
}

export type TicketTransferDeclineBlockReason = TicketTransferReviewBlockReason

export interface TicketPendingTransferDecline extends TicketPendingTransferReview {
  fromDepartmentName: string
}

export interface DeclineTicketTransferSource extends TicketTransferReviewSource {
  pendingTransfer: TicketPendingTransferDecline | null
}

export interface DeclineTicketTransferTarget extends AcceptTicketTransferTarget {
  fromDepartmentName: string
}

export interface DeclineTicketTransferFormDefaults {
  ticketId: number
  transferId: number
  reason: string
}

export interface TicketDeclineReturnFacts {
  fromDepartmentId: number
  requestedBy: number
}

export interface RejectTicketTransferValues {
  ticketId: number
  transferId: number
  actorId: number
  reason: string
}

export interface TicketTransferRejected {
  status: "saved"
  ticketId: number
  returnedToDepartmentName: string
  actorKeepsAccess: boolean
}

export type RejectTicketTransferOutcome =
  | TicketTransferRejected
  | TicketNotFound
  | TicketTransferNotReviewable
  | TicketTransferReviewConflict
```

- `TicketDetail` satisfaz `DeclineTicketTransferSource` sem conversão
  (`TicketPendingTransfer` tem `id`, `toDepartmentId` e `fromDepartmentName`;
  conferido no `tsc`).
- A linha de `ticket_transfer` lida pela transação (`id`, `from_department_id`,
  `to_department_id`, `requested_by`) satisfaz `TicketPendingTransferReview` e
  `TicketDeclineReturnFacts`; `{ to_department_id, status }` satisfaz
  `TicketReviewedTransferFacts`. A linha de `users` do solicitante
  (`is_active`, `department_id`) satisfaz `TicketAssigneeFacts`.
- Alargar `TicketTransferReviewConflictReason` não quebra
  `approveTicketTransfer` nem `acceptTicketTransfer`.

### Domínio — Etapa 3

`domain/ticket.ts` (acrescido):

```ts
export const DECLINED_TICKET_STATUS // "recusado" as const satisfies TicketStatus
```

`domain/ticket-assignment.ts`: `isAttendableStatus` e
`ATTENDABLE_TICKET_STATUSES` (acima); `ATTENDABLE_TICKET_STATUS` removido.

`domain/department-queue.ts`: aba `forwarded` com
`ATTENDABLE_TICKET_STATUSES` e a descrição nova.

`domain/ticket-transfer.ts` (acrescido):

```ts
export const REJECTED_TRANSFER_STATUS // "rejeitado" as const satisfies ApprovalStatus

export const canFollowTicketTransferReview: (
  viewer: TicketViewerFacts,
  ticket: TicketVisibilityFacts,
  reviewedTransfer: TicketReviewedTransferFacts | null,
) => boolean
export const ticketTransferReviewConflictReasonFor: (
  stateBlock: TicketTransferReviewStateBlockReason,
  reviewedTransfer: TicketReviewedTransferFacts | null,
) => TicketTransferReviewConflictReason

export const ticketTransferDeclineBlockFor: (
  actor: TicketActorFacts,
  ticket: TicketTransferReviewFacts,
) => TicketTransferDeclineBlockReason | null
export const canDeclineTicketTransfer: (
  actor: TicketActorFacts,
  ticket: TicketTransferReviewFacts,
) => boolean
export const ticketDeclineTargetFor: (
  actor: TicketActorFacts,
  ticket: DeclineTicketTransferSource,
) => DeclineTicketTransferTarget | null
export const buildDeclineTicketTransferFormDefaults: (
  target: AcceptTicketTransferTarget,
) => DeclineTicketTransferFormDefaults
export const declineReturnAssigneeFor: (
  transfer: TicketDeclineReturnFacts,
  requester: TicketAssigneeFacts | null,
) => number | null
export const canViewTicketAfterDecline: (
  viewer: TicketViewerFacts,
  ticket: TicketVisibilityFacts,
  transfer: TicketDeclineReturnFacts,
  returnAssigneeId: number | null,
) => boolean
export const declineTicketTransferDialogTitle: (ticketId: number) => string
export const describeDeclineDestination: (fromDepartmentName: string) => string
export const describeTicketTransferDeclined: (
  ticketId: number,
  departmentName: string,
) => string
```

| Nome                                     | Semântica                                                                                                                                                                                                         |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `canFollowTicketTransferReview`          | `canViewTicket(viewer, ticket)` **ou** (`reviewedTransfer` não nulo, `status === "rejeitado"` e `toDepartmentId === viewer.departmentId`). **A** regra de visibilidade do passo 3 do aceite e da recusa           |
| `ticketTransferReviewConflictReasonFor`  | `"TRANSFER_DECLINED"` quando `stateBlock === "NO_PENDING_TRANSFER"` e a transferência vista está `rejeitado`; senão o próprio `stateBlock`. **O** motivo do conflito de estado no aceite e na recusa              |
| `ticketTransferDeclineBlockFor`          | `ticketTransferReviewBlockFor(actor, ticket)` (delegação: mesma regra do aceite)                                                                                                                                  |
| `canDeclineTicketTransfer`               | `ticketTransferDeclineBlockFor(...) === null`. **A** regra da transação                                                                                                                                           |
| `ticketDeclineTargetFor`                 | `{ ticketId, transferId: pendingTransfer.id, fromDepartmentName: pendingTransfer.fromDepartmentName }` quando `canDeclineTicketTransfer`; senão `null`. **A** entrada do botão "Recusar" no detalhe (uma prop só) |
| `buildDeclineTicketTransferFormDefaults` | `{ ticketId, transferId, reason: "" }`                                                                                                                                                                            |
| `declineReturnAssigneeFor`               | `requestedBy` se `requester` não nulo e `isUsableTicketAssignee(requester, fromDepartmentId)`; senão `null`. **O** destinatário depois da recusa                                                                  |
| `canViewTicketAfterDecline`              | `canViewTicket(viewer, { createdBy, assignedTo: returnAssigneeId, currentDepartmentId: fromDepartmentId })`: quem recusou ainda vê o chamado?                                                                     |

Como `canDeclineTicketTransfer` e `canAcceptTicketTransfer` são a mesma regra,
`ticketDeclineTargetFor` é não nulo exatamente quando `ticketAttendTargetFor`
devolve `kind: "accept_transfer"`. A página chama as duas funções e não deduz
uma da outra.

**Conflito da recusa (revisão).** `describeTicketTransferReviewConflict`
(aceite e recusa), primeira linha que vale:

| #   | Condição                                                           | Texto                                                                   |
| --- | ------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| 1   | `currentAssigneeId === actorId` e `currentStatus === em_andamento` | `Você já está atendendo este chamado.`                                  |
| 2   | `currentAssigneeId === actorId` (outro status)                     | `Este chamado já está com você. Confira a página atualizada.`           |
| 3   | `reason === "TRANSFER_CHANGED"`                                    | `O envio deste chamado mudou. Confira a página atualizada.`             |
| 4   | `reason === "TRANSFER_DECLINED"` (**novo**)                        | `Este chamado já foi recusado e devolvido ao setor que o enviou.`       |
| 5   | `currentAssigneeName !== null`                                     | `Este chamado já foi aceito e agora está com Ana.`                      |
| 6   | outro                                                              | `Este chamado não aguarda mais aprovação. Confira a página atualizada.` |

Por que o motivo e não `currentStatus === "recusado"` (o que a versão de
planejamento dizia): depois da recusa o destinatário devolvido pode começar o
atendimento (`em_andamento`) antes do clique atrasado, e a linha 5 diria "já
foi aceito". A transferência vista (`transferId`) está `rejeitado` para sempre,
então o motivo é estável. O texto não cita setor nem pessoa porque, pela
exceção de `canFollowTicketTransferReview`, ele chega a quem já não vê o
chamado.

Quem pode ver qual texto: quem não vê mais o chamado só passa pelo passo 3 com
a transferência vista `rejeitado`; daí ou não há pendente (motivo
`TRANSFER_DECLINED`, linha 4) ou há pendente para outro setor
(`OUTSIDE_TARGET_DEPARTMENT` → `not_reviewable`). As linhas 1, 2, 3, 5 e 6
continuam só para quem vê o chamado.

Constantes de texto:

| Constante / função                 | Texto                                                                    |
| ---------------------------------- | ------------------------------------------------------------------------ |
| `DECLINE_TRANSFER_LABEL`           | `Recusar` (botão do detalhe e botão de envio do diálogo)                 |
| `DECLINE_TRANSFER_PENDING_LABEL`   | `Recusando…`                                                             |
| `DECLINE_REASON_LABEL`             | `Motivo da recusa`                                                       |
| `DECLINE_REASON_PLACEHOLDER`       | `Explique por que este setor não vai atender o chamado.`                 |
| `TICKET_NOT_DECLINABLE_MESSAGE`    | `Não é possível recusar este chamado agora.`                             |
| `declineTicketTransferDialogTitle` | `Recusar chamado #12`                                                    |
| `describeDeclineDestination`       | `O motivo vira um comentário público e o chamado volta para QA Suporte.` |
| `describeTicketTransferDeclined`   | `Chamado #12 recusado e devolvido para QA Suporte.`                      |

`describeDeclineDestination` (revisão): "volta para QA Suporte", não "volta
para a fila de QA Suporte", porque o chamado volta com o solicitante quando ele
ainda é válido.

### Linha do tempo — `app/_lib/domain/ticket-history.ts`

| Evento                     | Frase                                                                                                                 | Sem setor na linha                      | `historyEntryNamesActor`                              |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ----------------------------------------------------- |
| `transferencia_solicitada` | `Henrique do setor QA Suporte encaminhou o chamado para a fila de Diretoria.` (revisão: setor = `fromDepartmentName`) | `Henrique encaminhou…`                  | `true` (sem mudança)                                  |
| `transferencia_aprovada`   | sem mudança (`{usuário} do setor {setor atual} aceitou o chamado e começou a atendê-lo.`)                             | —                                       | `true`                                                |
| `transferencia_rejeitada`  | `QA Infra recusou o chamado.` (`fromDepartmentName` da linha = destino que recusou)                                   | `O setor de destino recusou o chamado.` | **`false`** (sem mudança; a meta mostra quem recusou) |

Rótulo do item continua `Transferência recusada`. A `note` da linha é nula; o
motivo está no comentário público e em `ticket_transfer.review_note`.

### Validação — `app/_lib/validation/ticket-transfer.ts` (acrescido)

```ts
export const declineTicketTransferSchema // z.object({ ticketId, transferId, reason })
export type DeclineTicketTransferInput = z.infer<
  typeof declineTicketTransferSchema
>
// { ticketId: number; transferId: number; reason: string }
```

| Campo        | Regra                                              | Mensagem                                                                |
| ------------ | -------------------------------------------------- | ----------------------------------------------------------------------- |
| `ticketId`   | `ticketIdSchema`                                   | `Chamado inválido.`                                                     |
| `transferId` | o mesmo do aceite                                  | `Não foi possível conferir o envio deste chamado. Recarregue a página.` |
| `reason`     | `string`, `trim`, `min(TICKET_COMMENT_MIN_LENGTH)` | `Escreva o motivo da recusa.` (também quando não é string)              |
| `reason`     | `max(TICKET_COMMENT_MAX_LENGTH)`                   | `O motivo precisa ter no máximo 5000 caracteres.`                       |

O `reason` que chega à action já vem aparado (`trim`). Quem recusa nunca vem do
cliente (`actorId` forjado é descartado pelo `z.object`).

### `df-data` — `app/_lib/data/tickets.ts`

#### Passo 3 compartilhado (revisão de `approveTicketTransfer`)

O passo 3 do aceite (`!canViewTicket → not_found`) passa a ser, no aceite **e**
na recusa:

3. **Transferência vista** — `select to_department_id, status from
ticket_transfer where id = $transferId and ticket_id = $ticketId` (sem
   trava: toda mudança de transferência do chamado acontece sob a trava do
   passo 1). Sem linha → `reviewedTransfer = null`.
   `!canFollowTicketTransferReview(actor, ticketRow, reviewedTransfer)` →
   `not_found`.

E o ramo de conflito de estado do passo 5 passa a usar
`ticketTransferReviewConflictReasonFor(reason, reviewedTransfer)` como
`reason` do outcome. O resto do aceite não muda. Um helper privado comum às
duas funções é bem-vindo (`df-data` decide).

#### `rejectTicketTransfer` (novo)

```ts
export async function rejectTicketTransfer(
  values: RejectTicketTransferValues,
): Promise<RejectTicketTransferOutcome>
```

Uma transação, nesta ordem:

1. **Chamado** — `select created_by, assigned_to, current_department_id, status
from ticket where id = $ticketId for update`. Sem linha → `not_found`.
2. **Quem age** — `lockActorFacts(tx, actorId)`. Sem linha → `not_reviewable`.
3. **Transferência vista** — passo 3 compartilhado (acima).
4. **Pendente** — `select id, from_department_id, to_department_id,
requested_by from ticket_transfer where ticket_id = $1 and status =
'pendente' limit 1 for update`. Sem linha → `pendingTransfer = null`.
5. **Regra** — `reason = ticketTransferDeclineBlockFor(actor, { createdBy,
assignedTo, currentDepartmentId, status, pendingTransfer })`:
   - `reason !== null && !isTicketTransferReviewConflict(reason)` →
     `not_reviewable`;
   - `reason !== null` → `conflict` com
     `ticketTransferReviewConflictReasonFor(reason, reviewedTransfer)`;
   - `pendente.id !== values.transferId` → `conflict` com
     `reason: "TRANSFER_CHANGED"`.
   - Conflito: mesma forma do aceite (`currentStatus`, `currentDepartmentName`,
     `currentAssigneeId`, `currentAssigneeName`).
6. **Volta** — `select is_active, department_id from users where id =
pendente.requestedBy for share` (`requester`, ou `null` se a linha não
   existir); `returnAssigneeId = declineReturnAssigneeFor(pendente,
requester)`; `select name from department where id =
pendente.fromDepartmentId` (`returnedToDepartmentName`).
7. **Grava** — `changedAt = new Date()` uma vez, nesta ordem:
   - `insert into message` `{ ticketId, userId: actorId, content:
values.reason, visibility: "publica", createdAt: changedAt, updatedAt:
changedAt }`;
   - `update ticket_transfer set status = REJECTED_TRANSFER_STATUS,
reviewed_by = actorId, reviewed_at = changedAt, review_note =
values.reason, updated_at = changedAt where id = pendente.id`;
   - `update ticket set current_department_id = pendente.fromDepartmentId,
assigned_to = returnAssigneeId, status = DECLINED_TICKET_STATUS,
updated_at = changedAt where id = $ticketId` (prioridade, origem, tag,
     `resolved_at`, `solution`, `first_response_at` intactos);
   - **uma** linha `ticket_history` `{ ticketId, changedBy: actorId, event:
"transferencia_rejeitada", fromStatus: ticketRow.status, toStatus:
DECLINED_TICKET_STATUS, fromDepartmentId: pendente.toDepartmentId,
toDepartmentId: pendente.fromDepartmentId, fromAssigneeId:
ticketRow.assignedTo, toAssigneeId: returnAssigneeId, note: null,
changedAt }`.
8. `{ status: "saved", ticketId, returnedToDepartmentName, actorKeepsAccess:
canViewTicketAfterDecline(actor, ticketRow, pendente, returnAssigneeId) }`.

- **Precedência**: `not_found` (chamado) → `not_reviewable` (sem linha de quem
  age) → `not_found` (não acompanha) → `not_reviewable` (inativo, troca de
  senha, fora do setor de destino) → `conflict` (estado, com
  `TRANSFER_DECLINED`) → `conflict` (`TRANSFER_CHANGED`).
- **Travas**: `ticket` (`for update`) → `users` quem age (`for share`) →
  `ticket_transfer` pendente (`for update`) → `users` solicitante (`for
share`). A ordem `ticket` → `users` é a de todas as transações do chamado.
  Aceite e recusa simultâneos se serializam pelo passo 1: quem chega depois
  não acha pendente e cai em conflito, sem gravar nada (nem comentário).
- Solicitante desativado ou movido de setor depois do envio: volta sem
  destinatário (`recusado` na aba Em aberto). Solicitante que é diretor de
  fora do setor de origem (diretoria enviando chamado de outro setor): idem.
- `ticket.updated_at` muda (diferente de publicar comentário): o chamado mudou
  de setor e status. O comentário não muda `first_response_at`.
- Sem `mudanca_status` nem `atribuicao` extra (ADR 016).

### `df-actions` — `app/_lib/actions/ticket-transfer.ts` (acrescido)

```ts
export type DeclineTicketTransferErrorCode =
  "INVALID_INPUT" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT"

export interface DeclineTicketTransferSuccess {
  ok: true
  message: string
  keepsAccess: boolean
}

export interface DeclineTicketTransferFailure {
  ok: false
  message: string
  code?: DeclineTicketTransferErrorCode
}

export type DeclineTicketTransferResult =
  DeclineTicketTransferSuccess | DeclineTicketTransferFailure

export const declineTicketTransfer: (
  input: DeclineTicketTransferInput,
) => Promise<DeclineTicketTransferResult>
```

| Situação         | `code`          | Mensagem                                                                                                         |
| ---------------- | --------------- | ---------------------------------------------------------------------------------------------------------------- |
| sem sessão       | `FORBIDDEN`     | `Você não tem permissão para recusar este chamado.`                                                              |
| schema           | `INVALID_INPUT` | primeira mensagem do Zod                                                                                         |
| `not_found`      | `NOT_FOUND`     | `TICKET_NOT_FOUND_MESSAGE`                                                                                       |
| `not_reviewable` | `FORBIDDEN`     | `TICKET_NOT_DECLINABLE_MESSAGE`                                                                                  |
| `conflict`       | `CONFLICT`      | `describeTicketTransferReviewConflict(outcome, actor.id)`                                                        |
| exceção          | —               | `Não foi possível recusar o chamado agora. Tente novamente.` (`console.error("[declineTicketTransfer]", error)`) |
| `saved`          | —               | `describeTicketTransferDeclined(outcome.ticketId, outcome.returnedToDepartmentName)`, `keepsAccess`              |

1. `getSession()`; sem sessão → falha `FORBIDDEN` da tabela.
2. `declineTicketTransferSchema.safeParse(input)`; falha → `INVALID_INPUT`.
3. `rejectTicketTransfer({ ...parsed.data, actorId: actor.id })` em
   `try/catch`.
4. Mapeamento: tabela estática `satisfies Record<…,
DeclineTicketTransferFailure>` para `not_found` e `not_reviewable`;
   `conflict` pelo texto do domínio.
5. `saved`:
   - `outcome.actorKeepsAccess` verdadeiro → `revalidatePath(ticketDetailPath(id))`,
     `revalidatePath(DEPARTMENT_QUEUE_PATH)`, `revalidatePath(MY_TICKETS_PATH)`,
     `revalidatePath(DASHBOARD_PATH)`;
   - falso → **nenhum** `revalidatePath` (mesma razão da Etapa 1: qualquer
     revalidação re-renderiza o detalhe na resposta e quem perdeu o acesso
     veria o 404 disputando com a saída da UI).
   - Retorno `{ ok: true, message, keepsAccess: outcome.actorKeepsAccess }`.

- Quem mantém acesso depois de recusar: diretoria (sempre vê) e autor que é do
  setor de destino. O caso comum (membro ou admin do destino) perde o acesso.
- A mensagem de sem sessão e a de erro inesperado são declaradas na própria
  action (arquivo `"use server"` só exporta função assíncrona).
- Sem e-mail, sem `redirect()`. A action não decide permissão: a transação
  decide.
- Entra na tabela "Quem revalida `/queue`" de `department-queue.md`.
- `acceptTicketTransfer` não muda: o motivo `TRANSFER_DECLINED` chega pelo
  outcome e o texto pelo domínio.

### `df-ui` — Etapa 3

**Detalhe (`/tickets/[id]`, `page.tsx`):**

- `const declineTarget = ticketDeclineTargetFor(actor, ticket)`, ao lado do
  `attendTarget` que já existe. `TicketDetail` satisfaz
  `DeclineTicketTransferSource`.
- **Botão `Recusar`** (`DECLINE_TRANSFER_LABEL`) ao lado do `Atender`, no mesmo
  lugar (inclusive dentro de `TicketEditHeading`), só quando `declineTarget`
  não é nulo. Variante destrutiva ou contorno; o `Atender` continua o
  principal. A página passa adiante `declineTarget` e o `backLink.href`.
- **Diálogo** (componente cliente novo na rota, ex.:
  `app/(app)/tickets/[id]/_components/decline-transfer-dialog.tsx`): `Dialog`
  do shadcn; título `declineTicketTransferDialogTitle(target.ticketId)`;
  descrição `describeDeclineDestination(target.fromDepartmentName)`; `Textarea`
  com rótulo `DECLINE_REASON_LABEL`, placeholder `DECLINE_REASON_PLACEHOLDER` e
  o mesmo contador de caracteres do comentário (`TICKET_COMMENT_MAX_LENGTH`), se
  o formulário de comentário tiver um; React Hook Form +
  `zodResolver(declineTicketTransferSchema)` com
  `buildDeclineTicketTransferFormDefaults(target)`. Botões `Cancelar` e
  `DECLINE_TRANSFER_LABEL` (destrutivo); pendente: desabilitado com
  `DECLINE_TRANSFER_PENDING_LABEL` e o diálogo não fecha.
- **Resultado**:
  - `ok` → `toast.success(message)`; com `keepsAccess`, fecha (a revalidação
    traz o selo `Recusado`, o setor de volta, o comentário e a linha do tempo);
    sem `keepsAccess`, `router.replace(leaveHref)` — **sem 404 piscando**,
    porque a action não revalidou nada.
  - `INVALID_INPUT` → erro no campo (`setError("reason")`) se a mensagem for do
    motivo; senão `toast.error(message)`.
  - `CONFLICT`, `NOT_FOUND`, `FORBIDDEN` → `toast.error(message)`, fecha,
    `router.refresh()`.
  - sem código → `toast.error(message)`, diálogo aberto.
- O `Atender` (aceite) que recebe `TRANSFER_DECLINED` segue o tratamento de
  conflito de hoje (toast e `router.refresh()`). Para quem já não vê o chamado
  a página atualizada é o 404 (risco 13).
- Componente cliente importa os tipos só como `import type` e não importa
  `app/_lib/data`, `app/_lib/auth`, `@/db/*`.

**Selo** (`app/(app)/_components/ticket-status-badge.tsx`): chave `recusado`
em `STATUS_CLASSES` com cor própria (token novo `--color-status-recusado` em
`app/globals.css`, distinto de `encaminhado` e `cancelado`). O rótulo vem de
`TICKET_STATUS_LABELS`. É o único ponto que hoje quebra o `tsc`.

**Fila (`/queue`)**: nada a codar além de conferir. Encaminhados lista
`encaminhado` e `recusado` com destinatário e ganha o filtro Status; `recusado`
sem destinatário aparece em Em aberto com "Assumir" (e "Enviar" para quem
despacha), como `encaminhado`.

**Meus chamados**: nada a codar.

**Linha do tempo**: nada a codar (frases montadas no domínio).

### Textos — Etapa 3

| Onde            | Texto                                                                                                                                                                                                                    |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Botão           | `Recusar`                                                                                                                                                                                                                |
| Diálogo         | `Recusar chamado #12` / `O motivo vira um comentário público e o chamado volta para QA Suporte.` / `Motivo da recusa` / `Explique por que este setor não vai atender o chamado.` / `Cancelar` / `Recusar` / `Recusando…` |
| Validação       | `Escreva o motivo da recusa.` / `O motivo precisa ter no máximo 5000 caracteres.`                                                                                                                                        |
| Sucesso         | `Chamado #12 recusado e devolvido para QA Suporte.`                                                                                                                                                                      |
| Conflitos       | tabela "Conflito da recusa"                                                                                                                                                                                              |
| Não pode        | `Não é possível recusar este chamado agora.`                                                                                                                                                                             |
| Sem sessão      | `Você não tem permissão para recusar este chamado.`                                                                                                                                                                      |
| Erro inesperado | `Não foi possível recusar o chamado agora. Tente novamente.`                                                                                                                                                             |
| Selo            | `Recusado`                                                                                                                                                                                                               |
| Linha do tempo  | `QA Infra recusou o chamado.`; envio: `{usuário} do setor {setor de origem} encaminhou o chamado para a fila de {destino}.`                                                                                              |
| Aba da Fila     | descrição nova de Encaminhados                                                                                                                                                                                           |

### Cenários para o `df-qa` — Etapa 3

Regras gerais da Etapa 1 (`M`, `A`, `I`, `D`, `S`, `F`, `[QA]`, "request de
action", `max(id)` antes de "nada gravado"). `MI` = QA Membro Infra, se
existir no seed.

**Preparação** (antes, `npm run db:migrate` aplicado pelo usuário):

- como A: `[QA] Recusa com solicitante` com a fila → enviar para QA Infra →
  `#R1` (A solicitante)
- como M: `[QA] Recusa sem solicitante` com `QA Membro Suporte` (M
  destinatário) → enviar para QA Infra → `#R2` (M solicitante)
- como A: `[QA] Recusa corrida` e `[QA] Recusa corrida 2` → enviar os dois
  para QA Infra → `#R3`, `#R4`
- como A: `[QA] Recusa forjada` → enviar para QA Infra → `#R5`

| #    | Quem      | Ação                                                                                                                                                        | Esperado                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RJ1  | banco     | `select enum_range(null::ticket_status)`                                                                                                                    | `{aberto,em_analise,encaminhado,recusado,aguardando_aprovacao,em_andamento,resolvido,fechado,cancelado}`; contagem de `ticket` por status igual à de antes da migration                                                                                                                                                                                                                                                                        |
| RJ2  | I         | `/tickets/R1`                                                                                                                                               | `Atender` e `Recusar` lado a lado                                                                                                                                                                                                                                                                                                                                                                                                              |
| RJ3  | A, M      | A abre `/tickets/R1` (A autor e solicitante); A abre um chamado pendente em QA Infra que ele enviou sem ser o autor; M autor de `#R2` abre `#R2` pela busca | `#R1`: página carrega (autor sempre vê), sem `Recusar` nem `Atender`; chamado enviado por A sem ser autor: 404 (perdeu o acesso ao sair do setor); M: página carrega, sem `Recusar` nem `Atender`                                                                                                                                                                                                                                              |
| RJ4  | I         | "Recusar" no `#R1`: enviar vazio; só espaços; 5001 caracteres                                                                                               | `Escreva o motivo da recusa.` (duas vezes); `O motivo precisa ter no máximo 5000 caracteres.`; nenhuma request de action                                                                                                                                                                                                                                                                                                                       |
| RJ5  | I         | recusar `#R1` com `[QA] Fora do escopo`                                                                                                                     | `Recusando…` durante o envio; toast `Chamado #R1 recusado e devolvido para QA Suporte.`; I sai para o link de voltar **sem** 404 piscando; `/tickets/R1` depois dá 404                                                                                                                                                                                                                                                                         |
| RJ6  | banco     | depois do RJ5                                                                                                                                               | `#R1`: `current_department_id = S`, `assigned_to = A`, `status = 'recusado'`; transferência `rejeitado`, `reviewed_by = I`, `reviewed_at` = `changed_at` da linha nova, `review_note = '[QA] Fora do escopo'`; `message`: uma linha nova `publica` de I com o motivo; **uma** `transferencia_rejeitada` com setor `F/S`, status `aguardando_aprovacao/recusado`, destinatário `null/A`, `note` nula; nenhuma `mudanca_status` nem `atribuicao` |
| RJ7  | A         | `/tickets/R1`, `/tickets`, `/queue`                                                                                                                         | selo `Recusado` (cor própria, diferente de Encaminhado e Cancelado); comentário público de I com o motivo; linha do tempo: item `Transferência recusada` com `QA Infra recusou o chamado.` e meta `QA Admin Infra · {data}`; `Atender`, `Editar` (A é autor), Conclusão com resolver, `Enviar para outro setor`; em Atribuídos a mim e em Abertos por mim; na Fila de QA Suporte em **Encaminhados**                                           |
| RJ8  | A         | `/queue` → Encaminhados → filtro Status                                                                                                                     | opções `Encaminhado` e `Recusado`; filtrar por Recusado mostra `#R1`                                                                                                                                                                                                                                                                                                                                                                           |
| RJ9  | A         | "Atender" no `#R1`                                                                                                                                          | toast `Você começou a atender o chamado #R1.`; `em_andamento`; linha do tempo `Recusado → Em andamento` (evento do "Atender")                                                                                                                                                                                                                                                                                                                  |
| RJ10 | D e M     | D desativa M (Cadastros → Pessoas); I recusa `#R2` com motivo; D reativa M                                                                                  | `#R2` volta para QA Suporte **sem destinatário**, `recusado`; na Fila de QA Suporte em **Em aberto** com selo `Recusado` e "Assumir"; banco: `transferencia_rejeitada` com destinatário `null/null` (o envio já limpou `assigned_to` ao ir para a fila do destino, e M inativo não volta como destinatário). Se a desativação for barrada pela regra de pessoas, registrar e pular                                                             |
| RJ11 | I, 2 abas | `#R3` aberto nas duas; aba 1 "Atender"; aba 2 "Recusar" com motivo, sem recarregar                                                                          | aba 2: `Você já está atendendo este chamado.`; nada da recusa gravado (nem `message`, nem mudança na transferência)                                                                                                                                                                                                                                                                                                                            |
| RJ12 | I (ou MI) | `#R4` aberto nas duas abas (ou sessões); aba 1 recusa; aba 2 "Atender" sem recarregar                                                                       | aba 2: `Este chamado já foi recusado e devolvido ao setor que o enviou.` (não `Chamado não encontrado.`); depois a página atualiza para 404; **uma** transferência para `#R4`, `rejeitado`; nenhuma `transferencia_aprovada`                                                                                                                                                                                                                   |
| RJ13 | I         | request de `declineTicketTransfer` para `#R4` (já recusado) com o `transferId` antigo                                                                       | `CONFLICT`, `Este chamado já foi recusado e devolvido ao setor que o enviou.`; nada gravado                                                                                                                                                                                                                                                                                                                                                    |
| RJ14 | M         | request de `declineTicketTransfer` para `#R5` (pendente em QA Infra, M sem acesso) e para um chamado pendente em QA Infra do qual M é autor                 | o primeiro: `NOT_FOUND`, `Chamado não encontrado.`; o segundo: `FORBIDDEN`, `Não é possível recusar este chamado agora.`; nada gravado                                                                                                                                                                                                                                                                                                         |
| RJ15 | I         | requests para `#R5`: `transferId` de outra transferência; `"abc"`; `reason` ausente; `reason` com 5001                                                      | `CONFLICT` `O envio deste chamado mudou. Confira a página atualizada.`; `INVALID_INPUT` nos três seguintes; nada gravado                                                                                                                                                                                                                                                                                                                       |
| RJ16 | A         | "Enviar para outro setor" no `#R5` depois de I recusá-lo (status `recusado`)                                                                                | botão visível; envio permitido; `aguardando_aprovacao` de novo; a transferência nova é a única pendente                                                                                                                                                                                                                                                                                                                                        |
| RJ17 | D         | chamado enviado para a Diretoria (TR10 ou novo): "Recusar" com motivo                                                                                       | sucesso; D **continua** no detalhe (diretoria vê tudo), que mostra `Recusado` e o setor de volta                                                                                                                                                                                                                                                                                                                                               |
| RJ18 | qualquer  | linha do tempo do #142 (ou outro enviado pela diretoria para a Diretoria)                                                                                   | `{D} do setor QA Suporte encaminhou o chamado para a fila de Diretoria.`                                                                                                                                                                                                                                                                                                                                                                       |
| RJ19 | banco     | QT2 da Fila com Encaminhados = `status in ('encaminhado','recusado') and assigned_to is not null` e Em aberto incluindo `recusado` sem destinatário         | bate para S e F                                                                                                                                                                                                                                                                                                                                                                                                                                |
| RJ20 | M         | 390×844: diálogo de recusa (como I)                                                                                                                         | diálogo cabe; textarea e botões alcançáveis                                                                                                                                                                                                                                                                                                                                                                                                    |
| RJ21 | qualquer  | toda a bateria                                                                                                                                              | sem e-mail; sem erro de hidratação                                                                                                                                                                                                                                                                                                                                                                                                             |

Ao final: M e A ativos em QA Suporte.

---

## Riscos

1. **Comentários privados mudam de público com o setor.** `canSeeInternalComments`
   usa o setor atual: desde o envio, o destino vê os privados da origem, e a
   origem deixa de vê-los (exceto o autor de cada comentário). Aceito pelo
   usuário. Cenário TR16.
2. **Chamados fora do setor de origem somem das abas do autor.** Vale para os
   aceitos no destino e para dados antigos com `current <> origin`. A busca do
   topo e o link continuam abrindo. QA mede (TR17).
3. **Corrida no destino.** Aceite × aceite e aceite × recusa se serializam pela
   trava do chamado e da transferência; quem perde recebe conflito e nada grava
   (AC8, RJ11, RJ12).
4. **Decisões por mapa de status.** Na Etapa 3 o `tsc` aponta cada
   `Record<TicketStatus, …>`; a tabela "Decisão por mapa" é a resposta para
   cada um. O mapa de selo é do `df-ui` e quebra o `tsc` dele desde a Onda 0
   da Etapa 3 (`ticket-status-badge.tsx:20` e `:27`) até receber a cor.
5. **Quem envia perde o acesso.** A UI sai do detalhe; se algum caminho ainda
   revalidar o detalhe, a pessoa vê o 404 por um instante antes de sair. QA
   registra (TR3, TR9, RJ4).
6. **Conflito antes da permissão no envio.** Quem forja o envio num chamado
   que vê mas não pode enviar recebe `CONFLICT` (`NOT_SENDER`) em vez de
   `FORBIDDEN`. Nada é gravado (mesmo desenho do risco 6 de
   `queue-tabs-comment-delete-and-attend.md`).
7. **#66 (legado).** Tem transferência pendente criada pelo seed com o chamado
   ainda no setor de origem. Ninguém do destino o vê; ninguém da origem pode
   aceitar. Fica parado até decisão do usuário. Não alterar.
8. **Destinatário fora do setor envia.** Pessoa movida de setor que continua
   destinatária pode enviar (como atende e resolve).
9. **Sem desfazer o envio.** `approval_status = 'cancelado'` continua sem uso:
   quem enviou não cancela. Até a Etapa 2 entrar, chamado enviado fica parado
   em `aguardando_aprovacao`; até a Etapa 3, só sai pelo aceite. Setor de
   destino sem ninguém ativo nunca aceita (ver risco 10).
10. **Destino sem pessoas ativas.** O diálogo lista setores ativos, não setores
    com gente. Um envio para um setor sem ninguém ativo fica parado até alguém
    entrar nele: não há quem aceite nem quem recuse. Decisão de produto à
    parte.
11. **Setor de origem desativado durante a pendência (Etapa 3).** A recusa
    devolve para `from_department_id` mesmo inativo (a desativação exige setor
    sem chamado aberto e sem pessoa ativa, então é raro). Reativar o setor em
    Cadastros resolve.
12. **Início muda com o envio.** As contagens do Início são por setor atual: o
    chamado sai do resumo da origem e entra no do destino (por isso a
    revalidação de `/dashboard`).
13. **Conflito de quem perdeu o acesso termina em 404.** Pela exceção de
    `canFollowTicketTransferReview`, quem clica atrasado depois de uma recusa
    recebe o texto `já foi recusado e devolvido…` em vez de `Chamado não
encontrado.`, mas o `router.refresh()` do tratamento de conflito leva ao
    404, porque a pessoa já não vê o chamado. Aceito: o toast explica o
    motivo. Se incomodar, o desenho é o mesmo do `keepsAccess` do sucesso.

## Critério de pronto, por etapa

**Etapa 1:** envio grava exatamente `ticket` (setor, destinatário, status,
`updated_at`), uma `ticket_transfer` pendente e uma `transferencia_solicitada`;
recusas e conflitos sem efeito; seis abas em Meus chamados com contagens = MT;
nenhuma mudança de schema; migration de dados `0011` aplicada e TR0 batendo;
`tsc`, `lint`, `build` passam; `df-reviewer` sem bloqueante.

**Etapa 2:** aceite grava exatamente `ticket` (destinatário, status,
`updated_at`), a transferência `aprovado` e uma `transferencia_aprovada`;
"Atender" antigo intacto; nenhuma migration.

**Etapa 3:** migration só com `ADD VALUE`; recusa grava comentário,
transferência `rejeitado`, `ticket` e uma `transferencia_rejeitada`; todo mapa
de status com `recusado` decidido conforme a tabela; selo próprio; clique
atrasado depois de uma recusa recebe `TRANSFER_DECLINED`, não `not_found`.

## Checklist de encerramento

Etapa 1:

- [x] `AWAITING_APPROVAL_TICKET_STATUS`, `ticketActorBlockFor` exportado, `types/ticket-transfer.ts`, `domain/ticket-transfer.ts`, `sendTicketToDepartmentSchema`, aba `awaiting` + `departmentScope` + `mapMyTicketsTabs`, frase de `transferencia_solicitada`, precedência de `AWAITING_APPROVAL` na edição (`df-architect`)
- [x] migration de dados `0011_align_legacy_transfers` escrita (`df-architect`)
- [ ] migration `0011` aplicada no banco de desenvolvimento (`npm run db:migrate`) e TR0 conferido
- [ ] `requestTicketTransfer`; `departmentScope` em `tabCondition`; contagens por `mapMyTicketsTabs` (`df-data`)
- [ ] `sendTicketToDepartment` (`df-actions`)
- [ ] botão e diálogo no detalhe; saída sem acesso (`df-ui`)
- [ ] cenários TR (`df-qa`)

Etapa 2:

- [x] tipos, regra de revisão, `ticketAttendKindFor`, `ticketAttendTargetFor`, `acceptTicketTransferSchema`, frase de `transferencia_aprovada`, remover `TICKET_TRANSFER_SOON_MESSAGE` (`df-architect`, 2026-10-09)
- [ ] `approveTicketTransfer` (`df-data`) · `acceptTicketTransfer` (`df-actions`) · "Atender" com os dois casos (`df-ui`) · cenários AC (`df-qa`)

Etapa 3:

- [x] enum + migration `0012` (gerada, não aplicada), mapas com `recusado`, `isAttendableStatus`/`ATTENDABLE_TICKET_STATUSES`, aba Encaminhados, regra e textos da recusa, `canFollowTicketTransferReview`, `TRANSFER_DECLINED`, `declineTicketTransferSchema`, frases de `transferencia_rejeitada` e (revisão) `transferencia_solicitada` (`df-architect`, 2026-10-09)
- [ ] migration `0012` aplicada no banco de desenvolvimento (`npm run db:migrate`) e RJ1 conferido
- [ ] `rejectTicketTransfer` e passo 3 revisado de `approveTicketTransfer` (`df-data`) · `declineTicketTransfer` (`df-actions`) · "Recusar", diálogo e selo (`df-ui`) · cenários RJ (`df-qa`)
