# Plano — Prioridade na abertura e SLA por chamado

Aprovado em 2026-10-26 via `/consult`. Ainda não iniciado.

Altera decisões de planos anteriores: em `docs/plans/ticket-creation.md` o
autor deixa de abrir o chamado sempre em `media` e passa a escolher a
prioridade; em `docs/plans/dashboard-overview.md` os prazos por prioridade
(Crítica 4h, Alta 8h, Média 24h, Baixa 72h) e o total de horas ilustrativo do
card Backlog ficam superados pelas definições abaixo.

## Escopo

### Entra

- **Prioridade na abertura.** O autor escolhe a prioridade num Select do
  formulário de abertura (`app/(app)/_components/new-ticket-dialog.tsx`),
  pré-selecionado em Média.
- **SLA em horas corridas** contadas a partir de `ticket.createdAt`:

  | Prioridade | SLA |
  | ---------- | --- |
  | Crítica    | 3h  |
  | Alta       | 6h  |
  | Média      | 12h |
  | Baixa      | 24h |

  O relógio não pausa em transferência nem em aprovação, e não reinicia
  quando o chamado muda de setor.

- **Detalhe `/tickets/{id}`.** Prioridade e SLA entram no card "Detalhes"
  (`ticket-detail-fields.tsx`); o badge de prioridade sai do cabeçalho
  (`ticket-detail-header.tsx`).
- **Regra de exibição do SLA** (a mesma no detalhe e nas tabelas):

  | Situação do chamado        | Exibição                                                            |
  | -------------------------- | ------------------------------------------------------------------- |
  | Ativo                      | Data/hora de vencimento; em vermelho se já venceu                   |
  | Resolvido ou fechado       | "No prazo" ou "Fora do prazo" (vencimento comparado a `resolvedAt`) |
  | Cancelado sem `resolvedAt` | Neutro                                                              |

- **Tabelas `/tickets` e `/queue`.** Coluna "SLA" logo após "Aberto em", com a
  regra acima. As duas compartilham
  `app/(app)/_components/ticket-list-columns.tsx`.
- **Início, card Backlog.** A contagem total (já real) continua. A linha
  fictícia "Xh em backlog" (quantidade × 2h) vira real: horas acumuladas =
  soma de (agora − `createdAt`) dos chamados do backlog do setor, seguida de
  "· N em atraso" (chamados do backlog com SLA vencido). Com zero atrasados,
  só as horas. A marca "Ilustrativo" sai desse card.

### Fica de fora

- Prioridade automática (próxima feature).
- Edição da prioridade depois da abertura.
- Horário comercial e feriados.
- Pausa ou reinício do relógio.
- E-mail de SLA estourado.
- Atualização em tempo real.
- O "1ª resposta em 22min" fictício do card Tempo médio continua como está.

## Impacto no contrato (`df-architect`)

- `app/_lib/domain/ticket-due.ts`: `TICKET_PRIORITY_DUE_HOURS = { critica: 3,
alta: 6, media: 12, baixa: 24 }`. O card "Maiores atrasos" do Início herda os
  novos prazos.
- Função pura de status do SLA, devolvendo `"on_time" | "overdue" | "met" |
"missed"`, mais o estado neutro para cancelado sem `resolvedAt` (a forma
  fica a critério do contrato). Rótulos "No prazo" / "Fora do prazo" e rótulo
  da coluna "SLA".
- Zod da abertura ganha `priority` (enum, default `media`);
  `INITIAL_TICKET_PRIORITY` passa a ser só o default do formulário.
- Tipos das linhas de `/tickets` e `/queue` (`app/_lib/types/my-tickets.ts`,
  `app/_lib/types/department-queue.ts`) ganham `priority` e `resolvedAt`.
- `DashboardOverview` ganha `backlogAgeMs` e `overdueBacklogCount`; saem
  `illustrativeBacklogMs` e o `backlogHoursHint` fictício, e entra o hint real.
- Contratos a atualizar: `docs/contracts/ticket-creation.md` (cai "o autor não
  escolhe prioridade"), `docs/contracts/dashboard-overview.md`,
  `docs/contracts/my-tickets.md`, `docs/contracts/department-queue.md`.
- ADR novo: SLA em horas corridas, calculado (não gravado em `due_at`).
  Consequência: mudar a tabela de horas altera o vencimento de chamados
  antigos.

## Migration

Nenhuma. O enum e a coluna `priority` já existem; o vencimento é calculado.

## Ondas e agentes

- **Onda 0 — `df-architect`**: constantes, função de status, Zod, tipos,
  contratos, ADR.
- **Onda 1 — `df-data` ∥ `df-ui`.**
  - `df-data`: `createTicket` grava a prioridade recebida (no ticket e no
    `toPriority` do evento de criação); as listas devolvem `priority` e
    `resolvedAt`; o overview calcula `backlogAgeMs` e `overdueBacklogCount` na
    mesma consulta do backlog; extrair um helper SQL único de vencimento,
    reutilizado por "Maiores atrasos" e pelo overview.
  - `df-ui`: coluna SLA, card Detalhes, card Backlog.
- **Onda 2 — `df-actions` ∥ `df-ui`.**
  - `df-actions`: a action de criação repassa a prioridade validada.
  - `df-ui`: Select de prioridade no formulário de abertura.
- **Onda 3 — `df-reviewer`.**
- **Onda 4 — `df-qa`.**
- `df-email` e `df-auth`: não participam.

## Riscos

1. **Retroatividade.** Os chamados existentes estão todos em `media` e passam
   de 24h para 12h de prazo; vários ficarão vermelhos logo após o deploy.
2. **SQL de vencimento duplicado** se não for extraído num helper único.
3. **Vermelho só atualiza ao recarregar a página**, já que o render é no
   servidor.
4. **Horas acumuladas crescem sem parar** (10 chamados parados somam 240h por
   dia); o sinal de problema é o "N em atraso", não as horas.
5. **Cancelado** não tem noção clara de SLA e fica neutro.

## Critério de pronto

1. Chamado aberto como Crítica mostra vencimento = abertura + 3h no card
   Detalhes e na coluna SLA.
2. Chamado vencido aparece em vermelho em `/tickets` e `/queue`.
3. Resolvido mostra "No prazo" ou "Fora do prazo" conforme `resolvedAt`.
4. Card Backlog mostra horas acumuladas e "N em atraso" iguais ao cálculo no
   banco, sem a marca "Ilustrativo".
5. `npx tsc --noEmit`, `npm run lint` e `npm run build` passam.
