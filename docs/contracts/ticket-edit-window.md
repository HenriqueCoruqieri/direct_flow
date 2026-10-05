# Contrato — Janela de 7 dias após a resolução, edição na própria tela e "Hoje" em Meus chamados

Entrada das ondas 1 e 2. As decisões estão no plano,
`docs/plans/ticket-edit-window-and-inline-edit.md`, e não são repetidas aqui.
Este documento é a referência técnica: assinaturas, sequências, textos e
cenários. Ele **altera** três contratos anteriores, que continuam valendo no
que não é tocado aqui:

- `docs/contracts/ticket-edit.md` — edição pelo autor (sai o dialog; entra a
  solução e a janela)
- `docs/contracts/ticket-resolution.md` — card Conclusão e comentários (a trava
  passa a considerar a janela)
- `docs/contracts/my-tickets.md` — adendo do filtro por data (o padrão vira
  `Hoje`) e linha do tempo (ator `Sistema`)

Decisão de arquitetura: `docs/adr/014-scheduled-close-of-resolved-tickets.md`.

Versões observadas: `next@16.3.5`, `drizzle-orm@0.45.2`, `drizzle-kit@0.31`,
`zod@4.6.5`, `react-hook-form@7.88`.

## Escopo técnico em uma frase

Um chamado `resolvido` aceita edição do autor (agora também da solução) e
comentários por 7 × 24 h contadas de `resolved_at`; vencida a janela, o domínio o
trata como encerrado na hora, e um cron diário grava `fechado` com uma linha
`encerramento` do sistema (`changed_by` nulo). A edição sai do dialog e passa a
acontecer na própria página do detalhe. Meus chamados abre em `Hoje`.

## Regra da janela

| Item               | Definição                                                                                                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Início             | `ticket.resolved_at`                                                                                                                                          |
| Duração            | 7 × 24 h exatas (`RESOLUTION_EDIT_WINDOW_MS` = 604 800 000 ms). Não é dia de calendário: fuso e horário de verão não mudam a conta                            |
| Aberta             | `now < resolved_at + 7 × 24 h`                                                                                                                                |
| Vencida            | `now >= resolved_at + 7 × 24 h` ⇔ `resolved_at <= now − 7 × 24 h` (= `resolutionWindowCutoff(now)`)                                                           |
| `resolved_at` nulo | Em `resolvido` (inconsistência): janela **vencida**                                                                                                           |
| Dentro da janela   | O autor edita título, descrição, tipo, tag **e solução** (mesmas condições de `ticketEditBlockFor`); qualquer pessoa que vê o chamado comenta                 |
| Fora da janela     | `isTicketLocked` → verdadeiro: sem "Editar", sem formulário de comentário (`Este chamado foi encerrado e não recebe novos comentários.`), antes mesmo do cron |
| Persistência       | Cron diário grava `fechado`, `closed_at`, `updated_at` e `ticket_history` `encerramento` com `changed_by` nulo                                                |
| Reabertura         | Fora desta entrega                                                                                                                                            |

A comparação "aberta" é estrita (`<`) e a do SQL do cron é `<=`, as duas sobre o
mesmo instante de corte: um chamado é fechado pelo cron se, e só se, o domínio
já o considera travado naquele `now`.

## Tabelas, enums e migration

### `db/schema.ts` (alterado)

| Objeto                      | Mudança                                                                       |
| --------------------------- | ----------------------------------------------------------------------------- |
| `ticket_history.changed_by` | passa a aceitar nulo. FK para `users.id` com `on delete restrict` **mantida** |

Nulo significa "o sistema". `ticket.status`, `ticket.closed_at` e o valor
`encerramento` de `history_event` já existem: nada novo em enum, tabela ou
índice.

### Migration `db/migrations/0010_history_system_actor.sql`

Gerada por `npm run db:generate -- --name history_system_actor`, sem edição:

```sql
ALTER TABLE "ticket_history" ALTER COLUMN "changed_by" DROP NOT NULL;
```

Não destrutiva: só relaxa uma restrição; nenhuma linha existente muda. Quem
aplica (`npm run db:migrate`) é o usuário, **antes** dos testes do `df-qa`. Sem
ela, o cron falha no `insert` da linha `encerramento` (`null value in column
"changed_by" violates not-null constraint`), a transação é desfeita e a rota
responde 500; nada é fechado.

Sem índice novo para o cron. A consulta (`status = 'resolvido' and resolved_at <=
$cutoff`) faz varredura em `ticket` uma vez por dia; o volume não justifica
índice parcial hoje. Se o `EXPLAIN` mostrar problema, o `df-data` reporta.

### Lidas e gravadas pelo fluxo

| Tabela           | Uso                                                                                                                                             |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `ticket`         | edição: lê também `resolved_at` e `solution`, grava `solution` quando mudou. Cron: trava as vencidas, grava `status`, `closed_at`, `updated_at` |
| `ticket_history` | edição: `edicao` (nota com "solução"). Cron: `encerramento` com `changed_by` nulo. Detalhe: `left join` em `users`                              |
| `message`        | comentário: a transação passa a ler `resolved_at` do chamado para a trava                                                                       |

## Tipos — `app/_lib/types/`

### `app/_lib/types/ticket.ts` (alterado)

```ts
export interface TicketHistoryEntry {
  // demais campos sem mudança
  changedByName: string | null // nulo = sistema (changed_by nulo)
}
```

### `app/_lib/types/ticket-edit.ts` (alterado)

```ts
export interface TicketEditabilityFacts {
  createdBy: number
  currentDepartmentId: number
  status: TicketStatus
  resolvedAt: Date | null // novo
  hasPendingTransfer: boolean
}

export interface TicketEditSnapshot {
  title: string
  description: string
  type: TicketType
  tagId: number | null
  solution: string | null // novo
}

export interface TicketEditSource extends TicketEditSnapshot {
  id: number
  status: TicketStatus // novo
}

export interface TicketEditValues {
  title: string
  description: string
  type: TicketType
  tagId: number
  solution?: string // novo; ausente = solução não enviada
}

export interface TicketEditChanges {
  title: boolean
  description: boolean
  type: TicketTypeChange | null
  tag: TicketTagChange | null
  solution: boolean // novo
}

export interface EditTicketFormDefaults {
  ticketId: number
  title: string
  description: string
  type: TicketType
  tagId?: number
  solution?: string // novo; presente só quando includesSolution
}

export interface TicketEditFormOptions {
  defaults: EditTicketFormDefaults
  tags: TagOption[]
  includesSolution: boolean // novo
}
```

- `TicketEditButtonFacts` (`Omit<TicketEditabilityFacts, "hasPendingTransfer">`
  - `pendingTransfer`) ganha `resolvedAt` por herança.
- `UpdateTicketByAuthorValues` (`TicketEditValues` + `ticketId` + `authorId`)
  ganha `solution?` por herança. Outcomes **não** mudam.
- `TicketDetail` continua satisfazendo, sem conversão, `TicketEditSource`
  (`id`, `status`, `title`, `description`, `type`, `tagId`, `solution`) e
  `TicketEditButtonFacts` (`resolvedAt` já existe nele).

### `app/_lib/types/ticket-resolution.ts` (alterado)

```ts
export interface TicketConclusionResolved {
  state: "resolved"
  solution: string | null
  resolvedAt: Date | null
  editableUntil: Date | null // novo; não nulo só em `resolvido` com a janela aberta
}
```

### `app/_lib/types/ticket-comments.ts` (alterado)

```ts
export interface TicketCommentFacts extends TicketVisibilityFacts {
  status: TicketStatus
  resolvedAt: Date | null // novo
}
```

`TicketDetail` satisfaz sem conversão.

### `app/_lib/types/ticket-closure.ts` (novo)

```ts
export interface CloseExpiredResolvedTicketsOutcome {
  closedCount: number
}
```

## Domínio — `app/_lib/domain/`

**Toda regra que depende do tempo recebe `now: Date` como parâmetro.** Nenhuma
função do domínio chama `new Date()` para saber "agora". Quem chama cria um
`now` por requisição ou transação e passa o mesmo valor a todas as regras
daquela leitura.

### `app/_lib/domain/ticket.ts` (acrescido)

```ts
export const RESOLVED_TICKET_STATUS: TicketStatus // "resolvido" (veio de ticket-resolution.ts)
export const CLOSED_TICKET_STATUS: TicketStatus // "fechado"
```

`RESOLVED_TICKET_STATUS` mudou de arquivo para evitar import circular com
`ticket-closure.ts`. A única fonte é `domain/ticket.ts`: quem precisa da
constante importa de lá. `domain/ticket-resolution.ts` **não** a reexporta.

### `app/_lib/domain/ticket-closure.ts` (novo)

```ts
export const RESOLUTION_EDIT_WINDOW_DAYS // 7
export const DAY_MS // 24 * 60 * 60 * 1000
export const RESOLUTION_EDIT_WINDOW_MS // RESOLUTION_EDIT_WINDOW_DAYS * DAY_MS
export const AUTO_CLOSE_NOTE // "Encerrado automaticamente 7 dias após a resolução."

export const resolutionWindowEndsAt: (resolvedAt: Date) => Date
export const resolutionWindowCutoff: (now: Date) => Date
export const isResolutionWindowOpen: (
  resolvedAt: Date | null,
  now: Date,
) => boolean
export const isTicketLocked: (
  status: TicketStatus,
  resolvedAt: Date | null,
  now: Date,
) => boolean
export const resolutionEditableUntil: (
  status: TicketStatus,
  resolvedAt: Date | null,
  now: Date,
) => Date | null
```

| Nome                      | Semântica                                                                                                                                                         |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `resolutionWindowEndsAt`  | `resolvedAt + RESOLUTION_EDIT_WINDOW_MS`                                                                                                                          |
| `resolutionWindowCutoff`  | `now − RESOLUTION_EDIT_WINDOW_MS`. É o parâmetro do SQL do cron: o `df-data` recebe o instante pronto e **não** repete o 7                                        |
| `isResolutionWindowOpen`  | `resolvedAt` nulo → `false`; senão `now < resolutionWindowEndsAt(resolvedAt)`                                                                                     |
| `isTicketLocked`          | **A** regra de "intocável": `fechado`/`cancelado` (`!isNonFinalTicketStatus`) **ou** `resolvido` com `!isResolutionWindowOpen`. Status abertos → `false`          |
| `resolutionEditableUntil` | `resolvido` com janela aberta → `resolutionWindowEndsAt(resolvedAt)`; qualquer outro caso (inclusive `fechado`, `resolvido` vencido, `resolved_at` nulo) → `null` |
| `AUTO_CLOSE_NOTE`         | Texto da `note` da linha `encerramento` gravada pelo cron. Montado com `RESOLUTION_EDIT_WINDOW_DAYS`, não com literal                                             |

### `app/_lib/domain/ticket-edit.ts` (alterado)

```ts
export const canEditSolution: (status: TicketStatus) => boolean // novo
export const ticketEditBlockFor: (
  editor: TicketEditorFacts,
  ticket: TicketEditabilityFacts,
  now: Date, // novo
) => TicketEditBlockReason | null
export const canEditTicket: (
  editor: TicketEditorFacts,
  ticket: TicketEditabilityFacts,
  now: Date, // novo
) => boolean
export const ticketEditButtonStateFor: (
  editor: TicketEditorFacts,
  ticket: TicketEditButtonFacts,
  now: Date, // novo
) => TicketEditButtonState
export const buildTicketEditFormOptions: (
  ticket: TicketEditSource,
  tags: readonly TagOption[],
) => TicketEditFormOptions // assinatura igual; retorno com includesSolution e defaults.solution
export const diffTicketEdit // assinatura igual; compara solution
export const hasTicketEditChanges // assinatura igual; considera solution
export const describeTicketEditNote // assinatura igual; "solução" no fim
```

| Nome                         | Mudança                                                                                                                                                                                                                                |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `canEditSolution`            | `status === "resolvido"`. Só diz se a solução **pode** entrar na edição; a janela já foi conferida por `ticketEditBlockFor`                                                                                                            |
| `ticketEditBlockFor`         | O passo `TICKET_FINISHED` passa a ser `isTicketLocked(status, resolvedAt, now)`: `fechado`, `cancelado` **e `resolvido` vencido**. Ordem dos motivos inalterada                                                                        |
| `ticketEditButtonStateFor`   | Repassa `resolvedAt` e `now`. `resolvido` vencido → `TICKET_FINISHED` → `{ state: "hidden" }`                                                                                                                                          |
| `buildTicketEditFormOptions` | `includesSolution = canEditSolution(ticket.status)`. Com `true`, `defaults.solution = ticket.solution ?? ""` (legado `resolvido` sem solução → campo vazio, obrigatório ao salvar). Com `false`, `defaults` **sem** a chave `solution` |
| `diffTicketEdit`             | `solution = next.solution !== undefined && current.solution !== next.solution`. Solução não enviada nunca conta como mudança                                                                                                           |
| `describeTicketEditNote`     | Ordem fixa: título, descrição, tipo, tag, **solução**                                                                                                                                                                                  |

**Motivo do resolvido vencido: `TICKET_FINISHED` (reaproveitado).** Para quem
usa o motivo, "vencido" e "fechado" são o mesmo caso: o botão some, o
comentário mostra a mensagem de encerrado, a action recusa. Um motivo novo só
duplicaria todos os ramos que tratam `TICKET_FINISHED`. Nenhum tipo de motivo
(`TicketEditBlockReason`, `TicketCommentBlockReason`) muda.

Nota da linha `edicao` (acrescenta à tabela de `ticket-edit.md`):

| Mudou               | `note`                                                           |
| ------------------- | ---------------------------------------------------------------- |
| só a solução        | `Alterou solução.`                                               |
| descrição e solução | `Alterou descrição e solução.`                                   |
| tudo                | `Alterou título, descrição, tipo (Dúvida → Bug), tag e solução.` |

A solução nova não vai para o histórico (mesma regra de título e descrição: o
texto antigo não é guardado).

### `app/_lib/domain/ticket-comments.ts` (alterado)

```ts
export const ticketCommentBlockFor: (
  commenter: TicketActorFacts,
  ticket: TicketCommentFacts,
  now: Date, // novo
) => TicketCommentBlockReason | null
export const canCommentOnTicket: (commenter, ticket, now: Date) => boolean
export const ticketCommentFormStateFor: (
  commenter,
  ticket,
  now: Date,
) => TicketCommentFormState
```

O passo `TICKET_FINISHED` passa a ser `isTicketLocked(status, resolvedAt, now)`.
`resolvido` dentro da janela continua comentando; vencido → `closed` com
`TICKET_COMMENTS_CLOSED_MESSAGE` (texto inalterado).

### `app/_lib/domain/ticket-resolution.ts` (alterado)

```ts
export const ticketConclusionStateFor: (
  viewer: TicketActorFacts,
  ticket: TicketConclusionFacts,
  now: Date, // novo
) => TicketConclusionState
```

Estado 1 da precedência (`resolvido`, `fechado`) ganha
`editableUntil: resolutionEditableUntil(status, resolvedAt, now)`. Como os
demais campos do estado 1, independe de quem vê: todo mundo que abre o detalhe
vê o mesmo prazo. `ticketResolutionBlockFor`/`canResolveTicket` **não** mudam
(`resolvido` já não resolve, vencido ou não).

### `app/_lib/domain/ticket-history.ts` (acrescido)

```ts
export const SYSTEM_ACTOR_LABEL // "Sistema"
export const describeHistoryActor: (
  entry: Pick<TicketHistoryEntry, "changedByName">,
) => string // changedByName ?? SYSTEM_ACTOR_LABEL
```

A linha do cron aparece como: **Encerramento** · `Sistema` · data/hora ·
`Encerrou o chamado com status Fechado.` (frase existente de `encerramento`) e,
no quadro de nota, `Encerrado automaticamente 7 dias após a resolução.`.

### `app/_lib/domain/my-tickets.ts` (alterado)

```ts
export const DEFAULT_MY_TICKETS_PERIOD: PeriodFilterSelection // { periodo: "hoje" }
```

`MY_TICKETS_PERIOD_PRESETS`, `myTicketsEmptyCopy` e os textos não mudam. Com o
padrão `Hoje`, uma aba vazia mostra `Nenhum chamado neste período` (o texto por
aba só aparece com `Todos`).

## Validação — `app/_lib/validation/`

### `app/_lib/validation/ticket.ts` (alterado)

```ts
export const ticketSolutionSchema // mudou de arquivo (antes em validation/ticket-resolution.ts); regras e mensagens iguais
export const editTicketSchema // createTicketSchema.extend({ ticketId, solution: ticketSolutionSchema.optional() })
export type EditTicketInput = {
  ticketId: number
  title: string
  description: string
  type: TicketType
  tagId: number
  solution?: string
}
```

- `ticketSolutionSchema` mora agora em `validation/ticket.ts` porque
  `validation/ticket-resolution.ts` importa `ticketIdSchema` de lá: deixá-lo no
  outro arquivo criaria import circular. `resolveTicketSchema` continua em
  `validation/ticket-resolution.ts`, com a mesma forma. Ninguém fora da
  validação importava `ticketSolutionSchema`.
- `solution` ausente (ou `undefined`) passa; presente, vale a regra da
  resolução: vazio após `trim` → `Descreva a solução.`; < 10 → `A solução
precisa ter no mínimo 10 caracteres.`; > 5000 → `A solução precisa ter no
máximo 5000 caracteres.`.
- O schema não sabe o status do chamado. Solução enviada para chamado que não
  está `resolvido` é recusada pela transação (`not_editable`), não pelo Zod.

### `app/_lib/validation/period.ts` (alterado)

`serializePeriodParams`: `todos` → `periodo=todos` (antes: string vazia). Os
demais casos não mudam (`hoje` → `periodo=hoje`; personalizado →
`periodo=personalizado&de=…&ate=…`). O Início nunca serializa `todos` (não está
em `PeriodSelection`), então as URLs dele não mudam.

### `app/_lib/validation/my-tickets.ts` (alterado)

```ts
export const myTicketsTabHref: (
  tab: MyTicketsTab,
  period: PeriodFilterSelection, // agora obrigatório (antes tinha padrão)
) => string
```

Os dois chamadores (`page.tsx` e `my-tickets-tabs.tsx`) já passam o período.
`parseMyTicketsPeriod` não muda de código: inválido ou ausente →
`DEFAULT_MY_TICKETS_PERIOD`, agora `Hoje`.

| URL                                 | Período           |
| ----------------------------------- | ----------------- |
| `/tickets`, `/tickets?tab=closed`   | Hoje              |
| `/tickets?tab=opened&periodo=todos` | Todos             |
| `/tickets?periodo=xyz`              | Hoje              |
| pílula Todos                        | `…&periodo=todos` |
| pílula Hoje                         | `…&periodo=hoje`  |

## Configuração

### `vercel.json` (novo)

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "crons": [
    { "path": "/api/cron/close-resolved-tickets", "schedule": "0 6 * * *" }
  ]
}
```

`0 6 * * *` = 06:00 UTC = 03:00 em São Paulo. O Vercel Cron só roda no deploy de
produção e chama a URL por `GET`.

### `.env.example` (acrescido)

`CRON_SECRET`, com instrução de geração (`openssl rand -hex 32`). O usuário
preenche no `.env` local (para o teste) e nas variáveis do projeto na Vercel.

## `df-auth` — `proxy.ts` (alterado)

Hoje o `matcher` só exclui `api/auth`: uma chamada a `/api/cron/...` sem cookie
de sessão é **redirecionada para `/login` (307)** antes de chegar à rota. A
Vercel nunca tem cookie, então o cron nunca rodaria. Excluir `api/cron` do
`matcher`:

```ts
matcher: ["/((?!api/auth|api/cron|_next/static|_next/image|.*\\..*).*)"]
```

A rota se autentica sozinha pelo `CRON_SECRET`. Nada mais muda no proxy.

## `df-data` — o que criar e mudar

### `app/_lib/data/tickets.ts` — `findTicketDetail` (alterado)

Na leitura do histórico, `innerJoin(changer, …)` vira
**`leftJoin(changer, eq(changer.id, ticketHistory.changedBy))`**.
`changedByName` passa a `string | null`.

**Obrigatório e sem aviso do compilador.** Com o `inner join`, o tipo continua
fechando (`string` cabe em `string | null`), mas toda linha com `changed_by`
nulo some da linha do tempo, sem erro. O cenário 22 confere.

### `app/_lib/data/tickets.ts` — `updateTicketByAuthor` (alterado)

Mesma assinatura. Mudanças na sequência de `ticket-edit.md`:

1. **Chamado** — o `select … for update` lê também `resolved_at` e `solution`.
2. **Logo depois da trava**, `const now = new Date()`. É o mesmo instante para a
   regra (passo 5) e para a gravação (antigo passo 9, `changedAt = now`).
3. Autor, visibilidade e transferência pendente: sem mudança.
4. **Regra** — `canEditTicket(editor, { createdBy, currentDepartmentId, status,
resolvedAt, hasPendingTransfer }, now)` falso → `not_editable`.
5. **Solução** (novo) — `values.solution !== undefined &&
!canEditSolution(status)` → `{ status: "not_editable" }`.
6. Tag atual, tag escolhida (`invalid_tag`): sem mudança.
7. **Diferença** — `diffTicketEdit({ title, description, type, tagId: tagAtual,
solution }, values)`; `!hasTicketEditChanges` → `no_changes`.
8. `update ticket set title, description, type, updated_at = now` e, **só se
   `changes.solution`**, `solution = values.solution`. `resolved_at`, `status`,
   `closed_at` nunca são escritos aqui.
9. `ticket_tag`, `edicao` (nota de `describeTicketEditNote`, agora com
   "solução") e `mudanca_tag`: sem mudança.

- **Precedência**: `not_found` → `not_editable` (regra, depois solução) →
  `invalid_tag` → `no_changes`.
- Janela vencida entre o carregamento da página e o salvar → `not_editable`,
  nada gravado.
- Edição concorrente com o cron: a edição trava o chamado `for update`; o cron
  pula linhas travadas (`skip locked`) e fecha o chamado na execução seguinte.

### `app/_lib/data/ticket-messages.ts` — `insertTicketMessage` (alterado)

1. O `select … for share` do chamado lê também `resolved_at`.
2. Depois da trava, `const now = new Date()`.
3. `canCommentOnTicket(commenter, { createdBy, assignedTo, currentDepartmentId,
status, resolvedAt }, now)` falso → `not_commentable`.

Assinatura e outcomes iguais.

### `app/_lib/data/tickets.ts` — `closeExpiredResolvedTickets` (novo)

```ts
export async function closeExpiredResolvedTickets(
  cutoff: Date,
  now: Date,
): Promise<CloseExpiredResolvedTicketsOutcome>
```

Uma transação (`db.transaction`):

1. **Candidatos** — `select id from ticket where status =
RESOLVED_TICKET_STATUS and (resolved_at is null or resolved_at <= $cutoff)
order by id for update skip locked`.
2. Nenhuma linha → `{ closedCount: 0 }`.
3. `update ticket set status = CLOSED_TICKET_STATUS, closed_at = $now,
updated_at = $now where id in (…ids)`.
4. **Um** `insert` com uma linha por chamado em `ticket_history`:
   `ticketId`, `changedBy: null`, `event: "encerramento"`,
   `fromStatus: RESOLVED_TICKET_STATUS`, `toStatus: CLOSED_TICKET_STATUS`,
   `note: AUTO_CLOSE_NOTE`, `changedAt: now`. Demais colunas nulas.
5. `{ closedCount: ids.length }`.

- **`cutoff` e `now` vêm prontos** de quem chama (`resolutionWindowCutoff(now)`
  e o mesmo `now`). A função não calcula prazo nem chama `new Date()`.
- `status` e o caso `resolved_at is null` são a tradução de `isTicketLocked`
  para `resolvido`; a duração da janela não aparece no SQL. Constantes de
  status vêm de `domain/ticket.ts` e a nota de `domain/ticket-closure.ts`,
  nunca literais.
- `skip locked`: duas execuções simultâneas não fecham o mesmo chamado duas
  vezes, e uma edição ou comentário em curso não é esperado nem perdido.
- `solution`, `resolved_at`, `assigned_to`, setores e prioridade não mudam.
- Exceção (migration `0010` não aplicada) sobe para a rota; nada é gravado.

### `db/seed.ts` — bloco `seedQa` (acrescido)

Dois chamados para testar a janela, descritos em
`docs/contracts/qa-seed.md`, seção "Chamados da janela de edição". Usar
`isResolutionWindowOpen` do domínio na checagem de idempotência. Os
deslocamentos são "janela ± 1 dia": `RESOLUTION_EDIT_WINDOW_MS + DAY_MS`
(vencida) e `RESOLUTION_EDIT_WINDOW_MS - DAY_MS` (aberta), com as duas
constantes importadas de `domain/ticket-closure.ts`; nenhuma duração escrita
no seed.

## `df-actions` — o que mudar e criar

### `app/_lib/actions/tickets.ts` — `editTicket` (alterado)

Assinatura, códigos e mensagens **iguais** (`ticket-edit.md`). O
`editTicketSchema` já aceita `solution` e o `...parsed.data` a repassa a
`updateTicketByAuthor`. Conferir só que nada descarta a chave. Revalidação
igual (o detalhe e Meus chamados; o Início só se a tag mudou). Solução forjada
em chamado não resolvido → `not_editable` → `FORBIDDEN` `Você não pode editar
este chamado.`.

### `app/api/cron/close-resolved-tickets/route.ts` (novo)

```ts
export const GET: (request: Request) => Promise<Response>
```

Exceção da seção 3 do `stack.md` (ADR 014). Sequência:

1. **Autenticação, antes de qualquer outra coisa.** `const secret =
process.env.CRON_SECRET`. Segredo ausente ou vazio, cabeçalho
   `authorization` ausente ou diferente de `` `Bearer ${secret}` `` → `401`
   com `{ ok: false, error: "unauthorized" }`. **Nenhuma** chamada a
   `app/_lib/data/`. Comparação em tempo constante (`timingSafeEqual` de
   `node:crypto` sobre buffers do mesmo tamanho; tamanhos diferentes já são
   recusa). Segredo ausente: além do 401, `console.error` dizendo que
   `CRON_SECRET` não está definido.
2. `const now = new Date()`.
3. `try`: `closeExpiredResolvedTickets(resolutionWindowCutoff(now), now)`.
   `catch` → `console.error("[cron:close-resolved-tickets]", error)` e `500`
   com `{ ok: false, error: "internal" }`.
4. Se `closedCount > 0`: `revalidatePath(MY_TICKETS_PATH)` (status e abas) e
   `revalidatePath("/(app)/tickets/[id]", "page")` (todos os detalhes: a rota
   não recebe os ids, e o detalhe mostra badge, "Editar", comentário e linha do
   tempo). **Não** revalidar `/dashboard`: o Início conta por data de abertura
   e tag, não por status (conferido em `app/_lib/data/dashboard.ts`). Em Route
   Handler, `revalidatePath` marca o caminho para a próxima visita.
   - **O padrão dinâmico leva o grupo de rota.** O Next revalida pelo caminho
     do arquivo, e esse caminho inclui `(app)`: em
     `.next/server/app-paths-manifest.json` a página é
     `"/(app)/tickets/[id]/page"`. `revalidatePath("/tickets/[id]", "page")`
     não casa com nada e não invalida nenhum detalhe, sem erro. É o mesmo
     formato que `actions/profile.ts`, `people.ts` e `departments.ts` já usam
     (`"/(app)"`, `"layout"`). Caminho concreto (`ticketDetailPath(id)`,
     `MY_TICKETS_PATH`) continua sem o grupo, porque é URL, não padrão.
5. `200` com `{ ok: true, closedCount }`.

Respostas:

| Situação                         | Status | Corpo                                      |
| -------------------------------- | ------ | ------------------------------------------ |
| sem/errado/segredo não definido  | 401    | `{ "ok": false, "error": "unauthorized" }` |
| sucesso (com ou sem fechamentos) | 200    | `{ "ok": true, "closedCount": 3 }`         |
| exceção                          | 500    | `{ "ok": false, "error": "internal" }`     |

- Só `GET` (é o que o Vercel Cron chama). Outros métodos ficam com o 405
  padrão do Next.
- `GET` de Route Handler é dinâmico por padrão no Next 16 (e a rota lê
  cabeçalho); conferir em
  `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md`.
- Tipos das respostas: interfaces locais no próprio `route.ts` (`interface`
  por formato, união com `type`), sem objeto literal inline em união.
- Nenhum SQL, nenhuma regra inline: o prazo vem de `resolutionWindowCutoff`.

## `df-ui` — o que mudar

### Estrutura

```
app/(app)/tickets/[id]/page.tsx                                   alterado — now, estados com now, TicketEditProvider no editable
app/(app)/tickets/[id]/_hooks/use-ticket-edit.ts                   novo — contexto do modo de edição
app/(app)/tickets/[id]/_components/ticket-edit-provider.tsx        novo — "use client", React Hook Form e isEditing
app/(app)/tickets/[id]/_components/ticket-edit-heading.tsx         novo — ilha cliente: h1 ou campo Título; Editar/Cancelar/Salvar
app/(app)/tickets/[id]/_components/ticket-edit-description.tsx     novo — ilha cliente: texto ou campo Descrição
app/(app)/tickets/[id]/_components/ticket-edit-classification.tsx  novo — ilha cliente: Tipo e Tag em Detalhes
app/(app)/tickets/[id]/_components/ticket-edit-solution.tsx        novo — ilha cliente: campo Solução no resolved
app/(app)/tickets/[id]/_components/hidden-while-editing.tsx        novo — ilha cliente: esconde filhos durante a edição
app/(app)/tickets/[id]/_components/ticket-solution-field.tsx       novo — campo Solução compartilhado (Resolver e edição)
app/(app)/tickets/[id]/_components/ticket-detail-field-list.tsx    novo — `<dl>` de rótulo e valor do card Detalhes
app/(app)/tickets/[id]/_components/edit-ticket-dialog.tsx          removido
app/(app)/tickets/[id]/_components/edit-ticket-blocked-button.tsx  continua (transferência pendente)
app/(app)/tickets/[id]/_components/edit-ticket-button.tsx          continua (gatilho "Editar")
app/(app)/tickets/[id]/_components/ticket-conclusion.tsx           alterado — "Editável até"; campo Solução em edição
app/(app)/tickets/[id]/_components/ticket-timeline.tsx             alterado — describeHistoryActor
app/(app)/_components/ticket-description-field.tsx                 alterado — prop hideLabel?
app/(app)/_components/ticket-*-field.tsx                           continuam (também usados pelo Novo chamado)
```

Nomes internos e a divisão entre arquivos são do `df-ui`; o comportamento
abaixo é o contrato. A seção "Desenho entregue" registra o que foi
implementado.

### `/tickets/[id]` — `page.tsx`

```tsx
const now = new Date()
const editButton = ticketEditButtonStateFor(actor, ticket, now)
const conclusion = ticketConclusionStateFor(actor, ticket, now)
const commentForm = ticketCommentFormStateFor(actor, ticket, now)
```

- **Um `now` por requisição**, passado às três regras. Nunca um `new Date()`
  por chamada: as três precisam concordar sobre a janela.
- `new Date()` em Server Component: a página já é dinâmica (lê sessão). O
  `df-ui` confere em `node_modules/next/dist/docs/` se o Next 16 exige algo
  (ex.: `connection()`) para ler o relógio fora de cache; com
  `cacheComponents` desligado (`next.config.ts` vazio), não deve exigir.
- Tags e `buildTicketEditFormOptions` só no estado `editable`, como hoje.
- `blocked` continua com `EditTicketBlockedButton`; `hidden`, nada.

### Modo de edição (estado `editable`)

Sugestão de desenho: um wrapper `"use client"` que guarda `isEditing` e o
`useForm<EditTicketInput>` (`zodResolver(editTicketSchema)`,
`defaultValues: options.defaults`) e renderiza cabeçalho, Descrição, Detalhes e
Conclusão; Linha do tempo, Comentários e o aviso de transferência entram como
`ReactNode` vindos do Server Component, sem mudança.

**Sem `<form>` em volta dos cards.** Conclusão (`ResolveTicketForm`) e
Comentários (`TicketCommentForm`) já são `<form>`; envolver tudo num `<form>`
cria formulário aninhado (HTML inválido, erro de hidratação). Use um `<form
id>` próprio sem filhos com o botão "Salvar alterações" apontando para ele
(atributo `form`), ou `form.handleSubmit(onSubmit)` no clique. Os campos ficam
ligados pelo React Hook Form (`Controller`), não pela associação nativa.

| Área           | Visualização (como hoje)          | Edição                                                                                                                          |
| -------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Cabeçalho      | `h1` com o título; botão "Editar" | campo Título (`TicketTitleField`) no lugar do `h1`; "Editar" sai e entram "Cancelar" (outline) e "Salvar alterações" (primário) |
| Descrição      | texto (`whitespace-pre-wrap`)     | campo Descrição (`TicketDescriptionField`) dentro do mesmo card                                                                 |
| Detalhes       | Tipo e Tag como texto             | linha Tipo vira `TicketTypeField` (Select); linha Tag vira `TicketTagField` (Combobox). Demais linhas iguais                    |
| Conclusão      | estado do domínio                 | ver abaixo                                                                                                                      |
| Linha do tempo | igual                             | igual                                                                                                                           |
| Comentários    | igual                             | igual (o formulário continua utilizável)                                                                                        |

- **Entrar** ("Editar"): `form.reset(options.defaults)`, `isEditing = true`,
  foco no campo Título.
- **Cancelar**: `form.reset(options.defaults)` (limpa erros e restaura os
  valores), `isEditing = false`. Sem request, sem confirmação, sem aviso de
  rascunho perdido.
- **Salvar alterações**: `Salvando…` com `Loader2Icon` enquanto
  `isSubmitting`; "Cancelar" e "Salvar" desabilitados durante o envio. O botão
  fica habilitado mesmo sem mudança (quem decide "nada mudou" é o servidor).
- Campos com o padrão já usado (`Field`, `FieldLabel`, `FieldError`,
  `aria-invalid`, `aria-describedby`). Todo campo tem nome acessível
  (`Título`, `Descrição`, `Tipo`, `Tag`, `Solução`), mesmo que o rótulo visível
  do título seja discreto no cabeçalho.
- Tag sem seleção (`options.defaults.tagId` ausente) → descrição do campo
  `A tag atual não está disponível. Escolha uma tag ativa do seu setor.` (texto
  do dialog antigo, mantido).
- Mobile: os botões ficam no cabeçalho, como o "Editar" hoje (abaixo do título).
  Sem barra fixa.

**Conclusão durante a edição:**

| Situação                                         | Card Conclusão em edição                                                                                                                                                                                                                                     |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `options.includesSolution` (chamado `resolvido`) | campo `Solução` (`Textarea`, `Controller` de `solution`, mesmas regras e mensagens) no lugar do campo travado; abaixo, `Resolvido em …` e `Editável até …` como na visualização. Legado sem solução: campo vazio, obrigatório ao salvar                      |
| estado `resolvable` (chamado não resolvido)      | o formulário "Resolver" e os botões "Anexar" e "Enviar para outro setor" **somem**; o card mostra `NO_SOLUTION_LABEL` como no estado `empty`. Recomendado manter o `ResolveTicketForm` montado e escondido (`hidden`), para não perder o rascunho da solução |
| qualquer outro estado                            | igual à visualização                                                                                                                                                                                                                                         |

**Resultado do `editTicket(values)`:**

| Resultado                  | UI                                                                                                                                           |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `ok`                       | `toast.success(result.message)`; sai do modo de edição. Sem `router.refresh()` (o `revalidatePath` da action atualiza a página)              |
| `NO_CHANGES`               | `toast.info(result.message)`; sai do modo de edição                                                                                          |
| `INVALID_TAG`              | `setError("tagId", { message }, { shouldFocus: true })` e `router.refresh()`; continua editando                                              |
| `INVALID_INPUT`            | `toast.error(result.message)`; continua editando                                                                                             |
| `FORBIDDEN` ou `NOT_FOUND` | `toast.error(result.message)`; sai do modo de edição e `router.refresh()` (o botão some ou vira 404; inclui janela vencida durante a edição) |
| sem `code`                 | `toast.error(result.message)`; continua editando, valores mantidos                                                                           |

- Client Components importam só `app/_lib/domain`, `app/_lib/validation`,
  `app/_lib/types`, `@/app/_lib/date` e a action.
- `EditTicketDialog` e o que só ele usava saem. `EditTicketBlockedButton` e
  `EditTicketButton` ficam.

### Desenho entregue

Registro do que o `df-ui` implementou; nenhuma decisão acima muda.

- **`TicketEditProvider`** (`_components/ticket-edit-provider.tsx`,
  `"use client"`) guarda o `useForm<EditTicketInput>` e o `isEditing`, trata o
  resultado do `editTicket` conforme a tabela acima e expõe o estado por
  contexto. O `page.tsx` só o monta no estado `editable`; nos demais, a página
  renderiza sem provider.
- **Hook da rota**: `app/(app)/tickets/[id]/_hooks/use-ticket-edit.ts`
  (`useTicketEdit`, lança erro fora do provider).
- **Cards continuam Server Components**, com ilhas cliente que leem o contexto:
  `ticket-edit-heading` (título/campo Título e os botões),
  `ticket-edit-description`, `ticket-edit-classification` (Tipo e Tag em
  Detalhes), `ticket-edit-solution` (Solução no `resolved`) e
  `hidden-while-editing` (esconde os filhos e mostra um substituto durante a
  edição).
- **"Salvar alterações"** é `type="button"` e chama `form.handleSubmit(onSubmit)`
  no clique. Não há `<form>` envolvendo os cards.
- **`ResolveTicketForm` fica montado e oculto** durante a edição (dentro de
  `HiddenWhileEditing`, com `NO_SOLUTION_LABEL` como substituto), preservando o
  rascunho da solução.
- **Campo Solução compartilhado** em `_components/ticket-solution-field.tsx`,
  usado pelo `ResolveTicketForm` e pelo `ticket-edit-solution`.
- **`TicketDescriptionField`** (`app/(app)/_components/`) ganhou
  `hideLabel?: boolean`, padrão `false`: o rótulo fica `sr-only` e o nome
  acessível `Descrição` permanece. O "Novo chamado" não muda.

### `TicketConclusion` — estado `resolved` (alterado)

Abaixo de `Resolvido em {formatDateTime(resolvedAt)}`, **só se
`state.editableUntil !== null`**: `Editável até {formatDateTime(editableUntil)}`
num `<time dateTime={toISO(editableUntil)}>`. Em `fechado`, em `resolvido`
vencido e em legado sem `resolved_at`, a linha não aparece.

### Linha do tempo — `ticket-timeline.tsx` (alterado)

Trocar `entry.changedByName` por `describeHistoryActor(entry)`. Nada mais.

### Meus chamados

Nenhum código obrigatório: o padrão `Hoje` e o `periodo=todos` vêm do domínio
e da validação. Conferir que nenhuma tela assume "sem `periodo` = Todos" (ex.:
estado ativo da pílula).

## Textos

| Onde                            | Texto                                                                    |
| ------------------------------- | ------------------------------------------------------------------------ |
| Conclusão, `resolved`           | `Editável até dd/mm/aaaa hh:mm`                                          |
| Linha do tempo, ator nulo       | `Sistema` (`SYSTEM_ACTOR_LABEL`)                                         |
| Nota do encerramento            | `Encerrado automaticamente 7 dias após a resolução.` (`AUTO_CLOSE_NOTE`) |
| Frase do encerramento           | `Encerrou o chamado com status Fechado.` (existente)                     |
| Nota da edição com solução      | `Alterou … e solução.` (`describeTicketEditNote`)                        |
| Botões do modo de edição        | `Cancelar`, `Salvar alterações`, `Salvando…`                             |
| Comentário em resolvido vencido | `Este chamado foi encerrado e não recebe novos comentários.` (existente) |

## Riscos

1. **`inner join` no histórico.** Se ficar, a linha do sistema some sem erro de
   tipo nem de execução. Cenário 22.
2. **`proxy.ts` sem a exclusão de `api/cron`.** O cron recebe 307 para `/login`
   e nunca fecha nada; localmente, `curl` sem segredo recebe 307, não 401.
   Cenário 15.
3. **Lote no primeiro cron.** Todo `resolvido` com mais de 7 dias (ou sem
   `resolved_at`) fecha na primeira execução, inclusive o seed demo da
   Diretoria (#10): as contagens de Fechados do Diretor e o cenário 16 de
   `ticket-resolution.md` mudam. Esperado.
4. **Badge `Resolvido` por até ~25 h** depois de vencer (cron diário no Hobby,
   com folga de horário), já travado.
5. **`resolved_at` nulo em `resolvido`** é tratado como vencido: some o
   "Editar" e o comentário; o cron fecha.
6. **Solução legada vazia obrigatória**: autor de chamado `resolvido` sem
   solução precisa escrever uma para salvar qualquer outra mudança.
7. **Rascunho perdido**: "Cancelar", navegar ou recarregar descartam a edição
   sem aviso. Decidido.
8. **`Hoje` como padrão**: ao voltar do detalhe ("Meus chamados" no topo), um
   chamado aberto ontem não aparece até escolher outro período.
9. **Relógio do servidor**: a janela usa o relógio de quem calcula (servidor
   da página, da transação, do cron). Diferença de segundos entre eles só
   importa no instante exato do vencimento.
10. **Edição em curso no vencimento**: quem abriu a edição antes do prazo e
    salvou depois recebe `Você não pode editar este chamado.` e perde o que
    digitou.

## Critério de pronto

1. Cenários 1–30 aprovados pelo `df-qa`.
2. Edição grava só `ticket` (inclusive `solution` em `resolvido` na janela),
   `ticket_tag` e `ticket_history`; nunca `status`, `resolved_at`,
   `closed_at`.
3. O cron grava só `ticket` (`status`, `closed_at`, `updated_at`) e uma linha
   `encerramento` por chamado, com `changed_by` nulo.
4. `npx tsc --noEmit`, `npm run lint` e `npm run build` passam; `df-reviewer`
   sem bloqueante.

## Cenários para o `df-qa`

Usuários, setores e chamados de `docs/contracts/qa-seed.md` (seed rodado com
`SEED_QA=true` depois da migration `0010`). `#V` = `[QA] Janela vencida` e
`#J` = `[QA] Janela aberta`, de QA Membro Suporte, o de maior `id` de cada
título que ainda esteja `resolvido`. `CRON_SECRET` preenchido no `.env` local
pelo usuário. Títulos criados começam com `[QA]`. "Request de action" = `POST`
com cabeçalho `Next-Action`. Anotar `max(id)` de `ticket_history` e de
`message` antes de cada cenário que diz "nada gravado".

**Preparação**: QA Admin Suporte com `[QA] Acesso` e `[QA] Edição B` ativas em
QA Suporte (criar ou reativar). QA Membro Suporte cria pelo "Novo chamado"
`[QA] Edição na tela` (tipo Dúvida, tag `[QA] Acesso`) → `#T` (`aberto`).

### Edição na própria tela

| #   | Quem              | Ação                                                                                                                 | Esperado                                                                                                                                                                                                                                                               |
| --- | ----------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | QA Membro Suporte | abrir `/tickets/T`; "Editar"                                                                                         | **nenhum dialog** (`role="dialog"` ausente); título vira campo no cabeçalho com o valor atual; Descrição vira textarea; em Detalhes, Tipo (Dúvida) e Tag (`[QA] Acesso`) viram campos; "Editar" some e aparecem "Cancelar" e "Salvar alterações"; foco no campo Título |
| 2   | QA Membro Suporte | ainda em edição, olhar o card Conclusão e o card Comentários                                                         | Conclusão **sem** o formulário "Resolver" e sem "Anexar"/"Enviar para outro setor" (mostra `Nenhuma solução registrada.`); Comentários igual a antes                                                                                                                   |
| 3   | QA Membro Suporte | alterar título e descrição → "Cancelar"                                                                              | volta à visualização com título e descrição originais; "Resolver" e botões bloqueados de volta; nenhum request de action; `max(id)` de `ticket_history` inalterado. "Editar" de novo → campos com os valores originais                                                 |
| 4   | QA Membro Suporte | "Editar"; título `[QA] Edição na tela alterada`, nova descrição, tipo Bug, tag `[QA] Edição B` → "Salvar alterações" | toast `Chamado #T atualizado.`; volta à visualização com os valores novos; linha do tempo ganha "Edição" com nota `Alterou título, descrição, tipo (Dúvida → Bug) e tag.` e, abaixo, "Mudança de tag" `Trocou a tag de [QA] Acesso para [QA] Edição B.`                |
| 5   | QA Membro Suporte | "Editar" → "Salvar alterações" sem mudar nada                                                                        | toast `Nenhuma alteração para salvar.`; sai da edição; nada gravado                                                                                                                                                                                                    |
| 6   | QA Membro Suporte | "Editar"; título `ab` → "Salvar alterações"                                                                          | erro no campo Título (`O título precisa ter no mínimo 3 caracteres.`); continua em edição; nenhum request de action                                                                                                                                                    |
| 7   | QA Membro Suporte | do modo de edição do #T, forjar `solution: "[QA] Solução forjada no aberto."` no payload                             | toast `Você não pode editar este chamado.`; sai da edição; nada gravado (`ticket.solution` do #T nulo, `max(id)` de `ticket_history` inalterado)                                                                                                                       |

### Janela aberta (`#J`)

| #   | Quem              | Ação                                                                     | Esperado                                                                                                                                                                                                                                      |
| --- | ----------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 8   | QA Membro Suporte | abrir `/tickets/J`                                                       | badge `Resolvido`; botão "Editar"; card Conclusão com a solução travada, `Resolvido em …` e `Editável até …` = `resolved_at` + 7 dias (conferir no banco, em `America/Sao_Paulo`); formulário de comentário presente                          |
| 9   | QA Membro Suporte | "Editar"                                                                 | além dos campos do cenário 1, campo `Solução` no card Conclusão com a solução atual; `Resolvido em` e `Editável até` continuam visíveis                                                                                                       |
| 10  | QA Membro Suporte | solução vazia → salvar; depois `curta` → salvar                          | `Descreva a solução.`; depois `A solução precisa ter no mínimo 10 caracteres.`; nenhum request de action                                                                                                                                      |
| 11  | QA Membro Suporte | mudar descrição e solução (`[QA] Solução corrigida na janela.`) → salvar | toast de sucesso; card mostra a solução nova travada; linha do tempo ganha "Edição" com `Alterou descrição e solução.`                                                                                                                        |
| 12  | banco, só leitura | depois do 11                                                             | `ticket` #J: `solution` nova (com `trim`), `status = resolvido`, `resolved_at` **inalterado**, `closed_at` nulo, `updated_at` = `changed_at` da linha nova; `ticket_history`: uma linha `edicao`, `changed_by` = membro, nota igual à da tela |
| 13  | QA Admin Suporte  | abrir `/tickets/J`                                                       | sem "Editar" (não é autor); `Editável até …` visível; pode comentar                                                                                                                                                                           |

### Janela vencida (`#V`) e cron

| #   | Quem                | Ação                                                                                                            | Esperado                                                                                                                                                                                                                                                                                                                                                                                                                      |
| --- | ------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 14  | QA Membro Suporte   | **antes de qualquer chamada ao cron**: abrir `/tickets/V`                                                       | badge `Resolvido` (o banco ainda diz `resolvido`); **sem** "Editar" (nem esmaecido); card Conclusão com a solução travada e `Resolvido em …`, **sem** `Editável até`; Comentários sem formulário, com `Este chamado foi encerrado e não recebe novos comentários.`                                                                                                                                                            |
| 15  | qualquer (terminal) | `curl -i http://localhost:3000/api/cron/close-resolved-tickets`; depois com `-H "Authorization: Bearer errado"` | os dois: `401` com `{"ok":false,"error":"unauthorized"}` (não `307` para `/login`); `#V` continua `resolvido` no banco; `max(id)` de `ticket_history` inalterado                                                                                                                                                                                                                                                              |
| 16  | QA Membro Suporte   | do formulário de comentário do `#J`, forjar `ticketId` = V; do modo de edição do `#J`, forjar `ticketId` = V    | `Você não pode comentar neste chamado.`; `Você não pode editar este chamado.`; nada gravado                                                                                                                                                                                                                                                                                                                                   |
| 17  | qualquer (terminal) | `curl -i -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/close-resolved-tickets`         | `200` com `{"ok":true,"closedCount":N}`, `N >= 1` (inclui `#V` e todo `resolvido` vencido do banco, como o #10 do seed demo)                                                                                                                                                                                                                                                                                                  |
| 18  | banco, só leitura   | depois do 17                                                                                                    | `#V`: `status = fechado`, `closed_at = updated_at`, `resolved_at` e `solution` inalterados. Uma linha nova por chamado fechado: `event = encerramento`, `changed_by` **nulo**, `from_status = resolvido`, `to_status = fechado`, `note = Encerrado automaticamente 7 dias após a resolução.`, `changed_at = closed_at`. `#J` continua `resolvido`. Nenhum `resolvido` com `resolved_at <= now() - interval '7 days'` restante |
| 19  | qualquer (terminal) | repetir o 17                                                                                                    | `200` com `closedCount` `0`; nenhuma linha nova                                                                                                                                                                                                                                                                                                                                                                               |
| 20  | QA Membro Suporte   | abrir `/tickets/V`                                                                                              | badge `Fechado`; sem "Editar"; comentários encerrados; último item da linha do tempo: **Encerramento** · `Sistema` · data/hora · `Encerrou o chamado com status Fechado.` com a nota `Encerrado automaticamente 7 dias após a resolução.`                                                                                                                                                                                     |
| 21  | QA Membro Suporte   | `/tickets?tab=closed&periodo=todos`                                                                             | `#V` listado com status `Fechado`; aba Abertos por mim (Todos) sem o `#V`; contagens batem com o banco                                                                                                                                                                                                                                                                                                                        |
| 22  | banco + navegador   | `select count(*) from ticket_history where ticket_id = V`; contar os itens da linha do tempo do `#V`            | os dois números iguais (a linha do sistema aparece: prova do `left join`)                                                                                                                                                                                                                                                                                                                                                     |

### Meus chamados — "Hoje" padrão

| #   | Quem              | Ação                                                                                                                | Esperado                                                                                                                                                                          |
| --- | ----------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 23  | Diretor           | clicar "Meus chamados" na sidebar                                                                                   | URL `/tickets`; pílula **Hoje** ativa (`aria-current="page"`); subtítulo com a data de hoje; lista e contagens = consulta do cenário 3 de `my-tickets.md` com o intervalo de hoje |
| 24  | Diretor           | clicar a pílula Todos                                                                                               | URL `/tickets?tab=opened&periodo=todos`; Todos ativo; sem subtítulo; lista completa. Recarregar a página mantém Todos                                                             |
| 25  | Diretor           | com Todos, trocar para a aba Fechados                                                                               | URL `…tab=closed&periodo=todos`; Todos continua ativo                                                                                                                             |
| 26  | qualquer          | `/tickets?periodo=xyz`, `/tickets?periodo=personalizado`, `/tickets?tab=closed&periodo=xyz`                         | os três abrem em Hoje sem erro (o terceiro na aba Fechados)                                                                                                                       |
| 27  | QA Membro Suporte | abrir um chamado criado ontem ou antes (ex.: `#J`) a partir de Todos; voltar por "Meus chamados" no topo do detalhe | a lista abre em Hoje (o chamado não aparece se não foi aberto hoje). Esperado (risco 8)                                                                                           |
| 28  | Diretor           | Início                                                                                                              | sem pílula Todos; abre em Hoje; Hoje/Semana/Mês/Personalizado com as mesmas URLs de antes (`/dashboard?periodo=hoje` etc.); `/dashboard?periodo=todos` mostra Hoje                |

### Geral

| #   | Quem              | Ação                                                        | Esperado                                                                                                  |
| --- | ----------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 29  | banco, só leitura | `information_schema.columns` de `ticket_history.changed_by` | `is_nullable = YES`; a FK para `users` existe                                                             |
| 30  | qualquer          | navegar pelos cenários, entrando e saindo do modo de edição | nenhum erro nem aviso de hidratação no dev server (MCP `next-devtools`), em especial de `<form>` aninhado |

Os cenários 14–16 precisam rodar **antes** do 17: depois dele o `#V` já está
`fechado`. Para repetir a bateria, rodar o seed de novo (cria um novo `#V` e,
se o anterior venceu, um novo `#J`). Se `CRON_SECRET` estiver vazio no `.env`,
os cenários 17–22 ficam como não executados e o 15 continua valendo.

## Checklist de encerramento da feature

Etapa 1 — janela de 7 dias:

- [x] `changed_by` anulável e migration `0010_history_system_actor`; `domain/ticket-closure.ts`; `now` em `ticketEditBlockFor`, `canEditTicket`, `ticketEditButtonStateFor`, `ticketCommentBlockFor`, `canCommentOnTicket`, `ticketCommentFormStateFor`, `ticketConclusionStateFor`; `editableUntil`; `SYSTEM_ACTOR_LABEL`/`describeHistoryActor`; `vercel.json`; `CRON_SECRET` no `.env.example`; ADR 014 (`df-architect`)
- [ ] `matcher` do `proxy.ts` sem `api/cron` (`df-auth`)
- [ ] `leftJoin` no histórico; `updateTicketByAuthor` e `insertTicketMessage` com `resolved_at` e `now`; `closeExpiredResolvedTickets`; seed QA com `#V` e `#J` (`df-data`)
- [ ] `app/api/cron/close-resolved-tickets/route.ts` (`df-actions`)
- [ ] `page.tsx` com um `now`; `Editável até`; `Sistema` na linha do tempo (`df-ui`)

Etapa 2 — edição na própria tela e "Hoje":

- [x] `solution` em `editTicketSchema`, `canEditSolution`, `diffTicketEdit`/`describeTicketEditNote` com solução, `includesSolution`; `DEFAULT_MY_TICKETS_PERIOD = hoje`; `periodo=todos` explícito; `myTicketsTabHref` com período obrigatório (`df-architect`)
- [ ] `updateTicketByAuthor` grava `solution` (`df-data`)
- [ ] `editTicket` repassa `solution` (`df-actions`)
- [ ] modo de edição na página; `EditTicketDialog` removido (`df-ui`)
- [ ] `npm run db:migrate` aplicado pelo usuário; `CRON_SECRET` no `.env` e na Vercel
- [ ] cenários do `df-qa`
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm run build`
