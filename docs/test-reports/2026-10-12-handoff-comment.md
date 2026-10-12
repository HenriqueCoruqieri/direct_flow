# Relatório de testes — Comentário na troca de destinatário

- **Data:** 2026-10-12
- **Contrato:** `docs/contracts/handoff-comment.md`
- **Commit:** `194fe06` · alterações não comitadas: sim
- **Ambiente:** `http://localhost:3000`, `next dev`, banco de desenvolvimento
- **Resultado:** 30 de 34 passaram · 0 falharam · 0 bloqueados · 4 não executados

## Pré-requisitos

- Dev server no ar (`/login` devolveu 200).
- Playwright disponível, janela visível (Chrome do servidor MCP), mantida aberta ao final.
- MCPs `postgres` e `next-devtools` **indisponíveis** nesta sessão (informado pelo comando). Todo cenário foi conferido pela interface: comentários públicos com autor e horário, linha do tempo, aviso "Aguardando aprovação", toasts. O que só o banco ou os logs confirmariam ficou como NÃO EXECUTADO ou como ressalva na coluna de observações.
- Usuários QA já existiam (seed rodado hoje); login dos quatro papéis funcionou.
- `RESEND_API_KEY` está preenchida no `.env`. Nenhum dos três caminhos do contrato envia e-mail (as únicas chamadas de e-mail em `app/_lib/actions/` são do perfil, troca de senha), então nenhum cenário foi pulado por isso; HC34 não tem como confirmar "nenhum e-mail" por log.
- Chamados criados pelo próprio teste, como QA Membro Suporte, tag `[QA] Acesso`: `#177` (H1), `#178` (H2), `#179` (H3), `#180` (H4), `#181` (H5), `#182` (H6), `#183` (H7), `#184` (H8). Nenhum chamado fora desse conjunto foi alterado.
- Payload forjado: reescrita do corpo da request da Server Action via `page.route`, a partir do formulário legítimo, sem MCP de banco.

## Cenários

| #    | Cenário                                                                                | Papel | Status        |
| ---- | -------------------------------------------------------------------------------------- | ----- | ------------- |
| HC1  | Diálogo "Enviar para outro setor": descrição, campo Comentário, placeholder            | M     | PASSOU        |
| HC2  | Comentário vazio e só espaços: mensagem, foco, `aria-invalid`, sem request             | M     | PASSOU        |
| HC3  | Comentário de 5001 caracteres barrado no cliente                                       | M     | PASSOU        |
| HC4  | Envio com espaços nas pontas: toast, aviso amarelo, card Conclusão, comentário público | M     | PASSOU        |
| HC5  | Banco: `message`, `request_reason`, `transferencia_solicitada`                         | banco | NÃO EXECUTADO |
| HC6  | I e D veem o comentário; I vê Atender e Recusar                                        | I e D | PASSOU        |
| HC7  | Forjar `sendTicketToDepartment` sem comentário, `"   "` e 5001: toast                  | M     | PASSOU        |
| HC8  | Envio com comentário de 5000 caracteres, aviso sem estourar largura                    | M     | PASSOU        |
| HC9  | "Atender" sem campo de comentário e sem `message` nova                                 | I     | PASSOU        |
| HC10 | Regressão da recusa: três mensagens e recusa válida com comentário público             | I     | PASSOU        |
| HC11 | "Enviar" da Fila: descrição e campo Comentário depois do Destinatário                  | A     | PASSOU        |
| HC12 | Fila: sem nada e só sem comentário, mensagem por campo e foco                          | A     | PASSOU        |
| HC13 | Fila: envio válido para QA Membro Suporte                                              | A     | PASSOU        |
| HC14 | Banco: `message`, `atribuicao` e `mudanca_status` com o mesmo instante                 | banco | NÃO EXECUTADO |
| HC15 | M vê o comentário público de QA Admin Suporte no `#179`                                | M     | PASSOU        |
| HC16 | Diretoria envia pela Fila de QA Suporte com comentário                                 | D     | PASSOU        |
| HC17 | Forjar `sendTicket` sem `comment` e com `""`: erro no campo Destinatário               | A     | PASSOU        |
| HC18 | "Assumir" na Fila sem diálogo, sem `message` nova                                      | A     | PASSOU        |
| HC19 | "Editar" sem campo de handoff                                                          | M     | PASSOU        |
| HC20 | Editar só o título: campo nunca aparece, sem `message`                                 | M     | PASSOU        |
| HC21 | Trocar Destinatário: campo aparece vazio com a descrição                               | M     | PASSOU        |
| HC22 | Salvar vazio e só espaços: erro no campo, foco, sem request                            | M     | PASSOU        |
| HC23 | Voltar o Destinatário: campo some, "Nenhuma alteração", reaparece vazio                | M     | PASSOU        |
| HC24 | Troca para QA Admin Suporte com comentário                                             | M     | PASSOU        |
| HC25 | Banco: ordem de `id` e `changed_at` das linhas da edição                               | banco | NÃO EXECUTADO |
| HC26 | Edição devolvendo à fila com comentário                                                | M     | PASSOU        |
| HC27 | Edição com 5001 caracteres: erro no campo, nada gravado                                | M     | PASSOU        |
| HC28 | Forjar edição sem `handoffComment`: `HANDOFF_COMMENT_REQUIRED` no campo                | M     | PASSOU        |
| HC29 | Forjar `handoffComment: "  "`: `INVALID_INPUT` em toast                                | M     | PASSOU        |
| HC30 | Forjar comentário sem troca de destinatário: descartado                                | M     | PASSOU        |
| HC31 | Título e destinatário juntos: nota e uma só `message`                                  | M     | PASSOU        |
| HC32 | 390×844: três telas com campos e botões alcançáveis, sem rolagem horizontal            | A     | PASSOU        |
| HC33 | M edita o próprio comentário do envio: `(editado)`                                     | M     | PASSOU        |
| HC34 | Sem erro de runtime/hidratação, sem e-mail, comentário comum intacto                   | todos | NÃO EXECUTADO |

## Evidências por cenário (interface)

- **HC1** Descrição idêntica ao contrato; `Setor de destino` seguido de `Comentário`; textarea vazia com o placeholder do contrato.
- **HC2** Duas tentativas (vazio e `"   "`): `Escreva um comentário para quem vai receber o chamado.`, `aria-invalid="true"`, foco na textarea, zero requests de Server Action capturadas.
- **HC3** `O comentário precisa ter no máximo 5000 caracteres.`, zero requests.
- **HC4** Botão em `Enviando…`; toast `Chamado #177 enviado para a fila de QA Infra.`; aviso amarelo com `Aguardando aprovação de QA Infra`, `Solicitada por QA Membro Suporte em 12/10/2026 15:50` e `[QA] Precisa de acesso à VPN.` (sem espaços nas pontas); campo Solução do card Conclusão com o mesmo texto; Comentários 1, de QA Membro Suporte, 15:50, sem selo Privado. Screenshot: `.qa-output/hc4-ticket177.png`.
- **HC6** Como QA Admin Infra, `/tickets/177` mostra o aviso com o texto, o comentário público e os botões `Atender` e `Recusar`. Como Diretor (depois do aceite do HC9), o comentário público aparece; o aviso com o texto não foi reconferido para D, porque o chamado já estava aceito.
- **HC7** Três variações do corpo da action (sem `comment`, `"   "`, 5001 caracteres), resposta `{ ok: false, code: "INVALID_INPUT" }` com as mensagens esperadas, exibidas em toast; o diálogo continuou aberto e o `#178` continuou enviável a cada recarga (nada gravado).
- **HC8** `#178` enviado com 5000 caracteres; `scrollWidth == clientWidth` na página (1905), sem estouro. O `length = 5000` no banco não foi consultado.
- **HC9** Toast `Você começou a atender o chamado #177.`; nenhum diálogo; Comentários continuou em 1.
- **HC10** Recusa: `Escreva o motivo da recusa.` (vazio e espaços), `O motivo precisa ter no máximo 5000 caracteres.` (5001); recusa válida com toast `Chamado #178 recusado e devolvido para QA Suporte.`; no `#178`, como A, o comentário público `[QA] Recusa com motivo` de QA Admin Infra (15:53) e a linha `Transferência recusada`.
- **HC11, HC12** Descrição da Fila conforme contrato; ordem dos rótulos `Destinatário`, `Comentário`; primeiro envio vazio mostra os dois erros, cada um no seu campo; segundo (com destinatário) só o do comentário, com foco, zero requests.
- **HC13** Fila de Encaminhados passa a listar `#179`; `#179` mostra a `atribuicao` e a `mudanca_status` Aberto → Encaminhado às 15:54 e o comentário `[QA] Fica com você, M.` de QA Admin Suporte às 15:54. O toast `Chamado #179 enviado para QA Membro Suporte.` não foi capturado nessa execução (a captura foi feita depois do fechamento do diálogo); o toast equivalente foi capturado no HC16.
- **HC15** M vê os dois comentários públicos no `#179`.
- **HC16** Como Diretor, `/queue?setor=18&tab=forwarded`: toast `Chamado #179 enviado para QA Admin Suporte.`; comentário `[QA] Diretoria repassa.` de Henrique Coruqieri (15:55). A visão de A não foi aberta separadamente (M, do mesmo setor, vê o comentário).
- **HC17** Corpo original `{ticketId, assigneeId, expectedAssigneeId, comment}`; sem `comment` e com `""`: `INVALID_INPUT` com a mensagem esperada exibida sob o rótulo **Destinatário** (verificado pelo `closest` do alerta); diálogo continua aberto.
- **HC18** Sem diálogo; toast `Você assumiu o chamado #183.`; `/tickets/183` com Comentários 0 e status Em andamento.
- **HC19 a HC24** Campo só aparece com Destinatário diferente do inicial (dentro de Detalhes, abaixo do Destinatário, com `O texto vira um comentário público no chamado.`); título só: toast `Chamado #180 atualizado.`, Comentários 0; vazio e espaços: erro no campo, foco, editando, zero requests; voltar o destinatário: campo some, toast `Nenhuma alteração para salvar.`, reaparece vazio; troca válida: `#180` Encaminhado, Destinatário QA Admin Suporte, comentário de M às 15:52, linha `Edição / Alterou destinatário.`, `Atribuição` e `Mudança de status` Em andamento → Encaminhado.
- **HC26** `#181`: Destinatário `Fila de QA Suporte`; timeline `QA Membro Suporte devolveu o chamado à fila de QA Suporte.`; comentário `[QA] Devolvo à fila.`.
- **HC27** Erro de 5000 caracteres no campo, zero requests, ainda editando.
- **HC28** Resposta `{"ok":false,"code":"HANDOFF_COMMENT_REQUIRED","message":"Escreva um comentário para quem vai receber o chamado."}`; mensagem exibida no campo (visível), sem toast.
- **HC29** `INVALID_INPUT` com a mensagem esperada, exibida em toast.
- **HC30** Corpo forjado com `handoffComment` sem troca: toast `Chamado #182 atualizado.`; Comentários 0; linha `Alterou título.` somente.
- **HC31** `#184`: `Alterou título e destinatário.`; uma `message` (`[QA] Título e destinatário.`).
- **HC32** 390×844, sem rolagem horizontal (`scrollWidth == clientWidth`): Fila (`#181`), "Enviar para outro setor" (`#183`) e "Editar" com troca (`#183`) mostram o textarea dentro da largura (310 e 293 px) e o botão do rodapé alcançável com rolagem. Screenshots: `.qa-output/hc32-queue.png`, `.qa-output/hc32-dept.png`, `.qa-output/hc32-edit.png`. Nada foi enviado nessas telas.
- **HC33** Como M, no `#177`, `Editar` no comentário do envio → `[QA] VPN editado` com `(editado)`. O `request_reason` não foi consultado (só o banco confirma que continua `[QA] Precisa de acesso à VPN.`); o aviso que o exibiria já não existe depois do aceite.
- **Comentário comum (parte do HC34):** `Comentar` vazio no `#182` mostra `Escreva o comentário.`

## Falhas

Nenhuma.

## Erros fora dos cenários

Console do navegador (`browser_console_messages`, sessão inteira):

- `404` em `/tickets/new`: rota inexistente que o próprio teste abriu por engano no início.
- `net::ERR_FAILED` em `/tickets/178`: request da action que o teste abortou de propósito (para capturar o corpo do payload).
- `TypeError: Failed to execute 'measure' on 'Performance': 'TicketDetailPage' cannot have a negative time stamp`, em `flushComponentPerformance` do `react-server-dom-turbopack`, em `next dev`, após `page.goto`/`page.reload` sobre a página de detalhe. É erro das medições de desenvolvimento do React/Next, sem relação com os arquivos desta etapa; registrado por completo.

Nenhum aviso de hidratação apareceu no console.

## Não executados

- **HC5, HC14, HC25:** dependem de consulta ao banco (`message`, `ticket_transfer.request_reason`, `ticket_history.changed_at`, `to_department_id`), e o MCP `postgres` não estava disponível. A conferência equivalente pela interface (texto, autor, horário de minuto igual e ordem na linha do tempo) está nos cenários HC4, HC13, HC24 e HC26, mas não substitui a consulta.
- **HC34:** `get_errors` e `get_logs` do `next-devtools` indisponíveis (nem a linha `RESEND_API_KEY não configurada` seria esperada, pois a chave está preenchida); "nenhum e-mail" só foi inferido pelo código. O que a interface permitiu (Assumir, Atender e aceite sem comentário; comentário comum com `Escreva o comentário.`; console sem erro de hidratação) passou.

## Observações

1. **Pendência de banco para fechar a etapa:** rodar uma vez, com o MCP `postgres`, as consultas dos HC5, HC8 (`length = 5000` em `message.content` e `ticket_transfer.request_reason` do `#178`), HC14, HC25, HC26 (`to_department_id = S` na `atribuicao` do `#181`) e HC33 (`request_reason` do `#177` inalterado). Chamados: `#177` (HC4/HC5/HC33), `#178` (HC8), `#179` (HC13/HC14/HC16), `#180` (HC24/HC25), `#181` (HC26), `#182` (HC27 a HC30), `#184` (HC31).
2. Os chamados do contrato `#65` a `#68` não foram tocados.
3. Ao enviar um chamado que o autor deixa de ver, o fluxo de "Recusar" redireciona para `/tickets` (comportamento anterior, não afeta esta feature).
4. O seletor de Diretor para `/queue?setor=S` usa `setor=18` (QA Suporte) na URL; o contrato não traz o id, ambiguidade apenas de roteiro.
