# Relatório de testes — Smoke da refatoração `lockActorFacts`

- **Data:** 2026-10-08
- **Contrato:** `docs/contracts/ticket-creation.md`, `ticket-edit.md`, `ticket-assignee.md`, `ticket-resolution.md`, `queue-default-and-comment-edit.md`, `queue-tabs-comment-delete-and-attend.md`
- **Commit:** `eb53192` · alterações não comitadas: sim (`app/_lib/data/actor-facts.ts` novo, `app/_lib/data/tickets.ts`, `app/_lib/data/ticket-messages.ts`)
- **Ambiente:** `http://localhost:3000`, `next dev`, banco de desenvolvimento
- **Resultado:** 13 de 13 passaram · 0 falharam · 0 bloqueados · 0 não executados

## Pré-requisitos

- Dev server: `/login` devolveu 200.
- MCP `playwright`, `next-devtools` e `postgres` responderam.
- Usuários `qa.admin.suporte` e `qa.member.suporte` existem e estão ativos (SELECT em `users` + `department`). O `qa.admin.infra` está inativo no banco; não foi necessário neste smoke.
- `RESEND_API_KEY` está preenchida no `.env`. Nenhum fluxo testado envia e-mail (as actions de ticket e comentário não importam `app/_lib/email`), então nenhum cenário foi afetado.

## Cobertura das 7 funções que chamam `lockActorFacts`

| Função                                     | Fluxo que a chama                   | Cenários |
| ------------------------------------------ | ----------------------------------- | -------- |
| `tickets.ts` `updateTicketByAuthor`        | Editar chamado pelo detalhe (autor) | 4        |
| `tickets.ts` `updateTicketResolution`      | Resolver chamado                    | 8        |
| `tickets.ts` `assignTicket`                | Assumir e Enviar na Fila            | 5, 6     |
| `tickets.ts` `startTicketWork`             | Atender chamado encaminhado         | 7        |
| `ticket-messages.ts` `insertTicketMessage` | Comentar (público e privado)        | 9        |
| `ticket-messages.ts` `updateTicketMessage` | Editar comentário                   | 10, 12   |
| `ticket-messages.ts` `deleteTicketMessage` | Excluir comentário                  | 11, 13   |

`insertTicket` (criação) não usa `lockActorFacts`; foi exercitado nos cenários 1 a 3 só como regressão do arquivo alterado.

## Cenários

| #   | Cenário                                                                                                       | Papel                           | Status |
| --- | ------------------------------------------------------------------------------------------------------------- | ------------------------------- | ------ |
| 1   | Criar chamado para a fila (#137): `aberto`, sem destinatário, histórico `criacao`                             | Membro QA Suporte               | PASSOU |
| 2   | Criar chamado para si (#138): `em_andamento`, destinatário o próprio autor, `criacao`                         | Membro QA Suporte               | PASSOU |
| 3   | Criar chamado para colega (#139): `encaminhado`, destinatário admin QA, `criacao`                             | Membro QA Suporte               | PASSOU |
| 4   | Editar título pelo detalhe (#138): título gravado, linha `edicao` "Alterou título."                           | Membro QA Suporte (autor)       | PASSOU |
| 5   | Assumir na fila (#137): `em_andamento`, `assigned_to` = admin; `atribuicao` + `mudanca_status`                | Admin QA Suporte                | PASSOU |
| 6   | Enviar para colega (#140, criado na fila pelo admin): `encaminhado`, `assigned_to` = membro                   | Admin QA Suporte                | PASSOU |
| 7   | Atender (#139): `encaminhado` > `em_andamento`, linha `mudanca_status` com `changed_by` do destinatário       | Admin QA Suporte (destinatário) | PASSOU |
| 8   | Resolver (#138): `resolvido`, `solution` e `resolved_at` gravados, linha `resolucao` em_andamento > resolvido | Membro QA Suporte               | PASSOU |
| 9   | Comentar público (`publica`) e privado (`interna`) em #138; contador 2                                        | Membro QA Suporte               | PASSOU |
| 10  | Editar comentário público: conteúdo novo gravado, marca "(editado)", sem linha em `ticket_history`            | Membro QA Suporte               | PASSOU |
| 11  | Excluir comentário privado (diálogo de confirmação): linha removida de `message`, sem `ticket_history`        | Membro QA Suporte               | PASSOU |
| 12  | Negativo: admin tenta editar comentário do membro (action reutilizada com `messageId` alheio)                 | Admin QA Suporte                | PASSOU |
| 13  | Negativo: admin tenta excluir comentário do membro (action reutilizada com `messageId` alheio)                | Admin QA Suporte                | PASSOU |

## Evidências

Consultas feitas pelo MCP `postgres` (leitura). Tickets e comentários criados pelo teste: #137 a #140 (títulos `[QA] smoke ...`), mensagens 35 a 38.

- Cenários 1 a 3: `select ... from ticket t ... ticket_history` devolveu #137 `aberto`/`null`/dept 18/`criacao`; #138 `em_andamento`/14/`criacao`; #139 `encaminhado`/13/`criacao`.
- Cenário 4: `ticket_history` de #138: id 274 `edicao`, `note = 'Alterou título.'`; `ticket.title = '[QA] smoke para si editado'`.
- Cenário 5: `ticket_history` de #137: 276 `atribuicao` (`to_assignee_id = 13`, `changed_by = 13`) e 277 `mudanca_status` `aberto > em_andamento`; `ticket.status = 'em_andamento'`, `assigned_to = 13`.
- Cenário 6: #140: 279 `criacao`, 280 `atribuicao` (`to_assignee_id = 14`), 281 `mudanca_status` `aberto > encaminhado`; `ticket.status = 'encaminhado'`, `assigned_to = 14`.
- Cenário 7: #139: 273 `criacao`, 278 `mudanca_status` `encaminhado > em_andamento`, `changed_by = 13`; `ticket.status = 'em_andamento'`, `assigned_to = 13` (inalterado).
- Cenário 8: #138: 275 `resolucao` `em_andamento > resolvido`, `changed_by = 14`; `ticket.status = 'resolvido'`, `solution = '[QA] solução do smoke'`, `resolved_at` preenchido. Status do ticket bate com a última linha do histórico.
- Cenários 9 a 11: `select id,user_id,content,visibility from message where ticket_id=138`: após publicar, 35 `publica` e 36 `interna`; após editar e excluir, só a 35 com `'[QA] comentário público editado'`. Nenhuma linha de comentário em `ticket_history`.
- Cenários 12 e 13: com a sessão do admin, o `Next-Action` de editar/excluir capturado de um comentário do próprio admin (#37 e #38) foi reenviado por `fetch` com `messageId: 35`. Respostas: `{"ok":false,"code":"FORBIDDEN","message":"Você não pode editar este comentário."}` e `"Você não pode excluir este comentário."`. A linha 35 permaneceu intacta (`user_id = 14`, conteúdo editado do membro). Na interface, o admin também não vê os botões Editar e Excluir no comentário do membro.
- `get_errors` do `next-devtools`: `configErrors` e `sessionErrors` vazios ao final. No `next-development.log`, nenhum erro de servidor na janela do teste.

## Falhas

Nenhuma.

## Erros fora dos cenários

Nenhum durante o teste. O log do dev server guarda entradas anteriores ao teste (erro `ActiveTabNav is not defined` às 03:50 e aviso de hidratação por `caret-color` às 03:57, no detalhe do #130), sem relação com esta refatoração e já resolvidas.

## Não executados

Nenhum.

## Observações

- Os cenários 12 e 13 usaram reenvio da Server Action pelo navegador (a interface não oferece o botão), porque é a única forma de chegar à recusa na camada de dados/action. Os comentários criados pelo admin para capturar a requisição (#37 apagado, #38 editado) ficam no #138.
- A janela do navegador foi deixada aberta, logada como Admin QA Suporte.
- Dados `[QA] smoke ...` (#137 a #140) permanecem no banco, todos no setor QA Suporte.
