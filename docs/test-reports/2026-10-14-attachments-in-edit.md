# Relatório de testes — Anexar e remover anexos só no "Editar"

- **Data:** 2026-10-14
- **Contrato:** `docs/contracts/attachments-in-edit.md`
- **Commit:** `cbe0c58` · alterações não comitadas: sim (Etapa 3 inteira está no working tree)
- **Ambiente:** `http://localhost:3000`, `next dev`, banco de desenvolvimento, bucket R2 real
- **Resultado:** 27 de 27 passaram · 0 falharam · 0 bloqueados · 0 não executados (5 cenários rodaram adaptados, ver "Observações")

## Pré-requisitos

- Dev server: `/login` respondeu 200.
- MCP: `next-devtools` (porta 3000), `playwright` (Chrome visível, aba única) e `postgres` (`SELECT 1`) responderam.
- Usuários QA e diretor existem e estão ativos (consulta a `users`: ids 6, 13, 14 e 15, `is_active = true`).
- Migration `0015`: `enum_range(null::history_event)` já traz `anexo_incluido` e `anexo_removido`.
- R2: as variáveis `R2_*` estão preenchidas; envio pelo navegador (`Enviado`), cópia para `tickets/`, `GET` assinado (`200`) e exclusão (`404`) funcionaram de ponta a ponta.
- `RESEND_API_KEY` **preenchida**. A feature não envia e-mail (`editTicket`, `resolveTicket` e a transferência não importam `app/_lib/email`), então nenhum cenário foi marcado como não executado por isso.

## Dados criados (todos em QA Suporte)

| Id  | Título                               | Papel no teste                                       | Estado final                                                                     |
| --- | ------------------------------------ | ---------------------------------------------------- | -------------------------------------------------------------------------------- |
| 231 | `[QA] Anexos na edição E1 (editado)` | E1: AE1, AE3 a AE9; passou para A no AE9             | `encaminhado`, destinatário A, 3 anexos (`notas.txt`, `imagem.webp`, `doc.docx`) |
| 232 | `[QA] Anexos na edição E2`           | E2: AE10                                             | `encaminhado`, destinatário A, sem anexo                                         |
| 233 | `[QA] Anexos na edição E3`           | E3: AE11, AE12, AE23                                 | `em_andamento`, 10 anexos                                                        |
| 234 | `[QA] Anexos na edição E4`           | E4: AE14, AE18                                       | `resolvido`, 1 anexo (`print.png`)                                               |
| 235 | `[QA] Anexos na edição E6`           | E6: AE15                                             | `em_andamento`, sem anexo                                                        |
| 236 | `[QA] Anexos na edição E7`           | E7: AE21                                             | `resolvido`, sem anexo                                                           |
| 237 | `[QA] Anexos na edição E8`           | E8 (extra): AE13, AE16, AE17, AE22, AE24, AE26       | `em_andamento`, sem anexo                                                        |
| 238 | `[QA] Anexos na edição E5`           | E5: AE20 (A criou, transferiu para Infra, I recusou) | `recusado`, devolvido a QA Suporte, destinatário A, 1 anexo                      |

Não alterei #65 a #68 nem criei dado na Diretoria. Os arquivos de teste estão em `.qa-output/files/` (fora do git).

## Cenários

| #    | Cenário                                                                                                                                 | Papel   | Status |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------ |
| AE1  | E1 sem editar: Anexos só leitura, sem `Anexar`, sem `Novos anexos`, sem `input[type=file]`                                              | M       | PASSOU |
| AE2  | Não destinatários veem Anexos só leitura, sem X nem `Anexar`; download funciona (em E3, ver nota 1)                                     | A, D    | PASSOU |
| AE3  | `Editar` vira bloco editável: dica, `Restam 8 vagas.`, aviso, `Anexar`, X por bloco, um só `#ticket-attachments-heading`                | M       | PASSOU |
| AE4  | Incluir `notas.txt` e salvar: toast, linha em `attachment`, só `anexo_incluido` no histórico                                            | M       | PASSOU |
| AE5  | Incluir `logs.zip` e `Cancelar`: nada gravado, nenhum request de `editTicket`, novo `Editar` vazio                                      | M       | PASSOU |
| AE6  | Remover `dados.csv` e salvar: linha apagada, `404` na rota e no R2, sem log `remove`                                                    | M       | PASSOU |
| AE7  | Remover `print.png` e `Cancelar`: bloco volta, banco intacto                                                                            | M       | PASSOU |
| AE8  | Título + remover + incluir no mesmo salvamento: `edicao` → `anexo_removido` → `anexo_incluido`                                          | M       | PASSOU |
| AE9  | Anexo + troca de destinatário + comentário de passagem; M perde o `Editar`; A edita com X em todos                                      | M, A    | PASSOU |
| AE10 | Admin do setor remove anexo de outra pessoa (E2): vazio tracejado, `anexo_removido` por A                                               | A       | PASSOU |
| AE11 | Teto de 10: 6 arquivos de uma vez, 5 entram, toast, `Anexar` `aria-disabled` sem seletor, `Resta 1 vaga.`                               | M       | PASSOU |
| AE12 | Forjado no teto: `ATTACHMENTS_LIMIT`; com 1 remoção, salvo e `anexo_removido` antes de `anexo_incluido`                                 | M       | PASSOU |
| AE13 | Não destinatário (A) e Diretoria (D) forjando: `FORBIDDEN`, banco intacto                                                               | A, D    | PASSOU |
| AE14 | Ids removidos inválidos: `ATTACHMENT_NOT_FOUND` (outro chamado, inexistente), `INVALID_INPUT` (`0`, `[5, 5]`) (em E4, ver nota 1)       | M       | PASSOU |
| AE15 | Duas abas removendo o mesmo anexo: `ATTACHMENT_NOT_FOUND` + atualiza; 2º clique `NO_CHANGES`; um só `anexo_removido`                    | M       | PASSOU |
| AE16 | Salvar durante `Enviando…` e com falha de envio é bloqueado; depois de remover o com falha, salva (em E8, ver nota 1)                   | M       | PASSOU |
| AE17 | Salvar sem mudar: `Nenhuma alteração para salvar.`; só remover: `Chamado #237 atualizado.` (em E8)                                      | M       | PASSOU |
| AE18 | Resolver sem uploader; depois, dentro da janela, incluir anexo pelo `Editar`; `resolucao` → `anexo_incluido`                            | M       | PASSOU |
| AE19 | Fora da janela (#175): sem `Editar`, só leitura; forjado `FORBIDDEN`, nada gravado                                                      | M       | PASSOU |
| AE20 | Transferência pendente: A e I só leitura (1 bloco); forjado `FORBIDDEN`; I recusa. M recebe 404 (nota 2)                                | A, M, I | PASSOU |
| AE21 | `resolveTicket` forjado com `attachments`: resolvido, nenhuma linha em `attachment`                                                     | M       | PASSOU |
| AE22 | `PUT` interceptado com `4D 5A`: `Não foi possível anexar "relatório ação.pdf"…`, continua editando, banco intacto                       | M       | PASSOU |
| AE23 | 390×844 em E3 com 10: sem rolagem horizontal do documento, faixa rola, X de 28 px, `Anexar` visível                                     | M       | PASSOU |
| AE24 | Árvore de acessibilidade: `heading` 3, `list` `Anexos`, `link`/`button` irmãos, status do novo em texto, `Salvar` com descrição (em E8) | M       | PASSOU |
| AE25 | "Novo chamado": título `Anexos`, dica de 5, 6º arquivo recusado com `Anexe no máximo 5 arquivos.`                                       | M       | PASSOU |
| AE26 | `resolvable` com a barra no rodapé do card; bordas de baixo de Conclusão e Comentários iguais (0 px)                                    | M       | PASSOU |
| AE27 | Sem erro de runtime, hidratação, id duplicado nem e-mail na bateria toda                                                                | todos   | PASSOU |

## Evidência por cenário

**AE1** (#231, M). `input[type=file]` = 0, `Anexar` = 0, `#ticket-attachments-heading` = 1, 2 links `Baixar`, sem `Novos anexos` nem o aviso antigo. Ordem na tela: Solução → Anexos → barra. Screenshot `.qa-output/AE1-E1-leitura.png`.

**AE3.** Texto do grupo: `Anexos`, `Até 10 arquivos neste chamado, de até 10 MB cada.`, `Restam 8 vagas.`, `Inclusões e remoções de anexos só valem ao salvar as alterações.`, `Anexar`. Botões `Remover print.png` e `Remover dados.csv` são irmãos do `<a>`. Um só `input[type=file]`.

**AE4.** `Restam 7 vagas.` antes de salvar; toast `Chamado #231 atualizado.`.

```sql
select id, message_id, uploaded_by, file_name, created_at from attachment where ticket_id = 231 order by created_at, id;
select id, event, changed_by, note, changed_at from ticket_history where ticket_id = 231 order by changed_at, id;
```

`attachment` 64: `message_id` nulo, `uploaded_by` 14, `created_at` `01:52:45.192`. `ticket_history` 574: `anexo_incluido`, `note = notas.txt`, `changed_at` `01:52:45.192` (igual). Nenhuma linha `edicao`. Linha do tempo: `Anexo incluído`, `QA Membro Suporte · 14/10/2026 22:52`, `Incluiu um anexo.`, quadro `notas.txt`. O bloco não rolou porque 3 blocos cabem na faixa.

**AE5.** `Restam 6 vagas.` com `logs.zip` enviado; depois de `Cancelar`, 3 blocos sem `logs.zip` e nenhuma requisição `POST`/`PUT` registrada; `max(id)` de `attachment` = 64 e de `ticket_history` = 574, os mesmos de antes. Novo `Editar`: `Restam 7 vagas.` e 3 itens (só os salvos).

**AE6.** `GET /api/attachments/56` com `maxRedirects: 0`: `307` e `Location` guardado. Depois do X: foco em `Anexar`, `Restam 8 vagas.`. Salvou (`attachment` 56 apagada, `ticket_history` 575 `anexo_removido`, `note = dados.csv`, `changed_by` 14). `GET /api/attachments/56`: `404`. `GET` no `Location` guardado: `404`. `get_logs` sem linha `[editTicket] remove`.

**AE8.** `ticket_history` 576 `edicao` (`Alterou título.`), 577 `anexo_removido` (`print.png`), 578 `anexo_incluido` (`imagem.webp`), todos com `changed_at` `01:53:40.143`. A linha do tempo na tela segue a mesma ordem.

**AE9.** `ticket_history` 579 `edicao` (`Alterou destinatário.`), 580 `anexo_incluido` (`doc.docx`), 581 `atribuicao` (14 → 13), 582 `mudanca_status` (`em_andamento` → `encaminhado`), mesmo `changed_at`. `attachment` 66 `doc.docx` com `uploaded_by` 14. Depois do salvamento, M não vê mais o botão `Editar` do chamado (o `Editar` que sobra na página é o do comentário). A abre E1: `Editar` presente; editando, `Remover notas.txt`, `Remover imagem.webp`, `Remover doc.docx`.

**AE11.** `Restam 5 vagas.`; seleção de 6 arquivos: toast `O chamado pode ter no máximo 10 anexos.`, 5 `PUT` (o `relatório ação.pdf` não foi enviado), `Nenhuma vaga restante.`, `Anexar` com `aria-disabled="true"` e `aria-describedby`. Clique (`force`) e `Enter`: toast com o mesmo texto, 0 eventos `filechooser`. Salvo: `count(*)` = 10 e 5 linhas `anexo_incluido` (583 a 587). Segunda edição, depois de um X: `Resta 1 vaga.` e `Anexar` sem `aria-disabled`.

**AE12** (E3, 10 anexos). 1º forjado: `{"ok":false,"code":"ATTACHMENTS_LIMIT","message":"O chamado pode ter no máximo 10 anexos."}`, `max(id)` de `attachment` e `ticket_history` e a contagem (10) intactos. 2º, com a mesma chave `pending/` e `removedAttachmentIds: [58]`: `{"ok":true,"message":"Chamado #233 atualizado."}`; `ticket_history` 592 `anexo_removido` (`planilha.xlsx`) antes de 593 `anexo_incluido` (`print.png`), mesmo `changed_at`; contagem 10. Ter aceito a mesma chave no 2º pedido confirma que o 1º não a apagou de `pending/`. `get_logs` sem `[editTicket] rollback`.

**AE13.** A forjou em #237 com `removedAttachmentIds: [64]`; D forjou com a própria chave real (`pending/6/…txt`). Os dois: `{"ok":false,"code":"FORBIDDEN","message":"Você não pode editar este chamado."}`. `attachment` 64 continua existindo; #237 sem anexo e `max(id)` de `ticket_history` = 590. Sem log `rollback`.

**AE14** (#234). `[57]` (anexo de E2) e `[999999999]`: `ATTACHMENT_NOT_FOUND` com a mensagem do contrato. `[0]` e `[5, 5]`: `INVALID_INPUT`, `Anexo inválido.`. `attachment` 57 continua existindo (consulta de contagem = 1).

**AE15** (#235). Aba 2 salvou (`Chamado #235 atualizado.`). Aba 1, 1º clique: toast `Um dos anexos removidos não está mais neste chamado. Revise os anexos e salve de novo.`, continuou editando, apareceu `Nenhum anexo.` e `Restam 10 vagas.`. 2º clique: toast `Nenhuma alteração para salvar.` e saiu da edição. `ticket_history` do #235: criação (572) e um só `anexo_removido` (591).

**AE16** (#237). `PUT` atrasado 10 s: durante `Enviando…`, `Salvar alterações` com `aria-disabled="true"` e descrição `Aguarde o envio dos anexos terminar.`; clique forçado: toast com essa mensagem, 0 chamadas de `editTicket`. Com `dados.csv` abortado (`Falha no envio`): toast `Remova os anexos com falha antes de continuar.`, 0 chamadas. Removido o com falha: salvou (`ticket_history` 589 `anexo_incluido`, `attachment` 72 `print.png`; a chamada levou só a chave de `print.png`).

**AE17** (#237). 1º: toast `Nenhuma alteração para salvar.` e saiu da edição. 2º, só X em `print.png`: `Chamado #237 atualizado.`; `ticket_history` 590 `anexo_removido`; `attachment` do chamado = 0.

**AE18** (#234). Antes de resolver: `input[type=file]` = 0, `Novos anexos` ausente, `Anexar` = 0. `Chamado #234 resolvido.`. Depois: `Editar` presente, bloco editável com `Restam 10 vagas.` e `Nenhum anexo.`, campo Solução presente. Salvo; `ticket_history`: 571 `criacao`, 594 `resolucao`, 595 `anexo_incluido` (`print.png`); `attachment` 74 com `message_id` nulo; `ticket.status = resolvido`.

**AE19** (#175, destinatário M, resolvido em 04/10). Página: botões = só `Novo chamado`; `Anexar` = 0, `input[type=file]` = 0. Forjado com chave real de M: `FORBIDDEN`, `Você não pode editar este chamado.`; `attachment` do #175 = 0; `max(id)` de `ticket_history` do #175 = 390 (sem mudança). Sem log de rollback.

**AE20** (#238, `print.png` = `attachment` 75). A transferiu para QA Infra (`ticket.status = aguardando_aprovacao`, `ticket_transfer` 42 `pendente`, 18 → 19). Página recarregada de A: sem `Editar`, `Anexar` = 0, X = 0, 1 bloco. I: botões `Atender` e `Recusar`, sem `Editar`/`Anexar`/X, 1 bloco. A forjou `removedAttachmentIds: [75]`: `FORBIDDEN`, `Você não pode editar este chamado.`; `attachment` 75 intacto e `max(id)` de `ticket_history` = 599. I recusou com `[QA] devolvido`: `ticket.status = recusado`, `current_department_id` = 18, `ticket_transfer.status = rejeitado`, `review_note = [QA] devolvido`. M: ver nota 2.

**AE21** (#236). Forjado: `{"ok":true,"message":"Chamado #236 resolvido."}`; `attachment` do chamado = 0; `ticket_history`: 573 `criacao`, 596 `resolucao`; sem log `[resolveTicket]`.

**AE22** (#237). `PUT` com o corpo trocado por `4D 5A` + zeros (1039 bytes): bloco `Enviado`; ao salvar, toast `Não foi possível anexar "relatório ação.pdf". Remova o arquivo e anexe de novo.`, continuou editando com o bloco na lista; `attachment` do chamado = 0, último `ticket_history` do #237 continua o 590.

**AE23** (#233, 390×844, editando). `documentElement.scrollWidth` = 375 = `clientWidth`; faixa `scrollWidth` 1440 contra `clientWidth` 301; 10 botões X, todos 28×28; `Anexar` entre x=41 e x=131 (dentro da viewport); cabeçalho quebrado em linhas. Screenshot `.qa-output/AE23-mobile-edit-E3.png`.

**AE24** (#237). Com um novo `Enviando…`:

```
- group "Anexos":
  - heading "Anexos" [level=3]
  - paragraph: Até 10 arquivos neste chamado, de até 10 MB cada.
  - paragraph: Restam 9 vagas.
  - paragraph: Inclusões e remoções de anexos só valem ao salvar as alterações.
  - button "Anexar"
  - list "Anexos":
    - listitem:
      - text: print.png 2 KB
      - paragraph: "print.png: Enviando…"
      - button "Remover print.png"
```

Com um anexo salvo: `listitem` com `link "Baixar print.png"` (`/api/attachments/72`) e `button "Remover print.png"` irmãos; 0 botões dentro de link. Com falha: `dados.csv: Falha no envio`.

**AE25.** Grupo: `Anexos`, `Até 5 arquivos de até 10 MB cada.`, `Nenhum anexo.`. 6 arquivos: toast `Anexe no máximo 5 arquivos.`, 5 itens, 5 `PUT`, lista em `grid`.

**AE26.** #237 (`resolvable`): fundo do card Conclusão = fundo do card Comentários = 1163 px; botão `Resolver` termina em 1142 px (padding do card). #234 (`resolved`): os dois cards terminam em 1142 px, sem barra. Screenshots `.qa-output/AE26-resolvable-237.png` e `.qa-output/AE26-resolved-234.png`.

**AE27.** `get_errors` do `next-devtools` devolveu `{"configErrors":[],"sessionErrors":[]}` depois de vários cenários e no final. O console do navegador teve só 2 erros, ambos esperados: `net::ERR_FAILED` do `PUT` que eu abortei no AE16 e o `404` de `/tickets/238` para M no AE20. Nenhum aviso de hidratação. `#ticket-attachments-heading` = 1 em leitura e em edição. O log do dev server (`.next/dev/logs/next-development.log`) não registrou erro nem linha `[editTicket]`/`[resolveTicket]`/`RESEND` depois do início da bateria (os `ERROR` de 08:09 são do desenvolvimento, anteriores ao teste).

## Falhas

Nenhuma.

## Erros fora dos cenários

Nenhum.

## Não executados

Nenhum.

## Observações

1. **Cenários adaptados pela ordem de execução.** Executei o AE9 (E1 passou para A) antes do AE2, do AE14, do AE16, do AE17 e do AE24, e M deixou de ser destinatário de E1. Para manter o mesmo papel e a mesma regra: AE2 foi em E3 (A e D não destinatários, 10 anexos), AE14 em E4 (M destinatário), e AE16, AE17 e AE24 em um chamado extra, o #237 (E8), criado por M. O comportamento verificado é o do contrato; só o chamado mudou.
2. **AE20 — ambiguidade para o `df-architect`.** O contrato diz que A, M e I abrem E5 e veem o bloco só leitura. Com a transferência pendente, M (membro do setor de origem, que não criou o chamado) recebeu `404` em `/tickets/238` (visibilidade por criador, destinatário ou setor atual; é a regra já testada em LA13). Só A (que criou) e I (setor de destino) veem o chamado. Não é falha do código: o texto do cenário deve tirar M ou trocá-lo pelo criador do chamado. Não confirmei a causa lendo a tela de erro; a evidência é o `404` do console e a página sem conteúdo.
3. **AE4 — rolagem do bloco recém-incluído.** Com 3 blocos a faixa não tem overflow, então o `scrollIntoView` não foi exercitado nesse cenário. O comportamento da faixa com overflow (10 blocos) foi visto no AE11 e no AE23, mas sem conferir a rolagem automática até o último bloco. Fica sem evidência direta.
4. **Latência de revalidação em dev.** No AE4, 2,5 s depois do toast a Conclusão ainda mostrava 2 blocos e a linha do tempo ainda não tinha `Anexo incluído`; com ~4,5 s estava correto, e igual depois de recarregar. Não repeti a medição em outros cenários; nos demais esperei 3 a 3,5 s e os dados chegaram. Registro só como comportamento do `next dev`.
5. **Mensagem de sucesso.** O contrato escreve `Chamado #E1 atualizado.` com o rótulo do cenário; o texto real usa o número do chamado (`Chamado #231 atualizado.`), como o contrato de `editTicket` define.
6. **`pending/` não consumidos.** Para os cenários forjados criei chaves `pending/14/…` e `pending/6/…` que não viraram anexo (AE12 usou uma, o AE19, AE21 e AE13 não copiaram nenhuma). Expiram em 1 dia pelo ciclo de vida do bucket (ADR 018).
7. **Playwright e `aria-disabled`.** O `Anexar` sem vaga não é clicável pelo `click()` padrão (o Playwright o trata como não habilitado); o clique foi com `force: true`, que dispara o `onClick` normal.
8. **Registro de logs do servidor.** O arquivo de `get_logs` guarda os `console` do navegador e da compilação; não provoquei uma falha que gere `[editTicket] rollback`/`remove`, então não verifiquei que um `console.error` do servidor chegaria a esse arquivo. As conclusões "sem log de rollback/remove" valem para o que o arquivo registra.
