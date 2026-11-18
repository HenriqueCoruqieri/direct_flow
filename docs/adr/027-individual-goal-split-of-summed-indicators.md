# 027 — Objetivo individual dividido nos indicadores que somam

Contrato: `docs/contracts/operations-individual-goal-split.md`. Complementa os
ADRs 022, 023 e 025, que continuam valendo. Fuso: ADR 009.

## Contexto

A Operação avaliava a pessoa com o **mesmo número** do objetivo do setor (ADR
022: "sem meta individual diferente da do setor"). Para indicador que é
**soma** isso não fecha: com limite de 25h de atraso e 10 pessoas, cada uma
podia acumular 24h, todas "aderentes", e o time somar 240h contra um limite
de 25h. Em 2026-11-18 o usuário decidiu dividir o limite do time entre as
pessoas nos indicadores somados, e passar a avaliar também a quantidade de
chamados em atraso no individual.

## Decisão

O líder continua cadastrando **só os números do time** (`department_goal` não
muda). O objetivo de cada pessoa é **derivado** na leitura, por função pura
(`personGoalTargetsFor(goals, memberCount)`, `app/_lib/domain/department-goals.ts`):

| Indicador          | Pessoa                                       | Por quê                              |
| ------------------ | -------------------------------------------- | ------------------------------------ |
| SLA (`sla`)        | igual ao time                                | percentual não se divide             |
| TMA (`tma`)        | igual ao time                                | média não se divide                  |
| Horas em atraso    | limite do time ÷ pessoas, **piso em minuto** | o total do time é a soma das pessoas |
| Chamados em atraso | limite do time ÷ pessoas, **piso inteiro**   | idem; passa a existir no individual  |
| TMR (`tmr`)        | não existe                                   | continua só da equipe (ADR 025)      |

- **Pessoas** = `users` do setor com `is_active`, qualquer papel (admin e o
  Diretor na Diretoria incluídos). É a mesma contagem do "N de M cumpriram"; a
  aba Individual e a aba Equipe usam o mesmo divisor. Divisor menor que 1 vira
  1 (nunca divide por zero).
- **Horas**: a conta é feita em minutos inteiros
  (`floor(limite × 60 ÷ pessoas)` minutos), e o alvo é guardado em ms múltiplo
  de minuto. Assim o que o card mostra (`formatHoursMinutes`, que também corta
  em minuto) é exatamente o número comparado: 25h ÷ 3 = 500 min = `8h 20min`.
  A comparação continua em ms (`valor <= alvo`).
- **Chamados**: `floor(limite ÷ pessoas)`. Resultado 0 é limite válido
  (nenhum chamado em atraso permitido): 2 ÷ 5 = 0.
- Limite do time nulo → pessoa também "Sem objetivo". Hoje as duas colunas são
  `not null`; a regra existe para não quebrar se um dia deixarem de ser.
- "Cumpriu os objetivos" (`metCount`) passa a exigir os **quatro** indicadores
  individuais (SLA, TMA, horas e chamados em atraso), cada um contra o alvo
  derivado.
- Formulário: mesmos campos e mesmos números. Só o texto muda (a descrição dos
  dois limites diz que o individual é dividido) e o campo de chamados em
  atraso sai do grupo "Objetivos da equipe" para o grupo de cada pessoa e do
  time, porque agora vale nos dois.

## Alternativas descartadas

- **Limite individual cadastrado à parte.** Mais um número para o líder
  manter, e nada garante que a soma bata com o do time.
- **Arredondar a hora para cima ou mostrar fração de hora.** Para cima, a soma
  das pessoas passa do time; fração (`8,33h`) não é como a tela mostra
  durações.

## Consequências

- **A soma das pessoas pode ficar abaixo do total do time.** Atraso de chamado
  vencido **sem responsável** (na fila) conta para o time e para ninguém; o
  mesmo vale para envio vencido sem `from_assignee_id`. Por isso um time pode
  reprovar com todas as pessoas aderentes. Não é defeito: é o atraso que
  ninguém assumiu.
- Na quantidade, o mesmo chamado pode contar para duas pessoas (A o enviou
  vencido, B o resolveu fora do prazo depois da volta por recusa) e uma vez só
  no time. A soma das pessoas pode, nesse caso, passar do total do time.
- O piso faz a soma dos limites individuais ser ≤ o limite do time (16 ÷ 3 =
  5, 5 × 3 = 15). A sobra não é distribuída.
- Entrar ou sair gente do setor (ou ativar/desativar alguém) muda o limite de
  todos no mesmo instante, para o mês inteiro, como mudar o objetivo (ADR 022).
- Setor com 1 pessoa: individual = time.
