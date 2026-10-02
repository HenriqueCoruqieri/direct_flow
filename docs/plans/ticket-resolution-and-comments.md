# Plano — Resolução e comentários do chamado

Aprovado em 2026-10-02 (via `/consult`). Contrato técnico em
`docs/contracts/ticket-resolution.md`. Ponto de partida: "Conclusão" em
`docs/contracts/ticket-creation.md` (regras das próximas features).

## Decisões fixadas pelo usuário

| Tema                                      | Decisão                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Layout do detalhe `/tickets/[id]`         | Desktop: coluna larga = Descrição → Linha do tempo → **Conclusão**; coluna estreita = Detalhes → **Comentários**. Conclusão e Comentários terminam na mesma linha; a lista de comentários rola por dentro do card; Conclusão pode crescer para baixo. Mobile: uma coluna, nessa ordem                                                                                                                                                            |
| Criação de chamado                        | **Sai o setor de destino.** Todo chamado nasce `aberto`, no setor do autor, sem `ticket_transfer`. Motivo: o envio entre setores passa a ser ato deliberado no detalhe, depois de o autor revisar (feature futura)                                                                                                                                                                                                                               |
| Resolver                                  | Leva a `resolvido` com **solução obrigatória** (10–5000 após `trim`, mesmas regras de tamanho da descrição), `resolved_at` e linha no histórico. Fechamento automático em 7 dias **fora** desta entrega (ADR futuro). Solução **não editável** depois de resolver nesta entrega                                                                                                                                                                  |
| Quem resolve                              | `assigned_to`; **sem responsável**, o autor enquanto o chamado está no setor dele (`current_department_id` = setor atual do autor). **Mais** o admin do setor atual do chamado (`role = admin` e `departmentId = current_department_id`) e o diretor (`isBoard`), a qualquer momento. O histórico já registra quem fez (`changed_by`)                                                                                                            |
| Quando não resolve                        | Com transferência pendente, ou com chamado já `resolvido`, `fechado`, `cancelado`. Também `aguardando_aprovacao`. Quem resolve precisa estar ativo e sem troca de senha pendente                                                                                                                                                                                                                                                                 |
| Solução                                   | Coluna nova `ticket.solution` (`text`, nullable). O histórico registra a transição sem repetir o texto                                                                                                                                                                                                                                                                                                                                           |
| Evento                                    | Valor novo `resolucao` em `history_event` (no fim da lista). Rótulo `Resolução`, frase `Resolveu o chamado.`. Grava `from_status` (status anterior) → `to_status = resolvido`, `note` nula. `encerramento` fica reservado para o futuro fechamento automático; `mudanca_status` é genérico demais                                                                                                                                                |
| Botões futuros no card Conclusão          | "Anexar" e "Enviar para outro setor": padrão de ação bloqueada (`app/_components/blocked-action-trigger.tsx`, igual ao `NewTicketBlockedButton`/`EditTicketBlockedButton`): esmaecidos, toast no clique/toque/Enter, sem action. Textos: `Anexos estarão disponíveis em breve.` e `O envio para outro setor estará disponível em breve.` Aparecem só no estado em que quem vê pode resolver                                                      |
| Exceção à regra "nenhum botão sem função" | A regra do plano de Meus chamados ganha exceção explícita: botões de features futuras usam o padrão de ação bloqueada                                                                                                                                                                                                                                                                                                                            |
| Estados do card Conclusão                 | Quem vê pode resolver → campo da solução + "Resolver" + os dois botões bloqueados; chamado `resolvido`/`fechado` → solução travada + data da resolução (sem solução gravada, ex.: seed demo → `Nenhuma solução registrada.`); transferência pendente → campo travado com `ticket_transfer.request_reason` ou, sem justificativa (chamados legados), `Aguardando aprovação de {setor}`; quem vê não pode resolver → `Nenhuma solução registrada.` |
| Comentários                               | Tabela `message` existente (`visibility` `publica`/`interna`), **sem mudança de schema**. Comenta quem vê o chamado (`canViewTicket`), ativo, sem troca de senha pendente, enquanto o chamado não estiver `fechado`/`cancelado` (em `resolvido` pode). 1–5000 caracteres após `trim`. Checkbox "Comentário privado" desmarcada por padrão (público)                                                                                              |
| Comentário privado (`interna`)            | Visível para quem está no setor atual do chamado, para os diretores e para quem escreveu                                                                                                                                                                                                                                                                                                                                                         |
| Lista de comentários                      | Sem editar nem apagar. Fora da linha do tempo (não gera `ticket_history`). Do mais antigo ao mais novo, com autor, data/hora e selo `Privado`                                                                                                                                                                                                                                                                                                    |
| E-mail                                    | Nenhum                                                                                                                                                                                                                                                                                                                                                                                                                                           |

## Escopo

**Entra**: coluna `ticket.solution` e valor `resolucao` (migration não
destrutiva); regra de quem resolve e de quem comenta no domínio (a mesma função
para a tela e para a transação); estado do card Conclusão; schemas de resolução
e de comentário; gravação transacional da resolução com histórico; gravação do
comentário; leitura dos comentários respeitando a visibilidade; duas actions;
cards Conclusão e Comentários no detalhe, com o grid alinhado; dois botões
bloqueados; retirada do setor de destino da criação.

**Fora**: fechamento automático em 7 dias; envio para outro setor e Aprovações;
anexos; atribuição; editar a solução; editar/apagar comentários; reabertura;
abrir a edição do chamado para admin/diretor; e-mail.

## Impacto

- **Schema**: `ticket.solution` (`text`, nullable); `resolucao` no fim de
  `history_event`. A tabela `message` não muda.
- **Tipos**: `TicketDetail` com `solution` e `resolvedAt`; `TicketActorFacts`
  (fatos de quem age, com `role`); fatos, motivos e estado da resolução;
  outcomes de gravação de resolução e comentário; item da lista de comentários;
  escopo de leitura dos comentários. Criação sem destino.
- **Domínio**: `domain/ticket-resolution.ts` e `domain/ticket-comments.ts`
  (novos); rótulo e frase de `resolucao`; criação sem destino (sai o que era de
  destino e aprovação).
- **Validação**: `createTicketSchema` sem `departmentId`; `resolveTicketSchema`;
  `createTicketCommentSchema`.
- **`df-data`**: `findTicketDetail` com campos novos; `insertTicket` sem
  destino; `updateTicketResolution`; `listTicketMessages`; `insertTicketMessage`.
- **`df-actions`**: `createTicket` sem destino; `resolveTicket`;
  `addTicketComment`.
- **`df-ui`**: grid do detalhe; `TicketConclusion`; `TicketComments`;
  formulários de resolução e comentário; dois botões bloqueados; "Novo chamado"
  sem combobox de destino; `AppTopBar` sem `listDepartmentOptions`.
- **`df-auth`, `df-email`**: nada.

## Migration

`0009_ticket_resolution`: `ALTER TYPE history_event ADD VALUE 'resolucao'` e
`ALTER TABLE ticket ADD COLUMN solution text`. Não destrutiva; a migration não
usa o valor novo (mesmo raciocínio da `0007` e da `0008`). Aplicação
(`npm run db:migrate`) pelo usuário, antes do teste.

## Ondas e agentes

- **Onda 0**: `df-architect` (schema, migration, tipos, domínio, validação,
  contratos, plano).
- **Onda 1 (paralelo)**: `df-data` (detalhe, `insertTicket` sem destino,
  resolução, comentários) · `df-ui` (grid, cards, botões bloqueados, lista de
  comentários, "Novo chamado" sem destino).
- **Onda 2 (paralelo)**: `df-actions` (`createTicket` sem destino,
  `resolveTicket`, `addTicketComment`) · `df-ui` (formulários ligados às
  actions).
- **Onda 3**: `df-reviewer`.
- **Onda 4**: `df-qa` (navegador, dev server, banco só leitura →
  `docs/test-reports/`).

## Riscos

1. Migration não aplicada → toda resolução falha como erro inesperado, sem
   gravar; o detalhe falha ao selecionar `ticket.solution`.
2. Solução travada depois de resolver: erro de digitação fica até a janela de
   correção (feature de fechamento automático).
3. Chamados criados antes desta entrega com transferência pendente sem
   justificativa mostram `Aguardando aprovação de {setor}` no card.
4. Comentário privado escrito por alguém fora do setor atual continua visível
   para ele; se o chamado mudar de setor, os privados passam a ser vistos pelo
   setor novo e deixam de ser vistos pelo antigo (a regra é pelo setor atual).
5. `resolvido` continua editável pelo autor (título, descrição, tipo, tag), como
   já era; só a solução não muda.

## Critério de pronto

1. Autor sem responsável resolve: `status = resolvido`, `resolved_at`,
   `solution`, uma linha `resolucao` (de/para status, nota nula); linha do
   tempo mostra "Resolução".
2. Admin do setor atual e diretor resolvem chamado alheio; membro do mesmo setor
   que não é autor não vê "Resolver" e a action forjada recusa.
3. Transferência pendente, `resolvido`, `fechado`, `cancelado` e
   `aguardando_aprovacao` não resolvem; o card mostra o estado certo.
4. "Anexar" e "Enviar para outro setor" esmaecidos com toast, sem action.
5. Comentário público e privado gravados em `message`; privado visível só para
   setor atual, diretores e quem escreveu; nenhum `ticket_history`; comentar em
   `fechado`/`cancelado` recusado.
6. Criação sem destino: todo chamado novo `aberto`, sem `ticket_transfer`.
7. Layout alinhado no desktop; uma coluna no mobile (390×844).
8. `tsc`, lint e build passam; `df-reviewer` sem bloqueante; `df-qa` aprova os
   cenários do contrato.

## Commits por etapa

Definidos depois da implementação, variando verbos e verificando o histórico do
repositório. Docs vão junto da etapa.
