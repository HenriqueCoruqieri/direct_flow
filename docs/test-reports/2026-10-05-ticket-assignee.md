# Relatório de testes — Destinatário do chamado (atribuição)

- **Data:** 2026-10-05
- **Contrato:** `docs/contracts/ticket-assignee.md`
- **Commit:** `1db11f5` · alterações não comitadas: sim
- **Ambiente:** `http://localhost:3000`, `next dev`, banco de desenvolvimento
- **Resultado:** 25 de 26 passaram · 0 falharam · 0 bloqueados · 1 não executado

Os 26 itens são os 23 cenários do contrato, a regressão do campo Tag (criação e edição, em dois itens, R1 e R2) e a checagem responsiva (R3).

## Pré-requisitos

- Dev server: `/login` respondeu 200.
- MCP: `next-devtools` (porta 3000), `playwright` e `postgres` (`SELECT` com o role `df_readonly`) responderam.
- Usuários, lidos do banco: Diretor `D=6` (ativo, Diretoria), QA Admin Suporte `A=13` (ativo, QA Suporte, setor 18), QA Membro Suporte `M=14` (ativo, QA Suporte), QA Admin Infra `I=15` (**inativo**, QA Infra; não foi reativado).
- `RESEND_API_KEY` está preenchida no `.env`. A feature não envia e-mail, então nenhum cenário foi afetado.
- Baseline: `max(ticket.id)` = 96 e `max(ticket_history.id)` = 136. Chamado J = #84 (`[QA] Janela aberta`).

## Cenários

| #   | Cenário                                                                                     | Papel                  | Status        |
| --- | ------------------------------------------------------------------------------------------- | ---------------------- | ------------- |
| 1   | Dialog "Novo chamado": ordem dos campos, foco no Título, Criador somente leitura, padrão    | Membro Suporte         | PASSOU        |
| 2   | Lista de Destinatário = consulta do banco, ordem, busca `admin`                             | Membro Suporte         | PASSOU        |
| 3   | Criar `[QA] Destinatário padrão` (#97), payload sem criador                                 | Membro Suporte         | PASSOU        |
| 4   | Banco: `created_by`/`assigned_to` = M; `criacao` com `to_assignee_id` = M; sem `atribuicao` | banco                  | PASSOU        |
| 5   | Detalhe #97, rótulos, linha do tempo, "Resolver"; abas Abertos/Atribuídos e contagens       | Membro Suporte         | PASSOU        |
| 6   | Criar `[QA] Destinatário colega` (#98) para QA Admin Suporte                                | Membro Suporte         | PASSOU        |
| 7   | #98 em "Abertos por mim" e fora de "Atribuídos a mim"                                       | Membro Suporte         | PASSOU        |
| 8   | Destinatário forjado: D, I e 999999 recusados no campo                                      | Membro Suporte         | PASSOU        |
| 9   | Payload sem `assigneeId`; com `createdBy` forjado                                           | Membro Suporte         | PASSOU        |
| 10  | Atribuídos a mim e detalhe de #98: "Resolver" sem "Editar"                                  | Admin Suporte          | PASSOU        |
| 11  | Admin cria `[QA] Para o membro` (#100); membro vê, com "Resolver" e sem "Editar"            | Admin Suporte e Membro | PASSOU        |
| 12  | "Editar" em #97: combobox com M selecionado e a mesma lista                                 | Membro Suporte         | PASSOU        |
| 13  | Trocar só o destinatário para A em #97                                                      | Membro Suporte         | PASSOU        |
| 14  | Banco: `edicao` e `atribuicao` com o mesmo `changed_at`, `ticket` atualizado                | banco                  | PASSOU        |
| 15  | Título, tag e destinatário juntos: ordem `edicao` < `mudanca_tag` < `atribuicao`            | Membro Suporte         | PASSOU        |
| 16  | Salvar sem mudar nada                                                                       | Membro Suporte         | PASSOU        |
| 17  | Edição com `assigneeId` forjado = D                                                         | Membro Suporte         | PASSOU        |
| 18  | Diretor desativa A; membro abre #98: leitura, "Editar", dica, lista, validação              | Diretor e Membro       | PASSOU        |
| 19  | `assigneeId` forjado = A (inativo); depois escolher M e salvar; A reativado                 | Membro Suporte         | PASSOU        |
| 20  | Dialog aberto antes da desativação, depois enviar A                                         | Membro Suporte         | NÃO EXECUTADO |
| 21  | #84 sem destinatário: leitura `—`, dica, Cancelar                                           | Membro Suporte         | PASSOU        |
| 22  | #65: `Criador` e `Destinatário —`, linha do tempo igual                                     | Membro Suporte         | PASSOU        |
| 23  | `get_errors` do dev server sem erro nem aviso de hidratação                                 | todos                  | PASSOU        |
| R1  | Regressão Tag na criação: seleção e `Selecione a tag.`                                      | Membro Suporte         | PASSOU        |
| R2  | Regressão Tag na edição: seleção, dica de tag indisponível e `Selecione a tag.`             | Membro Suporte         | PASSOU        |
| R3  | Responsivo 390×844: dialog e modo de edição                                                 | Membro Suporte         | PASSOU        |

### Evidência dos cenários

- **#1.** Rótulos do dialog: Título, Descrição, Tipo, Tags, Criador, Destinatário. Foco inicial no input do Título. Criador é `input` `readOnly` com `QA Membro Suporte`; clicar e teclar `x` não mudou o valor. Destinatário vem com `QA Membro Suporte`.
- **#2.** Opções: `QA Admin Suporte`, `QA Membro Suporte`. A consulta `select id, name from users where department_id = 18 and is_active order by lower(name), id` devolveu `13 QA Admin Suporte` e `14 QA Membro Suporte`. A busca `admin` deixou só `QA Admin Suporte`. Não aparecem o Diretor nem QA Admin Infra.
- **#3.** Corpo da action: `[{"title":"[QA] Destinatário padrão","description":"[QA] Teste da entrega B.","type":"duvida","tagId":10,"assigneeId":14}]`, sem criador. O ticket foi criado como #97 (ver ressalva do toast em Observações).
- **#4.** `ticket` 97: `created_by = 14`, `assigned_to = 14`. `ticket_history` 137: `criacao`, `changed_by = 14`, `to_assignee_id = 14`, `from_assignee_id` nulo. Nenhuma `atribuicao`.
- **#5.** #97: Criador e Destinatário = QA Membro Suporte, `Aberto em` presente, sem `Aberto por` nem `Responsável`. Linha do tempo: `Abriu o chamado em QA Suporte com status Aberto.` Card Conclusão com "Resolver". Consulta `count(*) filter (where created_by=14 …)` = 25 aberto e 1 atribuído (antes de #98). A aba "Abertos por mim" mostrou 25 linhas e "Atribuídos a mim" 1; #97 estava nas duas.
- **#6.** Toast `Chamado #98 criado.` `ticket` 98: `assigned_to = 13`. `ticket_history` 138: `criacao` com `to_assignee_id = 13`. Linha do tempo: `Abriu o chamado em QA Suporte com status Aberto e o atribuiu a QA Admin Suporte.` Sem "Resolver"; "Editar" presente.
- **#7.** #98 aparece em "Abertos por mim" (26) e não em "Atribuídos a mim" (1).
- **#8.** Com `assigneeId` trocado por 6, 15 e 999999, os três deram `Este destinatário não está disponível. Escolha uma pessoa ativa do seu setor.` no campo, com o foco no gatilho do combobox e `aria-invalid="true"`. O dialog continuou aberto. `max(ticket.id)` = 98 e `max(ticket_history.id)` = 138 (nada gravado).
- **#9.** Sem `assigneeId`: toast `Selecione o destinatário.` e nada gravado. Com `createdBy` e `creatorId` = 13 acrescentados: toast `Chamado #99 criado.`; `ticket` 99 com `created_by = 14` e `assigned_to = 14`; `criacao` 139 com `changed_by = 14`.
- **#10.** Admin Suporte: "Atribuídos a mim" lista só #98; o detalhe tem "Anexar", "Enviar para outro setor" e "Resolver", sem "Editar".
- **#11.** Toast `Chamado #100 criado.` O dialog do admin abriu com Criador e padrão `QA Admin Suporte`. O membro vê #100 em "Atribuídos a mim". No detalhe, "Resolver" presente e sem "Editar"; linha do tempo `…e o atribuiu a QA Membro Suporte.`
- **#12.** O combobox tem `QA Membro Suporte` selecionado, as opções são `QA Admin Suporte` e `QA Membro Suporte`, e Criador continua texto (`term`/`definition`).
- **#13.** Toast `Chamado #97 atualizado.` Linha do tempo: Edição `Alterou destinatário.` e Atribuição `Trocou o destinatário de QA Membro Suporte para QA Admin Suporte.` O detalhe mostra `Destinatário` QA Admin Suporte, sem "Resolver", com "Editar".
- **#14.** `ticket_history` 140 `edicao` (`note = 'Alterou destinatário.'`) e 141 `atribuicao` (`from_assignee_id = 14`, `to_assignee_id = 13`, `changed_by = 14`), ambos com `changed_at = 2026-10-06 02:36:19.285+00`. `ticket` 97: `assigned_to = 13`, `updated_at` = o mesmo valor, `status = aberto`, setores 18/18. `ticket_tag` inalterado (tag 10).
- **#15.** Nota `Alterou título, tag e destinatário.` Linhas 142 `edicao` < 143 `mudanca_tag` < 144 `atribuicao`, mesmo `changed_at` (02:36:47.059). `atribuicao` de 13 para 14. A linha do tempo mostra `Trocou a tag de [QA] Acesso para [QA] Edição B.` e `Trocou o destinatário de QA Admin Suporte para QA Membro Suporte.`
- **#16.** Toast `Nenhuma alteração para salvar.` O modo de edição fecha, como o contrato de edição prevê (`NO_CHANGES` → `toast.info`, fecha). O corpo enviado tinha `assigneeId: 14`. `ticket_history` não ganhou linha.
- **#17.** Com `assigneeId` forjado = 6: mensagem de `INVALID_ASSIGNEE` no campo, `aria-invalid="true"`, foco no combobox, continua editando. `max(ticket_history.id)` = 139 e `ticket.updated_at` de #97 inalterado.
- **#18.** Diretor desativou QA Admin Suporte em Cadastros → Pessoas. Membro em #98: leitura mostra `Destinatário QA Admin Suporte`. "Editar": combobox `Selecione o destinatário`, texto `O destinatário atual não está disponível. Escolha uma pessoa ativa do seu setor.`, lista só com `QA Membro Suporte`. Salvar sem escolher: `Selecione o destinatário.`
- **#19.** Escolhido M na UI e `assigneeId` trocado por 13 no envio: `INVALID_ASSIGNEE` no campo, continua editando; nenhuma linha nova (`max(ticket_history.id)` = 147, o valor que já existia). Depois, escolhendo M e salvando: `edicao` 148 (`Alterou destinatário.`) e `atribuicao` 149 (`from = 13`, `to = 14`); `ticket` 98 com `assigned_to = 14`. O Diretor reativou QA Admin Suporte e o banco confirma `is_active = true` (id 13).
- **#21.** #84: `Destinatário —`. Em "Editar": combobox sem seleção e texto `Este chamado ainda não tem destinatário. Escolha uma pessoa ativa do seu setor.` Cancelar fechou o modo de edição. `max(ticket_history.id)` = 144 e `ticket` 84 com `assigned_to` nulo e `updated_at` inalterado.
- **#22.** #65: `Criador QA Membro Suporte`, `Destinatário —`, linha do tempo `Abriu o chamado em QA Suporte com status Aberto.` Não foi editado.
- **#23.** `get_errors` do `next-devtools` devolveu `configErrors: []` e `sessionErrors: []` depois dos blocos de cenários e no fim.
- **R1.** Enviar sem tag: `Selecione a tag.` e foco no combobox Tags. O combobox lista as 12 tags ativas de QA Suporte; escolher `[QA] Lista 01` limpa o erro.
- **R2.** A tag foi trocada com sucesso nos cenários 15 e na preparação. Com a tag do #99 desativada (`[QA] Tag temporária B`, criada pelo teste, `tag.id` 25): leitura mostra a tag pelo nome; "Editar" abre o combobox `Selecione a tag` com `A tag atual não está disponível. Escolha uma tag ativa do seu setor.`; salvar sem tag dá `Selecione a tag.`; a lista tem 12 opções (sem a inativa); escolher `[QA] Acesso` e salvar dá `Chamado #99 atualizado.`
- **R3.** Em 390×844, o dialog empilha Criador e Destinatário (largura 294,5 px cada, `y` 575 e 645), `scrollWidth = clientWidth = 390`, e "Abrir chamado" fica visível. No modo de edição do #97, o combobox Destinatário tem 293 px de largura, `scrollWidth = clientWidth = 375` (sem rolagem horizontal) e "Salvar alterações" está visível. Screenshots em `.qa-output/resp-dialog.png`, `.qa-output/resp-edit.png`, `.qa-output/c1-dialog.png` e `.qa-output/c16-nochanges.png`.

## Falhas

Nenhuma.

## Erros fora dos cenários

Nenhum. `get_errors` sem erro de runtime, hidratação ou build em toda a bateria.

## Não executados

- **#20** (dialog aberto antes da desativação): o contrato o marca como opcional quando a desativação no meio do dialog não puder ser coordenada. O Diretor e o membro compartilham um único navegador, cookie e janela. Fazer a desativação exige trocar a sessão e, com ela, o cookie do dialog aberto; reaproveitar o dialog com outra sessão não testaria o cenário. O caminho de erro do servidor foi coberto por #8, #17 e #19 (destinatário inativo ou de outro setor, forjado), mas a atualização da lista por `router.refresh()` depois de `INVALID_ASSIGNEE` na criação não foi observada.

## Observações

- **Toast do cenário 3.** O toast `Chamado #97 criado.` não foi capturado, porque o observador só foi instalado a partir do #98. O resultado foi aceito pelo payload, pelas linhas no banco e pelo detalhe. O mesmo fluxo mostrou o toast em #98, #99 e #100.
- **Rótulo "Tags" no dialog.** O dialog "Novo chamado" rotula o campo como `Tags`, e o card Detalhes e o modo de edição usam `Tag`. Não é tocado por este contrato; registrado só como inconsistência de texto para o `df-architect` decidir.
- **Dados criados pelo teste** (todos em QA Suporte): #97 `[QA] Destinatário padrão alterado`, #98 `[QA] Destinatário colega`, #99 `[QA] Forjado editado` (hoje na tag `[QA] Acesso`), #100 `[QA] Para o membro`, e a tag `[QA] Tag temporária B` (inativa). Todos os quatro chamados terminam com `assigned_to = 14`. Não alterados: #65 a #68, #83 e #84.
- **Estado final das pessoas:** QA Admin Suporte ativo, QA Membro Suporte ativo, QA Admin Infra continua inativo (como estava).
- **Consulta de contagem do cenário 5.** O contrato manda comparar com a consulta do cenário 3 de `my-tickets.md`; o número bateu (25 e 1 antes de #98; 26 e 1 depois).
