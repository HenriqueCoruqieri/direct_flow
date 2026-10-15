# Relatório de testes — Fila do setor sem chamados `aguardando_aprovacao`

- **Data:** 2026-10-15
- **Contrato:** `docs/contracts/department-queue.md` (revisão de 2026-10-15, cenários QA1–QA3); contexto em `docs/contracts/approvals.md` e `docs/contracts/qa-seed.md`
- **Commit:** `b28aecf` · alterações não comitadas: sim
- **Ambiente:** `http://localhost:3000`, `next dev`, banco de desenvolvimento
- **Resultado:** 6 de 6 passaram · 0 falharam · 0 bloqueados · 0 não executados

## Pré-requisitos

- Dev server respondeu 200 em `/login`; MCPs `playwright`, `next-devtools` e `postgres` disponíveis.
- Usuários QA (Suporte admin `qa.admin.suporte@directflow.test` = A, Infra admin `qa.admin.infra@directflow.test` = I) existem e estão ativos (`select email, role, is_active, department_id from users`; QA Suporte = 18, QA Infra = 19).
- `RESEND_API_KEY` está preenchida no `.env` (contrário do informado). Nenhum cenário depende de e-mail: enviar, atender e recusar não disparam e-mail (`grep` em `app/_lib/actions` só acha `sendPasswordChangedEmail`), então nada foi marcado como não executado. Ver Observações.

## Cenários

| #   | Cenário                                                                                                           | Papel | Status |
| --- | ----------------------------------------------------------------------------------------------------------------- | ----- | ------ |
| QA1 | `[QA] Fila sem pendente` (#251) enviado de QA Suporte para QA Infra; Fila de QA Infra (Todos e Em aberto) sem ele | A, I  | PASSOU |
| QA2 | Atender #251 pelo detalhe; ele passa a Em andamento e Todos; contagens +1                                         | I     | PASSOU |
| QA3 | `[QA] Fila recusa` (#252) enviado e recusado com motivo; volta à Fila de QA Suporte e some de Aprovações          | A, I  | PASSOU |
| R1  | Regressão: "Abertos por mim" em Meus chamados                                                                     | A     | PASSOU |
| R2  | Regressão: texto novo do diálogo "Enviar para outro setor"                                                        | A     | PASSOU |
| R3  | Responsivo: `/queue?tab=all` em 390×844 sem rolagem horizontal                                                    | A     | PASSOU |

## Evidências

### QA1

- Após A enviar #251 e #252 (histórico `transferencia_solicitada`, `aberto` → `aguardando_aprovacao`, 18 → 19, ids 677 e 678; ticket com `current_department_id = 19`, `origin_department_id = 18`, `assigned_to` nulo).
- `/queue?tab=all` de I: abas Todos 15, Em aberto 2, Encaminhados 0, Em andamento 13, Resolvidos 0, Fechados 0, Cancelados 0. Linhas: 15 chamados, sem #251 nem #252, sem nenhum selo "Aguardando aprovação".
- `/queue` (aba padrão) lista só #79 e #72; mesmo resultado em `?tab=open`.
- Consulta: `select status, assigned_to is null un, count(*) from ticket where current_department_id=19 group by 1,2` → `aberto/true 2`, `aguardando_aprovacao/true 12`, `em_andamento/false 13`. Todos esperado = 2 + 13 = 15, Em aberto = 2, Em andamento = 13: batem com a tela.
- Filtro Status em Todos: Aberto, Em análise, Encaminhado, Recusado, Em andamento, Resolvido, Fechado, Cancelado (sem "Aguardando aprovação"). Em Em aberto: Aberto, Em análise, Encaminhado, Recusado, Em andamento (5, como o contrato).
- `/approvals` de I lista #252 e #251 (12 linhas, status "Aguardando aprovação", "Veio de" QA Suporte).

### QA2

- I abriu #251 por `/tickets/251`, botões "Atender" e "Recusar"; clicou "Atender".
- Banco: `ticket` #251 `em_andamento`, `current_department_id = 19`, `assigned_to = 15` (I). Última `ticket_history`: `transferencia_aprovada`, `aguardando_aprovacao` → `em_andamento`, 18 → 19, assignee nulo → 15. `ticket_transfer`: `aprovado`, `review_note` nulo, 18 → 19. Status do ticket = última linha do histórico.
- Fila de I: Todos 16 (+1), Em andamento 14 (+1), Em aberto 2. #251 aparece em `?tab=in_progress` e `?tab=all`, não em `?tab=open`.

### QA3

- I abriu #252, "Recusar" (diálogo: "O motivo vira um comentário público e o chamado volta para QA Suporte."), motivo preenchido e enviado; redirecionou para `/tickets`.
- Banco: `ticket` #252 `recusado`, `current_department_id = 18`, `assigned_to = 13` (A, o solicitante). Histórico: `transferencia_rejeitada`, `aguardando_aprovacao` → `recusado`, 19 → 18, assignee nulo → 13. `ticket_transfer`: `rejeitado`, `review_note` = motivo digitado, 18 → 19.
- `/approvals` de I: sem #252 nem #251.
- Fila de A (QA Suporte): #252 em Encaminhados (voltou com o solicitante) e em Todos, fora de Em aberto; nenhum selo "Aguardando aprovação"; #64 (pendente da Diretoria) fora de todas as abas. Contagens: Todos 136, Em aberto 36, Encaminhados 19, Em andamento 41, Resolvidos 33. Conferido no banco (`current_department_id = 18`): Todos = tudo menos `aguardando_aprovacao` (7+29+12+6+7+1+41+33 = 136), Em aberto = sem destinatário em `aberto`/`encaminhado`/`recusado` (29+6+1 = 36), Encaminhados = com destinatário em `encaminhado`/`recusado` (12+7 = 19), Em andamento 41, Resolvidos 33.

### R1

- Meus chamados de A (período Hoje): Abertos por mim 2 (#252 e #246), Aguardando aprovação 0. #251, que saiu do setor de origem e está em andamento em QA Infra, fica fora, como antes (`DEPARTMENT_SCOPE_CONDITIONS.origin` = `current_department_id = origin_department_id`). Autor 13 criou hoje 238 (criado 23:00 de 14/10 no fuso local, fora do período), 246, 251, 252; resultado coerente com a regra.
- `git diff app/_lib/domain/my-tickets.ts`: a lista de statuses é a mesma (troca de `status !== AWAITING_APPROVAL...` pelo predicado `isNotAwaitingApproval`).

### R2

- Diálogo "Enviar chamado #251 para outro setor": "O chamado sai da fila deste setor e vai para a lista de Aprovações do setor escolhido, aguardando aprovação até alguém de lá atendê-lo. O comentário fica público no chamado e aparece no aviso de aprovação." (confere com `SEND_TO_DEPARTMENT_DIALOG_DESCRIPTION` e com o contrato).

### R3

- `/queue?tab=all` em 390×844: `scrollWidth` 375 = `clientWidth` 375, sem rolagem horizontal. Screenshot: `.qa-output/queue-mobile-390.png`.

`get_errors` do `next-devtools` devolveu `configErrors` e `sessionErrors` vazios depois de QA1, QA3 e R3.

## Falhas

Nenhuma.

## Erros fora dos cenários

Nenhum no `get_errors`. O console do navegador registrou um 404 em `/tickets/new`, rota que eu abri por engano (não existe e não é da feature).

## Não executados

Nenhum.

## Observações

- **Contrato inconsistente em contagem de opções do filtro Status.** O contrato (revisão de 2026-10-15) diz que Todos tem "sete status" / "7 opções", mas o enum `ticket_status` tem 9 valores; sem `aguardando_aprovacao` restam 8, e a tela mostra 8 (Aberto, Em análise, Encaminhado, Recusado, Em andamento, Resolvido, Fechado, Cancelado). Em aberto: 5, certo. O comportamento está correto; o número no texto precisa de ajuste. Dono: `df-architect`.
- **`RESEND_API_KEY` preenchida no `.env`**, ao contrário do combinado ("e-mail desligado"). Não afetou esta bateria (nenhuma das ações testadas envia e-mail), mas vale o usuário saber antes de rodar cenários que enviem e-mail.
- Dados criados: `#251 [QA] Fila sem pendente` (agora `em_andamento` em QA Infra, atribuído a I) e `#252 [QA] Fila recusa` (`recusado` em QA Suporte, atribuído a A). Em A, #252 soma a Atribuídos a mim/Abertos por mim de hoje. `#64` e `#65`–`#68` não foram alterados (conferido: #64 `aguardando_aprovacao` em 18, #65 e #67 `aberto` em 18, #66 `em_andamento` em 19, #68 `aguardando_aprovacao` em 19).
- A janela do navegador ficou aberta, logada como QA Admin Suporte.
