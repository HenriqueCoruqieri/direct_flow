# Plano — Cadastros → Setores

Aprovado em 2026-09-28. Contrato em `docs/contracts/cadastros-setores.md`;
decisão de poder global no ADR 011.

## Decisões fixadas pelo usuário

| Tema            | Decisão                                                                                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Poder global    | Vem do setor **Diretoria** (`department.is_board`). Quem pertence a ele tem poder total em Cadastros. Não é role novo. Uma Diretoria só                 |
| Checagem        | Consulta ao banco a cada checagem (join `users` → `department.is_board`), fora do cookie. Revogação imediata ao mudar alguém de setor. `Actor` não muda |
| Seed            | Cria sempre o setor "Diretoria" com o carimbo; o admin do seed fica nele. `SEED_DEPARTMENT_NAME` sai                                                    |
| Navegação       | "Cadastros" recolhível na sidebar, só para diretor, aberto em `/cadastros/*`; subitens Pessoas (em breve), Setores, Tags (em breve)                     |
| Acesso negado   | `/cadastros/setores` dá 404 a não-diretor                                                                                                               |
| Escopo do setor | Listar, criar, renomear, ativar/desativar. Sem exclusão                                                                                                 |
| Desativação     | Só sem pessoas ativas e sem chamados em aberto (status fora de resolvido/fechado/cancelado). Diretoria nunca. Renomear a Diretoria pode                 |
| Nome            | `trim`, 2 a 80 caracteres, único sem diferenciar maiúsculas, inclusive contra inativos; conflito sugere reativar o existente                            |
| Tabela          | `app/_components/data-table/` (pasta aprovada), TanStack Table; colunas nome, status, pessoas ativas, chamados em aberto, criado em; busca por nome     |
| E-mail          | Nenhum                                                                                                                                                  |

## Escopo

**Entra**: carimbo `is_board` e migration; checagem de diretor; item "Cadastros"
na sidebar; `/cadastros/setores` com tabela, criação, renomeação e
ativação/desativação; seed com Diretoria fixa; tabela compartilhada.

**Fora**: Pessoas e Tags (só o item desabilitado); exclusão de setor; troca do
carimbo por tela; recusa de encaminhamento para setor inativo (feature de
encaminhamento).

## Impacto no contrato

- Schema: `department.is_board`, índice único parcial, `check` Diretoria ativa.
- Migration `0003_department_board.sql`, aditiva, não marca setor existente.
- Tipos: `app/_lib/types/department.ts` (lista, dependências, resultado da
  checagem, resultados de escrita) e `app/_lib/types/ticket.ts` (`TicketStatus`).
- Domínio: `app/_lib/domain/ticket.ts` (`OPEN_TICKET_STATUSES`),
  `app/_lib/domain/department.ts` (`checkDepartmentDeactivation`,
  `describeDepartmentDeactivationBlock`, limites do nome, nome da Diretoria do
  seed), `app/_lib/domain/status.ts` (`describeActiveStatus`, de que
  `describeAccountStatus` virou alias).
- Validação: `app/_lib/validation/department.ts`.
- `df-auth`: `app/_lib/auth/director.ts` (`requireDirector`, `getDirector`,
  `getIsDirector`), consultando `@/db` diretamente.
- `df-data`: `app/_lib/data/departments.ts` (`listDepartments`,
  `insertDepartment`, `updateDepartmentName`, `updateDepartmentActive` com
  transação e `FOR UPDATE`); `db/seed.ts` com a Diretoria.
- `df-actions`: `app/_lib/actions/departments.ts` (`createDepartment`,
  `renameDepartment`, `setDepartmentActive`).
- `df-ui`: sidebar com `isDirector`, `app/(app)/cadastros/layout.tsx`,
  `app/(app)/cadastros/setores/**`, `app/_components/data-table/`; instala
  `@tanstack/react-table` e os primitivos `table`, `collapsible`, `badge`,
  `alert-dialog`.
- `.env.example`: sem `SEED_DEPARTMENT_NAME`. `docs/contracts/auth.md` ajustado.

## Ondas e agentes

- **Onda 0**: `df-architect` (schema, migration, tipos, domínio, validação,
  `.env.example`, contrato, ADR 011, este plano).
- **Pré-requisito (usuário)**: recriar o banco local, `npm run db:migrate`,
  `npm run db:seed` — depois que o seed novo existir (fim da Onda 1).
- **Onda 1 (paralelo)**: `df-auth` (`director.ts`) · `df-data`
  (`departments.ts`, seed) · `df-ui` (data-table, primitivos, sidebar com
  "Cadastros", layout de `/cadastros`, página com a tabela em leitura).
- **Onda 2 (paralelo)**: `df-actions` (`departments.ts`) · `df-ui`
  (formulários de criar e renomear, confirmação de desativação, toasts).
- **Onda 3**: `df-reviewer` · `df-debug` (404 para não-diretor, `FORBIDDEN` na
  action, revogação ao mover de setor, `NAME_TAKEN`, bloqueio com contagens).

## Riscos

1. Banco local precisa ser recriado: o admin atual está no setor antigo, sem
   carimbo, e o seed pula admin existente. Sem isso, ninguém é diretor.
2. Encaminhamento pendente para setor que foi desativado: fica para a feature de
   encaminhamento recusar destino inativo.
3. Corrida na desativação: mitigada por recontagem e `update` na mesma transação
   com `FOR UPDATE` no setor; sobra janela para reativar pessoa ou reabrir
   chamado já do setor, aceita enquanto essas telas não existem.
4. Uma consulta extra por request em `(app)` para decidir o item da sidebar.

## Critério de pronto

- Após recriar o banco e rodar o seed, o admin vê "Cadastros" e acessa
  `/cadastros/setores`; um membro de outro setor não vê o item e recebe 404 na URL.
- Mover o admin para outro setor tira o acesso na próxima navegação, sem logout.
- Tabela lista todos os setores com status, pessoas ativas, chamados em aberto e
  data de criação (via `@/app/_lib/date`); busca por nome filtra.
- Criar e renomear validam 2–80 caracteres; nome repetido (qualquer caixa,
  inclusive inativo) mostra a mensagem de reativar.
- Desativar setor com pessoas ativas ou chamados em aberto é recusado citando as
  quantidades; a Diretoria não desativa; ativar sempre funciona.
- `tsc`, lint e build passam; `df-reviewer` sem bloqueante.
