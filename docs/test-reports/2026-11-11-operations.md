# Relatório de testes — Operação (metas operacionais por setor)

- **Data:** 2026-11-11
- **Contrato:** `docs/contracts/operations.md` (ADR 022)
- **Commit:** `6fee44b` · alterações não comitadas: sim (`app/_lib/domain/department-goals.ts`)
- **Ambiente:** `http://localhost:3000`, `next dev`, banco de desenvolvimento
- **Resultado:** 15 de 18 passaram · 0 falharam · 0 bloqueados · 2 não executados (OP10, OP18) · 1 parcial (OP13)

Contas desta rodada (reais, a pedido do usuário; senhas não registradas): Diretor `diretorqa@gmail.com`, Admin `cazalbe@gmail.com` (Suporte), Membro `rodalv@gmail.com` (Suporte). Os usuários `qa.*@directflow.test` não foram usados. Escrita só em `department_goal` (Suporte pelo Admin, QA Suporte pelo Diretor). `.env` não lido; `RESEND_API_KEY` não verificada, mas a feature não envia e-mail.

## Pré-requisitos

Servidor no ar (200 em `/login`), MCP `playwright`, `next-devtools` e `postgres` respondendo (`department_goal` existia, com 0 linhas no início). Navegador visível, uma aba.

## Cenários

| #    | Cenário                                                           | Papel       | Status                                                            |
| ---- | ----------------------------------------------------------------- | ----------- | ----------------------------------------------------------------- |
| OP1  | Membro: menu e estado vazio, sem botão de editar                  | Membro      | PASSOU                                                            |
| OP2  | Admin: texto do editor, "Definir metas", salvar cria a linha      | Admin       | PASSOU                                                            |
| OP3  | Validação: vazio, 0, 1,5, -1, 101/120, 1000, 10000                | Admin       | PASSOU                                                            |
| OP4  | Action forjada com setor de outro/Não alocado/inativo/inexistente | Admin       | PASSOU                                                            |
| OP5  | Action forjada pelo Membro no próprio setor                       | Membro      | PASSOU                                                            |
| OP6  | Diretor: id inexistente, Não alocado, inativo                     | Diretor     | PASSOU                                                            |
| OP7  | Seletor de setor, Time e Produção trocam; editar QA Suporte       | Diretor     | PASSOU                                                            |
| OP8  | Membro com `?setor=` de outro setor                               | Membro      | PASSOU                                                            |
| OP9  | `?aba=x`, `?periodo=x`, `?de` futuro, `?setor=abc`                | Todos       | PASSOU                                                            |
| OP10 | Não alocado vê só a mensagem                                      | Não alocado | NÃO EXECUTADO (sem conta; só existe Marcos Antônio sem acesso)    |
| OP11 | Conferência numérica de Minha meta e Time contra o banco          | Admin       | PASSOU (Minha meta: ver Observações 1)                            |
| OP12 | Mês sem resolvidos: SLA/TMA "Sem dados" e não reprovam            | Admin       | PASSOU (Minha meta do Admin e Aceite do time)                     |
| OP13 | Produção com 3 e com 12 pessoas                                   | Admin       | PARCIAL (só 7 e 2 pessoas; 12 não existe no banco)                |
| OP14 | Produção em período sem resolvidos                                | Admin       | PASSOU                                                            |
| OP15 | Temas claro e escuro                                              | Admin       | PASSOU                                                            |
| OP16 | 390×844 nas três abas e no diálogo                                | Admin       | PASSOU                                                            |
| OP17 | Salvar e reabrir: valores, rodapé, subtítulo                      | Admin       | PASSOU                                                            |
| OP18 | Admin rebaixado a membro com a tela aberta                        | Admin       | NÃO EXECUTADO (exige alterar papel de conta real, fora do escopo) |

Extras cobertos: dupla submissão (duplo clique em "Salvar metas": um toast e uma linha), edição da meta já existente (`created_at` preservado), "N de M cumpriram", avatar no topo da barra e "Você" em negrito, pessoas com zero, ordem por contagem desc e nome, `?setor=` mantido na aba Minha meta sem afetá-la, erros do dev server e console.

## Evidências principais

- **OP1/OP8/OP9:** Membro em `/operations?aba=time&setor=18&periodo=xx` caiu em `/operations?aba=time&periodo=mes`. Em Time e Produção só há o combobox de busca (sem seletor de setor) e não há botão de metas. Estado vazio: "Metas ainda não definidas" com o texto do membro. Menu mostra Início, Operação, Meus chamados, Fila do setor, Aprovações.
- **OP5:** POST da action (`saveDepartmentGoals`, id `4006cf11…`) pelo navegador, logado como Membro, `departmentId` 14: `{"ok":false,"code":"FORBIDDEN","message":"Você não tem permissão para editar as metas deste setor."}`. `department_goal` seguiu com 0 linhas.
- **OP4:** Admin do Suporte com `departmentId` 18, 16, 20 e 9999: sempre `FORBIDDEN` (não revela existência). Com SLA 777 e setor 14: `INVALID_INPUT`, "O valor máximo é 100%.".
- **OP6:** Diretor: 9999 → `NOT_FOUND` ("Setor não encontrado."); 16 (Não alocado), 20 e 21 (inativos) → `FORBIDDEN`. Banco inalterado (`select count(*) from department_goal` = 2 no fim).
- **OP3:** formulário vazio → as cinco mensagens "Informe…" idênticas à tabela do contrato. `0/1000/10000/10000/120` → "Informe o SLA mínimo, de 1 a 100.", "O valor máximo é 999 horas.", "O valor máximo é 9.999 horas.", "O valor máximo é 9.999 chamados.", "O valor máximo é 100%.". `1.5/0/-1/2.5/0` → as mensagens "Informe…" correspondentes. Nada gravado durante as tentativas inválidas.
- **OP2/OP17:** salvou 90 / 8 / 10 / 5 / 80 → toast "Metas salvas.", diálogo fechou, subtítulo "Suporte · metas de novembro de 2026 · definidas por Carlos Alberto Jr em 11/11/2026". Reabrindo: valores iguais, rodapé "Última alteração por Carlos Alberto Jr em 11/11/2026 às 20:22." (23:22 UTC). Duplo clique em salvar gerou uma linha só.
- **OP11 (consultas do contrato, `now()` em torno de 23:22–23:26 UTC; Suporte = setor 14):**
  - Time (Suporte): banco `resolvidos 1, no_prazo 1, tma 00:04:45, atraso 178d+183h46min48s, backlog 16, transferências revisadas: nenhuma`. Tela: SLA 100% (Aderente, "10 p.p. acima da meta"), TMA 4min, atraso 4.455h 45min, backlog 16, Aceite "Sem dados". Diferença de 1 min no atraso é só o intervalo entre a renderização e a consulta (16 chamados vencidos acumulam ~16 min/min).
  - N de M: atraso por responsável no banco (Marcelo ~59h, Álvaro ~2.113h, Carlos ~2.237h, demais sem atraso) contra limite de 10h: 3 reprovam em atraso, 4 cumprem → tela "4 de 7 cumpriram" e "4/7".
  - Minha meta (Admin, id 19): banco `resolvidos 0, tma null, atraso 91d+53h36min` → tela SLA e TMA "Sem dados"/"Nenhum chamado resolvido no mês", atraso 2.237h 35min, resumo "Meta não cumprida · não aderente em horas em atraso" (Sem dados não entra na lista, OP12).
  - Time QA Suporte (setor 18, metas 80/12/24/3/70): banco `resolvidos 1, no_prazo 0, tma 1 dia, backlog 109`, atraso 81.917h (conferido por `extract(epoch…)/3600` com `now()` colado ao render: 81.917,43h no banco, 81.917h 19min na tela, coerente com a diferença de ~3,5 s × 109 chamados). Tela: SLA 0% ("Faltam 80 p.p."), TMA 24h ("12h acima do limite"), backlog 109, "0 de 2 cumpriram", Aceite "Sem dados".
- **OP7:** Diretor com seletor mostra Diretoria, Administrativo, Implantação, P&D, QA Infra, QA Suporte, Suporte (sem Não alocado, sem setores inativos). Trocar para QA Suporte levou a `?aba=time&setor=18&periodo=mes`. Definiu 80/12/24/3/70 em QA Suporte: toast "Metas salvas.", diálogo "QA Suporte · as metas valem…", linha gravada com `department_id = 18` e `updated_by = 21` (QA Diretor), subtítulo "definidas por QA Diretor em 11/11/2026". Em Minha meta com `?setor=18` o conteúdo continua sendo o da Diretoria ("Diretoria · metas de novembro de 2026", sem seletor). Produção por setor: Suporte 7 pessoas, QA Suporte 2 pessoas (QA Membro Suporte 1, QA Admin Suporte 0). `?setor=16`, `20`, `abc` e `99999` redirecionam para a URL sem `setor`.
- **OP9 (Admin):** `?aba=producao&setor=18&periodo=personalizado&de=2030-01-01&ate=2030-01-05` → `?aba=producao&periodo=mes`.
- **OP13/OP14:** Produção do Suporte (7 pessoas, 1 resolvido, bate com o banco: só o id 18 resolveu): barra do Álvaro com o avatar "ÁR" no topo, valor 1, rótulo "Você" em negrito sobre a pessoa da sessão, zeros listados na tabela `sr-only` ("Carlos Alberto Jr: 0 resolvidos" etc.). No Admin, o eixo mostra Álvaro, Você (Carlos), Ingrid, José, Lucas… (contagem desc, depois nome). Período `2026-01-01`–`2026-01-05` (banco: 0 resolvidos): "Nenhum chamado resolvido no período" com o texto de apoio do contrato.
- **OP16 (viewport 390, `.qa-output/op-admin-mobile-*.png`):** `scrollWidth == clientWidth` nas três abas; em Produção a rolagem horizontal fica só no `DIV overflow-x-auto` do gráfico (456 de conteúdo em 309) e aparece "Arraste para ver as 7 pessoas." (7 > 5). Diálogo de metas cabe (16 px de folga, sem rolagem interna, botão "Salvar metas" alcançável).
- **OP15:** `.qa-output/op-admin-light-time.png` e `.qa-output/op-admin-dark-time.png`: gauges, selos "Aderente / Não aderente / Sem dados" e resumo legíveis nos dois temas (tema escuro acionado por `prefers-color-scheme`, a classe `dark` entrou no `html`). Produção claro: `.qa-output/op-member-producao.png`.
- **Erros:** `get_errors` do `next-devtools` devolveu `configErrors: []` e `sessionErrors: []` após cada papel; console do navegador sem erros ou avisos (0 de 94 mensagens).

## Falhas

Nenhuma.

## Erros fora dos cenários

Nenhum.

## Não executados

- **OP10 (Não alocado):** não há credencial disponível; a única pessoa em Não alocado é "Marcos Antônio".
- **OP18 (rebaixar o Admin com a tela aberta):** exige alterar o papel de uma conta real.
- **OP13 com 12 pessoas:** nenhum setor tem 12 pessoas ativas (Suporte 7, QA Suporte 2). O comportamento "mais de 5 pessoas" (aviso e rolagem) foi coberto com 7.
- **Avatar em `foreignObject` no WebKit (risco do contrato):** o servidor `playwright` do `.mcp.json` só abre o Chrome e não é permitido lançar navegador próprio. Não executado; só validado no Chromium (avatar "ÁR" posicionado no topo da barra, sem recorte).
- **Minha meta com SLA/TMA da pessoa preenchidos e "Você" com meta definida (Membro):** o Membro só foi testado antes de existir meta (e os usuários com resolvidos no mês não eram o Admin), e não se fez um segundo login nele para respeitar "uma tentativa por conta". Cobertura numérica de SLA e TMA vem do Time (Suporte e QA Suporte) e de "Sem dados" na Minha meta do Admin.
- **Meta da Diretoria:** nenhuma meta foi gravada na Diretoria (fora do escopo autorizado); a Minha meta do Diretor só foi vista no estado vazio, com botão "Definir metas".
- **Teste de `?de` futuro em `operationsPeriodSchema` com o Membro e com o Diretor:** coberto só pelo Admin.

## Observações

1. **Gauge de Horas em atraso (cosmético):** com valor de 4 dígitos mais minutos ("4.456h 8min", "81.916h 22min"), o texto do valor passa da largura do buraco do arco e encosta nas extremidades do anel (visível em `.qa-output/op-admin-light-time.png` e `op-admin-dark-time.png`). Camada provável: app (gauge). Dono: `df-ui`. Não afeta nenhum cenário do contrato.
2. **`?setor=` em Minha meta:** o parâmetro é preservado na URL para o Diretor mesmo na aba em que é ignorado (para a troca de aba manter o setor). O contrato ("Minha meta é sempre o setor da sessão") não diz se a URL canônica deve ou não carregar o `setor` nessa aba. Comportamento atual coerente com `operationsTabHref`; registrar como ambiguidade para o `df-architect` se a intenção era remover.
3. Nas barras de Produção com valor zero não há barra nem avatar (só o rótulo no eixo e a linha na tabela `sr-only`); o contrato diz "avatar no topo da barra" e "zero incluído", mas não diz como o zero aparece. Coerente com a implementação atual.
4. O `id` da linha de QA Suporte é 3, não 2: o `upsert` da edição de Suporte consome valor da sequência (comportamento normal de `insert … on conflict`).
5. Consequências aceitas do contrato observadas: pessoas sem chamados e sem atraso "cumprem" (4 de 7); o time soma o atraso de todos com o mesmo limite da pessoa.

## Linhas criadas em `department_goal`

| id  | Setor           | SLA mín. | TMA máx. | Atraso máx. | Backlog máx. | Aceite mín. | `updated_by`                     |
| --- | --------------- | -------- | -------- | ----------- | ------------ | ----------- | -------------------------------- |
| 1   | Suporte (14)    | 90%      | 8h       | 10h         | 20           | 80%         | Carlos Alberto Jr (Admin, id 19) |
| 3   | QA Suporte (18) | 80%      | 12h      | 24h         | 3            | 70%         | QA Diretor (id 21)               |

A linha do Suporte foi criada com backlog 5 e editada para 20 durante o teste (OP17). Nenhuma outra escrita foi feita.
