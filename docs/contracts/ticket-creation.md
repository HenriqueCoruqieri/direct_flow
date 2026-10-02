# Contrato — Criação de chamado

Entrada das ondas 1 e 2. As decisões estão no plano aprovado,
`docs/plans/ticket-creation.md`, e não são repetidas aqui. Este documento é a
referência técnica: assinaturas, sequências e textos. Padrões de outcome, de
resultado de action e de formulário vêm de `docs/contracts/registry-tags.md` e
`docs/contracts/registry-people.md`.

Versões observadas: `next@16.3.5`, `drizzle-orm@0.45.2`, `drizzle-kit@0.31`,
`zod@4.6.5`.

## Revisão de 2026-10-02 — criação sem setor de destino

Decidida no plano `docs/plans/ticket-resolution-and-comments.md`. **Sai o setor
de destino da criação.** Todo chamado nasce `aberto`, no setor do autor
(`origin = current`), sem `ticket_transfer` e sem `transferencia_solicitada`. O
envio entre setores passa a ser um ato deliberado no detalhe, depois de o autor
revisar o chamado (feature futura, ver "Regras das próximas features →
Aprovações").

O documento abaixo já está reescrito para a criação sem destino. O que saiu:

| Camada       | Removido                                                                                                                                                                                                                                   |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Tipos        | `InitialTicketStatus`, `TicketInvalidDestination`, `InsertTicketValues.destinationDepartmentId`, `TicketSaved.ticketStatus`/`destinationDepartmentName`, `NewTicketFormAvailable.authorDepartmentId`/`defaultDestinationId`/`destinations` |
| Domínio      | `canReceiveTickets`, `ticketDestinationDepartments`, `requiresApproval`, `initialTicketStatusFor`, `describeApprovalNotice`. Entra `INITIAL_TICKET_STATUS` (`aberto`)                                                                      |
| Validação    | `createTicketSchema.departmentId` (e a mensagem `Selecione o setor de destino.`)                                                                                                                                                           |
| `df-data`    | passo do destino em `insertTicket`; inserção de `ticket_transfer` e `transferencia_solicitada`; outcome `invalid_destination`                                                                                                              |
| `df-actions` | código `INVALID_DESTINATION` e a mensagem dele                                                                                                                                                                                             |
| `df-ui`      | combobox "Setor de destino", aviso de aprovação, tratamento de `INVALID_DESTINATION`; `listDepartmentOptions` no `AppTopBar`                                                                                                               |

Chamados criados antes da revisão com destino em outro setor continuam como
estão (`aguardando_aprovacao`, transferência pendente sem justificativa: #66,
#68 e #70 nos testes). O que eles mostram no detalhe está em
`docs/contracts/ticket-resolution.md`.

Os textos de bloqueio `DEPARTMENT_UNASSIGNED` e `DEPARTMENT_WITHOUT_TAGS`
passaram a terminar em "informe sua liderança" (alteração do usuário).

## Tabelas, enums e migration

### `db/schema.ts` (alterado)

| Objeto                             | Mudança                                                                                      |
| ---------------------------------- | -------------------------------------------------------------------------------------------- |
| `history_event` (enum)             | novo valor `mudanca_tag`, no fim da lista                                                    |
| `ticket_history.from_tag_id`       | `integer`, nullable, FK `tag.id` `on delete restrict`                                        |
| `ticket_history.to_tag_id`         | `integer`, nullable, FK `tag.id` `on delete restrict`                                        |
| `history_to_tag_idx`               | `index on ticket_history (to_tag_id)`, mesmo padrão de `to_department_id` e `to_assignee_id` |
| `ticket_tag_single_per_ticket_idx` | `unique index on ticket_tag (ticket_id)`: no máximo uma tag por chamado                      |

A PK `(ticket_id, tag_id)` de `ticket_tag` continua. Ficou redundante com o
índice único, mas trocá-la seria mudança destrutiva sem ganho.

Relações Drizzle: `ticketHistoryRelations` ganha `fromTag` e `toTag`
(`relationName` `history_from_tag` e `history_to_tag`); `tagRelations` ganha
`historyFrom` e `historyTo`. O tipo `TicketHistory` ganha `fromTagId` e
`toTagId` (`number | null`); `HistoryEvent` ganha `"mudanca_tag"`.

Nesta feature ninguém grava `mudanca_tag`, `from_tag_id` nem `to_tag_id`. Ficam
prontos para Aprovações.

### Migration `db/migrations/0007_ticket_creation.sql`

Gerada por `npm run db:generate -- --name ticket_creation`, sem edição:

```sql
ALTER TYPE "public"."history_event" ADD VALUE 'mudanca_tag';
ALTER TABLE "ticket_history" ADD COLUMN "from_tag_id" integer;
ALTER TABLE "ticket_history" ADD COLUMN "to_tag_id" integer;
ALTER TABLE "ticket_history" ADD CONSTRAINT "ticket_history_from_tag_id_tag_id_fk" FOREIGN KEY ("from_tag_id") REFERENCES "public"."tag"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "ticket_history" ADD CONSTRAINT "ticket_history_to_tag_id_tag_id_fk" FOREIGN KEY ("to_tag_id") REFERENCES "public"."tag"("id") ON DELETE restrict ON UPDATE no action;
CREATE INDEX "history_to_tag_idx" ON "ticket_history" USING btree ("to_tag_id");
CREATE UNIQUE INDEX "ticket_tag_single_per_ticket_idx" ON "ticket_tag" USING btree ("ticket_id");
```

**Por que é aplicável.** O migrador do Drizzle roda **todas** as migrations
pendentes numa única transação (`node_modules/drizzle-orm/pg-core/dialect.js`,
`migrate`). Desde o Postgres 12, `ALTER TYPE ... ADD VALUE` é aceito dentro de
transação; o que o Postgres proíbe é **usar** o valor novo antes do commit
(`unsafe use of new value`). Nenhuma instrução da `0007` usa `mudanca_tag`, então
ela aplica. Consequência para o futuro: migration que use o valor (default,
`CHECK`, `INSERT`) não pode ser aplicada no mesmo `db:migrate` que a `0007`. Como
a `0007` é aplicada antes da feature de Aprovações começar, isso não acontece.

O `CREATE UNIQUE INDEX` não falha: o `df-debug` confirmou que nenhum chamado tem
duas tags. Os 3 chamados antigos sem tag ficam como estão.

Quem aplica (`npm run db:migrate`) é o usuário.

### Lidas e gravadas pelo fluxo

- `ticket` — grava
- `ticket_tag` — grava (uma linha)
- `ticket_history` — grava (`criacao`)
- `tag` — lê `id`, `name`, `department_id`, `is_active`
- `users` + `department` — lidos por `getAccountFacts` (`app/_lib/auth/`)

`ticket_transfer` não é mais gravado na criação (revisão de 2026-10-02).

## Tipos — `app/_lib/types/`

### `app/_lib/types/ticket.ts` (acrescido)

```ts
export type { HistoryEvent, TicketPriority, TicketStatus, TicketType }

export interface TicketAuthorFacts {
  isActive: boolean
  mustChangePassword: boolean
  isUnassigned: boolean
  departmentId: number
}

export type TicketCreationBlockReason =
  | "USER_INACTIVE"
  | "PASSWORD_CHANGE_REQUIRED"
  | "DEPARTMENT_UNASSIGNED"
  | "DEPARTMENT_WITHOUT_TAGS"

export interface TicketCreationAllowed {
  ok: true
}

export interface TicketCreationBlocked {
  ok: false
  reason: TicketCreationBlockReason
}

export type TicketCreationCheck = TicketCreationAllowed | TicketCreationBlocked

export interface TicketTagFacts {
  departmentId: number
  isActive: boolean
}

export interface InsertTicketValues {
  title: string
  description: string
  type: TicketType
  tagId: number
  createdBy: number
  originDepartmentId: number
}

export interface TicketSaved {
  status: "saved"
  ticketId: number
}

export interface TicketInvalidTag {
  status: "invalid_tag"
}

export type InsertTicketOutcome = TicketSaved | TicketInvalidTag

export interface NewTicketFormAvailable {
  canCreate: true
  tags: TagOption[]
}

export interface NewTicketFormBlocked {
  canCreate: false
  reason: TicketCreationBlockReason
  message: string
}

export type NewTicketFormOptions = NewTicketFormAvailable | NewTicketFormBlocked
```

- `TicketAuthorFacts` é um subconjunto de `RegistryAccessFacts`: o retorno de
  `getAccountFacts()` entra direto, sem conversão.
- `TicketSaved.status` é o discriminante do outcome (padrão do projeto). O
  status do chamado não volta: é sempre `INITIAL_TICKET_STATUS` (`aberto`).
- `originDepartmentId` é o setor do autor, lido fresco; é origem **e** setor
  atual do chamado novo.
- `NewTicketFormOptions` é serializável (só primitivos e arrays): pode ir de
  Server Component para Client Component por props.

### `app/_lib/types/tag.ts` (acrescido)

```ts
export interface TagOption {
  id: number
  name: string
}
```

### `app/_lib/types/department.ts` (acrescido)

```ts
export interface DepartmentAvailability {
  isActive: boolean
  isUnassigned: boolean
}
```

## Domínio — `app/_lib/domain/`

### `app/_lib/domain/ticket.ts` (acrescido)

```ts
export const TICKET_TYPE_LABELS: Record<TicketType, string>
export const TICKET_TYPES: readonly TicketType[]
export const TICKET_TITLE_MIN_LENGTH = 3
export const TICKET_TITLE_MAX_LENGTH = 200
export const TICKET_DESCRIPTION_MIN_LENGTH = 10
export const TICKET_DESCRIPTION_MAX_LENGTH = 5000
export const INITIAL_TICKET_STATUS: TicketStatus // "aberto"
export const INITIAL_TICKET_PRIORITY: TicketPriority // "media"
export const TICKET_CREATION_BLOCK_MESSAGES: Record<
  TicketCreationBlockReason,
  string
>

export const formatTicketNumber: (ticketId: number) => string
export const checkTicketCreation: (
  author: TicketAuthorFacts,
  activeTagCount: number,
) => TicketCreationCheck
export const isUsableTicketTag: (
  tag: TicketTagFacts,
  authorDepartmentId: number,
) => boolean
export const buildNewTicketFormOptions: (
  author: TicketAuthorFacts,
  tags: readonly TagOption[],
) => NewTicketFormOptions
export const describeTicketCreated: (ticketId: number) => string
```

| Nome                        | Semântica                                                                                                                                                                                                |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TICKET_TYPES`              | Os 6 valores de `ticket_type`, na ordem de exibição. Derivado das chaves de `TICKET_TYPE_LABELS`: o `satisfies Record` garante cobertura total do enum. Alimenta `z.enum` e o `Select`                   |
| `TICKET_TYPE_LABELS`        | `Dúvida`, `Ocorrência`, `Solicitação`, `Sugestão de melhoria`, `Incidente`, `Bug`. Única fonte dos rótulos em todo o projeto                                                                             |
| `TICKET_*_LENGTH`           | Limites de título e descrição, para o schema e para contador de caracteres na UI                                                                                                                         |
| `INITIAL_TICKET_STATUS`     | `aberto`. Todo chamado nasce assim (revisão de 2026-10-02)                                                                                                                                               |
| `INITIAL_TICKET_PRIORITY`   | `media`. O autor não escolhe prioridade                                                                                                                                                                  |
| `formatTicketNumber`        | `42` → `#42`. Número visível do chamado é o `ticket.id`                                                                                                                                                  |
| `checkTicketCreation`       | Nesta ordem: inativo → `USER_INACTIVE`; `mustChangePassword` → `PASSWORD_CHANGE_REQUIRED`; Não alocado → `DEPARTMENT_UNASSIGNED`; `activeTagCount < 1` → `DEPARTMENT_WITHOUT_TAGS`; senão `{ ok: true }` |
| `isUsableTicketTag`         | Tag ativa **e** do setor do autor                                                                                                                                                                        |
| `buildNewTicketFormOptions` | Bloqueado → `{ canCreate: false, reason, message }`. Liberado → `{ canCreate: true, tags }`                                                                                                              |
| `describeTicketCreated`     | Mensagem de sucesso da action (texto abaixo)                                                                                                                                                             |

Textos:

| Caso                        | Texto                                                                             |
| --------------------------- | --------------------------------------------------------------------------------- |
| `USER_INACTIVE`             | `Sua conta está desativada. Não é possível registrar chamados.`                   |
| `PASSWORD_CHANGE_REQUIRED`  | `Defina a sua senha antes de registrar chamados.`                                 |
| `DEPARTMENT_UNASSIGNED`     | `Seu perfil não está associado a nenhum setor, informe sua liderança.`            |
| `DEPARTMENT_WITHOUT_TAGS`   | `Não há nenhuma Tag disponível para registro de chamados, informe sua liderança.` |
| `describeTicketCreated(42)` | `Chamado #42 criado.`                                                             |

`PASSWORD_CHANGE_REQUIRED` não está no plano; entra como defesa, igual a
`resolveRegistryAccess`. A tela nunca o mostra (o layout manda para
`/set-password`), mas a action recusa quem chamá-la direto com a senha padrão.

### `app/_lib/domain/department.ts` (acrescido, mesma API)

```ts
export const isAssignableDepartment: (
  department: DepartmentAvailability,
) => boolean
```

`assignableDepartments` passou a filtrar com ela. Comportamento idêntico.
Depois da revisão de 2026-10-02 a criação não a usa mais; continua servindo a
Pessoas e Tags (`assignableDepartments`).

## Validação — `app/_lib/validation/ticket.ts` (novo)

```ts
export const ticketTitleSchema
export const ticketDescriptionSchema
export const ticketTypeSchema

export const createTicketSchema // z.object({ title, description, type, tagId })
export type CreateTicketInput = {
  title: string
  description: string
  type: TicketType
  tagId: number
}
```

| Campo         | Regra                        | Mensagem                                             |
| ------------- | ---------------------------- | ---------------------------------------------------- |
| `title`       | ausente ou vazio após `trim` | `Informe o título.`                                  |
| `title`       | < 3 após `trim`              | `O título precisa ter no mínimo 3 caracteres.`       |
| `title`       | > 200 após `trim`            | `O título precisa ter no máximo 200 caracteres.`     |
| `description` | ausente ou vazia após `trim` | `Descreva o chamado.`                                |
| `description` | < 10 após `trim`             | `A descrição precisa ter no mínimo 10 caracteres.`   |
| `description` | > 5000 após `trim`           | `A descrição precisa ter no máximo 5000 caracteres.` |
| `type`        | fora de `TICKET_TYPES`       | `Selecione o tipo do chamado.`                       |
| `tagId`       | inteiro positivo             | `Selecione a tag.`                                   |

- Setor e autor não estão no schema e nunca vêm do cliente. Uma chave
  `departmentId` enviada por cliente antigo é descartada pelo `z.object`.
- Ids são `number` sem `coerce` (mesmo motivo de `createTagSchema`). A tag usa
  o `Combobox` (`app/_components/combobox.tsx`), que devolve o próprio `id`
  numérico no `onChange`: não há conversão na UI.
- Se a tag pertence ao setor do autor não é formato: é checado na transação.
- `editTicketSchema` deriva deste (`createTicketSchema.extend({ ticketId })`,
  `ticket-edit.md`).

## `df-auth` — nada novo

`getAccountFacts()` (`app/_lib/auth/account-facts.ts`) já traz `isActive`,
`mustChangePassword`, `departmentId` e `isUnassigned`, lidos do banco por
request com `cache`. `getSession()` dá o `id` do autor.

## `df-data` — o que criar

### `app/_lib/data/tags.ts` (acrescido)

```ts
export async function listActiveDepartmentTags(
  departmentId: number,
): Promise<TagOption[]>
```

- `select id, name from tag where department_id = $1 and is_active order by
lower(name), id`.
- Serve ao formulário (opções de tag) e à contagem de `checkTicketCreation`
  (`tags.length`). Não filtra pelo `is_active` do setor: o setor do autor ativo é
  garantido por quem chama.

### `app/_lib/data/tickets.ts` (novo)

```ts
export async function insertTicket(
  values: InsertTicketValues,
): Promise<InsertTicketOutcome>
```

Uma transação (`db.transaction`). Sequência, nesta ordem:

1. **Tag** — `select department_id, is_active from tag where id = $tagId for
share`. Sem linha ou `!isUsableTicketTag(row, values.originDepartmentId)` →
   `{ status: "invalid_tag" }`, sem gravar nada.
2. `insert into ticket` com `title`, `description`, `type`, `status:
INITIAL_TICKET_STATUS`, `priority: INITIAL_TICKET_PRIORITY`, `createdBy`,
   `originDepartmentId` e `currentDepartmentId` **ambos** =
   `values.originDepartmentId`; `returning id, created_at`. `assignedTo`,
   `dueAt`, `firstResponseAt`, `resolvedAt`, `solution` ficam nulos.
3. `insert into ticket_tag (ticket_id, tag_id, created_at)` com `created_at =
ticket.created_at`.
4. `insert into ticket_history`, evento `criacao`: `changedBy = createdBy`,
   `toStatus = INITIAL_TICKET_STATUS`, `toPriority = INITIAL_TICKET_PRIORITY`,
   `toDepartmentId = originDepartmentId`, `changedAt = ticket.created_at`. Demais
   colunas nulas.
5. `{ status: "saved", ticketId }`.

Sem `ticket_transfer` e sem `transferencia_solicitada` (revisão de 2026-10-02).

Detalhes que o contrato fixa:

- **Trava.** O `for share` na tag impede desativá-la entre a checagem e o insert
  (`updateTagActive` pega `for update`); não conflita com outra criação.
- **Regra fora da data layer.** Validade da tag e status inicial vêm do domínio;
  a função não repete as condições em SQL.
- **Mesmo instante.** Todas as linhas usam o `created_at` do ticket. Quem ler o
  histórico ordena por `changed_at, id`.
- Exceção (violação de `CHECK`, FK, índice único) sobe para a action, que a
  trata como falha inesperada. Nada é gravado: a transação é desfeita.
- A função não decide quem pode criar: `checkTicketCreation` já rodou na action.

## `df-actions` — o que criar

### `app/_lib/actions/tickets.ts` (novo, `"use server"`)

```ts
export type TicketErrorCode = "INVALID_INPUT" | "FORBIDDEN" | "INVALID_TAG"

export interface CreateTicketSuccess {
  ok: true
  message: string
  ticketId: number
}

export interface TicketActionFailure {
  ok: false
  message: string
  code?: TicketErrorCode
}

export type CreateTicketResult = CreateTicketSuccess | TicketActionFailure

export const createTicket: (
  input: CreateTicketInput,
) => Promise<CreateTicketResult>
```

Sequência:

1. `const actor = await getSession()`; `null` → `FORBIDDEN` genérico.
2. `try`: `const facts = await getAccountFacts()`; `null` → `FORBIDDEN`
   genérico. Depois `const tags = await listActiveDepartmentTags(facts.departmentId)`.
3. `checkTicketCreation(facts, tags.length)`; bloqueado → `FORBIDDEN` com
   `TICKET_CREATION_BLOCK_MESSAGES[reason]`. Tudo isso antes do parse, como nas
   outras actions.
4. `createTicketSchema.safeParse(input)`; inválido → `INVALID_INPUT` com a
   primeira `issue.message`.
5. `insertTicket({ title, description, type, tagId, createdBy: actor.id,
originDepartmentId: facts.departmentId })` dentro do `try`.
6. `catch` → `console.error("[createTicket]", error)` e falha inesperada, sem
   `code`.
7. Traduz o outcome (tabela). `saved` → `revalidatePath("/dashboard")` e
   `{ ok: true, message: describeTicketCreated(outcome.ticketId), ticketId:
outcome.ticketId }`.

**Autor e setor vêm do banco.** `createdBy` é `actor.id` (sessão);
`originDepartmentId` é `facts.departmentId` (consulta fresca). Nunca
`actor.departmentId` (pode vir do cookie de sessão) e nunca o formulário.

| Situação                               | `code`          | Mensagem                                                            |
| -------------------------------------- | --------------- | ------------------------------------------------------------------- |
| criado                                 | —               | `describeTicketCreated` → `Chamado #42 criado.`                     |
| sem sessão ou `getAccountFacts()` nulo | `FORBIDDEN`     | `Você não tem permissão para abrir chamados.`                       |
| `checkTicketCreation` bloqueou         | `FORBIDDEN`     | `TICKET_CREATION_BLOCK_MESSAGES[reason]`                            |
| schema falhou                          | `INVALID_INPUT` | primeira `issue.message` do Zod                                     |
| `invalid_tag`                          | `INVALID_TAG`   | `Esta tag não está disponível. Escolha uma tag ativa do seu setor.` |
| falha inesperada                       | —               | `Não foi possível abrir o chamado agora. Tente novamente.`          |

`INVALID_DESTINATION` e a mensagem dele saem (revisão de 2026-10-02).

Sem e-mail. Nenhum SQL na action.

## `df-ui` — o que criar e mudar

### O problema do `error.tsx`

Hoje `AppTopBar` é um componente sem dado, importado por
`app/(app)/dashboard/page.tsx` (Server) **e** por
`app/(app)/dashboard/error.tsx` (`"use client"`, obrigatório em error boundary).
Se `AppTopBar` virar async Server Component que lê `app/_lib/auth` e
`app/_lib/data`:

- o import pelo `error.tsx` puxa o componente para o grafo do cliente: componente
  async não é suportado em Client Component, e o build tenta empacotar
  `next/headers`, `@/db` e `pg` para o navegador e falha;
- além disso viola a seção 2 do `stack.md` (Client Component não importa
  `app/_lib/data` nem `app/_lib/auth`);
- e não faria sentido: o boundary aparece justamente quando a página falhou, e a
  leitura de dados da barra pode ter sido a causa.

Server Component não pode ser importado por Client Component; só pode chegar a ele
como prop (`node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`,
"Interleaving Server and Client Components"). E o `error.tsx` não recebe nada da
página.

### Solução: separar moldura e dado

| Arquivo (`app/(app)/_components/`) | Tipo                             | Papel                                                                                                                                  |
| ---------------------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `app-top-bar-frame.tsx`            | sem diretiva, sem hook, sem dado | Moldura atual (busca + espaço do botão). Prop `action: React.ReactNode`. Importável pelo servidor e pelo `error.tsx`                   |
| `app-top-bar.tsx`                  | async Server Component           | Carrega o dado, monta `NewTicketFormOptions`, renderiza `AppTopBarFrame` com o botão certo. Mesmo nome e import de hoje para a página  |
| `new-ticket-dialog.tsx`            | `"use client"`                   | Botão "Novo chamado" + `Dialog` + formulário. Recebe `options: NewTicketFormAvailable`                                                 |
| `new-ticket-blocked-button.tsx`    | `"use client"`                   | Botão "Novo chamado" esmaecido; o clique mostra o motivo em toast. Recebe `message: string`. Usado pelo `AppTopBar` e pelo `error.tsx` |

O formulário pode ficar num arquivo próprio (`new-ticket-form.tsx`) se o dialog
crescer; decisão do `df-ui`.

`app/(app)/dashboard/error.tsx` passa a renderizar
`<AppTopBarFrame action={<NewTicketBlockedButton message="Não foi possível carregar o formulário de chamado agora. Use “Tentar novamente”." />} />`.
A barra mantém a mesma altura e a busca continua visível.

### `app/(app)/_components/app-top-bar.tsx` (async Server Component)

```ts
const facts = await getAccountFacts()
if (!facts) notFound()
const tags = await listActiveDepartmentTags(facts.departmentId)
const options = buildNewTicketFormOptions(facts, tags)
```

Sem `listDepartmentOptions` (revisão de 2026-10-02): a barra faz uma leitura a
menos por página.

- `options.canCreate` → `<NewTicketDialog options={options} />`; senão
  `<NewTicketBlockedButton message={options.message} />`.
- A página continua só com `<AppTopBar />`. Não recebe props: segue reutilizável
  por Fila, Meus chamados e Aprovações.
- `getAccountFacts` é `cache`: a consulta é a mesma do layout no mesmo request.

### `NewTicketBlockedButton`

Props: `message: string`. Gatilho: o botão "Novo chamado" com o mesmo visual
do ativo, esmaecido. O mesmo comportamento vale para o "Editar" esmaecido
(`docs/contracts/ticket-edit.md`, seção `EditTicketBlockedButton`): as regras
abaixo são a referência das duas telas.

A peça `app/_components/blocked-action-tooltip.tsx` deixa de existir: não há
tooltip, popover nem qualquer explicação no hover ou no foco. Se o
comportamento abaixo for extraído para uma peça compartilhada pelos dois
botões, ela é genérica (não conhece chamado) e fica solta em
`app/_components/`; a decisão é do `df-ui`. O comportamento não se repete com
diferenças entre as duas telas.

#### Comportamento do botão de ação bloqueada

| Entrada        | Hover / foco                                | Ativação                                                       |
| -------------- | ------------------------------------------- | -------------------------------------------------------------- |
| Mouse          | **nada** aparece                            | clique → toast com a mensagem                                  |
| Teclado        | **nada** aparece                            | `Enter` ou `Espaço` com o foco no botão → toast com a mensagem |
| Toque          | —                                           | toque → toast com a mensagem                                   |
| Leitor de tela | descrição anunciada pelo `aria-describedby` | idem às linhas acima                                           |

- **Botão `<button type="button" aria-disabled="true">`, sem `disabled`
  nativo.** `disabled` tira o botão da ordem de foco e cancela o clique; com
  `aria-disabled` ele continua focável, é anunciado como indisponível e recebe
  o clique. Visual esmaecido (`opacity-50`, `cursor-not-allowed`, sem efeito de
  hover).
- **Nada no hover nem no foco.** Sem `Tooltip`, sem `Popover`, sem atributo
  `title` (o navegador o mostraria no hover). Foco por `Tab` só mostra o anel de
  foco padrão.
- **Ativação = `onClick`.** O `click` do `<button>` já cobre mouse, toque e
  `Enter`/`Espaço` (o navegador dispara o clique sintético), sem distinguir
  `pointerType`. O handler só chama `toast.info(message, { id })`, com `id`
  estável por botão (`useId`): cliques repetidos atualizam o mesmo toast em vez
  de empilhar. O toast não recebe nem rouba o foco; o foco continua no botão.
- **Nunca age.** Em nenhuma entrada o botão abre dialog, monta formulário,
  navega ou chama Server Action. A única reação é o toast.
- **Leitor de tela.** A mensagem fica num `span` `sr-only` permanente, com `id`
  via `useId`, apontado pelo `aria-describedby` do botão: o anúncio é
  "{rótulo}, botão, indisponível" seguido da mensagem. O nome acessível
  continua sendo só o rótulo do botão.
- **Texto.** A mensagem chega pronta por prop (`options.message`, vindo de
  `TICKET_CREATION_BLOCK_MESSAGES`, ou o texto fixo do `error.tsx`) e é a
  mesma no toast e no `span`; o componente não monta nem formata frase.

### `NewTicketDialog` (React Hook Form + `zodResolver(createTicketSchema)`)

Campos, nesta ordem, todos obrigatórios, com `field` do shadcn:

| Campo            | Componente | Opções / padrão                                                                                                                                    |
| ---------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Título           | `Input`    | contador opcional com `TICKET_TITLE_MAX_LENGTH`                                                                                                    |
| Descrição        | `Textarea` | `npx shadcn@latest add textarea` (trocar o import do `cn`); contador opcional com `TICKET_DESCRIPTION_MAX_LENGTH`                                  |
| Tipo             | `Select`   | `TICKET_TYPES` com `TICKET_TYPE_LABELS`; sem padrão                                                                                                |
| Tag do seu setor | `Combobox` | `options.tags`, rótulo `name`; sem padrão (mesmo com uma só, o autor escolhe); busca `Buscar tag…`. Rótulo deixa claro que é tag do setor do autor |

Sem campo de setor de destino e sem aviso de aprovação (revisão de
2026-10-02). O chamado nasce no setor do autor.

- **Por que `Combobox` na tag.** A lista cresce com o cadastro e pode ficar
  grande; o `Tipo` é fixo em 6 valores e continua `Select`. O `Combobox` (API em
  "Peças compartilhadas" de `docs/contracts/registry-people.md`) filtra pelo
  rótulo enquanto se digita, sem diferenciar maiúsculas nem acentos
  (`configuracao` acha `Configuração`); navega por teclado (setas com volta ao
  início, `Enter` escolhe, `Esc` fecha só a lista); e a lista rola dentro do
  dialog, inclusive pela roda do mouse, com altura máxima fixa.
- Submit chama `createTicket(values)`:
  - `ok` → `toast.success(result.message)`, `form.reset()`, fecha o dialog.
    Sem `router.refresh()`: o card do Início atualiza pelo `revalidatePath` da
    action.
  - `INVALID_TAG` → erro no campo `tagId` com `result.message` e
    `router.refresh()` (a lista de tags pode estar velha), com
    `setError(..., { shouldFocus: true })`: o `field.ref` chega ao gatilho do
    `Combobox`, que recebe o foco, fica com `aria-invalid` e aponta o erro pelo
    `aria-describedby`.
  - `INVALID_INPUT` → `toast.error(result.message)` (o `zodResolver` já pega no
    cliente; aqui só chega envio forjado ou divergência).
  - `FORBIDDEN` → `toast.error(result.message)`, fecha o dialog e
    `router.refresh()`: a barra volta com o botão bloqueado.
  - sem `code` → `toast.error(result.message)`, dialog aberto, valores mantidos.
- Botão de envio desabilitado enquanto `isSubmitting`.
- Fechar o dialog descarta o rascunho (`form.reset()` no `onOpenChange(false)`).
- Client Components não importam `@/db/*`, `drizzle-orm`, `app/_lib/data` nem
  `app/_lib/auth`. Importam só `app/_lib/domain`, `app/_lib/validation`,
  `app/_lib/types` e a action.

## Regras das próximas features (sem código nesta)

Registradas para que o desenho de agora não as impeça. Cada feature terá plano e
contrato próprios; o que está aqui é o ponto de partida, não a especificação.

### Aprovações

> Revisto em 2026-10-02. O ponto de partida deixou de ser a criação: o
> pedido de transferência nasce do botão **"Enviar para outro setor"** no card Conclusão do
> detalhe (`docs/contracts/ticket-resolution.md`, hoje um botão de ação
> bloqueada). Ao enviar, a justificativa é **obrigatória** e vai para
> `ticket_transfer.request_reason`. Quem pode enviar, de que status, e o que
> acontece com o status do chamado enquanto aguarda são decisões dessa feature.
> As regras abaixo continuam como ponto de partida para a decisão do admin de
> destino.

- Quem decide: o admin do setor de **destino** (`ticket_transfer.to_department_id`),
  com o mesmo alcance de `canManageTagsOf` (diretor decide por qualquer setor,
  regra do ADR 011).
- **Aprovar**: escolhe uma tag ativa do **próprio** setor, obrigatória, que
  **substitui** a do autor (`update ticket_tag set tag_id`, a linha continua
  única pelo `ticket_tag_single_per_ticket_idx`). Na mesma transação:
  `ticket_transfer.status = aprovado`, `reviewed_by`, `reviewed_at`;
  `ticket.current_department_id = destino`, `status = aberto`;
  `ticket_history` `transferencia_aprovada` (from/to department, from/to status)
  e `mudanca_tag` com `from_tag_id`/`to_tag_id`.
- **Recusar**: `ticket_transfer.status = rejeitado` com `review_note`; o chamado
  continua no setor do autor (nunca saiu: `current = origin`) e volta a
  `aberto`; histórico `transferencia_rejeitada` (from/to status). A tag do autor
  fica.
- A migration da Aprovações não pode ser aplicada no mesmo `db:migrate` que a
  `0007` se usar `mudanca_tag` (ver "Por que é aplicável").

### Detalhe e edição pelo autor

> Especificado em `docs/contracts/my-tickets.md` (detalhe) e
> `docs/contracts/ticket-edit.md` (edição). A edição também exclui `cancelado`.

- O autor só age sobre o chamado quando: `current_department_id` = setor dele,
  **sem** `ticket_transfer` pendente e `status <> fechado`. Enquanto
  `aguardando_aprovacao` para outro setor, não age (o plano: "o autor perde o
  controle").
- Toda movimentação gera linha em `ticket_history`; nada é `UPDATE` destrutivo
  sobre o histórico.

### Conclusão

> A resolução (solução obrigatória, `resolvido`, quem resolve) está
> especificada em `docs/contracts/ticket-resolution.md`. A janela de 7 dias e o
> fechamento automático continuam futuros.

- `resolvido` abre uma janela de **7 dias** em que o chamado ainda é editável
  (correções, complementos, evidências).
- Depois disso vira `fechado` automaticamente e fica imutável; é a partir daí que
  o backoffice analisa.
- O mecanismo da troca (job agendado ou cálculo na leitura) é decidido nessa
  feature, com ADR próprio. Nada nesta feature presume um ou outro.

## Riscos

1. **Envio forjado** (tag de outro setor ou inativa): recusado na transação com
   `INVALID_TAG`; nada gravado. Um `departmentId` forjado é descartado pelo
   schema.
2. **Chamados legados parados** em `aguardando_aprovacao` (criados antes da
   revisão de 2026-10-02) até a tela de Aprovações existir. Aceito para teste.
3. **Tag do autor** nesses chamados legados até a Aprovações substituí-la.
4. **Início**: uma leitura pequena por abertura (tags do setor). A de conta é
   compartilhada com o layout pelo `cache`.
5. **Autor movido no meio do envio.** `getAccountFacts` lê o setor antes da
   transação; se um admin mover o autor de setor nesses milissegundos, a origem
   é o setor anterior e a tag precisa ser desse setor. Aceito, como o risco 3 de
   Pessoas.
6. **Título com emoji no limite.** O Zod conta unidades UTF-16 e o `CHECK
ticket_title_length` conta caracteres: um título como `a😀` passa no schema
   (3) e falha no banco (2) como falha inesperada. Raro; aceito.
7. **Nome do enum em português** (`mudanca_tag`): segue o padrão atual; tradução
   dos valores é decisão separada, com migration própria.

## Critério de pronto

Os do plano, com os nomes técnicos:

1. Membro cria com tag do próprio setor → `ticket.status = aberto`,
   `origin = current` = setor do autor, `priority = media`, 1 linha em
   `ticket_tag`, 1 linha em `ticket_history` (`criacao`, `to_status = aberto`),
   nenhum `ticket_transfer`; toast `Chamado #N criado.`; card "Chamados no
   período" do Início +1.
2. ~~Outro setor~~: removido na revisão de 2026-10-02 (não há destino na
   criação).
3. Validação no campo: sem tag, sem tipo, título < 3 ou > 200, descrição < 10 ou
   > 5000 (após `trim`).
4. Forjado: tag de outro setor → `INVALID_TAG`; nenhuma linha nova em
   `ticket`, `ticket_tag`, `ticket_history` nem `ticket_transfer`.
5. Banco, só leitura: `ticket_tag_single_per_ticket_idx` existe como índice
   único em `ticket_tag (ticket_id)` e nenhum chamado tem mais de uma tag;
   `enum_range(null::history_event)` contém `mudanca_tag`; `ticket_history` tem
   `from_tag_id` e `to_tag_id`.
6. Bloqueios: pessoa no Não alocado e pessoa de setor sem tag ativa veem o botão
   esmaecido e, ao clicar, o toast com a mensagem de
   `TICKET_CREATION_BLOCK_MESSAGES`; a action
   chamada direto devolve `FORBIDDEN`.
7. `npx tsc --noEmit`, `npm run lint` e `npm run build` passam; `df-reviewer`
   sem bloqueante; `df-qa` aprova os cenários abaixo.

## Cenários para o `df-qa`

Usuários e setores de `docs/contracts/qa-seed.md`. Todo título criado começa com
`[QA]`. Tags criadas pelo teste começam com `[QA]`.

> Revisão de 2026-10-02: os cenários que dependiam do setor de destino (6, 8,
> 13a–13c, 13i) foram retirados; 3, 5, 10, 13 e 14 foram ajustados. A
> numeração foi mantida para casar com os relatórios antigos.

| #   | Quem              | Preparação                                                                          | Ação                                                                               | Esperado                                                                                                                                                                                                                                                                          |
| --- | ----------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | QA Membro Suporte | QA Suporte sem tag ativa (desativar as existentes como QA Admin Suporte, se houver) | abrir o Início                                                                     | botão "Novo chamado" esmaecido; nada no hover nem no foco; clique, toque, `Enter` e `Espaço` mostram o toast `DEPARTMENT_WITHOUT_TAGS`, conforme o cenário 14 (executá-lo neste estado, antes do 2)                                                                               |
| 2   | QA Admin Suporte  | —                                                                                   | criar tag `[QA] Acesso` em QA Suporte; QA Admin Infra cria `[QA] Rede` em QA Infra | tags ativas                                                                                                                                                                                                                                                                       |
| 3   | QA Membro Suporte | cenário 2                                                                           | abrir o dialog                                                                     | campos Título, Descrição, Tipo e Tag do seu setor; **sem** campo de setor de destino nem aviso de aprovação; tag lista só `[QA] Acesso` (sem `[QA] Rede`)                                                                                                                         |
| 4   | QA Membro Suporte | dialog aberto                                                                       | enviar vazio; título `ab`; descrição `curta`                                       | erros no campo com os textos da tabela de validação; nenhum request de action                                                                                                                                                                                                     |
| 5   | QA Membro Suporte | anotar o número do card do Início                                                   | criar `[QA] Próprio setor`, tipo Dúvida, tag `[QA] Acesso`                         | toast `Chamado #N criado.`; dialog fecha; card +1; no banco os itens do critério 1                                                                                                                                                                                                |
| 6   | —                 | —                                                                                   | retirado (não há destino)                                                          | —                                                                                                                                                                                                                                                                                 |
| 7   | QA Membro Suporte | dialog aberto                                                                       | forjar `tagId` = id de `[QA] Rede` (alterar o payload da action)                   | `INVALID_TAG`, erro no campo Tag; nenhuma linha nova em `ticket`, `ticket_tag`, `ticket_history`, `ticket_transfer`                                                                                                                                                               |
| 8   | QA Membro Suporte | dialog aberto                                                                       | acrescentar `departmentId` = id de QA Infra ao payload e enviar                    | a chave é ignorada: `Chamado #N criado.`, chamado `aberto` em QA Suporte, nenhum `ticket_transfer`                                                                                                                                                                                |
| 9   | QA Admin Suporte  | dialog aberto pelo membro                                                           | desativar `[QA] Acesso`; o membro envia                                            | `FORBIDDEN` com `DEPARTMENT_WITHOUT_TAGS` (era a única tag); dialog fecha; barra volta bloqueada                                                                                                                                                                                  |
| 10  | Diretor           | —                                                                                   | mover QA Membro Suporte para o Não alocado; o membro abre o Início                 | botão esmaecido; passar o mouse não mostra nada (14a); clicar mostra o toast `Seu perfil não está associado a nenhum setor, informe sua liderança.` e não abre dialog (14b). Ao fim, mover de volta para QA Suporte e reativar `[QA] Acesso`                                      |
| 11  | banco, só leitura | —                                                                                   | consultar `pg_indexes`, `ticket_tag`, `enum_range` e `information_schema.columns`  | `indexdef` de `ticket_tag_single_per_ticket_idx` é `CREATE UNIQUE INDEX ... (ticket_id)`; `select ticket_id from ticket_tag group by ticket_id having count(*) > 1` sem linhas; `enum_range(null::history_event)` contém `mudanca_tag`; colunas `from_tag_id`/`to_tag_id` existem |
| 12  | qualquer          | forçar erro na página do Início (ex.: banco indisponível)                           | abrir o Início                                                                     | `error.tsx` mostra a barra com busca e "Novo chamado" esmaecido; hover e foco não mostram nada; clique e `Enter` mostram o toast com a mensagem de indisponibilidade; "Tentar novamente" funciona                                                                                 |

O cenário 11 é só leitura porque o `df-qa` não escreve no banco à mão. A prova
pelo erro (um `insert into ticket_tag` de segunda tag recusado pelo índice) fica
com o usuário, se ele quiser.

O cenário 12 é opcional se não houver como provocar a falha sem mexer no
ambiente; nesse caso, registrar como não executado.

### Cenário 13 — `Combobox` de tag

Quem: QA Membro Suporte, com o dialog "Novo chamado" aberto, depois do cenário
10 (com `[QA] Acesso` reativada).

Preparação, como QA Admin Suporte: criar `[QA] Configuração` em QA Suporte e,
para a lista de tags passar da altura máxima (`max-h-72`, cabem cerca de 8
itens), completar QA Suporte com pelo menos 10 tags ativas criando
`[QA] Lista 01`, `[QA] Lista 02`… (ou reativando as de execução anterior, já que
tag não é excluída). Ao fim do cenário, desativar `[QA] Configuração` e as
`[QA] Lista NN`: o cenário 9 depende de `[QA] Acesso` ser a única tag ativa.

| #   | Ação                                                                                      | Esperado                                                                                                                                                                                                         |
| --- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 13a | —                                                                                         | retirado (não há campo de destino)                                                                                                                                                                               |
| 13b | —                                                                                         | retirado                                                                                                                                                                                                         |
| 13c | abrir o campo Tag do seu setor; digitar `xyz`                                             | lista vazia com `Nenhum resultado.`                                                                                                                                                                              |
| 13d | abrir o campo Tag do seu setor; digitar `configuracao`, depois `CONFIGURAÇÃO`             | nos dois, `[QA] Configuração` aparece                                                                                                                                                                            |
| 13e | só teclado: `Tab` até o gatilho da tag, `Enter`, setas até passar do último item, `Enter` | `Enter` abre a lista; as setas descem e voltam ao primeiro item depois do último; `Enter` escolhe, fecha a lista e devolve o foco ao gatilho, que mostra o nome escolhido                                        |
| 13f | com a lista aberta, `Esc`                                                                 | fecha só a lista; o dialog continua aberto e o valor não muda; foco no gatilho                                                                                                                                   |
| 13g | lista de tags aberta, sem busca; rolar com a roda do mouse sobre a lista                  | a lista rola até a última tag; o dialog atrás não rola nem fecha                                                                                                                                                 |
| 13h | forjar `tagId` = id de `[QA] Rede` (como no cenário 7) e enviar                           | `Esta tag não está disponível. Escolha uma tag ativa do seu setor.` abaixo do campo Tag; foco no gatilho do campo Tag (elemento ativo é o `button[role=combobox]` dele), com `aria-invalid="true"`; nada gravado |
| 13i | —                                                                                         | retirado (não há `INVALID_DESTINATION`)                                                                                                                                                                          |

### Cenário 14 — botão bloqueado com toast

Quem: QA Membro Suporte, no estado do cenário 1 (QA Suporte sem tag ativa),
antes do cenário 2. Mensagem esperada, texto exato:
`Não há nenhuma Tag disponível para registro de chamados, informe sua liderança.`
Anotar antes `max(id)` de `ticket` e de `ticket_history`. A ferramenta de
navegador trata `aria-disabled` como "não habilitado" e recusa a ação sem
`force: true`; use `force: true` em hover, clique e toque nesse botão (o evento
continua chegando a ele, que é o que se testa). "Request de action" = `POST`
com cabeçalho `Next-Action` na aba de rede.

| #   | Ação                                                                                                                                | Esperado                                                                                                                                                                                                                  |
| --- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 14a | desktop, mouse: passar o mouse sobre "Novo chamado" e esperar 2 s; depois tirar o mouse                                             | botão esmaecido, `aria-disabled="true"`, sem atributo `disabled` nem `title`; com o mouse em cima, **nada** aparece (nenhum tooltip, popover ou toast no DOM)                                                             |
| 14b | desktop, mouse: clicar "Novo chamado"; depois clicar mais duas vezes seguidas                                                       | o primeiro clique mostra um toast com a mensagem exata; os cliques seguintes não empilham toasts (no máximo um toast com a mensagem visível); dialog "Novo chamado" não abre; nenhum request de action                    |
| 14c | só teclado: `Tab` até "Novo chamado" e esperar 2 s; `Enter`; esperar o toast sumir; `Espaço`                                        | o foco chega ao botão e **nada** aparece além do anel de foco; `Enter` mostra o toast com a mensagem exata; `Espaço` também; o dialog não abre; o foco continua no botão (o toast não o recebe); nenhum request de action |
| 14d | árvore de acessibilidade do botão, sem toast visível                                                                                | nome acessível `Novo chamado`; `aria-describedby` aponta para um elemento `sr-only` presente no DOM com a mensagem exata                                                                                                  |
| 14e | viewport móvel com toque emulado (Playwright: contexto com `hasTouch: true`, `isMobile: true`, 390×844; usar `tap`): tocar no botão | o toque mostra o toast com a mensagem exata; dialog não abre; nenhum request de action                                                                                                                                    |
| 14f | banco, só leitura, depois de 14a–14e                                                                                                | `max(id)` de `ticket` e de `ticket_history` inalterados; nenhuma linha nova em `ticket_tag` nem `ticket_transfer`                                                                                                         |
| 14g | qualquer, durante 14a–14e                                                                                                           | nenhum erro nem aviso de hidratação no dev server (MCP `next-devtools`)                                                                                                                                                   |

## Checklist de encerramento da feature

- [x] schema, migration `0007`, tipos, domínio e `createTicketSchema` (`df-architect`)
- [ ] `listActiveDepartmentTags` em `app/_lib/data/tags.ts`; `insertTicket` em `app/_lib/data/tickets.ts` (`df-data`)
- [ ] `createTicket` em `app/_lib/actions/tickets.ts` (`df-actions`)
- [ ] `AppTopBarFrame`, `AppTopBar` async, `NewTicketDialog`, `NewTicketBlockedButton`; `error.tsx` sem import de `AppTopBar` (`df-ui`)
- [ ] botão bloqueado sem nada no hover/foco, toast com o motivo no clique, toque e `Enter`/`Espaço`, `aria-describedby` para `span` `sr-only`; `app/_components/blocked-action-tooltip.tsx` removido (`df-ui`)
- [ ] `npm run db:migrate` aplicado pelo usuário
- [ ] cenários do `df-qa`
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm run build`

Revisão de 2026-10-02 (criação sem destino), entregue com
`docs/contracts/ticket-resolution.md`:

- [x] tipos, domínio (`INITIAL_TICKET_STATUS`, `buildNewTicketFormOptions` e `describeTicketCreated` sem destino; removidos `canReceiveTickets`, `ticketDestinationDepartments`, `requiresApproval`, `initialTicketStatusFor`, `describeApprovalNotice`) e `createTicketSchema` sem `departmentId` (`df-architect`)
- [x] `insertTicket` sem destino, sem `ticket_transfer` (`df-data`)
- [x] `createTicket` sem `INVALID_DESTINATION` (`df-actions`)
- [x] `NewTicketDialog` sem combobox de destino nem aviso; `AppTopBar` sem `listDepartmentOptions` (`df-ui`)
