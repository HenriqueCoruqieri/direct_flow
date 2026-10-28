# Relatório de testes — Início: modo Individual (Etapa 1)

- **Data:** 2026-10-27
- **Contrato:** `docs/contracts/dashboard-individual-mode.md`
- **Commit:** `56431d7` · alterações não comitadas: sim
- **Ambiente:** `http://localhost:3000`, `next dev`, banco de desenvolvimento (leitura pelo MCP `postgres`, role `df_readonly`)
- **Resultado:** 13 de 14 passaram · 0 falharam · 0 bloqueados · 1 não executado em parte (IM12, só a parte "troca de período" não foi observável)

## Pré-requisitos

- Dev server: `/login` respondeu 200.
- MCP `playwright`, `next-devtools` e `postgres` disponíveis; `SELECT` pelo `execute_sql` respondeu.
- Usuários (credenciais fornecidas pelo usuário, senhas não registradas aqui): Administrador `cazalbe@gmail.com` (`users.id` 19, `admin`, ativo, Suporte, `department_id` 14); Membro `rodalv@gmail.com` (`users.id` 18, `member`, ativo, Suporte, 14). Conferidos no banco.
- Diretoria: fora do escopo desta rodada (contrato).
- `RESEND_API_KEY` está preenchida no `.env`; irrelevante aqui, a feature não envia e-mail e a rodada foi só leitura.
- Relógio: `now()` do banco = 2026-10-28 02:47 UTC = 27/10 23:47 em São Paulo, ainda o mesmo dia civil da máquina (2026-10-27). Sem divergência em "Hoje". Mas o relógio do banco e o do servidor Next mostram deslocamento de cerca de 1h18 entre si nos logs; não afetou nenhum número.

Bordas usadas (São Paulo, UTC-3 sem horário de verão): hoje `2026-10-27 03:00Z` a `2026-10-28 03:00Z`; semana `2026-10-26 03:00Z` a `2026-11-02 03:00Z`; mês `2026-10-01 03:00Z` a `2026-11-01 03:00Z`; personalizado 25–27 out `2026-10-25 03:00Z` a `2026-10-28 03:00Z`; 2026-01-01 `2026-01-01 03:00Z` a `2026-01-02 03:00Z`.

## Cenários

| #    | Cenário                                                  | Papel | Status                                      |
| ---- | -------------------------------------------------------- | ----- | ------------------------------------------- |
| IM1  | Switch à direita do filtro, Coletivo marcado, números    | A     | PASSOU                                      |
| IM2  | Individual + F5 volta a Coletivo; URL inalterada         | A     | PASSOU                                      |
| IM3  | Alternar várias vezes sem requisição nem erro de console | A     | PASSOU                                      |
| IM4  | Individual em Hoje, Semana, Mês, Personalizado 3 dias    | A     | PASSOU                                      |
| IM5  | Coletivo idêntico ao de antes (Hoje e Mês)               | A     | PASSOU                                      |
| IM6  | Individual de M em Hoje e Mês; Coletivo de M = o de A    | M     | PASSOU                                      |
| IM7  | Individual em período sem chamado meu (2026-01-01)       | A     | PASSOU                                      |
| IM8  | Trocar período mantém o modo                             | A     | PASSOU                                      |
| IM9  | Teclado: Tab, setas, saída do grupo, foco visível        | A     | PASSOU                                      |
| IM10 | Árvore de acessibilidade                                 | A     | PASSOU                                      |
| IM11 | 390×844 nos dois modos                                   | A     | PASSOU                                      |
| IM12 | Esqueleto de 4 cartões na troca de período               | A     | NÃO EXECUTADO em parte (ver Não executados) |
| IM13 | Linhas 2 e 3 iguais nos dois modos                       | A     | PASSOU                                      |
| IM14 | Console e dev server sem erro; nenhuma escrita no banco  | todos | PASSOU                                      |

## Evidências

### Consultas de conferência (resultado de `IM`, `IA`, `IR`, e do Coletivo)

Executadas pelo MCP `postgres` com `:dep` = 14. Valores abaixo; `em_atraso` e `horas_backlog` são do instante da consulta.

Individual (esperado):

| Período    | `:eu`  | chamados | resolvidos | media_min | em_atraso | horas_backlog | IA  | recebidos_meus |
| ---------- | ------ | -------- | ---------- | --------- | --------- | ------------- | --- | -------------- |
| hoje       | 18 (M) | 5        | 2          | 1795      | 0         | 2             | 0   | 5              |
| mês        | 18 (M) | 20       | 15         | 5115      | 0         | 2             | 5   | 20             |
| hoje       | 19 (A) | 0        | 4          | 11135     | 3         | 1203          | 0   | 0              |
| semana     | 19 (A) | 0        | 4          | 11135     | 3         | 1203          | 0   | 0              |
| mês        | 19 (A) | 7        | 4          | 11135     | 3         | 1203          | 1   | 7              |
| 25–27 out  | 19 (A) | 0        | 4          | 11135     | 3         | 1203          | 0   | 0              |
| 2026-01-01 | 19 (A) | 0        | 0          | null      | 3         | 1203          | 0   | 0              |

Coletivo (esperado, regra de 2026-10-23: taxa = resolvidos / recebidos do setor):

| Período | chamados | resolvidos | media_min | em_atraso | horas_backlog | RT  | recebidos_setor |
| ------- | -------- | ---------- | --------- | --------- | ------------- | --- | --------------- |
| hoje    | 7        | 10         | 12005     | 3         | 1208          | 0   | 10              |
| mês     | 34       | 25         | 7839      | 3         | 1208          | 6   | 39              |

### Tela observada

- Coletivo, Hoje (A e M): `7`, `Nenhum recebido de outros setores`, `100%` `10 resolvidos de 10`, `8d 8h`, `3 chamados`, `1.208h em backlog`. Bate com a tabela.
- Coletivo, Mês (A e M): `34`, `+6 recebidos de outros setores`, `64%` `25 resolvidos de 39`, `5d 10h`, `3 chamados`, `1.208h em backlog`. Bate (floor(2500/39)=64; 7839 min = 5d 10h).
- Individual M, Hoje: `5`, `Nenhum aceito por você`, `40%` `2 resolvidos de 5`, `1d 5h`, `0 chamados`, `2h em backlog`. Bate.
- Individual M, Mês: `20`, `+5 aceitos por você`, `75%` `15 resolvidos de 20`, `3d 13h`, `0 chamados`, `2h em backlog`. Bate.
- Individual A, Hoje, Semana e 25–27 out: `0`, `Nenhum aceito por você`, Taxa `—` com `4 resolvidos, nenhum recebido` (sem barra), `7d 17h`, `3 chamados`, `1.203h em backlog`. Bate; backlog igual entre períodos.
- Individual A, Mês: `7`, `+1 aceito por você` (singular), `57%` `4 resolvidos de 7`, `7d 17h`, `3 chamados`, `1.203h` (depois `1.204h`, passagem do relógio, dentro da tolerância de 1 h do contrato). Bate.
- Individual A, 2026-01-01: `0`, `Nenhum aceito por você`, Taxa `—` + `Nenhum chamado seu no período` sem barra, Tempo `—` + `Nenhum resolvido por você no período` sem marca Ilustrativo, Backlog `3 chamados` / `1.203h em backlog` (igual ao de Hoje). Bate.

### IM1 e posição do switch

A, 1440 px: grupo "Coletivo | Individual" em y=130 (mesma linha dos filtros, y=131), x=1233 a 1401, à direita; "Coletivo" marcado. Screenshot `.qa-output/im1-admin-coletivo.png`.

### IM2

Individual marcado, F5: voltou a Coletivo (`checked` = coletivo) e aos números do Coletivo. URL `?periodo=hoje` antes e depois.

### IM3

Escuta de `page.on('request')` durante 3 ciclos Coletivo ↔ Individual (6 trocas): **0 requisições** (nenhum documento, RSC ou fetch), 0 mensagens de console de erro ou aviso, URL inalterada, números trocando a cada clique.

### IM8

Com Individual marcado, troca por link e pelo seletor Personalizado (Hoje → Semana → Mês → Hoje → 25–27 out → 2026-01-01 → Mês) sempre manteve "Individual" marcado. F5 voltou a Coletivo (IM2).

### IM9

Sequência de Tab a partir do filtro: Hoje, Semana, Mês, Personalizado, depois entrou no grupo pela opção marcada (rádio "Coletivo"). ArrowRight marcou "Individual" e os cards trocaram (`0` / `Nenhum aceito por você`); ArrowLeft voltou a "Coletivo" e `7`. Um Tab saiu do grupo (foco foi para o chip "Ilustrativo" do card visível). Shift+Tab voltou ao rádio. Anel de foco visível no rótulo (`.qa-output/im9-focus.png`). Os `[hidden]` do modo inativo têm `display: none`, então os elementos focáveis dentro deles (1 encontrado) não recebem foco.

### IM10

`ariaSnapshot` de `main` nos dois modos (Mês): `radiogroup "Visão dos indicadores"` com `radio "Coletivo"` e `radio "Individual"` (`[checked]` correto em cada modo); apenas **um** conjunto de textos dos 4 cards exposto; `progressbar "Taxa de resolução"` uma vez.

### IM11

390×844 (largura útil 375 por causa da barra de rolagem): `scrollWidth` = `clientWidth` = 375 nos dois modos; filtro e switch cabem; o switch foi para a linha de baixo (y=242, x 20 a 187); rótulos "Coletivo" e "Individual" inteiros (`scrollWidth` = `clientWidth` = 81). Screenshots `.qa-output/im11-individual-390.png` e `.qa-output/im11-coletivo-390.png`. Menu hambúrguer e busca alcançáveis.

### IM13

`innerText` das linhas 2 e 3 (Principal ofensor em diante, 1729 caracteres) idêntico entre Coletivo e Individual, em Mês.

### IM14

- `get_errors` (`next-devtools`) devolveu `configErrors: []`, `sessionErrors: []` ao final e entre os blocos.
- Console do navegador: sem erro de hidratação nem aviso da aplicação. Os erros `TypeError: Failed to execute 'observe' on 'MutationObserver'` no log do console vieram de um `addInitScript` do próprio teste (executado antes de `documentElement` existir) e não são da aplicação.
- Nenhuma escrita: a rodada foi só leitura; as únicas ações foram login, logout, troca de switch/período e navegação.

## Falhas

Nenhuma.

## Erros fora dos cenários

- `.next/dev/logs/next-development.log` registra, antes do início da rodada (timestamps locais 01:20–01:21), `ReferenceError: unionAll is not defined` e erros de parsing em `app/(app)/dashboard/page.tsx` (linhas 112, 115, 116). São de edição em andamento anterior; não se repetiram durante os testes e `get_errors` está limpo.
- O mesmo log mostra dois `WARN [Better Auth]: Invalid password` às 02:50:34Z e 02:50:43Z (10 s de intervalo). Não vieram desta rodada: o único login do teste (Administrador) foi bem-sucedido às ~02:49Z, sem tentativa falha. Provável tentativa manual de alguém em outra aba ou navegador. Registrado só por completude.

## Não executados

- **IM12, parte "esqueleto na troca de período".** No carregamento do documento (reload) o esqueleto da linha 1 foi observado com **4 cartões e 12 `Skeleton`, um conjunto só** (`grid ... xl:grid-cols-4`, `kids=4`, `sk=12`), como pede o contrato. Na troca de período por link (com Individual marcado), nenhum `[data-slot=skeleton]` apareceu, nem com a resposta RSC atrasada em 2 s por `page.route`; o roteador mantém a UI anterior até a resposta chegar. O contrato do Coletivo já qualifica o esqueleto na troca como "se perceptível". `DashboardOverviewSkeleton` não aparece no `git status` (inalterado). Não houve como medir o esqueleto de troca dentro desta ferramenta.
- Diretoria (cenário previsto no contrato como não executável; Diretor sem login de teste).

## Observações

- O contrato não define se o modo deveria sobreviver a navegação para outra rota e volta (sai de `/dashboard` e retorna). O provider vive na página, então o modo volta a Coletivo ao remontar. Não testado por não estar no contrato; vale confirmar a intenção com o `df-architect`.
- IM12 depende de "se perceptível" e a ferramenta não consegue provar a ausência em troca real; se quiser verificação mais forte, medir manualmente com throttling de CPU/rede no DevTools.
- O Backlog do Individual de M mostra `0 chamados` com `2h em backlog` (há 5 chamados no backlog de M, nenhum em atraso). Está de acordo com o contrato (valor = em atraso; apoio = soma da idade), apenas um caso em que o valor e a linha de apoio parecem destoar.
- `RESEND_API_KEY` preenchida: sem impacto, nenhum cenário envia e-mail.
