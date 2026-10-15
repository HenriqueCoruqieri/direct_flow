# Relatório de testes — Linha do tempo resumida por ação

- **Data:** 2026-10-15
- **Contrato:** `docs/contracts/timeline-summary.md` (contexto: `docs/contracts/ticket-timeline-scroll.md`, `docs/contracts/qa-seed.md`)
- **Commit:** `5c38832` · alterações não comitadas: sim (`ticket-timeline.tsx`, `ticket-history.ts`, contratos e plano)
- **Ambiente:** `http://localhost:3000`, `next dev`, banco de desenvolvimento
- **Resultado:** 14 de 14 passaram · 0 falharam · 0 bloqueados · 0 não executados

## Pré-requisitos

- Dev server: `/login` respondeu 200.
- MCP `playwright`, `next-devtools` e `postgres` disponíveis (`execute_sql` respondeu).
- Usuários QA (Admin Suporte, Membro Suporte, Admin Infra) e o diretor existem e estão ativos (consulta a `users`). O diretor não foi usado: nenhum cenário exige.
- `RESEND_API_KEY` está preenchida. Nenhum cenário de SU1–SU14 dispara e-mail (as actions de chamado e de transferência não enviam e-mail), então nada ficou como não executado por isso.
- R2 configurado (`R2_*` preenchidas), então SU13 foi executado.
- Tags `[QA] Acesso` (id 10) e `[QA] Edição B` (id 23) ativas em QA Suporte.

## Dados criados (todos em QA Suporte)

| Chamado | Título                                                 | Papel no teste                            |
| ------- | ------------------------------------------------------ | ----------------------------------------- |
| #239    | `[QA] Resumo longo` (hoje `[QA] Resumo longo editado`) | `#T1`                                     |
| #240    | `[QA] Resumo resolução`                                | `#T2`, ao fim `resolvido`                 |
| #241    | `[QA] Resumo transferência`                            | `#T3`, ao fim em QA Infra, `em_andamento` |

## Cenários

| #    | Cenário                                                          | Papel | Status |
| ---- | ---------------------------------------------------------------- | ----- | ------ |
| SU1  | Assumir `#239`: 2 eventos na tela, sem `Mudança de status`       | A     | PASSOU |
| SU2  | Editar tag + destinatário: só `Edição` nova, 4 linhas no banco   | A     | PASSOU |
| SU3  | Atender: um `Mudança de status`                                  | M     | PASSOU |
| SU4  | Editar só a tag: só `Edição` (`Alterou tag.`), 5 eventos         | M     | PASSOU |
| SU5  | Resolver chamado da fila: `Abertura` + `Resolução`               | A     | PASSOU |
| SU6  | `[QA] Janela aberta` (maior id): 2 eventos, 3 linhas             | M     | PASSOU |
| SU7  | Transferência QA Suporte → QA Infra e aceite                     | A, I  | PASSOU |
| SU8  | Altura máxima ~3 eventos simples                                 | M     | PASSOU |
| SU9  | Região abre no fim, página não rola                              | M     | PASSOU |
| SU10 | Edição de título: +1 evento, rola sozinha, `section` estável     | M     | PASSOU |
| SU11 | Bases de Conclusão e Comentários alinhadas                       | M     | PASSOU |
| SU12 | 390×844: mesma altura, rola, abre no fim, sem rolagem horizontal | M     | PASSOU |
| SU13 | Edição só de anexos (R2 configurado): 1 evento `Anexo incluído`  | M     | PASSOU |
| SU14 | Sem erro no `next-devtools` nem no console                       | todos | PASSOU |

## Evidências por cenário

Consultas: `select id, event, changed_at, changed_by, note, ... from ticket_history where ticket_id = X order by changed_at, id`.

- **SU1** (`#239`): tela com `Abertura` e `Atribuição` (`QA Admin Suporte assumiu o chamado.`). Banco: ids 619 `criacao`, 622 `atribuicao`, 623 `mudanca_status` (`aberto`→`em_andamento`); 622 e 623 com `changed_at` `19:18:11+00` e `changed_by` 13 (A).
- **SU2**: toast `Chamado #239 atualizado.`; evento novo único `Edição` com `Alterou tag e destinatário.`, 3 eventos na tela. Banco: ids 624 `edicao`, 625 `mudanca_tag`, 626 `atribuicao` (13→14), 627 `mudanca_status` (`em_andamento`→`encaminhado`), todos em `19:18:43.738+00`, `changed_by` 13; 7 linhas no total. Detalhe do passo: a troca de destinatário exige o campo `Comentário` (ver Observações); o primeiro "Salvar" sem comentário não gravou nada (banco intacto) e o segundo, com comentário, passou.
- **SU3**: um evento novo `Mudança de status` (`Encaminhado` → `Em andamento`). Banco: id 628, `encaminhado`→`em_andamento`, `changed_by` 14.
- **SU4**: toast `Chamado #239 atualizado.`; evento novo `Edição` com `Alterou tag.`; 5 eventos na tela. Banco: ids 629 `edicao` e 630 `mudanca_tag` (`19:19:05.484+00`); 10 linhas no total.
- **SU5** (`#240`): tela `Abertura` e `Resolução` (`Resolveu o chamado.`), sem `Atribuição`; toast `Chamado #240 resolvido.`. Banco: 620 `criacao`, 632 `atribuicao` (`to_assignee_id` 13), 633 `resolucao` (`aberto`→`resolvido`); 632 e 633 em `19:19:50.43+00`, `changed_by` 13 (A).
- **SU6** (`#176`, o `[QA] Janela aberta` de maior id ainda `resolvido`): tela `Abertura` e `Resolução`. Banco: 391 `criacao`, 392 `atribuicao`, 393 `resolucao`; 392 e 393 em `2026-10-06 18:24:59.43+00`, mesmo autor (14). Só leitura.
- **SU7** (`#241`): tela de I com `Abertura`, `Transferência solicitada` (`QA Admin Suporte do setor QA Suporte encaminhou o chamado para a fila de QA Infra.`), `Transferência aprovada` (`QA Admin Infra do setor QA Infra aceitou o chamado e começou a atendê-lo.`). Banco: 621 `criacao`, 634 `transferencia_solicitada` (`aberto`→`aguardando_aprovacao`, dept 18→19, by 13), 635 `transferencia_aprovada` (`aguardando_aprovacao`→`em_andamento`, dept 18→19, `to_assignee_id` 15, by 15). `ticket_transfer` id 44: `status` `aprovado`, 18→19, `requested_by` 13, `reviewed_by` 15, `review_note` nula. `ticket`: `em_andamento`, `current_department_id` 19, `assigned_to` 15 (bate com a última linha de histórico).
- **SU8** (`#239`, 5 eventos): `li` simples que não é o último (`Abertura`, `Atribuição`, `Mudança de status`) = **h = 84px**; `clientHeight` = **248px**, dentro de `3h−20 = 232` a `4h−20 = 316`; `scrollHeight` 488 > 248. Classe usada: `max-h-62`.
- **SU9**: após recarregar, `scrollTop` 240 + `clientHeight` 248 = `scrollHeight` 488 (diferença 0); último evento (`Edição`, `Alterou tag.`) inteiro visível; `window.scrollY` = 0.
- **SU10**: antes 5 eventos (`sh` 488); depois 6 (`sh` 616, `scrollTop` 368, diferença 0, rolou sozinha); último `Edição` com `Alterou título.`; altura da `section` 330px antes e depois. Banco: uma linha nova, id 631 `edicao` (`Alterou título.`).
- **SU11** (1440×900, altura de página): Conclusão e Comentários terminam ambos em 1113px (Conclusão 727–1113 = 387px; Comentários 706–1113 = 407px; coluna esquerda 252–1113, direita 252–1113). `section` da linha do tempo: 330px.
- **SU12** (390×844): `max-h-62` (mesma classe), `clientHeight` 248, `scrollHeight` 656, aberta no fim (diferença 0, último visível), `documentElement.scrollWidth` 375 = `clientWidth` 375. Screenshot: `.qa-output/su12-mobile.png`.
- **SU13** (`#239`, M como destinatário, R2 configurado): evento novo único `Anexo incluído` com `qa-anexo-1.txt` na observação; a região continuou no fim. Banco: ids 636 a 639, todos `anexo_incluido`, mesmo `changed_at` `19:20:48.271+00` e `changed_by` 14; a nota do primeiro (menor id, 636) é a exibida. Ver Observações: foram anexados 4 arquivos (2 nomes, cada um duas vezes) por erro da própria bateria, o que não altera a conclusão. Os arquivos `qa-anexo-*.txt` ficaram anexados ao `#239` e em `.qa-output/`.
- **SU14**: `get_errors` do `next-devtools` devolveu `configErrors: []` e `sessionErrors: []` após cada etapa e ao final; o console do navegador teve 0 erros e 0 avisos (nenhum aviso de hidratação).

## Falhas

Nenhuma.

## Erros fora dos cenários

Nenhum.

## Não executados

Nenhum.

## Observações

1. **Preparação do contrato (passo 3 / SU2) omite o comentário obrigatório.** Trocar o destinatário na edição exige o campo `Comentário` ("Escreva um comentário para quem vai receber o chamado."). O contrato descreve só "tag e destinatário → Salvar alterações". Sem o comentário o formulário não salva. Foi preenchido `[QA] Repassando para o membro.` Sugestão ao `df-architect`: acrescentar o comentário na preparação e na bateria. Isso também grava um comentário no `#239`.
2. **Com o resumo, 3 eventos já rolam quando há `Edição`.** Em `#239` com 3 eventos (`Abertura` 84px, `Atribuição` 84px, `Edição` 108px) o conteúdo tem 276px contra `clientHeight` 248px, então a região rolou com apenas 3 eventos. É a aproximação aceita do risco 7 do contrato; não é falha. Com 2 eventos simples a região não rolou (148 = 148).
3. **`h` de um evento simples depende do conteúdo.** `Abertura` mede 84px (o contrato assume 5.25rem = 84px, confere) e a primeira `li` em 390px mede 104px (texto quebra linha). O `Edição` varia entre 108 e 128px. A faixa de SU8 foi avaliada com `h = 84`.
4. **SU6: o `[QA] Janela aberta` de maior id (`#176`) já está fora da janela de edição.** `resolved_at` = 2026-10-06 (9 dias atrás), embora ainda `resolvido` (o cron não rodou). O seed não recriou um chamado novo. Para SU6 (só leitura do histórico) isso não importa, mas o chamado não serve mais para os cenários de janela aberta de `ticket-edit-window`; é preciso rodar o seed de novo.
5. **SU13: duplicidade de anexos provocada pela bateria.** O seletor de arquivos foi acionado por duas vias (uma tentativa por `browser_run_code_unsafe` e depois `browser_file_upload`), o que anexou os 2 arquivos duas vezes (4 linhas em `attachment`, ids 80 a 83). O resumo se comportou como o contrato prevê (um evento, nome do primeiro arquivo). Não é defeito da aplicação, mas o contrato do SU13 prevê 2 linhas; aqui houve 4.
6. **Toast de SU13 não capturado.** Foi lido 700ms após o clique em "Salvar alterações" com anexos e ainda não havia toast; o evento aparece na linha do tempo logo depois. SU13 não exige toast.
7. **Precisão de `changed_at` do `Atribuição` de Assumir.** Os `changed_at` de Assumir (`19:18:11+00`) e de Resolver (`19:19:50.43+00`) vêm do mesmo instante nas linhas do grupo, sem divergência. Não afeta o resumo.
8. **E-mail.** `RESEND_API_KEY` preenchida, mas nenhuma ação testada envia e-mail; nenhum e-mail saiu.
9. **Login.** A troca de papel foi feita limpando os cookies da sessão e entrando de novo pelo `/login`, em vez do menu de saída.
