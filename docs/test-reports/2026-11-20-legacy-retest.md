# Relatório de testes — Reteste dos cenários pendentes de relatórios antigos

- **Data:** 2026-11-20
- **Contratos:** `department-admins-shortcut.md`, `form-field.md` (G, H, J), `operations.md`, `operations-tmr-overdue.md`, `ticket-actions.md`
- **Commit:** `1aa5762` · alterações não comitadas: não (só relatórios novos em `docs/test-reports/`)
- **Ambiente:** `http://localhost:3000`, `next dev`, banco de desenvolvimento (dados atuais, sem o seed QA antigo)
- **Resultado:** 26 cenários reexaminados · 9 passaram · 5 parciais · 0 falharam · 12 não executados · 0 superados

Nenhum cenário foi marcado SUPERADO. Conferi as notas de revisão dos contratos: o ADR 027 (objetivo individual dividido) e o ADR 025 (TMR) não mudam o que esses cenários pedem. O texto da nota de Não alocado em Setores mudou desde 2026-11-10, mas isso não afeta nenhum cenário reexaminado.

## Pré-requisitos e método

- `/login` respondeu 200. `next-devtools` achou o servidor na porta 3000. O `postgres` respondeu. O Chrome do MCP `playwright` abriu visível e foi trazido para a frente.
- O banco mudou desde os relatórios antigos. Hoje ele tem 8 setores (Não Alocado, Diretoria, Suporte, P&D, Financeiro, Administrativo, QA, Implantação) e 31 pessoas. Os ids são outros e o setor "QA Suporte" não existe mais.
- Contas usadas, uma tentativa de login cada. A senha não foi gravada em lugar nenhum e nenhum snapshot foi tirado com senha preenchida.
  - Rodinei, `rodilindo@gmail.com`, membro do Suporte. A sessão já estava aberta no navegador.
  - Carlos Alberto, `cazalbe@gmail.com`, admin do Suporte.
  - Marta Vieria, `martaselecao@gmail.com`, admin de P&D.
  - Marcelo Oliveira, `mco_12@gmail.com`, membro do Suporte.
  - Lucas Rosa, `lucas12surf@gmail.com`, Diretoria.
- Não li o `.env`. Nenhum cenário depende de e-mail.
- **Técnica sem escrita proibida.** Para cenários que pedem "desativar tag ou pessoa" ou "mudar membros em outra aba", reproduzi o estado inválido reescrevendo o corpo do POST da Server Action no navegador (`page.route`). O formulário real envia, o servidor real responde e a interface real reage. Nenhuma tag, pessoa ou setor foi alterado. Isso é equivalente no servidor e na interface, mas não exercita a corrida de dois usuários.
- **Chamadas forjadas.** Usei `fetch` com o cabeçalho `Next-Action` para `renameDepartment` e `saveTicketActions`. Todas foram desenhadas para não gravar nada, mesmo se a guarda falhasse (ids inexistentes, `memberIds` divergente ou chamado `[QA]`).

## Chamados [QA] usados ou criados

| Chamado                      | Uso                                                                                           | Estado inicial                                               | Estado final                                                                                                                                                   |
| ---------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #36 `[QA] Retest J21 anexos` | **Criado** por Rodinei (Suporte, empresa 13 STREET WEAR, destinatário o próprio). Cenário J21 | não existia                                                  | `em_andamento`, 1 anexo `qa-9mb.txt` (`attachment_history` 24 `inclusao`)                                                                                      |
| #34 `[QA] Acesso remetente`  | Recusado pela admin de P&D (A17, recusado)                                                    | `aguardando_aprovacao` em P&D, transferência 25 `pendente`   | `recusado`, Suporte, destinatário 4, transferência 25 `rejeitado` (`review_note` `[QA] recusa do reteste A17`), `ticket_history` 147 `transferencia_rejeitada` |
| #28 `[QA] Enviados recusa`   | Edição aberta com corpo reescrito (J13 e J14)                                                 | `em_andamento`, destinatário 4, tag 78                       | igual (título, tag e destinatário não mudaram; `ticket_history` com 6 linhas antes e depois)                                                                   |
| #29, #31, #32, #13           | Só leitura e chamadas forjadas de `saveTicketActions` (A17)                                   | `encaminhado`, `aguardando_aprovacao`, `aberto`, `resolvido` | iguais, `actions` continua `null`                                                                                                                              |

Nenhuma empresa, tag, conta ou setor foi alterado. `department` 1, 2 e 3 mantêm o `updated_at` anterior.

## 1. `2026-11-10-department-admins-shortcut.md` (nove não executados)

| #   | Cenário                                                 | Papel   | Resultado     |
| --- | ------------------------------------------------------- | ------- | ------------- |
| A11 | Membro desativado ou movido em outra aba, depois salvar | Diretor | PARCIAL       |
| A12 | Membro movido para o setor em outra aba, depois salvar  | Diretor | PARCIAL       |
| A13 | Rebaixado vê "Cadastros" sumir                          | Admin   | NÃO EXECUTADO |
| A14 | Promovido vê "Cadastros" aparecer                       | Membro  | NÃO EXECUTADO |
| A16 | `renameDepartment` forjado por admin                    | Admin   | PASSOU        |
| A17 | `admins` forjado para Diretoria e Não alocado           | Diretor | PASSOU        |
| A18 | `adminIds` fora de `memberIds`                          | Diretor | PASSOU        |
| —   | Foco no primeiro checkbox com erro do grupo             | Diretor | NÃO EXECUTADO |
| —   | `MEMBERS_CHANGED` (toast e fechamento)                  | Diretor | PASSOU        |

- **A11 e A12, parcial.** Abri "Editar Suporte" (10 checkboxes, só Carlos marcado) e cliquei Salvar com o corpo reescrito.
  - Corpo original: `{"id":3,"name":"Suporte","admins":{"memberIds":[2,12,7,9,10,31,3,4,6,8],"adminIds":[2]}}`.
  - A11 (lista mostrada com um membro a menos): toast `As pessoas deste setor mudaram enquanto você editava. A lista foi atualizada: abra a edição de novo e confira os administradores.` e o diálogo fechou.
  - A12 (id 5, pessoa inativa, a mais na lista): mesmo toast e mesmo fechamento.
  - SQL `select id,name,updated_at from department where id=3` continuou com `updated_at 2026-11-13 02:32:56` e nome `Suporte`. `select id,role from users where department_id=3` não mudou papel nenhum.
  - Não executado: a corrida real, com alguém desativado ou movido em outra aba, porque exige alterar conta.
- **A13 e A14, não executados.** Exigem rebaixar ou promover uma conta, o que o escopo proíbe. Escrita necessária: `users.role` de uma pessoa do Suporte.
- **A16.** Logada como admin (Carlos), POST de `renameDepartment` com `{"id":3,"name":"Suporte","admins":{"memberIds":[],"adminIds":[]}}` devolveu `{"ok":false,"code":"FORBIDDEN","message":"Você não tem permissão para gerenciar setores."}`. O mesmo ocorreu com `{"id":9999,"name":"QA inexistente"}`. A resposta é a mesma para id inexistente, então a guarda `getDirector` vem antes de consultar o setor.
- **A17.** Como Diretor, `id` 1 (Não Alocado) e `id` 2 (Diretoria) com `admins` devolveram `ADMINS_NOT_EDITABLE` com `Os administradores deste setor não podem ser alterados por aqui.`. Nenhum `updated_at` de setor mudou.
- **A18.** `adminIds [2,4]` com `memberIds [2,3]` devolveu `INVALID_INPUT` com `Só pessoas ativas do setor podem ser administradoras.`. Pela interface, com o corpo reescrito (`adminIds [2,99]`), a mensagem aparece no campo "Nome do setor", com `aria` de erro e foco no nome, e o diálogo fica aberto. O código faz isso de propósito (`department-edit-dialog.tsx` linha 92 manda `INVALID_INPUT` para o campo `name`).
- **Foco no primeiro checkbox, não executado.** O erro do grupo só nasce no cliente quando `adminIds` sai de `memberIds`, e a interface nunca gera isso. O código tem `ref={index === 0 ? ref : undefined}` em `department-admins-field.tsx` linha 91, sem confirmação em execução.
- **`MEMBERS_CHANGED`, toast e fechamento.** Confirmado nas duas execuções acima.

## 2. `2026-11-10-form-field-etapa-3b.md` (J8, J12, J13, J14, J20, J21 parcial)

| #   | Cenário                                                            | Papel        | Resultado                |
| --- | ------------------------------------------------------------------ | ------------ | ------------------------ |
| J8  | Chamado antigo sem empresa                                         | Membro       | NÃO EXECUTADO            |
| J12 | Tag atual indisponível                                             | Admin/Membro | NÃO EXECUTADO            |
| J13 | `INVALID_TAG` na edição                                            | Membro       | PASSOU (corpo reescrito) |
| J14 | `INVALID_ASSIGNEE` na edição                                       | Membro       | PASSOU (corpo reescrito) |
| J20 | Legado resolvido sem solução                                       | Membro       | NÃO EXECUTADO            |
| J21 | Anexos na edição: acima do limite e salvar com upload em andamento | Membro       | PASSOU                   |

- **J8 e J20, não executados.** SQL: `select count(*) from ticket where company_id is null` devolveu 0. `select count(*) from ticket where status='resolvido' and (solution is null or solution='')` devolveu 0. Criar esses chamados exigiria escrita direta no banco, e a interface exige empresa na abertura.
- **J12, não executado.** SQL em `tag`: as 79 tags estão ativas. Escrita necessária: desativar uma tag em uso (por exemplo `#AJUSTE_DE_ESTOQUE`, usada em 15 chamados).
- **J13.** Marcelo abriu "Editar" no #28, mudou o título e salvou. O corpo foi reescrito de `"tagId":78` para `"tagId":41`, tag de P&D. O corpo original era `[{"companyId":3,"title":"[QA] Enviados recusa x","description":"[QA] teste","type":"duvida","tagId":78,"assigneeId":4,"ticketId":28,"actions":"$undefined","attachments":[],"removedAttachmentIds":[]}]`. Resultado: erro `Esta tag não está disponível. Escolha uma tag ativa do seu setor.` no campo Tag, foco no combobox de Tag, edição continua aberta e nenhum toast.
- **J14.** Mesmo fluxo com `assigneeId` trocado para 5 (Álvaro, inativo) e `handoffComment` injetado, para o servidor não recusar por falta de comentário. Resultado: `Este destinatário não está disponível. Escolha uma pessoa ativa do seu setor.` no campo Destinatário, com foco nele e edição aberta.
- **J13 e J14, banco.** Depois de Cancelar: #28 manteve o título `[QA] Enviados recusa`, destinatário 4 e tag 78. `ticket_history` do #28 tem 6 linhas antes e depois. Nada gravado.
- **J13 e J14, o que não vi.** O "lista recarrega" (`router.refresh`) não foi observado de forma independente. O estado do Combobox no momento do erro foi preservado.
- **J21, limite de tamanho.** No #36, em edição, anexei `qa-11mb.txt` (11 MB, `.txt`). Toast `qa-11mb.txt: O arquivo precisa ter no máximo 10 MB.` e o arquivo não entrou na lista.
- **J21, salvar com upload em andamento.** Atrasei o POST do upload em 5 s com `page.route` para pegar o estado. Durante o `Enviando`, "Salvar alterações" ficou com `aria-disabled="true"` e `aria-describedby` apontando para o texto `Aguarde o envio dos anexos terminar.`. Um clique forçado deu o toast `Aguarde o envio dos anexos terminar.` e a edição não foi salva. Terminado o envio, salvar gravou: `attachment_history` 24 `inclusao` (`qa-9mb.txt`, 9.900.000 bytes), `attachment` do chamado = 1, e nenhuma linha nova em `ticket_history`.

## 3. `2026-11-10-form-field-etapa-2.md` (G5, G9, parte do G8)

| #   | Cenário                              | Papel   | Resultado     |
| --- | ------------------------------------ | ------- | ------------- |
| G5  | Criar pessoa `[QA]` válida           | Diretor | NÃO EXECUTADO |
| G8  | "Nova senha igual à atual" gera erro | Membro  | PASSOU        |
| G9  | Trocar senha com sucesso             | Membro  | NÃO EXECUTADO |

- **G5, não executado.** Escrita necessária: criar uma conta (`users` e `account`). O escopo proíbe alterar contas.
- **G8.** Rodinei (membro do Suporte), em `/profile`, preenchi os três campos com o mesmo valor falso (`QaFake#Pass123`, que não é a senha real). Clicar em salvar mostrou `A nova senha precisa ser diferente da atual.` em `profile-new-password-error`, com `aria-invalid` e foco em `profile-new-password`. A validação é do `changePasswordSchema` no cliente. Esvaziei os campos depois.
- **G9, não executado.** Trocar a senha altera uma conta e quebraria o login compartilhado dos testes. Escrita necessária: `account.password` de uma conta.

## 4. `2026-11-10-form-field-etapa-3a.md` (H8)

| #   | Cenário                                        | Papel  | Resultado                |
| --- | ---------------------------------------------- | ------ | ------------------------ |
| H8  | `INVALID_TAG` e `INVALID_ASSIGNEE` na abertura | Membro | PASSOU (corpo reescrito) |

- Marcelo abriu "Novo chamado" e preencheu pela interface (empresa 13 STREET WEAR, título `[QA] H8 tag invalida`, tipo Dúvida, tag `#AJUSTE_DE_ESTOQUE`, destinatário Fila). Corpo original: `[{"companyId":3,"title":"[QA] H8 tag invalida","description":"…","type":"duvida","tagId":78,"assigneeId":null,"priority":"media","attachments":[]}]`.
- **`INVALID_TAG`** com `tagId` trocado para 41 (tag de P&D): erro `Esta tag não está disponível. Escolha uma tag ativa do seu setor.` sob Tags, foco no combobox de Tags (`activeLabel` "Tags"), diálogo aberto com tipo, prioridade e tag mantidos.
- **`INVALID_ASSIGNEE`** com `assigneeId` trocado para 5 (inativo): erro `Este destinatário não está disponível. Escolha uma pessoa ativa do seu setor.` sob Destinatário e foco no combobox dele.
- SQL `select id from ticket where title like '[QA] H8%'` devolveu 0 linhas; `max(id)` continuou 36. Nada criado.
- Não coberto: o `INVALID_TARGET` do "Enviar para outro setor" (o relatório antigo o citava na lista de não executados) e o recarregamento da lista.

## 5. `2026-11-11-operations.md` (OP10, OP18, OP13 parcial)

| #    | Cenário                           | Papel         | Resultado     |
| ---- | --------------------------------- | ------------- | ------------- |
| OP10 | Não alocado vê só a mensagem      | Não alocado   | NÃO EXECUTADO |
| OP13 | Produção com 3 e com 12 pessoas   | Admin/Diretor | PARCIAL       |
| OP18 | Admin rebaixado com a tela aberta | Admin         | NÃO EXECUTADO |

- **OP10, não executado.** `select count(*) from users where department_id=1` devolveu 0: não há conta em Não Alocado. Escrita necessária: mover uma conta para esse setor. Só confirmei por leitura de código que `hasOperations(facts)` é `facts !== null && !facts.isUnassigned` (`app/_lib/domain/operations.ts` linha 62).
- **OP18, não executado.** Escrita necessária: rebaixar uma conta admin. Só por leitura de código: `saveDepartmentGoals` chama `getRegistryAccess()` a cada chamada (`resolveRegistryAccess(await getAccountFacts())`), então o acesso é lido na hora e não da sessão, e devolve `FORBIDDEN` para `kind === "none"`.
- **OP13.** O contrato pede três e doze pessoas. Hoje não existe setor com 12 pessoas ativas.
  - **Suporte, 10 pessoas (Carlos, admin, em 1280 e 390).** Subtítulo `Chamados resolvidos por pessoa · 22 resolvidos no período · 10 pessoas`. A tabela `sr-only` bate com o banco (Marcelo 8, Douglas 6, Rodinei 5, Cristiane 2, Miraildes 1) e lista os zeros em ordem de nome (Carlos, Caroline, Erika, José, Lionel). SQL: `select u.name,count(*) from ticket t join users u on u.id=t.assigned_to where t.status in ('resolvido','fechado') and t.resolved_at >= timestamptz '2026-11-01 00:00-03' and t.resolved_at < now() and t.current_department_id=3 group by 1 order by 2 desc,1`. Em 1280 não há rolagem nem dica. Em 390 aparece `Arraste para ver as 10 pessoas.`, a única rolagem horizontal é o `DIV overflow-x-auto` do gráfico (648 de conteúdo em 309) e a página tem `scrollWidth` 375 = `clientWidth` 375.
  - **P&D, 5 pessoas (Lucas, `?setor=4`).** `5 resolvidos no período · 5 pessoas`, ordem Ronaldo 3, Kylian 1, Marta 1, Flávio 0, Gabriela 0. Em 390 há uma rolagem interna do gráfico e a página não rola.
  - **Administrativo, 3 pessoas (`?setor=6`).** Só o estado vazio: `0 resolvidos no período · 3 pessoas`, `Nenhum chamado resolvido no período`. QA (3 pessoas) e Implantação (5) também têm 0 resolvidos mesmo com período `2026-01-01` a `2026-11-20`. Não há como ver o gráfico de 3 pessoas sem resolver chamados nesses setores.
  - **Faltou:** o gráfico com 3 pessoas e a tela com 12 pessoas.

## 6. `2026-11-12-operations-tmr-overdue.md` (TO16)

| #    | Cenário                                 | Papel   | Resultado     |
| ---- | --------------------------------------- | ------- | ------------- |
| TO16 | Setor sem espera no mês: `0h`, Aderente | Diretor | NÃO EXECUTADO |

- SQL: `select * from department_goal` devolve uma linha (Suporte, id 3: SLA 80, TMA 5, atraso 50h, chamados em atraso 20, TMR 5). `ticket_queue_wait` do mês tem 24 esperas no Suporte (3), 20 em P&D (4) e 1 em Financeiro (5). O card só aparece em setor com objetivos, e o único tem esperas. Escrita necessária: definir objetivos em outro setor, por exemplo Administrativo, que não tem espera nenhuma.

## 7. `2026-11-18-ticket-actions.md` (A16, A17, A19)

| #   | Cenário                                                         | Papel         | Resultado     |
| --- | --------------------------------------------------------------- | ------------- | ------------- |
| A16 | Fechado e cancelado                                             | —             | PARCIAL       |
| A17 | `aguardando_aprovacao`, `encaminhado`, `recusado`, `em_analise` | Admin, Membro | PARCIAL       |
| A19 | Conta inativa ou com troca de senha pendente                    | —             | NÃO EXECUTADO |

- **A16, parcial.** Não há chamado `fechado` nem `cancelado` (contagem por status: aberto 1, encaminhado 1, aguardando_aprovacao 4, em_andamento 2, resolvido 27). Não existe ação de cancelar na interface (`grep` em `app/_lib/actions` e `app/_lib/data` não acha escrita de `cancelado`). Fechar exige esperar a janela de edição vencer ou o cron. Por código, `ticketActionsBlockFor` devolve `STATUS_NOT_IN_PROGRESS` para qualquer status diferente de `em_andamento`. Como controle, uma chamada forjada de `saveTicketActions` no #13 (`resolvido`) devolveu `FORBIDDEN` com `As ações só podem ser registradas com o chamado em andamento.`.
- **A17, três dos quatro status.** Em cada um, o card "Ações" mostra `Nenhuma ação registrada.`, sem textarea nem botão Salvar, e a chamada forjada de `saveTicketActions` devolve `{"ok":false,"code":"FORBIDDEN","message":"As ações só podem ser registradas com o chamado em andamento."}`. Depois, `actions` continua `null` em todos.

  | Status                 | Chamado                                                                   | Quem viu | Botões visíveis                                              |
  | ---------------------- | ------------------------------------------------------------------------- | -------- | ------------------------------------------------------------ |
  | `aguardando_aprovacao` | #31 (Carlos, admin do Suporte); #34 antes da recusa (Marta, admin de P&D) | admin    | Atender, Recusar, Comentar                                   |
  | `encaminhado`          | #29 (Marta, admin de P&D, que pode resolver)                              | admin    | Enviar, Enviar para outro setor, Resolver, Comentar          |
  | `recusado`             | #34 depois da recusa (Marcelo, destinatário)                              | membro   | Atender, Editar, Enviar para outro setor, Resolver, Comentar |

  Controle positivo: o #28 (`em_andamento`) mostra a textarea e "Salvar" para Marcelo.

- **A17, `em_analise`, não executado.** Nenhum caminho do sistema grava esse status (`grep` por `em_analise` em `app/_lib/data` e `app/_lib/actions` não acha escrita). Ele só existe no enum e no domínio. Não há chamado assim no banco.
- **A19, não executado.** Escrita necessária: desativar uma conta ou marcar troca de senha pendente. Não há credencial da conta inativa Álvaro (id 5). Por código, `ticketActionsBlockFor` devolve `ACTOR_INACTIVE` e `PASSWORD_CHANGE_REQUIRED` a partir de `lockActorFacts`, que lê `is_active` e `must_change_password` do banco dentro da transação. Não observado em execução.

## Falhas

Nenhuma.

## Erros fora dos cenários

- `get_errors` do `next-devtools`: `configErrors: []` e `sessionErrors: []` após cada papel e no fim.
- Console do navegador (histórico da sessão): um aviso de hidratação no input de busca do topo, com a única diferença `style={{caret-color:"transparent"}}`. É o falso positivo conhecido que o Playwright produz ao tirar screenshot, e nesta rodada o screenshot não foi o gatilho. Não conta como falha. Dois `404` são esperados: `/registry/departments` na sessão de admin (A15 do relatório antigo) e `/tickets/33` em visita anterior à minha.
- `.next/dev/logs/next-development.log` registra `⨯ Error: The destination stream closed early.` em vários pontos, junto de navegações interrompidas. Também aparecia no relatório de 2026-11-18. Sem efeito visível nos cenários.

## Observações

- **A18 na interface.** O erro de `adminIds` inválido aparece no campo "Nome do setor" (por `INVALID_INPUT`) e não no grupo "Administradores". O contrato (linha 237 de `department-admins-shortcut.md`) diz "erro no nome (como hoje)", então bate. Fica a ambiguidade de qual campo o `df-architect` quer que receba esse erro no futuro.
- **J13 e J14 e H8 por corpo reescrito.** Os contratos descrevem o estado inválido por desativação feita por outro usuário. A rodada confirma a reação do servidor e da interface ao erro, mas não a corrida real.
- **J21, anexo duplicado.** Na primeira tentativa, o seletor de arquivo de uma chamada anterior do teste e o `browser_file_upload` seguinte anexaram o mesmo `qa-9mb.txt` duas vezes. Removi os dois antes de salvar. Provável artefato do meu roteiro, não do app.
- **Arquivos temporários.** `qa-11mb.txt`, `qa-9mb.txt` e `qa-small.txt` ficaram em `.qa-output/up/` (fora do git).
- **Janela.** O navegador ficou aberto, logado como Lucas (Diretoria).
