# 025 — TMR e quantidade de chamados em atraso nos objetivos da Operação

Contrato: `docs/contracts/operations-tmr-overdue.md`. Revisa os ADRs 022 e
023 (notas no fim de cada um). Fuso: ADR 009. Prazo gravado: ADR 024.

## Contexto

Os dois objetivos só da equipe na Operação eram **Backlog** (contagem dos
chamados ativos agora) e **Aceite de transferências** (aceitas ÷ revisadas no
mês). Em 2026-11-12 o usuário decidiu que:

- o Backlog, como foto de agora, destoa dos outros objetivos (todos do mês) e
  premia quem resolve rápido mesmo atrasando. Vira **Quantidade de chamados em
  atraso** no mês;
- o Aceite mede se o setor aceita, não se responde. Uma recusa justa piorava o
  número, e um chamado parado sem resposta não pesava nada. Vira **TMR**
  (tempo médio de resposta): quanto tempo o chamado espera na fila de um setor
  até alguém responder.

O card Backlog do Início (`BACKLOG_TICKET_STATUSES`, contrato
`dashboard-overview`) não muda: é outro indicador.

## Decisão

### Quantidade de chamados em atraso (só equipe)

Mês = `[1º do mês 00:00 SP, agora)`, como o resto da Operação (ADR 022).
Entra no setor S, **no máximo uma vez por chamado** (união sem repetição):

1. resolvido ou fechado com `resolved_at` no mês, em S, com
   `resolved_at > due_at`;
2. ativo em S (`OVERDUE_TICKET_STATUSES`) com `due_at < agora`;
3. enviado **por** S no mês já vencido: `ticket_transfer.from_department_id =
S`, `created_at` no mês, `from_due_at < created_at`. Qualquer desfecho do
   envio (pendente, aceito, recusado).

Resolvido no prazo nunca conta; cancelado não conta; pendente não conta para o
destino (`due_at` nulo, ADR 024). Aderente quando a quantidade ≤ o limite.
Dentro do mês o número não cai: sair de S depois de vencido continua contando
pelo item 3.

### TMR (só equipe)

Uma **espera** é o intervalo em que o chamado está na fila de um setor sem
resposta. Fica gravada em `ticket_queue_wait` (`department_id`, `reason`,
`started_at`, `ended_at` nulo enquanto aberta), escrita pelas mutações de
chamado em `app/_lib/data/`, na mesma transação do ato. Três motivos:

| `reason`                 | Setor   | Abre                                          | Fecha                                                                                                     |
| ------------------------ | ------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `abertura`               | origem  | abertura **sem destinatário** (status Aberto) | o chamado ganha destinatário (Assumir, Enviar a um colega), é enviado a outro setor ou é resolvido        |
| `transferencia_recebida` | destino | envio para outro setor                        | aceite ou recusa (`reviewed_at`)                                                                          |
| `devolucao_por_recusa`   | origem  | recusa (volta à origem, status Recusado)      | o chamado deixa Recusado: Atender, Assumir, Enviar a um colega, editar o destinatário, reenviar, resolver |

Chamado aberto já com destinatário (o próprio autor ou um colega) não abre
espera: nunca esteve na fila. Atribuir a um colega fecha a espera de
`abertura` porque tira o chamado da aba "Em aberto" da Fila do setor
(`DEPARTMENT_QUEUE_TAB_RULES.open`: sem destinatário), que é a fila de fato.
Devolver um chamado à fila (destinatário apagado na edição) **não** abre
espera nova: o setor já respondeu uma vez.

No máximo uma espera aberta por chamado (índice único parcial). O ato que
fecha uma e abre outra (envio, recusa) fecha primeiro.

**Recorte do mês: a espera conta no mês em que termina; aberta, conta no mês
corrente com a duração até agora.** A duração é inteira
(`fim − started_at`), sem cortar no dia 1º.

- Esperas abertas entram (decisão recomendada): sem isso, não responder nunca
  pioraria o indicador.
- Contar no mês do término, e não ratear entre meses: o TMR é uma média de
  esperas, não uma soma de horas. Ratear partiria uma espera em duas médias e
  faria uma espera de 40 dias parecer curta no mês em que foi respondida. Cada
  espera fechada entra em exatamente um mês.

TMR = média das durações das esperas de S que contam no mês. **Sem nenhuma
espera, o setor é aderente** (valor 0, nunca "Sem dados"). Aderente quando
TMR ≤ `tmr_max_hours` × 1h.

### Colunas de `department_goal`

- `backlog_limit` → `overdue_tickets_limit` (rename de verdade, valores ficam).
- `transfer_acceptance_min_percent` apagada (os percentuais se perdem;
  aprovado pelo usuário).
- `tmr_max_hours smallint` **nulo** (`check >= 1`): setores com objetivo já
  salvo ficam sem TMR até alguém salvar de novo. Na tela, o indicador aparece
  "Sem objetivo" e não reprova. O formulário exige o campo (1–999 h).

### Dados

`0027_tmr_overdue_tickets_goals` (drizzle-kit; rename confirmado no prompt) e
`0028_backfill_ticket_queue_wait` (custom, só dados, idempotente). O backfill
reconstrói as esperas pelo histórico:

- `transferencia_recebida`: cada `ticket_transfer`, de `created_at` a
  `reviewed_at` (pendente fica aberta);
- `abertura`: cada `criacao` com status Aberto e sem destinatário, até o
  primeiro evento de histórico que muda status, destinatário ou setor, ou o
  primeiro envio, o que vier antes;
- `devolucao_por_recusa`: cada `transferencia_rejeitada`, pela mesma regra de
  término.

Sem término e com o chamado ainda no estado de espera, fica aberta; sem
término e fora desse estado (dado antigo inconsistente), não é criada. Só o
mês corrente aparece na Operação, então imprecisão em dados antigos não chega
à tela; esperas do mês corrente seguem o regime atual, que o histórico
descreve sem ambiguidade.

## Alternativas descartadas

- **Derivar as esperas do histórico a cada leitura.** Possível, mas cada
  leitura repetiria a reconstrução do backfill (eventos que fecham, envio
  seguinte, estado atual). Gravar no ato deixa a regra num lugar só.
- **Espera de devolução terminando em "Encaminhado".** Equivaleria a contar
  como resposta só o Atender. A decisão do usuário inclui assumir, reenviar e
  resolver; enviar a um colega é o mesmo gesto de despacho da abertura.
- **Setor sem espera como "Sem dados".** Descartado pelo usuário.

## Trabalho futuro (fora do escopo)

O admin do setor ou o Diretor poderá classificar uma recusa como **devida** ou
**indevida**. Uma recusa devida poderá deixar de penalizar o TMR (por exemplo,
excluindo a espera `transferencia_recebida` daquele envio, ou a
`devolucao_por_recusa` que ela gerou). Nada disso é implementado agora; a
tabela já guarda o motivo de cada espera, o que permite filtrá-las depois sem
mudar o desenho.

## Consequências

- Todo caminho de escrita que abre, envia, aceita, recusa, assume, atribui,
  atende, edita o destinatário ou resolve precisa chamar os helpers de espera.
  Esquecer um deixa espera aberta para sempre (TMR cresce) ou nunca aberta
  (TMR melhor do que é). O `df-qa` confere cada ato.
- Um chamado devolvido à fila pela edição fica sem espera até alguém
  assumi-lo.
- Mudar o limite no meio do mês reavalia o mês inteiro (ADR 022).
- Chamados em atraso não diminuem dentro do mês; zeram no dia 1º, menos os
  ativos ainda vencidos, que voltam a contar no mês novo.
