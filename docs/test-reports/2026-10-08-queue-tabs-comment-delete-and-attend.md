# Relatório de testes — Abas da Fila, exclusão de comentário e "Atender"

- **Data:** 2026-10-08
- **Contrato:** `docs/contracts/queue-tabs-comment-delete-and-attend.md` (com a revisão de 2026-10-08 de `docs/contracts/department-queue.md`)
- **Commit:** `99e2995` · alterações não comitadas: sim (27 arquivos, os da feature)
- **Ambiente:** `http://localhost:3000`, `next dev`, banco de desenvolvimento
- **Resultado:** 39 de 41 passaram · 1 falhou · 0 bloqueados · 1 não executado

## Pré-requisitos

- Dev server respondeu 200 em `/login`; `next-devtools`, `playwright` e `postgres` (`SELECT 1`) disponíveis.
- Usuários conferidos no banco (leitura): Diretor (id 6, Diretoria), QA Admin Suporte (13) e QA Membro Suporte (14), todos ativos, sem troca de senha pendente. QA Admin Infra (15) está inativo; não era necessário nesta bateria.
- E-mail: no `.env` a linha é `RESEND_API_KEY= #"re_…"`. O valor depois do `=` é um comentário, então a chave está efetivamente vazia. O `grep -E "^RESEND_API_KEY=.+"` da checklist devolve 1 linha por causa do espaço e do `#`. Nenhum cenário desta bateria dispara e-mail, e o log do dev server não tem nenhuma linha de Resend ou de "e-mail não enviado".
- Dados criados (todos `[QA]`, só em QA Suporte): `#127` (G1), `#128` (G2), `#129` (G3), `#130` (G4), `#131` (G5), `#132` (G6), `#133` (K2), `#134` (G7, "Atender devolvido"), `#135` (G8, "Atender diretor"), `#136` (G9, "Atender mobile"). Comentários do K2: `d1`=29, `d2`=30, `d4`=31, `d3`=32 (A), `d5`=33 e `d6`=34 (extras da corrida e do CD6). `#65` a `#68` não foram tocados (conferido no banco no fim).
- Ao final: QA Membro Suporte e QA Admin Suporte ativos em QA Suporte.

## Cenários

| #    | Cenário                                                        | Papel     | Status        |
| ---- | -------------------------------------------------------------- | --------- | ------------- |
| QT1  | Sete abas na ordem do contrato, "Em aberto" ativa              | M         | PASSOU        |
| QT2  | Contagens das abas = consulta QT2 (QA Suporte)                 | M + banco | PASSOU        |
| QT3  | Soma das seis abas = Todos − L1 + L2                           | banco     | PASSOU        |
| QT4  | Conteúdo de cada aba (ids e ordem)                             | M         | PASSOU        |
| QT5  | URLs `?tab=` válidas, antigas e inválidas                      | M         | PASSOU        |
| QT6  | Filtros por aba (Status e Destinatário)                        | M         | PASSOU        |
| QT7  | Período em Encaminhados e troca de aba                         | M         | PASSOU        |
| QT8  | Diretor: setor na URL, contagens, troca de setor mantém a aba  | D         | PASSOU        |
| QT9  | Estados vazios das abas novas e "Nenhum chamado neste período" | D         | PASSOU        |
| QT10 | Detalhe a partir de Encaminhados e link de voltar              | M         | PASSOU        |
| QT11 | Assumir `#127` move de Em aberto para Em andamento             | A         | PASSOU        |
| QT12 | Mobile 390×844, `?tab=cancelled`                               | M         | PASSOU        |
| CD1  | "Excluir" e "Editar" só nos comentários do autor               | M         | PASSOU        |
| CD2  | Dialog de confirmação e Cancelar                               | M         | PASSOU        |
| CD3  | Confirmar exclusão de comentário público                       | M         | PASSOU        |
| CD4  | Banco após CD3                                                 | banco     | PASSOU        |
| CD5  | Excluir comentário privado                                     | M         | PASSOU        |
| CD6  | Forjar exclusão de comentário de outra pessoa                  | A e M     | PASSOU        |
| CD7  | Forjar id inexistente e id de outro chamado                    | M         | PASSOU        |
| CD8  | Forjar id inválido (`"abc"`, `0`, `1e12`)                      | M         | PASSOU        |
| CD9  | Exclusão repetida em duas abas                                 | M         | PASSOU        |
| CD10 | Editar na aba 1 depois de excluir na aba 2                     | M         | PASSOU        |
| CD11 | Comentário em chamado `fechado`/`cancelado`                    | M         | NÃO EXECUTADO |
| CD12 | Diretor sem "Excluir" em comentário alheio                     | D         | PASSOU        |
| CD13 | Dialog em 390×844                                              | M         | PASSOU        |
| CD14 | Linha do tempo do K2 não muda                                  | M + banco | PASSOU        |
| AT1  | "Atender" no `#128`, sem "Editar"                              | A         | PASSOU        |
| AT2  | Atender: pendente, toast, badge, botão some, linha do tempo    | A         | PASSOU        |
| AT3  | Banco após AT2                                                 | banco     | PASSOU        |
| AT4  | Fila: `#128` sai de Encaminhados e entra em Em andamento       | M         | PASSOU        |
| AT5  | Autor e destinatário: "Atender" e "Editar", modo de edição     | M         | PASSOU        |
| AT6  | Atender o `#131`                                               | M         | PASSOU        |
| AT7  | Casos sem botão "Atender"                                      | vários    | PASSOU        |
| AT8  | Forjar `attendTicket` em chamado de outro destinatário         | M         | PASSOU        |
| AT9  | Duas abas, conflito por reenvio                                | A         | PASSOU        |
| AT10 | Conflito: chamado devolvido à fila                             | A e M     | PASSOU        |
| AT11 | Conflito: chamado enviado a outra pessoa                       | A e D     | PASSOU        |
| AT12 | Forjar id inválido e id de chamado de outro setor              | A         | PASSOU        |
| AT13 | Forjar em `#66` e em chamado resolvido                         | A         | PASSOU        |
| AT14 | Mobile 390×844 do cabeçalho                                    | A e M     | PASSOU        |
| AT15 | Sem e-mail e sem erro nem aviso de hidratação                  | todos     | FALHOU        |

## Falhas

### #AT15 — Erro de hidratação no detalhe do chamado (uma ocorrência)

- **Papel:** QA Membro Suporte (`qa.member.suporte@directflow.test`)
- **Passos:** 1. Entrar como M. 2. Abrir `/tickets/130` pela primeira vez na sessão (primeira compilação da rota no dev server). 3. Ler o console e o `get_logs`.
- **Esperado:** nenhum erro nem aviso de hidratação (AT15).
- **Obtido:** o console do navegador registrou "A tree hydrated but some attributes of the server rendered HTML didn't match the client properties". O diff aponta o `<input>` da busca do topo (`Primitive.input` do cmdk, `placeholder="Buscar por n° ou título do chamado"`), com a linha `- style={{caret-color:"transparent"}}` presente só no lado do servidor. A árvore afetada é a do `TicketDetailPage`. O `get_errors` do `next-devtools` continuou vazio.
- **Reprodução:** não reproduziu. Depois dessa ocorrência foram carregados o detalhe `#128`, `#129`, `#130`, `#131`, `#132`, `#133`, `#134`, `#135`, `#136`, `#74` e outros, com M, A e D, e nenhum repetiu o erro (`console error` = 0; no log do dev server só há uma ocorrência, `03:57:19`). Nem a Fila (`/queue`) nem outras telas registraram o erro.
- **Evidência:** `.qa-output/console-2026-10-08T22-59-22-262Z.log` (linhas 3 a 80), `.qa-output/g4-detail.png`; `.next/dev/logs/next-development.log`, linhas 373 e 374.
- **Camada provável:** app (componente de busca do topo, que renderiza em todas as páginas do grupo `(app)`; só apareceu no detalhe). Não há indício de ligação com as três mudanças desta feature; registrado como falha porque a regra do df-qa trata erro de hidratação como falha.
- **Dono:** df-ui

## Erros fora dos cenários

- O mesmo erro de hidratação acima (seção Falhas). Nenhum outro erro de runtime, build ou hidratação: `get_errors` do `next-devtools` devolveu `configErrors: []` e `sessionErrors: []` depois dos blocos de cenário.
- Na parte antiga do `next-development.log` (antes do início do teste, horário `03:50`) há `Error: Expected '</', got 'jsx text'` em `ticket-list-tabs.tsx:38` e `ReferenceError: ActiveTabNav is not defined`. São erros de edição em andamento (HMR), já resolvidos quando a bateria começou; nenhum se repetiu durante o teste.

## Não executados

- **CD11** (comentário de M em chamado `fechado`/`cancelado`): não existe nenhuma linha em QA Suporte. Consulta: `select t.id, t.status, m.id from message m join ticket t on t.id = m.ticket_id where t.status in ('fechado','cancelado','resolvido') and m.user_id = 14` devolveu só `#74` e `#126`, ambos `resolvido` e ainda dentro da janela (o detalhe do `#74` mostra "Editar" e "Excluir" no comentário de M). O contrato manda registrar "não executado" nesse caso. A regra `TICKET_FINISHED` da exclusão, portanto, não foi exercida no navegador.

## Evidências por cenário

### Abas da Fila

- **QT1, QT2.** Estado inicial de QA Suporte (setor 18) antes de qualquer escrita: abas `Todos 50 · Em aberto 21 · Encaminhados 2 · Em andamento 6 · Resolvidos 14 · Fechados 0 · Cancelados 0`, com "Em aberto" `aria-current="page"` e a ordem do contrato. Consulta QT2 no mesmo momento: `todos=50, em_aberto=21, encaminhados=2, em_andamento=6, resolvidos=14, fechados=0, cancelados=0`. Depois da preparação, o banco deu `57 / 24 / 5 / 7 / 14 / 0 / 0` e as abas mostraram os mesmos números.
- **QT3.** Antes da preparação, por setor (`L1` = `aberto`, `em_analise` ou `aguardando_aprovacao` com destinatário; `L2` = `em_andamento` sem destinatário):
  - QA Suporte (18): `todos=50, L1=7, L2=0`; seis abas somadas = 21+2+6+14 = 43 = 50 − 7 + 0.
  - Diretoria (11): `todos=34, L1=2, L2=3`; seis abas somadas = 20+1+3+5+3+3 = 35 = 34 − 2 + 3.
  - Suporte (14): `todos=5, L1=0, L2=0`. QA Infra (19): `todos=2, L1=0, L2=0`.
  - Os 7 chamados L1 de QA Suporte aparecem só em "Todos" (riscos 1 e 2 do contrato).
- **QT4.** Em aberto (24): `#133, #130, #127, #121, #113, #111, #110, #109, #92 …`, com `#130` e `#113/#111/#110` com selo "Encaminhado" e `#70/#68/#66` como "Aguardando aprovação"; sem `#128`, `#129`, `#131`, `#132`. Encaminhados (5): `#132, #131, #128, #118, #114`. Em andamento (7): `#129, #120, #119, #117, #116, #115, #112`. Todos (57) começa em `#133, #132, #131, #130, #129, #128, #127, #126`. Mais novo primeiro nas quatro.
- **QT5.** `?tab=open&periodo=todos`, `?tab=all`, `?tab=forwarded`, `?tab=in_progress` abrem a aba certa. `?tab=todos`, `?tab=em_andamento` e `?tab=Open` abrem "Em aberto" com período Todos. Nenhum erro no console nem no `get_errors`.
- **QT6.** Popover "Filtros": Todos = Status com 8 opções; Em aberto = Status com 5 (Aberto, Em análise, Encaminhado, Aguardando aprovação, Em andamento) e Destinatário só "Sem destinatário"; Encaminhados = sem filtro Status, Destinatário só "QA Admin Suporte"; Em andamento = sem filtro Status, Destinatário com pessoas.
- **QT7.** Em Encaminhados, `Hoje` gera `?tab=forwarded&periodo=hoje` com `Todos 8 · Em aberto 3 · Encaminhados 3 · Em andamento 1 · Resolvidos 1`; consulta no banco (`created_at >= hoje`): `todos=8, em_aberto=3, encaminhados=3, em_andamento=1`. `Semana` gera `periodo=semana`; trocar para Em andamento mantém `periodo=semana`. O número de Semana não foi conferido no banco.
- **QT8.** `/queue?setor=18` mostrou `50/21/2/6/14/0/0`. Clicar em Encaminhados levou a `?tab=forwarded&setor=18&periodo=todos`. Trocar o filtro Setor para Diretoria levou a `?tab=forwarded&periodo=todos` (sem `setor`), aba mantida, contagens `34/20/1/3/5/3/3`, iguais à consulta QT2 da Diretoria.
- **QT9.** Suporte (14), Em aberto: `Nenhum chamado em aberto` / `Os chamados na fila do setor, ainda sem destinatário, aparecem aqui até alguém assumir ou recebê-los.`; Fechados e Cancelados com os textos antigos. QA Infra (19): `Nenhum chamado encaminhado` / `Os chamados do setor encaminhados para alguém aparecem aqui até o destinatário começar o atendimento.` e `Nenhum chamado em andamento` / `Os chamados do setor em atendimento aparecem aqui até serem resolvidos.` Com `periodo=hoje`: `Nenhum chamado neste período`. O estado vazio de "Todos" não foi exercido: nenhum setor existente está sem chamados.
- **QT10.** De `?tab=forwarded&periodo=hoje`, o link do `#128` abre `/tickets/128?from=queue&tab=forwarded&periodo=hoje`; o link "Fila do setor" tem `href="/queue?tab=forwarded&periodo=hoje"` e volta com Encaminhados ativa.
- **QT11.** Como A, "Assumir o chamado #127": toast `Você assumiu o chamado #127.`; contagens antes `60/24/6/9/14` e depois `60/23/6/10/14`; o `#127` saiu de Em aberto e entrou em Em andamento.
- **QT12.** 390×844, `?tab=cancelled`: `document.scrollWidth = 390 = innerWidth` (sem rolagem horizontal da página); o `nav` das abas tem `overflow-x: auto`, `scrollWidth=939`, `clientWidth=350`, e a aba ativa (Cancelados) está visível (`x=237`, `right=370`, `scrollLeft=589`: a página rola a aba ativa para a vista). Screenshot `.qa-output/qt12-cancelled-mobile.png`.

### Excluir comentário

- **CD1.** Como M em `/tickets/133`: botões "Editar comentário…" e "Excluir comentário de QA Membro Suporte de 08/10/2026 19:59" em `d1`, `d2`, `d4`; nenhum botão em `d3` (QA Admin Suporte).
- **CD2.** Dialog `alertdialog`: `Excluir comentário? O comentário será removido do chamado para todos que o veem. Esta ação não pode ser desfeita. Cancelar Excluir`. Cancelar fechou, o foco voltou ao botão "Excluir comentário…", zero `POST` e os cinco itens continuaram. Screenshot `.qa-output/cd2-dialog.png`.
- **CD3.** O request foi `POST /tickets/133` com `[{"ticketId":133,"messageId":29}]`. Durante o envio o botão do dialog mostrou `Excluindo…` e depois o dialog fechou e `d1` saiu da lista. O toast de sucesso não foi capturado nesta execução (o polling de toast ficou vazio); o toast `Comentário excluído.` foi capturado no CD5, que usa o mesmo fluxo.
- **CD4.** Consultas depois do CD3: `select count(*) from message where id = 29` = 0; `select count(*) from attachment where message_id = 29` = 0; `max(id)` de `ticket_history` = 268 (igual ao anotado); `ticket.updated_at` do `#133` = `2026-10-08 22:59:15.269446+00` (igual ao anotado).
- **CD5.** `d2` (privado, `visibility = 'interna'`): toast `Comentário excluído.`; `message` sem o id 30; `attachment` do id 30 = 0; `max(id)` de `ticket_history` = 268; `updated_at` do `#133` inalterado.
- **CD6.** O id da action `deleteTicketComment` foi lido do request real (`Next-Action` `40425ffc…`). M forjou `{ticketId:133, messageId:32}` (`d3`): `{"ok":false,"code":"FORBIDDEN","message":"Você não pode excluir este comentário."}`. A, que não vê "Excluir" nos comentários de M, forjou `messageId:34` (`d6`, de M): mesma resposta. `d3` e `d6` continuam no banco. Observação: `d4` já tinha sido excluído no CD9 quando A foi testado, então A forjou em `d6`, equivalente.
- **CD7.** `messageId = 999999`: `{"ok":false,"code":"NOT_FOUND","message":"Este comentário não existe mais. Confira a lista atualizada."}`. `messageId = 31` com `ticketId = 127`: mesma resposta. Nada apagado.
- **CD8.** `messageId = "abc"`, `0` e `1e12`: `{"ok":false,"code":"INVALID_INPUT","message":"Comentário inválido."}` nos três.
- **CD9.** Aba 1 excluiu `d4` (`31`); na aba 2 (sem recarregar), `Excluir` → confirmar: toast `Este comentário não existe mais. Confira a lista atualizada.`, dialog fechou, lista recarregada sem `d4`. Screenshot `.qa-output/cd9-tab2.png`. A primeira tentativa do cenário deu timeout do meu script (cliquei antes da hidratação da aba 1, o dialog não abriu); nada foi gravado nela e o cenário foi refeito do zero na mesma aba, sem alterar o jeito de executar.
- **CD10.** M publicou `d5` (id 33); a aba 1 abriu a edição e digitou outro texto; a aba 2 excluiu `d5`; a aba 1 clicou em "Salvar": toast `Comentário não encontrado.`; `d5` continua ausente do banco. Screenshot `.qa-output/cd10-tab1.png`. Na aba 1 o "Editar/Excluir" do item em edição some e o dos outros itens continua.
- **CD12.** Diretor em `/tickets/133`: três itens (Abertura, `d3`, `d6`) sem nenhum botão.
- **CD13.** 390×844: o `alertdialog` tem `x=35, width=320` dentro de 390 e os botões `Excluir` (`y=448`) e `Cancelar` (`y=488`), 288 de largura cada, empilhados e alcançáveis; `scrollWidth = 390`. Screenshot `.qa-output/cd13-mobile.png`.
- **CD14.** `select count(*) from ticket_history where ticket_id = 133` = 1 antes e depois (só a criação).

### Atender

- **AT1.** Como A em `/tickets/128` (`encaminhado`, destinatário A, autor M): botões do cabeçalho "Atender" e nenhum "Editar". Screenshot `.qa-output/at1-g2.png`.
- **AT2.** Clique: o texto do botão passou de `Atender` para `Atendendo…`; toast `Você começou a atender o chamado #128.`; badge `Em andamento`; "Atender" sumiu; linha do tempo ganhou "Mudança de status · QA Admin Suporte · 08/10/2026 20:01 — Alterou o status de Encaminhado para Em andamento." O `attendTicket` saiu como `POST /tickets/128` com `Next-Action` `40aea7cd…`.
- **AT3.** `ticket 128`: `status = 'em_andamento'`, `assigned_to = 13`, `updated_at = 2026-10-08 23:01:44.159+00`; `ticket_history` do chamado: id 250 (`criacao`) e id 261 (`mudanca_status`, `from_status = 'encaminhado'`, `to_status = 'em_andamento'`, `changed_by = 13`, `changed_at = 2026-10-08 23:01:44.159+00`), com `from_assignee_id`/`to_assignee_id` nulos e nenhuma `atribuicao`.
- **AT4.** Como M, `/queue`: `#128` fora de Encaminhados e dentro de Em andamento (lista Em andamento: `#129, #120, #119 …` em QT4 antes; `#132, #129, #128, #127 …` depois), com as contagens se movendo de 1 em 1.
- **AT5.** M em `/tickets/131` (autor e destinatário): botões `["Atender","Editar"]` lado a lado. Em "Editar": `["Cancelar","Salvar alterações"]` ("Atender" some, como na recomendação). "Cancelar": `["Atender","Editar"]` de volta. Screenshots `.qa-output/at5-view.png` e `at5-edit.png`.
- **AT6.** Clique: toast `Você começou a atender o chamado #131.`; badge `Em andamento`; "Atender" = 0, "Editar" = 1. Banco: `mudanca_status` id 269 (`encaminhado → em_andamento`, `changed_by = 14`) e o `max(id)` de `ticket_history` passou de 268 para 269 (só esta linha).
- **AT7.** Contagem de botões "Atender" = 0 para: M em `#132` (destinatário A) e `#127` (fila); A em `#129` (`em_andamento`) e `#130` (`encaminhado` na fila) e `#127`; D em `#132` e `#136` (destinatário A). M em `#135` (destinatário M, `encaminhado`) tem 1, como esperado.
- **AT8.** M forjou `attendTicket` para o `#132` (destinatário A): `{"ok":false,"code":"CONFLICT","message":"Este chamado agora está com QA Admin Suporte."}`. Para o `#136` (também de A): mesma resposta. `max(id)` de `ticket_history` ficou em 268 e `#136` continua `encaminhado`.
- **AT9.** A em duas abas de `/tickets/132`: aba 1 → toast `Você começou a atender o chamado #132.`; aba 2, sem recarregar → toast `Você já está atendendo este chamado.`, página atualizou (badge `Em andamento`, sem botão). `ticket_history` do `#132`: `criacao` (254) e **uma** `mudanca_status` (262). Screenshot `.qa-output/at9-tab2.png`.
- **AT10.** Com A em `/tickets/134` aberta, M devolveu o `#134` à fila pelo "Editar" (`assigned_to` virou `null`, status `encaminhado`); A clicou "Atender": toast `Este chamado voltou para a fila do setor. Confira a página atualizada.`, página atualizou sem o botão. Nenhuma `mudanca_status` nova (`max(id)` de `ticket_history` ficou em 268 depois da tentativa). Screenshot `.qa-output/at-conflict-134.png`.
- **AT11.** Com A em `/tickets/135` aberta, D (`/queue?setor=18&tab=forwarded`) enviou o `#135` para M (toast `Chamado #135 enviado para QA Membro Suporte.`); A clicou "Atender": toast `Este chamado agora está com QA Membro Suporte.`; sem botão depois; nada gravado pela tentativa (`max(id)` = 268). Screenshot `.qa-output/at-conflict-135.png`. Para executar o cenário sem abrir outro navegador, troquei o cookie de sessão no mesmo contexto (login de M, depois de D, e restauro dos cookies de A); A continuou com a página carregada antes da troca.
- **AT12.** A forjou `ticketId = "abc"`, `0`, `1e12`: `{"ok":false,"code":"INVALID_INPUT","message":"Chamado inválido."}` nos três. `ticketId = 21` (chamado da Diretoria, `encaminhado` para o usuário 17): `{"ok":false,"code":"NOT_FOUND","message":"Chamado não encontrado."}`. Forjar `actorId = 14` no payload do `#128` foi descartado pelo schema: a resposta é o conflito de A (`Você já está atendendo este chamado.`), não de M.
- **AT13.** `#66` (`aguardando_aprovacao`, sem destinatário, setor 18) e `#84` (`[QA] Janela aberta`, `resolvido`, sem destinatário): `{"ok":false,"code":"CONFLICT","message":"Este chamado voltou para a fila do setor. Confira a página atualizada."}` nos dois (nenhum tem destinatário, então a frase do destinatário atual é a da fila). `max(id)` de `ticket_history` ficou em 262 e `#66`/`#84` com `status` e `updated_at` iguais.
- **AT14.** 390×844, A em `/tickets/136`: o botão "Atender" fica abaixo do título (`x=20, y=254, 96×32`), sem rolagem horizontal (`scrollWidth = 375 = clientWidth`, com a barra de rolagem). M em `/tickets/131` (autor e destinatário): "Atender" e "Editar" lado a lado na mesma linha, abaixo do título, alcançáveis. Screenshots `.qa-output/at14-a-136-mobile.png` e `at14-m-131-mobile.png`. O "Editar" não aparece para A (não é autor), então os dois botões juntos só foram vistos com M.
- **AT15.** Nenhuma linha de Resend ou "e-mail não enviado" no log do dev server durante toda a bateria; nenhum e-mail disparado pelo "Atender" nem pela exclusão. Falha: o erro de hidratação único registrado na seção Falhas.

## Observações

- `RESEND_API_KEY` no `.env` tem o formato `RESEND_API_KEY= #"…"`, ou seja, o valor depois do `=` é um comentário. O pré-requisito 4 do df-qa (`grep -E "^RESEND_API_KEY=.+"`) devolve a linha por causa do espaço, apesar de a chave estar vazia. Vale o usuário confirmar se a intenção é deixar a chave vazia.
- Contrato, tabela de estados alcançáveis: `aguardando_aprovacao` sem destinatário (chamados `#66`, `#68` e `#70` de QA Suporte) aparece na aba "Em aberto" e o filtro Status de "Em aberto" oferece "Aguardando aprovação". Bate com o contrato.
- Não há aba que particiona: `#130` e `#134` (devolvidos à fila, `encaminhado` sem destinatário) aparecem em "Em aberto" com o selo "Encaminhado" e não em "Encaminhados" (risco 3 do contrato, comportamento aprovado).
- CD6 do contrato diz "forja `deleteTicketComment` com `messageId = d4`" para A. Como `d4` foi excluído no CD9 antes de testar A, usei um comentário de M criado para isso (`d6`); o resultado é o mesmo caso.
- AT13 do contrato espera o destinatário "atual", mas `#66` e `#84` não têm destinatário no banco, então a frase obtida é a da fila. A frase para destinatário diferente de quem age já foi exercida em AT8 e AT11.
- Na aba "Em aberto" de QA Suporte, a coluna Ações mostra o botão "Assumir" também para o chamado `#113`, `#111` e `#110` (status `Encaminhado` sem destinatário), coerente com o contrato; chamados "Aguardando aprovação" (`#70`, `#68`, `#66`) não mostram botão.
