# 003 — Checagem de `is_active` em sessão já aberta

## Contexto

O login recusa usuário desativado no hook `databaseHooks.session.create.before`
(`app/_lib/auth/auth.ts:33-49`): a checagem de `users.is_active` roda depois de a
senha ser conferida e antes de a linha de `session` existir, então a sessão do
usuário desativado nunca é criada e nenhum cookie é emitido. Esse é o ponto certo
para o caminho de login.

O que esse ponto não cobre é a sessão que **já estava aberta** quando o usuário foi
desativado. `requireSession()` (`app/_lib/auth/session.ts:24-28`) só verifica se
existe sessão válida e monta o `Actor`; não relê `is_active`. O `proxy.ts` é mais
raso ainda: olha a presença do cookie, sem tocar o banco. Resultado: desativar um
usuário não derruba a navegação dele — ele segue até a sessão expirar.

Hoje a exposição é nula. Não existe tela de desativação de usuário; o único caminho
para `is_active = false` é alteração manual no banco. Nenhum fluxo do produto
produz esse estado.

Fechar isso agora exigiria escolher entre opções com custos diferentes sem ter o
caso de uso que decide:

- relê o usuário em `requireSession()` — uma query a mais em toda requisição
  autenticada, inclusive nas que não precisam do registro completo;
- hook de request do Better Auth — centraliza, mas amarra a decisão ao ciclo de
  vida do pacote e cobre também as rotas que não passam por `requireSession()`;
- `proxy.ts` — barato, mas o proxy não deve tocar o banco;
- revogar as sessões do usuário no momento da desativação — custo zero por
  requisição, mas só funciona se toda desativação passar por esse caminho.

## Decisão

Não implementar nada nesta etapa. Registrar a lacuna no contrato
(`docs/contracts/auth.md`, seção "Ponto em aberto — `isActive` em sessão já
aberta") e condicionar a decisão à existência da gestão de usuários: a escolha do
lugar da checagem tem de ser tomada **na mesma feature** que introduzir a
desativação de usuário, antes de ela ir para produção.

Fica proibido, até lá, tratar `requireSession()` como garantia de que o usuário
está ativo. Quem precisar dessa garantia carrega o registro e checa explicitamente.

## Consequência

- `requireSession()` continua barato: nenhuma query por requisição autenticada.
- Enquanto não houver tela de desativação, o comportamento observável é o mesmo de
  um sistema que revoga na hora, porque o estado que expõe a diferença não é
  alcançável pelo produto.
- A feature de gestão de usuários carrega esta decisão como requisito, não como
  melhoria opcional, e atualiza este ADR com a opção escolhida.
- Se a janela de exposição precisar ser reduzida antes disso, o ajuste mais barato
  é encurtar a expiração da sessão — mitigação, não solução.
