# Contrato — Campo "Ações" no chamado

Etapa 3 do `/implement` pedido em 2026-11-18. Referência técnica única da
feature: decisões, assinaturas, sequências e cenários. Altera, no que toca
aqui, `docs/contracts/ticket-edit-window.md` (modo de edição) e
`docs/contracts/ticket-resolution.md` (card Conclusão continua igual; o card
Ações entra antes dele).

## O que é

"Ações" é um texto livre, um por chamado, em que quem atende descreve o que
fez antes de chegar à solução. Não é registro de entradas com autor e data
(isso são os comentários) e não aparece na abertura do chamado.

## Decisões fixadas pelo usuário

| Tema                | Decisão                                                                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Coluna              | `ticket.actions`, `text`, nullable. Nasce vazia. Migration só aditiva                                                                       |
| Obrigatoriedade     | Nunca obrigatória, nem para resolver. Sem mínimo; máximo = `TICKET_SOLUTION_MAX_LENGTH`. Vazio ou só espaços grava `null`                   |
| Escrita (Salvar)    | Só com o chamado `em_andamento`, por quem pode resolver (`isTicketResolver`), conta ativa, sem troca de senha pendente                      |
| Demais status       | `aberto`, `em_analise`, `encaminhado`, `aguardando_aprovacao`, `recusado`, `cancelado`, `fechado`: só leitura                               |
| Depois de resolvido | Corrigível no modo de edição, dentro da janela da Solução, **só se o chamado passou por Em andamento**. Resolvido direto de Aberto: travada |
| UI                  | Card próprio "Ações" na coluna principal, entre "Linha do tempo" e "Conclusão", sempre visível                                              |
| Resolver            | Continua mexendo só na Solução                                                                                                              |
| Histórico / e-mail  | Salvar Ações não gera linha em `ticket_history` nem e-mail                                                                                  |

## Decisões do arquiteto

1. **"Passou por Em andamento" vem do histórico, sem coluna nova.** Todo
   caminho que leva o chamado a `em_andamento` já grava `to_status =
'em_andamento'` em `ticket_history`: `criacao` com o próprio autor como
   destinatário (`insertTicket` em `app/_lib/data/tickets.ts`),
   `mudanca_status` por edição (`updateTicketByAssignee`), por assumir
   (`assignTicket`), por atender (`startTicketWork`) e
   `transferencia_aprovada` (`approveTicketTransfer`). Como o histórico é append-only, a regra
   é: _existe linha do chamado com `to_status = 'em_andamento'`_. Na página o
   domínio lê `ticket.history` (já carregado por `findTicketDetail`); dentro
   da transação o `df-data` faz um `EXISTS` (abaixo). "Passou em qualquer
   momento", não "foi resolvido a partir de Em andamento": um chamado que
   esteve Em andamento, foi encaminhado e resolvido depois pode ter Ações
   escritas, e trancá-las seria perder a correção.
2. **Dois caminhos de escrita, nunca simultâneos.**
   - _Salvar próprio_ (`saveTicketActions`): só `em_andamento`, regra de quem
     resolve (`ticketActionsBlockFor`). Admin do setor e Diretoria podem.
   - _Modo de edição_ (`editTicket`, campo opcional `actions`): só quem edita
     (ADR 017: o destinatário), em `em_andamento` ou em `resolvido` dentro da
     janela se passou por Em andamento (`canEditTicketActionsInEdit`). Durante
     o modo de edição o card troca o formulário próprio pelo campo do modo de
     edição; não há dois botões salvando o mesmo campo.
   - Consequência: em `resolvido`, admin e Diretoria só leem as Ações (o mesmo
     que acontece hoje com a Solução, que só o destinatário corrige).
3. **Sem `transform` no Zod.** `ticketActionsSchema` só faz `trim` e `max`; a
   saída continua `string` para o `useForm<EditTicketInput>` atual não
   precisar de tipo de entrada separado. Quem grava normaliza com
   `normalizeTicketActions` (vazio → `null`).
4. **Ações fora da nota de `edicao`.** `TicketEditChanges`,
   `hasTicketEditChanges` e `describeTicketEditNote` não mudam. Uma edição que
   só altera Ações grava a coluna e nenhuma linha de histórico; uma edição que
   altera Ações e título grava `edicao` com a nota "Alterou título." apenas.
5. **Concorrência.** Os dois caminhos travam a linha (`FOR UPDATE`) e
   reavaliam o domínio dentro da transação. Último a gravar vence, como nos
   demais campos de texto do chamado, com uma refinação no modo de edição:
   `actions` só vai no payload do `editTicket` quando o campo foi alterado
   (dirty). Se o usuário não mexeu nas Ações, a chave é omitida e as Ações
   salvas por outra pessoa pelo formulário próprio enquanto a edição estava
   aberta não são sobrescritas. Título e Solução mantêm o comportamento atual
   (vão sempre no payload).

## Banco — `db/schema.ts`

- `ticket.actions: text("actions")`, nullable, logo depois de `solution`.
- Migration **`db/migrations/0030_ticket_actions.sql`** (gerada):
  `ALTER TABLE "ticket" ADD COLUMN "actions" text;`
- Aplicar (`npm run db:migrate`) é do usuário, antes do `df-qa`.

## Zod — `app/_lib/validation/`

| Schema                    | Arquivo             | Forma                                              |
| ------------------------- | ------------------- | -------------------------------------------------- |
| `ticketActionsSchema`     | `ticket.ts`         | `string`, `trim`, `max(TICKET_ACTIONS_MAX_LENGTH)` |
| `editTicketSchema`        | `ticket.ts`         | ganha `actions: ticketActionsSchema.optional()`    |
| `saveTicketActionsSchema` | `ticket-actions.ts` | `{ ticketId: ticketIdSchema, actions }`            |

```ts
export type SaveTicketActionsInput = z.infer<typeof saveTicketActionsSchema>
```

Mensagem de excesso: `As ações precisam ter no máximo 5000 caracteres.`
(`TICKET_ACTIONS_MAX_LENGTH_MESSAGE`; o número vem da constante).

## Domínio — `app/_lib/domain/ticket-actions.ts`

Textos:

| Constante                                 | Valor                                                           |
| ----------------------------------------- | --------------------------------------------------------------- |
| `TICKET_ACTIONS_TITLE`                    | `Ações`                                                         |
| `NO_TICKET_ACTIONS_LABEL`                 | `Nenhuma ação registrada.`                                      |
| `TICKET_ACTIONS_PLACEHOLDER`              | `Descreva o que foi feito até chegar à solução.`                |
| `SAVE_TICKET_ACTIONS_LABEL`               | `Salvar`                                                        |
| `SAVE_TICKET_ACTIONS_PENDING_LABEL`       | `Salvando…`                                                     |
| `TICKET_ACTIONS_FORBIDDEN_MESSAGE`        | `Você não tem permissão para registrar as ações deste chamado.` |
| `TICKET_ACTIONS_NOT_EDITABLE_MESSAGE`     | `As ações só podem ser registradas com o chamado em andamento.` |
| `TICKET_ACTIONS_UNEXPECTED_ERROR_MESSAGE` | `Não foi possível salvar as ações agora. Tente novamente.`      |
| `describeTicketActionsSaved(id)`          | `Ações do chamado #000123 salvas.` (via `formatTicketNumber`)   |
| `TICKET_ACTIONS_MAX_LENGTH`               | `= TICKET_SOLUTION_MAX_LENGTH`                                  |
| `TICKET_ACTIONS_WRITABLE_STATUS`          | `"em_andamento"`                                                |

Funções (todas puras):

```ts
normalizeTicketActions(value: string): string | null
ticketActionsChanged(current: string | null, next: string | undefined): boolean
ticketActionsDisplayText(actions: string | null): string
hasTicketBeenInProgress(trail: readonly TicketStatusTrailEntry[]): boolean
canEditTicketActionsInEdit(status: TicketStatus, hasBeenInProgress: boolean): boolean
ticketActionsBlockFor(actor: TicketActorFacts, ticket: TicketActionsFacts): TicketActionsBlockReason | null
canSaveTicketActions(actor: TicketActorFacts, ticket: TicketActionsFacts): boolean
buildSaveTicketActionsFormDefaults(ticketId: number, actions: string | null): SaveTicketActionsFormDefaults
ticketActionsCardStateFor(viewer: TicketActorFacts, ticket: TicketActionsDetailFacts): TicketActionsCardState
```

- `normalizeTicketActions`: `trim`; vazio vira `null`.
- `ticketActionsChanged`: `false` se `next === undefined`; senão compara
  `current` com `normalizeTicketActions(next)`.
- `ticketActionsDisplayText`: o texto, ou `NO_TICKET_ACTIONS_LABEL` se `null`.
- `hasTicketBeenInProgress`: alguma entrada com `toStatus === "em_andamento"`.
  `TicketDetail.history` satisfaz o parâmetro.
- `canEditTicketActionsInEdit`: `em_andamento` → `true`; `resolvido` →
  `hasBeenInProgress`; resto → `false`. Não substitui `canEditTicket`, que
  continua cuidando de destinatário, setor, transferência e janela.
- `ticketActionsBlockFor`, na ordem: `ACTOR_INACTIVE`,
  `PASSWORD_CHANGE_REQUIRED`, `NOT_RESOLVER` (`isTicketResolver`),
  `AWAITING_APPROVAL` (transferência pendente), `STATUS_NOT_IN_PROGRESS`.
- `ticketActionsCardStateFor`: `editable` (com `defaults`) quando
  `canSaveTicketActions`; `read_only` em todo o resto. Os dois carregam
  `actions`.

Alteração em `app/_lib/domain/ticket-edit.ts`: `buildTicketEditFormOptions`
calcula `includesActions = canEditTicketActionsInEdit(ticket.status,
hasTicketBeenInProgress(ticket.history))`, devolve `includesActions` e, quando
verdadeiro, `defaults.actions = ticket.actions ?? ""`. Sem `includesActions`,
`defaults.actions` fica ausente e o `editTicket` não recebe o campo — o mesmo
padrão de `solution`.

## Tipos — `app/_lib/types/`

`ticket-actions.ts` (novo): `TicketStatusTrailEntry`, `TicketActionsFacts`,
`TicketActionsBlockReason`, `TicketActionsDetailFacts`,
`SaveTicketActionsFormDefaults`, `TicketActionsCardEditable`,
`TicketActionsCardReadOnly`, `TicketActionsCardState`,
`UpdateTicketActionsValues`, `TicketActionsSaved`, `TicketActionsNotEditable`,
`UpdateTicketActionsOutcome`.

```ts
export interface UpdateTicketActionsValues {
  ticketId: number
  actions: string | null
  actorId: number
}

export type UpdateTicketActionsOutcome =
  TicketActionsSaved | TicketNotFound | TicketActionsNotEditable
```

Alterados:

- `TicketDetail` (`ticket.ts`): `actions: string | null`.
- `TicketEditValues` (`ticket-edit.ts`): `actions?: string` (chega a
  `UpdateTicketByAssigneeValues` por herança).
- `TicketEditSource`: `actions: string | null` e
  `history: readonly TicketStatusTrailEntry[]` (o `TicketDetail` já serve).
- `EditTicketFormDefaults`: `actions?: string`.
- `TicketEditFormOptions`: `includesActions: boolean`.

## `df-data` — `app/_lib/data/tickets.ts`

Três itens, todos em `app/_lib/data/tickets.ts`.

### `findTicketDetail`

Selecionar `actions: ticket.actions` junto de `solution`. Nada mais.

### Helper privado `ticketHasBeenInProgress(tx, ticketId): Promise<boolean>`

`select 1 from ticket_history where ticket_id = $1 and to_status =
TICKET_ACTIONS_WRITABLE_STATUS limit 1` dentro da `tx`. Usa
`history_ticket_idx`. Não exportado.

### `updateTicketByAssignee`

- O `select ... for update` ganha `actions: ticket.actions`.
- Logo depois da checagem de `solution`, mesma posição na ordem:

  ```ts
  if (values.actions !== undefined) {
    const hasBeenInProgress =
      ticketRow.status === TICKET_ACTIONS_WRITABLE_STATUS ||
      (await ticketHasBeenInProgress(tx, ticketId))
    if (!canEditTicketActionsInEdit(ticketRow.status, hasBeenInProgress)) {
      return { status: "not_editable" }
    }
  }
  ```

- `const actionsChanged = ticketActionsChanged(ticketRow.actions,
values.actions)`.
- `no_changes` passa a exigir também `!actionsChanged`.
- No `update(ticket).set(...)`: quando `values.actions !== undefined &&
actionsChanged`, `actions: normalizeTicketActions(values.actions)`.
- Histórico **não** muda: `edicao` continua condicionado a
  `hasTicketEditChanges(changes)`, que não conhece Ações.

### `updateTicketActions(values: UpdateTicketActionsValues): Promise<UpdateTicketActionsOutcome>` (nova)

Transação, no padrão de `updateTicketResolution`:

1. `select createdBy, assignedTo, currentDepartmentId, status, actions from
ticket where id = $1 for update`. Sem linha → `not_found`.
2. `lockActorFacts(tx, actorId)`; `null` → `not_editable`.
3. `!canViewTicket(actor, ticketRow)` → `not_found`.
4. Transferência pendente do chamado (mesma query de
   `updateTicketResolution`).
5. `!canSaveTicketActions(actor, { ...ticketRow, hasPendingTransfer })` →
   `not_editable`. É aqui que a corrida com Resolver/Encaminhar fecha: se o
   status saiu de `em_andamento` entre o carregamento da tela e o clique, a
   linha travada já mostra o status novo.
6. Se `values.actions === ticketRow.actions`, devolve `saved` sem gravar.
7. `update ticket set actions = $actions, updated_at = now` e `saved`.

Sem `ticket_history`, sem `closeOpenQueueWait`. `values.actions` já chega
normalizado pela action.

## `df-actions` — `app/_lib/actions/ticket-actions.ts` (novo)

```ts
export type SaveTicketActionsErrorCode = "INVALID_INPUT" | "FORBIDDEN" | "NOT_FOUND"

export interface SaveTicketActionsSuccess { ok: true; message: string }
export interface SaveTicketActionsFailure {
  ok: false
  message: string
  code?: SaveTicketActionsErrorCode
}
export type SaveTicketActionsResult =
  SaveTicketActionsSuccess | SaveTicketActionsFailure

export const saveTicketActions = async (
  input: SaveTicketActionsInput,
): Promise<SaveTicketActionsResult>
```

Sequência, no padrão de `resolveTicket`:

1. `getSession()`; sem sessão → `FORBIDDEN`,
   `TICKET_ACTIONS_FORBIDDEN_MESSAGE`.
2. `saveTicketActionsSchema.safeParse`; falha → `INVALID_INPUT` com a
   primeira mensagem.
3. `updateTicketActions({ ticketId, actions:
normalizeTicketActions(parsed.data.actions), actorId: actor.id })` em
   `try/catch`; exceção → `console.error("[saveTicketActions]", error)` e
   falha sem código com `TICKET_ACTIONS_UNEXPECTED_ERROR_MESSAGE`.
4. Outcomes: `not_found` → `NOT_FOUND`, `TICKET_NOT_FOUND_MESSAGE`;
   `not_editable` → `FORBIDDEN`, `TICKET_ACTIONS_NOT_EDITABLE_MESSAGE`.
5. `saved` → `revalidatePath(ticketDetailPath(ticketId))` (nenhuma lista
   mostra Ações) e `{ ok: true, message: describeTicketActionsSaved(id) }`.

A autorização é do domínio, aplicada sob trava dentro de `updateTicketActions`,
como em `resolveTicket`.

**`editTicket`** (`app/_lib/actions/tickets.ts`): nenhuma mudança obrigatória.
`actions` vem em `parsed.data` e segue no `...fields` para
`updateTicketByAssignee`; `not_editable` e `no_changes` já têm mensagem. Só
confira que o spread continua levando o campo.

## `df-ui` — `app/(app)/tickets/[id]/`

### Página (`page.tsx`)

- `const actionsCard = ticketActionsCardStateFor(actor, ticket)`.
- Novo card `TicketActions` entre `<TicketTimeline>` e `<TicketConclusion>`,
  com `state={actionsCard}` e `editable={editable}`.
- Entram no `layoutKey` `actionsCard.state` e o tamanho do texto de Ações
  (`ticket.actions?.length ?? 0`), para realinhar a grade quando o texto lido
  muda depois de um refresh.

### Contexto de edição

- `TicketEditContextValue` (`_hooks/use-ticket-edit.ts`) ganha
  `includesActions: boolean`; o provider repassa `options.includesActions`.

### Componentes

- `ticket-actions.tsx`: card com título `TICKET_ACTIONS_TITLE`, sempre
  renderizado. Corpo:
  - leitura: `ticketActionsDisplayText(state.actions)`, esmaecido quando
    `null`, quebras de linha preservadas — no mesmo visual da Solução lida
    (`LockedSolutionField` ou equivalente).
  - `state === "editable"`: `TicketActionsForm` com `state.defaults`.
  - Com `editable` (há provider), o corpo vai dentro de `TicketEditActions`;
    sem provider, não chame `useTicketEdit` (ele lança fora do provider) — o
    mesmo cuidado de `ticket-conclusion.tsx`.
- `ticket-edit-actions.tsx` (`"use client"`), no padrão de
  `ticket-edit-solution.tsx`: se `isEditing && includesActions`, renderiza
  `FormField name="actions" label="Ações"` (não obrigatório) com o mesmo
  campo de texto da Solução e placeholder `TICKET_ACTIONS_PLACEHOLDER`;
  senão, `children`. Assim, durante o modo de edição o formulário próprio
  some e o valor sai pelo "Salvar" da edição — só quando o campo está dirty
  (decisão 5).
- `ticket-actions-form.tsx` (`"use client"`): `useForm<SaveTicketActionsInput>`
  com `zodResolver(saveTicketActionsSchema)`, o mesmo campo de texto da
  Solução com placeholder e
  botão `SAVE_TICKET_ACTIONS_LABEL` / `SAVE_TICKET_ACTIONS_PENDING_LABEL`,
  desabilitado sem alteração (`!isDirty`) ou enviando. Sucesso: toast com a
  mensagem e `form.reset` com o valor salvo. `FORBIDDEN` ou `NOT_FOUND`:
  toast de erro e `router.refresh()`. `INVALID_INPUT`: erro no campo.

## Cenários para o `df-qa`

| #   | Cenário                                                                                        | Esperado                                                                                          |
| --- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| A1  | Abrir chamado novo                                                                             | Formulário de abertura sem campo Ações; `ticket.actions` nulo                                     |
| A2  | Detalhe de chamado `aberto`                                                                    | Card "Ações" entre Linha do tempo e Conclusão, "Nenhuma ação registrada.", sem textarea           |
| A3  | Destinatário em `em_andamento` fora do modo de edição                                          | Textarea + Salvar; salvar mostra "Ações do chamado #… salvas."; recarregar mantém o texto         |
| A4  | Admin do setor atual em `em_andamento` de outro destinatário                                   | Pode salvar (regra de quem resolve)                                                               |
| A5  | Pessoa do setor que não é destinatário nem admin, em `em_andamento` com destinatário           | Só leitura                                                                                        |
| A6  | Salvar só espaços                                                                              | Grava `null`; card volta a "Nenhuma ação registrada."                                             |
| A7  | Texto acima do máximo                                                                          | Erro no campo "As ações precisam ter no máximo … caracteres."; nada gravado                       |
| A8  | Salvar Ações                                                                                   | Nenhuma linha nova em `ticket_history`; nenhum e-mail; Linha do tempo igual                       |
| A9  | Resolver chamado `em_andamento` com Ações preenchidas                                          | Resolver só pede Solução; Ações permanecem                                                        |
| A10 | Destinatário entra no modo de edição em `em_andamento`                                         | Botão Salvar do card some; Ações vira campo da edição; salvar a edição grava as Ações             |
| A11 | Edição que só altera Ações                                                                     | Salva; nenhuma linha `edicao`; `updated_at` muda                                                  |
| A12 | Edição que altera título e Ações                                                               | `edicao` com nota "Alterou título."                                                               |
| A13 | Resolvido que passou por Em andamento, dentro da janela, destinatário em modo de edição        | Ações editável na edição                                                                          |
| A14 | Resolvido direto de Aberto, dentro da janela, modo de edição                                   | Ações só leitura ("Nenhuma ação registrada."); solução editável                                   |
| A15 | Resolvido fora do modo de edição (qualquer pessoa)                                             | Só leitura, sem Salvar                                                                            |
| A16 | Fechado (janela vencida) e cancelado                                                           | Só leitura                                                                                        |
| A17 | `aguardando_aprovacao` / `encaminhado` / `recusado` / `em_analise`                             | Só leitura                                                                                        |
| A18 | Corrida: tela aberta em `em_andamento`, chamado resolvido em outra aba, depois Salvar Ações    | Toast "As ações só podem ser registradas com o chamado em andamento."; tela recarrega; nada salvo |
| A19 | Conta inativa ou com troca de senha pendente                                                   | Só leitura; action recusa com `FORBIDDEN`                                                         |
| A20 | Banco                                                                                          | `select actions from ticket where id = …` reflete cada salvamento                                 |
| A21 | Edição aberta numa aba sem mexer em Ações; outra pessoa salva Ações pelo card; salvar a edição | Ações da outra pessoa permanecem (`actions` omitido do payload)                                   |

## Checklist

1. Migration `0030_ticket_actions` aplicada pelo usuário antes do `df-qa`.
2. `df-data`: os três itens acima.
3. `df-actions`: `saveTicketActions`.
4. `df-ui`: card, formulário próprio, campo no modo de edição, contexto.
5. `npx tsc --noEmit`, `npm run lint` e `npm run build` passam; `df-reviewer`.
6. `df-qa` com os cenários acima.
