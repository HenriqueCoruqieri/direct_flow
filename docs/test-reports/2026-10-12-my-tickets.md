# Relatório de testes — Meus chamados (aba padrão Atribuídos a mim)

- **Data:** 2026-10-12
- **Contrato:** `docs/contracts/my-tickets.md` (cenários 55–59, revisão de 2026-10-12); também TR5 de `docs/contracts/department-transfer.md` e cenário 24 de `docs/contracts/ticket-edit-window.md`
- **Commit:** `8c51241` · alterações não comitadas: sim (`app/_lib/domain/my-tickets-tabs.ts`, `app/_lib/domain/my-tickets.ts`, três contratos e o plano)
- **Ambiente:** `http://localhost:3000`, `next dev`, banco de desenvolvimento
- **Resultado:** 5 de 6 passaram · 0 falharam · 0 bloqueados · 1 não executado

## Pré-requisitos

- Dev server: `/login` devolveu 200.
- Playwright: disponível, janela visível trazida para frente.
- MCPs `postgres` e `next-devtools`: indisponíveis nesta sessão (informado pelo orquestrador). **Nenhuma consulta ao banco nem `get_errors`/`get_logs` foi feita.** Toda a verificação foi pela interface e pelo console do navegador (0 erros, 0 avisos em `browser_console_messages`).
- Usuários: login com `qa.member.suporte@directflow.test` e com o diretor (`SEED_ADMIN_EMAIL`) funcionou. Os demais usuários QA não foram necessários.
- `RESEND_API_KEY` preenchida: não afeta, nenhum cenário desta revisão envia e-mail.

## Cenários

| #            | Cenário                                                                                          | Papel    | Status                                                                    |
| ------------ | ------------------------------------------------------------------------------------------------ | -------- | ------------------------------------------------------------------------- |
| 55 (membro)  | Menu "Meus chamados": seis abas na ordem nova, Atribuídos a mim ativa, período Hoje              | Membro   | PASSOU                                                                    |
| 55 (diretor) | Idem                                                                                             | Diretor  | PASSOU                                                                    |
| 56           | Clicar Todos: URL `/tickets?tab=assigned&periodo=todos`, lista de atribuídos não terminais       | Membro   | PASSOU (lista pela interface; SQL não conferido)                          |
| 57           | `?tab=xyz`, `?tab=Assigned` caem em Atribuídos a mim; `?tab=opened` em Abertos por mim           | Membro   | PASSOU (`?tab=xyz` conferido também como diretor)                         |
| 58           | Abrir chamado #140 pela lista e voltar por "Meus chamados"                                       | Membro   | PASSOU                                                                    |
| 59           | Sem erro/aviso de hidratação e sem linhas novas em `ticket`, `ticket_history`, `ticket_transfer` | qualquer | NÃO EXECUTADO (parcial: console limpo; banco e dev server não conferidos) |

Conferências cruzadas:

- TR5 (`department-transfer.md`): ordem das abas Atribuídos a mim · Abertos por mim · Aguardando aprovação · Resolvidos · Fechados · Cancelados, Atribuídos a mim ativa e link de Todos com `tab=assigned`. Confere (como membro).
- Cenário 24 (`ticket-edit-window.md`): como diretor, Todos leva a `/tickets?tab=assigned&periodo=todos`, Todos ativo, sem subtítulo, recarregar mantém; trocar para Fechados dá `tab=closed&periodo=todos` com Todos ativo. Confere.

## Evidência

- Membro, `/tickets`: abas com `href` `?tab=assigned|opened|awaiting|resolved|closed|cancelled&periodo=hoje`, `aria-current="page"` só em Atribuídos a mim e em Hoje. Screenshot `.qa-output/tickets-member.png`.
- Membro, Todos: aba Atribuídos a mim com contagem 13 e 13 linhas (#140, #135, #131, #129, #120, #119, #117, #104, #102, #100, #99, #98, #97), em ordem decrescente de id, nenhuma com status Resolvido, Fechado ou Cancelado (aparecem Encaminhado, Em andamento e Aberto). Screenshot `.qa-output/tickets-member-todos.png`. Contagens das outras abas: Abertos por mim 44, Aguardando aprovação 3, Resolvidos 16, Fechados 0, Cancelados 0.
- `?tab=xyz` e `?tab=Assigned`: Atribuídos a mim ativa, h1 "Meus chamados", sem tela de erro. `?tab=opened`: Abertos por mim ativa.
- Voltar do detalhe: em `/tickets/140`, o link "Meus chamados" (sidebar) levou a `/tickets` com Atribuídos a mim e Hoje ativos. O link "Meus chamados" do topo do detalhe tem o mesmo `href` (`/tickets`) mas não foi clicado separadamente.
- Diretor, Atribuídos a mim em Todos: 3 linhas, contagem 3; Fechados em Todos: contagem 3.

## Falhas

Nenhuma.

## Erros fora dos cenários

Nenhum no console do navegador (0 erros, 0 avisos). Dev server não conferido.

## Não executados

- **59 (parte do banco e dev server):** MCPs `postgres` e `next-devtools` indisponíveis. Não foi possível confirmar a ausência de linhas novas em `ticket`, `ticket_history` e `ticket_transfer` (a navegação foi só de leitura, nenhuma ação de escrita foi feita), nem a ausência de aviso de hidratação nos logs do servidor.
- **56, consulta SQL:** a igualdade com `select id from ticket where assigned_to = $1 and status not in (...) order by created_at desc, id desc` não foi conferida no banco; só a coerência da lista na tela.
- **Responsivo (390×844):** fora do escopo da revisão, não executado.

## Observações

- O link de voltar do topo do detalhe não foi exercitado separadamente do item de menu; ambos apontam para `/tickets`.
- A janela do navegador ficou aberta, com a sessão do diretor.
