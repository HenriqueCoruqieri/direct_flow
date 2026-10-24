# Relatório de testes — dashboard-overview (voltar do chamado para o Início)

- **Data:** 2026-10-24
- **Contrato:** `docs/contracts/dashboard-overview.md`, seção "Revisão 2026-10-24 — voltar do chamado para o Início" (VD1–VD4)
- **Commit:** `4eeede9` · alterações não comitadas: sim
- **Ambiente:** `http://localhost:3000`, `next dev`, banco de desenvolvimento
- **Resultado:** 4 de 4 passaram · 0 falharam · 0 bloqueados · 0 não executados

## Pré-requisitos

- Dev server respondeu 200 em `/login`. MCP `playwright`, `next-devtools` e `postgres` (`SELECT 1`) disponíveis.
- Usuário: Administrador `cazalbe@gmail.com` (Suporte), credencial fornecida pelo usuário. Os usuários QA do seed não foram usados; os cenários são só de leitura e nenhum dado foi criado ou alterado.
- `RESEND_API_KEY` está preenchida no `.env`. Não afeta esta bateria, que não dispara e-mail.

## Cenários

| #   | Cenário                                                                            | Papel                   | Status |
| --- | ---------------------------------------------------------------------------------- | ----------------------- | ------ |
| VD1 | "Maiores atrasos" com período Mês: Nº leva ao chamado e "Início" volta             | Administrador (Suporte) | PASSOU |
| VD2 | O mesmo com Personalizado (14 a 24 out 2026)                                       | Administrador (Suporte) | PASSOU |
| VD3 | "Transferências entre setores" (#250) com Mês e com Personalizado, e voltar        | Administrador (Suporte) | PASSOU |
| VD4 | `periodo=todos` cai em Hoje; Fila, Aprovações, sem origem e busca do topo mantidos | Administrador (Suporte) | PASSOU |

## Evidências

- **VD1.** Cliques reais no Nº #101 saindo de `/dashboard?periodo=mes` levaram a `/tickets/101?from=dashboard&periodo=mes`. O link de voltar é "Início" com `href=/dashboard?periodo=mes`. O clique nele devolveu `/dashboard?periodo=mes`, com o rótulo "1–31 out 2026". Screenshot em `.qa-output/vd1.png`.
- **VD2.** Os seis links de "Maiores atrasos" ficaram `/tickets/{id}?from=dashboard&periodo=personalizado&de=2026-10-14&ate=2026-10-24`. O voltar levou a `/dashboard?periodo=personalizado&de=2026-10-14&ate=2026-10-24`, com o rótulo "14–24 out 2026" igual ao de antes. Screenshot em `.qa-output/vd2.png`.
- **VD3.** O item #250 (de Diretoria, aguardando aceite) levou a `/tickets/250?from=dashboard&periodo=mes` e depois à versão com `personalizado&de=…&ate=…`. O voltar "Início" retornou ao mesmo período nos dois casos, com rótulos "1–31 out 2026" e "14–24 out 2026". Screenshot em `.qa-output/vd3.png`.
- **VD4.**
  - `/tickets/101?from=dashboard&periodo=todos`: o voltar é "Início" com `href=/dashboard?periodo=hoje`.
  - Fila (clique real): `/tickets/257?from=queue&tab=open&periodo=todos` mostra "Fila do setor" com `/queue?tab=open&periodo=todos`. Com `periodo=mes` o link do chamado carrega `periodo=mes`.
  - Aprovações (clique real): `/tickets/250?from=approvals&periodo=todos` mostra "Aprovações" com `/approvals?periodo=todos`.
  - Sem `from` (`/tickets/101`): "Meus chamados" com `/tickets`.
  - Busca do topo (digitando 250 e escolhendo o resultado): abre `/tickets/250` sem parâmetros, e o voltar é "Meus chamados" com `/tickets`.
- `get_errors` do `next-devtools` devolveu `configErrors: []` e `sessionErrors: []` após os cenários.

## Falhas

Nenhuma.

## Erros fora dos cenários

Nenhum.

## Não executados

- Papel Membro (`rodalv@gmail.com`): não foi testado. O contrato lista só o papel A nos cenários VD1–VD4.
- Viewport 390×844: não pedido para esta correção.

## Observações

- Em "Meus chamados" deste administrador a lista está vazia (todas as abas em 0). Por isso a origem "Meus chamados" foi conferida pelo chamado sem `from` e pela busca do topo, não por clique numa linha da própria tela.
- Na tela do chamado existem dois links com o rótulo "Início": o da navegação lateral (`/dashboard`) e o de voltar, com o período. O de voltar é o que o contrato descreve.
- Nenhuma ambiguidade no contrato.
