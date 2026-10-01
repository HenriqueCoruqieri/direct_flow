# Plano — Meus chamados

Aprovado em 2026-10-01. Contrato técnico em `docs/contracts/my-tickets.md`.

## Decisões fixadas pelo usuário

| Tema                 | Decisão                                                                                                                                                                                                                                                                       |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Menu                 | Item "Meus chamados" na sidebar para qualquer pessoa logada, inclusive no Não alocado                                                                                                                                                                                         |
| Lista                | `/tickets` com a barra superior (busca ainda sem função + "Novo chamado") e quatro abas; aba atual na URL (`?tab=`); padrão "Abertos por mim"; contagem no rótulo de cada aba; estado vazio próprio por aba                                                                   |
| Abas                 | **Abertos por mim**: autor = eu, status não final (inclui `resolvido` e `aguardando_aprovacao`). **Atribuídos a mim**: responsável = eu, status não final. **Fechados**: autor = eu, `fechado`. **Cancelados**: autor = eu, `cancelado`. Final = `fechado` ou `cancelado`     |
| Tabela               | `DataTable` compartilhado: #, título, tipo, tag, setor atual, status (badge), aberto em. Busca por # ou título; filtros Status, Tipo, Tag; linha inteira abre o detalhe; sem paginação                                                                                        |
| Detalhe              | `/tickets/[id]`, só leitura: cabeçalho (#, título, status, prioridade), tipo, tag, setores de origem e atual, autor, responsável (`—`), aberto em, descrição, aviso "Aguardando aprovação de <setor>" quando há transferência pendente, linha do tempo do histórico com nomes |
| Visibilidade         | Autor, responsável, quem está no setor **atual**, diretores. Senão 404. Regra única no domínio (`canViewTicket`), para Fila e Aprovações reaproveitarem. Admin do destino vendo chamado aguardando aprovação fica para Aprovações                                             |
| Fora                 | Conclusão, fechamento automático em 7 dias, aprovação, atribuição, edição, mensagens, anexos, busca global. Nenhum botão sem função                                                                                                                                           |
| Pronto para o futuro | Rótulos de **todos** os valores de `ticket_status`, `ticket_priority` e `history_event`, com `satisfies Record` (valor novo no enum quebra o `tsc`)                                                                                                                           |
| Gravação             | Nenhuma: sem action, sem migration                                                                                                                                                                                                                                            |

## Escopo

**Entra**: item de menu; página de lista com abas, contagens, tabela, busca e
filtros; página de detalhe só leitura com aviso de transferência pendente e
linha do tempo; regra de visibilidade; rótulos dos enums; prop `rowHref` no
`DataTable` compartilhado; badge de status reaproveitável.

**Fora**: tudo da linha "Fora" acima, e navegação mobile (o cabeçalho mobile
não tem menu hoje, nem para Cadastros).

## Impacto

- **Schema e migration**: nenhum. Os índices existentes (`ticket_created_by_idx`,
  `ticket_assigned_to_idx`, `history_ticket_idx`, `transfer_ticket_idx`) atendem.
- **Domínio**: `TICKET_STATUS_LABELS`, `TICKET_STATUSES`,
  `NON_FINAL_TICKET_STATUSES`, `TICKET_PRIORITY_LABELS`, `ticketDetailPath`,
  `canViewTicket`, `describePendingTransfer` (`ticket.ts`); abas e regras
  (`my-tickets.ts`); rótulos e frases do histórico (`ticket-history.ts`).
  `OPEN_TICKET_STATUSES` mantém a API e o resultado.
- **Validação**: aba da URL (inválida cai no padrão, sem erro) e id da rota
  (só inteiro positivo dentro do `integer` do Postgres; o resto é 404).
  `RawSearchParams` e "primeiro valor da chave" passam a ser compartilhados com o
  dashboard.
- **Tipos**: linha da lista, contagem por aba, detalhe, item do histórico,
  transferência pendente, fatos de visibilidade.
- **`df-data`**: `listMyTickets`, `countMyTicketsByTab` (uma consulta agrupada),
  `findTicketDetail`.
- **`df-ui`**: menu, duas páginas, tabela, abas, estados vazios, badge, linha do
  tempo, `rowHref`.
- **`df-auth`, `df-actions`, `df-email`**: nada.

## Ondas e agentes

- **Onda 0**: `df-architect` (tipos, domínio, validação, contrato, plano).
- **Onda 1 (paralelo)**: `df-data` (três leituras) · `df-ui` (menu, badge,
  `rowHref`, páginas e componentes contra o contrato).
- **Onda 2**: `df-ui` liga as páginas às funções de dados, se a Onda 1 tiver
  trabalhado com dado provisório. **`df-actions` não entra**: não há mutação.
- **Onda 3**: `df-reviewer`.
- **Onda 4**: `df-qa` (navegador, dev server, banco só leitura →
  `docs/test-reports/`).

## Riscos

1. **Dois campos de busca na mesma tela**: a da barra superior (sem função) e a
   da tabela. Quem usa a da barra não vê efeito. Rótulos diferentes; a busca
   global decide depois se absorve a da tabela.
2. **Abas quase vazias por enquanto**: "Atribuídos a mim" fica em 0 até existir
   atribuição; Fechados e Cancelados só têm o seed demo (do diretor).
3. Chamado em que a pessoa é autora e responsável aparece em duas abas.
4. Busca por número é por trecho (`66` acha também #166).
5. Qualquer pessoa do setor atual vê o detalhe de qualquer chamado do setor
   (decidido).
6. Admin do setor de destino não vê o chamado aguardando a aprovação dele até a
   feature de Aprovações.
7. Histórico mostra nomes atuais (setor renomeado aparece com o nome novo).

## Critério de pronto

1. Menu, abas, contagens, tabela, busca, filtros e detalhe conforme o contrato.
2. Contagens das abas batem com consulta ao banco (MCP `postgres`, só leitura).
3. 404 para quem não é autor, responsável, do setor atual nem diretor; autor
   abre mesmo no Não alocado; diretor abre qualquer um.
4. #66 mostra "Aguardando aprovação de QA Infra" e a linha do tempo com
   abertura + transferência solicitada.
5. Nenhuma gravação, nenhuma migration, nenhuma action.
6. `tsc`, lint e build passam; `df-reviewer` sem bloqueante; `df-qa` aprova os
   cenários.

## Commits por etapa

Definidos depois da implementação, variando verbos e verificando o histórico do
repositório. Docs vão junto da etapa.
