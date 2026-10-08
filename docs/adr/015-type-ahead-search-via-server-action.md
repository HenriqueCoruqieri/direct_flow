# 015 — Busca enquanto se digita por Server Action de leitura

## Contexto

A barra superior ganha uma busca de chamado por número ou título com sugestões
enquanto a pessoa digita (contrato
`docs/contracts/ticket-search-and-queue-back-link.md`). A cada pausa na
digitação o cliente precisa de uma lista curta (até 8 itens) que depende do
texto digitado e da visibilidade de quem busca.

A seção 2 do `stack.md` diz que a UI **lê** por Server Component
(`app/_lib/data/`) e **escreve** só por Server Action. Uma busca enquanto se
digita é leitura iniciada pelo cliente, depois que a página já foi
renderizada: nenhum Server Component a atende sem navegar. A seção 3 proíbe
`app/api/**/route.ts` para conversar com o próprio backend.

## Decisão

**Exceção à seção 2, restrita a busca enquanto se digita (type-ahead).** Uma
Server Action de leitura, `searchTickets` (`app/_lib/actions/ticket-search.ts`,
dono `df-actions`), com a forma de qualquer action: confere a sessão, valida
com o schema compartilhado (`parseTicketSearchQuery`), monta os fatos do
visualizador, chama `app/_lib/data/` (`searchVisibleTickets`) e devolve.
**Não revalida, não redireciona e não grava cookie.** O texto inválido devolve
lista vazia, sem erro.

A exceção não se estende: lista, detalhe, contagem e qualquer outra leitura
continuam em Server Component. Uma nova leitura iniciada pelo cliente precisa
de ADR próprio.

Alternativas rejeitadas:

- **Route Handler `GET`** (`app/api/tickets/search/route.ts`): fere a seção 3,
  exige autenticação manual, `fetch` e parse de JSON no cliente e não tem dono
  na tabela de ownership.
- **Pré-carregar os chamados visíveis no topo** e filtrar no cliente: para a
  diretoria é a base inteira, serializada em toda página que mostra a barra.

## Consequências

- A documentação do Next 16 diz que Server Functions são feitas para mutação e
  que o cliente as despacha uma por vez
  (`node_modules/next/dist/docs/01-app/02-guides/server-actions.md:28`,
  `node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md:207`).
  Com debounce de 250 ms e descarte de resposta atrasada, numa caixa só, a fila
  não pesa. Uma action de mutação disparada durante a busca espera a busca em
  curso terminar (dezenas de milissegundos).
- A regra de visibilidade passa a existir em dois lugares: `canViewTicket`
  (`app/_lib/domain/ticket.ts`) e o `WHERE` de `searchVisibleTickets`. Mudança
  em um exige mudança no outro, com cenário de QA que compara os dois.
- Se a action ler cookie que o Better Auth renova (`getSession`), uma resposta
  ocasional pode trazer a página atual rerrenderizada (a renovação grava
  cookie). Custo aceito; não muda o resultado da busca.
- A linha da seção 2 do `stack.md` que aponta para este ADR é responsabilidade
  do orquestrador, com aprovação do usuário.
