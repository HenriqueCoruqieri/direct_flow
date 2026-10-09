# Relatório de testes — Envio para outro setor, Etapa 3 (Recusar e status `recusado`)

- **Data:** 2026-10-09
- **Contrato:** `docs/contracts/department-transfer.md` (seção "Etapa 3", cenários RJ1–RJ21, TR10); ADR `docs/adr/016-transfer-moves-ticket-before-acceptance.md`
- **Commit:** `f177fbc` · alterações não comitadas: sim (arquivos da Etapa 3, migration `0012` e docs)
- **Ambiente:** `http://localhost:3000`, `next dev`, banco de desenvolvimento
- **Resultado:** 24 de 24 passaram · 0 falharam · 0 bloqueados · 0 não executados

## Pré-requisitos

- Dev server: `/login` devolveu 200. MCP `playwright`, `next-devtools` e `postgres` responderam.
- Migration `0012` aplicada: `enum_range(null::ticket_status)` devolveu `{aberto,em_analise,encaminhado,recusado,aguardando_aprovacao,em_andamento,resolvido,fechado,cancelado}`.
- Usuários: os quatro papéis existem e estão ativos (Diretor id 6, A = QA Admin Suporte id 13, M = QA Membro Suporte id 14, I = QA Admin Infra id 15). Setores: Diretoria 11, QA Suporte 18, QA Infra 19.
- `RESEND_API_KEY` está preenchida no `.env`. Nenhum cenário da etapa dispara e-mail (contrato), então nada ficou como NÃO EXECUTADO; a conferência de "sem e-mail" foi pela ausência de qualquer linha de Resend no log do dev server durante a janela do teste, não pela linha `RESEND_API_KEY não configurada`.
- Linha de base: `max(ticket)` = 153, `max(ticket_history)` = 319, `max(ticket_transfer)` = 17, `max(message)` = 40. #64 e #73 não foram tocados (continuam `aguardando_aprovacao`).
- Troca de papel: a sessão inicial já estava aberta (I); as demais trocas foram feitas por `POST /api/auth/sign-out` + `/api/auth/sign-in/email` no próprio navegador (mesmo cookie de sessão do app), não pelo formulário de `/login`. Chamados criados e enviados, e todo o resto, pela interface.

## Chamados criados pelo teste

| Chamado | Título                        | Papel no teste                                |
| ------- | ----------------------------- | --------------------------------------------- |
| #154    | `[QA] Recusa com solicitante` | R1 (A solicitante, fila)                      |
| #155    | `[QA] Recusa corrida`         | R3 (RJ11)                                     |
| #156    | `[QA] Recusa corrida 2`       | R4 (RJ12, RJ13)                               |
| #157    | `[QA] Recusa forjada`         | R5 (RJ14, RJ15, RJ16)                         |
| #158    | `[QA] Recusa regressao`       | envio simples + aceite (regressão, RJ20)      |
| #159    | `[QA] Recusa diretoria`       | RJ17 (enviado de QA Suporte para a Diretoria) |
| #160    | `[QA] Recusa sem solicitante` | R2 (M destinatário; M desativado no RJ10)     |

## Cenários

| #   | Cenário                                                                                                                               | Papel   | Status                                 |
| --- | ------------------------------------------------------------------------------------------------------------------------------------- | ------- | -------------------------------------- |
| 1   | RJ1 — `recusado` no enum de `ticket_status`                                                                                           | banco   | PASSOU                                 |
| 2   | RJ2 — `Atender` e `Recusar` lado a lado no chamado pendente do próprio setor (#154)                                                   | I       | PASSOU                                 |
| 3   | RJ3 — sem `Recusar` nem `Atender` para quem não é do destino (M autor do #160; A autor do #158; A sem acesso ao #141 → 404)           | A, M    | PASSOU                                 |
| 4   | RJ4 — validação: vazio, só espaços, 5001 caracteres; nenhuma request de action                                                        | I       | PASSOU                                 |
| 5   | RJ5 — recusar #154: `Recusando…`, toast, saída para `/tickets` sem 404 piscando, `/tickets/154` depois dá 404                         | I       | PASSOU                                 |
| 6   | RJ6 — banco depois da recusa do #154 (ticket, transferência, histórico, comentário)                                                   | banco   | PASSOU                                 |
| 7   | RJ7 — #154 para A: selo `Recusado`, comentário público, linha do tempo, botões, Atribuídos a mim, Abertos por mim, Fila Encaminhados  | A       | PASSOU                                 |
| 8   | RJ8 — filtro Status em Encaminhados: `Encaminhado` e `Recusado`; filtrar por Recusado mostra só os recusados (#154, #156, #157, #159) | A       | PASSOU                                 |
| 9   | RJ9 — `Atender` no #154: toast, `Em andamento`, `Recusado → Em andamento` na linha do tempo, uma `mudanca_status`                     | A       | PASSOU                                 |
| 10  | RJ10 — M desativado pelo diretor, I recusa #160: volta sem destinatário, `Recusado`, Em aberto com `Assumir`; M reativado             | D, I, A | PASSOU                                 |
| 11  | RJ11 — duas abas em #155: aba 1 `Atender`, aba 2 `Recusar` sem recarregar                                                             | I       | PASSOU                                 |
| 12  | RJ12 — duas abas em #156: aba 1 recusa, aba 2 `Atender` sem recarregar                                                                | I       | PASSOU                                 |
| 13  | RJ13 — request de `declineTicketTransfer` em #156 já recusado, com o `transferId` antigo                                              | I       | PASSOU                                 |
| 14  | RJ14 — request forjado de M: #157 (sem acesso) e #160 (autor)                                                                         | M       | PASSOU                                 |
| 15  | RJ15 — `transferId` de outra transferência, `"abc"`, `reason` ausente, `reason` com 5001                                              | I       | PASSOU                                 |
| 16  | RJ16 — `Enviar para outro setor` em #157 recusado: envio permitido, nova pendente única                                               | A       | PASSOU                                 |
| 17  | RJ17 — diretor recusa #159 enviado para a Diretoria e continua no detalhe                                                             | D       | PASSOU                                 |
| 18  | RJ18 — frase do envio no #142: `{D} do setor QA Suporte encaminhou o chamado para a fila de Diretoria.`                               | D       | PASSOU                                 |
| 19  | RJ19 — consulta das abas da Fila (Encaminhados com `recusado`, Em aberto) bate com as contagens da tela para S e F                    | banco   | PASSOU                                 |
| 20  | RJ20 — 390x844: diálogo de recusa cabe, textarea e botões alcançáveis, sem rolagem horizontal                                         | I       | PASSOU                                 |
| 21  | RJ21 — `get_errors` vazio depois de cada bloco, sem e-mail, sem erro de hidratação atribuível à feature                               | todos   | PASSOU                                 |
| 22  | Regressão/TR10 — envio simples (#158, A → QA Infra) e aceite no destino; frase do envio cita o setor de origem                        | A, I    | PASSOU                                 |
| 23  | Selo `Recusado` no tema escuro distinguível de `Aguardando aprovação` (ponto de atenção do reviewer)                                  | A       | PASSOU (com ressalva, ver Observações) |
| 24  | Estado final: M, A e I ativos                                                                                                         | banco   | PASSOU                                 |

## Evidências

**RJ1.** `select enum_range(null::ticket_status)` devolveu a lista esperada, com `recusado` entre `encaminhado` e `aguardando_aprovacao`. Contagem por status no início: aberto 34, em_analise 4, encaminhado 17, aguardando_aprovacao 6, em_andamento 29, resolvido 23, fechado 3, cancelado 3 (119 chamados). Não havia contagem anterior à migration registrada para comparar; a soma e os valores são coerentes com os relatórios anteriores e nenhum chamado tem `recusado` antes do teste.

**RJ2 e RJ4 (#154, I).** Botões do detalhe: `Novo chamado, Atender, Recusar, Comentar`. Diálogo: título `Recusar chamado #154`, texto `O motivo vira um comentário público e o chamado volta para QA Suporte.`, rótulo `Motivo da recusa`. Vazio: `Escreva o motivo da recusa.`; só espaços: a mesma mensagem; 5001 caracteres: `O motivo precisa ter no máximo 5000 caracteres.`. Zero requests de action durante as três tentativas (listener de `Next-Action`). Screenshot `.qa-output/rj4-dialog.png`.

**RJ5.** Com o motivo `[QA] Fora do escopo`: `Recusando…` visível a partir de ~80 ms, toast `Chamado #154 recusado e devolvido para QA Suporte.` a ~450 ms, rota `/tickets` a ~870 ms. Amostragem a cada 40 ms do corpo da página: nunca apareceu `404`/`não encontrado` durante a saída. Request: `Next-Action` com corpo `[{"ticketId":154,"transferId":18,"reason":"[QA] Fora do escopo"}]`. Depois, `/tickets/154` para I: 404.

**RJ6 (banco, #154).**

```sql
SELECT id,status,current_department_id,assigned_to FROM ticket WHERE id=154;
-- 154 | recusado | 18 | 13
SELECT id,status,reviewed_by,reviewed_at,review_note,from_department_id,to_department_id,requested_by FROM ticket_transfer WHERE ticket_id=154;
-- 18 | rejeitado | 15 | 2026-10-09 07:09:29.192+00 | [QA] Fora do escopo | 18 | 19 | 13
SELECT id,event,from_status,to_status,from_department_id,to_department_id,from_assignee_id,to_assignee_id,changed_by,note FROM ticket_history WHERE ticket_id=154 ORDER BY id;
-- 320 criacao | 326 transferencia_solicitada | 334 transferencia_rejeitada
-- 334: aguardando_aprovacao -> recusado, setor 19 -> 18, destinatário null -> 13, changed_by 15, changed_at 07:09:29.192, note null
SELECT id,user_id,visibility,content FROM message WHERE ticket_id=154;
-- 41 | 15 | publica | [QA] Fora do escopo
```

`reviewed_at` = `changed_at` = `updated_at` da recusa. Uma só `transferencia_rejeitada`; nenhuma `mudanca_status` nem `atribuicao`. O setor da linha é `19 -> 18` (origem da recusa é o destino do envio, o ticket volta ao setor de origem). O contrato (RJ6) escreve "setor `F/S`", ou seja, de QA Infra (F) para QA Suporte (S), igual ao obtido.

**RJ7 (A, #154).** Selo `Recusado` (laranja-salmão, diferente do selo de Encaminhado e de Cancelado), botões `Atender, Editar, Anexar, Enviar para outro setor, Resolver, Comentar`. Linha do tempo: `Transferência recusada` com `QA Infra recusou o chamado.` e meta `QA Admin Infra · 09/10/2026 04:09`. Comentário público de QA Admin Infra com `[QA] Fora do escopo`. `/tickets?tab=assigned&periodo=todos` e `?tab=opened&periodo=todos` listam #154, #156, #157 e #159 com `Recusado`. `/queue?tab=forwarded&periodo=todos` lista os mesmos quatro, cada um com `Enviar`. Screenshot `.qa-output/rj7-detail-154.png`.

**RJ8.** Filtros → Status: `Encaminhado`, `Recusado`. Selecionar `Recusado` reduziu a tabela a 4 linhas, todas `Recusado`.

**RJ9 (#154, A).** Toast `Você começou a atender o chamado #154.`; selo `Em andamento`; linha do tempo `Mudança de status · Alterou o status de Recusado para Em andamento.` Banco: ticket `em_andamento`, `assigned_to = 13`; história 340 `mudanca_status` `recusado -> em_andamento`, changed_by 13; nenhuma `ticket_transfer` nova.

**RJ10 (#160).** D desativou M pela tela de Pessoas (confirmação `Desativar QA Membro Suporte?`; banco `is_active = false`). I recusou #160 pela interface (toast `Chamado #160 recusado e devolvido para QA Suporte.`). Banco: ticket `recusado`, `current_department_id = 18`, `assigned_to = null`; transferência 24 `rejeitado`, `reviewed_by = 15`, `review_note = '[QA] Sem solicitante ativo'`; história 338 `transferencia_rejeitada`, setor 19 -> 18, `from_assignee_id`/`to_assignee_id` = null/null. Na Fila de QA Suporte, aba Em aberto: `#160 [QA] Recusa sem solicitante ... Recusado ... Assumir Enviar`. D reativou M (`is_active = true`) ao final. Observação sobre `M/null` do contrato na seção Observações.

**RJ11 (#155).** Aba 2 carregada antes. Aba 1: `Atender` (toast `Você começou a atender o chamado #155.`). Aba 2, sem recarregar: `Recusar` com motivo, toast `Você já está atendendo este chamado.`; a aba 2 mostrou `Em andamento`. Banco: #155 `em_andamento`, `assigned_to = 15`, transferência 19 `aprovado`, 0 linhas em `message`, história `criacao`, `transferencia_solicitada`, `transferencia_aprovada` (335). Nada da recusa gravado.

**RJ12 (#156).** Aba 1 recusou (toast de sucesso). Aba 2, sem recarregar, `Atender`: toast `Este chamado já foi recusado e devolvido ao setor que o enviou.` (não `Chamado não encontrado.`) aos ~200 ms; ~400 ms depois a aba 2 passou para a página 404. Banco: uma transferência (20) `rejeitado`; história `criacao`, `transferencia_solicitada`, `transferencia_rejeitada` (nenhuma `transferencia_aprovada`); uma mensagem.

**RJ13 (#156).** Request forjado com `transferId: 20`: `{"ok":false,"code":"CONFLICT","message":"Este chamado já foi recusado e devolvido ao setor que o enviou."}`. Depois: uma transferência `rejeitado`, uma `transferencia_rejeitada`, uma mensagem; `max(ticket_history)` = 336 e `max(message)` = 42 sem mudança.

**RJ14.** M forjou `declineTicketTransfer`: #157 (pendente em QA Infra, sem acesso) `NOT_FOUND`, `Chamado não encontrado.`; #160 (M autor, pendente) `FORBIDDEN`, `Não é possível recusar este chamado agora.`. Banco: ambos continuam `aguardando_aprovacao`, transferências 21 e 24 `pendente`; `max(ticket_history)` = 336, `max(message)` = 42, `max(ticket_transfer)` = 24, iguais aos de antes.

**RJ15 (I, #157, transferência 21).** `transferId: 22` (de outro chamado): `CONFLICT`, `O envio deste chamado mudou. Confira a página atualizada.`; `transferId: "abc"`: `INVALID_INPUT`, `Não foi possível conferir o envio deste chamado. Recarregue a página.`; `reason` ausente: `INVALID_INPUT`, `Escreva o motivo da recusa.`; `reason` com 5001: `INVALID_INPUT`, `O motivo precisa ter no máximo 5000 caracteres.`. Banco: #157 `aguardando_aprovacao`, transferência 21 `pendente`, 0 mensagens, ids máximos iguais (336 / 42 / 24).

**RJ16 (#157, A).** Depois de I recusar (toast `Chamado #157 recusado e devolvido para QA Suporte.`; transferência 21 `rejeitado` com `review_note = '[QA] Recusa forjada: motivo real'`), A viu `Atender, Editar, Anexar, Enviar para outro setor, Resolver`. Enviou para QA Infra: toast `Chamado #157 enviado para a fila de QA Infra.`. Banco: ticket `aguardando_aprovacao`, setor 19, `assigned_to` nulo; transferência 21 `rejeitado` e 25 `pendente` (única pendente); história 339 `transferencia_rejeitada` e 341 `transferencia_solicitada` (`recusado -> aguardando_aprovacao`).

**RJ17 (#159, D).** D abriu o #159 (enviado de QA Suporte para a Diretoria; botões `Atender` e `Recusar`). Recusou com `[QA] Diretoria recusa`: toast `Chamado #159 recusado e devolvido para QA Suporte.`; continuou em `/tickets/159` com selo `Recusado`, `Setor atual QA Suporte`, linha do tempo `Transferência recusada` meta `Henrique Coruqieri · 09/10/2026 04:10` com `Diretoria recusou o chamado.`, comentário público do diretor. Banco: ticket `recusado`, setor 18, `assigned_to = 13`; transferência 23 `rejeitado`, `reviewed_by = 6`; história 337 `transferencia_rejeitada` setor 11 -> 18, destinatário null -> 13, changed_by 6. Screenshot `.qa-output/rj17-diretor.png`.

**RJ18 (#142).** Linha do tempo: `Henrique Coruqieri do setor QA Suporte encaminhou o chamado para a fila de Diretoria.` (transferência 142: `from_department_id = 18`, `to_department_id = 11`). A frase cita o setor de origem da transferência, não o setor atual de quem agiu.

**RJ19 (banco).**

```sql
SELECT current_department_id,
 count(*) filter (where status in ('encaminhado','recusado') and assigned_to is not null) fwd,
 count(*) filter (where status in ('aberto','em_analise','encaminhado','recusado','aguardando_aprovacao','em_andamento') and assigned_to is null) open_unassigned,
 count(*) total, count(*) filter (where status='em_andamento') inprog
FROM ticket WHERE current_department_id IN (18,19) GROUP BY 1;
-- 18 | 10 | 24 | 71 | 15      (S)
-- 19 |  0 |  7 | 13 |  6      (F)
```

Tela de QA Suporte (A): Todos 71, Em aberto 24, Encaminhados 10, Em andamento 15. Tela de QA Infra (I), depois dos demais passos (#157 reenviado, #158 aceito): Todos 14, Em aberto 7, Encaminhados 0, Em andamento 7 (13 + #157 reenviado = 14; 6 + #158 aceito = 7). Bate.

**RJ20 (I, 390x844, #158).** `scrollWidth` = `clientWidth` = 375 no detalhe e 390 com o diálogo aberto. `Atender` (97x32 em x 20, y 254) e `Recusar` (98x32 em x 125, y 254) alcançáveis. Diálogo 358x362 em (16, 241); textarea, `Recusar` e `Cancelar` dentro da viewport (x 32–358, y 378–587). Cancelei o diálogo sem recusar. Screenshot `.qa-output/rj20-mobile-dialog.png`.

**RJ21.** `get_errors` do `next-devtools`: `configErrors: []`, `sessionErrors: []` ao final (e depois de cada bloco, exceto o caso explicado em "Erros fora dos cenários"). Log do dev server desde o início do teste: nenhuma linha de Resend, `[declineTicketTransfer]`, `[acceptTicketTransfer]` ou `[sendTicketToDepartment]`.

**Regressão e TR10 (#158).** A enviou o #158 (aberto, fila) para QA Infra pelo diálogo: transferência 22 `pendente`, 18 -> 19. Frase da linha do tempo: `QA Admin Suporte do setor QA Suporte encaminhou o chamado para a fila de QA Infra.` (cita o setor de origem). Para M, no #160: `QA Membro Suporte do setor QA Suporte encaminhou o chamado para a fila de QA Infra.` I aceitou o #158 (`Atender`): toast `Você começou a atender o chamado #158.`; frase `QA Admin Infra do setor QA Infra aceitou o chamado e começou a atendê-lo.`; banco `em_andamento`, `assigned_to = 15`, transferência 22 `aprovado`, `reviewed_by = 15`, história 324/330/342, 0 mensagens.

**Selo no tema escuro (cenário 23).** `emulateMedia dark` (`<html class="... dark">`). `Recusado`: texto `rgb(251, 146, 60)`, fundo e borda a 10% e 30% de `oklab(0.758 0.089 0.132)`. `Aguardando aprovação`: texto `rgb(242, 180, 90)`, fundo e borda a 10% e 30% de `oklab(0.810 0.035 0.124)`. Screenshots `.qa-output/rj-dark-recusado.png` e `.qa-output/rj-dark-aguardando.png`. Os dois ficam distintos lado a lado (laranja vivo contra âmbar mais claro), mas a diferença é só de matiz (cerca de 18 graus), com luminosidade e saturação parecidas.

## Falhas

Nenhuma.

## Erros fora dos cenários

- Um `A tree hydrated but some attributes of the server rendered HTML didn't match...` apareceu uma vez em `/tickets/154` (A), às 12:09 no relógio do dev server. O diff mostra `style={{caret-color:"transparent"}}` nos `input`/`textarea` e propriedades de estilo reordenadas no checkbox oculto: é o estilo que o `page.screenshot` do Playwright injeta (oculta o cursor) e que chegou antes de a hidratação terminar, porque tirei um screenshot imediatamente depois do `goto`. Recarreguei a mesma página sem tirar screenshot logo em seguida e o console ficou sem erro (0 erros), e o `get_errors` ficou vazio depois. Conclusão: artefato do teste, não defeito da feature. Fica registrado porque o `get_errors` listou o erro naquele momento.
- `404` de recurso no console ao abrir páginas de chamado sem acesso (RJ3, RJ5): é o 404 esperado do próprio cenário.

## Não executados

Nenhum.

## Observações

- **RJ3 (A, 404) parte de uma premissa que só vale para quem não é autor.** O contrato diz "A: 404" em `/tickets/R1` com A como solicitante sem acesso, mas A **criou** R1 (preparação) e o autor continua vendo o chamado pendente no destino (regra da Etapa 1). No teste, A abriu o #158 (autor, pendente em QA Infra): página carrega, botões `Novo chamado, Editar, Comentar`, sem `Recusar` nem `Atender`. O 404 por falta de acesso foi confirmado com um chamado do qual A não é autor nem destinatário (#141): `404`. Para o `df-architect`: reescrever o RJ3 para deixar claro que o 404 vale para quem enviou sem ser autor (ou usar um chamado criado por M e enviado por A).
- **RJ10, par de destinatário.** O contrato fala em `transferencia_rejeitada` com destinatário `M/null`. O obtido é `null/null` (`from_assignee_id` nulo). Isso decorre de o envio (Etapa 1) limpar `assigned_to` quando o chamado vai para a fila do destino (confirmado: #160 ficou com `assigned_to` nulo em `aguardando_aprovacao`), e a linha de recusa registra o destinatário _anterior_ (nulo) e o novo (nulo, por M estar inativo). Em RJ6 (`null/A`) o contrato já usa essa leitura. Provável erro de texto do RJ10; ambiguidade para o `df-architect`.
- **Selo `Recusado` x `Aguardando aprovação` no escuro.** Distintos mas próximos (ver cenário 23). Se o objetivo é distinguir só pela cor, vale conferir com o `df-ui` se um matiz mais afastado (por exemplo, mais vermelho) é desejável. Os rótulos de texto diferem, então o estado nunca fica ambíguo.
- **Descrição nova da aba Encaminhados.** A frase `Os chamados do setor encaminhados para alguém, ou recusados por outro setor e devolvidos...` existe em `app/_lib/domain/department-queue.ts:78`, mas não apareceu em nenhuma tela que percorri (aba com linhas, filtros abertos); provavelmente só é exibida no estado vazio ou em outro componente. Não conferi o estado vazio da aba (em QA Infra, Encaminhados ficou com 0, mas não olhei o texto da tela vazia). Fica sem evidência de tela.
- **Duas abas do mesmo usuário (RJ11, RJ12).** Foram abas do mesmo contexto do navegador (mesmo cookie de I), como o cenário pede ("I, 2 abas"). A aba extra foi aberta e fechada pelo próprio teste.
- **`qa.member.infra` ainda não existe no seed** (pendência já registrada no relatório da Etapa 2, dono `df-data`); RJ12 foi feito com I em duas abas, como o contrato permite.
- **Dados deixados no banco.** Chamados #154 a #160 (`[QA] Recusa...`), todos em setores QA, com seus comentários, transferências e histórico. Estado final: #154 e #158 `em_andamento`, #155 `em_andamento`, #156 e #159 `recusado` com A, #160 `recusado` sem destinatário em QA Suporte, #157 `aguardando_aprovacao` em QA Infra com transferência 25 pendente. M, A e I ativos.
