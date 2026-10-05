# Plano — Janela de 7 dias, edição na própria tela e "Hoje" em Meus chamados

Aprovado em 2026-10-05 (via `/consult`). Contrato técnico em
`docs/contracts/ticket-edit-window.md`. Decisão de arquitetura em
`docs/adr/014-scheduled-close-of-resolved-tickets.md`. Ponto de partida: risco 2
de `docs/plans/ticket-resolution-and-comments.md` ("solução travada até a
janela de correção").

## Decisões fixadas pelo usuário

| Tema                    | Decisão                                                                                                                                                                                                                                                    |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Janela após a resolução | 7 × 24 h contadas de `ticket.resolved_at` (não dia de calendário). Dentro dela o autor edita também a **Solução**; fora dela o chamado é tratado como encerrado **na hora** (sem edição e sem comentário), mesmo antes de o job gravar `fechado`           |
| `resolved_at` nulo      | Em chamado `resolvido` (inconsistência), conta como janela fechada                                                                                                                                                                                         |
| Quem edita a solução    | O mesmo "Editar" de hoje: só o autor, com a regra de `ticketEditBlockFor`. Sem permissão separada                                                                                                                                                          |
| Persistência            | Vercel Cron diário (`vercel.json`, `0 6 * * *` = 03:00 em São Paulo) → `GET /api/cron/close-resolved-tickets` com `Authorization: Bearer ${CRON_SECRET}`. Grava `status = fechado`, `closed_at`, `updated_at` e `ticket_history` `encerramento` do sistema |
| Ator do sistema         | `ticket_history.changed_by` anulável (FK `restrict` mantida); nulo = sistema, exibido como `Sistema` na linha do tempo                                                                                                                                     |
| Nota do encerramento    | `Encerrado automaticamente 7 dias após a resolução.`                                                                                                                                                                                                       |
| Card Conclusão          | No estado `resolved` com a janela aberta, mostra também `Editável até {data e hora}`                                                                                                                                                                       |
| Edição na própria tela  | Sai o dialog. "Editar" põe o detalhe em modo de edição: título no cabeçalho, Descrição no card Descrição, Tipo e Tag no card Detalhes, Solução no card Conclusão (só em `resolvido`). "Editar" vira "Cancelar" e "Salvar alterações" no cabeçalho          |
| Um salvamento           | Grava tudo com **uma** linha `edicao`; a nota acrescenta "solução" no fim (`Alterou descrição e solução.`)                                                                                                                                                 |
| Durante a edição        | Em chamado não resolvido, somem o formulário "Resolver" e os botões bloqueados do card Conclusão. Comentários não mudam. "Cancelar" restaura os valores. Sem aviso de rascunho perdido. Sem barra fixa no mobile                                           |
| Mesma action            | `editTicket` e `updateTicketByAuthor`, com `solution` opcional (10–5000 após `trim`). Solução enviada para chamado que não está `resolvido` é recusada. Legado `resolvido` sem solução: campo vazio e obrigatório ao salvar                                |
| "Hoje" em Meus chamados | Padrão passa a `Hoje`; inválido ou ausente → `Hoje`; a pílula Todos grava `periodo=todos` na URL. O Início não muda                                                                                                                                        |
| Padrões aprovados       | Prazo 7 × 24 h; bloqueio pelo domínio independe do job; reabertura fora                                                                                                                                                                                    |

## Escopo

**Entra**: `changed_by` anulável (migration não destrutiva); regra da janela no
domínio (`isTicketLocked`), aplicada a edição, comentário e card Conclusão;
solução na edição; rota de cron com segredo e `vercel.json`; job transacional
que fecha os vencidos; ator `Sistema` na linha do tempo; `Editável até` no
card; modo de edição na própria página no lugar do dialog; "Hoje" como padrão
em Meus chamados; dois chamados de teste no seed QA.

**Fora**: reabertura; prazo configurável por setor; e-mail de encerramento;
aviso de rascunho perdido; barra fixa de ações no mobile; edição por quem não é
o autor; cron mais frequente que diário.

## Impacto

- **Schema**: `ticket_history.changed_by` sem `NOT NULL`. Nada mais.
- **Tipos**: `TicketHistoryEntry.changedByName` anulável; `resolvedAt` nos fatos
  de edição e comentário; `solution` no snapshot, nos valores, na diferença e
  nos `defaults` da edição; `includesSolution`; `editableUntil` no estado
  `resolved`; outcome do encerramento automático.
- **Domínio**: `domain/ticket-closure.ts` (janela, corte, trava, prazo, nota);
  `now` nas regras de edição, comentário e Conclusão; `canEditSolution`;
  `SYSTEM_ACTOR_LABEL`/`describeHistoryActor`; `DEFAULT_MY_TICKETS_PERIOD`
  = Hoje; `RESOLVED_TICKET_STATUS` e `CLOSED_TICKET_STATUS` em `domain/ticket.ts`.
- **Validação**: `editTicketSchema` com `solution` opcional
  (`ticketSolutionSchema` mudou para `validation/ticket.ts`);
  `serializePeriodParams` grava `periodo=todos`; `myTicketsTabHref` com período
  obrigatório.
- **Configuração**: `vercel.json`; `CRON_SECRET` em `.env.example`.
- **`df-auth`**: `proxy.ts` deixa `/api/cron/*` passar sem sessão.
- **`df-data`**: `leftJoin` no histórico do detalhe; `updateTicketByAuthor`
  (janela e solução); `insertTicketMessage` (janela);
  `closeExpiredResolvedTickets`; seed QA.
- **`df-actions`**: `editTicket` repassa a solução; rota de cron.
- **`df-ui`**: um `now` na página; modo de edição na tela; `EditTicketDialog`
  removido; `Editável até`; `Sistema` na linha do tempo.
- **`df-email`**: nada.

## Migration

`0010_history_system_actor`: `ALTER TABLE ticket_history ALTER COLUMN
changed_by DROP NOT NULL`. Não destrutiva. Aplicação (`npm run db:migrate`)
pelo usuário, antes do teste. Sem ela, o cron responde 500 e nada fecha.

## Ondas e agentes

- **Onda 0**: `df-architect` (schema, migration, tipos, domínio, validação,
  `vercel.json`, `.env.example`, ADR 014, contrato, plano).
- **Onda 1 (paralelo)**:
  - `df-auth` — `matcher` do `proxy.ts` sem `api/cron`.
  - `df-data` — `leftJoin` no histórico; `updateTicketByAuthor` com
    `resolved_at`, `now` e solução; `insertTicketMessage` com `resolved_at` e
    `now`; `closeExpiredResolvedTickets(cutoff, now)`; seed QA (`[QA] Janela
vencida`, `[QA] Janela aberta`).
  - `df-ui` — um `now` na página e nas três regras; `Editável até`; `Sistema`
    na linha do tempo; estrutura do editor em tela; conferir que nada assume
    "sem `periodo` = Todos" em Meus chamados.
- **Onda 2 (paralelo)**:
  - `df-actions` — `editTicket` com solução; `app/api/cron/close-resolved-tickets/route.ts`.
  - `df-ui` — ligação do editor ao `editTicket`; remoção do `EditTicketDialog`.
- **Onda 3**: `df-reviewer`.
- **Onda 4**: `df-qa` (navegador, `curl` na rota local com e sem segredo, dev
  server, banco só leitura → `docs/test-reports/`).

## Riscos

1. **`inner join` no histórico**: sem trocar por `left join`, a linha do sistema
   some da linha do tempo sem erro de tipo nem de execução.
2. **`proxy.ts`**: sem excluir `api/cron` do `matcher`, a Vercel recebe 307 para
   `/login` e o job nunca roda.
3. **`new Date()` em Server Component no Next 16**: o `df-ui` confere em
   `node_modules/next/dist/docs/` se ler o relógio exige algo (a página já é
   dinâmica e `cacheComponents` está desligado).
4. **Lote no deploy**: chamados `resolvido` já vencidos travam assim que o
   deploy sobe, e o primeiro cron fecha todos de uma vez (inclusive os do seed
   demo).
5. **`resolved_at` nulo** em `resolvido` trava na hora e é fechado pelo cron.
6. **Solução legada vazia** é obrigatória para salvar qualquer outra mudança.
7. **Rascunho perdido** ao cancelar, navegar ou recarregar, sem aviso.
8. **"Hoje" como padrão** esconde um chamado de ontem ao voltar do detalhe para
   Meus chamados.
9. **Badge `Resolvido` por até ~24 h** (mais a folga de horário do Hobby)
   depois de vencer, mas já travado.
10. **`<form>` aninhado** no editor (Resolver e Comentar já são formulários)
    causaria HTML inválido e erro de hidratação; o contrato proíbe.

## Critério de pronto

1. Resolvido dentro da janela: o autor edita título, descrição, tipo, tag e
   solução na própria tela; uma linha `edicao` com "solução" na nota;
   `Editável até` no card.
2. Resolvido vencido: sem "Editar" e sem formulário de comentário antes do cron;
   ações forjadas recusadas.
3. Cron: 401 sem segredo (sem tocar o banco); 200 com segredo, fechando os
   vencidos com `encerramento` do `Sistema`; idempotente.
4. Linha do tempo mostra `Sistema`; o chamado aparece em Fechados.
5. Sem dialog de edição; "Cancelar" restaura; "Resolver" some durante a edição
   de chamado não resolvido; solução forjada em não resolvido recusada.
6. Meus chamados abre em Hoje; Todos grava `periodo=todos`; Início inalterado.
7. `tsc`, lint e build passam; `df-reviewer` sem bloqueante; `df-qa` aprova os
   cenários do contrato; nenhum erro de hidratação.

## Commits por etapa

1. `feat: lock resolved tickets after a seven-day window` — migration `0010`,
   `ticket-closure`, `now` nas regras, `left join`, transações com janela,
   `closeExpiredResolvedTickets`, seed QA, rota de cron, `proxy.ts`,
   `vercel.json`, `.env.example`, `Editável até`, `Sistema`, ADR 014.
2. `feat: edit tickets in place on the detail page` — solução na edição
   (schema, domínio, transação, action), modo de edição na página, remoção do
   dialog e o padrão `Hoje` em Meus chamados (incluído aqui a pedido do
   usuário).

Docs vão junto da etapa a que pertencem: contrato, plano e revisões dos
contratos antigos na etapa 1; o adendo de `my-tickets.md` na etapa 2.
`app/_lib/types/ticket-edit.ts`, `app/_lib/domain/ticket-edit.ts` e
`app/_lib/validation/ticket.ts` têm mudanças das duas etapas no mesmo arquivo:
separar por trecho (`git add -p`) ou aceitá-los inteiros na etapa 1.
