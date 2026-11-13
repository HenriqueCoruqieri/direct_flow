# Relatório de testes — Operação: TMR e quantidade de chamados em atraso (Etapa B)

- **Data:** 2026-11-12 (execução entre 01:07Z e 01:22Z de 2026-11-13)
- **Contrato:** `docs/contracts/operations-tmr-overdue.md` (TO1–TO25)
- **Commit:** `43a5373` · alterações não comitadas: sim (`department-goals-dialog.tsx`, `goal-adherence-badge.tsx`, `goal-gauge.tsx` no working tree; `data/department-goals.ts`, `data/queue-waits.ts`, `data/tickets.ts`, `db/seed.ts` no stage)
- **Ambiente:** `http://localhost:3000`, `next dev`, banco de desenvolvimento (migrations 0027 e 0028 aplicadas)
- **Resultado:** 21 de 25 passaram · 3 passaram com ressalva (TO15, TO17, TO18) · 0 falharam · 0 bloqueados · 1 não executado (TO16)
- **Papéis:** Diretor `diretorqa@gmail.com` (sessão já aberta no Chrome do servidor MCP), Admin Suporte `cazalbe@gmail.com` e Membro Suporte `rodalv@gmail.com` (um login cada, em contextos isolados do mesmo navegador, para poder alternar entre os papéis sem novo login). `.env` não foi lido (a checagem de `RESEND_API_KEY` não foi feita; nenhum cenário depende de e-mail).
- **get_errors do dev server:** vazio (`configErrors` e `sessionErrors` sem entradas) antes, durante e depois dos cenários.

## Pré-requisitos

- `/login` devolveu 200; Playwright e `postgres` (`SELECT 1`) respondem; `next-devtools` descobriu o servidor na porta 3000.
- Usuários conferidos no banco, todos ativos: Diretor (id 21, Diretoria, admin), Carlos Alberto Jr (id 19, Suporte, admin), Álvaro Rodrigo (id 18, Suporte, member).
- Estado inicial anotado de `department_goal`: **Suporte (14)** = SLA 90 / TMA 8 / atraso 10h / chamados em atraso 20 / `tmr_max_hours` nulo; **QA Suporte (18)** = 80 / 12 / 24 / 3 / nulo. `department_due_hours` de Suporte e QA Suporte: 3/6/12/24 (não alterado nesta rodada).
- Nota: o setor de teste usado foi o **Suporte** (único com Diretor, Admin e Membro disponíveis); os chamados `[QA]` foram criados nele, como autorizado.

## Cenários

| #    | Cenário                                                                        | Papel          | Status                                                        |
| ---- | ------------------------------------------------------------------------------ | -------------- | ------------------------------------------------------------- |
| TO1  | Pós-migration: colunas de `department_goal`                                    | (SQL)          | PASSOU                                                        |
| TO2  | Equipe sem TMR: "Sem objetivo", gauge sem marcador                             | Diretor        | PASSOU                                                        |
| TO3  | Diálogo: limite preenchido, TMR vazio, erro ao salvar                          | Diretor        | PASSOU                                                        |
| TO4  | Validação de TMR e limite                                                      | Diretor        | PASSOU                                                        |
| TO5  | Salvar TMR 2 e limite 4                                                        | Diretor        | PASSOU                                                        |
| TO6  | Abrir sem destinatário: espera `abertura`                                      | Admin          | PASSOU                                                        |
| TO7  | Abrir com destinatário: nenhuma espera                                         | Admin          | PASSOU                                                        |
| TO8  | Assumir fecha a espera                                                         | Admin          | PASSOU                                                        |
| TO9  | Enviar a colega fecha a espera                                                 | Admin          | PASSOU                                                        |
| TO10 | Resolver fecha a espera                                                        | Admin          | PASSOU                                                        |
| TO11 | Enviar S→T: fecha origem, abre `transferencia_recebida`                        | Admin          | PASSOU                                                        |
| TO12 | Aceitar em T                                                                   | Diretor        | PASSOU                                                        |
| TO13 | Recusar em T                                                                   | Diretor        | PASSOU                                                        |
| TO14 | Atos no recusado (Atender, Enviar a colega, reenviar, resolver, editar título) | Admin          | PASSOU                                                        |
| TO15 | TMR de T e de S depois de TO11–TO14                                            | Diretor        | PASSOU (ressalva: T só por SQL)                               |
| TO16 | Setor sem nenhuma espera no mês: `0h`, Aderente                                | —              | NÃO EXECUTADO                                                 |
| TO17 | Espera aberta pesa até agora                                                   | Membro         | PASSOU (ressalva: resolução em minutos esconde o crescimento) |
| TO18 | Chamados em atraso: quem conta e quem não                                      | Diretor        | PASSOU (ressalva: nenhum cancelado no Suporte)                |
| TO19 | Enviar chamado já vencido S→T                                                  | Admin          | PASSOU                                                        |
| TO20 | Recusado volta vencido a S: conta uma vez                                      | Diretor, Admin | PASSOU                                                        |
| TO21 | Card Backlog do Início                                                         | Admin          | PASSOU                                                        |
| TO22 | Textos da Equipe                                                               | Diretor        | PASSOU                                                        |
| TO23 | Backfill de 3 chamados com envio e recusa                                      | (SQL)          | PASSOU                                                        |
| TO24 | Diretor com `?setor=` na Equipe                                                | Diretor        | PASSOU                                                        |
| TO25 | Membro vê os cinco cards e não edita                                           | Membro         | PASSOU                                                        |
| —    | Responsivo 390×844 na Equipe                                                   | Membro         | PASSOU                                                        |

## Evidência

**TO1.** `information_schema.columns` de `department_goal`: `id, department_id, sla_min_percent, tma_max_hours, overdue_hours_limit, overdue_tickets_limit, updated_by, created_at, updated_at, tmr_max_hours`. Sem `transfer_acceptance_min_percent` nem `backlog_limit`. Suporte seguiu com `overdue_tickets_limit = 20` (o valor que tinha como backlog; o exemplo do contrato diz 40, o dado real era 20) e `tmr_max_hours` nulo. Backfill: 237 esperas, 63 abertas (abertura 158/38 abertas, transferencia_recebida 63/16, devolucao_por_recusa 16/9). Invariantes (contrato): chamados com duas esperas abertas = 0; pendentes sem `transferencia_recebida` aberta = 0; espera aberta em chamado encerrado = 0.

**TO2.** Diretor, `/operations?aba=time&setor=14&periodo=mes`, antes de definir TMR. Card TMR: `26h 50min`, `Objetivo não definido`, selo `Sem objetivo`, `O objetivo deste indicador ainda não foi definido.`. Gauge sem marcador (`.qa-output/to2-team-before.png`; o card Quantidade de chamados em atraso, ao lado, tem marcador). Resumo: `Objetivo não atingido · não aderente em SLA, TMA e horas em atraso` (não cita TMR). A mesma tela em QA Suporte (também sem TMR) mostrou `Sem objetivo`.
SQL da conferência (`$start` = `2026-11-01 00:00-03`): 18 esperas, média 26,849h = 26h 50min; chamados em atraso = 17. Bate com a tela (card `17 chamados`, `Limite ≤ 20 chamados`, `Aderente`, `Folga de 3 chamados`).

**TO3.** Diálogo "Editar objetivos": campos `slaMinPercent 90`, `tmaMaxHours 8`, `overdueHoursLimit 10`, grupo "Objetivos da equipe": `Limite de chamados em atraso` = 20 (`chamados`) e `TMR máximo` (`h`) vazio com asterisco. Salvar sem preencher: `Informe o TMR máximo, em horas inteiras, a partir de 1.`

**TO4.** `.qa-output/to4-validation.png`. TMR 0 → `Informe o TMR máximo, em horas inteiras, a partir de 1.`; TMR 1000 → `O valor máximo é 999 horas.`; TMR 1.5 → `Informe o TMR máximo, em horas inteiras, a partir de 1.`; limite -1 → `Informe o limite de chamados em atraso, em chamados, a partir de 0.`; limite 10000 → `O valor máximo é 9.999 chamados.`. Diálogo ficou aberto em todos, e `department_goal` seguiu com 20/nulo até o TO5. (O `<input type=number>` não aceita digitar "1,5" pelo Playwright; foi usado "1.5".)

**TO5.** Limite 4 e TMR 2: toast `Objetivos gravados.`; banco `overdue_tickets_limit 4, tmr_max_hours 2, updated_by 21`. Depois de recarregar: `Quantidade de chamados em atraso 17 chamados`, `Limite ≤ 4 chamados`, `Não aderente`, `13 chamados acima do limite`; `TMR 26h 51min`, `Objetivo ≤ 2h`, `Não aderente`, `24h 51min acima do limite`.

**TO6, TO7.** `#302 [QA] TO6 fila sem destinatário` (Admin, sem destinatário): `ticket_queue_wait` = `abertura, department_id 14, started_at 01:09:24.924 = ticket.created_at, ended_at nulo`. `#303` (destinatário o próprio autor, `em_andamento`) e `#304` (destinatário Álvaro, `encaminhado`): nenhuma linha em `ticket_queue_wait`.

**TO8.** Assumir `#302`: `ended_at 01:10:15.873`, igual ao `atribuicao` (e `mudanca_status`) do histórico. `status em_andamento`.

**TO9.** `#305`, Enviar a Álvaro: `ended_at 01:10:29.765` = `atribuicao` do histórico; `status encaminhado`; nenhuma espera nova.

**TO10.** `#306`, Resolver pelo autor sem assumir: `ended_at 01:11:13.797` = `resolved_at` = `resolucao` no histórico; `status resolvido`.

**TO11.** `#307`: `abertura:14 01:09:56.369 → 01:12:43.619 ; transferencia_recebida:11 01:12:43.619 → aberta`, `ticket_transfer.created_at 01:12:43.619`. Mesma coisa em `#297`, `#298`, `#308–#313`: a espera da origem fecha no mesmo instante em que a da destino abre. Consulta de "duas abertas no mesmo chamado": 0 linhas, antes e depois de todos os atos.

**TO12.** `#307` aceito pelo Diretor: `transferencia_recebida` fechada em `01:13:40.728` = `reviewed_at`; nenhuma espera nova; `due_at = reviewed_at + 24h` (Baixa, Diretoria padrão). `#298` (Parte 2): fechada em `01:13:18.735`, `due_at 04:13:18.735` (Crítica, 3h).

**TO13.** `#297` e `#308–#313` recusados pelo Diretor. Exemplo `#308`: `transferencia_recebida:11 01:12:47.768 → 01:13:44.446` (`reviewed_at 01:13:44.446`, conta para a Diretoria) e `devolucao_por_recusa:14 01:13:44.446 → aberta`. `ticket.status recusado`, `current_department_id 14`. Fecha e abre no mesmo instante em todos os oito.

**TO14.** Todos pelo Admin (que é o solicitante, `assigned_to 19`):

- `#308` Atender: `devolucao_por_recusa` fechada `01:14:42.371` = `mudanca_status` (→ `em_andamento`).
- `#309` Atender: fechada `01:14:45.945` = `mudanca_status`. O botão "Assumir" não existe no recusado: o botão é "Atender" (observação 1).
- `#310` Resolver (campo Solução): fechada `01:14:49.393` = `resolucao`.
- `#311` Enviar a Álvaro: fechada `01:15:30.068` = `atribuicao`/`mudanca_status` → `encaminhado`.
- `#312` Editar só o título: `edicao` no histórico, `devolucao_por_recusa` **segue aberta** (`status recusado`). Depois "Atender": fechada `01:15:51.911`.
- `#313` Enviar para outro setor (Administrativo): `devolucao_por_recusa` fechada `01:15:34.125` = `transferencia_solicitada`; nova `transferencia_recebida` no setor 15 (Administrativo), aberta, mesmo instante; uma só aberta.

Ciclo de vida: nos 14 chamados `[QA]` desta rodada, `ticket.status` = `to_status` da última linha de `ticket_history` (consulta com 14 linhas `ok = true`).

**TO15.** Comparação tela × consulta do contrato, no mesmo minuto:

| Setor      | Tela (Equipe)          | SQL                                      |
| ---------- | ---------------------- | ---------------------------------------- |
| Suporte    | `TMR 13h 49min`        | 35 esperas, média 13,8219h = 13h 49min   |
| QA Suporte | `TMR 767h 12min`       | 44 esperas, média 767,2133h = 767h 12min |
| Diretoria  | (sem tela, ver abaixo) | 17 esperas, média 225,911h               |

A Diretoria não tem objetivos definidos, então a aba Equipe mostra só "Objetivos ainda não definidos". Definir objetivos nela não estava autorizado, então T só foi conferido por SQL. Ressalva registrada.

**TO16.** Não executado: só Suporte e QA Suporte têm objetivos (única forma de ver o card), e os dois têm esperas no mês (35 e 44). Não havia setor com objetivos e sem espera, e criar objetivos em outro setor não estava autorizado.

**TO17.** Espera aberta pesa até agora: leituras sucessivas do SQL no Suporte (2 abertas em 35): 13,8219h (01:14) → 13,8278h (01:16) → 13,8321h (01:21). Na tela, a única variação visível em minutos foi no início, com muitas esperas abertas antigas: `26h 50min` (01:07) → `26h 51min` (01:08). Na tela, depois, `13h 49min` nas três leituras (01:14, 01:19, 01:21), porque o crescimento (0,4min a cada 2min) não vira o minuto. Estado `Não aderente` (13h 49min > 2h) correto. Não foi possível exercitar a travessia do limite (aderente → não aderente) porque o TMR dos setores com objetivo já estava acima dele.

**TO18.** O mês do Suporte tem 4 resolvidos no prazo, 18 resolvidos fora do prazo no mês, 16 resolvidos fora do prazo em mês anterior, 0 cancelados. A tela mostra `20 chamados` e o SQL do contrato `20` (resolvidos tarde no mês + ativos vencidos `#300` + envios vencidos `#297`/`#298`, sem repetir). O resolvido no prazo e o de mês anterior não entram. Ressalva: não há chamado cancelado no setor (e não existe caminho de cancelamento).
QA Suporte: tela `110 chamados`, SQL `110`.

**TO19.** `#297` e `#298` (Crítica, Suporte, vencidos em 01:10:25Z e 01:10:29Z) enviados à Diretoria às 01:11:27Z e 01:11:36Z. `ticket_transfer`: `from_due_at` = `due_at` antigo, `from_assignee_id 19`. Contagem do Suporte passou de 17 para 19 e, na tela, `19 chamados` (`15 acima do limite`). Diretoria: `#298` aceito com `due_at 04:13Z`, não vencido, então não conta lá.

**TO20.** `#297` recusado volta ao Suporte vencido (`due_at` retomado `01:12:35.281`, já passado): é "ativo vencido" **e** "envio vencido" ao mesmo tempo; a união conta **uma vez** (sub-consulta de envios devolve 297 e 298; ativos vencidos devolvem 297 e 300; total 20 = tela). Depois, resolvido fora do prazo, continua contando uma vez.

**TO21.** Admin do Suporte, Início (período Hoje): `Backlog 11 chamados · 2 vencidos`; SQL: 11 chamados no Suporte em status de backlog (inclui `#301` aguardando aceite), 2 com `due_at < now()` (`#297`, `#300`); "Maiores atrasos" lista `#300` e `#297` por vencimento. Antes dos atos: `4 chamados` (3 ativos + `#301`), também coerente com o SQL. O card não mudou com os novos objetivos (`.qa-output/to21-admin-backlog.png`).

**TO22.** Equipe do Suporte: títulos `Quantidade de chamados em atraso` e `TMR`; contexto `Objetivos da equipe de novembro, de 1º/11 até hoje`; alvos `Limite ≤ 4 chamados` e `Objetivo ≤ 2h`; frase `17 chamados em atraso no mês: 13 chamados acima do limite de 4 chamados. TMR de 26h 51min: 24h 51min acima do limite de 2h.`; resumo `Objetivo não atingido · não aderente em SLA, TMA, horas em atraso, chamados em atraso e TMR`. Nenhuma ocorrência de "backlog", "aceite" ou "meta" nas telas Operação (Equipe e diálogo) conferidas.

**TO23.** Backfill: `#248` (abertura `22:56:18.898 → 22:56:43.922` = envio; `transferencia_recebida` `22:56:43.922 → 22:57:59.482` = `ticket_transfer.created_at`/`reviewed_at`; `devolucao_por_recusa` `22:57:59.482 → 22:58:21.597` = novo envio; segunda `transferencia_recebida` aberta, igual à transferência pendente), `#252` (devolução aberta, `status` ainda recusado) e `#289` (devolução `2026-11-10 16:31:41 → 2026-11-12 18:42:00.510` = `resolucao`; as `edicao` e `mudanca_empresa` do meio não fecharam). Todos batem; nenhum chamado com duas esperas abertas.

**TO24.** Diretor com `?aba=time&setor=14` e `setor=18`: TMR e chamados em atraso do setor escolhido (valores das tabelas acima).

**TO25.** Membro (`rodalv@gmail.com`), Equipe: cinco cards (`SLA no prazo, Tempo médio de resolução, Horas em atraso, Quantidade de chamados em atraso, TMR`), nenhum botão "Editar objetivos" (botões da página: só "Novo chamado"). Individual: só os três cards individuais (sem os dois da equipe). (`.qa-output/to25-member.png`.)

**Responsivo.** Equipe em 390×844 (Membro): `scrollWidth = clientWidth = 375` (sem rolagem horizontal; `.qa-output/to-resp-390.png`).

## Falhas

Nenhuma.

## Erros fora dos cenários

- `get_errors` do `next-devtools`: vazio em todas as consultas.
- Console: 404 esperado na primeira navegação a `/tickets/new` (rota que não existe; o chamado novo abre num diálogo).

## Não executados

- **TO16** (setor sem espera no mês). Sem setor com objetivos e sem esperas no mês; ver evidência.

## Observações

1. **"Atender" e "Assumir" no recusado.** O contrato (TO14) cita "Atender" e "Assumir". No chamado recusado do próprio solicitante o botão disponível é "Atender" (mais Enviar, Editar, Enviar para outro setor, Resolver); "Assumir" só existe para chamado na fila. Testado com Atender (`#308`, `#309`, `#312`) e os demais atos. Sugestão ao `df-architect`: tirar "Assumir" do TO14.
2. **Asterisco no diálogo de objetivos.** O contrato diz que os cinco campos são obrigatórios e que o `FormField` deriva o asterisco do Zod; no diálogo só `TMR máximo` mostra `*`. Os outros quatro (SLA, TMA, horas em atraso, limite de chamados) não mostram, embora o Zod os exija. É anterior à Etapa B (os campos antigos já eram assim), mas agora diverge do texto do contrato. Dono provável: `df-ui` (ou contrato, se a intenção for só o novo).
3. **`tmr_max_hours` não volta a nulo.** O campo é obrigatório no formulário, então depois de salvo não há como a interface devolver o Suporte ao estado "sem TMR". Consequência para quem testa: não dá para restaurar o estado original pela UI.
4. **Subtítulo `Tempo médio de resposta`.** O contrato diz "se o card comportar uma descrição". O card TMR não tem subtítulo; a sigla `TMR` aparece só como título. Não é falha.
5. **TMR cresce devagar na tela** (resolução de minutos), mesmo com esperas abertas. O banco mostra o crescimento; só dá para ver a olho com várias esperas abertas antigas ou com a tela aberta por muito tempo.
6. **Aceitar não abre diálogo**: "Atender" na Diretoria aceita direto (sem confirmação nem nota); "Recusar" abre diálogo com "Motivo da recusa".
7. **`assigned_to` na recusa.** O chamado recusado volta com o responsável anterior (`assigned_to` 19), não com o solicitante em `destinatário` como o contrato descreve em `declineReturnAssigneeFor`; nos casos testados o solicitante e o responsável eram a mesma pessoa (Carlos), então a regra não pôde ser distinguida.
8. **Chamados do Suporte afetados pelos testes**: `#313` ficou **pendente em Administrativo** (setor real), com uma espera `transferencia_recebida` aberta em `department_id 15` e `current_department_id 15`. É um chamado `[QA]`, e a interface não tem cancelamento. O TMR do Administrativo sobe com ele até alguém aceitar, recusar ou resolver.

## Estado final dos dados

- **Objetivos restaurados (parcial):** Suporte voltou a `overdue_tickets_limit = 20`; **`tmr_max_hours` ficou em 2** (o original era nulo e a interface exige o campo, ver observação 3). Demais campos de Suporte e todos os de QA Suporte intactos (QA Suporte seguiu com TMR nulo). Atualmente `updated_by` do Suporte é o Diretor (id 21).
- **Prazos (horas por prioridade):** não alterados nesta rodada; Suporte e QA Suporte seguem em 3/6/12/24.
- **Chamados `[QA]` criados:** `#302 TO6 fila sem destinatário` (em andamento), `#303 TO7a destinatário autor` (em andamento), `#304 TO7b destinatário colega` (encaminhado ao Álvaro), `#305 TO9 fila enviar colega` (encaminhado ao Álvaro), `#306 TO10 fila resolver` (resolvido), `#307 TO11 envio aceito` (aceito na Diretoria, em andamento, `assigned_to` 21), `#308 TO13 envio recusado atender` (em andamento), `#309 TO14b recusado assumir` (em andamento), `#310 TO14c recusado resolver` (resolvido), `#311 TO14d recusado enviar colega` (encaminhado ao Álvaro), `#312 TO14e recusado editar título (editado)` (em andamento), `#313 TO14f recusado reenviar` (aguardando aceite em Administrativo).
- **Chamados `[QA]` operados (da rodada anterior):** `#297` (enviado, recusado, resolvido fora do prazo) e `#298` (enviado, aceito na Diretoria, em andamento com `due_at 04:13Z`).
- Chamados reais e contas não foram tocados. As sessões do Diretor, do Admin e do Membro seguem abertas no navegador MCP (janela deixada aberta).
