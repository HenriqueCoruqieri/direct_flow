# Plano — Início: visão geral do setor

Aprovado em 2026-10-23 via `/consult`. Substitui, no que diz respeito aos cards
do Início, o plano `docs/plans/dashboard-home.md` (2026-09-24): o card
"Principal ofensor" do topo e a grade de dois cards (`grid-cols-2
lg:max-w-3xl`) ficam superados. O shell, o filtro de período, as regras de fuso
(ADR 009) e a URL continuam valendo como lá.

Contratos por etapa: Etapa 1 em `docs/contracts/dashboard-overview.md`; Etapas
2 e 3 ganham seção própria no mesmo arquivo quando forem abertas.

## Referência visual

Print enviado pelo usuário, descrito em texto: página "Início · 15 out 2026 ·
Suporte", filtro `Hoje · Semana · Mês · Personalizado` e, abaixo, três linhas de
cards (fundo `surface`, borda `border-subtle`, cantos arredondados).

| Linha | Esquerda                                                                                     | Direita                                                                   |
| ----- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 1     | 4 cards iguais: Chamados no período · Taxa de resolução · Tempo médio de resolução · Backlog | —                                                                         |
| 2     | ~3/5: Principal ofensor (ranking de tags com barras)                                         | ~2/5: Maiores atrasos (Nº, Título, Prioridade, Vencimento, "Ver na fila") |
| 3     | ~3/5: Últimos 7 dias (linhas Abertos × Resolvidos)                                           | ~2/5: Transferências entre setores (3 mini-cards + lista)                 |

No print o quarto card da linha 1 era "Principal ofensor"; por decisão do
usuário ele vira **Backlog**, na última posição, e o ofensor desce para a linha
2 como ranking.

## Decisões do usuário

| Tema               | Decisão                                                                                                                                                                                           |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Escopo             | Setor de quem vê, `ticket.current_department_id`, inclusive a Diretoria (vê só o próprio setor aqui)                                                                                              |
| Período            | Filtra a linha 1 inteira (exceto o Backlog, que é situação atual) e o Principal ofensor. Maiores atrasos e Transferências são situação atual. Últimos 7 dias é sempre hoje e os 6 dias anteriores |
| Vencimento         | Calculado: `created_at` + prazo da prioridade (Crítica 4h, Alta 8h, Média 24h, Baixa 72h). Regra pura no domínio; `due_at` continua sem gravação                                                  |
| Prioridade         | Continua nascendo `media` e sem tela que altere; alterar prioridade é outra feature                                                                                                               |
| Gráfico            | Recharts via `chart` do shadcn. O orquestrador atualiza `stack.md` e `df-ui.md` na Etapa 3, com aprovação do usuário                                                                              |
| Backlog            | Quantidade **real**; total de horas **ilustrativo**, marcado na tela                                                                                                                              |
| "1ª resposta em …" | **Ilustrativo**, marcado na tela (`first_response_at` não é gravado)                                                                                                                              |

## Definições das métricas

Todas as datas no fuso `America/Sao_Paulo`; período sempre `[start, end)`
(`resolvePeriodRange`). "Setor" = `departmentId` da sessão.

### Linha 1 (Etapa 1)

| Card                     | Valor                                                                                                                                                                  | Linha de apoio                                                                                                                                                                          |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chamados no período      | `count` de `ticket` do setor com `created_at` no período, todos os status (como hoje)                                                                                  | `+N recebidos de outros setores`: `ticket_transfer` `aprovado`, `to_department_id` = setor, `reviewed_at` no período. `N = 1` → singular; `N = 0` → "Nenhum recebido de outros setores" |
| Taxa de resolução        | Dos chamados do card anterior, % com status `resolvido` ou `fechado`, arredondado **para baixo** (100% só se todos). Barra 0–100%                                      | Sem chamados no período: valor `—`, sem barra, "Nenhum chamado no período"                                                                                                              |
| Tempo médio de resolução | Média de `resolved_at − created_at` dos chamados do setor com `resolved_at` no período e status `resolvido`/`fechado`. Formato `3h 40min` (unidade menor)              | "1ª resposta em 22min" + marca **Ilustrativo**. Sem resolução no período: valor `—`, "Nenhum chamado resolvido no período", sem marca                                                   |
| Backlog                  | `count` de `ticket` do setor nos status da Fila sem `aguardando_aprovacao` (`aberto`, `em_analise`, `encaminhado`, `recusado`, `em_andamento`). Não depende do período | "36h em backlog" = quantidade × 2h, marca **Ilustrativo**. Backlog `0`: "Nenhum chamado em backlog", sem marca                                                                          |

Duração (`durationParts`/`formatDuration` em `app/_lib/date.ts`), truncada em
minutos: `< 1min` · `22min` · `3h` · `3h 40min` · `1d 2h` (a partir de 1 dia os
minutos caem) · `2d`.

Por que o backlog **não** inclui `aguardando_aprovacao`: pelo ADR 016 o chamado
pendente já está no setor de destino, mas ninguém do setor o aceitou; desde
2026-10-15 ele não aparece na Fila do destino, só em Aprovações, e na Etapa 3
será contado em "Aguardando nosso aceite". Contá-lo no backlog duplicaria o
número e divergiria da Fila. `BACKLOG_TICKET_STATUSES` reaproveita
`DEPARTMENT_QUEUE_OPEN_STATUSES` para que Fila e backlog não se separem.

### Linha 2 (Etapa 2)

- **Principal ofensor** (~3/5): top N tags **do próprio setor**
  (`tag.department_id`) nos chamados do setor com `created_at` no período, as
  mesmas regras do contrato anterior (tag inativa conta, agrupa por `tag.id`,
  tag de outro setor não entra, empate por `lower(name)` e `id`). Destaque da
  primeira: nome, "N chamados · X% do volume" (X = chamados com a tag ÷
  chamados no período, arredondado para baixo). Lista com contagem e barra
  proporcional à maior. Quantos itens couberem no card; o `df-data` limita a
  um N fixo (proposta: 6) e a UI mostra os que cabem. Nenhuma tag: vazio
  definido no contrato da etapa.
- **Maiores atrasos** (~2/5): chamados do setor em `BACKLOG_TICKET_STATUSES`
  cujo vencimento calculado (`created_at` + prazo da prioridade) já passou,
  maior atraso primeiro, limite pequeno (proposta: 5). Colunas Nº, Título,
  Prioridade, Vencimento; link "Ver na fila" para `/queue`. Situação atual,
  não depende do período. O prazo vive em `app/_lib/domain/` como
  `Record<TicketPriority, number>`; o SQL recebe os prazos como parâmetro (ou
  `case` montado a partir da constante), nunca valor literal.

### Linha 3 (Etapa 3)

- **Últimos 7 dias** (~3/5): por dia (hoje e os 6 anteriores, fuso SP),
  quantos chamados do setor foram abertos (`created_at`) e quantos resolvidos
  (`resolved_at`, status `resolvido`/`fechado`). Eixo X "Sex 9 … Hoje", rótulo
  no último ponto. Dias sem dado valem 0 (série completa de 7 pontos, montada
  no domínio a partir das chaves de dia). Não depende do filtro de período.
- **Transferências entre setores** (~2/5), situação atual:
  - "Aguardando nosso aceite" (destaque `warning`): pendentes com
    `to_department_id` = setor (mesmo número do selo de Aprovações).
  - "Enviados, pendentes": pendentes com `from_department_id` = setor.
  - "Recusados por outros": `rejeitado` com `from_department_id` = setor e
    `reviewed_at` no período.
  - Lista das pendentes para o setor, mais antigas primeiro:
    "#1068 de RH · há 3h 20min" (`formatTicketNumber`, nome do setor de
    origem, tempo desde o envio com a duração de `app/_lib/date.ts`).

## Etapas e ondas

### Etapa 1 — grade da página e linha 1

- **Onda 0 — `df-architect`** (feito): `DashboardOverview` e
  `DashboardOverviewCard` em `app/_lib/types/dashboard.ts`, `DurationPart` em
  `app/_lib/types/duration.ts`, duração em `app/_lib/date.ts`, textos, valores
  ilustrativos e regra da taxa em `app/_lib/domain/dashboard.ts`, este plano e
  o contrato.
- **Onda 1 — `df-data`**: `findDashboardOverview` substitui
  `findDashboardSummary`.
- **Onda 1/2 — `df-ui`**: grade da página pronta para três linhas, linha 1 com
  4 cards, esqueleto, marca de ilustrativo; sai o "Principal ofensor" do topo.
- `df-actions`, `df-auth`, `df-email`: não participam (sem mutação).
- **Onda 3 — `df-reviewer`**; **Onda 4 — `df-qa`** (cenários do contrato).

### Etapa 2 — linha 2

Contrato próprio (tipos de ranking e de atraso, prazo por prioridade,
`listDashboardTopTags`, `listOverdueTickets`), dois cards lado a lado em `lg`.

### Etapa 3 — linha 3

O orquestrador atualiza `.claude/rules/stack.md` (Recharts via `chart` do
shadcn, linha nova na tabela da seção 1) e `.claude/agents/df-ui.md` (pacote na
lista do agente), com aprovação do usuário, **antes** da Onda 0. Depois:
contrato (série de 7 dias, contadores e lista de transferências, "há X"),
`df-data`, `df-ui` (`npx shadcn@latest add chart`).

## Riscos

1. **Maiores atrasos cheio desde o primeiro dia.** Com todo chamado em
   `media`, qualquer ativo com mais de 24h aparece atrasado; o card vai parecer
   alarmante e a ordem será praticamente "mais antigo primeiro". Aceito até
   existir a feature de prioridade; o contrato da Etapa 2 fixa um limite curto.
2. **Ilustrativo lido como real.** "1ª resposta em 22min" e "36h em backlog"
   não medem nada. Mitigação: marca textual "Ilustrativo" visível (não só cor
   nem só tooltip) ao lado da linha, descrição em tooltip, e nenhuma marca
   quando o card está vazio (o valor de exemplo não aparece sozinho). Os
   números reais (quantidade de backlog, chamados, taxa, tempo médio) nunca
   levam a marca.
3. **"+N recebidos" não é parcela do total.** O total conta por `created_at`;
   o "+N" conta aceites por `reviewed_at`. Um chamado aberto em outro mês e
   aceito hoje entra no "+N" de Hoje sem entrar no total. Definição aprovada;
   registrada no contrato para o `df-qa` não tratar como defeito.
4. **Pendente conta no total e não no backlog.** Chamado enviado ao setor e
   ainda não aceito está em `current_department_id` = setor; se criado no
   período, conta em "Chamados no período" (regra de hoje) mas não no backlog.
5. **Desempenho.** A linha 1 varre os chamados do setor uma vez (prefixo do
   `ticket_dept_status_idx`) com agregados `filter`; o backlog não tem recorte
   de data, então a varredura é do histórico do setor. Suficiente no volume
   atual; o `df-data` roda `EXPLAIN` e reporta se passar a ser problema. As
   Etapas 2 e 3 acrescentam leituras independentes (cada card em seu
   `Suspense`) para não atrasar a linha 1.
6. **Fuso.** Toda borda de dia vem de `resolvePeriodRange` e, na Etapa 3, de
   `zonedDateTime`/`addDaysToKey`; nada de `date_trunc` no SQL da aplicação.
   As consultas de conferência do `df-qa` usam `at time zone
'America/Sao_Paulo'` explicitamente.
7. **MCP `postgres` só leitura** (ADR 013). Os números esperados saem de
   consultas no banco; toda preparação de dado é feita pela interface, em QA
   Suporte e QA Infra, sem tocar #65–#68 nem o gabarito da Diretoria.

## Critério de pronto (feature completa)

1. Linha 1 com os 4 cards na ordem do print, números batendo com as consultas
   de conferência em cada período, vazios definidos, marcas de ilustrativo só
   onde o dado é exemplo.
2. Linha 2 e linha 3 conforme as definições acima, cada card com vazio próprio.
3. 390 px sem rolagem horizontal; console e dev server limpos.
4. `npx tsc --noEmit`, `npm run lint`, `npm run build`; `df-reviewer` sem
   bloqueante; `df-qa` aprovado em cada etapa.
