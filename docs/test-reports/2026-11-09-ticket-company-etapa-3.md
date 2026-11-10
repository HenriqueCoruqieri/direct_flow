# Relatório de testes — Empresa no chamado, Etapa 3

- **Data:** 2026-11-09
- **Contrato:** `docs/contracts/ticket-company.md` (Etapa 3, L1–L14)
- **Commit:** `7077354` · alterações não comitadas: sim
- **Ambiente:** `http://localhost:3000`, `next dev`, banco de desenvolvimento
- **Resultado:** 13 de 14 passaram · 1 falhou (L7: reteste 2 resolveu Administrador e Diretor em 1280 e 1366; resta só o pior caso com tags longas, em 1280 para Administrador na aba "Todos" e para Membro) · 0 bloqueados · 0 não executados

## Pré-requisitos

- Dev server no ar, MCP `playwright`, `next-devtools` e `postgres` respondendo.
- Contas conferidas no banco (leitura): Diretor (id 21, Diretoria), Administrador (id 19, Suporte), Membro (id 18, Suporte), todos ativos. A senha foi usada só para logar e não está registrada.
- Verificação de `RESEND_API_KEY` **não feita**: o `.env` não foi lido, por pedido. Nenhum cenário da Etapa 3 envia e-mail.
- Os testes de L5 e L10 usaram a sessão do Diretor que já estava aberta no navegador (sem novo login).

## Cenários

| #   | Cenário                                                                           | Papel      | Status                                 |
| --- | --------------------------------------------------------------------------------- | ---------- | -------------------------------------- |
| L1  | Coluna "Empresa" depois de "Título"; `QA Alfa` com `…/0001-95`                    | A          | PASSOU                                 |
| L2  | `QA Beta` com `…/0001-84`                                                         | A          | PASSOU                                 |
| L3  | Chamado sem empresa mostra `—`                                                    | A          | PASSOU                                 |
| L4  | Nenhum "Enviar" na Fila; "Assumir" nas linhas sem destinatário                    | A          | PASSOU                                 |
| L5  | `/queue?setor=14`: sem "Enviar", coluna "Empresa" presente                        | D          | PASSOU                                 |
| L6  | `/tickets`: coluna "Empresa" depois de "Título", mesmo formato, `—`               | M          | PASSOU                                 |
| L7  | Sem "Tipo" visível, filtro de Tipo funciona, sem rolagem horizontal no caso médio | A, D (e M) | FALHOU (1280)                          |
| L8  | "Enviar" no cabeçalho, diálogo, envio a M, toast, destinatário = M                | A          | PASSOU                                 |
| L9  | Segundo envio sem recarregar; `Destinatário atual`; M fora da lista               | A          | PASSOU                                 |
| L10 | D vê "Enviar" em chamado de outro setor; lista = pessoas do setor do chamado      | D          | PASSOU                                 |
| L11 | Membro não vê "Enviar"                                                            | M          | PASSOU                                 |
| L12 | Sem "Enviar" em chamado resolvido ou com transferência pendente                   | A          | PASSOU                                 |
| L13 | Sem "Enviar" em chamado de A que está em outro setor                              | A          | PASSOU (com ressalva, ver Observações) |
| L14 | "Enviar" some durante a edição e volta ao cancelar                                | A          | PASSOU                                 |

### Evidências dos que passaram

- **L1–L3** (A, `/queue?tab=all&periodo=todos`, 40 linhas): cabeçalhos `#, Título, Empresa, Tag, Status, Aberto em, Prioridade, SLA, Ações`. #288 `QA Alfa | …/0001-95`, #290 `QA Beta | …/0001-84`, #282 `—`. Na célula: nome em `font-medium truncate` com `title="QA Alfa"`; CNPJ em `text-xs text-muted-foreground tabular-nums` (12px contra 14px) com `title="12.345.678/0001-95"`. Empresa `[QA] Rolagem 3` mostra `…/0001-86` (title `55.500.003/0001-86`). Os CNPJs batem com o banco (`company_id` 1 = QA Alfa, 2 = QA Beta).
- **L4:** zero botões "Enviar" na página; "Assumir" só em #290, #287 e #286, as três sem destinatário (aba "Em aberto" = 3).
- **L5:** D em `/queue?setor=14`, 0 "Enviar", coluna "Empresa" presente. D não vê "Assumir" nas linhas do outro setor (comportamento fora do contrato desta etapa).
- **L6:** M, 9 linhas em `/tickets`; cabeçalhos `#, Título, Empresa, Tag, Setor atual, Status, …`; `QA Alfa | …/0001-95`, `QA Beta | …/0001-84`, `—` nos 6 sem empresa; `title` com o CNPJ completo (`AB.12C.D34/0001-84`, alfanumérico).
- **L7 (parte passou):** nenhuma tabela mostra "Tipo" em `/queue` e `/tickets`. Filtro de Tipo: D em `/queue?setor=14&tab=all`, "Incidente" → 3 linhas (consulta: 3 incidentes no setor 14); M em `/tickets`, "Solicitação" → 2 linhas (consulta: 2 solicitações entre os 9). Na Fila, "Aprovações" não foi medida (fora dos cenários L1–L14).
- **L8:** cabeçalho de #290: `[QA] Empresa Histórico`, `Assumir`, `Enviar` (nessa ordem). Diálogo `Enviar chamado #290`; escolhido Álvaro Rodrigo (M), comentário `[QA] Enviando pelo detalhe.`; toast `Chamado #290 enviado para Álvaro Rodrigo.`; diálogo fechou.
- **L9:** sem recarregar, "Enviar" reapareceu (agora sem "Assumir"); o diálogo exibiu `Destinatário atual: Álvaro Rodrigo.`; opções `Carlos Alberto Jr` e `Marcelo Oliveira` (Álvaro fora). Enviado a Marcelo, comentário `[QA] Segundo envio sem recarregar.`; toast `Chamado #290 enviado para Marcelo Oliveira.`, sem conflito. A `key` de remontagem funcionou.
  Banco, `select … from ticket_history where ticket_id = 290 order by id desc limit 4`: `atribuicao` null→18, `mudanca_status` aberto→encaminhado, `atribuicao` 18→11 (ids 809–811). `ticket`: status `encaminhado`, `assigned_to` = 11.
- **L10:** D (Diretoria) em #290 (Suporte): "Enviar" presente; opções = Carlos Alberto Jr, Marcelo Oliveira, Álvaro Rodrigo. Consulta `select … from users where department_id = 14` devolve exatamente esses três, todos ativos. A lista é do setor do chamado, não do ator. Diálogo fechado sem enviar.
- **L11:** M em #285, #289 (atribuídos a M) e #290 (de outro): 0 "Enviar".
- **L12:** A em #257 (resolvido), #278 (resolvido), #274 e #275 (aguardando aprovação, transferência pendente): 0 "Enviar".
- **L13:** A em #273 (aberto por A, setor Diretoria, resolvido) e #274 e #275 (aberto por A, setor 15, pendente): 0 "Enviar". Ressalva nas Observações.
- **L14:** A assumiu #286 (toast `Você assumiu o chamado #286.`). Botões antes de editar: `Enviar`, `Editar`, `Enviar para outro setor`. Em edição: `Cancelar`, `Salvar alterações`, `Enviar para outro setor`; 0 "Enviar o chamado". Depois de Cancelar: `Enviar`, `Editar`, `Enviar para outro setor`. Screenshot `.qa-output/l14-edit.png`.

## Falhas

### #L7 — Tabela sem rolagem horizontal no caso médio, em 1280 × 800

- **Papel:** A (`cazalbe@gmail.com`), também medido com D e M
- **Passos:** 1. Viewport 1280 × 800. 2. Abrir `/queue` e `/tickets` como A. 3. Comparar `scrollWidth` e `clientWidth` do contêiner da tabela.
- **Esperado:** "No caso médio, a área da tabela não rola na horizontal (`scrollWidth <= clientWidth`)", em 1366 e 1280 (contrato, L7 e Risco 6).
- **Obtido:** com dados comuns (tag `#Dúvida_Sistema` ou `#fiscal_orientação`, status curto), a tabela passa por pouco em 1280:
  - `/queue` (A, 3 linhas, com "Assumir"): tabela 1004 px para 998 px (+6 px).
  - `/tickets` (A, 3 linhas, "Setor atual" e SLA "Expirado -27d 16h"): 1031 px para 998 px (+33 px).
  - Em 1366 esses dois casos cabem (1084 px = 1084 px; sem rolagem). A página inteira nunca rola (`documentElement.scrollWidth <= innerWidth`); só o contêiner da tabela.
  - D em `/queue?setor=14` (3 linhas, sem "Assumir") cabe nos dois tamanhos (998 = 998 em 1280; 1084 = 1084 em 1366).
- **Pior caso (registrado, não conta como falha):**

  | Tela                                     | Dados                                             | 1366 (tabela / disponível) | 1280 (tabela / disponível) |
  | ---------------------------------------- | ------------------------------------------------- | -------------------------- | -------------------------- |
  | `/queue?tab=all` (A, 40 linhas)          | tags longas (`#fiscal_mudanca_regime_tributario`) | 1228 / 1069                | 1228 / 983                 |
  | `/queue?setor=14&tab=all` (D, 40 linhas) | idem                                              | 1157 / 1069                | 1157 / 983                 |
  | `/tickets` (M, 9 linhas)                 | tag longa + empresa `[QA] Rolagem 3`              | 1205 / 1069                | 1205 / 983                 |

  A coluna "Tag" chega a 272 px nessas telas e é a que mais pesa.

- **Evidência:** medições por `getBoundingClientRect`/`scrollWidth` no contêiner pai de `table`; screenshots `.qa-output/l7-1280-tickets.png` e `.qa-output/l7-1280-queue.png`.
- **Camada provável:** app (largura das colunas da tabela)
- **Dono:** `df-ui`

A classificação como "caso médio" é julgamento meu: os dois conjuntos medidos (3 linhas) não têm título, nome ou tag longos nem status "Aguardando aprovação". Se o `df-architect`/usuário considerar esses dados já pior caso, L7 passa e o resultado vira 14 de 14.

## Erros fora dos cenários

- `get_errors` (next-devtools) vazio no início, depois de L10, depois de L14 e no fim: `configErrors: []`, `sessionErrors: []`.
- Console do navegador: 93 mensagens, 1 erro: `404` de `GET /tickets/248`, provocado pelo teste de L12 (A abriu um chamado que não pode ver). Esperado, não é defeito.
- Nenhum erro de hydration. Não li `get_logs`.

## Não executados

Nenhum. Fora dos 14 cenários e não testado: "Aprovações" manter a coluna "Tipo" visível (citado no pedido, sem cenário L); layout responsivo em 390 × 844.

## Observações

- **L13 sem isolamento.** Não existe chamado de A, aberto e sem transferência pendente, em outro setor. #273 está resolvido e #274/#275 têm transferência pendente, então "sem Enviar" também seria explicado por L12. O caso "A é administrador do setor errado" ficou sem prova isolada (o único isolado é L10, que mostra o oposto para Diretor). Sugestão: criar um chamado QA aberto em outro setor, o que exige escrita fora do que foi autorizado.
- **L10** usou só o setor Suporte como "setor do chamado"; não foi testado um setor com outro conjunto de pessoas, mas a lista de Suporte (≠ setor do Diretor) já prova que não é o setor do ator.
- **D não vê "Assumir"** em chamados de outro setor na Fila, e em `/tickets` o Diretor está sem chamados (tabela vazia, L7 de D em `/tickets` não aplicável). Comportamento fora do contrato; sem divergência.
- **Aba "Todos"** da Fila de Suporte, com as tags reais (`#fiscal_*`, `#Impressora_fiscal_nao_fiscal`), rola na horizontal mesmo em 1366. É a tela mais usada e os dados de produção do setor parecem mais perto do "pior caso" do que do "caso médio"; vale o `df-architect` rever a definição de "caso médio" do L7.
- Com "Enviar" removido da linha, a coluna "Ações" só tem "Assumir" e mede 103 px quando há o botão; sem botão, mede 32 px. É o que faz a Fila do Diretor caber e a do Administrador passar 6 px em 1280.

## Dados alterados

Todos em chamados `[QA]`, criados pelo próprio teste anterior:

| Chamado                       | Ação                                                               | Estado inicial             | Estado final                                                                                                                     |
| ----------------------------- | ------------------------------------------------------------------ | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| #290 `[QA] Empresa Histórico` | Enviar (L8) para Álvaro Rodrigo, depois (L9) para Marcelo Oliveira | `aberto`, sem destinatário | `encaminhado`, destinatário Marcelo Oliveira (id 11); 3 linhas de histórico novas (`atribuicao`, `mudanca_status`, `atribuicao`) |
| #286 `[QA] Empresa Beta`      | Assumir por A (L14); abrir e cancelar a edição                     | `aberto`, sem destinatário | `em_andamento`, destinatário Carlos Alberto Jr (id 19)                                                                           |

Nenhuma empresa, conta ou transferência alterada. Nenhuma senha escrita.

## Reteste 1 — L7

Depois que a coluna Empresa passou a `max-w-32` (`app/(app)/_components/ticket-list-columns.tsx:128`). Medida: `scrollWidth` vs `clientWidth` do contêiner pai de `table`, viewport de 800 px de altura, mesmos papéis e telas da rodada anterior. Nada foi alterado no sistema. Os dados mudaram desde a rodada anterior (A em `/tickets` tem agora 4 linhas; D em `/queue?setor=14`, 1 linha), então a comparação linha a linha é aproximada.

| Tela                         | Papel | Largura | scrollWidth / clientWidth | Rola?     | Antes       |
| ---------------------------- | ----- | ------- | ------------------------- | --------- | ----------- |
| `/queue` (aba padrão)        | A     | 1280    | 1004 / 998                | sim (+6)  | 1004 / 998  |
| `/queue` (aba padrão)        | A     | 1366    | 1084 / 1084               | não       | 1084 / 1084 |
| `/tickets`                   | A     | 1280    | 1052 / 998                | sim (+54) | 1031 / 998  |
| `/tickets`                   | A     | 1366    | 1084 / 1084               | não       | 1084 / 1084 |
| `/queue?setor=14`            | D     | 1280    | 998 / 998                 | não       | 998 / 998   |
| `/queue?setor=14`            | D     | 1366    | 1084 / 1084               | não       | 1084 / 1084 |
| `/queue?tab=all` (pior caso) | A     | 1280    | 1228 / 983                | sim       | 1228 / 983  |
| `/queue?tab=all` (pior caso) | A     | 1366    | 1228 / 1069               | sim       | 1228 / 1069 |
| `/tickets` (pior caso)       | M     | 1280    | 1205 / 983                | sim       | 1205 / 983  |
| `/tickets` (pior caso)       | M     | 1366    | 1205 / 1069               | sim       | 1205 / 1069 |

- **Empresa:** o CNPJ aparece inteiro (`…/0001-95`, `…/0001-84`, `…/0001-86`) em todas as linhas medidas; nenhum elemento da célula tem `scrollWidth > clientWidth`. O nome fantasia carrega `title` (1 de 1 na Fila, 4 de 9 em `/tickets` do Membro, 7 de 40 em `?tab=all`). Os nomes atuais são curtos (`QA Alfa`, `QA Beta`, `[QA] Rolagem 3`), então o truncamento por `max-w-32` não foi exercitado com nome longo.
- **Efeito do `max-w-32`:** nenhum nas medidas. Todos os totais são idênticos aos da rodada anterior, ou seja, a coluna Empresa não era o que ditava a largura dessas telas.
- **Resultado L7:** continua FALHOU em 1280 para A (`/queue` +6 px, `/tickets` +54 px, este com 4 linhas em vez de 3). Passa em 1366 e para D. Pior caso (tags longas) é limitação conhecida e não conta. Camada provável: app; dono: `df-ui`.

## Reteste 2 — L7

Depois de `max-w-36 truncate` + `title` na coluna Tag (Fila, Meus chamados, Aprovações) e `px-3` no `DataTable` compartilhado. Medida: `scrollWidth` / `clientWidth` do contêiner pai de `table`, altura 800 px. Nada foi alterado no sistema. Papéis: Diretor (D, `diretorqa@gmail.com`), Administrador (A, `cazalbe@gmail.com`), Membro (M, `rodalv@gmail.com`).

| Tela                                    | Papel | Largura | scrollWidth / clientWidth | Rola?     | Reteste 1   |
| --------------------------------------- | ----- | ------- | ------------------------- | --------- | ----------- |
| `/queue` (aba padrão, 1 linha)          | A     | 1280    | 998 / 998                 | não       | 1004 / 998  |
| `/queue` (aba padrão)                   | A     | 1366    | 1084 / 1084               | não       | 1084 / 1084 |
| `/tickets` (4 linhas)                   | A     | 1280    | 998 / 998                 | não       | 1052 / 998  |
| `/tickets`                              | A     | 1366    | 1084 / 1084               | não       | 1084 / 1084 |
| `/queue?setor=14`                       | D     | 1280    | 998 / 998                 | não       | 998 / 998   |
| `/queue?setor=14`                       | D     | 1366    | 1084 / 1084               | não       | 1084 / 1084 |
| `/queue?tab=all` (pior caso, 40 linhas) | A     | 1280    | 1059 / 983                | sim (+76) | 1228 / 983  |
| `/queue?tab=all` (pior caso)            | A     | 1366    | 1069 / 1069               | não       | 1228 / 1069 |
| `/tickets` (pior caso)                  | M     | 1280    | 1037 / 983                | sim (+54) | 1205 / 983  |
| `/tickets` (pior caso)                  | M     | 1366    | 1069 / 1069               | não       | 1205 / 1069 |

- **Tag longa:** `#fiscal_mudanca_regime_tributario` aparece truncada (elemento com `scrollWidth > clientWidth`, reticências) e com `title` igual ao nome completo, na Fila `?tab=all` (A) e em `/tickets` (M), nos dois tamanhos.
- **Resultado L7:** o caso médio (A e D, telas com poucas linhas) agora PASSA em 1280 e 1366. O pior caso melhorou muito (de 1228/1205 para 1059/1037) e passa em 1366; em 1280 ainda rola (+76 px na Fila "Todos" de A, +54 px em `/tickets` de M). Pior caso já era tratado como limitação conhecida, então L7 passa nos critérios do caso médio; a decisão de aceitar o resíduo em 1280 é do `df-architect`.
- **Regressão visual (1280, Diretor, screenshots em `.qa-output/l7r2-*.png`):**

| Tela                 | Contêiner         | Linhas | Texto cortado nas células | Cabeçalho alinhado com a célula (left)                                                                |
| -------------------- | ----------------- | ------ | ------------------------- | ----------------------------------------------------------------------------------------------------- |
| Aprovações           | sem tabela        | 0      | n/a                       | n/a (estado vazio "Nenhum chamado aguardando aprovação", para A e D; tabela com dados não exercitada) |
| Cadastros → Empresas | 1003 / 998 (+5)   | 3      | nenhum                    | sim                                                                                                   |
| Cadastros → Pessoas  | 1287 / 983 (+304) | 13     | nenhum                    | sim                                                                                                   |
| Cadastros → Tags     | 1050 / 983 (+67)  | 36     | nenhum                    | sim                                                                                                   |

As três tabelas renderizam normalmente, com cabeçalhos alinhados e sem truncamento indevido. Observação: Pessoas e Tags rolam na horizontal em 1280 e a coluna "Ações" fica parcialmente cortada à direita na viewport (ex.: "Desa…" em Tags). Não há medida anterior dessas telas para comparar; pode ser anterior ao `px-3`, e L7 não cobre Cadastros. Registrado para o `df-ui` avaliar.
