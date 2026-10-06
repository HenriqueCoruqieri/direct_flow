# Contrato — Destinatário do chamado (atribuição)

Entrada das ondas 1 e 2 da Entrega B do plano
`docs/plans/pending-improvements.md` (decisões do usuário na seção "Entrega B",
não repetidas aqui). Este documento é a referência técnica: assinaturas,
sequências, textos e cenários. Ele **altera** contratos anteriores, que
continuam valendo no que não é tocado aqui:

- `docs/contracts/ticket-creation.md` — "Novo chamado" ganha Criador e
  Destinatário; `insertTicket` grava `assigned_to`
- `docs/contracts/ticket-edit.md` e `docs/contracts/ticket-edit-window.md` —
  a edição em tela troca o destinatário
- `docs/contracts/my-tickets.md` — rótulos do detalhe e frases de `criacao` e
  `atribuicao` na linha do tempo

Padrões de outcome, de resultado de action e de formulário vêm de
`ticket-creation.md` e `ticket-edit.md`; a regra de quem resolve, de
`ticket-resolution.md`.

Versões observadas: `next@16.3.5`, `drizzle-orm@0.45.2`, `zod@4.6.5`,
`react-hook-form@7.88`.

## Escopo técnico em uma frase

Todo chamado novo nasce com destinatário (`ticket.assigned_to`), escolhido entre
as pessoas ativas do setor do autor e, por padrão, o próprio autor; a linha
`criacao` grava `to_assignee_id`. O autor troca o destinatário no "Editar" em
tela, nas condições de edição de hoje; a troca grava `edicao` (com
"destinatário" na nota) e `atribuicao` (de/para). Sem e-mail, sem schema, sem
migration.

## Decisões do arquiteto (não fixadas no plano)

| Tema                                   | Decisão                                                                                                                                                                                                                                                                                                                                                                          |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mustChangePassword` no destinatário   | **Não** impede. Destinatário válido = ativo **e** do setor do chamado. Troca de senha pendente é estado de login, não de cadastro: bloquear deixaria toda pessoa recém-cadastrada (e toda pessoa cuja senha o admin redefiniu) fora da lista até o próximo acesso, e o chamado já atribuído a ela perderia a pré-seleção no "Editar". Ela vê o chamado assim que definir a senha |
| Frase de `criacao`                     | Muda **só** quando o destinatário é outra pessoa: acrescenta ` e o atribuiu a {nome}` no fim. Destinatário = autor (o padrão) ou chamado antigo sem destinatário → frase de hoje. A comparação é por id (`toAssigneeId` × `changedById`), nunca por nome: duas pessoas podem ter o mesmo nome                                                                                    |
| Linha `atribuicao` na criação          | **Não** existe. A `criacao` já carrega `to_assignee_id`: uma linha só por ato                                                                                                                                                                                                                                                                                                    |
| Frases de `atribuicao`                 | Passam a dizer "destinatário" (era "responsável"), para casar com o rótulo novo do detalhe. `Atribuiu o chamado a X.` não muda                                                                                                                                                                                                                                                   |
| Ordem da nota de `edicao`              | título, descrição, tipo, tag, **destinatário**, solução — a ordem em que os campos aparecem na tela (cabeçalho, Descrição, Detalhes com Tipo, Tag e Destinatário, Conclusão)                                                                                                                                                                                                     |
| Ordem das linhas na edição             | `edicao` → `mudanca_tag` (se a tag mudou) → `atribuicao` (se o destinatário mudou), mesmo `changed_at`, `id` crescente. Segue a ordem da nota                                                                                                                                                                                                                                    |
| Precedência de outcomes                | `invalid_tag` antes de `invalid_assignee` (ordem dos campos no formulário), nos dois fluxos                                                                                                                                                                                                                                                                                      |
| Destinatário inválido mas não alterado | Recusado (`invalid_assignee`), igual à tag: o destinatário precisa ser válido no momento de salvar. O formulário não pré-seleciona destinatário inválido, então só chega aqui envio forjado ou lista velha                                                                                                                                                                       |
| Chamado antigo sem destinatário        | No "Editar", campo sem seleção com `Este chamado ainda não tem destinatário. Escolha uma pessoa ativa do seu setor.`; salvar exige escolher. Não pré-seleciona o autor: isso trocaria o destinatário de quem só quis corrigir o título                                                                                                                                           |
| Ordem dos campos no "Novo chamado"     | Título, Descrição, Tipo, Tag, depois **Criador** e **Destinatário** lado a lado (empilhados no mobile). É a ordem do card Detalhes (Tipo, Tag, …, Criador, Destinatário) e mantém o foco inicial do dialog no Título                                                                                                                                                             |
| Revalidação na criação                 | `createTicket` passa a revalidar também `MY_TICKETS_PATH`: o chamado entra nas abas do autor e do destinatário                                                                                                                                                                                                                                                                   |

## Tabelas, enums e migration

Nada novo. `ticket.assigned_to` (FK `users.id`), `ticket_history.from_assignee_id`
/ `to_assignee_id` e o valor `atribuicao` de `history_event` já existem.

| Tabela           | Uso                                                                                                                                                                                    |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `users`          | lista de atribuíveis (`id`, `name`, só ativos do setor); na transação, lê `department_id` e `is_active` do destinatário escolhido (`for share`)                                        |
| `ticket`         | criação: grava `assigned_to`. Edição: lê `assigned_to` (já lido sob a trava) e grava `assigned_to` quando mudou                                                                        |
| `ticket_history` | criação: `criacao` com `to_assignee_id`. Edição: `edicao` (nota com "destinatário") e `atribuicao` (`from_assignee_id`, `to_assignee_id`). Detalhe: lê `changed_by` e `to_assignee_id` |

## Tipos — `app/_lib/types/`

### `app/_lib/types/ticket.ts` (alterado)

```ts
export interface TicketAssigneeFacts {
  departmentId: number
  isActive: boolean
}

export interface AssigneeOption {
  id: number
  name: string
}

export interface TicketCreatorFacts {
  id: number
  name: string
}

export interface InsertTicketValues {
  title: string
  description: string
  type: TicketType
  tagId: number
  assigneeId: number // novo
  createdBy: number
  originDepartmentId: number
}

export interface TicketInvalidAssignee {
  status: "invalid_assignee"
}

export type InsertTicketOutcome =
  TicketSaved | TicketInvalidTag | TicketInvalidAssignee // ganhou invalid_assignee

export interface NewTicketFormDefaults {
  title: string
  description: string
  assigneeId?: number
}

export interface NewTicketFormAvailable {
  canCreate: true
  tags: TagOption[]
  assignees: AssigneeOption[] // novo
  creatorName: string // novo
  defaults: NewTicketFormDefaults // novo
}

export interface TicketHistoryEntry {
  // demais campos sem mudança
  changedById: number | null // novo
  toAssigneeId: number | null // novo
}
```

- `TicketCreatorFacts` é satisfeito por `Actor` (`getSession()`) sem conversão.
- `NewTicketFormDefaults` tem o formato de `DefaultValues<CreateTicketInput>`:
  `assigneeId` ausente deixa o combobox sem seleção. É serializável.
- `TicketHistoryEntry.changedById`/`toAssigneeId` existem só para a frase de
  `criacao` comparar ids; a UI não os exibe.

### `app/_lib/types/ticket-edit.ts` (alterado)

```ts
export interface TicketEditSnapshot {
  title: string
  description: string
  type: TicketType
  tagId: number | null
  assignedTo: number | null // novo; mesmo nome de TicketDetail e da coluna
  solution: string | null
}

export interface TicketEditValues {
  title: string
  description: string
  type: TicketType
  tagId: number
  assigneeId: number // novo
  solution?: string
}

export interface TicketAssigneeChange {
  fromAssigneeId: number | null
  toAssigneeId: number
}

export interface TicketEditChanges {
  title: boolean
  description: boolean
  type: TicketTypeChange | null
  tag: TicketTagChange | null
  assignee: TicketAssigneeChange | null // novo
  solution: boolean
}

export type UpdateTicketByAuthorOutcome =
  | TicketEditSaved
  | TicketNotFound
  | TicketNotEditable
  | TicketInvalidTag
  | TicketInvalidAssignee // novo
  | TicketNoChanges

export interface EditTicketFormDefaults {
  // demais campos sem mudança
  assigneeId?: number // novo; ausente = sem seleção
}

export interface TicketEditFormOptions {
  defaults: EditTicketFormDefaults
  tags: TagOption[]
  tagHint?: string // novo; texto pronto da descrição do campo Tag
  assignees: AssigneeOption[] // novo
  assigneeHint?: string // novo; texto pronto da descrição do campo
  includesSolution: boolean
}
```

- `TicketDetail` continua satisfazendo `TicketEditSource` sem conversão: o
  campo do retrato se chama `assignedTo` justamente para casar com
  `TicketDetail.assignedTo`. O valor do formulário se chama `assigneeId`.
- `UpdateTicketByAuthorValues` ganha `assigneeId` por herança.
  `TicketEditSaved` não muda (a revalidação de Meus chamados já acontece em
  toda edição salva).

## Domínio — `app/_lib/domain/`

### `app/_lib/domain/ticket-assignee.ts` (novo)

```ts
export const TICKET_CREATOR_LABEL // "Criador"
export const TICKET_ASSIGNEE_LABEL // "Destinatário"
export const UNAVAILABLE_ASSIGNEE_HINT
export const MISSING_ASSIGNEE_HINT

export const isUsableTicketAssignee: (
  person: TicketAssigneeFacts,
  ticketDepartmentId: number,
) => boolean
export const preselectedAssigneeId: (
  assigneeId: number | null,
  assignees: readonly AssigneeOption[],
) => number | undefined
export const assigneeEditHintFor: (
  assigneeId: number | null,
  assignees: readonly AssigneeOption[],
) => string | undefined
```

| Nome                     | Semântica                                                                                                                                        |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `isUsableTicketAssignee` | **A** regra: pessoa ativa **e** `departmentId` = setor do chamado. `mustChangePassword` não entra (decisão acima). A transação reconfere com ela |
| `preselectedAssigneeId`  | O id, se ele estiver na lista de atribuíveis; senão `undefined` (sem seleção). Nulo → `undefined`                                                |
| `assigneeEditHintFor`    | Nulo → `MISSING_ASSIGNEE_HINT`; id fora da lista (desativado, mudou de setor) → `UNAVAILABLE_ASSIGNEE_HINT`; na lista → `undefined`              |
| `TICKET_*_LABEL`         | Rótulos do detalhe e do "Novo chamado". Única fonte dos dois textos                                                                              |

### `app/_lib/domain/ticket.ts` (alterado)

```ts
export const buildNewTicketFormOptions: (
  author: TicketAuthorFacts,
  creator: TicketCreatorFacts, // novo
  tags: readonly TagOption[],
  assignees: readonly AssigneeOption[], // novo
) => NewTicketFormOptions
```

Bloqueado → igual a hoje. Liberado → `{ canCreate: true, tags, assignees,
creatorName: creator.name, defaults: { title: "", description: "", assigneeId:
preselectedAssigneeId(creator.id, assignees) } }`. `checkTicketCreation` não
muda: quem passa nele é ativo e de setor alocado, então está na própria lista e
o padrão é sempre ele mesmo. Nenhum motivo de bloqueio novo.

### `app/_lib/domain/ticket-edit.ts` (alterado)

```ts
export const UNAVAILABLE_TAG_HINT // novo; "A tag atual não está disponível. Escolha uma tag ativa do seu setor."

export const tagEditHintFor: (
  // novo
  tagId: number | null,
  tags: readonly TagOption[],
) => string | undefined

export const buildTicketEditFormOptions: (
  ticket: TicketEditSource,
  tags: readonly TagOption[],
  assignees: readonly AssigneeOption[], // novo
) => TicketEditFormOptions
```

| Nome                         | Mudança                                                                                                                                                                                                                          |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tagEditHintFor`             | Tag nula ou fora da lista de tags ativas do setor → `UNAVAILABLE_TAG_HINT`; na lista → `undefined`. Mesma condição em que `defaults.tagId` fica ausente (as duas saem do mesmo helper privado). Antes vivia como constante na UI |
| `buildTicketEditFormOptions` | `defaults.assigneeId = preselectedAssigneeId(ticket.assignedTo, assignees)`; `assignees` repassado; `assigneeHint = assigneeEditHintFor(ticket.assignedTo, assignees)`; `tagHint = tagEditHintFor(ticket.tagId, tags)`           |
| `diffTicketEdit`             | `assignee = current.assignedTo === next.assigneeId ? null : { fromAssigneeId: current.assignedTo, toAssigneeId: next.assigneeId }`                                                                                               |
| `hasTicketEditChanges`       | considera `assignee`                                                                                                                                                                                                             |
| `describeTicketEditNote`     | ordem fixa: título, descrição, tipo, tag, **destinatário**, solução. Só a palavra; o de/para está na linha `atribuicao`                                                                                                          |

`ticketEditBlockFor`, `canEditTicket` e `ticketEditButtonStateFor` **não**
mudam: o destinatário é editável exatamente quando o resto é.

| Mudou                     | `note`                                                                         |
| ------------------------- | ------------------------------------------------------------------------------ |
| só o destinatário         | `Alterou destinatário.`                                                        |
| título, tag, destinatário | `Alterou título, tag e destinatário.`                                          |
| tudo, em `resolvido`      | `Alterou título, descrição, tipo (Dúvida → Bug), tag, destinatário e solução.` |

### `app/_lib/domain/ticket-history.ts` (alterado)

| `history_event` | Frase                                                                                                                                                                                                              |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `criacao`       | destinatário ≠ autor: `Abriu o chamado em QA Suporte com status Aberto e o atribuiu a QA Admin Suporte.` Destinatário = autor, sem destinatário: `Abriu o chamado em QA Suporte com status Aberto.` (igual a hoje) |
| `atribuicao`    | `Trocou o destinatário de QA Membro Suporte para QA Admin Suporte.`; só destino: `Atribuiu o chamado a X.`; só origem: `Removeu o destinatário X.`; nenhum: `Alterou o destinatário.`                              |

Rótulo de `atribuicao` continua `Atribuição`. Ninguém grava `atribuicao` sem
destino hoje; as variações existem por totalidade.

## Validação — `app/_lib/validation/ticket.ts` (alterado)

```ts
export const createTicketSchema // z.object({ title, description, type, tagId, assigneeId })
export type CreateTicketInput = {
  title: string
  description: string
  type: TicketType
  tagId: number
  assigneeId: number // novo
}
export const editTicketSchema // createTicketSchema.extend({ ticketId, solution }): ganha assigneeId por derivação
```

| Campo        | Regra            | Mensagem                    |
| ------------ | ---------------- | --------------------------- |
| `assigneeId` | inteiro positivo | `Selecione o destinatário.` |

- Sem `coerce`: o `Combobox` devolve o `id` numérico, como na tag.
- **Criador não está no schema** e nunca vem do cliente. `createdBy` ou
  `creatorId` enviados por cliente forjado são descartados pelo `z.object`.
- Se o destinatário é ativo e do setor não é formato: é checado na transação.

## `df-auth` — nada novo

`getSession()` dá `id` e `name` (o `Actor` satisfaz `TicketCreatorFacts`);
`getAccountFacts()` dá o setor fresco.

## `df-data` — o que criar e mudar

### `app/_lib/data/people.ts` — `listTicketAssigneeOptions` (novo)

```ts
export async function listTicketAssigneeOptions(
  departmentId: number,
): Promise<AssigneeOption[]>
```

- `select id, name from users where department_id = $1 and is_active order by
lower(name), id`.
- Inclui quem está com `must_change_password` (decisão acima).
- Serve ao "Novo chamado" (setor do autor) e ao "Editar" (setor do autor, que é
  o do chamado editável).

### `app/_lib/data/tickets.ts` — `findTicketDetail` (alterado)

Na leitura do histórico, selecionar também `changedById: ticketHistory.changedBy`
e `toAssigneeId: ticketHistory.toAssigneeId`. Nada mais muda (`assignedTo` e
`assigneeName` do chamado já são lidos).

### `app/_lib/data/tickets.ts` — `insertTicket` (alterado)

Mesma assinatura; `values` ganhou `assigneeId`. Sequência de
`ticket-creation.md` com:

1. **Tag** — sem mudança (`invalid_tag`).
2. **Destinatário** (novo) — `select department_id, is_active from users where
id = $assigneeId for share`. Sem linha ou `!isUsableTicketAssignee(row,
values.originDepartmentId)` → `{ status: "invalid_assignee" }`, sem gravar nada.
3. `insert into ticket` com **`assignedTo: values.assigneeId`** (demais campos
   como hoje).
4. `ticket_tag` — sem mudança.
5. `criacao` com **`toAssigneeId: values.assigneeId`** (demais colunas como
   hoje). **Nenhuma** linha `atribuicao`.
6. `{ status: "saved", ticketId }`.

- **Precedência**: `invalid_tag` → `invalid_assignee`.
- **Travas, nesta ordem**: `tag` (`for share`) → `users` do destinatário
  (`for share`). `updatePersonActive` e `updatePersonRecord` pegam `for update`
  na mesma linha de `users`: desativar ou mover o destinatário no meio da
  criação espera a transação, ou a criação enxerga o estado novo e recusa.
  Nenhuma das duas trava `tag`, então não há ciclo.
- Destinatário = autor é o caso comum: a linha do autor é travada `for share`,
  o que não conflita com nada além de uma alteração simultânea do próprio
  cadastro (mesmo risco 6 de `ticket-edit.md`).

### `app/_lib/data/tickets.ts` — `updateTicketByAuthor` (alterado)

Mesma assinatura; `values` ganhou `assigneeId`. Sequência de
`ticket-edit-window.md` com:

1. Chamado (`for update`, já lê `assigned_to`), `now`, autor, visibilidade,
   transferência, regra, solução, tag atual, tag escolhida: sem mudança.
2. **Destinatário** (novo, logo depois da tag escolhida) — `select
department_id, is_active from users where id = $assigneeId for share`. Sem
   linha ou `!isUsableTicketAssignee(row, editor.departmentId)` →
   `{ status: "invalid_assignee" }`. Vale também quando o destinatário não
   mudou mas deixou de ser válido. Usa `editor.departmentId`, o mesmo valor da
   checagem da tag escolhida: `canEditTicket` já garantiu
   `ticketRow.currentDepartmentId === editor.departmentId`, então o resultado é
   idêntico, e as duas checagens leem a mesma fonte.
3. **Diferença** — `diffTicketEdit({ title, description, type, tagId: tagAtual,
assignedTo: ticketRow.assignedTo, solution }, values)`.
4. `update ticket set …` como hoje e, **só se `changes.assignee`**,
   `assignedTo: values.assigneeId`.
5. `ticket_tag`, `edicao` (nota com "destinatário") e `mudanca_tag`: sem
   mudança.
6. **Só se `changes.assignee`** (novo): `insert into ticket_history`, `event:
"atribuicao"`, `changedBy = authorId`, `fromAssigneeId =
changes.assignee.fromAssigneeId` (nulo em chamado antigo),
   `toAssigneeId = changes.assignee.toAssigneeId`, `changedAt`. **Depois** da
   `edicao` e da `mudanca_tag`.
7. `{ status: "saved", ticketId, tagChanged }` — igual.

- **Precedência**: `not_found` → `not_editable` (regra, depois solução) →
  `invalid_tag` → `invalid_assignee` → `no_changes`.
- **Travas, nesta ordem**: `ticket` (`for update`) → `users` do autor
  (`for share`) → `tag` (`for share`) → `users` do destinatário (`for share`).
  Autor e destinatário podem ser a mesma linha: dois `for share` na mesma
  transação não conflitam.
- **Regra fora da data layer**: validade do destinatário, diferença e nota vêm
  do domínio; o SQL não repete `is_active` nem o setor.
- `assigned_to` passa a ser escrito por esta função (só quando mudou).
  `status`, `priority`, setores e `resolved_at` continuam fora.

## `df-actions` — o que mudar

### `app/_lib/actions/tickets.ts`

```ts
export type TicketErrorCode =
  "INVALID_INPUT" | "FORBIDDEN" | "INVALID_TAG" | "INVALID_ASSIGNEE"
export type EditTicketErrorCode =
  | "INVALID_INPUT"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "INVALID_TAG"
  | "INVALID_ASSIGNEE"
  | "NO_CHANGES"
```

| Outcome            | `code`             | Mensagem (criação e edição, uma constante só)                                   |
| ------------------ | ------------------ | ------------------------------------------------------------------------------- |
| `invalid_assignee` | `INVALID_ASSIGNEE` | `Este destinatário não está disponível. Escolha uma pessoa ativa do seu setor.` |

- `createTicket`: repassa `assigneeId: parsed.data.assigneeId` a
  `insertTicket`. `createdBy` continua `actor.id` (sessão) e
  `originDepartmentId` continua `facts.departmentId`; nenhum dos dois vem do
  formulário. `saved` → `revalidatePath("/dashboard")` **e**
  `revalidatePath(MY_TICKETS_PATH)` (novo). A action não carrega a lista de
  atribuíveis: a transação decide.
- `editTicket`: nada a mudar além do mapeamento (o `...parsed.data` já leva
  `assigneeId`). Revalidação igual: detalhe, `MY_TICKETS_PATH` e, se a tag
  mudou, o Início.
- **Por que `MY_TICKETS_PATH` alcança o novo destinatário.** `revalidatePath`
  invalida o caminho, não a sessão de quem chamou; e `/tickets` é dinâmica
  (lê a sessão), renderizada a cada visita. O destinatário vê o chamado em
  "Atribuídos a mim" na próxima navegação, sem e-mail nem push.
- Sem e-mail (decisão do usuário).

## `df-ui` — o que mudar

### `AppTopBar` (`app/(app)/_components/app-top-bar.tsx`)

```ts
const [facts, actor] = await Promise.all([getAccountFacts(), getSession()])
if (!facts || !actor) notFound()
const [tags, assignees] = await Promise.all([
  listActiveDepartmentTags(facts.departmentId),
  listTicketAssigneeOptions(facts.departmentId),
])
const options = buildNewTicketFormOptions(facts, actor, tags, assignees)
```

`getAccountFacts` e `getSession` são `cache`: nenhuma consulta de sessão a
mais. Uma leitura nova por página (a lista de atribuíveis), em paralelo com a
de tags.

### `NewTicketDialog`

Campos, nesta ordem: Título, Descrição, Tipo, Tag (como hoje); depois uma linha
com **Criador** e **Destinatário** lado a lado a partir de `sm`, empilhados no
mobile.

| Campo        | Componente         | Regra                                                                                                                                                                                                                                                      |
| ------------ | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Criador      | `Input` `readOnly` | rótulo `TICKET_CREATOR_LABEL`; valor `options.creatorName`. **Fora do React Hook Form** (sem `Controller`, sem `register`): nunca entra nos valores nem no envio. `readOnly`, não `disabled`: continua legível por leitor de tela e com contraste de texto |
| Destinatário | `Combobox`         | rótulo `TICKET_ASSIGNEE_LABEL`; `Controller` de `assigneeId`; opções `options.assignees` (rótulo `name`); placeholder `Selecione o destinatário`; busca `Buscar pessoa…`; padrão `options.defaults.assigneeId` (o autor)                                   |

- `defaultValues` e o `reset` ao fechar passam a usar `options.defaults` (no
  lugar de `INITIAL_VALUES`): sem isso o padrão do destinatário some depois do
  primeiro envio.
- Um campo de destinatário compartilhado com a edição (ex.:
  `app/(app)/_components/ticket-assignee-field.tsx`, irmão de
  `ticket-tag-field.tsx`) é decisão do `df-ui`.
- Resultado do `createTicket`, acrescido:
  - `INVALID_ASSIGNEE` → `form.setError("assigneeId", { message }, {
shouldFocus: true })` e `router.refresh()` (a lista pode estar velha), como
    `INVALID_TAG`.

### Detalhe (`/tickets/[id]`)

- `page.tsx`, estado `editable`: carregar `listTicketAssigneeOptions(
facts.departmentId)` junto com as tags e chamar
  `buildTicketEditFormOptions(ticket, editTags, editAssignees)`. Nos demais
  estados, não ler.
- `ticket-detail-fields.tsx`: rótulos `Aberto por` → `TICKET_CREATOR_LABEL`
  (`Criador`) e `Responsável` → `TICKET_ASSIGNEE_LABEL` (`Destinatário`).
  Valores iguais (`authorName`; `assigneeName ?? EMPTY_VALUE_LABEL`). `Aberto
em` continua.
- **Modo de edição**: a linha Destinatário vira o combobox (`Controller` de
  `assigneeId`, `options.assignees`), na mesma posição da lista; descrição do
  campo = `options.assigneeHint` quando presente (texto pronto do domínio; a UI
  não decide qual). Criador continua texto. A divisão em ilhas é do `df-ui`
  (hoje `TicketEditClassification` cobre só Tipo e Tag).
- Contexto do modo de edição (`use-ticket-edit.ts`) passa a expor `assignees`
  e `assigneeHint`.
- **Campo Tag**: descrição = `options.tagHint` quando presente, no mesmo padrão
  do destinatário. A UI não guarda o texto nem decide a condição (sai a
  constante local e o teste `defaults.tagId === undefined` do provider). Texto
  e condição iguais aos de `ticket-edit.md`.
- Resultado do `editTicket`, acrescido:
  - `INVALID_ASSIGNEE` → `setError("assigneeId", { message }, { shouldFocus:
true })` e `router.refresh()`; continua editando.
- Linha do tempo: nada a codar; frases vêm do domínio.

## Textos

| Onde                                    | Texto                                                                              |
| --------------------------------------- | ---------------------------------------------------------------------------------- |
| Rótulos                                 | `Criador`, `Destinatário`                                                          |
| Placeholder / busca do combobox         | `Selecione o destinatário`, `Buscar pessoa…`                                       |
| Validação                               | `Selecione o destinatário.`                                                        |
| `INVALID_ASSIGNEE`                      | `Este destinatário não está disponível. Escolha uma pessoa ativa do seu setor.`    |
| Edição, destinatário atual indisponível | `O destinatário atual não está disponível. Escolha uma pessoa ativa do seu setor.` |
| Edição, chamado sem destinatário        | `Este chamado ainda não tem destinatário. Escolha uma pessoa ativa do seu setor.`  |
| Nota da edição                          | `Alterou destinatário.` (e combinações)                                            |
| `criacao` com destinatário ≠ autor      | `Abriu o chamado em {setor} com status Aberto e o atribuiu a {nome}.`              |
| `atribuicao`                            | `Trocou o destinatário de {de} para {para}.`                                       |

## Riscos

1. **O autor perde o "Resolver"** ao atribuir a um colega: com destinatário
   definido, resolve o destinatário (`isTicketResolver`), além de admin do
   setor e diretor. Ele continua com "Editar" (a edição é do autor). Decidido.
2. **Duas abas**: destinatário = autor (o padrão) → o chamado aparece em
   "Abertos por mim" e em "Atribuídos a mim"; as contagens não somam o total.
   Aceito.
3. **Destinatário desativado depois** continua atribuído e aparece **pelo
   nome** no detalhe e na linha do tempo; ele não entra mais na lista, e no
   "Editar" o campo vem sem seleção com `UNAVAILABLE_ASSIGNEE_HINT`. Enquanto
   ninguém troca, o chamado fica com uma pessoa que não acessa o sistema; quem
   resolve nesse caso é o admin do setor ou o diretor.
4. **Destinatário movido de setor** continua atribuído, continua vendo o
   chamado (`canViewTicket` aceita o destinatário) e continua podendo resolvê-lo
   de outro setor. Mesmo efeito do risco 3 no "Editar".
5. **Autor movido de setor com destinatário = ele mesmo** passa a resolver o
   chamado pela regra do destinatário, mesmo fora do setor (antes, sem
   destinatário, perdia o "Resolver" ao sair do setor). Consequência da regra
   atual de quem resolve; não muda aqui.
6. **Chamados antigos sem destinatário** mostram `—` em Destinatário; editar
   qualquer coisa neles exige escolher um destinatário.
7. **Uma leitura a mais por página** (atribuíveis do setor no `AppTopBar`).
8. **Id fora da faixa de `integer`** forjado em `assigneeId` (ex.: `1e12`)
   falha no banco como erro inesperado, não como `INVALID_ASSIGNEE` — mesmo
   comportamento de `tagId` hoje.

## Critério de pronto

1. "Novo chamado" com Criador travado (nome de quem abre) e Destinatário
   obrigatório, padrão = autor, opções = ativos do setor do autor em ordem de
   nome.
2. Destinatário fora da regra (outro setor, inativo, inexistente) recusado com
   `INVALID_ASSIGNEE`, mesmo forjado; nada gravado.
3. `ticket.assigned_to` gravado na criação; `criacao` com `to_assignee_id`;
   nenhuma `atribuicao` na criação.
4. Troca no "Editar": `edicao` com "destinatário" na nota e `atribuicao` com
   de/para, nessa ordem; `ticket.assigned_to` atualizado.
5. Detalhe com `Criador`/`Destinatário`; combobox no modo de edição.
6. `npx tsc --noEmit`, `npm run lint` e `npm run build` passam; `df-reviewer`
   sem bloqueante; `df-qa` aprova os cenários abaixo.

## Cenários para o `df-qa`

Usuários e setores de `docs/contracts/qa-seed.md`. Títulos criados começam com
`[QA]`; criação só em QA Suporte. **Não editar #65 a #68** (referência de
`my-tickets.md`). "Request de action" = `POST` com cabeçalho `Next-Action`.
Anotar `max(id)` de `ticket`, `ticket_tag` e `ticket_history` antes de cada
cenário que diz "nada gravado".

**Preparação**: QA Admin Suporte e QA Membro Suporte ativos em QA Suporte;
`[QA] Acesso` e `[QA] Edição B` ativas em QA Suporte (reativar se preciso). QA
Admin Infra está **inativo** hoje: não reativar (o cenário 8 depende disso).
Anotar pelo banco os ids de QA Membro Suporte (`M`), QA Admin Suporte (`A`), QA
Admin Infra (`I`) e do Diretor (`D`).

### Novo chamado

| #   | Quem              | Ação                                                                                                                                                    | Esperado                                                                                                                                                                                                                                                                                                                                           |
| --- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | QA Membro Suporte | abrir "Novo chamado"                                                                                                                                    | campos Título, Descrição, Tipo, Tag, depois Criador e Destinatário; foco inicial no Título; Criador com `QA Membro Suporte`, somente leitura (digitar não muda o valor); Destinatário com `QA Membro Suporte` selecionado                                                                                                                          |
| 2   | QA Membro Suporte | abrir o combobox Destinatário; conferir no banco `select id, name from users where department_id = <QA Suporte> and is_active order by lower(name), id` | a lista é exatamente a da consulta (hoje `QA Admin Suporte`, `QA Membro Suporte`), na mesma ordem; sem o Diretor e sem `QA Admin Infra`; busca `admin` deixa só `QA Admin Suporte`                                                                                                                                                                 |
| 3   | QA Membro Suporte | criar `[QA] Destinatário padrão`, tipo Dúvida, tag `[QA] Acesso`, destinatário padrão → `#P`                                                            | toast `Chamado #P criado.`; o payload da action **não** tem criador (só `title`, `description`, `type`, `tagId`, `assigneeId`)                                                                                                                                                                                                                     |
| 4   | banco, só leitura | depois do 3                                                                                                                                             | `ticket` #P: `created_by = M`, `assigned_to = M`; `ticket_history` do #P: uma linha só, `criacao`, `to_assignee_id = M`, `from_assignee_id` nulo; nenhuma `atribuicao`                                                                                                                                                                             |
| 5   | QA Membro Suporte | abrir `/tickets/P`; depois `/tickets?tab=opened&periodo=todos` e `?tab=assigned&periodo=todos`                                                          | Detalhes com `Criador` QA Membro Suporte e `Destinatário` QA Membro Suporte; nenhum texto `Aberto por` nem `Responsável`; `Aberto em` presente. Linha do tempo: `Abriu o chamado em QA Suporte com status Aberto.` (sem "atribuiu"). Card Conclusão com "Resolver". #P listado nas duas abas; contagens = consulta do cenário 3 de `my-tickets.md` |
| 6   | QA Membro Suporte | criar `[QA] Destinatário colega`, tag `[QA] Acesso`, destinatário `QA Admin Suporte` → `#C`                                                             | toast de sucesso; no banco `assigned_to = A` e `criacao` com `to_assignee_id = A`; no detalhe, `Destinatário` QA Admin Suporte, linha do tempo `Abriu o chamado em QA Suporte com status Aberto e o atribuiu a QA Admin Suporte.`; card Conclusão **sem** "Resolver" para o membro; "Editar" presente                                              |
| 7   | QA Membro Suporte | Meus chamados, Todos                                                                                                                                    | #C em "Abertos por mim", **não** em "Atribuídos a mim"                                                                                                                                                                                                                                                                                             |
| 8   | QA Membro Suporte | dialog aberto: forjar `assigneeId` = `D` (ativo, Diretoria); depois `I` (inativo, QA Infra); depois `999999`                                            | os três: `Este destinatário não está disponível. Escolha uma pessoa ativa do seu setor.` abaixo do campo Destinatário, foco no gatilho do combobox (`button[role=combobox]`), `aria-invalid="true"`; dialog aberto; nada gravado                                                                                                                   |
| 9   | QA Membro Suporte | forjar payload **sem** `assigneeId`; depois com `createdBy` = `A` acrescentado (destinatário válido)                                                    | o primeiro: toast `Selecione o destinatário.`, nada gravado. O segundo: criado, com `created_by = M` (a chave é ignorada)                                                                                                                                                                                                                          |
| 10  | QA Admin Suporte  | Meus chamados → "Atribuídos a mim", Todos; abrir `/tickets/C`                                                                                           | #C listado; no detalhe, "Resolver" presente; **sem** "Editar" (não é autor)                                                                                                                                                                                                                                                                        |
| 11  | QA Admin Suporte  | criar `[QA] Para o membro`, destinatário `QA Membro Suporte` → `#R`; depois, como QA Membro Suporte, abrir "Atribuídos a mim" e `/tickets/R`            | #R listado para o membro; no detalhe do membro, "Resolver" presente (ele não é autor nem admin: é o destinatário) e **sem** "Editar"                                                                                                                                                                                                               |

### Edição em tela

| #   | Quem                | Ação                                                                                                                                                  | Esperado                                                                                                                                                                                                                                                                                           |
| --- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 12  | QA Membro Suporte   | `/tickets/P` → "Editar"                                                                                                                               | linha Destinatário vira combobox com `QA Membro Suporte` selecionado e a mesma lista do cenário 2; Criador continua texto                                                                                                                                                                          |
| 13  | QA Membro Suporte   | trocar só o destinatário para `QA Admin Suporte` → "Salvar alterações"                                                                                | toast `Chamado #P atualizado.`; `Destinatário` QA Admin Suporte; linha do tempo ganha "Edição" com nota `Alterou destinatário.` e, abaixo, "Atribuição" `Trocou o destinatário de QA Membro Suporte para QA Admin Suporte.`; "Resolver" some para o membro; "Editar" continua                      |
| 14  | banco, só leitura   | depois do 13                                                                                                                                          | duas linhas novas com o mesmo `changed_at`: `edicao` (`note = 'Alterou destinatário.'`) e, com `id` maior, `atribuicao` (`from_assignee_id = M`, `to_assignee_id = A`, `changed_by = M`); `ticket.assigned_to = A`; `updated_at` = esse `changed_at`; `status`, setores e `ticket_tag` inalterados |
| 15  | QA Membro Suporte   | "Editar"; título `[QA] Destinatário padrão alterado`, tag `[QA] Edição B`, destinatário `QA Membro Suporte` → salvar                                  | nota `Alterou título, tag e destinatário.`; logo abaixo "Mudança de tag" e depois "Atribuição" `Trocou o destinatário de QA Admin Suporte para QA Membro Suporte.`; no banco, `edicao` < `mudanca_tag` < `atribuicao` por `id`, mesmo `changed_at`                                                 |
| 16  | QA Membro Suporte   | "Editar" → salvar sem mudar nada                                                                                                                      | `Nenhuma alteração para salvar.`; nada gravado                                                                                                                                                                                                                                                     |
| 17  | QA Membro Suporte   | do modo de edição do #P, forjar `assigneeId` = `D`                                                                                                    | mensagem de `INVALID_ASSIGNEE` no campo Destinatário, com foco e `aria-invalid="true"`; continua editando; nada gravado                                                                                                                                                                            |
| 18  | Diretor + QA Membro | Diretor desativa QA Admin Suporte (Cadastros → Pessoas). Membro abre `/tickets/C` e "Editar"                                                          | leitura: `Destinatário` QA Admin Suporte (pelo nome, não `—`). Edição: combobox sem seleção, com `O destinatário atual não está disponível. Escolha uma pessoa ativa do seu setor.`; lista sem QA Admin Suporte; salvar sem escolher → `Selecione o destinatário.`                                 |
| 19  | QA Membro Suporte   | no mesmo estado, forjar `assigneeId` = `A` (inativo, mesmo setor) e salvar; depois escolher `QA Membro Suporte` e salvar                              | o primeiro: `INVALID_ASSIGNEE`, nada gravado. O segundo: salvo, `edicao` + `atribuicao` de QA Admin Suporte para QA Membro Suporte. **Ao fim, o Diretor reativa QA Admin Suporte**                                                                                                                 |
| 20  | QA Membro Suporte   | dialog "Novo chamado" aberto **antes** de o Diretor desativar QA Admin Suporte (repetir a desativação se preciso); escolher QA Admin Suporte e enviar | `INVALID_ASSIGNEE` no campo e a lista se atualiza sem QA Admin Suporte (refresh); nada gravado. Ao fim, reativar QA Admin Suporte                                                                                                                                                                  |
| 21  | QA Membro Suporte   | `/tickets/J` (`[QA] Janela aberta` do seed, sem destinatário) → "Editar" → "Cancelar"                                                                 | leitura: `Destinatário` `—`. Edição: combobox sem seleção com `Este chamado ainda não tem destinatário. Escolha uma pessoa ativa do seu setor.`. Cancelar não grava nada                                                                                                                           |
| 22  | QA Membro Suporte   | `/tickets/65`                                                                                                                                         | `Criador` QA Membro Suporte, `Destinatário` `—`; linha do tempo igual à de antes. Não editar                                                                                                                                                                                                       |
| 23  | qualquer            | navegar pelos cenários, abrindo o dialog e entrando e saindo do modo de edição                                                                        | nenhum erro nem aviso de hidratação no dev server (MCP `next-devtools`)                                                                                                                                                                                                                            |

O cenário 20 é opcional se a desativação no meio do dialog não puder ser
coordenada; nesse caso, registrar como não executado. Ao final da bateria, QA
Admin Suporte precisa estar **ativo** e QA Admin Infra continua como estava.

## Checklist de encerramento da feature

- [x] tipos (`AssigneeOption`, `TicketAssigneeFacts`, `TicketCreatorFacts`, `TicketInvalidAssignee`, `NewTicketFormDefaults`, `assigneeId`/`assignedTo`/`assignee` na edição, `changedById`/`toAssigneeId` no histórico), `domain/ticket-assignee.ts`, `buildNewTicketFormOptions` e `buildTicketEditFormOptions` com atribuíveis, `tagHint`/`tagEditHintFor`/`UNAVAILABLE_TAG_HINT`, diff e nota com destinatário, frases de `criacao` e `atribuicao`, `assigneeId` em `createTicketSchema` (`df-architect`)
- [ ] `listTicketAssigneeOptions`; `findTicketDetail` com `changedById`/`toAssigneeId`; `insertTicket` e `updateTicketByAuthor` com destinatário (`df-data`)
- [ ] `createTicket`/`editTicket` com `INVALID_ASSIGNEE`; `createTicket` revalida `MY_TICKETS_PATH` (`df-actions`)
- [ ] `AppTopBar` com atribuíveis e criador; `NewTicketDialog` com Criador e Destinatário; detalhe com rótulos e combobox na edição (`df-ui`)
- [ ] cenários do `df-qa`
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm run build`
