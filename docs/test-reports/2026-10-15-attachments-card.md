# Relatório de testes — Card "Anexos" no detalhe do chamado

- **Data:** 2026-10-15
- **Contrato:** `docs/contracts/attachments-card.md` (contexto: `docs/contracts/attachments-in-edit.md` com a revisão de 2026-10-15, `docs/contracts/qa-seed.md`)
- **Commit:** `02c4c4d` · alterações não comitadas: sim (`ticket-attachments.tsx` novo, `ticket-attachments-frame.tsx`, `ticket-conclusion.tsx`, `resolve-ticket-form.tsx`, `page.tsx` e os contratos e o plano)
- **Ambiente:** `http://localhost:3000`, `next dev`, banco de desenvolvimento, R2 configurado
- **Resultado:** 18 de 18 passaram · 0 falharam · 0 bloqueados · 0 não executados (AN2 e AN8 com ressalva de contrato, ver Observações)

## Pré-requisitos

- Dev server: `/login` respondeu 200.
- MCP `playwright`, `next-devtools` e `postgres` disponíveis (`execute_sql` respondeu).
- Usuários QA (Admin Suporte, Membro Suporte, Admin Infra) e o diretor existem e estão ativos (consulta a `users`).
- `RESEND_API_KEY` no `.env` é `RESEND_API_KEY= #"re_..."`, ou seja, vazio para o dotenv: e-mail desligado. Nenhuma linha de e-mail apareceu no log do dev server durante a bateria.
- R2 configurado: uploads (`PUT` assinado) e downloads (redirect para `r2.cloudflarestorage.com`) funcionaram, sem erro de CORS.
- Tag `[QA] Acesso` ativa em QA Suporte.

## Dados criados (todos em QA Suporte, prefixo `[QA] Card anexos`)

| Chamado | Papel no teste | Estado final                                                                                 |
| ------- | -------------- | -------------------------------------------------------------------------------------------- |
| #243    | C1             | `em_andamento`, título hoje `[QA] Card anexos C1 editado`, 5 anexos (`dados.csv` removido)   |
| #244    | C2             | `em_andamento`, sem anexo (1 incluído e removido no AN10)                                    |
| #245    | C3             | `resolvido` (`[QA] resolvido`), 1 anexo (`notas.txt`)                                        |
| #246    | C4             | transferido para QA Infra e recusado com `[QA] devolvido`; `recusado`, de volta a QA Suporte |

#65 a #68 não foram tocados. Arquivos de upload ficaram em `.qa-output/up/` (fora do git).

## Cenários

| #    | Cenário                                                          | Papel   | Status |
| ---- | ---------------------------------------------------------------- | ------- | ------ |
| AN1  | Ordem Descrição → Anexos → Linha do tempo → Conclusão (C1)       | M       | PASSOU |
| AN2  | Faixa com 5 blocos, rolagem lateral, card sem `flex-1`, download | M       | PASSOU |
| AN3  | C2 sem edição: card com vazio tracejado                          | M       | PASSOU |
| AN4  | Não destinatários veem o mesmo card, só leitura, download        | A, D    | PASSOU |
| AN5  | Modo edição: ordem do cabeçalho, `Anexar` abaixo da faixa        | M       | PASSOU |
| AN6  | Tab do último X vai a `Anexar` e sai do card                     | M       | PASSOU |
| AN7  | Anexar `notas.txt` e salvar                                      | M       | PASSOU |
| AN8  | Remover `dados.csv` e salvar                                     | M       | PASSOU |
| AN9  | X + `logs.zip` + `Cancelar` volta ao estado salvo                | M       | PASSOU |
| AN10 | C2: incluir `imagem.webp`, salvar, remover, salvar               | M       | PASSOU |
| AN11 | Conclusão sem anexos nos quatro estados                          | M, A, D | PASSOU |
| AN12 | Um só heading `Anexos` (h2), id único, sem ids duplicados        | M       | PASSOU |
| AN13 | Árvore de acessibilidade: região, lista, sem `group`             | M       | PASSOU |
| AN14 | Bases de Conclusão e Comentários alinhadas; barra no rodapé      | M       | PASSOU |
| AN15 | 390×844 sem edição e editando (com `apresentacao.pptx`)          | M       | PASSOU |
| AN16 | Editar só o título e salvar: anexos intactos                     | M       | PASSOU |
| AN17 | Destinatário da transferência vê o card só leitura; recusar      | I       | PASSOU |
| AN18 | Sem erro de console, `next-devtools`, hidratação, CORS ou e-mail | todos   | PASSOU |

## Falhas

Nenhuma.

## Evidências por cenário

Medidas por `getBoundingClientRect()` somado a `scrollY`, 1440×900, salvo indicação. Screenshots: `.qa-output/an1-c1-desktop.png`, `.qa-output/an5-c1-edit-desktop.png`, `.qa-output/an2-c1-overflow-desktop.png`, `.qa-output/an15-c1-edit-mobile.png`.

- **AN1** (#243): `top` Descrição 252, Anexos 375, Linha do tempo 613, Conclusão 781; os quatro com `left` 256 e `width` 756. Detalhes e Comentários na coluna estreita (`left` 1034, Comentários `top` 706).
- **AN2** (#243): `h2` `Anexos`, 5 `a` em `/api/attachments/<id>` (136 px cada). Base do card 591 = base da faixa 570 + 1 de borda + 20 de `p-5`. Documento sem rolagem horizontal. Clique em `print.png`: download de `print.png` e `GET` assinado a `r2.cloudflarestorage.com` com `response-content-disposition=attachment`, `200`. `fetch('/api/attachments/88', { redirect: 'manual' })` devolve `opaqueredirect`. **Ressalva:** com 5 blocos a faixa não rola no 1440 (ver Observações); com 6 blocos (depois do AN7) `scrollWidth` 864 > `clientWidth` 722, rola por dentro e o documento fica sem rolagem horizontal (`scrollWidth - clientWidth` = 0).
- **AN3** (#244): `Anexos|Nenhum anexo.` e o elemento com borda `dashed` é o `Nenhum anexo.`; nenhum `Anexar`, `Remover` ou `input[type=file]`.
- **AN4**: A e D em #243 e #244: `top` crescente (Descrição < Anexos < Linha do tempo), `left` 256, nenhum botão `Editar`, nenhum `Anexar`/`Remover`, 0 `input[type=file]`; `Baixar print.png` (A) e `Baixar notas.txt` (D) baixaram.
- **AN5** (#243, editando): ordem no DOM `h2` → dica → `Restam 5 vagas.` → aviso → `ul` → 5 `button` X → `Anexar`. Cabeçalho `flex flex-col gap-1`, 0 botões. `Anexar`: `top` 732 > base da faixa 716; `left` 277 = `left` da faixa 277; largura 90 de um card de 756. `aria-describedby` do `section` aponta para os três textos. 5 links ainda presentes.
- **AN6**: foco em `Remover planilha.xlsx`; `Tab` → `Anexar` (dentro do card); `Tab` → região `Eventos da linha do tempo`; `Tab` → `Dúvida` (campo de Detalhes). Nenhum `tabindex` positivo na página.
- **AN7**: durante, `Restam 4 vagas.` e a faixa rolou (`scrollLeft` 142) com o último bloco visível. Toast `Chamado #243 atualizado.`; saiu da edição; 6 blocos com `notas.txt` por último; sem `Anexar`. Banco: `attachment_history` id 83 `inclusao` `notas.txt`, `actor_id` 14.
- **AN8**: ao clicar no X, foco em `Anexar` e `Restam 5 vagas.`. Salvo: 5 blocos sem `dados.csv`. Banco: `attachment_history` id 84 `exclusao` `dados.csv` (`attachment_id` 89).
- **AN9**: com 1 X e `logs.zip` `Enviado`, `Cancelar` volta à leitura com `print.png` e sem `logs.zip`; o único `POST` na rede foi `requestAttachmentUpload` (id `40c9e078…`, confirmado em `server-reference-manifest.json`), nenhuma chamada a `editTicket`. Banco intacto: 5 anexos, `attachment_history` sem linha nova. Novo `Editar`: 5 blocos, sem `logs.zip`.
- **AN10** (#244): editando, `Restam 10 vagas.`, vazio tracejado (base 636, `left` 277) e `Anexar` (`top` 648, `left` 277). Após o 1º salvar: 1 bloco. Após `Editar` → X → salvar: `Anexos|Nenhum anexo.`.
- **AN11**: nenhum `Anexos`, `Nenhum anexo.`, `Anexar`, `Remover` nem link de anexo na Conclusão em:
  - `resolvable` #243 (M): `Solução|Enviar para outro setor|Resolver`;
  - #243 editando (M): `Nenhuma solução registrada.`;
  - `resolved` #245 (M): `Solução|Resolvido em 15/10/2026 17:31|Editável até 22/10/2026 17:31`;
  - `awaiting_transfer` #246 (A, antes da recusa): `Conclusão|Solução` (campo travado), card Anexos com 1 bloco;
  - #243 (D): igual ao `resolvable`;
  - `empty`: D em #28 (`cancelado`) e #12, ambos da Diretoria e só leitura: `Nenhuma solução registrada.`. Não há chamado `empty` em QA Suporte (os `recusado` voltam à fila e são `resolvable`).
- **AN12**: #243 e #245, com e sem edição, e #28, #12: `#ticket-attachments-heading` = 1, headings com texto exato `Anexos` = 1 e `H2`, lista de ids duplicados vazia. O diálogo "Novo chamado" estava fechado.
- **AN13**: `ariaSnapshot` leitura: `region "Anexos"` › `heading "Anexos" [level=2]` + `list "Anexos"` com `link "Baixar <nome>"` por item. Editando: parágrafos da dica, vagas e aviso, cada item com `link` e `button "Remover <nome>"` (0 `button` dentro de `a`), `button "Anexar"` depois da `list`. `getByRole('group', { name: 'Anexos' })` = 0; `getByRole('region', { name: 'Anexos', exact: true })` = 1; `aria-describedby` do `section` só na edição.
- **AN14** (base Conclusão = base Comentários): #243 leitura 1113 = 1113; #243 editando 1172 = 1172; #245 leitura 1113 = 1113. Também iguais em #246 (1211), #238 (1201), #12 e #28 (976). Barra `Resolver` em #243: base 1092 contra base do card 1113, ou seja 21 px (20 de `p-5` + 1 de borda).
- **AN15** (390×844): ordem dos `h2` por `top`: Descrição 381, Anexos 527, Linha do tempo 780, Conclusão 1096, Detalhes 1386, Comentários 1840. Faixa `scrollWidth` 720 > `clientWidth` 301 (5 blocos). Editando com `apresentacao.pptx` `Enviado`: `Restam 4 vagas.`, `scrollWidth` 864 > 301, documento sem rolagem horizontal, 6 X de 28×28 px, cabeçalho `scrollWidth` = `clientWidth` = 293 (sem estouro), `Anexar` `top` 408 (viewport de 844, visível sem rolar a faixa), abaixo da base da faixa 396, `left` 41 = `left` do conteúdo do card (card em 20 + 1 de borda + 20 de padding). Cancelado sem salvar: volta a 5 blocos.
- **AN16**: título trocado para `[QA] Card anexos C1 editado`, toast `Chamado #243 atualizado.`, `h1` atualizado, 5 blocos mantidos, sem `Anexar`/X.
- **AN17**: I em #246 (pendente): `top` Descrição 354, Anexos 477, Linha do tempo 699, `left` 256 nos três; card `Anexos|PNG|print.png|70 B`, 1 `a`, 0 `Anexar`/`Remover`/`input[type=file]`. Botões da página: `Atender`, `Recusar`, `Comentar`. Recusa com `[QA] devolvido`: toast `Chamado #246 recusado e devolvido para QA Suporte.`. Banco: `ticket.status` `recusado`; `ticket_history` `transferencia_solicitada` (`em_andamento`→`aguardando_aprovacao`) e `transferencia_rejeitada` (`aguardando_aprovacao`→`recusado`); `ticket_transfer` mais recente `status` `rejeitado`, `review_note` `[QA] devolvido`, setores 18→19. I abrindo #243 (QA Suporte, sem relação): 404, como previsto pela visibilidade.
- **AN18**: `get_errors` do `next-devtools` com `configErrors` e `sessionErrors` vazios em todas as consultas (inclusive a final). Console do navegador sem `[ERROR]`/`[WARNING]` ligado à bateria, exceto o `404` esperado de I em `/tickets/243`. Sem aviso de hidratação, sem erro de CORS. Log do dev server sem linha `RESEND_API_KEY não configurada` (nenhum e-mail disparado).

Critério de pronto 2: `grep -n "ttachment"` em `ticket-conclusion.tsx` e `resolve-ticket-form.tsx` devolve 0 linhas.

## Erros fora dos cenários

Nenhum durante a bateria. O log do dev server tem `ReferenceError: TicketAttachments is not defined` às 02:23:53 (relógio do log), cerca de 5 minutos antes do início desta sessão, seguido de `Compiled in 549ms`; é o estado intermediário da implementação e não se repetiu.

## Não executados

Nenhum.

## Observações

1. **AN2, premissa de dados (ambiguidade para o `df-architect`).** O contrato exige que a faixa de C1 (5 blocos) tenha `scrollWidth > clientWidth` no 1440. Cinco blocos de 136 px com `gap-2` somam 712 px e a faixa tem 722 px de largura útil (card de 756 px), então não há overflow com 5 arquivos nessa largura; ele só aparece com 6 ou mais (864 px). No 390 há overflow com 5. O comportamento do componente está coerente (rola por dentro, sem rolagem no documento). Se o objetivo é provar overflow no desktop, C1 precisa de 6 ou mais arquivos, e o limite de 5 anexos na criação (`Até 5 arquivos de até 10 MB cada.`) obriga a incluir o 6º na edição.
2. **AN8 depende da ordem.** O `Restam 5 vagas.` do contrato só vale se o AN7 já tiver salvo o 6º anexo (6 − 1 = 5). Fora dessa ordem (5 salvos) o certo é `Restam 6 vagas.`, que foi o que a tela mostrou numa tentativa preliminar descartada com `Cancelar`. Vale uma frase no contrato.
3. **Preparação de C1.** Na criação (diálogo "Novo chamado") só 3 dos 5 arquivos foram gravados: os `doc.docx` e `planilha.xlsx` do primeiro lote não tinham a assinatura ZIP (`PK\x03\x04`) e o uploader os descartou sem nenhum request. Não confirmei se o descarte mostra toast ou aviso, porque o foco era o card; o `df-architect` pode conferir `attachment-tiles.md` / `attachments-in-edit.md`. Os dois arquivos foram incluídos depois pela edição, com bytes válidos, antes dos cenários.
4. **`empty` em QA Suporte.** A nota do AN11 supõe um visualizador sem `Resolver` em C1, mas todos os papéis QA com acesso a C1 (M, A, D) têm o botão. O estado `empty` só ocorreu em chamados `cancelado`/`fechado` da Diretoria (#12, #28), usados só para leitura. Para o próximo teste convém uma regra de seed ou um cenário de cancelamento em QA.
5. **Conclusão em `awaiting_transfer`.** `innerText` da Conclusão mostra `Conclusão|Solução`; a mensagem da transferência fica no valor do campo travado, não em texto visível separado. Sem anexos, como o contrato exige; apenas confira se `LockedSolutionField` é de fato o desenho esperado ("só a mensagem da transferência").
6. A janela do navegador ficou aberta, logada como diretor, para o usuário encerrar a gravação.
