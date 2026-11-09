# Relatório de testes — Empresa no chamado, Etapa 2 (edição e linha do tempo)

- **Data:** 2026-11-09
- **Contrato:** `docs/contracts/ticket-company.md` (Etapa 2, cenários E1–E14)
- **Commit:** `a6d6e5e` · alterações não comitadas: sim
- **Ambiente:** `http://localhost:3000`, `next dev`, banco de desenvolvimento
- **Resultado:** 13 de 14 passaram · 1 falhou (E9) · 0 bloqueados · 0 não executados
- **Após Reteste 1:** 14 de 14 passaram (E9 corrigido)

## Pré-requisitos

- Dev server respondeu 200 em `/login`; MCP `postgres`, `playwright` e `next-devtools` disponíveis.
- Migration 0023 aplicada (consultas abaixo):
  - `ticket_history` tem `from_company_id` e `to_company_id`.
  - `history_event` inclui `mudanca_empresa`.
  - As duas FKs `ticket_history_{from,to}_company_id_company_id_fk` têm `confdeltype = 'r'`.
- Contas: Diretor `diretorqa@gmail.com` (id 21), Administrador `cazalbe@gmail.com` (id 19, Suporte), Membro `rodalv@gmail.com` (id 18, Suporte). Sessões do diretor e do membro já estavam abertas no navegador; o administrador logou uma vez pelo `/login`. Nenhuma senha foi gravada aqui nem em arquivo.
- E-mail: não relevante à Etapa 2 (nenhum envio previsto).

## Cenários

| #   | Cenário                                                                               | Papel | Status |
| --- | ------------------------------------------------------------------------------------- | ----- | ------ |
| E1  | "Editar" em chamado com QA Alfa: campo de busca acima de "Tipo", preenchido, sem dica | M     | PASSOU |
| E2  | Trocar para QA Beta e salvar: toast, detalhe, nota e `mudanca_empresa`                | M     | PASSOU |
| E3  | Trocar empresa e título juntos: nota `... e título.`                                  | M     | PASSOU |
| E4  | Chamado sem empresa: dica, só título, `Selecione a empresa.`, nada gravado            | M     | PASSOU |
| E5  | No E4, escolher QA Alfa: nota `— → QA Alfa`, `from` nulo                              | M     | PASSOU |
| E6  | Empresa atual inativa: valor com `(inativa)`, primeira opção, dica                    | D + M | PASSOU |
| E7  | Só a descrição, mantendo a inativa: salva, sem `mudanca_empresa`                      | M     | PASSOU |
| E8  | Trocar a inativa por QA Alfa: salva; reabrir sem a inativa e sem dica                 | M     | PASSOU |
| E9  | Empresa desativada durante a edição (`INVALID_COMPANY`)                               | D + M | FALHOU |
| E10 | Salvar sem mudar: `Nenhuma alteração para salvar.`                                    | M     | PASSOU |
| E11 | Admin abre chamado cujo destinatário é M: sem "Editar"                                | A     | PASSOU |
| E12 | Abertura grava `criacao` com `to_company_id`                                          | M     | PASSOU |
| E13 | Linha do tempo resumida: uma entrada só, sem "Trocou a empresa…"                      | M     | PASSOU |
| E14 | Digitar `beta`, `↓`, Enter; Cancelar volta ao valor salvo                             | M     | PASSOU |

### Evidência dos cenários que passaram

Chamado #285 (QA Alfa, depois de assumido por M):

- **E1:** `get_snapshot` mostra, no card "Detalhes", `combobox "Empresa"` com `QA Alfa — 12.345.678/0001-95`, antes de "Tipo". Sem texto de dica. Screenshot `.qa-output/e1-edit.png`.
- **E14:** `beta` filtra para uma única opção `QA Beta — AB.12C.D34/0001-84` (`.qa-output/e14-list.png`); `↓` + Enter preenche o campo. Cancelar volta ao detalhe com `QA Alfa`, e ao reabrir "Editar" o campo mostra `QA Alfa — 12.345.678/0001-95`.
- **E10:** toast `Nenhuma alteração para salvar.`.
- **E2:** toast `Chamado #285 atualizado.`; detalhe `QA Beta` / `AB.12C.D34/0001-84`. Consulta 5:

```sql
select id, event, from_company_id, to_company_id, note from ticket_history where ticket_id = 285 order by changed_at, id;
```

| id  | event           | from | to  | note                                           |
| --- | --------------- | ---- | --- | ---------------------------------------------- |
| 770 | criacao         | —    | —   | — (anterior à Etapa 2, sem backfill: esperado) |
| 774 | atribuicao      | —    | —   | —                                              |
| 775 | mudanca_status  | —    | —   | —                                              |
| 778 | edicao          | —    | —   | Alterou empresa (QA Alfa → QA Beta).           |
| 779 | mudanca_empresa | 1    | 2   | —                                              |

- **E13:** no snapshot da linha do tempo existe um único item "Editou o chamado." com a nota `Alterou empresa (QA Alfa → QA Beta).`; nenhum texto "Trocou a empresa".
- **E3:** título para `[QA] Empresa Alfa editado` e empresa Beta → Alfa. Linhas 780 `edicao` com `Alterou empresa (QA Beta → QA Alfa) e título.` e 781 `mudanca_empresa` 2 → 1.
- **E4:** chamado #276 (`[QA]`, sem empresa, assumido por M). Campo vazio, dica `Este chamado não tem empresa. Escolha uma para salvar.`. Com só o título alterado e Salvar: `Selecione a empresa.` no campo; `ticket.title` continuou `[QA] Dest responsivo`; nenhuma linha nova de histórico além de 776/777.
- **E5:** QA Alfa escolhida; linhas 782 `edicao` `Alterou empresa (— → QA Alfa) e título.` e 783 `mudanca_empresa` from nulo, to 1.
- **E6:** chamado #289 `[QA] Empresa Inativa chamado` aberto por M com `[QA] Rolagem 1` (D a reativou antes), assumido, e a empresa desativada por D. "Editar": campo `[QA] Rolagem 1 — 55.500.001/0001-97 (inativa)`; opções na ordem `[QA] Rolagem 1 … (inativa)`, `[QA] Rolagem 2`, `[QA] Rolagem 3`, `QA Alfa`, `QA Beta`, `Tabacaria Smoke`; dica `A empresa atual está inativa. Você pode mantê-la, mas não poderá escolhê-la de novo depois de trocar.`. Criação (E12 também vale aqui): linha 784 `criacao` `to_company_id = 12`.
- **E7:** só a descrição alterada. 790 `edicao` `Alterou descrição.`; nenhuma `mudanca_empresa`; `ticket.company_id` continuou 12.
- **E8:** trocada por QA Alfa. 791 `edicao` `Alterou empresa ([QA] Rolagem 1 → QA Alfa).` e 792 `mudanca_empresa` 12 → 1. Ao reabrir "Editar": opções `[QA] Rolagem 2`, `[QA] Rolagem 3`, `QA Alfa`, `QA Beta`, `Tabacaria Smoke` (a inativa saiu); sem dica.
- **E11:** admin `cazalbe` em `/tickets/285` (destinatário Álvaro Rodrigo): botões `Novo chamado`, `Enviar para outro setor`, `Resolver`, `Comentar`; 0 botões "Editar".
- **E12:** chamado #290 `[QA] Empresa Histórico` com QA Beta: linha `criacao` com `from_company_id = null`, `to_company_id = 2` (e #289, criado com `[QA] Rolagem 1`, `to_company_id = 12`).

## Falhas

### #E9 — `INVALID_COMPANY` na edição (empresa desativada com o formulário aberto)

- **Papel:** M `rodalv@gmail.com` (edição) e D `diretorqa@gmail.com` (desativação em outra aba).
- **Passos (feitos duas vezes, #288 com `[QA] Rolagem 2` e #285 com `[QA] Rolagem 3`):** 1. M assume o chamado e abre "Editar". 2. M escolhe a `[QA] Rolagem N` ativa no campo Empresa. 3. D desativa essa empresa em Cadastros → Empresas. 4. M clica em "Salvar alterações".
- **Esperado:** contrato, E9 e seção "Domínio": erro `Esta empresa não está disponível. Escolha uma empresa ativa.` no campo, com foco; campo esvazia após o refresh (a atual não está nas opções, `hasStaleValue`); nada gravado. Pedido adicional do usuário: reenviar sem escolher → `Selecione a empresa.`.
- **Obtido:** a mensagem `Esta empresa não está disponível. Escolha uma empresa ativa.` aparece no campo (aria-invalid `true`), nada é gravado, mas:
  1. O campo **não esvazia**: depois do refresh ele volta a mostrar a empresa já salva (`QA Alfa — 12.345.678/0001-95`), com o erro ainda exibido, nas duas execuções. Amostras a cada 300 ms até 2,4 s: valor sempre `QA Alfa — …`, mensagem sempre presente.
  2. O foco **não está no campo** (`document.activeElement` é `BODY`).
  3. Como o campo não fica vazio, o caminho "reenviar sem escolher → `Selecione a empresa.`" não pôde ser exercido: reenviar com `QA Alfa` devolveu `Nenhuma alteração para salvar.` (o erro de empresa some, o campo continua válido).
- **Evidência:** `.qa-output/e9.png` e `.qa-output/e9b.png` (campo com `QA Alfa` e erro vermelho). Consultas pós-teste: `select company_id from ticket where id=288` → 1; `id=285` → 1; `max(ticket_history.id)` = 792 (nenhuma linha nova dos dois testes).
- **Camada provável:** app (provider de edição / `ticket-edit-company.tsx` + `ticket-edit-provider.tsx`: o `router.refresh()` parece redefinir o formulário para os `defaults` salvos e o `setError` com `shouldFocus` não mantém o foco). Lembrando que a atual é Alfa ativa e continua nas opções, então `hasStaleValue` não atua; é possível que a contradição seja do contrato (ver Observações).
- **Dono:** `df-ui` (com possível ajuste de contrato do `df-architect`).

## Erros fora dos cenários

- `get_errors` do `next-devtools` após a bateria: `{"configErrors":[],"sessionErrors":[]}`.
- Console do navegador: 0 erros e 0 avisos nas abas de teste, exceto 1 erro 404 esperado, quando o membro abriu `/registry/companies` por engano (a rota é de admin; resposta 404 é o comportamento de proteção).
- Log do dev server: aviso do `pg` sobre `sslmode` (pré-existente) e um `WARN [Better Auth]: Invalid password` às 00:35 que não corresponde a nenhuma das minhas tentativas (os três logins usados foram bem-sucedidos), portanto vem de outra origem.

## Não executados

Nenhum.

## Observações

1. **Contrato E9 e `hasStaleValue`.** O contrato fecha o esvaziamento do campo em `hasStaleValue` do `Autocomplete`, que só zera valor ausente das opções. Na edição, a empresa escolhida (inativa) sai da lista, mas depois do `refresh` o formulário reverteu para a empresa atual do chamado, que está nas opções. O contrato não prevê essa reversão. O `df-architect` deve decidir se o esperado é "campo vazio" (estado de erro) ou "campo volta ao valor salvo"; o texto da mensagem e a ausência de gravação estão corretos nos dois casos.
2. **Preparação.** O chamado "anterior à migration, sem empresa" usado no E4/E5 foi o `#276 [QA] Dest responsivo` (já era `[QA]`, criado pelo QA em teste anterior). Os chamados `#288` e `#289` também foram assumidos por M. A criação do `#285` é anterior à Etapa 2, por isso a linha `criacao` dele não tem `to_company_id` (sem backfill, como o contrato diz).
3. **Prioridade na abertura** vem travada pela tag (campo desabilitado); não afeta a Etapa 2.

## Dados alterados

| Dado                                                 | Alteração                                                                                                                          |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Empresas `[QA] Rolagem 1`, `2`, `3` (ids 12, 13, 14) | reativadas (D) e **desativadas de novo** no fim; as demais empresas não foram tocadas                                              |
| #285 `[QA] Empresa Alfa`                             | assumido por M; título para `[QA] Empresa Alfa editado`; empresa Alfa → Beta → Alfa (histórico 778–781)                            |
| #276 `[QA] Dest responsivo`                          | assumido por M; título para `[QA] Dest responsivo editado`; empresa — → QA Alfa (histórico 776–777 de assunção, 782–783 da edição) |
| #288 `[QA] Empresa Autocompletar`                    | assumido por M (sem mudança de empresa, QA Alfa)                                                                                   |
| #289 `[QA] Empresa Inativa chamado`                  | **criado**; assumido; descrição alterada; empresa `[QA] Rolagem 1` → QA Alfa                                                       |
| #290 `[QA] Empresa Histórico`                        | **criado** com QA Beta, aberto na fila                                                                                             |
| `ticket_history`                                     | linhas 784 a 792 e as ids anteriores citadas acima                                                                                 |

Navegador deixado aberto (3 abas: membro, diretor, administrador) para encerrar a gravação.

## Reteste 1

Após a correção do E9 (`ticket-edit-provider.tsx` e `ticket-edit-company.tsx`). Membro `rodalv@gmail.com` (edição) e Diretor `diretorqa@gmail.com` (reativação e desativação em outra aba). Nenhuma senha gravada.

| #   | Cenário                                                                                  | Papel | Status |
| --- | ---------------------------------------------------------------------------------------- | ----- | ------ |
| E9  | Empresa desativada durante a edição (`INVALID_COMPANY`)                                  | D + M | PASSOU |
| E1  | Campo preenchido com a empresa salva ao iniciar a edição; opção atual realçada com check | M     | PASSOU |
| E10 | Cancelar volta ao valor salvo                                                            | M     | PASSOU |
| E14 | Teclado: `Ctrl+A`, `alfa`, `↓`, Enter; Cancelar volta ao salvo                           | M     | PASSOU |
| E2  | Troca simples (Beta) grava nota e `mudanca_empresa`                                      | M     | PASSOU |
| E6  | Empresa atual inativa com `(inativa)`, primeira opção, dica, check nela                  | D + M | PASSOU |

### Evidência

- **E9 (chamado #285, `[QA] Rolagem 2` reativada pelo Diretor):** M escolheu `[QA] Rolagem 2`, D desativou, M salvou. Resultado: campo **vazio**, `aria-invalid=true`, mensagem `Esta empresa não está disponível. Escolha uma empresa ativa.`, foco **no combobox** (`document.activeElement` é o campo). Reenviar sem escolher: `Selecione a empresa.` e foco no campo. Lista de opções sem a Rolagem 2 (`QA Alfa`, `QA Beta`, `Tabacaria Smoke`). Escolhendo `QA Beta` e salvando: toast `Chamado #285 atualizado.`. Consulta antes do último salvamento: `ticket.company_id` = 1 e `max(ticket_history.id)` = 792 (nada gravado pela falha).
- **E2:** `select id, event, from_company_id, to_company_id, note from ticket_history where ticket_id = 285 and id > 792` devolveu 793 `edicao` `Alterou empresa (QA Alfa → QA Beta).` e 794 `mudanca_empresa` 1 → 2.
- **E1 / realce:** campo `QA Alfa — 12.345.678/0001-95`; na lista, `aria-selected=true` e check visível (opacidade 1) só em `QA Alfa`, os demais 0.
- **E10/E14:** `Ctrl+A` + `alfa` filtra para uma opção, `↓` + Enter preenche; Cancelar e reabrir mostram `QA Beta — AB.12C.D34/0001-84` (valor salvo). Sem `Ctrl+A`, o texto digitado se acrescenta ao valor existente (comportamento normal do input, anotado só como detalhe).
- **E6 (chamado #289):** D reativou `[QA] Rolagem 3`; M trocou #289 para ela (795 `edicao` `Alterou empresa (QA Alfa → [QA] Rolagem 3).`, 796 `mudanca_empresa` 1 → 14); D desativou. Em "Editar": `[QA] Rolagem 3 — 55.500.003/0001-86 (inativa)`, primeira opção, com `aria-selected=true` e check; dica `A empresa atual está inativa…` presente.
- `get_errors`: `{"configErrors":[],"sessionErrors":[]}`. Console do navegador: 0 erros e 0 avisos.

### Dados alterados no reteste

| Dado                                                | Alteração                                                                            |
| --------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `[QA] Rolagem 2` (id 13) e `[QA] Rolagem 3` (id 14) | reativadas e **desativadas de novo**; consulta final: nenhuma `[QA] Rolagem *` ativa |
| #285                                                | empresa QA Alfa → QA Beta (histórico 793–794); agora com QA Beta                     |
| #289                                                | empresa QA Alfa → `[QA] Rolagem 3` (inativa) (histórico 795–796)                     |
