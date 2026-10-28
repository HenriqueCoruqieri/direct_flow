# Relatório de testes — Dashboard, modo Individual, Etapa 5 (Transferências entre setores)

- **Data:** 2026-10-28
- **Contrato:** `docs/contracts/dashboard-individual-mode.md`, seção "Etapa 5 — Transferências entre setores" (TI1–TI16)
- **Commit:** `6fe687c` · alterações não comitadas: sim (Etapa 5 ainda não comitada)
- **Ambiente:** `http://localhost:3000`, `next dev`, banco de desenvolvimento
- **Resultado:** 14 de 16 passaram · 0 falharam · 0 bloqueados · 2 não executados (mais a Diretoria, não executada por decisão do usuário)

Regra aplicada (decidida pelo usuário em 2026-10-28): pendente para a "Fila do setor" (`to_user_id` nulo) não conta em "Aguardando seu aceite" no Individual; aparece só no Coletivo.

## Pré-requisitos

- Dev server no ar (login 200); MCP `playwright`, `next-devtools` e `postgres` respondendo (`SELECT 1` ok).
- Contas (senhas não registradas): Administrador `cazalbe@gmail.com` (id 19, `admin`, Suporte, ativo); Membro `rodalv@gmail.com` (id 18, `member`, Suporte, ativo). Diretor: login recusado, não tentado.
- Usuários `qa.*@directflow.test` não usados nesta rodada (contas passadas pelo usuário). `.env` não lido.
- Somente leitura: nenhum chamado criado, nenhuma transferência aceita ou recusada.

## Dados de referência (consulta de apoio, Suporte = dep 14)

Transferências `pendente`/`rejeitado` com origem ou destino no Suporte:

| id  | status    | origem → destino | to_user_id | requested_by | reviewed_at |
| --- | --------- | ---------------- | ---------- | ------------ | ----------- |
| 61  | pendente  | 14 → 15          | 20         | 19           | —           |
| 60  | pendente  | 14 → 15          | nulo       | 19           | —           |
| 37  | rejeitado | 14 → 11          | nulo       | 18           | 2026-10-12  |
| 28  | rejeitado | 14 → 15          | nulo       | 18           | 2026-10-12  |
| 26  | rejeitado | 14 → 11          | nulo       | 19           | 2026-10-09  |

Nenhuma transferência pendente tem destino no Suporte (`to_department_id = 14`): Coletivo "Aguardando nosso aceite" = 0 e lista vazia nos dois modos, para os dois papéis.

`ITS(14, eu, período)`, executada no MCP `postgres` (bordas em America/Sao_Paulo):

| eu          | período           | aguardando | enviados | recusados |
| ----------- | ----------------- | ---------- | -------- | --------- |
| 19 (Admin)  | hoje              | 0          | 2        | 0         |
| 19 (Admin)  | mês (out/2026)    | 0          | 2        | 1         |
| 19 (Admin)  | 2026-01-01 a hoje | 0          | 2        | 1         |
| 18 (Membro) | hoje              | 0          | 0        | 0         |
| 18 (Membro) | mês               | 0          | 0        | 2         |
| 18 (Membro) | 2026-01-01 a hoje | 0          | 0        | 2         |

`TS(14)` (Coletivo): aguardando 0 · enviados 2 · recusados no mês 3 (hoje 0). Pendentes de fila (`to_user_id` nulo) no setor 14: 0 (no banco todo: 13, em outros setores).

## Cenários

| #    | Cenário                                                                        | Papel          | Status        |
| ---- | ------------------------------------------------------------------------------ | -------------- | ------------- |
| TI1  | Coletivo Hoje e Mês: rótulos, números = `TS`, lista vazia = `TL`               | Admin          | PASSOU        |
| TI2  | Individual Hoje/Semana/Mês/2026: rótulos pessoais, números = `ITS`, ≤ Coletivo | Admin          | PASSOU        |
| TI3  | Individual e Coletivo, Hoje e Mês, Membro (`:eu` = 18, diferente do Admin)     | Membro         | PASSOU        |
| TI4  | Troca de período mantém o modo; só "Seus envios recusados" muda                | Admin e Membro | PASSOU        |
| TI5  | Individual com `ITL` vazio: copy pessoal, sem lista, "0" neutro, link presente | Admin e Membro | PASSOU        |
| TI6  | Individual de quem tem aguardando 0 com pendente de fila no setor              | —              | NÃO EXECUTADO |
| TI7  | Clicar item da lista e voltar                                                  | —              | NÃO EXECUTADO |
| TI8  | "Ver em Aprovações" nos dois modos                                             | Admin          | PASSOU        |
| TI9  | Alternar modos sem requisição                                                  | Admin e Membro | PASSOU        |
| TI10 | F5 volta a Coletivo                                                            | Admin e Membro | PASSOU        |
| TI11 | Acessibilidade: um título, um link, um `dl`, modo oculto fora do foco          | Admin e Membro | PASSOU        |
| TI12 | Sem `id` duplicado                                                             | Admin e Membro | PASSOU        |
| TI13 | 390×844, nos dois modos                                                        | Admin e Membro | PASSOU        |
| TI14 | 1280 px: posição, largura e cabeçalho                                          | Admin e Membro | PASSOU        |
| TI15 | Fechamento: nenhum card do Individual mostra o Coletivo                        | Admin e Membro | PASSOU        |
| TI16 | Console, `get_errors` e escrita no banco                                       | todos          | PASSOU        |

Detalhes e evidências:

- **TI1.** Coletivo Hoje (Admin e Membro): `Aguardando nosso aceite 0 · Enviados, pendentes 2 · Recusados por outros (no período) 0`. Mês: recusados 3. Bate com `TS`. Vazio do Coletivo: "Nenhum chamado aguardando aceite" + "Os chamados enviados por outros setores aparecem aqui até alguém do setor atender ou recusar." (inalterado). Selo de Aprovações: sem número no menu, coerente com `countPendingApprovals(14)` = 0. Não há número anterior à Etapa 5 para comparar o selo além disso.
- **TI2.** Admin Individual: Hoje/Semana `0 · 2 · 0`; Mês e 2026-01-01 `0 · 2 · 1`. Todos = `ITS(14, 19, …)`. Marca "no período" só no terceiro contador.
- **TI3.** Membro Individual: Hoje/Semana `0 · 0 · 0`; Mês e 2026-01-01 `0 · 0 · 2` = `ITS(14, 18, …)`. Coletivo do Membro idêntico ao do Admin (`0 · 2 · 3` no Mês).
- **TI4.** Membro percorreu Hoje, Semana, Mês e Personalizado 26–28/10 (`?periodo=personalizado&de=2026-10-26&ate=2026-10-28`, recusados 0) pelo seletor, sem sair do Individual. Admin: Hoje, Semana, Mês, mantendo o modo. Personalizado de 2026-01-01 aberto por URL (recarrega, volta a Coletivo, depois troca para Individual): números = `ITS`. Verificação de "sem esqueleto" não feita de forma instrumentada (só leitura final do DOM); requisições durante a troca de período foram só as `_rsc` esperadas da navegação.
- **TI5.** Os dois papéis têm `ITL` vazio: "Nenhum chamado aguardando seu aceite" + "Os chamados que outros setores enviarem para você aparecem aqui até você atender ou recusar.", sem `ul`, "Aguardando seu aceite" `0`, link "Ver em Aprovações" presente. Tom visual do `0` não medido além da inspeção do screenshot.
- **TI8.** Link `/approvals?periodo=todos` nos dois modos; no Individual levou a `/approvals?periodo=todos` (vazio, coerente: nada pendente para o Suporte). A parte "chamados da lista aparecem lá com Para = A" não se aplica (lista vazia).
- **TI9.** Cinco alternâncias Coletivo ↔ Individual (Admin) e quatro (Membro), com captura de requisições: zero requisições.
- **TI10.** `goto` na mesma URL: Coletivo em Admin e Membro, URL inalterada.
- **TI11.** Por DOM: 1 `h2`, 1 `section` rotulado, 1 link visível (o do modo oculto não existe: há um só `a` no card), 1 `dl` exposto com 3 `dt`, 0 `ul` exposto (vazio), painel oculto com `hidden`. Tab a partir do link vai ao próximo foco da página, sem parar em nada do modo oculto. Não usei a árvore de acessibilidade do Playwright além do DOM.
- **TI12.** `[id]` duplicado: nenhum, nos dois modos e papéis.
- **TI13.** Sem rolagem horizontal (`scrollWidth` = `clientWidth`), 3 mini-cards lado a lado (x = 37, 140, 243). Individual: rótulos em 2 linhas, sem corte. Screenshot: `.qa-output/ti13-member-individual-390.png`. Ver Observações sobre o Coletivo (3 linhas em "Aguardando nosso aceite").
- **TI14.** Coletivo: card em x=854, largura 387, link à direita na mesma linha do título, igual nos dois modos. No Individual a linha 3 sobe (y 680 → 571): linha mais baixa, esperado pelo contrato.
- **TI15.** Individual do Admin (Mês): `Chamados no período 7 · +1 aceito por você`, `Taxa 57% · 4 resolvidos de 7`, `Backlog 3 chamados`, Principal ofensor com 4 chamados (≠ 11 do Coletivo), Maiores atrasos com #125, #161, #164 (os três têm `assigned_to = 19`, conferido no banco), gráfico "seus chamados" com 7 abertos e 4 resolvidos, Transferências `0 · 2 · 1`. Individual do Membro (Mês): `20 · +5 aceitos por você`, `75% · 15 resolvidos de 20`, `Backlog 0 chamados`, ofensor 6 chamados, "Nenhum chamado seu em atraso", gráfico "seus chamados", Transferências `0 · 0 · 2`. Nenhum rótulo do Coletivo ("nosso", "recebidos de outros setores", "recusados por outros") no Individual; a frase "Os chamados do setor destinados a você…" é a cópia pessoal do vazio de atrasos. Os números dos quatro cards das etapas anteriores foram conferidos só contra o Coletivo (diferem e são subconjunto) e, para atrasos, contra o banco; não refiz as consultas `IM`/`IA`/`IR`/`ITT`/`IAT` de cada um.
- **TI16.** `get_errors` do `next-devtools` sem erro (antes e depois). Console do navegador sem erro nem aviso da aplicação, nenhuma hidratação ou Recharts. Nenhuma escrita feita por mim (somente leitura).

## Falhas

Nenhuma.

## Divergências com o banco

Nenhuma. Todos os contadores do Individual e do Coletivo (Admin e Membro, Hoje/Semana/Mês/Personalizado) igualam `ITS`/`TS` acima.

## EXPLAIN ANALYZE (informativo; setor 14, pessoa 19; `ticket_transfer` com 58 linhas)

Rodei as consultas equivalentes em SQL (não o SQL gerado pelo Drizzle). Todas escolhem Seq Scan, como o contrato antecipa, e o plano sem pessoa é o mesmo com pessoa mais um filtro.

| Consulta                                                                                             | Plano                                                                                                          | Execução |
| ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------- |
| `countPendingApprovals` sem pessoa (`to_department_id = 14 and status = 'pendente'`)                 | Aggregate → Seq Scan (58 removidas, 0 retornadas), cost 1.84                                                   | 0,054 ms |
| `countPendingApprovals` com pessoa (`… and to_user_id = 19`)                                         | Aggregate → Seq Scan com filtro extra, cost 1.98                                                               | 0,031 ms |
| `listOldestIncomingTransfers` sem pessoa (join department e ticket, order `created_at, id`, limit 5) | Limit → Sort (quicksort 25 kB) → Nested Loop, Seq Scan em `ticket_transfer`, joins "never executed" (0 linhas) | 0,064 ms |
| `listOldestIncomingTransfers` com pessoa                                                             | Mesmo plano, filtro extra `to_user_id = 19`, cost 11.31 contra 11.17                                           | 0,044 ms |
| Varredura de saída com as 4 colunas (`from_department_id = 14`, filter por `requested_by`)           | Aggregate → Seq Scan (9 linhas, 49 removidas)                                                                  | 0,046 ms |

Como todos os resultados têm 0 linhas no destino 14, o custo real das listas não foi exercitado; o plano com linhas pode diferir.

## Erros fora dos cenários

- Em todo carregamento de página, o console do navegador registra `TypeError: Failed to execute 'observe' on 'MutationObserver': parameter 1 is not of type 'Node'` em script anônimo (`<anonymous>:2`), sem arquivo da aplicação na pilha. Aparece também em `/login`; provável injeção do ambiente do navegador de teste, não do app. Não conta como falha da Etapa 5. Log: `.qa-output/console-2026-10-28T06-41-36-126Z.log`.
- A sessão do navegador já estava aberta como Membro (`rodalv@gmail.com`, conferido pelo nome na barra lateral e pelo banco) quando comecei; usei essa sessão como Membro, sem novo login, e depois saí e entrei como Administrador (uma tentativa, aceita).

## Não executados

- **TI6:** nenhuma conta com `aguardando` = 0 e pendente de "Fila do setor" no próprio setor. No Suporte (dep 14) não há pendente recebida (fila = 0). Há 13 pendentes de fila no banco, em outros setores (18→19, 11→13 etc.), sem conta disponível desses setores. Não criei dado. A parte inversa (Coletivo mostra a fila) também não pôde ser vista.
- **TI7:** `ITL` vazio para as duas contas; não há item na lista para clicar.
- **Diretoria:** login recusado, não tentado (decisão do usuário).

## Observações

- No Coletivo (inalterado pela Etapa 5), o rótulo "Aguardando nosso aceite" quebra em 3 linhas a 390 px (contrato prevê "até 2 linhas" só para os rótulos do Individual e informa que o maior do Coletivo tem 23 caracteres). Sem corte nem rolagem; fica como registro, não como defeito da etapa.
- O contrato (seção "Notas para não reportar como defeito" e decisão 2) ainda chama o caso da fila de "pergunta aberta"; a decisão do usuário de 2026-10-28 está registrada no mesmo documento. Sugestão ao `df-architect`: trocar "pergunta aberta" por "decidida" nesses dois pontos.
- O botão "Ver em Aprovações" no Individual leva ao setor inteiro (decisão 6), confirmado.
