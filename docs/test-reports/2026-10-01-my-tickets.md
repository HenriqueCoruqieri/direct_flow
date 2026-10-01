# Relatório de testes — Meus chamados

- **Data:** 2026-10-01
- **Contrato:** `docs/contracts/my-tickets.md`
- **Commit:** `9b08c09` · alterações não comitadas: sim
- **Ambiente:** `http://localhost:3000`, `next dev`, banco de desenvolvimento
- **Resultado:** 24 de 27 passaram · 3 falharam · 0 bloqueados · 0 não executados

Os cenários 1 a 22 são os do contrato. E1 a E5 são extras pedidos pelo comando (responsivo, regressão e detalhes de interação).

## Pré-requisitos

- Dev server respondeu 200 em `/login`. MCP `playwright`, `next-devtools` e `postgres` (`SELECT 1`) responderam.
- Usuários QA e diretor existem e estão ativos (ids: diretor 6, QA Admin Suporte 13, QA Membro Suporte 14, QA Admin Infra 15).
- `RESEND_API_KEY` está preenchida no `.env`. A feature não dispara e-mail, então nenhum cenário foi afetado.
- Linha de base antes dos testes: `ticket` max id 68 e 34 linhas, `ticket_history` max id 82 e 43 linhas, `ticket_transfer` max id 6 e 3 linhas.

## Cenários

| #   | Cenário                                                                                         | Papel                               | Status |
| --- | ----------------------------------------------------------------------------------------------- | ----------------------------------- | ------ |
| 1   | Item "Meus chamados" abaixo de "Início", ícone de ticket, leva a `/tickets` e fica ativo        | QA Membro Suporte                   | PASSOU |
| 2   | `/tickets`: barra superior, h1, quatro abas na ordem com contagem, "Abertos por mim" ativa      | QA Membro Suporte                   | PASSOU |
| 3   | Contagens das abas contra o banco (membro 4/0/0/0; diretor 24/0/3/3)                            | QA Membro Suporte e Diretor + banco | PASSOU |
| 4   | Aba Abertos por mim: linhas, ordem, colunas, badge, sem paginação                               | QA Membro Suporte                   | PASSOU |
| 5   | Atribuídos a mim: URL, contagem 0, estado vazio com o texto do contrato, sem tabela e sem botão | QA Membro Suporte                   | PASSOU |
| 6   | Fechados e Cancelados: URLs e estados vazios próprios                                           | QA Membro Suporte                   | PASSOU |
| 7   | "Voltar" duas vezes: Fechados e depois Atribuídos, com aba ativa e conteúdo coerentes           | QA Membro Suporte                   | PASSOU |
| 8   | `?tab=xyz`, `?tab=Closed` caem em Abertos; `?tab=closed&tab=opened` mostra Fechados             | QA Membro Suporte                   | PASSOU |
| 9   | Busca por `#26`, `26`, `impressora`, `IMPRESSORA` e termo sem resultado                         | Diretor                             | PASSOU |
| 10  | Filtros Status (6), Tipo (6), Tag (4 + "Sem tag"); OU, E e "Limpar filtros"                     | Diretor                             | PASSOU |
| 11  | Fechados sem grupo Status; trocar para Cancelados zera busca e filtros                          | Diretor                             | PASSOU |
| 12  | Clique no meio da linha do #66 abre `/tickets/66`; link `#65` com Enter abre `/tickets/65`      | QA Membro Suporte                   | PASSOU |
| 13  | Detalhe do #66: cabeçalho, campos, aviso de aprovação, responsável "—", sem botão de ação       | QA Membro Suporte                   | PASSOU |
| 14  | Linha do tempo do #66 (Abertura e Transferência solicitada) e linhas 78 e 79 no banco           | QA Membro Suporte + banco           | PASSOU |
| 15  | Detalhe do #65: sem aviso, um item "Abertura"                                                   | QA Membro Suporte                   | PASSOU |
| 16  | `/tickets/65`, `/tickets/66` e `/tickets/68` dão 404 para o admin de QA Infra                   | QA Admin Infra                      | FALHOU |
| 17  | `/tickets/66` abre para o admin do setor atual                                                  | QA Admin Suporte                    | PASSOU |
| 18  | `/tickets/66` abre para o diretor                                                               | Diretor                             | PASSOU |
| 19  | Membro movido para Não alocado: menu, aba com #65 a #68, detalhe do autor abre; movido de volta | Diretor e QA Membro Suporte         | PASSOU |
| 20  | Ids `abc`, `0`, `1e2`, `99999999999`, `999999` dão 404, sem erro no dev server                  | QA Membro Suporte                   | FALHOU |
| 21  | Título da aba em `/tickets/66` e em chamado alheio                                              | QA Membro Suporte                   | FALHOU |
| 22  | Sem erro de hidratação; nenhuma linha nova em `ticket`, `ticket_history`, `ticket_transfer`     | todos + banco                       | PASSOU |
| E1  | Responsivo 390×844 em `/tickets` e `/tickets/66`                                                | QA Membro Suporte                   | PASSOU |
| E2  | Regressão: Pessoas, Setores e Tags (sem `rowHref`) iguais                                       | Diretor                             | PASSOU |
| E3  | Regressão: card do dashboard com valor ausente mostra "—"                                       | Diretor                             | PASSOU |
| E4  | Nenhum botão de ação sem função nas telas (só "Novo chamado" da barra e "Filtros")              | QA Membro Suporte e Diretor         | PASSOU |
| E5  | Ctrl+clique na linha não navega na mesma aba                                                    | QA Membro Suporte                   | PASSOU |

### Evidências dos cenários aprovados

- **3, contagens.** Consulta do contrato com ids 6 e 14. Diretor: `opened=24, assigned=0, closed=3, cancelled=3`. Membro: `4, 0, 0, 0`. A UI mostrou exatamente esses números, e a tabela do diretor listou 24 linhas, na mesma ordem de `created_at desc, id desc` da consulta ao banco.
- **4.** O membro tem 4 chamados abertos, não 2: #65, #66, #67 e #68, criados em testes anteriores (ver Observações). Ordem na tela: 68, 67, 66, 65. #66 e #68 aparecem como "Aguardando aprovação" com setor atual QA Suporte.
- **9 e 10.** Filtros contra o banco do diretor. Status "Aberto": 4 linhas (#5, #13, #21, #29). "Aberto" ou "Em análise": 8. Mais Tipo "Ocorrência": 2 (#6, #30). Tag "Rede": 4. Tipo "Bug": 3. "Sem tag": 2 (#25, #33). Todos batem com `GROUP BY` no banco (status 4/4/4/5/4/3, tipo 4/5/4/4/4/3, tag 7/6/4/5/2). A busca `#26` acha #26 e #30 (título "…#26"), como o contrato aceita. O termo sem resultado mostra "Nenhum resultado para os filtros aplicados.".
- **14.** `SELECT … FROM ticket_history WHERE id IN (78,79)` devolve `78 criacao to_department_id=18` e `79 transferencia_solicitada from=18 to=19`, ambos `changed_by=14`. `ticket_transfer` id 5 do #66: `status=pendente, from=18, to=19, requested_by=14`.
- **13.** Texto exibido no #66: `Aguardando aprovação de QA Infra`, `Solicitada por QA Membro Suporte em 01/10/2026 00:03`, Prioridade Média, Responsável `—`, setor de origem e atual QA Suporte.
- **16, parte funcional.** O 404 para QA Admin Infra ocorreu nos três chamados (65, 66, 68), com status HTTP 404. O cenário falha só pelo erro de runtime descrito abaixo.
- **17 e 18.** QA Admin Suporte e Diretor abriram o #66 com 200.
- **19.** Gravado pela interface (Diretor, `/registry/people`, Editar): setor de QA Membro Suporte (id 14) de QA Suporte para Não alocado; conferido no banco (`dept = Não alocado`). Como Não alocado: item do menu visível, aba com #65 a #68, `/tickets/65` e `/tickets/66` com 200 (o aviso "Seu perfil não está associado a nenhum setor" aparece na barra superior), `/tickets/64` (chamado do diretor) com 404. Revertido pela interface para QA Suporte; conferido no banco (`dept = QA Suporte`).
- **22.** Depois de toda a bateria: `ticket` max id 68 (34 linhas), `ticket_history` max id 82 (43 linhas), `ticket_transfer` max id 6 (3 linhas), iguais à linha de base. Nenhum aviso de hidratação no log do dev server. Os únicos erros do `get_errors` foram os descritos em #20.
- **E1.** Em 390×844, `scrollWidth = clientWidth = 390` na lista e `375` no detalhe (sem rolagem horizontal da página). A tabela rola dentro do próprio contêiner (`overflow-x-auto`, comportamento do `DataTable`), e as abas Fechados e Cancelados ficam alcançáveis por rolagem horizontal da faixa de abas. Screenshots: `.qa-output/tickets-mobile.png`, `.qa-output/ticket-66-mobile.png`.
- **E2.** Pessoas (8 linhas), Setores (9) e Tags (18): `cursor: auto` na linha, nenhum link no corpo da tabela, clicar numa célula não muda a URL. Os botões "Editar", "Desativar" e "Restaurar senha" seguem funcionando (o "Editar" de Pessoas foi usado no cenário 19).
- **E3.** `/dashboard?periodo=personalizado&de=2020-01-01&ate=2020-01-31`: card "Principal tag ofensora" mostra `—` e "Nenhuma tag no período". Períodos com dados mostram "Sistema, 1 chamado".
- **E5.** Ctrl+clique numa célula da linha do #66 manteve a URL em `/tickets?tab=opened` e não abriu aba nova.

## Falhas

### #16 e #20 — 404 por `notFound()` gera erro de runtime no dev server

- **Papel:** QA Admin Infra (`qa.admin.infra@directflow.test`) no #16; QA Membro Suporte (`qa.member.suporte@directflow.test`) no #20. Reproduzido também com o diretor? Não testado: o diretor não recebe 404 nos ids existentes.
- **Passos:** 1. Entrar com o papel. 2. Abrir `/tickets/65` (#16) ou `/tickets/abc` (#20) pela URL. 3. Chamar `get_errors` do `next-devtools`.
- **Esperado:** 404 sem nenhum erro nem aviso no dev server (contrato, cenário 20: "nenhum erro no dev server (MCP `next-devtools`)"; cenário 22: nenhum erro).
- **Obtido:** o 404 e o status HTTP estão corretos, mas cada carga completa de uma página que chama `notFound()` dentro do grupo `(app)` registra um erro de console do React: `Encountered a script tag while rendering React component. Scripts inside React components are never executed when rendering on the client.` O Next dev mostra o overlay (ele chegou a interceptar cliques na barra lateral da página 404).
- **Evidência:** `get_errors`: `sessionErrors[0].url = "/tickets/-1"`, `runtimeErrors[0].message` = a mensagem acima, pilha `app/_components/theme/theme-provider.tsx:8` (`ThemeProvider`) → `app/layout.tsx:50` (`RootLayout`). `.qa-output/console-2026-10-01T21-58-03-198Z.log` mostra o par "404 + script tag" nas linhas L21 a L56 (um por id testado). Log do dev server (`.next/dev/logs/next-development.log`): dezenas de linhas `level: ERROR` com a mesma mensagem. **Não é causado pela feature:** `/registry/departments` aberto por membro (404 do guarda de Cadastros, código que já existia) reproduz o mesmo erro. Uma rota inexistente (`/rota-que-nao-existe`) não reproduz. Páginas válidas (`/tickets`, `/tickets/65`, etc.) não geram erro.
- **Camada provável:** app (ThemeProvider no layout raiz, em conjunto com o 404 renderizado dentro do `(app)`). Fora do alcance da feature de chamados.
- **Dono:** df-ui (`app/_components/theme/theme-provider.tsx`).

### #21 — Título da aba nos 404 não é "Chamado #<id>"

- **Papel:** QA Membro Suporte (`qa.member.suporte@directflow.test`)
- **Passos:** 1. Abrir `/tickets/66` e ler `document.title`. 2. Abrir `/tickets/64` (chamado do diretor, na Diretoria) e ler o título.
- **Esperado:** "Chamado #66" e "Chamado #64" (contrato, seção `/tickets/[id]`, `generateMetadata`; cenário 21).
- **Obtido:** `/tickets/66` mostra `Chamado #66 · Direct Flow` (correto). `/tickets/64` devolve 404 e o título é `404: This page could not be found.`. O mesmo vale para `/tickets/abc`, `/tickets/0` e demais ids inválidos. Nada do chamado alheio vaza, mas o título difere do contrato.
- **Evidência:** `page.title()` após `goto('/tickets/64')`: `"404: This page could not be found."`, status 404.
- **Camada provável:** app, mas a ambiguidade é do contrato: quando a página chama `notFound()`, o Next renderiza a página 404 padrão e descarta o título de `generateMetadata`. O comportamento atual é o mais seguro (não distingue "não existe" de "não é seu"). O contrato pede o título para chamados alheios e isso não é atingível com `notFound()`.
- **Dono:** df-architect (ajustar o cenário 21 para aceitar o título do 404, ou decidir se o contrato quer outra abordagem) e df-ui se a decisão mantiver o título.

## Erros fora dos cenários

- Console do navegador: `Failed to load resource: 404` em cada 404 (esperado, status da própria página). Nenhum outro erro.
- Nenhum erro de build nem de compilação no `get_errors` fora das cargas de 404 descritas em #20.

## Não executados

- Último acesso nulo no perfil (`account-details.tsx`, troca para `EMPTY_VALUE_LABEL`): só um usuário que nunca acessou veria o caso, e todos os usuários logados no teste têm último acesso. Na tabela de Pessoas, "Nunca acessou" aparece normalmente para quem nunca entrou.
- "Tab até o link" no cenário 12 foi exercitado com `focus()` direto no link `#65` seguido de Enter, e não com uma sequência de Tab desde o topo da página.

## Observações

- **Chamados #67 e #68 existem.** O contrato cita só #65 e #66 do membro, mas os testes anteriores de criação deixaram também #67 (`aberto`) e #68 (`aguardando_aprovacao`, transferência pendente id 6, `ticket_history` 80 a 82). Contagem e lista do membro (4) estão corretas contra o banco. O contrato (cenários 3 e 4) pode ser atualizado.
- **Contagem de chamados legados sem tag.** O contrato diz 3 chamados antigos sem tag; no banco, 2 deles estão em "Abertos" do diretor (#25, #33) e a opção "Sem tag" aparece ali, mas não aparece em Cancelados (nenhum sem tag) e aparece em Fechados (#19). Comportamento coerente com a regra "só se alguma linha tiver `tagId` nulo".
- **Faixa de abas no mobile.** Em 390 px a `nav` das abas tem 1 px de overflow vertical (`scrollHeight 40` contra `clientHeight 39`, `overflow-y: auto`) e exibe uma barra de rolagem vertical com setas. Cosmético. Camada app, dono df-ui.
- **Faixa de abas e Fechados/Cancelados no mobile.** Ficam fora da primeira tela e exigem rolagem horizontal da faixa. É alcançável, só registrado.
- **Nomes acessíveis da barra lateral.** No snapshot de acessibilidade do Playwright, os links da barra lateral apareceram sem nome (`link [ref]`), embora o texto "Início" e "Meus chamados" esteja no DOM e visível. Não investigado a fundo; vale conferir com leitor de tela. Camada app, df-ui.
- **Busca por `#`.** A busca `#26` também acha o #30 por conter "#26" no título; o contrato já aceita esse efeito.
- **Dados gravados pela interface neste teste.** Somente duas edições de pessoa em `/registry/people`: setor de QA Membro Suporte para Não alocado e de volta para QA Suporte. Nenhum chamado, histórico ou transferência foi criado. As sessões dos quatro usuários foram abertas e encerradas pela tela de login e pelo menu do usuário.

## Reteste 1

- **Data:** 2026-10-01
- **Commit:** `9b08c09` · alterações não comitadas: sim (correções em `theme-provider.tsx`, `my-tickets-tabs.tsx`, `nav-item.tsx` e `registry-nav.tsx`)
- **Contrato:** versão atualizada (cenário 21 aceita o título padrão de 404; cenários 4 e 19 conferem contra o banco)
- **Resultado:** 3 de 3 cenários repetidos passaram · 5 de 5 verificações extras passaram
- **Gravação:** nada gravado no banco nem pela interface. Só sessões abertas e encerradas (limpeza de cookies).

| #   | Cenário                                                                                                                              | Papel                              | Status |
| --- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------- | ------ |
| 16  | `/tickets/65`, `/tickets/66` e `/tickets/68` dão 404 para o admin de QA Infra, sem erro de runtime                                   | QA Admin Infra                     | PASSOU |
| 20  | Ids `abc`, `0`, `1e2`, `99999999999`, `999999` dão 404, sem erro no dev server                                                       | QA Membro Suporte                  | PASSOU |
| 21  | Título da aba: `Chamado #66 · Direct Flow` no #66; título padrão de 404 em chamado alheio e ids inválidos                            | QA Membro Suporte                  | PASSOU |
| R1  | `get_errors` limpo em `/tickets/-1`, `/tickets/99999999999`, `/tickets/65` (admin de outro setor) e `/registry/departments` (membro) | QA Admin Infra e QA Membro Suporte | PASSOU |
| R2  | Tema aplicado sem flash; script do tema com `type="text/javascript"` no HTML do servidor                                             | QA Membro Suporte                  | PASSOU |
| R3  | Faixa de abas em 390 px sem barra de rolagem vertical                                                                                | QA Membro Suporte                  | PASSOU |
| R4  | Anel de foco inteiro nas abas ao navegar por Tab em 390 px                                                                           | QA Membro Suporte                  | PASSOU |
| R5  | Links da barra lateral com nome acessível no snapshot                                                                                | QA Membro Suporte                  | PASSOU |

### Evidências

- **16.** Status HTTP 404 e título `404: This page could not be found.` nos três ids. `get_errors` depois da carga: `{"configErrors":[],"sessionErrors":[]}`. O console do navegador só tem `Failed to load resource: 404` da própria página (`.qa-output/console-2026-10-01T22-15-10-856Z.log`).
- **20.** Os cinco ids, mais `-1` e `64` (chamado do diretor), devolveram 404. `get_errors` limpo. `/tickets/66` devolveu 200 com título `Chamado #66 · Direct Flow`.
- **21.** `/tickets/66`: `Chamado #66 · Direct Flow`. `/tickets/64` (alheio), `/tickets/abc` e `/tickets/999999`: `404: This page could not be found.`, idêntico entre eles. Nada do chamado vaza no título.
- **R1.** `get_errors` consultado depois de cada bateria (admin de outro setor: 65, 66, 68, -1, 99999999999; membro: ids inválidos e `/registry/departments`, que deu 404). Sempre vazio. Nenhuma ocorrência de "Encountered a script tag" no log do console da sessão (0) nem em `.next/dev/logs/next-development.log` depois da última ocorrência antiga (linha 94 de 126; as 26 cargas de página seguintes, todas deste reteste, não registraram o erro).
- **R2.** HTML do servidor de `/login` contém `<script type="text/javascript">((e,i,s,u,m,a,l,h)=>…` (script do next-themes). Com `localStorage.theme = dark`, a classe `dark` e `color-scheme: dark` já estavam no `<html>` no `DOMContentLoaded`; com `light`, idem para `light`. Classe final igual à antecipada nos dois casos. O `localStorage.theme` foi removido no fim.
- **R3.** `nav[aria-label="Abas de Meus chamados"]`: `scrollHeight 40 = clientHeight 40` (antes 40 contra 39). Só há rolagem horizontal (`scrollWidth 588`, `clientWidth 350`), e `documentElement.scrollWidth = 390`, sem rolagem horizontal da página.
- **R4.** Focado com Tab, cada um dos quatro links tem `:focus-visible` e o anel é `box-shadow` inset de 3 px, que não é cortado pelo contêiner. Screenshot `.qa-output/retest-tabs-focus-390.png` mostra o contorno completo em "Atribuídos a mim"; `.qa-output/retest-tabs-390.png` mostra a faixa.
- **R5.** Snapshot de acessibilidade: `navigation "Principal"` com `link "Início"` e `link "Meus chamados"` (antes `link [ref]` sem nome). Os links de período do dashboard também têm nome.

### Falhas

Nenhuma.

### Observações

- As falhas #16, #20 e #21 do relatório original estão resolvidas, e as observações "faixa de abas no mobile" e "nomes acessíveis da barra lateral" também.
- Os cenários 4 e 19 não foram repetidos neste reteste (não pedidos); seguem aprovados na rodada original.
