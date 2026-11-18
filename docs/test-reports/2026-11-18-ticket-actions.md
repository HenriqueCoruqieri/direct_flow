# Relatório de testes — Ações do chamado

- **Data:** 2026-11-18
- **Contrato:** `docs/contracts/ticket-actions.md`
- **Commit:** `96a013d` · alterações não comitadas: não
- **Ambiente:** `http://localhost:3000`, `next dev`, banco de desenvolvimento (simulação de empresa fictícia do usuário, não é o seed QA; migration 0030 já aplicada)
- **Resultado:** 18 de 21 passaram · 0 falharam · 0 bloqueados · 3 não executados (A16, A17, A19; ver "Não executados")

## Pré-requisitos

- Dev server: `/login` respondeu 200. `next-devtools` descobriu o servidor na porta 3000; `postgres` MCP respondeu.
- Usuários (consulta ao banco): `mco_12@gmail.com` (member, Suporte, ativo), `rodilindo@gmail.com` (member, Suporte, ativo), `cazalbe@gmail.com` (admin, Suporte, ativo). As três contas fizeram login na primeira tentativa.
- E-mail: não li o `.env` (restrição do usuário). Nenhuma linha de log de envio (`RESEND_API_KEY não configurada…`) apareceu para as operações do teste (ver A8).
- Escrita só no setor Suporte, só em chamados `[QA]` criados pelo teste. Nada foi cadastrado (empresa e tag existentes; primeira empresa "13 STREET WEAR", tag "#AJUSTE_DE_ESTOQUE").

## Chamados [QA] criados

| ID  | Título                        | Uso                                                         | Estado final                 |
| --- | ----------------------------- | ----------------------------------------------------------- | ---------------------------- |
| 8   | [QA] Ações 01 - fila          | A1, A2, leitura em Aberto por outros papéis                 | aberto (fila)                |
| 9   | [QA] Ações 02 - andamento     | A3, A4, A5, A6, A7, A8, A10, A11, A12, A20, A21, responsivo | em_andamento                 |
| 10  | [QA] Ações 03 - resolver      | A9, A13, A15, admin lê resolvido                            | resolvido                    |
| 11  | [QA] Ações 04 - corrida       | A18                                                         | resolvido                    |
| 12  | [QA] Ações 05 - aberto direto | A14                                                         | resolvido (direto de Aberto) |
| 13  | [QA] Ações 06 - anexos        | 5 anexos `.txt` de 10 B, checagem visual de Anexos e Prazo  | aberto (fila)                |

## Cenários

| #   | Cenário                                                                 | Papel                     | Status        |
| --- | ----------------------------------------------------------------------- | ------------------------- | ------------- |
| A1  | Abrir chamado novo                                                      | Membro A                  | PASSOU        |
| A2  | Detalhe de chamado `aberto`                                             | Membro A, Membro B, Admin | PASSOU        |
| A3  | Destinatário em `em_andamento` fora do modo de edição                   | Membro A                  | PASSOU        |
| A4  | Admin do setor em `em_andamento` de outro destinatário                  | Admin                     | PASSOU        |
| A5  | Pessoa do setor sem ser destinatário nem admin                          | Membro B                  | PASSOU        |
| A6  | Salvar só espaços                                                       | Membro A                  | PASSOU        |
| A7  | Texto acima do máximo                                                   | Membro A                  | PASSOU        |
| A8  | Salvar Ações não gera histórico nem e-mail                              | Membro A, Admin           | PASSOU        |
| A9  | Resolver com Ações preenchidas                                          | Membro A                  | PASSOU        |
| A10 | Modo de edição em `em_andamento`                                        | Membro A                  | PASSOU        |
| A11 | Edição que só altera Ações                                              | Membro A                  | PASSOU        |
| A12 | Edição que altera título e Ações                                        | Membro A                  | PASSOU        |
| A13 | Resolvido que passou por Em andamento, modo de edição                   | Membro A                  | PASSOU        |
| A14 | Resolvido direto de Aberto, modo de edição                              | Membro A                  | PASSOU        |
| A15 | Resolvido fora do modo de edição                                        | Membro A, Admin           | PASSOU        |
| A16 | Fechado e cancelado                                                     | —                         | NÃO EXECUTADO |
| A17 | `aguardando_aprovacao` / `encaminhado` / `recusado` / `em_analise`      | —                         | NÃO EXECUTADO |
| A18 | Corrida: resolver em outra aba, depois Salvar Ações                     | Membro A (duas abas)      | PASSOU        |
| A19 | Conta inativa ou com troca de senha pendente                            | —                         | NÃO EXECUTADO |
| A20 | Banco reflete cada salvamento                                           | —                         | PASSOU        |
| A21 | Edição aberta sem mexer em Ações, outra aba salva Ações, salva a edição | Membro A (duas abas)      | PASSOU        |

## Evidências

- **A1.** Diálogo "Novo chamado" lista Empresa, Título, Descrição, Anexos, Tipo, Prioridade, Tags, Criador, Destinatário; sem campo Ações. `select actions from ticket where id=8` devolveu `null`.
- **A2.** Cabeçalhos `h2` na ordem Descrição, Linha do tempo, **Ações**, Solução, Detalhes, Anexos, Comentários. Texto "Nenhuma ação registrada.", sem textarea de Ações para Membro A (#8), Membro B (#8) e Admin (#8, só textarea `solution`). Screenshot `.qa-output/t8-aberto-marcelo.png`.
- **A3.** #9 em andamento: textarea com placeholder "Descreva o que foi feito até chegar à solução."; Salvar desabilitado até editar; depois toast "Ações do chamado #9 salvas."; recarregar mantém o texto. SQL: `select actions from ticket where id=9` → `"Reiniciei o serviço.\nLimpei o cache."`.
- **A4.** Admin (Carlos Alberto no cabeçalho do app) em #9: textarea e Salvar presentes; toast "Ações do chamado #9 salvas."; SQL → `"Ação registrada pelo admin do setor."`.
- **A5.** Membro B em #9: textareas só `content` (comentário); botões só "Novo chamado", "Comentar"; card mostra o texto lido, sem Salvar. Em #8 (Aberto) também só leitura. Admin em #8 (Aberto): só leitura de Ações.
- **A6.** Salvar `"   \n  "`: toast de sucesso; SQL `select actions is null from ticket where id=9` → `true`. Obs.: com o chamado editável, o card mostra a textarea vazia (não o texto "Nenhuma ação registrada."); o contrato descreve o texto no estado só leitura (ver Observações).
- **A7.** 5001 caracteres: erro no campo "As ações precisam ter no máximo 5000 caracteres.", sem toast de sucesso. Em seguida 5000 caracteres salvaram: `select length(actions)` → `5000`.
- **A8.** `select count(*) from ticket_history where ticket_id=9` permaneceu `1` após os salvamentos pelo card do Membro A; em #9 o total só subiu (para 3) com as duas edições que alteraram título, e o salvamento do Admin pelo card manteve 3. Nenhuma linha de e-mail em `next-development.log` para essas operações.
- **A9.** #10: Ações salvas, depois Resolver exigiu só Solução. SQL: `status=resolvido, actions="Ações do #10 antes de resolver.", solution="Solução do #10."`. Histórico: `criacao | resolucao`.
- **A10.** Em modo de edição de #9: botões `Cancelar`, `Salvar alterações`; sem o "Salvar" do card; textareas `actions` (com o valor atual), `description`, `content`.
- **A11.** Edição só de Ações: toast "Chamado #9 atualizado."; SQL `actions="Ação só pela edição."`, `updated_at` 17:43:44.513 → 17:43:50.700, `count(history)` continuou `3` (nenhuma linha `edicao` nova).
- **A12.** Título + Ações: SQL em `ticket_history` de #9 → `criacao`, `edicao`/"Alterou título." (id 40, edição de A21), `edicao`/"Alterou título." (id 41). Notas sem menção a Ações.
- **A13.** #10 resolvido, em modo de edição: textareas `description`, `actions`, `solution`, `content`; salvar `actions="Ações corrigidas após resolver."`, `status=resolvido`, histórico segue `criacao | resolucao`.
- **A14.** #12 resolvido direto de Aberto; em modo de edição: textareas `description`, `solution`, `content` (sem `actions`); card mostra "Nenhuma ação registrada."; SQL `actions=null`.
- **A15.** #11 e #10 resolvidos fora do modo de edição: botões "Editar", "Comentar"; sem textarea de Ações nem Salvar, para Membro A e Admin (#10).
- **A18.** Aba 0 aberta em #11 (em andamento, textarea de Ações visível), aba 1 resolveu #11. Aba 0: texto digitado e Salvar → toast "As ações só podem ser registradas com o chamado em andamento."; a tela recarregou (textarea sumiu, botões "Editar", "Comentar"). SQL: `status=resolvido, actions=null`.
- **A20.** Cada SQL acima bate com o último salvamento.
- **A21.** Aba 0 em modo de edição de #9 (sem mexer em Ações), aba 1 salvou "Ação salva pela outra aba." pelo card; aba 0 alterou só o título e salvou. SQL: `actions="Ação salva pela outra aba."`, histórico `edicao`/"Alterou título.".

### Checagem visual do mesmo ciclo

- **Card "Solução":** título "Solução" com asterisco vermelho quando vazio; botão "Resolver" logo abaixo do campo, alinhado à direita, sem área vazia dentro do card (`.qa-output/t8-aberto-marcelo.png`, `.qa-output/t13-desktop.png`).
- **Anexos na lateral (#13, 5 anexos, 1440×900):** lista com 3 itens visíveis; o `<ul>` tem `overflow-y: auto` com `clientHeight 176` e `scrollHeight 292`, ou seja, rola a partir do 4º.
- **Coluna "Prazo":** presente em "Meus chamados" (`# Número, Título, Empresa, Tag, Setor atual, Status, Aberto em, Prioridade, Prazo`) e em "Fila do setor" (`… Prioridade, Prazo, Ações`). Linha de #13 na fila: "Expira em 11h 59min".
- **Responsivo 390×844 (#9):** `scrollWidth 375 = clientWidth 375` (sem rolagem horizontal); Salvar do card visível e alcançável (`.qa-output/t9-mobile.png`).

## Falhas

Nenhuma.

## Erros fora dos cenários

- `get_errors` do `next-devtools`: `configErrors: []`, `sessionErrors: []` ao final de todos os cenários.
- Console do navegador, 1 erro de React na primeira entrada em modo de edição de #9: `Each child in a list should have a unique "key" prop. Check the render method of ResolveTicketForm. It was passed a child from TicketConclusion.` (também em `.next/dev/logs/next-development.log`). Apareceu uma vez (o React deduplica). Não afetou o comportamento. Camada provável: app (`ticket-conclusion.tsx` / `resolve-ticket-form.tsx`). Dono: `df-ui`. Não sei se é anterior a esta feature.
- `next-development.log`: `⨯ Error: The destination stream closed early.` próximo ao fim do teste (coincide com troca de navegação entre /tickets/9 e /tickets/10 como admin). Sem efeito visível; registrado só como ocorrência.
- O log também contém, de antes desta rodada (ids de tempo anteriores), erros de `ReferenceError: showMark is not defined` em `form-field.tsx` ligados a `TicketActionsForm` e de módulo `ticket-attachment-tile` não resolvido. Não reproduziram durante os cenários (HMR de edições do código em andamento).

## Não executados

- **A16 (fechado e cancelado):** não existe chamado `fechado` nem `cancelado` no banco (status presentes: aberto, em_andamento, resolvido) e a interface não tem ação de cancelar. Produzir `fechado` exigiria esperar a janela vencer ou o cron.
- **A17 (`aguardando_aprovacao`, `encaminhado`, `recusado`, `em_analise`):** nenhum chamado nesses status no banco. Produzi-los exige transferência entre setores ou escrita em chamados que não são meus, fora do escopo.
- **A19 (conta inativa / troca de senha pendente):** exigiria alterar usuários existentes, fora do escopo.
- Dupla submissão do botão Salvar não foi exercitada de forma específica.

## Observações

- **A6, texto do estado vazio:** o contrato diz "card volta a 'Nenhuma ação registrada.'". Para quem pode editar, o card continua mostrando a textarea vazia com placeholder; o texto "Nenhuma ação registrada." só aparece no estado só leitura (verificado em #8 e #12). Parece a leitura correta, mas o contrato poderia dizer isso. Ambiguidade para o `df-architect`.
- **Toast após resolver (#10):** logo depois de "Chamado #10 resolvido." ainda estava na tela o toast "Ações do chamado #10 salvas." (do Salvar 2 s antes). Efeito normal de toasts empilhados.
- A senha usada nos logins foi digitada pelo MCP, que a repete no eco das chamadas dele; ela não está em arquivo, relatório nem screenshot. Nenhum screenshot foi tirado com o campo de senha preenchido.
- A tela de detalhe de #13 no desktop mostra um vão vertical grande entre "Nenhum comentário ainda." e o campo de comentário (card Comentários esticado à altura da coluna). Fora do escopo desta feature; registrado como observação visual.
- Navegador deixado aberto (login atual: Admin do setor), 2 abas.
