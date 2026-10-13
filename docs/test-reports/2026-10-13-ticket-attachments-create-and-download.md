# Relatório de testes — Anexos de chamado: criação e download (Etapa 1)

- **Data:** 2026-10-13
- **Contrato:** `docs/contracts/ticket-attachments-create-and-download.md`
- **Commit:** `d1a4d43` · alterações não comitadas: sim
- **Ambiente:** `http://localhost:3000`, `next dev`, banco de desenvolvimento
- **Resultado consolidado (após o Reteste 2):** 22 de 22 passaram · 0 falharam · 0 bloqueados · 0 não executados
- **Resultado da rodada 1:** 3 de 22 passaram · 0 falharam · 0 bloqueados · 19 não executados (pré-requisito de configuração)

## Pré-requisitos

| Item                                    | Situação                                                                                                                                                                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dev server                              | OK (`/login` 200)                                                                                                                                                                                                         |
| MCP playwright, next-devtools, postgres | OK (`SELECT 1` e consulta a `users` responderam)                                                                                                                                                                          |
| Usuários de teste                       | OK: M, A, I e D existem e estão ativos, sem troca de senha pendente                                                                                                                                                       |
| E-mail desligado                        | **Não**: `RESEND_API_KEY` está preenchida. Cenários que disparam e-mail seriam NÃO EXECUTADO; `createTicket` não envia e-mail (nenhuma referência em `app/_lib/actions/tickets.ts`), então não afetou os cenários rodados |
| Configuração do R2 (ADR 018)            | **QUEBRADA**: `R2_ATTACHMENTS_BUCKET` no `.env` contém uma URL pública `r2.dev` (URL `pub-c7cd…`) em vez do nome do bucket. Ver "Pré-requisito pendente"                                                                  |

### Pré-requisito pendente — valor de `R2_ATTACHMENTS_BUCKET`

- **Passos:** logado como M, abrir "Novo chamado" e anexar `print.png`, `relatório ação.pdf` e `logs.zip`.
- **Obtido:** os 3 itens foram para `Falha no envio` com a mensagem `Não foi possível preparar o envio agora. Tente novamente.` (`ATTACHMENT_UPLOAD_UNEXPECTED_MESSAGE`). Nenhum `PUT` ao R2 saiu; o navegador não mostrou erro de CORS (console sem erros).
- **Evidência (log do dev server, `.next/dev/logs/next-development.log`):**
  `[requestAttachmentUpload] InvalidBucketName: Bucket name shouldn't contain '/', received 'https://pub-c7cd…r2.dev'` (3 ocorrências, uma por arquivo).
  Conferência da variável: `grep -E "^(R2_ATTACHMENTS_BUCKET|R2_AVATARS_BUCKET)=" .env` mostra `R2_AVATARS_BUCKET=direct-flow-avatars` (nome) e `R2_ATTACHMENTS_BUCKET` com uma URL `pub-c7cd…r2.dev`. A URL `r2.dev` de bucket de anexos também contradiz o ADR 018 (acesso público desligado). Screenshot: `.qa-output/at2-first-upload.png`.
- **Camada provável:** configuração (`.env`), não é defeito de código: a mensagem do app para falha de preparação saiu como o contrato prevê.
- **Dono:** usuário (corrigir o `.env` para o nome do bucket de anexos e reiniciar o dev server). Seguindo a orientação do comando, os cenários que dependem do R2 não foram insistidos.

## Cenários

| #    | Cenário                                                       | Papel | Status                                                                  |
| ---- | ------------------------------------------------------------- | ----- | ----------------------------------------------------------------------- |
| AT1  | Diálogo: seção Anexos, botão ativo, dica, vazio, input        | M     | PASSOU                                                                  |
| AT2  | Anexar 3 arquivos e criar o chamado                           | M     | NÃO EXECUTADO                                                           |
| AT3  | Card Anexos no detalhe com 3 itens                            | M     | NÃO EXECUTADO                                                           |
| AT4  | Download dos 3 anexos com nome original                       | M     | NÃO EXECUTADO                                                           |
| AT5  | `307` com `X-Amz-Expires=60`, `no-store`, Content-Disposition | M     | NÃO EXECUTADO                                                           |
| AT6  | URL expirada após 65 s                                        | M     | NÃO EXECUTADO                                                           |
| AT7  | Recusa no cliente: conteúdo divergente, nulo, tipo não aceito | M     | NÃO EXECUTADO                                                           |
| AT8  | Recusa de arquivo de 11 MB                                    | M     | NÃO EXECUTADO                                                           |
| AT9  | PUT adulterado com corpo maior                                | M     | NÃO EXECUTADO                                                           |
| AT10 | PUT adulterado com troca de conteúdo                          | M     | NÃO EXECUTADO                                                           |
| AT11 | Limite de 5 arquivos                                          | M     | NÃO EXECUTADO                                                           |
| AT12 | Remoção pelo X e criação com 3 anexos                         | M     | NÃO EXECUTADO                                                           |
| AT13 | Envio bloqueado durante `Enviando…`                           | M     | NÃO EXECUTADO                                                           |
| AT14 | PUT abortado, bloqueio e criação sem anexo                    | M     | NÃO EXECUTADO (ver Observações: parte da UI exercitada por outra causa) |
| AT15 | Chamado sem anexo e card `Nenhum anexo.`                      | M     | PASSOU                                                                  |
| AT16 | `GET /api/attachments/<id>` sem cookie redireciona a `/login` | —     | PASSOU                                                                  |
| AT17 | Outro setor e ids inválidos respondem 404 iguais              | I     | NÃO EXECUTADO                                                           |
| AT18 | Diretor e admin do setor veem e baixam                        | D, A  | NÃO EXECUTADO                                                           |
| AT19 | Tag desativada: erro, anexo preservado, 2º envio com 1 anexo  | A, M  | NÃO EXECUTADO                                                           |
| AT20 | Responsivo 390×844                                            | M     | NÃO EXECUTADO                                                           |
| AT21 | Regressão da edição de título                                 | M     | NÃO EXECUTADO                                                           |
| AT22 | Nenhum erro de console/devtools em toda a bateria             | M     | NÃO EXECUTADO                                                           |

### Evidência dos cenários executados

- **AT1:** abrir "Novo chamado" (1440×900) mostrou `group "Anexos"` abaixo de Descrição, botão `Anexar` ativo, dica `Até 5 arquivos de até 10 MB cada.`, `Nenhum anexo.`. `input[type=file]`: `multiple=true`, `accept=".png,.jpg,.jpeg,.webp,.pdf,.txt,.csv,.log,.docx,.xlsx,.pptx,.zip,.rar"`.
- **AT15:** chamado `#203` `[QA] Anexos sem anexo` criado com toast `Chamado #203 criado.` sem tocar o R2 (confirma o contrato: chamado sem anexo funciona mesmo com o bucket mal configurado). Consulta:
  `select t.id, t.title, t.status, (select count(*) from attachment a where a.ticket_id=t.id) as anexos from ticket t where t.id in (202,203)` → `203 | [QA] Anexos sem anexo | aberto | 0`. No detalhe, `section` `Anexos` com texto `Nenhum anexo.` e sem `<ul>`; ordem das seções na coluna: `Detalhes`, `Anexos`, `Comentários`.
- **AT16:** `fetch('http://localhost:3000/api/attachments/1', { redirect: 'manual' })` sem cookie → `307`, `Location: /login`, sem Location do R2. (Id 1 não existe; o redirecionamento ocorre antes da consulta.)
- `get_errors` do `next-devtools`: `configErrors: []`, `sessionErrors: []` após os cenários.

## Falhas

Nenhuma.

## Erros fora dos cenários

- O log do dev server traz `InvalidBucketName` (descrito em "Pré-requisito pendente"). Console do navegador sem erros nem avisos de hidratação.
- Aviso `SECURITY WARNING … sslmode` do `pg` no log do dev server: ruído de ambiente, sem ligação com a feature.

## Não executados

AT2 a AT14 e AT17 a AT22: dependem de `requestAttachmentUpload`, que falha com `InvalidBucketName` enquanto `R2_ATTACHMENTS_BUCKET` não tiver o nome do bucket. AT17 e AT18 também precisam de um anexo existente (nenhum foi criado). AT20 e AT21 não precisam do R2 para o diálogo/edição, mas foram parados junto, conforme a orientação de não insistir depois da falha de configuração. AT22 depende da bateria completa.

## Observações

- **Dado criado:** `#202 [QA] Anexos falha` e `#203 [QA] Anexos sem anexo`, ambos em QA Suporte, 0 anexos. Nenhum chamado #65 a #68 foi tocado.
- **AT14 (observação parcial, não vale como aprovação):** com o `requestAttachmentUpload` falhando, os 3 itens ficaram `Falha no envio`. Com eles na lista, `Abrir chamado` (botão com `aria-disabled`) mostrou o toast `Remova os anexos com falha antes de continuar.`; removi os três pelos X (`Remover <nome>`) e o chamado `#202` foi criado com 0 anexos. Isso exercita o bloqueio e a remoção, mas a causa da falha foi outra (pedido de URL, não PUT abortado) e o texto do item foi `Não foi possível preparar o envio agora. Tente novamente.` em vez de `Falha no envio. Remova o arquivo e tente de novo.` — comportamento coerente com o contrato (a mensagem da action é guardada), só não é o caminho que AT14 descreve.
- **Ambiguidade (para `df-architect`):** o botão `Abrir chamado` com `aria-disabled` não aceita clique do Playwright sem `force: true`. Os cenários AT13 e AT14 pedem "clicar em Abrir chamado" durante o bloqueio; vale dizer no contrato que o clique deve ser forçado (ou que o botão é `aria-disabled` de propósito).
- **Ambiguidade (para `df-architect`):** o contrato diz que o `GET` sem sessão redireciona para `/login` com `NextResponse.redirect(new URL("/login", request.url))`; o retorno observado foi `Location: /login` relativo. Satisfaz o critério de AT16, só registro a diferença de forma.
- **Ambiguidade (para `df-architect`):** o contrato do `.env.example` e o ADR 018 poderiam deixar explícito que `R2_ATTACHMENTS_BUCKET` é o **nome** do bucket (não URL), já que o erro mais provável é confundi-la com `R2_AVATARS_PUBLIC_URL`.
- AT22 pede "nenhum e-mail": a criação de chamado não dispara e-mail neste código; com `RESEND_API_KEY` preenchida, não há como confirmar por log de "e-mail não enviado".
- Janela do navegador deixada aberta, logada como M, para o usuário encerrar a gravação.
- O arquivo `.qa-output/` está fora do git; apenas este relatório foi criado em `docs/test-reports/`.

## Reteste 1

- **Data:** 2026-10-13
- **Commit:** `d1a4d43` · alterações não comitadas: sim
- **Escopo:** AT2–AT14 e AT17–AT22 (os não executados na rodada anterior; AT14 inteiro de novo)
- **Resultado do reteste:** 18 de 19 passaram · 1 falhou · 0 bloqueados · 0 não executados
- **Resultado acumulado (AT1–AT22):** 21 de 22 passaram · 1 falhou (AT20)

### Pré-requisitos

| Item                    | Situação                                                                                                                                                                                |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dev server              | OK (`/login` 200)                                                                                                                                                                       |
| `R2_ATTACHMENTS_BUCKET` | OK: `direct-flow-attachments` (nome do bucket). Sem `InvalidBucketName`, sem erro de CORS no console, sem 403 de credencial; os `PUT` ao `*.r2.cloudflarestorage.com` responderam `200` |
| Usuários M, A, I e D    | OK, ativos                                                                                                                                                                              |
| E-mail                  | `RESEND_API_KEY` preenchida. `createTicket` e o download não enviam e-mail; nenhum cenário depende de e-mail                                                                            |

### Cenários

| #    | Cenário                                                       | Papel | Status                    |
| ---- | ------------------------------------------------------------- | ----- | ------------------------- |
| AT2  | Anexar 3 arquivos e criar o chamado                           | M     | PASSOU                    |
| AT3  | Card Anexos no detalhe com 3 itens                            | M     | PASSOU                    |
| AT4  | Download dos 3 anexos com nome original                       | M     | PASSOU                    |
| AT5  | `307` com `X-Amz-Expires=60`, `no-store`, Content-Disposition | M     | PASSOU                    |
| AT6  | URL expirada após 65 s                                        | M     | PASSOU                    |
| AT7  | Recusa no cliente: conteúdo divergente, nulo, tipo não aceito | M     | PASSOU                    |
| AT8  | Recusa de arquivo de 11 MB                                    | M     | PASSOU                    |
| AT9  | PUT adulterado com corpo maior                                | M     | PASSOU (R2 recusou o PUT) |
| AT10 | PUT adulterado com troca de conteúdo                          | M     | PASSOU                    |
| AT11 | Limite de 5 arquivos                                          | M     | PASSOU                    |
| AT12 | Remoção pelo X e criação com 3 anexos                         | M     | PASSOU                    |
| AT13 | Envio bloqueado durante `Enviando…`                           | M     | PASSOU                    |
| AT14 | PUT abortado, bloqueio e criação sem anexo                    | M     | PASSOU                    |
| AT17 | Outro setor e ids inválidos respondem 404 iguais              | I     | PASSOU                    |
| AT18 | Diretor e admin do setor veem e baixam                        | D, A  | PASSOU                    |
| AT19 | Tag desativada: erro, anexo preservado, 2º envio com 1 anexo  | A, M  | PASSOU                    |
| AT20 | Responsivo 390×844                                            | M     | FALHOU                    |
| AT21 | Regressão da edição de título                                 | M     | PASSOU                    |
| AT22 | Nenhum erro de console/devtools em toda a bateria             | M     | PASSOU                    |

### Evidência dos cenários que passaram

- **AT2:** os 3 itens foram de `Enviando…` para `Enviado` (`68 B`, `9 MB`, `9 MB`); 3 `PUT` em `direct-flow-attachments.<conta>.r2.cloudflarestorage.com` com `200`; toast `Chamado #204 criado.`. Consulta `select … from attachment a join users u … where a.ticket_id=204`: ids 5, 6, 7; `message_id` nulo; `uploaded_by` = `qa.member.suporte@directflow.test`; `print.png | image/png | 68`, `relatório ação.pdf | application/pdf | 9437199`, `logs.zip | application/zip | 9437188`; `storage_key` `tickets/<uuid>.png|pdf|zip`; `created_at` igual ao do chamado (`21:24:38.717`).
- **AT3:** no detalhe de `#204`, ordem dos `h2` na coluna: `Detalhes`, `Anexos`, `Comentários`. Itens: `print.png · 68 B · QA Membro Suporte · 13/10/2026 18:24`, `relatório ação.pdf · 9 MB · …`, `logs.zip · 9 MB · …`, links `/api/attachments/5|6|7` com `aria-label="Baixar <nome>"`. Screenshot `.qa-output/at3-card.png`.
- **AT4:** os 3 downloads dispararam o evento `download` com `suggestedFilename` `print.png`, `relatório ação.pdf`, `logs.zip`; tamanhos salvos em `.qa-output/dl/` 68, 9437199 e 9437188 bytes, iguais aos do banco.
- **AT5:** `GET /api/attachments/6` com `maxRedirects: 0` → `307`, host `direct-flow-attachments…r2.cloudflarestorage.com`, `X-Amz-Expires=60`, `Cache-Control: private, no-store`. `GET` no `Location` → `200`, `content-length 9437199`, `Content-Disposition: attachment; filename="relat_rio a__o.pdf"; filename*=UTF-8''relat%C3%B3rio%20a%C3%A7%C3%A3o.pdf`.
- **AT6:** 66,6 s depois, o mesmo `Location` → `403` `ExpiredRequest`; novo `GET /api/attachments/6` → `307` e o novo `Location` respondeu `206` (com `Range`).
- **AT7:** toasts `setup.pdf: O conteúdo do arquivo não corresponde à extensão.`, `nulo.txt: O conteúdo do arquivo não corresponde à extensão.`, `pagina.html: Tipo de arquivo não aceito. Envie PNG, JPEG, WebP, PDF, TXT, CSV, LOG, DOCX, XLSX, PPTX, ZIP ou RAR.`, `icone.svg: …` igual. Lista continuou com `Nenhum anexo.` (0 `li`); listener de requisições não registrou `PUT` ao R2 nem Server Action.
- **AT8:** `grande.pdf: O arquivo precisa ter no máximo 10 MB.`; 0 itens; nenhuma requisição ao R2 nem a action.
- **AT9 (registro do contrato): o PUT falhou.** O corpo trocado por 11 MB fez o R2 responder `403 SignatureDoesNotMatch` (o `Content-Length` assinado é respeitado). Item `ok.pdf 1009 B · Falha no envio · Falha no envio. Remova o arquivo e tente de novo.`; não houve criação; nenhum chamado `[QA] Anexos PUT adulterado` no banco (consulta devolveu 0 linhas).
- **AT10:** com o corpo trocado por bytes de mesmo tamanho começando em `4D 5A`, o item ficou `Enviado`; ao `Abrir chamado` o toast foi `Não foi possível anexar "ok.pdf". Remova o arquivo e anexe de novo.`; diálogo aberto com título e lista (1 item) mantidos; `select count(*) from ticket where title like '[QA] Anexos troca%'` = 0; `max(attachment.id)` continuou 11 (nenhuma linha nova).
- **AT11:** com 6 PNGs de uma vez, entraram `a1`…`a5` (todos `Enviado`) e o 6º não; a leitura imediata do toast do 1º lote veio vazia (ver Observações). Com 5 na lista, `a7.png` → toast `Anexe no máximo 5 arquivos.` e 5 itens. Depois de remover `a5` e selecionar `b1`, `b2`, `b3`: entrou só `b1` e o toast `Anexe no máximo 5 arquivos.` apareceu.
- **AT12:** nome acessível `Remover doc.docx` presente; após remover, a lista ficou com 3 e o foco foi para `Anexar`. Chamado `#205`: ids 8, 9, 10: `planilha.xlsx | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet | 1028`, `backup.rar | application/vnd.rar | 1032`, `dados.csv | text/csv | 8`; nenhuma `doc.docx`. Cancelar e reabrir o diálogo mostrou a lista vazia.
- **AT13:** com o `PUT` atrasado em 10 s, o item mostrou `Enviando…`; `Abrir chamado` com `aria-disabled="true"` (clique forçado) → toast `Aguarde o envio dos anexos terminar.`, razão no `aria-describedby` com o mesmo texto, diálogo aberto, 0 chamados com o título. Depois de `Enviado` (`aria-disabled` removido), o envio criou `#206` com 1 anexo (`print.png`).
- **AT14:** `route.abort()` no `PUT`: item `print.png 68 B · Falha no envio · Falha no envio. Remova o arquivo e tente de novo.`; `Abrir chamado` bloqueado com o toast `Remova os anexos com falha antes de continuar.`; após remover, o botão voltou a ficar ativo e o chamado `#207` foi criado com 0 anexos (`count(a.id)` = 0). Screenshot `.qa-output/at14-failed.png`.
- **AT17:** como I (QA Infra), `GET /api/attachments/` com ids `4`, `5`, `6`, `7`, `999999999` e `abc` → `404` em todos, corpo `Anexo não encontrado.`, sem `Location`. `/tickets/204` também `404` para I.
- **AT18:** D (Diretoria) e A (QA Suporte) viram os 3 itens no card de `#204` e baixaram os ids 5, 6 e 7 (`307` → `206/200` no R2).
- **AT19:** A criou a tag `[QA] Anexos temporária` (id 34, setor QA Suporte). M (segunda sessão, ver Observações) anexou `print.png` (`Enviado`) e escolheu a tag; A a desativou (`is_active = false`); M clicou `Abrir chamado` → erro no campo `Esta tag não está disponível. Escolha uma tag ativa do seu setor.`, diálogo aberto, anexo ainda `Enviado`, nenhum chamado com o título. M escolheu `[QA] Acesso` e reenviou → `#210` criado com 1 anexo (id 14, `print.png`, `tickets/31a089bc-….png`); o download de `/api/attachments/14` respondeu `307` → `200` com 68 bytes.
- **AT21:** `#209 [QA] Anexos edição` (M destinatário, `em_andamento`); `Editar` → título `[QA] Anexos edição título novo` → toast `Chamado #209 atualizado.`; no banco o título mudou e o status continuou `em_andamento`; 0 anexos no chamado e `max(attachment.id)` sem salto (13, de `#208`).
- **AT22:** `get_errors` do `next-devtools` com `configErrors: []` e `sessionErrors: []` em todas as consultas. Log do dev server (`.next/dev/logs/next-development.log`) sem `InvalidBucketName`, `[requestAttachmentUpload]`, `[attachments:download]` nem `[createTicket] rollback`. Console do navegador: nenhum aviso de hidratação, nenhum erro de CORS; os 3 erros `Failed to load resource` são de cenários com interceptação ou de URL esperada (`net::ERR_FAILED` do `PUT` abortado em AT14; `403` do `PUT` adulterado em AT9; `404` de `/tickets/204` para I em AT17). Sem e-mail (a criação de chamado não envia). O console da segunda sessão (AT19) não foi lido.

### Falhas

#### AT20 — Responsivo 390×844: diálogo de novo chamado com nome de anexo longo sem espaços

- **Papel:** M (`qa.member.suporte@directflow.test`)
- **Passos:** 1. viewport 390×844. 2. Abrir "Novo chamado". 3. Anexar `relatório ação.pdf` (9 MB) e um PNG chamado `aaaa…a.png` (116 `a` + `.png`, 120 caracteres, sem espaço). 4. Medir o documento e o `[role="dialog"]`; rolar até o X e até `Abrir chamado`.
- **Esperado:** (contrato, AT20) diálogo sem rolagem horizontal (`scrollWidth <= clientWidth` no documento e no `[role="dialog"]`); nomes longos quebram ou truncam; X alcançável; rodapé do diálogo alcançável.
- **Obtido:** o documento ficou sem rolagem (390/390), mas o `[role="dialog"]` ficou com `scrollWidth` 1073 e `clientWidth` 343: o diálogo rola na horizontal. A cadeia `li` → `ul` → `div` → `div` → `form` mediu 1025 px de largura (o nome sem quebra impõe a largura mínima do conteúdo; o `li` tem `min-w-0`, mas o ancestral não limita). Efeito visível: os campos (Título, Descrição, Tipo, Tags, Destinatário) e os botões do rodapé ficam deslocados para fora da área visível (botão `Abrir chamado` medido em `x = -682`, largura 1040). O `Remover <nome>` ficou dentro de 0–390 px depois do `scrollIntoView`. Com um nome de 60 `a` sem espaço o diálogo já passa do limite (`scrollWidth` 632 contra 343); com nome com espaços (≈70 caracteres) fica 343/343, sem rolagem. O card `Anexos` do detalhe (`/tickets/208`, mesmos dois anexos) passou: documento 375/375, card dentro do viewport, ordem `Detalhes`, `Anexos`, `Comentários`.
- **Evidência:** screenshot `.qa-output/at20-dialog.png` (campos cortados à esquerda, rolagem horizontal visível) e `.qa-output/at20-detail.png` (card ok); medição por `page.evaluate` descrita acima; `get_errors` vazio.
- **Camada provável:** app (item de anexo e contêiner no diálogo: nome sem quebra forçada ou truncamento efetivo, e ancestral flex/grid sem `min-w-0`)
- **Dono:** `df-ui`

### Erros fora dos cenários

Nenhum. Os três `Failed to load resource` do console são esperados e estão descritos em AT22.

### Não executados

Nenhum.

### Observações

- **Dado criado pelo reteste (todos em QA Suporte):** chamados `#204` (3 anexos), `#205` (3), `#206` (1), `#207` (0), `#208` (2, nome longo), `#209` (0, título editado para `[QA] Anexos edição título novo`) e `#210` (1); tag `[QA] Anexos temporária` (id 34, agora **inativa**). `#202` e `#203` são da rodada anterior. Nenhum chamado #65–#68 foi tocado.
- **AT19, segunda sessão:** o cenário exige M com o diálogo aberto enquanto A desativa a tag; com um só jar de cookies isso trocaria a sessão do M. Usei um segundo contexto de navegador, criado pelo navegador do próprio servidor MCP (`page.context().browser().newContext()`), para M, e A ficou na janela principal. O contexto de M foi fechado ao fim. Não foi lançado nenhum navegador próprio.
- **Ambiguidade (para `df-architect`):** AT11 manda selecionar 6 PNGs de uma vez e espera o toast; a leitura imediata do toast do 1º lote veio vazia, e o toast só foi visto no caso equivalente (`b2`/`b3`). Vale dizer no contrato em que momento o toast aparece (antes ou depois do pedido de URL dos itens aceitos).
- **Ambiguidade (para `df-architect`):** AT20 pede "nomes longos quebram/truncam" sem definir se vale para nome sem espaço. O resultado acima mostra que é exatamente o caso que quebra o layout; vale nomear no contrato "120 caracteres sem espaço" como critério.
- **Ambiguidade (para `df-architect`):** em AT19 o contrato diz "erro de tag no campo (`INVALID_TAG`, como hoje)"; o texto observado foi `Esta tag não está disponível. Escolha uma tag ativa do seu setor.` e o campo voltou a `Selecione a tag`. Registro o texto para o contrato citá-lo.
- O botão `Abrir chamado` com `aria-disabled` só aceitou clique do Playwright com `force: true` (AT13, AT14), como já apontado.
- Janela principal do navegador deixada aberta, logada como A (QA Admin Suporte), para o usuário encerrar a gravação. Só este relatório foi alterado em `docs/test-reports/`.

## Reteste 2

- **Data:** 2026-10-13
- **Commit:** `d1a4d43` · alterações não comitadas: sim
- **Escopo:** AT20 (390×844), após a correção do `df-ui` (`min-w-0` no `<form>` do diálogo, `app/(app)/_components/new-ticket-dialog.tsx:154`)
- **Resultado do reteste:** 1 de 1 passou
- **Resultado acumulado (AT1–AT22):** 22 de 22 passaram · 0 falharam

### Cenários

| #    | Cenário            | Papel | Status |
| ---- | ------------------ | ----- | ------ |
| AT20 | Responsivo 390×844 | M     | PASSOU |

### Evidência

Papel M (`qa.member.suporte@directflow.test`), viewport 390×844, "Novo chamado" aberto pela interface, arquivo anexado pelo seletor e itens em `Enviado`.

| Nome do anexo                                 | `[role="dialog"]` scroll/client | Documento scroll/client | `Abrir chamado` (x → direita) |
| --------------------------------------------- | ------------------------------- | ----------------------- | ----------------------------- |
| 116 `a` + `.png` (120 caracteres, sem espaço) | 343 / 343                       | 390 / 390               | 32 → 343 (largura 311)        |
| 120 caracteres com espaços                    | 343 / 343                       | 390 / 390               | 32 → 343                      |

- No nome sem espaço, o botão `Remover <nome>` ficou em x 301–329, dentro do diálogo; o rodapé ficou alcançável e sem rolagem horizontal da página. Na rodada anterior o mesmo caso dava `scrollWidth` 1073 e botão em `x = -682`.
- Regressão do card `Anexos` em `/tickets/208` (dois anexos, um com nome longo sem espaço): documento 375/375, card em x 20–355, 2 itens, ordem `Detalhes`, `Anexos`, `Comentários`.
- `get_errors` do `next-devtools`: `configErrors: []`, `sessionErrors: []`. Console do navegador: 0 erros e 0 avisos.
- Screenshots: `.qa-output/at20-retest2-nospace.png`, `.qa-output/at20-retest2-spaced.png`, `.qa-output/at20-retest2-detail.png`.

### Falhas

Nenhuma.

### Observações

- Os dois anexos de teste do diálogo foram removidos pelo X e o diálogo foi cancelado: nenhum chamado novo foi criado. Os objetos enviados ao R2 ficam sem chamado (comportamento já previsto para anexos abandonados).
- O seletor de arquivos do servidor MCP só aceita arquivos dentro da raiz do projeto; as imagens de teste foram copiadas para `.qa-output/up/` (fora do git).
- Janela do navegador deixada aberta, logada como M, para o usuário encerrar a gravação.

## Reteste 3

- **Data:** 2026-10-13
- **Commit:** `d1a4d43` · alterações não comitadas: sim
- **Escopo:** AT23 (download com sessão inválida), cenário novo do contrato
- **Resultado do reteste:** 1 de 1 passou
- **Resultado acumulado (AT1–AT23):** 23 de 23 passaram · 0 falharam

### Cenários

| #    | Cenário                                                   | Papel                       | Status |
| ---- | --------------------------------------------------------- | --------------------------- | ------ |
| AT23 | `GET /api/attachments/<id>` com cookie de sessão inválido | sem sessão (token inválido) | PASSOU |

### Evidência

Contexto novo no mesmo navegador do servidor MCP, só com o cookie `better-auth.session_token=invalido`, requisições com `maxRedirects: 0`.

| Id do anexo | Situação                    | Status | Location                      |
| ----------- | --------------------------- | ------ | ----------------------------- |
| 5           | existente (chamado QA #204) | 307    | `http://localhost:3000/login` |
| 8           | existente (chamado QA #205) | 307    | `http://localhost:3000/login` |
| 999999      | inexistente                 | 307    | `http://localhost:3000/login` |

- Consulta de apoio (`postgres`, leitura): `SELECT a.id, a.ticket_id FROM attachment a JOIN ticket t ON t.id=a.ticket_id WHERE t.title LIKE '[QA]%'` devolveu os ids 5, 6, 7 (chamado 204) e 8, 9 (chamado 205).
- Nenhum `Location` aponta para o R2; existente e inexistente respondem igual, sem vazar a existência do anexo.
- `get_errors` do `next-devtools`: `configErrors: []`, `sessionErrors: []`.

### Falhas

Nenhuma.

### Observações

- O id #208 citado no pedido é de chamado; os ids de anexo usados foram 5 e 8.
- Janela do navegador deixada aberta.
