# Relatório de testes — FormField genérico, Etapa 3a

- **Data:** 2026-11-10
- **Contrato:** `docs/contracts/form-field.md` (seção "Etapa 3a", cenários H1–H18)
- **Commit:** `de4da58` · alterações não comitadas: sim (a Etapa 3a inteira está no working tree)
- **Ambiente:** `http://localhost:3000`, `next dev`, banco de desenvolvimento
- **Resultado:** 17 de 18 passaram · 0 falharam · 0 bloqueados · 1 não executado (H8)

## Pré-requisitos

- Dev server respondeu 200; MCPs `playwright`, `next-devtools` e `postgres` disponíveis.
- O `.env` não foi lido (instrução do pedido). A chave `RESEND_API_KEY` não foi conferida; nenhum cenário depende de e-mail.
- Contas: Diretor `diretorqa@gmail.com` (admin, Diretoria), Administrador `cazalbe@gmail.com` (Carlos, Suporte), Membro `rodalv@gmail.com` (Álvaro, Suporte). Uma tentativa de login por conta; a sessão do Administrador já estava aberta no navegador. O Diretor rodou numa aba de contexto isolado (necessário para H6, que exige dois papéis ao mesmo tempo). Senhas não foram gravadas em lugar nenhum.

## Cenários

| #   | Cenário                                                                         | Papel | Status                        |
| --- | ------------------------------------------------------------------------------- | ----- | ----------------------------- |
| H1  | Novo chamado: `*`, sem aviso de prioridade, dica da tag                         | M     | PASSOU                        |
| H2  | `*` some ao ficar válido (Título 3, Descrição 10, Tipo, Empresa só ao escolher) | M     | PASSOU                        |
| H3  | Prioridade: com/sem trava, `aria-required`, toast, volta                        | M     | PASSOU                        |
| H4  | Abrir chamado vazio: erros, foco na Empresa, nada criado                        | M     | PASSOU                        |
| H5  | Criar chamado: toast `Chamado #N criado.`, reabrir vazio com `*`                | M     | PASSOU                        |
| H6  | T10: empresa desativada durante o preenchimento                                 | D + M | PASSOU                        |
| H7  | T15: `zzz-nao-existe`, mensagem e foco mantidos                                 | M     | PASSOU                        |
| H8  | INVALID_TAG / INVALID_ASSIGNEE                                                  | D + M | NÃO EXECUTADO                 |
| H9  | Bloqueio durante upload de anexo                                                | M     | PASSOU                        |
| H10 | Enviar: `*`, dica `Destinatário atual`, vazio com foco                          | A     | PASSOU                        |
| H11 | Enviar duas vezes seguidas (L8/L9)                                              | A     | PASSOU                        |
| H12 | Enviar para setor                                                               | A     | PASSOU                        |
| H13 | Recusar transferência                                                           | D     | PASSOU                        |
| H14 | Resolver: vazio, 9, 10 caracteres                                               | M     | PASSOU                        |
| H15 | Comentar (público e privado), "Comentário privado" sem `*`                      | M     | PASSOU                        |
| H16 | Editar comentário                                                               | M     | PASSOU (Esc: ver Observações) |
| H17 | Edição do chamado igual a antes                                                 | M     | PASSOU                        |
| H18 | Inspeção a11y (`aria-*`, `for`/`id`, `*` com `aria-hidden`, console)            | todos | PASSOU                        |

## Evidência por cenário

**H1.** Dialog "Novo chamado" aberto: `*` em Empresa, Título, Descrição, Tipo, Prioridade e Tags; nenhum em Anexos, Criador (nota: o rótulo do campo é "Criador", não "Aberto por") e Destinatário. Texto "Defina uma prioridade" ausente. Dica da tag visível e ligada por `aria-describedby`. `aria-required="true"` nos seis obrigatórios, ausente em Destinatário. Foco inicial na Empresa. Rótulos ligados por `for`/`id` (`input.labels` devolve o rótulo certo em todos).

**H2.** Empresa digitada (`alfa`) sem escolher: `*` fica; ao escolher `QA Alfa`, some. Título `ab`: `*` fica; `abc`: some. Descrição com 9: `*` fica; com 10: some. Tipo some ao escolher.

**H3.** Tag `#Loja_Parada` (sem prioridade): `*` e `aria-required="true"` em Prioridade. Tag `#Dúvida_Sistema` (fixa `baixa`): valor `Baixa`, sem `*`, sem `aria-required`, `aria-disabled="true"`, descrição `A prioridade está fixada na tag #Dúvida_Sistema.`. O toast com essa mesma frase aparece ao clicar no seletor travado (o Playwright só alcança com `force`). Voltar para `#Loja_Parada` limpa a prioridade (`Nenhuma`) e o `*` volta. Sem aviso "Defina uma prioridade" em nenhum estado. Screenshot: `.qa-output/h3-trava.png`.

**H4.** Salvar vazio: mensagens `Selecione a empresa.`, `Informe o título.`, `Descreva o chamado.`, `Selecione o tipo do chamado.`, `Selecione a prioridade do chamado.`, `Selecione a tag.`; foco no campo Empresa; `aria-invalid="true"` e `aria-describedby="…-error"` nos seis; Destinatário e Anexos sem erro. Nada criado. Screenshot: `.qa-output/h4-vazio.png`.

**H5.** Chamado `[QA] FormField abertura anexo` (#293, com anexo) criado; chamado #294 criado com o toast `Chamado #294 criado.` capturado por MutationObserver. Ao reabrir o diálogo: campos vazios e os seis `*` de volta.

**H6 (T10).** Diretor reativou `[QA] Rolagem 1` (id 12). Membro escolheu a empresa e preencheu tudo (nenhum `*`). Diretor desativou a empresa. Membro clicou em "Abrir chamado": `Esta empresa não está disponível. Escolha uma empresa ativa.` no campo Empresa, campo vazio, `*` de volta, `aria-invalid="true"`, `aria-describedby="…-error"`, foco no campo (`document.activeElement` é o input). Título, Descrição, Tipo e Tags mantidos. Reenviar sem escolher: `Selecione a empresa.` e foco mantido. Nada criado (SELECT em `ticket` confirma). Estado final: empresa id 12 `is_active = false` (como estava).

**H7 (T15).** `zzz-nao-existe` mostrou `Nenhuma empresa encontrada.`, foco e texto mantidos no input.

**H9.** Com o upload de 8,6 MB em andamento (`Enviando…`), o botão "Abrir chamado" fica com `aria-disabled="true"` e `aria-describedby` apontando para `Aguarde o envio dos anexos terminar.`. Clique forçado: toast `Aguarde o envio dos anexos terminar.`, diálogo aberto, nada criado. Sem forçar, o Playwright espera o botão habilitar e o envio acontece com o upload pronto (#294). "Cancelar" fecha e descarta.

**H10.** Dialog Enviar do #286: `*` em Destinatário e Comentário, dica `Destinatário atual: Carlos Alberto Jr.`. Salvar vazio: `Selecione o destinatário.` e `Escreva um comentário para quem vai receber o chamado.`, foco no destinatário.

**H11.** #286: enviado para Álvaro (toast `Chamado #286 enviado para Álvaro Rodrigo.`), sem recarregar abriu "Enviar" de novo: lista com Carlos e Marcelo (Álvaro fora), enviado para Marcelo, e um terceiro diálogo mostra `Destinatário atual: Marcelo Oliveira.` com `*` em Destinatário e Comentário. Banco: `ticket.status = encaminhado`, `assigned_to = 11`; `ticket_history` #823 (`mudanca_status`, `em_andamento → encaminhado`) e #824 (`atribuicao`, `from_assignee_id 18 → to_assignee_id 11`).

**H12.** Enviar para setor do #288: `*` em Setor de destino e Comentário; Destinatário só aparece depois do setor, sem `*`, com `Fila do setor`; trocar de setor (Administrativo com Lucas Carlos → QA Infra) volta o destinatário para `Fila do setor`. Salvar vazio: `Selecione o setor de destino.` e `Escreva um comentário…`, foco no setor. Enviado para QA Infra (toast `Chamado #288 enviado para a fila de QA Infra.`). Banco: #288 `aguardando_aprovacao`, setor atual 19; `ticket_transfer` 62 `pendente`, 14 → 19; último histórico `transferencia_solicitada`, `em_andamento → aguardando_aprovacao`. O mesmo diálogo foi usado pelo Membro no #289 (para Diretoria), sem erro.

**H13.** O Diretor não é do setor QA Infra e não vê "Recusar" no #288. Para exercitar o cenário, o Membro (assignee) enviou o #289 para Diretoria e o Diretor recusou. Dialog: `*` em Motivo da recusa; salvar vazio → `Escreva o motivo da recusa.`, `aria-invalid`, foco; com `[QA] recusa FormField` o `*` some; toast `Chamado #289 recusado e devolvido para Suporte.`. Banco: #289 `recusado`, setor 14; `ticket_transfer` 63 `rejeitado`, `review_note = [QA] recusa FormField`, 14 → 11; último histórico `transferencia_rejeitada`, `aguardando_aprovacao → recusado`.

**H14.** Solução: `*` com vazio (erro `Descreva a solução.`, foco), com 9 caracteres (erro `A solução precisa ter no mínimo 10 caracteres.`, `*` fica), some com 10. O botão "Resolver" (fora do `<form>`) envia: toast `Chamado #292 resolvido.`; banco: #292 `resolvido`, `solution = [QA] solução FormField 3a`, histórico `resolucao`, `em_andamento → resolvido`.

**H15.** `*` com a caixa vazia; some ao digitar; depois de publicar (público e privado, toasts `Comentário publicado.`) a caixa fica vazia com `*` de volta e altura de 80 px preservada. Comentar vazio: `Escreva o comentário.`, `aria-invalid`, foco na caixa. Checkbox "Comentário privado": sem `*`, sem `aria-required`, rótulo ligado.

**H16.** Editor abre com o texto atual, foco na caixa, sem `*` visível. Apagar tudo mostra o `*` só dentro do rótulo `sr-only` (largura 86×1 px, o `*` não aparece sozinho), `aria-required="true"`. Salvar vazio: `Escreva o comentário.`, `aria-invalid="true"`, `aria-describedby="…-error"`, foco na caixa. Texto válido: toast `Comentário atualizado.`, editor fecha e o foco volta ao botão "Editar comentário…". "Cancelar" também fecha e devolve o foco ao lápis. Ver Observações sobre o Esc.

**H17.** Edição do #292 (como Membro, depois de "Assumir"): Título, Descrição, Empresa, Tipo, Tag e Destinatário sem `*` e sem `aria-required`; descrição curta → `A descrição precisa ter no mínimo 10 caracteres.` com `aria-invalid`, `aria-describedby` e foco; troca de Tipo para Ocorrência e Tag para `#internet_rede_vpn` salva com `Chamado #292 atualizado.`. Os dois `*` presentes na tela (Solução, Comentário) são dos formulários próprios da página, fora da edição. Screenshot: `.qa-output/h17-edicao.png`.

**H18.** Conferido nos diálogos Novo chamado, Enviar, Enviar para setor, Recusar e nos formulários Resolver, Comentar, Editar comentário: `aria-required` só nos obrigatórios (ausente no checkbox, na prioridade travada, em Destinatário opcional e em Anexos), `aria-describedby` aponta para o erro após salvar e para a dica antes (tag, destinatário atual), `*` com `aria-hidden="true"` e `text-destructive`. Console do navegador: 0 erros e 0 avisos (só INFO do React DevTools e HMR). `get_errors` do `next-devtools` devolveu `configErrors: []` e `sessionErrors: []` após cada bloco de cenários e no fim.

## Falhas

Nenhuma.

## Erros fora dos cenários

Nenhum.

## Não executados

- **H8 (`INVALID_TAG` e `INVALID_ASSIGNEE`)**: exige que o Diretor desative a tag e a pessoa escolhidas pelo Membro. O pedido proíbe tocar em contas e a lista de escrita permitida não inclui tags. Camada a conferir quando houver autorização (tag `[QA]` e pessoa `[QA]` próprias): `ref` do `Combobox` de tags e do `TicketAssigneeCombobox`. Os caminhos análogos que passam pelo `setError(..., { shouldFocus: true })` foram exercitados e funcionam: `INVALID_COMPANY` (H6, foco no input da empresa) e a validação de cliente com foco nos botões `Combobox` (tag, setor, destinatário em H4/H10/H12). `INVALID_TARGET` e `INVALID_ASSIGNEE` do Enviar também não foram reproduzidos (exigem dado forjado ou desativação de pessoa/setor).

## Observações

1. **Esc no editor de comentário.** O H16 pede "Esc/Cancelar". Esc não fecha o editor (a caixa continua aberta); Cancelar fecha. Não há tratamento de `Escape` no editor (grep em `tickets/[id]/_components`) nem na especificação de `queue-default-and-comment-edit.md`. Parece comportamento anterior à 3a, não regressão. Ambiguidade para o `df-architect`: manter Esc como parte do H16 ou remover do cenário.
2. **Rótulo "Criador".** O contrato (H1) chama o campo de "Aberto por"; a tela mostra "Criador". Só o contrato está defasado.
3. **Dica da tag some com o erro.** Depois de "Abrir chamado" vazio a dica da tag é substituída por `Selecione a tag.` (comportamento previsto do `FormField`: erro no lugar da descrição).
4. **Primeira abertura do editor de comentário.** Em uma única leitura logo após o clique, o textarea apareceu com valor vazio; em todas as reaberturas (cinco no total) abriu com o texto atual. Não reproduzido; provável artefato da primeira consulta do teste (ela rodou antes de o editor hidratar o valor), registrado só por transparência.
5. **Limite de criação e como foi usado.** Três chamados `[QA] FormField` criados: #292 (aberto sem anexo e usado em comentar/editar/resolver), #293 (com anexo), #294 (título `[QA] FormField T10`, antes da recusa da empresa; foi criado em seguida, com anexo, no teste do upload). Isso explica o título #294; o T10 em si não criou nada.

## Dados alterados

Todos em chamados ou empresa `[QA]`:

- Chamados novos: #292 (resolvido), #293 e #294 (abertos, com anexo `qa-big.log` de 8,6 MB cada, setor Suporte, empresa QA Alfa).
- #286: encaminhado a Marcelo Oliveira (2 envios, comentários `[QA] envio 1/2`).
- #288: enviado para a fila de QA Infra, `aguardando_aprovacao`, transferência 62 pendente.
- #289: enviado para Diretoria e recusado (volta como `recusado`, setor Suporte, destinatário Álvaro).
- #292: 2 comentários (um privado), 1 editado (`[QA] comentário FormField editado`), Tipo → Ocorrência, Tag → `#internet_rede_vpn`, assumido pelo Membro e resolvido.
- Empresa `[QA] Rolagem 1` (id 12): reativada e desativada de novo; **termina desativada**.
- Arquivos temporários de teste (`qa-big.log`) só no scratchpad, fora do repositório; screenshots em `.qa-output/` (`h3-trava.png`, `h4-vazio.png`, `h9-upload.png`, `h17-edicao.png`).
- A janela do navegador continua aberta, com o Membro logado na aba principal e o Diretor numa aba de contexto isolado.
