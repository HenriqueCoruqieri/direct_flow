# Relatório de testes — dashboard-overview (Etapa 2, linha 2)

- **Data:** 2026-10-23
- **Contrato:** `docs/contracts/dashboard-overview.md` (seção "Etapa 2", RW1 a RW17)
- **Commit:** `c4ca2d4` · alterações não comitadas: sim (a linha 2 inteira está no working tree)
- **Ambiente:** `http://localhost:3000`, `next dev`, banco de desenvolvimento
- **Resultado:** 14 de 17 passaram · 1 falhou · 0 bloqueados · 2 não executados

## Pré-requisitos

| #   | Item              | Situação                                                                                                                                                                                      |
| --- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Dev server no ar  | OK. `/login` respondeu 200.                                                                                                                                                                   |
| 2   | MCP disponível    | OK. `next-devtools` (porta 3000), `playwright` (Chrome visível) e `postgres` respondem.                                                                                                       |
| 3   | Usuários de teste | Contas fornecidas pelo usuário, não as do `qa-seed.md`. Papel e setor confirmados no banco (tabela abaixo). Senhas não registradas.                                                           |
| 4   | E-mail desligado  | `RESEND_API_KEY` está preenchida no `.env`. A Etapa 2 não envolve e-mail e a criação de chamado não dispara e-mail (só `ticket-transfer` e `profile` chamam `send*`), então nada foi afetado. |

Contas usadas (consulta `select ... from users join department` no MCP `postgres`):

| Papel no teste     | E-mail                  | Papel    | Setor (id)     |
| ------------------ | ----------------------- | -------- | -------------- |
| Diretor (`DIR`)    | `heoliveirac@gmail.com` | `admin`  | Diretoria (11) |
| Admin do setor (A) | `cazalbe@gmail.com`     | `admin`  | Suporte (14)   |
| Membro (M)         | `rodalv@gmail.com`      | `member` | Suporte (14)   |

Adaptação: `S` = Suporte (14) no lugar de QA Suporte (18). Não há conta de admin de outro setor (`I`). O Diretor já estava com sessão aberta no navegador do MCP (usuário "Henrique Coruqieri", Diretoria · Administrador, igual ao e-mail fornecido); usei essa sessão para RW12 e depois fiz logout. M e A entraram pelo formulário de `/login`.

## Dados criados pelo teste

Como M, pela interface, em Suporte (setor real da conta), todos `media`, status `aberto`, sem e-mail:

| Id   | Título           | Tag (id)                                 |
| ---- | ---------------- | ---------------------------------------- |
| #255 | `[QA] Ofensor 1` | `#movimentacao_estoque_duvida` (31) — T1 |
| #256 | `[QA] Ofensor 2` | `#movimentacao_estoque_duvida` (31) — T1 |
| #257 | `[QA] Ofensor 3` | `#movimentacao_estoque_falha` (32) — T2  |

Confirmado por `select ... from ticket left join ticket_tag where id >= 255`. Nenhum chamado não `[QA]` foi alterado. Não foi usado #64–#68.

## Cenários

| #    | Cenário                                        | Papel | Status        |
| ---- | ---------------------------------------------- | ----- | ------------- |
| RW1  | Grade: dois cards lado a lado, ~3/5 e ~2/5     | A     | PASSOU        |
| RW2  | Ofensor = `TT(S, hoje)` + percentual           | A     | PASSOU        |
| RW3  | T1 +2, T2 +1; barras proporcionais             | A     | PASSOU        |
| RW4  | Semana, Mês, Personalizado; atrasos não piscam | A     | PASSOU        |
| RW5  | Personalizado 2026-01-01: vazio do ofensor     | A     | PASSOU        |
| RW6  | Período com chamados e sem tag do setor        | A     | PASSOU        |
| RW7  | Maiores atrasos = `AT(S)`, formato das células | A, M  | PASSOU        |
| RW8  | Chamados da preparação fora dos atrasos        | A     | PASSOU        |
| RW9  | "Ver na fila"                                  | A     | PASSOU        |
| RW10 | Nº leva ao detalhe certo                       | A     | PASSOU        |
| RW11 | Outro setor (`I`)                              | I     | NÃO EXECUTADO |
| RW12 | Diretoria: `TT(DIR)`, `AT(DIR)`, "Ver na fila" | DIR   | PASSOU        |
| RW13 | Setor com `AT` vazio                           | todos | NÃO EXECUTADO |
| RW14 | Regra de altura a 1280 px                      | A     | PASSOU        |
| RW15 | 1024 px lado a lado, 1023 px empilhado         | A     | FALHOU        |
| RW16 | 390×844 sem rolagem horizontal                 | A     | PASSOU        |
| RW17 | Console e dev server sem erro; linha 1 intacta | todos | PASSOU        |

Evidência dos que passaram:

- **RW1.** A 1280 px os dois cards ficam em y=312, ambos com 354 px de altura, larguras 595 e 393 (60% / 40%). Linha 1 igual (19, 31%, 1d 22h, 12).
- **RW2.** Hoje (23 out) para Suporte: `chamados` = 3 (SQL `d15/hoje` do contrato: 3). `TT(14, hoje)` devolveu `#movimentacao_estoque_duvida` 2 e `#movimentacao_estoque_falha` 1. Tela: destaque `#movimentacao_estoque_duvida`, `2 chamados · 66% do volume` (floor(66,67) = 66), lista na mesma ordem. Mês: `chamados` = 19, `TT(14, mes)` = fiscal_orientação 6, Impressora_fiscal_nao_fiscal 5, internet_rede_vpn 2, movimentacao_estoque_duvida 2, fiscal_migracao_novas_regras 1, fiscal_mudanca_regime_tributario 1; tela idêntica, `6 chamados · 31% do volume` (floor(31,58)). A 7ª tag (`#movimentacao_estoque_falha`, 1) ficou fora pelo `limit 6`, e o desempate por `lower(name)` bate.
- **RW3.** Antes (Hoje, Suporte vazio): `—` e `Nenhum chamado no período`. Depois: T1 = 2, T2 = 1. Barras (`style` do preenchimento): Hoje 100% e 50%; Mês 100%, 83,33%, 33,33%, 33,33%, 16,67%, 16,67% (= n / 6 × 100).
- **RW4.** Semana (`2 chamados · 66%`, 3 chamados) e personalizado 21–23 out (idêntico) conferem. MutationObserver durante as trocas Hoje → Semana → Mês → Hoje: o nó `<table>` de atrasos permaneceu o mesmo, sem esqueleto de atrasos. Esqueleto do ofensor também não foi observado (a troca chegou em uma mutação só), compatível com o "se perceptível" do contrato.
- **RW5.** `?periodo=personalizado&de=2026-01-01&ate=2026-01-01`: ofensor `—` + `Nenhum chamado no período`, sem lista; chamados 0; atrasos idêntico.
- **RW6.** Personalizado 15 out: `chamados` = 1 (#250, aguardando aprovação, com tag `Impressora` da Diretoria, id 3, setor 11). Consulta: `TT(14, 15 out)` devolve 0 linhas (`count(*)` = 0, `chamados` = 1). Tela: `—` + `Nenhum chamado com tag no período`. Confirma também que tag de outro setor não entra no ranking mas o chamado entra no denominador.
- **RW7.** `AT(14)` (consulta do contrato, adaptada): #101, #123, #124, #125, #153, todos `media`, vencimentos `2026-10-07 01:38`, `10-09 16:16`, `10-09 16:17`, `10-09 16:25`, `10-10 03:47`. Tela (A e M): mesmas 5 linhas, mesma ordem, `7 out, 01:38`, `9 out, 16:16`, `9 out, 16:17`, `9 out, 16:25`, `10 out, 03:47` (mesmo ano, sem ano). Nº é `<a href="/tickets/{id}">`, fonte `JetBrains Mono`, cor `rgb(91,103,120)`; Título com `title` e `text-overflow: ellipsis`; Prioridade "Média" com classe `text-prioridade-media` (`rgb(37,99,201)` = `--prioridade-media` `#2563c9`); Vencimento `white-space: nowrap` com `title` `07/10/2026 01:38` etc. Cabeçalhos: Nº, Título, Prioridade, Vencimento.
- **RW8.** #255, #256 e #257 (criados 22:21 UTC, vencem em 24h) não aparecem nos atrasos. `#V2` (#254) é de QA Suporte, que não é acessível com estas contas: adaptado aos três chamados da preparação.
- **RW9.** Clique em "Ver na fila" (A e DIR): URL `/queue?tab=all&periodo=todos`; Todos = 18 para Suporte (19 chamados menos #250 aguardando aprovação, que a fila oculta) e 34 para Diretoria; #101, #123, #124, #125 e #153 estão na lista.
- **RW10.** Clique em `#123`: `/tickets/123`, título "Dúvidas para cadastrar novo CFOP".
- **RW12.** Diretor, Mês: `chamados` 5; ofensor `Sistema`, `3 chamados · 60% do volume`, lista Sistema 3 e DIRETORIA_ACESSO_SISTEMAS 1 = `TT(11, mes)` (`Sistema` id 4 = 3, `DIRETORIA_ACESSO_SISTEMAS` id 1 = 1). Hoje: `—` + `Nenhum chamado no período`. Atrasos: #29, #30, #31, #32, #33 (`14 ago, 14:00`, `17 ago, 11:20`, `20 ago, 21:40`, `25 ago, 20:10`, `3 set, 22:00`) = `AT(11)` (22 ativos, todos atrasados). Prioridades Baixa, Média, Alta, Crítica, Baixa mapeiam para as horas certas (14 ago 14:00 ← baixa 72h etc.). "Ver na fila" abre a fila da Diretoria (Setor: Diretoria, Todos 34).
- **RW14.** A 1280 px, Mês, 6 tags e 5 atrasos. Altura do conteúdo (do primeiro ao último filho do card, sem o padding de 32 px): ofensor 320 px, atrasos 295 px, diferença 25 px. Cada item do ranking tem 30 px (6 itens), cada linha da tabela 45 px (5 linhas) e o cabeçalho da tabela 40 px. 25 ≤ 30: dentro da regra. Nenhum item cortado (6 `li` e 5 `tr` presentes). Os dois cards têm 354 px de altura total. Em Hoje (2 tags): ofensor 160 px de conteúdo, atrasos 295 px, cards com 329 px, itens no topo, sem corte. Screenshots: `.qa-output/admin-mes-1280.png`, `.qa-output/admin-hoje-1280.png`.
- **RW16.** A 390×844 (viewport útil 375 px com a barra de rolagem): `scrollWidth` da página = 375 = `clientWidth`; tabela 301 px dentro de wrapper de 301 px (sem rolagem); 4 colunas visíveis (`Nº` 37, `Título` 93, `Prioridade` 75, `Vencimento` 96); título truncado com reticências; cards empilhados, ofensor em cima (y=764) e atrasos abaixo (y=1130); destaque `#fiscal_orientação` com `scrollWidth` = `clientWidth`. Screenshot: `.qa-output/admin-mes-390.png`.
- **RW17.** `get_errors` (next-devtools) devolveu `configErrors: []` e `sessionErrors: []` ao final de todas as sessões. Os arquivos de console desta sessão (`.qa-output/console-2026-10-23T22-*.log`) não têm ERROR nem WARN, e não houve aviso de hidratação. A linha 1 não mudou: Hoje 3, Mês 19, "+3 recebidos de outros setores", backlog 12 (= 9 ativos + 3 criados), taxa 31%. A conferência completa de OV1 a OV16 não foi refeita; foram conferidos os valores acima.

## Falhas

### RW15 — 1024 px e 1023 px

- **Papel:** Admin do setor, `cazalbe@gmail.com` (Suporte).
- **Passos:** 1. Entrar em `/dashboard?periodo=mes`. 2. Redimensionar a janela para 1024×800. 3. Medir a tabela de "Maiores atrasos". 4. Repetir a 1023×800.
- **Esperado:** `docs/contracts/dashboard-overview.md`, RW15: 1024 lado a lado, 1023 empilhado com o ofensor em cima. Seção "`df-ui` — Maiores atrasos": o Título "é a coluna que encolhe e nunca causa rolagem horizontal".
- **Obtido:** A grade está correta. A 1024: cards em x=256 (w 433) e x=701 (w 284), lado a lado; a 1023: empilhados, ofensor em y=508 e atrasos em y=874. Mas a 1024 a tabela de atrasos fica espremida na coluna de 284 px: a célula do Título tem 49 px de largura (conteúdo de 130 px, mostra "Tes…", "Dú…", "Nov…") e o wrapper da tabela (`overflow-x: auto`) tem `scrollWidth` 257 contra `clientWidth` 250, então aparece uma barra de rolagem horizontal dentro do card (7 px de excesso). O critério da grade passa, mas a regra de nunca rolar horizontalmente não vale em 1024.
- **Evidência:** `.qa-output/admin-mes-1024.png` (barra horizontal sob a última linha, títulos ilegíveis). Medida: células da 1ª linha 37 / 49 / 75 / 96 px; wrapper 257 > 250.
- **Camada provável:** app (largura mínima das colunas Nº, Prioridade e Vencimento da tabela de atrasos, que somam 208 px mais o padding de 16 px por célula, contra a coluna de 2/5 da grade a 1024 px).
- **Dono:** `df-ui`

## Erros fora dos cenários

- Um erro antigo aparece no histórico do MCP do navegador (`browser_console_messages`, `all: true`): `ReferenceError: DashboardTopTagsSkeleton is not defined` em `DashboardPage`. Ele vem do arquivo `.qa-output/console-2026-10-23T21-45-49-938Z.log`, de uma sessão anterior à desta (21:45 UTC; esta começou às 22:19 UTC), e as linhas correspondentes do log do dev server (`ERROR ... DashboardTopTagsSkeleton is not defined`) são anteriores à correção. Hoje `page.tsx` importa o componente (linha 19) e a página renderizou sem erro em todas as visitas desta sessão (mais de 25 carregamentos). Não reproduzido; registrado só para rastreio.
- O dev server imprime o aviso de `pg` sobre `sslmode` (`SECURITY WARNING: The SSL modes 'prefer', 'require'...`) no início do log. Sem relação com a feature.

## Não executados

- **RW11 (outro setor, `I`).** Não há conta de admin de outro setor entre as três fornecidas, e criar uma exigiria escrita manual em `users`/`account`, que o `df-qa` não faz. Os números de `TT`/`AT` para outro setor ficam cobertos só pela Diretoria (RW12). Para executar: conta de admin ou membro de um setor diferente de Suporte e Diretoria, por exemplo QA Infra, com o `qa-seed.md`.
- **RW13 (setor com `AT` vazio).** Consulta que mostrou que nenhum setor acessível tem `AT` vazio: `AT` por setor dos acessíveis = Suporte 9 atrasados de 9 ativos (todos `media`, venceram em 7 a 13 out) e Diretoria 22 de 22. O único setor sem atrasos relevante seria um sem chamados ativos (P&D 0 ativos, Implantação 0, Não alocado 0), mas nenhuma das três contas pertence a eles. Forçar o vazio exigiria resolver ou cancelar chamados reais, o que o teste não faz. O estado vazio da tabela continua sem verificação em execução.

## Observações

- **Regiões sem nome acessível.** Os dois cards da linha 2 são `region` sem `aria-label` (o snapshot mostra `region` sem nome, só com o `heading` dentro). Não é exigência do contrato; vale uma decisão do `df-architect`/`df-ui` se o `section` deve ser nomeado pelo título via `aria-labelledby`.
- **Ofensor × `ticketCount`.** Confirmado em execução que o denominador conta chamados com tag de outro setor (RW6, #250) e que a soma dos percentuais pode ficar abaixo de 100% (Mês de Suporte: 6+5+2+2+1+1 = 17 de 19 na lista, com a 7ª tag fora do limite).
- **Contrato × RW14.** O contrato fala em "diferença de altura entre o conteúdo dos dois cards". Medi pelo bloco de conteúdo sem o padding do card; a medição pelo card inteiro daria 0 (ambos esticados a 354 px pelo grid). Os 25 px medidos coincidem com os ~320 × ~295 px calculados pelo `df-ui`.
- **Título do card de atrasos a 1024.** Ver RW15. A causa é estrutural (a coluna `lg:col-span-2` de ~284 px), e se repete entre 1024 e cerca de 1100 px.
- **Fonte de dados do #V2 e dos usuários QA.** Como os cenários adaptam o setor, `qa-seed.md` não foi usado, e RW8 usou os chamados da preparação (#255–#257) em vez de #254.
- **Limpeza.** Os chamados #255–#257 ficaram em Suporte, com título `[QA]`, e alteram o Início de Suporte (Hoje mostra 3 chamados e a lista do ofensor). Remover ou resolver fica por conta do usuário.

## Reteste 1

Correção aplicada: `lg:` para `xl:` na grade da linha 2 e nos `col-span`. Papel: Admin do setor (Suporte), Mês, só leitura.

| #    | Cenário                                                            | Papel | Status |
| ---- | ------------------------------------------------------------------ | ----- | ------ |
| RW15 | 1024 px empilhado, 1280 px lado a lado 3+2, sem rolagem horizontal | A     | PASSOU |
| RW14 | 1280 px, diferença de altura do conteúdo                           | A     | PASSOU |

- **RW15.** A 1024×800: cards empilhados, ofensor em y=440 e atrasos em y=806, ambos com 729 px de largura. Tabela de 695 px dentro de wrapper de 695 px (`scrollWidth` = `clientWidth`), Título com 487 px (células 37 / 487 / 75 / 96); página com `scrollWidth` 1009 = `clientWidth` 1009. A 1280×800: lado a lado, ofensor x=256 (595 px) e atrasos x=863 (393 px), proporção 3+2; tabela 359 px no wrapper de 359 px (sem rolagem), Título com 151 px; página 1280 = 1280. Screenshots: `.qa-output/admin-mes-1024-reteste.png`, `.qa-output/admin-mes-1280-reteste.png`.
- **RW14.** A 1280 px, 6 tags e 5 atrasos: conteúdo 320 px contra 295 px (diferença 25 px, igual ao teste anterior), cards com 354 px, 6 `li` e 5 `tr`.
- `get_errors`: `configErrors: []`, `sessionErrors: []`.
