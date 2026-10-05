# 014 — Encerramento agendado de chamados resolvidos

## Contexto

Um chamado `resolvido` fica aberto a correções do autor (inclusive da solução)
por 7 × 24 h a partir de `ticket.resolved_at`. Depois disso ele está encerrado:
não aceita edição nem comentário. O estado `fechado` precisa chegar ao banco
para que listas, abas ("Fechados") e linha do tempo reflitam o encerramento.

Nada na aplicação roda sem alguém pedir: Server Action exige um usuário na tela.
O projeto vai para a Vercel, cujo agendador (Vercel Cron) chama uma URL do
deploy por HTTP `GET`, em UTC. No plano Hobby o cron roda no máximo uma vez por
dia e o horário tem folga de até uma hora. A seção 3 do `stack.md` só permitia
rota de API para o Better Auth e para webhooks.

## Decisão

**Trava pelo domínio; o job só registra.** "Este chamado está encerrado?" é
respondido por `isTicketLocked(status, resolvedAt, now)`
(`app/_lib/domain/ticket-closure.ts`): `fechado`/`cancelado`, **ou** `resolvido`
com a janela vencida (`resolved_at` nulo conta como vencida). A página, as
transações de edição e de comentário usam essa função com o `now` do momento. O
bloqueio vale no instante em que a janela vence, independente de o job já ter
rodado. O job apenas grava o que o domínio já decidiu: `status = fechado`,
`closed_at`, `updated_at` e uma linha `encerramento` no histórico.

**Rota de cron como exceção da seção 3.** `app/api/cron/**/route.ts`, dono
`df-actions`, com a forma de uma action: confere o chamador, chama
`app/_lib/data/`, revalida e devolve JSON curto. Sem SQL e sem regra inline. A
primeira é `GET /api/cron/close-resolved-tickets`.

**Agenda.** `vercel.json`, `0 6 * * *` (06:00 UTC = 03:00 em São Paulo, fora do
expediente). Um chamado pode ficar até ~25 h com o badge `Resolvido` depois de
vencer, mas já travado.

**Autenticação.** `Authorization: Bearer ${CRON_SECRET}`, que a Vercel envia
quando a variável existe no projeto. Comparação em tempo constante. Segredo
ausente, vazio ou diferente → `401` sem tocar o banco. O `proxy.ts` não exige
sessão em `/api/cron/*` (a rota se autentica sozinha).

**Ator do sistema.** `ticket_history.changed_by` passa a aceitar nulo (FK
`restrict` mantida, migration `0010`). Nulo significa "o sistema"; a linha do
tempo exibe `Sistema` (`SYSTEM_ACTOR_LABEL`). Nenhum usuário fictício é criado.

**Concorrência.** Uma transação por execução, `for update skip locked` nas
linhas candidatas: duas execuções simultâneas (a Vercel não protege contra
sobreposição) ou uma edição em curso não geram encerramento duplicado nem
esperam; o que ficou travado é fechado na próxima execução.

## Consequências

- O primeiro cron após o deploy fecha em lote todo `resolvido` já vencido,
  inclusive os do seed demo.
- Quem lê `ticket_history.changed_by` precisa tratar nulo (`left join` em
  `users`); `inner join` faz a linha do sistema sumir sem erro.
- Rodar a rota localmente exige `CRON_SECRET` no `.env`; sem ele a rota sempre
  responde `401`.
- Reabertura de chamado `resolvido`/`fechado` continua fora; quando entrar, usa
  o mesmo `isTicketLocked` como referência.
- Se o plano mudar para Pro, a frequência pode subir sem mudar a regra: o
  bloqueio nunca dependeu do job.
