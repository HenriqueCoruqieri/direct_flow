# Contrato — Empresa no chamado

Pedido pelo usuário em 2026-11-09. Este documento é a referência única da
feature (sem plano em `docs/plans/`): escopo, decisões, riscos, etapas,
assinaturas, cenários e checklist. Decisão de schema no ADR 021. Depende do
cadastro de empresas (`docs/contracts/registry-companies.md`), que não muda.

## O que é

Todo chamado passa a ser aberto **para uma empresa** (o cliente atendido). A
empresa é escolhida na abertura, aparece no detalhe, pode ser trocada na edição
e aparece nas tabelas da Fila e de Meus chamados. No mesmo pacote, o botão
"Enviar" sai da tabela da Fila e passa a existir no detalhe do chamado.

## Decisões fixadas pelo usuário

| Tema           | Decisão                                                                                                                                                                        |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Significado    | Empresa é o cliente para quem o chamado é aberto                                                                                                                               |
| Coluna         | `ticket.company_id`, FK para `company`, `on delete restrict`, **nullable** no banco (chamados existentes ficam sem empresa), com índice                                        |
| Abertura       | "Empresa" **obrigatória**, **primeiro** campo (acima de Título). Só **ativas**, combobox com busca, nome fantasia e CNPJ mascarado. O servidor confere que existe e está ativa |
| Detalhe        | No topo do card "Detalhes", acima de "Tipo": nome fantasia e, abaixo, CNPJ mascarado. Sem empresa: `—`                                                                         |
| Edição         | Editável por quem edita hoje (ADR 017: só o destinatário). Obrigatória ao salvar, inclusive em chamado antigo sem empresa. Lista só ativas                                     |
| Histórico      | A troca entra em `ticket_history` (`from_company_id`/`to_company_id`, FK restrict, nullable) e aparece na linha do tempo no padrão dos outros eventos                          |
| Tabelas        | Coluna "Empresa" em `/queue` e `/tickets`: nome fantasia em destaque e, abaixo, menor, só o final do CNPJ (`…/0001-90`, também alfanumérico). Sem empresa: `—`                 |
| "Enviar"       | Sai da tabela da Fila (objetivo: tabela sem rolagem horizontal) e passa ao detalhe, com a **mesma** regra de permissão                                                         |
| Seed QA        | Chamados QA vinculados a empresas do seed onde fizer sentido                                                                                                                   |
| Fora do escopo | Busca e filtro de chamado por empresa, dashboard por empresa, botões Buscar CNPJ/CEP                                                                                           |

## Decisões do arquiteto (sujeitas a confirmação)

1. **Sem empresa ativa, ninguém abre chamado.** Bloqueio
   `NO_ACTIVE_COMPANIES` em `checkTicketCreation`, no padrão de "setor sem
   tags": botão "Novo chamado" esmaecido com a mensagem e action recusando com
   `FORBIDDEN`. Sem isso, o formulário abriria com um obrigatório impossível.
2. **Empresa atual desativada, na edição** (recomendação do usuário): pode ser
   mantida enquanto não for trocada; trocar, só para ativa. Uma função só,
   `isUsableTicketCompany(company, currentCompanyId)`, na criação (com `null`)
   e na edição. A opção inativa atual aparece com `(inativa)`.
3. **Linha do tempo.** Evento novo `mudanca_empresa`, no padrão de
   `mudanca_tag`. Como a linha do tempo resume uma ação numa linha
   (`docs/contracts/timeline-summary.md`), a troca pelo "Editar" aparece como
   "Editou o chamado." com a nota `Alterou empresa (QA Alfa → QA Beta).`, no
   padrão já usado pelo tipo (`tipo (Dúvida → Bug)`). Nome gravado é o do
   momento da troca.
4. **A abertura grava a empresa no histórico** a partir da Etapa 2 (`criacao`
   com `to_company_id`). Sem backfill.
5. **Coluna "Empresa"** logo depois de "Título" nas duas tabelas.
6. **"Enviar" no detalhe**: no cabeçalho, ao lado de "Assumir", mesmo diálogo
   de hoje. "Assumir" continua na tabela da Fila.
7. **Rótulo da opção**: `QA Alfa — 12.345.678/0001-95`; a busca casa com
   qualquer trecho do rótulo.

## Etapas, migrations e ondas

| Etapa | Escopo                                          | Migration                                                                      | Commit  |
| ----- | ----------------------------------------------- | ------------------------------------------------------------------------------ | ------- |
| 1     | empresa na abertura e no detalhe; seed QA       | `0022_ticket_company` (gerada)                                                 | `feat:` |
| 2     | empresa na edição e na linha do tempo           | `0023_ticket_company_history` (`mudanca_empresa`, `*_company_id` no histórico) | `feat:` |
| 3     | coluna nas tabelas; "Enviar" da Fila ao detalhe | nenhuma                                                                        | `feat:` |

As duas migrations só acrescentam. Quem aplica é o usuário (`npm run
db:migrate`), entre a Onda 0 e a Onda 1 da etapa. Código novo com banco antigo
quebra (coluna inexistente); banco novo com código antigo funciona.

```
Onda 0  df-architect     schema · migration · tipos · domínio · Zod
        usuário          npm run db:migrate (Etapas 1 e 2)
Onda 1  df-data  ∥  df-ui (contra o contrato)
        usuário          npm run db:seed com SEED_QA=true (Etapa 1)
Onda 2  df-actions  ∥  df-ui (liga erros e ações)   — Etapa 3 sem df-actions
Onda 3  df-reviewer
Onda 4  df-qa            T1–T12 · E1–E14 · L1–L14
```

Sem e-mail, variável de ambiente, pacote ou rota novos.

## Riscos

1. **`tsc` vermelho entre ondas** (precedente em `docs/plans/registry-people.md`):
   erros listados por etapa, somem com as Ondas 1 e 2.
2. **Corrida com a desativação**: o servidor confere sob `for share` dentro
   da transação; erro no campo, sem toast genérico.
3. **Abertura bloqueada** se todas as empresas forem desativadas (decisão 1).
4. ~~**Busca do combobox** casa com o rótulo: `12.345.678` acha, `12345678`
   não.~~ **Resolvido** (2026-11-09): o campo virou autocompletar com filtro
   próprio, `matchesTicketCompanySearch` no domínio, que compara o CNPJ sem
   máscara. O `Combobox` compartilhado não mudou.
5. **Edição obrigatória em chamado antigo**: corrigir só o título exige escolher
   empresa (pedido do usuário).
6. **Sem rolagem horizontal** não é garantido só por tirar o "Enviar": a coluna
   nova ocupa largura. Cenário L7 mede. **Atualizado** (2026-11-09): "Tipo"
   saiu da vista de `/queue` e `/tickets` e Título/Tag/Setor atual quebram
   linha; o caso médio cabe, o pior caso ainda rola (limitação conhecida, Etapa
   3, cenário L7). **Fechado** (2026-11-09, fim da Etapa 3): com "Empresa"
   `max-w-32`, "Tag" `max-w-36` truncada e `px-3` no `DataTable`, o caso médio
   cabe em 1280 e 1366; o pior caso (aba "Todos" com tags longas) cabe em 1366
   e rola em 1280 (+76 px na Fila, +54 px em Meus chamados). Limitação conhecida
   aceita pelo usuário.
7. **Dois "Enviar" no detalhe**: "Enviar" (pessoa do setor, cabeçalho) e
   "Enviar para outro setor" (conclusão). Rótulos e títulos de diálogo
   distintos.

## Critério de pronto (por etapa)

`npx tsc --noEmit`, `npm run lint` e `npm run build` passam; `df-reviewer` sem
bloqueante; `df-qa` aprovado nos cenários da etapa; checklist da etapa marcado;
nenhum agente escreveu fora dos seus caminhos.

## Andamento

- [x] Etapa 1 — concluída em 2026-11-09: Ondas 0–2, `tsc`/lint/build,
      `df-reviewer` aprovado com atenções, `df-qa` 11/12 sem falhas
      (`docs/test-reports/2026-11-09-ticket-company-etapa-1.md`). Em aberto: T10
      e `INVALID_COMPANY` em execução, `NO_ACTIVE_COMPANIES` (para o `df-debug`)
- [x] Etapa 2 — concluída em 2026-11-09: Ondas 0–2, `tsc`/lint/build,
      `df-reviewer` aprovado com atenções, `df-qa` 14/14 após o Reteste 1 (E9
      corrigido pelo `df-ui`)
      (`docs/test-reports/2026-11-09-ticket-company-etapa-2.md`)
- [x] Etapa 3 — concluída em 2026-11-09: Ondas 0–2 (sem `df-actions`),
      `tsc`/lint/build, `df-reviewer` aprovado sem achados, `df-qa` 13/14 e
      Retestes 1 e 2 de L7; o que resta de L7 é o pior caso em 1280, limitação
      conhecida aceita (`docs/test-reports/2026-11-09-ticket-company-etapa-3.md`).
      Pendência fora do escopo: Cadastros → Pessoas (+304 px) e Tags (+67 px,
      coluna "Ações" cortada em "Desa…") rolam em 1280; não foram causadas por
      esta etapa (o `px-3` só reduz largura). Para o `df-ui` avaliar

## Padrões reaproveitados

- outcome, resultado de action e erro no campo: `docs/contracts/ticket-creation.md`
  (`invalid_tag` → `INVALID_TAG` → `setError("tagId")`)
- trava `for share` na linha validada: `insertTicket` (tag) e ADR 020
- edição pelo destinatário: ADR 017, `docs/contracts/ticket-edit.md`,
  `docs/contracts/assignee-edit-and-assume.md`
- evento de troca no histórico: `mudanca_tag`; resumo por ação:
  `docs/contracts/timeline-summary.md`
- "Enviar": `docs/contracts/queue-default-and-comment-edit.md`,
  `docs/contracts/department-queue.md`
- CNPJ: `app/_lib/domain/brazilian-formats.ts` (`formatCnpj`, numérico e
  alfanumérico), `docs/contracts/registry-companies.md`

Versões observadas: `next@16.3.5`, `drizzle-orm@0.45.2`, `drizzle-kit@0.31`,
`zod@4.6.5`, `react-hook-form@7.88`, `@tanstack/react-table@9.2.4`.

Textos novos (todas as etapas):

| Constante                                        | Texto                                                                                                   | Onde                       |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------- | -------------------------- |
| `TICKET_COMPANY_LABEL`                           | `Empresa`                                                                                               | `domain/ticket-company.ts` |
| `TICKET_COMPANY_SEARCH_PLACEHOLDER`              | `Buscar empresa…`                                                                                       | `domain/ticket-company.ts` |
| `TICKET_COMPANY_EMPTY_SEARCH_MESSAGE`            | `Nenhuma empresa encontrada.`                                                                           | `domain/ticket-company.ts` |
| `TICKET_COMPANY_REQUIRED_MESSAGE`                | `Selecione a empresa.`                                                                                  | `domain/ticket-company.ts` |
| `INVALID_TICKET_COMPANY_MESSAGE`                 | `Esta empresa não está disponível. Escolha uma empresa ativa.`                                          | `domain/ticket-company.ts` |
| `NO_ACTIVE_COMPANIES` (bloqueio)                 | `Não há nenhuma Empresa ativa para registro de chamados, informe sua liderança.`                        | `domain/ticket.ts`         |
| `INACTIVE_TICKET_COMPANY_SUFFIX` (Etapa 2)       | `(inativa)`                                                                                             | `domain/ticket-company.ts` |
| `MISSING_TICKET_COMPANY_HINT` (Etapa 2)          | `Este chamado não tem empresa. Escolha uma para salvar.`                                                | `domain/ticket-company.ts` |
| `INACTIVE_TICKET_COMPANY_HINT` (Etapa 2)         | `A empresa atual está inativa. Você pode mantê-la, mas não poderá escolhê-la de novo depois de trocar.` | `domain/ticket-company.ts` |
| `HISTORY_EVENT_LABELS.mudanca_empresa` (Etapa 2) | `Mudança de empresa`                                                                                    | `domain/ticket-history.ts` |

---

# Etapa 1 — empresa na abertura e no detalhe

## Tabelas, enums e migration

### `db/schema.ts` (alterado, entregue)

```ts
ticket.companyId: integer("company_id").references(() => company.id, {
  onDelete: "restrict",
})
index("ticket_company_idx").on(table.companyId)

ticketRelations.company: one(company, { fields: [ticket.companyId], references: [company.id] })
companyRelations.tickets: many(ticket)
```

Nullable no banco; obrigatória na aplicação para chamado **novo** (ADR 021).

### Migration `db/migrations/0022_ticket_company.sql` (gerada, não aplicada)

```sql
ALTER TABLE "ticket" ADD COLUMN "company_id" integer;
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE restrict ON UPDATE no action;
CREATE INDEX "ticket_company_idx" ON "ticket" USING btree ("company_id");
```

Não destrutiva. Chamados existentes ficam com `company_id` nulo. Aplicar com
`npm run db:migrate` antes da Onda 1.

## Tipos — `app/_lib/types/`

### `ticket-company.ts` (novo, entregue)

```ts
export interface TicketCompanyFacts {
  id: number
  isActive: boolean
}

export interface TicketCompanyOption {
  id: number
  tradeName: string
  cnpj: string
}

export interface TicketCompanySummary
  extends TicketCompanyOption, TicketCompanyFacts {}
```

`cnpj` é sempre o valor guardado (14 caracteres, maiúsculas, sem máscara). Quem
exibe formata com `formatCnpj`.

### `ticket.ts` (alterado, entregue)

```ts
export type TicketCreationBlockReason =
  | "USER_INACTIVE"
  | "PASSWORD_CHANGE_REQUIRED"
  | "DEPARTMENT_UNASSIGNED"
  | "DEPARTMENT_WITHOUT_TAGS"
  | "NO_ACTIVE_COMPANIES"

export interface InsertTicketValues {
  companyId: number
  title: string
  ...
}

export interface TicketInvalidCompany {
  status: "invalid_company"
}

export type InsertTicketOutcome =
  TicketSaved | TicketInvalidCompany | TicketInvalidTag | TicketInvalidAssignee

export interface NewTicketFormDefaults {
  companyId: number | undefined
  ...
}

export interface NewTicketFormAvailable {
  canCreate: true
  companies: TicketCompanyOption[]
  ...
}

export interface TicketDetail extends TicketVisibilityFacts {
  ...
  company: TicketCompanySummary | null
  ...
}
```

## Domínio — `app/_lib/domain/`

### `ticket-company.ts` (novo, entregue)

```ts
export const isUsableTicketCompany = (
  company: TicketCompanyFacts,
  currentCompanyId: number | null,
): boolean
```

`true` se a empresa está ativa **ou** é a empresa atual do chamado. Na
criação, `currentCompanyId` é sempre `null` (só ativa). A Etapa 2 usa o mesmo
predicado na edição com o `company_id` atual, o que permite manter uma empresa
desativada sem trocá-la.

```ts
export const ticketCompanyOptionLabel = (
  company: Pick<TicketCompanyOption, "tradeName" | "cnpj">,
): string
```

`QA Alfa — 12.345.678/0001-95` (nome fantasia, travessão, `formatCnpj`).
Rótulo da opção na lista do autocompletar e texto que o campo mostra depois
da escolha.

```ts
export const matchesTicketCompanySearch = (
  company: TicketCompanyOption,
  query: string,
): boolean
```

Filtro do autocompletar, rodado no cliente sobre a lista já carregada por
`listTicketCompanyOptions` (sem leitura nova no servidor). `true` quando:

- `query` vazia ou só espaços (lista inteira); ou
- o nome fantasia contém o trecho digitado, sem diferenciar maiúsculas nem
  acentos (`normalizeSearchText` de `domain/search.ts`: NFD sem marcas combinantes, minúsculas, `trim`; fonte única, que o `combobox.tsx` também passa a importar): `sao joao` acha
  `Padaria São João`; ou
- o CNPJ (14 caracteres limpos, como gravado) contém o trecho digitado depois
  de `stripCnpjMask` (maiúsculas, só `0-9A-Z`): `12345678`, `12.345.678`,
  `0001-95` e `ab.12c` acham. Digitado sem nenhum alfanumérico (`-`, `/`) não
  casa por CNPJ.

`stripCnpjMask` (novo, `domain/brazilian-formats.ts`) é o primeiro passo que
`cleanCnpj` já fazia, extraído para os dois usarem. A busca não usa
`cleanCnpj` porque ele é posicional (corta em 14 e só aceita letra nas 12
primeiras posições do valor), o que é certo para um CNPJ inteiro e errado para
um trecho do meio.

Constantes de texto: tabela no início deste documento.

### `ticket.ts` (alterado, entregue)

```ts
export const checkTicketCreation = (
  author: TicketAuthorFacts,
  activeTagCount: number,
  activeCompanyCount: number,
): TicketCreationCheck

export const buildNewTicketFormOptions = (
  author: TicketAuthorFacts,
  creator: TicketCreatorFacts,
  departmentName: string,
  tags: readonly TagOption[],
  assignees: readonly AssigneeOption[],
  companies: readonly TicketCompanyOption[],
): NewTicketFormOptions
```

- `checkTicketCreation`: ordem das checagens = a de hoje, e por último
  `activeCompanyCount < 1` → `NO_ACTIVE_COMPANIES`.
- `buildNewTicketFormOptions`: passa `companies.length` ao check; devolve
  `companies: [...companies]` e `defaults.companyId: undefined` (sem
  pré-seleção, mesmo com uma empresa só).
- `TICKET_CREATION_BLOCK_MESSAGES.NO_ACTIVE_COMPANIES`: texto da tabela.

## Validação — `app/_lib/validation/ticket.ts` (alterado, entregue)

```ts
export const ticketCompanyIdSchema = registryIdSchema(
  TICKET_COMPANY_REQUIRED_MESSAGE,
).max(POSTGRES_INTEGER_MAX, { error: TICKET_COMPANY_REQUIRED_MESSAGE })

export const createTicketSchema = z.object({
  companyId: ticketCompanyIdSchema,
  ...ticketFieldsSchema.shape,
  priority: ...,
  attachments: ...,
})
```

`companyId` é a **primeira** chave: com o formulário vazio, a primeira
`issue.message` (a que a action devolve) é `Selecione a empresa.`.
`CreateTicketInput.companyId: number`; `CreateTicketFormValues.companyId:
number` (o formulário começa com `undefined` pelos `defaultValues`). Nesta
etapa `editTicketSchema` **não** muda (Etapa 2).

## `tsc` entre ondas

Com a Onda 0 entregue, `npx tsc --noEmit` acusa seis erros, todos em arquivos
das Ondas 1 e 2:

| Arquivo                                    | Erro                                                       | Quem corrige |
| ------------------------------------------ | ---------------------------------------------------------- | ------------ |
| `app/_lib/data/tickets.ts:242`             | `TS2741` falta `company` em `TicketDetail`                 | `df-data`    |
| `app/_lib/actions/tickets.ts:118`          | `TS1360` falta `invalid_company` em `OUTCOME_FAILURES`     | `df-actions` |
| `app/_lib/actions/tickets.ts:157`          | `TS2554` `checkTicketCreation` pede 3 argumentos           | `df-actions` |
| `app/_lib/actions/tickets.ts:174`          | `TS2345` falta `companyId` em `InsertTicketValues`         | `df-actions` |
| `app/_lib/actions/tickets.ts:193`          | `TS7053` índice `invalid_company` (consequência do `:118`) | `df-actions` |
| `app/(app)/_components/app-top-bar.tsx:25` | `TS2554` `buildNewTicketFormOptions` pede 6 argumentos     | `df-ui`      |

`npm run lint` passa.

## `df-data` — o que criar e mudar

### `app/_lib/data/companies.ts` (acrescido)

```ts
export async function listTicketCompanyOptions(): Promise<TicketCompanyOption[]>
```

`select id, trade_name, cnpj from company where is_active order by
lower(trade_name), id`. Serve ao formulário de abertura (opções) e à contagem
de `checkTicketCreation` na action. Na Etapa 2 serve também à edição.

### `app/_lib/data/tickets.ts`

**`insertTicket`** — passo novo **antes** da tag (é o primeiro campo do
formulário; um erro por vez, na ordem dos campos):

1. `select id, is_active from company where id = $companyId for share`. Sem
   linha ou `!isUsableTicketCompany(row, null)` → `{ status:
"invalid_company" }`, sem gravar nada.
2. Tag, destinatário, insert — como hoje. O `insert into ticket` ganha
   `companyId: values.companyId`.

O `for share` impede que `updateCompanyActive` desative a empresa entre a
checagem e o insert (o `update` espera o commit). A FK sozinha não basta: ela
trava `for key share`, que não conflita com o `update` de `is_active`. Ordem
das travas: empresa → tag → pessoa; nenhuma outra transação trava empresa e tag
juntas, então não há ciclo.

**`findTicketDetail`** — `leftJoin(company, eq(company.id, ticket.companyId))`
na consulta do chamado; seleciona `company.id`, `company.tradeName`,
`company.cnpj`, `company.isActive` com nomes próprios (ex.: `companyId`,
`companyTradeName`…) e monta:

```ts
company: row.companyId !== null ? { id, tradeName, cnpj, isActive } : null
```

Sem espalhar os campos `company*` soltos no objeto devolvido. Não filtra por
`is_active`: o detalhe mostra a empresa mesmo desativada.

### `db/seed.ts` — `seedQa`

Detalhado em `docs/contracts/qa-seed.md` (revisão de 2026-11-09):
`[QA] Janela vencida` → `QA Alfa`; `[QA] Janela aberta` → `QA Beta`. Empresa
buscada por `cnpj`; chamado reaproveitado com `company_id` nulo recebe a
empresa (`update`, sem linha de histórico); empresa já gravada não é trocada.

## `df-actions` — `app/_lib/actions/tickets.ts`

```ts
export type TicketErrorCode =
  | "INVALID_INPUT"
  | "FORBIDDEN"
  | "INVALID_COMPANY"
  | "INVALID_TAG"
  | "INVALID_ASSIGNEE"
  | "INVALID_ATTACHMENT"
```

`createTicket(input: CreateTicketInput): Promise<CreateTicketResult>` — assinatura
igual. Mudanças na sequência:

1. Depois de `getAccountFacts()`: `const [tags, companies] = await
Promise.all([listActiveDepartmentTags(facts.departmentId),
listTicketCompanyOptions()])`.
2. `checkTicketCreation(facts, tags.length, companies.length)`; bloqueado →
   `FORBIDDEN` com `TICKET_CREATION_BLOCK_MESSAGES[reason]` (inclui
   `NO_ACTIVE_COMPANIES`). Antes do parse, como hoje.
3. `insertTicket({ companyId: parsed.data.companyId, ... })`.
4. `OUTCOME_FAILURES.invalid_company = { ok: false, code: "INVALID_COMPANY",
message: INVALID_TICKET_COMPANY_MESSAGE }`. Os anexos já copiados são
   descartados como nos outros outcomes de recusa (caminho existente).

Revalidação igual. A action não confere a empresa contra `companies`: a
autoridade é a leitura sob trava em `insertTicket`.

| Situação                          | `code`            | Mensagem                                                                         |
| --------------------------------- | ----------------- | -------------------------------------------------------------------------------- |
| nenhuma empresa ativa             | `FORBIDDEN`       | `Não há nenhuma Empresa ativa para registro de chamados, informe sua liderança.` |
| empresa ausente/inválida no input | `INVALID_INPUT`   | `Selecione a empresa.`                                                           |
| `invalid_company`                 | `INVALID_COMPANY` | `Esta empresa não está disponível. Escolha uma empresa ativa.`                   |

## `df-ui` — o que criar e mudar

### `app/(app)/_components/app-top-bar.tsx`

`listTicketCompanyOptions()` entra no `Promise.all` com tags e pessoas e vai
como 6º argumento de `buildNewTicketFormOptions`. Bloqueado →
`NewTicketBlockedButton` com a mensagem, como hoje.

### `app/(app)/_components/ticket-company-field.tsx` (novo)

No grupo `(app)` porque a Etapa 2 o usa no detalhe.

**Revisado em 2026-11-09 (decisão do usuário): autocompletar, não combobox.**
O `Combobox` compartilhado (`app/_components/combobox.tsx`) não muda. O campo
continua recebendo `companies: readonly TicketCompanyOption[]` e controlando
`companyId` (`number | undefined`) pelo `Controller`; o restante das props é
do `df-ui`.

- O usuário digita direto no campo (`label = TICKET_COMPANY_LABEL`,
  placeholder `TICKET_COMPANY_SEARCH_PLACEHOLDER`, `Buscar empresa…`).
- O campo continua recebendo o foco ao abrir o diálogo, mas focar **não** abre
  a lista (aberta pelo autofoco, ela cobriria Título e Descrição). A lista abre
  abaixo, com todas as empresas ativas recebidas, ao clicar/tocar no campo, ao
  digitar ou ao usar as setas.
- Ao digitar, a lista é `companies.filter((c) =>
matchesTicketCompanySearch(c, texto))`, no cliente, sem leitura nova.
- Cada opção mostra `ticketCompanyOptionLabel(c)`.
- Sem resultado: `TICKET_COMPANY_EMPTY_SEARCH_MESSAGE`.
- Escolher (clique ou Enter) grava o `id` e preenche o campo com o rótulo.
- Teclado: setas movem o destaque, Enter escolhe o destacado, Esc fecha a
  lista.
- Texto digitado que não corresponde a uma escolha não é empresa: `companyId`
  fica vazio e o envio cai em `Selecione a empresa.`.

### `app/(app)/_components/new-ticket-dialog.tsx`

- `Controller name="companyId"` com `TicketCompanyField` como **primeiro**
  campo do bloco, acima de "Título", largura total.
- `result.code === "INVALID_COMPANY"` → `form.setError("companyId", { message
}, { shouldFocus: true })` + `router.refresh()` (padrão do `INVALID_TAG`).
- Cancelar/fechar reseta para `options.defaults` (empresa vazia), como hoje.

### `app/(app)/tickets/[id]/_components/ticket-detail-fields.tsx`

Um `TicketDetailFieldList` novo, **antes** de `classification` (fora do
`TicketEditClassification` nesta etapa: a empresa ainda não é editável), com um
campo:

- `label`: `TICKET_COMPANY_LABEL`
- `value`: com empresa, nome fantasia (linha 1, peso do valor atual) e
  `formatCnpj(company.cnpj)` (linha 2, `text-xs text-muted-foreground
tabular-nums`); sem empresa, `EMPTY_VALUE_LABEL` (`—`).

Nada indica empresa desativada no detalhe (não pedido).

## Cenários do `df-qa` — Etapa 1

Contas: **D** = Diretor `diretorqa@gmail.com` · **A** = Administrador
`cazalbe@gmail.com` (Suporte) · **M** = Membro `rodalv@gmail.com` (Suporte).
Senhas vêm do usuário e nunca são escritas. Todo chamado criado tem título
começando por `[QA]`. As empresas do seed (`QA Alfa`, `QA Beta`, `QA Gama`) são
só leitura; empresa que precisar ser desativada é uma `[QA]` criada (ou
reativada) pelo próprio teste, com CNPJ da reserva de
`docs/contracts/registry-companies.md`, e termina desativada.

Pré-requisitos: `0022` aplicada; seed QA rodado depois da Onda 1.

| #   | Papel | Passos                                                                                                                          | Esperado                                                                                                                                                                                                     |
| --- | ----- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| T1  | M     | abrir "Novo chamado"                                                                                                            | primeiro campo é "Empresa", acima de "Título"; é um campo de texto vazio com o placeholder `Buscar empresa…`, sem empresa escolhida; o campo está focado e a lista fechada (Título e Descrição visíveis)     |
| T2  | M     | com o campo já focado, clicar/tocar nele sem digitar                                                                            | a lista abre abaixo com as empresas ativas do banco (consulta 1), em ordem de nome fantasia; `QA Alfa — 12.345.678/0001-95` e `QA Beta — AB.12C.D34/0001-84` presentes; `QA Gama` e `[QA]` inativas ausentes |
| T3  | M     | digitar `beta`, `0001-95`, `ab.12c` (limpando entre um e outro)                                                                 | só `QA Beta`; só `QA Alfa`; só `QA Beta`                                                                                                                                                                     |
| T4  | M     | preencher tudo menos a empresa e enviar                                                                                         | `Selecione a empresa.` no campo, foco nele; nenhum chamado criado (consulta 2)                                                                                                                               |
| T5  | M     | `[QA] Empresa Alfa` com `QA Alfa`, enviar                                                                                       | toast `Chamado #N criado.`; `ticket.company_id` = id de `QA Alfa` (consulta 3)                                                                                                                               |
| T6  | M     | abrir o detalhe do T5                                                                                                           | card "Detalhes": "Empresa" acima de "Tipo"; `QA Alfa` e, abaixo, menor, `12.345.678/0001-95`                                                                                                                 |
| T7  | M     | `[QA] Empresa Beta` com `QA Beta`; abrir o detalhe                                                                              | CNPJ `AB.12C.D34/0001-84`                                                                                                                                                                                    |
| T8  | A     | abrir um chamado anterior à migration (consulta 4)                                                                              | "Empresa" com `—`                                                                                                                                                                                            |
| T9  | A, D  | abrir "Novo chamado" (D só confere e cancela: na Diretoria o teste não cria)                                                    | campo "Empresa" igual ao T1/T2; A cria `[QA] Empresa Admin` com `QA Alfa` normalmente                                                                                                                        |
| T10 | D + M | D cria (ou reativa) `[QA] Empresa Temporária`; M abre "Novo chamado" e a escolhe; D a desativa em Cadastros → Empresas; M envia | erro `Esta empresa não está disponível. Escolha uma empresa ativa.` no campo, foco nele; a lista recarrega sem ela; nenhum chamado criado; a empresa termina desativada                                      |
| T11 | D     | abrir `[QA] Janela vencida` e `[QA] Janela aberta` de maior `id`                                                                | `QA Alfa / 12.345.678/0001-95` e `QA Beta / AB.12C.D34/0001-84`                                                                                                                                              |
| T12 | M     | escolher uma empresa, Cancelar, reabrir                                                                                         | empresa vazia de novo                                                                                                                                                                                        |
| T13 | M     | digitar `12345678` (sem máscara) e depois `ab12cd34`                                                                            | só `QA Alfa`; só `QA Beta`                                                                                                                                                                                   |
| T14 | M     | digitar `ALFA`, depois `qa alfa`; se houver empresa ativa com acento no nome (consulta 1), digitar um trecho dela sem acento    | só `QA Alfa` nos dois; a empresa acentuada aparece                                                                                                                                                           |
| T15 | M     | digitar `zzz-nao-existe`                                                                                                        | lista com `Nenhuma empresa encontrada.`; nenhuma opção                                                                                                                                                       |
| T16 | M     | com o campo focado e a lista fechada, `↓` (abre a lista), mais `↓` duas vezes, `↑` uma, Enter; depois `↓` de novo e Esc         | o destaque acompanha as setas; Enter preenche o campo com o rótulo da opção destacada e fecha a lista; Esc fecha a lista sem mudar a escolha                                                                 |
| T17 | M     | digitar `alfa` sem escolher nenhuma opção, preencher o resto e enviar                                                           | `Selecione a empresa.` no campo; nenhum chamado criado (consulta 2)                                                                                                                                          |
| T18 | M     | escolher `QA Alfa`, enviar `[QA] Empresa Autocompletar`                                                                         | chamado criado com `company_id` de `QA Alfa` (consulta 3); nenhuma requisição nova ao servidor enquanto se digita (aba Rede ou logs do dev server)                                                           |

Fora do navegador (para o `df-debug`, se acionado): `createTicket` com
`companyId` inexistente e com o id de `QA Gama` → `INVALID_COMPANY`; com `0`,
`-1`, `"1"` ou ausente → `INVALID_INPUT` `Selecione a empresa.`. O bloqueio
`NO_ACTIVE_COMPANIES` não é testado no navegador (exigiria desativar as
empresas do seed); o `df-reviewer` confere estaticamente.

Consultas de conferência (MCP `postgres`, só leitura):

```sql
-- 1: empresas que o combobox deve listar
select id, trade_name, cnpj from company where is_active order by lower(trade_name), id;

-- 2: nada criado no T4/T10
select count(*) from ticket where title like '[QA] Empresa%';

-- 3: empresa gravada
select t.id, t.title, t.company_id, c.trade_name, c.is_active
from ticket t left join company c on c.id = t.company_id
where t.title like '[QA]%' order by t.id desc limit 10;

-- 4: chamados sem empresa (anteriores à migration)
select id, title, current_department_id from ticket where company_id is null order by id desc limit 5;

-- migration aplicada
select is_nullable from information_schema.columns where table_name = 'ticket' and column_name = 'company_id';
select confdeltype from pg_constraint where conname = 'ticket_company_id_company_id_fk'; -- 'r'
```

## Checklist — Etapa 1

- [x] Onda 0: schema, `0022` gerada, tipos, domínio, Zod; lint passa; `tsc`
      só com os seis erros listados
- [x] Usuário: `npm run db:migrate`
- [x] Onda 1: `df-data` (`listTicketCompanyOptions`, `insertTicket`,
      `findTicketDetail`, seed) ∥ `df-ui` (campo, top bar, detalhe) — 2026-11-09
- [x] Usuário: `npm run db:seed` com `SEED_QA=true`
- [x] Onda 2: `df-actions` (`createTicket`) ∥ `df-ui` (`INVALID_COMPANY`) —
      2026-11-09
- [x] `tsc`, lint, build — 2026-11-09
- [x] `df-reviewer` — 2026-11-09, aprovado com atenções (CNPJs do seed viraram
      as constantes `QA_ALFA_CNPJ` e `QA_BETA_CNPJ`)
- [x] `df-qa` T1–T12 — 2026-11-09, 11/12 passaram, 0 falhas, T10 não executado
      (`docs/test-reports/2026-11-09-ticket-company-etapa-1.md`)
- [ ] T10 e `INVALID_COMPANY` em execução (empresa desativada entre abrir e
      enviar) — para o `df-debug`
- [ ] `NO_ACTIVE_COMPANIES` em execução — para o `df-debug`
- [x] Revisão do campo para autocompletar — Onda 0 (2026-11-09):
      `matchesTicketCompanySearch`, `TICKET_COMPANY_EMPTY_SEARCH_MESSAGE`,
      `stripCnpjMask`, `normalizeSearchText` (`domain/search.ts`)
- [x] Revisão do campo — `df-ui` (`ticket-company-field.tsx`), `df-reviewer`,
      `df-qa` T1–T3 e T13–T18

---

# Etapa 2 — empresa na edição e na linha do tempo

Revisado contra o código em 2026-11-09 (Onda 0 entregue). As assinaturas
abaixo são as do código, não rascunho.

## Decisões da etapa (fechadas pelo usuário)

- Quem edita segue o ADR 017 (só o destinatário, no setor dele). Nada muda em
  `ticketEditBlockFor`.
- Na edição, "Empresa" é **obrigatória**, inclusive em chamado antigo sem
  empresa: salvar só o título exige escolher uma.
- A lista mostra as ativas; a empresa atual, se inativa, aparece **primeiro**
  com `(inativa)` e pode ser mantida. Trocar, só para ativa. Regra única:
  `isUsableTicketCompany(company, currentCompanyId)`.
- A troca grava `mudanca_empresa` em `ticket_history` (`from_company_id`,
  `to_company_id`). Na linha do tempo a ação aparece como "Editou o chamado."
  com a nota `Alterou empresa (QA Alfa → QA Beta).` (nomes do momento da
  troca, gravados na nota).
- A partir desta etapa, a linha `criacao` grava `to_company_id`. Sem backfill.
- Risco aceito (2026-11-09): sem nenhuma empresa ativa, chamado antigo sem
  empresa fica **não editável** — a empresa é obrigatória na edição e não há
  o que escolher. Sem exceção na regra e sem aviso especial na tela.

## Tabelas, enums e migration

### `db/schema.ts` (alterado, entregue)

```ts
historyEventEnum: [..., "resolucao", "mudanca_empresa"]

ticketHistory.fromCompanyId: integer("from_company_id").references(() => company.id, { onDelete: "restrict" })
ticketHistory.toCompanyId:   integer("to_company_id").references(() => company.id, { onDelete: "restrict" })
index("history_to_company_idx").on(table.toCompanyId)

ticketHistoryRelations.fromCompany: one(company, { ..., relationName: "history_from_company" })
ticketHistoryRelations.toCompany:   one(company, { ..., relationName: "history_to_company" })
companyRelations.historyFrom: many(ticketHistory, { relationName: "history_from_company" })
companyRelations.historyTo:   many(ticketHistory, { relationName: "history_to_company" })
```

Sem índice em `from_company_id`, como em `from_tag_id`: empresa nunca é
excluída, então a FK não precisa varrer pelo lado `from`.

### Migration `db/migrations/0023_ticket_company_history.sql` (aplicada em 2026-11-09)

```sql
ALTER TYPE "public"."history_event" ADD VALUE 'mudanca_empresa';
ALTER TABLE "ticket_history" ADD COLUMN "from_company_id" integer;
ALTER TABLE "ticket_history" ADD COLUMN "to_company_id" integer;
ALTER TABLE "ticket_history" ADD CONSTRAINT "ticket_history_from_company_id_company_id_fk" FOREIGN KEY ("from_company_id") REFERENCES "public"."company"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "ticket_history" ADD CONSTRAINT "ticket_history_to_company_id_company_id_fk" FOREIGN KEY ("to_company_id") REFERENCES "public"."company"("id") ON DELETE restrict ON UPDATE no action;
CREATE INDEX "history_to_company_idx" ON "ticket_history" USING btree ("to_company_id");
```

Não destrutiva. O `ADD VALUE` não é usado na mesma migration (precedente:
`0015`). Aplicar com `npm run db:migrate` antes da Onda 1.

## Tipos — `app/_lib/types/` (entregues)

### `ticket-company.ts`

```ts
export interface TicketCompanyRef {
  id: number
  tradeName: string
}

export interface TicketCompanyOption extends TicketCompanyRef {
  cnpj: string
}
```

`TicketCompanyOption` só passou a herdar de `TicketCompanyRef`; a forma é a
mesma da Etapa 1.

### `ticket.ts`

```ts
export interface TicketHistoryEntry {
  ...
  toTagName: string | null
  fromCompanyName: string | null
  toCompanyName: string | null
  note: string | null
}
```

### `ticket-edit.ts`

```ts
export interface TicketEditSnapshot {
  company: TicketCompanyRef | null
  title: string
  ...
}

export interface TicketEditSource extends TicketEditSnapshot {
  company: TicketCompanySummary | null
  id: number
  status: TicketStatus
  currentDepartmentName: string
}

export interface TicketEditValues {
  companyId: number
  title: string
  ...
}

export interface TicketCompanyChange {
  from: TicketCompanyRef | null
  to: TicketCompanyRef
}

export interface TicketEditChanges {
  company: TicketCompanyChange | null
  title: boolean
  ...
}

export type UpdateTicketByAssigneeOutcome =
  | TicketEditSaved
  | TicketNotFound
  | TicketNotEditable
  | TicketInvalidCompany
  | TicketInvalidTag
  | TicketInvalidAssignee
  | TicketNoChanges
  | TicketHandoffCommentRequired

export interface EditTicketFormDefaults {
  ticketId: number
  companyId?: number
  ...
}

export interface TicketEditFormOptions {
  defaults: EditTicketFormDefaults
  companies: TicketCompanySummary[]
  companyHint?: string
  ...
}
```

`TicketDetail` (com `company: TicketCompanySummary | null`) satisfaz
`TicketEditSource`: a página continua passando o `TicketDetail` inteiro.
`UpdateTicketByAssigneeValues extends TicketEditValues` herda `companyId`.

## Domínio — `app/_lib/domain/` (entregue)

### `ticket-company.ts`

```ts
export const INACTIVE_TICKET_COMPANY_SUFFIX = "(inativa)"
export const MISSING_TICKET_COMPANY_HINT =
  "Este chamado não tem empresa. Escolha uma para salvar."
export const INACTIVE_TICKET_COMPANY_HINT =
  "A empresa atual está inativa. Você pode mantê-la, mas não poderá escolhê-la de novo depois de trocar."

export const ticketCompanyEditOptionLabel = (company: TicketCompanySummary): string
export const ticketCompanyEditOptions = (
  current: TicketCompanySummary | null,
  active: readonly TicketCompanyOption[],
): TicketCompanySummary[]
export const companyEditHintFor = (current: TicketCompanySummary | null): string | undefined
```

- `ticketCompanyEditOptionLabel`: `ticketCompanyOptionLabel(company)`; inativa
  ganha ` (inativa)` → `[QA] Empresa Inativa — <CNPJ> (inativa)`.
- `ticketCompanyEditOptions`: as ativas recebidas, na ordem recebida, com
  `isActive: true`; com `current` inativa, ela entra **primeiro**. Ativa atual
  já está na lista e não é duplicada.
- `companyEditHintFor`: `null` → `MISSING_TICKET_COMPANY_HINT`; inativa →
  `INACTIVE_TICKET_COMPANY_HINT`; ativa → `undefined`.

A atual inativa **precisa** estar nas opções: o `Autocomplete`
(`app/_components/autocomplete.tsx:92-97`) zera o valor que não encontra nas
opções (`hasStaleValue`).

Na **edição** o esvaziamento depois de um `INVALID_COMPANY` não depende do
`hasStaleValue` (corrigido no E9, 2026-11-09): o provider
(`ticket-edit-provider.tsx`) faz `form.reset({ ...form.getValues(), companyId:
undefined }, { keepDefaultValues: true, keepIsSubmitted: true, keepFieldsRef:
true })` antes do `setError`, e `ticket-edit-company.tsx` lê o valor com
`useWatch` (sem fallback para o salvo). Na abertura, o `hasStaleValue` continua
sendo o que esvazia o campo após o `router.refresh()`. Desde a Etapa 3b de
`docs/contracts/form-field.md`, a leitura sem fallback mora no próprio
`FormField` (para todos os campos) e o `ticket-edit-company.tsx` deixa de ter
`useWatch`; o `reset` do provider não muda.

### `ticket-edit.ts`

```ts
export const buildTicketEditFormOptions = (
  ticket: TicketEditSource,
  tags: readonly TagOption[],
  assignees: readonly AssigneeOption[],
  companies: readonly TicketCompanyOption[],
): TicketEditFormOptions
```

`defaults.companyId = ticket.company?.id` (sem empresa, `undefined`: o campo
começa vazio e salvar cai em `Selecione a empresa.`);
`companies = ticketCompanyEditOptions(ticket.company, companies)`;
`companyHint = companyEditHintFor(ticket.company)`.

```ts
export const diffTicketEdit = (
  current: TicketEditSnapshot,
  next: TicketEditValues,
  chosenCompany: TicketCompanyRef,
): TicketEditChanges
```

`company = current.company?.id === chosenCompany.id ? null : { from:
current.company (só id e nome) , to: chosenCompany (só id e nome) }`. A
comparação usa `chosenCompany`, a linha lida no banco; quem chama passa a
linha do `values.companyId`. `hasTicketEditChanges` considera `company`.
`requiresHandoffComment` não muda.

`describeTicketEditNote`: parte nova, **primeira**,
`empresa (${from?.tradeName ?? "—"} → ${to.tradeName})` (`—` é
`EMPTY_VALUE_LABEL`):

- `Alterou empresa (QA Alfa → QA Beta).`
- `Alterou empresa (QA Beta → QA Alfa) e título.`
- `Alterou empresa (— → QA Alfa) e título.`

### `ticket-history.ts`

| Mapa                         | `mudanca_empresa`                                                                                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `HISTORY_EVENT_LABELS`       | `Mudança de empresa`                                                                                                                             |
| `HISTORY_EVENT_DESCRIBERS`   | `Definiu a empresa X.` · `Trocou a empresa de X para Y.` · `Removeu a empresa X.` · `Alterou a empresa.` (por `fromCompanyName`/`toCompanyName`) |
| `HISTORY_EVENT_NAMES_ACTOR`  | `false`                                                                                                                                          |
| `HISTORY_EVENT_SUMMARY_RANK` | `10`: a `edicao` (90) da mesma ação é a linha visível                                                                                            |

`describeCreation` não cita a empresa (fora do pedido). Nenhum
`Record<HistoryEvent, …>` existe fora deste arquivo.

## Validação — `app/_lib/validation/ticket.ts` (entregue)

```ts
export const ticketCompanyIdSchema = registryIdSchema(
  TICKET_COMPANY_REQUIRED_MESSAGE,
).max(POSTGRES_INTEGER_MAX, { error: TICKET_COMPANY_REQUIRED_MESSAGE })

const ticketFieldsSchema = z.object({
  companyId: ticketCompanyIdSchema,
  title,
  description,
  type,
  tagId,
  assigneeId,
})

export const createTicketSchema = ticketFieldsSchema.extend({
  priority,
  attachments,
})
export const editTicketSchema = ticketFieldsSchema.extend({
  ticketId,
  solution,
  handoffComment,
  attachments,
  removedAttachmentIds,
})
```

`companyId` é a primeira chave nos dois: `CreateTicketInput` igual à Etapa 1;
`EditTicketInput.companyId: number`, obrigatório. Sem empresa,
`INVALID_INPUT` `Selecione a empresa.`.

## `tsc` entre ondas

Os erros abertos pela Onda 0 foram fechados pelas Ondas 1 (`df-data`, `df-ui`)
e 2 (`df-actions`). Desde 2026-11-09, `npx tsc --noEmit`, `npm run lint` e
`npm run build` passam sem erro.

## `df-data` — `app/_lib/data/tickets.ts` e `db/seed.ts`

### `updateTicketByAssignee(values: UpdateTicketByAssigneeValues): Promise<UpdateTicketByAssigneeOutcome>`

Assinatura igual; `values.companyId` chega pelo tipo.

1. O `select … for update` do chamado ganha `companyId: ticket.companyId`
   (sem join: `for update` não cai no lado nulo de um outer join).
2. Depois das checagens de permissão e de anexos e **antes** da tag (ordem dos
   campos; ordem das travas empresa → tag → pessoa, a mesma do `insertTicket`):
   `select id, trade_name, is_active from company where id = $values.companyId
for share`. Sem linha ou `!isUsableTicketCompany(row, ticketRow.companyId)`
   → `{ status: "invalid_company" }`, sem gravar nada.
3. Empresa atual para o snapshot: se `ticketRow.companyId === null`, `null`;
   se igual a `values.companyId`, a própria linha do passo 2; senão `select
id, trade_name from company where id = $ticketRow.companyId` (sem trava).
4. `diffTicketEdit({ company: atual, title, …, solution }, values, { id:
row.id, tradeName: row.tradeName })`.
5. `update ticket` ganha `...(changes.company ? { companyId: values.companyId } : {})`.
6. Histórico, mesmo `changedAt`, nesta ordem: `edicao` (nota de
   `describeTicketEditNote`), `mudanca_empresa` (`fromCompanyId:
changes.company.from?.id ?? null`, `toCompanyId: changes.company.to.id`),
   `mudanca_tag`, `atribuicao`, `mudanca_status`.
7. `TicketEditSaved` sem campo novo (a empresa não entra no dashboard; não há
   revalidação extra).

### `insertTicket`

A linha `criacao` ganha `toCompanyId: values.companyId`.

### `findTicketDetail`

Histórico: `alias(company, "history_from_company")` e
`alias(company, "history_to_company")`, `leftJoin` em
`ticketHistory.fromCompanyId`/`toCompanyId`, selecionando
`fromCompanyName: fromCompany.tradeName` e `toCompanyName:
toCompany.tradeName`. O join da empresa do chamado (Etapa 1) não muda.

### `db/seed.ts`

`seedQa`: a `criacao` dos chamados da janela criados a partir daqui ganha
`toCompanyId: windowCompany.id`. Chamado reaproveitado não ganha linha nova.
O seed de demonstração (sem empresa) não muda.

## `df-actions` — `app/_lib/actions/tickets.ts`

```ts
export type EditTicketErrorCode =
  | "INVALID_INPUT"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "INVALID_COMPANY"
  | "INVALID_TAG"
  | "INVALID_ASSIGNEE"
  | "NO_CHANGES"
  | "HANDOFF_COMMENT_REQUIRED"
  | "INVALID_ATTACHMENT"
  | "ATTACHMENT_NOT_FOUND"
  | "ATTACHMENTS_LIMIT"

EDIT_OUTCOME_FAILURES.invalid_company = {
  ok: false,
  code: "INVALID_COMPANY",
  message: INVALID_TICKET_COMPANY_MESSAGE,
}
```

`editTicket(input: EditTicketInput): Promise<EditTicketResult>` — assinatura e
sequência iguais; `companyId` segue em `...fields` para `updateTicketByAssignee`.
Anexos já copiados são descartados no caminho de recusa existente. Revalidação
igual. A action não confere a empresa: a autoridade é a leitura sob trava.

| Situação                          | `code`            | Mensagem                                                       |
| --------------------------------- | ----------------- | -------------------------------------------------------------- |
| empresa ausente/inválida no input | `INVALID_INPUT`   | `Selecione a empresa.`                                         |
| `invalid_company`                 | `INVALID_COMPANY` | `Esta empresa não está disponível. Escolha uma empresa ativa.` |

## `df-ui`

### `app/(app)/tickets/[id]/page.tsx`

Com `isEditable`, `listTicketCompanyOptions()` entra no `Promise.all` (como
tags e pessoas, `null` quando não editável) e vai como 4º argumento:
`buildTicketEditFormOptions(ticket, editTags, editAssignees, editCompanies)`.

### `app/(app)/_components/ticket-company-field.tsx`

Precisa mudar, sim: a opção da atual inativa leva `(inativa)`, e o rótulo da
criação não sabe disso. Mínimo necessário (o resto é do `df-ui`):

- genérico no tipo da empresa, `<TCompany extends TicketCompanyOption,>`, com
  `companies: readonly TCompany[]`;
- prop opcional `getOptionLabel?: (company: TCompany) => string`, padrão
  `ticketCompanyOptionLabel` (a abertura não muda); a edição passa
  `ticketCompanyEditOptionLabel`;
- prop opcional `hint?: string`, exibida como a dica do campo de tag
  (`ComboboxField`), no padrão visual do projeto.

O filtro continua `matchesTicketCompanySearch` (aceita `TicketCompanySummary`).

### Campo no modo edição

- Wrapper novo no padrão de `TicketEditClassification`
  (`tickets/[id]/_components/ticket-edit-company.tsx`, nome livre): fora da
  edição, devolve `children` (o bloco de leitura da Etapa 1); na edição,
  `Controller name="companyId"` com `TicketCompanyField` (`companies`,
  `getOptionLabel={ticketCompanyEditOptionLabel}`, `hint={companyHint}`), no
  mesmo lugar (acima de "Tipo").
- `TicketEditContextValue` ganha `companies: readonly TicketCompanySummary[]`
  e `companyHint: string | undefined`, vindos de `options`.
- Provider: `result.code === "INVALID_COMPANY"` → `form.reset` com
  `companyId: undefined` (`keepDefaultValues`, `keepIsSubmitted`,
  `keepFieldsRef`), `form.setError("companyId", { message: result.message },
{ shouldFocus: true })` e `router.refresh()`. O esvaziamento é do provider,
  não do `Autocomplete` (E9; nota em "Domínio — `ticket-company.ts`").
- Linha do tempo: sem mudança de componente. A nota já é exibida
  (`ticket-timeline.tsx:81`).

## Cenários do `df-qa` — Etapa 2

Contas como na Etapa 1 (D, A, M). Pré-requisitos: `0023` aplicada; Ondas 1 e
2 entregues. Preparação: M assume (ou recebe) um chamado `[QA]` de Suporte com
`QA Alfa` (T5 da Etapa 1) e um chamado anterior à migration `0022`, sem
empresa (consulta 4 da Etapa 1), assumido pelo "Assumir". Empresa a desativar
é `[QA]` criada (ou reativada) pelo próprio teste, com CNPJ da reserva de
`docs/contracts/registry-companies.md`, e termina desativada.

| #   | Papel | Passos                                                                                                                    | Esperado                                                                                                                                                                                                          |
| --- | ----- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E1  | M     | "Editar" no chamado com `QA Alfa`                                                                                         | "Empresa" vira o campo de busca acima de "Tipo", preenchido com `QA Alfa — 12.345.678/0001-95`; sem dica                                                                                                          |
| E2  | M     | trocar para `QA Beta`, salvar                                                                                             | toast `Chamado #N atualizado.`; detalhe com `QA Beta`; linha do tempo "Editou o chamado." com nota `Alterou empresa (QA Alfa → QA Beta).`; `mudanca_empresa` gravada (consulta 5)                                 |
| E3  | M     | trocar empresa e título juntos                                                                                            | nota `Alterou empresa (QA Beta → QA Alfa) e título.`                                                                                                                                                              |
| E4  | M     | "Editar" no chamado sem empresa; mudar só o título e salvar                                                               | campo vazio com a dica `Este chamado não tem empresa. Escolha uma para salvar.`; ao salvar, `Selecione a empresa.` no campo; nada gravado (consulta 5)                                                            |
| E5  | M     | no E4, escolher `QA Alfa` e salvar                                                                                        | nota `Alterou empresa (— → QA Alfa) e título.`; `mudanca_empresa` com `from_company_id` nulo e `to_company_id` de `QA Alfa` (consulta 5)                                                                          |
| E6  | D + M | D cria/reativa `[QA] Empresa Inativa`; M abre `[QA] Empresa Inativa chamado` com ela e o assume; D a desativa; M "Editar" | campo preenchido com `[QA] Empresa Inativa — … (inativa)`; ao abrir a lista, ela é a primeira opção; dica `A empresa atual está inativa. Você pode mantê-la, mas não poderá escolhê-la de novo depois de trocar.` |
| E7  | M     | no E6, mudar só a descrição e salvar                                                                                      | salva; empresa continua a inativa; nota `Alterou descrição.`; nenhuma `mudanca_empresa` nova                                                                                                                      |
| E8  | M     | trocar a inativa por `QA Alfa`, salvar; abrir "Editar" de novo                                                            | salva; a inativa não aparece mais na lista; sem dica                                                                                                                                                              |
| E9  | D + M | M com "Editar" aberto escolhe outra `[QA]` ativa; D a desativa; M salva                                                   | erro `Esta empresa não está disponível. Escolha uma empresa ativa.` no campo, com foco; campo esvazia após o refresh; nada gravado                                                                                |
| E10 | M     | "Editar" no chamado com empresa e salvar sem mudar nada                                                                   | `Nenhuma alteração para salvar.`                                                                                                                                                                                  |
| E11 | A     | abrir chamado de Suporte cujo destinatário é M                                                                            | sem "Editar" (ADR 017 inalterado)                                                                                                                                                                                 |
| E12 | M     | criar `[QA] Empresa Histórico` com `QA Beta`                                                                              | `criacao` com `to_company_id` = id de `QA Beta` (consulta 5)                                                                                                                                                      |
| E13 | M     | no E2, conferir a linha do tempo resumida                                                                                 | uma entrada só para a ação ("Editou o chamado." com a nota); "Trocou a empresa…" não aparece como linha própria                                                                                                   |
| E14 | M     | "Editar", digitar `beta` no campo e escolher pelo teclado (`↓`, Enter); Cancelar                                          | filtro e teclado como na abertura; Cancelar volta ao valor salvo                                                                                                                                                  |

Fora do navegador (para o `df-debug`, se acionado): `editTicket` com
`companyId` de empresa inativa que **não** é a do chamado → `INVALID_COMPANY`;
com a inativa que é a do chamado → salva; sem `companyId` → `INVALID_INPUT`
`Selecione a empresa.`.

```sql
-- 5: histórico de empresa de um chamado
select id, event, from_company_id, to_company_id, note, changed_at
from ticket_history where ticket_id = $1 order by changed_at, id;

-- migration aplicada
select unnest(enum_range(null::history_event)); -- inclui mudanca_empresa
select conname, confdeltype from pg_constraint
where conname in ('ticket_history_from_company_id_company_id_fk', 'ticket_history_to_company_id_company_id_fk'); -- 'r'
```

## Checklist — Etapa 2

- [x] Onda 0: schema, `0023` gerada, tipos, domínio, Zod; lint passa; `tsc`
      só com os cinco erros listados — 2026-11-09
- [x] Usuário: `npm run db:migrate` (`0023`) — 2026-11-09
- [x] Onda 1: `df-data` (`updateTicketByAssignee`, `insertTicket`,
      `findTicketDetail`, seed) ∥ `df-ui` (página, campo, wrapper) — 2026-11-09
- [x] Onda 2: `df-actions` (`editTicket`) ∥ `df-ui` (`INVALID_COMPANY`) —
      2026-11-09
- [x] `tsc`, lint, build — 2026-11-09
- [x] `df-reviewer` — 2026-11-09, aprovado com atenções
- [x] `df-qa` E1–E14 — 2026-11-09, 14/14 após o Reteste 1; E9 corrigido pelo
      `df-ui` (reset com `keepFieldsRef` no provider, `useWatch` sem fallback no
      campo) (`docs/test-reports/2026-11-09-ticket-company-etapa-2.md`)

---

# Etapa 3 — coluna "Empresa" nas tabelas e "Enviar" no detalhe

Sem schema, sem migration, sem Zod novo, sem action nova.

## Constatação

"Enviar" hoje: `QueueRowActions` (`app/(app)/queue/_components/queue-row-actions.tsx`)
mostra o botão quando `queueRowActionsFor(viewer, row).send`, isto é,
`canSendTicket` → `isTicketDispatcher`: **Diretor** (`isBoard`) ou
**Administrador do setor atual do chamado**, com o chamado não final, sem
transferência pendente e em status atribuível. **Membro nunca tem "Enviar".** A
Etapa 3 move o botão; a regra não muda. `SendTicketDialog` só é usado por
`department-queue-table.tsx`; depois da Etapa 3, só pelo detalhe.

`sendTicket` (`app/_lib/actions/ticket-assignment.ts`) já revalida
`ticketDetailPath(id)`, `DEPARTMENT_QUEUE_PATH` e `MY_TICKETS_PATH`: nada muda
na action.

## Tipos (Onda 0 — feito)

### `app/_lib/types/ticket-company.ts`

```ts
export interface TicketCompanyListFacts {
  company: TicketCompanyOption | null
}
```

`TicketCompanyOption` = `{ id: number; tradeName: string; cnpj: string }` (CNPJ
limpo, 14 caracteres, como gravado).

### `app/_lib/types/department-queue.ts` e `app/_lib/types/my-tickets.ts`

```ts
export interface DepartmentQueueListItem
  extends TicketAssignmentFacts, TicketCompanyListFacts { … }

export interface MyTicketListItem extends TicketCompanyListFacts { … }

export interface DepartmentQueueRowActions {
  assume: boolean
}
```

(`send` saiu de `DepartmentQueueRowActions`.)

### `app/_lib/types/ticket-assignment.ts`

```ts
export interface TicketSendDetailSource extends TicketAssumeDetailSource {
  assigneeName: string | null
}

export interface SendTicketTarget extends TicketAssignmentSource {
  assigneeName: string | null
}
```

`TicketAssignmentSource` = `{ id: number; assignedTo: number | null }`.
`TicketDetail` (de `findTicketDetail`) satisfaz `TicketSendDetailSource` sem
mudança.

## Domínio (Onda 0 — feito)

### `app/_lib/domain/brazilian-formats.ts`

```ts
export const CNPJ_TAIL_PREFIX = "…"

export const formatCnpjTail: (cnpj: string) => string
```

`cleanCnpj(cnpj)`; com 14 caracteres → `…/<filial>-<DV>` (posições 8–11 e
12–13); com menos, `formatCnpj(clean)` (não acontece com dado gravado).
Exemplos: `12345678000195` → `…/0001-95` (QA Alfa); `AB12CD34000184` →
`…/0001-84` (QA Beta); `12ABC34501DE35` → `…/01DE-35`. O prefixo é o caractere
reticências (U+2026), não três pontos.

### `app/_lib/domain/ticket-assignment.ts`

```ts
export const ticketSendTargetFor: (
  actor: TicketActorFacts,
  ticket: TicketSendDetailSource,
) => SendTicketTarget | null
```

Mesmo molde de `ticketAssumeTargetFor` (os dois usam agora o helper privado
`assignmentFactsFromDetail`, que monta `TicketAssignmentFacts` com
`hasPendingTransfer: pendingTransfer !== null`): `canSendTicket(actor, facts)`
→ `{ id, assignedTo, assigneeName }`; senão `null`.
`buildSendTicketFormDefaults(target)`, `sendTargetOptions(assignees,
target.assignedTo)`, `sendTicketDialogTitle(target.id)` e
`describeCurrentAssignee(target.assigneeName)` servem ao alvo sem mudança.

### `app/_lib/domain/department-queue.ts`

```ts
export const queueRowActionsFor: (
  viewer: TicketActorFacts,
  row: TicketAssignmentFacts,
) => DepartmentQueueRowActions
```

`({ assume: canAssumeTicket(viewer, row) })`. `canSendTicket` continua
exportado.

## `df-data` (Onda 1)

`app/_lib/data/department-queue.ts` e `app/_lib/data/my-tickets.ts` — mesmas
assinaturas, retorno agora com `company`:

```ts
export async function listQueueTickets(
  departmentId: number,
  tab: DepartmentQueueTab,
  range?: DateRange | null,
): Promise<DepartmentQueueListItem[]>

export async function listMyTickets(
  userId: number,
  tab: MyTicketsTab,
  range?: DateRange | null,
): Promise<MyTicketListItem[]>
```

- `.leftJoin(company, eq(company.id, ticket.companyId))`, selecionando
  `company.id`, `company.tradeName`, `company.cnpj`.
- `company` é `{ id, tradeName, cnpj }` ou `null` quando `ticket.company_id` é
  nulo. Pode ser o objeto aninhado no `select` do Drizzle (o join à esquerda o
  anula quando todas as colunas vêm nulas) ou o mapeamento explícito de
  `findTicketDetail`; vale o que fechar o tipo sem `as`.
- Empresa inativa aparece normalmente (sem sufixo nas tabelas).
- Sem filtro novo, sem mudança de ordenação, de condição nem de contagem
  (`countQueueTicketsByTab` e `countMyTicketsByTab` intactas). O join é 1:1 e
  não duplica linha.

## `df-actions`

Nada.

## `df-ui` (Ondas 1 e 2)

### Coluna "Empresa"

- `app/(app)/_components/ticket-list-row.ts`:
  `export interface TicketCompanyListRow extends TicketListRow, TicketCompanyListFacts {}`.
- `app/(app)/_components/ticket-list-columns.tsx`:
  `export const createTicketCompanyColumn = <TRow extends TicketCompanyListRow,>()`,
  coluna `display` (sem filtro, sem ordenação), `id: "company"`, header
  `TICKET_COMPANY_LABEL`. Célula com empresa: nome fantasia em destaque
  (`font-medium`, truncado, `title={tradeName}`) e, abaixo,
  `formatCnpjTail(cnpj)` em `text-xs text-muted-foreground tabular-nums`, com
  `title={formatCnpj(cnpj)}` para o CNPJ inteiro. Sem empresa,
  `EMPTY_VALUE_LABEL` (`—`).
- Posição: logo depois de `shared.title`, nas duas tabelas
  (`department-queue-table.tsx`, `my-tickets-table.tsx`).
- Largura (revisão 2026-11-09, decisão do usuário e entrega do `df-ui`):
  - **"Tipo" sai da vista** de `/queue` e `/tickets`; o Tipo fica só no card
    "Detalhes" do chamado. A coluna `type` continua definida e é ocultada por
    `hiddenColumns` do `DataTable` (`HIDDEN_COLUMNS` em
    `department-queue-table.tsx` e `my-tickets-table.tsx`), porque o filtro por
    Tipo (`TICKET_TYPE_FILTER`) depende dela e continua funcionando.
    **Aprovações mantém a coluna "Tipo" visível.**
  - "Título" quebra em até 2 linhas (`line-clamp-2 max-w-96 min-w-40
wrap-break-word whitespace-normal`, `title` com o texto inteiro).
  - "Empresa" limitada a `max-w-32` (nome fantasia truncado, `title` com o
    nome inteiro).
  - "Tag" em uma linha, `max-w-36 truncate`, `title` com o rótulo inteiro
    (substitui a quebra de linha da revisão anterior). "Setor atual" (só em
    `/tickets`) continua quebrando linha (`whitespace-normal`).
  - As colunas "Título" e "Tag" vêm de `ticket-list-columns.tsx`,
    compartilhado: o mesmo tratamento vale para **Aprovações** (`/approvals`).
  - `DataTable` compartilhado (`app/_components/data-table/data-table.tsx`)
    usa `px-3` no cabeçalho e nas células: vale para **todas** as tabelas.

### "Enviar" sai da Fila

- `queue-row-actions.tsx`: só "Assumir"; somem `onSend`, `SEND_TICKET_LABEL` e
  o ramo `actions.send`; `if (!actions.assume) return null`.
- `department-queue-table.tsx`: somem `SendTicketDialog`, `sendTarget`,
  `isSendOpen`, `openSendDialog`, `sendDialogKey`, a prop `assignees`, o
  argumento `onSend` de `buildColumns` e o fragmento em volta do `DataTable`.
- `queue/page.tsx`: deixa de chamar `listTicketAssigneeOptions` e de importar
  `isTicketDispatcher`; o `Promise.all` fica com `[tickets, counts]`.
- `app/(app)/queue/_components/send-ticket-dialog.tsx` é **movido** (não
  copiado) para `app/(app)/tickets/[id]/_components/send-ticket-dialog.tsx`
  (uma rota só). Os imports relativos sobem um nível
  (`../../../_components/handoff-comment-field`,
  `../../../_components/ticket-assignee-field`).

### "Enviar" no detalhe

- `SendTicketDialog` passa a controlar o próprio `open` e a ter o gatilho
  (`DialogTrigger`): botão `variant="outline"`, ícone próprio de
  `lucide-react` (sugestão: `SendIcon`; os vizinhos usam `UserCheckIcon`,
  `PlayIcon` e `CornerUpLeftIcon`), texto `SEND_TICKET_LABEL` e `aria-label`
  `Enviar o chamado #N` (`SEND_TICKET_LABEL` + `formatTicketNumber(target.id)`).

  ```ts
  export interface SendTicketDialogProps {
    target: SendTicketTarget
    assignees: readonly AssigneeOption[]
  }
  ```

  Formulário, textos, `FIELD_ERROR_CODES` e tratamento de erro iguais aos de
  hoje, trocando `ticket` por `target`; em sucesso fecha e reseta.

- **Remontagem obrigatória**: quem renderiza passa
  `key` = `` `${target.id}:${target.assignedTo ?? "none"}` ``. Depois de um
  envio, o `router.refresh()` traz outro `assignedTo`; sem a `key`, o
  formulário manteria o `expectedAssigneeId` antigo e o envio seguinte cairia
  em conflito (era o papel do `sendDialogKey` da Fila).
- `tickets/[id]/page.tsx`: `const sendTarget = ticketSendTargetFor(actor,
ticket)`; com alvo, `listTicketAssigneeOptions(ticket.currentDepartmentId)`
  entra no `Promise.all` (senão `null`); `const send: SendTicketDialogProps |
null` monta `{ target, assignees }` quando os dois existem. Atenção: o setor é
  o **atual do chamado**, não o do ator (o Diretor envia para gente do setor do
  chamado); `editAssignees` usa `facts.departmentId` e não serve.
- `TicketDetailHeader` ganha `send?: SendTicketDialogProps | null` (padrão
  `null`); entra em `hasAttendActions`, e o diálogo é renderizado dentro de
  `attendActions`, logo depois de "Assumir". No modo editável, `TicketEditHeading`
  já esconde `attendActions` enquanto se edita: o "Enviar" some durante a
  edição, como "Assumir" e "Atender".

## Cenários do `df-qa` — Etapa 3

Contas como nas Etapas 1 e 2 (D Diretor, A Administrador de Suporte, M Membro
de Suporte). Seed QA com `QA Alfa` (`12345678000195`) e `QA Beta`
(`AB12CD34000184`); um chamado anterior à `0022`, sem empresa.

| #   | Papel | Passos                                                                | Esperado                                                                                                                                                                                                                  |
| --- | ----- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L1  | A     | `/queue`, aba "Todos"                                                 | coluna "Empresa" logo depois de "Título"; linha com `QA Alfa` mostra `QA Alfa` e, abaixo, menor, `…/0001-95`                                                                                                              |
| L2  | A     | linha com `QA Beta`                                                   | `…/0001-84`                                                                                                                                                                                                               |
| L3  | A     | linha de chamado sem empresa                                          | `—`                                                                                                                                                                                                                       |
| L4  | A     | ações das linhas                                                      | nenhum "Enviar"; "Assumir" continua nas linhas sem destinatário                                                                                                                                                           |
| L5  | D     | `/queue` em outro setor (`?setor=`)                                   | nenhum "Enviar"; coluna "Empresa" presente                                                                                                                                                                                |
| L6  | M     | `/tickets`                                                            | coluna "Empresa" depois de "Título", mesmo formato; `—` nos sem empresa                                                                                                                                                   |
| L7  | A, D  | `/queue` e `/tickets` em 1366 × 768 e 1280 × 800, caso médio          | sem coluna "Tipo" visível; filtro de Tipo funciona. No caso médio, a área da tabela não rola na horizontal (`scrollWidth <= clientWidth`). Pior caso: limitação conhecida, abaixo; reportar a largura medida sem reprovar |
| L8  | A     | detalhe de chamado aberto de Suporte, sem transferência pendente      | "Enviar" no cabeçalho; diálogo `Enviar chamado #N`; escolher M, comentário `[QA] Enviando pelo detalhe.`; toast `Chamado #N enviado para <nome de M>.`; Destinatário = M                                                  |
| L9  | A     | logo depois de L8, sem recarregar, "Enviar" de novo para outra pessoa | envia sem conflito; o diálogo mostra `Destinatário atual: <nome de M>.` e M não está na lista                                                                                                                             |
| L10 | D     | detalhe de chamado de outro setor                                     | "Enviar" presente; lista de pessoas = ativas do setor do chamado                                                                                                                                                          |
| L11 | M     | detalhe de chamado de Suporte                                         | sem "Enviar"                                                                                                                                                                                                              |
| L12 | A     | detalhe de chamado resolvido, fechado ou com transferência pendente   | sem "Enviar"                                                                                                                                                                                                              |
| L13 | A     | detalhe de chamado que A abriu e que está em outro setor              | sem "Enviar" (A não é administrador do setor atual)                                                                                                                                                                       |
| L14 | A     | detalhe de chamado com A destinatário, clicar "Editar"                | "Enviar" some durante a edição e volta ao cancelar                                                                                                                                                                        |

Caso médio de L7: título, nome fantasia e tag de tamanho comum, status de
rótulo curto. Resultado final (`df-qa`, Reteste 2, 2026-11-09): cabe sem
rolagem em 1280 e 1366, para Administrador e Diretor.

**Limitação conhecida (L7, pior caso).** Aba "Todos" com tags longas: cabe em
1366 e rola na horizontal em 1280 (+76 px na Fila, +54 px em Meus chamados).
Aceito pelo usuário. Aplicados (decisão do usuário): "Tipo" oculto, "Empresa"
`max-w-32`, "Tag" `max-w-36 truncate` e `px-3` no `DataTable`. Avaliado e
**não aplicado**: esconder "Aberto em" abaixo de `2xl`.

## Checklist — Etapa 3

- [x] Onda 0 — 2026-11-09: tipos (`TicketCompanyListFacts`,
      `SendTicketTarget`, `TicketSendDetailSource`, `DepartmentQueueRowActions`
      sem `send`) e domínio (`formatCnpjTail`, `ticketSendTargetFor`,
      `queueRowActionsFor`). `tsc` vermelho esperado em
      `queue-row-actions.tsx` (`send`), `data/department-queue.ts` e
      `data/my-tickets.ts` (`company`)
- [x] Onda 1: `df-data` ∥ `df-ui` (coluna) · Onda 2: `df-ui` ("Enviar" no
      detalhe; sem `df-actions`)
- [x] Ajustes de largura (decisão do usuário): "Tipo" oculto (filtro mantido),
      "Empresa" `max-w-32`, "Tag" `max-w-36 truncate` com `title` (também em
      Aprovações), `px-3` no `DataTable`
- [x] `tsc`, lint, build · `df-reviewer` aprovado sem achados · `df-qa` 13/14
      e Retestes 1 e 2; L7 pior caso em 1280 aceito como limitação conhecida
- [x] Pendência fora do escopo: Cadastros → Pessoas (+304 px) e Tags (+67 px,
      "Ações" cortada) rolam em 1280 (`df-ui`)
