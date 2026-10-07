# Relatório de testes — Fila como destinatário padrão, status pela atribuição e edição de comentário

- **Data:** 2026-10-06
- **Contrato:** `docs/contracts/queue-default-and-comment-edit.md` (etapas 1 a 6; referências: `department-queue.md`, `ticket-assignee.md`, `ticket-creation.md`, `ticket-resolution.md`, `qa-seed.md`)
- **Commit:** `5af9849` · alterações não comitadas: sim (etapa 6: `ticket-comments`, `ticket-messages`, `ticket-comment-editor.tsx`, `ticket-comment-item.tsx` e o contrato)
- **Ambiente:** `http://localhost:3000`, `next dev`, banco de desenvolvimento
- **Resultado:** 67 de 68 passaram · 0 falharam · 0 bloqueados · 1 não executado

## Pré-requisitos

- Dev server: `/login` devolveu 200.
- MCP: `next-devtools` achou o servidor na porta 3000; `playwright` abriu o Chrome visível; `postgres` respondeu (role `df_readonly`).
- Usuários no banco (leitura): Diretor (`Henrique Coruqieri`, admin, Diretoria, ativo), QA Admin Suporte (13, admin, QA Suporte, ativo), QA Membro Suporte (14, membro, QA Suporte, ativo), QA Admin Infra (15, QA Infra, **inativo**, não reativado).
- `RESEND_API_KEY` vazia no `.env`; esta entrega não envia e-mail.
- Ids anotados: `S` = 18 (QA Suporte), `M` = 14, `A` = 13, `D` = 6.
- Chamados criados pela bateria (todos `[QA]`, setor QA Suporte): #109 (N1) #110 (N2) #111 (N3) · #112 (T1) #113 (T2) #114 (T3) · #115 (S1) #116 (S2) #117 (S3) · #118 (L1) #119 (L2) #120 (L3) · #121 (K) · #122 (janela aberta nova, ver Observações). Mensagens: `m1` = 22, `m2` = 23, `a1` = 24.

## Cenários

| #     | Cenário                                                                  | Papel       | Status        |
| ----- | ------------------------------------------------------------------------ | ----------- | ------------- |
| E1.1  | `/queue` 1440×900: 7 colunas, sem Criador e Destinatário                 | M           | PASSOU        |
| E1.2  | `/queue` 390×844: mesmas 7 colunas                                       | M           | PASSOU        |
| E1.3  | Filtro Destinatário: pessoas em ordem de nome + `Sem destinatário`       | M           | PASSOU        |
| E1.4  | `Sem destinatário` e `QA Admin Suporte` batem com a consulta             | M           | PASSOU        |
| E1.5  | Nenhum resultado: `colspan` = 7                                          | M           | PASSOU        |
| E1.6  | Clique na linha e no `#` abre o detalhe; sem botão "Detalhes"            | M           | PASSOU        |
| E1.7  | "Enviar": dialog abre, clique interno não navega                         | A           | PASSOU        |
| E1.8  | Meus chamados com as mesmas colunas                                      | M           | PASSOU        |
| E2.1  | Novo chamado: `Fila de QA Suporte` primeiro, selecionada, busca `fila`   | M           | PASSOU        |
| E2.2  | Criar #109 com o padrão: `assigneeId: null`, toast                       | M           | PASSOU        |
| E2.3  | Banco: #109 nulo/sem `atribuicao`, #110 = M, #111 = A                    | banco       | PASSOU        |
| E2.4  | Reabrir após criar e após cancelar: fila selecionada                     | M           | PASSOU        |
| E2.5  | Destinatário `Fila de QA Suporte` em #109, #65 e #84                     | M           | PASSOU        |
| E2.6  | `assigneeId` ausente, `"fila"`, `0`, `1e12`: `Selecione o destinatário.` | M           | PASSOU        |
| E2.7  | `assigneeId` = Diretoria: mensagem de indisponível, nada gravado         | M           | PASSOU        |
| E2.8  | Editar #110: M selecionado, fila primeira opção, sem dica                | M           | PASSOU        |
| E2.9  | Trocar destinatário para a fila e salvar                                 | M           | PASSOU        |
| E2.10 | Banco: `edicao` + `atribuicao` (M → nulo, `to_department_id` = 18)       | banco       | PASSOU        |
| E2.11 | Editar #109 só o título: fila pré-selecionada, sem `atribuicao`          | M           | PASSOU        |
| E2.12 | Editar chamado resolvido sem destinatário → Cancelar (usou #122)         | M           | PASSOU        |
| E2.13 | Edição forjada com Diretoria recusada; `null` com título salvo           | M           | PASSOU        |
| E2.14 | `/queue` filtro `Sem destinatário` lista #109 e #110                     | M           | PASSOU        |
| E2.15 | "Enviar" em #109: dica da fila, opções só pessoas                        | A           | PASSOU        |
| E2.16 | Conflito: Diretor envia #111 já devolvido à fila                         | Diretor e M | PASSOU        |
| E3.1  | Botões de #112, #113, #114 para A                                        | A           | PASSOU        |
| E3.2  | Botões de #112, #113, #114 para M                                        | M           | PASSOU        |
| E3.3  | `assumeTicket` forjado em #113: `FORBIDDEN`, nada gravado                | A           | PASSOU        |
| E3.4  | "Assumir" #112: toast e `atribuicao` nulo → A                            | A           | PASSOU        |
| E3.5  | Diretoria: sem "Assumir" em chamado com destinatário                     | Diretor     | PASSOU        |
| E3.6  | M devolve #113 à fila; A passa a ter "Assumir"                           | M e A       | PASSOU        |
| E4.1  | Banco: status inicial de #115, #116, #117 e uma linha cada               | banco       | PASSOU        |
| E4.2  | Badges e Abertos por mim                                                 | M           | PASSOU        |
| E4.3  | "Assumir" #115: `atribuicao` + `mudanca_status`, mesmo `changed_at`      | A           | PASSOU        |
| E4.4  | "Enviar" #115 para M: `encaminhado`                                      | A           | PASSOU        |
| E4.5  | Editar #115 para a fila: continua `encaminhado`, sem `mudanca_status`    | M           | PASSOU        |
| E4.6  | "Enviar" #115 (na fila) para A: `em_andamento`                           | A           | PASSOU        |
| E4.7  | Editar #117 (A, `encaminhado`) para M: `em_andamento`                    | M           | PASSOU        |
| E4.8  | Editar #116 para A + título: `encaminhado`, ordem das linhas             | M           | PASSOU        |
| E4.9  | Editar #116 tag + destinatário M: ordem de 4 linhas                      | M           | PASSOU        |
| E4.10 | Chamado `resolvido`: reatribuir e devolver sem `mudanca_status` (#122)   | M           | PASSOU        |
| E4.11 | "Enviar" #116 (M) para A: continua `em_andamento`, só `atribuicao`       | A           | PASSOU        |
| E4.12 | #65–#68 inalterados                                                      | banco       | PASSOU        |
| E5.1  | Frases de Abertura em #118, #119, #120                                   | M           | PASSOU        |
| E5.2  | Assumir #118: Atribuição + Mudança de status                             | A           | PASSOU        |
| E5.3  | Enviar #118 para M: frase com setor + mudança de status                  | A           | PASSOU        |
| E5.4  | Editar #118 para a fila: `devolveu o chamado à fila de QA Suporte.`      | M           | PASSOU        |
| E5.5  | Editar #120 para M: `assumiu o chamado.` + status                        | M           | PASSOU        |
| E5.6  | Diretor envia #118 para A: `do setor Diretoria encaminhou...`            | Diretor     | PASSOU        |
| E5.7  | Chamado antigo (#97): frase montada na leitura                           | M           | PASSOU        |
| E5.8  | Abertura/Atribuição só com data/hora; demais com `{nome} · {data}`       | M           | PASSOU        |
| E5.9  | A movido a QA Infra: frases mostram QA Infra; restaurado, QA Suporte     | Diretor e M | PASSOU        |
| E5.10 | #65 e #74: demais frases iguais                                          | M           | PASSOU        |
| E6.1  | "Editar" só em `m1` e `m2`; sem "(editado)"                              | M           | PASSOU        |
| E6.2  | Edição: texto atual e foco; validações; sem request                      | M           | PASSOU        |
| E6.3  | Salvar com espaços nas pontas: texto aparado e `(editado)`               | M           | PASSOU        |
| E6.4  | Banco: só `content` e `updated_at` mudam; sem linha nova                 | banco       | PASSOU        |
| E6.5  | Salvar sem mudar: `Nenhuma alteração para salvar.`                       | M           | PASSOU        |
| E6.6  | Cancelar descarta; sem request                                           | M           | PASSOU        |
| E6.7  | Editar privado: continua `Privado` e ganha `(editado)`                   | M           | PASSOU        |
| E6.8  | A vê `(editado)` e "Editar" só em `a1`                                   | A           | PASSOU        |
| E6.9  | `messageId` = `a1` forjado: `Você não pode editar este comentário.`      | M           | PASSOU        |
| E6.10 | `999999` e `m1` com `ticketId` de #109: `Comentário não encontrado.`     | M           | PASSOU        |
| E6.11 | `isPrivate: false` forjado é ignorado                                    | M           | PASSOU        |
| E6.12 | `"abc"`, `0`, `1e12`: `Comentário inválido.`                             | M           | PASSOU        |
| E6.13 | Admin Infra forja edição em #121                                         | Admin Infra | NÃO EXECUTADO |
| E6.14 | Comentário em chamado com janela vencida (#84, feito como A)             | A           | PASSOU        |
| E6.15 | 390×844: formulário de edição cabe, botões alcançáveis                   | M           | PASSOU        |
| E6.16 | Linha do tempo do #121 igual antes e depois das edições                  | M           | PASSOU        |

## Falhas

Nenhuma.

## Evidência dos cenários com banco

Consultas via MCP `postgres` (`df_readonly`); só ids de chamado, usuários QA e linhas de histórico.

- **E2.3 / E4.1** — `select id,status,assigned_to,(histórico) from ticket where id between 109 and 121`: #109 `aberto`/nulo/`criacao:aberto:null`; #110 `em_andamento`/14; #111 `encaminhado`/13; #112 `aberto`/nulo; #113 `em_andamento`/14; #114 `encaminhado`/13; #115 `aberto`/nulo; #116 `em_andamento`/14; #117 `encaminhado`/13; #118 `aberto`/nulo; #119 `em_andamento`/14; #120 `encaminhado`/13; #121 `aberto`/nulo. Uma linha `criacao` em cada, `to_status` igual ao status, nenhuma `atribuicao` nem `mudanca_status`.
- **E1.4** — `select id from ticket where current_department_id=18 and status in (...) and assigned_to is null` devolveu `92,91,90,88,87,86,85,78,77,71,70,69,68,67,66,65`, igual à tabela; com `assigned_to = 13`, só `103`, igual à tabela.
- **E2.10 (#110, mesmo `changed_at` 02:13:33.897)**: 185 `edicao` (`Alterou destinatário.`), 186 `atribuicao` (14 → nulo, `to_department_id` 18, `changed_by` 14), 187 `mudanca_status` (`em_andamento` → `encaminhado`). `ticket`: `encaminhado`, `assigned_to` nulo.
- **E2.11 (#109)**: 172 `criacao`, 188 `edicao` (`Alterou título.`); nenhuma `atribuicao`.
- **E3.4 / E4.3** — #112 (196 `atribuicao` nulo → 13, 197 `mudanca_status` `aberto` → `em_andamento`), #115 (198 e 199), #118 (200 e 201): cada par com o mesmo `changed_at` e `changed_by` 13; `ticket` `em_andamento`/13 nos três.
- **E4.4 (#115)**: 202 `atribuicao` (13 → 14), 203 `mudanca_status` (`em_andamento` → `encaminhado`); `ticket` `encaminhado`/14.
- **E4.5 / E5.4 / E3.6** — #115 (206 `edicao`, 207 `atribuicao` 14 → nulo, `to_department_id` 18), #118 (208, 209), #113 (216 `edicao`, 217 `atribuicao` 14 → nulo, 218 `mudanca_status` `em_andamento` → `encaminhado`). #115 e #118 já estavam `encaminhado`: sem `mudanca_status`. #113 estava `em_andamento`: com linha.
- **E4.7 / E5.5** — #117 (210 `edicao`, 211 `atribuicao` 13 → 14, 212 `mudanca_status` `encaminhado` → `em_andamento`), #120 (213, 214, 215): mesmo `changed_at` por chamado; `ticket` `em_andamento`/14.
- **E4.8 / E4.9 (#116)**: 219 `edicao` (`Alterou título e destinatário.`), 220 `atribuicao` (14 → 13), 221 `mudanca_status` (`em_andamento` → `encaminhado`); depois 222 `edicao` (`Alterou tag e destinatário.`), 223 `mudanca_tag`, 224 `atribuicao` (13 → 14), 225 `mudanca_status` (`encaminhado` → `em_andamento`). `ticket`: `em_andamento`/14.
- **E4.6 / E4.11** — #115: 226 `atribuicao` (nulo → 13), 227 `mudanca_status` (`encaminhado` → `em_andamento`); #116: 228 `atribuicao` (14 → 13), nenhuma `mudanca_status`; `ticket` #116 continua `em_andamento`/13.
- **E5.6 (#118)**: 229 `atribuicao` (nulo → 13, `changed_by` 6), sem `mudanca_status` (continuava `encaminhado`).
- **E2.16 (#111)**: 230 `edicao`, 231 `atribuicao` (13 → nulo, `to_department_id` 18, `changed_by` 14). Depois da tentativa do Diretor, `max(id)` de `ticket_history` continuou 231; `ticket` `encaminhado`/nulo.
- **E4.10 (#122, `resolvido`)**: 191 `edicao` + 192 `atribuicao` (nulo → 14), 193 `edicao` + 194 `atribuicao` (14 → nulo, `to_department_id` 18); nenhuma `mudanca_status`; `ticket` continua `resolvido`/nulo.
- **E4.12**: `select status, count(*) from ticket where id in (65,66,67,68) group by status` antes e depois: `aberto` 2, `aguardando_aprovacao` 2.
- **E6.4 (`m1` = 22)**: `content` `[QA] Público do membro editado`, `visibility` `publica`, `created_at` 02:15:54.768777, `updated_at` 02:19:37.279 (maior). `max(id)` de `message` 24 e de `ticket_history` 225 antes e depois da edição; `ticket.updated_at` do #121 inalterado (02:12:35.31367).
- **E6.5**: `updated_at` de `m1` igual ao do E6.4 depois de salvar sem mudança.
- **E6.7 / E6.11 (`m2` = 23)**: `visibility` `interna` antes e depois (inclusive com `isPrivate: false` forjado); `content` `[QA] Privado do membro editado de novo`.
- **E6.9, E6.10, E6.12, E6.14**: após cada rodada, `message` 17, 22, 23, 24 sem alteração além das esperadas; `max(id)` de `message` 24 e de `ticket_history` 225.
- **E2.6 / E2.7 / E2.13 (forjados)**: `max(id)` antes e depois iguais (ticket 122, histórico 194, message 21).
- **Usuários ao final**: 13 `department_id` 18 ativo; 14 `department_id` 18 ativo; 15 `department_id` 19 inativo (como estava).

## Erros fora dos cenários

Nenhum durante a bateria: `get_errors` do `next-devtools` devolveu `configErrors` e `sessionErrors` vazios depois dos blocos de cenários e no fim; o log do dev server (`next-development.log`) não tem `ERROR` nem `WARN` na janela do teste (a partir do primeiro acesso, 03:59 no relógio do log). Os erros que existem no arquivo (`INITIAL_TICKET_STATUS doesn't exist`, `assignees is not iterable`, um aviso de hidratação) são de 02:47 a 03:15 do relógio do log, anteriores à bateria, de quando as etapas anteriores estavam em edição.

No console do navegador: um 404 em `/registry/users`, que eu abri de propósito ao procurar a tela de pessoas para o E5.9 (a rota certa é `/registry/people`). Não é erro da aplicação.

## Não executados

- **E6.13** (QA Admin Infra forja `editTicketComment` em #121): a conta está inativa e as instruções do teste pedem para não reativar. Fica sem cobertura a recusa para quem não vê o chamado. A mesma regra (`not_found` para chamado invisível ou comentário inexistente) apareceu nos E6.10, com `Comentário não encontrado.` para chamado diferente do comentário.

## Observações

1. **Fixture `[QA] Janela aberta` (#84) envelheceu.** Resolvido em 2026-09-29, em 2026-10-07 (UTC) já passou os 7 dias da janela, e a tela não mostra mais "Editar". Por isso E2.12 e E4.10 rodaram num chamado equivalente que a bateria criou e resolveu pela interface (`[QA] Janela aberta nova`, #122, resolvido pelo autor no momento do teste). E2.5 (só leitura) usou o #84 como pede o contrato. `docs/contracts/qa-seed.md` / `db/seed.ts` datam esse chamado em relação ao dia do seed; vale o `df-architect` decidir se o cenário passa a criar o próprio chamado resolvido. O mesmo vale para o #83 (`Janela vencida`), que continua vencido.
2. **E6.14 rodou como A, não como M.** A consulta do contrato (`m.user_id = M` em `fechado`/`cancelado`) volta vazia, e M não tem comentário em chamado com janela vencida. O único comentário em janela vencida é o `id` 17 de A no #84. Sem botão "Editar" nele; o payload forjado (aproveitando o formulário de `a1` no #121, trocando `ticketId` por 84 e `messageId` por 17) devolveu `FORBIDDEN` com `Você não pode editar este comentário.` e nada foi gravado.
3. **E2.6: onde a mensagem aparece.** Para `assigneeId` ausente, `"fila"`, `0` e `1e12` o texto `Selecione o destinatário.` apareceu como toast, sem mensagem no campo; para o id da Diretoria (E2.7) apareceu no campo. O contrato diz só "`Selecione o destinatário.` (`INVALID_INPUT`)", sem exigir campo ou toast. Ambíguo; confirmar com o `df-architect` se `INVALID_INPUT` de destinatário deveria marcar o campo.
4. **Nome acessível dos botões "Editar" de comentário.** Segue o pedido (`Editar comentário de {autor} de {data e hora}`), mas `m1` e `m2` ficaram com nomes idênticos (`Editar comentário de QA Membro Suporte de 06/10/2026 23:15`), porque o horário só vai até o minuto. Quem usa leitor de tela, e qualquer seletor por nome, não diferencia dois comentários do mesmo autor no mesmo minuto. Só observação; o contrato pede esse formato.
5. **Cabeçalhos da tabela da Fila.** O texto do `th` da primeira coluna é `#Número` (o `#` visível mais um `sr-only` "Número"). O contrato (E1.1) descreve `#`; contei como o mesmo cabeçalho. `Ações` vem como `sr-only`, como previsto.
6. **Queda isolada no primeiro lote forjado do E6.9 a E6.12.** O primeiro script esgotou o tempo de espera por um campo de texto de edição (provável clique antes da hidratação logo depois de `goto`); nada foi gravado (conferido no banco). Repeti o lote com uma espera curta e passou; não consegui reproduzir a queda. Registro por transparência, sem tratar como falha da aplicação.
7. **E2.16 usou duas abas.** Para ter o Diretor com a lista desatualizada e o M devolvendo à fila ao mesmo tempo, o M abriu uma segunda aba no mesmo navegador do MCP (cookies trocados e restaurados), que foi fechada. A sessão do Diretor continuou válida depois. A tentativa do Diretor devolveu a mensagem de conflito, fechou o dialog e a lista recarregou; nenhuma linha nova.
8. **E5.9 mexeu em `users`.** O Diretor moveu QA Admin Suporte para QA Infra e de volta para QA Suporte pela tela `/registry/people`. As frases do #118 mostraram `do setor QA Infra` enquanto movido e voltaram a `do setor QA Suporte`. Banco conferido: A ativo em QA Suporte (id 18), como no início.
9. **E6.4: marca de `max(id)`.** O contrato manda anotar `max(id)` de `ticket_history` antes do E6.1; como outras etapas gravaram histórico em seguida, usei a marca imediatamente antes de cada edição de comentário (225). Entre o E6.3 e o E6.14 ela não se mexeu.
10. **E4.8 e a regra do alvo.** Em #116 o autor (M, `em_andamento`) mandou para A e virou `encaminhado`; no E4.9 voltou para si e foi `em_andamento`, como a tabela do contrato.
11. **Chamados `[QA]` criados ficaram no banco** (#109 a #122) para o usuário inspecionar. #109 teve o título editado para `[QA] Fila padrão forjada` no E2.13; #116 para `[QA] Status para mim editado`.
12. Janela do Chrome deixada aberta com o Diretor logado; sem screenshots de falha (não houve falha). Screenshot do E6.15: `.qa-output/e6-15-mobile-edit.png`.
