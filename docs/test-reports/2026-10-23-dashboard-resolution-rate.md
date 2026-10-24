# Relatório de testes — Taxa de resolução sobre o que o setor recebeu (Início)

- **Data:** 2026-10-23
- **Contrato:** `docs/contracts/dashboard-overview.md`, seção "Revisão 2026-10-23 — taxa de resolução sobre o que o setor recebeu" (cenários RR1–RR10)
- **Commit:** `633a79e` · alterações não comitadas: sim (`app/_lib/types/dashboard.ts`, `app/_lib/domain/dashboard.ts`, `app/_lib/data/dashboard.ts`, `app/(app)/dashboard/_components/{dashboard-overview,resolution-progress}.tsx`, docs)
- **Ambiente:** `http://localhost:3000`, `next dev`, banco de desenvolvimento
- **Resultado:** 7 de 10 passaram · 0 falharam · 0 bloqueados · 3 não executados

## Pré-requisitos

- Dev server: `/login` respondeu 200.
- MCP: `playwright`, `next-devtools` e `postgres` disponíveis (`SELECT 1` ok).
- Usuários: o usuário forneceu credenciais próprias, no lugar dos usuários QA. Administrador `cazalbe@gmail.com` (Suporte, setor 14, `admin`, ativo) e Membro `rodalv@gmail.com` (Suporte, setor 14, `member`, ativo). Conferidos no banco. Nenhuma senha consta neste relatório.
- `RESEND_API_KEY` está preenchida no `.env`. Nenhum cenário desta bateria dispara e-mail, então não afetou o resultado.
- Os usuários I (QA Infra) e D (Diretoria) não foram fornecidos.
- **Relógio.** O relógio do banco está 24 h à frente do da máquina que roda o app. Banco: `now()` = 2026-10-25 01:01 UTC. Máquina: 2026-10-24 01:03 UTC. O app mostra "Hoje" = 23 out. Chamados criados agora recebem `created_at` com a data de 24 out (SP), e o app não alcança essa data: o Personalizado de 24 out cai em 23. Por isso não criei chamado `[QA]` (ver RR6). Detalhes em "Observações".

Consulta de conferência `RR(14, ini, fim)`, exatamente a do contrato, rodada pelo MCP `postgres` com limites em `America/Sao_Paulo`. Resultados usados (setor 14, Suporte):

| Período (SP)        | abertos | aceitos | recebidos | resolvidos | card 1 (`current_department_id`) |
| ------------------- | ------- | ------- | --------- | ---------- | -------------------------------- |
| 23/10 (Hoje no app) | 3       | 0       | 3         | 3          | 3                                |
| Semana 19–25/10     | 7       | 3       | 10        | 9          | 9                                |
| Mês 01–31/10        | 22      | 6       | 27        | 15         | 25                               |
| 21–23/10            | 3       | 0       | 3         | 3          | 3                                |
| 15/10               | 0       | 1       | 1         | 2          | 1                                |
| 14/10               | 3       | 0       | 3         | 0          | 1                                |
| 12/10               | 6       | 1       | 6         | 2          | 6                                |
| 12–15/10            | n/d     | n/d     | 10        | 4          | 8                                |
| 08/10               | 3       | 0       | 3         | 2          | 3                                |
| 22/10               | 0       | 0       | 0         | 0          | 0                                |

(12–15/10: recebidos 10 = 6 + 3 + 1 pela soma dos dias, sem repetição entre dias. Esse total é a conta dos dias, não uma consulta separada. A tela exibiu `4 resolvidos de 10`, que coincide com ela.)

## Cenários

| #    | Cenário                                                                                            | Papel                   | Status        |
| ---- | -------------------------------------------------------------------------------------------------- | ----------------------- | ------------- |
| RR1  | Hoje, Semana, Mês e Personalizado de 3 dias batem com `RR`; card 1 inalterado                      | A (`cazalbe@gmail.com`) | PASSOU        |
| RR2  | Taxa acima de 100%: barra cheia, `aria-valuenow=100`, `aria-valuetext` real                        | A                       | PASSOU        |
| RR3  | Taxa até 100%: largura da barra = `%`, `aria-valuenow` = `aria-valuetext`                          | A                       | PASSOU        |
| RR4  | `—` + "N resolvido(s), nenhum recebido" (recebidos = 0, resolvidos > 0)                            | A                       | NÃO EXECUTADO |
| RR5  | Dia sem nada: `—` + "Nenhum chamado no período", sem barra                                         | A                       | PASSOU        |
| RR6  | Preparação da Etapa 1 (#V1 e #V2), Hoje antes e depois                                             | A                       | NÃO EXECUTADO |
| RR7  | Coerência com a série "Resolvidos" do gráfico; card 3 `—` ⇔ X = 0                                  | A                       | PASSOU        |
| RR8  | 1280, 1024 e 390 px: alturas iguais, linha íntegra ou truncada com `title`, sem rolagem horizontal | A                       | PASSOU        |
| RR9  | Hoje e Mês para I (QA Infra) e D (Diretoria)                                                       | I, D                    | NÃO EXECUTADO |
| RR10 | Console e dev server sem erro nem aviso de hidratação                                              | A e Membro              | PASSOU        |

## Evidências por cenário

### RR1

Valores lidos da tela, comparados com `RR(14, …)`:

| Período                         | Tela: valor / linha / card 1                                            | `RR` esperado                       |
| ------------------------------- | ----------------------------------------------------------------------- | ----------------------------------- |
| Hoje (23/10)                    | `100%` / `3 resolvidos de 3` / `3`, "Nenhum recebido de outros setores" | 3 de 3, 100%, card 1 = 3            |
| Semana                          | `90%` / `9 resolvidos de 10` / `9`, "+3 recebidos"                      | 9 de 10, 90%, card 1 = 9            |
| Mês                             | `55%` / `15 resolvidos de 27` / `25`, "+6 recebidos"                    | 15 de 27 = 55,5% → 55%, card 1 = 25 |
| Personalizado 21–23/10 (3 dias) | `100%` / `3 resolvidos de 3` / `3`                                      | 3 de 3, 100%                        |

Também conferido: 12/10 (`33%`, `2 resolvidos de 6`), 08/10 (`66%`, `2 resolvidos de 3`) e 12–15/10 (`40%`, `4 resolvidos de 10`).

O card 1 não mudou. Em 14/10, card 1 = 1 e Y = 3. A diferença é aceita pelo contrato: os 3 abertos no setor foram transferidos para fora (`#222` ficou em 14, `#223` foi para 11 e `#224` para 15). O mesmo vale em 15/10: card 1 = 1 e Y = 1.

### RR2

Personalizado 15/10 (`recebidos = 1`, `resolvidos = 2`): valor `200%`, linha `2 resolvidos de 1`. A barra tem largura `width:100%`, igual ao trilho (397 px de 397 px), sem passar dele. `aria-valuenow="100"`, `aria-valuemax="100"`, `aria-valuetext="200%"`. A resposta é a mesma para o Membro. Screenshot a 390 px: `.qa-output/rr-390-200pct.png`.

### RR3

| Dia   | Valor | `aria-valuenow` | `aria-valuetext` | Largura / trilho                   |
| ----- | ----- | --------------- | ---------------- | ---------------------------------- |
| 12/10 | 33%   | 33              | 33%              | 131 / 397 (33%)                    |
| 08/10 | 66%   | 66              | 66%              | 262 / 397 (66%)                    |
| 14/10 | 0%    | 0               | 0%               | 0 / 397; linha `0 resolvidos de 3` |

O caso `0 resolvidos de 3` em 14/10 também confirma o plural no zero.

### RR5

Personalizado 22/10: `—`, `Nenhum chamado no período`, sem `role=progressbar`. O card 3 também mostra `—`.

### RR7

- Hoje (23/10): série Resolvidos do gráfico = 3 e `X` = 3.
- Personalizado 12–15/10: série = 2+0+0+2 = 4 e `X` = 4.
- Semana: série = 3 e `X` = 9. Mês: série = 9 e `X` = 15. A diferença é de 6 nos dois casos e vem de 6 chamados com `resolved_at` em 24/10. O card conta o intervalo inteiro da semana e do mês. O gráfico para em "hoje" (23/10) e não mostra o dia 24. A diferença some se a data do banco estiver certa; ver "Observações". Marquei PASSOU porque a soma da série mais o dia 24 (6, conferido no `RR`) fecha com `X`.
- Card 3 em `—` ⇔ `X = 0`: confere em 14/10 (`0 resolvidos de 3`, tempo médio `—`) e em 22/10 (`—` nos dois).

### RR8

Cards da linha 1 medidos: altura externa **116 px nos quatro**, nas três larguras e em três situações de dados (Mês, 15/10 com `200%` e 22/10 com `—`). A altura bate com o esqueleto, que calculei do código: 18 + 32 + 20 de conteúdo, 12 de `gap`, 32 de padding e 2 de borda, também 116. `StatCard` e o esqueleto não foram alterados (`git diff`). A linha da taxa mede 16 px.

| Largura | Rolagem horizontal | Linha da taxa             |
| ------- | ------------------ | ------------------------- |
| 1280    | não                | inteira, `title` presente |
| 1024    | não                | inteira, `title` presente |
| 390     | não                | inteira, `title` presente |

Observação: o texto `Nenhum chamado resolvido no período` (card 3, não alterado) aparece truncado a 1280 px, com `title`. Não pertence a esta revisão.

A 390 px, o filtro de período e os cards ficam alcançáveis (screenshot acima).

### RR10

- `get_errors` do `next-devtools`: `{"configErrors":[],"sessionErrors":[]}` no meio e no fim da bateria, com os dois papéis.
- Console do navegador (`all: true`, nível warning): 0 erros e 0 avisos.
- Nenhum aviso de hidratação.

### Conferência extra: "Principal ofensor"

O percentual passou a multiplicar antes de dividir. Comparei com a consulta `TT` do contrato, usando o denominador `chamados` do card 1 e `floor(100·n/chamados)`:

| Período  | Tela                                              | Banco                |
| -------- | ------------------------------------------------- | -------------------- |
| Hoje     | `#movimentacao_estoque_duvida`, 2 chamados · 66%  | n=2, chamados=3 → 66 |
| Semana   | `#fiscal_orientação`, 4 chamados · 44%            | 4/9 → 44             |
| Mês      | `#fiscal_orientação`, 10 chamados · 40%           | 10/25 → 40           |
| 12/10    | `#fiscal_orientação`, 2 chamados · 33%            | 2/6 → 33             |
| 12–15/10 | `#Impressora_fiscal_nao_fiscal`, 3 chamados · 37% | 3/8 → 37             |

Todos batem.

## Falhas

Nenhuma.

## Erros fora dos cenários

Nenhum durante a bateria. O arquivo `.next/dev/logs/next-development.log` tem erros anteriores à minha sessão (cerca de 00:22–00:24 no horário do log). São `Export resolutionRatePercent doesn't exist in target module` e `ReferenceError: resolutionRatePercent is not defined`, de quando `domain/dashboard.ts` já tinha trocado a função e `dashboard-overview.tsx` ainda não. É o estado transitório da implementação em andamento. Hoje não ocorre mais: a tela carrega sem erro.

## Não executados

- **RR4.** O Suporte (14) não tem nenhum dia com `recebidos = 0` e `resolvidos > 0`. Os 5 dias com resolução no setor têm recebidos de 1 a 7. Consulta usada: `RR` por dia de `resolved_at`, com `recebidos` pela união:

  ```sql
  with r as (select (resolved_at at time zone 'America/Sao_Paulo')::date d, count(*) n
    from ticket where current_department_id=14 and status in ('resolvido','fechado') and resolved_at is not null group by 1)
  select r.d, r.n, (select count(*) from (select t2.id from ticket t2 where t2.origin_department_id=14
    and (t2.created_at at time zone 'America/Sao_Paulo')::date=r.d
    union select tr.ticket_id from ticket_transfer tr where tr.to_department_id=14 and tr.status='aprovado'
    and (tr.reviewed_at at time zone 'America/Sao_Paulo')::date=r.d) u) rec from r order by 1 desc
  ```

  Linhas: 24/10 6/7, 23/10 3/3, 15/10 2/1, 12/10 2/6, 08/10 2/3. Criar o cenário exigiria resolver no setor um chamado aberto em outro dia, o que não dá com chamados `[QA]` só do setor 14.

- **RR6.** `#V2` precisa de uma conta em QA Infra, que não foi fornecida. `#V1` (criar e resolver um chamado `[QA]` no Suporte) não faria um teste válido por causa do relógio do banco. O chamado ganharia `created_at` em 24/10 (relógio do banco) e `resolved_at` em 23/10 (relógio do app). O "Hoje" do app contaria +1 em resolvidos e +0 em recebidos. Nenhum chamado foi criado e nenhum dado foi alterado.
- **RR9.** Não há credenciais de admin de QA Infra nem do Diretor. A conferência `RR(F, …)` e `RR(DIR, …)` fica para quando houver essas contas.

## Observações

1. **Relógio do banco 24 h à frente do app** (`select now()` → 2026-10-25 01:01 UTC; `date -u` na máquina → 2026-10-24 01:03 UTC). Evidência: os chamados `#259`–`#264` ("Teste 2" a "Teste gráfico") têm `created_at` em 24–25/10 UTC (relógio do banco) e `resolved_at` em 24/10 00:35 UTC (relógio do app, em `#264`). `#264` ("Teste gráfico") foi resolvido antes de ser criado, pelos relógios. Efeitos no teste: (a) o "Hoje" do app não mostra os chamados criados agora; (b) Semana e Mês incluem o dia 24 no card, mas o gráfico para em 23/10, o que gera a diferença de RR7. Não é defeito desta revisão. Pode ser ruído futuro em qualquer teste de "hoje". Quem for acompanhar com chamados novos deve alinhar os relógios antes. Sugestão para o `df-architect`: avaliar se o contrato deve dizer qual relógio vale para `created_at` e `resolved_at`.
2. **Ambiguidade de RR7.** O contrato diz "`X` da linha = soma da série Resolvidos do gráfico" no mesmo período. Em Semana e Mês, o card cobre o intervalo inteiro e o gráfico cobre até "hoje". Em operação normal os dois coincidem, porque não existe resolução no futuro. Vale dizer isso no contrato ou limitar o `periodResolvedCount` a "até agora".
3. A tela mostra `66%` para 2 de 3 e `33%` para 1 de 3, conforme `floor`. Em 15/10 o valor real `200%` aparece no texto e `aria-valuetext`, com `aria-valuenow=100`, como o contrato pede.
4. Os papéis do relatório foram testados com as contas do usuário, não com as `qa.*@directflow.test`. O Membro (`rodalv@gmail.com`) viu os mesmos valores e a mesma estrutura de acessibilidade do Administrador em Semana, Mês, 15/10 e 22/10. O contrato só prevê o papel A. Esta conferência é extra.
5. Janela do navegador deixada aberta, com o Membro logado em `/dashboard?periodo=personalizado&de=2026-10-22&ate=2026-10-22`.
