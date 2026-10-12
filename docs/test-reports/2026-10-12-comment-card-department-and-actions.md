# Relatório de testes — Card de comentário: setor do autor e ações só com ícone

- **Data:** 2026-10-12
- **Contrato:** `docs/contracts/comment-card-department-and-actions.md`
- **Commit:** `80c5d41` · alterações não comitadas: sim
- **Ambiente:** `http://localhost:3000`, `next dev`, banco de desenvolvimento
- **Resultado:** 15 de 16 passaram · 1 falhou · 0 bloqueados · 0 não executados

## Pré-requisitos

- Dev server: `/login` devolveu 200.
- MCP: `playwright`, `next-devtools` e `postgres` responderam (`SELECT 1` ok).
- Usuários QA (`M` id 14, `A` id 13, `I` id 15) existem e estão ativos; setores conferidos no banco.
- `RESEND_API_KEY` está **preenchida** no `.env`. Nenhum cenário desta bateria dispara e-mail (as actions de chamado e comentário não enviam; só `people.ts` e `profile.ts` enviam) e `next-development.log` não registrou envio durante a bateria. Nada ficou como NÃO EXECUTADO por isso.

## Preparação (feita pela interface)

Chamado `#C` = **#201** `[QA] Card de comentário` (tag `[QA] Acesso`, destinatário M). c1 e c2 (M), c3 (A), envio para QA Infra com c4 (M), "Atender" por I, c5 e c6 (I). Gabarito conferido no banco antes da bateria:

```sql
select m.id, u.name, d.name as setor, m.visibility, m.content
from message m join users u on u.id = m.user_id join department d on d.id = u.department_id
where m.ticket_id = 201 order by m.created_at, m.id
```

Linhas 77–82: c1, c2, c3, c4 → `QA Suporte`; c5, c6 → `QA Infra`; c2 e c6 com `visibility = interna`. O chamado ficou `em_andamento` em QA Infra.

## Cenários

| #    | Cenário                                                      | Papel | Status                                                   |
| ---- | ------------------------------------------------------------ | ----- | -------------------------------------------------------- |
| CC1  | Badge do setor em todos os 6 comentários, inclusive privados | I     | PASSOU                                                   |
| CC2  | Badges para M; privado de outro setor não aparece            | M     | PASSOU (a ausência de c6 não foi verificada, ver Obs. 1) |
| CC3  | Geometria do badge a 1440×900                                | I     | PASSOU                                                   |
| CC4  | Geometria do badge a 390×844, sem rolagem horizontal         | I     | PASSOU                                                   |
| CC5  | Árvore de acessibilidade do cabeçalho (`Setor:` só leitor)   | I     | PASSOU                                                   |
| CC6  | Linha de ações abaixo do texto, só ícone, 28×28 e 14×14      | I     | PASSOU                                                   |
| CC7  | Hover: lixeira vermelha com fundo claro, tooltips            | I     | PASSOU                                                   |
| CC8  | Foco por Tab/Shift+Tab: anel, tooltip, Esc, `aria-label`     | I     | FALHOU                                                   |
| CC9  | Editar e salvar: foco volta ao lápis sem tooltip             | I     | PASSOU                                                   |
| CC10 | Editar e cancelar por teclado: foco volta sem tooltip        | I     | PASSOU                                                   |
| CC11 | Cancelar exclusão com botão: foco volta sem tooltip          | I     | PASSOU                                                   |
| CC12 | Cancelar exclusão com Esc: foco volta sem tooltip            | I     | PASSOU                                                   |
| CC13 | Excluir c6: toast, banco, foco no título, contador           | I     | PASSOU                                                   |
| CC14 | Lista rola por dentro e vai ao fim ao publicar c7            | I     | PASSOU                                                   |
| CC15 | Mobile 390×844 como M                                        | M     | PASSOU                                                   |
| CC16 | Sem erro de runtime, hidratação ou aviso de `ref`            | todos | PASSOU                                                   |

## Falhas

### #CC8 — Tooltip não abre no foco por teclado quando a lista de comentários rola para revelar o botão

- **Papel:** `QA Admin Infra` (`qa.admin.infra@directflow.test`), 1440×900.
- **Passos:**
  1. Abrir `/tickets/201` como I (5 a 6 comentários; a região `Lista de comentários` tem `overflow-y: auto`, `clientHeight` 160).
  2. Mouse fora dos botões. Foco no campo "Comentário" e `Shift+Tab` repetido: lixeira de c6, lápis de c6, lixeira de c5, lápis de c5.
  3. A cada passo, ler `document.activeElement` e os `[data-slot="tooltip-content"]` no DOM 600 ms depois.
- **Esperado:** (seção "Tooltip", tabela "Quando abre") foco por `Tab`/`Shift+Tab` abre o tooltip; fecha no `blur` ou com `Esc`.
- **Obtido:** o foco e o anel (`:focus-visible`) chegam ao botão certo, mas o tooltip **não abre** nos passos em que o foco faz a lista rolar para mostrar o botão. Nos passos em que não há rolagem, o tooltip abre normalmente. A correlação foi exata em 8 passos medidos com contador de eventos `scroll` (captura em `window`):

  | Passo                                     | Botão focado | Eventos de scroll   | Tooltip       |
  | ----------------------------------------- | ------------ | ------------------- | ------------- |
  | 1                                         | lixeira c6   | 1 (`scrollTop` 458) | nenhum        |
  | 2                                         | lápis c6     | 0                   | `Editar`      |
  | 3                                         | lixeira c5   | 1 (`scrollTop` 450) | nenhum        |
  | 4                                         | lápis c5     | 0                   | `Editar`      |
  | 5 a 8 (sem rolagem, lista já posicionada) | os 4 botões  | 0                   | todos abriram |

  Também ocorreu em duas execuções anteriores (a primeira visita à lixeira de c6; a lixeira de c5 depois do lápis de c6). O comportamento bate com o do Radix Tooltip, que fecha o balão quando qualquer ancestral do gatilho rola. Em foco por teclado, o navegador rola a lista para trazer o botão à vista logo depois de o tooltip abrir. Na prática, quem navega por teclado perde o rótulo exatamente nos botões que estavam fora da área visível da lista (a região tem só 160px de altura, então acontece com frequência). O rótulo continua acessível por `aria-label`.

- **Evidência:** `.qa-output/cc8-focus-edit.png`; contagens da tabela acima; `get_errors` sem erro.
- **Camada provável:** app (tooltip dentro de contêiner com rolagem; o hook `use-focus-return-tooltip.ts` não trata esse caso e o contrato também não previu).
- **Dono:** `df-ui`.

## Erros fora dos cenários

- `next-development.log` tem erros `Export default doesn't exist in target module` em `delete-ticket-comment-button.tsx:36` e `ticket-comment-editor.tsx:30` (import default de `use-focus-return-tooltip`), com timestamps de 20:14, **antes** do início da bateria (20:17). O código atual importa o hook por exportação nomeada e `get_errors` voltou vazio ao longo de toda a execução. É resíduo de edição em andamento; sem ação.
- Console do navegador: 0 erros e 0 avisos (só o INFO do React DevTools e o `[HMR] connected`). Nenhum aviso de `ref` vindo do `Slot`.

## Não executados

Nenhum.

## Observações

1. **CC2, parte "não vê c6":** a ordem de execução foi a do usuário (I primeiro), e c6 foi excluído no CC13 antes de M abrir o chamado. M viu c1 a c5 e c7, com badges corretos (`QA Suporte` para c1 a c4, `QA Infra` para c5 e c7), mas a ausência do privado de I não pôde ser provada. A regra de visibilidade não é alterada por esta etapa; sugiro reordenar a bateria (M antes do CC13) ou aceitar o risco. Nenhuma ambiguidade do contrato, só da ordem.
2. **Hover com o mouse do Playwright:** `mouse.move` em um único salto deixa o tooltip aberto depois que o ponteiro sai (e o hover seguinte parece não abrir). Com movimentos em passos (`steps`), o tooltip abre e fecha como o contrato diz (CC7). Tratei como artefato do teste, não como defeito.
3. **Ambiguidade (CC3):** a 1440×900 a coluna de comentários tem cerca de 310px, e o badge desceu de linha em **todos** os comentários, exceto c5 (que não tem `(editado)` nem `Privado`; depois da edição no CC9 o `(editado)` também o empurra). Sempre com `badge.right = cabeçalho.right`. O contrato antecipa isso (risco 1) e o CC3 pede apenas registrar quais desceram: c1, c2, c3, c4, c6 desceram; c5 ficou na linha do nome. A 390×844 todos desceram (c1 a c5 e c7), sem rolagem horizontal e com `badge.right <= li.right`.
4. **Ambiguidade (CC9):** o contrato diz "sem badge" dentro do modo de edição, mas o badge do cabeçalho do `li` continua visível durante a edição (só o formulário não tem badge nem botões só-ícone). Interpretei como "dentro do formulário"; vale o `df-architect` confirmar a redação.
5. **Foto do layout:** a região `Lista de comentários` mede 160px de altura a 1440×900 (um card por vez). Não é escopo desta etapa (ver `ticket-detail-layout-and-comment-card.md`), mas agrava a falha do CC8.
6. **Estado deixado no banco:** `#201` em QA Infra com os comentários c1 a c5 (c5 editado como `[QA] c5 de Infra editado`) e c7; c6 excluído no CC13. Todos com prefixo `[QA]`; nenhum dado fora dos setores QA foi tocado.
7. Evidências em `.qa-output/`: `cc6-c5.png`, `cc7-hover.png`, `cc8-focus-edit.png`, `cc9-edit.png`, `cc11-dialog.png`, `cc12-after-esc.png`, `cc15-c1.png`.

## Reteste 1

- **Data:** 2026-10-12
- **Contrato:** `docs/contracts/comment-card-department-and-actions.md` (CC2 reordenado, CC8 em (a)/(b)/(c), CC9 reescrito, seção "Tooltip e rolagem da lista")
- **Commit:** `80c5d41` · alterações não comitadas: sim (inclui `use-focus-return-tooltip.ts` com listeners de `scroll`, `triggerProps` e `hideWhenDetached`)
- **Resultado:** 8 de 8 cenários do contrato passaram (10 de 10 linhas, com o CC8 dividido em a, b, c) · 0 falharam

### Preparação do reteste

O c6 original foi excluído no CC13 da rodada anterior. Como I (`qa.admin.infra@directflow.test`), recriei pela interface o comentário privado `[QA] c6 privado de Infra` (`message.id` 84, `visibility = interna`, setor QA Infra) no `#201`. Foi criado depois de c7, então aparece por último na lista. Data/hora usadas: c5 = `20:18`, c7 = `20:21`, c6 = `20:34`.

### Cenários

| #       | Cenário                                                                              | Papel | Status |
| ------- | ------------------------------------------------------------------------------------ | ----- | ------ |
| CC2     | M vê c1–c5 e c7 com badge; c6 existe no banco e não está no DOM                      | M     | PASSOU |
| CC7     | Hover: lixeira vermelha com fundo claro, tooltips `Excluir`/`Editar`, somem ao sair  | I     | PASSOU |
| CC8 (a) | Tab/Shift+Tab: tooltip abre em todo passo, inclusive nos que rolaram a lista         | I     | PASSOU |
| CC8 (b) | `Esc` fecha o balão sem tirar o foco                                                 | I     | PASSOU |
| CC8 (c) | Roda do mouse com botão focado: balão `hidden` fora da área, `visible` na volta      | I     | PASSOU |
| CC9     | Editar e salvar: toast, `(editado)`, badge no `li`, foco no lápis, sem tooltip       | I     | PASSOU |
| CC10    | Editar e cancelar por teclado: foco no lápis sem tooltip; Tab de volta abre `Editar` | I     | PASSOU |
| CC11    | Cancelar exclusão com botão: foco na lixeira sem tooltip; hover seguinte abre        | I     | PASSOU |
| CC12    | Abrir e fechar o dialog por teclado (`Enter`, `Esc`): foco na lixeira sem tooltip    | I     | PASSOU |
| CC13    | Excluir c6: `Excluindo…`, toast, banco, foco no título, contador                     | I     | PASSOU |

### Evidências

- **CC2** (M, antes do CC13). O gabarito do `#201` no banco devolveu 7 linhas, incluindo `84 | QA Admin Infra | QA Infra | interna | [QA] c6 privado de Infra`. Como M, a página listou 6 comentários (c1 a c5 e c7), com `Setor: QA Suporte` (c1–c4) e `Setor: QA Infra` (c5, c7); c2 com `Privado`; `body.innerText.includes('c6 privado')` = `false`. A ausência de c6 para M está provada com a linha presente no banco.
- **CC7**: lixeira em hover com `color` `rgb(181, 54, 54)` (ícone idem) e fundo `oklab(0.5227 0.1486 0.0687 / 0.1)` (vermelho a 10%); tooltip `Excluir` visível; ao sair, nenhum `[data-slot="tooltip-content"]`. Lápis: `Editar` visível, some ao sair. Screenshot `.qa-output/rt-cc7-trash.png`. Mouse movido em passos (`steps`), como na Obs. 2 da rodada anterior.
- **CC8 (a)**: mouse parado em (5,5), contador de `scroll` em captura no `window`, 600 ms de espera por passo, `:focus-visible = true` em todos.

  | Passo          | Botão focado | Eventos de scroll | Tooltip           |
  | -------------- | ------------ | ----------------- | ----------------- |
  | S1 (Shift+Tab) | lixeira c6   | 2                 | `Excluir` visível |
  | S2             | lápis c6     | 0                 | `Editar` visível  |
  | S3             | lixeira c7   | 1                 | `Excluir` visível |
  | S4             | lápis c7     | 0                 | `Editar` visível  |
  | S5             | lixeira c5   | 1                 | `Excluir` visível |
  | S6             | lápis c5     | 0                 | `Editar` visível  |
  | T1 (Tab)       | lixeira      | 0                 | `Excluir` visível |
  | T2             | lápis        | 1                 | `Editar` visível  |
  | T3             | lixeira      | 0                 | `Excluir` visível |
  | T4             | lápis        | 1                 | `Editar` visível  |
  | T5             | lixeira      | 0                 | `Excluir` visível |
  | T6             | campo        | 0                 | nenhum (esperado) |

  S1, S3, S5, T2 e T4 rolaram a lista (≥ 1 evento `scroll`) e o tooltip abriu e permaneceu: a falha da rodada anterior (balão fechado exatamente nesses passos) não se repetiu. Todos os botões com `aria-label` `Editar comentário de QA Admin Infra de {data/hora}` e `Excluir comentário de QA Admin Infra de {data/hora}`.

- **CC8 (b)**: lista levada ao fim e três `Shift+Tab` a partir do campo (o foco rolou a lista): balão `Excluir` visível; `Esc` fechou o balão e o foco continuou na lixeira.
- **CC8 (c)**: após o `Esc` do (b), `Shift+Tab` levou o foco ao lápis seguinte (balão `Editar` visível; botão em `top 522 / bottom 550`, lista `522–682`). Roda do mouse sobre a lista, 14 passos de -60px: nos 2 primeiros o botão seguia na área visível (balão `visible`); do 3º em diante o botão saiu (`inView = false`) e o conteúdo do tooltip ficou `visibility: hidden`, sem flutuar sobre a página (`.qa-output/rt-cc8c-away.png`). Rolando de volta (14 passos de +60px), balão `hidden` enquanto fora e `visible` assim que o botão voltou. `document.activeElement` não mudou nas 28 amostras.
- **CC9**: ao clicar o lápis de c5, o foco foi para a `textarea`; o `li` continuou com `Setor:` (badge no cabeçalho) e o formulário só tem `Cancelar` e `Salvar` (nenhum botão só-ícone). Texto trocado para `[QA] c5 de Infra editado 2` (o anterior já era `... editado`, então usei sufixo para haver mudança). Toast `Comentário atualizado.`; cabeçalho `QA Admin Infra / 12/10/2026 20:18 / (editado) / Setor: QA Infra`; `document.activeElement` = lápis de c5, `[data-slot="tooltip-content"]` = 0. `get_errors` vazio. Screenshot `.qa-output/rt-cc9-edit.png`.
- **CC10**: lápis de c5 focado com `Tab` (balão `Editar` abriu); `Enter` → `textarea` focada, sem balão; `Tab` → `Cancelar`; `Enter` → texto inalterado, foco no lápis com `:focus-visible = true`, nenhum balão. `Shift+Tab` foi para a região `Lista de comentários` (rolável e focável); `Tab` de volta ao lápis abriu `Editar`.
- **CC11**: clique na lixeira de c6 abriu `Excluir comentário? — O comentário será removido do chamado para todos que o veem. Esta ação não pode ser desfeita. — Cancelar / Excluir`. Com o dialog aberto, a lixeira atrás manteve `color rgb(181, 54, 54)` e `aria-expanded = true` (`.qa-output/rt-cc11-dialog.png`). Em `Cancelar`: c6 continuou na tela; banco (`select id, content from message where ticket_id = 201 and content like '%c6%'`) → `84 | [QA] c6 privado de Infra`; foco na lixeira (`:focus-visible = false`, pois foi clique), nenhum balão, inclusive depois de tirar o mouse; no hover seguinte, `Excluir` abriu `visible`.
- **CC12**: `Shift+Tab` do campo → lixeira de c6 com anel e balão `Excluir`; `Enter` abriu o dialog; `Esc` fechou, foco na lixeira com `:focus-visible = true`, nenhum balão; c6 intacto.
- **CC13**: contador antes `Comentários 7`; lixeira de c6 → `Excluir`: o dialog ficou em `Excluindo…` por cerca de 300 ms, depois toast `Comentário excluído.`. Depois: `document.activeElement.id === "ticket-comments-heading"`, contador `Comentários 6`, c6 ausente da tela, nenhum balão. Banco: `select count(*) from message where ticket_id = 201 and content like '%c6%'` → `0`.

`get_errors` (`next-devtools`) devolveu `configErrors: []` e `sessionErrors: []` depois do CC2, do CC9 e do CC13. Nenhum e-mail disparado (nenhuma action destes cenários envia).

### Falhas

Nenhuma.

### Observações do reteste

1. **Ordem de c6.** Recriado depois de c7, o c6 aparece no fim da lista, não entre c5 e c7. Sem efeito nos cenários.
2. **CC8 (b), ressalva de método.** Não contei eventos `scroll` nesse bloco; que o foco rolou a lista é inferido (lista levada ao fim e três `Shift+Tab`), não medido. O caso rolado com `Esc` fica coberto indiretamente pelos passos medidos em (a).
3. **CC9.** A nova redação do contrato (badge continua no cabeçalho do `li` durante a edição) bate com o comportamento observado; a Obs. 4 da rodada anterior fica resolvida.
4. **Estado deixado no banco (`#201`):** c1–c5 (c5 = `[QA] c5 de Infra editado 2`) e c7; c6 (`id 84`) excluído no CC13. Tudo com prefixo `[QA]`, só em setores QA.
5. Evidências em `.qa-output/`: `rt-cc7-trash.png`, `rt-cc8c-away.png`, `rt-cc9-edit.png`, `rt-cc11-dialog.png`.
