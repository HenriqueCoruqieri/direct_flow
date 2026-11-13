# 024 — Prazo por setor e vencimento gravado em `ticket.due_at`

Substitui o ADR 019. Contrato: `docs/contracts/department-due-hours.md`.

## Contexto

O ADR 019 calculava o vencimento a cada leitura (`created_at` + tabela fixa
por prioridade) e aceitava que mudar a tabela mudasse o prazo de todos os
chamados, inclusive os resolvidos. Em 2026-11-12 o usuário decidiu que cada
setor configura as próprias horas por prioridade (Cadastros → Prazos), que a
mudança só vale para chamados abertos ou aceitos dali em diante, e que o
relógio do setor de origem para enquanto o chamado aguarda aceite em outro
setor. Nada disso cabe num vencimento derivado: depende de qual tabela valia
em qual momento.

## Decisão

1. **Horas por setor** em `department_due_hours` (uma linha por setor,
   sobrescrita, mesmo desenho do ADR 022). Setor sem linha usa o padrão
   `DEFAULT_DEPARTMENT_DUE_HOURS` (Crítica 3h, Alta 6h, Média 12h, Baixa 24h).
   Continua em horas corridas.
2. **Vencimento gravado e congelado em `ticket.due_at`**, escrito só por
   quatro atos, na mesma transação do ato:
   - abertura: `created_at + horas(setor do chamado, prioridade)`;
   - envio para outro setor: `due_at = null` (sem SLA durante a espera); o
     prazo vigente e quem tinha o chamado vão para
     `ticket_transfer.from_due_at` e `from_assignee_id`;
   - aceite: `reviewed_at + horas(setor de destino, prioridade)`;
   - recusa: `from_due_at + (reviewed_at − transfer.created_at)` (o relógio
     da origem retoma de onde parou). Se `from_due_at` for nulo, recomeça:
     `reviewed_at + horas(setor de origem, prioridade)`.
     Prioridade é fixa (ADR 020): nada recalcula por prioridade.
3. **Invariante:** `due_at` é nulo se, e somente se, o chamado tem
   transferência pendente (`status = 'aguardando_aprovacao'`). A leitura
   trata nulo fora disso como "sem prazo" (neutro), sem quebrar.
4. **SLA pendente é um estado próprio**, "Aguardando aceite", decidido por
   `ticketSlaFor` a partir do status.
5. **`ticket_history.to_due_at`** registra o prazo que o ato definiu
   (abertura, aceite, recusa), para a linha do tempo mostrar o prazo novo do
   aceite sem depender da tabela de horas atual.
6. Dados: `0025_department_due_hours` (schema) e `0026_backfill_ticket_due_at`
   (dados). Chamados sem pendência recebem `created_at + padrão`; com
   pendência, `due_at = null` e `from_due_at` = vencimento pela regra antiga.
   Transferências já decididas não são reescritas.

## Alternativas descartadas

- **Continuar derivando, com a tabela do setor atual.** Mudar a tabela
  mudaria chamados em andamento e resolvidos, e a pausa durante a pendência
  exigiria reconstruir o histórico de transferências em cada leitura.
- **Guardar "tempo restante" no envio em vez de `from_due_at`.** Equivale
  matematicamente, mas perde a data que de fato vigorava, que é o que a
  linha do tempo e o cálculo de atraso usam.

## Consequências

- `ticketDueAtSql` e `TICKET_PRIORITY_DUE_HOURS` deixam de existir; toda
  leitura usa a coluna. O filtro de vencidos ganha o índice
  `ticket_dept_due_idx (current_department_id, due_at)`.
- Mudar a tabela de um setor não altera nenhum chamado existente.
- Todo caminho de escrita que abre, envia, aceita ou recusa precisa gravar o
  prazo; esquecer um deixa o chamado sem SLA ("—"). O `df-qa` confere os
  quatro.
- O atraso acumulado antes de um envio continua contando para quem tinha o
  chamado (revisão do ADR 023).
- Etapa B (TMR): a espera pendente fica fora do SLA de qualquer setor e já
  está medida por `ticket_transfer.created_at` e `reviewed_at`. Uma meta ou
  prazo de aceite por setor entra como coluna nova em `department_due_hours`
  ou em `department_goal`, sem mudar esta decisão.

> Revisão de 2026-11-12 (ADR 025): a Etapa B mede a espera de aceite como
> espera de fila (`ticket_queue_wait`, motivo `transferencia_recebida`) e o
> limite entrou em `department_goal.tmr_max_hours`. Este ADR não muda.
