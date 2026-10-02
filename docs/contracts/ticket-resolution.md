# Contrato — Resolução e comentários do chamado

Entrada das ondas 1 e 2. As decisões estão no plano,
`docs/plans/ticket-resolution-and-comments.md`, e não são repetidas aqui. Este
documento é a referência técnica: assinaturas, sequências, textos e cenários.
Padrões de outcome, resultado de action e formulário vêm de
`docs/contracts/ticket-edit.md`; botão de ação bloqueada, de
`docs/contracts/ticket-creation.md` ("Comportamento do botão de ação
bloqueada"); detalhe e linha do tempo, de `docs/contracts/my-tickets.md`.

A retirada do setor de destino da criação, que entra na mesma entrega, está em
`docs/contracts/ticket-creation.md` (seção "Revisão de 2026-10-02").

Versões observadas: `next@16.3.5`, `drizzle-orm@0.45.2`, `drizzle-kit@0.31`,
`zod@4.6.5`, `react-hook-form@7.88`.

## Escopo técnico em uma frase

Quem pode resolver grava a solução e leva o chamado a `resolvido` numa
transação que trava o chamado e grava `ticket` + `ticket_history`
(`resolucao`); quem vê o chamado comenta (público ou privado) numa transação que
grava só `message`. Sem e-mail, sem `ticket_history` para comentário.

## Tabelas, enums e migration

### `db/schema.ts` (alterado)

| Objeto                 | Mudança                                    |
| ---------------------- | ------------------------------------------ |
| `ticket.solution`      | `text`, nullable, ao lado de `resolved_at` |
| `history_event` (enum) | novo valor `resolucao`, no fim da lista    |

`Ticket` ganha `solution: string | null`; `HistoryEvent` ganha `"resolucao"`.
`message` e `message_visibility` já existem e **não** mudam.

### Migration `db/migrations/0009_ticket_resolution.sql`

Gerada por `npm run db:generate -- --name ticket_resolution`, sem edição:

```sql
ALTER TYPE "public"."history_event" ADD VALUE 'resolucao';--> statement-breakpoint
ALTER TABLE "ticket" ADD COLUMN "solution" text;
```

Não destrutiva. Mesmo raciocínio da `0007` (`ticket-creation.md`, "Por que é
aplicável"): o migrador roda as pendentes numa transação só, e o Postgres aceita
`ADD VALUE` em transação desde que o valor não seja **usado** antes do commit. A
`0009` não usa `resolucao`. A coluna nova é nula em todos os chamados existentes,
inclusive nos `resolvido`/`fechado` do seed demo (o card mostra
`Nenhuma solução registrada.`).

Quem aplica (`npm run db:migrate`) é o usuário, **antes** dos testes do `df-qa`.
Sem ela, o detalhe falha (o `select` de `ticket.solution` não acha a coluna) e
a resolução falha como erro inesperado.

### Lidas e gravadas pelo fluxo

| Tabela            | Uso                                                                                                                              |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `ticket`          | resolução: trava (`for update`), grava `status`, `solution`, `resolved_at`, `updated_at`. Comentário: trava (`for share`), só lê |
| `users`           | lê quem resolve ou comenta: `department_id`, `role`, `is_active`, `must_change_password` (trava `for share of users`)            |
| `department`      | lê `is_board` do setor de quem age                                                                                               |
| `ticket_transfer` | resolução: lê se há linha `pendente`. Detalhe: `request_reason` da pendente (já lido)                                            |
| `ticket_history`  | grava `resolucao`                                                                                                                |
| `message`         | grava o comentário; lê a lista do chamado com o escopo de visibilidade                                                           |

## Tipos — `app/_lib/types/`

### `app/_lib/types/ticket.ts` (alterado)

```ts
export interface TicketActorFacts extends TicketViewerFacts {
  role: Role
  isActive: boolean
  mustChangePassword: boolean
}

export interface TicketDetail extends TicketVisibilityFacts {
  // campos anteriores…
  solution: string | null
  resolvedAt: Date | null
  pendingTransfer: TicketPendingTransfer | null // já traz requestReason
  history: TicketHistoryEntry[]
}
```

- `TicketActorFacts` é **o** objeto de quem age no detalhe: sai inteiro de
  `getAccountFacts()` (que já devolve `role`, `departmentId`, `isBoard`,
  `isActive`, `mustChangePassword`) mais o `actor.id` da sessão. É
  estruturalmente compatível com `TicketViewerFacts` e `TicketEditorFacts`:
  a página monta um só e passa para `canViewTicket`, `ticketEditButtonStateFor`,
  `ticketConclusionStateFor`, `ticketCommentFormStateFor` e
  `ticketMessageScopeFor`.
- `TicketPendingTransfer.requestReason` já existia (`my-tickets.md`) e o
  `findTicketDetail` já o seleciona. Nada muda nele.
- Mudanças da criação (`InitialTicketStatus` removido, `TicketSaved` sem
  destino etc.): ver `ticket-creation.md`.

### `app/_lib/types/ticket-resolution.ts` (novo)

```ts
export interface TicketResolutionFacts extends TicketVisibilityFacts {
  status: TicketStatus
  hasPendingTransfer: boolean
}

export type TicketResolutionBlockReason =
  | "RESOLVER_INACTIVE"
  | "PASSWORD_CHANGE_REQUIRED"
  | "NOT_RESOLVER"
  | "TICKET_FINISHED"
  | "ALREADY_RESOLVED"
  | "AWAITING_APPROVAL"
  | "STATUS_NOT_RESOLVABLE"

export interface TicketConclusionFacts extends TicketVisibilityFacts {
  status: TicketStatus
  solution: string | null
  resolvedAt: Date | null
  pendingTransfer: TicketPendingTransfer | null
}

export interface TicketConclusionResolvable {
  state: "resolvable"
}
export interface TicketConclusionResolved {
  state: "resolved"
  solution: string | null
  resolvedAt: Date | null
}
export interface TicketConclusionAwaitingTransfer {
  state: "awaiting_transfer"
  message: string
}
export interface TicketConclusionEmpty {
  state: "empty"
}
export type TicketConclusionState =
  | TicketConclusionResolvable
  | TicketConclusionResolved
  | TicketConclusionAwaitingTransfer
  | TicketConclusionEmpty

export interface UpdateTicketResolutionValues {
  ticketId: number
  solution: string
  resolverId: number
}

export interface TicketResolutionSaved {
  status: "saved"
  ticketId: number
}
export interface TicketNotResolvable {
  status: "not_resolvable"
}
export type UpdateTicketResolutionOutcome =
  TicketResolutionSaved | TicketNotFound | TicketNotResolvable

export interface ResolveTicketFormDefaults {
  ticketId: number
  solution: string
}
```

- `TicketDetail` satisfaz `TicketConclusionFacts` sem conversão.
- `TicketNotFound` é o de `types/ticket-edit.ts` (`{ status: "not_found" }`),
  reusado.
- `ResolveTicketFormDefaults` é serializável (vai de Server para Client
  Component por props).

### `app/_lib/types/ticket-comments.ts` (novo)

```ts
export type { MessageVisibility } // "publica" | "interna", de @/db/schema

export interface TicketCommentFacts extends TicketVisibilityFacts {
  status: TicketStatus
}

export type TicketCommentBlockReason =
  | "COMMENTER_INACTIVE"
  | "PASSWORD_CHANGE_REQUIRED"
  | "CANNOT_VIEW"
  | "TICKET_FINISHED"

export interface TicketCommentFormOpen {
  state: "open"
}
export interface TicketCommentFormClosed {
  state: "closed"
  message: string
}
export interface TicketCommentFormHidden {
  state: "hidden"
}
export type TicketCommentFormState =
  TicketCommentFormOpen | TicketCommentFormClosed | TicketCommentFormHidden

export interface TicketMessageScope {
  viewerId: number
  includeInternal: boolean
}

export interface TicketMessageItem {
  id: number
  authorName: string
  content: string
  visibility: MessageVisibility
  createdAt: Date
}

export interface InsertTicketMessageValues {
  ticketId: number
  authorId: number
  content: string
  visibility: MessageVisibility
}

export interface TicketMessageSaved {
  status: "saved"
  ticketId: number
  messageId: number
}
export interface TicketNotCommentable {
  status: "not_commentable"
}
export type InsertTicketMessageOutcome =
  TicketMessageSaved | TicketNotFound | TicketNotCommentable

export interface TicketCommentFormDefaults {
  ticketId: number
  content: string
  isPrivate: boolean
}
```

- `TicketDetail` satisfaz `TicketCommentFacts` sem conversão.
- `TicketMessageItem` é plano e serializável (`Date` atravessa a fronteira
  Server → Client).

## Domínio — `app/_lib/domain/`

### `app/_lib/domain/ticket-resolution.ts` (novo)

```ts
export const RESOLVED_TICKET_STATUS: TicketStatus // "resolvido"
export const TICKET_SOLUTION_MIN_LENGTH // = TICKET_DESCRIPTION_MIN_LENGTH (10)
export const TICKET_SOLUTION_MAX_LENGTH // = TICKET_DESCRIPTION_MAX_LENGTH (5000)
export const NO_SOLUTION_LABEL // "Nenhuma solução registrada."
export const TICKET_ATTACHMENTS_SOON_MESSAGE // "Anexos estarão disponíveis em breve."
export const TICKET_TRANSFER_SOON_MESSAGE // "O envio para outro setor estará disponível em breve."

export const isResolvableStatus: (status: TicketStatus) => boolean
export const showsTicketSolution: (status: TicketStatus) => boolean
export const isTicketResolver: (
  resolver: TicketActorFacts,
  ticket: TicketVisibilityFacts,
) => boolean
export const ticketResolutionBlockFor: (
  resolver: TicketActorFacts,
  ticket: TicketResolutionFacts,
) => TicketResolutionBlockReason | null
export const canResolveTicket: (
  resolver: TicketActorFacts,
  ticket: TicketResolutionFacts,
) => boolean
export const describeTransferAwaitingConclusion: (
  transfer: TicketPendingTransfer,
) => string
export const ticketConclusionStateFor: (
  viewer: TicketActorFacts,
  ticket: TicketConclusionFacts,
) => TicketConclusionState
export const buildResolveTicketFormDefaults: (
  ticketId: number,
) => ResolveTicketFormDefaults
export const describeTicketResolved: (ticketId: number) => string
```

| Nome                                 | Semântica                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `isResolvableStatus`                 | Tabela de flags `satisfies Record<TicketStatus, boolean>` (abaixo)                                                                                                                                                                                                                                                                                                                                                              |
| `showsTicketSolution`                | Tabela de flags: `resolvido` e `fechado` → `true`. É quando o card mostra a solução travada                                                                                                                                                                                                                                                                                                                                     |
| `isTicketResolver`                   | **Quem** resolve, sem olhar status: diretor (`isBoard`) → sim; `role = admin` **e** `departmentId = currentDepartmentId` → sim; com responsável (`assignedTo` não nulo) → só se `assignedTo = userId`; sem responsável → só se `createdBy = userId` **e** `currentDepartmentId = departmentId` (autor no setor do chamado, lido fresco)                                                                                         |
| `ticketResolutionBlockFor`           | Primeiro motivo, nesta ordem: inativo (`RESOLVER_INACTIVE`); troca de senha pendente (`PASSWORD_CHANGE_REQUIRED`); `!isTicketResolver` (`NOT_RESOLVER`); `fechado`/`cancelado` (`TICKET_FINISHED`, via `isNonFinalTicketStatus`); `resolvido` (`ALREADY_RESOLVED`); transferência pendente (`AWAITING_APPROVAL`); status fora da tabela (`STATUS_NOT_RESOLVABLE`, ex.: `aguardando_aprovacao` sem transferência). `null` = pode |
| `canResolveTicket`                   | `ticketResolutionBlockFor(...) === null`. **A** regra; a transação reconfere com ela                                                                                                                                                                                                                                                                                                                                            |
| `describeTransferAwaitingConclusion` | `requestReason` com `trim` não vazio → o próprio texto; nulo ou em branco → `describePendingTransfer` (`Aguardando aprovação de QA Infra`)                                                                                                                                                                                                                                                                                      |
| `ticketConclusionStateFor`           | Estado do card Conclusão (precedência abaixo)                                                                                                                                                                                                                                                                                                                                                                                   |
| `buildResolveTicketFormDefaults`     | `{ ticketId, solution: "" }`                                                                                                                                                                                                                                                                                                                                                                                                    |
| `describeTicketResolved`             | `42` → `Chamado #42 resolvido.`                                                                                                                                                                                                                                                                                                                                                                                                 |

Status resolvíveis:

| `ticket_status`        | Resolve | Por quê                                |
| ---------------------- | ------- | -------------------------------------- |
| `aberto`               | sim     |                                        |
| `em_analise`           | sim     |                                        |
| `encaminhado`          | sim     | desde que sem transferência pendente   |
| `aguardando_aprovacao` | **não** | aguarda decisão de outro setor         |
| `em_andamento`         | sim     |                                        |
| `resolvido`            | **não** | já resolvido; a solução não é editável |
| `fechado`              | **não** | imutável                               |
| `cancelado`            | **não** | encerrado                              |

**Por que admin e diretor passam antes do status.** `isTicketResolver` só diz
**quem**; o status e a transferência são conferidos depois, para todos. Um
diretor não resolve chamado com transferência pendente nem chamado `fechado`.

**Precedência de `ticketConclusionStateFor`** (a primeira que vale):

| #   | Condição                                                             | Estado                                                       |
| --- | -------------------------------------------------------------------- | ------------------------------------------------------------ |
| 1   | `showsTicketSolution(status)` (`resolvido`, `fechado`)               | `resolved` com `solution` e `resolvedAt` do chamado          |
| 2   | status final restante (`cancelado`)                                  | `empty`                                                      |
| 3   | `pendingTransfer !== null`                                           | `awaiting_transfer` com `describeTransferAwaitingConclusion` |
| 4   | `canResolveTicket(viewer, { ...ticket, hasPendingTransfer: false })` | `resolvable`                                                 |
| 5   | senão                                                                | `empty`                                                      |

- Os estados 1 a 3 independem de quem vê: são informação do chamado, e todo
  mundo que abre o detalhe vê o mesmo. Só o 4 depende de quem vê.
- `cancelado` vem antes da transferência: um chamado encerrado não "aguarda"
  nada, mesmo que sobre uma transferência pendente por inconsistência.
- `aguardando_aprovacao` **sem** transferência pendente (seed demo, #9 do
  diretor) cai em `STATUS_NOT_RESOLVABLE` → `empty`.
- No estado 3 o passo 4 é pulado de propósito: nem quem resolveria vê o
  formulário, porque a regra recusaria (`AWAITING_APPROVAL`).

### `app/_lib/domain/ticket-comments.ts` (novo)

```ts
export const TICKET_COMMENT_MIN_LENGTH // 1
export const TICKET_COMMENT_MAX_LENGTH // 5000
export const PRIVATE_COMMENT_LABEL // "Comentário privado" (rótulo da checkbox)
export const PRIVATE_COMMENT_BADGE // "Privado" (selo na lista)
export const NO_COMMENTS_LABEL // "Nenhum comentário ainda."
export const TICKET_COMMENTS_CLOSED_MESSAGE // "Este chamado foi encerrado e não recebe novos comentários."
export const TICKET_COMMENT_ADDED_MESSAGE // "Comentário publicado."

export const ticketCommentBlockFor: (
  commenter: TicketActorFacts,
  ticket: TicketCommentFacts,
) => TicketCommentBlockReason | null
export const canCommentOnTicket: (
  commenter: TicketActorFacts,
  ticket: TicketCommentFacts,
) => boolean
export const ticketCommentFormStateFor: (
  commenter: TicketActorFacts,
  ticket: TicketCommentFacts,
) => TicketCommentFormState
export const canSeeInternalComments: (
  viewer: TicketViewerFacts,
  ticket: Pick<TicketVisibilityFacts, "currentDepartmentId">,
) => boolean
export const ticketMessageScopeFor: (
  viewer: TicketViewerFacts,
  ticket: Pick<TicketVisibilityFacts, "currentDepartmentId">,
) => TicketMessageScope
export const messageVisibilityFor: (isPrivate: boolean) => MessageVisibility
export const isPrivateMessage: (visibility: MessageVisibility) => boolean
export const buildTicketCommentFormDefaults: (
  ticketId: number,
) => TicketCommentFormDefaults
```

| Nome                             | Semântica                                                                                                                                                                                  |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ticketCommentBlockFor`          | Nesta ordem: inativo (`COMMENTER_INACTIVE`); troca de senha (`PASSWORD_CHANGE_REQUIRED`); `!canViewTicket` (`CANNOT_VIEW`); `fechado`/`cancelado` (`TICKET_FINISHED`). `resolvido` comenta |
| `canCommentOnTicket`             | `ticketCommentBlockFor(...) === null`. **A** regra; a transação reconfere com ela                                                                                                          |
| `ticketCommentFormStateFor`      | `null` → `open`; `TICKET_FINISHED` → `closed` com `TICKET_COMMENTS_CLOSED_MESSAGE`; qualquer outro → `hidden`                                                                              |
| `canSeeInternalComments`         | Diretor (`isBoard`) **ou** `departmentId = currentDepartmentId`. Não inclui "quem escreveu": isso é por comentário, não por pessoa (ver escopo)                                            |
| `ticketMessageScopeFor`          | `{ viewerId: viewer.userId, includeInternal: canSeeInternalComments(viewer, ticket) }`                                                                                                     |
| `messageVisibilityFor`           | `true` → `interna`; `false` → `publica`. Única tradução da checkbox para o enum                                                                                                            |
| `isPrivateMessage`               | `visibility === "interna"`. A UI decide o selo por ela, nunca comparando a string                                                                                                          |
| `buildTicketCommentFormDefaults` | `{ ticketId, content: "", isPrivate: false }` (público por padrão)                                                                                                                         |

**Visibilidade de comentário privado — como chega à data layer.** A permissão
é decidida no domínio e entregue pronta como `TicketMessageScope`:

- `includeInternal` responde "esta pessoa vê **todos** os privados do chamado?"
  (setor atual ou diretor) — decisão do domínio, por `canSeeInternalComments`.
- `viewerId` existe para a única regra que é por comentário: quem escreveu vê o
  que escreveu. É parte da definição do escopo, fixada aqui, e não uma decisão
  da data layer.

A data layer traduz o escopo mecanicamente, sem saber de setor, diretor ou
papel:

```
includeInternal = true  → todas as mensagens do chamado
includeInternal = false → visibility = 'publica' OR user_id = viewerId
```

Ninguém filtra comentário fora do `listTicketMessages`, e nenhum privado sai do
servidor para quem não pode vê-lo (o filtro é no SQL, não na UI).

### `app/_lib/domain/ticket-history.ts` (alterado)

| `history_event` | Rótulo    | Frase                 |
| --------------- | --------- | --------------------- |
| `resolucao`     | Resolução | `Resolveu o chamado.` |

Sempre a mesma frase. A linha grava `from_status`/`to_status`, mas a frase não
os repete (o status novo é sempre `Resolvido`, e o badge do cabeçalho já o
mostra). A solução não aparece na linha do tempo: está no card Conclusão.

### `app/_lib/domain/ticket.ts` (acrescido)

```ts
export const TICKET_NOT_FOUND_MESSAGE = "Chamado não encontrado."
```

Texto de `NOT_FOUND` das actions do chamado. Arquivo `"use server"` só exporta
funções async, então a constante compartilhada mora no domínio. O `editTicket`
pode passar a usá-la (hoje repete o literal); não é obrigatório nesta entrega.

## Validação — `app/_lib/validation/`

### `app/_lib/validation/ticket-resolution.ts` (novo)

```ts
export const ticketSolutionSchema
export const resolveTicketSchema // z.object({ ticketId: ticketIdSchema, solution })
export type ResolveTicketInput = { ticketId: number; solution: string }
```

| Campo      | Regra                        | Mensagem                                           |
| ---------- | ---------------------------- | -------------------------------------------------- |
| `ticketId` | `ticketIdSchema`             | `Chamado inválido.`                                |
| `solution` | ausente ou vazia após `trim` | `Descreva a solução.`                              |
| `solution` | < 10 após `trim`             | `A solução precisa ter no mínimo 10 caracteres.`   |
| `solution` | > 5000 após `trim`           | `A solução precisa ter no máximo 5000 caracteres.` |

### `app/_lib/validation/ticket-comments.ts` (novo)

```ts
export const ticketCommentContentSchema
export const createTicketCommentSchema // z.object({ ticketId, content, isPrivate })
export type CreateTicketCommentInput = {
  ticketId: number
  content: string
  isPrivate: boolean
}
```

| Campo       | Regra                        | Mensagem                                              |
| ----------- | ---------------------------- | ----------------------------------------------------- |
| `ticketId`  | `ticketIdSchema`             | `Chamado inválido.`                                   |
| `content`   | ausente ou vazio após `trim` | `Escreva o comentário.`                               |
| `content`   | > 5000 após `trim`           | `O comentário precisa ter no máximo 5000 caracteres.` |
| `isPrivate` | não booleano                 | `Visibilidade do comentário inválida.`                |

- O cliente manda `isPrivate`, não o enum: a tradução é
  `messageVisibilityFor`, na action.
- Quem escreve **não** está no schema: vem da sessão.

## `df-auth` — nada novo

`getSession()`/`requireSession()` dão `actor.id`; `getAccountFacts()` dá
`role`, `departmentId`, `isBoard`, `isActive` e `mustChangePassword` frescos.

## `df-data` — o que criar e mudar

### `app/_lib/data/tickets.ts` — `findTicketDetail` (alterado)

Selecionar também `solution: ticket.solution` e `resolvedAt: ticket.resolvedAt`.
Nada mais muda (`pendingTransfer.requestReason` já é selecionado).

### `app/_lib/data/tickets.ts` — `insertTicket` (alterado)

Sem destino: ver `ticket-creation.md`, "Revisão de 2026-10-02".

### `app/_lib/data/tickets.ts` — `updateTicketResolution` (novo)

```ts
export async function updateTicketResolution(
  values: UpdateTicketResolutionValues,
): Promise<UpdateTicketResolutionOutcome>
```

Uma transação. Cada saída antecipada devolve o outcome **sem gravar nada**:

1. **Chamado** — `select created_by, assigned_to, current_department_id, status
from ticket where id = $ticketId for update`. Sem linha →
   `{ status: "not_found" }`.
2. **Quem resolve** — `users ⋈ department` por `users.department_id`:
   `department_id`, `role`, `is_active`, `must_change_password`,
   `department.is_board`, `where users.id = $resolverId`, `for share of users`.
   Sem linha → `not_resolvable`.
3. Monta `TicketActorFacts` com `userId = resolverId` e os campos lidos.
4. **Visibilidade** — `canViewTicket(resolver, chamado)` falso → `not_found`
   (mesma resposta de inexistente).
5. **Transferência pendente** — existe `ticket_transfer` com `ticket_id =
$ticketId and status = 'pendente'`?
6. **Regra** — `canResolveTicket(resolver, { createdBy, assignedTo,
currentDepartmentId, status, hasPendingTransfer })` falso →
   `{ status: "not_resolvable" }`.
7. `const changedAt = new Date()`.
8. `update ticket set status = RESOLVED_TICKET_STATUS, solution =
$solution, resolved_at = changedAt, updated_at = changedAt where id =
$ticketId`.
9. `insert into ticket_history`: `event: "resolucao"`, `changedBy =
resolverId`, `fromStatus` = status lido no passo 1, `toStatus =
RESOLVED_TICKET_STATUS`, `changedAt`. `note` e demais colunas nulas.
10. `{ status: "saved", ticketId }`.

Detalhes que o contrato fixa:

- **Precedência**: `not_found` → `not_resolvable`.
- **Travas, nesta ordem**: `ticket` (`for update`) → `users` (`for share`). A
  mesma ordem de `updateTicketByAuthor`: edição e resolução simultâneas do mesmo
  chamado se serializam pelo chamado. Duas resoluções simultâneas: a segunda
  espera, lê `resolvido` e devolve `not_resolvable` (`ALREADY_RESOLVED`).
- **Dados frescos**: setor, papel, ativo e troca de senha vêm da linha de
  `users` lida na transação; status e responsável, do chamado travado.
- **Regra fora da data layer**: visibilidade, quem resolve e status vêm do
  domínio; a função não repete as condições em SQL.
- `solution` chega já com `trim` (Zod). `priority`, `assigned_to`, setores,
  `closed_at` e `first_response_at` nunca são escritos aqui.
- Exceção (enum sem `resolucao` por migration não aplicada) sobe para a action.
  Nada é gravado: a transação é desfeita.

### `app/_lib/data/ticket-messages.ts` (novo)

Arquivo próprio: é a conversa do chamado, não o chamado em si.

```ts
export async function listTicketMessages(
  ticketId: number,
  scope: TicketMessageScope,
): Promise<TicketMessageItem[]>

export async function insertTicketMessage(
  values: InsertTicketMessageValues,
): Promise<InsertTicketMessageOutcome>
```

**`listTicketMessages(ticketId, scope)`**

- `message inner join users on users.id = message.user_id where
message.ticket_id = $1` e, **só** quando `scope.includeInternal` é falso,
  `and (message.visibility = 'publica' or message.user_id = scope.viewerId)`.
- Ordem: `message.created_at asc, message.id asc` (mais antigo primeiro).
- Devolve `TicketMessageItem[]` (`authorName = users.name`).
- Não decide quem vê o chamado nem quem vê privados: quem chama já aplicou
  `canViewTicket` e montou o escopo com `ticketMessageScopeFor`. Pessoa
  inativa continua aparecendo pelo nome.
- Índice `message_ticket_idx (ticket_id, created_at desc)` atende.

**`insertTicketMessage(values)`** — uma transação:

1. **Chamado** — `select created_by, assigned_to, current_department_id, status
from ticket where id = $ticketId for share`. Sem linha → `not_found`.
2. **Quem comenta** — mesma leitura do passo 2 da resolução (`for share of
users`). Sem linha → `not_commentable`.
3. `canViewTicket(commenter, chamado)` falso → `not_found`.
4. `canCommentOnTicket(commenter, { ...chamado })` falso →
   `{ status: "not_commentable" }`.
5. `insert into message (ticket_id, user_id, content, visibility)` com os
   valores recebidos; `created_at`/`updated_at` no default; `returning id`.
6. `{ status: "saved", ticketId, messageId }`.

- **Por que `for share` no chamado.** Impede que o chamado seja fechado ou
  cancelado entre a checagem e o insert (quem fechar vai travar `for update`),
  sem serializar dois comentários entre si.
- Nada em `ticket_history`, nada em `ticket` (`updated_at` não muda: comentar
  não altera o chamado). `first_response_at` fica para a feature que o definir.
- Precedência: `not_found` → `not_commentable`.

## `df-actions` — o que criar e mudar

### `app/_lib/actions/tickets.ts` — `createTicket` (alterado)

Sem destino: ver `ticket-creation.md`, "Revisão de 2026-10-02".

### `app/_lib/actions/ticket-resolution.ts` (novo, `"use server"`)

```ts
export type ResolveTicketErrorCode = "INVALID_INPUT" | "FORBIDDEN" | "NOT_FOUND"

export interface ResolveTicketSuccess {
  ok: true
  message: string
}

export interface ResolveTicketFailure {
  ok: false
  message: string
  code?: ResolveTicketErrorCode
}

export type ResolveTicketResult = ResolveTicketSuccess | ResolveTicketFailure

export const resolveTicket: (
  input: ResolveTicketInput,
) => Promise<ResolveTicketResult>
```

Sequência:

1. `const actor = await getSession()`; `null` → `FORBIDDEN` (sem sessão).
2. `resolveTicketSchema.safeParse(input)`; inválido → `INVALID_INPUT` com a
   primeira `issue.message`.
3. `try`: `updateTicketResolution({ ticketId, solution, resolverId: actor.id })`.
   `catch` → `console.error("[resolveTicket]", error)` e falha inesperada.
4. Traduz o outcome (tabela, `satisfies Record<…FailureStatus, …>` como no
   `editTicket`). `saved` → `revalidatePath(ticketDetailPath(ticketId))` e
   `revalidatePath(MY_TICKETS_PATH)` (status da linha e contagem das abas; um
   `resolvido` continua em "Abertos por mim"). O Início não muda (conta por
   data de abertura e tag, não por status).

| Situação         | `code`          | Mensagem                                                      |
| ---------------- | --------------- | ------------------------------------------------------------- |
| resolvido        | —               | `describeTicketResolved` → `Chamado #42 resolvido.`           |
| sem sessão       | `FORBIDDEN`     | `Você não tem permissão para resolver este chamado.`          |
| schema falhou    | `INVALID_INPUT` | primeira `issue.message` do Zod                               |
| `not_found`      | `NOT_FOUND`     | `TICKET_NOT_FOUND_MESSAGE` → `Chamado não encontrado.`        |
| `not_resolvable` | `FORBIDDEN`     | `Você não pode resolver este chamado.`                        |
| falha inesperada | —               | `Não foi possível resolver o chamado agora. Tente novamente.` |

A action não lê `getAccountFacts` nem decide permissão: a transação lê quem
resolve sob trava e aplica `canResolveTicket`. Nenhum SQL na action.

### `app/_lib/actions/ticket-comments.ts` (novo, `"use server"`)

```ts
export type AddTicketCommentErrorCode =
  "INVALID_INPUT" | "FORBIDDEN" | "NOT_FOUND"

export interface AddTicketCommentSuccess {
  ok: true
  message: string
}

export interface AddTicketCommentFailure {
  ok: false
  message: string
  code?: AddTicketCommentErrorCode
}

export type AddTicketCommentResult =
  AddTicketCommentSuccess | AddTicketCommentFailure

export const addTicketComment: (
  input: CreateTicketCommentInput,
) => Promise<AddTicketCommentResult>
```

Sequência: sessão → `createTicketCommentSchema.safeParse` →
`insertTicketMessage({ ticketId, authorId: actor.id, content, visibility:
messageVisibilityFor(isPrivate) })` em `try`/`catch`
(`console.error("[addTicketComment]", error)`) → outcome. `saved` →
`revalidatePath(ticketDetailPath(ticketId))`. Só o detalhe: comentários não
aparecem em Meus chamados nem no Início.

| Situação          | `code`          | Mensagem                                                         |
| ----------------- | --------------- | ---------------------------------------------------------------- |
| publicado         | —               | `TICKET_COMMENT_ADDED_MESSAGE` → `Comentário publicado.`         |
| sem sessão        | `FORBIDDEN`     | `Você não tem permissão para comentar neste chamado.`            |
| schema falhou     | `INVALID_INPUT` | primeira `issue.message` do Zod                                  |
| `not_found`       | `NOT_FOUND`     | `TICKET_NOT_FOUND_MESSAGE` → `Chamado não encontrado.`           |
| `not_commentable` | `FORBIDDEN`     | `Você não pode comentar neste chamado.`                          |
| falha inesperada  | —               | `Não foi possível publicar o comentário agora. Tente novamente.` |

Sem e-mail nas duas.

## `df-ui` — o que criar e mudar

### Estrutura

```
app/(app)/tickets/[id]/page.tsx                                   alterado — fatos de quem age, estados, comentários, grid
app/(app)/tickets/[id]/_components/ticket-conclusion.tsx          novo — card Conclusão, Server
app/(app)/tickets/[id]/_components/resolve-ticket-form.tsx        novo — "use client", RHF + Zod
app/(app)/tickets/[id]/_components/ticket-comments.tsx            novo — card Comentários, Server
app/(app)/tickets/[id]/_components/ticket-comment-form.tsx        novo — "use client", RHF + Zod
app/(app)/tickets/[id]/_components/<botões bloqueados>.tsx        novo — "use client", "Anexar" e "Enviar para outro setor"
```

Os dois botões bloqueados podem ser um arquivo por botão ou um componente com os
dois; decisão do `df-ui`. Em qualquer caso usam
`app/_components/blocked-action-trigger.tsx` (não criar outra peça).
`ticket-timeline.tsx` não muda: rótulo e frase de `resolucao` vêm do domínio.

### `/tickets/[id]` — `page.tsx`

```tsx
const actor: TicketActorFacts = {
  userId: session.id,
  departmentId: facts.departmentId,
  isBoard: facts.isBoard,
  role: facts.role,
  isActive: facts.isActive,
  mustChangePassword: facts.mustChangePassword,
}
if (!canViewTicket(actor, ticket)) notFound()

const editButton = ticketEditButtonStateFor(actor, ticket)
const conclusion = ticketConclusionStateFor(actor, ticket)
const commentForm = ticketCommentFormStateFor(actor, ticket)
const messages = await listTicketMessages(
  ticket.id,
  ticketMessageScopeFor(actor, ticket),
)
```

- `role` vem de `getAccountFacts()` (banco), nunca do `role` da sessão.
- A leitura das mensagens vem **depois** de `canViewTicket` (precisa do setor
  atual do chamado para o escopo, e não se lê conversa de chamado que vai virar
  404). Pode ir em `Promise.all` com a leitura das tags da edição.
- Nenhuma condição de status, papel, setor ou transferência é testada na
  página: tudo vem dos três estados.

### Grid

| Viewport | Coluna larga (`lg:col-span-2`)                                              | Coluna estreita        |
| -------- | --------------------------------------------------------------------------- | ---------------------- |
| `lg`+    | Descrição → Linha do tempo → Conclusão                                      | Detalhes → Comentários |
| < `lg`   | uma coluna: Descrição → Linha do tempo → Conclusão → Detalhes → Comentários |

- **Fim alinhado.** As duas colunas esticam até a altura da linha do grid
  (`lg:items-stretch`, não `lg:items-start` como hoje) e são `flex flex-col`; o
  último card de cada uma (Conclusão e Comentários) cresce para ocupar o resto
  (`flex-1`). Assim os dois terminam na mesma linha.
- **Quem dita a altura é a coluna larga.** A lista de comentários rola por
  dentro do card (`overflow-y-auto`) e **não** empurra a altura da linha: o card
  Comentários no desktop tem base zero (`lg:min-h-0 lg:basis-0 lg:flex-1`, ou
  técnica equivalente) e a lista ocupa o espaço que sobra abaixo do formulário.
  A Conclusão pode crescer para baixo (solução longa): a linha cresce e os
  Comentários acompanham.
- Mobile: a lista tem altura máxima própria (ex.: `max-h-96`) e rola por dentro;
  o formulário fica fora da área de rolagem.
- O aviso amarelo de transferência pendente (`PendingTransferNotice`) continua
  acima do grid, como hoje.

### `TicketConclusion` (Server)

Props: `ticketId: number`, `state: TicketConclusionState`. Card com título
`Conclusão` (`h2`). Por `state.state`:

| `state`             | Renderiza                                                                                                                                                                                                                  |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `resolvable`        | `<ResolveTicketForm defaults={buildResolveTicketFormDefaults(ticketId)} />` e, no rodapé do card, "Anexar" (`PaperclipIcon`) e "Enviar para outro setor" (`SendIcon` ou equivalente) bloqueados, ao lado do "Resolver"     |
| `resolved`          | Campo travado com a solução (`whitespace-pre-wrap`, texto puro) ou, se `solution` nulo, `NO_SOLUTION_LABEL`. Abaixo, `Resolvido em {formatDateTime(resolvedAt)}` num `<time dateTime={toISO(resolvedAt)}>`, só se não nulo |
| `awaiting_transfer` | Campo travado com `state.message`                                                                                                                                                                                          |
| `empty`             | `NO_SOLUTION_LABEL` como texto discreto, sem campo                                                                                                                                                                         |

- **Campo travado** = o mesmo visual do `Textarea`, somente leitura (`Textarea`
  com `readOnly`, ou bloco com o mesmo estilo e `aria-readonly="true"`), texto
  selecionável. Nunca `disabled` (contraste de leitura). Rótulo `Solução`.
- Os botões bloqueados aparecem **só** em `resolvable`. Texto exato no toast e
  no `span` `sr-only`: `TICKET_ATTACHMENTS_SOON_MESSAGE` e
  `TICKET_TRANSFER_SOON_MESSAGE`. Comportamento inteiro do
  `ticket-creation.md`, "Comportamento do botão de ação bloqueada": `<button
type="button" aria-disabled="true">`, sem `disabled`, nada no hover/foco,
  toast com `id` estável, nunca age.

### `ResolveTicketForm` (`"use client"`)

Props: `defaults: ResolveTicketFormDefaults`.

- `useForm<ResolveTicketInput>({ resolver: zodResolver(resolveTicketSchema),
defaultValues: defaults })`. `ticketId` vai nos `defaults`, sem campo.
- Campo `Solução` (`Textarea`, `Field`/`FieldLabel`/`FieldError`,
  `aria-invalid`), contador opcional com `TICKET_SOLUTION_MAX_LENGTH`.
- Botão `Resolver` (`Resolvendo…` com `Loader2Icon` durante o envio,
  desabilitado enquanto `isSubmitting`).
- Submit chama `resolveTicket(values)`:
  - `ok` → `toast.success(result.message)`. Sem `router.refresh()`: o
    `revalidatePath` da action recarrega a página, e o card passa a `resolved`.
  - `FORBIDDEN` ou `NOT_FOUND` → `toast.error(result.message)` e
    `router.refresh()` (o formulário some ou a página vira 404).
  - `INVALID_INPUT` → `setError("solution", { message }, { shouldFocus: true })`.
  - sem `code` → `toast.error(result.message)`, valor mantido.
- Sem dialog de confirmação: o botão é o ato (decisão do plano: solução
  obrigatória já é o freio).

### `TicketComments` (Server)

Props: `ticketId: number`, `messages: TicketMessageItem[]`,
`form: TicketCommentFormState`. Card com título `Comentários` (`h2`) e a
contagem (`messages.length`, `tabular-nums`).

- **Lista** (`ol`, na ordem recebida, mais antigo primeiro). Cada item:
  `authorName`, `formatDateTime(createdAt)` num `<time dateTime={toISO(...)}>`,
  selo `PRIVATE_COMMENT_BADGE` (`Badge`) quando `isPrivateMessage(visibility)`,
  conteúdo em texto puro (`whitespace-pre-wrap`, `wrap-break-word`; nunca
  HTML). Vazia → `NO_COMMENTS_LABEL`.
- **Formulário**, abaixo da lista, por `form.state`: `open` →
  `<TicketCommentForm defaults={buildTicketCommentFormDefaults(ticketId)} />`;
  `closed` → `form.message` em texto discreto; `hidden` → nada.
- Opcional (decisão do `df-ui`): ao montar e depois de publicar, rolar a lista
  até o fim (o mais novo). Exige um pedaço cliente só para a rolagem; a lista
  continua vindo do servidor.

### `TicketCommentForm` (`"use client"`)

Props: `defaults: TicketCommentFormDefaults`.

- `useForm<CreateTicketCommentInput>({ resolver:
zodResolver(createTicketCommentSchema), defaultValues: defaults })`.
- Campo `Comentário` (`Textarea`), contador opcional com
  `TICKET_COMMENT_MAX_LENGTH`.
- `Checkbox` (`app/_components/ui/checkbox.tsx`, já existe) com rótulo
  `PRIVATE_COMMENT_LABEL`, desmarcada por padrão, via `Controller`
  (`checked`/`onCheckedChange`; `onCheckedChange` entrega `boolean |
"indeterminate"`: grave `checked === true`).
- Botão `Comentar` (`Publicando…` com `Loader2Icon` durante o envio).
- Submit chama `addTicketComment(values)`:
  - `ok` → `toast.success(result.message)`, `form.reset(defaults)` (volta a
    público e vazio).
  - `FORBIDDEN` ou `NOT_FOUND` → `toast.error(result.message)` e
    `router.refresh()`.
  - `INVALID_INPUT` → `setError("content", …, { shouldFocus: true })`.
  - sem `code` → `toast.error(result.message)`, texto mantido.

### Regras gerais de UI

- Client Components importam só `app/_lib/domain`, `app/_lib/validation`,
  `app/_lib/types` e as actions. Nada de `app/_lib/data`, `app/_lib/auth`,
  `@/db/*` ou `drizzle-orm`.
- Datas só por `@/app/_lib/date`. Textos só das constantes do domínio.
- Nenhum `ticket_history` vem de comentário: a linha do tempo não muda ao
  comentar.

## Riscos

1. **Migration não aplicada** → o detalhe quebra (coluna `solution`) e a
   resolução falha. A `0009` precisa estar aplicada antes do teste.
2. **Solução travada** sem edição até a feature de fechamento automático.
3. **Admin e diretor resolvem a qualquer momento**, inclusive chamado com
   responsável de outra pessoa. Decidido; o histórico registra quem fez.
4. **Autor movido de setor** perde a resolução dos chamados que ficaram no
   setor antigo (precisa estar no setor do chamado). Continua comentando
   (vê como autor) e vê só os privados que ele mesmo escreveu.
5. **Privados seguem o setor atual.** Se a feature de envio mudar o
   `current_department_id`, os privados passam a ser lidos pelo setor novo.
   A feature de envio decide se isso é aceitável.
6. **Conclusão e transferência pendente repetem a justificativa** (aviso
   amarelo e card). Decidido no plano.
7. **Lista de comentários sem paginação.** Volume esperado pequeno; se crescer,
   paginar é feature própria.
8. **Travas**: `for share` no chamado ao comentar espera uma resolução ou
   edição em andamento do mesmo chamado (milissegundos). Aceito.
9. **Texto com emoji no limite**: o Zod conta unidades UTF-16; não há `CHECK`
   de tamanho em `solution` nem em `message.content`, então não há divergência
   com o banco.

## Critério de pronto

1. Cenários do `df-qa` abaixo aprovados (os marcados opcionais podem ficar como
   não executados).
2. Resolução grava só `ticket` (`status`, `solution`, `resolved_at`,
   `updated_at`) e uma linha `ticket_history` `resolucao`; comentário grava só
   `message`.
3. `npx tsc --noEmit`, `npm run lint` e `npm run build` passam; `df-reviewer`
   sem bloqueante.

## Cenários para o `df-qa`

Usuários e setores de `docs/contracts/qa-seed.md`. Títulos e tags criados
começam com `[QA]`. **Não alterar #65 a #68**: só leitura (e ações forjadas que
devem ser recusadas, sem gravar). Na Diretoria, só leitura: o diretor resolve e
comenta apenas chamados de QA Suporte. "Request de action" = `POST` com
cabeçalho `Next-Action`. Anotar `max(id)` de `ticket_history` e de `message`
antes de cada cenário que diz "nada gravado". Forjar = alterar o payload da
action a partir de um formulário legítimo aberto em outro chamado.

**Preparação** (a `0009` aplicada pelo usuário):

- QA Admin Suporte: `[QA] Acesso` ativa em QA Suporte (criar ou reativar).
- QA Admin Infra: `[QA] Rede` ativa em QA Infra (criar ou reativar), para os
  cenários 13 e 33.
- QA Membro Suporte cria, pelo "Novo chamado" (agora sem campo de destino), tag
  `[QA] Acesso`: `[QA] Resolução autor` (#R1), `[QA] Resolução admin` (#R2),
  `[QA] Resolução diretor` (#R3), `[QA] Comentários` (#C).
- QA Admin Suporte cria `[QA] Chamado do admin` (#A).
- Todos nascem `aberto`, em QA Suporte, sem `ticket_transfer` (cenário 1).

### Criação sem destino

| #   | Quem              | Ação                 | Esperado                                                                                                                                                                                                |
| --- | ----------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | banco, só leitura | depois da preparação | #R1, #R2, #R3, #C e #A com `status = aberto`, `origin_department_id = current_department_id` = QA Suporte; nenhum `ticket_transfer` para eles; uma linha `criacao` cada, sem `transferencia_solicitada` |
| 2   | QA Membro Suporte | abrir "Novo chamado" | campos Título, Descrição, Tipo e Tag; **sem** campo de setor de destino e sem aviso de aprovação; toast ao criar `Chamado #N criado.`                                                                   |

### Resolução

| #   | Quem              | Ação                                                                                                                                                              | Esperado                                                                                                                                                                                                                                                                                                                                             |
| --- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3   | QA Membro Suporte | abrir `/tickets/R1`                                                                                                                                               | card **Conclusão** na coluna larga, abaixo da linha do tempo, com campo `Solução`, botão `Resolver` e os botões "Anexar" e "Enviar para outro setor" esmaecidos (`aria-disabled="true"`, sem `disabled` nem `title`)                                                                                                                                 |
| 4   | QA Membro Suporte | `Resolver` com o campo vazio; depois `curta`                                                                                                                      | `Descreva a solução.`; depois `A solução precisa ter no mínimo 10 caracteres.`; nenhum request de action                                                                                                                                                                                                                                             |
| 5   | QA Membro Suporte | solução `  [QA] Reiniciei o serviço e validei o acesso.  ` → `Resolver`                                                                                           | toast `Chamado #R1 resolvido.`; badge `Resolvido`; card mostra a solução travada (sem os espaços das pontas) e `Resolvido em dd/mm/aaaa hh:mm`; botões bloqueados somem; último item da linha do tempo "Resolução" · QA Membro Suporte · data/hora · `Resolveu o chamado.`, sem nota                                                                 |
| 6   | banco, só leitura | depois do 5                                                                                                                                                       | `ticket` #R1: `status = resolvido`, `solution` = texto com `trim`, `resolved_at = updated_at` = `changed_at` da linha nova; `priority`, `assigned_to`, setores inalterados. `ticket_history`: uma linha nova, `event = resolucao`, `changed_by` = membro, `from_status = aberto`, `to_status = resolvido`, `note` nula, demais `from_*`/`to_*` nulas |
| 7   | QA Membro Suporte | em Meus chamados, aba Abertos por mim                                                                                                                             | #R1 continua listado, com status `Resolvido`; contagens batem com o banco                                                                                                                                                                                                                                                                            |
| 8   | QA Membro Suporte | do formulário de #R2 (antes de resolvê-lo), forjar `ticketId` = R1                                                                                                | toast `Você não pode resolver este chamado.` (`ALREADY_RESOLVED`); nada gravado                                                                                                                                                                                                                                                                      |
| 9   | QA Admin Suporte  | abrir `/tickets/R2` (não é autor; admin do setor atual) → resolver                                                                                                | formulário presente; toast `Chamado #R2 resolvido.`; no banco `changed_by` = QA Admin Suporte; linha do tempo com o nome dele                                                                                                                                                                                                                        |
| 10  | Diretor           | abrir `/tickets/R3` → resolver                                                                                                                                    | formulário presente; toast `Chamado #R3 resolvido.`; `changed_by` = diretor                                                                                                                                                                                                                                                                          |
| 11  | QA Membro Suporte | abrir `/tickets/A` (mesmo setor, não é autor, é `member`)                                                                                                         | detalhe abre; card Conclusão com `Nenhuma solução registrada.`, **sem** campo, sem `Resolver`, sem botões bloqueados                                                                                                                                                                                                                                 |
| 12  | QA Membro Suporte | do formulário de #C, forjar `ticketId` = A                                                                                                                        | `Você não pode resolver este chamado.`; nada gravado; #A continua `aberto`                                                                                                                                                                                                                                                                           |
| 13  | QA Admin Infra    | criar `[QA] Resolução infra` em QA Infra; do formulário dele, forjar `ticketId` = C, depois 999999                                                                | os dois `Chamado não encontrado.` (#C não é visível para ele); nada gravado                                                                                                                                                                                                                                                                          |
| 14  | QA Membro Suporte | abrir `/tickets/66` (transferência pendente para QA Infra, `request_reason` nulo)                                                                                 | aviso amarelo igual a antes; card Conclusão com o campo travado mostrando `Aguardando aprovação de QA Infra`; sem `Resolver`, sem botões bloqueados                                                                                                                                                                                                  |
| 15  | QA Admin Suporte  | abrir `/tickets/66`; do formulário de #A, forjar `ticketId` = 66                                                                                                  | mesmo card do 14 (admin também não resolve com transferência pendente); a action devolve `Você não pode resolver este chamado.`; `ticket.updated_at` do #66 e `max(id)` de `ticket_history` inalterados                                                                                                                                              |
| 16  | Diretor           | abrir os chamados próprios do seed demo: `resolvido` (hoje #10), `fechado` (#11), `cancelado` (#12), `aguardando_aprovacao` sem transferência (#9), `aberto` (#5) | #10 e #11: `Nenhuma solução registrada.` travado e `Resolvido em …` (o seed grava `resolved_at`); #12 e #9: `Nenhuma solução registrada.` sem campo; #5: formulário e botões bloqueados. **Não resolver nada na Diretoria**                                                                                                                          |
| 17  | QA Membro Suporte | desktop, mouse: em #C, passar o mouse em "Anexar" por 2 s; clicar; clicar mais duas vezes; idem "Enviar para outro setor"                                         | hover: nada aparece; clique: toast com o texto exato `Anexos estarão disponíveis em breve.` / `O envio para outro setor estará disponível em breve.`; cliques repetidos não empilham; nenhum request de action; nada abre                                                                                                                            |
| 18  | QA Membro Suporte | só teclado: `Tab` até cada botão, `Enter`, depois `Espaço`; árvore de acessibilidade                                                                              | só o anel de foco no foco; `Enter` e `Espaço` mostram o toast exato; foco continua no botão; nome acessível `Anexar` / `Enviar para outro setor`; `aria-describedby` aponta para `sr-only` com a mensagem exata                                                                                                                                      |
| 19  | QA Membro Suporte | viewport móvel com toque (`hasTouch`, `isMobile`, 390×844, `tap`) nos dois botões                                                                                 | toast exato; nenhum request de action                                                                                                                                                                                                                                                                                                                |

Use `force: true` em hover, clique e toque nos botões esmaecidos (a ferramenta
recusa ação em elemento `aria-disabled` sem ele).

### Comentários

| #   | Quem                | Ação                                                                                           | Esperado                                                                                                                                                                                                                                                                                        |
| --- | ------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 20  | QA Membro Suporte   | abrir `/tickets/C`                                                                             | card **Comentários** na coluna estreita, abaixo de Detalhes; `Nenhum comentário ainda.`; campo `Comentário`, checkbox `Comentário privado` desmarcada, botão `Comentar`                                                                                                                         |
| 21  | QA Membro Suporte   | `Comentar` vazio; depois só espaços; depois 5001 caracteres                                    | `Escreva o comentário.` (duas vezes); `O comentário precisa ter no máximo 5000 caracteres.`; nenhum request de action                                                                                                                                                                           |
| 22  | QA Membro Suporte   | `[QA] Comentário público do membro` → `Comentar`                                               | toast `Comentário publicado.`; aparece na lista com `QA Membro Suporte`, data/hora, sem selo; campo vazio e checkbox desmarcada; linha do tempo **inalterada**                                                                                                                                  |
| 23  | QA Membro Suporte   | marcar `Comentário privado`, `[QA] Privado do membro` → `Comentar`                             | aparece por último, com selo `Privado`                                                                                                                                                                                                                                                          |
| 24  | QA Admin Suporte    | em #C: `[QA] Público do admin` (público) e `[QA] Privado do admin` (privado)                   | os quatro comentários na ordem de criação; os dois privados com selo                                                                                                                                                                                                                            |
| 25  | banco, só leitura   | depois do 24                                                                                   | `message` com 4 linhas do #C: `user_id` e `visibility` corretos (`publica`/`interna`), `content` com `trim`; `max(id)` de `ticket_history` igual ao anotado antes do 22; `ticket.updated_at` do #C inalterado                                                                                   |
| 26  | Diretor             | abrir `/tickets/C`                                                                             | vê os 4, inclusive os dois privados                                                                                                                                                                                                                                                             |
| 27  | QA Membro + Diretor | Diretor move QA Membro Suporte para QA Infra (Cadastros → Pessoas); o membro abre `/tickets/C` | o detalhe abre (autor); lista com `[QA] Comentário público do membro`, `[QA] Privado do membro` (dele) e `[QA] Público do admin`; **sem** `[QA] Privado do admin` (nem no HTML/RSC da resposta); card Conclusão `Nenhuma solução registrada.` (autor fora do setor do chamado, sem responsável) |
| 28  | QA Membro Suporte   | ainda em QA Infra: privado `[QA] Privado de fora` em #C                                        | publicado, com selo, visível para ele                                                                                                                                                                                                                                                           |
| 29  | QA Admin Suporte    | abrir `/tickets/C`                                                                             | vê os 5, inclusive `[QA] Privado de fora` (setor atual). Ao fim, o Diretor move o membro de volta para QA Suporte                                                                                                                                                                               |
| 30  | QA Membro Suporte   | abrir `/tickets/R1` (`resolvido`) → comentar `[QA] Comentário em resolvido`                    | formulário presente; publicado                                                                                                                                                                                                                                                                  |
| 31  | Diretor             | abrir o `fechado` (#11) e o `cancelado` (#12) próprios do seed                                 | lista (vazia ou não) visível; sem formulário; texto `Este chamado foi encerrado e não recebe novos comentários.`                                                                                                                                                                                |
| 32  | Diretor             | do formulário de #C, forjar `ticketId` = 11                                                    | `Você não pode comentar neste chamado.`; `max(id)` de `message` inalterado. **Não** publicar nada na Diretoria                                                                                                                                                                                  |
| 33  | QA Admin Infra      | do formulário do `[QA] Resolução infra`, forjar `ticketId` = C                                 | `Chamado não encontrado.`; nada gravado                                                                                                                                                                                                                                                         |

O cenário 27 é a prova de que privado de terceiro não chega a quem está fora do
setor atual: conferir também a resposta do servidor (o texto não pode estar no
payload). Se a troca de setor não puder ser coordenada, registrar 27 a 29 como
não executados.

### Layout e geral

| #   | Quem              | Ação                                                                               | Esperado                                                                                                                                                                                                                                                                                                |
| --- | ----------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 34  | QA Membro Suporte | desktop 1440×900: `/tickets/C` com 5+ comentários                                  | Descrição → Linha do tempo → Conclusão na coluna larga; Detalhes → Comentários na estreita; a borda de baixo de Conclusão e a de Comentários na mesma linha (diferença ≤ 1 px por `getBoundingClientRect().bottom`); a lista de comentários rola por dentro do card, a página não cresce por causa dela |
| 35  | QA Membro Suporte | desktop: `/tickets/R1` (solução longa, se houver; senão a do 5)                    | Conclusão cresce para baixo; Comentários acompanha; fins alinhados como no 34                                                                                                                                                                                                                           |
| 36  | QA Membro Suporte | móvel 390×844: `/tickets/C`                                                        | uma coluna, na ordem Descrição, Linha do tempo, Conclusão, Detalhes, Comentários; lista de comentários com rolagem própria; nada estoura a largura                                                                                                                                                      |
| 37  | banco, só leitura | `select enum_range(null::history_event)`; `information_schema.columns` de `ticket` | contém `resolucao`; coluna `solution` `text`, `is_nullable = YES`                                                                                                                                                                                                                                       |
| 38  | qualquer          | navegar pelos cenários                                                             | nenhum erro nem aviso de hidratação no dev server (MCP `next-devtools`)                                                                                                                                                                                                                                 |

## Checklist de encerramento da feature

- [x] `ticket.solution`, `resolucao`, migration `0009_ticket_resolution`; tipos; `domain/ticket-resolution.ts`, `domain/ticket-comments.ts`; rótulo e frase de `resolucao`; `resolveTicketSchema`, `createTicketCommentSchema`; criação sem destino nos tipos, domínio e validação (`df-architect`)
- [x] `solution`/`resolvedAt` em `findTicketDetail`; `insertTicket` sem destino; `updateTicketResolution`; `listTicketMessages` e `insertTicketMessage` em `app/_lib/data/ticket-messages.ts` (`df-data`)
- [x] `createTicket` sem destino; `resolveTicket`; `addTicketComment` (`df-actions`)
- [x] grid alinhado; `TicketConclusion`, `ResolveTicketForm`, botões bloqueados; `TicketComments`, `TicketCommentForm`; "Novo chamado" sem destino e `AppTopBar` sem `listDepartmentOptions` (`df-ui`)
- [x] `npm run db:migrate` aplicado pelo usuário
- [x] cenários do `df-qa`
- [x] `npx tsc --noEmit`, `npm run lint`, `npm run build`
