# Relatório de testes — Edição do chamado pelo autor (com filtro por data e regressões)

- **Data:** 2026-10-01 (execução entre 23h09 e 23h20 em Brasília, que já era 2026-10-02 em UTC)
- **Contratos:** `docs/contracts/ticket-edit.md` (cenários 1–20), `docs/contracts/my-tickets.md` (adendo 23–36 e regressão central), `docs/contracts/ticket-creation.md` (regressão 4, 5, 6, 13)
- **Commit:** `5f18af7` · alterações não comitadas: sim
- **Ambiente:** `http://localhost:3000`, `next dev`, banco de desenvolvimento
- **Resultado:** 48 de 49 passaram · 0 falharam · 0 bloqueados · 1 não executado (13g da criação)

## Pré-requisitos

- Dev server 200 em `/login`; MCP `playwright`, `next-devtools` e `postgres` (`SELECT 1`) respondendo.
- `enum_range(null::history_event)` contém `edicao` (migration 0008 aplicada).
- Usuários QA ativos (ids: admin Suporte 13, membro Suporte 14, admin Infra 15; diretor 6).
- `RESEND_API_KEY` está **preenchida** no `.env`. A edição não envia e-mail e a criação não faz parte dos cenários de notificação deste relatório, então nenhum cenário foi marcado como não executado por isso.

## Dados gravados pela interface

| O quê                                                             | Id                                                                                                                                                                                           | Quem                          |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| Tag `[QA] Edição B` (QA Suporte)                                  | `tag` 23 (criada, desativada no 18, reativada no fim: **ativa**)                                                                                                                             | Admin Suporte                 |
| `[QA] Edição base` (#E, hoje "[QA] Edição base alterada")         | `ticket` 69                                                                                                                                                                                  | Membro Suporte                |
| `[QA] Outro setor` (destino QA Infra, aguardando aprovação)       | `ticket` 70, `ticket_transfer` 7                                                                                                                                                             | Membro Suporte                |
| `[QA] Edição admin`                                               | `ticket` 71                                                                                                                                                                                  | Admin Suporte                 |
| `[QA] Edição infra`                                               | `ticket` 72                                                                                                                                                                                  | Admin Infra                   |
| Histórico                                                         | `ticket_history` 83 a 92 (83 criação #69; 84 e 85 criação e transferência do #70; 86 `edicao`, 87 `edicao`, 88 `mudanca_tag`, 89 criação #71, 90 `edicao`, 91 `mudanca_tag`, 92 criação #72) | —                             |
| QA Membro Suporte movido para QA Infra e de volta para QA Suporte | `users` 14                                                                                                                                                                                   | Diretor (Cadastros → Pessoas) |

Nenhum chamado da Diretoria foi alterado e #65 a #68 não foram tocados (`updated_at` idêntico ao anterior).

## Cenários

### Edição (`ticket-edit.md`)

| #   | Cenário                                                                                                 | Papel            | Status |
| --- | ------------------------------------------------------------------------------------------------------- | ---------------- | ------ |
| E1  | Botão "Editar" no #69                                                                                   | Membro Suporte   | PASSOU |
| E2  | Dialog com valores atuais, sem campos de setor/status/prioridade/responsável; Cancelar fecha sem gravar | Membro Suporte   | PASSOU |
| E3  | Título, descrição e tipo (Dúvida → Bug): toast, cabeçalho e linha do tempo                              | Membro Suporte   | PASSOU |
| E4  | Banco depois do 3                                                                                       | banco            | PASSOU |
| E5  | Reabrir o dialog traz os valores do 3                                                                   | Membro Suporte   | PASSOU |
| E6  | Trocar só a tag para `[QA] Edição B`: `edicao` + `mudanca_tag`, detalhe e Meus chamados                 | Membro Suporte   | PASSOU |
| E7  | Banco depois do 6                                                                                       | banco            | PASSOU |
| E8  | Salvar sem mudar: `Nenhuma alteração para salvar.`, nada gravado                                        | Membro Suporte   | PASSOU |
| E9  | Espaços nas pontas do título: igual ao 8                                                                | Membro Suporte   | PASSOU |
| E10 | Título `ab`, descrição `curta`: erros e nenhum request                                                  | Membro Suporte   | PASSOU |
| E11 | `tagId` forjado (`[QA] Rede`): erro no campo Tag, foco, `aria-invalid`                                  | Membro Suporte   | PASSOU |
| E12 | Admin Suporte abre #69: sem "Editar"                                                                    | Admin Suporte    | PASSOU |
| E13 | Admin Suporte forja `ticketId` 69 a partir do #71                                                       | Admin Suporte    | PASSOU |
| E14 | #66 sem botão; forja `ticketId` 66 a partir do #69                                                      | Membro Suporte   | PASSOU |
| E15 | Admin Infra: #69 e #66 em 404; forja 69 e 999999 a partir do #72                                        | Admin Infra      | PASSOU |
| E16 | Diretor: #69 sem botão; #5 com botão; #11 e #12 sem; nada salvo                                         | Diretor          | PASSOU |
| E17 | Membro com dialog aberto, Diretor muda o setor dele, membro salva                                       | Membro + Diretor | PASSOU |
| E18 | Tag atual desativada: campo vazio, aviso, `Selecione a tag.`, escolher `[QA] Acesso` salva              | Admin + Membro   | PASSOU |
| E19 | `enum_range` com `edicao`; nenhum `ticket_tag` duplicado                                                | banco            | PASSOU |
| E20 | Sem erro nem aviso de hidratação no dev server                                                          | qualquer         | PASSOU |

Detalhes e evidências:

- **E3**: toast `Chamado #69 atualizado.`; item "Edição · QA Membro Suporte · 01/10/2026 23:10 · Editou o chamado." com a nota `Alterou título, descrição e tipo (Dúvida → Bug).`.
- **E4**: `select * from ticket_history where ticket_id = 69` devolve o `id` 86, `event = edicao`, `changed_by = 14`, `note = 'Alterou título, descrição e tipo (Dúvida → Bug).'`, todas as colunas `from_*`/`to_*` nulas, `changed_at = 2026-10-02 02:10:16.498+00`. `ticket.updated_at` = `2026-10-02 02:10:16.498+00` (igual). `ticket_tag` do #69 continua com `tag_id = 10`. `status = aberto`, `priority = media`, `assigned_to` nulo, `current_department_id = origin_department_id = 18`, iguais aos do início.
- **E6/E7**: ids 87 (`edicao`, `Alterou tag.`) e 88 (`mudanca_tag`, `from_tag_id = 10`, `to_tag_id = 23`), ambos com `changed_at = 02:10:28.152`. `ticket_tag` do #69 com uma linha só (`tag_id = 23`). A linha do #69 em Meus chamados mostrou `[QA] Edição B`.
- **E8/E9**: `max(ticket_history.id)` ficou em 88 e `ticket.updated_at` em `02:10:28.152` depois dos dois envios. O 8 fez 1 request da action; o 10 não fez nenhum.
- **E10**: as mensagens são `O título precisa ter no mínimo 3 caracteres.` e `A descrição precisa ter no mínimo 10 caracteres.` (iguais à tabela da criação), 2 campos com `aria-invalid`.
- **E11**: payload original `[{"title":…,"type":"bug","tagId":23,"ticketId":69}]`, reescrito com `tagId` 11. O dialog ficou aberto com `Esta tag não está disponível. Escolha uma tag ativa do seu setor.`. O foco ficou no `button[role=combobox]` do campo Tag com `aria-invalid="true"`. `max(ticket_history.id)` ficou em 88 e o título não mudou.
- **E13/E14/E15**: mensagens `Você não pode editar este chamado.` (13 e 14) e `Chamado não encontrado.` (15, para 69 e 999999). Consulta posterior: `updated_at` de #66 igual ao do início e de #69 sem mudança; `ticket_history` só ganhou criações (89 e 92); `ticket_transfer` só ganhou o 7, do #70.
- **E16**: botão "Editar" presente nos chamados próprios `aberto` (#5), `em_analise` (#6), `encaminhado` (#7), `em_andamento` (#8) e `resolvido` (#10), e ausente em `aguardando_aprovacao` (#9), `fechado` (#11), `cancelado` (#12) e no #69 (alheio). Bate com a tabela de status do contrato. O dialog do #5 foi aberto e cancelado.
- **E17**: dois contextos de navegador. O Diretor moveu o membro para QA Infra com o dialog dele aberto. Ao salvar, o membro recebeu `Você não pode editar este chamado.`, o dialog fechou, a página voltou sem o botão e continuou abrindo (autor). `max(ticket_history.id)` ficou em 91 e o título do #69 não mudou. O membro foi devolvido a QA Suporte (`department_id` 18).
- **E18**: campo Tag exibiu `Selecione a tag`, com `A tag atual não está disponível. Escolha uma tag ativa do seu setor.`. Salvar sem escolher mostrou `Selecione a tag.`. A lista só tinha `[QA] Acesso`. Ao salvar: ids 90 (`edicao`, `Alterou tag.`) e 91 (`mudanca_tag`, `from_tag_id = 23`, `to_tag_id = 10`). `ticket_tag` ficou com uma linha só (`tag_id = 10`). A tag `[QA] Edição B` foi reativada ao final.
- **E19**: `enum_range` lista `criacao … mudanca_tag, edicao`. `select ticket_id from ticket_tag group by ticket_id having count(*) > 1` devolve 0 linhas.
- **E20**: `get_errors` do `next-devtools` devolveu `configErrors: []` e `sessionErrors: []` no começo e no fim. No arquivo de log do dev server, desde o primeiro carregamento do teste (06:14 no relógio do log) só há linhas INFO e `Compiled`. As linhas ERROR que existem no log (05:15 a 05:26: `PRESET_PERIODS_WITH_ALL_TIME is not defined`, `and is not defined` em `my-tickets.ts`, `Can't resolve './_components/period-filter'`) são anteriores ao teste e vêm de edição em andamento com hot reload.

### Meus chamados: filtro por data (adendo 23–36)

| #   | Cenário                                                                                         | Papel           | Status                   |
| --- | ----------------------------------------------------------------------------------------------- | --------------- | ------------------------ |
| 23  | Seletor Todos/Hoje/Semana/Mês/Personalizado, Todos ativo, sem subtítulo, contagens do cenário 3 | Diretor         | PASSOU                   |
| 24  | Hoje, Semana e Mês: URLs, subtítulo e contagens contra o banco                                  | Diretor         | PASSOU                   |
| 25  | Fronteira de fuso (ver nota)                                                                    | Diretor, Membro | PASSOU (dado substituto) |
| 26  | Personalizado 1 a 10 do mês anterior, calendário começando na segunda                           | Diretor         | PASSOU                   |
| 27  | Trocar de aba com Semana ativo                                                                  | Diretor         | PASSOU                   |
| 28  | Fechados com Semana, clicar Mês                                                                 | Diretor         | PASSOU                   |
| 29  | Busca e filtro de Tipo zeram ao trocar o período                                                | Diretor         | PASSOU                   |
| 30  | Período sem chamados: estado vazio, seletor visível, Todos volta                                | Membro Suporte  | PASSOU                   |
| 31  | `periodo` inválido ou `personalizado` malformado: Todos, sem erro                               | Membro Suporte  | PASSOU                   |
| 32  | `tab` inválida com `periodo=semana` e o inverso                                                 | Membro Suporte  | PASSOU                   |
| 33  | `periodo=todos` igual ao padrão                                                                 | Membro Suporte  | PASSOU                   |
| 34  | "Voltar" depois de 24 e 27                                                                      | Diretor         | PASSOU                   |
| 35  | Início sem "Todos", padrão Hoje, `?periodo=todos` mostra Hoje                                   | Diretor         | PASSOU                   |
| 36  | Sem erro de runtime nem hidratação; nada gravado pela navegação                                 | qualquer        | PASSOU                   |

- **23/24**: contagens do Diretor: Todos `24 / 0 / 3 / 3`; Hoje, Semana e Mês `1 / 0 / 0 / 0` (só o #64); subtítulos `1 out 2026`, `28 set – 4 out 2026`, `1–31 out 2026`. Consulta com `at time zone 'America/Sao_Paulo'` para os mesmos intervalos devolveu os mesmos números. Ordem do seletor: Todos, Hoje, Semana, Mês, Personalizado.
- **25 (nota)**: o dado do cenário (chamado criado ontem entre 21h e 23h59 de Brasília) não existe no banco. O seed demo foi montado em relação a 24/09, não a hoje. `select … where created_at >= '2026-09-30 18:00-03' and created_at < '2026-10-01 00:00-03'` devolve 0 linhas. Como o teste do fuso precisa de um chamado perto da meia-noite, usei os que existem:
  - Personalizado 23/09 a 23/09 (`#13` criado às 23:59 de Brasília, que em UTC já é dia 24): lista `#13 #10`, contagens `2 / 0 / 1 / 1`. Bate com a consulta no fuso de São Paulo (`ids = 10,13`, `closed = 1`, `cancelled = 1`).
  - Personalizado 24/09 a 24/09 (`#5` às 00:01 de Brasília): lista `#9 #8 #7 #6 #5`, contagens `5 / 0 / 0 / 0`, o #5 fora do dia 23.
  - Membro em Hoje: `#70 #69 #68 #67 #66 #65`. Os #69 a #70 foram criados às 23:09 de Brasília, quando em UTC já era dia 2. O Início e Meus chamados mostram `1 out 2026`.
  - Não executei o cenário literal. Para rodá-lo é preciso um chamado criado entre 21h e 23h59 de Brasília de "ontem", e o seed hoje não tem. Ver Observações.
- **26**: URL `/tickets?tab=opened&periodo=personalizado&de=2026-09-01&ate=2026-09-10`, subtítulo `1–10 set 2026`, abas `6 / 0 / 0 / 1`, lista `#26 #25 #24 #23 #22 #21`. Consulta devolve `opened 6, closed 0, cancelled 1`. Cabeçalho do calendário: `seg, ter, …`. Não há chamado do Diretor no dia 10, então a inclusão do último dia ficou coberta pelo teste do 25.
- **27/28**: Fechados e Cancelados com Semana mantêm `periodo=semana`; as quatro contagens ficam as de Semana (`1 / 0 / 0 / 0`). Em `tab=closed&periodo=semana`, Mês leva a `tab=closed&periodo=mes`.
- **29**: busca `a` deu 24 linhas, filtro Bug 3 linhas com 1 selecionado. Ao clicar Hoje a busca ficou vazia e o botão Filtros sem seleção.
- **30**: Membro, Personalizado 1 a 10 de setembro: `Nenhum chamado neste período` com `Nenhum chamado desta aba foi aberto no período escolhido. Escolha outro período ou "Todos".`, sem tabela, contagens `0 / 0 / 0 / 0`, subtítulo `1–10 set 2026`. Clicar Todos volta a `/tickets?tab=opened` com 6 linhas.
- **31/32/33**: as oito URLs devolvem a página sem erro. `?periodo=xyz`, `Hoje`, `personalizado` e as duas malformadas: Todos; `?tab=xyz&periodo=semana`: Abertos por mim + Semana; `?tab=closed&periodo=xyz`: Fechados + Todos; `?tab=opened&periodo=todos`: Todos.
- **34**: Hoje, Semana, Fechados e três "voltar": cada passo volta com URL, aba, período e contagens coerentes (`/tickets?tab=opened&periodo=semana`, `…=hoje`, `/tickets`).
- **35**: `/dashboard` mostra Hoje, Semana, Mês e Personalizado (sem Todos), Hoje ativo e subtítulo `1 out 2026`; os hrefs são `/dashboard?periodo=hoje|semana|mes`. `/dashboard?periodo=todos` mostra Hoje ativo. `?periodo=semana`, `mes` e `personalizado&de=2026-09-01&ate=2026-09-10` seguem iguais (`28 set – 4 out 2026`, `1–31 out 2026`, `1–10 set 2026` com 7 chamados, tag Impressora).
- **36**: sem erro no `get_errors` nem no log. A navegação pelas telas não criou linhas. `max(ticket)` e `max(ticket_history)` só avançaram nos momentos em que eu criei chamados pela interface (ver tabela de dados gravados).

### Regressão de Meus chamados (`my-tickets.md`)

| #   | Cenário                                                                                   | Papel                | Status |
| --- | ----------------------------------------------------------------------------------------- | -------------------- | ------ |
| R1  | Cenários 2, 3 e 4: abas, contagens contra o banco, lista                                  | Membro e Diretor     | PASSOU |
| R2  | Cenários 5 e 6: estados vazios das abas Atribuídos, Fechados e Cancelados                 | Membro Suporte       | PASSOU |
| R3  | Cenário 7: "voltar" do navegador entre abas                                               | Membro Suporte       | PASSOU |
| R4  | Cenário 8: `tab` inválida ou repetida                                                     | Membro Suporte       | PASSOU |
| R5  | Cenários 10 e 11: grupos do filtro por aba                                                | Diretor              | PASSOU |
| R6  | Cenários 12 a 15 e 18: abrir pela linha ou teclado; detalhe e linha do tempo do #66 e #65 | Membro, Diretor      | PASSOU |
| R7  | Cenários 16 e 20: 404 para Admin Infra e para ids inválidos                               | Admin Infra, Diretor | PASSOU |
| R8  | Cenário 21: título da aba do navegador                                                    | Membro Suporte       | PASSOU |

- **R1**: Membro, banco `a = 6, b = 0, c = 0, d = 0` e abas `6 / 0 / 0 / 0` (ids 70, 69, 68, 67, 66, 65). Diretor, banco e abas `24 / 0 / 3 / 3`. Colunas #, Título, Tipo, Tag, Setor atual, Status, Aberto em; #66, #68 e #70 com `Aguardando aprovação` e setor atual QA Suporte.
- **R2**: `Nenhum chamado atribuído a você`, `Nenhum chamado fechado`, `Nenhum chamado cancelado`, com as descrições do contrato.
- **R4**: `?tab=xyz` e `?tab=Closed` mostram Abertos por mim; `?tab=closed&tab=opened` mostra Fechados.
- **R5**: em Abertos por mim, o menu de filtros tem Status (6 status não finais), Tipo (6), Tag (tags presentes e `Sem tag`); em Fechados, só Tipo e Tag.
- **R6**: clicar na célula do meio da linha #66 vai para `/tickets/66`; teclado (foco no link `#65`, Enter) vai para `/tickets/65`. #66 sem botão de ação, com aviso `Aguardando aprovação de QA Infra`, `Solicitada por QA Membro Suporte em 01/10/2026 00:03` e dois itens de linha do tempo. #65 com um item "Abertura".
- **R7**: Admin Infra: #65, #66 e #69 em 404. Diretor: `/tickets/abc`, `0`, `1e2`, `99999999999`, `999999` em 404 (títulos `404: This page could not be found.`).
- **R8**: `Chamado #65 · Direct Flow` no próprio; `404: This page could not be found.` em `/tickets/30` (de outra pessoa).

Os cenários 1, 9, 17, 19 e 22 do contrato original não foram repetidos: não passam pelos arquivos alterados desta entrega (a busca do 9 foi exercida no 29, o 17 pelo 12 de edição no #69).

### Regressão da criação (`ticket-creation.md`)

| #      | Cenário                                                         | Papel          | Status        |
| ------ | --------------------------------------------------------------- | -------------- | ------------- |
| C4     | Validação: vazio, `ab`, `curta`, sem request                    | Membro Suporte | PASSOU        |
| C5     | Criar `[QA] Edição base` no próprio setor (usado como #E)       | Membro Suporte | PASSOU        |
| C6     | Criar `[QA] Outro setor` para QA Infra: aviso, toast e banco    | Membro Suporte | PASSOU        |
| C13a–f | Combobox: lista, filtro sem acento e caixa, vazio, teclado, Esc | Membro Suporte | PASSOU        |
| C13g   | Rolagem da lista com mais de 8 tags                             | Membro Suporte | NÃO EXECUTADO |
| C13h   | `tagId` forjado no formulário de criação                        | Membro Suporte | PASSOU        |

- **C4**: vazio mostra `Informe o título.`, `Descreva o chamado.`, `Selecione o tipo do chamado.` e `Selecione a tag.`; `ab` e `curta` mostram `O título precisa ter no mínimo 3 caracteres.` e `A descrição precisa ter no mínimo 10 caracteres.`. Nenhum POST.
- **C5**: toast `Chamado #69 criado.`; o card "Chamados no período" do Início foi de 4 para 5. Banco: `ticket` 69 `aberto`, `media`, `current = origin = 18`, `ticket_tag.tag_id = 10`, `ticket_history` 83 `criacao` com `to_status = aberto`.
- **C6**: aviso `O chamado vai aguardar a aprovação do administrador de QA Infra. Depois de enviado, você não poderá mais alterá-lo.`; toast `Chamado #70 enviado para aprovação de QA Infra.`; card de 5 para 6. `ticket_transfer` 7 e `ticket_history` 84 e 85 (conferido pelos ids).
- **C13a/b/c**: Setor de destino abre com foco em `Buscar setor…`; Diretoria primeiro; sem Não alocado nem setor inativo; `infra`, `INFRA` e `infrá` deixam só `QA Infra`; `xyz` mostra `Nenhum resultado.`. Esc fecha só a lista (dialog aberto, foco no combobox).
- **C13d/e/f**: `[QA] Configuração` está inativa, então busquei com a tag ativa `[QA] Edição B`: `edicao`, `EDIÇÃO` e `ácesso` filtram sem acento e sem diferença de caixa. Teclado: Enter abre, três setas num total de duas opções terminam na segunda (volta ao início depois do último), Enter escolhe, fecha a lista e devolve o foco ao gatilho com o nome escolhido. Esc na lista de tags fecha só a lista, valor e dialog mantidos.
- **C13h**: `tagId` 23 trocado por 11 no payload (que traz `departmentId: 18`): `Esta tag não está disponível. Escolha uma tag ativa do seu setor.`, foco no `button[role=combobox]` com `aria-invalid="true"`, `max(ticket)` 72 e `max(ticket_history)` 92 inalterados.

### Responsivo (390×844)

| #    | Cenário                                                                   | Papel          | Status |
| ---- | ------------------------------------------------------------------------- | -------------- | ------ |
| Resp | `/tickets/69`, `/tickets`, `/tickets?periodo=semana` e o dialog de edição | Membro Suporte | PASSOU |

`scrollWidth` igual a `clientWidth` nas três telas (sem rolagem horizontal). Botão "Editar" visível (`x 20, y 254, 83×32`). Dialog com 358 px de largura, sem estouro (`scrollWidth 358`), botão "Salvar alterações" alcançável (`y 633`). Calendário do Personalizado cabe na tela (220 px de largura, termina em y 792). Screenshots em `.qa-output/edit-dialog-390.png` e `.qa-output/my-tickets-picker-390.png`.

## Falhas

Nenhuma.

## Erros fora dos cenários

Nenhum durante a execução. O único erro no console do navegador (`1 errors`) é o 404 esperado de `/tickets/30` (R8).

## Não executados

- **C13g** (rolagem da lista de tags): exige pelo menos 10 tags ativas em QA Suporte. Só há 2 (`[QA] Acesso` e `[QA] Edição B`) e reativar as 9 `[QA] Lista NN` seria muito clique de interface para um componente que esta entrega só reaproveita. Fica para um reteste, se o usuário quiser.
- **E17** foi executado (dois contextos de navegador).

## Observações

1. **Cenário 25 do `my-tickets.md` depende de dado que o seed não tem hoje.** O seed demo (`docs/contracts/dashboard.md`) monta os chamados em relação à data em que roda (aqui, 24/09). Com o dia de hoje (01/10), não existem "chamados de ontem entre 21h e 23h59". O contrato deveria dizer como obter esse dado (reexecutar o seed no dia do teste ou criar o chamado pela interface depois das 21h) ou aceitar a fronteira 23:59/00:01 usada aqui. Dono: `df-architect`.
2. **Início com `periodo=todos` mostra "Hoje" ativo, mas a URL permanece `?periodo=todos`** (não é normalizada). O contrato 35 diz apenas "mostra Hoje"; registro como comportamento observado, não como divergência.
3. **Edição dos chamados `encaminhado`/`resolvido`** aparece para o autor (#7 e #10 do Diretor), de acordo com a tabela do contrato.
4. O seed demo continua intacto; as contagens do Diretor (`24 / 0 / 3 / 3`) não mudaram.
5. Limpeza: `[QA] Edição B` ficou **ativa** (reativada ao final do E18, como pede o contrato). `[QA] Acesso` também ativa. Os chamados #69 a #72 ficam como dados `[QA]` no banco.

## Reteste 1 — botão "Editar" esmaecido em chamado aguardando aprovação

- **Data:** 2026-10-02 (execução entre 00h01 e 00h13 em Brasília)
- **Contratos:** `docs/contracts/ticket-edit.md` (cenários 14, 16 e 21 a 25) e `docs/contracts/ticket-creation.md` (`NewTicketBlockedButton`, cenários 1 e 10)
- **Commit:** `5f18af7` · alterações não comitadas: sim
- **Motivo:** `NewTicketBlockedButton` passou a usar `app/_components/blocked-action-popover.tsx`; a edição ganhou o estado `blocked` (`ticketEditButtonStateFor`).
- **Resultado:** 11 de 11 passaram · 0 falharam · 0 bloqueados · 0 não executados

### Dados gravados pela interface neste reteste

| O quê                                                                      | Quem                          | Estado final                    |
| -------------------------------------------------------------------------- | ----------------------------- | ------------------------------- |
| `[QA] Acesso` (tag 10) e `[QA] Edição B` (tag 23) desativadas e reativadas | Admin Suporte                 | as duas **ativas**              |
| QA Membro Suporte (`users` 14) movido para Não alocado e de volta          | Diretor (Cadastros → Pessoas) | `department_id` 18 (QA Suporte) |

Nenhum chamado foi criado ou alterado: `max(ticket)` 72 e `max(ticket_history)` 92 antes e depois, `updated_at` de #66, #68 e #69 iguais ao do início (`2026-10-01 03:03:59.46`, `2026-10-01 04:27:02.88`, `2026-10-02 02:12:22.893`).

### Cenários

| #    | Cenário                                                                                                  | Papel                                              | Status |
| ---- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ------ |
| 21   | #66: "Editar" esmaecido (`aria-disabled="true"`, sem `disabled`), Popover com o texto exato              | Membro Suporte                                     | PASSOU |
| 22   | #66: cliques repetidos, `Enter` e `Espaço` não abrem o dialog nem chamam a action                        | Membro Suporte                                     | PASSOU |
| 23   | #66: foco por `Tab`, Popover aberto, `aria-describedby` para `sr-only`                                   | Membro Suporte                                     | PASSOU |
| 24   | #66 sem botão (nem esmaecido)                                                                            | Admin Suporte e Diretor                            | PASSOU |
| 25   | #68: mesmo comportamento com o setor de destino                                                          | Membro Suporte (Admin Suporte e Diretor sem botão) | PASSOU |
| 14   | #66 esmaecido; `ticketId` forjado a partir do #69 devolve `Você não pode editar este chamado.`           | Membro Suporte                                     | PASSOU |
| 16   | Diretor: #69 e #66 sem botão; #5 com botão; #11 (`fechado`) e #12 (`cancelado`) sem botão, nem esmaecido | Diretor                                            | PASSOU |
| N1   | Novo chamado bloqueado por setor sem tag ativa: explicação no clique e no foco                           | Membro Suporte                                     | PASSOU |
| N2   | Novo chamado bloqueado por Não alocado: explicação no clique e no foco                                   | Membro Suporte                                     | PASSOU |
| N3   | Editar normal (#69) abre o dialog; Novo chamado normal abre o dialog                                     | Membro Suporte                                     | PASSOU |
| Resp | #66 em 390×844                                                                                           | Membro Suporte                                     | PASSOU |

### Evidências

- **21**: `<button type="button">` com `aria-disabled="true"`, `hasAttribute("disabled")` falso, opacidade 0.5, cursor `not-allowed`, texto `Editar`. Clique abriu `[data-slot=popover-content]` com `Chamado encaminhado para o setor QA Infra, aguarde a devolutiva` (aria-label `Por que não é possível editar o chamado`). Banco: `ticket_transfer` do #66 `pendente`, destino QA Infra. Screenshot `.qa-output/ticket-edit-66-blocked.png`.
- **22**: com cliques repetidos o Popover alterna (abre, fecha, abre) e nenhum `role=dialog` com "Editar chamado" aparece; nenhum `<form>` montado; 0 POSTs capturados. Teclado: com o foco no botão, `Enter` fecha o Popover que o foco tinha aberto e o `Enter` seguinte reabre; `Espaço` idem. É o comportamento previsto (observação do revisor). Consulta posterior: `max(ticket_history.id)` 92 e `ticket.updated_at` do #66 sem mudança.
- **23**: `Tab` chegou ao botão em 4 passos, `:focus-visible` verdadeiro e Popover aberto sem roubar o foco (`document.activeElement` continua no botão). `aria-describedby` aponta para um elemento de classe `sr-only` com o mesmo texto, presente também com o Popover fechado (conferido logo após o carregamento, antes de qualquer interação). Nome acessível `Editar`.
- **24/25**: Admin Suporte em #66, #68 e #69: nenhum botão com "Editar" e nenhum `aria-disabled="true"`. Diretor em #66, #68 e #69: idem, e nenhum `sr-only` com a mensagem. #68 pelo membro: mesmo estado esmaecido, mesma mensagem (destino QA Infra, conferido em `ticket_transfer`), sem dialog.
- **14**: payload original `[{"title":"[QA] Edição base alterada x",…,"tagId":10,"ticketId":69}]` reescrito na rede para `"ticketId":66`. Toast `Você não pode editar este chamado.`, dialog fechado. `max(ticket_history.id)` 92 e `ticket.updated_at` do #66 inalterado; título do #69 continua `[QA] Edição base alterada`.
- **16**: Diretor com botão (`aria-disabled` nulo) no #5 (aberto, próprio); sem botão no #11, #12, #66, #68 e #69. O #9 (`aguardando_aprovacao` próprio, sem `ticket_transfer` no banco) também ficou sem botão, nem esmaecido (ver Observações). Nada salvo na Diretoria.
- **N1**: com `[QA] Acesso` e `[QA] Edição B` desativadas pelo Admin Suporte pela interface (QA Suporte sem tag ativa), o Início do membro mostra o botão com `aria-disabled="true"`, sem `disabled`, opacidade 0.5, `aria-describedby` para `sr-only` com `Não há nenhuma Tag disponível para registro de chamados, informe seu administrador.`. Clique abre o Popover (aria-label `Por que não é possível abrir chamados`) com o mesmo texto e não abre o dialog de criação; segundo clique fecha. Foco por `Tab` (2 passos) abre o Popover; `Enter` fecha, `Enter` reabre; `Espaço` fecha. 0 POSTs. Screenshot `.qa-output/new-ticket-blocked-sem-tag.png`.
- **N2**: com o membro movido para Não alocado, o botão traz `Seu perfil não está associado a nenhum setor, informe seu administrador.`; clique e foco por `Tab` abrem o Popover, `Enter`/`Espaço` alternam, o dialog de criação nunca abre, 0 POSTs. Screenshot `.qa-output/new-ticket-blocked-nao-alocado.png`. Bônus: com o membro no Não alocado, o #66 (dele) abre sem botão de edição, nem esmaecido (fora do setor do editor).
- **N3**: após reativar as tags e devolver o membro a QA Suporte, "Novo chamado" tem `aria-disabled` nulo e abre o dialog `Novo chamado`; no #69, "Editar" tem `aria-disabled` nulo, opacidade 1, abre `Editar chamado #69` com título `[QA] Edição base alterada` e descrição atuais, sem Popover aberto; "Cancelar" fecha sem gravar.
- **Resp**: em 390×844 (viewport efetiva de 375 de largura), `scrollWidth` igual a `clientWidth`; botão "Editar" em x 20, y 254, 83×32; Popover em x 0, largura 288, dentro da tela. Screenshot `.qa-output/ticket-edit-66-blocked-390.png`.
- **Erros**: `get_errors` do `next-devtools` com `configErrors: []` e `sessionErrors: []` no começo, depois de cada bloco e no fim. Console do navegador sem erro nem aviso.

### Falhas

Nenhuma.

### Erros fora dos cenários

Nenhum durante este reteste. O log do dev server tem linhas ERROR (`isNonFinalTicketStatus is not defined`, `ticketEditButtonStateFor is not defined`) com timestamps 07:01 e 07:05 no relógio do log, que corresponde a cerca de 23h52 e 23h56 em Brasília (o último registro do log, 07:13, coincide com a última escrita do arquivo às 00:04), portanto anteriores ao início do reteste (00h01). Vêm de edição em andamento com hot reload; o `page.tsx` foi salvo às 23h57 e hoje importa `ticketEditButtonStateFor`. Depois disso só há INFO e `Compiled`.

### Observações do reteste

1. **Primeira tentativa de foco por teclado no N1 descartada por falha de método meu.** Naquele passo tirei o foco com `blur()` e comecei o `Tab` do meio da página, e a leitura do estado não mostrou o Popover. Refiz com o mesmo procedimento do 23 (recarregar e `Tab` desde o topo) e o resultado é o descrito em N1. O 23 e o N2 usaram o procedimento correto na primeira vez. Nada mudou no sistema entre as duas execuções.
2. **A ferramenta de navegador trata `aria-disabled` como "não habilitado"** e recusa o clique sem `force: true`; usei `force: true` nos cliques nos botões esmaecidos, que continuam recebendo o evento (o Popover abre).
3. **#9 do Diretor (`aguardando_aprovacao` do seed, sem `ticket_transfer`)** fica sem botão, como diz o contrato (inconsistência sem destino cai em `STATUS_NOT_EDITABLE` e vira `hidden`). Registrado só como comportamento observado.
4. Limpeza: `[QA] Acesso` e `[QA] Edição B` **ativas**; QA Membro Suporte em QA Suporte; contextos extras do navegador fechados.
