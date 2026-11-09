# 021 — Empresa do chamado: opcional no banco, obrigatória na aplicação

## Contexto

Todo chamado passa a ser aberto para uma empresa (o cliente atendido;
`docs/contracts/ticket-company.md`). Já existem chamados sem empresa, e não há
como inferir a empresa deles. A empresa pode ser desativada no cadastro, mas
nunca é excluída (`docs/contracts/registry-companies.md`).

## Decisão

1. `ticket.company_id` é **nullable**, com FK `on delete restrict` e índice
   `ticket_company_idx`. Sem backfill: chamado antigo fica sem empresa e mostra
   `—`.
2. A obrigatoriedade mora na aplicação: `createTicketSchema` (Etapa 1) e
   `editTicketSchema` (Etapa 2) exigem `companyId`. Chamado antigo ganha
   empresa na primeira edição salva.
3. A validade da escolha é uma regra só, `isUsableTicketCompany(company,
currentCompanyId)`: empresa ativa, ou a empresa que o chamado já tem. A
   checagem roda na data layer, sob `for share` na linha da empresa, dentro da
   transação que grava o chamado; o `update` de desativação espera o commit.
4. Sem empresa ativa, a abertura de chamado é bloqueada
   (`NO_ACTIVE_COMPANIES`).

## Alternativas descartadas

- **`NOT NULL` com backfill** para uma empresa "Sem empresa". Criaria um
  cliente fictício no cadastro, apareceria nas listas e nos futuros filtros e
  mascararia o dado que falta.
- **`NOT NULL` só para chamados novos via `CHECK` com data de corte.** Regra
  temporal no banco, difícil de explicar e de manter; a aplicação já é a única
  porta de escrita.

## Consequências

- Consultas de leitura usam `left join` em `company`, e todo tipo de saída
  trata `company: ... | null`.
- Desativar empresa não afeta chamados existentes; ela só deixa de ser
  escolhível. Excluir empresa com chamado é recusado pela FK.
- Migration `0022_ticket_company.sql`, não destrutiva.
