# 007 — Limite de tentativas no login e no pedido de redefinição

## Contexto

O Better Auth traz limite próprio para os dois endpoints: `/sign-in/email` cai no
default de 10s / máximo 3 tentativas e `/request-password-reset` tem regra
dedicada de 60s / máximo 3
(`node_modules/better-auth/dist/api/rate-limiter/index.mjs:311-315`). Esse limite
é aplicado no `onRequest` do router do pacote
(`node_modules/better-auth/dist/api/index.mjs:172`), ou seja: só corre para
requisição que **entra pelo handler HTTP** — no projeto, apenas o que passa por
`app/api/auth/[...all]/route.ts`.

Os dois fluxos do produto não passam por lá. `signInWithPassword`
(`app/_lib/auth/session.ts`) chama `auth.api.signInEmail` e
`requestPasswordResetEmail` (`app/_lib/auth/password-reset.ts`) chama
`auth.api.requestPasswordReset`, ambos direto da Server Action. A chamada direta é
a decisão certa por outros motivos (tipagem, sem round-trip HTTP, sem
`originCheck` a contornar), mas ela **pula o `onRequest`** e com ele o limitador.
Não há limite algum hoje em nenhum dos dois.

O que isso abre:

- **Pedido de redefinição:** dá para disparar e-mail em laço para um endereço
  arbitrário — mail bomb contra um terceiro, queima da cota do Resend e linhas sem
  limite em `verification`, uma por pedido.
- **Login:** tentativa de senha sem teto. A mensagem genérica
  `E-mail ou senha inválidos.` não revela existência de conta, mas não atrasa nem
  impede adivinhação automatizada; sem limite, ela é só discrição, não defesa.

Fechar isso agora exigiria escolher a camada sem saber onde a aplicação vai rodar,
e cada opção tem custo diferente:

- **Limite na borda** (WAF ou proxy do host), por IP e rota — nenhum código nosso,
  mas só existe depois de escolhida a hospedagem, e IP não é identidade: um NAT
  compartilha, e quem ataca pode variar o e-mail alvo.
- **Passar as chamadas pelo router do Better Auth**, por `auth.handler`, para
  herdar o limitador — devolve o limite de graça, mas troca Server Action por fetch
  ao próprio backend (contra a seção 3 do `stack.md`) e o storage default do
  limitador é memória do processo, que não sobrevive a mais de uma instância.
- **Limitador do Better Auth com `rateLimit.storage: "database"`**, invocado fora
  do router — depende de o pacote expor isso como API pública; hoje não sabemos, e
  é medição para o `df-debug`, não suposição.
- **Implementação nossa**, contando tentativas por e-mail normalizado e por IP
  antes de chamar o wrapper — controle total, ao custo de uma escrita por tentativa
  e da decisão de onde guardar a contagem.

Há uma restrição que vale para qualquer das opções, no caminho do pedido de
redefinição: a resposta sob limite tem de continuar **byte a byte a mesma** dos
outros casos (ADR 004). Um `Muitas tentativas para este e-mail.` transformaria o
limitador em oráculo de existência de conta e desfaria a decisão daquele ADR. No
login a mensagem pode ser explícita, desde que a contagem corra também para e-mail
inexistente.

## Decisão

Não implementar nesta feature. Registrar a lacuna aqui e nos contratos
(`docs/contracts/auth.md` e `docs/contracts/password-reset.md`, seções
"Ponto em aberto") e condicionar o fechamento: **a escolha da camada é requisito da
tarefa que preparar o deploy**, tomada quando a hospedagem estiver definida, e
cobre os **dois** pontos de chamada na mesma passada.

Até lá, nenhum ambiente exposto à internet pública roda sem limite na borda.

## Consequência

- Os call sites ficam nomeados, para que a correção não conserte só parte do
  problema: `signInWithPassword` (`app/_lib/auth/session.ts`),
  `requestPasswordResetEmail` (`app/_lib/auth/password-reset.ts`) e
  `changeUserPassword` (`app/_lib/auth/password-change.ts`, ver adendo abaixo).
- Em desenvolvimento nada muda: o custo do abuso é a máquina do desenvolvedor.
- Quem implementar respeita a resposta idêntica do ADR 004 e atualiza este ADR com
  a opção escolhida.
- `verification` continua sem rotina de limpeza. Linha expirada não é apagada por
  tempo, só quando o token é consumido; com limite, o volume deixa de ser
  arbitrário, e sem ele a tabela cresce na mesma velocidade do abuso.

## Adendo (2026-09-24) — terceiro ponto de chamada: troca de senha no perfil

A feature "Perfil do usuário" (`docs/contracts/profile.md`) acrescenta
`changeUserPassword` (`app/_lib/auth/password-change.ts`), que chama
`auth.api.changePassword` direto da Server Action. O Better Auth tem regra para
esse caminho — `/change-password` cai na mesma regra de `/sign-in`, 10s / máximo 3
(`node_modules/better-auth/dist/api/rate-limiter/index.mjs:302-309`) —, e ela
também só roda no `onRequest` do router. Pela chamada direta, **não há limite**.

A exposição é menor que a dos outros dois: o endpoint exige sessão válida
(`sensitiveSessionMiddleware`, que relê a sessão no banco —
`node_modules/better-auth/dist/api/routes/session.mjs:284-311`), então só quem já
está logado consegue tentar, e só contra a própria senha. O risco é quem pega uma
sessão aberta (computador destravado, cookie roubado) adivinhar a senha atual em
laço para então trocá-la e tomar a conta.

A decisão acima não muda: a mesma passada que escolher a camada de limite cobre
os **três** pontos. No caso da troca de senha, a contagem é por usuário da sessão,
não por e-mail digitado, e a mensagem sob limite pode ser explícita — não há
enumeração de conta a proteger, porque quem chama já está autenticado.

A mesma passada cobre também `updateAvatar` (`app/_lib/actions/profile.ts`), que
não é tentativa de senha mas grava e apaga objeto no R2 a cada chamada, sem
limite. O risco está aceito até lá e descrito no ADR 010, seção "Consequência";
a contagem também é por usuário da sessão.
