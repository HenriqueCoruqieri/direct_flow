# Relatório de testes — Envio do chamado para outro setor (Etapa 1)

- **Data:** 2026-10-08
- **Contrato:** `docs/contracts/department-transfer.md` (migration `0011` e cenários TR0 a TR19 da Etapa 1; Etapas 2 e 3 fora do escopo)
- **Commit:** `4b0ba5f` · alterações não comitadas: sim
- **Ambiente:** `http://localhost:3000`, `next dev`, banco de desenvolvimento
- **Resultado:** 20 de 20 passaram · 0 falharam · 0 bloqueados · 0 não executados

Segunda execução. A primeira parou no pré-requisito 3 (`qa.admin.infra` inativo); esta substitui o relatório anterior.

## Pré-requisitos

| #   | Pré-requisito     | Resultado                                                                                                                                                                                                                                                  |
| --- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Dev server no ar  | OK. `GET /login` devolveu 200                                                                                                                                                                                                                              |
| 2   | MCP disponível    | OK. `postgres` (`df_readonly`) respondeu; `next-devtools` achou a porta 3000 (9 ferramentas); `playwright` abriu o `/login`                                                                                                                                |
| 3   | Usuários de teste | OK. Os quatro existem e estão ativos (ids 6, 13, 14, 15; `qa.admin.infra` agora com `is_active = true`)                                                                                                                                                    |
| 4   | E-mail desligado  | `RESEND_API_KEY` está **preenchida** no `.env`. A Etapa 1 não envia e-mail; o TR19 foi conferido pela ausência de qualquer linha de Resend ou de aviso de e-mail em `.next/dev/logs/next-development.log` durante a bateria (zero ocorrências de "resend") |

## Cenários

| #    | Cenário                                       | Papel          | Status                   |
| ---- | --------------------------------------------- | -------------- | ------------------------ |
| TR0  | Migration `0011` aplicada                     | banco, A, I, D | PASSOU                   |
| TR1  | Autor sem botão de enviar                     | M              | PASSOU                   |
| TR2  | Diálogo e opções de destino                   | A              | PASSOU                   |
| TR3  | Envio, toast e saída sem 404                  | A              | PASSOU                   |
| TR4  | Estado do banco depois do envio               | banco          | PASSOU                   |
| TR5  | Abas de Meus chamados e contagens             | M              | PASSOU                   |
| TR6  | Detalhe do autor, linha do tempo              | M              | PASSOU                   |
| TR7  | Fila do destino                               | I              | PASSOU                   |
| TR8  | Fila da origem                                | A              | PASSOU                   |
| TR9  | Destinatário não autor envia e perde acesso   | M              | PASSOU                   |
| TR10 | Diretoria envia e mantém acesso               | D              | PASSOU                   |
| TR11 | Autor e destinatário envia e mantém acesso    | M              | PASSOU                   |
| TR12 | Conflito entre duas sessões                   | A e D          | PASSOU                   |
| TR13 | Requests em chamado resolvido e sem acesso    | A              | PASSOU                   |
| TR14 | Request forjado de quem não pode enviar       | M              | PASSOU                   |
| TR15 | Validação e destino inválido                  | A              | PASSOU                   |
| TR16 | Visibilidade de comentário privado após envio | I e M          | PASSOU                   |
| TR17 | Chamados fora da origem                       | banco          | PASSOU (registro: **0**) |
| TR18 | Mobile 390×844                                | M e A          | PASSOU                   |
| TR19 | Sem e-mail, sem erro de runtime ou hidratação | todos          | PASSOU                   |

## Preparação (dados criados, todos `[QA]`, setor QA Suporte)

| Código | Id  | Título                        | Criado por (autor) | Estado inicial                                |
| ------ | --- | ----------------------------- | ------------------ | --------------------------------------------- |
| T1     | 141 | `[QA] Envio fila`             | M                  | `aberto`, fila                                |
| T2     | 142 | `[QA] Envio encaminhado`      | M                  | `encaminhado`, destinatário A                 |
| T3     | 143 | `[QA] Envio andamento`        | M                  | `em_andamento`, destinatário M                |
| T4     | 147 | `[QA] Envio por destinatário` | A                  | `encaminhado`, destinatário M                 |
| T5     | 144 | `[QA] Envio corrida`          | M                  | `aberto`, fila                                |
| T6     | 145 | `[QA] Envio privado`          | M                  | `aberto`, fila; `p1` = mensagem 39, `interna` |
| T7     | 146 | `[QA] Envio forjado`          | M                  | `encaminhado`, destinatário A (não enviado)   |
| (TR18) | 148 | `[QA] Envio mobile`           | A                  | `aberto`, fila (diálogo aberto e cancelado)   |

Também foi postado o comentário `[QA] Comentário do autor aguardando` em #141 (TR6). Os chamados #141 a #145 e #147 ficam em `aguardando_aprovacao` até a Etapa 2 existir (não há como desfazer).

## Evidência por cenário

### TR0 — migration `0011`

```sql
select count(*) from ticket t join ticket_transfer tt on tt.ticket_id = t.id and tt.status = 'pendente' where t.current_department_id <> tt.to_department_id;   -- 0
select count(*) from ticket t where status = 'aguardando_aprovacao' and not exists (select 1 from ticket_transfer tt where tt.ticket_id = t.id and tt.status = 'pendente');  -- 0
select id, ticket_id, from_status, to_status, changed_by, left(note, 60) from ticket_history where event = 'mudanca_status' and changed_by is null;
```

| id  | ticket_id | from_status          | to_status | changed_by | note                                                            |
| --- | --------- | -------------------- | --------- | ---------- | --------------------------------------------------------------- |
| 285 | 25        | aguardando_aprovacao | aberto    | nulo       | `Ajuste de dados: o chamado aguardava aprovação sem envio pen…` |
| 286 | 17        | aguardando_aprovacao | aberto    | nulo       | idem                                                            |
| 287 | 33        | aguardando_aprovacao | aberto    | nulo       | idem                                                            |
| 288 | 9         | aguardando_aprovacao | aberto    | nulo       | idem                                                            |

Uma linha por chamado reaberto. Os cinco legados no destino (`ticket.current_department_id = to_department_id`, `assigned_to` nulo): #64 em QA Suporte (18), #66, #68, #70 em QA Infra (19), #73 em P&D (13). Na tela: #64 na Fila de A com o selo `Aguardando aprovação` e sem ações; #66, #68 e #70 na Fila de I; #73 na Fila de P&D vista por D (filtro Setor), todos com o selo e sem "Assumir"/"Enviar".

### TR1

M em `/tickets/141`: formulário de resolver presente; botão "Enviar para outro setor" ausente (0 ocorrências, nem desabilitado); "Anexar" desabilitado.

### TR2

A em `/tickets/141`: diálogo `Enviar chamado #141 para outro setor` com a descrição do contrato, campo `Setor de destino`, placeholder `Selecione o setor`. Opções: Diretoria, Administrativo, Implantação, P&D, QA Infra, Suporte. Bate com o conjunto da consulta do contrato (os 6 setores ativos, sem QA Suporte e sem "Não alocado"). Observação: a lista traz a Diretoria primeiro e o resto em ordem alfabética; o contrato só fixa o conjunto. Enviar sem escolher mostra `Selecione o setor de destino.` Screenshot: `.qa-output/tr2-dialog.png`.

### TR3 e TR4

A enviou #141 para QA Infra, com listeners de rede e console:

```
~700 ms  botão "Enviando…", diálogo aberto
~1000 ms toast "Chamado #141 enviado para a fila de QA Infra."
930 ms   POST /tickets/141 -> 200   (um só)
~1400 ms navegação para /tickets (h1 "Meus chamados")
```

Nenhuma resposta 4xx, nenhum erro nem aviso no console durante o envio, `get_errors` vazio. `/tickets/141` aberto depois, direto pela URL: 404. A tela do detalhe nunca virou 404 durante a saída.

```sql
select id, status, current_department_id, origin_department_id, assigned_to from ticket where id = 141;
-- 141 | aguardando_aprovacao | 19 | 18 | null
select * from ticket_transfer where ticket_id = 141;
-- 9 | from 18 | to 19 | requested_by 13 | request_reason null | pendente | reviewed_by/at/note nulos
select * from ticket_history where id > 295;
-- 296 | 141 | changed_by 13 | transferencia_solicitada | aberto -> aguardando_aprovacao | dept 18 -> 19 | assignee nulo -> nulo | note nula
```

Uma única linha nova no histórico, sem `mudanca_status` nem `atribuicao`.

### TR5

Com período `Todos`, abas na ordem `Abertos por mim · Aguardando aprovação · Atribuídos a mim · Resolvidos · Fechados · Cancelados`. Contagens da tela: 44 / 6 / 15 / 16 / 0 / 0, iguais à consulta MT para M (id 14). "Aguardando aprovação" lista #144, #142, #141, #70, #68, #66 (igual a `select id from ticket where created_by = 14 and status = 'aguardando_aprovacao'`); #141, #142 e #144 não aparecem em "Abertos por mim". Pelo botão `Filtros`: "Abertos por mim" oferece Status (Aberto, Em análise, Encaminhado, Em andamento), Tipo e Tag; "Aguardando aprovação" só Tipo e Tag (sem Status). Com o período padrão (`Hoje`) os números são menores (15/3/6/2); é o filtro de período, não divergência.

### TR6

M achou #141 pela busca do topo (opção `#141 [QA] Envio fila · Aguardando aprovação`) e abriu o detalhe. Selo `Aguardando aprovação`; aviso `Aguardando aprovação de QA Infra / Solicitada por QA Admin Suporte em 08/10/2026 23:26`; "Editar" desabilitado com `Aguarde a solução ou devolutiva de QA Infra`; Conclusão com `Solução` somente leitura, sem "Resolver" nem "Enviar"; comentário permitido (publicado). Linha do tempo: item `Transferência solicitada`, data `08/10/2026 23:26`, texto `QA Admin Suporte do setor QA Suporte encaminhou o chamado para a fila de QA Infra.`, meta só com a data.

### TR7

I (setor QA Infra) em `/queue`: #141, #143, #144, #147 e os legados #66, #68, #70 em "Em aberto" com o selo `Aguardando aprovação` e sem ações. Contagens da tela (Todos 9, Em aberto 9, Encaminhados 0, Em andamento 0) = QT2 de F (`9 / 9 / 0 / 0`). No detalhe de #141: sem "Atender", sem "Enviar para outro setor", sem "Resolver"; o campo de solução é `readOnly`.

### TR8

A em `/queue`: #141 não aparece; contagens da tela 68 / 24 / 8 / 14 / 15 = QT2 de S (`68 / 24 / 8 / 14 / 15`). #144 (então ainda em QA Suporte) estava na lista.

### TR9

M em `/tickets/147` (destinatário, autor A): botão visível, enviou para QA Infra. Um POST 200, toast `Chamado #147 enviado para a fila de QA Infra.`, navegação para `/tickets` sem 404 e sem erro de console. "Atribuídos a mim" de M foi de 15 para 14 e #147 saiu da lista. Banco: ticket 147 `aguardando_aprovacao`, setor 19, `assigned_to` nulo; transferência 12 (`requested_by` 14, 18 -> 19); histórico 300 (`encaminhado -> aguardando_aprovacao`, assignee 14 -> nulo).

### TR10

D em `/tickets/142` (chamado de QA Suporte, destinatário A): botão visível, Diretoria entre as opções. Enviou para a Diretoria: toast `Chamado #142 enviado para a fila de Diretoria.`, D continuou no detalhe, que passou a mostrar `Aguardando aprovação`, `Aguardando aprovação de Diretoria`, e a linha do tempo `Henrique Coruqieri do setor Diretoria encaminhou o chamado para a fila de Diretoria.` Histórico 298 (`changed_by` 6, setor 18 -> 11, assignee 13 -> nulo).

### TR11

M em `/tickets/143` (autor e destinatário, `em_andamento`): enviou para QA Infra; permaneceu em `/tickets/143` (toast `Chamado #143 enviado para a fila de QA Infra.`, diálogo fechado), "Editar" desabilitado com `Aguarde a solução ou devolutiva de QA Infra`. Histórico 301 (`em_andamento -> aguardando_aprovacao`, assignee 14 -> nulo).

### TR12

Duas sessões em contextos separados do mesmo navegador (A na janela principal, D numa segunda janela), ambas com o diálogo de `/tickets/144` aberto. A enviou para QA Infra; D (diálogo antigo, Diretoria) enviou em seguida. D: toast `Este chamado já foi enviado para QA Infra e aguarda aprovação.`, diálogo fechado e a página atualizada com o selo `Aguardando aprovação`. Banco: uma só transferência para #144 (id 10, 18 -> 19, `requested_by` 13) e uma só linha `transferencia_solicitada` (297).

### TR13

Requests `POST` com `Next-Action` (id capturado de um envio real, abortado antes de sair), como A:

| Request                                                             | Resposta                                                   |
| ------------------------------------------------------------------- | ---------------------------------------------------------- |
| #84 (`[QA] Janela aberta`, `resolvido`), `to = 19`, `expected = 18` | `CONFLICT`, `O status deste chamado mudou para Resolvido.` |
| #141 (pendente, A sem acesso), `to = 15`, `expected = 19`           | `NOT_FOUND`, `Chamado não encontrado.`                     |
| #141, `to = 18`, `expected = 19`                                    | `NOT_FOUND`, `Chamado não encontrado.`                     |
| #99999 (inexistente)                                                | `NOT_FOUND`, `Chamado não encontrado.`                     |

Nada gravado: `max(ticket_history.id)` 296 -> 296 e `max(ticket_transfer.id)` 9 -> 9 depois do bloco (incluindo o TR15).

### TR14

M em `/tickets/146` (autor, destinatário A): botão ausente. Request com `to = 19`, `expected = 18`: `CONFLICT`, `Você não pode mais enviar este chamado para outro setor. Confira a página atualizada.` Antes e depois: `max(ticket_history.id)` 299, `max(ticket_transfer.id)` 11, ticket 146 `encaminhado`, setor 18.

### TR15

Requests de A em #144 (`aberto`, QA Suporte, ainda sem envio):

| `toDepartmentId` / `expectedDepartmentId` | Resposta                                                                                |
| ----------------------------------------- | --------------------------------------------------------------------------------------- |
| 18 / 18                                   | `INVALID_INPUT`, `Escolha um setor diferente do atual.`                                 |
| `"abc"` / 18                              | `INVALID_INPUT`, `Selecione o setor de destino.`                                        |
| 0 / 18                                    | `INVALID_INPUT`, `Selecione o setor de destino.`                                        |
| 999999 / 18                               | `INVALID_TARGET`, `Este setor não está disponível. Escolha outro setor ativo.`          |
| 16 ("Não alocado") / 18                   | `INVALID_TARGET`, mesma mensagem                                                        |
| 20 (`[QA] Setor inativo`) / 18 (extra)    | `INVALID_TARGET`, mesma mensagem                                                        |
| 15 / 19 (`expectedDepartmentId = F`)      | `CONFLICT`, `Este chamado agora está no setor QA Suporte. Confira a página atualizada.` |

Nada gravado (ver TR13). Na interface: `Selecione o setor de destino.` ao enviar sem escolher.

### TR16

Antes do envio de #145, I recebeu 404 ao abrir o chamado (em QA Suporte). A enviou #145 para QA Infra (A saiu para `/tickets` e `/tickets/145` virou 404 para A). Depois: I abre #145 e vê `[QA] Privado da origem` (risco 1, aceito); M (autor, não autor da mensagem) abre #145 e vê `Comentários 0 / Nenhum comentário ainda.` (antes do envio, M via a mensagem).

### TR17

```sql
select count(*) from ticket where current_department_id <> origin_department_id and status <> 'aguardando_aprovacao';  -- 0
select count(*) from ticket where current_department_id <> origin_department_id;                                   -- 11
```

Registro: 0 chamados somem das abas de autor. Os 11 fora da origem estão todos em `aguardando_aprovacao`.

### TR18

390×844, M: `/tickets` com seis abas, sem rolagem horizontal da página (`scrollWidth = clientWidth = 375`), a barra de abas rola internamente (`overflow-x: auto`, 947 px de conteúdo em 335 de largura); "Cancelados" rolou para a vista e clicou (URL `?tab=cancelled`). A, `/tickets/148`: sem rolagem horizontal; diálogo 358×318 px dentro da tela; combobox abre, opção QA Infra em y = 628 (32 px de altura) dentro dos 844; "Enviar" e "Cancelar" alcançáveis (y = 493 e 533). Diálogo cancelado sem enviar. Screenshots: `.qa-output/tr18-dialog-combobox.png`, `.qa-output/tr18-dialog.png`, `.qa-output/tr18-tickets-mobile.png`.

### TR19

`get_errors` do `next-devtools` vazio depois de cada bloco (um único registro de "Failed to fetch" apareceu em `/tickets/144` por causa do aborto proposital do request para capturar o `Next-Action`; foi causado pelo teste, não pela aplicação). `.next/dev/logs/next-development.log`: nas entradas desta bateria (a partir de ~07:22 de relógio do servidor) só esse "Failed to fetch". As demais linhas de erro do arquivo (ex.: `AWAITING_APPROVAL_TICKET_STATUS is not defined`, `mapMyTicketsTabs is not defined`) são de edições de código em andamento, anteriores à bateria. Nenhum aviso de hidratação. Nenhuma linha de Resend nem `RESEND_API_KEY não configurada`; nenhum envio de e-mail disparado.

## Falhas

Nenhuma.

## Erros fora dos cenários

Nenhum. O 404 de `/tickets/141` e `/tickets/145` abertos direto pela URL por quem perdeu o acesso é o comportamento previsto (o console do navegador registra o erro de recurso 404 esperado).

## Não executados

Nenhum.

## Observações

- **Janelas do navegador.** O TR12 exigiu duas sessões ao mesmo tempo, e cookie é compartilhado dentro de um contexto; por isso o `playwright` abriu uma segunda janela (contexto novo, mesma instância do Chrome) para D e depois I (TR7, TR10, TR12, TR16). Foi fechada ao fim. A janela principal ficou aberta em `/dashboard` (logada como M).
- **Request de action.** O `Next-Action` foi capturado de um envio real abortado por rota do Playwright (nada chegou ao servidor) e reutilizado via `fetch` na própria página, com os cookies do papel logado.
- **Ordem das opções do diálogo.** Diretoria vem antes do resto, que segue em ordem alfabética (o TR2 compara conjunto, não ordem). Não é divergência do contrato; fica para o `df-architect` dizer se a ordem deve ser fixada.
- **"Conclusão com o aviso de espera" (TR6).** O aviso `Aguardando aprovação de {destino} · Solicitada por…` aparece no cabeçalho do chamado; dentro da Conclusão há só o campo `Solução` somente leitura. Entendi como atendido; o contrato poderia dizer onde o aviso mora.
- **Período padrão em Meus chamados.** O padrão é `Hoje`; o TR5 exige clicar em `Todos` antes de comparar com a consulta MT.
- **Dados deixados.** Os chamados enviados continuam `aguardando_aprovacao` com transferência `pendente` (ids 9 a 14); só a Etapa 2 permite concluí-los. #146 e #148 ficaram sem envio.
