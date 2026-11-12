# Contrato — Prazos por setor e vencimento gravado (Etapa A)

Cada setor configura, em **Cadastros → Prazos**, as horas de atendimento de
cada prioridade. O vencimento do chamado passa a ser **gravado** em
`ticket.due_at` nos quatro atos que o definem (abrir, enviar, aceitar,
recusar) e nunca é recalculado depois. Enquanto o chamado aguarda aceite em
outro setor, não há SLA ("Aguardando aceite"); o atraso que ele acumulou antes
do envio continua contando para quem o tinha.

Decisões do usuário em 2026-11-12. Sem `docs/plans/`. ADR novo:
`docs/adr/024-department-due-hours-and-frozen-due-date.md` (substitui o 019).
Notas de revisão no ADR 016 (prazo no envio, aceite e recusa) e no ADR 023
(atraso do trecho anterior ao envio). Fuso: ADR 009. Diretor: ADR 011.
Prioridade fixa: ADR 020. Metas: ADR 022.

Fora do escopo (Etapa B, TMR): meta ou prazo de aceite de transferência por
setor. O desenho já deixa a espera medida (`ticket_transfer.created_at` →
`reviewed_at`) e fora do SLA; a Etapa B acrescenta colunas, não muda regra.

## Regras fixadas (não reabrir)

| Tema                          | Regra                                                                                                                                                                                                                                   |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Horas por setor               | Uma linha por setor em `department_due_hours`. Setor sem linha usa `DEFAULT_DEPARTMENT_DUE_HOURS` (Crítica 3, Alta 6, Média 12, Baixa 24). Horas corridas, inteiras, 1–999                                                              |
| Quem edita                    | Admin do **próprio** setor; Diretor (ADR 011) escolhe **qualquer** setor ativo e alocável. Membro não acessa a tela. "Não alocado" e setor inativo não editáveis (`canEditDepartmentDueHours`, mesma regra de `canEditDepartmentGoals`) |
| Vigência                      | Mudar as horas vale só para chamados **abertos ou aceitos depois**. Nenhum chamado existente muda                                                                                                                                       |
| Abertura                      | `due_at = created_at + horas(origem, prioridade)` (na abertura, setor atual = origem)                                                                                                                                                   |
| Envio para outro setor        | `ticket.due_at = null`. Na `ticket_transfer` nova: `from_due_at = ticket.due_at` (o que vigorava) e `from_assignee_id = ticket.assigned_to` (quem tinha, antes de o envio zerar)                                                        |
| Aceite                        | `due_at = reviewed_at + horas(destino, prioridade)`                                                                                                                                                                                     |
| Recusa                        | `due_at = from_due_at + (reviewed_at − transfer.created_at)`: o relógio da origem retoma de onde parou. **`from_due_at` nulo** (só dado inconsistente): recomeça, `due_at = reviewed_at + horas(origem, prioridade)`                    |
| Dentro do setor               | Atribuir, assumir, devolver à fila, iniciar, editar, resolver, encerrar: **não** mudam `due_at`                                                                                                                                         |
| Invariante                    | `due_at is null` ⇔ chamado com transferência pendente (`status = 'aguardando_aprovacao'`). Nulo fora disso é tratado como "sem prazo" (SLA neutro, `—`), fora de vencidos e de horas em atraso                                          |
| SLA pendente                  | `ticketSlaFor` devolve `awaiting_acceptance` para `aguardando_aprovacao`, texto `Aguardando aceite` (lista, detalhe)                                                                                                                    |
| Horas em atraso (ADR 023 rev) | O atraso anterior ao envio conta para o setor de origem e para quem tinha o chamado. Depois de uma recusa, a regra normal recomeça na volta. Seção "Horas em atraso do mês" abaixo                                                      |
| Linha do tempo                | A frase do aceite mostra o prazo novo: `… aceitou o chamado e começou a atendê-lo. Novo prazo: 12/11/2026 às 18:30.` (`ticket_history.to_due_at`). Aceites antigos (sem `to_due_at`) ficam sem o sufixo                                 |

## Schema — `db/schema.ts` (`df-architect`, pronto)

Migrations **geradas, não aplicadas** (o usuário aplica):

- `db/migrations/0025_department_due_hours.sql` (drizzle-kit, schema)
- `db/migrations/0026_backfill_ticket_due_at.sql` (custom, só dados)

### `department_due_hours` (nova)

| Coluna                                                      | Tipo                   | Regra                                                                                        |
| ----------------------------------------------------------- | ---------------------- | -------------------------------------------------------------------------------------------- |
| `id`                                                        | `integer` identity PK  | `pk()`                                                                                       |
| `department_id`                                             | `integer not null`     | FK `department.id` **on delete cascade**; índice único `department_due_hours_department_idx` |
| `critica_hours`, `alta_hours`, `media_hours`, `baixa_hours` | `smallint not null`    | `check between 1 and 999` (um por coluna, `department_due_hours_<prioridade>_range`)         |
| `updated_by`                                                | `integer` nulo         | FK `users.id` **on delete set null**; índice `department_due_hours_updated_by_idx`           |
| `created_at`, `updated_at`                                  | `timestamptz not null` | `timestamps`                                                                                 |

Relations: `departmentDueHoursRelations` (`department`, `updater`),
`departmentRelations.dueHours` (one), `userRelations.updatedDepartmentDueHours`.
Tipos `DepartmentDueHoursRow` / `NewDepartmentDueHoursRow`.

### Colunas novas

| Tabela            | Coluna             | Tipo                    | Uso                                                                                                      |
| ----------------- | ------------------ | ----------------------- | -------------------------------------------------------------------------------------------------------- |
| `ticket_transfer` | `from_due_at`      | `timestamptz` nulo      | prazo que vigorava no envio                                                                              |
| `ticket_transfer` | `from_assignee_id` | `integer` nulo          | FK `users.id` **on delete set null**, índice `transfer_from_assignee_idx`; relation `fromAssignee`       |
| `ticket_history`  | `to_due_at`        | `timestamptz` nulo      | prazo definido pelo ato: `criacao`, `transferencia_aprovada`, `transferencia_rejeitada`. Nulo nos demais |
| `ticket`          | `due_at`           | já existia, nunca usada | passa a ser gravada e lida. Índice novo `ticket_dept_due_idx (current_department_id, due_at)`            |

### Backfill (`0026_backfill_ticket_due_at.sql`)

Na ordem, idempotente (só toca linhas ainda nulas):

1. Transferência **pendente**: `from_due_at = created_at do chamado + padrão
(3/6/12/24 por prioridade)`, `from_assignee_id = null`.
2. Chamado **com** pendente: `due_at = null`.
3. Chamado **sem** pendente: `due_at = created_at + padrão`.

Transferências já decididas não são reescritas (`from_due_at` nulo). Não toca
`updated_at` nem `ticket_history`. Nenhum chamado muda de situação no deploy:
o padrão é a mesma tabela do ADR 019 e a pendência já mostrava o vencimento
antigo (passa a "Aguardando aceite").

## Tipos (`df-architect`, pronto)

### `app/_lib/types/department-due-hours.ts` (novo)

```ts
export interface DepartmentDueHours {
  criticaHours: number
  altaHours: number
  mediaHours: number
  baixaHours: number
}
export type DueHoursField = keyof DepartmentDueHours
export interface DepartmentDueHoursRecord extends DepartmentDueHours {
  departmentId: number
  updatedAt: Date
  updatedByName: string | null
}
export interface DueHoursFieldCopy {
  label: string
  description: string
  unit: string
}
export interface DeclinedDueFacts {
  fromDueAt: Date | null
  sentAt: Date
  returnedAt: Date
  priority: TicketPriority
  returnDepartmentHours: DepartmentDueHours | null
}
export interface DepartmentDueHoursView {
  hours: DepartmentDueHours
  isDefault: boolean
  lastChange: string | null
}
```

### `app/_lib/types/ticket-due.ts` (alterado)

- `TicketSlaFacts` agora é `{ status, dueAt: Date | null, resolvedAt }`.
  **Sai** `createdAt` e `priority`; **sai** `TicketDueFacts`.
- `TicketPausedSlaStatus = "awaiting_acceptance" | "neutral"`;
  `TicketPausedSla { status }` substitui `TicketNeutralSla` (sem `dueAt`).
- `TicketStoppedSlaDetail.status`: `TicketSettledSlaStatus | TicketPausedSlaStatus`.

### Outros tipos alterados

| Arquivo                              | Mudança                                                                                                                                                    |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/_lib/types/department-queue.ts` | `DepartmentQueueListItem.dueAt: Date \| null`                                                                                                              |
| `app/_lib/types/my-tickets.ts`       | `MyTicketListItem.dueAt: Date \| null`                                                                                                                     |
| `app/_lib/types/ticket.ts`           | `TicketDetail.dueAt: Date \| null`; `TicketHistoryEntry.toDueAt: Date \| null`                                                                             |
| `app/_lib/types/registry.ts`         | `RegistrySection` ganha `"due-hours"`; novos `RegistryTargetDepartment` (`DepartmentAvailability & { id }`) e `ChangeStamp` (`updatedAt`, `updatedByName`) |

`DashboardOverdueTicket.dueAt: Date` não muda (só lista vencidos, nunca nulo).

## Validação — `app/_lib/validation/department-due-hours.ts` (novo)

| Export                         | Semântica                                                                                                             |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `departmentDueHoursSchema`     | `{ criticaHours, altaHours, mediaHours, baixaHours }`, cada um `z.int().min(1).max(999)`                              |
| `DepartmentDueHoursInput`      | `z.infer`                                                                                                             |
| `saveDepartmentDueHoursSchema` | `departmentDueHoursSchema.extend({ departmentId: departmentIdSchema })`                                               |
| `SaveDepartmentDueHoursInput`  | `z.infer`                                                                                                             |
| `dueHoursSearchParamsSchema`   | `{ setor: idSearchParamSchema("Setor inválido.").optional().catch(undefined) }` — inválido vira `undefined`, sem erro |

Mensagens: vazio, `NaN`, fracionário ou abaixo de 1 →
`Informe o prazo da prioridade Crítica, em horas inteiras, de 1 a 999.` (com o
rótulo da prioridade do campo); acima de 999 → `O prazo máximo é de 999 horas.`

Formulário: mesmo padrão de `departmentGoalsSchema` (contrato `operations.md`,
"Input numérico"): campo guarda `number`; `onChange` converte
`value === "" ? undefined : valueAsNumber`; `zodResolver` e
`FormSchemaProvider` recebem `departmentDueHoursSchema`; `departmentId` não é
campo, é juntado na chamada da action. `defaultValues` =
`dueHoursViewFor(record).hours` (padrão do sistema quando não há linha).

## Domínio (`df-architect`, pronto)

### `app/_lib/domain/department-due-hours.ts` (novo)

| Export                                                                                          | Semântica                                                                                                                                                                                  |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `DUE_HOURS_MIN` / `DUE_HOURS_MAX`                                                               | `1` / `999`                                                                                                                                                                                |
| `DEFAULT_DEPARTMENT_DUE_HOURS`                                                                  | `{ criticaHours: 3, altaHours: 6, mediaHours: 12, baixaHours: 24 }` (substitui `TICKET_PRIORITY_DUE_HOURS`)                                                                                |
| `DUE_HOURS_FIELD_BY_PRIORITY`                                                                   | `critica → criticaHours` etc.                                                                                                                                                              |
| `DUE_HOURS_PRIORITIES` / `DUE_HOURS_FIELDS`                                                     | ordem de exibição: Crítica, Alta, Média, Baixa                                                                                                                                             |
| `dueHoursFor(hours \| null, priority): number`                                                  | horas da prioridade; `null` → padrão                                                                                                                                                       |
| `departmentDueAtFrom(start, hours \| null, priority): Date`                                     | `start + dueHoursFor × HOUR_MS`. **Usada na abertura** (`start = created_at`) **e no aceite** (`start = reviewed_at`)                                                                      |
| `declinedDueAtFor(facts: DeclinedDueFacts): Date`                                               | recusa: `fromDueAt + max(returnedAt − sentAt, 0)`; `fromDueAt` nulo → `departmentDueAtFrom(returnedAt, returnDepartmentHours, priority)`                                                   |
| `canEditDepartmentDueHours(access, target)`                                                     | `canManageDepartmentSettings` (`app/_lib/domain/department.ts`): alvo ativo e alocável; Diretor qualquer; admin só o próprio                                                               |
| `dueHoursDepartmentOptions(access, options)`                                                    | Diretor: `assignableDepartments(options)`; demais: `[]`                                                                                                                                    |
| `dueHoursDepartmentIdFor(access, requested, options)`                                           | setor exibido: Diretor com `requested` presente nas opções → `requested`; qualquer outro caso → `access.departmentId`; `access.kind === "none"` → `null`                                   |
| `dueHoursHref(access, departmentId)`                                                            | `/registry/due-hours` (setor da sessão ou não Diretor) ou `/registry/due-hours?setor=<id>`                                                                                                 |
| `dueHoursViewFor(record \| null)`                                                               | `{ hours, isDefault, lastChange }`. Sem linha: padrão, `isDefault: true`, `lastChange: null`. Com linha: `lastChange = lastChangeLabel(record)`                                            |
| `DUE_HOURS_DEPARTMENT_PARAM` / `DUE_HOURS_DEPARTMENT_FILTER_LABEL`                              | `setor` / `Setor`                                                                                                                                                                          |
| `DUE_HOURS_PAGE_TITLE`                                                                          | `Prazos`                                                                                                                                                                                   |
| `DUE_HOURS_ADMIN_DESCRIPTION`                                                                   | `Defina o prazo de atendimento, em horas corridas, de cada prioridade dos chamados do seu setor.`                                                                                          |
| `DUE_HOURS_DIRECTOR_DESCRIPTION`                                                                | `Defina o prazo de atendimento, em horas corridas, de cada prioridade dos chamados de qualquer setor.`                                                                                     |
| `DUE_HOURS_APPLIES_FROM_NOW_HINT`                                                               | `Os prazos valem para chamados abertos ou aceitos a partir de agora. Chamados em andamento mantêm o prazo que já têm.`                                                                     |
| `DUE_HOURS_DEFAULT_BADGE`                                                                       | `Padrão do sistema`                                                                                                                                                                        |
| `DUE_HOURS_DEFAULT_DESCRIPTION`                                                                 | `Este setor ainda usa o padrão do sistema: Crítica 3h, Alta 6h, Média 12h, Baixa 24h. Salve para definir prazos próprios.`                                                                 |
| `DUE_HOURS_FIELD_COPY`                                                                          | por campo: `label` = rótulo da prioridade (`Crítica`…), `description` = `Horas corridas, a partir da abertura ou do aceite, para resolver um chamado de prioridade Crítica.`, `unit` = `h` |
| `SAVE_DUE_HOURS_LABEL` / `SAVE_DUE_HOURS_PENDING_LABEL` / `DUE_HOURS_SAVED_MESSAGE`             | `Salvar prazos` / `Salvando…` / `Prazos salvos.`                                                                                                                                           |
| `DUE_HOURS_FORBIDDEN_MESSAGE` / `DUE_HOURS_NOT_FOUND_MESSAGE` / `DUE_HOURS_SAVE_FAILED_MESSAGE` | `Você não tem permissão para editar os prazos deste setor.` / `Setor não encontrado.` / `Não foi possível salvar os prazos agora. Tente novamente.`                                        |

### `app/_lib/domain/ticket-due.ts` (alterado)

- **Removidos**: `TICKET_PRIORITY_DUE_HOURS`, `ticketDueWindowMs`,
  `ticketDueAt`, `isTicketOverdue`.
- `ticketSlaFor(facts, now)`, na ordem:
  1. `status = 'aguardando_aprovacao'` → `{ status: "awaiting_acceptance" }`
  2. `dueAt === null` → `{ status: "neutral" }`
  3. status ativo → `overdue` se `dueAt < now`, senão `on_time` (com `dueAt`)
  4. `resolvedAt === null` (cancelado) → `neutral`
  5. senão `missed` se `dueAt < resolvedAt`, senão `met`
- `TICKET_SLA_PAUSED_LABELS`: `awaiting_acceptance: "Aguardando aceite"`,
  `neutral: "—"`. `describeTicketSla`, `describeTicketSlaCell` e
  `describeTicketSlaDetail` tratam os dois (célula: `label: null`, valor o
  texto; detalhe: rótulo `SLA`, valor o texto, sem `dueAt`).

### Outros

| Arquivo                             | Mudança                                                                                                                                                                                                  |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/_lib/domain/registry.ts`       | `DUE_HOURS_REGISTRY_PATH = "/registry/due-hours"`; item `{ section: "due-hours", label: "Prazos" }` no fim do submenu: Diretor `Pessoas, Setores, Tags, Empresas, Prazos`; admin `Pessoas, Tags, Prazos` |
| `app/_lib/domain/department.ts`     | `canManageDepartmentSettings(access, target)` (regra comum a metas e prazos). `canEditDepartmentGoals` passa a delegar a ela, sem mudar comportamento                                                    |
| `app/_lib/domain/labels.ts`         | `lastChangeLabel(stamp)` (`Última alteração por Ana em 10/11/2026 às 14:32.`). `goalsLastChangeLabel` delega a ela                                                                                       |
| `app/_lib/domain/ticket-history.ts` | `describeNewDueAt(dueAt)` → `" Novo prazo: 12/11/2026 às 18:30."` ou `""`; usado na frase de `transferencia_aprovada`                                                                                    |

**Ícones do submenu Cadastros:** sem campo novo. `RegistryNavItem.section` já é
a chave única de cada item; o `df-ui` mapeia `RegistrySection → ícone` com
`satisfies Record<RegistrySection, LucideIcon>` (Prazos = relógio). O domínio
não conhece `lucide-react`.

## Horas em atraso do mês (revisão do ADR 023)

Mês `[ms, now)` = `monthToDateRange(now)`. Para o setor **S** (time) ou a
pessoa **P** do setor S. `overdueMs = regular + envios`.

**Postgres:** `greatest` ignora `NULL`. Por isso `due_at is not null` /
`from_due_at is not null` são condições explícitas, nunca deixadas para o
`greatest`.

### Parte regular (chamados em posse agora, recorte de hoje)

Recorte igual ao atual: time = `t.current_department_id = S`; pessoa =
mesmo e `t.assigned_to = P`.

```sql
<returnedAt>      = (select max(r.reviewed_at) from ticket_transfer r
                     where r.ticket_id = t.id and r.status = 'rejeitado'
                       and r.from_due_at is not null)
<overdueStart>    = greatest(t.due_at, $ms::timestamptz, <returnedAt>)
<overdueEnd>      = case when t.status in (<DASHBOARD_RESOLVED_STATUSES>)
                      then t.resolved_at else $now::timestamptz end
<overdueEligible> = t.due_at is not null
                    and ((<resolvedInMonth>) or t.status in (<OVERDUE_TICKET_STATUSES>))
regular = coalesce(sum(extract(epoch from (<overdueEnd> - <overdueStart>)) * 1000)
            filter (where <overdueEligible> and <overdueEnd> > <overdueStart>), 0)
```

`<returnedAt>` corta a parte anterior à última volta por recusa: aquele
trecho já é contado pelos envios (abaixo), e o `due_at` retomado, deslocado
pela espera, não pode contá-lo de novo. Só transferências com `from_due_at`
não nulo (regime novo): as recusas antigas não cortam nada, e o chamado conta
como contava antes do deploy.

### Parte dos envios (trecho anterior a cada envio)

```sql
from ticket_transfer tr
where tr.from_department_id = S
  [and tr.from_assignee_id = P]          -- só no individual
  and tr.from_due_at is not null
  and tr.created_at > $ms                -- trecho termina no envio
<prevReturnedAt> = (select max(r.reviewed_at) from ticket_transfer r
                    where r.ticket_id = tr.ticket_id and r.id <> tr.id
                      and r.status = 'rejeitado' and r.from_due_at is not null
                      and r.reviewed_at <= tr.created_at)
<sendStart>      = greatest(tr.from_due_at, $ms::timestamptz, <prevReturnedAt>)
<sendEnd>        = least(tr.created_at, $now::timestamptz)
envios = coalesce(sum(extract(epoch from (<sendEnd> - <sendStart>)) * 1000)
           filter (where <sendEnd> > <sendStart>), 0)
```

Qualquer status da transferência conta (`pendente`, `aprovado`, `rejeitado`):
o atraso aconteceu antes do envio, decida-se como se decidir.

### Por que não há dupla contagem

Cada instante de atraso pertence a um único intervalo de posse:

| Situação                                 | Quem conta                                                                                              |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Em S, nunca enviado                      | S, regular                                                                                              |
| S → T pendente                           | S pelo envio até `created_at`; T nada (`due_at` nulo, status fora de `OVERDUE_TICKET_STATUSES`)         |
| S → T aceito                             | S pelo envio; T regular a partir do prazo novo (`≥ reviewed_at`, então nunca antes de receber)          |
| S → T recusado, de volta a S             | S pelo envio (trecho antes) **e** regular a partir de `max(due_at retomado, volta)`; a espera não conta |
| S → T recusado, depois S → U             | S pelo 1º envio; S pelo 2º envio a partir de `max(due retomado, 1ª volta)`; U regular                   |
| A → B aceito → C                         | A pelo 1º envio; B pelo 2º envio (`from_due_at` = prazo do aceite em B); C regular                      |
| Troca de responsável dentro do setor     | regra antiga: o atraso regular do mês vai com o chamado para o novo responsável (ADR 023, sem mudança)  |
| Envio antigo (antes do deploy), decidido | `from_due_at` nulo: não conta como envio; o setor atual conta pela regra regular, como antes            |
| Pendente antigo (backfill)               | `from_due_at` preenchido, `from_assignee_id` nulo: conta para o **time** de S, para nenhuma pessoa      |

Exemplo (venc. 10/11 08:00, enviado 10/11 12:00, recusado 10/11 15:00, hoje
10/11 18:00): `due_at` retomado = 08:00 + 3h = 11:00. Envio: 08:00→12:00 = 4h.
Regular: `max(11:00, 15:00)`→18:00 = 3h. Total 7h (não 4h + 7h).

### SLA no prazo e vencidos

- `slaMetCount`: `t.resolved_at <= t.due_at` (substitui `ticketDueAtSql`).
- Vencido (Início, card Backlog e "Maiores atrasos"): `t.due_at < $now`
  (nulo nunca é vencido); ordenar por `t.due_at asc, t.created_at asc, t.id asc`.

## `df-data` — o que criar e alterar

### `app/_lib/data/department-due-hours.ts` (novo)

```ts
export async function findDepartmentDueHours(
  departmentId: number,
): Promise<DepartmentDueHoursRecord | null>
export async function upsertDepartmentDueHours(
  departmentId: number,
  hours: DepartmentDueHours,
  actorId: number,
): Promise<void>
export async function findDepartmentDueHoursIn(
  tx: Transaction,
  departmentId: number,
): Promise<DepartmentDueHours | null>
```

- `findDepartmentDueHours`: `left join users on updated_by`, como
  `findDepartmentGoals`.
- `upsertDepartmentDueHours`: `insert … on conflict (department_id) do update`
  as quatro horas, `updated_by`, `updated_at = now()`. Nunca apaga.
- `findDepartmentDueHoursIn`: leitura dentro da transação do ato (sem lock: o
  salvamento concorrente vale "a partir de agora" de qualquer forma). `null`
  sem linha; o domínio aplica o padrão.

### `app/_lib/data/tickets.ts` — os quatro caminhos de escrita

| Função                  | Mudança                                                                                                                                                                                                                                                                                                                                       |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `insertTicket`          | `createdAt = new Date()` explícito (hoje vem do `defaultNow`); `dueAt = departmentDueAtFrom(createdAt, await findDepartmentDueHoursIn(tx, originDepartmentId), priority)` (`priority` já resolvida pela tag). Gravar `createdAt` e `dueAt` no insert; histórico `criacao` com `changedAt = createdAt` e `toDueAt = dueAt`                     |
| `requestTicketTransfer` | ler também `ticket.dueAt` no `for update`. `update ticket set due_at = null` junto com o que já muda. Insert da transferência com `fromDueAt = ticketRow.dueAt`, `fromAssigneeId = ticketRow.assignedTo`. Histórico `transferencia_solicitada` sem `toDueAt`                                                                                  |
| `approveTicketTransfer` | ler `ticket.priority`. `dueAt = departmentDueAtFrom(changedAt, await findDepartmentDueHoursIn(tx, pendingTransfer.toDepartmentId), priority)`; gravar no `update ticket` e em `transferencia_aprovada.toDueAt`                                                                                                                                |
| `rejectTicketTransfer`  | ler `ticket.priority` e, na pendente, `fromDueAt` e `createdAt`. `dueAt = declinedDueAtFor({ fromDueAt, sentAt: pendingTransfer.createdAt, returnedAt: changedAt, priority, returnDepartmentHours: await findDepartmentDueHoursIn(tx, pendingTransfer.fromDepartmentId) })`; gravar no `update ticket` e em `transferencia_rejeitada.toDueAt` |
| `findTicketDetail`      | selecionar `dueAt: ticket.dueAt` e, no histórico, `toDueAt: ticketHistory.toDueAt`                                                                                                                                                                                                                                                            |

Nenhuma outra função de `tickets.ts` grava `due_at` (`updateTicketByAssignee`,
`updateTicketResolution`, `assignTicket`, `startTicketWork`,
`closeExpiredResolvedTickets` ficam como estão).

### Leituras

| Arquivo                             | Mudança                                                                                                                                                                                                                                                                                                                   |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/_lib/data/ticket-due.ts`       | **apagar** (`ticketDueAtSql` deixa de existir; a expressão é a coluna `ticket.dueAt`)                                                                                                                                                                                                                                     |
| `app/_lib/data/dashboard.ts`        | `ticketDueAtSql` → `ticket.dueAt` em `overdueBacklogCount`, `mineOverdueBacklogCount` e `listOverdueTickets` (`where`, `orderBy`); `listOverdueTickets` seleciona `dueAt` e devolve a coluna (sai `ticketDueAt`). Nulo nunca passa em `< now`; se o TS reclamar do tipo na saída, `isNotNull(ticket.dueAt)` no `where`    |
| `app/_lib/data/department-goals.ts` | `slaMetCount` com `ticket.dueAt`; `monthOverdueMsSql` conforme "Parte regular"; **somar** "Parte dos envios" em `findPersonGoalFacts` (S e P), em `findTeamGoalFacts` (time: S; membros: agrupado por `from_assignee_id`, somado ao `overdueMs` de cada membro com `coalesce(…, 0)`). Assinaturas e nomes de campo iguais |
| `app/_lib/data/department-queue.ts` | selecionar `dueAt: ticket.dueAt`                                                                                                                                                                                                                                                                                          |
| `app/_lib/data/my-tickets.ts`       | selecionar `dueAt: ticket.dueAt`                                                                                                                                                                                                                                                                                          |
| `db/seed.ts`                        | ticket do QA (linha ~330): `dueAt = departmentDueAtFrom(createdAt, null, "media")`; `criacao` com `toDueAt` igual                                                                                                                                                                                                         |

## `df-actions` — `app/_lib/actions/department-due-hours.ts` (novo)

```ts
export type DepartmentDueHoursErrorCode =
  "INVALID_INPUT" | "FORBIDDEN" | "NOT_FOUND"
export interface DepartmentDueHoursActionSuccess {
  ok: true
  message: string
}
export interface DepartmentDueHoursActionFailure {
  ok: false
  message: string
  code?: DepartmentDueHoursErrorCode
}
export type DepartmentDueHoursActionResult =
  DepartmentDueHoursActionSuccess | DepartmentDueHoursActionFailure

export const saveDepartmentDueHours: (
  input: SaveDepartmentDueHoursInput,
) => Promise<DepartmentDueHoursActionResult>
```

Ordem idêntica a `saveDepartmentGoals`:

1. sessão + `getRegistryAccess()` fresco; `none` → `FORBIDDEN`.
2. `saveDepartmentDueHoursSchema.safeParse`; falha → `INVALID_INPUT` com a
   primeira mensagem.
3. Admin com `departmentId !== access.departmentId` → `FORBIDDEN` antes de ler
   o setor.
4. `findDepartmentOption(departmentId)`; `null` → `NOT_FOUND`
   (`DUE_HOURS_NOT_FOUND_MESSAGE`).
5. `!canEditDepartmentDueHours(access, target)` → `FORBIDDEN`
   (`DUE_HOURS_FORBIDDEN_MESSAGE`; cobre inativo e Não alocado).
6. `upsertDepartmentDueHours(departmentId, hours, actor.id)`; erro →
   `console.error("[saveDepartmentDueHours]", error)` e falha sem código
   (`DUE_HOURS_SAVE_FAILED_MESSAGE`).
7. `revalidatePath(DUE_HOURS_REGISTRY_PATH)`; sucesso com
   `DUE_HOURS_SAVED_MESSAGE`.

Sem e-mail, sem histórico de chamado. As actions de envio, aceite e recusa
**não mudam** (o prazo é gravado dentro das funções de dados).

## `df-auth` e `df-email`

Nada. A guarda é `requireRegistryAccess()` do layout de `/registry`.

## `df-ui` — o que montar

### Correções de compilação (obrigatórias)

- `app/(app)/_components/ticket-list-row.ts`: `TicketSlaListRow` precisa
  declarar `priority: TicketPriority` (antes vinha de `TicketSlaFacts`, que
  não tem mais `priority`; `createTicketPriorityColumn` lê `row.priority`).
- Nenhum componente pode ler `sla.dueAt` fora de `isTicketSlaRunning` (o
  neutro não tem mais `dueAt`); os atuais já respeitam.

### Navegação

Submenu Cadastros passa a ter ícone por item, mapeado por `section`
(`people`, `departments`, `tags`, `companies`, `due-hours`; Prazos = relógio,
p. ex. `ClockIcon`). Item "Prazos" vem de `registryNavItemsFor`.

### Rota `app/(app)/registry/due-hours/page.tsx`

- `requireRegistryAccess()`; `listDepartmentOptions()` só para Diretor;
  `options = dueHoursDepartmentOptions(access, all)`;
  `departmentId = dueHoursDepartmentIdFor(access, params.setor ?? null, options)`
  (`dueHoursSearchParamsSchema`); `findDepartmentOption(departmentId)` para o
  nome e o `canEditDepartmentDueHours`; `findDepartmentDueHours(departmentId)`
  → `dueHoursViewFor(record)`.
- Título `DUE_HOURS_PAGE_TITLE`; descrição `DUE_HOURS_DIRECTOR_DESCRIPTION` ou
  `DUE_HOURS_ADMIN_DESCRIPTION`. `metadata.title = "Prazos"`.
- Diretor: seletor de setor (`DUE_HOURS_DEPARTMENT_FILTER_LABEL`) que navega
  para `dueHoursHref(access, id)`.
- Formulário (React Hook Form + `departmentDueHoursSchema`), quatro campos
  na ordem `DUE_HOURS_FIELDS`, textos de `DUE_HOURS_FIELD_COPY`, sufixo `h`.
  Aviso `DUE_HOURS_APPLIES_FROM_NOW_HINT` visível sempre. Sem linha: selo
  `DUE_HOURS_DEFAULT_BADGE` e `DUE_HOURS_DEFAULT_DESCRIPTION`; com linha:
  `view.lastChange`. Botão `SAVE_DUE_HOURS_LABEL` / `…_PENDING_LABEL`, toast
  com a mensagem da action. `canEditDepartmentDueHours` falso → formulário
  só leitura (não acontece pelo seletor, que só oferece alocáveis).

### Telas que passam a ler `dueAt`

Fila, Meus chamados e detalhe já chamam `ticketSlaFor(row/ticket, now)`; com
`dueAt` no tipo, passam a ler a coluna sem mudança de código. Pendente mostra
`Aguardando aceite`. Linha do tempo: a frase do aceite já inclui o prazo
(domínio).

## Cenários para o `df-qa`

| #    | Cenário                                                                                                                    | Esperado                                                                                                                                                     |
| ---- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DH1  | Admin abre Cadastros                                                                                                       | Submenu `Pessoas, Tags, Prazos`, com ícones; Diretor vê os cinco                                                                                             |
| DH2  | Membro acessa `/registry/due-hours` direto                                                                                 | Barrado como nas outras telas de Cadastros                                                                                                                   |
| DH3  | Admin abre Prazos de setor sem configuração                                                                                | Campos 3/6/12/24, selo `Padrão do sistema`, sem seletor de setor; `?setor=<outro>` é ignorado                                                                |
| DH4  | Admin salva 2/4/8/16                                                                                                       | Toast `Prazos salvos.`; `Última alteração por <nome> em …`; linha em `department_due_hours`                                                                  |
| DH5  | Campo vazio, `0`, `1.5`, `1000`                                                                                            | Mensagens `Informe o prazo da prioridade …` / `O prazo máximo é de 999 horas.`; nada salvo                                                                   |
| DH6  | Diretor escolhe outro setor no seletor e salva                                                                             | URL `?setor=<id>`; linha do setor escolhido; Não alocado e inativos fora do seletor                                                                          |
| DH7  | Action chamada por admin com `departmentId` de outro setor                                                                 | `FORBIDDEN`, nada gravado                                                                                                                                    |
| DH8  | Abrir chamado Crítica em setor com 2h                                                                                      | `due_at = created_at + 2h`; `criacao.to_due_at` igual; Fila mostra `Expira em` coerente                                                                      |
| DH9  | Mudar prazos do setor depois de DH8                                                                                        | `due_at` do chamado de DH8 **não** muda                                                                                                                      |
| DH10 | Enviar chamado para outro setor                                                                                            | `ticket.due_at` nulo; `ticket_transfer.from_due_at` = prazo anterior, `from_assignee_id` = quem tinha; SLA `Aguardando aceite` no detalhe e em Meus chamados |
| DH11 | Aceitar no destino (destino com Alta 4h)                                                                                   | `due_at = reviewed_at + 4h`; frase do aceite com `Novo prazo: … às …`                                                                                        |
| DH12 | Recusar no destino 3h depois do envio                                                                                      | Chamado `Recusado` na origem; `due_at = from_due_at + 3h`; frase de recusa sem mudança                                                                       |
| DH13 | Atribuir, assumir, iniciar, editar, resolver                                                                               | `due_at` não muda                                                                                                                                            |
| DH14 | Chamado vencido há 4h enviado; consultar Operação do setor de origem e da pessoa que o tinha                               | As 4h (dentro do mês) continuam em Horas em atraso do time e da pessoa                                                                                       |
| DH15 | Exemplo da seção (venc. 08:00, envio 12:00, recusa 15:00, agora 18:00)                                                     | Origem conta 7h, não 11h                                                                                                                                     |
| DH16 | Mesmo chamado aceito no destino e vencendo lá                                                                              | Destino conta só a partir do prazo novo; origem mantém o trecho anterior                                                                                     |
| DH17 | Início: card Backlog e "Maiores atrasos"                                                                                   | Contam/listam por `due_at`; pendente não aparece; ordem por vencimento                                                                                       |
| DH18 | Chamado resolvido antes do prazo gravado / depois                                                                          | `No prazo` / `Fora do prazo`; SLA no prazo da Operação coerente                                                                                              |
| DH19 | Pós-migration: conferir que nenhum chamado sem pendência ficou com `due_at` nulo e nenhum pendente com `due_at` preenchido | Consultas abaixo devolvem 0                                                                                                                                  |

### Consultas de conferência (`postgres`, só leitura)

```sql
select count(*) from ticket t
where t.due_at is null and t.status <> 'aguardando_aprovacao';

select count(*) from ticket t
where t.due_at is not null and t.status = 'aguardando_aprovacao';

select count(*) from ticket_transfer
where status = 'pendente' and from_due_at is null;

select t.id, t.priority, t.created_at, t.due_at,
       h.to_due_at as history_due_at
from ticket t
join ticket_history h on h.ticket_id = t.id and h.event = 'criacao'
order by t.id desc limit 5;
```

## Riscos

- Esquecer um caminho de escrita deixa o chamado sem SLA (`—`). DH8, DH10,
  DH11, DH12 e DH19 cobrem os quatro.
- A subconsulta `<returnedAt>` roda por chamado do recorte; usa
  `transfer_ticket_idx (ticket_id, created_at)`. Volume atual pequeno.
- Pendentes antigos não têm `from_assignee_id`: seu atraso anterior vai só
  para o time de origem (decisão do usuário).

## Checklist

### Onda 0 — `df-architect` (pronto)

- [x] `db/schema.ts`: `department_due_hours`, `ticket_transfer.from_due_at` /
      `from_assignee_id`, `ticket_history.to_due_at`, índices
- [x] `0025_department_due_hours.sql` (gerada) e `0026_backfill_ticket_due_at.sql`
      (custom), não aplicadas
- [x] tipos, validação, domínio (`department-due-hours`, `ticket-due`,
      `registry`, `department`, `labels`, `ticket-history`)
- [x] ADR 024; notas no 016, 019 (substituído) e 023

### Onda 1 — `df-data`

- [ ] `app/_lib/data/department-due-hours.ts`
- [ ] `insertTicket`, `requestTicketTransfer`, `approveTicketTransfer`,
      `rejectTicketTransfer`, `findTicketDetail`
- [ ] `dashboard.ts`, `department-goals.ts`, `department-queue.ts`,
      `my-tickets.ts`; apagar `ticket-due.ts`; `db/seed.ts`

### Onda 1 — `df-ui` (layout)

- [ ] `TicketSlaListRow.priority`; ícones no submenu Cadastros

### Onda 2 — `df-actions`

- [ ] `app/_lib/actions/department-due-hours.ts`

### Onda 2 — `df-ui` (tela)

- [ ] `app/(app)/registry/due-hours/page.tsx` e formulário

### Onda 3/4

- [ ] `df-reviewer`: lint, tsc, build, camadas
- [ ] `df-qa`: DH1–DH19 (aplicar 0025 e 0026 antes)
