# Relatório de testes — Envio para outro setor, Etapa 2 (aceite no destino)

- **Data:** 2026-10-09
- **Contrato:** `docs/contracts/department-transfer.md` (seção "Etapa 2" e cenários AC1–AC12); ADR `docs/adr/016-transfer-moves-ticket-before-acceptance.md`
- **Commit:** `3bd4401` · alterações não comitadas: sim (14 arquivos da Etapa 2 e docs)
- **Ambiente:** `http://localhost:3000`, `next dev`, banco de desenvolvimento
- **Resultado:** 17 de 17 passaram · 0 falharam · 0 bloqueados · 0 não executados

## Pré-requisitos

- Dev server: `/login` devolveu 200. MCP `playwright`, `next-devtools` e `postgres` responderam.
- Usuários: os quatro papéis existem e estão ativos (`qa.admin.infra` reativado). O seed não tem `qa.member.infra` (ver "Observações" sobre o AC8b).
- `RESEND_API_KEY` está preenchida no `.env`. Nenhum cenário da etapa dispara e-mail (contrato: "Nenhum, em nenhuma etapa"), então nada ficou como NÃO EXECUTADO. A conferência de "sem e-mail" no AC12 foi só pela ausência de erro e de chamada a Resend no log do dev server, não pela linha `RESEND_API_KEY não configurada`.
- Estado de partida: M = QA Membro Suporte (id 14), A = QA Admin Suporte (13), I = QA Admin Infra (15), D = Diretor (6). Setores: Diretoria 11, QA Suporte 18, QA Infra 19. `max(ticket_history)` = 304 e `max(ticket_transfer)` = 15. Linha de base de M em Meus chamados (Todos): Abertos por mim 42, Aguardando aprovação 8.
- Chamados criados pelo teste: #150 `[QA] Aceite atender antigo`, #151 `[QA] Aceite envio simples`, #152 `[QA] Aceite corrida de duas pessoas`. Não toquei em #64, #73 nem #149.

## Cenários

| #   | Cenário                                                                                                                    | Papel | Status |
| --- | -------------------------------------------------------------------------------------------------------------------------- | ----- | ------ |
| 1   | AC1 — botão `Atender` no chamado aguardando aprovação do próprio setor (#141)                                              | I     | PASSOU |
| 2   | AC2 — aceitar: toast, selo `Em andamento`, destinatário, fim do aviso, frase da linha do tempo                             | I     | PASSOU |
| 3   | AC3 — banco após o aceite (#141, #145, #151, #66 legado)                                                                   | banco | PASSOU |
| 4   | AC4 — chamado sai de "Aguardando aprovação", não entra em "Abertos por mim", abre pela busca; consulta de conferência bate | M     | PASSOU |
| 5   | AC5 — em "Atribuídos a mim" e na Fila de QA Infra, aba "Em andamento"                                                      | I     | PASSOU |
| 6   | Quem não é do destino não vê `Atender`: autor de outro setor (#141 antes do aceite, #143) e admin de outro setor (#147)    | M, A  | PASSOU |
| 7   | AC6 — diretor, que não é de QA Infra, sem `Atender` no #144                                                                | D     | PASSOU |
| 8   | AC7 — diretor aceita chamado enviado para a Diretoria (#142)                                                               | D     | PASSOU |
| 9   | Membro do destino também vê `Atender` (#152, M em QA Suporte)                                                              | M     | PASSOU |
| 10  | AC8 — duas abas do mesmo usuário em #144                                                                                   | I     | PASSOU |
| 11  | AC8b — duas pessoas do destino (A e M, QA Suporte) em #152, a segunda sem recarregar                                       | A, M  | PASSOU |
| 12  | AC9 — request forjado de `acceptTicketTransfer` por M (autor, setor de origem) em #143                                     | M     | PASSOU |
| 13  | AC10 — `transferId` de outra transferência, `"abc"` e `0`                                                                  | I     | PASSOU |
| 14  | AC11 — `Atender` antigo do destinatário em `encaminhado` (#150)                                                            | A     | PASSOU |
| 15  | Regressão da Etapa 1 — envio simples (#151 aberto, de QA Suporte para QA Infra) e depois aceite no destino                 | A, I  | PASSOU |
| 16  | Responsivo 390x844 — cabeçalho do #145 com `Atender` e depois do aceite, sem rolagem horizontal                            | I     | PASSOU |
| 17  | AC12 — `get_errors` vazio depois de cada bloco; sem erro de hidratação nem de runtime                                      | todos | PASSOU |

## Evidências

**AC1 e AC2 (#141, I).** Antes: botões `Novo chamado, Atender, Comentar`, selo "Aguardando aprovação". Depois do clique: toast `Você começou a atender o chamado #141.`, selo `Em andamento`, destinatário `QA Admin Infra`, o aviso de pendência sumiu, botões `Anexar, Enviar para outro setor, Resolver`. Linha do tempo: `QA Admin Infra do setor QA Infra aceitou o chamado e começou a atendê-lo.` (rótulo `Transferência aprovada`, meta só com a data). Request capturado: `Next-Action` com corpo `[{"ticketId":141,"transferId":9}]`.

**AC3 (banco).**

```sql
SELECT status, assigned_to, current_department_id FROM ticket WHERE id = 141;
-- em_andamento | 15 | 19
SELECT id, status, reviewed_by, reviewed_at, from_department_id, to_department_id, review_note FROM ticket_transfer WHERE ticket_id = 141;
-- 9 | aprovado | 15 | 2026-10-09 06:27:02.5+00 | 18 | 19 | null
SELECT id, event, from_status, to_status, from_department_id, to_department_id, from_assignee_id, to_assignee_id, changed_by, changed_at FROM ticket_history WHERE ticket_id = 141 ORDER BY id;
-- 289 criacao | 296 transferencia_solicitada | 310 transferencia_aprovada
-- 310: aguardando_aprovacao -> em_andamento, 18 -> 19, assignee null -> 15, changed_by 15, changed_at 2026-10-09 06:27:02.5+00
```

`reviewed_at` = `updated_at` = `changed_at` da linha 310. Uma só `transferencia_aprovada` por chamado (consulta com `count` nos ids 66, 141, 142, 144, 145, 151, 152: 1 em cada). Mesmo resultado nos demais: #145 e #144 (`em_andamento`, assignee 15, transferência `aprovado`), #151 e #66 (18 -> 19, status `aguardando_aprovacao -> em_andamento`, `reviewed_at` igual ao `changed_at`). O #66 é legado da migration 0011 e a linha `transferencia_solicitada` antiga não atrapalhou o aceite. Sem `mudanca_status` nem `atribuicao` extra.

**AC4 (M).** Consulta de conferência do banco (`created_by = 14`):

- `status = 'aguardando_aprovacao'`: 5 chamados (66, 68, 70, 143, 151). A tela mostra exatamente estes 5 ids, contagem "Aguardando aprovação 5" (eram 8 antes dos aceites e do envio do #151).
- aceitos fora do setor de origem e fora de `aguardando_aprovacao`: 141, 142, 144, 145. Nenhum aparece em "Abertos por mim" (43 chamados na tela; a consulta de `current_department_id = origin_department_id` com status ativo também dá 43) nem em "Aguardando aprovação".
- Busca do topo por `141` devolve `#141 [QA] Envio fila · Em andamento` e abre `/tickets/141`.

**AC5 (I).** `/tickets?tab=assigned&periodo=todos` lista #141 (`QA Infra · Em andamento`); `/queue?tab=in_progress` lista #141 com `Enviar`. O contador "Em andamento" da fila ficou em 1.

**Cenário 6.** M (QA Suporte, autor) em #141 antes do aceite: botões `Editar` bloqueado ("Aguarde a solução ou devolutiva de QA Infra"), sem `Atender`. M em #143: `Editar`, sem `Atender`. A em #147 (autor-cadastrador, QA Suporte): `Editar` bloqueado, sem `Atender`; A em #141: 404 (sem acesso).

**AC6 e AC7 (D).** #144: sem `Atender` (botões `Novo chamado, Comentar`). #142 (pendente para a Diretoria): `Atender` presente; clique → toast `Você começou a atender o chamado #142.`, `Em andamento`, destinatário Henrique Coruqieri, frase `Henrique Coruqieri do setor Diretoria aceitou o chamado e começou a atendê-lo.` Banco: ticket `em_andamento`, `assigned_to = 6`, `current_department_id = 11`; transferência 11 `aprovado` com `reviewed_by = 6`; linha 307 `transferencia_aprovada` de/para setor 18/11, status `aguardando_aprovacao/em_andamento`, assignee `null/6`.

**AC8 (I, duas abas, #144).** Aba 2 carregada antes. Aba 1: toast `Você começou a atender o chamado #144.` Aba 2, sem recarregar: toast `Você já está atendendo este chamado.`, a página passou para `Em andamento` com `Anexar, Enviar para outro setor, Resolver`. Banco: uma transferência `aprovado` (id 10, `reviewed_by = 15`) e uma `transferencia_aprovada` (id 311).

**AC8b (A e M, #152).** Chamado criado por I em QA Infra e enviado para QA Suporte pela tela. Como o navegador compartilha cookies entre abas, os dois logins foram simulados com troca de cookie: M abriu o #152 e ficou com a página parada (viu `Atender`), A fez login, abriu o #152 e aceitou (toast `Você começou a atender o chamado #152.`), o cookie de M foi restaurado e M clicou `Atender` na página antiga. M: toast `Este chamado já foi aceito e agora está com QA Admin Suporte.`; a página de M atualizou para `Em andamento` sem `Atender`. Banco: `assigned_to = 13`, transferência 17 `aprovado` com `reviewed_by = 13`, uma só `transferencia_aprovada` (315), assignee `null/13`. Não é uma corrida em milissegundos: é o cenário "segunda pessoa com a página velha" do contrato.

**AC9 (M, #143, transferência 13).** Request forjado a `/tickets/143` com `Next-Action` do `acceptTicketTransfer`: resposta `{"ok":false,"code":"FORBIDDEN","message":"Não é possível atender este chamado agora."}`. Banco: #143 continua `aguardando_aprovacao`, `assigned_to` nulo, transferência 13 `pendente`; `max(ticket_history)` = 315 e `max(ticket_transfer)` = 17 iguais aos de antes do request.

**AC10 (I, #145 pendente, transferência 14).** `transferId: 9` (de outro chamado): `{"ok":false,"code":"CONFLICT","message":"O envio deste chamado mudou. Confira a página atualizada."}`. `transferId: "abc"` e `0`: `INVALID_INPUT` com `Não foi possível conferir o envio deste chamado. Recarregue a página.` Banco após os três: #145 ainda `aguardando_aprovacao`, transferência 14 `pendente`, 2 linhas de histórico; `max(ticket_history)` = 310 e `max(ticket_transfer)` = 16 sem mudança.

**AC11 (A, #150).** Chamado criado por M com destinatário A (`encaminhado`). `Atender` → toast `Você começou a atender o chamado #150.`, `Em andamento`. Banco: `assigned_to = 13`, histórico `criacao` (305) e `mudanca_status` encaminhado → em_andamento (308), nenhuma `ticket_transfer` do chamado.

**Regressão da Etapa 1 (#151).** M abriu na fila de QA Suporte; A abriu o diálogo "Enviar chamado #151 para outro setor", escolheu QA Infra, `Enviar` → toast `Chamado #151 enviado para a fila de QA Infra.`, A saiu para `/tickets` (perdeu o acesso, `keepsAccess` falso). Banco: ticket `aguardando_aprovacao`, `current_department_id = 19`, `assigned_to` nulo; transferência 16 `pendente` 18 -> 19 `requested_by = 13`; história `criacao` e `transferencia_solicitada` (aberto → aguardando_aprovacao, setor 18 → 19). Em seguida I aceitou o #151 (ver AC3).

**Responsivo (I, 390x844, #145).** `scrollWidth` = `clientWidth` = 375 antes e depois do aceite (sem rolagem horizontal). `Atender` com caixa 96x32 em (20, 254), alcançável abaixo do título. Screenshot em `.qa-output/etapa2-mobile-145.png`.

**AC12.** `get_errors` do `next-devtools` devolveu `configErrors: []` e `sessionErrors: []` depois de cada bloco e ao final. O `get_logs` não mostra erro, aviso de hidratação, `[acceptTicketTransfer]`, `[sendTicketToDepartment]` nem chamada a Resend durante a janela do teste.

## Falhas

Nenhuma.

## Erros fora dos cenários

- `⚠ Blocked cross-origin request to Next.js dev resource /_next/hmr from "127.0.0.1"` no log do dev server. Foi causado pelo próprio teste: tentei abrir uma segunda sessão em `http://127.0.0.1:3000` para o AC8b, o formulário de login não foi hidratado e submeteu por GET (a senha de teste foi parar na URL daquela aba, que foi fechada). Isso é o comportamento padrão do `allowedDevOrigins` do Next em desenvolvimento e não é defeito da feature. Troquei por simulação com cookies (ver AC8b).

## Não executados

Nenhum. A Etapa 3 (Recusar, `recusado`) não foi avaliada, como combinado.

## Observações

- **AC8b sem `QA Membro Infra`.** O seed não tem esse usuário; em vez de usar duas pessoas de QA Infra, enviei um chamado de I para QA Suporte e usei A (admin) e M (membro), que cobrem a mesma regra: duas pessoas distintas do mesmo destino, e a segunda com a página velha. O contrato recomenda acrescentar `qa.member.infra` ao seed; continua pendente (dono: `df-data`).
- **Frase do envio pela Diretoria.** No #142 a linha do tempo diz `Henrique Coruqieri do setor Diretoria encaminhou o chamado para a fila de Diretoria.`: o diretor enviou um chamado que estava em QA Suporte para a própria Diretoria, e a frase usa o setor atual de quem agiu (como o contrato manda, `describeActorWithDepartment`). Está conforme o contrato, mas lê de forma estranha; fica para o `df-architect` decidir se vale um caso especial (destino igual ao setor de quem agiu).
- **Aceite sem "Anexar" desabilitado.** Depois do aceite a Conclusão mostra `Anexar` com "Anexos estarão disponíveis em breve" e `Enviar para outro setor`: igual ao previsto no contrato ("a Conclusão com o formulário de resolver"). Nada a registrar.
- **Menu de usuário.** Em 1280 px o botão de sair fica no rodapé do menu lateral (não no cabeçalho). Só afeta como automatizar o teste.
