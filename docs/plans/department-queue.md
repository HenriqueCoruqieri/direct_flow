# Plano — Fila do setor

Aprovado em 2026-10-06 (via `/consult`). Contrato técnico em
`docs/contracts/department-queue.md`. Pontos de partida: abas, período e tabela
de `docs/contracts/my-tickets.md`; regra de destinatário válido de
`docs/contracts/ticket-assignee.md`; parâmetro `?setor=` de
`docs/contracts/registry-people.md` (Entrega A); quem resolve de
`docs/contracts/ticket-resolution.md`; Diretoria em
`docs/adr/011-board-department-with-global-power.md`.

## Decisões fixadas pelo usuário

| Tema                   | Decisão                                                                                                                                                                                                                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Menu                   | Item **"Fila do setor"** (`/queue`) logo abaixo de "Meus chamados". Não aparece para quem está no **Não alocado**; `/queue` aberto direto por essa pessoa mostra o mesmo aviso do "Novo chamado": `Seu perfil não está associado a nenhum setor, informe sua liderança.`                   |
| Lista                  | Chamados cujo **setor atual** é o setor de quem vê                                                                                                                                                                                                                                         |
| Abas                   | **Em aberto** (status não finais, inclui `resolvido` e `aguardando_aprovacao`), **Fechados**, **Cancelados**, com contagem por aba (padrão de Meus chamados). **Revisto em 2026-10-06**: entra **Resolvidos** entre Em aberto e Fechados; Em aberto deixa de incluir `resolvido`           |
| Período                | Igual ao de Meus chamados (Todos, Hoje, Semana, Mês, Personalizado; datas futuras recusadas), com padrão **"Todos"**                                                                                                                                                                       |
| Colunas                | #, Título, Tipo, Tag, Criador, Destinatário, Status, Aberto em, Ações. Linha abre o detalhe existente                                                                                                                                                                                      |
| Filtros da tabela      | Status (quando a aba tem mais de um), Tipo, Tag, Destinatário (com "Sem destinatário")                                                                                                                                                                                                     |
| Filtro "Setor"         | **Só para o Diretor**. Vem com a Diretoria (o setor dele) marcada; permite ver a fila de qualquer setor pela URL (`?setor=`, padrão da Entrega A). Setor inativo e Não alocado fora das opções; id inválido → o próprio setor; para os demais o parâmetro é ignorado                       |
| "Assumir"              | Qualquer pessoa ativa, sem troca de senha pendente, do setor do chamado (inclusive admin e o Diretor na Diretoria). Só com o chamado **ainda não assumido** (sem destinatário ou destinatário = autor) e quando quem clica não é já o destinatário. Torna quem clicou o destinatário       |
| "Enviar"               | Admin do setor do chamado ou Diretor (qualquer setor). Dialog com o combobox de Destinatário listando as pessoas ativas do setor do chamado. Pode redistribuir chamado já assumido; o escolhido precisa ser diferente do atual                                                             |
| Quando as ações surgem | Status `aberto`, `em_analise`, `encaminhado`, `em_andamento`, sem transferência pendente. Nunca em `resolvido`, `fechado`, `cancelado`, `aguardando_aprovacao`. O Diretor na fila de **outro** setor vê só "Enviar" (ele não pode ser destinatário fora do setor dele, regra da Entrega B) |
| Efeito                 | Muda só `assigned_to` (e `updated_at`). **Status não muda.** Uma linha `atribuicao` (de/para, `changed_by` = quem agiu) na mesma transação. **Sem e-mail**                                                                                                                                 |
| Concorrência           | A ação envia o destinatário que a pessoa viu. Se mudou, recusa com `Este chamado já foi assumido por {nome}.` (variações no contrato) e a tela recarrega                                                                                                                                   |

## Escopo

**Entra**: item do menu condicionado; página `/queue` com abas, contagens,
período, filtro de Setor do Diretor e tabela; ações "Assumir" e "Enviar" na
linha, com a regra no domínio (a mesma função para o botão e para a transação);
gravação transacional da atribuição com histórico e checagem de concorrência;
duas actions.

**Fora**: botões no detalhe do chamado; mudança de status; aprovações; e-mail;
tempo real; paginação; painel lateral; navegação no menu mobile.

## Impacto

- **Schema / migration**: nada. `ticket.assigned_to`, o evento `atribuicao` e o
  índice `ticket_dept_status_idx` (`current_department_id, status, created_at
desc`) já existem.
- **Tipos**: `types/department-queue.ts` (aba, regra, contagens, item da lista,
  localização na URL, ações da linha) e `types/ticket-assignment.ts` (fatos,
  motivos de bloqueio, valores e outcomes da atribuição, defaults do dialog).
- **Domínio**: `domain/department-queue-tabs.ts` (arquivo-folha das abas),
  `domain/department-queue.ts` (textos, regras das abas, setor exibido,
  `queueRowActionsFor`) e `domain/ticket-assignment.ts` (status atribuíveis,
  regras de "Assumir" e "Enviar", textos). `ALL_TIME_PERIOD_PRESETS` em
  `domain/period.ts`, reaproveitado por Meus chamados.
- **Validação**: `validation/department-queue.ts` (parâmetros da URL e links) e
  `validation/ticket-assignment.ts` (`assumeTicketSchema`, `sendTicketSchema`).
  `allTimePeriodSchema` em `validation/period.ts`, reaproveitado por Meus
  chamados.
- **`df-data`**: `listQueueTickets` e `countQueueTicketsByTab` (arquivo novo);
  `assignTicket` em `tickets.ts`.
- **`df-actions`**: `assumeTicket` e `sendTicket` (arquivo novo).
- **`df-ui`**: item do menu; página `/queue`; tabela; filtro de Setor; botões e
  dialog "Enviar".
- **`df-auth`, `df-email`**: nada.

## Ondas e agentes

- **Onda 0**: `df-architect` — tipos, domínio, validação, contrato, este plano.
- **Onda 1 (paralelo)**: `df-data` (lista, contagem, `assignTicket`) ‖ `df-ui`
  (menu, página, abas, período, filtro de Setor, tabela sem as ações).
- **Onda 2 (paralelo)**: `df-actions` (`assumeTicket`, `sendTicket`) ‖ `df-ui`
  (botões "Assumir" e "Enviar", dialog, tratamento de conflito).
- **Onda 3**: `df-reviewer`.
- **Onda 4**: `df-qa`.

## Riscos

1. **"Assumido" é inferido**: chamado com destinatário = autor conta como "ainda
   não assumido". Um autor que se escolheu de propósito como destinatário pode
   ter o chamado assumido por um colega; um envio pelo admin de volta ao autor
   o devolve à condição de "não assumido".
2. **Sem paginação**: a fila de um setor movimentado cresce sem limite na aba
   "Em aberto" com "Todos". O índice `ticket_dept_status_idx` atende a consulta;
   o custo é de tela.
3. **O autor perde o "Resolver"** quando alguém assume ou recebe o chamado (com
   destinatário definido, resolve o destinatário, além do admin do setor e do
   Diretor). Ele continua com "Editar".
4. **Lista desatualizada sem tempo real**: dois colegas podem ver o mesmo
   chamado como livre. A checagem de concorrência recusa o segundo com o nome de
   quem assumiu, e a tela recarrega.
5. **Opções do filtro de Setor**: o Diretor só alcança setores ativos e fora do
   Não alocado. Chamados fechados ou cancelados que ficaram num setor depois
   desativado não aparecem em nenhuma fila (continuam acessíveis pelo detalhe).

## Critério de pronto

1. Menu com "Fila do setor" para quem tem setor; ausente no Não alocado, com o
   aviso em `/queue`.
2. Três abas com contagens iguais ao banco; período com padrão Todos.
3. Diretor troca de setor pela URL; parâmetro ignorado para os demais.
4. "Assumir" e "Enviar" gravam `assigned_to` e uma `atribuicao`, sem mudar o
   status; regras e conflito recusados mesmo forjados.
5. `tsc`, lint e build passam; `df-reviewer` sem bloqueante; `df-qa` aprova os
   cenários do contrato.

## Commit sugerido

`feat: give each department a queue to assume and send tickets` — domínio,
validação, tipos, dados, actions, telas, o contrato e este plano.
