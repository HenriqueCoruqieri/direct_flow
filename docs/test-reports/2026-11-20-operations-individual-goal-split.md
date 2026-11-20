# Relatório de testes — Operação: objetivo individual dividido e escala nova dos medidores

- **Data:** 2026-11-20
- **Contrato:** `docs/contracts/operations-individual-goal-split.md` (IG1–IG17) e `goalGaugeFor` em `docs/contracts/operations.md`. ADR 027.
- **Commit:** `1aa5762` · alterações não comitadas: não (só relatórios novos em `docs/test-reports/`)
- **Ambiente:** `http://localhost:3000`, `next dev`, banco de desenvolvimento, escrita proibida (só leitura)
- **Resultado:** 9 de 17 passaram · 0 falharam · 0 bloqueados · 8 não executados (IG4, IG5, IG6, IG8, IG10, IG11, IG12, IG13; IG7 e IG9 contam como passou parcial, ver tabela)

## Estado real do banco usado como base

Setor Suporte (id 3), único com objetivos cadastrados (`department_goal`: SLA 80 · TMA 5h · horas em atraso 50h · chamados em atraso 20 · TMR 5h). Diretoria (2) e P&D (4) não têm objetivos.

```sql
select sla_min_percent, tma_max_hours, overdue_hours_limit, overdue_tickets_limit, tmr_max_hours
from department_goal where department_id = 3;
-- 80 | 5 | 50 | 20 | 5
select count(*) from users where department_id = 3 and is_active;   -- 10 (11 com 1 inativo)
```

Limites individuais esperados: horas `floor(50 × 60 ÷ 10)` = 300 min = `5h`; chamados `floor(20 ÷ 10)` = `2`. A tela mostrou `Limite ≤ 5h` e `Limite ≤ 2 chamados`. Bate.

Dados do mês no Suporte (consulta do contrato, início do mês `2026-11-01 03:00+00`, statuses abertos = aberto, em_analise, encaminhado, recusado, em_andamento):

| pessoa (id)         | chamados em atraso | horas em atraso      |
| ------------------- | ------------------ | -------------------- |
| 4 (Marcelo, member) | 1                  | 10,99h (= 10h 59min) |
| 9 (Douglas)         | 1                  | 3,72h                |
| time (união)        | 2                  | 14,71h               |

```sql
select count(*) from (<união itens 1 e 2 do time> union <item 3: ticket_transfer>) x;  -- 2
select (select count(*) from ticket_transfer where from_department_id=3 and from_due_at < created_at and created_at >= timestamptz '2026-11-01 03:00+00') envios_vencidos_mes,
       (select count(*) from ticket where current_department_id=3 and assigned_to is null and due_at < now() and status in (...abertos...)) fila_vencida_sem_resp;
-- 0 | 0
```

## Cenários

| #    | Cenário                                                                                  | Papel                                                                              | Status                                                                                                                                                                                                                                                                                                                                              |
| ---- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| IG1  | Individual: quatro cards, sem TMR                                                        | member `mco_12@gmail.com`; admin `cazalbe@gmail.com`; member `rodilindo@gmail.com` | PASSOU                                                                                                                                                                                                                                                                                                                                              |
| IG2  | Rótulos de alvo derivados                                                                | member `mco_12@gmail.com`                                                          | PASSOU (valores reais: `Objetivo ≥ 80%`, `Objetivo ≤ 5h`, `Limite ≤ 5h`, `Limite ≤ 2 chamados`; ver Observações)                                                                                                                                                                                                                                    |
| IG3  | Equipe com números cadastrados, sem divisão                                              | admin `cazalbe@gmail.com`; diretor `lucas12surf@gmail.com` (`?setor=3`)            | PASSOU (`Limite ≤ 50h`, `Limite ≤ 20 chamados`)                                                                                                                                                                                                                                                                                                     |
| IG4  | Desativar pessoa e recalcular                                                            | -                                                                                  | NÃO EXECUTADO (exige escrita em Pessoas)                                                                                                                                                                                                                                                                                                            |
| IG5  | Limite de chamados 2 com 5 pessoas (alvo 0)                                              | -                                                                                  | NÃO EXECUTADO (exige alterar objetivo do setor)                                                                                                                                                                                                                                                                                                     |
| IG6  | Limite de horas 0                                                                        | -                                                                                  | NÃO EXECUTADO (exige alterar objetivo do setor)                                                                                                                                                                                                                                                                                                     |
| IG7  | Pessoa acima do limite de horas                                                          | member `mco_12@gmail.com`                                                          | PASSOU parcial: 10h 59min, alvo 5h → `Não aderente`, `5h 59min acima do limite`, resumo `Objetivo não atingido · não aderente em horas em atraso`, descrição `10h 59min em atraso no mês: 5h 59min acima do limite de 5h.`; ela fica fora do N (9 de 10). Números do exemplo do contrato (9h/3 pessoas) não reproduzíveis sem editar dados          |
| IG8  | Pessoa com chamados acima do alvo                                                        | -                                                                                  | NÃO EXECUTADO (nenhuma pessoa tem mais de 2 chamados em atraso; a maior tem 1)                                                                                                                                                                                                                                                                      |
| IG9  | "N de M" bate com a Individual de cada um                                                | admin + 2 members                                                                  | PASSOU parcial: Equipe `9 de 10`, texto `9 de 10 pessoas cumpriram os quatro objetivos individuais (SLA, TMA, horas em atraso e chamados em atraso).`. Conferidas 3 das 10 individuais (Marcelo `Objetivo não atingido`; Carlos e Rodinei `Objetivo atingido`), coerentes com 9 de 10 (só Marcelo reprova nos dados). As outras 7 não foram abertas |
| IG10 | Chamado vencido sem responsável                                                          | -                                                                                  | NÃO EXECUTADO (`fila_vencida_sem_resp` = 0 no Suporte)                                                                                                                                                                                                                                                                                              |
| IG11 | Envio vencido a outro setor                                                              | -                                                                                  | NÃO EXECUTADO (`envios_vencidos_mes` = 0)                                                                                                                                                                                                                                                                                                           |
| IG12 | Envio volta por recusa e é resolvido atrasado                                            | -                                                                                  | NÃO EXECUTADO (sem transferência vencida)                                                                                                                                                                                                                                                                                                           |
| IG13 | Sem repetir chamado por pessoa                                                           | -                                                                                  | NÃO EXECUTADO (sem transferência vencida)                                                                                                                                                                                                                                                                                                           |
| IG14 | Diálogo "Editar objetivos"                                                               | admin `cazalbe@gmail.com`                                                          | PASSOU (abriu e fechou sem salvar; "salvar grava os números do time" não exercitado)                                                                                                                                                                                                                                                                |
| IG15 | Diretor: Individual da Diretoria e Equipe de outro setor                                 | diretor `lucas12surf@gmail.com`                                                    | PASSOU parcial: Equipe `?setor=3` sem divisão, 9 de 10; Individual da Diretoria cai no estado `Objetivos ainda não definidos` com a descrição nova (Diretoria sem objetivos, divisão com o Diretor não observável)                                                                                                                                  |
| IG16 | Layout da Individual 4 cards em 390/768/1280                                             | admin `cazalbe@gmail.com`                                                          | PASSOU (390: 4 cards empilhados; 768: 2×2; 1280: 4 em linha; `scrollWidth == clientWidth` nos três). Esqueleto não verificado                                                                                                                                                                                                                       |
| IG17 | Conferência numérica com o banco                                                         | -                                                                                  | PASSOU (memberCount 10; Marcelo 1 chamado e 10,99h = tela `1 chamado` e `10h 59min`; time 2 chamados e 14,71h = tela `2 chamados` e `14h 42min`; ver nota abaixo)                                                                                                                                                                                   |
| ESC1 | Escala nova: arco termina no limite, sem traço, pontas `piso`/`limite` com valor embaixo | todos                                                                              | PASSOU                                                                                                                                                                                                                                                                                                                                              |
| ESC2 | Acima do limite: arco cheio e vermelho                                                   | member `mco_12@gmail.com`                                                          | PASSOU (10h 59min contra 5h)                                                                                                                                                                                                                                                                                                                        |
| ESC3 | SLA de 0% a 100% com traço                                                               | todos                                                                              | PASSOU                                                                                                                                                                                                                                                                                                                                              |

Contagem: PASSOU inteiros = IG1, IG2, IG3, IG14, IG16, IG17, ESC1, ESC2, ESC3 (9); parciais = IG7, IG9, IG15; não executados = IG4, IG5, IG6, IG8, IG10, IG11, IG12, IG13 (8).

## Evidência da escala dos medidores (ESC1–ESC3)

- Contagem (chamados em atraso): pontas `piso` com `0` e `limite` com `2` (só o número, sem unidade). Marcelo, 1 de 2: arco a ~50%, verde, sem traço.
- Horas (TMA, horas em atraso, TMR): `piso 0h`, `limite 5h` (Individual e Equipe), `limite 50h` (horas, Equipe), `limite 20` (chamados, Equipe). Arco proporcional ao valor sobre o limite: TMA 3h 12min de 5h (~64%); horas 14h 42min de 50h (~29%); TMR 33min de 5h.
- Acima do limite: horas em atraso de Marcelo, 10h 59min com limite 5h: arco cheio e vermelho, selo `Não aderente`.
- SLA: pontas `0%` e `100%`, traço no objetivo (80% e 90%), sem segunda linha de detalhe.
- Sem dado (admin Carlos, TMA e SLA `Sem dados`): arco vazio, `—` no centro, pontas mantidas.
- Screenshots em `.qa-output/`: `ig-individual-member-desktop.png`, `ig-team-admin-desktop.png`, `ig14-dialog.png`, `ig16-390.png`, `ig16-768.png`, `ig16-1280.png`.

## Falhas

Nenhuma.

## Erros fora dos cenários

`get_errors` do `next-devtools` devolveu `configErrors: []` e `sessionErrors: []` depois de cada tela (Individual membro e admin, Equipe admin e diretor, diálogo, 3 viewports, Individual de outro membro). Sem erro de runtime, hidratação ou build. Console do Playwright sem erro.

## Não executados

- IG4, IG5, IG6: exigem escrita (desativar pessoa, mudar objetivo do setor), proibida nesta rodada. Estado atual: 10 ativos, objetivos 50h/20 chamados. Consulta: `select count(*) from users where department_id=3 and is_active` e `select * from department_goal where department_id=3`.
- IG8: precisa de pessoa com chamados em atraso acima do alvo (2). Consulta (agrupada por pessoa, mês) mostra máximo de 1.
- IG10, IG11, IG12, IG13: não há chamado vencido na fila nem envio vencido de/para o Suporte no mês (`envios_vencidos_mes = 0`, `fila_vencida_sem_resp = 0`). A regra de atribuição por `from_assignee_id` e a deduplicação por (chamado, pessoa) ficam sem cobertura no navegador. Os chamados `[QA]` #27–#35 do dia não produziram esses casos no Suporte.
- Divisão na Diretoria (parte de IG15) e P&D: sem `department_goal`; o Individual mostra só o estado "não definido".

## Observações

- A numeração do contrato (90 / 8h / 25h / 16 / 3 pessoas) não existe no banco; foram conferidos os números reais (80 / 5h / 50h / 20 / 10 pessoas) contra a mesma fórmula (`floor`, minutos). Resultado idêntico à regra.
- IG17: a consulta de horas da tela usa o recorte do contrato; a soma de horas das duas pessoas (14,71h) difere por arredondamento dos 14h 42min exibidos (14,70h); sem outras fontes de atraso no time, é consistente.
- A aba da Equipe usa `aba=time` na URL; `aba=equipe` redireciona para `aba=meu-objetivo`. Comportamento de parâmetro inválido, sem erro. Para membro (não admin), `aba=time` não foi testado.
- Dois itens do contrato (esqueleto com a mesma grade do painel e "salvar grava os números do time") não foram exercitados.
- Nenhuma ambiguidade do contrato registrada.
- Sessão final do navegador: logado como `rodilindo@gmail.com`; janela deixada aberta.
