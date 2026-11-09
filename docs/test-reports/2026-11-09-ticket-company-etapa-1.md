# Relatório de testes — Empresa no chamado (Etapa 1)

- **Data:** 2026-11-09
- **Contrato:** `docs/contracts/ticket-company.md` (cenários T1–T12 da Etapa 1)
- **Commit:** `14ad0f4` · alterações não comitadas: sim
- **Ambiente:** `http://localhost:3000`, `next dev`, banco de desenvolvimento
- **Resultado:** 11 de 12 passaram · 0 falharam · 0 bloqueados · 1 não executado (T10). Reteste do autocompletar (seção "Reteste — autocompletar", ao fim): 16 de 17 verificações passaram e 1 falhou (T15); o T10 foi executado no reteste e passou Reteste 2 (autocompletar): T15 passou, 9 de 9 verificações passaram, 1 não reexecutada (rolagem, por falta de 8+ empresas ativas).

## Pré-requisitos

- Dev server: `/login` respondeu 200. MCP `postgres` respondeu `SELECT 1`.
- `ticket.company_id` existe e é nullable (`is_nullable = YES`).
- Seed QA: `[QA] Janela vencida` (maior id, #175) com `company_id = 1` (QA Alfa); `[QA] Janela aberta` (maior id, #284) com `company_id = 2` (QA Beta). As cópias antigas (#83, #84, #176, #283) ficaram sem empresa, como previsto (reaproveitamento por título).
- Contas: Diretor `diretorqa@gmail.com` (Diretoria), Administrador `cazalbe@gmail.com` (Suporte), Membro `rodalv@gmail.com` (Suporte). Uma tentativa de login por conta, todas entraram.
- Empresas ativas no banco: QA Alfa, QA Beta, Tabacaria Smoke. Inativas: QA Gama e as `[QA]` antigas.

## Cenários

| #   | Cenário                                                                                           | Papel                  | Status        |
| --- | ------------------------------------------------------------------------------------------------- | ---------------------- | ------------- |
| T1  | "Empresa" é o primeiro campo, acima de Título, com `Selecione a empresa`                          | Membro                 | PASSOU        |
| T2  | Opções = empresas ativas, em ordem de nome, com rótulo `Nome — CNPJ`; QA Gama e inativas ausentes | Membro                 | PASSOU        |
| T3  | Busca `beta`, `0001-95`, `ab.12c`                                                                 | Membro                 | PASSOU        |
| T4  | Enviar sem empresa: `Selecione a empresa.`, foco no campo, nada criado                            | Membro                 | PASSOU        |
| T5  | `[QA] Empresa Alfa` com QA Alfa: toast e `company_id` gravado                                     | Membro                 | PASSOU        |
| T6  | Detalhe do T5: Empresa acima de Tipo, nome e CNPJ menor abaixo                                    | Membro                 | PASSOU        |
| T7  | `[QA] Empresa Beta` com QA Beta; detalhe com CNPJ alfanumérico                                    | Membro                 | PASSOU        |
| T8  | Chamado anterior à migration mostra `—`                                                           | Administrador          | PASSOU        |
| T9  | Administrador cria `[QA] Empresa Admin`; Diretor só confere e cancela                             | Administrador, Diretor | PASSOU        |
| T10 | Empresa desativada durante o preenchimento                                                        | Diretor + Membro       | NÃO EXECUTADO |
| T11 | `[QA] Janela vencida` e `[QA] Janela aberta` mostram Alfa e Beta                                  | Diretor                | PASSOU        |
| T12 | Escolher empresa, Cancelar, reabrir: campo vazio                                                  | Membro                 | PASSOU        |

## Evidências

- **T1:** snapshot do diálogo (`.qa-output/page-2026-11-09T16-44-06-592Z.yml`): grupo "Empresa" com combobox `Selecione a empresa` vem antes de "Título".
- **T2:** opções lidas do listbox, nesta ordem: `QA Alfa — 12.345.678/0001-95`, `QA Beta — AB.12C.D34/0001-84`, `Tabacaria Smoke — 46.465.292/0001-39`. Consulta: `select id, trade_name, cnpj, is_active from company order by lower(trade_name), id` confere (ativas = ids 1, 2, 11). Mesma lista para Membro, Administrador e Diretor.
- **T3:** `beta` → só QA Beta; `0001-95` → só QA Alfa; `ab.12c` → só QA Beta. Extra: `12345678` (sem pontuação) → nenhuma opção, é o Risco 4 do contrato (comportamento documentado, não falha).
- **T4:** mensagem `Selecione a empresa.` exibida; `document.activeElement` é o combobox da Empresa (role combobox, texto `Selecione a empresa`); diálogo permaneceu aberto. `select count(*) from ticket where title like '[QA] Empresa%'` → 0.
- **T5:** toast `Chamado #285 criado.`. Consulta: `#285 | [QA] Empresa Alfa | company_id 1 | QA Alfa | ativa`.
- **T6:** `/tickets/285`: bloco "Empresa" com `QA Alfa` (14px) e `12.345.678/0001-95` (12px, cor `rgb(91, 103, 120)`); "Empresa" vem antes de "Tipo" (y 1092 contra 1160). Screenshot: `.qa-output/t6-detalhe-empresa.png`.
- **T7:** toast `Chamado #286 criado.`; consulta: `#286 | company_id 2 | QA Beta`; detalhe com `QA Beta` e `AB.12C.D34/0001-84`.
- **T8:** `/tickets/282` (Suporte, sem empresa, anterior à migration; consulta 4 o lista): "Empresa" com `—`, acima de "Tipo".
- **T9:** Administrador viu as mesmas opções e criou `#287 [QA] Empresa Admin` (toast `Chamado #287 criado.`; `company_id 1`, QA Alfa). Diretor abriu o diálogo, viu "Empresa" como primeiro campo e as mesmas 3 opções, e cancelou sem criar nada.
- **T11:** `/tickets/175` → `QA Alfa | 12.345.678/0001-95`; `/tickets/284` → `QA Beta | AB.12C.D34/0001-84`.
- **T12:** escolhida QA Beta (o campo mostrava `QA Beta — AB.12C.D34/0001-84`), Cancelar, reabrir: campo voltou a `Selecione a empresa`.
- **`get_errors` (next-devtools)** depois dos cenários: `configErrors: []`, `sessionErrors: []`.
- **Console do navegador:** 23 mensagens, 1 erro: 404 em `/tickets/283`, causado por navegação do próprio teste (chamado de outro setor, QA Suporte, acessado pelo Administrador do Suporte). É o comportamento esperado de acesso negado, não falha da feature.

Chamados `[QA]` criados pelo teste: #285 (Alfa), #286 (Beta), #287 (Admin Alfa). O #285 e o #286 ficaram sem destinatário, em "Aberto" na fila de Suporte.

## Falhas

Nenhuma.

## Erros fora dos cenários

Nenhum.

## Não executados

- **T10** (empresa desativada entre a abertura do diálogo e o envio): exige criar e depois desativar uma empresa `[QA] Empresa Temporária` em Cadastros → Empresas, e a instrução desta execução proíbe desativar empresas. O `INVALID_COMPANY` (campo, foco, `router.refresh()`, nenhum chamado criado) fica sem cobertura de navegador. Pode ser rodado numa execução que autorize isso, ou verificado pelo `df-debug` chamando `createTicket` com o id de QA Gama (id 3, inativa). **Executado no reteste do autocompletar, abaixo.**
- Fora do navegador, por contrato: `INVALID_INPUT` com `0`, `-1`, `"1"` ou ausente; `NO_ACTIVE_COMPANIES` (exigiria desativar todas as empresas).
- Etapas 2 e 3 não foram executadas, por pedido.

## Observações

- Nas contas fornecidas, o setor "Suporte" (id 14) não é o "QA Suporte" (id 18) dos contratos. Os chamados do seed (`Janela vencida`/`Janela aberta`) ficam em QA Suporte, então só o Diretor os abre. O T8 usou o #282 (Suporte, sem empresa), que cumpre a mesma função.
- Ao reabrir o diálogo depois de Cancelar (T12), o `innerText` do combobox de Empresa devolve vazio logo depois de selecionar (o nome acessível muda para o rótulo da opção). A tela mostra a seleção corretamente; só afeta como o teste lê o campo.
- A busca do combobox não casa CNPJ sem pontuação (`12345678`): Risco 4 do contrato, já conhecido (resolvido depois pelo autocompletar).

---

## Reteste — autocompletar

- **Data:** 2026-11-09
- **Contrato:** `docs/contracts/ticket-company.md` (campo revisado para autocompletar: T1–T4, T10, T12–T18; T5 reconferido)
- **Commit:** `f54af56` · alterações não comitadas: sim
- **Ambiente:** `next dev` em `http://localhost:3000`. Membro `rodalv@gmail.com` numa aba de contexto isolado; Diretor `diretorqa@gmail.com` na aba principal (permitiu o T10 com duas sessões). MCP `postgres` respondeu.
- **Resultado:** 13 cenários T (12 passaram, 1 falhou: T15) mais 4 verificações do reviewer (P1, P2, P4, P5, todas passaram). Total 16 de 17 passaram, 1 falhou, 0 bloqueados, 0 não executados.

### Cenários

| #   | Cenário                                                                                                                                         | Papel            | Status |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ------ |
| T1  | Primeiro campo "Empresa", texto vazio, placeholder `Buscar empresa…`                                                                            | Membro           | PASSOU |
| T2  | Ao focar, lista com todas as ativas, em ordem de nome, QA Gama e inativas ausentes                                                              | Membro           | PASSOU |
| T3  | `beta`, `0001-95`, `ab.12c`                                                                                                                     | Membro           | PASSOU |
| T4  | Enviar sem empresa: `Selecione a empresa.`, foco no campo, nada criado                                                                          | Membro           | PASSOU |
| T5  | Criar com QA Alfa (reconferência, pelo T18)                                                                                                     | Membro           | PASSOU |
| T10 | Empresa desativada entre escolher e enviar: `INVALID_COMPANY` no campo, campo vazio, nada criado; reenvio sem escolher → `Selecione a empresa.` | Diretor + Membro | PASSOU |
| T12 | Escolher, Cancelar, reabrir: campo vazio                                                                                                        | Membro           | PASSOU |
| T13 | `12345678` e `ab12cd34`                                                                                                                         | Membro           | PASSOU |
| T14 | `ALFA`, `qa alfa`, trecho sem acento                                                                                                            | Membro           | PASSOU |
| T15 | `zzz-nao-existe`: mensagem `Nenhuma empresa encontrada.` e nenhuma opção                                                                        | Membro           | FALHOU |
| T16 | Setas, Enter e Esc                                                                                                                              | Membro           | PASSOU |
| T17 | Digitar `alfa` sem escolher e enviar: `Selecione a empresa.`, nada criado                                                                       | Membro           | PASSOU |
| T18 | Escolher QA Alfa e enviar; nenhuma requisição enquanto digita                                                                                   | Membro           | PASSOU |
| P1  | Rolagem da lista no Dialog (roda e toque), fundo travado                                                                                        | Membro           | PASSOU |
| P2  | ARIA com a lista fechada; `role=status` do vazio                                                                                                | Membro           | PASSOU |
| P4  | `Combobox` compartilhado (Tag e Destinatário) com acento                                                                                        | Membro           | PASSOU |
| P5  | Lista abre sozinha ao abrir o diálogo (registrado nas Observações)                                                                              | Membro           | PASSOU |

P1, P2, P4 e P5 são os pontos 1, 2, 4 e 5 pedidos pelo reviewer; o ponto 3 é o T10.

### Falhas

#### T15 — busca sem resultado tira o foco do campo

- **Papel:** Membro (`rodalv@gmail.com`)
- **Passos:** 1. Abrir "Novo chamado". 2. Com o foco no campo Empresa, digitar `zzz-nao-existe` tecla a tecla (80 ms). 3. Ler o valor do campo e o elemento focado. 4. Apertar Backspace.
- **Esperado:** (T15) o campo mostra o que foi digitado, a lista mostra `Nenhuma empresa encontrada.` e o usuário continua digitando e apagando no campo.
- **Obtido:** a mensagem aparece (também em `role=status`), mas o campo guarda só `z`. No primeiro caractere sem resultado o foco sai do input e vai para o `listbox` (`document.activeElement` com role `listbox`, `data-slot=command-list`). Os caracteres seguintes se perdem e o Backspace não apaga. Reproduzido 3 vezes, também com `qa` seguido de `x` (o `x` entra, depois o foco sai). Só se recupera clicando no campo de novo. Não acontece nos combobox de Tag e Destinatário (o foco fica no input com a lista vazia).
- **Evidência:** `.qa-output/ac-2-empty-focuslost.png` (campo com `qax`, mensagem de vazio). `inputValue()` devolveu `z` depois de 14 teclas. `get_errors`: vazio.
- **Camada provável:** app (`app/_components/autocomplete.tsx`: ao trocar a lista de itens pelo `CommandEmpty`, o foco cai no `CommandList`; hipótese, não confirmada).
- **Dono:** `df-ui`

### Evidências dos demais

- **Consulta 1** (ativas antes das `[QA] Rolagem`): ids 1 `QA Alfa`, 2 `QA Beta`, 11 `Tabacaria Smoke`. Com as 9 `[QA] Rolagem` ativas, a lista tinha 12 opções, com `[QA] Rolagem 1…9` antes de `QA Alfa` (ordem por `lower(trade_name)`).
- **T1/P5:** ao abrir o diálogo o input já vem focado, com `aria-expanded=true`, placeholder `Buscar empresa…`, valor vazio e a lista aberta (`.qa-output/ac-1-abertura.png`). Ordem dos rótulos: Empresa, Título, Descrição, Tipo…
- **T3/T13/T14:** `beta` → só QA Beta; `0001-95` → só QA Alfa; `ab.12c` → só QA Beta; `12345678` → só QA Alfa; `ab12cd34` → só QA Beta; `ALFA` e `qa alfa` → só QA Alfa. Só espaços → lista inteira. `-` e `/` sozinhos → vazio (conforme o contrato). Não havia empresa ativa com acento no nome; o acento foi conferido na Tag `#fiscal_orientação` e no Destinatário `Álvaro Rodrigo` (P4), não no campo Empresa.
- **T4/T17:** `Selecione a empresa.` no campo (`aria-invalid=true`), com foco no input no T4; diálogo aberto; nenhum chamado novo com título `[QA] Empresa AC sem empresa` (a contagem de `[QA] Empresa%` ficou nos 3 chamados da primeira rodada).
- **T16:** `↓`, `↓`, `↑` → destaque em `[QA] Rolagem 3` e depois de volta em `[QA] Rolagem 2`; Enter preencheu `[QA] Rolagem 2 — 55.500.002/0001-31` e fechou a lista (`aria-expanded=false`). Reabrindo e apertando Esc: lista fechou, valor mantido, diálogo continuou aberto.
- **T18:** durante a digitação de `alfa` (150 ms por tecla), 0 requisições de rede. Toast `Chamado #288 criado.`. Consulta: `#288 | [QA] Empresa Autocompletar | company_id 1 | QA Alfa | ativa`.
- **T10:** o Membro escolheu `[QA] Rolagem 9` e preencheu o resto; o Diretor desativou a empresa em Cadastros (toast `Empresa desativada.`; consulta: `id 20, is_active false`); o Membro enviou. Resultado: `Esta empresa não está disponível. Escolha uma empresa ativa.` no campo, foco no input, campo vazio, diálogo aberto, sem toast; `select count(*) from ticket where title like '[QA] Empresa Temporaria%'` → 0. A lista recarregada tinha 11 opções, sem a Rolagem 9 (`.qa-output/ac-3-invalid-company.png`). Reenvio sem escolher: `Selecione a empresa.` e a mensagem anterior sumiu.
- **P1 (rolagem):** lista com 288 px de altura e 392 px de conteúdo (`overflow-y: auto`), dentro de um popover do diálogo. Roda do mouse: `scrollTop` foi até 104 (máximo) e voltou a 0 com a roda para cima; `window.scrollY`, o diálogo e o `main` ficaram em 0 e o `body` com `overflow: hidden`, mesmo rolando além do fim. Toque: emulado por CDP (`Input.dispatchTouchEvent`, deslize para cima), a lista rolou até 104, nada mais rolou e o diálogo permaneceu aberto. Não foi dispositivo real nem o modo de celular do DevTools.
- **P2 (ARIA):** com a lista fechada (depois de Enter ou Esc): `aria-expanded=false`, sem `aria-controls` e sem `aria-activedescendant`. Aberta, há `aria-controls`, e `aria-activedescendant` aparece ao navegar. Sem resultado, o `role=status` anuncia `Nenhuma empresa encontrada.`.
- **P4:** Tag: `orientacao` → `#fiscal_orientação`; `DUVIDA` e `duvida` → `#Dúvida_Sistema` e `#movimentacao_estoque_duvida`; `zzzz` → `Nenhum resultado.` com o foco no input. Destinatário: `alvaro` e `ÁLVARO` → `Álvaro Rodrigo`; `xyzq` → vazio. Sem regressão.
- **`get_errors` (next-devtools)** no fim: `configErrors: []`, `sessionErrors: []`. **Console do navegador** (aba do Membro): 2 mensagens, 0 erros, 0 avisos.

### Erros fora dos cenários

Nenhum.

### Não executados

Nenhum dos pedidos. Fora do escopo desta rodada: T6–T9 e T11 (não mudaram), responsivo 390×844 do diálogo, toque em dispositivo real.

### Observações

- **P5 (lista abre sozinha):** acontece, porque o Empresa é o primeiro campo e o diálogo o foca. A lista (9 de 12 opções visíveis) cobre os campos Título e Descrição até o usuário escolher, apertar Esc ou clicar fora. Não impede o uso, mas esconde o resto do formulário na abertura. Decisão de desenho para o `df-ui` e o usuário.
- A mensagem vermelha `Defina uma prioridade` aparece logo na abertura do diálogo, antes de qualquer envio (visível em `.qa-output/ac-1-abertura.png`). Não faz parte deste contrato; fica registrada para o `df-ui`.
- O T10 confirma `INVALID_COMPANY` em execução, o item que estava pendente no contrato.

### Dados criados

- Chamado #288 `[QA] Empresa Autocompletar` (QA Alfa, Suporte, fila). Nenhum outro chamado novo (T4, T10 e T17 não gravaram).
- Empresas `[QA] Rolagem 1` a `[QA] Rolagem 9` (ids 12 a 20, CNPJs `55500001000197` a `55500009000153`), todas desativadas ao final (consulta confirmou `is_active = false`). A Rolagem 9 foi desativada durante o T10; 1 a 8, no fim.

## Reteste 2 — autocompletar

- **Data:** 2026-11-09
- **Papel:** Diretor (Diretoria). Nada foi criado nem alterado; o envio vazio foi barrado pela validação.
- **Resultado:** 9 de 9 verificações passaram · 1 não reexecutada (rolagem com a roda do mouse)

| #               | Cenário                                                                                                                                                                     | Status          |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| T15a            | Foco no campo, "zzz-nao-existe" digitado inteiro: texto todo no campo, foco no input, Backspace apaga um caractere (`zzz-nao-exist`), "Nenhuma empresa encontrada." exibida | PASSOU          |
| T15b            | "qa" + "x": campo com `qax`, foco mantido, mensagem de vazio exibida; Ctrl+A + Backspace limpa e a lista volta                                                              | PASSOU          |
| Abertura        | Ao abrir "Novo chamado" o campo vem focado, `aria-expanded=false` e nenhuma lista aberta                                                                                    | PASSOU          |
| Abertura        | A lista abre ao clicar no campo, ao digitar e com seta para baixo                                                                                                           | PASSOU          |
| T16             | Seta para baixo + Enter escolhe a empresa (`QA Beta — AB.12C.D34/0001-84`) e fecha a lista                                                                                  | PASSOU          |
| Esc             | Esc fecha só a lista; o diálogo continua aberto (também em Tag e Responsável)                                                                                               | PASSOU          |
| Label           | Clicar no label "Empresa" foca o campo                                                                                                                                      | PASSOU          |
| T4              | Enviar sem empresa mostra "Selecione a empresa." e o foco vai para o campo (screenshot `.qa-output/retest2-t4.png`)                                                         | PASSOU          |
| Tag/Responsável | Abrem com 5 opções cada e Esc fecha só a lista                                                                                                                              | PASSOU          |
| Rolagem         | Roda do mouse na lista: não reexecutado, pois só há 3 empresas ativas (as "[QA] Rolagem" estão inativas e não foram reativadas)                                             | NÃO REEXECUTADO |

### Erros

`get_errors`: `configErrors` e `sessionErrors` vazios. Console do navegador: 0 erros e 0 avisos.

### Observações

- O texto "Nenhuma empresa encontrada." aparece duas vezes no DOM com a lista vazia (contagem 2). Pode ser um duplicado para leitor de tela. Só o `df-ui` consegue confirmar.
- Clicar no label também abre a lista, além de focar o campo. O pedido não diz se isso é esperado.
