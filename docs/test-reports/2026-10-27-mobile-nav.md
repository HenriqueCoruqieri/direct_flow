# Relatório de testes — menu de navegação no celular

- **Data:** 2026-10-27
- **Contrato:** nenhum. Sem contrato por pedido do usuário; os cenários MN1 a MN8 do comando foram usados como especificação.
- **Commit:** `c956bc5` · alterações não comitadas: sim (`app-sidebar.tsx`, `mobile-header.tsx`, `layout.tsx` modificados; `app-nav.tsx`, `mobile-nav.tsx`, `ui/sheet.tsx` novos)
- **Ambiente:** `http://localhost:3000`, `next dev`, banco de desenvolvimento
- **Resultado:** 8 de 8 passaram · 0 falharam · 0 bloqueados · 0 não executados

## Pré-requisitos

- Dev server 200. MCPs `playwright`, `next-devtools` e `postgres` respondem.
- Usuários fornecidos pelo usuário (senha não registrada), conferidos no banco: `cazalbe@gmail.com` (admin, Suporte, ativo) e `rodalv@gmail.com` (member, Suporte, ativo).
- `RESEND_API_KEY` está preenchida; irrelevante, nenhum cenário dispara e-mail.
- A sessão do navegador já estava aberta com outro usuário; foi encerrada antes de logar com os usuários acima.

## Cenários

| #   | Cenário                                                                                | Papel                     | Status |
| --- | -------------------------------------------------------------------------------------- | ------------------------- | ------ |
| MN1 | Botão "Abrir menu" no canto esquerdo, antes do avatar, `aria-expanded=false` (390×844) | Admin `cazalbe@gmail.com` | PASSOU |
| MN2 | Abrir painel pela esquerda com marca e itens, item atual marcado, selo de Aprovações   | Admin `cazalbe@gmail.com` | PASSOU |
| MN3 | Navegar por item fecha o painel; voltar do navegador não reabre                        | Admin `cazalbe@gmail.com` | PASSOU |
| MN4 | Fechar por botão, `Esc` e toque fora; foco volta ao botão; `Tab` preso no painel       | Admin `cazalbe@gmail.com` | PASSOU |
| MN5 | Sem rolagem horizontal a 390 px, painel aberto e fechado                               | Admin e Membro            | PASSOU |
| MN6 | Desktop 1280×800 sem mudança, sem botão nem painel                                     | Admin `cazalbe@gmail.com` | PASSOU |
| MN7 | Itens condicionais iguais ao sidebar desktop, Admin vs Membro                          | Admin e Membro            | PASSOU |
| MN8 | Console e `get_errors` sem erros nem avisos                                            | Admin e Membro            | PASSOU |

## Evidências

- **MN1:** botão em x=12, y=25, 36×36; avatar em x=60 (à direita do botão). Nome acessível "Abrir menu", `aria-expanded="false"`. Screenshot `.qa-output/mn1-closed.png`.
- **MN2:** painel em x=0, largura medida 292,5 px, altura 844. Texto: "Direct Flow", Início, Meus chamados, Fila do setor, Aprovações, Cadastros. `aria-current` em "Início" no dashboard e em "Fila do setor" ao abrir em `/queue`. Cadastros expande para Pessoas (`/registry/people`) e Tags (`/registry/tags`). Selo de Aprovações ausente para o Suporte, o que bate com o banco:
  `SELECT count(*) FROM ticket_transfer t WHERE t.status='pendente' AND t.to_department_id=(SELECT department_id FROM users WHERE email='cazalbe@gmail.com')` retornou `count = 0`. Screenshots `.qa-output/mn2-open-admin.png`, `.qa-output/mn5-open-cadastros-admin.png`.
- **MN3:** clique em "Meus chamados" levou a `/tickets` com 0 diálogos abertos. `goBack` voltou a `/dashboard?periodo=hoje` com 0 diálogos.
- **MN4:** `Esc`, botão "Fechar menu" e clique em (360,500) fecharam o painel (0 diálogos) e deixaram o foco em "Abrir menu". Sequência de 8 `Tab`: Início, Meus chamados, Fila do setor, Aprovações, Cadastros, Fechar menu, Início, Meus chamados, todos dentro do diálogo (foco circula).
- **MN5:** `scrollWidth`/`innerWidth` fechado 375/390 e aberto 390/390, para Admin e Membro. Nada cortado nos screenshots `.qa-output/mn5-open-cadastros-admin.png` e `.qa-output/mn7-mobile-member.png`.
- **MN6:** 0 botões "Abrir menu", 0 diálogos. Sidebar Admin: Início, Meus chamados, Fila do setor, Aprovações, Cadastros, mais o rodapé do usuário. Screenshot `.qa-output/mn6-desktop-admin.png`.
- **MN7:** Admin, desktop e celular: Início, Meus chamados, Fila do setor, Aprovações, Cadastros. Membro (`rodalv@gmail.com`), desktop e celular: Início, Meus chamados, Fila do setor, Aprovações, sem Cadastros. Screenshot `.qa-output/mn7-desktop-member.png`.
- **MN8:** `get_errors` devolveu `configErrors: []` e `sessionErrors: []` após cada papel. Console do navegador com 0 erros e 0 avisos, inclusive após abrir o painel várias vezes; nenhum aviso do Radix sobre descrição (o diálogo não tem `aria-describedby`).

## Falhas

Nenhuma.

## Erros fora dos cenários

Nenhum.

## Não executados

Nenhum.

## Observações

- Sem contrato, o esperado veio só da lista do comando. Pontos que ela não fixa:
  - O botão "Abrir menu" mede 36×36 px, abaixo dos 44 px do avatar vizinho e do alvo de toque usual. Decisão para o `df-ui`/`df-architect` se há mínimo exigido.
  - A largura do painel mede 292,5 px, não 288 px (a classe é `w-72`). Provável efeito do `sheet` (borda ou largura máxima); sem impacto visível.
- Selo de pendências de Aprovações: só foi possível conferir o caso zero (Suporte não tem transferência pendente recebida). O caso com número não foi exercitado; existem pendências nos setores 13, 15, 18 e 19, mas não há usuário de teste fornecido para eles. A paridade com o desktop vem do componente compartilhado `app-nav.tsx`, não de comparação visual.
- Banco só lido; nada foi criado ou alterado.
