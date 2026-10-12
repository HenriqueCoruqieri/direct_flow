# Relatório de testes — Linha do tempo com rolagem interna

- **Data:** 2026-10-12
- **Contrato:** `docs/contracts/ticket-timeline-scroll.md`
- **Commit:** `c29c361` · alterações não comitadas: sim (rename `scroll-to-end-area.tsx`, `ticket-comments.tsx`, `ticket-timeline.tsx`, docs; `ticket-edit-heading.tsx` fora desta etapa, ignorado)
- **Ambiente:** `http://localhost:3000`, `next dev`, banco de desenvolvimento
- **Resultado:** 11 de 11 passaram · 0 falharam · 0 bloqueados · 0 não executados

## Pré-requisitos

- Dev server: `/login` devolveu 200.
- MCP: `playwright`, `next-devtools` e `postgres` (`SELECT 1` ok) disponíveis.
- Usuários QA (M, A, Diretor) existem e estão ativos (consulta em `users`).
- E-mail: `RESEND_API_KEY` no `.env` tem o valor vazio seguido de comentário inline (`RESEND_API_KEY= #...`), então o envio fica desligado. Nenhuma linha nova de e-mail em `get_logs` durante a bateria (a única linha existente é anterior, de `sendPasswordResetEmail`).

## Preparação

- Chamado curto: `#176 [QA] Janela aberta` (`resolvido`, 3 eventos simples).
- Chamado longo `#199 [QA] Linha do tempo longa`, criado pela UI. M abriu em `Fila de QA Suporte` (tag `[QA] Acesso`). A fez `Assumir`, depois Editar para `[QA] Edição B`, depois Editar de volta para `[QA] Acesso`: 7 eventos.
- Banco (`select * from ticket_history where ticket_id=199 order by changed_at,id`): `criacao`, `atribuicao`, `mudanca_status`, `edicao` (note "Alterou tag."), `mudanca_tag`, e as duas últimas repetidas após o segundo salvar.

## Cenários

| #    | Cenário                                               | Papel | Status |
| ---- | ----------------------------------------------------- | ----- | ------ |
| TS1  | Chamado curto, sem barra, card do tamanho do conteúdo | M     | PASSOU |
| TS2  | `#199` com 7 eventos abre no último, página não rola  | A     | PASSOU |
| TS3  | Altura máxima cabe ~5 eventos simples                 | A     | PASSOU |
| TS4  | Edição adiciona 2 eventos, `section` não muda, rola   | A     | PASSOU |
| TS5  | Rolar ao topo e F5 volta a abrir no fim               | A     | PASSOU |
| TS6  | Tab, foco visível, setas, PageUp/Home/End             | A     | PASSOU |
| TS7  | Bases de Conclusão e Comentários alinhadas            | A     | PASSOU |
| TS8  | Comentário publicado, linha do tempo intacta          | A     | PASSOU |
| TS9  | 390×844, rolagem interna, sem rolagem horizontal      | A     | PASSOU |
| TS10 | 390×844, chamado curto sem barra                      | M     | PASSOU |
| TS11 | Sem erro/hidratação/e-mail                            | todos | PASSOU |

### Medidas (evidência)

- **TS1** (`#176`, 1440×900): região com `max-h-104`, `clientHeight` 232 = `scrollHeight` 232, `scrollTop` 0; `li` 84 / 84 / 64 px; `section` 314 px (heading + padding, sem vazio abaixo do último). Região com `role="region"` e nome `Eventos da linha do tempo`. Screenshot: `.qa-output/ts1-176.png`.
- **TS2** (`#199`, 7 eventos): `clientHeight` 416, `scrollHeight` 656, `scrollTop` 240 (= máximo), `scrollTop + clientHeight - scrollHeight` = 0; último `li` inteiro dentro da região, texto `Trocou a tag de [QA] Edição B para [QA] Acesso.`; `window.scrollY` 0. Screenshot: `.qa-output/ts2-199.png`.
- **TS3:** `h` (Atribuição, não último) = 84 px; faixa `[5h-20, 6h-20)` = [400, 484); `clientHeight` = 416; classe `max-h-104` (26rem).
- **TS4:** antes e depois do salvar, `section` = 498 px. Toast `Chamado #199 atualizado.`. Eventos 7 → 9, último `Trocou a tag de [QA] Acesso para [QA] Edição B.`, `scrollTop` no máximo (distância ao fim 0), último visível.
- **TS5:** wheel até `scrollTop` 0; depois de `reload`, `scrollTop` 240 = máximo; `scrollY` 0.
- **TS6:** do botão `Editar`, um Tab chega à região (`:focus-visible` true, anel verde visível, `.qa-output/ts6-focus-199.png`). Com foco: `ArrowUp` 240 → 200, `PageUp` → 0, `Home` 0, `ArrowDown` → 40, `End` → 240. Árvore de acessibilidade: `region "Eventos da linha do tempo"` contendo `list` com os itens.
- **TS7** (`#199`, 3 colunas): bases de Conclusão e de Comentários ambas em y=1146; coluna larga: Descrição 101 + linha do tempo 498 + Conclusão 251 px; coluna estreita: Detalhes 432 + Comentários 440 px.
- **TS8:** comentário `[QA] Comentário depois da rolagem da linha do tempo.` publicado (toast `Comentário publicado.`). Região `Lista de comentários` presente (com um só comentário, `scrollHeight` = `clientHeight` = 193, não há o que rolar). Linha do tempo: `scrollTop` 452 e `scrollHeight` 868 antes e depois, `section` 498 px nas duas medidas. A página rolou até o formulário (comportamento já existente, só a janela).
- **TS9** (`#199`, 9 eventos): região `max-h-104`, `clientHeight` 416, `scrollHeight` 968, aberta no fim (distância 0); `scrollWidth` 375 = `clientWidth` 375; comentários com `max-h-96`. Screenshot: `.qa-output/ts9-199-mobile.png`.
- **TS10** (`#176`, 390×844): `clientHeight` = `scrollHeight` = 252; `li` 104 / 84 / 64 (o primeiro quebrou linha); `scrollWidth` = `clientWidth`.
- **TS11:** `get_errors` do `next-devtools` com `configErrors` e `sessionErrors` vazios após os cenários. Console desta sessão sem aviso nem erro de hidratação. Nenhuma linha de e-mail nova em `get_logs`.

## Falhas

Nenhuma.

## Erros fora dos cenários

- Console do navegador: `TypeError: Failed to execute 'measure' on 'Performance': 'TicketDetailPage' cannot have a negative time stamp` (`flushComponentPerformance`, `react-server-dom-turbopack`), uma ocorrência no carregamento de `/tickets/176`. É a instrumentação de performance do React em dev, sem relação com o componente alterado e sem efeito na tela. Registrado, não contado como falha.
- Console: `404` em `/tickets/new`. Fui eu que naveguei para essa URL por engano (a rota não existe; "Novo chamado" é um modal). Não é falha da aplicação.

## Não executados

Nenhum.

## Observações

- Dados criados: `#199 [QA] Linha do tempo longa` (QA Suporte, `em_andamento`, 9 eventos, 1 comentário `[QA]`). Fica no banco para reteste; não alterei #65 a #68 nem outro chamado.
- Cosmético, fora do contrato: com a região focada, os marcadores circulares dos eventos ficam encostados na borda esquerda da região (offset 0 px) e o anel de foco passa por cima deles. Os marcadores não estão cortados. O contrato prevê folga só à direita (`pr-*`, opcional); se quiserem folga à esquerda, é decisão do `df-architect`/`df-ui`.
- TS8 pede que a lista de comentários "role sozinha até o novo comentário", mas o contrato não define o número de comentários prévios; com um comentário só não há overflow, então o comportamento de rolagem dos comentários não foi exercitado aqui (o componente é o mesmo `ScrollToEndArea`, e a lógica de rolagem ao fim foi comprovada na linha do tempo em TS2/TS4/TS5). Ambiguidade menor para o `df-architect`: indicar um chamado com comentários suficientes para estourar `max-h-96`.
- A janela do navegador foi deixada aberta (sessão com A em `/tickets/199`, viewport 390×844).
