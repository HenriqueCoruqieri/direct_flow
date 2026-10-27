# Contrato — Prioridade definida pela tag

Plano: `docs/plans/tag-priority.md` (aprovado em 2026-10-26). As decisões de
produto estão lá e não se repetem aqui. Decisão técnica: ADR 020
(`docs/adr/020-priority-set-at-opening-and-fixed.md`).

Contratos alterados por este (cada um ganhou uma nota de revisão apontando
para cá): `registry-tags.md`, `ticket-creation.md`,
`ticket-priority-and-sla.md`.

Versões observadas: `next@16.3.5`, `zod@4.6.5`, `drizzle-orm@0.45.2`,
`drizzle-kit@0.31`, `react-hook-form@7.88`, `@hookform/resolvers@5.9`.

---

## Tabelas, enums e migration

### `tag` (`db/schema.ts`, alterado)

| Coluna     | Tipo                                 | Observação                                                     |
| ---------- | ------------------------------------ | -------------------------------------------------------------- |
| `priority` | enum `ticket_priority`, **nullable** | Sem default. `null` = "sem prioridade (escolhida na abertura)" |

Enum reaproveitado: `ticket_priority` (`baixa`, `media`, `alta`, `critica`).
Nenhum enum novo.

### Migration `db/migrations/0019_tag_priority.sql`

Gerada por `npx drizzle-kit generate --name tag_priority`:

```sql
ALTER TABLE "tag" ADD COLUMN "priority" "ticket_priority";
```

Não destrutiva: tags existentes ficam com `priority = null` e o comportamento
de abertura não muda para elas. **Aplicar com `npm run db:migrate`** (o
agente não aplica).

### Lidas e gravadas pelo fluxo

- `tag.priority` — gravada no cadastro, lida na abertura (`insertTicket`) e nas
  listas de tags.
- `ticket.priority` e `ticket_history.to_priority` (evento `criacao`) —
  gravadas **só** na abertura, já resolvidas. Nenhum outro fluxo as altera
  (ADR 020).

## Tipos — `app/_lib/types/tag.ts` (alterado)

```ts
export interface TagListItem {
  // ...campos atuais
  priority: TicketPriority | null
}

export interface TagOption {
  id: number
  name: string
  priority: TicketPriority | null
}

export interface TagValues {
  name: string
  priority: TicketPriority | null
}

export interface TicketPriorityLock {
  priority: TicketPriority
  hint: string
}

export interface TagPrioritySelectOption {
  value: string
  label: string
}

export type UpdateTagOutcome = TagSaved | TagNameTaken | TagNotFound
```

- **`UpdateTagNameOutcome` foi renomeado para `UpdateTagOutcome`** (mesmos
  membros).
- `TicketPriority` vem de `@/db/schema` por `import type` (evita ciclo com
  `app/_lib/types/ticket.ts`, que importa `TagOption`).
- `TagOption` carrega `priority` porque é o que o formulário de abertura
  recebe; `buildNewTicketFormOptions` e `buildTicketEditFormOptions` repassam a
  lista sem mudança.

## Domínio — `app/_lib/domain/tag-priority.ts` (novo)

```ts
export const TAG_PRIORITY_NONE_VALUE = "none"
export const TAG_PRIORITY_NONE_LABEL = "Sem prioridade (escolhida na abertura)"
export const TAG_PRIORITY_FIELD_HINT =
  "Chamados abertos com esta tag recebem esta prioridade. Mudar aqui não altera chamados já abertos."
export const TAG_PRIORITY_SELECT_OPTIONS: readonly TagPrioritySelectOption[]

export const tagPriorityToSelectValue: (
  priority: TicketPriority | null,
) => string
export const tagPriorityFromSelectValue: (
  value: string,
) => TicketPriority | null
export const describeTagPriority: (priority: TicketPriority | null) => string

export const resolveTicketPriority: (
  tagPriority: TicketPriority | null,
  chosen: TicketPriority,
) => TicketPriority
export const tagPriorityHint: (tagName: string) => string
export const ticketPriorityLockFor: (
  tags: readonly TagOption[],
  tagId: number | null | undefined,
) => TicketPriorityLock | null
export const ticketPriorityOnTagChange: (
  tags: readonly TagOption[],
  previousTagId: number | null | undefined,
  nextTagId: number | null | undefined,
  current: TicketPriority,
) => TicketPriority
```

| Nome                          | Semântica                                                                                                                                                                                                                         |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `resolveTicketPriority`       | **A regra.** `tagPriority ?? chosen`. Única decisão de prioridade da abertura; o servidor (`insertTicket`) a aplica, a UI deriva a trava dela por `ticketPriorityLockFor`                                                         |
| `ticketPriorityLockFor`       | Tag selecionada com prioridade → `{ priority, hint: tagPriorityHint(name) }`; tag sem prioridade, `tagId` vazio ou fora da lista → `null` (Select livre)                                                                          |
| `ticketPriorityOnTagChange`   | Valor que o campo `priority` deve assumir ao trocar a tag: próxima tag com prioridade → a dela; saindo de tag com prioridade para tag sem (ou nenhuma) → `INITIAL_TICKET_PRIORITY` (Média); entre tags sem prioridade → `current` |
| `tagPriorityHint`             | `Definida pela tag <nome>` (sem prefixo `#`: o nome é exibido como foi cadastrado, e algumas tags já trazem `#` no próprio nome)                                                                                                  |
| `TAG_PRIORITY_SELECT_OPTIONS` | Opções do Select do cadastro: `{ value: "none", label: TAG_PRIORITY_NONE_LABEL }` primeiro, depois `TICKET_PRIORITIES` com `TICKET_PRIORITY_LABELS` (Baixa, Média, Alta, Crítica)                                                 |
| `tagPriorityToSelectValue`    | `null` → `"none"`; prioridade → ela mesma. O Select do shadcn não aceita `SelectItem` com valor vazio, por isso o sentinela                                                                                                       |
| `tagPriorityFromSelectValue`  | Inverso; `"none"` ou valor desconhecido → `null`                                                                                                                                                                                  |
| `describeTagPriority`         | Célula da coluna: rótulo da prioridade ou `EMPTY_VALUE_LABEL` (`—`) quando `null`                                                                                                                                                 |
| `TAG_PRIORITY_FIELD_HINT`     | `FieldDescription` do campo no diálogo da tag                                                                                                                                                                                     |

Rótulo do campo e da coluna: **`TICKET_PRIORITY_FIELD_LABEL`** ("Prioridade",
`app/_lib/domain/ticket.ts`), reaproveitado. Nenhum rótulo novo para isso.

## Validação — `app/_lib/validation/tag.ts` (alterado)

```ts
export const tagPrioritySchema // z.enum(TICKET_PRIORITIES).nullable()

export const createTagSchema // z.object({ departmentId, name, priority: tagPrioritySchema.default(null) })
export type CreateTagInput = z.infer<typeof createTagSchema>
export type CreateTagFormValues = z.input<typeof createTagSchema>

export const updateTagSchema // z.object({ id, name, priority: tagPrioritySchema })
export type UpdateTagInput = z.infer<typeof updateTagSchema>
```

| Campo                | Regra                            | Mensagem                           |
| -------------------- | -------------------------------- | ---------------------------------- |
| `priority` (criação) | enum ou `null`; ausente → `null` | `Selecione uma prioridade válida.` |
| `priority` (edição)  | enum ou `null`, **obrigatório**  | `Selecione uma prioridade válida.` |

- **`renameTagSchema` e `RenameTagInput` saem**, substituídos por
  `updateTagSchema` / `UpdateTagInput`. Na edição a prioridade é obrigatória
  (pode ser `null`) para que um envio sem o campo não apague a prioridade da tag
  em silêncio.
- Na criação, o default `null` segue o padrão de `createTicketSchema`: o
  formulário usa `useForm<CreateTagFormValues, unknown, CreateTagInput>`.
- `createTicketSchema` **não muda**.

## `df-data` — o que mudar

### `app/_lib/data/tags.ts`

```ts
export async function listTags(scope: TagListScope): Promise<TagListItem[]>
export async function listActiveDepartmentTags(
  departmentId: number,
): Promise<TagOption[]>
export async function insertTag(
  departmentId: number,
  values: TagValues,
): Promise<InsertTagOutcome>
export async function updateTag(
  id: number,
  values: TagValues,
): Promise<UpdateTagOutcome>
export async function findTagDepartment(id: number): Promise<number | null>
```

- `listTags` e `listActiveDepartmentTags` acrescentam `priority: tag.priority`
  ao `select`.
- `insertTag` grava `{ departmentId, name: values.name, priority: values.priority }`.
  Resto da transação igual (trava do setor, `checkTagDepartment`, tratamento
  de `name_taken`, que passa a usar `values.name`).
- **`updateTagName` é substituída por `updateTag`**: `set({ name, priority,
updatedAt: new Date() })`, mesmo tratamento de `not_found` e `name_taken`.
- `findTagDepartment` **não muda**: a action só precisa do setor para
  autorizar. A prioridade da tag para a abertura é lida em `insertTicket` (abaixo).

### `app/_lib/data/tickets.ts` — `insertTicket`

- `InsertTicketValues.priority` continua sendo a prioridade **escolhida** pelo
  autor (o que veio do formulário).
- Na leitura `for share` da tag que já existe no passo 1, acrescentar
  `priority: tag.priority`.
- Depois de validar a tag (`isUsableTicketTag`), calcular
  `const priority = resolveTicketPriority(tagRow.priority, values.priority)` e
  gravar **esse** valor em `ticket.priority` e em `ticketHistory.toPriority` do
  evento `criacao`. `values.priority` não é mais gravado direto.
- Tag inexistente, de outro setor ou inativa → `{ status: "invalid_tag" }` como
  hoje, antes de qualquer resolução.
- Nenhuma outra função de dados grava `ticket.priority`. Edição do chamado e
  aceite de transferência que troquem a tag **não** tocam a prioridade.

## `df-actions` — o que mudar

### `app/_lib/actions/tags.ts`

```ts
export const createTag: (input: CreateTagInput) => Promise<TagActionResult>
export const updateTag: (input: UpdateTagInput) => Promise<TagActionResult>
export const setTagActive: (
  input: SetTagActiveInput,
) => Promise<TagActionResult>
```

- `createTag`: chama `insertTag(parsed.data.departmentId, { name, priority })`.
  Resto igual.
- **`renameTag` é substituída por `updateTag`**: `updateTagSchema.safeParse`,
  `authorizeStoredTag` como hoje, depois `updateTag(id, { name, priority })`
  da data layer. Tradução de outcome igual à de `renameTag`. Mensagem de
  sucesso `Tag atualizada.` (substitui `Tag renomeada.`).
- O nome da action coincide com o da função de dados: importe a de dados com
  alias (`import { updateTag as saveTag } from "@/app/_lib/data/tags"`) ou
  como preferir, desde que a action exportada se chame `updateTag`.
- `TagErrorCode` e `TagActionResult` não mudam.

### `app/_lib/actions/tickets.ts` — `createTicket`

**Sem mudança de fluxo.** Continua repassando `parsed.data.priority` a
`insertTicket`; a substituição pela prioridade da tag acontece na transação
(ADR 020). Tag inválida segue devolvendo `INVALID_TAG` como hoje. A action não
lê a tag nem chama `resolveTicketPriority`.

## `df-ui` — o que mudar

### Tabela de tags — `app/(app)/registry/tags/_components/tags-table.tsx`

- Coluna **Prioridade** (`header: TICKET_PRIORITY_FIELD_LABEL`), entre
  **Status** e **Chamados**, nas duas variantes (diretor e admin). Célula:
  `describeTagPriority(row.priority)`. Se quiser o mesmo ponto colorido das
  tabelas de chamado, reaproveite a peça usada em `ticket-list-columns.tsx`
  para prioridade não nula e mostre só `—` para `null`.

### Diálogo — `app/(app)/registry/tags/_components/tag-form-dialog.tsx`

- O modo `"rename"` vira **`"edit"`**; a prop `tag` passa a ser
  `Pick<TagListItem, "id" | "name" | "departmentId" | "priority">`. Botão da
  linha "Editar" (`aria-label` `Editar <nome>`), título "Editar tag", botão
  "Salvar alterações", descrição: o nome novo aparece em todos os chamados que
  usam a tag e a prioridade vale só para chamados abertos daqui em diante.
- `useForm<CreateTagFormValues, unknown, CreateTagInput>`; `defaultValues`:
  criação com `priority: null`, edição com `props.tag.priority`.
- Campo **Prioridade** (`Controller`) abaixo do nome, em `Select`:
  rótulo `TICKET_PRIORITY_FIELD_LABEL`, opções `TAG_PRIORITY_SELECT_OPTIONS`,
  `value={tagPriorityToSelectValue(field.value ?? null)}`,
  `onValueChange={(v) => field.onChange(tagPriorityFromSelectValue(v))}`,
  descrição `TAG_PRIORITY_FIELD_HINT`.
- Envio: edição → `updateTag({ id: props.tag.id, name, priority })`; criação
  → `createTag(values)`. `NAME_TAKEN` → erro no campo `name`, como hoje.
- `tag-row-actions.tsx` passa `priority` da linha ao diálogo.

### Abertura — `new-ticket-dialog.tsx` e `ticket-priority-field.tsx`

- `const lock = ticketPriorityLockFor(options.tags, form.watch("tagId"))`
  (ou `useWatch`).
- `TicketPriorityField` ganha prop opcional `hint?: string` (renderizada como
  `FieldDescription`, ligada por `aria-describedby` quando não há erro). Com
  `lock`: `disabled` e `hint={lock.hint}`; sem `lock`: livre e sem hint.
- **Não desabilite pelo `Controller`/`register`** (`disabled` do RHF remove o
  campo do envio e o Zod cai no default `media`). Desabilite só o `Select`
  pela prop `disabled` do `TicketPriorityField`; o valor continua no formulário.
- Ao trocar a tag (no `onChange` do `TicketTagField`, antes ou depois de
  `field.onChange`): `form.setValue("priority", ticketPriorityOnTagChange(options.tags, anterior, próxima, atual))`.
  Isso põe a prioridade da tag no campo, e volta a Média ao sair de uma tag
  com prioridade para uma sem.
- O servidor é a autoridade (ADR 020): a trava é conveniência de interface.
- A edição do chamado (`ticket-edit-*`) **não** ganha campo de prioridade nem
  trava; trocar a tag ali não muda nada na prioridade.

## Textos

| Onde                      | Texto                                                                                               |
| ------------------------- | --------------------------------------------------------------------------------------------------- |
| Opção sem prioridade      | `Sem prioridade (escolhida na abertura)`                                                            |
| Hint do Select travado    | `Definida pela tag <nome>`                                                                          |
| Descrição do campo na tag | `Chamados abertos com esta tag recebem esta prioridade. Mudar aqui não altera chamados já abertos.` |
| Coluna / rótulo do campo  | `Prioridade` (`TICKET_PRIORITY_FIELD_LABEL`)                                                        |
| Célula sem prioridade     | `—`                                                                                                 |
| Sucesso da edição da tag  | `Tag atualizada.`                                                                                   |
| Prioridade inválida (Zod) | `Selecione uma prioridade válida.`                                                                  |

## Riscos (técnicos)

1. **`disabled` do RHF** apaga o valor do envio; ver a regra no `df-ui`.
2. **Formulário aberto com prioridade velha**: o admin muda a tag enquanto o
   autor preenche; o autor vê a antiga, o banco grava a nova (leitura sob
   `for share` na transação). Aceito; o detalhe mostra a gravada.
3. **Renomeação de `renameTag`/`updateTagName`/`UpdateTagNameOutcome`** quebra
   os chamadores até as ondas 1 e 2 fecharem.

## Critério de pronto

1. Migration aplicada: `tag.priority` existe, nullable, tipo `ticket_priority`.
2. Admin cria tag com Crítica e edita outra para Alta; a coluna mostra os
   rótulos, e `—` nas tags sem prioridade.
3. Abertura com tag Crítica: Select travado em Crítica com
   `Definida pela tag <nome>`; chamado grava `critica`.
4. Forjado `priority: "baixa"` com tag Crítica grava `critica`.
5. `npx tsc --noEmit`, `npm run lint` e `npm run build` passam.

## Cenários do `df-qa`

| #   | Cenário                                                                                                                                                                                                                                         | Esperado                                                                                                                                                                                                    |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Admin de setor cria tag "QA Crítica" com prioridade Crítica                                                                                                                                                                                     | Toast `Tag criada.`; linha com Prioridade "Crítica"; banco: `tag.priority = 'critica'`                                                                                                                      |
| 2   | Admin cria tag sem mexer na prioridade                                                                                                                                                                                                          | Opção padrão `Sem prioridade (escolhida na abertura)`; coluna `—`; banco `priority is null`                                                                                                                 |
| 3   | Admin edita tag existente: muda nome e prioridade para Alta no mesmo diálogo                                                                                                                                                                    | Toast `Tag atualizada.`; nome e coluna atualizados; banco `name` e `priority = 'alta'`                                                                                                                      |
| 4   | Admin edita tag com prioridade para "Sem prioridade"                                                                                                                                                                                            | Coluna `—`; banco `priority is null`                                                                                                                                                                        |
| 5   | Edição com nome já usado no setor                                                                                                                                                                                                               | Erro no campo nome (`NAME_TAKEN`); prioridade não gravada                                                                                                                                                   |
| 6   | Membro abre chamado com tag Crítica                                                                                                                                                                                                             | Select de prioridade desabilitado em "Crítica" com `Definida pela tag QA Crítica`; após criar, detalhe mostra Crítica e SLA de 3h; `ticket.priority` e `ticket_history.to_priority` (`criacao`) = `critica` |
| 7   | Escolhe Baixa com tag sem prioridade, troca para tag Crítica e depois para outra tag sem prioridade                                                                                                                                             | Na Crítica o Select trava em Crítica; ao voltar para tag sem prioridade o Select destrava em **Média** (não Baixa)                                                                                          |
| 8   | Tag sem prioridade, escolhe Alta                                                                                                                                                                                                                | Grava `alta`                                                                                                                                                                                                |
| 9   | **Forjado**: chamar a action `createTicket` (via devtools, reenviando a requisição) com `priority: "baixa"` e `tagId` da tag Crítica                                                                                                            | Chamado grava `critica` no ticket e no `to_priority` da `criacao`                                                                                                                                           |
| 10  | Forjado: `tagId` de outro setor com `priority: "critica"`                                                                                                                                                                                       | `INVALID_TAG`; nenhuma linha nova em `ticket`, `ticket_tag`, `ticket_history`                                                                                                                               |
| 11  | Responsável edita o chamado do cenário 6 trocando a tag por uma de prioridade Baixa                                                                                                                                                             | `ticket.priority` continua `critica`; nenhum evento de prioridade no histórico                                                                                                                              |
| 12  | Chamado Crítica transferido a outro setor; após o aceite, o novo responsável edita e escolhe uma tag do setor de destino com prioridade Baixa (o aceite em si não pede tag hoje: `acceptTicketTransferSchema` só tem `ticketId` e `transferId`) | `ticket.priority` continua `critica`                                                                                                                                                                        |
| 13  | Admin muda a prioridade da tag "QA Crítica" para Baixa                                                                                                                                                                                          | Chamados já abertos com ela continuam `critica` (consulta: `select priority from ticket` dos chamados do cenário 6); só os novos saem com Baixa                                                             |
| 14  | Diretor vê a coluna Prioridade em tags de todos os setores                                                                                                                                                                                      | Coluna presente nas duas variantes da tabela                                                                                                                                                                |

## Checklist de encerramento

- [ ] `npm run db:migrate` aplicou `0019_tag_priority`
- [ ] `df-data`: `listTags`, `listActiveDepartmentTags`, `insertTag`, `updateTag`, `insertTicket`
- [ ] `df-actions`: `createTag`, `updateTag` (sai `renameTag`)
- [ ] `df-ui`: coluna, diálogo de edição, trava do Select
- [ ] `df-reviewer`, `df-qa`
