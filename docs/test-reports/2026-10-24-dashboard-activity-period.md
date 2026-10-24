# Relatório de testes — Início: gráfico da linha 3 segue o período

- **Data:** 2026-10-24
- **Contrato:** `docs/contracts/dashboard-overview.md` (seção "Revisão 2026-10-24 — o gráfico da linha 3 segue o período", AP1–AP16)
- **Commit:** `26329a8` · alterações não comitadas: sim
- **Ambiente:** `http://localhost:3000`, `next dev`, banco de desenvolvimento (Suporte, id 14). Hoje = sábado, 2026-10-24, ~15h30 em SP. Só leitura: nenhum dado criado ou alterado.
- **Resultado:** 14 de 16 passaram · 0 falharam · 0 bloqueados · 2 não executados (AP2 e AP3, sem dado de hoje)

## Pré-requisitos

- Dev server: `/login` respondeu 200.
- MCP `playwright`, `next-devtools` e `postgres` disponíveis (consulta ao banco funcionou).
- Usuários (fornecidos pelo usuário, não os do seed QA): Administrador `cazalbe@gmail.com` (admin, Suporte, ativo) e Membro `rodalv@gmail.com` (member, Suporte, ativo). Conferidos no banco.
- `RESEND_API_KEY` preenchida, sem efeito: nenhum cenário envia e-mail.

## Cenários

| #    | Cenário                                              | Papel  | Status                             |
| ---- | ---------------------------------------------------- | ------ | ---------------------------------- |
| AP1  | Hoje, 1280 px: título, período, legenda              | Admin  | PASSOU (ver Observações 1)         |
| AP2  | Hoje: eixo 0h–23h, valores, linha para na hora atual | Admin  | NÃO EXECUTADO                      |
| AP3  | Hoje: último ponto e tabela                          | Admin  | NÃO EXECUTADO                      |
| AP4  | Semana                                               | Admin  | PASSOU                             |
| AP5  | Mês                                                  | Admin  | PASSOU                             |
| AP6  | Personalizado 2026-10-10 a 2026-10-24                | Admin  | PASSOU                             |
| AP7  | Personalizado 2026-08-01 a 2026-10-24                | Admin  | PASSOU                             |
| AP8  | Personalizado de um dia, por hora                    | Admin  | PASSOU (ver Observações 2)         |
| AP9  | Soma de Abertos = "Chamados no período"              | Admin  | PASSOU                             |
| AP10 | Trocar o período                                     | Admin  | PASSOU (ver Observações 3)         |
| AP11 | Altura dos cards da linha 3, 1280 px                 | Admin  | PASSOU                             |
| AP12 | 390×844                                              | Admin  | PASSOU                             |
| AP13 | Cursor em balde futuro                               | Admin  | PASSOU (só Mês; ver Observações 4) |
| AP14 | Membro: Hoje e Mês                                   | Membro | PASSOU                             |
| AP15 | Período sem chamado                                  | Ambos  | PASSOU                             |
| AP16 | Console e dev server limpos                          | Ambos  | PASSOU                             |

## Evidência por cenário

Valores esperados vieram das consultas `AH`/`AD`/`AW` do contrato, via MCP `postgres`, com `dep = 14`.

- **AP1.** Hoje: título "Abertos × resolvidos", linha `24 out 2026 · por hora`. Suporte não tem chamado aberto nem resolvido hoje (`AH(14, hoje)` fica zerada; nada em `ticket.created_at` no dia 24), então o card mostra o estado vazio (sem legenda). Screenshot `.qa-output/ap1-hoje.png`.
- **AP4.** Semana: `19–25 out 2026 · por dia`; rótulos `Seg 19 · Ter 20 · Qua 21 · Qui 22 · Sex 23 · Hoje · Dom 25`; tabela com 6 linhas (19 a 24). Valores batem com `AD`: sexta 23 = 3 abertos, demais 0. Linha para em "Hoje", nada no domingo, marcador em "Hoje" com `0` e `0`. Screenshot `.qa-output/ap4-semana.png`.
- **AP5.** Mês: `1–31 out 2026 · por dia`; tabela com 24 linhas (dia 1 a 24), valores iguais à `AD` (6 out 3/0, 8 out 3/2, 9 out 2/0, 12 out 6/2, 14 out 1/0, 15 out 1/2, 23 out 3/0). Rótulos visíveis `Qui 1, Sáb 3, Ter 6, Qui 8, Dom 11, Qua 14, Sáb 17, Ter 20, Sex 23, Seg 26, Sáb 31`; linha termina em "Hoje".
- **AP6.** `10–24 out 2026 · por dia`; 15 pontos, `Sáb 10` até `Hoje`; marcador no último. Soma de Abertos = 11.
- **AP7.** `1 ago – 24 out 2026 · por semana`; 13 pontos, primeiro `1–2 ago`, último `19–24 out`; coluna `Semana`; tooltip do primeiro ponto `1 a 2 de agosto de 2026`. Tabela confere com `AW`: 5–11 out 8/2, 12–18 out 8/4, 19–24 out 3/0, demais 0/0. Marcador no último (3 e 0).
- **AP8.** `2026-10-20` (dia sem chamado) cai no vazio (ver AP15). Usei `2026-10-23`, que tem 3 chamados abertos às 19h (`AH(14, '2026-10-23')`: hora 19 = 3/0). Resultado: `23 out 2026 · por hora`, 24 pontos, coluna `Hora`, 24 linhas na tabela (`0h às 1h` … `23h às 0h`), tooltip `19h às 20h` com Abertos 3 / Resolvidos 0, marcador e rótulos no `23h`. Screenshot `.qa-output/ap8-hora-1023.png`.
- **AP9.** Soma dos Abertos na tabela × "Chamados no período": Semana 3 = 3; Mês 19 = 19; 10–24 out 11 = 11; 1 ago–24 out 19 = 19; 23 out por hora 3 = 3; Hoje 0 = 0.
- **AP10.** Cliques nos botões Hoje → Semana → Mês → Hoje: a cada troca título, linha do período e pontos corresponderam ao período novo. Atrasos e transferências não ganharam esqueleto. Em carga direta (`goto ?periodo=mes`), o esqueleto do card apareceu com `aria-label="Carregando abertos × resolvidos"` e a linha `1–31 out 2026 · por dia`.
- **AP11.** 1280 px: card do gráfico e card de transferências com 308 px de altura externa em Hoje, Semana, Mês e Personalizado; área do gráfico (`.recharts-wrapper`) com 224 px; sem rolagem horizontal.
- **AP12.** 390×844 (largura útil 375): Hoje (vazio), Mês, 1 ago–24 out e 23 out por hora, todos sem rolagem horizontal. Título, período e legenda sem `…` (legenda quebra para baixo). Rótulos sem sobreposição: Mês `Qui 1, Ter 6, Dom 11, Sex 16, Qua 21, Sáb 31`; semanal `1–2 ago, 17–23 ago, 7–13 set, 19–24 out`; horário `0h, 2h … 10h, 13h, 16h, 19h, 23h`. Rótulos de valor do último ponto inteiros. Screenshots `.qa-output/ap12-{hoje,mes,ap7,h1023}-390.png`.
- **AP13.** Mês, cursor sobre o dia 31: tooltip `visibility: hidden`, nenhum `0`. Em dia passado (16 out) o tooltip aparece normalmente. Screenshot `.qa-output/ap5-mes-future-hover.png`.
- **AP14.** Membro (`rodalv@gmail.com`, "Suporte · Membro"): Hoje vazio, igual ao admin; Mês com os mesmos 24 pontos e total 19.
- **AP15.** Hoje e Personalizado 2026-10-20 a 2026-10-20 (ambos sem chamado no setor): sem legenda, "Nenhum chamado aberto ou resolvido no período" + "Os chamados abertos e resolvidos no setor aparecem aqui, hora a hora."; card com 308 px, igual ao vizinho. Admin e Membro.
- **AP16.** `get_errors` do `next-devtools` (admin e membro): `configErrors` e `sessionErrors` vazios. Console do navegador na sessão: só mensagens de HMR e do React DevTools, sem erro, sem aviso de hidratação e sem aviso do Recharts de largura/altura. Log do dev server sem ERROR/WARN no período do teste (o último é de antes da sessão). VD1–VD4 e TR1–TR16 não foram reexecutados; só se confirmou visualmente que o card de transferências continua igual (3 / 1 / 0, altura igual).

## Falhas

Nenhuma.

## Erros fora dos cenários

Nenhum durante a sessão. O histórico do console do Playwright ("all") e o `next-development.log` guardam erros anteriores ao teste (`Export DAILY_ACTIVITY_SERIES doesn't exist in target module`, `dashboard-daily-activity*.tsx`), de quando os arquivos estavam sendo renomeados. Não se repetem desde a primeira navegação do teste.

## Não executados

- **AP2** (eixo 0h–23h de Hoje, valores por hora, linha parando na hora atual): Suporte não tem chamado aberto nem resolvido hoje, então o card de Hoje só mostra o estado vazio e o gráfico não é desenhado. Criar chamado está fora do escopo (só leitura). Cobertura parcial pelo dia passado 2026-10-23 (AP8): 24 pontos, tooltips e valores por hora corretos.
- **AP3** (marcador na hora atual e tabela só com horas já iniciadas): mesmo motivo. Não foi possível ver "balde atual no meio do eixo" no modo por hora. Esse comportamento foi visto em Semana e Mês (marcador em "Hoje"), não na granularidade horária. Para executar: rodar de novo depois que o setor 14 tiver chamado aberto ou resolvido no dia.

## Observações

1. **AP1 × AP15 (ambiguidade).** AP1 espera a legenda Abertos/Resolvidos em Hoje, e AP15 diz que o estado vazio fica sem legenda. Com Suporte sem atividade hoje, o card mostrou o vazio sem legenda. Assumi que prevalece o estado vazio. Vale o `df-architect` explicitar que a legenda em AP1 vale só com atividade no dia.
2. **AP8.** O contrato usa `2026-10-20` e prevê "todos registrados" com `AH(S, 2026-10-20)`. Naquele dia Suporte não tem chamado, e a tabela do dia fica toda zerada, então o card cai no vazio (comportamento de `isActivityEmpty`). Troquei por `2026-10-23`.
3. **AP10, esqueleto na troca de período.** Nenhum esqueleto foi observado em navegação cliente (clique nos botões), em nenhum card, inclusive a linha 1, que já tinha `key`. O Next mantém a tela anterior até a resposta chegar (transition), e as consultas são rápidas. Tentei atrasar a resposta (rota com atraso e limitação de banda) e a tela antiga ficou até a nova chegar, sem fallback. O esqueleto só aparece em carga direta/recarga. O `page.tsx` tem `Suspense key={serializeDashboardParams(selection)}` nos cards da linha 1, "Principal ofensor" e no gráfico, e não tem nos atrasos e transferências, como o contrato manda. Se a intenção for ver o esqueleto também ao clicar, o contrato precisa dizer como (ex.: indicador de pendência no filtro). Não classifiquei como falha.
4. **AP13.** Só o Mês foi testado (dia 31). A hora seguinte em Hoje não, porque o gráfico não aparece (AP2/AP3). Ao passar o cursor sobre o dia 31, o gráfico mostra uma linha vertical de cursor mesmo sem tooltip. O contrato fala só em "nenhum tooltip, nenhum `0`" e a linha de cursor não foi prevista. Cosmético.
5. **Eixo por hora (1280 px).** Os rótulos saem `0h, 1h … 10h, 12h, 14h, 16h, 18h, 20h, 23h`: densos até 10h e a cada 2h depois, por causa do `preserveStartEnd` do Recharts. Nada cortado nem sobreposto, mas o espaçamento é irregular. Cosmético, dentro do aceito pelo contrato ("rótulos intermediários podem ser omitidos").
6. **Curva suavizada.** As linhas passam do valor entre pontos (por exemplo, picos arredondados, o `3` do último ponto sobreposto à curva em 390 px na visão semanal). Rótulos de valor continuam inteiros. Cosmético.
7. **Fora do escopo desta revisão (card de transferências, 390 px).** O rótulo "Aguardando nosso aceite" é cortado como "Aguardand / o nosso aceite" em 390 px. Registro para o `df-ui` avaliar. Não faz parte de AP1–AP16.
8. Os dois usuários são contas reais do usuário, não QA; a lista de cenários que exigiria usuário QA (permissão por papel) não se aplica a esta revisão, que é só de leitura.
