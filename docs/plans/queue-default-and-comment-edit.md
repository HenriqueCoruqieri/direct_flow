# Plano — Fila como destinatário padrão, status pela atribuição e edição de comentário

Aprovado em 2026-10-06 (via `/consult`). Seis etapas em sequência, cada uma
com o próprio commit e compilando sozinha. Contrato técnico, com uma seção por
etapa, em `docs/contracts/queue-default-and-comment-edit.md`. Pontos de partida:
Fila do setor (`docs/contracts/department-queue.md`), destinatário
(`docs/contracts/ticket-assignee.md`), criação (`docs/contracts/ticket-creation.md`),
edição em tela (`docs/contracts/ticket-edit-window.md`), linha do tempo
(`docs/contracts/my-tickets.md`) e comentários
(`docs/contracts/ticket-resolution.md`). Esses contratos receberam uma revisão
de 2026-10-06 apontando para o novo.

## Decisões fixadas pelo usuário

| #   | Tema                        | Decisão                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Tabela da Fila              | As colunas **Criador** e **Destinatário** saem em qualquer tamanho de tela. A linha continua clicável (sem botão "Detalhes"). O filtro **Destinatário** (com "Sem destinatário") continua, apoiado numa coluna oculta                                                                                                                                                                                                                                                                                            |
| 2   | Fila como destinatário      | Opção **"Fila de {setor}"** no combobox Destinatário do "Novo chamado" (é o **padrão**) e do "Editar". Grava `assigned_to` nulo. Devolver à fila pelo "Editar" grava `atribuicao` (de X para nulo)                                                                                                                                                                                                                                                                                                               |
| 3   | "Assumir"                   | Só chamado **na fila** (`assigned_to` nulo): "já assumido" passa a ser `assignedTo !== null`. "Enviar" (admin do setor e Diretor) continua redistribuindo qualquer chamado. Chamados antigos com destinatário = autor **não** são migrados e passam a contar como assumidos                                                                                                                                                                                                                                      |
| 4   | Status acompanha atribuição | Só para chamados em `aberto`, `em_andamento` ou `encaminhado`. Criado na fila → `aberto`; criado para o próprio autor ou "Assumir" → `em_andamento`; criado para colega, "Enviar", "Editar" trocando para colega ou **devolvido à fila** → `encaminhado`; "Editar" trocando para o próprio autor → `em_andamento`. Linha `mudanca_status` logo depois da `atribuicao` (na criação não há linha extra: a `criacao` já grava o status inicial). `em_analise` e os demais status não mudam. Sem migração de dados   |
| 5   | Frases da linha do tempo    | `{user}` = quem agiu; `{setor}` de quem agiu = setor **atual** da pessoa (join; o histórico continua guardando ids). Criação na fila: `{user} abriu o chamado em {setor}.` ({setor} do chamado). Criação para si: `{user} abriu e assumiu o chamado.` Assumir: `{user} assumiu o chamado.` "Enviar" ou "Editar" para colega: `{user} do setor {setor} encaminhou o chamado para {nome}.` Devolver à fila: `{user} devolveu o chamado à fila de {setor}.` ({setor} do chamado). `mudanca_status`: frase existente |
| 6   | Edição de comentário        | Só quem escreveu; enquanto o chamado aceita comentários (`canCommentOnTicket`); só o texto (a visibilidade não muda); marca "(editado)" quando `updated_at` ≠ `created_at`; o texto anterior não é guardado. Sem `ticket_history`                                                                                                                                                                                                                                                                                |

Frase de criação para colega — **padrão do consultor, não fixado pelo usuário**:
`{user} do setor {setor} abriu o chamado e o encaminhou para {nome}.` Mantida
até o usuário dizer outra coisa.

Nome repetido na linha do tempo: as frases novas já trazem o nome de quem agiu,
que também aparece na linha de cima do item. Decisão do `df-ui`, com
recomendação do arquiteto no contrato (etapa 5).

## Escopo

**Entra**: tabela da Fila sem Criador e Destinatário; "Fila de {setor}" no
"Novo chamado" e no "Editar"; devolução à fila; "Assumir" só na fila; status
movido pela atribuição na criação, no "Assumir", no "Enviar" e no "Editar";
frases novas de abertura e atribuição com o setor de quem agiu; edição em linha
do próprio comentário com "(editado)".

**Fora**: apagar comentário; "iniciar atendimento" para quem recebe um
`encaminhado`; botão "Detalhes" na Fila; migração de dados (chamados antigos
ficam como estão); e-mail; histórico do texto anterior de comentário. **Sem
schema e sem migration.**

## Impacto

- **Schema / migration**: nada. `ticket.assigned_to` já é nulo-ável;
  `ticket_history` já tem `to_department_id`, `from_status`/`to_status` e o
  evento `mudanca_status`; `message.updated_at` já existe.
- **Tipos**: `assigneeId` nulo-ável na criação e na edição; `queueLabel` nas
  opções dos formulários; `TicketAssigneeTarget`; `changedByDepartmentName` no
  histórico; `authorId`/`updatedAt` no comentário e os tipos da edição de
  comentário.
- **Domínio**: rótulo da fila e destinatário exibido; "já assumido" pela fila;
  regra pura de status por atribuição; frases novas; regra de edição de
  comentário.
- **Validação**: `assigneeId` nulo-ável (`createTicketSchema`,
  `editTicketSchema` por derivação); `editTicketCommentSchema`.
- **`df-data`**: `findDepartmentName`; `insertTicket`, `updateTicketByAuthor` e
  `assignTicket` com fila e status; `findTicketDetail` com o setor de quem agiu;
  `listTicketMessages` com autor e `updatedAt`; `updateTicketMessage`.
- **`df-actions`**: `editTicketComment` (novo). `createTicket`, `editTicket`,
  `assumeTicket` e `sendTicket` não mudam além dos tipos.
- **`df-ui`**: tabela da Fila (coluna oculta no `DataTable`); opção da fila no
  campo Destinatário; valor do Destinatário no detalhe; linha do tempo; edição
  em linha do comentário.
- **`df-auth`, `df-email`**: nada.

## Ondas por etapa

Cada etapa é um `/implement` curto: Onda 0 (`df-architect`, código da etapa
contra o contrato já escrito) → ondas de implementação → `df-reviewer`.
O `df-qa` roda **uma vez**, no fim, com os cenários das seis etapas.

| Etapa | Commit                                                 | Onda 0 (`df-architect`)                                               | Onda 1                                                                   | Onda 2                                       |
| ----- | ------------------------------------------------------ | --------------------------------------------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------- |
| 1     | `refactor: trim the department queue table`            | nada (só o checklist)                                                 | `df-ui` (`DataTable` e tabela da Fila)                                   | —                                            |
| 2     | `feat: let tickets start in the department queue`      | tipos, domínio e `createTicketSchema` com fila                        | `df-data` ‖ `df-ui` (campo, formulários e detalhe; as actions não mudam) | —                                            |
| 3     | `feat: allow assuming only queued tickets`             | `isTicketTaken`                                                       | —                                                                        | —                                            |
| 4     | `feat: move ticket status along with its assignee`     | `TicketAssigneeTarget` e regra de status; sai `INITIAL_TICKET_STATUS` | `df-data`                                                                | —                                            |
| 5     | `feat: show who forwarded each ticket in the timeline` | `changedByDepartmentName`, frases, `historyEntryNamesActor`           | `df-data` ‖ `df-ui` (linha do tempo)                                     | —                                            |
| 6     | `feat: let authors edit their comments`                | tipos, regra, `editTicketCommentSchema`                               | `df-data` ‖ `df-ui` (lista e "(editado)")                                | `df-actions` → `df-ui` (formulário em linha) |

Depois da etapa 6: `df-qa` com a bateria inteira; cada falha vira um commit
`fix:` próprio; o relatório (`docs/test-reports/`) entra no último commit da
série.

## Riscos

1. **Chamados antigos contam como assumidos.** Sem migração, todo chamado
   criado antes com destinatário = autor deixa de mostrar "Assumir" na Fila;
   só o "Enviar" (admin do setor ou Diretor) o redistribui, ou o autor o
   devolve à fila pelo "Editar".
2. **Fila com `aberto` ou `encaminhado`.** Chamado criado na fila está
   `aberto`; devolvido à fila fica `encaminhado`. O status sozinho não diz se o
   chamado está na fila: quem separa é o filtro Destinatário ("Sem
   destinatário").
3. **`encaminhado` não vira `em_andamento`.** Quem recebe um chamado enviado não
   tem "iniciar atendimento" (fica para depois). O status continua
   `encaminhado` até a resolução ou uma nova atribuição.
4. **Setor atual na frase.** O setor de quem agiu vem do cadastro de hoje:
   pessoa movida de setor muda o texto dos eventos antigos dela (o mesmo vale
   para nomes, regra de `my-tickets.md`).
5. **Nome repetido na linha do tempo.** Abertura e Atribuição passam a trazer o
   nome na frase e na linha de cima. Decisão do `df-ui` (recomendação no
   contrato).
6. **Edição de comentário × fechamento.** A edição trava o chamado (`for
share`); o cron, que pula linhas travadas, fecha o chamado na execução
   seguinte, e uma edição que chega depois de a janela vencer é recusada. O
   texto anterior se perde (sem histórico de conteúdo).
7. **(arquiteto) Frases novas valem para eventos antigos.** As frases são
   montadas na leitura: `atribuicao` antigas ("Trocou o destinatário de A para
   B.") passam a ler "… encaminhou o chamado para B."; `criacao` antigas sem
   destinatário passam a ler "abriu o chamado em {setor}.".
8. **(arquiteto) "Enviar" para si mesmo conta como assumir.** Admin que escolhe
   a si mesmo no "Enviar" leva o chamado a `em_andamento` e a frase diz
   "assumiu", como o "Assumir". A regra olha quem recebe, não o botão.

## Critério de pronto

1. Fila sem Criador e Destinatário em qualquer largura; filtro Destinatário
   funcionando.
2. "Novo chamado" abre com "Fila de {setor}"; chamado na fila tem
   `assigned_to` nulo; "Editar" devolve à fila com `atribuicao` de X para nulo.
3. "Assumir" só aparece e só grava para chamado na fila, inclusive forjado.
4. Status inicial e status depois de cada atribuição conforme a decisão 4, com
   `mudanca_status` logo depois da `atribuicao`; `em_analise`, `resolvido` e os
   finais intactos.
5. Frases da decisão 5 na linha do tempo.
6. Autor edita o próprio comentário enquanto o chamado aceita comentários;
   "(editado)" aparece; nada em `ticket_history`.
7. Em cada etapa: `npx tsc --noEmit`, `npm run lint` e `npm run build` passam;
   `df-reviewer` sem bloqueante. No fim, `df-qa` aprova os cenários do
   contrato.

## Commits sugeridos

1. `refactor: trim the department queue table` — tabela da Fila e coluna oculta
   no `DataTable`; leva este plano, o contrato e as revisões de 2026-10-06 dos
   contratos afetados.
2. `feat: let tickets start in the department queue`
3. `feat: allow assuming only queued tickets`
4. `feat: move ticket status along with its assignee`
5. `feat: show who forwarded each ticket in the timeline`
6. `feat: let authors edit their comments`
7. `fix: …` — um por falha do `df-qa`, se houver; o relatório entra no último
   commit da série.
