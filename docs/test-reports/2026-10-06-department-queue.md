# Relatório de testes — Fila do setor

- **Data:** 2026-10-06
- **Contrato:** `docs/contracts/department-queue.md`
- **Commit:** `7e22da2` · alterações não comitadas: sim
- **Ambiente:** `http://localhost:3000`, `next dev`, banco de desenvolvimento
- **Resultado:** 32 de 33 passaram · 1 falhou · 0 bloqueados · 0 não executados

## Pré-requisitos

- Dev server respondeu 200 em `/login`. MCPs `playwright`, `next-devtools` e `postgres` responderam.
- `RESEND_API_KEY` vazia no `.env` (a feature não envia e-mail).
- Usuários conferidos no banco (leitura): Diretor (id 6, Diretoria), QA Admin Suporte `A` (13), QA Membro Suporte `M` (14), ambos ativos em QA Suporte (setor 18); QA Admin Infra `I` (15) inativo, em QA Infra (19), mantido assim. Não alocado = 16; setores inativos 20 e 21.
- Chamados criados por `M` pela interface: `[QA] Fila livre` = #102 (#F1), `[QA] Fila do admin` = #103 (#F2, destinatário `A`), `[QA] Fila concorrência` = #104 (#F3).
- Baseline: `max(ticket.id)` 101, `max(ticket_history.id)` 152, `max(ticket_transfer.id)` 8. Final: 104, 161, 8.
- Navegador na janela do servidor MCP, 1280×900 (desktop) e 390×844 (Q31). A janela foi deixada aberta.

## Cenários

| #   | Cenário                                                                                    | Papel                 | Status |
| --- | ------------------------------------------------------------------------------------------ | --------------------- | ------ |
| Q1  | Item "Fila do setor" abaixo de "Meus chamados", leva a `/queue`, ativo                     | M                     | PASSOU |
| Q2  | `/queue`: título, abas com contagem, Todos ativo, sem subtítulo, sem filtro Setor, colunas | M                     | PASSOU |
| Q3  | Contagens e ids batem com a consulta no banco (QA Suporte 33/0/0)                          | M + banco             | PASSOU |
| Q4  | Hoje, Semana, Mês e Personalizado (ontem–hoje)                                             | M                     | PASSOU |
| Q5  | Parâmetros inválidos e preservação do período ao trocar de aba                             | M                     | PASSOU |
| Q6  | Filtros Status/Tipo/Tag/Destinatário em Em aberto; Fechados sem Status                     | M, Diretor (Fechados) | PASSOU |
| Q7  | Clique na linha e no título abrem o detalhe                                                | M                     | PASSOU |
| Q8  | M no Não alocado: sem item no menu, aviso na página, sem abas nem tabela                   | Diretor + M           | PASSOU |
| Q9  | Filtro Setor do Diretor: opções, Diretoria marcada, contagens 28/3/3                       | Diretor               | PASSOU |
| Q10 | Escolher QA Suporte, trocar aba e período, voltar à Diretoria                              | Diretor               | PASSOU |
| Q11 | `setor` inválido, 0, 007, 999999, Não alocado, setor inativo                               | Diretor               | PASSOU |
| Q12 | `setor` ignorado para admin e membro                                                       | A, M                  | PASSOU |
| Q13 | Botões na fila da Diretoria (sem clicar)                                                   | Diretor               | PASSOU |
| Q14 | Sem botões em #F1 e #F2 para o membro                                                      | M                     | PASSOU |
| Q15 | Botões por linha para o admin                                                              | A                     | PASSOU |
| Q16 | "Assumir" no #F1: toast, linha atualizada, sem navegar                                     | A                     | PASSOU |
| Q17 | Gravação do Assumir no banco                                                               | banco                 | PASSOU |
| Q18 | Detalhe do #F1 e Atribuídos a mim após o Assumir                                           | M                     | PASSOU |
| Q19 | Dialog "Enviar": textos, dica, opções, clique não navega                                   | A                     | PASSOU |
| Q20 | Enviar #F1 para M: toast, dialog fecha, banco                                              | A                     | PASSOU |
| Q21 | #F1 volta a Atribuídos a mim                                                               | M                     | PASSOU |
| Q22 | Diretor só "Enviar" fora da Diretoria; envia #F2; banco com `changed_by = D`               | Diretor               | PASSOU |
| Q23 | Salvar sem escolher destinatário                                                           | Diretor               | PASSOU |
| Q24 | `sendTicket` forjado por membro                                                            | M                     | PASSOU |
| Q25 | Destinatário forjado (Diretor, inativo, 999999)                                            | A                     | PASSOU |
| Q26 | Recusas de validação e `actorId` extra ignorado                                            | A                     | PASSOU |
| Q27 | `assumeTicket` forjado em #66 e em "[QA] Janela aberta"                                    | A                     | PASSOU |
| Q28 | `assumeTicket` forjado em chamado da Diretoria                                             | A                     | PASSOU |
| Q29 | Duas abas assumindo o #F3                                                                  | A                     | PASSOU |
| Q30 | Conflito com Diretor e admin                                                               | Diretor + A           | PASSOU |
| Q31 | Responsivo 390×844                                                                         | M, A, Diretor         | PASSOU |
| Q32 | Nenhum erro/aviso no dev server; gravações só as esperadas                                 | todos                 | FALHOU |
| R   | Regressão de Meus chamados (abas, contagens, filtros, busca, período, linha)               | M, Diretor            | PASSOU |

## Falhas

### #Q32 — Erro de runtime no dev server

- **Papel:** M (`qa.member.suporte@directflow.test`) e Diretor; ocorre em toda carga de `/queue` com tabela.
- **Passos:** 1. Entrar como M. 2. Abrir `/queue`. 3. Consultar `get_errors` ou o console do navegador. Repete para o Diretor em `/queue?setor=20` e demais URLs.
- **Esperado:** nenhum erro nem aviso de hidratação no dev server (Q32).
- **Obtido:** `Each child in a list should have a unique "key" prop. Check the render method of DataTable. It was passed a child from DepartmentQueuePage.` O overlay do Next mostra "1 Issue" em toda tela da Fila. Não é exclusivo de nenhum papel.
- **Evidência:** `get_errors` (sessionErrors) com `app\(app)\queue\page.tsx`, `DepartmentQueuePage`, linha 104 (o `div` do `toolbarFooter` com `PeriodFilter` e `QueueDepartmentFilter`). Console do navegador: `.qa-output/console-2026-10-06T06-13-37-158Z.log` (linhas 5–7). Screenshot com o badge "1 Issue": `.qa-output/q31-member-390.png`. A tela equivalente de Meus chamados (`/tickets`) não emite o erro (conferido por `browser_console_messages`). Não há `hydration` em `.next/dev/logs/next-development.log`; o único erro do período é este aviso de `key`. Todo o comportamento funcional testado está correto, apesar do erro.
- **Camada provável:** app (`app/(app)/queue/page.tsx` e/ou o `DataTable` ao receber o `toolbarFooter`)
- **Dono:** df-ui

## Erros fora dos cenários

Nenhum além do aviso de `key` da falha Q32. Entradas antigas no log do dev server (`ALL_TIME_PERIOD_PRESETS is not defined`, módulos `my-tickets-empty-state` e `my-tickets-tabs` não encontrados) são anteriores à sessão de teste (edições em andamento) e não se repetiram.

## Não executados

Nenhum.

## Evidências por cenário

- **Q3.** `select count(*) filter (where status not in ('fechado','cancelado')) ... where current_department_id = 18` devolveu 33/0/0 depois de criar #F1–#F3; as abas mostraram Em aberto 33, Fechados 0, Cancelados 0 e a lista tinha 33 linhas, de #104 a #83, mais novo primeiro (#65 antes de #84 e #83, por data). Para a Diretoria (11): 28/3/3 no banco e nas abas.
- **Q4.** Hoje: 3 (#104, #103, #102), subtítulo `6 out 2026`. Semana: 18, subtítulo `5–11 out 2026`, lista idêntica ao `string_agg` do banco. Mês: 31 (banco 31). Personalizado 05–06/out: 18, URL `?tab=open&periodo=personalizado&de=2026-10-05&ate=2026-10-06`. Limite do dia no fuso de São Paulo (#100, criado às 02:39 UTC de 06/out, ficou fora de Hoje).
- **Q5.** `?tab=xyz`, `?periodo=xyz` e período com data futura: Em aberto com Todos, sem subtítulo. `?tab=closed&periodo=semana` + clique em Cancelados: `?tab=cancelled&periodo=semana`, período mantido e estado vazio `Nenhum chamado neste período` / `Nenhum chamado desta aba foi aberto no período escolhido. Escolha outro período ou “Todos”.`, sem tabela.
- **Q6.** Em aberto: grupos Status (6), Tipo (6), Tag, Destinatário com `QA Admin Suporte`, `QA Membro Suporte` e `Sem destinatário`; marcar `Sem destinatário` deixou 26 linhas, todas com `—` (banco: 26). QA Suporte não tem chamado fechado, então a aba Fechados fica vazia, sem tabela nem filtros. Para conferir "Fechados sem Status" usei a fila da Diretoria (só leitura): grupos Tipo, Tag (com `Sem tag`) e Destinatário, sem Status.
- **Q8.** Banco após mover M: `users.id=14` com `department_id = 16`. M: menu só Início e Meus chamados; `/queue` com `h1` "Fila do setor" e `Seu perfil não está associado a nenhum setor, informe sua liderança.`, 0 abas, 0 tabelas; `get_errors` vazio; screenshot `.qa-output/q8-unassigned.png`. Restaurado pela interface: `users.id=14` volta a `department_id = 18`, ativo.
- **Q9.** Opções do filtro: Diretoria (marcada), Administrativo, Implantação, P&D, QA Infra, QA Suporte, Suporte = `select id, name from department where is_active and not is_unassigned` (7 linhas). Screenshot `.qa-output/q9-director-setor-filter.png`.
- **Q10.** Escolher QA Suporte: `/queue?tab=open&setor=18&periodo=todos`, 33 linhas; Fechados e Semana mantêm `setor=18`; o filtro Setor continua visível com a lista vazia; escolher Diretoria remove `setor` (`/queue?tab=closed&periodo=semana`).
- **Q11.** `setor=abc|0|007|999999|16|20`: sempre Diretoria marcada e 28/3/3.
- **Q13.** Fila da Diretoria: #82, #7, #6, #5 etc. (aberto/análise/encaminhado/andamento, sem transferência pendente, destinatário nulo) com Assumir e Enviar; #101 (destinatário = o Diretor) só Enviar; resolvidos e aguardando aprovação sem botão. Nenhum clique.
- **Q15.** #102 e #104 (destinatário M, criador M): Assumir + Enviar; #103: só Enviar; #100 (criado por A, destinatário M): só Enviar; #66/#68/#70 (aguardando aprovação) e resolvidos (#95, #84 `[QA] Janela aberta` etc.): sem botão. QA Suporte não tem Fechados/Cancelados; na Diretoria os 3 fechados não têm botão (Q6).
- **Q16/Q17.** Antes: #102 `assigned_to=14`, `status=aberto`, `updated_at=06:14:36`, `max(ticket_history.id)=155`. Depois: `assigned_to=13`, `status=aberto`, `updated_at=2026-10-06 06:18:49.119+00`. Uma linha nova `#156`: `atribuicao`, `changed_by=13`, `from_assignee_id=14`, `to_assignee_id=13`, `changed_at=06:18:49.119+00` (igual ao `updated_at`); status, setores, prioridade e tags da linha nulos. Toast `Você assumiu o chamado #104.` capturado no Q29 (mesma ação); no Q16 a linha passou para `QA Admin Suporte` só com "Enviar" e a URL continuou `/queue`.
- **Q18.** Detalhe #102 como M: botões só "Editar" (sem "Resolver"); linha do tempo `Atribuição — QA Admin Suporte · 06/10/2026 03:18: Trocou o destinatário de QA Membro Suporte para QA Admin Suporte.`; `Destinatário: QA Admin Suporte`. Atribuídos a mim (Todos): `#104,#100,#99,#98,#97` (sem #102), igual ao banco.
- **Q19.** Título `Enviar chamado #102`, descrição `Escolha quem do setor do chamado vai cuidar dele.`, dica `Destinatário atual: QA Admin Suporte.`, opções `QA Membro Suporte` (sem A; o setor só tem A e M); clique no texto do dialog e abertura do combobox mantêm `/queue`.
- **Q20.** Toast `Chamado #102 enviado para QA Membro Suporte.`, dialog fechado, linha com Destinatário M (volta Assumir + Enviar). Linha `#157`: `atribuicao`, `changed_by=13`, `13 → 14`; `status=aberto`.
- **Q21.** Atribuídos a mim de M (Todos) volta a `#104,#102,#100,#99,#98,#97` (banco: igual).
- **Q22.** Diretor em `?tab=open&setor=18`: nenhuma linha com "Assumir"; Enviar no #103: opção só `QA Membro Suporte` (sem Diretor, sem A). Toast `Chamado #103 enviado para QA Membro Suporte.`; `#159`: `atribuicao`, `changed_by=6`, `13 → 14`.
- **Q23.** `Selecione o destinatário.` sob o campo, dialog aberto, `max(ticket_history.id)` inalterado (159).
- **Q24.** Request `sendTicket` (Next-Action) para #102, `assigneeId=13`, `expectedAssigneeId=14`, como M: `{"ok":false,"code":"FORBIDDEN","message":"Não é possível enviar este chamado agora."}`; histórico e `assigned_to` inalterados (`max=161`).
- **Q25.** Em #104 (A, via interface com `assigneeId` reescrito no request para 6, 15 e 999999): nos três, `Este destinatário não está disponível. Escolha uma pessoa ativa do setor do chamado.` no campo, dialog aberto; banco inalterado (`#104` `assigned_to=14`, `updated_at` igual, `max(ticket_history.id)=157`).
- **Q26.** Em #103 (destinatário M), como A: `assigneeId=14, expected=14` → `INVALID_INPUT`, `Escolha um destinatário diferente do atual.`; `assigneeId=1000000000000` → `INVALID_INPUT`, `Selecione o destinatário.`; ambos sem gravar (`max=160`). `assigneeId=13, expected=14, actorId=14, mode="assume"` → `{"ok":true,"message":"Chamado #103 enviado para QA Admin Suporte."}`; `#161`: `atribuicao`, `changed_by=13`, `14 → 13`. Os ids de ator e modo extras foram ignorados.
- **Q27.** Requests `assumeTicket` forjados em #66 (transferência pendente) e #84 (`[QA] Janela aberta`, resolvido), `expectedAssigneeId=null`, como A: `FORBIDDEN`, `Não é possível assumir este chamado agora.`; nada gravado (`assigned_to` nulo nos dois; `max=157`).
- **Q28.** `assumeTicket` forjado em #101 (Diretoria): `NOT_FOUND`, `Chamado não encontrado.`; `#101` inalterado (`assigned_to=6`, `updated_at=04:38:04`), `max=157`.
- **Q29.** Duas abas como A. Aba 1: toast `Você assumiu o chamado #104.`. Aba 2 (sem recarregar, linha ainda com M): toast `Você já assumiu este chamado.`; a linha recarregou para `QA Admin Suporte` só com "Enviar". Banco: uma só `atribuicao` para #104 (`#158`, `changed_by=13`, `14 → 13`).
- **Q30.** Diretor com `/queue?tab=open&setor=18` aberto (linha do #104 com `QA Admin Suporte`); A enviou o #104 para M em outra aba (`#160`, `13 → 14`, toast `Chamado #104 enviado para QA Membro Suporte.`); de volta ao Diretor, sem recarregar, "Enviar" no #104 → `QA Membro Suporte`: toast `Este chamado já foi assumido por QA Membro Suporte.`, dialog fechado, linha recarregada com `QA Membro Suporte`. Nenhuma linha nova do Diretor depois do `#160`.
- **Q31.** 390×844: M, `scrollWidth` do documento 375 e contêiner da tabela com rolagem horizontal própria (`overflow-x: auto`, `scrollWidth` 1381 contra largura 333), botão "Assumir" alcançável (`.qa-output/q31-member-390.png`); A, dialog "Enviar" cabe na tela com o combobox aberto (`.qa-output/q31-admin-dialog-390.png`); Diretor, filtro Setor aberto sem rolagem horizontal da página (`.qa-output/q31-director-filter-390.png`), troca para QA Suporte e para Hoje funcionando (`?tab=open&setor=18&periodo=hoje`).
- **Q32.** Fora o aviso de `key` (falha acima), `get_errors` ficou vazio depois de cada cenário, sem hidratação. Gravações em `ticket_history` desde o baseline: 3 `criacao` (#153–#155, das criações pelo "Novo chamado") e 6 `atribuicao` (#156–#161, todas descritas acima). Nenhuma linha nova em `ticket` além de #102–#104 e nenhuma em `ticket_transfer` (`max=8`). Nenhuma recusa gravou.
- **R (regressão).** Como M: abas `Abertos por mim 30 / Atribuídos a mim 5 (depois 6) / Fechados 0 / Cancelados 0` iguais às consultas; filtro Tipo `Bug` → `#88,#85,#69` (banco: 88,85,69); filtro Tag `[QA] Edição B` → `#97,#85`; busca `#97` e `Destinatário`; clique na linha abre `/tickets/98`; período padrão Hoje. Como Diretor: abas 28/1/3/3 (iguais ao banco), filtro Tag com `Sem tag` → `#25,#33` (banco: 25,33), Semana filtra as abas (`3/1/0/0`). Sem erro de console em `/tickets`.

## Observações

- **Duplicidade de aviso no Não alocado.** Em `/queue` para M no Não alocado o texto `Seu perfil não está associado a nenhum setor, informe sua liderança.` aparece duas vezes no `main`: uma acima do título (provavelmente o aviso global do layout para conta sem setor, já existente) e outra no corpo da página, como o contrato manda. O contrato não diz se o aviso global deve sumir nessa tela. Ambiguidade para o `df-architect`.
- **Desktop com a barra lateral (1280 px).** A coluna "Ações" fica fora da área visível da tabela e exige rolagem horizontal dela; os botões ficam alcançáveis (o Playwright rola até eles), mas num monitor estreito o usuário não vê "Assumir"/"Enviar" sem rolar. O contrato (Q31) só exige isso no celular. Não tratado como falha.
- **Q31 amostral.** O contrato pede repetir "Q1–Q30" em 390×844. Foi feita a verificação da tela da fila (membro), do dialog "Enviar" (admin) e do filtro Setor e do período (Diretor); as demais ações não foram repetidas em largura móvel.
- **Q6 e Q15 em QA Suporte.** O setor não tem chamado fechado nem cancelado, então "Fechados sem grupo Status" e "Fechados/Cancelados sem botões" foram conferidos na fila da Diretoria, em leitura.
- **Toast do Q16.** O toast de sucesso do Assumir só foi capturado no Q29 (mesma ação, mesmo texto), não no Q16, porque a captura veio depois do tempo de exibição.
- **Estado final do banco.** `M` em QA Suporte e ativo; `A` ativo; `I` inativo como estava. Chamados deixados: #102 e #104 com destinatário M; #103 com destinatário A.

## Reteste 1

- **Data:** 2026-10-06
- **Commit:** `7e22da2` · alterações não comitadas: sim
- **Correção testada:** `toolbarFooter` da Fila virou `app/(app)/queue/_components/queue-list-filters.tsx`, usado em `app/(app)/queue/page.tsx`.
- **Resultado:** 1 de 1 passou

| #   | Cenário                                                       | Papel                                | Status |
| --- | ------------------------------------------------------------- | ------------------------------------ | ------ |
| Q32 | Nenhum erro nem aviso no dev server e no console do navegador | Membro (QA Membro Suporte) e Diretor | PASSOU |

### Evidências

- **Diretor** (`SEED_ADMIN_EMAIL`, Diretoria): carregou `/queue` e `/queue?periodo=todos`, trocou entre Em aberto, Fechados e Cancelados, trocou o Setor para QA Suporte (`?tab=cancelled&setor=18&periodo=todos`) e voltou para Diretoria (`?tab=open&periodo=todos`). `browser_console_messages` (nível warning, desde cada navegação) devolveu 0 erros e 0 avisos; nenhum aviso de `key`, de hidratação ou `DataTable`. `get_errors` do next-devtools: `{"configErrors":[],"sessionErrors":[]}`.
- **Membro** (`qa.member.suporte@directflow.test`): `/queue` e `/queue?periodo=todos` com 33 linhas em Em aberto, sem filtro Setor; troca de abas Fechados, Cancelados, Em aberto e período Hoje e Todos pela interface. Console: 0 erros e 0 avisos; `get_errors` vazio.
- **Regressão `/tickets`:** carregou como Diretor e como Membro sem erro nem aviso no console; `get_errors` vazio.
- **Antes da correção**, o mesmo console (sessão anterior) acumulava dezenas de `Each child in a list should have a unique "key" prop. Check the render method of DataTable. It was passed a child from DepartmentQueuePage.`; nesta rodada não apareceu nenhum.
- **Banco:** `max(ticket_history.id)=161`, `max(ticket.id)=104`, `max(ticket_transfer.id)=8`, iguais ao fim da bateria original. Nenhuma gravação neste reteste (só leitura e navegação).

### Observações

- **Q8, aviso "duas vezes" no Não alocado.** Não foi reaberto visualmente: reproduzir exige mover o membro para o setor Não alocado, o que o reteste não faz. Registrada a explicação do orquestrador: o texto acima do título é o `span` `sr-only` do botão "Novo chamado" bloqueado na barra do topo (`app/(app)/_components/app-top-bar.tsx:29`), anunciado só a leitor de tela, sem duplicação visual. Não confirmado por mim; a observação do Q8 acima fica como "não confirmada como duplicidade".
- Reteste feito com a sessão do navegador já aberta como Diretor; troca de papel por sign-out e novo login pelo formulário.
