# Plano — Dashboard Início

Implementado em 2026-09-24. Contrato: `docs/contracts/dashboard.md`.

Aprovado em 2026-09-24 via `/consult`. Referência visual: canvas "Direct Flow — Telas" (https://claude.ai/artifact/QFARH48WWbuxmM1V8N1479), artboards "Fila do setor · desktop" (claro e escuro) para o shell desktop e "Início (dashboard)" (claro e escuro) para cards e cabeçalho mobile.

## Escopo

**Entra**

- Layout compartilhado em `app/(app)/`, fiel ao artboard "Fila do setor · desktop" nos dois temas:
  - sidebar de 232px (`surface-bar`, borda direita `border-subtle`) com logo "Direct Flow" e **só** o item "Início" (ícone `House` do lucide), itens de 40px, ativo com fundo `surface-active` e ícone em `brand`;
  - card do usuário no rodapé (avatar com iniciais, nome, "Setor · Papel") que abre um dropdown com **Tema** e **Sair**;
  - barra superior de 68px com campo de busca (máx. 420px, placeholder "Buscar por #, título ou tag", sem funcionalidade) e botão "Novo chamado" (sem ação). A barra fica no layout, não na página, porque no Figma ela é parte do shell.
- Abaixo de `lg`: sidebar oculta; cabeçalho do Início mobile (avatar + "Olá, <primeiro nome>" + "Setor · Papel"), sem navegação.
- Página `/dashboard` (Início): título Sora 22px com subtítulo do intervalo, filtro de período em pílulas (`Hoje · Semana · Mês · Personalizado`, estilo das pílulas de 32px da Fila desktop), dois cards no estilo dos cards de estatística do Início mobile (raio 18px, rótulo 13px, número Sora 32px): **Chamados no período** e **Principal tag ofensora** (nome + quantidade). Miolo vazio.
- Dados de exemplo no seed, atrás de flag.

**Fora**: busca funcional, tela de novo chamado, itens Fila/Aprovações/Tags, notificações, gráficos, painel de detalhe lateral da Fila.

## Regras decididas

| Regra               | Definição                                                                                                                                               |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Escopo dos chamados | `ticket.current_department_id = setor do usuário`, igual para admin e membro                                                                            |
| Âncora do período   | `ticket.created_at`                                                                                                                                     |
| Períodos            | Calendário no fuso `America/Sao_Paulo`: hoje; semana de segunda a domingo; mês corrente; personalizado com `de` e `ate`, ambos inclusivos               |
| Intervalo           | Meio-aberto `[start, end)`                                                                                                                              |
| Período padrão      | `hoje`                                                                                                                                                  |
| Tag ofensora        | Tag **do próprio setor** (`tag.department_id`) mais aplicada nos chamados em escopo no período; empate por nome (ordem alfabética); nenhuma → exibe "—" |
| Estado do filtro    | URL: `?periodo=hoje\|semana\|mes\|personalizado`, `&de=YYYY-MM-DD&ate=YYYY-MM-DD`. Parâmetro inválido cai no padrão, sem erro                           |

## Impacto no contrato

- Schema: nenhuma mudança. Migration: nenhuma.
- `app/_lib/date.ts` (novo): único importador de `dayjs` (plugins `utc`, `timezone`). Expõe resolução de período → `{ start: Date, end: Date }` e formatação do intervalo para o subtítulo, além da conversão `Date` ↔ `YYYY-MM-DD` usada pelo calendário.
- `app/_lib/validation/dashboard.ts`: schema Zod dos `searchParams` (`periodo` enum; `de`/`ate` obrigatórios no personalizado, formato `YYYY-MM-DD`, `ate >= de`).
- `app/_lib/types/`: `DashboardSummary = { ticketCount: number; topTag: { name: string; count: number } | null }`.
- `docs/contracts/dashboard.md`: contrato do fluxo.
- Variável de ambiente nova `SEED_DEMO` (`.env.example`).

## Ondas e agentes

- **Onda 0 — `df-architect`**: instala `dayjs`; `app/_lib/date.ts`, schema Zod, tipo, `docs/contracts/dashboard.md`, `SEED_DEMO` no `.env.example`.
- **Onda 1 (paralelo)**
  - **`df-data`**: `app/_lib/data/dashboard.ts` com `findDashboardSummary(departmentId, range)` (contagem + agregação `ticket_tag ⋈ tag ⋈ ticket`, `GROUP BY`, `LIMIT 1`); leitura do usuário com nome do setor para o card; `db/seed.ts` ganha bloco demo que roda só com `SEED_DEMO=true` e quando o setor não tem chamados — ~4 tags e ~30 chamados distribuídos entre hoje, esta semana, este mês e mês anterior, incluindo chamados entre 21h e 0h de Brasília para testar fuso.
  - **`df-ui`** (shell): `npx shadcn@latest add calendar popover` (trocar import do `cn`); `app/(app)/layout.tsx`, sidebar, item de navegação ativo, menu do usuário (reusa `signOut` e tema existentes), cabeçalho mobile, barra superior; move `sign-out-button` e remove `app/dashboard/`.
- **Onda 2 — `df-ui`** (tela): `app/(app)/dashboard/page.tsx` Server Component — valida `searchParams`, resolve período via `@/app/_lib/date`, chama `df-data`, renderiza cards. Pílulas são `Link`; só "Personalizado" é Client Component (popover + calendário + `router.push`).
- **Onda 3 — `df-reviewer`**: `tsc`, lint, build, limites entre camadas, ausência de import de `date-fns`.
- Não participam: `df-actions` (sem mutação nova), `df-auth` (URL `/dashboard` preservada), `df-email`.

## Riscos

1. Fuso: servidor provavelmente em UTC; qualquer cálculo de "hoje" fora do `date.ts` joga chamados das 21h–0h no dia errado.
2. `react-day-picker` depende de `date-fns` internamente (transitivo). Datas do calendário convertidas por `@/app/_lib/date` antes da URL; ninguém importa `date-fns`.
3. Não há Início desktop no Figma; cards e filtro adaptam a linguagem da Fila desktop e dos cards mobile — pode pedir ajuste visual.
4. `searchParams` no Next 16 é `Promise`; ler o guia em `node_modules/next/dist/docs/` antes.
5. Seed demo em produção: contido pela flag `SEED_DEMO`, desligada por padrão.

## Critério de pronto

- `/dashboard` com sidebar fixa ("Início" ativo), barra superior e card do usuário com o setor real; menu do card troca tema e faz logout.
- Com seed demo, cada pílula muda os dois números para os valores esperados; personalizado respeita as duas datas inclusivas.
- Setor sem chamados mostra `0` e "—" sem erro.
- Abaixo de `lg`, sidebar some e aparece o cabeçalho mobile.
- Dois temas batem com os artboards claro e escuro.
- `npx tsc --noEmit`, `npm run lint` e `npm run build` passam; `df-reviewer` sem bloqueante.
