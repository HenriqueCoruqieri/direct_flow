# Contrato — Cadastros → Empresas

Entrada das Etapas 1 e 2. Plano em `docs/plans/registry-companies.md`, que manda
nas decisões. Poder da Diretoria em
`docs/adr/011-board-department-with-global-power.md`. Padrões de tabela,
filtro, formulário, ações por linha e resultado de action reusados de
`docs/contracts/registry-departments.md`, `docs/contracts/registry-tags.md` e
`docs/contracts/registry-people.md` ("Peças compartilhadas").

Versões observadas: `next@16.3.5`, `drizzle-orm@0.45.2`, `zod@4.6.5`,
`@tanstack/react-table@9`.

Cada seção diz a que etapa pertence. **Etapa 1** = tabelas, migration, lista,
busca, filtros e criação. **Etapa 2** = edição, desativar e reativar. Tudo o que
não está marcado como Etapa 2 é Etapa 1.

## Decisões fixadas pelo usuário (resumo do plano)

| Tema       | Decisão                                                                                                                                                                                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Acesso     | Só diretor. Página com `requireDirector` (404 para admin de setor e membro, como Setores); action com `getDirector` (`FORBIDDEN`)                                                                                                                                            |
| Menu       | Cadastros → Pessoas, Setores, Tags, **Empresas** (só no menu do diretor)                                                                                                                                                                                                     |
| Exclusão   | Nunca. Desativar e reativar sem pré-condição                                                                                                                                                                                                                                 |
| CNPJ       | Numérico **ou alfanumérico** (IN RFB 2.229/2024): 14 caracteres, os 12 primeiros `[0-9A-Z]`, os 2 últimos (DV) só dígitos. Guardado em maiúsculas, sem máscara; DV pelo cálculo oficial; máscara `AA.AAA.AAA/AAAA-DD`; único contando inativas; duplicado vira erro no campo |
| CEP        | 8 dígitos; máscara `00000-000`                                                                                                                                                                                                                                               |
| UF         | Enum fixo das 27 siglas                                                                                                                                                                                                                                                      |
| Telefones  | Primário (obrigatório), Secundário (opcional), Contato do responsável (obrigatório). 10 ou 11 dígitos, DDD de 2 dígitos sem 0 inicial, máscara dinâmica                                                                                                                      |
| Expediente | Opcional, tudo-ou-nada, "Às" > "Das". Informativo: não altera prazo nem SLA (ADR 019 continua valendo)                                                                                                                                                                       |
| E-mail     | Formato válido; não único                                                                                                                                                                                                                                                    |
| Fora       | Botões "Buscar" de CNPJ e CEP (não aparecem); vínculo empresa ↔ chamado                                                                                                                                                                                                      |

## Tabelas, enums e migration — Etapa 1

### Enums (`db/schema.ts`, novos)

```ts
export const brazilianStateEnum = pgEnum("brazilian_state", [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
])

export const companyContactPositionEnum = pgEnum("company_contact_position", [
  "primary",
  "secondary",
])
```

A ordem do enum é a ordem alfabética do **nome** do estado (Acre … Tocantins),
que é a ordem do select e do filtro.

### `company` (novo)

| Coluna                     | Tipo                            | Regra                                                        |
| -------------------------- | ------------------------------- | ------------------------------------------------------------ |
| `id`                       | `integer` identity (`pk()`)     |                                                              |
| `cnpj`                     | `text not null`                 | 14 caracteres, maiúsculas, sem máscara; único                |
| `legal_name`               | `text not null`                 | razão social                                                 |
| `trade_name`               | `text not null`                 | nome fantasia                                                |
| `email`                    | `text not null`                 | minúsculas (gravado como sai do Zod)                         |
| `cep`                      | `text not null`                 | só dígitos, 8                                                |
| `state`                    | `brazilian_state not null`      | UF                                                           |
| `street`                   | `text not null`                 | logradouro                                                   |
| `number`                   | `text not null`                 | texto: aceita `S/N`, `123A`                                  |
| `district`                 | `text not null`                 | bairro                                                       |
| `city`                     | `text not null`                 |                                                              |
| `complement`               | `text` (null)                   |                                                              |
| `manager_name`             | `text not null`                 | responsável                                                  |
| `manager_phone`            | `text not null`                 | só dígitos, 10 ou 11                                         |
| `business_days`            | `smallint[]` (null)             | dias ISO: 1 = segunda … 7 = domingo; ordenado, sem repetição |
| `opens_at`                 | `time` (null, sem fuso)         | "Das"                                                        |
| `closes_at`                | `time` (null, sem fuso)         | "Às"                                                         |
| `notes`                    | `text` (null)                   | observação do expediente                                     |
| `is_active`                | `boolean not null default true` |                                                              |
| `created_at`, `updated_at` | `...timestamps`                 | como as outras tabelas                                       |

`time` sem fuso é de propósito: é um horário de parede da empresa, não um
instante. Não passa por `@/app/_lib/date`.

Restrições:

| Nome                              | Definição                                                                                                                                                           |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `company_cnpj_idx`                | `unique index on (cnpj)` — vale para inativas                                                                                                                       |
| `company_cnpj_format`             | `check (cnpj ~ '^[0-9A-Z]{12}[0-9]{2}$')` — aceita o numérico e o alfanumérico; minúscula não passa                                                                 |
| `company_cep_digits`              | `check (cep ~ '^[0-9]{8}$')`                                                                                                                                        |
| `company_manager_phone_digits`    | `check (manager_phone ~ '^[1-9][0-9]{9,10}$')`                                                                                                                      |
| `company_business_hours_complete` | `check ((business_days is null and opens_at is null and closes_at is null) or (cardinality(business_days) > 0 and opens_at is not null and closes_at is not null))` |
| `company_business_hours_order`    | `check (closes_at is null or opens_at is null or closes_at > opens_at)`                                                                                             |
| `company_business_days_range`     | `check (business_days is null or business_days <@ array[1,2,3,4,5,6,7]::smallint[])`                                                                                |

Os dígitos verificadores do CNPJ **não** viram check no banco (o cálculo sobre
ASCII − 48 não cabe num check legível): a regra mora no
domínio (`isValidCnpj`) e no Zod. Os checks acima são a trava física do formato
e da coerência do expediente, como `department_board_active` é a trava da
Diretoria — mesma regra, dois níveis, não duplicação de regra de negócio.

### `company_contact` (novo)

| Coluna                     | Tipo                                | Regra                                |
| -------------------------- | ----------------------------------- | ------------------------------------ |
| `id`                       | `integer` identity (`pk()`)         |                                      |
| `company_id`               | `integer not null`                  | FK `company.id`, `on delete cascade` |
| `position`                 | `company_contact_position not null` | `primary` ou `secondary`             |
| `phone`                    | `text not null`                     | só dígitos, 10 ou 11                 |
| `created_at`, `updated_at` | `...timestamps`                     |                                      |

| Nome                                   | Definição                                |
| -------------------------------------- | ---------------------------------------- |
| `company_contact_company_position_idx` | `unique index on (company_id, position)` |
| `company_contact_phone_digits`         | `check (phone ~ '^[1-9][0-9]{9,10}$')`   |

O `cascade` existe só para coerência física: empresa nunca é excluída pela
aplicação. "Toda empresa tem primário" é garantido pelo Zod (campo obrigatório)
e por `insertCompany`/`updateCompany` (gravam o primário na mesma transação da
empresa); não há check entre tabelas.

`relations`: `company` → `many(companyContact)`; `companyContact` → `one(company)`.

### Migration `db/migrations/0021_company.sql`

Gerada por `drizzle-kit generate --name company`. Só `CREATE TYPE`,
`CREATE TABLE`, `CREATE UNIQUE INDEX`, `ALTER TABLE ... ADD CONSTRAINT` (FK e
checks) nas tabelas novas. Nenhuma tabela existente muda. Quem aplica
(`npm run db:migrate`) é o usuário.

### Lidas pelo fluxo

- `users`, `department` — só pela guarda de diretor (`app/_lib/auth/`).

## Tipos — `app/_lib/types/`

### `app/_lib/types/company.ts` (novo) — Etapa 1

```ts
import type {
  brazilianStateEnum,
  companyContactPositionEnum,
} from "@/db/schema"

export type BrazilianState = (typeof brazilianStateEnum.enumValues)[number]
export type CompanyContactPosition =
  (typeof companyContactPositionEnum.enumValues)[number]

export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7

export interface CompanyValues {
  cnpj: string
  legalName: string
  tradeName: string
  email: string
  primaryPhone: string
  secondaryPhone: string | null
  cep: string
  state: BrazilianState
  street: string
  number: string
  district: string
  city: string
  complement: string | null
  managerName: string
  managerPhone: string
  businessDays: Weekday[] | null
  opensAt: string | null
  closesAt: string | null
  notes: string | null
}

export interface CompanyListItem extends CompanyValues {
  id: number
  isActive: boolean
  createdAt: Date
}

export interface CompanySaved {
  status: "saved"
  id: number
}

export interface CompanyCnpjTaken {
  status: "cnpj_taken"
  existingIsActive: boolean
}

export interface CompanyNotFound {
  status: "not_found"
}

export type InsertCompanyOutcome = CompanySaved | CompanyCnpjTaken
```

Etapa 2 acrescenta:

```ts
export type UpdateCompanyOutcome =
  CompanySaved | CompanyCnpjTaken | CompanyNotFound

export type UpdateCompanyActiveOutcome = CompanySaved | CompanyNotFound
```

- `BrazilianState` e `CompanyContactPosition` são declarados em `db/schema.ts`
  (`typeof ...enumValues`, como `TicketStatus`) e reexportados por
  `app/_lib/types/company.ts` com `import type`. O schema também exporta
  `Company`, `NewCompany`, `CompanyContact` e `NewCompanyContact`
  (`$inferSelect`/`$inferInsert`).
- `CompanyValues` é o que entra em `insertCompany`/`updateCompany` e é a saída
  do Zod (sem `id`): CNPJ em maiúsculas e sem máscara; CEP e telefones **só dígitos**; opcionais vazios
  como `null`; `opensAt`/`closesAt` em `HH:MM`; `businessDays` ordenado e sem
  repetição, ou `null`.
- `CompanyListItem` carrega **todos** os campos: o Dialog de edição abre
  preenchido a partir da linha da tabela, sem leitura iniciada pelo cliente
  (ADR 015 só libera `searchTickets`).
- `primaryPhone`/`secondaryPhone` vêm de `company_contact` (`position`
  `primary`/`secondary`).
- Outcomes seguem o padrão dos outros cadastros: conflito e ausência são
  **resultado**; exceção é só falha inesperada.

### `app/_lib/types/registry.ts` (alterado) — Etapa 1

```ts
export type RegistrySection = "people" | "departments" | "tags" | "companies"
```

## Domínio — `app/_lib/domain/` — Etapa 1

Tudo puro, sem I/O, usado igual no cliente (máscara, select, filtro, regra do
expediente) e no servidor (Zod, data layer). Nenhum arquivo importa valor de
`@/db/schema`.

### `app/_lib/domain/brazilian-formats.ts` (novo)

Formatos brasileiros genéricos, sem conhecer empresa.

```ts
export const BRAZILIAN_STATE_NAMES // satisfies Record<BrazilianState, string>
export const BRAZILIAN_STATES: readonly BrazilianState[]

export const CNPJ_LENGTH = 14
export const CNPJ_BASE_LENGTH = 12
export const CEP_DIGITS = 8
export const PHONE_MIN_DIGITS = 10
export const PHONE_MAX_DIGITS = 11

export const CNPJ_PLACEHOLDER = "00.000.000/0000-00"
export const CNPJ_PATTERN = /^[0-9A-Z]{12}[0-9]{2}$/
export const CEP_PLACEHOLDER = "00000-000"
export const PHONE_PLACEHOLDER = "(00) 00000-0000"

export const onlyDigits: (value: string) => string
export const cleanCnpj: (value: string) => string
export const cleanCep: (value: string) => string
export const cleanPhone: (value: string) => string
export const isBrazilianState: (value: string) => value is BrazilianState
export const brazilianStateLabel: (state: BrazilianState) => string

export const isValidCnpj: (digits: string) => boolean
export const isValidCep: (digits: string) => boolean
export const isValidPhone: (digits: string) => boolean

export const formatCnpj: (digits: string) => string
export const formatCep: (digits: string) => string
export const formatPhone: (digits: string) => string
```

| Nome                    | Semântica                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `BRAZILIAN_STATE_NAMES` | `{ AC: "Acre", AL: "Alagoas", …, TO: "Tocantins" }` com `satisfies Record<BrazilianState, string>`: UF nova no enum quebra o `tsc` aqui                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `BRAZILIAN_STATES`      | As 27 siglas, derivadas das chaves de `BRAZILIAN_STATE_NAMES`, na ordem do enum (alfabética do nome)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `onlyDigits`            | Remove tudo o que não é `0-9`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `cleanCnpj`             | Passa para maiúsculas, tira tudo o que não é `0-9A-Z` e monta o valor em ordem: nas posições 1–12 aceita letra ou dígito, nas 13–14 só dígito (letra ali é descartada); corta em 14. `12.abc.345/01de-35` → `12ABC34501DE35`. Base do Zod e do `MaskedInput` do CNPJ                                                                                                                                                                                                                                                                                                                                                                                                     |
| `cleanCep`              | `onlyDigits` cortado em `CEP_DIGITS`. É o `clean` do `MaskedInput` do CEP                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `cleanPhone`            | `onlyDigits` cortado em `PHONE_MAX_DIGITS`. É o `clean` do `MaskedInput` dos três telefones                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `isBrazilianState`      | Type guard sobre `BRAZILIAN_STATES`. Usado pelo Zod e pela data layer (sem `as`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `brazilianStateLabel`   | `SP — São Paulo`. Rótulo de opção do select e do filtro                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `isValidCnpj`           | Recebe o valor limpo (`cleanCnpj`). `true` só se casa com `CNPJ_PATTERN`, **não** é um caractere repetido 14 vezes (`00000000000000` passa no cálculo e é recusado aqui) e os dois DVs batem pelo cálculo oficial: valor de cada caractere = código ASCII − 48 (`0`–`9` → 0–9, `A` → 17 … `Z` → 42); pesos `5,4,3,2,9,8,7,6,5,4,3,2` sobre os 12 primeiros e `6,5,4,3,2,9,8,7,6,5,4,3,2` sobre os 13; resto `< 2` → 0, senão `11 − resto`. Um CNPJ só numérico dá o mesmo resultado do cálculo tradicional, então os dois tipos passam pela mesma função. Conferido: `12ABC34501DE35` (exemplo oficial da Receita) e `11222333000181` válidos; `12ABC34501DE36` inválido |
| `isValidCep`            | 8 dígitos                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `isValidPhone`          | 10 ou 11 dígitos e o primeiro (DDD) diferente de `0`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `formatCnpj`            | Máscara **progressiva** `AA.AAA.AAA/AAAA-DD` sobre `cleanCnpj(valor)`, sem separador pendurado no fim (`12AB` → `12.AB`; completo → `12.ABC.345/01DE-35` ou `11.222.333/0001-81`). Corta acima de 14                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `formatCep`             | Progressiva, `00000-000` (`01310` → `01310`; `013101` → `01310-1`). Corta acima de 8                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `formatPhone`           | Progressiva e dinâmica, ver tabela abaixo. Corta acima de 11                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

As três `format*` recebem o valor limpo ou o texto cru (que limpam com
`cleanCnpj` ou `onlyDigits`) e
servem para os dois usos: exibir o valor gravado (lista, Dialog de edição) e
mascarar enquanto se digita. Uma função só por formato.

`formatPhone`:

| Dígitos             | Saída             |
| ------------------- | ----------------- |
| `1`                 | `(1`              |
| `11`                | `(11`             |
| `119`               | `(11) 9`          |
| `1191232`           | `(11) 9123-2`     |
| `1191232341` (10)   | `(11) 9123-2341`  |
| `11912323410` (11)  | `(11) 91232-3410` |
| `119123234109` (12) | `(11) 91232-3410` |

Com até 10 dígitos o hífen fica depois do 4º dígito do número (fixo); com 11,
depois do 5º (celular). Apagar o 11º volta ao formato fixo. O DDD é sempre de
2 dígitos.

### `app/_lib/domain/company.ts` (novo)

```ts
export const WEEKDAY_SHORT_LABELS // satisfies Record<Weekday, string>
export const WEEKDAY_LABELS // satisfies Record<Weekday, string>
export const WEEKDAYS: readonly Weekday[]
export const isWeekday: (value: number) => value is Weekday
export const normalizeBusinessDays: (days: readonly Weekday[]) => Weekday[]

export const COMPANY_LEGAL_NAME_MAX_LENGTH = 150
export const COMPANY_STREET_MAX_LENGTH = 120
export const COMPANY_NUMBER_MAX_LENGTH = 10
export const COMPANY_COMPLEMENT_MAX_LENGTH = 80
export const COMPANY_NOTES_MAX_LENGTH = 500

export const COMPANY_COMPLEMENT_PLACEHOLDER = "Sala, andar, bloco"
export const COMPANY_NOTES_PLACEHOLDER = "Informações úteis para quem atende"
export const COMPANY_MANAGER_NAME_PLACEHOLDER = "Nome completo"
export const COMPANY_REQUIRED_FIELDS_HINT = "Campos com * são obrigatórios."

export const checkBusinessHours: (
  hours: BusinessHoursDraft,
) => BusinessHoursCheck
export const BUSINESS_HOURS_MESSAGES // satisfies Record<BusinessHoursProblem, string>

export const describeCompanyCnpjTaken: (existingIsActive: boolean) => string
export const companySearchText: (company: CompanySearchable) => string
export const companyLocationLabel: (
  city: string,
  state: BrazilianState,
) => string
export const statesPresentIn: (
  states: readonly BrazilianState[],
) => BrazilianState[]
```

Tipos auxiliares em `app/_lib/types/company.ts` (mesma Etapa 1):

```ts
export interface BusinessHoursDraft {
  businessDays: readonly Weekday[]
  opensAt: string | null
  closesAt: string | null
}

export type BusinessHoursProblem =
  | "DAYS_WITHOUT_OPENS_AT"
  | "DAYS_WITHOUT_CLOSES_AT"
  | "TIMES_WITHOUT_DAYS"
  | "CLOSES_NOT_AFTER_OPENS"

export interface BusinessHoursValid {
  ok: true
}

export interface BusinessHoursInvalid {
  ok: false
  problems: BusinessHoursProblem[]
}

export type BusinessHoursCheck = BusinessHoursValid | BusinessHoursInvalid

export type CompanySearchable = Pick<
  CompanyValues,
  "tradeName" | "legalName" | "cnpj"
>
```

| Nome                       | Semântica                                                                                                                                                                                                                                                                                                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `WEEKDAY_SHORT_LABELS`     | `1: "Seg"`, `2: "Ter"`, `3: "Qua"`, `4: "Qui"`, `5: "Sex"`, `6: "Sáb"`, `7: "Dom"`. Texto do botão                                                                                                                                                                                                                                                                       |
| `WEEKDAY_LABELS`           | `Segunda-feira` … `Domingo`. `aria-label` do botão                                                                                                                                                                                                                                                                                                                       |
| `WEEKDAYS`                 | `[1, 2, 3, 4, 5, 6, 7]`, ordem dos botões (segunda primeiro)                                                                                                                                                                                                                                                                                                             |
| `isWeekday`                | Guard para ler `smallint[]` do banco sem `as`                                                                                                                                                                                                                                                                                                                            |
| `normalizeBusinessDays`    | Ordena e tira repetição                                                                                                                                                                                                                                                                                                                                                  |
| `checkBusinessHours`       | **A** regra do expediente. Sem dia e sem horário → `ok`. Com dia: falta "Das" → `DAYS_WITHOUT_OPENS_AT`; falta "Às" → `DAYS_WITHOUT_CLOSES_AT`; os dois presentes e `closesAt <= opensAt` (comparação de `HH:MM` como texto) → `CLOSES_NOT_AFTER_OPENS`. Sem dia e algum horário → `TIMES_WITHOUT_DAYS`. Devolve **todos** os problemas, para cada campo ganhar seu erro |
| `describeCompanyCnpjTaken` | Mensagem de `CNPJ_TAKEN` (tabela abaixo)                                                                                                                                                                                                                                                                                                                                 |
| `companySearchText`        | `` `${tradeName}\n${legalName}\n${cnpj}\n${formatCnpj(cnpj)}` ``. Valor da coluna de busca: o texto digitado acha o CNPJ sem máscara **e** com máscara. `includesString` compara os dois lados em minúsculas, então a busca ignora caixa: `12abc` acha `12ABC34501DE35`                                                                                                  |
| `companyLocationLabel`     | `São Paulo / SP`                                                                                                                                                                                                                                                                                                                                                         |
| `statesPresentIn`          | UFs distintas da lista recebida, na ordem de `BRAZILIAN_STATES`. Opções do filtro UF (ver `df-ui`)                                                                                                                                                                                                                                                                       |

Mensagens:

| Caso                              | Texto                                                                                 |
| --------------------------------- | ------------------------------------------------------------------------------------- |
| `DAYS_WITHOUT_OPENS_AT`           | `Informe o horário de abertura.`                                                      |
| `DAYS_WITHOUT_CLOSES_AT`          | `Informe o horário de fechamento.`                                                    |
| `CLOSES_NOT_AFTER_OPENS`          | `O horário de fechamento precisa ser depois do de abertura.`                          |
| `TIMES_WITHOUT_DAYS`              | `Marque os dias de atendimento ou apague os horários.`                                |
| `describeCompanyCnpjTaken(true)`  | `Já existe uma empresa com este CNPJ.`                                                |
| `describeCompanyCnpjTaken(false)` | `Já existe uma empresa inativa com este CNPJ. Reative-a em vez de cadastrar de novo.` |

O expediente **não** é lido por nenhuma regra de prazo: `computeDueAt` e o
restante de ADR 019 continuam em horas corridas.

### `app/_lib/domain/registry.ts` (alterado)

```ts
export const COMPANIES_REGISTRY_PATH = "/registry/companies"
```

- Item novo `{ section: "companies", label: "Empresas", href: COMPANIES_REGISTRY_PATH }`.
- `registryNavItemsFor`: diretor → Pessoas, Setores, Tags, **Empresas**. Admin
  de setor continua Pessoas, Tags. `none` continua `[]`.

## Validação — `app/_lib/validation/company.ts`

### Etapa 1

```ts
export const companyCnpjSchema
export const companyPhoneSchema // obrigatório; recebe a mensagem de "vazio"
export const companyOptionalPhoneSchema
export const companyCepSchema
export const companyStateSchema
export const businessDaysSchema

export const createCompanySchema
export type CompanyFormValues = z.input<typeof createCompanySchema>
export type CreateCompanyInput = z.infer<typeof createCompanySchema>
```

Forma de `createCompanySchema` (entrada → saída):

| Campo                                  | Entrada aceita                                         | Saída                                     |
| -------------------------------------- | ------------------------------------------------------ | ----------------------------------------- |
| `cnpj`                                 | texto com ou sem máscara, maiúsculas ou minúsculas     | 14 caracteres em maiúsculas (`cleanCnpj`) |
| `legalName`                            | texto                                                  | `trim`                                    |
| `tradeName`                            | texto                                                  | `trim`                                    |
| `email`                                | texto                                                  | `trim`, minúsculas                        |
| `primaryPhone`                         | texto com ou sem máscara                               | 10–11 dígitos                             |
| `secondaryPhone`                       | texto, `""`, `null` ou ausente                         | dígitos ou `null`                         |
| `cep`                                  | texto com ou sem máscara                               | 8 dígitos                                 |
| `state`                                | sigla                                                  | `BrazilianState`                          |
| `street`, `number`, `district`, `city` | texto                                                  | `trim`                                    |
| `complement`                           | texto, `""`, `null` ou ausente                         | `trim` ou `null`                          |
| `managerName`                          | texto                                                  | `trim`                                    |
| `managerPhone`                         | texto com ou sem máscara                               | 10–11 dígitos                             |
| `businessDays`                         | array de `Weekday` (pode ser vazio), `null` ou ausente | normalizado ou `null` (vazio → `null`)    |
| `opensAt`, `closesAt`                  | `HH:MM`, `""`, `null` ou ausente                       | `HH:MM` ou `null`                         |
| `notes`                                | texto, `""`, `null` ou ausente                         | `trim` ou `null`                          |

- Os campos de máscara aceitam o texto **mascarado** do formulário: o schema
  limpa (`cleanCnpj` no CNPJ, `onlyDigits` nos demais) e valida o valor limpo. O formulário guarda o texto como
  aparece no input; ninguém converte à mão.
- **Idempotente**: `parse(parse(x))` dá o mesmo que `parse(x)`. É o que
  permite a Etapa 2 mandar à action a saída do formulário (dígitos, `null`) e a
  action validar de novo.
- A regra do expediente é um `superRefine` que chama `checkBusinessHours` e põe
  cada problema no campo dele: `DAYS_WITHOUT_OPENS_AT` → `opensAt`;
  `DAYS_WITHOUT_CLOSES_AT` e `CLOSES_NOT_AFTER_OPENS` → `closesAt`;
  `TIMES_WITHOUT_DAYS` → `businessDays`. Mensagens de `BUSINESS_HOURS_MESSAGES`.
- O `superRefine` do expediente roda com `when`: dispara mesmo que outros
  campos estejam inválidos (o formulário vazio com Seg marcada mostra os erros
  do expediente junto com os demais), e só é pulado quando `businessDays`,
  `opensAt` ou `closesAt` já falharam no próprio campo.
- O schema limpa CEP e telefones com `onlyDigits` **sem cortar**: um valor com
  dígitos a mais vindo direto da action é recusado, não truncado. Quem corta
  enquanto se digita é o `MaskedInput` (`cleanCep`, `cleanPhone`). O CNPJ usa
  `cleanCnpj`, que corta em 14.
- Sem `coerce` (manteria a entrada `unknown` e quebraria o `zodResolver`).
- E-mail: `registryEmailSchema` (`validation/registry.ts`, com
  `REGISTRY_EMAIL_MAX_LENGTH = 254`), a regra que era de `personEmailSchema`.
  `personEmailSchema` e `PERSON_EMAIL_MAX_LENGTH` continuam exportados, agora
  como aliases.
- Unicidade do CNPJ **não** é checada no schema; quem descobre é `df-data`.

| Campo                 | Regra                                            | Mensagem                                                                                                                                                      |
| --------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cnpj`                | vazio                                            | `Informe o CNPJ.`                                                                                                                                             |
| `cnpj`                | ≠ 14 caracteres depois de limpar                 | `O CNPJ precisa ter 14 caracteres.`                                                                                                                           |
| `cnpj`                | `!isValidCnpj` (DV errado ou caractere repetido) | `CNPJ inválido.`                                                                                                                                              |
| `legalName`           | vazio / < 2 / > 150                              | `Informe a razão social.` / `A razão social precisa ter no mínimo 2 caracteres.` / `A razão social precisa ter no máximo 150 caracteres.`                     |
| `tradeName`           | vazio / < 2 / > 80                               | `Informe o nome fantasia.` / `O nome fantasia precisa ter no mínimo 2 caracteres.` / `O nome fantasia precisa ter no máximo 80 caracteres.`                   |
| `email`               | vazio / formato / > 254                          | `Informe o e-mail.` / `E-mail inválido.` / `O e-mail precisa ter no máximo 254 caracteres.`                                                                   |
| `primaryPhone`        | vazio                                            | `Informe o telefone primário.`                                                                                                                                |
| `managerPhone`        | vazio                                            | `Informe o contato do responsável.`                                                                                                                           |
| qualquer telefone     | `!isValidPhone`                                  | `Telefone inválido. Informe DDD e número, com 10 ou 11 dígitos.`                                                                                              |
| `cep`                 | vazio / ≠ 8 dígitos                              | `Informe o CEP.` / `O CEP precisa ter 8 dígitos.`                                                                                                             |
| `state`               | ausente ou fora da lista                         | `Selecione a UF.`                                                                                                                                             |
| `street`              | vazio / < 2 / > 120                              | `Informe o logradouro.` / `O logradouro precisa ter no mínimo 2 caracteres.` / `O logradouro precisa ter no máximo 120 caracteres.`                           |
| `number`              | vazio / > 10                                     | `Informe o número.` / `O número precisa ter no máximo 10 caracteres.`                                                                                         |
| `district`            | vazio / < 2 / > 80                               | `Informe o bairro.` / `O bairro precisa ter no mínimo 2 caracteres.` / `O bairro precisa ter no máximo 80 caracteres.`                                        |
| `city`                | vazio / < 2 / > 80                               | `Informe a cidade.` / `A cidade precisa ter no mínimo 2 caracteres.` / `A cidade precisa ter no máximo 80 caracteres.`                                        |
| `complement`          | > 80                                             | `O complemento precisa ter no máximo 80 caracteres.`                                                                                                          |
| `managerName`         | vazio / < 2 / > 80                               | `Informe o nome do responsável.` / `O nome do responsável precisa ter no mínimo 2 caracteres.` / `O nome do responsável precisa ter no máximo 80 caracteres.` |
| `businessDays`        | item fora de 1–7                                 | `Dia da semana inválido.`                                                                                                                                     |
| `opensAt`, `closesAt` | fora de `HH:MM` (00:00–23:59)                    | `Horário inválido.`                                                                                                                                           |
| `notes`               | > 500                                            | `A observação precisa ter no máximo 500 caracteres.`                                                                                                          |
| expediente            | ver `checkBusinessHours`                         | `BUSINESS_HOURS_MESSAGES`                                                                                                                                     |

Os limites de 80 caracteres reusam `REGISTRY_NAME_MAX_LENGTH`; o mínimo de 2,
`REGISTRY_NAME_MIN_LENGTH`.

### Etapa 2

```ts
export const updateCompanySchema // { id } + os mesmos campos e o mesmo superRefine
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>

export const setCompanyActiveSchema // z.object({ id, isActive })
export type SetCompanyActiveInput = z.infer<typeof setCompanyActiveSchema>
```

| Campo      | Regra            | Mensagem             |
| ---------- | ---------------- | -------------------- |
| `id`       | inteiro positivo | `Empresa inválida.`  |
| `isActive` | boolean          | `Situação inválida.` |

`createCompanySchema` e `updateCompanySchema` saem do **mesmo** objeto de
campos com a **mesma** função de refinamento. Não chamar `.extend` sobre um
schema já refinado (o Zod 4 não preserva o refinamento por esse caminho):
montar os dois a partir do objeto base e aplicar o refinamento em cada um.

## `df-auth` — sem mudança

`requireDirector`, `getDirector` (`app/_lib/auth/director.ts`) já atendem. O
layout de `/registry` (`requireRegistryAccess`) já barra o membro.

## `df-data` — o que criar

### `app/_lib/data/companies.ts` (novo)

```ts
export async function listCompanies(): Promise<CompanyListItem[]>
export async function insertCompany(
  values: CompanyValues,
): Promise<InsertCompanyOutcome>
```

Etapa 2:

```ts
export async function updateCompany(
  id: number,
  values: CompanyValues,
): Promise<UpdateCompanyOutcome>
export async function updateCompanyActive(
  id: number,
  isActive: boolean,
): Promise<UpdateCompanyActiveOutcome>
```

**`listCompanies()`** — Etapa 1

- Todas as empresas, ativas e inativas. Ordem `lower(trade_name)`, `id`.
- Telefones por `left join` (ou subconsulta) em `company_contact` por
  `position`. Empresa sem secundário → `secondaryPhone: null`. Empresa sem
  primário (não deveria ocorrer: o Zod exige o campo e `insertCompany` grava o
  primário na mesma transação) → `primaryPhone: ""`.
- `business_days` volta como `number[]`: filtrar com `isWeekday` (sem `as`);
  `null` continua `null`.
- `opens_at`/`closes_at` voltam do driver como `HH:MM:SS`: devolver `HH:MM`
  (os 5 primeiros caracteres).
- Não filtra por permissão: quem chama já passou por `requireDirector`.

**`insertCompany(values)`** — Etapa 1, numa transação

1. `insert into company (...) returning id` (`is_active` no default).
2. `insert into company_contact (company_id, position, phone)` do primário e,
   se `secondaryPhone` não for `null`, do secundário.
3. `saved` com o `id`.
4. Violação `23505` em `company_cnpj_idx` (`isUniqueViolation` de
   `app/_lib/data/db-errors.ts`) → **fora** da transação abortada, buscar
   `is_active` da empresa com esse `cnpj` e devolver
   `{ status: "cnpj_taken", existingIsActive }`. Outro erro → relança.

**`updateCompany(id, values)`** — Etapa 2, numa transação

1. `update company set ... where id returning id`. Zero linhas → `not_found`.
2. Primário: `insert ... on conflict (company_id, position) do update set phone, updated_at`.
3. Secundário: com valor, o mesmo upsert; `null` → `delete` da linha
   `secondary` (se houver).
4. CNPJ pode mudar (correção de digitação); violação de `company_cnpj_idx` →
   mesma busca de `insertCompany` → `cnpj_taken`. Salvar com o próprio CNPJ não
   conflita (o índice compara com a própria linha).
5. `is_active` nunca é tocado aqui.

**`updateCompanyActive(id, isActive)`** — Etapa 2

- `update company set is_active, updated_at where id returning id`. Zero
  linhas → `not_found`. Sem pré-condição nos dois sentidos. Mesmo valor já
  gravado não é erro.

### `db/seed.ts` (alterado) — Etapa 1

Empresas de exemplo do bloco QA. Especificadas em `docs/contracts/qa-seed.md`
("Empresas").

## `df-actions` — o que criar

### `app/_lib/actions/companies.ts` (novo, `"use server"`)

Mesmo formato de `app/_lib/actions/departments.ts`.

```ts
export type CompanyErrorCode =
  "INVALID_INPUT" | "FORBIDDEN" | "CNPJ_TAKEN" | "NOT_FOUND"

export interface CompanyActionSuccess {
  ok: true
  message: string
}

export interface CompanyActionFailure {
  ok: false
  message: string
  code?: CompanyErrorCode
}

export type CompanyActionResult = CompanyActionSuccess | CompanyActionFailure

export const createCompany: (
  input: CreateCompanyInput,
) => Promise<CompanyActionResult>
```

Etapa 2:

```ts
export const updateCompany: (
  input: UpdateCompanyInput,
) => Promise<CompanyActionResult>
export const setCompanyActive: (
  input: SetCompanyActiveInput,
) => Promise<CompanyActionResult>
```

Os nomes das funções de dados (`insertCompany`, `updateCompanyActive`) não
repetem os das actions, exceto `updateCompany`, que existe nos dois lados como
em Tags (`updateTag`): a action importa a de dados com alias
(`updateCompany as saveCompany`), como `app/_lib/actions/tags.ts` faz
(`updateTag as saveTag`).

Sequência comum:

1. `const actor = await getDirector()`; `null` → `FORBIDDEN`, **antes** do parse.
2. `<schema>.safeParse(input)`; inválido → `INVALID_INPUT` com a primeira
   `issue.message`.
3. Função de dados em `try/catch`; exceção → `console.error("[<action>]", error)`
   e falha inesperada, sem `code`.
4. Traduz o `Outcome`.
5. Sucesso → `revalidatePath(COMPANIES_REGISTRY_PATH)` e `{ ok: true, message }`.

| Situação         | `code`          | Mensagem                                                    |
| ---------------- | --------------- | ----------------------------------------------------------- |
| criada           | —               | `Empresa criada.`                                           |
| atualizada       | —               | `Empresa atualizada.` (Etapa 2)                             |
| ativada          | —               | `Empresa ativada.` (Etapa 2)                                |
| desativada       | —               | `Empresa desativada.` (Etapa 2)                             |
| não é diretor    | `FORBIDDEN`     | `Você não tem permissão para gerenciar empresas.`           |
| schema falhou    | `INVALID_INPUT` | primeira `issue.message` do Zod                             |
| `cnpj_taken`     | `CNPJ_TAKEN`    | `describeCompanyCnpjTaken(outcome.existingIsActive)`        |
| `not_found`      | `NOT_FOUND`     | `Empresa não encontrada.` (Etapa 2)                         |
| falha inesperada | —               | `Não foi possível salvar a empresa agora. Tente novamente.` |

Nenhuma action escreve SQL nem recebe id de ator.

## `df-ui` — o que criar

### Primitivo — Etapa 1

- `npx shadcn@latest add toggle-group` (traz `toggle`) — depois, trocar o
  import do `cn` para `@/app/_lib/utils`.

### Menu — Etapa 1

Nada a codar na sidebar: `RegistryNav` já desenha o que `registryNavItemsFor`
devolve. Conferir ícone e `aria-current` no item novo.

### `app/(app)/registry/companies/page.tsx` (novo, Server Component) — Etapa 1

```ts
export const metadata: Metadata = { title: "Empresas" }

const CompaniesPage = async () => {
  await requireDirector()
  const companies = await listCompanies()
  ...
}
```

- Mesmo cabeçalho de Setores: `h1` "Empresas" à esquerda, botão primário
  **"Nova empresa"** (`PlusIcon`) à direita, que abre o Dialog.
- Passa `companies` à tabela.

### `app/(app)/registry/companies/_components/companies-table.tsx` — Etapa 1

`DataTable` de `app/_components/data-table/`, como Setores e Tags.

| Coluna (header) | Accessor / id                                                        | Célula                                                                              |
| --------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `Empresa`       | `companySearchText(row)`, id `company`, `filterFn: "includesString"` | `tradeName` em `font-medium`; `legalName` abaixo em `text-xs text-muted-foreground` |
| `CNPJ`          | `cnpj`                                                               | `formatCnpj(cnpj)` em `font-mono`, sem quebra                                       |
| `Cidade / UF`   | `state`, `filterFn: "inValues"`                                      | `companyLocationLabel(city, state)`                                                 |
| `Responsável`   | `managerName`                                                        | texto                                                                               |
| `Status`        | `isActive`, `filterFn: "inValues"`                                   | `ActiveStatusBadge`                                                                 |
| ações (Etapa 2) | display `actions`                                                    | `CompanyRowActions`                                                                 |

- Busca: `{ columnId: "company", label: "Buscar empresa por nome, razão social ou CNPJ", placeholder: "Buscar por nome, razão social ou CNPJ" }`.
- Filtros (prop `filters`):
  - **Status**: `activeStatusFilter` (Ativo / Inativo), o mesmo das outras telas.
  - **UF**: `{ columnId: "state", label: "UF", options: statesPresentIn(companies.map((c) => c.state)).map((s) => ({ value: s, label: brazilianStateLabel(s) })) }`.
    Só as UFs que existem na lista (ativas e inativas), na ordem fixa: 27
    checkboxes num popover seria longo e quase todos dariam lista vazia.
- **Padrão Status = Ativo**: `initialColumnFilters = [{ id: "isActive", value: ["true"] }]`
  quando há pelo menos uma empresa; com a lista vazia, sem filtro inicial
  (assim a tabela mostra `emptyMessage` e não "Nenhum resultado para os
  filtros aplicados."). O botão "Filtros" abre com contagem 1; desmarcar
  mostra todas.
- `emptyMessage`: `Nenhuma empresa cadastrada.`
- Busca: `includesString` do TanStack ignora caixa, não ignora acento.
  Limitação conhecida: um CNPJ digitado com máscara **parcial misturada**
  (`12345678/0001`) não casa com nenhuma das duas formas; sem máscara ou com
  a máscara completa (inteira ou trecho), casa.

### `app/_components/masked-input.tsx` (novo, `MaskedInput`) — Etapa 1

Peça genérica de interface (sem conhecer empresa), por isso em
`app/_components/` desde o primeiro uso (seção 5 do `stack.md`).

```ts
interface MaskedInputProps extends Omit<
  React.ComponentProps<typeof Input>,
  "value" | "onChange" | "type"
> {
  value: string
  onChange: (value: string) => void
  clean: (value: string) => string
  format: (clean: string) => string
}
```

- `type="text"`, `autoComplete="off"`. `inputMode="numeric"` por padrão (CEP e
  telefones); o CNPJ passa `inputMode="text"` e `autoCapitalize="characters"`,
  porque aceita letras.
- A cada mudança: limpa o texto novo com `clean` (que já corta no tamanho
  máximo), formata com `format` e chama `onChange` com o texto **formatado**.
  O que `clean` descarta (símbolos; letras no CEP, no telefone e nos 2 últimos
  do CNPJ) some; minúscula no CNPJ vira maiúscula; colar texto mascarado ou
  não funciona igual.
- **Cursor**: antes de formatar, conta quantos caracteres válidos (os que
  `clean` mantém) há à esquerda do
  `selectionStart` no texto novo; depois de formatar, põe o cursor logo depois
  do mesmo número de caracteres válidos no texto formatado (em `useLayoutEffect` ou após
  o `setValue`, com `setSelectionRange`). Assim, inserir ou apagar no meio não
  joga o cursor para o fim, inclusive na troca fixo ↔ celular.
- **Backspace sobre caractere da máscara** (`)`, espaço, `-`, `.`, `/`): se o
  texto encolheu mas o número de caracteres válidos não mudou, apaga o
  caractere válido imediatamente à esquerda do cursor e reformata. O mesmo
  para Delete com o caractere à direita.
- Usos: CNPJ (`cleanCnpj` + `formatCnpj`), CEP (`cleanCep` + `formatCep`), os
  três telefones (`cleanPhone` + `formatPhone`), todos de
  `app/_lib/domain/brazilian-formats.ts`.

### `app/(app)/registry/companies/_components/company-form-dialog.tsx` — Etapa 1 (criar), Etapa 2 (editar)

Na Etapa 1 o componente **não recebe props** (só cria): `page.tsx` o usa como
`<CompanyFormDialog />`. A união discriminada por `mode` abaixo nasce na Etapa
2, quando `page.tsx` passa a usar `mode="create"` e `CompanyRowActions`,
`mode="edit"`.

Etapa 2:

```ts
interface CreateCompanyFormDialogProps {
  mode: "create"
}

interface EditCompanyFormDialogProps {
  mode: "edit"
  company: CompanyListItem
}

type CompanyFormDialogProps =
  CreateCompanyFormDialogProps | EditCompanyFormDialogProps
```

Formulário: React Hook Form + `zodResolver(createCompanySchema)`, com
`useForm<CompanyFormValues, unknown, CreateCompanyInput>`, nos dois modos.

- **Valores iniciais**, criar: todos os textos `""`, `state` indefinido,
  `businessDays: []`, horários `""`. Editar (Etapa 2): os da linha, com
  `formatCnpj`/`formatCep`/`formatPhone` nos campos de máscara, `null` → `""`
  e `businessDays ?? []`. `form.reset(...)` ao abrir, como o Dialog de Tags.
- **Envio**, criar: `createCompany(values)`. Editar: `updateCompany({ id:
props.company.id, ...values })`.
- Sucesso → toast `result.message` e fecha. `CNPJ_TAKEN` →
  `form.setError("cnpj", { message: result.message }, { shouldFocus: true })`,
  Dialog continua aberto com os valores. Qualquer outro → toast de erro.
- **Gatilho**, criar: `Button` primário "Nova empresa" com `PlusIcon`. Editar:
  `Button` `ghost` `sm` "Editar" com `PencilIcon` e
  `aria-label="Editar <tradeName>"`.

Cabeçalho, corpo e rodapé:

| Parte     | Conteúdo                                                                                                                                       |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Título    | `Nova empresa` / `Editar empresa`                                                                                                              |
| Subtítulo | `COMPANY_REQUIRED_FIELDS_HINT` (`Campos com * são obrigatórios.`) nos dois modos                                                               |
| Rodapé    | `Cancelar` (`DialogClose`, `outline`) e submit `Salvar empresa` (criar) / `Salvar alterações` (editar); pendente `Salvando…` com `Loader2Icon` |

- **Só o corpo rola.** `DialogContent` em coluna, `max-h-[calc(100dvh-2rem)]`,
  sem `overflow` próprio; `DialogHeader` e `DialogFooter` com `shrink-0`; o
  corpo entre eles com `min-h-0 flex-1 overflow-y-auto` e `scroll-py-*` com
  folga. O `<form>` envolve cabeçalho, corpo e rodapé (o submit está no
  rodapé) e é ele o contêiner em coluna. Largura `sm:max-w-2xl`.
- O rodapé fica **fora** do contêiner que rola: o navegador traz o campo
  focado para dentro da área visível do corpo, e o rodapé não o cobre.
- Duas colunas a partir de `sm`, uma no celular. Exceção: o grupo Endereço usa
  grade de **4 colunas** a partir de `sm` (larguras em frações de 4 na tabela
  abaixo) e uma coluna abaixo de `sm`.
- Cada grupo é `FieldSet` com `FieldLegend`. O asterisco é parte do rótulo,
  com `aria-hidden="true"`; o input obrigatório leva `aria-required="true"`.
  `FieldError` por campo, ligado por `aria-describedby`, como no Dialog de Tags.
- **Sem** botões "Buscar" ao lado de CNPJ ou CEP. **Sem** seletor de tipo de
  telefone.

| Grupo         | Campo (rótulo)            | Controle                                                                                                           | Largura     | Placeholder                        |
| ------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------ | ----------- | ---------------------------------- |
| Identificação | CNPJ \*                   | `MaskedInput` CNPJ                                                                                                 | total       | `CNPJ_PLACEHOLDER`                 |
|               | Razão social \*           | `Input`                                                                                                            | total       | —                                  |
|               | Nome fantasia \*          | `Input`                                                                                                            | metade      | —                                  |
|               | E-mail \*                 | `Input type="email"`                                                                                               | metade      | —                                  |
| Contatos      | Primário \*               | `MaskedInput` telefone                                                                                             | metade      | `PHONE_PLACEHOLDER`                |
|               | Secundário                | `MaskedInput` telefone                                                                                             | metade      | `PHONE_PLACEHOLDER`                |
| Endereço      | CEP \*                    | `MaskedInput` CEP                                                                                                  | 2/4         | `CEP_PLACEHOLDER`                  |
|               | UF \*                     | `Select` com `BRAZILIAN_STATES` e `brazilianStateLabel`, placeholder `Selecione`                                   | 2/4         | —                                  |
|               | Logradouro \*             | `Input`                                                                                                            | 3/4         | —                                  |
|               | Número \*                 | `Input`                                                                                                            | 1/4         | —                                  |
|               | Bairro \*                 | `Input`                                                                                                            | 2/4         | —                                  |
|               | Cidade \*                 | `Input`                                                                                                            | 2/4         | —                                  |
|               | Complemento               | `Input`                                                                                                            | 4/4 (total) | `COMPANY_COMPLEMENT_PLACEHOLDER`   |
| Responsável   | Responsável \*            | `Input`                                                                                                            | metade      | `COMPANY_MANAGER_NAME_PLACEHOLDER` |
|               | Contato do responsável \* | `MaskedInput` telefone                                                                                             | metade      | `PHONE_PLACEHOLDER`                |
| Expediente    | Dias                      | `ToggleGroup type="multiple"`, um item por `WEEKDAYS`, texto `WEEKDAY_SHORT_LABELS`, `aria-label` `WEEKDAY_LABELS` | total       | —                                  |
|               | Das                       | `Input type="time"`                                                                                                | metade      | —                                  |
|               | Às                        | `Input type="time"`                                                                                                | metade      | —                                  |
|               | Observação                | `Textarea`                                                                                                         | total       | `COMPANY_NOTES_PLACEHOLDER`        |

- UF é `Select`, não `Combobox`: lista fixa e curta, regra de
  `docs/contracts/registry-people.md` ("Combobox").
- O `ToggleGroup` devolve strings: converter com `Number` + `isWeekday` no
  `onValueChange` (sem `as`) e guardar `Weekday[]` no formulário.
- O grupo Expediente não tem asterisco. O erro `TIMES_WITHOUT_DAYS` aparece
  abaixo dos dias.
- Nenhum Client Component importa `@/db/*`, `drizzle-orm`, `app/_lib/data` ou
  `app/_lib/auth`.

### `app/(app)/registry/companies/_components/company-row-actions.tsx` — Etapa 2

`RegistryRowActions` com dois slots:

| Slot     | Largura | Ação                                                                                            |
| -------- | ------- | ----------------------------------------------------------------------------------------------- |
| `edit`   | `fit`   | `CompanyFormDialog mode="edit"`                                                                 |
| `status` | `md`    | ativa → `DeactivateRegistryDialog`; inativa → `ReactivateRegistryButton` (sem `disabledReason`) |

- `DeactivateRegistryDialog`: `name = tradeName`, `description` =
  `A empresa sai da lista de ativas. Os dados ficam guardados e você pode reativá-la depois.`,
  sem `blockedReason` nem `blockedLink`; `onDeactivate` → `setCompanyActive({ id, isActive: false })`.
- `ReactivateRegistryButton`: `onReactivate` → `setCompanyActive({ id, isActive: true })`.
- Não existe ação de excluir.

## Decisão registrada — CNPJ alfanumérico

O usuário decidiu (2026-11-06) aceitar o CNPJ alfanumérico da IN RFB
2.229/2024, emitido desde julho de 2026, ao lado do numérico. Um formato só,
`[0-9A-Z]{12}[0-9]{2}`, uma função de DV só (ASCII − 48), uma máscara só. O
numérico é o caso particular em que as 12 primeiras posições são dígitos;
nenhum ramo separado. Não há migração de dado: a tabela nasce com o formato
novo.

## Riscos

1. **CNPJ duplicado** — tratado como resultado (`cnpj_taken` → `CNPJ_TAKEN` →
   erro no campo). Uma corrida entre duas criações iguais cai no mesmo caminho,
   porque quem decide é o índice.
2. **Máscara de telefone** — troca de posição do hífen no 10º/11º dígito e
   salto de cursor. Mitigado pelo algoritmo de `MaskedInput`; cenários C12 e C13.
3. **Dialog alto** — ~1260 px de conteúdo; foco atrás do rodapé e teclado
   virtual no celular. Mitigado por rodapé fora do contêiner que rola,
   `scroll-padding` e `dvh`; cenários C20 e C21.
4. **Senha do Diretor** — o QA depende da senha do `.env` (`SEED_ADMIN_*`). Se
   foi trocada pela interface, o QA não entra; conferir antes da Onda 4. Nunca
   escrever a senha em documento ou relatório.
5. **Expediente que atravessa a meia-noite** não é representável. Aceito.
6. **Lista com o registro inteiro** — volume pequeno; se crescer, paginar no
   servidor.
7. **`tsc` entre ondas** — `RegistrySection` ganha `"companies"`: se algum
   `Record<RegistrySection, …>` existir fora do domínio, quebra até o dono
   ajustar. Hoje não há.

## Regras de dados do `df-qa` nesta feature

Diferente das features de leitura, aqui o QA **escreve**: cria, edita,
desativa e reativa empresas. Permitido **só** em empresas criadas pelo próprio
QA nesta feature, com nome fantasia começando por `[QA] ` (convenção de
`docs/contracts/qa-seed.md`). As empresas do seed (`QA Alfa`, `QA Beta`,
`QA Gama`) e qualquer outra são só leitura: o teste pode abrir o Dialog de
edição delas e cancelar, nunca salvar, desativar ou reativar.

CNPJs válidos reservados ao teste (usar na ordem; se o CNPJ já estiver em uso
por uma empresa `[QA]` de rodada anterior, passar ao próximo):

| Uso                        | CNPJ                                                                                                                                                                                                                         |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| criação completa (C17)     | `11.222.333/0001-81`                                                                                                                                                                                                         |
| criação mínima (C18)       | `11.444.777/0001-61`                                                                                                                                                                                                         |
| criação alfanumérica (C25) | `12.ABC.345/01DE-35` (exemplo oficial da Receita; digitado em minúsculas no cenário)                                                                                                                                         |
| reserva                    | numéricos `13.579.246/0001-01`, `24.681.357/0001-40`, `31.415.926/0001-71`, `27.182.818/0001-29`, `16.180.339/0001-57`, `14.142.135/0001-04`; alfanuméricos `QA.1B2.C3D/0001-93`, `X9.Y8Z.7W6/0001-29`, `Z1.Z2Z.3Z4/0001-12` |
| inválidos                  | `11.222.333/0001-82` (DV numérico), `12.ABC.345/01DE-36` (DV alfanumérico), `00.000.000/0000-00` (repetido)                                                                                                                  |

Consultas de conferência (MCP `postgres`, só leitura):

```sql
select id, cnpj, trade_name, cep, state, manager_phone, business_days, opens_at, closes_at, complement, notes, is_active, updated_at
from company where cnpj = $1;

select position, phone from company_contact where company_id = $1 order by position;
```

## Cenários para o `df-qa`

Quem: **D** = Diretor (`SEED_ADMIN_EMAIL`), **A** = QA Admin Suporte, **M** =
QA Membro Suporte. Viewport padrão 1280×800 salvo indicação.

### Etapa 1 — lista e criação

| #   | Quem     | Ação                                                                                                                                                              | Esperado                                                                                                                                                                                                                                                      |
| --- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | D        | abrir o menu Cadastros                                                                                                                                            | subitens na ordem Pessoas, Setores, Tags, **Empresas**; clicar abre `/registry/companies` com `aria-current="page"` no item; título "Empresas"; botão "Nova empresa" à direita                                                                                |
| C2  | A        | menu Cadastros; depois abrir `/registry/companies` pela URL                                                                                                       | menu sem Empresas (só Pessoas e Tags); a URL dá 404                                                                                                                                                                                                           |
| C3  | M        | abrir `/registry/companies` pela URL                                                                                                                              | sem Cadastros no menu; 404                                                                                                                                                                                                                                    |
| C4  | D        | carregar a lista                                                                                                                                                  | botão "Filtros" com contagem 1 e Status Ativo marcado; `QA Alfa` e `QA Beta` visíveis, `QA Gama` (inativa) não; desmarcar Ativo → `QA Gama` aparece com badge "Inativo"                                                                                       |
| C5  | D        | conferir as colunas da linha `QA Alfa`                                                                                                                            | "QA Alfa" em destaque e a razão social abaixo, menor; CNPJ `12.345.678/0001-95` em fonte mono; `São Paulo / SP`; responsável do seed; badge "Ativo"; ordem Empresa, CNPJ, Cidade / UF, Responsável, Status                                                    |
| C6  | D        | buscar `alfa`; um trecho da razão social da `QA Beta`; `12345678`; `12.345.678/0001-95`; `0001-95`; `zzzz`                                                        | os quatro primeiros acham a empresa certa; `zzzz` mostra "Nenhum resultado para os filtros aplicados."                                                                                                                                                        |
| C7  | D        | abrir o grupo UF; marcar RJ; depois buscar `alfa` com RJ marcado                                                                                                  | opções só SP, RJ e MG (UFs do seed), no formato `SP — São Paulo`; RJ → só `QA Beta`; com a busca, lista vazia (E entre filtro e busca)                                                                                                                        |
| C8  | D        | clicar "Nova empresa"                                                                                                                                             | título "Nova empresa", subtítulo "Campos com \* são obrigatórios."; grupos Identificação, Contatos, Endereço, Responsável, Expediente; **nenhum** botão "Buscar"; **nenhum** seletor de tipo de telefone; placeholders do contrato                            |
| C9  | D        | "Salvar empresa" com tudo vazio                                                                                                                                   | erros em todos os obrigatórios (CNPJ, razão social, nome fantasia, e-mail, primário, CEP, UF, logradouro, número, bairro, cidade, responsável, contato do responsável); nenhum erro em Secundário, Complemento e Expediente; foco no CNPJ; nada gravado       |
| C10 | D        | no CNPJ digitar `11222333000181`; depois `!@#`; depois um 15º caractere; apagar e colar `11.222.333/0001-81`; apagar e digitar `12abc34501dexy35`                 | `11.222.333/0001-81`; símbolos não entram; 15º ignorado; colar dá o mesmo texto; no último, as minúsculas viram maiúsculas e `x` e `y` (posições 13–14) são descartados: `12.ABC.345/01DE-35`                                                                 |
| C11 | D        | CNPJ `11.222.333/0001-82`; `12.ABC.345/01DE-36`; `00.000.000/0000-00`; 13 caracteres; salvar                                                                      | `CNPJ inválido.` nos três primeiros; `O CNPJ precisa ter 14 caracteres.` no quarto                                                                                                                                                                            |
| C12 | D        | no Primário digitar `1191232341`; depois `0`; depois Backspace; depois mais dois dígitos; testar `119123234` e `0191232341` ao salvar                             | `(11) 9123-2341` → `(11) 91232-3410` → `(11) 9123-2341`; o 12º dígito é ignorado; 9 dígitos e DDD começando com 0 → `Telefone inválido. Informe DDD e número, com 10 ou 11 dígitos.`                                                                          |
| C13 | D        | com `(11) 9123-2341`, cursor depois de `(11) 91`, digitar `5`; Backspace no meio; cursor logo depois do `-` e Backspace                                           | o `5` entra na posição e o cursor fica logo depois dele (vira `(11) 91523-2341`), sem pular para o fim; Backspace no meio apaga o dígito à esquerda e mantém o cursor; Backspace depois do `-` apaga o dígito antes do hífen                                  |
| C14 | D        | CEP `01310100`; depois 7 dígitos e salvar                                                                                                                         | `01310-100`; com 7 → `O CEP precisa ter 8 dígitos.`                                                                                                                                                                                                           |
| C15 | D        | abrir o select UF                                                                                                                                                 | 27 opções, de `AC — Acre` a `TO — Tocantins`, na ordem alfabética do nome                                                                                                                                                                                     |
| C16 | D        | Expediente: (a) marcar Seg sem horário; (b) Das 18:00 Às 08:00; (c) desmarcar os dias com horários preenchidos; (d) tudo vazio — salvar em cada caso              | (a) `Informe o horário de abertura.` e `Informe o horário de fechamento.`; (b) `O horário de fechamento precisa ser depois do de abertura.` em Às; (c) `Marque os dias de atendimento ou apague os horários.` abaixo dos dias; (d) sem erro no grupo          |
| C17 | D        | criar `[QA] Empresa Completa` com CNPJ `11.222.333/0001-81`, os dois telefones, complemento, Seg a Sex 08:00–18:00 e observação                                   | toast "Empresa criada.", Dialog fecha, linha aparece como Ativo; no banco: `cnpj = '11222333000181'`, CEP e telefones só dígitos, `business_days = {1,2,3,4,5}`, `opens_at = 08:00:00`, `closes_at = 18:00:00`; `company_contact` com `primary` e `secondary` |
| C18 | D        | criar `[QA] Empresa Mínima` com CNPJ `11.444.777/0001-61`, sem secundário, sem complemento, sem expediente                                                        | toast "Empresa criada."; no banco: uma linha `primary` em `company_contact`; `complement`, `business_days`, `opens_at`, `closes_at`, `notes` nulos                                                                                                            |
| C19 | D        | "Nova empresa" com CNPJ `11222333000181` (sem máscara) e o resto válido; depois com `45.678.901/0001-75` (`QA Gama`, inativa)                                     | erro no campo CNPJ: `Já existe uma empresa com este CNPJ.`; depois `Já existe uma empresa inativa com este CNPJ. Reative-a em vez de cadastrar de novo.`; foco no CNPJ; Dialog aberto com os valores; **nenhum** toast; nada gravado                          |
| C20 | D        | viewport 1280×720; abrir o Dialog; rolar; Tab do primeiro ao último campo; preencher só a Identificação e marcar Seg sem horário; salvar                          | cabeçalho e rodapé sempre visíveis, só o corpo rola; cada campo focado aparece inteiro, nunca atrás do rodapé; no envio, o foco vai ao primeiro campo inválido e ele fica visível                                                                             |
| C21 | D        | viewport 390×844; abrir o Dialog e percorrer                                                                                                                      | uma coluna; sem rolagem horizontal; rodapé visível; botões do rodapé alcançáveis                                                                                                                                                                              |
| C22 | D        | preencher parte e Cancelar; reabrir; depois Esc                                                                                                                   | Dialog fecha sem gravar; reabre vazio                                                                                                                                                                                                                         |
| C23 | D        | e-mail `abc`; depois o mesmo e-mail de `QA Alfa` numa empresa nova válida (CNPJ de reserva)                                                                       | `E-mail inválido.`; com e-mail repetido, cria normalmente (e-mail não é único)                                                                                                                                                                                |
| C24 | D        | leitor de tela/inspeção nos dias                                                                                                                                  | cada botão tem `aria-label` com o nome completo do dia e `aria-pressed`/`data-state` coerente; asteriscos fora da árvore de acessibilidade; obrigatórios com `aria-required`                                                                                  |
| C25 | D        | criar `[QA] Empresa Alfanumérica` digitando o CNPJ `12abc34501de35` (minúsculas), o resto válido e mínimo; depois buscar `12abc`, `12ABC34501DE35` e `12.ABC.345` | campo mostra `12.ABC.345/01DE-35`; toast "Empresa criada."; no banco `cnpj = '12ABC34501DE35'`; coluna CNPJ `12.ABC.345/01DE-35`; as três buscas acham a empresa                                                                                              |
| C26 | D        | buscar `ab12c` e `AB.12C.D34`                                                                                                                                     | acham `QA Beta` (CNPJ alfanumérico do seed, `AB.12C.D34/0001-84`)                                                                                                                                                                                             |
| C27 | D        | "Nova empresa" com CNPJ `ab.12c.d34/0001-84` (`QA Beta`, em minúsculas) e o resto válido                                                                          | erro no campo CNPJ `Já existe uma empresa com este CNPJ.` (a comparação é sobre o valor em maiúsculas)                                                                                                                                                        |
| C28 | qualquer | navegar por C1–C27                                                                                                                                                | nenhum erro nem aviso de hidratação no dev server (MCP `next-devtools`)                                                                                                                                                                                       |

### Etapa 2 — edição, desativar e reativar

| #   | Quem     | Ação                                                                                                 | Esperado                                                                                                                                                                                  |
| --- | -------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E1  | D        | olhar a coluna de ações com Status Ativo e Inativo marcados                                          | ativas: "Editar" e "Desativar"; inativas: "Editar" e "Reativar"; colunas alinhadas entre linhas; nenhuma ação de excluir                                                                  |
| E2  | D        | "Editar" em `[QA] Empresa Completa`                                                                  | título "Editar empresa", subtítulo "Campos com \* são obrigatórios."; todos os campos preenchidos com máscara; Seg a Sex marcados; 08:00 e 18:00; rodapé "Cancelar" e "Salvar alterações" |
| E3  | D        | mudar nome fantasia para `[QA] Empresa Completa 2` e cidade; salvar                                  | toast "Empresa atualizada."; linha atualizada; no banco `updated_at` mudou                                                                                                                |
| E4  | D        | apagar o Secundário e salvar; depois preencher de novo e salvar                                      | primeiro: só `primary` em `company_contact`; depois: `secondary` de volta com o número novo                                                                                               |
| E5  | D        | desmarcar todos os dias e apagar os horários; salvar                                                 | salva; no banco `business_days`, `opens_at`, `closes_at` nulos                                                                                                                            |
| E6  | D        | trocar o CNPJ para `12.345.678/0001-95` (`QA Alfa`) e salvar; depois voltar ao próprio CNPJ e salvar | erro no campo CNPJ `Já existe uma empresa com este CNPJ.`, sem toast; com o próprio CNPJ salva normalmente                                                                                |
| E7  | D        | "Editar" em `QA Alfa` (seed) e Cancelar                                                              | abre preenchida; Cancelar não grava (seed é só leitura)                                                                                                                                   |
| E8  | D        | "Desativar" em `[QA] Empresa Mínima`; Cancelar; de novo e confirmar                                  | dialog "Desativar [QA] Empresa Mínima?" com o texto do contrato; Cancelar não muda nada; confirmar → toast "Empresa desativada."; some da lista com o filtro padrão; aparece com Inativo  |
| E9  | D        | "Reativar" em `[QA] Empresa Mínima`                                                                  | toast "Empresa ativada."; badge Ativo                                                                                                                                                     |
| E10 | D        | editar uma empresa `[QA]` inativa (desativar antes) e salvar                                         | salva; continua inativa                                                                                                                                                                   |
| E11 | A, M     | abrir `/registry/companies`                                                                          | 404, como na Etapa 1                                                                                                                                                                      |
| E12 | D        | estado final da rodada                                                                               | empresas `[QA]` criadas na rodada desativadas; seed intacto                                                                                                                               |
| E13 | qualquer | navegar por E1–E12                                                                                   | nenhum erro nem aviso de hidratação no dev server                                                                                                                                         |

`FORBIDDEN` da action para não-diretor e a corrida de CNPJ não são testáveis
pelo navegador: ficam para o `df-debug` (checklist).

## Checklist de encerramento

Etapa 1 — concluída em 2026-11-06 (`df-reviewer` aprovado com atenções;
`df-qa` 28/28 em `docs/test-reports/2026-11-06-registry-companies-etapa-1.md`):

- [x] `npm run db:migrate` aplicado (usuário); `company` e `company_contact` existem
- [x] schema, migration `0021_company`, tipos, domínio, `createCompanySchema` (`df-architect`)
- [x] `listCompanies`, `insertCompany`; seed com `QA Alfa`, `QA Beta`, `QA Gama` (`df-data`)
- [x] `createCompany` (`df-actions`)
- [x] página, tabela, filtros, `MaskedInput`, Dialog de criação, `toggle-group` (`df-ui`)
- [ ] não-diretor chamando `createCompany` → `FORBIDDEN`, antes da validação (`df-debug`) — sem registro de execução no relatório da Etapa 1
- [x] `npx tsc --noEmit`, `npm run lint`, `npm run build`; cenários C aprovados

Etapa 2:

- [ ] E12: desativar as quatro empresas `[QA]` criadas pela rodada da Etapa 1 (ids 4, 5, 9 e 10), além das criadas na rodada da Etapa 2

- [ ] `updateCompanySchema`, `setCompanyActiveSchema` (`df-architect`)
- [ ] `updateCompany`, `updateCompanyActive` (`df-data`)
- [ ] `updateCompany`, `setCompanyActive` (`df-actions`)
- [ ] `CompanyRowActions`, Dialog em modo edição (`df-ui`)
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm run build`; cenários E aprovados
