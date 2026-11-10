# Relatório de testes — FormField genérico, Etapa 3b (edição do chamado)

- **Data:** 2026-11-10
- **Contrato:** `docs/contracts/form-field.md` (seção "Etapa 3b", J1–J24) e `docs/contracts/ticket-company.md` (E1–E14, com foco em E9)
- **Commit:** `098efc9` · alterações não comitadas: sim (a Etapa 3b inteira está no working tree)
- **Ambiente:** `http://localhost:3000`, `next dev`, banco de desenvolvimento
- **Resultado:** 19 de 24 passaram (J21 parcial) · 0 falharam · 0 bloqueados · 5 não executados (J8, J12, J13, J14, J20)

## Pré-requisitos

- Dev server 200; MCPs `playwright`, `next-devtools` e `postgres` respondem (`SELECT 1` ok).
- O `.env` não foi lido (instrução do pedido). A chave `RESEND_API_KEY` não foi conferida; nenhum cenário depende de e-mail.
- Sessões: Membro (Álvaro, `rodalv@gmail.com`) e Diretor (`diretorqa@gmail.com`) já estavam abertos em dois contextos do navegador. O Administrador (`cazalbe@gmail.com`) entrou numa terceira aba isolada, uma tentativa. Senhas não foram gravadas em lugar nenhum.

## Cenários

| #   | Cenário                                                                  | Papel | Status           |
| --- | ------------------------------------------------------------------------ | ----- | ---------------- |
| J1  | Entrar na edição: foco no título, defaults, sem `*`, botões              | M     | PASSOU           |
| J2  | a11y: `aria-required`, rótulos `for`/`id`, console                       | M     | PASSOU           |
| J3  | Título vazio / Descrição com 9: `*` aparece e some                       | M     | PASSOU           |
| J4  | Título `ab`: mensagem e foco                                             | M     | PASSOU           |
| J5  | Cancelar volta ao salvo, foco no "Editar"                                | M     | PASSOU           |
| J6  | Salvar título, descrição, tipo, tag, empresa                             | M     | PASSOU           |
| J7  | Salvar sem mudar: `Nenhuma alteração para salvar.`                       | M     | PASSOU           |
| J8  | Chamado antigo sem empresa                                               | M     | NÃO EXECUTADO    |
| J9  | Empresa atual inativa (`(inativa)`, dica, manter, trocar)                | M     | PASSOU           |
| J10 | **E9**: empresa desativada pelo Diretor antes de salvar                  | D + M | PASSOU           |
| J11 | Autocomplete: teclado, `Nenhuma empresa encontrada.`, Cancelar           | M     | PASSOU           |
| J12 | Tag atual indisponível                                                   | A / I | NÃO EXECUTADO    |
| J13 | `INVALID_TAG`                                                            | D + M | NÃO EXECUTADO    |
| J14 | `INVALID_ASSIGNEE`                                                       | D + M | NÃO EXECUTADO    |
| J15 | Sem campo Comentário se o destinatário não muda                          | M     | PASSOU           |
| J16 | Comentário obrigatório ao trocar destinatário (dica, `*`, erro, foco)    | M     | PASSOU           |
| J17 | Voltar o destinatário descarta o campo; reaparece vazio com `*`          | M     | PASSOU           |
| J18 | Passar ao admin com texto; `X5001`                                       | M     | PASSOU           |
| J19 | Solução na edição (vazia, `curta`, válida)                               | M     | PASSOU           |
| J20 | Legado resolvido sem solução                                             | M     | NÃO EXECUTADO    |
| J21 | Anexos na edição (incluir, remover, salvar)                              | M     | PASSOU (parcial) |
| J22 | Regressão do valor sem fallback (Empresas, Tags, Novo chamado, diálogos) | D / M | PASSOU           |
| J23 | Editar como destinatário (Administrador) e passar a outra pessoa         | A     | PASSOU           |
| J24 | Bateria inteira: sem erro, sem aviso, sem `*-field.tsx` antigos          | todos | PASSOU           |

## Evidência por cenário

**J1/J2.** Chamado #285, Membro, "Editar": foco inicial no input do Título (`document.activeElement`). Título, Descrição, Empresa (`QA Beta — AB.12C.D34/0001-84`), Tipo, Tag, Destinatário preenchidos com o valor salvo. Nenhum `*` nos campos do chamado (os dois `*` da página, "Solução" e "Comentário", pertencem aos formulários da barra lateral). `aria-required="true"` em Título, Descrição, Empresa, Tipo e Tag; ausente em Destinatário. Cada campo tem `labels[0]` correto (`Título`, `Descrição`, `Empresa`, `Tipo`, `Tag`, `Destinatário`). Botões durante a edição: "Cancelar", "Salvar alterações", "Anexar"; "Editar", "Enviar", "Assumir", "Atender" ausentes.

**J3/J4.** Título vazio e Descrição com 9 caracteres: `Título*` e `Descrição*` com `*`, nenhum `[id$="-error"]` antes de salvar. Corrigidos: os dois `*` somem. Título `ab` + Salvar: `O título precisa ter no mínimo 3 caracteres.`, `aria-invalid="true"`, foco no input do título.

**J5.** Título e descrição alterados + Cancelar: visualização com o título salvo, foco no botão "Editar". "Editar" de novo: valores salvos, 0 erros, sem `*`.

**J6.** #285: título, descrição, tipo Dúvida → Bug, tag `#Dúvida_Sistema` → `#Loja_Parada`, empresa `QA Beta` → `QA Alfa`. Toast `Chamado #285 atualizado.`. Banco: `ticket_history` 836 (`edicao`, nota `Alterou empresa (QA Beta → QA Alfa), título, descrição, tipo (Dúvida → Bug) e tag.`), 837 (`mudanca_empresa`, `from_company_id 2 → to_company_id 1`), 838 (`mudanca_tag`, 38 → 39).

**J7.** Salvar sem mudar: toast `Nenhuma alteração para salvar.`, sai da edição.

**J9.** #289 (empresa 14 `[QA] Rolagem 3`, inativa): campo `[QA] Rolagem 3 — 55.500.003/0001-86 (inativa)`, sem `*`, dica `A empresa atual está inativa. Você pode mantê-la, mas não poderá escolhê-la de novo depois de trocar.`. Salvar só a descrição: toast e empresa continua `[QA] Rolagem 3`. Trocar por `QA Alfa`: salva; ao reabrir e digitar `rolagem 3`, a lista fica vazia.

**J10 / E9 (ponto crítico).** Diretor reativou `[QA] Rolagem 1` (id 12) pela tela de Empresas. Membro recarregou #285, "Editar", escolheu `[QA] Rolagem 1` (sem `*`). Diretor desativou a empresa (`is_active = false` confirmado). Membro clicou "Salvar alterações": campo Empresa **vazio**, `Esta empresa não está disponível. Escolha uma empresa ativa.`, `*` de volta em `Empresa*`, `aria-invalid="true"`, `aria-describedby` apontando ao erro, foco no input da Empresa. Banco: `max(ticket_history.id)` 838 antes e depois, `ticket.company_id` continuou 1 (nada gravado). Salvar de novo sem escolher: `Selecione a empresa.`, campo vazio, foco mantido. Escolher `QA Beta` e salvar: `*` some, toast `Chamado #285 atualizado.`. Não testado o passo "Cancelar → visualização com a empresa gravada" logo depois do erro (o cenário foi continuado com o salvamento); o Cancelar com empresa gravada foi coberto em J11 (volta a `QA Beta`).

**J11.** `alfa`, `↓`, Enter: campo `QA Alfa — 12.345.678/0001-95`. `zzz-nao-existe`: `Nenhuma empresa encontrada.` visível, foco no combobox com o texto mantido. Cancelar: visualização com `QA Beta` (valor salvo).

**J15.** #285, só o título alterado: sem `textarea[name=handoffComment]` no formulário; salvou. `max(message.id)` 148 antes e depois (sem mensagem nova).

**J16.** Destinatário `Carlos Alberto Jr`: campo `Comentário*` (name `handoffComment`) abaixo do Destinatário, vazio, `aria-required="true"`, dica `O texto vira um comentário público no chamado.`. Salvar vazio: a dica dá lugar a `Escreva um comentário para quem vai receber o chamado.`, foco no textarea. Só espaços: mesmo erro e foco. Nada gravado.

**J17.** Texto `[QA] Texto descartado`, destinatário de volta a `Álvaro Rodrigo`: campo some (0 elementos), Salvar → `Nenhuma alteração para salvar.`. "Editar" → trocar de novo para Carlos: campo reaparece **vazio** com `Comentário*`. Nenhum aviso de controlado/não controlado no console.

**J18.** `X` × 5001: `O comentário precisa ter no máximo 5000 caracteres.`, `*` mantido. Texto válido: toast `Chamado #285 atualizado.`. Banco: `message` 149 (`user_id 18`, `visibility publica`, `[QA] passando ao admin J18`); `ticket_history` 847 (`atribuicao` 18 → 19), 848 (`mudanca_status` `em_andamento → encaminhado`); `ticket.status = encaminhado`, `assigned_to = 19`. O passo "devolver à fila" não foi feito pelo Membro (já não era o destinatário); a devolução foi feita pelo Administrador em J23.

**J19.** #292 (resolvido, solução de 25 caracteres): Solução preenchida sem `*`, `Resolvido em` e `Editável até` visíveis. Vazia: `*` em `Solução*`, ao salvar `Descreva a solução.` com foco. `curta`: `A solução precisa ter no mínimo 10 caracteres.`. Texto válido: toast e linha do tempo `Alterou solução.` (só a solução mudou).

**J21 (parcial).** #292, "Editar": área de anexos sem `*`, aceita extensões listadas, limite "até 10 arquivos, de até 10 MB cada". Arquivo `.bin` rejeitado com toast `big.bin: Tipo de arquivo não aceito. Envie PNG, JPEG, WebP, PDF, TXT, CSV, LOG, DOCX, XLSX, PPTX, ZIP ou RAR.` (o arquivo de 11 MB foi gerado com extensão errada, então o limite de tamanho **não** foi exercitado). `qa-3b.txt` (12 B) enviado e salvo: `attachment_history` 92 `inclusao`; remoção e salvamento: 93 `exclusao`, `attachment` do chamado volta a 0 linhas. Salvar com upload em andamento não testado (arquivo pequeno demais; coberto em H9 da 3a).

**J22.**

- Empresas (Diretor, `QA Beta`): "Editar" abre sem `*`; apagar Nome fantasia mostra `Nome fantasia*`; Cancelar e reabrir: `QA Beta`, sem `*`, sem erro (F11).
- Tags (Diretor, `#Bug_Critico`): mesmo comportamento (`Nome da tag*` ao esvaziar; reabrir traz `#Bug_Critico`, prioridade `Crítica`) (G3).
- Novo chamado (Membro): `*` em Empresa, Título, Descrição, Tipo, Prioridade, Tags. `#Loja_Parada` (sem prioridade): Prioridade com `*` e `aria-required`. `#Dúvida_Sistema` (fixa): `Baixa`, sem `*`, `aria-disabled="true"`, sem `aria-required`. Voltar a `#Loja_Parada`: `Nenhuma` e `*` de volta (H3). Nada criado.
- Diálogo "Enviar chamado #289 para outro setor": `Setor de destino*` e `Comentário*`; salvar vazio mostra `Selecione o setor de destino.` e `Escreva um comentário para quem vai receber o chamado.`. Fechado sem enviar.
- Resolver (#289, formulário da barra lateral): vazio → `Descreva a solução.` com foco; 9 caracteres → `A solução precisa ter no mínimo 10 caracteres.`; 10 caracteres → `*` some. Nada resolvido.
- Nada salvo em Empresas/Tags.

**J23.** Administrador (Carlos, destinatário do #285 após J18): cabeçalho tem "Enviar", "Atender", "Editar". Durante a edição: só "Cancelar", "Salvar alterações" (sem "Editar", "Atender", "Enviar"). Trocar para `Álvaro Rodrigo` e salvar vazio: `Escreva um comentário para quem vai receber o chamado.`; com texto: toast. Depois do salvamento a página mostra "Enviar", "Enviar para outro setor", "Resolver", "Comentar", sem "Editar" nem "Atender".

**J24.** `get_errors`: `configErrors: []`, `sessionErrors: []`. Console (`all`): 0 erros e 0 avisos. `find app -name "ticket-*-field.tsx" -o -name "handoff-comment-field.tsx"`: nenhum arquivo (os 8 invólucros aparecem como `D` no `git status`, a pasta `app/(app)/_components` não os tem mais). "Sem 'Editar' para quem não pode" (E11): confirmado em #293 (aberto, sem destinatário, Membro vê só "Assumir").

## Falhas

Nenhuma.

## Erros fora dos cenários

Nenhum.

## Não executados

- **J8** (chamado sem empresa, `*` + dica `Este chamado não tem empresa…`): nenhum chamado `[QA]` está sem empresa e criar um exige escrita direta no banco ou chamado legado. Dica e `*` por `hasStaleValue` ficaram sem cobertura nesta rodada.
- **J12** (tag atual indisponível): exigiria desativar uma tag usada. Tags em uso nos chamados `[QA]` são `#Dúvida_Sistema`, `#Loja_Parada` e `#internet_rede_vpn`, do setor Suporte (reais, não `[QA]`), fora do que o pedido autoriza alterar.
- **J13 / J14** (`INVALID_TAG`, `INVALID_ASSIGNEE`): mesma razão (desativar tag real ou conta de usuário).
- **J20** (legado resolvido sem solução): não há chamado assim entre os `[QA]`.
- **J21**, partes: limite de tamanho (>10 MB) e "salvar com upload em andamento" (ver acima).
- **J10**, passo final "Cancelar após o erro → visualização com a empresa gravada" (ver acima).

## Observações

- **Botões de ação durante a edição.** Contrato (J1) diz que "Editar", "Enviar" e "Assumir" ficam ausentes e, no pedido, Atender também. Observado: "Editar", "Enviar", "Assumir" e "Atender" somem do cabeçalho durante a edição, mas "Enviar para outro setor" e "Resolver" continuam na barra lateral/Conclusão, como nas Etapas anteriores. Se o contrato quis dizer que eles também somem, é divergência; como o comportamento é o da 3a (H17 "idêntico a antes"), registrado só como ambiguidade para o `df-architect`.
- **J21 e `attachments-in-edit.md`.** O contrato J21 cita `anexo_incluido`/`anexo_removido`, mas o próprio `attachments-in-edit.md` (linha 26) diz que a inclusão/remoção foi movida para `attachment_history` (`inclusao`/`exclusao`), que é o que o sistema grava. Texto de J21 está desatualizado.
- Dica da tag na abertura e demais telas fora da edição não foram reexaminadas além do que J22 pede.

## Dados alterados no fim

- `company` 12 `[QA] Rolagem 1`: reativada e desativada de novo (final: `is_active = false`). `company` 14 `[QA] Rolagem 3`: continua `false`. QA Alfa/QA Beta/Tabacaria Smoke: não alteradas.
- Chamado #285: título `[QA] Empresa Alfa editado 3b-J15`, tipo Bug, tag `#Loja_Parada`, empresa QA Beta (id 2), destinatário Álvaro, status `encaminhado`. Linhas novas: `ticket_history` 836–848 e as seguintes da devolução (J23); `message` 149 (`[QA] passando ao admin J18`) e a do J23 (`[QA] J23 devolvendo ao membro`).
- Chamado #289: descrição com sufixo ` (3b)`, empresa trocada de `[QA] Rolagem 3` (inativa) para `QA Alfa`.
- Chamado #292: solução agora `[QA] solução FormField 3b válida`; anexo `qa-3b.txt` incluído e removido (`attachment_history` 92 e 93).
- Nenhum chamado não-`[QA]`, conta, senha, Empresa ou Tag foi alterado. Nenhum chamado novo criado. Janelas do navegador deixadas abertas.
