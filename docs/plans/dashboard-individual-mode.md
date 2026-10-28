# Plano — Início: modo Individual

Aprovado pelo usuário em 2026-10-27 via `/consult`. Contrato por etapa em
`docs/contracts/dashboard-individual-mode.md`. Regras atuais do Início:
`docs/contracts/dashboard-overview.md` (continuam valendo para o Coletivo).

## O que é

Um switch **"Coletivo | Individual"** no Início, à direita do filtro de
período, na mesma linha. Efeito deslizante como um toggle de tema claro/escuro,
com **texto** no lugar de ícone.

- Abre sempre em **Coletivo**.
- **Não persiste**: recarregar a página volta para Coletivo. O modo vive só no
  estado do navegador — sem URL, sem cookie, sem `localStorage`.
- **Todos os cards trocam** de modo (ao fim das cinco etapas).

Fora do escopo: ver o Individual de outra pessoa, persistir a preferência,
e-mail.

## Decisões

**Opção A.** O servidor entrega os números dos **dois** modos e o switch só
troca o que aparece. A troca é instantânea, sem nova requisição. Não há leitura
iniciada pelo cliente, portanto não há ADR (seção 2 do `stack.md`, exceção da
ADR 015 não se aplica).

**Regra de desempenho.**

- Nos **indicadores** (contagens e médias), o valor individual sai da **mesma
  consulta** do setor, com `count(*) filter (where … and assigned_to = $eu)` ou
  equivalente. Nenhuma consulta extra.
- Só as **listas** (ranking de tags, atrasos, pendências, série do gráfico) têm
  consulta própria por modo; a do Individual é filtrada por destinatário
  (índice `ticket_assigned_to_idx`).
- Cada função de dados ganha um **filtro opcional de pessoa** em vez de função
  duplicada. Sem pessoa = comportamento atual, idêntico.

**"Meu" = destinatário = eu** (`ticket.assigned_to`). "Resolvido por mim" =
`resolvido`/`fechado` com destinatário = eu: ao resolver, o chamado fica com
quem resolveu quando não tinha destinatário (`resolutionAssigneeFor`,
`app/_lib/domain/ticket-resolution.ts:98`). Ao aceitar uma transferência, o
chamado passa a ser de quem aceitou (`app/_lib/data/tickets.ts:1394`).

| Card                 | Individual                                                                                                                                      |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Chamados no período  | destinados a mim, abertos no período; "+N" = transferências aceitas por mim no período (`reviewed_by` = eu, `aprovado`)                         |
| Taxa de resolução    | resolvidos por mim ÷ recebidos por mim no período (recebidos: os recebidos do setor, pela regra de 2026-10-23, que hoje estão destinados a mim) |
| Tempo médio          | só dos que eu resolvi                                                                                                                           |
| Backlog              | meus chamados ativos (mesmos status do backlog coletivo)                                                                                        |
| Principal ofensor    | tags dos meus chamados no período                                                                                                               |
| Maiores atrasos      | meus chamados atrasados; "Ver na fila" → Meus chamados, aba "Atribuídos a mim"                                                                  |
| Abertos × resolvidos | mesmas séries, só os meus                                                                                                                       |
| Transferências       | aguardando **meu** aceite (`to_user_id` = eu), enviadas **por mim** pendentes (`requested_by` = eu), minhas recusadas por outros                |

## Etapas — um commit por assunto

Cada etapa: `df-architect` → [`df-data` ∥ `df-ui`] → `df-reviewer` → `df-qa`.

1. Switch + linha 1 (os quatro indicadores).
2. Principal ofensor.
3. Maiores atrasos.
4. Abertos × resolvidos.
5. Transferências.

Entre a Etapa 1 e a 5, no modo Individual, os cards ainda não migrados
continuam mostrando o Coletivo. É esperado e não é defeito.

## Riscos

- O modo inativo também é renderizado: precisa ficar fora da árvore de
  acessibilidade, do foco e das contagens de teste (`hidden`).
- Estados vazios do Individual para quem não tem chamados.
- Diretoria no Individual vê só os chamados destinados a ela.
- O QA só tem contas de Suporte (Administrador e Membro); a do Diretor está com
  login recusado.
- Em escala, o gargalo é o Coletivo em períodos longos e o gráfico (fora desta
  feature), e o número de conexões — mitigado pela regra de mesma consulta.

## Critério de pronto (global e por etapa)

- Abre em Coletivo; recarregar com Individual volta para Coletivo.
- A troca não faz requisição de rede.
- Cada card Individual bate com a consulta de conferência por destinatário =
  eu.
- O Coletivo fica idêntico ao de hoje.
- Switch acessível por teclado e leitor de tela.
- 390 px sem rolagem horizontal.
- `npx tsc --noEmit`, `npm run lint`, `npm run build`; `df-reviewer` sem
  bloqueante; `df-qa` aprovado.

## Andamento

- [x] Etapa 1 — switch e linha 1 (concluída e commitada em 001ed83; limites
      conhecidos e decisões pós-QA no contrato)
- [x] Etapa 2 — Principal ofensor (concluída e commitada em aacf2ed; limites
      conhecidos no contrato)
- [x] Etapa 3 — Maiores atrasos (concluída e commitada em 704b725; limites
      conhecidos no contrato)
- [x] Etapa 4 — Abertos × resolvidos (concluída e commitada em 6fe687c;
      limites conhecidos no contrato)
- [x] Etapa 5 — Transferências (concluída, aguardando commit; limites
      conhecidos no contrato)

Feature concluída após o commit da Etapa 5: no modo Individual nenhum card
mostra mais o Coletivo (TI15).
