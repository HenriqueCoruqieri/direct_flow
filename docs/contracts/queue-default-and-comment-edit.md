# Contrato — Fila como destinatário padrão, status pela atribuição e edição de comentário

Entrada das seis etapas do plano `docs/plans/queue-default-and-comment-edit.md`
(decisões do usuário lá, não repetidas aqui). Este documento é a referência
técnica: assinaturas, sequências, textos e cenários. Ele **altera** contratos
anteriores, que continuam valendo no que não é tocado aqui e trazem uma
revisão de 2026-10-06 apontando para cá:

- `docs/contracts/department-queue.md` — tabela, "Assumir", efeito da atribuição
- `docs/contracts/ticket-assignee.md` — destinatário padrão e valor nulo
- `docs/contracts/ticket-creation.md` — status inicial e opções do formulário
- `docs/contracts/ticket-edit-window.md` — destinatário no modo de edição
- `docs/contracts/my-tickets.md` — frases da linha do tempo
- `docs/contracts/ticket-resolution.md` — comentários

Padrões de outcome, resultado de action, travas e formulário vêm de
`ticket-edit.md`, `ticket-resolution.md` e `department-queue.md`.

Versões observadas: `next@16.3.5`, `drizzle-orm@0.45.2`, `zod@4.6.5`,
`@tanstack/react-table@9.2.4`, `react-hook-form@7.88`.

## Como ler

- **Uma seção por etapa**, na ordem de implementação. Cada etapa compila
  sozinha sobre as anteriores e não usa assinatura de etapa posterior. O
  `df-architect` escreve o código de domínio, tipos e validação de uma etapa
  só quando ela for pedida.
- "Antes → depois" descreve a mudança sobre o código de hoje.
- **Cenários do `df-qa`**: cada etapa tem os seus, mas a bateria roda uma vez,
  no fim. Por isso todo cenário descreve o **estado final** (depois da etapa
  6): nenhum afirma algo que uma etapa posterior muda. Regras comuns em
  "Cenários — regras gerais", no fim.

## Escopo técnico em uma frase

Sem schema e sem migration: `ticket.assigned_to` nulo passa a significar "na
fila do setor" e é o padrão da criação; "já assumido" vira "tem destinatário";
toda troca de destinatário em `aberto`/`em_andamento`/`encaminhado` move o
status e grava `mudanca_status` logo depois da `atribuicao`; as frases de
abertura e atribuição passam a nomear quem agiu e o setor dele; o autor de um
comentário edita o texto, gravando só `message`.

## Decisões do arquiteto (não fixadas no plano)

| Etapa | Tema                                     | Decisão                                                                                                                                                                                                                                                              |
| ----- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | `creatorName` no item da Fila            | Continua em `DepartmentQueueListItem` e em `listQueueTickets`, sem uso na tabela. Tirar exige `df-architect` e `df-data`, e a etapa 1 foi fixada como só `df-ui`. Remoção fica para um `refactor:` futuro, se o usuário quiser                                       |
| 1     | Coluna oculta                            | Suporte no `DataTable` compartilhado (prop nova), não truque na tabela da Fila. Cabeçalho, células e o `colSpan` da linha vazia contam só colunas visíveis                                                                                                           |
| 2     | Representação da fila                    | `assigneeId: null` nos valores do formulário, no schema, nos tipos e no banco. Nenhum valor sentinela (`"queue"`, `0`) sai do componente de campo                                                                                                                    |
| 2     | Sem seleção × fila                       | `undefined` = sem seleção (o schema recusa com `Selecione o destinatário.`); `null` = fila. Só o "Editar" de um chamado cujo destinatário saiu da lista começa sem seleção                                                                                           |
| 2     | Posição da opção                         | "Fila de {setor}" é a **primeira** opção do combobox, antes das pessoas (em ordem de nome)                                                                                                                                                                           |
| 2     | Limite de `integer` em `assigneeId`      | `createTicketSchema.assigneeId` ganha `.max(POSTGRES_INTEGER_MAX)`, como `sendTicketSchema`. Fecha o risco 8 de `ticket-assignee.md`: id gigante forjado vira `INVALID_INPUT`, não erro de banco                                                                     |
| 2     | Setor na devolução à fila                | A `atribuicao` de X para nulo grava também `to_department_id` = setor atual do chamado. A frase da etapa 5 (`devolveu o chamado à fila de {setor}`) lê o setor da própria linha, e continua certa quando transferências entre setores existirem                      |
| 2     | Destinatário exibido no detalhe          | Chamado na fila mostra `Fila de {setor do chamado}` no lugar de `—`. Vale também para chamados antigos sem destinatário (#65, `[QA] Janela aberta`)                                                                                                                  |
| 2     | Nome do setor no "Novo chamado"          | Função nova `findDepartmentName` (`df-data`), lida no `AppTopBar` em paralelo com tags e atribuíveis. Não muda `getAccountFacts` (`df-auth`)                                                                                                                         |
| 2     | `MISSING_ASSIGNEE_HINT`                  | Sai. Destinatário nulo deixou de ser "falta escolher" e passou a ser a fila, pré-selecionada                                                                                                                                                                         |
| 2     | Textos do "Enviar" com destinatário nulo | Dica: `Este chamado está na fila do setor.` (era `Este chamado ainda não tem destinatário.`). Conflito com nulo: `Este chamado voltou para a fila do setor. Confira a lista atualizada.` (era inalcançável; com a devolução à fila pelo "Editar", passa a acontecer) |
| 4     | Regra por quem recebe, não pelo botão    | O alvo é `queue` (nulo), `actor` (quem agiu) ou `colleague` (outra pessoa). "Enviar" que escolhe o próprio admin cai em `actor` → `em_andamento`, como o "Assumir". "Editar" que escolhe o autor também é `actor`                                                    |
| 4     | Sem linha quando o status não muda       | `mudanca_status` só quando o status calculado difere do atual (ex.: `encaminhado` devolvido à fila continua `encaminhado` e não ganha linha)                                                                                                                         |
| 4     | Nome da regra de criação                 | `creationStatusFor`, não `initialTicketStatusFor`: este nome já existiu com outro sentido (setor de destino) e saiu na revisão de 2026-10-02 de `ticket-creation.md`                                                                                                 |
| 5     | Frase de "Editar" para o próprio autor   | `{user} assumiu o chamado.` — mesma regra do alvo `actor` da etapa 4                                                                                                                                                                                                 |
| 5     | Variações sem dado                       | Sem setor de quem agiu (ator do sistema, nunca em atribuição hoje): a frase omite ` do setor {setor}`. Sem nome de destino: `… encaminhou o chamado.`. Sem setor na devolução: `… devolveu o chamado à fila.`                                                        |
| 5     | Nome repetido                            | **Recomendação**: nos itens cuja frase já nomeia quem agiu (`historyEntryNamesActor`), a linha de cima mostra só a data/hora. Decisão final do `df-ui`; se ele mantiver a repetição, `historyEntryNamesActor` não é criada                                           |
| 6     | Conteúdo igual                           | Salvar sem mudar o texto devolve `no_changes` e não grava (senão "(editado)" apareceria sem edição)                                                                                                                                                                  |
| 6     | Comentário privado de terceiro invisível | Tentar editar um privado que a pessoa não vê devolve `not_found` (não `not_editable`), para não confirmar que ele existe. A regra "quem vê qual mensagem" vira função do domínio (`canSeeTicketMessage`), a mesma que o escopo do `listTicketMessages` traduz em SQL |
| 6     | `ticket.updated_at`                      | Não muda ao editar comentário (como ao publicar)                                                                                                                                                                                                                     |

## Tabelas, enums e migration

Nada novo.

| Tabela           | Uso nesta entrega                                                                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ticket`         | `assigned_to` nulo = fila (etapa 2); `status` gravado pela regra de atribuição (etapa 4)                                                               |
| `ticket_history` | `atribuicao` com `to_assignee_id` nulo e `to_department_id` (etapa 2); `mudanca_status` com `from_status`/`to_status` depois da `atribuicao` (etapa 4) |
| `users`          | setor atual de quem agiu, por join, na leitura do histórico (etapa 5)                                                                                  |
| `department`     | nome do setor do autor no "Novo chamado" (etapa 2); nome do setor de quem agiu (etapa 5)                                                               |
| `message`        | leitura de `user_id` e `updated_at`; escrita de `content` e `updated_at` (etapa 6)                                                                     |

---

## Etapa 1 — `refactor: trim the department queue table`

Só `df-ui`. Nenhuma mudança em domínio, tipos, validação, dados ou actions.

### `df-ui`

**Tabela da Fila** (`app/(app)/queue/_components/department-queue-table.tsx`):

| Coluna       | Antes | Depois                                                                                                                     |
| ------------ | ----- | -------------------------------------------------------------------------------------------------------------------------- |
| #            | sim   | sim                                                                                                                        |
| Título       | sim   | sim                                                                                                                        |
| Tipo         | sim   | sim                                                                                                                        |
| Tag          | sim   | sim                                                                                                                        |
| Criador      | sim   | **sai** (coluna removida; nenhum filtro dependia dela)                                                                     |
| Destinatário | sim   | **oculta** — continua com `id: "assignee"`, o mesmo accessor e `filterFn: "inValues"`; sem cabeçalho e sem célula visíveis |
| Status       | sim   | sim                                                                                                                        |
| Aberto em    | sim   | sim                                                                                                                        |
| Ações        | sim   | sim                                                                                                                        |

- Vale em qualquer largura (não é `hidden sm:table-cell`): as duas colunas não
  aparecem nem no desktop.
- Filtros iguais a hoje, na mesma ordem: Status (aba com mais de um), Tipo,
  Tag, **Destinatário** (pessoas das linhas + `NO_ASSIGNEE_LABEL` no fim, só se
  alguma linha tiver `assignedTo === null`).
- `rowHref` continua: clicar no meio da linha abre o detalhe. Nenhum botão
  "Detalhes".
- Botões "Assumir"/"Enviar" e o dialog único não mudam.

**`DataTable`** (`app/_components/data-table/data-table.tsx`) ganha suporte a
coluna oculta que continua filtrável. Forma sugerida (nome final do `df-ui`):

```ts
interface DataTableProps<TData extends RowData> {
  // demais props sem mudança
  hiddenColumns?: ReadonlyArray<string>
}
```

- Implementação pela visibilidade de colunas do TanStack Table 9 (feature de
  visibilidade em `dataTableFeatures` e estado inicial com as colunas ocultas).
  **Conferir a API no `context7` para `@tanstack/react-table@9.2.4`** antes de
  escrever.
- Cabeçalho e células renderizam só as visíveis; o `colSpan` da linha "Nenhum
  resultado…" usa a contagem de colunas **visíveis**.
- Coluna oculta continua no `getColumn(id)` e aceita `setFilterValue`: o grupo
  de filtro dela aparece normalmente.
- Meus chamados não passa a prop e não muda.

### Cenários do `df-qa` — etapa 1

| #    | Quem | Ação                                                                                                                                                                         | Esperado                                                                                                                                                               |
| ---- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E1.1 | M    | `/queue` em 1440×900                                                                                                                                                         | cabeçalhos, na ordem: `#`, `Título`, `Tipo`, `Tag`, `Status`, `Aberto em` e o `sr-only` `Ações`; nenhum `th` com `Criador` ou `Destinatário`; cada linha com 7 células |
| E1.2 | M    | `/queue` em 390×844                                                                                                                                                          | mesmas 7 colunas (nenhuma das duas reaparece); rolagem horizontal se precisar                                                                                          |
| E1.3 | M    | abrir os filtros na aba Em aberto, Todos                                                                                                                                     | grupo **Destinatário** presente, com as pessoas das linhas em ordem de nome e `Sem destinatário` no fim (há chamados na fila depois da etapa 2)                        |
| E1.4 | M    | marcar só `Sem destinatário`; anotar os ids; consultar `select id from ticket where current_department_id = S and status in (<status de Em aberto>) and assigned_to is null` | os ids da tabela são exatamente os da consulta. Desmarcar e marcar `QA Admin Suporte` → só ids com `assigned_to = A`                                                   |
| E1.5 | M    | combinar filtros até não sobrar linha                                                                                                                                        | `Nenhum resultado para os filtros aplicados.` numa célula que ocupa a largura toda da tabela (`colspan` = 7)                                                           |
| E1.6 | M    | clicar no meio de uma linha; voltar; clicar no `#` de outra                                                                                                                  | os dois abrem o detalhe; nenhuma linha tem botão "Detalhes"                                                                                                            |
| E1.7 | A    | `/queue`: "Enviar" numa linha com o botão; clicar em texto do dialog e abrir o combobox; fechar                                                                              | dialog abre; nada navega para o detalhe                                                                                                                                |
| E1.8 | M    | `/tickets?tab=opened&periodo=todos`                                                                                                                                          | tabela de Meus chamados igual a antes (mesmas colunas)                                                                                                                 |

---

## Etapa 2 — `feat: let tickets start in the department queue`

`assigned_to` nulo passa a ser escolha explícita ("Fila de {setor}") e o padrão
do "Novo chamado". Status e frases **não** mudam nesta etapa.

### Tipos

`app/_lib/types/ticket.ts`:

```ts
export interface InsertTicketValues {
  title: string
  description: string
  type: TicketType
  tagId: number
  assigneeId: number | null // era number; null = fila
  createdBy: number
  originDepartmentId: number
}

export interface NewTicketFormDefaults {
  title: string
  description: string
  assigneeId: number | null // era assigneeId?: number; padrão null
}

export interface NewTicketFormAvailable {
  canCreate: true
  tags: TagOption[]
  assignees: AssigneeOption[]
  creatorName: string
  queueLabel: string // novo; "Fila de QA Suporte"
  defaults: NewTicketFormDefaults
}
```

`app/_lib/types/ticket-edit.ts`:

```ts
export interface TicketEditSource extends TicketEditSnapshot {
  id: number
  status: TicketStatus
  currentDepartmentName: string // novo; TicketDetail já tem
}

export interface TicketEditValues {
  // demais campos sem mudança
  assigneeId: number | null // era number
}

export interface TicketAssigneeChange {
  fromAssigneeId: number | null
  toAssigneeId: number | null // era number
}

export interface EditTicketFormDefaults {
  // demais campos sem mudança
  assigneeId?: number | null // ausente = sem seleção; null = fila
}

export interface TicketEditFormOptions {
  defaults: EditTicketFormDefaults
  tags: TagOption[]
  tagHint?: string
  assignees: AssigneeOption[]
  assigneeHint?: string
  queueLabel: string // novo
  includesSolution: boolean
}
```

`TicketDetail` continua satisfazendo `TicketEditSource` sem conversão.
`UpdateTicketByAuthorValues` herda `assigneeId: number | null`.

### Domínio

`app/_lib/domain/ticket-assignee.ts`:

```ts
export const queueAssigneeLabel: (departmentName: string) => string
export const describeTicketAssignee: (
  assigneeName: string | null,
  departmentName: string,
) => string
export const preselectedAssigneeId: (
  assigneeId: number | null,
  assignees: readonly AssigneeOption[],
) => number | null | undefined // era number | undefined
export const assigneeEditHintFor: (
  assigneeId: number | null,
  assignees: readonly AssigneeOption[],
) => string | undefined
// sai: MISSING_ASSIGNEE_HINT
```

| Nome                     | Semântica                                                                                    |
| ------------------------ | -------------------------------------------------------------------------------------------- |
| `queueAssigneeLabel`     | `Fila de ${departmentName}`. **A** fonte do texto, no combobox e no detalhe                  |
| `describeTicketAssignee` | `assigneeName ?? queueAssigneeLabel(departmentName)`. Valor da linha Destinatário do detalhe |
| `preselectedAssigneeId`  | `null` → `null` (fila); id na lista → o id; id fora da lista → `undefined` (sem seleção)     |
| `assigneeEditHintFor`    | `null` → `undefined`; id fora da lista → `UNAVAILABLE_ASSIGNEE_HINT`; na lista → `undefined` |

`app/_lib/domain/ticket.ts`:

```ts
export const buildNewTicketFormOptions: (
  author: TicketAuthorFacts,
  creator: TicketCreatorFacts,
  departmentName: string, // novo; setor do autor
  tags: readonly TagOption[],
  assignees: readonly AssigneeOption[],
) => NewTicketFormOptions
```

Bloqueado → igual a hoje. Liberado → `{ canCreate: true, tags, assignees,
creatorName: creator.name, queueLabel: queueAssigneeLabel(departmentName),
defaults: { title: "", description: "", assigneeId: null } }`. O autor deixa de
ser o padrão.

`app/_lib/domain/ticket-edit.ts`: `buildTicketEditFormOptions(ticket, tags,
assignees)` acrescenta `queueLabel: queueAssigneeLabel(ticket.currentDepartmentName)`;
`defaults.assigneeId` e `assigneeHint` seguem as funções acima. `diffTicketEdit`,
`hasTicketEditChanges` e `describeTicketEditNote` não mudam de código (nulo
contra nulo não é mudança; X para nulo é; a nota continua `Alterou
destinatário.`).

`app/_lib/domain/ticket-assignment.ts` (só textos):

| Função                             | Caso            | Texto novo                                                              |
| ---------------------------------- | --------------- | ----------------------------------------------------------------------- |
| `describeCurrentAssignee`          | `null`          | `Este chamado está na fila do setor.`                                   |
| `describeTicketAssignmentConflict` | nome atual nulo | `Este chamado voltou para a fila do setor. Confira a lista atualizada.` |

### Validação — `app/_lib/validation/ticket.ts`

```ts
export const createTicketSchema = z.object({
  title: ticketTitleSchema,
  description: ticketDescriptionSchema,
  type: ticketTypeSchema,
  tagId: registryIdSchema("Selecione a tag."),
  assigneeId: registryIdSchema("Selecione o destinatário.")
    .max(POSTGRES_INTEGER_MAX, { error: "Selecione o destinatário." })
    .nullable(),
})
export type CreateTicketInput = z.infer<typeof createTicketSchema> // assigneeId: number | null
```

`editTicketSchema` deriva e ganha o mesmo campo. `undefined`, string, `0`,
negativo, fracionário e acima de `integer` → `Selecione o destinatário.`;
`null` → fila.

### `df-data`

**`app/_lib/data/departments.ts` — `findDepartmentName` (novo)**

```ts
export async function findDepartmentName(
  departmentId: number,
): Promise<string | null>
```

`select name from department where id = $1 limit 1`. Não filtra `is_active`.

**`insertTicket` (alterado)** — passo do destinatário só quando
`values.assigneeId !== null` (sem leitura e sem trava de `users` na fila).
`assignedTo: values.assigneeId` e `criacao` com `toAssigneeId:
values.assigneeId` (nulos na fila). Status continua `INITIAL_TICKET_STATUS`
nesta etapa. Nenhuma `atribuicao`.

**`updateTicketByAuthor` (alterado)**

- Passo do destinatário escolhido só quando `values.assigneeId !== null`; nulo
  é sempre válido. Precedência e travas iguais nos demais casos.
- `update ticket`: `assignedTo: values.assigneeId` quando `changes.assignee`
  (pode gravar nulo).
- `atribuicao` quando `changes.assignee`: como hoje e, **quando
  `changes.assignee.toAssigneeId === null`**, também `toDepartmentId:
ticketRow.currentDepartmentId`. Ordem das linhas: `edicao` → `mudanca_tag`
  (se a tag mudou) → `atribuicao`.

`assignTicket` e `findTicketDetail` não mudam.

### `df-actions`

Nada além dos tipos: `createTicket` repassa `parsed.data.assigneeId` (agora
nulo-ável); `editTicket` já repassa `...parsed.data`. Mensagens, códigos e
revalidações iguais.

### `df-ui`

- **`AppTopBar`**: acrescentar `findDepartmentName(facts.departmentId)` ao
  `Promise.all` de tags e atribuíveis; nulo → `notFound()` (como `facts`
  nulo); chamar `buildNewTicketFormOptions(facts, actor, departmentName, tags,
assignees)`.
- **`TicketAssigneeField`** (`app/(app)/_components/ticket-assignee-field.tsx`):
  prop opcional `queueLabel?: string`. Com ela, a primeira opção é a fila
  (rótulo `queueLabel`, valor de formulário `null`); sem ela, comportamento de
  hoje (o "Enviar" não passa). Valor aceito `number | null | undefined`,
  `onChange` entrega `number | null`. A codificação interna para o `Combobox`
  (que só aceita `string | number`) é do `df-ui`; nenhum sentinela chega ao
  formulário nem à action.
- **`NewTicketDialog`**: passa `queueLabel={options.queueLabel}`; abre e volta
  (depois de enviar ou fechar) com a fila selecionada (`options.defaults`).
- **Modo de edição**: o contexto (`use-ticket-edit.ts`) expõe `queueLabel`;
  `TicketEditAssignee` o repassa ao campo. Fila pré-selecionada em chamado com
  destinatário nulo, sem dica.
- **Detalhe** (`ticket-detail-fields.tsx`): Destinatário =
  `describeTicketAssignee(ticket.assigneeName, ticket.currentDepartmentName)`.
- Fila do setor e "Enviar": nada (a dica e o conflito vêm do domínio).

### Textos — etapa 2

| Onde                                   | Texto                                                                             |
| -------------------------------------- | --------------------------------------------------------------------------------- |
| Opção do combobox / detalhe            | `Fila de {setor}`                                                                 |
| Dica do "Enviar" com destinatário nulo | `Este chamado está na fila do setor.`                                             |
| Conflito com destinatário nulo         | `Este chamado voltou para a fila do setor. Confira a lista atualizada.`           |
| Sai                                    | `Este chamado ainda não tem destinatário. Escolha uma pessoa ativa do seu setor.` |

### Cenários do `df-qa` — etapa 2

Preparação: como M, criar pelo "Novo chamado" (tag `[QA] Acesso`):
`[QA] Fila padrão` com o padrão → `#N1`; `[QA] Fila para mim` com `QA Membro
Suporte` → `#N2`; `[QA] Fila para o admin` com `QA Admin Suporte` → `#N3`.

| #     | Quem        | Ação                                                                                                                                                       | Esperado                                                                                                                                                                                                                                                                                                             |
| ----- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E2.1  | M           | abrir "Novo chamado"; abrir o combobox Destinatário; buscar `fila`                                                                                         | Destinatário com `Fila de QA Suporte` selecionado; opções: `Fila de QA Suporte` primeiro, depois os ativos de QA Suporte em ordem de nome; a busca deixa só a fila                                                                                                                                                   |
| E2.2  | M           | criar `#N1` (preparação); conferir o payload da action                                                                                                     | `assigneeId: null`; toast `Chamado #N1 criado.`                                                                                                                                                                                                                                                                      |
| E2.3  | banco       | depois da preparação                                                                                                                                       | `#N1`: `assigned_to` nulo, `criacao` com `to_assignee_id` nulo, nenhuma `atribuicao`. `#N2`: `assigned_to = M`. `#N3`: `assigned_to = A`                                                                                                                                                                             |
| E2.4  | M           | reabrir "Novo chamado" depois de criar; fechar com "Cancelar" e reabrir                                                                                    | as duas vezes com `Fila de QA Suporte` selecionado                                                                                                                                                                                                                                                                   |
| E2.5  | M           | abrir `/tickets/N1`, `/tickets/65` e `/tickets/<[QA] Janela aberta>`                                                                                       | Destinatário `Fila de QA Suporte` nos três (nenhum `—`)                                                                                                                                                                                                                                                              |
| E2.6  | M           | do dialog, forjar `assigneeId` ausente; `"fila"`; `0`; `1e12`                                                                                              | os quatro: `Selecione o destinatário.` (`INVALID_INPUT`); nada gravado                                                                                                                                                                                                                                               |
| E2.7  | M           | do dialog, forjar `assigneeId` = `D` (Diretoria)                                                                                                           | `Este destinatário não está disponível. Escolha uma pessoa ativa do seu setor.` no campo; nada gravado                                                                                                                                                                                                               |
| E2.8  | M           | `/tickets/N2` → "Editar"                                                                                                                                   | combobox com `QA Membro Suporte` selecionado e `Fila de QA Suporte` como primeira opção; nenhuma dica                                                                                                                                                                                                                |
| E2.9  | M           | trocar só o destinatário para `Fila de QA Suporte` → salvar                                                                                                | toast `Chamado #N2 atualizado.`; Destinatário `Fila de QA Suporte`                                                                                                                                                                                                                                                   |
| E2.10 | banco       | depois do E2.9                                                                                                                                             | `#N2`: `assigned_to` nulo. Linhas novas com o mesmo `changed_at`: `edicao` (`note = 'Alterou destinatário.'`) e, com `id` maior, `atribuicao` com `from_assignee_id = M`, `to_assignee_id` nulo, `to_department_id = S`, `changed_by = M` (a `mudanca_status` que vem depois é da etapa 4, cenário E4.5 e seguintes) |
| E2.11 | M           | `/tickets/N1` → "Editar": mudar só o título → salvar                                                                                                       | combobox começou em `Fila de QA Suporte`, sem dica; nota `Alterou título.`; nenhuma `atribuicao` nova                                                                                                                                                                                                                |
| E2.12 | M           | `/tickets/<[QA] Janela aberta>` → "Editar" → "Cancelar"                                                                                                    | combobox em `Fila de QA Suporte`, sem dica; nada gravado                                                                                                                                                                                                                                                             |
| E2.13 | M           | do modo de edição do `#N1`, forjar `assigneeId` = `D`; depois `null` com o título alterado                                                                 | o primeiro: `INVALID_ASSIGNEE` no campo; nada gravado. O segundo: salvo (fila sempre válida)                                                                                                                                                                                                                         |
| E2.14 | M           | `/queue`, filtro `Sem destinatário`                                                                                                                        | `#N1` e `#N2` listados                                                                                                                                                                                                                                                                                               |
| E2.15 | A           | `/queue`: "Enviar" no `#N1`                                                                                                                                | dica `Este chamado está na fila do setor.`; opções só pessoas (sem `Fila de …`). Fechar sem enviar                                                                                                                                                                                                                   |
| E2.16 | Diretor e M | Diretor abre `/queue?setor=S` com `#N3` atribuído a A; M devolve `#N3` à fila pelo "Editar"; o Diretor, sem recarregar, envia `#N3` para QA Membro Suporte | o Diretor recebe `Este chamado voltou para a fila do setor. Confira a lista atualizada.`, o dialog fecha e a lista recarrega; nenhuma linha nova da tentativa dele                                                                                                                                                   |

---

## Etapa 3 — `feat: allow assuming only queued tickets`

Só domínio. "Já assumido" passa a ser "tem destinatário".

### Domínio — `app/_lib/domain/ticket-assignment.ts`

```ts
export const isTicketTaken: (ticket: TicketVisibilityFacts) => boolean
```

| Antes                                             | Depois                |
| ------------------------------------------------- | --------------------- |
| `assignedTo !== null && assignedTo !== createdBy` | `assignedTo !== null` |

`ticketAssumeBlockFor` mantém a ordem; o motivo 8 (`ALREADY_TAKEN`) passa a
valer para todo chamado com destinatário que não seja quem clica (o 7,
`ALREADY_ASSIGNEE`, continua antes). `ticketSendBlockFor`, `canSendTicket` e
`queueRowActionsFor` não mudam: "Enviar" continua redistribuindo qualquer
chamado atribuível.

### `df-data`, `df-actions`, `df-ui`

Nada. `assignTicket` já decide por `ticketAssumeBlockFor`; os botões já saem de
`queueRowActionsFor`.

### Cenários do `df-qa` — etapa 3

Preparação: como M, criar `[QA] Assumir fila` (padrão) → `#T1`; `[QA] Assumir
do autor` (destinatário `QA Membro Suporte`) → `#T2`; `[QA] Assumir do admin`
(destinatário `QA Admin Suporte`) → `#T3`.

| #    | Quem    | Ação                                                                                            | Esperado                                                                                                           |
| ---- | ------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| E3.1 | A       | `/queue`, linhas `#T1`, `#T2`, `#T3`                                                            | `#T1`: "Assumir" e "Enviar". `#T2`: **só** "Enviar" (destinatário = autor conta como assumido). `#T3`: só "Enviar" |
| E3.2 | M       | `/queue`, as mesmas linhas                                                                      | `#T1`: "Assumir" (membro do setor, chamado na fila). `#T2` e `#T3`: nenhum botão                                   |
| E3.3 | A       | request de `assumeTicket` para `#T2` com `expectedAssigneeId = M`                               | `{ ok: false, code: "FORBIDDEN", message: "Não é possível assumir este chamado agora." }`; nada gravado            |
| E3.4 | A       | "Assumir" no `#T1`                                                                              | toast `Você assumiu o chamado #T1.`; a linha fica só com "Enviar"; no banco, `atribuicao` de nulo para `A`         |
| E3.5 | Diretor | `/queue` (Diretoria): linhas com destinatário                                                   | nenhuma linha com destinatário mostra "Assumir"; só as de `Sem destinatário` (se houver). **Não clicar**           |
| E3.6 | M       | `/tickets/T2` → "Editar" → destinatário `Fila de QA Suporte` → salvar; depois, como A, `/queue` | `#T2` passa a ter "Assumir" para A                                                                                 |

---

## Etapa 4 — `feat: move ticket status along with its assignee`

Regra pura de status por atribuição, usada na criação, no "Assumir", no
"Enviar" e no "Editar".

### Tipos — `app/_lib/types/ticket-assignment.ts`

```ts
export type TicketAssigneeTarget = "queue" | "actor" | "colleague"
```

### Domínio — `app/_lib/domain/ticket-assignment.ts`

```ts
export const assigneeTargetFor: (
  actorId: number,
  assigneeId: number | null,
) => TicketAssigneeTarget
export const creationStatusFor: (target: TicketAssigneeTarget) => TicketStatus
export const isAssignmentDrivenStatus: (status: TicketStatus) => boolean
export const statusAfterReassignment: (
  current: TicketStatus,
  target: TicketAssigneeTarget,
) => TicketStatus
```

| Nome                       | Semântica                                                                                                  |
| -------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `assigneeTargetFor`        | `null` → `queue`; `assigneeId === actorId` → `actor`; outro → `colleague`                                  |
| `creationStatusFor`        | tabela abaixo, `satisfies Record<TicketAssigneeTarget, TicketStatus>`                                      |
| `isAssignmentDrivenStatus` | tabela privada `satisfies Record<TicketStatus, boolean>`: `aberto`, `em_andamento`, `encaminhado` → `true` |
| `statusAfterReassignment`  | `!isAssignmentDrivenStatus(current)` → `current`; senão a tabela de reatribuição                           |

| Alvo        | Criação (`creationStatusFor`) | Reatribuição (`statusAfterReassignment`, status movível) |
| ----------- | ----------------------------- | -------------------------------------------------------- |
| `queue`     | `aberto`                      | `encaminhado`                                            |
| `actor`     | `em_andamento`                | `em_andamento`                                           |
| `colleague` | `encaminhado`                 | `encaminhado`                                            |

Status movíveis (status novo no enum quebra o `tsc` até ser classificado):

| `aberto` | `em_analise` | `encaminhado` | `aguardando_aprovacao` | `em_andamento` | `resolvido` | `fechado` | `cancelado` |
| -------- | ------------ | ------------- | ---------------------- | -------------- | ----------- | --------- | ----------- |
| sim      | não          | sim           | não                    | sim            | não         | não       | não         |

`app/_lib/domain/ticket.ts`: **sai** `INITIAL_TICKET_STATUS`. Usos que
deixam de compilar: `insertTicket` e o seed de QA (`db/seed.ts`, chamados da
janela de resolução, criados sem destinatário). `INITIAL_TICKET_PRIORITY` fica.

### `df-data` — `app/_lib/data/tickets.ts`

Em toda gravação: o status vem **só** do domínio; o SQL não repete a tabela.
`mudanca_status` usa o mesmo `changed_at` da `atribuicao` e é inserida
**depois** dela (`id` maior), com `changed_by` = quem agiu, `from_status` e
`to_status`; demais colunas nulas.

**`insertTicket`** — `status = creationStatusFor(assigneeTargetFor(values.createdBy,
values.assigneeId))`, no `insert into ticket` e no `to_status` da `criacao`.
Nenhuma `mudanca_status` na criação.

**`updateTicketByAuthor`** — só se `changes.assignee`:
`nextStatus = statusAfterReassignment(ticketRow.status,
assigneeTargetFor(authorId, values.assigneeId))`. Se `nextStatus !==
ticketRow.status`: `status: nextStatus` no mesmo `update ticket` e uma
`mudanca_status` (`from_status = ticketRow.status`, `to_status = nextStatus`).
Ordem das linhas: `edicao` → `mudanca_tag` → `atribuicao` → `mudanca_status`.
Outcome igual.

**`assignTicket`** — depois de decidir o novo destinatário (passo 7):
`nextStatus = statusAfterReassignment(ticketRow.status,
assigneeTargetFor(actorId, newAssigneeId))`. Se mudou: `status: nextStatus` no
mesmo `update ticket` (que hoje grava só `assigned_to` e `updated_at`) e uma
`mudanca_status` depois da `atribuicao`. Outcome igual.

### `df-data` — `db/seed.ts`

Os chamados de QA da janela de resolução nascem sem destinatário: trocar
`INITIAL_TICKET_STATUS` por `creationStatusFor("queue")` (`aberto`) no
`to_status` da `criacao` e no `from_status` da `resolucao`. Mesmo valor de
hoje; nenhuma linha nova.

### `df-actions`, `df-ui`

Nada. As revalidações de hoje já cobrem as telas que mostram status (detalhe,
`/tickets`, `/queue`); o Início não lê status. O badge e a frase de
`mudanca_status` já existem.

### Cenários do `df-qa` — etapa 4

Preparação: como M, criar `[QA] Status fila` (padrão) → `#S1`; `[QA] Status
para mim` (destinatário M) → `#S2`; `[QA] Status para colega` (destinatário A)
→ `#S3`. "Linhas novas" = linhas de `ticket_history` do chamado com `id` acima
do anotado antes do passo.

| #     | Quem  | Ação                                                                                                                            | Esperado                                                                                                                                                                  |
| ----- | ----- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E4.1  | banco | depois da preparação                                                                                                            | `#S1` `aberto`, `#S2` `em_andamento`, `#S3` `encaminhado`; cada um com **uma** linha, `criacao`, `to_status` igual ao status do chamado; nenhuma `mudanca_status`         |
| E4.2  | M     | `/tickets/S1`, `/tickets/S2`, `/tickets/S3`; Meus chamados → Abertos por mim                                                    | badges `Aberto`, `Em andamento`, `Encaminhado`; os três em Abertos por mim                                                                                                |
| E4.3  | A     | "Assumir" no `#S1`                                                                                                              | badge `Em andamento`. Linhas novas, mesmo `changed_at`: `atribuicao` (nulo → `A`) e, com `id` maior, `mudanca_status` (`aberto` → `em_andamento`), ambas `changed_by = A` |
| E4.4  | A     | "Enviar" o `#S1` para QA Membro Suporte                                                                                         | `encaminhado`; linhas novas `atribuicao` (`A` → `M`) e `mudanca_status` (`em_andamento` → `encaminhado`)                                                                  |
| E4.5  | M     | `/tickets/S1` → "Editar" → `Fila de QA Suporte` → salvar                                                                        | continua `encaminhado`; linhas novas `edicao` e `atribuicao` (`M` → nulo); **nenhuma** `mudanca_status`                                                                   |
| E4.6  | A     | "Enviar" o `#S1` (na fila) escolhendo `QA Admin Suporte`                                                                        | `em_andamento` (envio para si conta como assumir); linhas novas `atribuicao` (nulo → `A`) e `mudanca_status` (`encaminhado` → `em_andamento`)                             |
| E4.7  | M     | `/tickets/S3` (A, `encaminhado`) → "Editar" → `QA Membro Suporte` → salvar                                                      | `em_andamento`; linhas novas na ordem `edicao`, `atribuicao` (`A` → `M`), `mudanca_status` (`encaminhado` → `em_andamento`), mesmo `changed_at`                           |
| E4.8  | M     | `/tickets/S2` (M, `em_andamento`) → "Editar" → `QA Admin Suporte` + título novo → salvar                                        | `encaminhado`; nota `Alterou título e destinatário.`; ordem `edicao`, `atribuicao`, `mudanca_status`                                                                      |
| E4.9  | M     | `/tickets/S2` → "Editar" → trocar a tag e o destinatário para `QA Membro Suporte` → salvar                                      | `em_andamento`; ordem `edicao`, `mudanca_tag`, `atribuicao`, `mudanca_status`                                                                                             |
| E4.10 | M     | `/tickets/<[QA] Janela aberta>` (`resolvido`) → "Editar" → `QA Membro Suporte` → salvar; depois devolver à `Fila de QA Suporte` | status continua `resolvido` nas duas; linhas `edicao` e `atribuicao` em cada uma, **nenhuma** `mudanca_status`                                                            |
| E4.11 | A     | "Enviar" o `#S2` (M, `em_andamento`) escolhendo `QA Admin Suporte`                                                              | continua `em_andamento` (o alvo é quem agiu, e o status calculado é igual ao atual); linha nova só `atribuicao` (`M` → `A`), **nenhuma** `mudanca_status`                 |
| E4.12 | banco | `select status, count(*) from ticket where id in (65, 66, 67, 68) group by status` antes e depois da bateria                    | inalterado (nenhuma migração; chamados antigos só mudam se alguém os reatribuir)                                                                                          |

---

## Etapa 5 — `feat: show who forwarded each ticket in the timeline`

Frases novas de `criacao` e `atribuicao`, com o setor **atual** de quem agiu.

### Tipos — `app/_lib/types/ticket.ts`

```ts
export interface TicketHistoryEntry {
  // demais campos sem mudança
  changedByDepartmentName: string | null // novo; setor atual de quem agiu
}
```

### Domínio — `app/_lib/domain/ticket-history.ts`

```ts
export const describeHistoryEntry: (entry: TicketHistoryEntry) => string // frases de criacao e atribuicao mudam
export const historyEntryNamesActor: (
  entry: Pick<TicketHistoryEntry, "event">,
) => boolean // novo
```

`{user}` = `describeHistoryActor(entry)` (nome, ou `Sistema`); `{setor de quem
agiu}` = `changedByDepartmentName`; `{nome}` = `toAssigneeName`. A
classificação compara **ids** (`toAssigneeId` × `changedById`), nunca nomes.
Sai o helper `assignedToSomeoneElse`.

**`criacao`**

| Caso                           | Frase                                                                                  |
| ------------------------------ | -------------------------------------------------------------------------------------- |
| `toAssigneeId` nulo            | `{user} abriu o chamado em {toDepartmentName}.` (sem setor: `{user} abriu o chamado.`) |
| `toAssigneeId === changedById` | `{user} abriu e assumiu o chamado.`                                                    |
| outro                          | `{user} do setor {setor de quem agiu} abriu o chamado e o encaminhou para {nome}.`     |

**`atribuicao`**

| Caso                                              | Frase                                                                              |
| ------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `toAssigneeId !== null` e `=== changedById`       | `{user} assumiu o chamado.`                                                        |
| `toAssigneeId !== null`, outra pessoa             | `{user} do setor {setor de quem agiu} encaminhou o chamado para {nome}.`           |
| `toAssigneeId` nulo e `fromAssigneeName` presente | `{user} devolveu o chamado à fila de {toDepartmentName}.` (sem setor: `… à fila.`) |
| os dois nulos                                     | `{user} alterou o destinatário.`                                                   |

Variações: sem `changedByDepartmentName`, omitir ` do setor {setor}`; sem
`toAssigneeName` no encaminhamento, `{user} encaminhou o chamado.` (ou `{user}
abriu o chamado e o encaminhou.`). Rótulos (`Abertura`, `Atribuição`) e as
demais frases, inclusive `mudanca_status`, não mudam.

`historyEntryNamesActor`: tabela privada `satisfies Record<HistoryEvent,
boolean>` com `criacao` e `atribuicao` → `true`, demais → `false`.

### `df-data` — `findTicketDetail` (alterado)

Na consulta do histórico, `leftJoin` de um alias de `department` (ex.:
`history_changer_department`) em `changer.department_id` e
`changedByDepartmentName: changerDepartment.name`. Nada mais muda. O setor é o
**atual** da pessoa, por decisão do usuário.

### `df-ui` — linha do tempo (`ticket-timeline.tsx`)

- Frase: continua `describeHistoryEntry(entry)`.
- **Decisão a tomar — nome repetido.** Recomendação do arquiteto: quando
  `historyEntryNamesActor(entry)`, a linha de cima mostra só a data/hora (sem
  `{nome} ·`); nos demais eventos, como hoje. Se o `df-ui` preferir manter a
  repetição, reporta e a função sai do domínio.

### Cenários do `df-qa` — etapa 5

Preparação: como M, criar `[QA] Linha fila` (padrão) → `#L1`; `[QA] Linha para
mim` (M) → `#L2`; `[QA] Linha para colega` (A) → `#L3`. Anotar o nome do
Diretor (`{D}`).

| #     | Quem        | Ação                                                                                                                                                                                                                                                     | Esperado (frase do item)                                                                                                                                                                            |
| ----- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E5.1  | M           | `/tickets/L1`, `/tickets/L2`, `/tickets/L3`, item Abertura                                                                                                                                                                                               | `QA Membro Suporte abriu o chamado em QA Suporte.` / `QA Membro Suporte abriu e assumiu o chamado.` / `QA Membro Suporte do setor QA Suporte abriu o chamado e o encaminhou para QA Admin Suporte.` |
| E5.2  | A           | "Assumir" no `#L1`; abrir `/tickets/L1`                                                                                                                                                                                                                  | Atribuição `QA Admin Suporte assumiu o chamado.`, seguida de Mudança de status `Alterou o status de Aberto para Em andamento.`                                                                      |
| E5.3  | A           | "Enviar" o `#L1` para QA Membro Suporte                                                                                                                                                                                                                  | `QA Admin Suporte do setor QA Suporte encaminhou o chamado para QA Membro Suporte.` + `Alterou o status de Em andamento para Encaminhado.`                                                          |
| E5.4  | M           | `/tickets/L1` → "Editar" → `Fila de QA Suporte` → salvar                                                                                                                                                                                                 | Edição (nota `Alterou destinatário.`) e Atribuição `QA Membro Suporte devolveu o chamado à fila de QA Suporte.`                                                                                     |
| E5.5  | M           | `/tickets/L3` → "Editar" → `QA Membro Suporte` → salvar                                                                                                                                                                                                  | `QA Membro Suporte assumiu o chamado.` + `Alterou o status de Encaminhado para Em andamento.`                                                                                                       |
| E5.6  | Diretor     | `/queue?setor=S` → "Enviar" o `#L1` (na fila) para QA Admin Suporte                                                                                                                                                                                      | `{D} do setor Diretoria encaminhou o chamado para QA Admin Suporte.`                                                                                                                                |
| E5.7  | M           | abrir um chamado antigo com `atribuicao` de uma pessoa para outra (consultar `select ticket_id from ticket_history where event = 'atribuicao' and from_assignee_id is not null and to_assignee_id is not null and to_assignee_id <> changed_by limit 1`) | a linha lê `… do setor … encaminhou o chamado para …` (frase montada na leitura, risco 7 do plano)                                                                                                  |
| E5.8  | M           | os mesmos detalhes, itens Abertura e Atribuição × Edição, Resolução                                                                                                                                                                                      | conforme a decisão do `df-ui`: com a recomendação, Abertura e Atribuição mostram só a data/hora na linha de cima; os demais `{nome} · {data/hora}`                                                  |
| E5.9  | Diretor e M | (opcional) Diretor move A para QA Infra; M abre `/tickets/L1`; Diretor devolve A a QA Suporte                                                                                                                                                            | enquanto movido, as linhas de A dizem `do setor QA Infra` (setor atual); depois voltam a `QA Suporte`. Se não puder coordenar, registrar como não executado                                         |
| E5.10 | M           | `#65` e um chamado com Edição/Resolução                                                                                                                                                                                                                  | demais frases iguais a antes (`Editou o chamado.`, `Resolveu o chamado.`, `Alterou o status …`)                                                                                                     |

---

## Etapa 6 — `feat: let authors edit their comments`

O autor edita o texto do próprio comentário enquanto o chamado aceita
comentários. Grava só `message` (`content`, `updated_at`).

### Tipos — `app/_lib/types/ticket-comments.ts`

```ts
export interface TicketMessageItem {
  id: number
  authorId: number // novo
  authorName: string
  content: string
  visibility: MessageVisibility
  createdAt: Date
  updatedAt: Date // novo
}

export interface TicketMessageAuthorFacts {
  authorId: number
}

export interface TicketMessageVisibilityFacts extends TicketMessageAuthorFacts {
  visibility: MessageVisibility
}

export interface TicketMessageTimestamps {
  createdAt: Date
  updatedAt: Date
}

export type TicketCommentEditBlockReason =
  TicketCommentBlockReason | "NOT_COMMENT_AUTHOR"

export interface UpdateTicketMessageValues {
  ticketId: number
  messageId: number
  editorId: number
  content: string
}

export type UpdateTicketMessageOutcome =
  | TicketMessageSaved
  | TicketNotFound // de types/ticket-edit.ts
  | TicketNotEditable // de types/ticket-edit.ts
  | TicketNoChanges // de types/ticket-edit.ts

export interface EditTicketCommentFormDefaults {
  ticketId: number
  messageId: number
  content: string
}
```

`TicketMessageItem` satisfaz `TicketMessageVisibilityFacts` e
`TicketMessageTimestamps` sem conversão.

### Domínio — `app/_lib/domain/ticket-comments.ts`

```ts
export const EDIT_COMMENT_LABEL // "Editar"
export const SAVE_COMMENT_LABEL // "Salvar"
export const SAVE_COMMENT_PENDING_LABEL // "Salvando…"
export const EDITED_COMMENT_LABEL // "(editado)"
export const TICKET_COMMENT_EDITED_MESSAGE // "Comentário atualizado."

export const canSeeTicketMessage: (
  viewer: TicketViewerFacts,
  ticket: Pick<TicketVisibilityFacts, "currentDepartmentId">,
  message: TicketMessageVisibilityFacts,
) => boolean
export const ticketCommentEditBlockFor: (
  editor: TicketActorFacts,
  ticket: TicketCommentFacts,
  message: TicketMessageAuthorFacts,
  now: Date,
) => TicketCommentEditBlockReason | null
export const canEditTicketComment: (
  editor: TicketActorFacts,
  ticket: TicketCommentFacts,
  message: TicketMessageAuthorFacts,
  now: Date,
) => boolean
export const isTicketMessageEdited: (
  message: TicketMessageTimestamps,
) => boolean
export const buildEditTicketCommentFormDefaults: (
  ticketId: number,
  message: Pick<TicketMessageItem, "id" | "content">,
) => EditTicketCommentFormDefaults
```

| Nome                                 | Semântica                                                                                                                                                                             |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `canSeeTicketMessage`                | `!isPrivateMessage(visibility)` **ou** `canSeeInternalComments(viewer, ticket)` **ou** `authorId === viewer.userId`. É a regra que `TicketMessageScope` já traduz em SQL na lista     |
| `ticketCommentEditBlockFor`          | Primeiro `ticketCommentBlockFor(editor, ticket, now)` (inativo, troca de senha, `CANNOT_VIEW`, `TICKET_FINISHED`); depois `message.authorId !== editor.userId` → `NOT_COMMENT_AUTHOR` |
| `canEditTicketComment`               | `ticketCommentEditBlockFor(...) === null`. **A** regra do botão e da transação                                                                                                        |
| `isTicketMessageEdited`              | `updatedAt.getTime() !== createdAt.getTime()`. Na criação as duas colunas recebem o mesmo `now()` da transação                                                                        |
| `buildEditTicketCommentFormDefaults` | `{ ticketId, messageId: message.id, content: message.content }`                                                                                                                       |

### Validação — `app/_lib/validation/ticket-comments.ts`

```ts
export const editTicketCommentSchema // z.object({ ticketId, messageId, content })
export type EditTicketCommentInput = z.infer<typeof editTicketCommentSchema>
// { ticketId: number; messageId: number; content: string }
```

| Campo       | Regra                                                     | Mensagem                                                                        |
| ----------- | --------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `ticketId`  | `ticketIdSchema`                                          | `Chamado inválido.`                                                             |
| `messageId` | `registryIdSchema(...).max(POSTGRES_INTEGER_MAX, ...)`    | `Comentário inválido.`                                                          |
| `content`   | `ticketCommentContentSchema` (o mesmo da criação; `trim`) | `Escreva o comentário.` / `O comentário precisa ter no máximo 5000 caracteres.` |

Sem `isPrivate`: a visibilidade não é editável, e a chave enviada por cliente
forjado é descartada pelo `z.object`.

### `df-data` — `app/_lib/data/ticket-messages.ts`

**`listTicketMessages` (alterado)** — selecionar também `authorId:
message.userId` e `updatedAt: message.updatedAt`. Filtro e ordem iguais.

**`updateTicketMessage` (novo)**

```ts
export async function updateTicketMessage(
  values: UpdateTicketMessageValues,
): Promise<UpdateTicketMessageOutcome>
```

Uma transação, nesta ordem:

1. **Chamado** — `created_by, assigned_to, current_department_id, status,
resolved_at` de `ticket` `for share`. Sem linha → `not_found`.
2. `now = new Date()` uma vez.
3. **Quem edita** — `users ⋈ department` `for share of users` (mesma leitura de
   `insertTicketMessage`). Sem linha → `not_editable`. Monta `TicketActorFacts`.
4. `!canViewTicket(editor, ticketRow)` → `not_found`.
5. **Comentário** — `select user_id, content, visibility from message where id
= $messageId and ticket_id = $ticketId for update`. Sem linha → `not_found`.
6. `!canSeeTicketMessage(editor, ticketRow, { authorId: row.userId,
visibility: row.visibility })` → `not_found`.
7. `ticketCommentEditBlockFor(editor, ticketRow, { authorId: row.userId }, now)`
   não nulo → `not_editable`.
8. `values.content === row.content` → `no_changes` (nada gravado).
9. `update message set content = $content, updated_at = now where id =
$messageId`. Nada em `ticket`, `ticket_history` nem `attachment`.
10. `{ status: "saved", ticketId, messageId }`.

- **Precedência**: `not_found` (chamado) → `not_editable` (sem linha de quem
  edita) → `not_found` (chamado invisível) → `not_found` (comentário
  inexistente, de outro chamado ou invisível) → `not_editable` (regra) →
  `no_changes`.
- **Travas, nesta ordem**: `ticket` (`for share`) → `users` (`for share`) →
  `message` (`for update`). Mesma ordem de `insertTicketMessage`. Resolução e
  edição do chamado (`for update` em `ticket`) esperam; o cron
  (`for update skip locked`) pula o chamado e o fecha na execução seguinte;
  uma edição que começa depois de a janela vencer é recusada pelo passo 7.
- **Regra fora da data layer**: autoria, visibilidade e janela vêm do domínio.

### `df-actions` — `app/_lib/actions/ticket-comments.ts` (acrescido)

```ts
export type EditTicketCommentErrorCode =
  "INVALID_INPUT" | "FORBIDDEN" | "NOT_FOUND" | "NO_CHANGES"

export interface EditTicketCommentSuccess {
  ok: true
  message: string
}

export interface EditTicketCommentFailure {
  ok: false
  message: string
  code?: EditTicketCommentErrorCode
}

export type EditTicketCommentResult =
  EditTicketCommentSuccess | EditTicketCommentFailure

export const editTicketComment: (
  input: EditTicketCommentInput,
) => Promise<EditTicketCommentResult>
```

Forma igual à de `addTicketComment`: `getSession()` → `safeParse` →
`updateTicketMessage({ ...parsed.data, editorId: actor.id })` em `try/catch` →
mapeamento (`satisfies Record<…, EditTicketCommentFailure>`) → `saved`:
`revalidatePath(ticketDetailPath(outcome.ticketId))` e
`TICKET_COMMENT_EDITED_MESSAGE`.

| Situação       | `code`          | Mensagem                                                                                                       |
| -------------- | --------------- | -------------------------------------------------------------------------------------------------------------- |
| sem sessão     | `FORBIDDEN`     | `Você não tem permissão para editar este comentário.`                                                          |
| schema         | `INVALID_INPUT` | primeira mensagem do Zod                                                                                       |
| `not_found`    | `NOT_FOUND`     | `Comentário não encontrado.`                                                                                   |
| `not_editable` | `FORBIDDEN`     | `Você não pode editar este comentário.`                                                                        |
| `no_changes`   | `NO_CHANGES`    | `Nenhuma alteração para salvar.`                                                                               |
| exceção        | —               | `Não foi possível salvar o comentário agora. Tente novamente.` (`console.error("[editTicketComment]", error)`) |

Quem edita **nunca** vem do cliente. Sem e-mail. Só o detalhe é revalidado
(Meus chamados e a Fila não mostram comentários).

### `df-ui`

- **`page.tsx`**: para cada mensagem, `canEditTicketComment(actor, ticket,
message, now)` com o mesmo `now` da página; o resultado chega ao item como
  booleano (forma do dado é do `df-ui`; a UI não repete a condição).
- **Item da lista**: depois da data/hora, `EDITED_COMMENT_LABEL` em texto
  discreto quando `isTicketMessageEdited(message)`. Selo `Privado` como hoje.
- **Item editável**: botão `EDIT_COMMENT_LABEL` (pequeno, discreto, ícone
  `lucide-react` opcional). Ao clicar, o texto vira um formulário em linha:
  React Hook Form + `zodResolver(editTicketCommentSchema)`, `defaultValues =
buildEditTicketCommentFormDefaults(ticketId, message)`; `Textarea` com foco;
  botões `Cancelar` e `SAVE_COMMENT_LABEL` (`SAVE_COMMENT_PENDING_LABEL` durante
  o envio). Um comentário em edição por vez (recomendação).
- Resultado do `editTicketComment`:
  - `ok` → `toast.success(message)`, sai da edição (a revalidação traz o texto
    novo e o "(editado)").
  - `INVALID_INPUT` → `setError("content", …, { shouldFocus: true })`.
  - `NO_CHANGES` → `toast.info(message)`, sai da edição (como o "Editar" do
    chamado).
  - `FORBIDDEN`, `NOT_FOUND` → `toast.error(message)`, sai da edição,
    `router.refresh()`.
  - sem código → `toast.error(message)`, continua editando com o texto.
- `Cancelar` descarta e volta ao texto salvo, sem request.
- O formulário de novo comentário não muda. Componentes cliente não importam
  `app/_lib/data`, `app/_lib/auth`, `@/db/*` nem `drizzle-orm`.

### Textos — etapa 6

| Onde            | Texto                                                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Botões          | `Editar`, `Cancelar`, `Salvar` / `Salvando…`                                                                                   |
| Marca           | `(editado)`                                                                                                                    |
| Sucesso         | `Comentário atualizado.`                                                                                                       |
| Sem mudança     | `Nenhuma alteração para salvar.`                                                                                               |
| Recusas         | `Comentário não encontrado.` / `Você não pode editar este comentário.` / `Você não tem permissão para editar este comentário.` |
| Erro inesperado | `Não foi possível salvar o comentário agora. Tente novamente.`                                                                 |
| Validação       | `Comentário inválido.` (id forjado) e as mensagens de conteúdo de hoje                                                         |

### Cenários do `df-qa` — etapa 6

Preparação: como M, criar `[QA] Comentários editáveis` (padrão) → `#K`; em
`#K`, M publica `[QA] Público do membro` e, privado, `[QA] Privado do membro`;
A publica `[QA] Público do admin`. Anotar os ids das três mensagens (`m1`,
`m2`, `a1`) e `max(id)` de `message` e `ticket_history`.

| #     | Quem                      | Ação                                                                                                                                                                                                                                         | Esperado                                                                                                                                                                                                        |
| ----- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E6.1  | M                         | `/tickets/K`                                                                                                                                                                                                                                 | "Editar" só em `m1` e `m2`; nenhum "(editado)"                                                                                                                                                                  |
| E6.2  | M                         | "Editar" em `m1`; apagar tudo → "Salvar"; 5001 caracteres → "Salvar"                                                                                                                                                                         | textarea com o texto atual e foco; `Escreva o comentário.`; `O comentário precisa ter no máximo 5000 caracteres.`; nenhum request de action                                                                     |
| E6.3  | M                         | texto `  [QA] Público do membro editado  ` → "Salvar"                                                                                                                                                                                        | toast `Comentário atualizado.`; o item mostra o texto sem os espaços das pontas e `(editado)`; continua na mesma posição; sem selo                                                                              |
| E6.4  | banco                     | depois do E6.3                                                                                                                                                                                                                               | `message` `m1`: `content` novo, `visibility = publica`, `created_at` igual, `updated_at > created_at`; `max(id)` de `message` e de `ticket_history` iguais aos anotados; `ticket.updated_at` do `#K` inalterado |
| E6.5  | M                         | "Editar" em `m1` → "Salvar" sem mudar                                                                                                                                                                                                        | `Nenhuma alteração para salvar.`; sai da edição; `updated_at` de `m1` igual ao do E6.4                                                                                                                          |
| E6.6  | M                         | "Editar" em `m2`, alterar, "Cancelar"                                                                                                                                                                                                        | texto original de volta; nenhum request; nada gravado                                                                                                                                                           |
| E6.7  | M                         | editar `m2` → `[QA] Privado do membro editado`                                                                                                                                                                                               | salvo; continua com o selo `Privado` e ganha `(editado)`; no banco `visibility = interna`                                                                                                                       |
| E6.8  | A                         | `/tickets/K`                                                                                                                                                                                                                                 | vê `(editado)` em `m1` e `m2`; "Editar" só em `a1`                                                                                                                                                              |
| E6.9  | M                         | do formulário de edição de `m1`, forjar `messageId = a1`                                                                                                                                                                                     | `Você não pode editar este comentário.`; nada gravado                                                                                                                                                           |
| E6.10 | M                         | forjar `messageId = 999999`; depois `messageId = m1` com `ticketId` = `#N1` (etapa 2, visível)                                                                                                                                               | os dois: `Comentário não encontrado.`; nada gravado                                                                                                                                                             |
| E6.11 | M                         | forjar `isPrivate: false` junto com `content` novo em `m2`                                                                                                                                                                                   | salvo; `visibility` continua `interna` (chave ignorada)                                                                                                                                                         |
| E6.12 | M                         | forjar `messageId = "abc"`, `0`, `1e12`                                                                                                                                                                                                      | `Comentário inválido.` (`INVALID_INPUT`); nada gravado                                                                                                                                                          |
| E6.13 | QA Admin Infra (se ativo) | forjar `editTicketComment` em `#K` com `messageId = a1`                                                                                                                                                                                      | `Comentário não encontrado.` (não vê o chamado); se a conta estiver inativa, registrar como não executado                                                                                                       |
| E6.14 | M                         | (se houver) comentário de M num chamado `fechado`, `cancelado` ou `resolvido` com janela vencida (`select m.id, m.ticket_id from message m join ticket t on t.id = m.ticket_id where m.user_id = M and t.status in ('fechado','cancelado')`) | sem "Editar"; forjar a edição → `Você não pode editar este comentário.`. Sem linha na consulta → não executado                                                                                                  |
| E6.15 | M                         | 390×844, editar `m1` de novo                                                                                                                                                                                                                 | formulário cabe na largura; botões alcançáveis                                                                                                                                                                  |
| E6.16 | M                         | linha do tempo do `#K` antes e depois das edições                                                                                                                                                                                            | igual (comentário não gera histórico)                                                                                                                                                                           |

---

## Cenários — regras gerais

- Usuários e setores de `docs/contracts/qa-seed.md`: `M` = QA Membro Suporte,
  `A` = QA Admin Suporte, `D` = Diretor, `S` = id de QA Suporte (anotar ids
  pelo banco). QA Admin Infra fica como estiver; não reativar.
- Títulos criados começam com `[QA]`; escrita só em QA Suporte (na Diretoria
  só leitura). **Não alterar #65 a #68.**
- "Request de action" = `POST` com cabeçalho `Next-Action`; forjar = alterar o
  payload a partir de um formulário legítimo. Anotar `max(id)` de `ticket`,
  `ticket_history` e `message` antes de cada cenário que diz "nada gravado".
- Ordem de execução: etapas 1 a 6, com as preparações de cada uma. Os
  cenários descrevem o estado final do código.
- Em toda a bateria: nenhum erro nem aviso de hidratação no dev server (MCP
  `next-devtools`); nenhuma linha nova em `ticket`, `ticket_history` ou
  `message` fora das gravações esperadas.
- Ao final: M e A ativos em QA Suporte.

## Checklist de encerramento

- [ ] Etapa 1 — `DataTable` com coluna oculta; Fila sem Criador e Destinatário (`df-ui`)
- [x] Etapa 2 — tipos, `queueAssigneeLabel`, `describeTicketAssignee`, `preselectedAssigneeId`/`assigneeEditHintFor` com nulo, `buildNewTicketFormOptions` com setor, `queueLabel` na edição, textos do "Enviar", `assigneeId` nulo-ável (`df-architect`)
- [x] Etapa 2 — `findDepartmentName`, `insertTicket` e `updateTicketByAuthor` com fila (`df-data`)
- [x] Etapa 2 — `AppTopBar`, campo, formulários e detalhe (`df-ui`)
- [x] Etapa 3 — `isTicketTaken` (`df-architect`)
- [x] Etapa 4 — `TicketAssigneeTarget`, `assigneeTargetFor`, `creationStatusFor`, `isAssignmentDrivenStatus`, `statusAfterReassignment`; sai `INITIAL_TICKET_STATUS` (`df-architect`)
- [x] Etapa 4 — status e `mudanca_status` em `insertTicket`, `updateTicketByAuthor` e `assignTicket`; seed sem `INITIAL_TICKET_STATUS` (`df-data`)
- [ ] Etapa 5 — `changedByDepartmentName`, frases, `historyEntryNamesActor` (`df-architect`); `findTicketDetail` (`df-data`); linha do tempo (`df-ui`)
- [ ] Etapa 6 — tipos, regra e `editTicketCommentSchema` (`df-architect`); `listTicketMessages` e `updateTicketMessage` (`df-data`); `editTicketComment` (`df-actions`); lista e edição em linha (`df-ui`)
- [ ] Cenários do `df-qa` (bateria inteira, uma vez)
- [ ] Em cada etapa: `npx tsc --noEmit`, `npm run lint`, `npm run build`; `df-reviewer` sem bloqueante
