# 019 — SLA em horas corridas, calculado e não gravado em `due_at`

## Contexto

O plano `docs/plans/ticket-priority-and-sla.md` (aprovado em 2026-10-26) deixa
o autor escolher a prioridade na abertura e dá a cada prioridade um prazo:
Crítica 3h, Alta 6h, Média 12h, Baixa 24h, contados de `ticket.created_at`. O
relógio não pausa em transferência nem em aprovação e não reinicia ao mudar de
setor. Horário comercial e feriados ficam de fora.

O schema já tem `ticket.due_at`, nunca gravado. O card "Maiores atrasos" do
Início já calcula o vencimento a partir de `created_at` e `priority` com
`TICKET_PRIORITY_DUE_HOURS` (`app/_lib/domain/ticket-due.ts`).

## Decisão

1. **Horas corridas (24×7).** Vencimento = `created_at + TICKET_PRIORITY_DUE_HOURS[priority]`.
2. **Calculado, não gravado.** `due_at` continua sem gravação e sem leitura. O
   vencimento é derivado em TypeScript por `ticketDueAt` e, em SQL, por uma
   única expressão em `app/_lib/data/ticket-due.ts` montada a partir da mesma
   tabela de horas.
3. **Status do SLA também é calculado** (`ticketSlaFor`): ativo compara com
   `now`, resolvido/fechado compara com `resolved_at`, cancelado sem
   `resolved_at` fica neutro.

## Alternativas descartadas

- **Gravar `due_at` na abertura.** Congela o prazo vigente em cada chamado,
  mas cria duas fontes da regra (a tabela e a coluna), exige backfill dos
  chamados existentes e reescrita quando a prioridade passar a ser editável ou
  automática.

## Consequências

- **Mudar a tabela de horas altera o vencimento de todos os chamados**,
  inclusive os antigos e os já resolvidos (que podem trocar entre "No prazo" e
  "Fora do prazo"). No deploy desta decisão, os chamados existentes (todos
  `media`) passam de 24h para 12h e vários ficam atrasados de imediato.
- Prazos em horas inteiras: o SQL usa `make_interval(hours => int)`; prazo
  fracionário exige rever a expressão.
- O filtro por vencimento não usa índice (depende de `case` sobre a
  prioridade); é avaliado só sobre os chamados ativos do setor.
- Se um dia o prazo precisar ser congelado por chamado (auditoria, contrato
  externo), a mudança é gravar `due_at` na abertura e passar a ler a coluna:
  um novo ADR substitui este.
- Nenhuma mudança de schema nem migration.
