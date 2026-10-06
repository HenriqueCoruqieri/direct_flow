# Relatório de testes — aba Resolvidos (Meus chamados e Fila do setor)

- **Data:** 2026-10-06
- **Contrato:** `docs/contracts/my-tickets.md` (cenários 2, 3, 4, 10, 45–54), `docs/contracts/department-queue.md` (Q2, Q3, Q6, Q15, Q33–Q40), `docs/contracts/ticket-resolution.md` (7) e `docs/contracts/ticket-edit-window.md` (21)
- **Commit:** `7e22da2` · alterações não comitadas: sim
- **Ambiente:** `http://localhost:3000`, `next dev`, banco de desenvolvimento
- **Resultado:** 22 de 22 passaram · 0 falharam · 0 bloqueados · 0 não executados

## Pré-requisitos

- Dev server respondeu 200 em `/login`. MCP `playwright`, `next-devtools` e `postgres` disponíveis (`SELECT 1` ok).
- Usuários no banco e ativos: Diretor (`heoliveirac@gmail.com`, Diretoria), `qa.admin.suporte@directflow.test` (id 13), `qa.member.suporte@directflow.test` (id 14). `qa.admin.infra@directflow.test` está inativo e não foi usado.
- `RESEND_API_KEY` está preenchida. Nenhum cenário desta mudança dispara e-mail (criar e resolver chamado não enviam e-mail, conforme `ticket-resolution.md`), então nada ficou como NÃO EXECUTADO.
- Sessão anterior do navegador estava aberta; os cookies foram limpos antes do primeiro login.

## Cenários

M = QA Membro Suporte, A = QA Admin Suporte, D = Diretor.

| #   | Cenário                                                                                                                                                                                               | Papel | Status |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------ |
| 1   | my-tickets 2/45: cinco abas na ordem Abertos, Atribuídos, Resolvidos, Fechados, Cancelados, com contagem                                                                                              | M, D  | PASSOU |
| 2   | my-tickets 3/48: contagens das abas = consulta do banco; soma das abas de autor = total do autor (D: 23+5+3+3 = 34)                                                                                   | M, D  | PASSOU |
| 3   | my-tickets 4/47: Abertos por mim e Atribuídos a mim sem `resolvido`; ids e ordem = banco                                                                                                              | M, D  | PASSOU |
| 4   | my-tickets 10/47: filtro Status com 5 opções, sem "Resolvido", em Abertos e Atribuídos                                                                                                                | M, D  | PASSOU |
| 5   | my-tickets 46: aba Resolvidos (`tab=resolved&periodo=todos`): lista = banco, só "Resolvido", sem grupo Status, Tipo e Tag presentes                                                                   | M, D  | PASSOU |
| 6   | my-tickets 49: criar `[QA] Aba resolvidos` (#105) e resolver; Abertos 20→19, Atribuídos 7→6, Resolvidos 11→12 sem recarga manual                                                                      | M     | PASSOU |
| 7   | my-tickets 50: `[QA] Resolvido pelo admin` (#106, destinatário A) resolvido por A; some das abas de A (Atribuídos 2→1, Resolvidos 0), aparece em `/queue?tab=resolved`; listado em Resolvidos de M    | M, A  | PASSOU |
| 8   | my-tickets 51: Resolvidos Semana → Mês → Fechados → voltar; aba e período mantidos; contagens = banco (semana 2/1, mês 4/1)                                                                           | D     | PASSOU |
| 9   | my-tickets 52: Todos vazio ("Nenhum chamado resolvido" + descrição do contrato) e período vazio ("Nenhum chamado neste período")                                                                      | A, M  | PASSOU |
| 10  | my-tickets 53 / Q39: `tab=resolved` → Resolvidos; `tab=Resolved` e `tab=resolvido` → aba padrão com Hoje (Meus chamados) ou Todos (Fila)                                                              | M     | PASSOU |
| 11  | Q2/Q3/Q33: Fila com abas Em aberto, Resolvidos, Fechados, Cancelados; contagens = Q3; lista de Resolvidos = banco, todas "Resolvido"                                                                  | M     | PASSOU |
| 12  | Q6/Q35: Em aberto sem "Resolvido" (Status com 5 opções, Tipo, Tag, Destinatário com "Sem destinatário")                                                                                               | M     | PASSOU |
| 13  | Q34/Q15: Resolvidos na Fila sem grupo Status, com Tipo, Tag e Destinatário; nenhuma linha com "Assumir" ou "Enviar" (inclui `[QA] Janela aberta`, #84)                                                | A     | PASSOU |
| 14  | Q36: Fila Resolvidos Semana → Mês → Fechados → voltar; contagens = banco (semana 14/5, mês 23/9)                                                                                                      | M     | PASSOU |
| 15  | Q37: `setor=QA Suporte` em Resolvidos (12 = banco); trocar para Diretoria (`setor` sai da URL, 5 resolvidos = banco) e QA Infra (aba mantida, contagens 2/0/0/0 = banco); sem botões                  | D     | PASSOU |
| 16  | Q38: QA Infra sem resolvidos: Todos "Nenhum chamado resolvido" + texto do setor; Hoje "Nenhum chamado neste período"                                                                                  | D     | PASSOU |
| 17  | Revalidação de `/queue` ao resolver (#105 e #106): Em aberto 24→23, Resolvidos 10→11→12, por navegação no cliente, sem recarga manual                                                                 | M, A  | PASSOU |
| 18  | Ciclo de vida: `ticket.status` = `resolvido` e última linha de `ticket_history` `aberto→resolvido` (ids 163 e 165, `changed_by` 14 e 13)                                                              | M, A  | PASSOU |
| 19  | ticket-resolution 7 / edit-window 21 (parte da aba): resolvido fora de Abertos por mim e listado em Resolvidos com badge "Resolvido"                                                                  | M     | PASSOU |
| 20  | Responsivo 390×844 em Meus chamados e Fila (Resolvidos): sem rolagem horizontal da página (`scrollWidth` 375 ≤ 390); barra de abas rola por dentro, "Resolvidos" e "Fechados" alcançáveis e clicáveis | M     | PASSOU |
| 21  | my-tickets 54 / Q40: `get_errors` vazio em todas as checagens; console sem erro nem aviso de hidratação nos logs desta sessão                                                                         | todos | PASSOU |
| 22  | my-tickets 54 / Q40: só linhas esperadas gravadas (`ticket` #105 e #106; `ticket_history` ids 162–165; `ticket_transfer` sem novas, `max(id)` 8)                                                      | todos | PASSOU |

## Evidências principais

- Contagens de M (id 14) antes de qualquer escrita: `19 / 6 / 11 / 0 / 0`, iguais à tela. Após criar #105: `20 / 7 / 11`. Após resolver: `19 / 6 / 12`.
- Fila QA Suporte (`current_department_id = 18`) antes: aberto 24, resolvido 10 (já com #105 aberto); depois de #105: 23 / 11; depois de #106: 23 / 12. Telas idênticas.
- Consulta de #105: `status = resolvido`, última linha `ticket_history` id 163 `aberto → resolvido`, `changed_by = 14`. #106: id 165, `changed_by = 13`.
- Lista de Resolvidos de M no banco: `106,105,96,95,94,93,89,80,76,75,74,84,83`, igual à tela. D: `81,8,10,18,26`, igual à tela.
- Screenshot do 390×844: `.qa-output/resolved-390.png`.

## Falhas

Nenhuma.

## Erros fora dos cenários

Nenhum. Os logs antigos em `.qa-output/console-2026-10-06T00-15-08-534Z.log` (404 em `/registry/people?...` e `TypeError` em `<AppTopBar>`) são de sessão anterior e não ocorreram nesta.

## Não executados

Nenhum.

## Observações

- Em "Fila do setor" como M, as linhas de Em aberto continham 13 elementos `button` dentro do corpo da tabela (não contados os de Resolvidos, que têm 0). Não foi investigado se são botões de ação nem se contrariam Q14, por estar fora do escopo desta mudança. Vale conferir no teste completo da Fila.
- Q6: foram conferidos os grupos de filtro e as opções (inclui "Sem destinatário"); não foi marcado "Sem destinatário" para validar o resultado, por ser comportamento anterior a esta mudança.
- O chamado #96 (`[QA] Bloqueio de setor`, autor M) está em setor inativo (id 21): aparece em Resolvidos de Meus chamados, mas não na Fila de QA Suporte. Coerente com o contrato (autor vs. setor atual).
- Dados `[QA]` criados: #105 `[QA] Aba resolvidos` (autor e destinatário M, resolvido por M) e #106 `[QA] Resolvido pelo admin` (autor M, destinatário A, resolvido por A), ambos em QA Suporte. #65–#68 não foram alterados.
- O link "Meus chamados" da sidebar abre `/tickets` com Hoje; por isso as contagens aparecem diferentes (3/2/1 etc.) até clicar em Todos. É o comportamento do contrato (período padrão Hoje), não falha.
