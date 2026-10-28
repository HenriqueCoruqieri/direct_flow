# Relatório de testes — Dashboard modo Individual, Etapa 4 (Abertos × resolvidos)

- **Data:** 2026-10-28
- **Contrato:** `docs/contracts/dashboard-individual-mode.md` (seção "Etapa 4 — Abertos × resolvidos")
- **Commit:** `704b725` · alterações não comitadas: sim (arquivos da Etapa 4 no working tree)
- **Ambiente:** `http://localhost:3000`, `next dev`, banco de desenvolvimento
- **Resultado:** 16 de 19 passaram · 0 falharam · 2 parciais (AR17, AR18) · 1 não executado (AR2) · Diretoria não executada (fora da contagem)

## Pré-requisitos

- Dev server no ar (200 em `/login`). MCPs `playwright`, `next-devtools` e `postgres` respondendo.
- Contas: Administrador Suporte `cazalbe@gmail.com` (id 19, `admin`, setor 14 Suporte) e Membro Suporte `rodalv@gmail.com` (id 18, `member`, setor 14), ambos ativos (consulta ao banco). O navegador já abriu com a sessão do Administrador ativa, então não houve tentativa de login dele; o Membro entrou na primeira (e única) tentativa. Diretor: login recusado, não tentado (registrado abaixo).
- `.env` não lido, por instrução. Nenhum cenário depende de e-mail; a checagem de `RESEND_API_KEY` não foi feita.
- Só leitura: nenhum chamado criado, alterado ou apagado; nenhuma transferência decidida.

## Cenários

| #    | Cenário                                                        | Papel   | Status                                                           |
| ---- | -------------------------------------------------------------- | ------- | ---------------------------------------------------------------- |
| AR1  | Coletivo em Hoje, Semana, Mês e Personalizado                  | A       | PASSOU                                                           |
| AR2  | Individual em Hoje com dados                                   | A       | NÃO EXECUTADO (A sem atividade hoje; coberto por AR5)            |
| AR3  | Individual em Semana e Mês                                     | A       | PASSOU                                                           |
| AR4  | Individual em Personalizado semanal e mensal                   | A       | PASSOU                                                           |
| AR5  | Individual em dia passado com atividade (2026-10-27)           | A       | PASSOU                                                           |
| AR6  | Coerência somas × linha 1 × `IM`                               | A       | PASSOU                                                           |
| AR7  | Individual de M em Hoje e Mês; Coletivo de M                   | M       | PASSOU                                                           |
| AR8  | Período com atividade do setor e nenhuma minha (2026-10-24)    | A       | PASSOU                                                           |
| AR9  | Tamanho do gráfico nas trocas de modo, período e redimensionar | A       | PASSOU                                                           |
| AR10 | Tabela acessível por modo                                      | A       | PASSOU                                                           |
| AR11 | Troca de modo sem requisição                                   | A       | PASSOU                                                           |
| AR12 | F5 volta a Coletivo                                            | A       | PASSOU                                                           |
| AR13 | Troca de período mantém Individual                             | A       | PASSOU                                                           |
| AR14 | 390×844, Hoje e Mês, nos dois modos                            | A       | PASSOU                                                           |
| AR15 | Árvore de acessibilidade e foco                                | A       | PASSOU (foco por Tab não percorrido; ver Observações)            |
| AR16 | `id` duplicado e `[data-slot="chart"]`                         | A       | PASSOU                                                           |
| AR17 | Posição, largura e altura do card na linha 3                   | A       | PARCIAL (altura e posição conferidas; proporção ~3/5 não medida) |
| AR18 | Esqueleto com rede lenta                                       | A       | PARCIAL (esqueleto presente, quadro isolado não capturado)       |
| AR19 | Console e dev server sem erro nem aviso do Recharts            | A e M   | PASSOU                                                           |
| —    | Diretoria                                                      | Diretor | NÃO EXECUTADO (login recusado, não tentado)                      |

## Evidências por cenário

Hora de referência: banco `now()` = 2026-10-28 06:04 UTC (03:04 em São Paulo). Setor Suporte = id 14. O setor não tem nenhum chamado criado nem resolvido em 28 out, então Hoje fica vazio nos dois modos e nas duas contas.

### AR1, AR3, AR4, AR6, AR7 (valores do Individual e do Coletivo contra o banco)

Consulta de conferência por dia (equivale a `AD` e `IAD`), unindo `created_at` e `resolved_at` (status `resolvido`/`fechado`) por dia de São Paulo, setor 14:

| Dia (out 2026) | Setor abertos/resolvidos | A (id 19) | M (id 18) |
| -------------- | ------------------------ | --------- | --------- |
| 6              | 3/0                      | 0/0       | 2/0       |
| 8              | 3/2                      | 1/0       | 1/1       |
| 9              | 2/0                      | 1/0       | 1/0       |
| 12             | 6/2                      | 2/0       | 1/1       |
| 14             | 1/0                      | 0/0       | 1/0       |
| 15             | 1/2                      | 0/0       | 1/2       |
| 23             | 3/3                      | 3/0       | 0/3       |
| 24             | 6/6                      | 0/0       | 6/6       |
| 26             | 2/0                      | 0/0       | 2/0       |
| 27             | 7/10                     | 0/4       | 5/2       |

Tela, Mês (tabela `sr-only`):

- Coletivo (A e M): exatamente a coluna "Setor" acima; soma 34 abertos / 25 resolvidos; KPI "Chamados no período" 34, Taxa "25 resolvidos de 39". Caption `Abertos × resolvidos, 1–31 out 2026 · por dia`.
- Individual A: 8:1/0, 9:1/0, 12:2/0, 23:3/0, 27:0/4; soma 7/4. Igual à coluna A. KPI: "Chamados no período 7" e "4 resolvidos de 7". Consulta `IM` (setor 14, `assigned_to = 19`, 1 out a 1 nov, SP): `chamados = 7`, `resolvidos = 4`.
- Individual M: 6:2/0, 8:1/1, 9:1/0, 12:1/1, 14:1/0, 15:1/2, 23:0/3, 24:6/6, 26:2/0, 27:5/2; soma 20/15. Igual à coluna M. KPI: 20 e "15 resolvidos de 20". `IM` de M: `chamados = 20`, `resolvidos = 15`.
- Semana (26 out a 1 nov, por dia): Coletivo 26:2/0, 27:7/10 (soma 9/10); Individual A só 27:0/4 (soma 0/4); KPI Individual "Chamados no período 0" e "4 resolvidos, nenhum recebido".
- Personalizado 2026-08-01 a hoje (`por semana`, 14 baldes, de "1 a 2 de agosto" a "26 a 28 de outubro"): Coletivo 5–11: 8/2, 12–18: 8/4, 19–25: 9/9, 26–28: 9/10 (soma 34/25); batem com a soma das linhas por dia acima. Individual A: 2/0, 2/0, 3/0, 0/4 (soma 7/4), igual a `IAS(…,'week')` calculado dos dias de A. KPI Individual 7 e "4 resolvidos de 7".
- Personalizado 2025-01-01 a hoje (`por mês`, 22 baldes, de "janeiro de 2025" a "1 a 28 de outubro de 2026"): Coletivo 34/25 no último balde; Individual A 7/4; todos os outros baldes em 0/0. Primeiro e último baldes cortados nas pontas.

### AR5 (A, dia passado 2026-10-27)

`IAH(14, 19, 2026-10-27)` (executada no banco): só a hora 21 tem valor, 4 resolvidos. Tela: caption `Abertos × resolvidos, seus chamados, 27 out 2026 · por hora`, 24 linhas, última `23h às 0h`, única linha não nula `21h às 22h` = 0/4. Coletivo no mesmo dia: 21h 0/4, 22h 1/2, 23h 6/4 (setor).

### AR8 (A, 2026-10-24)

Setor com 6 abertos e 6 resolvidos nesse dia (todos de M); A sem nenhum (consulta acima). Individual: sem legenda, sem tabela, sem gráfico (`[data-slot="chart"]` = 0), título `Nenhum chamado seu aberto ou resolvido no período`, texto `Os chamados do setor destinados a você abertos e resolvidos aparecem aqui, hora a hora.`, altura do card 308 px (igual ao Coletivo). Coletivo no mesmo período: gráfico, legenda e tabela (18h 0/1, 19h 3/3, 20h 1/0, 21h 2/2). O vazio de Hoje (A e M) usa o mesmo texto pessoal, e o Coletivo o texto de hoje (`Os chamados abertos e resolvidos no setor aparecem aqui, hora a hora.`), card 308 px nos dois.

### AR9, AR17

- 1280 px, Mês: gráfico 552×224 e card 586×308 nos dois modos, antes e depois de Coletivo → Individual → Coletivo → Individual (4 trocas); SVG `recharts-surface` com 552×224.
- Troca de período dentro do Individual (Mês → Semana): 552×224, um gráfico.
- Redimensionar com Individual ativo: 1100 px → gráfico 771×224 (card 805); 1440 px → 648×224 (card 682); volta a 1280 → 552×224. Nunca 0 nem preso em 320×200. Tooltip funcionou depois das trocas (screenshot `.qa-output/ar-mes-individual.png`: "sexta-feira, 16 de outubro, Abertos 0, Resolvidos 0").
- AR17: na screenshot a 1280 px, o card e o de Transferências têm topo e base alinhados (mesma altura externa); card a 1280 px com 586 px de largura de 1265. A proporção ~3/5 não foi medida numericamente (PARCIAL).

### AR10, AR15, AR16

- Árvore (`ariaSnapshot` da região): um `heading` nível 2 "Abertos × resolvidos", uma `region`, uma `list` de legenda (Abertos, Resolvidos) quando há dados, uma `table`. Captions: Coletivo `Abertos × resolvidos, 24 out 2026 · por hora`; Individual `Abertos × resolvidos, seus chamados, 27 out 2026 · por hora`; cabeçalhos `Hora`/`Abertos`/`Resolvidos`. Linhas = pontos do modo. Modo vazio: sem legenda e sem tabela.
- DOM: `[data-slot="chart"]` = 1 nos dois modos com dados e 0 nos vazios. Ids duplicados no documento: nenhum, em nenhum dos períodos testados.

### AR11, AR12, AR13

- AR11: durante várias trocas Coletivo ↔ Individual, o listener de requisições do Playwright registrou 0 requisições; o card trocou junto com a linha 1 (Principal ofensor e Maiores atrasos também mudam).
- AR12: em Individual com `?periodo=personalizado&de=2026-10-27&ate=2026-10-27`, F5 volta a Coletivo (rádio, caption sem "seus chamados"), URL inalterada.
- AR13: em Individual, clicar Semana e depois Mês mantém Individual (caption com "seus chamados"), com os dados do período novo.

### AR14

390×844: sem rolagem horizontal (`scrollWidth` 375 contra `clientWidth` 375) em Hoje e Mês, nos dois modos; card 335 px; gráfico 301×224 em Mês, card 330 px (legenda quebra para baixo mantendo o título); Hoje vazio com card 308 px. Rótulo do último ponto inteiro ("Sáb 31"). Screenshot: `.qa-output/ar14-mes-ind.png` (conferida).

### AR19

- `get_errors` do `next-devtools`: `configErrors: []`, `sessionErrors: []` (conferido depois do Administrador e depois do Membro).
- Console do navegador (nível aviso, todo o histórico): só `TypeError: Failed to execute 'observe' on 'MutationObserver': parameter 1 is not of type 'Node'` em `<anonymous>:2:185`, repetido uma vez por carga de página. A origem é script anônimo injetado no navegador de teste (não está no bundle da aplicação, aparece também em `/login`). Nenhum aviso do Recharts `width(0) and height(0)`, nenhum `-1`, nenhum aviso de hidratação, antes ou depois de trocas de modo, de período e de redimensionamento. Os 3 erros/avisos acumulados são essa mesma mensagem.
- Nenhuma escrita no banco: tudo foi leitura e navegação.

### EXPLAIN ANALYZE (informativo; setor 14, Administrador id 19, tabela `ticket` com 248 linhas, 34 do setor, 7 de A)

Observação de método: o MCP não permite o `DATABASE_URL`, então reproduzi o SQL de `listActivityBuckets` (`app/_lib/data/dashboard.ts:252-271`) em `EXPLAIN (ANALYZE, BUFFERS, COSTS OFF, TIMING OFF)`. Para 24 baldes usei o `values (...)` literal igual ao da função (Hoje, 28 out SP). Para 53 baldes usei `generate_series` como fonte (`Function Scan` no lugar de `Values Scan`), com semanas de 2025-10-27 a 2026-11-02; o resto do plano é o mesmo.

| Caso                | Nó de junção                                               | Execução | Filtro do `ticket`                                |
| ------------------- | ---------------------------------------------------------- | -------- | ------------------------------------------------- |
| 24 baldes, Coletivo | Nested Loop Left Join, 816 removidos pelo filtro de junção | 0,235 ms | Seq Scan, `current_department_id = 14`, 34 linhas |
| 24 baldes, A        | Nested Loop Left Join, 168 removidos                       | 0,108 ms | Seq Scan, `... and assigned_to = 19`, 7 linhas    |
| 53 baldes, Coletivo | Nested Loop Left Join, 1757 removidos                      | 0,292 ms | Seq Scan, `current_department_id = 14`, 34 linhas |
| 53 baldes, A        | Nested Loop Left Join, 360 removidos                       | 0,189 ms | Seq Scan, `... and assigned_to = 19`, 7 linhas    |

Resumo: o plano do Coletivo é Seq Scan + Materialize + Nested Loop + HashAggregate + Sort (sem mudança de estrutura); com `assigned_to` o filtro entra no Seq Scan (7 linhas em vez de 34), o agregado vira GroupAggregate sobre Sort e o tempo cai. Nenhum índice é usado nos dois casos porque a tabela tem 248 linhas (`ticket_assigned_to_idx` não é escolhido); sem sinal de regressão.

## Falhas

Nenhuma.

## Erros fora dos cenários

- `TypeError ... MutationObserver ... parameter 1 is not of type 'Node'` em script anônimo do navegador de teste, uma vez por carga (inclusive em `/login`). Não vem do código do projeto; registrado só por transparência.

## Não executados

- **AR2:** Administrador sem chamado criado nem resolvido hoje (e o setor inteiro sem atividade hoje), então o Individual de Hoje cai no vazio. Consulta usada: contagem de `created_at`/`resolved_at` ≥ 2026-10-28 03:00 UTC para setor 14 = 0 e para ids 18 e 19 = 0. A hora a hora com dados está coberta por AR5 (dia 27).
- **Diretoria:** login recusado, conforme instrução; nenhuma tentativa feita.

## Observações

- **AR17 parcial:** não medi a razão numérica da largura (~3/5) do card contra a linha 3; só a posição, a altura igual à de Transferências (screenshot) e a igualdade entre os modos.
- **AR18 parcial:** com `Network.emulateNetworkConditions` (latência 300 ms, 30 kB/s) numa carga completa, as amostras mostraram o `h2` e elementos `animate-pulse` na página, mas o gráfico já estava presente na mesma amostra, então não isolei um quadro só do esqueleto do card. Numa troca de período com rede lenta o DOM não mudou em 4 s (sem amostras), por isso nada a afirmar além disso.
- **AR15, foco:** conferi pela árvore de acessibilidade que só há uma legenda e uma tabela expostas e que o modo oculto não monta gráfico (0 ou 1 `[data-slot="chart"]` conforme o modo ativo). Não percorri o card com Tab; o único conteúdo focusável do card são os elementos internos do SVG do Recharts do modo ativo.
- **Legenda vazia no cabeçalho:** com o Individual vazio e o Coletivo com dados, o Individual não mostra legenda e o cabeçalho só tem título e período, como o contrato pede; o inverso (Coletivo vazio, Individual com dados) não ocorreu nos dados atuais.
- Todos os chamados de teste são de 6 a 27 de out 2026, então os baldes semanais e mensais fora de outubro ficam sempre 0/0; os baldes cortados nas pontas foram conferidos pelos rótulos ("1 a 2 de agosto", "26 a 28 de outubro de 2026", "1 a 28 de outubro de 2026").
- Transferências segue o Coletivo no Individual, como esperado pelo contrato.
