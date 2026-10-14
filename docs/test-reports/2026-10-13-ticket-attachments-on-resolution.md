# Relatório de testes — Anexos de chamado: Conclusão (Etapa 2)

- **Data:** 2026-10-13
- **Contrato:** `docs/contracts/ticket-attachments-on-resolution.md` (regressão: `docs/contracts/ticket-attachments-create-and-download.md`; ADR 018)
- **Commit:** `c52436c` · alterações não comitadas: sim (Etapa 2 inteira está no working tree)
- **Ambiente:** `http://localhost:3000`, `next dev`, banco de desenvolvimento, R2 real (bucket privado)
- **Resultado:** 20 de 20 passaram · 0 falharam · 0 bloqueados · 0 não executados

## Pré-requisitos

- Dev server: `/login` respondeu 200.
- MCP: `next-devtools`, `playwright` e `postgres` (`SELECT` nas tabelas de domínio) responderam.
- Usuários QA (13 `qa.admin.suporte`, 14 `qa.member.suporte`, 15 `qa.admin.infra`) existem e estão ativos; diretor com `SEED_ADMIN_EMAIL`.
- `RESEND_API_KEY` está preenchida no `.env`. Nenhum cenário da bateria dispara e-mail (só `profile.ts` e o reset de senha enviam), então nada foi marcado como não executado por isso. Nenhuma linha `RESEND_API_KEY não configurada` nem envio apareceu em `get_logs`.

## Dados criados

| Chamado | Título                                 | Uso                                            |
| ------- | -------------------------------------- | ---------------------------------------------- |
| #211    | `[QA] Anexos resolução autor` (P1)     | AR1, AR3 a AR5, AR16                           |
| #212    | `[QA] Anexos resolução admin` (P2)     | AR2, AR6                                       |
| #213    | `[QA] Anexos resolução envio` (P3)     | AR7 (hoje em QA Infra, `aguardando_aprovacao`) |
| #214    | `[QA] Anexos resolução validação` (P4) | AR8 a AR10                                     |
| #215    | `[QA] Anexos resolução recusas` (P5)   | AR11, AR12, AR13a, AR18, AR19 (segue `aberto`) |
| #216    | `[QA] Anexos resolução sem anexo`      | AR17                                           |
| #217    | `[QA] Anexos resolução regressão`      | AR14                                           |
| #218    | `[QA] Anexos resolução tag`            | AR15 (AT19)                                    |
| #219    | `[QA] Anexos resolução do admin` (P6)  | AR13b, AR16                                    |

Também criada a tag `[QA] Anexos resolução temporária` (QA Suporte), hoje inativa (AT19). Nada de #65 a #68 foi tocado.

## Cenários

| #    | Cenário                                                           | Papel | Status |
| ---- | ----------------------------------------------------------------- | ----- | ------ |
| AR1  | Conclusão do autor sem destinatário: uploader ativo, sem aviso    | M     | PASSOU |
| AR2  | Conclusão do admin: uploader, aviso, "Enviar para outro setor"    | A     | PASSOU |
| AR3  | Resolver com 2 anexos (PDF 9 MB e CSV)                            | M     | PASSOU |
| AR4  | Linhas em `attachment` e `ticket_history` após o AR3              | banco | PASSOU |
| AR5  | Download dos anexos da Conclusão (M e diretor)                    | M, D  | PASSOU |
| AR6  | Anexar 2, remover 1, resolver                                     | A     | PASSOU |
| AR7  | Enviar para outro setor com anexo na lista                        | A     | PASSOU |
| AR8  | "Resolver" bloqueado durante envio; "Enviar para outro setor" não | A     | PASSOU |
| AR9  | Anexo com falha de envio bloqueia "Resolver"                      | A     | PASSOU |
| AR10 | Validação da solução sem reenviar o anexo                         | A     | PASSOU |
| AR11 | Recusas de tipo, tamanho e limite de 5                            | A     | PASSOU |
| AR12 | Troca de conteúdo no PUT recusada na action                       | A     | PASSOU |
| AR13 | Action forjada (chave de outro usuário; chamado não resolvível)   | A, M  | PASSOU |
| AR14 | Regressão: criar chamado com `print.png` e `logs.zip`             | M     | PASSOU |
| AR15 | Regressão: AT10 e AT19                                            | M, A  | PASSOU |
| AR16 | Estados somente leitura (P6 e P1 resolvido)                       | M     | PASSOU |
| AR17 | Resolver sem anexo                                                | M     | PASSOU |
| AR18 | 390×844                                                           | A     | PASSOU |
| AR19 | Alinhamento Conclusão × Comentários com 3 anexos                  | A     | PASSOU |
| AR20 | Erros, hidratação, CORS, e-mail                                   | todos | PASSOU |

## Evidências por cenário

- **AR1 (#211, M):** formulário = `Solução`, `Anexos`, dica `Até 5 arquivos de até 10 MB cada.`, `Anexar` sem `aria-disabled`, `Nenhum anexo.`, botões `Anexar` e `Resolver` (sem outro "Anexar" esmaecido). `input[type=file]` com `multiple` e `accept=.png,.jpg,.jpeg,.webp,.pdf,.txt,.csv,.log,.docx,.xlsx,.pptx,.zip,.rar`. Aviso `Os anexos são salvos só ao resolver…` ausente (contagem 0). Card `Anexos` da direita com `print.png`. Screenshot: `.qa-output/ar1-membro.png`.
- **AR2 (#212, A):** mesmo conteúdo, mais o aviso abaixo da dica e `Enviar para outro setor` · `Resolver`. Posições no cabeçalho do uploader (px, viewport 1440×900): dica 739–755, aviso 757–773, botão `Anexar` 729–761, ou seja, o botão fica centralizado verticalmente nas duas linhas de texto; visualmente aceitável (screenshot `.qa-output/ar2-admin.png`): `Anexar` à direita, dica e aviso à esquerda, sem sobreposição nem quebra estranha.
- **AR3 (#211):** 2 `PUT` ao host `*.r2.cloudflarestorage.com` com 200; itens `9 MB` e `8 B` em `Enviado`; toast `Chamado #211 resolvido.`; card Anexos da direita com 3 itens na ordem `print.png` (20:03), `relatório ação.pdf` (20:04), `dados.csv` (20:04), os novos com `QA Membro Suporte`. Screenshots `.qa-output/ar3-antes.png`, `ar3-depois.png`.
- **AR4:** consulta

  ```sql
  select a.id, a.message_id, u.name, a.file_name, a.mime_type, a.size_bytes, left(a.storage_key,8), a.created_at
  from attachment a join users u on u.id=a.uploaded_by where a.ticket_id=211 order by a.id;
  ```

  Linhas novas: id 16 `relatório ação.pdf`, `application/pdf`, 9437199 B; id 17 `dados.csv`, `text/csv`, 8 B; ambas `message_id` nulo, `uploaded_by` = QA Membro Suporte, `storage_key` `tickets/<uuid>.pdf|.csv`, `created_at` = `2026-10-13 23:04:42.982+00` = `ticket.resolved_at` = `changed_at` da linha `resolucao` (id 520). `ticket_history` do #211: `criacao` (513), `atribuicao` (519), `resolucao` (520, `aberto` → `resolvido`); nenhuma linha de anexo. `ticket.status` = `resolvido`.

- **AR5:** M baixou os dois: `relatório ação.pdf` (9437199 B) e `dados.csv` (8 B), nomes originais. `GET /api/attachments/16` sem seguir redirect: 307 com `Location` no host do R2. Diretor abriu #211 (3 itens), baixou `relatório ação.pdf` (9437199 B) e `GET /api/attachments/17` devolveu 307.
- **AR6 (#212):** após remover `backup.rar` pelo X (`Remover backup.rar`), a lista ficou só com `print.png`; toast `Chamado #212 resolvido.`; 1 linha em `attachment` (id 21, `print.png`, `uploaded_by` = QA Admin Suporte, `created_at` = `resolved_at` = `23:08:53.484`).
- **AR7 (#213):** com `print.png` `Enviado`, o botão abriu o diálogo normalmente; envio para QA Infra com o comentário; toast `Chamado #213 enviado para a fila de QA Infra.`. Banco: `attachment` do #213 = 0; `ticket.status` = `aguardando_aprovacao`; `ticket_history`: `criacao` e `transferencia_solicitada` (`aberto` → `aguardando_aprovacao`, setor 18 → 19); `ticket_transfer` id 39 `pendente`, 18 → 19, `request_reason` = comentário. O diretor abriu o #213: Setor atual `QA Infra`, card `Anexos` com `Nenhum anexo.`, sem uploader. Ver Observações (A recebe 404 ao reabrir).
- **AR8 (#214):** PUT atrasado 10 s; durante `Enviando…`, `Resolver` (`force`) com solução vazia: `aria-disabled="true"`, toast `Aguarde o envio dos anexos terminar.`, nenhum request de Server Action, sem mensagem de validação na Solução. `Enviar para outro setor` abriu o diálogo e `Cancelar` fechou; o item seguiu em `Enviando…`.
- **AR9 (#214 recarregado):** PUT abortado, `dados.csv` em `Falha no envio` (`Falha no envio. Remova o arquivo e tente de novo.`); `Resolver` (`force`) mostrou o toast `Remova os anexos com falha antes de continuar.` sem nenhum request de action.
- **AR10 (#214 recarregado):** `Descreva a solução.`, depois `A solução precisa ter no mínimo 10 caracteres.`, 0 requests de action e item ainda `Enviado` nas duas; no 3º clique, 1 action, toast `Chamado #214 resolvido.`, 0 requests ao R2 pelo navegador desde o fim do envio (sem novo PUT); 1 linha em `attachment` (id 22, `print.png`, `created_at` = `resolved_at` = `23:10:09.761`).
- **AR11 (#215):** `setup.pdf: O conteúdo do arquivo não corresponde à extensão.`; `grande.pdf: O arquivo precisa ter no máximo 10 MB.`; depois de 5 PNGs `Enviado`, o 6º gerou `Anexe no máximo 5 arquivos.`; lista com 5 itens (`a1` a `a5`); 0 `PUT` e 0 actions para os recusados. A 6ª recusa foi testada com 5 na lista (1 arquivo); o lote de 6 simultâneos não foi repetido (já coberto no AT11).
- **AR12 (#215 recarregado):** PDF de 1 KB trocado no PUT por bytes `4D 5A…` do mesmo tamanho; item `Enviado`; toast `Não foi possível anexar "troca.pdf". Remova o arquivo e anexe de novo.`; solução e item mantidos. Banco: `ticket.status` = `aberto`, `resolved_at` nulo, `ticket_history` do #215 = 1 linha (`criacao`), `attachment` do #215 = 0, `max(attachment.id)` = 22 (inalterado).
- **AR13:** Server Action `resolveTicket` (id `405394c1…`) chamada por `fetch` com o `Next-Action` capturado.
  - (a) A, #215, `attachments` com chave `pending/14/…` de M: resposta `{"ok":false,"code":"INVALID_ATTACHMENT","message":"Não foi possível anexar \"chave-m.png\". Remova o arquivo e anexe de novo."}`.
  - (b) M, #219, com chave própria `pending/14/…` válida: `{"ok":false,"code":"FORBIDDEN","message":"Você não pode resolver este chamado."}`.
  - Nos dois: `max(ticket_history.id)` = 527 e `max(attachment.id)` = 21 antes e depois; #215 `aberto`, #219 `em_andamento`.
- **AR14 (#217):** 2 PUT 200; chamado criado (toast não capturado dentro de 3,5 s; ver Observações) com 2 linhas: `print.png` (`image/png`, 68 B) e `logs.zip` (`application/zip`, 9437188 B), `message_id` nulo, `created_at` = `ticket.created_at` (`23:06:00.015`), `storage_key` `tickets/…`; card com os 2; os 2 baixaram com nome e tamanho corretos.
- **AR15:** AT10 (`[QA] Anexos resolução troca de conteúdo`): item `Enviado`, toast `Não foi possível anexar "troca.pdf". Remova o arquivo e anexe de novo.`, diálogo aberto, 0 chamados com o título, `max(attachment.id)` sem mudança (19). AT19 (`[QA] Anexos resolução tag`): 1º envio com a tag desativada pelo A: texto `Esta tag não está disponível. Escolha uma tag ativa do seu setor.`, campo Tags de volta a `Selecione a tag`, diálogo aberto, anexo ainda `Enviado`; 2º envio com outra tag: toast `Chamado #218 criado.`, 1 anexo em `attachment`.
- **AR16:** #219 (M não resolve): `Nenhuma solução registrada.`, sem `Anexar`, sem `input[type=file]`, sem `Resolver`, card `Anexos` presente. #211 resolvido: 0 `Anexar`, 0 `input[type=file]`, 0 `Resolver`; card `Anexos` presente.
- **AR17 (#216):** resolvido sem anexo; toast `Chamado #216 resolvido.`; 0 requests ao R2 no navegador; 0 linhas em `attachment`; `ticket_history`: `criacao`, `atribuicao`, `resolucao` (`aberto` → `resolvido`).
- **AR18 (#215, 390×844):** `documentElement.scrollWidth` = `clientWidth` = 375 (barra de rolagem vertical ocupa 15 px); o PNG de 116 `a` + `.png` quebra em 4 linhas dentro do item; X de cada item em x=300–328, dentro do card; aviso em 3 linhas legíveis ao lado do botão `Anexar`; `Enviar para outro setor` (54–247) e `Resolver` (255–334) cabem lado a lado na mesma linha sem estourar. Ordem no detalhe: Conclusão antes de Detalhes. Screenshots `.qa-output/ar18-mobile.png`, `ar18-view.png`.
- **AR19 (#215, 1440×900, 3 anexos `Enviado`):** borda de baixo da seção Conclusão = 1213.25 px e a de Comentários = 1213.25 px (diferença 0). Screenshot `.qa-output/ar19.png`.
- **AR20:** `get_errors` do `next-devtools`: `configErrors` e `sessionErrors` vazios em todas as chamadas (antes, no meio e no fim). `get_logs`: nenhuma linha `[resolveTicket]`, `[createTicket]` nem `RESEND_API_KEY`. Console do Playwright da janela principal: 0 erros e 0 avisos. Nenhum erro de CORS fora dos cenários com interceptação. Há uma linha de hidratação no log do servidor, explicada em "Erros fora dos cenários".

## Falhas

Nenhuma.

## Erros fora dos cenários

Uma entrada de hidratação em `.next/dev/logs/next-development.log` (uptime 01:04:08, `TicketDetailPage`, `<Input>` da busca de chamados do topo, cmdk). A única diferença apontada é `style={{caret-color:"transparent"}}` presente no input quando a hidratação rodou. Nenhum arquivo em `app/` define `caret-color` (Grep vazio); esse estilo é o que o `page.screenshot()` do Playwright injeta para esconder o cursor, e tirei capturas logo depois de `goto` na segunda janela (A, #212/#213), antes da hidratação terminar. Conclusão: artefato do teste, não defeito do app; `get_errors` do `next-devtools` seguiu vazio e 10 recargas seguidas de páginas de chamado depois disso não repetiram o aviso. Não conto como falha, mas registro por transparência.

## Não executados

Nenhum.

## Observações

1. **Ambiguidade, AR7 (para o `df-architect`):** o contrato diz que, depois do envio, o "card Conclusão passa a `awaiting_transfer`; card `Anexos` com `Nenhum anexo.`". Na prática o admin que enviou (A, de QA Suporte) é redirecionado para a lista e, ao reabrir `/tickets/213`, recebe 404 (o chamado saiu do setor dele e ele não é autor nem destinatário). O estado `awaiting_transfer` e `Nenhum anexo.` só são observáveis por quem ainda enxerga o chamado (conferi com o diretor). O contrato já admite "a pessoa sai do chamado"; vale deixar o cenário explícito sobre qual papel confere o card.
2. **AR14, toast de criação:** na regressão com 9 MB (`logs.zip`) o toast `Chamado #217 criado.` não estava mais na tela 3,5 s depois do clique (o chamado foi criado, o diálogo fechou). Nos demais envios (AR15, AT19) o toast apareceu em menos de 2 s. Provavelmente tempo de cópia do R2 somado à duração do toast; sem divergência de comportamento, só registrado.
3. **Duas janelas:** o AT19 e o AR13 exigem dois papéis ao mesmo tempo (A desativa a tag enquanto M está com o diálogo aberto; a chave `pending/<id de M>/` precisa existir quando A forja). Usei um segundo contexto do mesmo navegador do MCP `playwright` (janela visível), com A e depois o diretor; M ficou na janela principal. As chaves de M usadas em AR13 foram capturadas da resposta de `requestAttachmentUpload`, sem registrar URLs assinadas.
4. **Aviso de AR2/AR18:** o botão `Anexar` fica centralizado verticalmente no cabeçalho de duas linhas (e de três linhas em 390 px) e não colide com o texto; aceitável a meu ver.
5. **Resíduos:** a tag `[QA] Anexos resolução temporária` ficou inativa (efeito do AT19). #213 está em QA Infra aguardando aprovação.
