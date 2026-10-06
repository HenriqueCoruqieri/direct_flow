# Plano — Melhorias pendentes: bloqueio de setor, datas futuras e destinatário

Aprovado em 2026-10-05 (via `/consult`). Duas entregas independentes, cada uma
com o próprio `/implement` e o próprio commit. A Entrega A vem primeiro.

Contratos técnicos:

- Entrega A — revisões de 2026-10-05 em `docs/contracts/registry-departments.md`
  (dialog, texto, link), `docs/contracts/registry-people.md` (filtros pela URL),
  `docs/contracts/my-tickets.md` e `docs/contracts/dashboard.md` (datas futuras).
- Entrega B — revisões em `docs/contracts/ticket-creation.md` e
  `docs/contracts/ticket-edit-window.md`, escritas na Onda 0 da entrega.

---

## Entrega A — bloqueio de setor com atalho para Pessoas; datas futuras

### Decisões fixadas pelo usuário

| Tema                       | Decisão                                                                                                                                                                                                                                   |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Texto do bloqueio          | O dialog "Não é possível desativar" cita **só o que bloqueia**: "mova as pessoas para outro setor" só se houver pessoas ativas; "conclua ou encaminhe os chamados" só se houver chamados em aberto. Hoje as duas frases saem sempre (bug) |
| Atalho para Pessoas        | Com pessoas ativas, botão **"Ver pessoas"** no dialog leva a Cadastros → Pessoas com os filtros **Setor = X** e **Status = Ativo** já marcados, e removíveis                                                                              |
| Chamados no bloqueio       | Só texto. Não existe tela de chamados por setor (a Fila é futura)                                                                                                                                                                         |
| Filtros pela URL           | Cadastros → Pessoas lê Setor e Status da URL. Parâmetro inválido é ignorado, sem erro                                                                                                                                                     |
| Datas futuras              | "Personalizado" no Início e em Meus chamados: o calendário desabilita os dias depois de hoje (fuso de São Paulo, ADR 009)                                                                                                                 |
| Período futuro no servidor | `de`/`ate` no futuro é período inválido e cai no padrão da tela (nas duas telas: Hoje), como já acontece com URL inválida. Motivo: período futuro mostrava "0 chamados" e se passava por "não houve chamados"                             |

### Escopo

**Entra**: texto condicional de `describeDepartmentDeactivationBlock`; link
"Ver pessoas" montado pelo domínio; leitura de `setor` e `status` da URL em
Pessoas; filtros iniciais no `DataTable`; `customPeriodSchema` recusando data
depois de hoje (com "hoje" como parâmetro); dias futuros desabilitados no
calendário.

**Fora**: botão para chamados no dialog de setor; mudança nos dialogs de Tags e
Pessoas; sincronizar com a URL o filtro alterado na tabela; recortar um período
personalizado que termina no futuro (ele é recusado inteiro).

### Impacto

- **Schema / migration**: nada.
- **Tipos**: `PeopleFilters` e `PeopleStatusParam` em `types/person.ts`.
- **Domínio**: texto condicional e `deactivationBlockPeopleHref` em
  `domain/department.ts`; `domain/people-filters.ts` (nomes dos parâmetros,
  `peopleRegistryHref`, `applicablePeopleFilters`).
- **Validação**: `validation/people-filters.ts` (`parsePeopleFilters`);
  `customPeriodSchema`, `dashboardSearchParamsSchema` e `myTicketsPeriodSchema`
  viram fábricas de `today`; `parseDashboardParams` e `parseMyTicketsPeriod`
  recebem `today`; `idSearchParamSchema` em `validation/search-params.ts`
  (o `ticketIdParamSchema` passa a usá-lo, sem mudar comportamento).
- **Datas**: `todayCalendarDate` em `app/_lib/date.ts`.
- **`df-data`, `df-actions`, `df-auth`, `df-email`**: nada. A mensagem da action
  `setDepartmentActive` muda sozinha, porque vem do domínio.
- **`df-ui`**: link opcional no `DeactivateRegistryDialog`; `DepartmentRowActions`
  passa o link; Pessoas lê os filtros; prop `initialColumnFilters` no
  `DataTable`; `disabled`/`endMonth` no `CustomPeriodPicker`; as duas páginas
  de período passam `today`.

### Ondas e agentes

- **Onda 0**: `df-architect` — tipos, domínio, validação, `date.ts`, contratos,
  este plano.
- **Onda 1**: `df-ui` — link opcional no `DeactivateRegistryDialog` sem afetar
  os outros cadastros; Pessoas lendo os filtros; `initialColumnFilters` no
  `DataTable` sem afetar as demais tabelas; datas futuras desabilitadas no
  calendário; `today` nas páginas do Início e de Meus chamados.
- **Onda 3**: `df-reviewer`.
- **Onda 4**: `df-qa`.
- Sem `df-data` e sem `df-actions`.

### Riscos

1. **"Hoje" do navegador × São Paulo.** O calendário calcula "hoje" no
   navegador; tem de ser o dia de São Paulo (`todayCalendarDate()` /
   `todayKey()` de `app/_lib/date`), nunca `new Date()` direto. Relógio do
   navegador adiantado perto da meia-noite pode liberar um dia que o servidor
   ainda considera futuro: a URL cai em Hoje (o servidor é a autoridade).
2. **Link antigo com período futuro** cai em Hoje sem aviso (mesma regra da URL
   inválida). Inclui o personalizado "mês inteiro" salvo antes desta mudança.
3. **Filtro removido não volta para a URL.** Desmarcar Setor ou Status muda só a
   tabela; recarregar a página reaplica os filtros da URL.

### Critério de pronto

1. Bloqueio só por chamados: sem "Ver pessoas" e sem "Mova as pessoas".
2. Com pessoas ativas, "Ver pessoas" abre Pessoas com Setor e Status = Ativo
   marcados, e a lista bate com a coluna "Pessoas ativas" do setor.
3. Dias futuros desabilitados nos dois calendários; URL com `ate` futuro cai no
   padrão da tela.
4. `tsc`, lint e build passam; `df-reviewer` sem bloqueante; `df-qa` aprova os
   cenários dos contratos.

### Commit sugerido

`feat: point blocked department deactivation to its people` — domínio,
validação, `date.ts`, componentes do `df-ui` e as revisões dos quatro
contratos, junto com este plano.

---

## Entrega B — destinatário do chamado (atribuição)

### Decisões fixadas pelo usuário

| Tema                    | Decisão                                                                                                                                                         |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quem pode ser escolhido | Só pessoas **ativas do setor do autor**                                                                                                                         |
| Autor como destinatário | Aparece nas duas abas (Abertos por mim e Atribuídos a mim). Aceito; as abas não mudam                                                                           |
| Edição                  | Destinatário editável no "Editar" em tela, pelo autor, nas mesmas condições de edição de hoje                                                                   |
| E-mail                  | Nenhum                                                                                                                                                          |
| Novo chamado            | **Criador**: campo travado com o nome de quem abre. **Destinatário**: combobox obrigatório, padrão = o próprio autor, opções = pessoas ativas do setor do autor |
| Detalhe                 | Rótulos "Aberto por"/"Responsável" passam a "Criador"/"Destinatário"; no modo de edição, Destinatário vira combobox com a mesma lista                           |
| Histórico               | A linha `criacao` grava `to_assignee_id`. Troca na edição segue o padrão da tag: `edicao` com "destinatário" na nota + linha `atribuicao` com de/para           |

### Escopo

**Entra**: destinatário na criação e na edição pelo autor; regra de
destinatário válido no domínio; histórico de criação e de troca; rótulos novos
no detalhe.

**Fora**: e-mail; atribuição por admin ou diretor em outra tela; destinatário de
outro setor; mudança nas abas de Meus chamados; Fila.

### Impacto

- **Schema / migration**: nada (`ticket.assigned_to` e o evento `atribuicao`
  já existem).
- **Domínio**: regra de destinatário válido (ativo e do setor do chamado);
  diferença e nota da edição com o destinatário.
- **Validação**: `assigneeId` obrigatório em `createTicketSchema` (e, por
  derivação, em `editTicketSchema`).
- **Tipos**: opções de destinatário; outcome `invalid_assignee`.
- **`df-data`**: lista de atribuíveis do setor; `insertTicket` e
  `updateTicketByAuthor` validam o destinatário sob trava e gravam o histórico.
- **`df-actions`**: `createTicket` e `editTicket` com o código
  `INVALID_ASSIGNEE`.
- **`df-ui`**: campos Criador e Destinatário no "Novo chamado"; rótulos e
  combobox no detalhe.

### Ondas e agentes

- **Onda 0**: `df-architect` — revisões em `ticket-creation.md` e
  `ticket-edit-window.md`, tipos, domínio, validação.
- **Onda 1 (paralelo)**: `df-data` (lista de atribuíveis; `insertTicket` e
  `updateTicketByAuthor`) ‖ `df-ui` (campos).
- **Onda 2 (paralelo)**: `df-actions` (`createTicket`/`editTicket` com
  `INVALID_ASSIGNEE`) ‖ `df-ui` (ligação dos campos às actions).
- **Onda 3**: `df-reviewer`.
- **Onda 4**: `df-qa`.

### Riscos

1. **O autor perde o "Resolver"** ao trocar o destinatário por um colega (regra
   atual de quem resolve: com responsável definido, resolve o responsável).
2. **Duas abas**: chamado com destinatário = autor aparece em Abertos por mim e
   em Atribuídos a mim; as contagens não somam o total.
3. **Destinatário desativado depois** continua atribuído ao chamado.
4. **Chamados antigos sem responsável** mostram `—` em Destinatário.

### Critério de pronto

1. Novo chamado com Criador travado e Destinatário obrigatório (padrão: o
   autor; opções: ativos do setor do autor).
2. Destinatário fora da regra recusado pela action (`INVALID_ASSIGNEE`), mesmo
   forjado.
3. `criacao` com `to_assignee_id`; troca na edição gera `edicao` com
   "destinatário" na nota e `atribuicao` com de/para.
4. Detalhe com "Criador"/"Destinatário"; edição em tela troca o destinatário.
5. `tsc`, lint e build passam; `df-reviewer` sem bloqueante; `df-qa` aprova.

### Commit sugerido

Um commit para a entrega, com as revisões de contrato junto.
