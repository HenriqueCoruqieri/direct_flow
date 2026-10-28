# Relatório de testes — Destinatário no envio para outro setor

- **Data:** 2026-10-27
- **Contrato:** `docs/contracts/department-transfer.md` (seção "Revisão de 2026-10-27 — Destinatário no envio", cenários DS1–DS13)
- **Commit:** `2276ae7` · alterações não comitadas: sim
- **Ambiente:** `http://localhost:3000`, `next dev`, banco de desenvolvimento
- **Resultado:** 6 de 13 passaram · 0 falharam · 0 bloqueados · 7 não executados

## Pré-requisitos

- Dev server: `/login` devolve 200.
- MCPs `playwright`, `next-devtools` e `postgres` responderam.
- Usuários: `heoliveirac@gmail.com` (Diretoria, admin), `cazalbe@gmail.com` (Suporte, admin) e `rodalv@gmail.com` (Suporte, member) existem e estão ativos.
- **Login do Diretor (`heoliveirac@gmail.com`) falhou** com "E-mail ou senha inválidos." (duas tentativas, a segunda só repetindo o clique). A senha entregue não confere com a conta. Sem o Diretor não há como abrir chamado na Diretoria nem enviá-lo para Suporte, que é o desenho dos DS2–DS11. Só o Administrador (`cazalbe@gmail.com`) e o Membro foram acessíveis; só o Administrador foi usado.
- `RESEND_API_KEY`: o `grep -cE "^RESEND_API_KEY=.+" .env` devolveu 1, ou seja, **há chave preenchida** no `.env` (não li o valor). O contrato diz que o envio não dispara e-mail; não consegui confirmar nos logs (`get_logs` não coletado), então a ausência de e-mail ficou sem verificação direta.

## Adaptação do roteiro

Sem o Diretor, os testes foram feitos com o **Administrador de Suporte como remetente**: os chamados `[QA]` foram criados em Suporte e enviados para **Administrativo** (setor com Luiz Fernando e Lucas Carlos ativos), cujas contas não tenho. Isso cobre o lado do envio (diálogo, action, dados, histórico). O lado do **destino** (quem atende, recusa, vê Aprovações) exige login de alguém do setor de destino e não foi exercitado.

Dados criados (todos `[QA]`, em Suporte; ids):

| Id   | Título                 | Situação final                                                               |
| ---- | ---------------------- | ---------------------------------------------------------------------------- |
| #274 | `[QA] Dest pessoa`     | Em Administrativo, `aguardando_aprovacao`, destinatário Lucas Carlos (id 20) |
| #275 | `[QA] Dest fila`       | Em Administrativo, `aguardando_aprovacao`, Fila do setor (`to_user_id` nulo) |
| #276 | `[QA] Dest responsivo` | Em Suporte, `aberto` (só usado para o teste a 390×844; dialog cancelado)     |

#274 e #275 ficam pendentes no destino; quem tiver conta em Administrativo pode atendê-los ou recusá-los.

## Cenários

| #    | Cenário                                       | Papel                                 | Status                                                                                      |
| ---- | --------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------- |
| DS1  | Schema: `to_user_id`, FK, índice, legado nulo | banco                                 | PASSOU                                                                                      |
| DS2  | Campo "Destinatário" aparece só após o setor  | Administrador Suporte (no lugar do D) | PASSOU (adaptado)                                                                           |
| DS3  | Envio com destinatário: toast e aviso         | Administrador Suporte (no lugar do D) | PASSOU (adaptado: destino Administrativo, destinatário Lucas Carlos)                        |
| DS4  | Banco depois do envio com destinatário        | banco                                 | PASSOU (adaptado)                                                                           |
| DS5  | Aprovações e detalhe no destino               | A                                     | NÃO EXECUTADO: sem conta de destino e sem Diretor para criar o cenário                      |
| DS6  | Aceite/recusa forjados por colega             | A                                     | NÃO EXECUTADO: idem                                                                         |
| DS7  | Destinatário atende                           | M                                     | NÃO EXECUTADO: idem                                                                         |
| DS8  | Destinatário recusa; colega sem botões        | D, A                                  | NÃO EXECUTADO: idem                                                                         |
| DS9  | Fila do setor: visão do destino               | D, A, M                               | NÃO EXECUTADO (parcial: toast e banco da Fila conferidos, ver abaixo; visão do destino não) |
| DS10 | Requests forjadas de envio                    | Administrador Suporte (no lugar do D) | PASSOU (adaptado)                                                                           |
| DS11 | Fallback com destinatário desativado          | D, A                                  | NÃO EXECUTADO: exige Diretor e desativar conta real                                         |
| DS12 | Contador de Aprovações                        | A                                     | NÃO EXECUTADO: A não pertence ao setor de destino                                           |
| DS13 | Sem e-mail, sem erro de hidratação, 390×844   | qualquer                              | PASSOU nos itens verificados (erros e mobile); ausência de e-mail não confirmada em log     |

## Evidências

**DS1.** `information_schema`: `ticket_transfer.to_user_id`, `integer`, `YES` (anulável). `pg_constraint`: `ticket_transfer_to_user_id_users_id_fk` com `confdeltype = 'n'` (set null). `pg_indexes`: `transfer_to_user_idx` existe. `select count(*), count(to_user_id) from ticket_transfer`: 56 linhas, 0 com destinatário (antes dos testes).

**DS2.** No #275, o diálogo "Enviar chamado #275 para outro setor" não tinha o campo antes de escolher o setor (texto mostrava só "Setor de destino", "Comentário"); a descrição inclui "Se você escolher um destinatário, só essa pessoa pode atender ou recusar." Ao escolher Administrativo apareceu "Destinatário" com "Fila do setor" selecionado; opções: `Fila do setor, Lucas Carlos, Luiz Fernando` (alfabética). Escolhido Lucas Carlos e trocado o setor para Diretoria: o campo voltou a "Fila do setor" e a lista passou a `Fila do setor, Henrique Coruqieri, Luiz Secundário`. Setores listados: Diretoria, Administrativo, Implantação, P&D, QA Infra, QA Suporte (sem o atual, sem "Não alocado", sem inativos).

**DS3.** #274 → Administrativo, Lucas Carlos, comentário `[QA] para o Lucas`. Toast: `Chamado #274 enviado para Lucas Carlos, de Administrativo.` O remetente (admin de Suporte, que mantém acesso) ficou no detalhe, com o aviso "Aguardando aprovação de Administrativo / Para: Lucas Carlos / Solicitada por Carlos Alberto Jr em 27/10/2026 22:22". A linha do tempo mostra "encaminhou o chamado para Lucas Carlos, de Administrativo."

**DS4.**

```sql
select id,status,current_department_id,assigned_to from ticket where id in (274,275);
-- 274: aguardando_aprovacao, 15, null · 275: aguardando_aprovacao, 15, null
select ticket_id,id,status,to_user_id,from_department_id,to_department_id from ticket_transfer where ticket_id in (274,275);
-- 275 · 60 · pendente · null · 14 -> 15
-- 274 · 61 · pendente · 20   · 14 -> 15
select id,event,from_status,to_status,to_assignee_id from ticket_history where ticket_id=274 order by id desc limit 1;
-- 747 · transferencia_solicitada · aberto -> aguardando_aprovacao · to_assignee_id 20
```

Uma `transferencia_solicitada` por envio; `ticket.assigned_to` nulo; `ticket.status` bate com a última linha do histórico e os pares `from_*`/`to_*` (status aberto → aguardando_aprovacao, setor 14 → 15) descrevem a transição.

**DS9 (parcial).** #275 enviado com "Fila do setor": toast `Chamado #275 enviado para a fila de Administrativo.`; `to_user_id` nulo na transferência 60; `to_assignee_id` nulo na linha 746. Faltou conferir a visão de quem está no destino (Aprovações, botões).

**DS10.** Request do envio do #275 interceptada no navegador (Playwright `route`) e o corpo trocado:

- `assigneeId` = 6 (Henrique Coruqieri, da Diretoria, fora do destino Administrativo): o diálogo exibiu `Esta pessoa não está disponível no setor escolhido. Escolha outra pessoa ou a Fila do setor.` (código `INVALID_ASSIGNEE`).
- `assigneeId` = `"abc"`: toast `Selecione o destinatário.` (validação Zod, `INVALID_INPUT`).
- Banco logo depois: #274 e #275 ainda `aberto`, Suporte, `ticket_transfer` com 0 linhas para os dois, histórico só com as linhas de criação. Nada gravado.
- O id do remetente D (do roteiro) não foi usado porque D não entra; o equivalente (pessoa ativa de outro setor, não elegível no destino) foi usado.

**DS13.** `get_errors` do `next-devtools` devolveu `configErrors: []` e `sessionErrors: []` depois do envio e depois do teste mobile. A 390×844 (#276, Administrativo escolhido, campo "Destinatário" visível): `scrollWidth` 390 = `innerWidth` 390 (sem rolagem horizontal); diálogo em x=16, largura 358, y=109 a 734 de 844; botão "Enviar" em y≈646, alcançável. Screenshot `.qa-output/ds-mobile-dialog.png`.

## Falhas

Nenhuma nos cenários executados.

## Erros fora dos cenários

Um navegar acidental para `/tickets/276` antes de o chamado existir deu 404 esperado (erro de console do 404). `get_errors`: nenhum erro de runtime, build ou hidratação.

## Não executados

- **DS5, DS6, DS7, DS8, DS11, DS12 e a parte do destino de DS9:** o login do Diretor falha (credencial entregue não confere) e não há conta de alguém do setor de destino. Para rodá-los, é preciso uma senha válida do Diretor ou o roteiro original com A e M em Suporte como destino. Os chamados `[QA] Dest pessoa` e `[QA] Dest fila` do roteiro original não foram criados.
- **DS11** (fallback): exigiria desativar uma conta real (instrução: não desativar ninguém); mesmo com o Diretor, seguiria não executado, a menos que haja conta QA para isso.
- **DS13, e-mail:** `RESEND_API_KEY` parece estar preenchida; não verifiquei os logs do servidor para a linha de envio.

## Observações

- Ambiguidade para o `df-architect`: o contrato diz "D continua no detalhe" no DS3 (Diretor enviando para Suporte). No teste adaptado o remetente (admin de Suporte) também ficou no detalhe, mas o contrato do envio normal diz que quem envia perde o acesso (`actorKeepsAccess`); aqui o administrador do setor de origem manteve acesso. Convém confirmar que é o esperado para admin de setor.
- Ao fim do roteiro ("M ativo em Suporte"): ninguém foi desativado; M segue ativo.
- Janela do navegador deixada aberta, logada como Administrador de Suporte, a 390×844.
