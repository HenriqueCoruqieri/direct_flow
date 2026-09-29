# Plano — Cadastros → Tags

Aprovado em 2026-09-28. Contrato em `docs/contracts/cadastros-tags.md`; entrada
do admin de setor em Cadastros registrada no ADR 011.

## Decisões fixadas pelo usuário

| Tema          | Decisão                                                                                                                                        |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Permissão     | Diretor: tags de qualquer setor. Admin de setor ativo: só do próprio setor. Membro comum: 404 em `/cadastros/*`. Diretor tem precedência       |
| Menu          | Diretor: Pessoas (em breve), Setores, Tags. Admin: Pessoas (em breve), Tags                                                                    |
| Guardas       | Layout de `/cadastros` → `requireRegistryAccess`; `/cadastros/setores` → `requireDirector` na página; `/cadastros/tags` aceita os dois         |
| Acesso        | Uma consulta fresca por request (`is_active`, `role`, `department_id`, `is_board`), com `cache` do React. Nunca `role` do cookie               |
| Tela          | Diretor: tabela única com coluna Setor, filtro por setor e busca. Admin: só o setor dele, sem coluna nem filtro. Diretoria primeiro nas opções |
| Colunas       | Nome, Setor (só diretor), Status, nº de chamados que usam a tag, Criado em                                                                     |
| Escopo        | Listar, criar, renomear, ativar/desativar. Sem exclusão. Tag não muda de setor                                                                 |
| Desativar     | Sempre permitido; o histórico dos chamados fica intacto                                                                                        |
| Nome          | `trim`, 2–80; único no setor contando inativas, sem caixa. Conflito com inativa sugere reativá-la                                              |
| Setor inativo | Não cria nem reativa tag (`DEPARTMENT_INACTIVE`)                                                                                               |
| Autorização   | Renomear e ativar/desativar pelo setor gravado na tag. Admin com setor alheio (criação) ou tag alheia → `FORBIDDEN`                            |
| E-mail        | Nenhum                                                                                                                                         |

## Escopo

**Entra**: índice único de nome de tag contando inativas; acesso a Cadastros por
papel (`getRegistryAccess`); menu por acesso; guardas de layout e de Setores;
`/cadastros/tags` com tabela, filtro, busca, criação, renomeação e
ativação/desativação.

**Fora**: Pessoas (só o item "em breve"); exclusão de tag; troca de setor da tag;
uso de tags ao abrir chamado (feature de chamados).

## Impacto no contrato

- Schema: `tag_name_per_department_idx` sem `where is_active`.
- Migration `0004_tag_name_unique_including_inactive.sql` (drop e create do índice).
- Tipos: `app/_lib/types/registry.ts` (novo), `app/_lib/types/tag.ts` (novo),
  `DepartmentOption` em `app/_lib/types/department.ts`.
- Domínio: `app/_lib/domain/registry.ts` (acesso, menu, limites de nome, rotas),
  `app/_lib/domain/tag.ts` (`canManageTagsOf`, `tagScopeFor`,
  `tagCreationDepartments`, `describeTagNameTaken`); `department.ts` perde os
  limites de nome (movidos para `registry.ts`).
- Validação: `app/_lib/validation/registry.ts` (fábricas), `tag.ts` (novo),
  `department.ts` refeito sobre as fábricas, mesma API e mensagens.
- `df-auth`: `app/_lib/auth/registry-access.ts` (novo); `director.ts` derivado.
- `df-data`: `app/_lib/data/tags.ts` (novo); `listDepartmentOptions` em
  `departments.ts`.
- `df-actions`: `app/_lib/actions/tags.ts` (novo).
- `df-ui`: primitivo `select`; layout `(app)`, `AppSidebar` e `CadastrosNav` por
  acesso; layout de `/cadastros`; guarda na página de Setores;
  `app/(app)/cadastros/tags/**`; extensão do `DataTable` para filtro.

## Migration

`npm run db:generate` gerou `db/migrations/0004_tag_name_unique_including_inactive.sql`:

```sql
DROP INDEX "tag_name_per_department_idx";
CREATE UNIQUE INDEX "tag_name_per_department_idx" ON "tag" USING btree ("department_id",lower("name"));
```

O `df-debug` confirmou que o Neon não tem nomes duplicados entre ativas e
inativas no mesmo setor. `npm run db:migrate` fica com o usuário.

## Ondas e agentes

- **Onda 0**: `df-architect` (schema, migration, tipos, domínio, validação,
  contratos, ADR 011, este plano).
- **Pré-requisito (usuário)**: `npm run db:migrate`.
- **Onda 1 (paralelo)**: `df-auth` (`registry-access.ts`, `director.ts`) ·
  `df-data` (`tags.ts`, `listDepartmentOptions`) · `df-ui` (primitivo `select`,
  sidebar por acesso, guardas de `/cadastros` e de Setores, página de Tags em
  leitura com tabela, filtro e busca).
- **Onda 2 (paralelo)**: `df-actions` (`tags.ts`) · `df-ui` (formulário de
  criar/renomear, confirmação de desativação, toasts).
- **Onda 3**: `df-reviewer` · `df-debug` (404 por papel, `FORBIDDEN` forjado,
  `NAME_TAKEN` com inativa, `DEPARTMENT_INACTIVE`, revogação ao rebaixar admin).

A guarda do layout (`df-ui`) depende de `requireRegistryAccess` (`df-auth`); os
dois trabalham contra a assinatura publicada e o `tsc` fecha quando ambos
entregam. A guarda de diretor precisa entrar na página de Setores **no mesmo
commit** em que o layout afrouxa; senão o admin de setor vê Setores.

## Riscos

1. Banco com duplicatas ativa/inativa no mesmo setor quebra a migration (Neon
   checado, limpo).
2. Janela entre layout afrouxado e guarda de Setores: mitigada por entrarem juntos.
3. Admin ativo em setor inativo (só por corrida ou SQL manual) mantém leitura,
   renomear e desativar; não cria nem reativa.
4. Admin distingue `NOT_FOUND` de `FORBIDDEN` ao sondar ids; aceito.

## Critério de pronto

- Diretor vê Pessoas (em breve), Setores e Tags; tabela de tags de todos os
  setores com coluna Setor, filtro (Diretoria primeiro) e busca; cria escolhendo
  entre setores ativos.
- Admin de setor vê Pessoas (em breve) e Tags; 404 em `/cadastros/setores`;
  tabela só do setor dele, sem coluna nem filtro; cria no próprio setor.
- Membro comum: sem "Cadastros"; 404 em `/cadastros/*`.
- Nome repetido no setor (qualquer caixa, inclusive inativa) → `NAME_TAKEN`; com
  inativa, a mensagem sugere reativar. Mesmo nome em outro setor é aceito.
- Criar ou reativar em setor inativo → `DEPARTMENT_INACTIVE`. Desativar sempre
  funciona.
- Admin forjando setor ou id de tag alheia → `FORBIDDEN`.
- Rebaixar o admin tira o acesso na próxima navegação, sem novo login.
- `tsc`, lint e build passam; `df-reviewer` sem bloqueante.

## Commits por etapa

1. `feat: add tag registry contract and name index including inactive tags` —
   Onda 0 (schema, migration, tipos, domínio, validação, docs).
2. `feat: resolve registry access for directors and department admins` — `df-auth`.
3. `feat: add tag queries and department options` — `df-data`.
4. `feat: gate cadastros by registry access and list tags` — `df-ui` leitura
   (sidebar, guardas, página de Tags), junto com a guarda de Setores.
5. `feat: add tag server actions` — `df-actions`.
6. `feat: create, rename and toggle tags from the Cadastros page` — `df-ui` escrita.

## Pendência para a feature de Pessoas

`users.department_id` é **NOT NULL** hoje (FK `restrict` para `department`). O
usuário quer que o admin de setor possa interagir com "membros sem setor
associado", o que o schema atual não permite. Antes de codar Pessoas, o
`/consult` precisa decidir se a coluna vira nullable (e o que isso muda em
`Actor`, nos campos do Better Auth, em `findUserProfile`, `describeMembership`,
`resolveRegistryAccess` e nas FKs de chamado) ou se "sem setor" é modelado de
outra forma. A regra do que o admin de setor pode fazer em Pessoas também fica
para lá.
