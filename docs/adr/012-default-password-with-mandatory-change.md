# 012 — Senha padrão com troca obrigatória no primeiro acesso

## Contexto

Cadastros → Pessoas cria contas sem cadastro público (`disableSignUp: true`) e sem
convite por e-mail. A pessoa precisa conseguir entrar sem que alguém escolha ou
conheça a senha definitiva dela. As alternativas eram convite com link (exige
e-mail e fluxo de token), senha gerada por conta exibida ao admin (a senha
circula por fora do sistema, uma por pessoa) e uma senha padrão da empresa com
troca forçada.

## Decisão

- Toda pessoa nasce com a senha de `DEFAULT_USER_PASSWORD` (variável de
  ambiente, nunca no código nem no banco em texto) e com
  `users.must_change_password = true`.
- Enquanto a flag estiver ligada, a pessoa só usa `/set-password`: o layout de
  `app/(app)` redireciona para lá, e `resolveRegistryAccess` devolve `none`.
  A tela pede nova senha e confirmação (8–128), **não** pede a atual e recusa a
  senha igual à que está gravada (a padrão).
- Definir a senha grava o hash novo, desliga a flag na mesma transação e revoga
  as **outras** sessões da pessoa: quem entrou com a senha padrão em outro
  navegador perde o acesso.
- "Restaurar senha padrão" (diretor e admin de setor, dentro do que gerenciam)
  volta a senha para a padrão, liga a flag e revoga todas as sessões.
- Redefinição por e-mail (`onPasswordReset` do Better Auth) também desliga a
  flag: a senha deixou de ser a padrão.
- O hash é sempre o do Better Auth (`(await auth.$context).password.hash`, que por
  padrão é o `hashPassword` de `better-auth/crypto`): é o mesmo algoritmo que o
  login verifica.
- Camadas: `app/_lib/auth/` é o único que lê `DEFAULT_USER_PASSWORD` e produz o
  hash (`hashDefaultPassword`); `app/_lib/data/` grava `users` + `account` na
  mesma transação, como o seed já faz; a action orquestra. Isso abre uma
  exceção ao espírito do ADR 005: `app/_lib/data/people.ts` escreve em
  `account.password`. É aceita porque o que está em jogo é atomicidade entre
  `users` e `account` na criação e na restauração, e o formato do dado gravado
  (hash opaco, `providerId: "credential"`, `accountId = String(user.id)`) é o
  mesmo que o seed já grava. Leitura de conta e verificação de senha continuam
  só em `app/_lib/auth/`.
- Sem `DEFAULT_USER_PASSWORD`, criar pessoa e restaurar senha falham com
  `DEFAULT_PASSWORD_MISSING`; nada mais depende dela.

## Consequência

- Quem conhece a senha padrão pode entrar numa conta que ainda não foi usada e
  definir a senha antes da dona. A janela é o intervalo entre o cadastro e o
  primeiro acesso. Mitigação operacional: comunicar a senha padrão fora do
  sistema e pedir o primeiro acesso logo após o cadastro. Se isso deixar de ser
  aceitável, o caminho é convite por e-mail com token, que substitui esta
  decisão.
- Risco aceito: quem gerencia uma pessoa (diretor sobre qualquer pessoa,
  inclusive outro diretor; admin de setor sobre os membros que gerencia) e
  conhece a senha padrão pode usar "Restaurar senha padrão", entrar com a senha
  padrão e definir a própria senha, assumindo a conta. É aceito porque é o mesmo
  poder de quem cria a conta e o ambiente é interno. Mitigações possíveis, se
  deixar de ser aceitável: registrar a restauração em histórico de auditoria ou
  trocar a senha padrão por uma senha temporária aleatória, exibida uma única
  vez a quem restaurou.
- Trocar o valor de `DEFAULT_USER_PASSWORD` não afeta quem já nasceu com o valor
  antigo: a checagem "igual à padrão" compara com o hash gravado, não com a
  variável.
- A flag é lida fresca do banco a cada request em `(app)`, na mesma consulta de
  `getRegistryAccess`; não vai para cookie.
