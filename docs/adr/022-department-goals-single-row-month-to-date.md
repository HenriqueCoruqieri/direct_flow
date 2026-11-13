# 022 — Metas operacionais: uma linha por setor, resultado do mês corrente

## Contexto

A feature Operação (`docs/contracts/operations.md`) dá a cada setor metas de SLA,
TMA, horas em atraso, backlog e aceite de transferências, avaliadas para cada
pessoa e para o time. O usuário decidiu que não há histórico de metas, nem meta
por mês, nem meta individual diferente da do setor.

## Decisão

- Tabela `department_goal`, **uma linha por setor** (índice único em
  `department_id`), sobrescrita a cada salvamento (`insert … on conflict do
update`). Quem salvou e quando ficam em `updated_by` e `updated_at`; não há
  linha por versão.
- Todos os limites são **inteiros** (`smallint`, `backlog_limit` `integer`), com
  `check` de faixa no banco e a mesma faixa (mais um teto de sanidade) no Zod.
- `department_id` com `on delete cascade`: a meta não tem sentido sem o setor.
  Setor nunca é apagado pela aplicação (só desativado), então o cascade só age em
  limpeza manual do banco, e aí não deixa linha órfã nem bloqueia a limpeza.
  `updated_by` com `on delete set null`, pelo mesmo motivo (usuário também não é
  apagado).
- O **resultado não é gravado**. É calculado a cada leitura sobre o mês corrente
  em São Paulo (`[1º do mês 00:00, agora)`, ADR 009), com as mesmas expressões de
  vencimento e SLA do ADR 019.
- Setor "Não alocado" não tem metas (regra de aplicação; o banco não impede, pois
  `check` não enxerga outra tabela).

## Consequências

- Mudar a meta no meio do mês reavalia o mês inteiro com o valor novo. Não dá
  para responder "qual era a meta em outubro". Se um dia for preciso, entra uma
  tabela de versões e este ADR é substituído.
- No dia 1º o mês recomeça vazio: SLA e TMA ficam "Sem dados" até a primeira
  resolução, e não reprovam.
- Mudar a tabela de horas por prioridade (ADR 019) muda o SLA do mês corrente
  retroativamente, como já acontece no resto da aplicação.
- Migration `0024_department_goal`, não destrutiva e sem backfill. Setores
  existentes começam sem metas (estado vazio da tela).
- O cálculo de Horas em atraso (atraso acumulado dentro do mês, não foto dos
  ativos) está no ADR 023.

> Revisão de 2026-11-12 (ADR 025, `docs/contracts/operations-tmr-overdue.md`):
> os objetivos só da equipe passam a ser **Quantidade de chamados em atraso**
> (`backlog_limit` renomeada para `overdue_tickets_limit`, valores mantidos) e
> **TMR** (`tmr_max_hours`, nula até ser salva; `transfer_acceptance_min_percent`
> apagada). Todos os objetivos agora são do mês corrente; nenhum é mais "de
> agora". Continua uma linha por setor, nada gravado de resultado, exceto as
> esperas de fila (`ticket_queue_wait`), que são fato dos atos e não resultado.
