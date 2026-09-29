# Plano — Cadastros → Pessoas

Aprovado em 2026-09-29. Contrato em `docs/contracts/registry-people.md`. Senha
padrão no ADR 012; revogação de sessão no ADR 003; Diretoria e Não alocado no
ADR 011.

## Decisões fixadas pelo usuário

| Tema            | Decisão                                                                                                                                                                                 |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cadastro        | Nome, e-mail, setor real (nunca Não alocado), papel. Sem exclusão. Sem convite e sem e-mail ao criar ou restaurar                                                                       |
| Senha           | Nasce com `DEFAULT_USER_PASSWORD` e `must_change_password = true`. Troca obrigatória em `/set-password` (nova + confirmação, 8–128, ≠ padrão, sem senha atual)                          |
| Restaurar       | Diretor e admin, no alcance deles: volta à padrão, liga a flag, revoga sessões                                                                                                          |
| Sem a variável  | Criar e restaurar falham com mensagem clara; o resto do app funciona                                                                                                                    |
| Não alocado     | `department.is_unassigned`: único, sempre ativo, nunca Diretoria. Criado pela migration. Renomeável, não desativável, sem tags. Só recebe gente movida. Quem está nele loga normalmente |
| Setores         | Regra de desativação dos demais não muda. Não alocado ganha badge e não desativa                                                                                                        |
| Diretor         | Gerencia todos. Só ele mexe em papel admin. Diretoria ⇒ sempre admin. Ao tirar da Diretoria, escolhe o papel. Nunca fica sem diretor ativo                                              |
| Admin de setor  | Só membros do próprio setor ou do Não alocado: edita, move entre os dois, desativa/reativa, restaura senha. Cria só membro no próprio setor. Não vê papel                               |
| Acesso suspenso | Admin no Não alocado e quem tem a flag → `RegistryAccess = none`                                                                                                                        |
| Travas          | Ninguém se desativa. Último diretor ativo não sai nem desativa. Forjar alvo fora do alcance → `FORBIDDEN`                                                                               |
| Sessão          | Desativar revoga na hora (ADR 003)                                                                                                                                                      |
| UI              | `/registry/people`: nome (avatar), e-mail, setor (diretor), papel, status, último acesso; busca nome/e-mail; filtro de setor (diretor). Ícone de Cadastros vira `FolderIcon`            |

## Escopo

**Entra**: carimbo do Não alocado e sua linha inicial; flag de troca obrigatória;
acesso por papel com as suspensões; `/registry/people` com listar, criar,
editar (nome, e-mail, setor, papel), desativar/reativar e restaurar senha;
`/set-password`; redirecionamento no layout `(app)`; revogação de sessão;
ajustes em Setores e Tags para o Não alocado.

**Fora**: exclusão de pessoa; convite por e-mail; foto de terceiros; troca de
e-mail com verificação; tela Configurações (a engrenagem fica reservada);
redistribuição de chamados de quem muda de setor.

## Impacto no contrato

- Schema: `department.is_unassigned` + índice único parcial + dois `check`;
  `users.must_change_password`.
- Tipos: `person.ts` e `account.ts` (novos); `registry.ts`, `department.ts`,
  `tag.ts` (campos e status novos).
- Domínio: `person.ts` (novo); `registry.ts` (precedência, rota de Pessoas);
  `department.ts` (Não alocado, badges, `assignableDepartments`,
  `IS_UNASSIGNED`); `tag.ts` (`checkTagDepartment`); `user.ts` (`ROLES`).
- Validação: `person.ts` (novo); `password.ts` (`definePasswordSchema`).
- `df-auth`: `account-facts.ts`, `account-state.ts`, `default-password.ts`
  (novos); `registry-access.ts`, `session.ts`, `auth.ts` (alterados);
  `app/(auth)/set-password/**`.
- `df-data`: `people.ts` (novo); `departments.ts`, `tags.ts` (alterados).
- `df-actions`: `people.ts`, `password-setup.ts` (novos); `tags.ts`,
  `departments.ts` (alterados).
- `df-ui`: layout `(app)`, `registry-nav.tsx`, `registry/people/**`,
  componentes de Setores.
- `.env.example`: `DEFAULT_USER_PASSWORD`.

## Migration

- `0005_people_registry.sql` — gerada (`drizzle-kit generate --name people_registry`).
- `0006_unassigned_department.sql` — custom (`drizzle-kit generate --custom`),
  `INSERT` do "Não alocado" condicionado a não existir setor carimbado.

`npm run db:migrate` fica com o usuário. Falha de propósito se já houver setor
"Não alocado" sem carimbo (o Neon não tem).

## Ondas e agentes

- **Onda 0**: `df-architect` — schema, migrations, tipos, domínio, validação,
  `.env.example`, contratos, ADR 003/011/012, este plano.
- **Pré-requisito (usuário)**: `npm run db:migrate`; `DEFAULT_USER_PASSWORD` no `.env`.
- **Onda 1 (paralelo)**: `df-auth` (facts, estado da conta, senha padrão,
  revogação, `onPasswordReset`) · `df-data` (`people.ts`, ajustes em setores e
  tags) · `df-ui` (ícone, badges e trava do Não alocado em Setores, página de
  Pessoas em leitura com tabela, busca e filtro).
- **Onda 2 (paralelo)**: `df-actions` (`people.ts`, `password-setup.ts`, ramos
  novos de tags e setores) · `df-auth` (`/set-password`, depende de
  `definePassword`) · `df-ui` (redirecionamento no layout `(app)`; dialogs de
  criar, editar, desativar/reativar, restaurar senha).
- **Onda 3**: `df-reviewer` · `df-debug` (fluxos do checklist do contrato).

O `tsc` fica vermelho entre a Onda 0 e a entrega da Onda 1 em três arquivos
(`registry-access.ts`, `data/departments.ts`, `actions/departments.ts`); o ramo
`IS_UNASSIGNED` das actions de setor é de uma linha e pode entrar com o
`df-data`. O redirecionamento do layout depende de `getAccountState` (`df-auth`)
e deve entrar no mesmo commit que `/set-password`, para não mandar ninguém a uma
rota inexistente.

## Riscos

1. Senha padrão compartilhada permite tomar uma conta nunca usada (ADR 012).
2. Redirecionamento só no layout; seguro porque a flag só liga sem sessão ativa.
3. Autorização sobre leitura sem trava (janela de milissegundos); último diretor
   é imune.
4. Falha ao revogar sessões vira `SESSION_REVOKE_FAILED`; repetir é seguro.
5. E-mail com maiúscula gravado antes (seed) não loga.
6. `tsc` vermelho entre ondas.

## Critério de pronto

- Diretor cria pessoa em qualquer setor real; Diretoria força admin; ninguém é
  criado no Não alocado.
- Pessoa nova entra com a senha padrão, só vê `/set-password`, não consegue
  repetir a padrão, e depois navega normalmente; outras sessões dela caem.
- Restaurar senha derruba as sessões e força nova definição.
- Desativar derruba a sessão aberta na próxima requisição; ninguém se desativa;
  último diretor não sai nem desativa.
- Admin vê o próprio setor e o Não alocado, age só em membros, move entre os
  dois, cria só membro no próprio setor, nunca vê papel; forjar → `FORBIDDEN`.
- Admin no Não alocado perde Cadastros; realocado, recupera.
- Não alocado: badge em Setores, não desativa, sem tags.
- Sem `DEFAULT_USER_PASSWORD`, criar e restaurar falham com mensagem; resto ok.
- `tsc`, lint e build passam; `df-reviewer` sem bloqueante.

## Commits por etapa

1. `feat: add people registry contract, unassigned department and forced password change` — Onda 0.
2. `feat: resolve account state, default password and session revocation` — `df-auth` (Onda 1).
3. `feat: add people queries and unassigned department rules` — `df-data`.
4. `feat: list people and mark the unassigned department` — `df-ui` leitura.
5. `feat: add people server actions and initial password definition` — `df-actions`.
6. `feat: define password on first access` — `df-auth` (`/set-password`) junto com o redirecionamento do layout.
7. `feat: create, edit, toggle and restore people from the Cadastros page` — `df-ui` escrita.
