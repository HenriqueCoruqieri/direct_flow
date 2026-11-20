# Relatório de testes — Meus chamados: abas Enviados e recusados / Atendidos

- **Data:** 2026-11-20
- **Contrato:** `docs/contracts/my-tickets-sent-and-attended.md` (ADR 028)
- **Commit:** `1aa5762` (cobre ef94e33, c722338 e 01347b6) · alterações não comitadas: não
- **Ambiente:** `http://localhost:3000`, `next dev`, banco de desenvolvimento
- **Resultado:** 27 de 27 passaram · 0 falharam · 0 bloqueados · 0 não executados (com ressalvas em "Observações")

## Pré-requisitos

- Dev server no ar (200 em `/login`), MCP `next-devtools`, `playwright` e `postgres` respondendo.
- Mapeamento de papéis (senha não registrada aqui): M = `mco_12@gmail.com` (Suporte, member); A = `cazalbe@gmail.com` (Suporte, admin); I = `martaselecao@gmail.com` (P&D, admin); Diretor = `lucas12surf@gmail.com` (Diretoria). "QA Infra" = P&D; "QA Suporte" = Suporte.
- MT24: o seed tem o setor ativo Financeiro (id 5), usado como terceiro setor. Nenhum setor foi cadastrado.
- Não li `.env`; o estado de `RESEND_API_KEY` não foi conferido. A feature não prevê e-mail, então não afeta nenhum cenário.

## Chamados `[QA]` criados

| #   | Título                                                                     | Uso                                   |
| --- | -------------------------------------------------------------------------- | ------------------------------------- |
| 27  | [QA] Enviados ida                                                          | MT3, MT4, MT5, MT6, MT23              |
| 28  | [QA] Enviados recusa                                                       | MT7, MT8 (termina pendente em P&D)    |
| 29  | [QA] Atendidos repasse                                                     | MT9 (repassado a Flávio Augusto, P&D) |
| 30  | [QA] Atendidos resolve                                                     | MT10 (resolvido em P&D)               |
| 31  | [QA] Atendidos reenvio                                                     | MT11                                  |
| 32  | [QA] Fila parada                                                           | MT12                                  |
| 33  | [QA] Acesso remetente (com anexo `qa-anexo.txt` e comentário interno de M) | MT17 a MT24, MT26                     |
| 34  | [QA] Acesso remetente (duplicado, ver Observações)                         | não usado                             |
| 35  | [QA] Envio do admin                                                        | MT25                                  |

## Cenários

| #    | Cenário                                                                                                                                                         | Papel       | Status                                                                                               |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------- |
| MT1  | Seis abas na ordem, Atribuídos a mim com `aria-current="page"`, sem Abertos por mim / Aguardando aprovação                                                      | M e Diretor | PASSOU                                                                                               |
| MT2  | `?tab=opened`, `?tab=awaiting&periodo=semana`, `?tab=xyz` caem em Atribuídos a mim; período Semana mantido; clique em aba escreve `tab=attended&periodo=semana` | M           | PASSOU                                                                                               |
| MT3  | Criar #27, enviar a P&D: Atribuídos 1→0, Enviados 0→1 com "Aguardando aprovação", Atendidos 0                                                                   | M           | PASSOU                                                                                               |
| MT4  | I aceita (Atender); M: sai de Enviados e entra em Atendidos com "Em andamento"; I com os chamados em Atribuídos                                                 | I, M        | PASSOU                                                                                               |
| MT5  | I envia #27 a Suporte com destinatário M: M sai de Atendidos; I entra em Enviados; detalhe de I carrega                                                         | I, M        | PASSOU                                                                                               |
| MT6  | M aceita a devolução: #27 em Atribuídos de M (não em Atendidos); I: sai de Enviados, entra em Atendidos                                                         | M, I        | PASSOU                                                                                               |
| MT7  | #28 recusado por I com motivo: M vê #28 em Enviados ("Recusado") e em Atribuídos; I em nenhuma aba nova                                                         | I, M        | PASSOU                                                                                               |
| MT8  | M reenvia #28 a P&D: continua em Enviados com "Aguardando aprovação" (novo último envio `pendente` de M)                                                        | M           | PASSOU (só o ramo reenviar; atender e resolver não exercitados)                                      |
| MT9  | Repasse de #29 dentro de P&D (a Flávio Augusto): sai de Atendidos de M, sem nova linha em `ticket_transfer` (`ntr` = 1)                                         | I, M        | PASSOU (o "Enviar" do setor só lista pessoas, não há "Devolver à fila"; usei o envio a outra pessoa) |
| MT10 | #30 aceito e resolvido em P&D: sai de Atendidos de M, não entra em Resolvidos (continua 7); M abre pela busca do topo                                           | I, M        | PASSOU                                                                                               |
| MT11 | #31: I aceita e reenvia a Suporte sem destinatário: sai de Atendidos de M; entra em Enviados de I                                                               | I, M        | PASSOU                                                                                               |
| MT12 | #32 (fila, sem destinatário): em nenhuma aba de M; presente na Fila do setor                                                                                    | M           | PASSOU                                                                                               |
| MT13 | Contagens de M, A e I contra a consulta de referência                                                                                                           | banco       | PASSOU                                                                                               |
| MT14 | Filtro de Status: Enviados = Aguardando aprovação, Recusado; Atendidos = Aberto, Em análise, Encaminhado, Em andamento                                          | M           | PASSOU                                                                                               |
| MT15 | Vazios com Todos: textos do contrato; Semana e Personalizado (03/11 a 04/11): "Nenhum chamado neste período"                                                    | M           | PASSOU                                                                                               |
| MT16 | Sem erro de runtime nem hidratação em MT1 a MT15; linhas novas só das ações                                                                                     | todos       | PASSOU (ver "Erros fora dos cenários")                                                               |
| MT17 | I abre #33 pelo link em Enviados: detalhe abre e mostra o envio pendente para Suporte                                                                           | I           | PASSOU                                                                                               |
| MT18 | Sem Editar, Resolver, Assumir, Atender, Enviar, Enviar para outro setor, Aceitar, Recusar; só "Comentar" e editar/excluir do próprio comentário                 | I           | PASSOU                                                                                               |
| MT19 | Comentário público de I aparece; banco: `message` com `user_id` = 19, `visibility` = `publica`; comentário interno de M não aparece                             | I           | PASSOU                                                                                               |
| MT20 | `GET /api/attachments/22` responde 307 para URL assinada do R2                                                                                                  | I           | PASSOU (o download do corpo do arquivo não foi baixado)                                              |
| MT21 | Requisições diretas de resolver, editar e salvar ações em #33                                                                                                   | I           | PASSOU                                                                                               |
| MT22 | Busca do topo por "33" e por "Acesso remetente" traz #33                                                                                                        | I           | PASSOU                                                                                               |
| MT23 | M aceita; #33 em Atendidos de I e o detalhe abre                                                                                                                | M, I        | PASSOU                                                                                               |
| MT24 | M envia #33 a Financeiro; I perde o acesso em tudo                                                                                                              | M, I        | PASSOU                                                                                               |
| MT25 | A abre #35 (destinatário A), envia a P&D: continua no detalhe com envio pendente; #35 em Enviados de A                                                          | A           | PASSOU                                                                                               |
| MT26 | I: formulário sem checkbox "Comentário privado"; `addTicketComment` forjado com `isPrivate: true` volta `FORBIDDEN`; M vê o checkbox                            | I, M        | PASSOU                                                                                               |
| MT27 | Sem erro nem aviso de hidratação em MT17 a MT26                                                                                                                 | todos       | PASSOU (ver "Erros fora dos cenários")                                                               |

Responsivo (390x844): `scrollWidth` = 390 nas abas `sent`, `attended` e `assigned`; as abas são alcançáveis e o clique em Atendidos navega. Screenshot: `.qa-output/mt-sent-390.png`.

## Evidências

- **MT3** (banco): `ticket` 27 `aguardando_aprovacao`, `assigned_to` nulo, último envio `requested_by` = 4, `pendente`.
- **MT4** (banco): #27, #29, #30, #31, #33 com último envio `aprovado`, `reviewed_by` = 19 = `assigned_to`, status `em_andamento`. UI de M: Atendidos 5, Enviados 1 (#28).
- **MT5/MT6/MT23**: UI de I: Enviados 3 (#27, #31, #33) e Atendidos 0 → após M atender: Enviados 1 (#31), Atendidos 2 (#27, #33).
- **MT7** (banco): #28 `recusado`, `assigned_to` = 4, último envio `rejeitado`, `reviewed_by` = 19. UI de M: #28 em Enviados e em Atribuídos.
- **MT9** (banco): #29 `encaminhado`, `assigned_to` = 25, último envio `aprovado` `reviewed_by` = 19, `count(ticket_transfer)` = 1. UI de M: Atendidos 0.
- **MT10** (banco): #30 `resolvido`; UI de M: Resolvidos continua 7; busca do topo abriu `/tickets/30`.
- **MT13**: consulta de referência (`distinct on (ticket_id)` + regras de `sent` e `attended`) para os usuários 2, 4 e 19:

  | usuário | sent | attended | ids                    |
  | ------- | ---- | -------- | ---------------------- |
  | 2 (A)   | 1    | 0        | sent: 35               |
  | 4 (M)   | 2    | 0        | sent: 28, 33           |
  | 19 (I)  | 1    | 1        | sent: 31; attended: 27 |

  A UI mostrou os mesmos números para A (Enviados 1), M (Enviados 2: #33 e #28; Atendidos 0) e I (Enviados 1: #31; Atendidos 1: #27).

- **MT19** (banco): `select count(*) from message where ticket_id=33 and user_id=19 and visibility='publica' and content like '%público de I%'` = 1.
- **MT21** requisições diretas (Server Actions `resolveTicket`, `saveTicketActions`, `editTicket` com a sessão de I):
  - `resolveTicket` → `FORBIDDEN` "Você não pode resolver este chamado."
  - `saveTicketActions` → `FORBIDDEN` "As ações só podem ser registradas com o chamado em andamento." (a recusa veio pelo status; o contrato aceita `FORBIDDEN` ou `NOT_EDITABLE`)
  - `editTicket` → `FORBIDDEN` "Você não pode editar este chamado."
  - Banco: `ticket` 33 com título, `solution` e `actions` inalterados.
- **MT24**: depois do envio a Financeiro, com a sessão de I: `GET /tickets/33` → 404; `GET /api/attachments/22` → 404; `addTicketComment` → `NOT_FOUND` "Chamado não encontrado."; busca "Acesso remetente" sem resultados; Atendidos de I = só #27. Banco: nenhum comentário "pos perda" gravado (`count` = 0).
- **MT26**: `addTicketComment` com `{ ticketId: 33, content: "[QA] interno forjado", isPrivate: true }` por I → `{"ok":false,"code":"FORBIDDEN","message":"Você não pode comentar neste chamado."}`. Banco: `select count(*) from message where content like '%forjad%'` = 0. Checkbox "Comentário privado": 0 elementos para I, 1 para M em #33 (setor atual Suporte). Para Marta (P&D, setor atual de #29) o checkbox aparece.
- **MT16/MT27** (linhas novas): `ticket` 26→35, `ticket_history` 108→140, `ticket_transfer` 11→23; todas oriundas das ações dos cenários.

## Falhas

Nenhuma.

## Erros fora dos cenários

- `get_errors` do `next-devtools` ficou vazio (`sessionErrors: []`) em todas as consultas até o passo do screenshot em 390x844. Logo após o `page.screenshot` apareceu um erro de hidratação em `/tickets?tab=attended&periodo=todos`: `<input>` do `TicketSearch` (`app/(app)/_components/ticket-search.tsx:147`) com `style={{caret-color:"transparent"}}` só no cliente. Esse estilo é o que o `page.screenshot` do Playwright injeta para esconder o cursor, então trato como artefato da ferramenta de teste, não da aplicação. Não reproduzido sem screenshot. Se o time quiser descartar, vale reabrir a rota sem capturar tela.

## Não executados

Nenhum.

## Observações

- **Duplicata #34.** O primeiro script de criação de "[QA] Acesso remetente" ficou parado no seletor de arquivo, completou depois, e repeti a criação; ficaram #33 e #34, ambos de M, com anexo e destinatário M. Só #33 foi usado nos cenários; #34 ficou em Suporte, `em_andamento`, com M.
- **MT8:** só o ramo "reenviar" foi exercitado; "atender" e "resolver" a partir de `recusado` não foram testados.
- **MT9:** o botão "Enviar" do setor de destino só lista pessoas (`Flávio Augusto`, etc.), não existe "Devolver à fila" nesse caminho; o cenário foi cumprido com o envio a outra pessoa de P&D. O contrato cita "Devolver à fila" como alternativa; o texto pode ser ajustado.
- **Detalhe de envio pendente (fora do escopo da feature):** em #33, o banner mostra "Para: Marcelo Oliveira" (destinatário do envio) e o card Detalhes mostra "Destinatário: Fila de Suporte". Provável convenção do chamado pendente (`assigned_to` nulo), mas a divergência visual entre os dois campos pode confundir. Registrar para o `df-architect` decidir se é intencional.
- **MT20:** validei a resposta 307 com a URL assinada do R2, não o conteúdo baixado.
- **MT21:** o contrato aceita `FORBIDDEN` ou `NOT_EDITABLE`; as três respostas vieram `FORBIDDEN`.
- Contas usadas com uma única tentativa de login cada por troca de papel; nenhuma falhou. A janela do navegador ficou aberta.
