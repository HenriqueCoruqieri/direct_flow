# Relatório de testes — Início: modo Individual, Etapa 2 (Principal ofensor)

- **Data:** 2026-10-28
- **Contrato:** `docs/contracts/dashboard-individual-mode.md` (seção "Etapa 2 — Principal ofensor")
- **Commit:** `001ed83` · alterações não comitadas: sim (`dashboard-top-tags.tsx`, `dashboard-top-tags-content.tsx`, `page.tsx`, `data/dashboard.ts`, `domain/dashboard.ts`, `types/dashboard.ts`)
- **Ambiente:** `http://localhost:3000`, `next dev`, banco de desenvolvimento (leitura pelo MCP `postgres`, role `df_readonly`)
- **Resultado:** 13 de 13 passaram · 0 falharam · 0 bloqueados · 0 parciais · 0 não executados (PO2, PO4 e PO6 completados no Reteste 1, ao final; a tabela e as seções acima do Reteste refletem a primeira passagem)

## Pré-requisitos

- Dev server: `/login` respondeu 200. MCP `playwright`, `next-devtools` e `postgres` disponíveis.
- Usuários conferidos no banco: Administrador `cazalbe@gmail.com` (`users.id` 19, `admin`, ativo, Suporte, `department_id` 14); Membro `rodalv@gmail.com` (`users.id` 18, `member`, ativo, Suporte, 14).
- Diretor: não tentado. O comando já informava a recusa de login.
- Relógio: `now()` do banco = 2026-10-28 03:13Z = **28/10 00:13 em São Paulo**. O dia virou em relação à rodada da Etapa 1: **"Hoje" (28/10) não tem nenhum chamado criado no setor 14**. Por isso Hoje só exercita estados vazios nesta rodada. Semana, Mês e Personalizado 26–28 out carregam os dados.
- Sessão: a janela do navegador já estava logada como Administrador. A rodada do Administrador foi toda feita nessa sessão. Ao sair para trocar de papel, o login do Membro (`rodalv@gmail.com`) e depois o do próprio Administrador foram recusados (`WARN [Better Auth]: Invalid password` às 03:16:26Z e 03:16:56Z). A senha informada não é aceita pelas duas contas neste momento. Parei depois de uma tentativa por conta, para não gerar bloqueio. Efeito: PO4 e PO6 (Membro) não foram executados.
- Os dados de teste foram só lidos: nenhuma escrita no banco.

Bordas usadas (São Paulo, UTC-3): hoje `2026-10-28 03:00Z` a `2026-10-29 03:00Z`; semana `2026-10-26 03:00Z` a `2026-11-02 03:00Z`; mês `2026-10-01 03:00Z` a `2026-11-01 03:00Z`; personalizado 26–28 out `2026-10-26 03:00Z` a `2026-10-29 03:00Z`; 2026-01-01 `2026-01-01 03:00Z` a `2026-01-02 03:00Z`.

## Cenários

| #    | Cenário                                                  | Papel | Status                                         |
| ---- | -------------------------------------------------------- | ----- | ---------------------------------------------- |
| PO1  | Coletivo em Hoje bate com `TT`/`OV`                      | A     | PASSOU (Hoje vazio; ver nota)                  |
| PO2  | Individual em Hoje, Semana, Mês, Personalizado 26–28 out | A     | PARCIAL (só Mês tem dado para o Administrador) |
| PO3  | Coletivo em Semana e Mês idêntico                        | A     | PASSOU                                         |
| PO4  | Individual do Membro em Hoje e Mês                       | M     | NÃO EXECUTADO (login do Membro recusado)       |
| PO5  | Individual em período sem chamado meu                    | A     | PASSOU                                         |
| PO6  | `chamados > 0` e `ITT` vazio                             | M     | NÃO EXECUTADO (login do Membro recusado)       |
| PO7  | Alternar Coletivo e Individual sem requisição            | A     | PASSOU                                         |
| PO8  | Individual + F5 volta a Coletivo                         | A     | PASSOU                                         |
| PO9  | Trocar período em Individual mantém o modo               | A     | PASSOU                                         |
| PO10 | Árvore de acessibilidade, um título, ids                 | A     | PASSOU                                         |
| PO11 | 390×844 nos dois modos                                   | A     | PASSOU                                         |
| PO12 | 1280 px nos dois modos                                   | A     | PASSOU                                         |
| PO13 | Console e dev server sem erro, nenhuma escrita           | A     | PASSOU                                         |

## Evidências

### Consultas de conferência (MCP `postgres`, `:dep` = 14)

Denominador (`chamados` de `IM`) e total do Coletivo (`OV`), por período:

| Período    | `chamados` Individual A (19) | `chamados` Individual M (18) | `chamados` Coletivo |
| ---------- | ---------------------------- | ---------------------------- | ------------------- |
| hoje       | 0                            | 0                            | 0                   |
| semana     | 0                            | 7                            | 9                   |
| mês        | 7                            | 20                           | 34                  |
| 26–28 out  | 0                            | 7                            | 9                   |
| 2026-01-01 | 0                            | 0                            | 0                   |

Ranking `ITT` (Individual) e `TT` (Coletivo), 6 primeiros, mesma ordem do contrato (`n desc, lower(name), id`):

- **Mês, Individual A (19):** `#fiscal_orientação` 4, `#movimentacao_estoque_duvida` 2, `#movimentacao_estoque_falha` 1 (3 tags).
- **Mês, Coletivo:** `#fiscal_orientação` 11, `#Impressora_fiscal_nao_fiscal` 5, `#Dúvida_Sistema` 3, `#internet_rede_vpn` 3, `#fiscal_migracao_novas_regras` 2, `#fiscal_mudanca_regime_tributario` 2.
- **Semana e 26–28 out, Coletivo:** `#Dúvida_Sistema` 3, `#fiscal_migracao_novas_regras` 1, `#fiscal_mudanca_regime_tributario` 1, `#fiscal_orientação` 1, `#internet_rede_vpn` 1, `#Loja_Parada` 1.
- **Semana e 26–28 out, Individual A:** `ITT` vazio com `chamados` = 0.
- Para referência (não testado na tela): Individual M no mês = `#fiscal_orientação` 6, `#Impressora_fiscal_nao_fiscal` 3, `#internet_rede_vpn` 3, `#Dúvida_Sistema` 2, `#fiscal_migracao_novas_regras` 1, `#fiscal_mudanca_regime_tributario` 1 (de 20); M em semana e 26–28 out = `#Dúvida_Sistema` 2 e mais cinco com 1 (de 7).

### Tela observada (Administrador)

| Período    | Modo       | Card                                                                       | Confere                                     |
| ---------- | ---------- | -------------------------------------------------------------------------- | ------------------------------------------- |
| Hoje       | Coletivo   | `—` · `Nenhum chamado no período`                                          | sim (0 chamados)                            |
| Hoje       | Individual | `—` · `Nenhum chamado seu no período`                                      | sim (0 chamados)                            |
| Semana     | Coletivo   | `#Dúvida_Sistema` · `3 chamados · 33% do volume` · lista 3,1,1,1,1,1       | sim (floor(300/9) = 33)                     |
| Semana     | Individual | `—` · `Nenhum chamado seu no período`                                      | sim (A tem 0)                               |
| Mês        | Coletivo   | `#fiscal_orientação` · `11 chamados · 32% do volume` · lista 11,5,3,3,2,2  | sim (floor(1100/34) = 32)                   |
| Mês        | Individual | `#fiscal_orientação` · `4 chamados · 57% do volume` · lista 4,2,1          | sim (floor(400/7) = 57), 3 itens como `ITT` |
| 26–28 out  | Coletivo   | `#Dúvida_Sistema` · `3 chamados · 33% do volume` · lista igual à de Semana | sim                                         |
| 26–28 out  | Individual | `—` · `Nenhum chamado seu no período`                                      | sim                                         |
| 2026-01-01 | Coletivo   | `—` · `Nenhum chamado no período`                                          | sim                                         |
| 2026-01-01 | Individual | `—` · `Nenhum chamado seu no período`, sem lista                           | sim (PO5)                                   |

### Coletivo igual ao de antes

- A alteração em `app/_lib/data/dashboard.ts` (`git diff`) só acrescenta `assigneeId?` e uma linha dentro do `and(...)` que vira `undefined` sem a pessoa, então o SQL do Coletivo é textualmente o mesmo.
- Em Semana, Mês e 26–28 out o líder, a contagem e o percentual do Coletivo batem com `TT`/`OV` (tabela acima). Hoje e 2026-01-01 dão o estado vazio com a mensagem de sempre, sem dado para comparar. Não existe captura anterior do card para comparação direta, então "idêntico" está sustentado pela consulta de conferência e pelo diff.

### PO7

Escuta de `page.on('request')` durante 3 ciclos Coletivo ↔ Individual em Mês (6 trocas): **0 requisições**, 0 mensagens de console de erro ou aviso, o card trocando a cada clique (`4 chamados · 57%` ↔ `11 chamados · 32%`).

### PO8

Individual marcado em Mês, F5: `checked` voltou a Coletivo (`["true","false"]`), card com `11 chamados · 32% do volume`. URL `?periodo=mes` antes e depois.

### PO9

Individual marcado: link Semana (`/dashboard?periodo=semana`) mostrou `Nenhum chamado seu no período` com Individual ainda marcado; link Mês voltou a `4 chamados · 57%` com Individual ainda marcado; Personalizado 26–28 out (`?periodo=personalizado&de=2026-10-26&ate=2026-10-28`, escolhido pelo calendário e "Aplicar") manteve o modo Individual (`Nenhum chamado seu no período`).

### PO10

`ariaSnapshot` do `section` "Principal ofensor", nos dois modos: um `region "Principal ofensor"`, um `heading` nível 2, um `paragraph` de destaque, uma só `list` (Individual: 3 itens; Coletivo: 6 itens). No DOM: 1 `h2` "Principal ofensor", 1 `section` com esse título, 0 `id` duplicado na página, painel do modo oculto com `display: none` e 0 elementos focáveis.

### PO11 e PO12 (Mês, Administrador)

| Largura | Modo       | scrollWidth/clientWidth | Card Principal ofensor (x, y, largura, altura) | Maiores atrasos (x, y, largura, altura) |
| ------- | ---------- | ----------------------- | ---------------------------------------------- | --------------------------------------- |
| 390     | Coletivo   | 375 / 375               | 20, 810, 335, 354                              | 20, 1176, 335, 239                      |
| 390     | Individual | 375 / 375               | 20, 810, 335, 234                              | 20, 1056, 335, 239                      |
| 1280    | Coletivo   | 1265 / 1265             | 256, 314, 586, 354                             | 854, 314, 387, 354                      |
| 1280    | Individual | 1265 / 1265             | 256, 314, 586, 239                             | 854, 314, 387, 239                      |

Sem rolagem horizontal; nenhum elemento do card passa da borda direita dele. A 1280 px o card ocupa o mesmo x e a mesma largura (586 px, cerca de 3/5) nos dois modos. A altura da linha encolhe de 354 para 239 no Individual porque a lista passa de 6 para 3 itens e a linha segue a maior altura entre os dois cards (a tabela de Maiores atrasos mantém o conteúdo do Coletivo, 239 px). Screenshots: `.qa-output/po-ind-390.png` e `.qa-output/po-ind-1280.png`.

### Cards ainda não migrados

Maiores atrasos continua com o conteúdo do Coletivo no Individual (mesma tabela, mesma largura). Gráfico e Transferências não foram medidos nesta rodada, só Maiores atrasos. Esperado, não é defeito.

### PO13

- `get_errors` (`next-devtools`) no fim: `configErrors: []`, `sessionErrors: []`.
- Console do navegador: nenhum erro ou aviso da aplicação nem de hidratação durante as trocas. A mensagem `TypeError: Failed to execute 'observe' on 'MutationObserver'` aparece uma vez por carregamento e vem de um `addInitScript` residual da sessão do navegador (já registrada na rodada da Etapa 1), não da aplicação.
- `next-development.log`: os `WARN [Better Auth]: Invalid password` de 03:16:26Z e 03:16:56Z vêm das tentativas de login desta rodada; os de 02:50Z são anteriores. Os erros de parsing em `page.tsx` (01:21 local) são de edição em andamento anterior ao teste e não se repetiram.
- Nenhuma escrita no banco: só leitura.

## EXPLAIN ANALYZE (informativo; Mês, setor 14, Administrador id 19)

Rodado pelo MCP `postgres` com as mesmas leituras que `listDashboardTopTags` gera (`created_at` entre `2026-10-01 03:00Z` e `2026-11-01 03:00Z`). `ticket` tem 248 linhas, `ticket_tag` 245, `tag` 36.

**Total, sem `assigned_to` (Coletivo):**

```
Aggregate (cost=11.24..11.26 rows=1) (actual time=0.046..0.047 rows=1)
  -> Seq Scan on ticket t (cost=0.00..11.18 rows=24) (actual rows=34)
       Filter: created_at >= .. AND created_at < .. AND current_department_id = 14
       Rows Removed by Filter: 214
Execution Time: 0.153 ms
```

**Total, com `assigned_to = 19`:**

```
Aggregate (cost=11.78..11.79 rows=1) (actual time=0.041..0.041 rows=1)
  -> Seq Scan on ticket t (cost=0.00..11.78 rows=1) (actual rows=7)
       Filter: created_at .. AND current_department_id = 14 AND assigned_to = 19
       Rows Removed by Filter: 241
Execution Time: 0.065 ms
```

**Ranking, sem `assigned_to` (Coletivo):** `Limit` > `Sort` > `GroupAggregate` (chave `tg.id`) > `Sort` > `Hash Join` (`tt.tag_id = tg.id`) > `Hash Join` (`tt.ticket_id = t.id`) com `Seq Scan on ticket_tag` (245 linhas), `Hash` de `Seq Scan on ticket t` (34 linhas, filtro por `current_department_id` e `created_at`, 214 removidas) e `Hash` de `Seq Scan on tag tg` (9 linhas, `department_id = 14`). `Execution Time: 0.224 ms`.

**Ranking, com `assigned_to = 19`:** `Limit` > `Sort` > `GroupAggregate` > `Sort` > `Nested Loop` > `Hash Join` (`tt.ticket_id = t.id`) com `Seq Scan on ticket_tag` (245 linhas) e `Hash` de `Seq Scan on ticket t` (7 linhas, filtro com `assigned_to = 19`, 241 removidas), e `Index Scan using tag_pkey on tag tg` (7 loops, `department_id = 14` como filtro). `Execution Time: 0.149 ms`.

Leitura:

- A variante sem filtro tem o mesmo desenho de plano do Coletivo de antes: leitura sequencial de `ticket` filtrada por `current_department_id` e `created_at`. O SQL é o mesmo (diff acima); a tabela é pequena e o planejador escolhe Seq Scan.
- A variante com filtro **não usa `ticket_assigned_to_idx`** nem outro índice de `ticket`: também Seq Scan, só com `assigned_to = 19` no filtro. Única diferença no ranking: o planejador troca o `Hash Join` com `tag` por `Nested Loop` + `Index Scan using tag_pkey`, porque estima 1 linha. Com 248 linhas na tabela, o uso de índice só deve aparecer com volume maior; não dá para concluir nada sobre produção.

## Falhas

Nenhuma.

## Erros fora dos cenários

Nenhum, além do que está em PO13.

## Não executados

- **PO4 (Membro, Individual em Hoje e Mês):** o login de `rodalv@gmail.com` foi recusado (`Invalid password`, 03:16:26Z). Esperado para quando rodar: `ITT` com `:eu` = 18 no mês = `#fiscal_orientação` 6, `#Impressora_fiscal_nao_fiscal` 3, `#internet_rede_vpn` 3, `#Dúvida_Sistema` 2, `#fiscal_migracao_novas_regras` 1, `#fiscal_mudanca_regime_tributario` 1, percentuais `floor(100 × n / 20)` = 30%, 15%, 15%, 10%, 5%, 5% (destaque `6 chamados · 30% do volume`); Hoje = `Nenhum chamado seu no período`.
- **PO6 (chamados > 0 e `ITT` vazio):** existe candidato no banco, sem criar dado: Membro (id 18), Personalizado 2026-10-15 a 2026-10-15, 1 chamado em `current_department_id` 14 sem nenhuma tag do setor 14 (consulta por dia sobre `ticket` x `ticket_tag` x `tag`, só esse dia tem `com_tag` = 0 para os ids 18 e 19). Esperado: `—` e `Nenhum chamado seu com tag no período`. Não executado porque o login do Membro foi recusado. Para o Administrador (id 19) não existe esse caso no banco.
- **Diretoria:** fora do escopo (login recusado, conforme o comando).

## Observações

- Sem dado de Individual para o Administrador em Hoje, Semana e 26–28 out (ele não tem chamados recebidos nesses períodos), a cobertura de PO2 com lista é só Mês. A cobertura de Individual com lista em Semana e Hoje depende de PO4 (Membro tem 7 chamados na semana).
- O "Hoje" desta rodada é um dia sem chamados no setor, então PO1 comprova só o estado vazio do Coletivo. O Coletivo com dados foi conferido em Semana, Mês e 26–28 out.
- Nota para quem for reexecutar: a senha informada no pedido foi recusada pelas duas contas no navegador. Conferir/redefinir a senha QA antes do reteste de PO4 e PO6.

## Reteste 1 (Membro)

Login de `rodalv@gmail.com` aceito na única tentativa feita com a senha corrigida (a anterior estava errada); sessão confirmada na tela como "Suporte · Membro". Senha não registrada. Execução só de leitura.

| #   | Cenário                                                            | Papel | Status |
| --- | ------------------------------------------------------------------ | ----- | ------ |
| PO2 | Individual com lista em Semana (complemento)                       | M     | PASSOU |
| PO4 | Individual do Membro em Hoje e Mês; Coletivo igual ao do A         | M     | PASSOU |
| PO6 | Personalizado 2026-10-15 a 2026-10-15, `chamados > 0`, `ITT` vazio | M     | PASSOU |

- **PO4, Mês:** Individual = `#fiscal_orientação` `6 chamados · 30% do volume` (6 de 20), lista 6, 3, 3, 2, 1, 1 (`#fiscal_orientação`, `#Impressora_fiscal_nao_fiscal`, `#internet_rede_vpn`, `#Dúvida_Sistema`, `#fiscal_migracao_novas_regras`, `#fiscal_mudanca_regime_tributario`), igual à `ITT` com `:eu` = 18. Coletivo do Membro em Mês: `11 chamados · 32% do volume`, lista 11, 5, 3, 3, 2, 2, igual ao do Administrador.
- **PO4, Hoje:** Individual `—` + `Nenhum chamado seu no período`; Coletivo `—` + `Nenhum chamado no período` (0 chamados no dia).
- **PO2, Semana (Membro):** Individual = `#Dúvida_Sistema` `2 chamados · 28% do volume` (2 de 7, floor(200/7) = 28), lista 2, 1, 1, 1, 1, 1, igual à `ITT` de 18 na semana. Coletivo da Semana igual ao do Administrador (`3 chamados · 33%`).
- **PO6:** `?periodo=personalizado&de=2026-10-15&ate=2026-10-15`, Individual = `—` + `Nenhum chamado seu com tag no período`, sem lista (o Membro tem 1 chamado nesse dia e nenhuma tag do setor). O Coletivo do mesmo dia mostrou `—` + `Nenhum chamado com tag no período`.
- Nenhuma escrita no banco; sem erro novo.
