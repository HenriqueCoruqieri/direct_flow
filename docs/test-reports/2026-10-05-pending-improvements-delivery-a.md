# Relatório de testes — Entrega A (pendências: Setores, Pessoas, datas futuras)

- **Data:** 2026-10-05
- **Contrato:** `docs/contracts/registry-departments.md` (A1–A11), `docs/contracts/registry-people.md` (P1–P11), `docs/contracts/my-tickets.md` (37–44), `docs/contracts/dashboard.md` (revisão de período). Plano: `docs/plans/pending-improvements.md`
- **Commit:** `1b47eaf` · alterações não comitadas: sim (a própria Entrega A)
- **Ambiente:** `http://localhost:3000`, `next dev`, banco de desenvolvimento, e-mail desligado (`RESEND_API_KEY` vazia)
- **Resultado:** 31 de 31 passaram · 0 falharam · 0 bloqueados · 0 não executados

## Pré-requisitos

- Dev server: `/login` respondeu 200.
- MCP: `playwright`, `next-devtools` e `postgres` responderam (`SELECT 1` ok).
- Usuários: Diretor, QA Admin Suporte e QA Membro Suporte existem e estão ativos. QA Admin Infra existe e está **inativo** (já estava assim antes da rodada; nenhum cenário o usou).
- Hoje (São Paulo): 2026-10-05. Janela do navegador visível, trazida para a frente; aberta no fim.

## Cenários

| #   | Cenário                                                                                  | Papel             | Status |
| --- | ---------------------------------------------------------------------------------------- | ----------------- | ------ |
| A1  | Criar `[QA] Bloqueio`; Desativar abre confirmação normal; Cancelar; colunas 0 e 0        | Diretor           | PASSOU |
| A2  | Bloqueio só por pessoa: texto sem menção a chamados; "Entendi" e "Ver pessoas"           | Diretor           | PASSOU |
| A3  | "Ver pessoas" leva a `?setor=21&status=ativo`; Filtros 2; só QA Membro Suporte           | Diretor           | PASSOU |
| A4  | Desmarcar Setor, Limpar filtros (URL não muda), recarregar reaplica Setor + Ativo        | Diretor           | PASSOU |
| A5  | Abrir `[QA] Bloqueio de setor`; `current_department_id` = 21                             | QA Membro Suporte | PASSOU |
| A6  | Bloqueio por pessoa e chamado: texto composto; "Ver pessoas" presente                    | Diretor           | PASSOU |
| A7  | Bloqueio só por chamado: sem "Mova a pessoa"; sem "Ver pessoas"; só "Entendi"            | Diretor           | PASSOU |
| A8  | Resolver #96, desativar `[QA] Bloqueio`: confirmação normal, toast, setor inativo        | Diretor           | PASSOU |
| A9  | Diretoria e Não alocado seguem sem botão Desativar                                       | Diretor           | PASSOU |
| A10 | Dialogs de Tags e Pessoas idênticos aos de hoje, sem link                                | Diretor           | PASSOU |
| A11 | Sem erro nem aviso de hidratação durante A1–A10                                          | Diretor           | PASSOU |
| P1  | `?setor=18&status=ativo`: 2 filtros, 2 linhas = consulta                                 | Diretor           | PASSOU |
| P2  | `?status=inativo`: só Inativo, 2 linhas = consulta                                       | Diretor           | PASSOU |
| P3  | `setor=abc`, `0`, `007`, `99999999999` com `status=ativo`: só Ativo                      | Diretor           | PASSOU |
| P4  | `?setor=999999`: nenhum filtro, 8 linhas                                                 | Diretor           | PASSOU |
| P5  | `status=Ativo` e `status=xyz`: só Setor                                                  | Diretor           | PASSOU |
| P6  | `setor=18&setor=19`: Setor QA Suporte (primeiro valor)                                   | Diretor           | PASSOU |
| P7  | Desmarcar os dois; Setores e de volta pelo menu: `/registry/people` sem filtro           | Diretor           | PASSOU |
| P8  | `?setor=19&status=ativo`: igual a `?status=ativo`, sem grupo Setor, sem QA Infra         | QA Admin Suporte  | PASSOU |
| P9  | `?setor=18`: ignorado, nenhum filtro, lista igual à sem parâmetro                        | QA Admin Suporte  | PASSOU |
| P10 | `?setor=18&status=ativo`: 404                                                            | QA Membro Suporte | PASSOU |
| P11 | Sem erro nem aviso de hidratação durante P1–P10                                          | qualquer          | PASSOU |
| 37  | Personalizado nas duas telas: dias futuros desabilitados, hoje e passados habilitados    | Diretor           | PASSOU |
| 38  | Clicar em dia futuro: nada selecionado, "Aplicar" segue desabilitado                     | Diretor           | PASSOU |
| 39  | `04/10`–`05/10` → Aplicar nas duas telas: URL, Personalizado ativo, números = banco      | Diretor           | PASSOU |
| 40  | `de=HOJE&ate=AMANHA` nas duas telas: Hoje ativo, números de Hoje                         | Diretor e Membro  | PASSOU |
| 41  | `de=AMANHA&ate=AMANHA` e `2099-01-01`–`2099-01-31` nas duas telas: Hoje ativo            | Diretor e Membro  | PASSOU |
| 42  | `de=HOJE&ate=HOJE` nas duas telas: Personalizado ativo                                   | Diretor e Membro  | PASSOU |
| 43  | `?tab=closed&…&de=ONTEM&ate=AMANHA`: aba Fechados mantida, período Hoje                  | Diretor           | PASSOU |
| 44  | Sem erro; nenhuma linha nova em `ticket`, `ticket_history`, `ticket_transfer` por 37–43  | qualquer          | PASSOU |
| R1  | Responsivo 390×844: Setores, dialog de bloqueio, Pessoas filtrada, seletor Personalizado | Diretor           | PASSOU |

## Evidências

**A1.** `select id, name, is_active from department where name like '[QA] Bloq%'` → `21 | [QA] Bloqueio | true`. Linha na tela: Ativo, Pessoas ativas 0, Chamados 0. Dialog "Desativar [QA] Bloqueio?" com Cancelar e Desativar; Cancelar fechou sem alterar.

**A2.** Antes, QA Membro Suporte foi movido pela tela de Pessoas (`department_id` 21 no banco). Dialog: "Não é possível desativar este setor: ele tem 1 pessoa ativa. Mova a pessoa para outro setor antes." Botões "Entendi" e link "Ver pessoas" com `href="/registry/people?setor=21&status=ativo"`.

**A3/A4.** Após o clique: URL `/registry/people?setor=21&status=ativo`, botão "Filtros, 2 selecionados", checkboxes marcados `[QA] Bloqueio` e `Ativo`, 1 linha (QA Membro Suporte). `select count(*) from users where department_id = 21 and is_active` → 1. Desmarcar Setor: 6 linhas (as 6 pessoas ativas de `users`), contagem 1. Limpar filtros: 8 linhas (total de `users`), contagem zerada, URL inalterada. Recarregar (`page.reload()`): 1 linha, 2 selecionados.

**A5.** Pré-condição não prevista no contrato: o setor novo não tinha tag e o botão "Novo chamado" ficava desabilitado ("Não há nenhuma Tag disponível…"). O Diretor criou a tag `[QA] Bloqueio tag` (id 24, setor 21) pela tela de Tags. Depois: `ticket` id 96, `[QA] Bloqueio de setor`, `status = aberto`, `current_department_id = 21`, `origin_department_id = 21`; `ticket_history` 135 `criacao` → `aberto`.

**A6.** Colunas 1 e 1. Texto: "…ele tem 1 pessoa ativa e 1 chamado em aberto. Mova a pessoa para outro setor e conclua ou encaminhe o chamado antes." Link "Ver pessoas" presente. Consultas: 1 pessoa ativa; 1 chamado em aberto.

**A7.** Após mover QA Membro Suporte de volta a QA Suporte (`users` com `department_id = 21 and is_active` → 0; chamados abertos → 1). Texto: "…ele tem 1 chamado em aberto. Conclua ou encaminhe o chamado antes." Contagem de links no dialog: 0. Só "Entendi".

**A8.** `ticket` 96 → `resolvido`; `ticket_history` 136 `resolucao` `aberto` → `resolvido` (última linha bate com o status). Desativar: confirmação normal, toast "Setor desativado.", linha "Inativo" com "Reativar", banco `department` 21 `is_active = false`. Estado final deixado como o contrato pede.

**A9.** Botões da linha da Diretoria: só "Renomear"; Não alocado: só "Renomear".

**A10.** Tags ("Desativar [QA] Acesso?") e Pessoas ("Desativar QA Membro Suporte?"): textos de confirmação normais, 0 links. Cancelados.

**P1–P6** (ids 18 = QA Suporte, 19 = QA Infra). Resultado por URL (linhas / filtros marcados):
`?setor=18&status=ativo` 2 / QA Suporte + Ativo; `?status=inativo` 2 / Inativo; `setor=abc|0|007|99999999999 + status=ativo` 6 / Ativo; `?setor=999999` 8 / nenhum; `?setor=18&status=Ativo` 2 / QA Suporte; `?setor=18&status=xyz` 2 / QA Suporte; `?setor=18&setor=19` 2 / QA Suporte. Consulta: QA Suporte ativos 2, inativos 2, ativos 6, total 8.

**P7.** Após desmarcar: 8 linhas. Navegação Setores → Pessoas pelo menu: URL `/registry/people`, 8 linhas, botão "Filtros" sem contagem.

**P8/P9.** QA Admin Suporte: `?setor=19&status=ativo` e `?status=ativo` mostram as mesmas 4 pessoas (2 Não alocado, 2 QA Suporte), só Status Ativo marcado, filtros Papel e Status apenas (sem Setor). `?setor=18` e a página sem parâmetro mostram as mesmas 5 pessoas, nenhum filtro marcado.

**P10.** QA Membro Suporte: HTTP 404, título "404: This page could not be found.". Única entrada de erro no console do navegador: o 404 esperado deste cenário.

**37/38.** `/tickets?tab=opened` e `/dashboard`: 34 botões de dia (28/09 a 31/10); os 26 depois de 05/10 vêm com `disabled`; nenhum dia até hoje está desabilitado. Botão "Ir para o próximo mês" com `aria-disabled="true"`; clicar nele (forçado) não mudou o mês (continua outubro 2026). Clique forçado em 06/10: 0 dias selecionados, "Aplicar" desabilitado. Screenshots: `.qa-output/38-picker-tickets.png`, `.qa-output/38-picker-dashboard.png`.

**39.** Cliques reais em 04/10 e 05/10, "Aplicar". Meus chamados: URL `/tickets?tab=opened&periodo=personalizado&de=2026-10-04&ate=2026-10-05`, Personalizado ativo, abas 2/0/0/0; consulta do cenário 3 com o intervalo (`America/Sao_Paulo`) → 2/0/0/0. Início: URL `/dashboard?periodo=personalizado&de=2026-10-04&ate=2026-10-05`, subtítulo "4–5 out 2026", "Chamados no período 2"; `select count(*) from ticket where current_department_id = 11 and created_at` no intervalo → 2.

**40–43.** Resultados iguais ao baseline de Hoje (`/dashboard` e `/tickets?tab=opened`): Hoje ativo, subtítulo "5 out 2026", mesmos números, para `de=2026-10-05&ate=2026-10-06`, `de=2026-10-06&ate=2026-10-06` e `de=2099-01-01&ate=2099-01-31`. `de=2026-10-05&ate=2026-10-05`: Personalizado ativo, subtítulo "5 out 2026". Repetido com QA Membro Suporte para 40–42 (Hoje ativo; Personalizado ativo no `HOJE–HOJE`). `/tickets?tab=closed&periodo=personalizado&de=2026-10-04&ate=2026-10-06`: aba Fechados ativa, período Hoje, igual a `/tickets?tab=closed`.

**44 e A11/P11.** `get_errors` do `next-devtools` devolveu `configErrors: []` e `sessionErrors: []` depois de cada bloco. Console do navegador: 0 erros de hidratação, 0 avisos. Após o último chamado criado (A5/A8), `max(id)`: `ticket` 96, `ticket_history` 136, `ticket_transfer` 8, sem mudança durante 37–43 e responsivo.

**R1.** 390×844: sem rolagem horizontal (`scrollWidth` = `clientWidth`) em Setores, Pessoas filtrada e Início com o seletor aberto. Dialog de bloqueio: "Ver pessoas" (x 51–339) e "Entendi" (x 51–339) empilhados e alcançáveis, "Ver pessoas" levou a `/registry/people?setor=18&status=ativo` com "2 selecionados". "Aplicar" do seletor visível dentro da viewport. Screenshots: `.qa-output/mobile-dialog-block.png`, `.qa-output/mobile-people-filtered.png`, `.qa-output/mobile-picker.png`.

## Falhas

Nenhuma.

## Erros fora dos cenários

Nenhum.

## Não executados

Nenhum.

## Observações

- **Ambiguidade (A5), para o `df-architect`:** o cenário manda o QA Membro Suporte abrir o chamado em `[QA] Bloqueio`, mas um setor recém-criado não tem tag e "Novo chamado" fica desabilitado. O contrato não diz que é preciso criar uma tag antes. Sugestão: acrescentar o passo "Diretor cria a tag `[QA] Bloqueio tag` no setor" antes de A5.
- **Seletor de calendário:** o botão "próximo mês" usa `aria-disabled="true"` e não o atributo `disabled`, e o clique forçado não troca o mês. Atende "`aria-disabled` / `disabled`" do contrato; registrado só para quem comparar com o texto "fica desabilitado".
- **Dados de teste que ficam no banco:** setor `[QA] Bloqueio` (id 21, inativo), tag `[QA] Bloqueio tag` (id 24, ativa, no setor inativo), chamado #96 `[QA] Bloqueio de setor` (resolvido), `ticket_history` 135–136. QA Membro Suporte voltou a QA Suporte. Nenhum dado fora dos setores QA foi alterado; #65–#68 não foram tocados.
- Não houve rodada com o botão "Ver pessoas" duas vezes seguidas de setores diferentes na mesma sessão (o `key` da tabela, "navegação sem recarregar"); o cenário não faz parte de A1–A11.
