# Plano — Aba "Aprovações"

**Status: concluído em 2026-10-15, aguardando commit.** `df-reviewer`
aprovado; `df-qa` 18 de 18 (`docs/test-reports/2026-10-15-approvals.md`).

Aprovado em 2026-10-15 (via `/consult`). Contrato técnico em
`docs/contracts/approvals.md`. Pontos de partida: lista e período da Fila
(`docs/contracts/department-queue.md`), origem do detalhe
(`docs/contracts/ticket-search-and-queue-back-link.md`), envio, aceite e recusa
(`docs/contracts/department-transfer.md`, ADR 016).

## Decisões fixadas pelo usuário

| Tema     | Decisão                                                                                                                                             |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Menu     | Item **"Aprovações"** para **todos**, depois de "Fila do setor", ícone `ArrowRightLeft`                                                             |
| Rota     | `/approvals`. Mesmo layout de Meus chamados/Fila (título, data, período, tabela), **sem abas**                                                      |
| Período  | Presets da Fila, padrão **"Todos"**. Filtra pela **data do envio** (`ticket_transfer.created_at`), não pela abertura (2A)                           |
| Lista    | Chamados com transferência **pendente** para o setor de quem vê. Diretoria: só o enviado à Diretoria (1A). Sai ao "Atender" ou "Recusar"            |
| Colunas  | As da Fila, com "Destinatário" trocado por **"Veio de"** (setor de origem) e **"Enviado em"** (3). Linha abre o detalhe com origem e link de voltar |
| Vazio    | Layout de vazio das listas com `Nenhum chamado foi encaminhado para este setor no período informado`. Não alocado vê o mesmo                        |
| Contador | No item do menu, cor `warning`, só quando > 0, calculado pelo layout `(app)` (4A, sem polling), acessível (`Aprovações, 3 aguardando`)              |
| Fora     | Atender/recusar na lista; contador em outros itens; polling; navegação mobile; dashboard                                                            |

## Escopo

**Entra**: domínio, tipos e validação da aba; origem `from=approvals` no
detalhe; lista e contagem no `df-data`; página, tabela, selo no `NavItem`, item
no menu, contagem no layout e `router.refresh()` na saída da recusa no `df-ui`.

**Fora**: tudo listado em "Fora" acima; qualquer mudança em action.

## Impacto

- **Schema / migration**: nada. `ticket_transfer` e `transfer_inbox_idx`
  (`to_department_id, status, created_at desc`) já atendem lista, ordem e
  contagem.
- **Tipos**: `types/approvals.ts` (novo); `types/ticket-detail-origin.ts` ganha
  `TicketDetailApprovalsOrigin`.
- **Domínio**: `domain/approvals.ts` (novo); `domain/ticket-detail-origin.ts`
  ganha `TICKET_DETAIL_FROM_APPROVALS`.
- **Validação**: `validation/approvals.ts` (novo, reaproveita
  `allTimePeriodSchema`); `validation/ticket-detail-origin.ts` reconhece a
  origem nova e ganha `approvalsTicketDetailHref`.
- **`df-data`**: `app/_lib/data/approvals.ts` com `listPendingApprovals` e
  `countPendingApprovals`.
- **`df-ui`**: `app/(app)/approvals/page.tsx`,
  `app/(app)/approvals/_components/approvals-table.tsx`, `nav-item.tsx`,
  `app-sidebar.tsx`, `app/(app)/layout.tsx`, `decline-transfer-dialog.tsx`.
- **`df-actions`, `df-auth`, `df-email`**: nada. "Atender" já revalida (o
  layout re-renderiza na resposta da action); a recusa sem acesso é resolvida
  na UI, sem mudar a regra da action (ADR 016).

## Ondas e agentes

- **Onda 0**: `df-architect` — tipos, domínio, validação, contrato, este plano,
  nota no ADR 016.
- **Onda 1 (paralelo)**: `df-data` (lista e contagem) ‖ `df-ui` (página, tabela,
  selo, menu, layout, refresh na recusa). O `df-ui` tipa contra as assinaturas
  do contrato.
- **Onda 2**: não há (sem action nova).
- **Onda 3**: `df-reviewer`.
- **Onda 4**: `df-qa` (cenários AP1–AP18).

## Riscos

1. **Recusar sem acesso não revalida** → contador velho. Mitigado com
   `router.refresh()` depois do `router.replace(leaveHref)` no dialog.
2. **Contador desatualizado para quem não agiu** (envio de outro setor, aceite
   de colega): só atualiza ao recarregar ou após ação que revalide. Aceito (4A).
3. **Período por data de envio** diverge de Meus chamados e da Fila (abertura).
   Explícito no contrato e testado (AP6, AP7).
4. **Consulta a mais por render do layout**, coberta por índice.

## Critério de pronto

1. Menu com "Aprovações" para todos, selo `warning` só quando > 0, nome
   acessível com o número.
2. `/approvals` igual à consulta de referência, período pelo envio, padrão
   Todos, vazio com a frase do usuário.
3. Selo atualiza sem recarga depois de Atender e de Recusar.
4. `tsc`, lint e build passam; `df-reviewer` sem bloqueante; `df-qa` aprova os
   cenários.

## Commit sugerido

`feat: list incoming department transfers under an approvals tab` — domínio,
validação, tipos, dados, telas, o contrato, este plano e a nota no ADR 016.
