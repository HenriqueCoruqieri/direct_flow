# 023 — Horas em atraso acumuladas dentro do mês

## Contexto

Na primeira versão da Operação (`docs/contracts/operations.md`, ADR 022), o
indicador **Horas em atraso** era uma foto: a soma de `now − vencimento` dos
chamados **ativos** já vencidos. Resolver um chamado muito atrasado tirava todo
o atraso dele da conta, e o indicador **melhorava** justamente quando a equipe
tinha errado. O usuário decidiu que o atraso precisa acumular ao longo do mês.

É um ADR novo, e não adendo ao 022, porque o 022 trata de onde a meta mora e de
qual janela o resultado usa (uma linha por setor, mês corrente, nada gravado) e
continua valendo inteiro. Este decide **o que** o indicador mede, com
alternativa própria descartada.

## Decisão

Horas em atraso do mês = para cada chamado do recorte ("meu" ou do setor, como
antes), a parte do atraso que caiu **dentro de `[1º do mês 00:00 SP, agora)`**:

- início = `max(vencimento, início do mês)`
- fim = `resolved_at` para chamados `resolvido`/`fechado` com `resolved_at` no
  mês; `now` para chamados com status em `OVERDUE_TICKET_STATUSES` (o mesmo
  conjunto de ativos de antes, igual a `BACKLOG_TICKET_STATUSES`)
- soma `fim − início` só quando `fim > início`.

Vencimento é o de sempre (`ticketDueAtSql`, ADR 019). Não conta: chamado
resolvido em mês anterior, cancelado (com ou sem `resolved_at`), chamado
resolvido dentro do prazo. No dia 1º o indicador zera, como o resto da
Operação.

Exemplo do usuário: chamado com 6h de atraso até o fim de 30/11 e mais 10h em
dezembro conta 6h em novembro e 10h em dezembro. Chamado vencido desde agosto e
resolvido em 5/11 conta de 1º/11 00:00 até a resolução.

## Alternativa descartada

- **Contar o atraso inteiro no mês da resolução.** Um chamado vencido desde
  agosto e resolvido em novembro jogaria três meses de atraso em novembro, e
  nada em agosto, setembro e outubro. O mês em que a equipe resolve um atraso
  antigo ficaria pior do que os meses em que ela o deixou parado.

## Consequências

- Resolver um chamado atrasado não reduz o número do mês: ele só para de
  crescer. Dentro do mês o número só cai se um chamado sair do recorte
  (transferência ou troca de responsável); fora isso, só zera no dia 1º.
- Valores maiores ficam comuns (o time soma o atraso de todos), o que pressiona
  o layout do gauge.
- O recorte continua sendo o atual: chamado transferido para outro setor leva
  todo o atraso do mês com ele, e trocar o responsável move o atraso do mês
  para o novo responsável.
- Sem schema, sem migration. Só a expressão SQL do fato `overdueMs` muda; o nome
  do campo e o tipo ficam.

> Revisão de 2026-11-12 (ADR 024, `docs/contracts/department-due-hours.md`,
> seção "Horas em atraso do mês"): o vencimento passa a ser a coluna
> `ticket.due_at`, e a consequência "chamado transferido leva todo o atraso
> do mês com ele" deixa de valer para envio a outro setor. O atraso que o
> chamado acumulou antes do envio continua contando para o setor de origem
> (`ticket_transfer.from_department_id`) e para quem o tinha
> (`from_assignee_id`): trecho `[max(from_due_at, início do mês, última
volta por recusa), created_at da transferência]`, quando positivo. Na volta
> por recusa, a regra normal recomeça na hora da volta, com o `due_at`
> retomado, sem contar a espera nem repetir o trecho anterior. Trocar o
> responsável dentro do setor continua levando o atraso do mês para o novo
> responsável.

> Revisão de 2026-11-12 (ADR 025): este ADR continua valendo só para **Horas
> em atraso**. A **Quantidade de chamados em atraso** (novo objetivo da equipe,
> no lugar do Backlog) usa a mesma ideia de atribuição ao setor de origem do
> envio vencido (`ticket_transfer.from_department_id`, com
> `from_due_at < created_at`), mas conta chamados, cada um no máximo uma vez
> por setor no mês.
