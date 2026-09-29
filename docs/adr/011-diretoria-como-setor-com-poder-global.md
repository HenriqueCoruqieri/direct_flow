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
