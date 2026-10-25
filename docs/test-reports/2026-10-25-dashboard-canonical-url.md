# Relatório de testes — URL canônica do Início

- **Data:** 2026-10-25
- **Contrato:** `docs/contracts/dashboard-overview.md` (seção "Revisão 2026-10-25 — a URL do Início sempre mostra o período")
- **Commit:** `4cb2c64` · alterações não comitadas: sim (`app/_lib/validation/dashboard.ts`, `app/(app)/dashboard/page.tsx`, contrato)
- **Ambiente:** `http://localhost:3000`, `next dev`, banco de desenvolvimento
- **Resultado:** 5 de 5 passaram · 0 falharam · 0 bloqueados · 0 não executados

## Pré-requisitos

Dev server respondeu 200; MCP `playwright` e `next-devtools` disponíveis. Os cenários não precisam de banco, então o MCP `postgres` não foi usado. Usuário: administrador `cazalbe@gmail.com` (credencial fornecida pelo usuário, não registrada aqui), só leitura. Nenhum dado foi criado.

## Cenários

| #   | Cenário                                                     | Papel                       | Status |
| --- | ----------------------------------------------------------- | --------------------------- | ------ |
| CU1 | Menu "Início" e `/dashboard` digitado viram `?periodo=hoje` | Admin (`cazalbe@gmail.com`) | PASSOU |
| CU2 | `?periodo=lixo` e `?periodo=todos` viram `?periodo=hoje`    | Admin                       | PASSOU |
| CU3 | `?periodo=mes` e Personalizado válido não mudam             | Admin                       | PASSOU |
| CU4 | Personalizado inválido (4 variações) vira `?periodo=hoje`   | Admin                       | PASSOU |
| CU5 | Voltar "Início" do detalhe, sem laço, sem erro              | Admin                       | PASSOU |

## Evidência

- **CU1:** login terminou em `/dashboard?periodo=hoje`. Clique no link "Início" do menu (partindo de `/tickets`) terminou em `/dashboard?periodo=hoje`. `/dashboard` digitado terminou em `/dashboard?periodo=hoje`. Filtro ativo (`aria-current=page`): "Hoje". O link do menu continua `href="/dashboard"`, como o contrato pede.
- **CU2:** `?periodo=lixo` e `?periodo=todos` terminaram em `?periodo=hoje`, filtro "Hoje".
- **CU3:** `?periodo=mes` ficou igual, filtro "Mês". `?periodo=personalizado&de=2026-10-15&ate=2026-10-25` ficou igual (sem redirecionamento).
- **CU4:** todos terminaram em `/dashboard?periodo=hoje`: `de=2026-10-25&ate=2026-10-15` (invertido), `de=2026-10-22&ate=2026-10-30` (ate futura), `de=2026-13-40&ate=2026-10-25` (malformada) e `de=2026-10-22` sem `ate`.
- **CU5:** em `/dashboard?periodo=mes`, os links de "Maiores atrasos" apontam para `/tickets/<id>?from=dashboard&periodo=mes`. No detalhe (`/tickets/124`), o voltar "Início" tem `href=/dashboard?periodo=mes` e levou a `/dashboard?periodo=mes`. Com `from=dashboard&periodo=todos`, o voltar tem `href=/dashboard?periodo=hoje` e levou a `/dashboard?periodo=hoje`. Sem requisições de navegação extras ao clicar no voltar.
- **Sem laço:** requisições de navegação por carregamento. URL canônica: 1 (`?periodo=mes`, Personalizado válido, `?periodo=hoje&x=1`). URL a corrigir: 2 (a original e a canônica), em todos os casos de CU1, CU2, CU4 e `?x=1`. Nenhuma repetição.
- **Nota do contrato:** `/dashboard?periodo=hoje&x=1` não redirecionou e manteve o `x`; `/dashboard?x=1` virou `/dashboard?periodo=hoje`.
- **Erros:** `get_errors` do dev server: `configErrors` e `sessionErrors` vazios. Console do navegador: 0 erros e 0 avisos na sessão.

## Falhas

Nenhuma.

## Erros fora dos cenários

Nenhum.

## Não executados

Nenhum.

## Observações

- A contagem de requisições de navegação foi feita com o `request` do Playwright (`isNavigationRequest`) em vez da aba Rede do DevTools; o resultado é equivalente. Clique em link do Next (navegação do lado do cliente) não aparece como requisição de navegação, então o "sem laço" do voltar foi confirmado pela URL final estável.
- O voltar com `periodo=todos` já chega ao detalhe resolvido para `?periodo=hoje` (o `href` renderizado já é canônico), então o redirecionamento da página nem chegou a ser acionado nesse caminho. Coerente com o contrato.
- Ambiguidades do contrato: nenhuma.
