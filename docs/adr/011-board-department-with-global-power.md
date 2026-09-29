# 011 — Diretoria como setor com poder global

## Contexto

Cadastros (setores, pessoas, tags) precisa de alguém com poder sobre a empresa
inteira. Até aqui só existia `role = admin`, que vale dentro do próprio setor
(`requireDepartmentAdmin`). Três formas de expressar "poder global" foram
consideradas:

1. **Role novo** (`director` no enum `role`). O poder ficaria na pessoa. Mover
   alguém de setor não mudaria nada, e o papel passaria a misturar duas coisas
   (hierarquia no setor e alcance na empresa).
2. **Nome do setor** (`name = 'Diretoria'`). Frágil: renomear o setor tiraria o
   poder de todos; criar outro setor com o mesmo nome em caixa diferente é
   barrado pelo índice, mas a regra passaria a depender de texto digitado.
3. **Carimbo no setor** (`department.is_board`). O poder é do setor; quem está
   nele o herda.

## Decisão

- `department.is_board boolean not null default false`, com índice único
  parcial `on (is_board) where is_board` (no máximo uma Diretoria) e
  `check (not is_board or is_active)` (a Diretoria nunca fica inativa).
- **Diretor** = usuário **ativo** num setor com `is_board = true`. O nome do
  setor é livre e pode ser trocado sem efeito no poder.
- O seed cria a Diretoria com o nome fixo `Diretoria` (`BOARD_DEPARTMENT_NAME`)
  e o carimbo ligado. Nenhuma tela liga ou desliga o carimbo.
- "É diretor?" é **consulta ao banco a cada checagem**, nunca campo em cookie,
  sessão ou `Actor`. Assim, mover alguém de setor ou desativá-lo revoga o poder
  na próxima requisição, sem esperar a sessão expirar (o problema que o ADR 003
  descreve para `is_active`).
- A consulta mora em `app/_lib/auth/director.ts`, que acessa `@/db` diretamente,
  como `app/_lib/auth/auth.ts` já faz. Não passa por `app/_lib/data/` porque a
  seção 2 do `stack.md` não tem a seta `auth → data`, e uma checagem de
  identidade não justifica abrir essa dependência.
- Página restrita responde **404** a não-diretor (`notFound()`), para não
  revelar que a rota existe. Server Action responde `FORBIDDEN`.

## Consequência

- Uma consulta indexada extra por request nas telas do grupo `(app)` (a sidebar
  precisa saber se mostra "Cadastros") e em cada action de Cadastros.
- Banco já populado não ganha diretor sozinho: a migration não adivinha qual
  setor carimbar. Em desenvolvimento, recria-se o banco e roda-se o seed.
- `role = admin` continua significando administrador **do setor**. Um admin da
  Diretoria é diretor por estar nela, não por ser admin; um membro comum da
  Diretoria também é diretor. Se isso precisar mudar, a regra muda num lugar só
  (a consulta de `director.ts`).
- `SEED_DEPARTMENT_NAME` deixa de existir.

## Nota — admin de setor em Cadastros (feature Tags, 2026-09-28)

- Cadastros deixa de ser exclusivo da Diretoria. O **admin de setor** (`role =
admin`, ativo, fora da Diretoria) entra em Cadastros com alcance limitado ao
  próprio setor: gerencia as tags dele e, na feature de Pessoas, terá regra
  própria (ainda a definir). **Setores continua só do diretor.**
- Diretor tem precedência: admin da Diretoria é diretor.
- O acesso é resolvido por `getRegistryAccess()` (`app/_lib/auth/registry-access.ts`):
  a mesma consulta fresca desta decisão, agora lendo também `users.role` e
  `users.department_id`, com a precedência em `resolveRegistryAccess`
  (`app/_lib/domain/registry.ts`). Nada disso vai para cookie. As funções de
  `director.ts` passam a derivar dela, mantendo uma consulta só por request.
- A guarda do layout de `/registry` passou a ser "diretor ou admin de setor";
  a de diretor foi para a página de Setores.
- Consequência: rebaixar um admin a membro, desativá-lo ou movê-lo de setor muda
  o que ele vê em Cadastros na próxima requisição, como já acontecia com o
  diretor.

## Nota — Pessoas e o setor Não alocado (feature Pessoas, 2026-09-29)

- Quem está na Diretoria passa a ser **sempre** `role = admin`: criar ou mover
  alguém para a Diretoria força o papel (`forcedRoleFor`). A regra "diretor =
  ativo num setor `is_board`" não muda; o que muda é que um membro comum na
  Diretoria deixa de ser produzível pela interface.
- Só o diretor concede ou retira o papel admin.
- Nunca fica sem diretor: desativar ou tirar da Diretoria o último diretor ativo
  é recusado (`LAST_DIRECTOR`), com recontagem dentro da transação e a linha da
  Diretoria travada com `FOR UPDATE`.
- Novo carimbo irmão: `department.is_unassigned` marca o setor **Não alocado**
  (único, sempre ativo, nunca Diretoria ao mesmo tempo). Admin que está nele
  mantém o papel, mas `resolveRegistryAccess` devolve `none`: o poder volta
  quando um diretor o realoca.
- `must_change_password = true` também resulta em `none` (ADR 012).
