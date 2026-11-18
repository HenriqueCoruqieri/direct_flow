# Contrato — Operação: objetivo individual dividido

Nos indicadores que são **soma** (horas acumuladas em atraso e quantidade de
chamados em atraso), o objetivo de cada pessoa passa a ser o limite do time
dividido pelo número de pessoas do setor. A **Quantidade de chamados em
atraso** passa a existir também na aba **Individual** e entra no "N de M
cumpriram".

Decisões do usuário em 2026-11-18. ADR: `docs/adr/027-individual-goal-split-of-summed-indicators.md`.
Contratos base, que continuam valendo fora do que está aqui:
`docs/contracts/operations.md` e `docs/contracts/operations-tmr-overdue.md`
(este prevalece sobre os dois onde divergir). Fuso: ADR 009. Nomenclatura:
"objetivo", nunca "meta".

Sem schema, sem migration, sem Zod novo, sem action nova.

## Regras fixadas (não reabrir)

| Tema                    | Regra                                                                                                                                                                                                      |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Indicadores individuais | `sla`, `tma`, `overdue`, `overdueTickets`, nesta ordem (`PERSON_GOAL_INDICATORS`). `tmr` continua só equipe (`TEAM_ONLY_GOAL_INDICATORS = ["tmr"]`)                                                        |
| SLA e TMA               | alvo individual = alvo do time (`PERSON_GOAL_TARGET_RULES`: `"same"`)                                                                                                                                      |
| Horas em atraso         | alvo individual = `floor(overdueHoursLimit × 60 ÷ pessoas)` **minutos**, em ms (`× MINUTE_MS`). 25h ÷ 3 = 500 min → `8h 20min`; 25h ÷ 7 = 214 min → `3h 34min`; 1h ÷ 7 = 8 min → `8min`; 0h → `0h`         |
| Chamados em atraso      | alvo individual = `floor(overdueTicketsLimit ÷ pessoas)`. 16 ÷ 3 = 5; 2 ÷ 5 = **0**, e 0 é limite válido (aderente só com 0 chamados)                                                                      |
| Comparação              | igual à do time: `valor <= alvo`, horas em ms, chamados em inteiro. O alvo de horas é múltiplo de minuto, então o rótulo mostra o número comparado                                                         |
| Pessoas (divisor)       | `users.department_id = setor and users.is_active`, **qualquer papel** (admin incluído; na Diretoria, o Diretor incluído). É o mesmo conjunto das linhas por membro de `findTeamGoalFacts` hoje             |
| Divisor < 1             | vira 1 (`goalDivisorFor`). Na prática não acontece no Individual: quem vê está ativo no próprio setor                                                                                                      |
| Limite do time nulo     | pessoa também `no_target` ("Sem objetivo", `Objetivo não definido`). As duas colunas hoje são `not null`; a regra é só defensiva                                                                           |
| Valor sem dado          | horas e chamados em atraso sempre têm valor (0 é valor), como no time                                                                                                                                      |
| "Cumpriu" (pessoa)      | nenhum `not_adherent` entre os **quatro** indicadores individuais, cada um contra o alvo derivado. `no_data` e `no_target` não reprovam                                                                    |
| "N de M"                | M = pessoas (mesmo conjunto do divisor); N = quantas cumpriram. A Individual de uma pessoa e a linha dela na Equipe dão o mesmo veredito                                                                   |
| Time                    | nada muda: os cinco cards da Equipe usam os números cadastrados, inteiros                                                                                                                                  |
| Formulário              | mesmos campos e mesmos números. `overdueTicketsLimit` muda de grupo (de "Objetivos da equipe" para "Objetivos de cada pessoa e do time"); as descrições dos dois limites dizem que o individual é dividido |

### Atribuição individual de "chamados em atraso"

Mesma união do time (ADR 025), restrita à pessoa P do setor S, **sem repetir
chamado para a mesma pessoa**. É o mesmo recorte das horas em atraso
individuais:

1. resolvido ou fechado (`DASHBOARD_RESOLVED_STATUSES`) com `resolved_at` no
   mês, `current_department_id = S`, `assigned_to = P`, `resolved_at > due_at`;
2. ativo (`OVERDUE_TICKET_STATUSES`), `current_department_id = S`,
   `assigned_to = P`, `due_at < now`;
3. enviado **por** S no mês já vencido, com `from_assignee_id = P`:
   `ticket_transfer.from_department_id = S`, `created_at` no mês,
   `from_due_at < created_at`, qualquer desfecho.

Não contam para ninguém: chamado sem responsável (itens 1 e 2 com
`assigned_to` nulo) e envio sem `from_assignee_id`. Contam só para o time.

Consequências aceitas (registrar no QA, não são defeito):

- A soma das horas e dos chamados individuais pode ficar **abaixo** do total do
  time (atraso de chamado na fila, sem responsável).
- O mesmo chamado pode contar para duas pessoas (A o enviou vencido; voltou por
  recusa e B o resolveu fora do prazo) e uma vez no time. Nesse caso a soma
  individual pode passar do time.
- A soma dos limites individuais é ≤ o limite do time (piso): 16 ÷ 3 → 5 × 3 = 15. A sobra não é distribuída.
- Ativar, desativar ou mudar alguém de setor muda o limite de todos na hora,
  para o mês inteiro.

## Tipos — `app/_lib/types/operations.ts` (`df-architect`, pronto)

```ts
export type PersonGoalIndicator = "sla" | "tma" | "overdue" | "overdueTickets"
export type TeamOnlyGoalIndicator = "tmr"

export type PersonGoalTargetRule = "same" | "split"

export type GoalTargets<TIndicator extends GoalIndicator> = Record<
  TIndicator,
  number | null
>

export interface PersonGoalFacts extends GoalResolutionFacts {
  overdueMs: number
  overdueTicketCount: number
}

export interface IndividualGoalFacts extends PersonGoalFacts {
  memberCount: number
}

export interface TeamGoalFacts extends PersonGoalFacts, TeamTmrFacts {
  members: TeamMemberGoalFacts[]
}
```

- `overdueTicketCount` subiu de `TeamGoalFacts` para `PersonGoalFacts`; o time
  continua tendo o campo (herdado), e agora cada `TeamMemberGoalFacts` também.
- `IndividualGoalFacts` é o retorno da aba Individual: os fatos da pessoa mais
  o divisor (`memberCount`).
- `PersonGoalResult.evaluations` passa a ter quatro chaves.

## Domínio — `app/_lib/domain/department-goals.ts` (`df-architect`, pronto)

| Export                                                   | Semântica                                                                                                                                                                                                                                                             |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PERSON_GOAL_INDICATORS`                                 | `["sla", "tma", "overdue", "overdueTickets"]` (em `goal-indicators.ts`, reexportado)                                                                                                                                                                                  |
| `TEAM_ONLY_GOAL_INDICATORS`                              | `["tmr"]`                                                                                                                                                                                                                                                             |
| `PERSON_GOAL_TARGET_RULES`                               | `sla`/`tma` → `"same"`; `overdue`/`overdueTickets` → `"split"`                                                                                                                                                                                                        |
| `goalDivisorFor(memberCount): number`                    | `max(floor(memberCount), 1)`                                                                                                                                                                                                                                          |
| `splitGoalTarget(indicator, teamTarget, memberCount)`    | `null` → `null`; duração → piso em minuto inteiro, em ms; contagem → piso inteiro; percentual → inalterado. Negativo vira 0                                                                                                                                           |
| `personGoalTargetFor(indicator, goals, memberCount)`     | alvo individual de um indicador, na unidade da avaliação                                                                                                                                                                                                              |
| `personGoalTargetsFor(goals, memberCount)`               | `GoalTargets<PersonGoalIndicator>`, os quatro alvos individuais                                                                                                                                                                                                       |
| `teamGoalTargetsFor(goals)`                              | `GoalTargets<GoalIndicator>`, os cinco alvos do time (= `goalTargetFor` de cada um)                                                                                                                                                                                   |
| `evaluateGoal(indicator, value, target)`                 | **muda**: recebe o alvo já na unidade da avaliação (`number \| null`), não mais `goals`. Mesmas regras (`null` → `no_target`; valor `null` → `no_data`)                                                                                                               |
| `evaluatePersonGoals(targets, facts)`                    | **muda**: recebe `GoalTargets<PersonGoalIndicator>`; quatro avaliações                                                                                                                                                                                                |
| `evaluateTeamGoals(goals, facts)`                        | inalterado na assinatura; cinco avaliações contra `teamGoalTargetsFor(goals)`                                                                                                                                                                                         |
| `overdueTicketCountFor(facts: PersonGoalFacts)`          | `max(overdueTicketCount, 0)` (aceita pessoa e time)                                                                                                                                                                                                                   |
| `isPersonGoalMet(targets, facts)`                        | **muda**: recebe os alvos derivados                                                                                                                                                                                                                                   |
| `personGoalResultFor(goals, facts: IndividualGoalFacts)` | **muda o tipo de `facts`**: deriva os alvos com `facts.memberCount`. Assinatura de chamada igual à de hoje                                                                                                                                                            |
| `goalMetCountFor(goals, members)`                        | deriva os alvos com `members.length` e conta quem cumpre os quatro                                                                                                                                                                                                    |
| `teamGoalResultFor(goals, facts)`                        | inalterado; `metCount` agora com os quatro indicadores individuais                                                                                                                                                                                                    |
| `PERSON_GOAL_MET_DESCRIPTION`                            | `Você atingiu o objetivo de todos os indicadores individuais: SLA, TMA, horas em atraso e chamados em atraso.`                                                                                                                                                        |
| `GOAL_MET_COUNT_RULE_DESCRIPTION`                        | `Ficará aderente ao objetivo caso atinja os indicadores de SLA, TMA, horas em atraso e chamados em atraso.`                                                                                                                                                           |
| `goalMetCountDescription(n, m)`                          | `2 de 3 pessoas cumpriram os quatro objetivos individuais (SLA, TMA, horas em atraso e chamados em atraso).`                                                                                                                                                          |
| `PERSON_AND_TEAM_GOAL_FIELDS`                            | `["slaMinPercent", "tmaMaxHours", "overdueHoursLimit", "overdueTicketsLimit"]`                                                                                                                                                                                        |
| `TEAM_ONLY_GOAL_FIELDS`                                  | `["tmrMaxHours"]`                                                                                                                                                                                                                                                     |
| `departmentGoalsDialogDescription(name)`                 | `<setor> · SLA e TMA são os mesmos para cada pessoa e para o time; os limites de atraso são do time e divididos entre as pessoas ativas do setor.`                                                                                                                    |
| `DEPARTMENT_GOALS_FIELD_COPY.overdueHoursLimit`          | descrição: `Soma máxima das horas em atraso do time no mês, incluindo chamados já resolvidos. O limite de cada pessoa é este valor dividido igualmente pelas pessoas ativas do setor.`                                                                                |
| `DEPARTMENT_GOALS_FIELD_COPY.overdueTicketsLimit`        | descrição: `Quantidade máxima de chamados em atraso do time no mês: resolvidos fora do prazo, abertos com o prazo vencido e enviados a outro setor já vencidos. O limite de cada pessoa é este valor dividido pelas pessoas ativas do setor, arredondado para baixo.` |

Rótulos, frases e gauges não mudaram de regra: como o alvo vem derivado, eles
saem certos sozinhos. Conferido com `tsx` (2026-11-18), objetivo 90% / 8h /
25h / 16 chamados / 2h, 3 pessoas, pessoa com 8h30min e 6 chamados em atraso:

- `overdue`: `Limite ≤ 8h 20min` · `8h 30min` · `10min acima do limite`
- `overdueTickets`: `Limite ≤ 5 chamados` · `6 chamados` · `1 chamado acima do limite`
- resumo: `Objetivo não atingido · não aderente em horas em atraso e chamados em atraso`
- descrição: `8h 30min em atraso no mês: 10min acima do limite de 8h 20min. 6 chamados em atraso no mês: 1 chamado acima do limite de 5 chamados.`
- limite 2 com 5 pessoas: `Limite ≤ 0 chamados`

### `app/_lib/domain/operations.ts`

`GOALS_UNDEFINED_EDITOR_DESCRIPTION`: `Defina os objetivos de SLA, TMA, horas
em atraso, quantidade de chamados em atraso e TMR. Os limites de atraso de cada
pessoa são os do time divididos pelas pessoas ativas do setor.`

## `df-data` — `app/_lib/data/department-goals.ts`

Hoje `npx tsc --noEmit` falha só nas três linhas abaixo, que dependem desta
entrega (`app/_lib/data/department-goals.ts:214`, `:308` e, por consequência,
`app/(app)/operations/_components/my-goal-section.tsx:28`).

| Função                                                  | Mudança                                                                                                                                                                                                                  |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `findPersonGoalFacts(departmentId, userId, month, now)` | retorno passa a `Promise<IndividualGoalFacts>`: os campos de hoje mais `overdueTicketCount` (regra "Atribuição individual" acima) e `memberCount` (contagem de `users` com `department_id = departmentId and is_active`) |
| `findTeamGoalFacts(departmentId, month, now)`           | assinatura igual; cada item de `members` ganha `overdueTicketCount` (mesma regra, por pessoa; 0 para quem não tem nenhum). `overdueTicketCount` do time não muda                                                         |

Orientação (o desenho é do `df-data`):

- O filtro das pessoas (`and(eq(user.departmentId, departmentId), eq(user.isActive, true))`)
  aparece hoje em `findTeamGoalFacts` e `findTeamProduction`; a contagem de
  `memberCount` precisa usar **o mesmo** filtro. Extrair um helper privado
  evita que as duas abas divirjam.
- A contagem por pessoa sai da mesma união de `overdueTicketCountQuery`,
  carregando a pessoa: itens 1 e 2 com `ticket.assigned_to` (não nulo) e item 3
  com `ticket_transfer.from_assignee_id` (não nulo), selecionando
  `(ticketId, userId)`. `union` (não `union all`) já tira a repetição por par;
  depois `count(*)` agrupado por `userId`, filtrado por `userId` no
  individual. A versão do time continua selecionando só `ticketId`.

## `df-ui` — `app/(app)/operations/_components/`

Nada de dado novo: `my-goal-section.tsx` continua chamando
`personGoalResultFor(goals, facts)` com o retorno de `findPersonGoalFacts`, e o
painel itera `PERSON_GOAL_INDICATORS`, que agora tem quatro itens. Ajustes:

| Arquivo                       | Mudança                                                                                                                                                                                     |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `my-goal-panel.tsx`           | quatro cards (ganha **Quantidade de chamados em atraso**). Grade hoje `md:grid-cols-3`: passar para uma que feche com 4 (sugestão `md:grid-cols-2 xl:grid-cols-4`)                          |
| `goal-panel-skeleton.tsx`     | o esqueleto da pessoa já renderiza 4 (itera a lista); a grade da pessoa acompanha a do painel                                                                                               |
| `department-goals-dialog.tsx` | nenhum código: os grupos vêm de `PERSON_AND_TEAM_GOAL_FIELDS` / `TEAM_ONLY_GOAL_FIELDS`. O campo de chamados em atraso aparece no primeiro grupo, e "Objetivos da equipe" fica só com o TMR |

Os cards individuais mostram o alvo derivado sem mudança no componente
(`goalTargetLabel`, `goalSupportLine`, `goalGaugeFor` leem `evaluation.target`).

Escala do gauge (ajuste de 2026-11-18): nos indicadores de limite com alvo, o
fim do arco é o próprio alvo individual, sem traço de meta, com as pontas
`piso` e `limite` (`gauge.minLabel` / `gauge.maxLabel`) e o arco cheio quando o
valor passa do limite. Logo abaixo de cada rótulo, centralizado na mesma ponta,
vem o valor formatado na unidade do indicador (`gauge.minDetail` /
`gauge.maxDetail`: só o número em contagem, `0` e `2`; em horas, `0h` e
`8h`); nas escalas
numéricas (SLA e indicador sem alvo) os dois são `null` e não há segunda linha. A divisão arredondada para baixo pode dar limite 0:
nesse caso o arco fica vazio com 0 chamados e cheio com qualquer chamado em
atraso, sem divisão por zero.

## `df-actions`, `df-email`, `df-auth`

Nada.

## Cenários de teste (`df-qa`)

Base: setor S com objetivo SLA 90 / TMA 8h / horas em atraso 25h / chamados
em atraso 16 / TMR 2h e **3** pessoas ativas (admin incluído), mês corrente.

| ID   | Cenário                                                                                               | Esperado                                                                                                                                                                                                                      |
| ---- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| IG1  | Aba Individual de um membro de S                                                                      | quatro cards, na ordem SLA, TMA, Horas acumuladas em atraso, Quantidade de chamados em atraso. Nenhum card de TMR                                                                                                             |
| IG2  | Mesma aba, rótulos de alvo                                                                            | `Objetivo ≥ 90%`, `Objetivo ≤ 8h`, `Limite ≤ 8h 20min`, `Limite ≤ 5 chamados`                                                                                                                                                 |
| IG3  | Aba Equipe de S                                                                                       | cinco cards com os números cadastrados: `Limite ≤ 25h`, `Limite ≤ 16 chamados` (sem divisão)                                                                                                                                  |
| IG4  | Desativar uma das 3 pessoas (Cadastros → Pessoas) e recarregar a Individual de outra                  | `Limite ≤ 12h 30min`, `Limite ≤ 8 chamados`; "N de M" na Equipe com M = 2                                                                                                                                                     |
| IG5  | Objetivo de chamados em atraso 2 com 5 pessoas ativas                                                 | Individual: `Limite ≤ 0 chamados`; pessoa sem atraso aderente (`No limite`); com 1 chamado em atraso, `Não aderente`, `1 chamado acima do limite`                                                                             |
| IG6  | Objetivo de horas em atraso 0                                                                         | Individual `Limite ≤ 0h`; qualquer atraso reprova                                                                                                                                                                             |
| IG7  | Pessoa com 9h de atraso no mês e 3 pessoas (alvo 8h20min)                                             | horas em atraso `Não aderente`, `40min acima do limite`; resumo cita `horas em atraso`; na Equipe ela não conta no N                                                                                                          |
| IG8  | Pessoa com 6 chamados em atraso, alvo 5, SLA/TMA/horas aderentes                                      | Individual `Objetivo não atingido · não aderente em chamados em atraso`; na Equipe ela não conta no N                                                                                                                         |
| IG9  | "N de M": para cada membro, comparar o veredito da aba Individual dele com a contagem da Equipe       | N = quantas pessoas têm `Objetivo atingido` na própria Individual; texto `… cumpriram os quatro objetivos individuais (SLA, TMA, horas em atraso e chamados em atraso).`                                                      |
| IG10 | Chamado de S vencido e **sem responsável** (na fila)                                                  | conta nas horas e nos chamados em atraso da Equipe; não aparece em nenhuma Individual (soma individual < time). Não é defeito                                                                                                 |
| IG11 | Chamado vencido enviado por P a outro setor no mês                                                    | conta 1 em chamados em atraso de P (Individual) e de S (Equipe), qualquer desfecho do envio                                                                                                                                   |
| IG12 | O chamado de IG11 volta por recusa, Q assume e resolve fora do prazo                                  | conta 1 para P, 1 para Q e 1 (uma vez só) para S                                                                                                                                                                              |
| IG13 | Chamado com dois envios vencidos de P no mês, ou envio vencido de P e depois resolvido atrasado por P | conta **1** para P (sem repetir chamado na mesma pessoa)                                                                                                                                                                      |
| IG14 | Diálogo "Editar objetivos"                                                                            | mesmos 5 campos; "Limite de chamados em atraso" no grupo "Objetivos de cada pessoa e do time"; "Objetivos da equipe" só com TMR; descrições dos dois limites mencionam a divisão; salvar continua gravando os números do time |
| IG15 | Diretor: Individual (Diretoria) e Equipe com `?setor=T`                                               | Individual dividida pelas pessoas ativas da Diretoria (Diretor incluído); Equipe de T sem divisão, "N de M" com as pessoas de T                                                                                               |
| IG16 | Layout da Individual com 4 cards em 375px, 768px e 1280px                                             | sem card órfão estranho nem overflow; esqueleto com a mesma grade                                                                                                                                                             |
| IG17 | Conferência numérica com o banco (`postgres` MCP, consultas abaixo)                                   | `memberCount`, chamados em atraso por pessoa e do time iguais aos da tela                                                                                                                                                     |

Consultas de conferência (`$dep` = id de S, `$user` = id da pessoa, `$start` =
1º do mês 00:00 em SP como `timestamptz`):

```sql
select count(*) from users where department_id = $dep and is_active;

select count(*) from (
  select t.id from ticket t
  where t.current_department_id = $dep and t.assigned_to = $user and t.due_at is not null
    and ((t.status in ('resolvido', 'fechado') and t.resolved_at >= $start
          and t.resolved_at > t.due_at)
      or (t.status in (<OVERDUE_TICKET_STATUSES>) and t.due_at < now()))
  union
  select tt.ticket_id from ticket_transfer tt
  where tt.from_department_id = $dep and tt.from_assignee_id = $user
    and tt.from_due_at is not null and tt.created_at >= $start
    and tt.from_due_at < tt.created_at
) x;
```

`<OVERDUE_TICKET_STATUSES>` são os valores de `app/_lib/domain/dashboard.ts`.
O limite individual de horas em minutos: `floor(overdue_hours_limit * 60 / n)`;
de chamados: `floor(overdue_tickets_limit / n)`.
