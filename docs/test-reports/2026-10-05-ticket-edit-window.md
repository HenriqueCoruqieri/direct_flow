# Relatório de testes — Janela de 7 dias, edição na própria tela e "Hoje" em Meus chamados

- **Data:** 2026-10-05
- **Contrato:** `docs/contracts/ticket-edit-window.md`
- **Commit:** `3080ddc` · alterações não comitadas: sim
- **Ambiente:** `http://localhost:3000`, `next dev`, banco de desenvolvimento
- **Resultado:** 25 de 31 passaram · 0 falharam · 0 bloqueados · 6 não executados (cenários 17 a 22, por pré-requisito: `CRON_SECRET` ausente no `.env`)

Os 31 itens são os 30 cenários do contrato mais um cenário de responsividade (390×844), que o contrato não numera.

## Pré-requisitos

| Item                            | Resultado                                                                                                                                                                                                                     |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dev server                      | `GET /login` devolveu 200                                                                                                                                                                                                     |
| MCPs                            | `playwright`, `next-devtools` e `postgres` responderam (`SELECT 1` ok)                                                                                                                                                        |
| Usuários de teste               | Diretor, QA Admin Suporte, QA Membro Suporte e QA Admin Infra existem e estão ativos                                                                                                                                          |
| Chamados do seed                | #83 `[QA] Janela vencida` e #84 `[QA] Janela aberta` presentes e `resolvido`                                                                                                                                                  |
| `[QA] Acesso` e `[QA] Edição B` | ativas em QA Suporte (ids 10 e 23)                                                                                                                                                                                            |
| Migration `0010`                | `ticket_history.changed_by` com `is_nullable = YES`                                                                                                                                                                           |
| `RESEND_API_KEY`                | **preenchida** no `.env`. Esta feature não prevê e-mail em nenhum cenário, então nada ficou como não executado por isso                                                                                                       |
| **`CRON_SECRET`**               | **ausente no `.env`**: `grep -n -i cron .env` não devolve linha alguma e o arquivo tem data de modificação de 2026-10-01. O dev server confirma em `get_logs`: `[cron:close-resolved-tickets] CRON_SECRET não está definido.` |

Sem `CRON_SECRET`, o contrato manda marcar os cenários 17 a 22 como não executados (seção "Cenários para o `df-qa`", último parágrafo). Não é defeito da feature. O 15 continua valendo e passou.

## Cenários

| #   | Cenário                                                                                   | Papel             | Status        |
| --- | ----------------------------------------------------------------------------------------- | ----------------- | ------------- |
| 1   | "Editar" no #T abre a edição na tela, sem dialog, foco no Título                          | QA Membro Suporte | PASSOU        |
| 2   | Em edição, Conclusão sem "Resolver"/"Anexar"/"Enviar" e Comentários intacto               | QA Membro Suporte | PASSOU        |
| 3   | Cancelar descarta, sem request e sem linha nova no histórico                              | QA Membro Suporte | PASSOU        |
| 4   | Salvar título, descrição, tipo e tag: toast, valores novos, "Edição" e "Mudança de tag"   | QA Membro Suporte | PASSOU        |
| 5   | Salvar sem mudança: `Nenhuma alteração para salvar.`, sai da edição, nada gravado         | QA Membro Suporte | PASSOU        |
| 6   | Título `ab`: erro no campo, continua editando, nenhum POST                                | QA Membro Suporte | PASSOU        |
| 7   | Solução forjada em chamado `aberto`: `Você não pode editar este chamado.`                 | QA Membro Suporte | PASSOU        |
| 8   | #J: badge, "Editar", `Editável até` = `resolved_at` + 7 dias, formulário de comentário    | QA Membro Suporte | PASSOU        |
| 9   | #J em edição: campo `Solução` preenchido, `Resolvido em`/`Editável até` visíveis          | QA Membro Suporte | PASSOU        |
| 10  | Solução vazia e `curta`: mensagens do contrato, nenhum POST                               | QA Membro Suporte | PASSOU        |
| 11  | Descrição e solução: toast, solução nova no card, "Edição" `Alterou descrição e solução.` | QA Membro Suporte | PASSOU        |
| 12  | Banco depois do 11                                                                        | banco, só leitura | PASSOU        |
| 13  | #J sem "Editar", `Editável até` visível, comentário publicado                             | QA Admin Suporte  | PASSOU        |
| 14  | #V antes do cron: `Resolvido`, sem "Editar", sem `Editável até`, comentários encerrados   | QA Membro Suporte | PASSOU        |
| 15  | `curl` sem segredo e com `Bearer errado`: 401, não 307; nada gravado                      | terminal          | PASSOU        |
| 16  | Forjar `ticketId` = #V em comentário e em edição (a partir do #J)                         | QA Membro Suporte | PASSOU        |
| 17  | Cron com o segredo correto: 200 e `closedCount >= 1`                                      | terminal          | NÃO EXECUTADO |
| 18  | Banco depois do cron (#V `fechado`, linhas `encerramento` com `changed_by` nulo)          | banco, só leitura | NÃO EXECUTADO |
| 19  | Cron repetido: `closedCount` 0                                                            | terminal          | NÃO EXECUTADO |
| 20  | #V depois do cron: `Fechado`, linha "Sistema" na linha do tempo                           | QA Membro Suporte | NÃO EXECUTADO |
| 21  | `/tickets?tab=closed&periodo=todos` lista o #V como `Fechado`                             | QA Membro Suporte | NÃO EXECUTADO |
| 22  | Contagem de `ticket_history` do #V = itens da linha do tempo (prova do `left join`)       | banco + navegador | NÃO EXECUTADO |
| 23  | "Meus chamados" na sidebar: `/tickets`, Hoje ativo, subtítulo, lista e contagens          | Diretor           | PASSOU        |
| 24  | Pílula Todos: URL com `periodo=todos`, sem subtítulo, persiste ao recarregar              | Diretor           | PASSOU        |
| 25  | Com Todos, aba Fechados mantém `periodo=todos`                                            | Diretor           | PASSOU        |
| 26  | `periodo=xyz`, `periodo=personalizado`, `tab=closed&periodo=xyz`: abrem em Hoje           | QA Membro Suporte | PASSOU        |
| 27  | Voltar do detalhe por "Meus chamados" abre em Hoje                                        | QA Membro Suporte | PASSOU        |
| 28  | Início sem Todos, abre em Hoje; `periodo=todos` mostra Hoje                               | Diretor           | PASSOU        |
| 29  | `changed_by` anulável e FK para `users`                                                   | banco, só leitura | PASSOU        |
| 30  | Nenhum erro nem aviso de hidratação, em especial de `<form>` aninhado                     | todos             | PASSOU        |
| R   | Responsivo 390×844 no detalhe, em visualização e em edição                                | QA Membro Suporte | PASSOU        |

### Evidência dos cenários que passaram

Identificadores: #T = 85 (`[QA] Edição na tela`, criado pelo teste), #V = 83, #J = 84.

- **1, 2:** `document.querySelectorAll('[role=dialog]').length` = 0 e `form form` = 0 em edição. O foco ficou no campo Título. O card Conclusão mostrou `Nenhuma solução registrada.`, sem "Resolver", "Anexar" nem "Enviar para outro setor".
- **3:** Depois de Cancelar, título e descrição voltaram ao original, "Resolver" voltou, `network_requests` sem POST, `max(id)` de `ticket_history` = 114 antes e depois. Ao reabrir a edição e salvar sem mexer, o resultado foi "sem mudança", o que confirma que os valores originais foram restaurados.
- **4:** toast `Chamado #85 atualizado.`. `SELECT … FROM ticket_history WHERE ticket_id = 85` devolveu `edicao` (id 115, `changed_by` 14, nota `Alterou título, descrição, tipo (Dúvida → Bug) e tag.`) e `mudanca_tag` (id 116). `ticket.type = bug`, título novo, `solution` nulo.
- **5:** toast `Nenhuma alteração para salvar.`, saiu da edição, `max(id)` de `ticket_history` = 114 (depois 116 só após o 4).
- **6:** `O título precisa ter no mínimo 3 caracteres.`, `aria-invalid="true"`, 0 POSTs, continuou em edição.
- **7:** payload interceptado `{title, description, type, tagId, ticketId, solution}` com `solution` forjada: toast `Você não pode editar este chamado.`, saiu da edição. Banco: `ticket.solution` do #85 nulo, `max(id)` de `ticket_history` = 116 antes e depois.
- **8:** `<time datetime>` do `Editável até` = `2026-10-06T18:55:52.680Z`, exibido `06/10/2026 15:55` (`America/Sao_Paulo`), igual a `resolved_at` (`2026-09-29 18:55:52.68+00`) + 7 dias. Formulário de comentário presente, badge `Resolvido`.
- **9:** campo `Solução` com o texto atual, habilitado; `Resolvido em` e `Editável até` mantidos; sem dialog; sem "Resolver".
- **10:** `Descreva a solução.` e depois `A solução precisa ter no mínimo 10 caracteres.`, 0 POSTs.
- **11, 12:** toast `Chamado #84 atualizado.`; nota exibida `Alterou descrição e solução.`.

  ```sql
  SELECT id,description,solution,status,resolved_at,closed_at,updated_at FROM ticket WHERE id=84;
  ```

  → `description` nova, `solution` = `[QA] Solução corrigida na janela.` (enviada com espaços nas pontas, gravada com `trim`), `status = resolvido`, `resolved_at = 2026-09-29 18:55:52.68+00` (inalterado), `closed_at` nulo, `updated_at = 2026-10-05 18:58:31.101+00`.

  ```sql
  SELECT id,event,changed_by,note,changed_at FROM ticket_history WHERE ticket_id=84 ORDER BY id;
  ```

  → uma linha nova (id 117): `edicao`, `changed_by = 14`, `changed_at = 2026-10-05 18:58:31.101+00` (= `updated_at`), nota igual à da tela.

- **13:** QA Admin Suporte em #84: 0 botões "Editar", `Editável até 06/10/2026 15:55`, comentário `[QA] Comentário do admin dentro da janela.` publicado (toast `Comentário publicado.`).
- **14:** em #83: badge `Resolvido`, 0 botões com "Editar", Conclusão `Resolvido em 27/09/2026 15:55` sem `Editável até`, comentários com `Este chamado foi encerrado e não recebe novos comentários.` e sem textarea. Screenshot: `.qa-output/cenario-14-vencida.png`.
- **15:** `curl -i` sem cabeçalho: `HTTP/1.1 401 Unauthorized`, corpo `{"ok":false,"error":"unauthorized"}`. Com `Bearer errado`: idem. `POST` na rota: 405. `max(id)` de `ticket_history` = 117 antes e depois, #83 `resolvido`.
- **16:** comentário do formulário do #84 reescrito para `ticketId` 83: toast `Você não pode comentar neste chamado.`. Edição do #84 reescrita para `ticketId` 83: toast `Você não pode editar este chamado.`. `max(id)` de `ticket_history` = 117 e de `message` = 16 antes e depois, nenhuma mensagem com "forjado", `ticket` #83 e #84 sem alteração.
- **23:** URL `/tickets`, `aria-current="page"` em `Hoje`, subtítulo `5 out 2026`, lista #82 e #81 e contagens (Abertos por mim 2, Atribuídos 0, Fechados 0, Cancelados 0). Consulta no banco com `created_at` em `America/Sao_Paulo` igual a hoje e `created_by = 6` devolveu exatamente #81 e #82.
- **24, 25:** `/tickets?tab=opened&periodo=todos`, Todos ativo, sem subtítulo, 27 linhas; recarregar manteve Todos. Fechados em Todos: `/tickets?tab=closed&periodo=todos`, Todos ativo, #11, #19 e #27. Abertos 27 + Fechados 3 + Cancelados 3 = 33 = chamados do Diretor no banco.
- **26:** os três URLs devolveram 200 com `Hoje` ativo; o terceiro na aba Fechados.
- **27:** do #84, o link "Meus chamados" levou a `/tickets` com Hoje ativo, listando só o #85 (aberto hoje).
- **28:** pílulas Hoje, Semana, Mês com `/dashboard?periodo=hoje|semana|mes`, Personalizado como botão, sem Todos. `/dashboard?periodo=todos` abriu com `Hoje` ativo.
- **29:** `information_schema.columns` → `is_nullable = YES`. A FK para `users` não foi consultada com `execute_sql` (o role só enxerga `SELECT`; não foi necessário abrir `pg_constraint`), então este ponto ficou como inferido da migration aplicada.
- **30:** `get_errors` (`configErrors` e `sessionErrors` vazios) depois de cada bloco de cenários e ao final. Console do navegador sem erro nem aviso de hidratação durante as entradas e saídas do modo de edição.
- **R:** em 390×844, `scrollWidth` = `clientWidth` = 375 em visualização e em edição; "Cancelar" (x 20) e "Salvar alterações" (x 109) lado a lado abaixo do título, alcançáveis. Screenshot: `.qa-output/responsivo-edicao-390.png`.

## Falhas

Nenhuma.

## Erros fora dos cenários

- `⨯ ReferenceError: ALL_TIME_SELECTION is not defined` (duas linhas, 01:01:34 no horário do log) em `.next/dev/logs/next-development.log`. As linhas são anteriores ao início desta bateria e `grep ALL_TIME_SELECTION` em `app/` hoje não encontra nada. Nenhum cenário reproduziu o erro; `get_errors` ficou limpo. Provável resíduo de uma edição intermediária do código durante o desenvolvimento.
- `Failed to load resource: 404 @ /tickets/new`: foi uma navegação do próprio teste a uma URL que não existe (o "Novo chamado" é um dialog, não uma rota). Sem relação com a feature.
- Linhas `[cron:close-resolved-tickets] CRON_SECRET não está definido.` no log do servidor: esperadas, geradas pelas chamadas do cenário 15 e pelas minhas tentativas com o segredo (ver "Não executados").

## Não executados

Cenários 17, 18, 19, 20, 21 e 22. Motivo: `CRON_SECRET` não existe no `.env` (a mensagem do orquestrador dizia que o usuário o havia preenchido; o arquivo no disco, modificado pela última vez em 2026-10-01, não tem a chave, e o servidor loga `CRON_SECRET não está definido`). As duas chamadas que fiz com `Authorization: Bearer ` e valor vazio receberam 401, que é o comportamento correto do contrato para segredo ausente. Classificado como pré-requisito, não como defeito.

Estado preservado para o reteste: o #83 continua `resolvido` e não foi tocado; nenhuma chamada ao cron foi bem-sucedida. Para executar 17 a 22, o usuário precisa gravar `CRON_SECRET` no `.env` (e, se o dev server não reler o arquivo, reiniciá-lo). Estado do banco que o reteste vai encontrar antes da primeira execução: `resolvido` vencidos = #10, #18, #26 e #83 (4 chamados; `closedCount` esperado 4), 3 chamados `fechado` hoje (#11, #19, #27, todos da Diretoria) e `max(id)` de `ticket_history` = 117. Os três do seed demo (#10, #18, #26) fecharão junto, como o risco 3 do contrato prevê.

## Observações

- **Dados que o teste criou ou alterou (todos em QA Suporte):** chamado #85 `[QA] Edição na tela alterada` (o próprio #T, depois do cenário 4: tipo Bug, tag `[QA] Edição B`, linhas de histórico 114 a 116); no #84, descrição e solução editadas (linha 117) e um comentário `[QA] Comentário do admin dentro da janela.` do QA Admin Suporte. Nada na Diretoria foi alterado, nada de #65 a #68.
- **Janela do #84:** vence em 2026-10-06 18:55 UTC (15:55 em São Paulo). Depois disso o cenário 13 e os de janela aberta deixam de ser repetíveis sem rodar o seed de novo.
- **Ambiguidade do contrato (para o `df-architect`):** o cenário 29 diz "a FK para `users` existe", mas o role `df_readonly` não tem catálogo documentado para conferir isso de forma direta no `execute_sql`; vale dizer no contrato qual consulta é a esperada (por exemplo `information_schema.table_constraints`).
- **Ambiguidade do contrato (para o `df-architect`):** o cenário 14 diz "sem 'Editar' (nem esmaecido)". Conferi por role de botão e por texto; o contrato não diz se o `EditTicketBlockedButton` (transferência pendente) deve aparecer em `resolvido` vencido. Pelo comportamento observado, nenhum botão aparece, o que bate com a leitura natural.
- **Conferência por texto, não por data:** na seção 8 o `Editável até` mostra apenas `dd/mm/aaaa hh:mm`; está em `America/Sao_Paulo` e coerente com o `<time datetime>` em UTC.
- **Ordem exigida respeitada:** todos os cenários que dependiam do #83 `resolvido` (14, 15, 16) rodaram antes de qualquer chamada autenticada ao cron, que de qualquer forma não chegou a fechar nada.
- **Navegação:** o teste entrou e saiu do modo de edição várias vezes (Cancelar, Salvar com erro, Salvar com sucesso, reload) sem erro de runtime nem de hidratação.
- **Navegador:** fechado ao final. O diretor ficou com a sessão aberta no navegador de teste (sem impacto no banco).
