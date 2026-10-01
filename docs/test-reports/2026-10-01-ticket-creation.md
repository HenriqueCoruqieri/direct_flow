# Relatório de testes — Criação de chamado

- **Data:** 2026-10-01
- **Contrato:** `docs/contracts/ticket-creation.md`
- **Commit:** `f9f2d99` · alterações não comitadas: sim
- **Ambiente:** `http://localhost:3000`, `next dev`, banco de desenvolvimento (Neon compartilhado)
- **Resultado:** 15 de 17 passaram · 0 falharam · 0 bloqueados · 2 não executados

A execução de `docs/test-reports/2026-09-30-ticket-creation.md` não rodou nenhum cenário (migration `0007` ausente). Este relatório é a primeira execução real da bateria, não um reteste.

## Pré-requisitos

| Pré-requisito                                                         | Situação                                                                                                                                                                        |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dev server no ar (`/login` → 200)                                     | OK                                                                                                                                                                              |
| MCP `playwright` e `next-devtools`                                    | OK (servidor Next na porta 3000 descoberto)                                                                                                                                     |
| Usuários de teste existem e estão ativos, sem troca de senha pendente | OK (ids 6 Diretor, 13 Admin Suporte, 14 Membro Suporte, 15 Admin Infra)                                                                                                         |
| Migration `0007_ticket_creation` aplicada                             | OK. `ticket_tag_single_per_ticket_idx` existe; `enum_range(null::history_event)` termina em `mudanca_tag`; `ticket_history` tem `from_tag_id` e `to_tag_id` (integer, nullable) |
| `RESEND_API_KEY` vazia                                                | Preenchida. Não afeta: o contrato diz "Sem e-mail" e nenhum cenário depende de envio                                                                                            |

## Fixtures e dados gravados no banco

Tudo gravado pela própria aplicação, clicando na interface. Nenhum `INSERT`, `UPDATE` ou `DELETE` manual.

| Tabela            | Registro                                                                                             | Criado por        |
| ----------------- | ---------------------------------------------------------------------------------------------------- | ----------------- |
| `tag`             | id 10 `[QA] Acesso` (QA Suporte, setor 18). Desativada e reativada no cenário 9/10; termina ativa    | QA Admin Suporte  |
| `tag`             | id 11 `[QA] Rede` (QA Infra, setor 19), ativa                                                        | QA Admin Infra    |
| `department`      | id 20 `[QA] Setor inativo`, criado e desativado (não havia setor inativo para o cenário 8)           | Diretor           |
| `ticket`          | id 65 `[QA] Próprio setor` (aberto), id 66 `[QA] Outro setor` (aguardando_aprovacao)                 | QA Membro Suporte |
| `ticket_tag`      | (65, 10) e (66, 10)                                                                                  | via criação       |
| `ticket_history`  | id 77 (`criacao`, ticket 65); ids 78 (`criacao`) e 79 (`transferencia_solicitada`), ticket 66        | via criação       |
| `ticket_transfer` | id 5 (ticket 66, 18 → 19, `pendente`, `requested_by` 14)                                             | via criação       |
| `users`           | id 14 movido para Não alocado e de volta para QA Suporte (cenário 10), estado final igual ao inicial | Diretor           |

Não removíveis pelo teste: chamados 65 e 66, as tags 10 e 11 e o setor 20 ficam no banco (todos com prefixo `[QA]` ou nos setores QA).

## Cenários

| #   | Cenário                                                                                                              | Papel                             | Status        |
| --- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------- | ------------- |
| 1   | Botão bloqueado sem tag ativa; explicação por clique e por foco (Tab)                                                | QA Membro Suporte                 | PASSOU        |
| 2   | Criar `[QA] Acesso` (Suporte) e `[QA] Rede` (Infra)                                                                  | QA Admin Suporte / QA Admin Infra | PASSOU        |
| 3   | Opções do dialog: destino padrão, Diretoria primeiro, sem Não alocado/inativos, só tag do setor                      | QA Membro Suporte                 | PASSOU        |
| 4   | Validação nos campos, sem request de action                                                                          | QA Membro Suporte                 | PASSOU        |
| 5   | Criar chamado no próprio setor (#65), banco conforme critério 1, card +1                                             | QA Membro Suporte                 | PASSOU        |
| 6   | Criar chamado para outro setor (#66), aviso, banco conforme critério 2, card +1                                      | QA Membro Suporte                 | PASSOU        |
| 7   | Payload forjado: tag de outro setor → `INVALID_TAG`, nada gravado                                                    | QA Membro Suporte                 | PASSOU        |
| 8   | Payload forjado: destino Não alocado (16) e setor inativo (20) → `INVALID_DESTINATION`                               | QA Membro Suporte                 | PASSOU        |
| 9   | Tag desativada com o dialog aberto → `FORBIDDEN`, dialog fecha, barra volta bloqueada                                | QA Admin Suporte + Membro         | PASSOU        |
| 10  | Membro movido para Não alocado → botão bloqueado com `DEPARTMENT_UNASSIGNED`; revertido                              | Diretor + Membro                  | PASSOU        |
| 11  | Banco, só leitura: índice único em `ticket_tag(ticket_id)`, `mudanca_tag` no enum, colunas `from_tag_id`/`to_tag_id` | banco                             | PASSOU        |
| 11b | Banco: `INSERT` de segunda tag no mesmo chamado                                                                      | banco                             | NÃO EXECUTADO |
| 12  | `error.tsx` com barra e botão bloqueado                                                                              | qualquer                          | NÃO EXECUTADO |
| 13  | Responsivo 390×844: dashboard e dialog sem rolagem horizontal, botão de envio alcançável                             | QA Membro Suporte                 | PASSOU        |
| 14  | Borda: título 201 e descrição 5001, só espaços, dupla submissão, descarte do rascunho                                | QA Membro Suporte                 | PASSOU        |
| 15  | Action chamada direto por membro no Não alocado → `FORBIDDEN` (critério 6)                                           | QA Membro Suporte                 | PASSOU        |
| 16  | Action chamada direto sem sessão                                                                                     | anônimo                           | PASSOU        |

Evidência resumida dos que passaram:

- **1.** Botão com `aria-disabled="true"`, mensagem `DEPARTMENT_WITHOUT_TAGS` no popover ao clicar (forçado, pois o Playwright trata `aria-disabled` como não habilitado) e ao chegar por Tab. Primeiro Enter fecha, segundo reabre (comportamento aceito pelo contrato). `aria-describedby` aponta para o `span` com a mensagem.
- **3.** Destino padrão QA Suporte; lista: Diretoria, Administrativo, Implantação, P&D, QA Infra, QA Suporte, Suporte; sem Não alocado e sem `[QA] Setor inativo`. Tag: só `[QA] Acesso`.
- **4.** Vazio: `Informe o título.`, `Descreva o chamado.`, `Selecione o tipo do chamado.`, `Selecione a tag.`. Com `ab` e `curta`: `O título precisa ter no mínimo 3 caracteres.` e `A descrição precisa ter no mínimo 10 caracteres.`. Nenhum POST.
- **5.** Toast `Chamado #65 criado.`, dialog fechado, card 0 → 1. `ticket`: `aberto`, `media`, `origin = current = 18`, `created_by = 14`, sem assignee, due ou first_response. `ticket_tag` (65, 10). `ticket_history` 77: `criacao`, `to_status = aberto`, `to_priority = media`, `to_department_id = 18`, `changed_at` igual a `ticket.created_at`. Zero `ticket_transfer`.
- **6.** Aviso `O chamado vai aguardar a aprovação do administrador de QA Infra. Depois de enviado, você não poderá mais alterá-lo.` antes do envio. Toast `Chamado #66 enviado para aprovação de QA Infra.`, card 1 → 2. `ticket`: `aguardando_aprovacao`, `origin = current = 18`. `ticket_tag` (66, 10) (tag do setor do autor). Histórico 78 `criacao` (`to_status = aguardando_aprovacao`) e 79 `transferencia_solicitada` (18 → 19). `ticket_transfer` 5 `pendente`, `requested_by = 14`. Status do ticket bate com o último `to_status` do histórico, nos dois chamados.
- **7.** Payload alterado na rede (`tagId` 10 → 11): mensagem `Esta tag não está disponível. Escolha uma tag ativa do seu setor.` abaixo do campo Tag. Nenhum ticket novo (máximo continua 66; zero linhas com `ticket_id > 66` em `ticket_tag`, `ticket_history`, `ticket_transfer`).
- **8.** `departmentId` 18 → 16 e 18 → 20: `Este setor não pode receber chamados. Escolha outro setor de destino.` no campo de destino nos dois casos. Nada gravado.
- **9.** Tag desativada em outro navegador com o dialog do membro aberto. Ao enviar: toast com a mensagem `DEPARTMENT_WITHOUT_TAGS`, dialog fechado, botão voltou `aria-disabled="true"` com a explicação. Nenhum chamado criado (nenhum `[QA] Tag forjada`).
- **10.** Cabeçalho `Não alocado · Membro`, botão bloqueado com `Sua conta ainda não está em um setor. Peça a um administrador que coloque você em um setor para abrir chamados.`. Revertido para QA Suporte e `[QA] Acesso` reativada (estado final: membro em QA Suporte, tag ativa).
- **11.** `indexdef`: `CREATE UNIQUE INDEX ticket_tag_single_per_ticket_idx ON public.ticket_tag USING btree (ticket_id)`. Nenhum chamado com mais de uma tag. `enum_range` contém `mudanca_tag`. Colunas existem e são nullable.
- **13.** `scrollWidth = clientWidth = 390` no dashboard e com o dialog aberto (com aviso de aprovação visível); botão "Abrir chamado" em y 728–760, dentro dos 844 px.
- **14.** Título de 201 e descrição de 5001 caracteres são aceitos na digitação e recusados com `O título precisa ter no máximo 200 caracteres.` e `A descrição precisa ter no máximo 5000 caracteres.`. Só espaços: `Informe o título.` e `Descreva o chamado.`. Duplo clique no envio: 1 POST e 1 chamado. Fechar com Escape e reabrir: campos vazios e sem erros.
- **15.** POST direto da action (`createTicket`) com a sessão do membro no Não alocado: `{"ok":false,"code":"FORBIDDEN", ...}` com a mensagem `DEPARTMENT_UNASSIGNED`.
- **16.** POST direto sem cookie: 307 para `/login` (barrado pelo proxy).

Screenshots em `.qa-output/` (`c1-blocked-focus.png`, `c3-dialog.png`, `c4-validation.png`, `c5-after.png`, `c6-notice.png`, `c7-invalid-tag.png`, `c8-dest-16.png`, `c8-dest-20.png`, `c9-forbidden.png`, `c10-unassigned.png`, `resp-dashboard.png`, `resp-dialog.png`).

`get_errors` do `next-devtools` devolveu `configErrors: []` e `sessionErrors: []` ao final da bateria e depois dos cenários 1, 7 e 8. O console do navegador ficou sem erros nem avisos.

## Falhas

Nenhuma.

## Erros fora dos cenários

- O log do dev server (`.next/dev/logs/next-development.log`) tem um erro anterior a esta bateria: `[createTicket] Error: Failed query: insert into "ticket_history" ...` com params `63,6,criacao,aguardando_aprovacao,media,11,2026-10-01T02:59:50.117Z`. É a tentativa do Diretor (id 6) de criar chamado para a Diretoria (destino 11) com o chamado de id 63, antes das 03:01 UTC em que esta bateria começou. A consulta já cita `from_tag_id`/`to_tag_id`, e o corpo do erro não vem no log. A causa não foi investigada: pode ter sido a migration ainda não aplicada na hora, mas é uma hipótese. Se a falha reaparecer com a `0007` aplicada, vale acionar o `df-debug`. Nesta bateria, nenhuma criação falhou.
- O mesmo log guarda erros antigos de build (`pg` empacotado para o cliente, `app/_lib/auth/session.ts` importado por Client Component). Não reapareceram durante a bateria e `get_errors` está limpo.

## Não executados

- **11b** (`INSERT` de segunda tag no mesmo chamado, esperando violação de `ticket_tag_single_per_ticket_idx`): o procedimento do `df-qa` proíbe escrita manual no banco. A garantia foi verificada só pela definição do índice (único em `ticket_id`) e pela ausência de chamado com duas tags. Se o usuário quiser a prova pelo erro, rode o `INSERT` você mesmo.
- **12** (`error.tsx` com barra e botão bloqueado): opcional pelo contrato e não há como provocar falha na página do Início sem mexer no ambiente (banco ou código).

## Observações

- A explicação do botão bloqueado abre com clique, toque (forçado) e navegação por Tab. O foco programático (`element.focus()` depois de um clique do mouse) não abriu o popover; o comportamento é compatível com a regra de foco visível por teclado, então não registrei como falha. O contrato diz "no foco por teclado", o que foi atendido.
- O cenário 8 do contrato pede "id de um setor inativo", mas o banco não tinha nenhum. Criei `[QA] Setor inativo` (id 20) pelo cadastro de setores como Diretor e o desativei. Sugestão para o `df-architect`: incluir um setor QA inativo em `docs/contracts/qa-seed.md` e no seed.
- O cenário 11 do contrato usa `INSERT` manual, o que conflita com a regra de escrita do `df-qa`. Sugestão: reescrever como verificação por leitura (definição do índice) ou transferir o `INSERT` para o usuário.
- A contagem de `ticket` mudou entre os relatórios (29 linhas, máximo 33, em 30/09; 30 linhas, máximo 64, no início desta bateria): há atividade de outros usuários no banco compartilhado. Como a bateria só criou os chamados 65 e 66, as verificações de "nada gravado" usaram `ticket_id > 66` e os máximos de id de histórico (79) e transferência (5).
- Cenários de `ticket_transfer` pendente (chamado 66, setor QA Infra) ficam aguardando a feature de Aprovações (risco 2 do contrato).
- `RESEND_API_KEY` preenchida: quando as Aprovações disparem e-mail, esses cenários ficarão como NÃO EXECUTADO ou exigirão a chave vazia.

## Reteste 1

- **Motivo:** troca de `Select` por `Combobox` com busca nos campos Setor de destino e Tag do seu setor (`app/_components/combobox.tsx`, `command.tsx`, `input-group.tsx`, dialog de chamado, formulários de pessoa e tag). Contrato atualizado com o cenário 13 e o cenário 11 reescrito como só leitura.
- **Commit:** `f9f2d99` · alterações não comitadas: sim
- **Resultado:** 6 de 6 passaram · 0 falharam · 0 bloqueados · 0 não executados
- **Pré-requisitos:** dev server 200 em `/login`; MCP `playwright` e `next-devtools` disponíveis; usuários QA (ids 6, 13, 14, 15) ativos. `RESEND_API_KEY` preenchida, sem efeito: nenhum cenário desta rodada dispara e-mail (não cadastrei nenhuma pessoa).

### Cenários

| #   | Cenário                                                                                   | Papel             | Status |
| --- | ----------------------------------------------------------------------------------------- | ----------------- | ------ |
| 5   | Criar chamado no próprio setor com os novos comboboxes (#67)                              | QA Membro Suporte | PASSOU |
| 6   | Criar chamado para outro setor, destino escolhido pela busca (#68)                        | QA Membro Suporte | PASSOU |
| 11  | Banco, só leitura: índice único, `mudanca_tag`, colunas `from_tag_id`/`to_tag_id`         | banco             | PASSOU |
| 13  | Combobox de setor e tag (13a a 13i)                                                       | QA Membro Suporte | PASSOU |
| R1  | `/registry/tags` como Diretor: combobox de setor abre, busca ignora acento, seleção grava | Diretor           | PASSOU |
| R2  | `/registry/people` como Diretor: combobox de setor ao criar e ao editar pessoa            | Diretor           | PASSOU |

Subcenários do 13, todos PASSOU:

| #   | Resultado observado                                                                                                                                                                                                                                                                                                                                |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 13a | Foco no `input` `Buscar setor…`; QA Suporte com `data-selected=true` e ícone de marcado com opacidade 1; os demais com opacidade 0. Ordem: Diretoria, Administrativo, Implantação, P&D, QA Infra, QA Suporte, Suporte                                                                                                                              |
| 13b | `infra`, `INFRA` e `infrá` → só `QA Infra`                                                                                                                                                                                                                                                                                                         |
| 13c | `xyz` → nenhum item e `Nenhum resultado.`                                                                                                                                                                                                                                                                                                          |
| 13d | `configuracao` e `CONFIGURAÇÃO` → só `[QA] Configuração`                                                                                                                                                                                                                                                                                           |
| 13e | `Tab` do gatilho do setor cai no gatilho da tag; `Enter` abre com foco em `Buscar tag…`; 11 `ArrowDown` percorrem Configuração … Lista 09 e voltam a `[QA] Acesso` depois do último; `ArrowUp` volta a Lista 09; `Enter` escolhe, fecha a lista (`aria-expanded=false`), o dialog segue aberto e o foco volta ao gatilho, que mostra `[QA] Acesso` |
| 13f | `Esc` com a lista aberta: lista fecha, 1 dialog aberto, valor continuou `Selecione a tag`, foco no gatilho                                                                                                                                                                                                                                         |
| 13g | Lista com `scrollHeight` 360 e `clientHeight` 288: a roda do mouse levou `scrollTop` de 0 a 72 (fim) e a última tag, `[QA] Lista 09`, ficou visível. Repetido com viewport 1000×520, em que o dialog tem rolagem própria (`scrollTop` 150): o dialog continuou em 150 e aberto. Viewport restaurado para 1280×800                                  |
| 13h | Payload da action alterado na rede (`"tagId":10` → `11`): `Esta tag não está disponível. Escolha uma tag ativa do seu setor.` abaixo do campo; elemento ativo é o `BUTTON[role=combobox]` da tag, com `aria-invalid="true"` e `aria-describedby` apontando para o parágrafo do erro                                                                |
| 13i | `"departmentId":18` → `16` (Não alocado): `Este setor não pode receber chamados. Escolha outro setor de destino.`; elemento ativo é o `BUTTON[role=combobox]` do setor, com `aria-invalid="true"`                                                                                                                                                  |

Evidência resumida:

- **5.** Card do Início 2 → 3. Toast `Chamado #67 criado.`, dialog fechado. `ticket` 67 `[QA] Próprio setor 2`: `aberto`, `media`, `origin = current = 18`, `created_by = 14`, sem assignee, due ou first_response. `ticket_tag` (67, 10). `ticket_history` 80: `criacao`, `to_status = aberto`, `to_priority = media`, `to_department_id = 18`, `changed_at` igual a `ticket.created_at`. Zero `ticket_transfer`. Status do ticket bate com o último `to_status` do histórico.
- **6.** Destino escolhido digitando `infra` e clicando em `QA Infra`; tag `[QA] Acesso`. Aviso `O chamado vai aguardar a aprovação do administrador de QA Infra. Depois de enviado, você não poderá mais alterá-lo.` antes do envio. Toast `Chamado #68 enviado para aprovação de QA Infra.`, card 3 → 4. `ticket` 68: `aguardando_aprovacao`, `origin = current = 18`. `ticket_tag` (68, 10). Histórico 81 `criacao` (`to_status = aguardando_aprovacao`) e 82 `transferencia_solicitada` (18 → 19). `ticket_transfer` 6: `pendente`, 18 → 19, `requested_by = 14`. Status do ticket bate com a linha `criacao`.
- **11.** `indexdef`: `CREATE UNIQUE INDEX ticket_tag_single_per_ticket_idx ON public.ticket_tag USING btree (ticket_id)`. Nenhum `ticket_id` com mais de uma linha em `ticket_tag`. `enum_range(null::history_event)` termina em `mudanca_tag`. `from_tag_id` e `to_tag_id` são `integer` e nullable.
- **13h e 13i, nada gravado:** depois dos dois envios forjados, `max(ticket.id) = 68`, `max(ticket_history.id) = 82`, `max(ticket_transfer.id) = 6` (os mesmos valores de antes dos envios) e nenhum chamado com título `[QA] Tag forjada 13h`.
- **R1.** Como Diretor, o dialog "Nova tag" tem o campo Setor como combobox com `Buscar setor…` e as mesmas 7 opções do dialog de chamado. `implantacao` e `IMPLANTAÇÃO` → só `Implantação`; `infrá` → só `QA Infra`. Com `QA Infra` selecionado e nome `[QA] Combobox Infra`, o dialog fechou e a tag 22 foi gravada com `department_id = 19`, ativa.
- **R2.** "Nova pessoa": combobox de Setor com `Buscar setor…` e as mesmas 7 opções (Não alocado não aparece); `implantacao` e `IMPLANTAÇÃO` → `Implantação`; `xyz` → `Nenhum resultado.`; a seleção mostrou `Implantação`. Cancelei sem cadastrar, para não disparar e-mail nem criar pessoa. "Editar QA Admin Infra": o gatilho abriu com `QA Infra` marcado; `suporte` filtrou para `QA Suporte` e `Suporte`; salvar com `QA Suporte` gravou `users.department_id = 18` (consulta), e voltei para `QA Infra` com a busca `infrá` (consulta: `department_id = 19`).
- `get_errors` do `next-devtools` devolveu `configErrors: []` e `sessionErrors: []` depois dos cenários 6, 13 e ao final. Console do navegador: 0 erros e 0 avisos.

Screenshots em `.qa-output/`: `r13a.png`, `r13c.png`, `r13g.png`, `r13g-short.png`, `r13h.png`, `r13i.png`, `r-people-create.png`.

### Falhas

Nenhuma.

### Dados gravados no reteste

Tudo pela interface, sem `INSERT`, `UPDATE` ou `DELETE` manual.

| Tabela            | Registro                                                                                                                                                  | Criado por        |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| `tag`             | ids 12 a 21: `[QA] Configuração`, `[QA] Lista 01` a `[QA] Lista 09`, todas em QA Suporte (18)                                                             | QA Admin Suporte  |
| `tag`             | id 22 `[QA] Combobox Infra` (QA Infra, 19)                                                                                                                | Diretor           |
| `tag`             | ids 12 a 22 desativadas ao fim (pelo Diretor); `[QA] Acesso` (10) e `[QA] Rede` (11) seguem ativas, então o cenário 9 continua válido na próxima execução | Diretor           |
| `ticket`          | id 67 `[QA] Próprio setor 2` (aberto), id 68 `[QA] Outro setor 2` (aguardando_aprovacao)                                                                  | QA Membro Suporte |
| `ticket_tag`      | (67, 10) e (68, 10)                                                                                                                                       | via criação       |
| `ticket_history`  | id 80 (`criacao`, ticket 67); ids 81 (`criacao`) e 82 (`transferencia_solicitada`), ticket 68                                                             | via criação       |
| `ticket_transfer` | id 6 (ticket 68, 18 → 19, `pendente`, `requested_by` 14)                                                                                                  | via criação       |
| `users`           | id 15 (QA Admin Infra) movido de QA Infra para QA Suporte e de volta; estado final igual ao inicial                                                       | Diretor           |

Os envios forjados do 13h e do 13i não gravaram nada. Não removíveis pelo teste: chamados 67 e 68 e as tags 12 a 22 ficam no banco, todos com prefixo `[QA]` e em setores QA. O chamado 68 fica `aguardando_aprovacao` até a feature de Aprovações.

### Observações

- **Toast do cenário 5:** `Chamado #67 criado.` foi lido do snapshot salvo no clique (`.qa-output/page-2026-10-01T04-26-42-197Z.yml`), porque a leitura direta chegou depois de o toast sumir.
- **Item destacado sem valor:** com a tag ainda não escolhida, a árvore de acessibilidade mostra `[QA] Acesso` como `selected`. É o destaque do primeiro item do `cmdk` (`aria-selected` segue o destaque, não o valor); o ícone de marcado aparece só no valor escolhido (conferido no setor), e o gatilho continuava com `Selecione a tag`. Não diverge do contrato, mas leitor de tela pode anunciar o primeiro item como selecionado. Para o `df-architect` avaliar.
- **Digitação nos testes de busca:** usei `fill` no campo de busca, não tecla a tecla. O filtro reage ao evento `input`, então o resultado é equivalente; `keyboard.type` só foi usado no cenário 6 (`infra`).
- **Não alocado em "Nova pessoa":** a lista de setores não o inclui. Não conferi contra `docs/contracts/registry-people.md` nesta rodada; fica para o `df-architect` confirmar que é intencional.
- O erro de 01/10 03:00 UTC (`insert into "ticket_history"` do chamado 63) da seção "Erros fora dos cenários" não reapareceu: seis criações nas duas baterias, todas com sucesso.
