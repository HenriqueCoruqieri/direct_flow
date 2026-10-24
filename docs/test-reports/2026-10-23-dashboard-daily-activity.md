# Relatório de testes — Dashboard: Últimos 7 dias (Etapa 3b)

- **Data:** 2026-10-23
- **Contrato:** `docs/contracts/dashboard-overview.md` (seção "Etapa 3b")
- **Commit:** `0b69f4d` · alterações não comitadas: sim
- **Ambiente:** `http://localhost:3000`, `next dev` (Turbopack), banco de desenvolvimento
- **Resultado:** 14 de 17 passaram · 1 falhou · 0 bloqueados · 2 não executados

## Pré-requisitos

| #   | Pré-requisito     | Situação                                                                                                                                                                                                                |
| --- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Dev server no ar  | Atendido (`/login` devolve 200)                                                                                                                                                                                         |
| 2   | MCP disponível    | Atendido (`next-devtools`, `playwright` e `SELECT 1` no `postgres`)                                                                                                                                                     |
| 3   | Usuários de teste | Credenciais vieram do usuário (não do seed QA). Os três e-mails existem e estão ativos: `heoliveirac@gmail.com` (admin, Diretoria 11), `cazalbe@gmail.com` (admin, Suporte 14), `rodalv@gmail.com` (member, Suporte 14) |
| 4   | E-mail desligado  | `RESEND_API_KEY` preenchida no `.env`; irrelevante aqui (feature só de leitura, nenhum e-mail disparado)                                                                                                                |

Só leitura: nenhum dado foi criado nem alterado. O tema do usuário A foi devolvido a "Sistema" no fim.

## Valores esperados (consulta `DA(dep)` do contrato, fuso SP, no momento do teste)

`DA(14)` Suporte, `dia · abertos · resolvidos`: 17/10 a 22/10 todos `0 · 0`; 23/10 `3 · 0`.

`DA(11)` Diretoria: os 7 dias `0 · 0` (nenhum chamado criado nem resolvido na semana).

## Cenários

| #    | Cenário                                                                                            | Papel | Status                                  |
| ---- | -------------------------------------------------------------------------------------------------- | ----- | --------------------------------------- |
| LD1  | Linha 3 a 1280 px: gráfico à esquerda (595 px), transferências à direita (393 px), mesmo `y`       | A     | PASSOU                                  |
| LD2  | Cabeçalho: título à esquerda, legenda "Abertos" (azul) e "Resolvidos" (verde) à direita, com texto | A     | PASSOU                                  |
| LD3  | Eixo X: `Sáb 17 · Dom 18 · Seg 19 · Ter 20 · Qua 21 · Qui 22 · Hoje`, todos visíveis               | A     | PASSOU                                  |
| LD4  | Valores por dia (tooltip e tabela) = `DA(14)`; tooltip com dia por extenso                         | A     | PASSOU                                  |
| LD5  | Último ponto: marcador só em "Hoje"; Abertos `3` acima, Resolvidos `0` abaixo, sem sobreposição    | A     | PASSOU                                  |
| LD6  | Eixo Y inteiro 0–4, grade só horizontal, cores = tokens                                            | A     | PASSOU                                  |
| LD7  | Semana, Mês e Hoje: gráfico não muda, sem esqueleto                                                | A     | PASSOU                                  |
| LD8  | Altura a 1280 px: os dois cards com 288 px; área do gráfico 224 px; sem vão nem rolagem interna    | A     | PASSOU                                  |
| LD9  | 1024 px: gráfico em largura total (729 px) acima do card de transferências; sem rolagem horizontal | A     | PASSOU                                  |
| LD10 | 390×844: sem rolagem horizontal, 7 rótulos legíveis, legenda sem `…`                               | A     | FALHOU                                  |
| LD11 | Acessibilidade: SVG em `aria-hidden`; tabela com caption, colunas e 7 linhas = `DA(14)`            | A     | PASSOU                                  |
| LD12 | Tema escuro: linhas azul e verde legíveis; grade e eixos visíveis                                  | A     | PASSOU                                  |
| LD13 | Mesmo gráfico para o membro do setor                                                               | M     | PASSOU                                  |
| LD14 | Valores do Diretor = `DA(11)`                                                                      | D     | NÃO EXECUTADO                           |
| LD15 | Setor com `DA` inteiro em 0: estado vazio                                                          | D     | NÃO EXECUTADO                           |
| LD16 | Coerência com a linha 1: Personalizado 17/10 a 23/10 = soma de Abertos                             | A     | PASSOU                                  |
| LD17 | Console e dev server sem erro, hidratação ou aviso do Recharts                                     | todos | PASSOU (ver Observações sobre TR1–TR16) |

## Evidências dos cenários que passaram

- **LD1/LD8:** `section.xl:col-span-3` em `x=256, w=595, h=288`; transferências `x=863, w=393, h=288`, ambos em `y=653`. SVG `x=273, y=700, 561×224`; fundo do SVG a 924 e do card a 941 (só o padding de 16 px). `scrollHeight == clientHeight` do card. Screenshot `.qa-output/ld1-1280.png`.
- **LD3:** `<text>` do SVG: `Sáb 17, Dom 18, Seg 19, Ter 20, Qua 21, Qui 22, Hoje`, do mais antigo à esquerda para "Hoje" à direita; nenhum fora do SVG.
- **LD4:** tabela `sr-only` e tooltip por hover em cada dia (`sábado, 17 de outubro` … `quinta-feira, 22 de outubro`, `sexta-feira, 23 de outubro`) trazem `0 / 0` nos seis primeiros dias e `3 / 0` em hoje, idêntico a `DA(14)`. O membro (LD13) vê a mesma tabela. A tooltip de "Hoje" só abre com o cursor até cerca de 4 px da borda direita do plot; mais à direita fica oculta (nada previsto no contrato).
- **LD5:** só dois `<circle>` no gráfico, ambos em `cx=545` (Hoje), `r=4`; rótulos `3` (y=735, acima do ponto) e `0` (y=879, abaixo); sem dots nos outros dias.
- **LD6:** ticks do Y `0,1,2,3,4`; 0 linhas verticais de grade; 6 horizontais com `stroke` `rgb(226, 231, 238)` (= `--border-subtle` `#e2e7ee`). Stroke das linhas: `rgb(37, 99, 201)` (`--status-aberto` `#2563c9`) e `rgb(33, 117, 56)` (`--status-resolvido` `#217538`), largura 2 px, via `var(--color-opened)` / `var(--color-resolved)`.
- **LD7:** `MutationObserver` não viu o esqueleto (`aria-label="Carregando últimos 7 dias"`) em nenhum momento e o nó `svg.recharts-surface` continuou o mesmo após trocar Semana → Mês → Hoje, enquanto os outros cards mudaram (por exemplo "Principal ofensor" `#fiscal_orientação` em Mês).
- **LD9:** 1024 px: card `x=256, w=729, h=288`, transferências abaixo (`y=1287`); `scrollWidth == clientWidth` (1009). Screenshot `.qa-output/ld-1024.png`.
- **LD11:** `svg.recharts-surface` tem ancestral `aria-hidden="true"`; `table.sr-only` com caption "Últimos 7 dias", cabeçalhos `Dia · Abertos · Resolvidos`, 7 linhas com dia por extenso.
- **LD12:** tema Escuro: linhas `rgb(106, 168, 255)` e `rgb(134, 217, 147)` sobre o card `rgb(18, 24, 33)`, grade `rgb(30, 39, 51)` (discreta, mas visível), rótulos do eixo claros, marcadores com contorno na cor do card. Screenshot `.qa-output/ld12-dark.png`.
- **LD16:** `/dashboard?periodo=personalizado&de=2026-10-17&ate=2026-10-23`: "Chamados no período" = `3`, igual à soma de Abertos (3). Os dados são pouco discriminantes (um único dia com valor).
- **LD17:** `get_errors` final: `sessionErrors: []`. O console do Playwright desta sessão (`.qa-output/console-2026-10-23T23-24-24-717Z.log`) só tem mensagens INFO/LOG. Log do dev server (`.next/dev/logs/next-development.log`): único aviso é o do `pg` sobre `sslmode` e o `Invalid password` do login do Diretor (ver abaixo). Nenhum aviso de hidratação nem do Recharts.

## Falhas

### LD10 — 390×844: sem rolagem horizontal

- **Papel:** Administrador (`cazalbe@gmail.com`, Suporte)
- **Passos:** 1. Login. 2. Viewport 390×844. 3. Abrir `/dashboard?periodo=hoje`. 4. Rolar a página para a direita.
- **Esperado:** Contrato, "Responsivo" e LD10: 390 px sem rolagem horizontal.
- **Obtido:** `document.documentElement.scrollWidth = 405` contra `innerWidth = 390`; `window.scrollTo(200, 0)` leva `scrollX` a `15`, ou seja, a página rola 15 px na horizontal. A 1024 e a 1280 px não ocorre. O card em si cabe (`x=20, w=335`), assim como o SVG (`x=37, w=301`) e os sete rótulos do eixo X (de `Sáb 17` a `Hoje`, todos entre 52 e 335 px, legíveis, sem colisão). O que ultrapassa é a `table.sr-only` (e a `caption`, `thead`, `tr`, `th` e `td` dela), todas com `right = 405`. O `sr-only` aplicado ao próprio elemento `<table>` (`display: table`) não recebe o `width: 1px` nem o `overflow: hidden` da classe; o elemento absoluto fica com a largura natural do conteúdo e estende a área rolável.
- **Evidência:** varredura de elementos com `right > clientWidth`: só a tabela e seus descendentes. Screenshots `.qa-output/ld10-390-card.png` e `.qa-output/ld10-390-scrolled.png`.
- **Camada provável:** app (`app/(app)/dashboard/_components/dashboard-daily-activity.tsx`, a tabela acessível)
- **Dono:** df-ui

## Erros fora dos cenários

Nenhum erro de aplicação. Aviso recorrente do `pg` no servidor (`SECURITY WARNING: The SSL modes 'prefer', 'require', and 'verify-ca' …`), vindo da string de conexão, sem relação com a feature.

Num `browser_console_messages` com `all: true` apareceram entradas antigas de sessões anteriores (`ReferenceError: DashboardTransfersSkeleton is not defined` em `DashboardPage` e `WebSocket … ERR_CONNECTION_REFUSED` do HMR), do período em que o servidor foi reiniciado e a página era editada. Não reproduzem nesta sessão: o import existe em `page.tsx` linha 23 e nenhuma carga de `/dashboard` (várias, em 1280, 1024, 390 e com os dois papéis) errou.

## Não executados

- **LD14 (Diretor, valores = `DA(11)`):** o login de `heoliveirac@gmail.com` foi recusado na única tentativa feita (a tela permanece em `/login` sem mensagem visível; o log do servidor traz `[Better Auth]: Invalid password`). Esperado se fosse possível entrar: a Diretoria com os 7 dias em `0` (consulta `DA(11)` acima, nenhuma linha com valor). Screenshot `.qa-output/ld-login-diretor.png`.
- **LD15 (estado vazio):** o único setor com a semana zerada é a Diretoria (`DA(11)` inteiro em 0), que depende do login do Diretor. Suporte tem 3 abertos hoje, e A e M só enxergam Suporte, então nenhum setor acessível mostrou o vazio. Sem a validação do texto "Nenhum chamado aberto ou resolvido nos últimos 7 dias", da ausência de legenda e da altura do card no vazio.

## Observações

- A tela do login do Diretor falha sem mostrar erro ao usuário (não faz parte da feature; vale conferir para o df-auth se a ausência de mensagem é esperada).
- O contrato pede contorno do marcador do último ponto "na cor da superfície do card": implementado e conferido (`stroke` `#fff` no claro, `rgb(18, 24, 33)` no escuro).
- A grade usa `--border-subtle`, não `--border`; o contrato diz só "cor de borda do tema (token)", então não é divergência.
- O eixo Y de 0 a 4 com máximo 3 (arredondamento "nice" do Recharts); aceitável, o contrato não fixa o teto.
- Com dados em um único dia, LD4 e LD16 só validam hoje; os dias anteriores foram conferidos como zero e coincidem com a consulta. Uma verificação de dias com valor (e do chamado resolvido, série verde fora de 0) ficou sem cobertura por falta de dado e por ser só leitura.
- A parte "TR1–TR16 da 3a continuam valendo" do LD17 não foi reexecutada item a item; a verificação foi visual: linhas 1 e 2 e o card de transferências aparecem iguais à Etapa 3a nas capturas, sem erro.
- Screenshots em `.qa-output/` (fora do git).

## Reteste 1

Correção: `sr-only` movido do `<table>` para uma `<div>` em volta (`dashboard-daily-activity.tsx:53-77`). Papel: Administrador (Suporte).

| #    | Cenário                        | Papel         | Status |
| ---- | ------------------------------ | ------------- | ------ |
| LD10 | 390×844 sem rolagem horizontal | Administrador | PASSOU |

- **LD10:** `scrollWidth` 375 contra `innerWidth` 390 (a página cabe, com a barra de rolagem fora da conta); `window.scrollTo(200, 0)` deixa `scrollX = 0`. Card `x=20, w=335`, SVG `x=37, w=301`. Sete rótulos do eixo X legíveis, entre 52 e 335 px, sem colisão (`Sáb 17` ... `Qui 22`, `Hoje`). O wrapper `div.sr-only` mede 1×1 e recorta a tabela (os descendentes da tabela ainda têm `right` > 390 no layout, mas ficam cortados e não geram área rolável). Árvore de acessibilidade: `table` com caption "Últimos 7 dias", colunas `Dia · Abertos · Resolvidos` e 7 linhas no `tbody`. Screenshot `.qa-output/ld10-retest-390.png`.
- **Regressão a 1280×800:** `scrollWidth` 1265 (< `innerWidth`), SVG `x=273, w=552, h=224`, 14 textos de eixo (7 do X, 5 do Y e 2 auxiliares), igual ao anterior. `get_errors`: `sessionErrors: []`.

**Resultado do reteste:** 1 de 1 passou.
