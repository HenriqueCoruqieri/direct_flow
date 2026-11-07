# Relatório de testes — Cadastros → Empresas (Etapa 1)

- **Data:** 2026-11-06
- **Contrato:** `docs/contracts/registry-companies.md` (cenários C1–C28; E1–E13 são da Etapa 2 e não foram rodados)
- **Commit:** `4f34b66` · alterações não comitadas: sim (arquivos da Etapa 1)
- **Ambiente:** `http://localhost:3000`, `next dev`, banco de desenvolvimento
- **Resultado (geral, após o Reteste 2):** 28 de 28 passaram · 0 falharam · 0 bloqueados · 0 não executados. Na rodada inicial e no Reteste 1 passaram só C2 e C3 (login do Diretor recusado); o Reteste 2 cobriu C1 e C4–C28.

## Pré-requisitos

| Item                                                                            | Situação                                                                                                                                                                                                                                                               |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dev server                                                                      | OK (`/login` responde 200)                                                                                                                                                                                                                                             |
| MCP `playwright`, `next-devtools`, `postgres`                                   | OK (`select` responde)                                                                                                                                                                                                                                                 |
| Tabelas `company` e `company_contact`                                           | OK, existem (`to_regclass` devolve os dois nomes)                                                                                                                                                                                                                      |
| Seed QA de empresas (`QA Alfa`, `QA Beta`, `QA Gama`)                           | **FALTANDO**. `select count(*) from company` → 0; `company_contact` → 0. O seed QA de empresas não foi rodado (ou rodou sem inserir).                                                                                                                                  |
| Login do Diretor (`heoliveirac@gmail.com`)                                      | **FALHOU**. Usuário existe, ativo, `admin` da Diretoria (`is_board = true`), mas a única tentativa de login com a senha informada devolveu `INVALID_CREDENTIALS` ("E-mail ou senha inválidos."). Não insisti, conforme combinado. Risco 4 do contrato (senha trocada). |
| Login do Administrador (`cazalbe@gmail.com`, Suporte, `admin`, não é Diretoria) | OK                                                                                                                                                                                                                                                                     |
| Login do Membro (`rodalv@gmail.com`, Suporte, `member`)                         | OK                                                                                                                                                                                                                                                                     |
| `RESEND_API_KEY`                                                                | Não conferida (`.env` não lido, por instrução); nenhum cenário desta etapa envia e-mail                                                                                                                                                                                |

Sem login de Diretor, todo cenário que abre `/registry/companies` com sucesso é inexecutável, porque a página só abre para o Diretor. A ausência do seed também impediria C4–C7, C19 (parte inativa), C26 e C27.

## Cenários

| #   | Cenário                                                       | Papel                             | Status                                                                                                  |
| --- | ------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------- |
| C1  | Menu Cadastros com Empresas, página e `aria-current`          | Diretor                           | NÃO EXECUTADO (login do Diretor inválido)                                                               |
| C2  | Admin: menu sem Empresas; URL dá 404                          | Admin Suporte `cazalbe@gmail.com` | PASSOU                                                                                                  |
| C3  | Membro: sem Cadastros no menu; URL dá 404                     | Membro `rodalv@gmail.com`         | PASSOU                                                                                                  |
| C4  | Lista com filtro Status Ativo padrão                          | Diretor                           | NÃO EXECUTADO (login; seed ausente)                                                                     |
| C5  | Colunas da linha `QA Alfa`                                    | Diretor                           | NÃO EXECUTADO (login; seed ausente)                                                                     |
| C6  | Buscas (alfa, razão social, CNPJ com/sem máscara, `zzzz`)     | Diretor                           | NÃO EXECUTADO (login; seed ausente)                                                                     |
| C7  | Filtro UF e combinação com busca                              | Diretor                           | NÃO EXECUTADO (login; seed ausente)                                                                     |
| C8  | Dialog "Nova empresa": estrutura, placeholders                | Diretor                           | NÃO EXECUTADO (login)                                                                                   |
| C9  | Salvar vazio: erros dos obrigatórios                          | Diretor                           | NÃO EXECUTADO (login)                                                                                   |
| C10 | Máscara do CNPJ                                               | Diretor                           | NÃO EXECUTADO (login)                                                                                   |
| C11 | Validação de CNPJ                                             | Diretor                           | NÃO EXECUTADO (login)                                                                                   |
| C12 | Máscara e validação de telefone                               | Diretor                           | NÃO EXECUTADO (login)                                                                                   |
| C13 | Cursor da máscara                                             | Diretor                           | NÃO EXECUTADO (login)                                                                                   |
| C14 | CEP                                                           | Diretor                           | NÃO EXECUTADO (login)                                                                                   |
| C15 | Select UF (27 opções)                                         | Diretor                           | NÃO EXECUTADO (login)                                                                                   |
| C16 | Regras do expediente                                          | Diretor                           | NÃO EXECUTADO (login)                                                                                   |
| C17 | Criação completa                                              | Diretor                           | NÃO EXECUTADO (login)                                                                                   |
| C18 | Criação mínima                                                | Diretor                           | NÃO EXECUTADO (login)                                                                                   |
| C19 | CNPJ duplicado (ativa e inativa)                              | Diretor                           | NÃO EXECUTADO (login; seed ausente)                                                                     |
| C20 | Dialog em 1280×720 (só o corpo rola, rodapé não cobre o foco) | Diretor                           | NÃO EXECUTADO (login)                                                                                   |
| C21 | Dialog em 390×844                                             | Diretor                           | NÃO EXECUTADO (login)                                                                                   |
| C22 | Cancelar e Esc                                                | Diretor                           | NÃO EXECUTADO (login)                                                                                   |
| C23 | E-mail inválido e repetido                                    | Diretor                           | NÃO EXECUTADO (login; seed ausente para o e-mail da `QA Alfa`)                                          |
| C24 | Acessibilidade dos dias                                       | Diretor                           | NÃO EXECUTADO (login)                                                                                   |
| C25 | Criação com CNPJ alfanumérico                                 | Diretor                           | NÃO EXECUTADO (login)                                                                                   |
| C26 | Busca do CNPJ alfanumérico da `QA Beta`                       | Diretor                           | NÃO EXECUTADO (login; seed ausente)                                                                     |
| C27 | Duplicado alfanumérico em minúsculas                          | Diretor                           | NÃO EXECUTADO (login; seed ausente)                                                                     |
| C28 | Sem erro nem aviso de hidratação                              | qualquer                          | PARCIAL: `get_errors` vazio após C2 e C3; navegação do Diretor não ocorreu. Contado como não executado. |

Contagem: 2 passaram (C2, C3), 26 não executados (C1, C4–C28).

### Evidência dos cenários que passaram

- **C2:** como `cazalbe@gmail.com`, o menu Cadastros expandido mostra só `Pessoas` (`/registry/people`) e `Tags` (`/registry/tags`). `GET /registry/companies` pela URL devolveu HTTP 404, título "404: This page could not be found." (único erro de console é o recurso 404). `get_errors`: `configErrors: []`, `sessionErrors: []`.
- **C3:** como `rodalv@gmail.com`, o menu não tem nenhum item "Cadastros" (busca no snapshot sem resultado). `GET /registry/companies` pela URL devolveu HTTP 404. `get_errors` vazio.
- Logins: Diretor, uma tentativa, resposta da action `{"ok":false,"code":"INVALID_CREDENTIALS"}` (screenshot `.qa-output/login-director.png`). Admin e Membro entraram e foram redirecionados a `/dashboard`.

## Falhas

Nenhuma falha de comportamento. O impedimento é de pré-requisito (ver seção "Não executados").

## Erros fora dos cenários

Nenhum. `get_errors` do `next-devtools` sem erros de runtime, build ou hidratação nas páginas visitadas (login, dashboard, 404 de `/registry/companies` como Admin e como Membro).

## Não executados

- **C1, C8–C18, C20–C25 e C28 (parte do Diretor):** a senha informada para `heoliveirac@gmail.com` é recusada (`INVALID_CREDENTIALS`), e `/registry/companies` só abre para o Diretor. Ação do usuário: confirmar/redefinir a senha do Diretor (ela pode ter sido trocada pela interface; o contrato cita esse risco) e informar a correta.
- **C4, C5, C6, C7, C19 (segunda parte), C23 (e-mail repetido da `QA Alfa`), C26, C27:** além do login, dependem das empresas do seed QA, e o banco está com `company` e `company_contact` vazios. Ação do usuário: rodar o seed com `SEED_QA=true` (a Etapa 1 mudou `db/seed.ts`) e confirmar que `QA Alfa`, `QA Beta` e `QA Gama` aparecem em `select trade_name, cnpj, is_active from company`.
- **Cenários C20 e C21 (viewport 1280×720 e 390×844 do Dialog):** não rodados, mesmo motivo (login do Diretor).
- Nada foi criado nem alterado no banco por este teste.

## Observações

- A guarda de acesso (404 para admin de setor e membro, e item de menu ausente) está conforme o contrato: C2 e C3 passam.
- Os usuários de teste desta rodada são contas reais de desenvolvimento (Suporte), não as contas `qa.*@directflow.test` do procedimento padrão, por indicação do comando. O Admin dessa rodada é do setor Suporte e não é da Diretoria, que é o que C2 exige.
- Recomenda-se um reteste completo (C1–C28) depois de corrigir a senha do Diretor e rodar o seed QA.
- A janela do navegador foi deixada aberta, com a sessão do Membro.

## Reteste 1

- **Data:** 2026-11-06
- **Commit:** `4f34b66` · alterações não comitadas: sim
- **Resultado (geral, após o Reteste 2):** 28 de 28 passaram · 0 falharam · 0 bloqueados · 0 não executados. Na rodada inicial e no Reteste 1 passaram só C2 e C3 (login do Diretor recusado); o Reteste 2 cobriu C1 e C4–C28.

### Pré-requisitos

| Item                                                      | Situação                                                                                                                                                                                |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dev server, MCP `playwright`, `next-devtools`, `postgres` | OK                                                                                                                                                                                      |
| Seed QA de empresas                                       | **OK agora.** `select ... from company`: id 1 `QA Alfa` (`12345678000195`, SP, ativa), id 2 `QA Beta` (`AB12CD34000184`, RJ, ativa), id 3 `QA Gama` (`45678901000175`, MG, **inativa**) |
| Conta Diretor `diretorqa@gmail.com`                       | Existe no banco: id 21, nome "QA Diretor", `role = admin`, ativo, setor Diretoria (`is_board = true`), criado em 2026-11-06 23:27 UTC                                                   |
| Login do Diretor `diretorqa@gmail.com`                    | **FALHOU.** Uma tentativa, resposta da action `{"ok":false,"code":"INVALID_CREDENTIALS","message":"E-mail ou senha inválidos."}` (POST `/login` 200). Não insisti, conforme combinado.  |
| Login do Administrador `cazalbe@gmail.com`                | OK                                                                                                                                                                                      |
| Login do Membro `rodalv@gmail.com`                        | OK (sessão já aberta na janela)                                                                                                                                                         |

Hipótese para o login do Diretor (não verificável por mim: o role `df_readonly` não enxerga `account`): a linha em `users` foi criada, mas a credencial em `account` pode não existir ou ter senha diferente da informada (por exemplo, usuário criado por Cadastros → Pessoas, que não define senha até a redefinição). Fora do alcance do QA conferir.

### Cenários

| #      | Cenário                                                                                                    | Papel                     | Status                                                                                                             |
| ------ | ---------------------------------------------------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| C1     | Menu Cadastros com Empresas                                                                                | Diretor                   | NÃO EXECUTADO (login do Diretor recusado)                                                                          |
| C2     | Admin: menu sem Empresas; URL dá 404                                                                       | Admin `cazalbe@gmail.com` | PASSOU (reconferido)                                                                                               |
| C3     | Membro: sem Cadastros; URL dá 404                                                                          | Membro `rodalv@gmail.com` | PASSOU (reconferido)                                                                                               |
| C4–C27 | Lista, busca, filtros, Dialog, máscaras, validações, criações, duplicados, 1280×720, 390×844, alfanumérico | Diretor                   | NÃO EXECUTADO (login do Diretor recusado)                                                                          |
| C28    | Sem erro/aviso de hidratação                                                                               | qualquer                  | NÃO EXECUTADO para o Diretor; nas páginas visitadas (login, dashboard, 404 como Admin e Membro) `get_errors` vazio |

### Evidência

- **C2:** logado como `cazalbe@gmail.com` (Suporte, Administrador), o menu Cadastros expandido tem só os links `/registry/people` e `/registry/tags`. GET `/registry/companies` → HTTP 404 ("404: This page could not be found."). `get_errors`: `configErrors: []`, `sessionErrors: []`. O único erro de console é o recurso 404.
- **C3:** logado como `rodalv@gmail.com` (Suporte, Membro), o menu não tem "Cadastros"; GET `/registry/companies` → HTTP 404.
- **Login Diretor:** sem screenshot da tela de login com senha. Nenhum arquivo criado nesta rodada contém senha. O grep em `.qa-output/` ainda acha uma senha em três snapshots antigos (`page-2026-10-23T22-50-23-944Z.yml`, `page-2026-10-23T22-50-28-479Z.yml`, `page-2026-11-06T23-12-10-895Z.yml`), de rodadas anteriores; o QA não pode apagá-los, o usuário deve removê-los (a pasta está fora do git).

### Falhas

Nenhuma falha de comportamento da feature. O impedimento é de credencial (pré-requisito).

### Erros fora dos cenários

Nenhum.

### Não executados

- **C1, C4–C28 (parte do Diretor):** `diretorqa@gmail.com` recusou a senha informada (`INVALID_CREDENTIALS`) e `/registry/companies` só abre para o Diretor. O Dialog (1280×720 e 390×844), a máscara de telefone, o CNPJ alfanumérico em minúsculas e os duplicados dependem desse login. Ação do usuário: conferir/redefinir a senha de `diretorqa@gmail.com` (ou informar outra conta de Diretoria) e pedir novo reteste.
- Nada foi criado nem alterado no banco nesta rodada.

## Reteste 2

- **Data:** 2026-11-06
- **Commit:** `4f34b66` · alterações não comitadas: sim
- **Escopo:** C1 e C4–C28 (C2 e C3 já tinham passado; E1–E13 são da Etapa 2 e não foram rodados)
- **Resultado:** 26 de 26 passaram · 0 falharam · 0 bloqueados · 0 não executados. Somados a C2 e C3: 28 de 28.

### Pré-requisitos

| Item                                                                             | Situação                                                                                                                                                       |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dev server (`/login` 200), MCP `playwright`, `next-devtools`, `postgres`         | OK                                                                                                                                                             |
| Seed                                                                             | OK: `QA Alfa` (id 1, `12345678000195`, SP, ativa), `QA Beta` (id 2, `AB12CD34000184`, RJ, ativa), `QA Gama` (id 3, `45678901000175`, MG, inativa)              |
| Login do Diretor `diretorqa@gmail.com` ("QA Diretor", Diretoria · Administrador) | **OK**: uma tentativa, campo vazio antes de digitar, 11 caracteres, redirecionou a `/dashboard`. O navegador estava logado como Admin; foi feito logout antes. |

### Cenários

| #   | Cenário                                                                                                                                                                                                                                                                                                                                              | Papel   | Status |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------ |
| C1  | Menu Cadastros: Pessoas, Setores, Tags, Empresas, nessa ordem; `/registry/companies` com `aria-current="page"`, h1 "Empresas", botão "Nova empresa"                                                                                                                                                                                                  | Diretor | PASSOU |
| C4  | Filtros com contagem 1 e Ativo marcado; `QA Alfa` e `QA Beta` visíveis, `QA Gama` não; desmarcar Ativo mostra `QA Gama` com "Inativo"                                                                                                                                                                                                                | Diretor | PASSOU |
| C5  | Colunas Empresa (fantasia + razão social), CNPJ `12.345.678/0001-95` em `font-mono`, `São Paulo / SP`, responsável, Ativo, na ordem do contrato                                                                                                                                                                                                      | Diretor | PASSOU |
| C6  | Buscas `alfa`, `serviços de tec` (trecho da razão social da Beta), `12345678`, `12.345.678/0001-95`, `0001-95` acharam a empresa certa; `zzzz` mostrou "Nenhum resultado para os filtros aplicados."                                                                                                                                                 | Diretor | PASSOU |
| C7  | Grupo UF só com MG, RJ e SP (`MG — Minas Gerais`, `RJ — Rio de Janeiro`, `SP — São Paulo`); RJ mostra só `QA Beta`; RJ + busca `alfa` dá lista vazia                                                                                                                                                                                                 | Diretor | PASSOU |
| C8  | Dialog: título, subtítulo, 5 grupos (Identificação, Contatos, Endereço, Responsável, Expediente), sem botão "Buscar", sem seletor de tipo de telefone, placeholders do contrato                                                                                                                                                                      | Diretor | PASSOU |
| C9  | Salvar vazio: 13 erros nos obrigatórios com as mensagens do contrato; nenhum em Secundário, Complemento e Expediente; foco no CNPJ; `count(*) from company` continuou 3                                                                                                                                                                              | Diretor | PASSOU |
| C10 | CNPJ: `11.222.333/0001-81`; `!@#` e 15º caractere ignorados; colar mascarado dá o mesmo texto; `12abc34501dexy35` vira `12.ABC.345/01DE-35`                                                                                                                                                                                                          | Diretor | PASSOU |
| C11 | `CNPJ inválido.` para `…-82`, `12.ABC.345/01DE-36` e `00.000.000/0000-00`; 13 caracteres dá `O CNPJ precisa ter 14 caracteres.`                                                                                                                                                                                                                      | Diretor | PASSOU |
| C12 | `(11) 9123-2341`, depois `(11) 91232-3410`, Backspace volta a `(11) 9123-2341`, 12º dígito ignorado; `119123234` e `0191232341` dão `Telefone inválido. Informe DDD e número, com 10 ou 11 dígitos.`                                                                                                                                                 | Diretor | PASSOU |
| C13 | Cursor na posição 7 + `5` dá `(11) 91523-2341` com cursor em 8; Backspace no meio volta a `(11) 9123-2341`, cursor em 7; Backspace logo após o `-` apaga o dígito anterior ao hífen (`(11) 9122-341`, cursor 8); Delete sobre o `-` apaga o dígito à direita (`(11) 9123-341`, cursor 9). Nenhum salto para o fim, inclusive na troca fixo ↔ celular | Diretor | PASSOU |
| C14 | CEP `01310100` vira `01310-100`; caractere extra ignorado; 7 dígitos dá `O CEP precisa ter 8 dígitos.`                                                                                                                                                                                                                                               | Diretor | PASSOU |
| C15 | Select UF com 27 opções, de `AC — Acre` a `TO — Tocantins`, na ordem alfabética do nome                                                                                                                                                                                                                                                              | Diretor | PASSOU |
| C16 | (a) Seg sem horário: erros de abertura e fechamento; (b) 18:00 / 08:00: erro em "Às"; (c) dias desmarcados com horários: `Marque os dias de atendimento ou apague os horários.`; (d) vazio: sem erro                                                                                                                                                 | Diretor | PASSOU |
| C17 | `[QA] Empresa Completa` criada: toast "Empresa criada.", Dialog fechou, linha Ativo. Banco conferido (abaixo)                                                                                                                                                                                                                                        | Diretor | PASSOU |
| C18 | `[QA] Empresa Mínima` criada: toast, uma linha `primary`, opcionais nulos (abaixo)                                                                                                                                                                                                                                                                   | Diretor | PASSOU |
| C19 | CNPJ `11222333000181` dá "Já existe uma empresa com este CNPJ."; `45678901000175` dá "Já existe uma empresa inativa com este CNPJ. Reative-a em vez de cadastrar de novo."; nos dois: foco no CNPJ, Dialog aberto com os valores, 0 toasts, nada gravado                                                                                             | Diretor | PASSOU |
| C20 | 1280×720: dialog 16–704 px; só o corpo rola (área 101–639 px, 538 de 1164 px visíveis), cabeçalho e rodapé (639–704) fixos; Tab por 25 elementos, nenhum fora do corpo nem atrás do rodapé; no envio com Seg sem horário o foco foi ao primeiro inválido (`primaryPhone`, 354–386 px), visível                                                       | Diretor | PASSOU |
| C21 | 390×844: uma coluna (inputs com 295 px), sem rolagem horizontal (documento e corpo), rodapé visível (723–828), Cancelar e Salvar empresa alcançáveis, 25 elementos percorridos por Tab sem foco escondido. Screenshot: `.qa-output/companies-dialog-390.png`                                                                                         | Diretor | PASSOU |
| C22 | Cancelar fecha sem gravar e o Dialog reabre vazio; Esc também fecha e reabre vazio; nenhuma linha nova em `company`                                                                                                                                                                                                                                  | Diretor | PASSOU |
| C23 | E-mail `abc` dá `E-mail inválido.`, Dialog aberto; com o e-mail da `QA Alfa` criou `[QA] Email Repetido` (CNPJ de reserva `13579246000101`)                                                                                                                                                                                                          | Diretor | PASSOU |
| C24 | 7 botões de dia com `aria-label` do nome completo (Segunda-feira … Domingo) e `aria-pressed`/`data-state` coerentes (`true` após marcar Seg, `false`/`off` nos demais); os 13 asteriscos com `aria-hidden="true"`; obrigatórios com `aria-required="true"`                                                                                           | Diretor | PASSOU |
| C25 | CNPJ digitado em minúsculas `12abc34501de35`: campo mostra `12.ABC.345/01DE-35`; toast "Empresa criada."; coluna CNPJ `12.ABC.345/01DE-35`; buscas `12abc`, `12ABC34501DE35` e `12.ABC.345` acham a empresa                                                                                                                                          | Diretor | PASSOU |
| C26 | Busca `ab12c` e `AB.12C.D34` acharam `QA Beta`                                                                                                                                                                                                                                                                                                       | Diretor | PASSOU |
| C27 | CNPJ `ab12cd34000184` (minúsculas): campo mostra `AB.12C.D34/0001-84`; erro "Já existe uma empresa com este CNPJ."; nada gravado                                                                                                                                                                                                                     | Diretor | PASSOU |
| C28 | `get_errors`: `configErrors: []`, `sessionErrors: []` ao final. Console desta sessão (desde o login do Diretor): 0 erros, 0 avisos. Log do dev server sem aviso de hidratação                                                                                                                                                                        | Diretor | PASSOU |

### Evidência de banco

C17 (`select ... from company where cnpj = '11222333000181'`): id 4, `trade_name = '[QA] Empresa Completa'`, `email = 'completa@qa-teste.com'` (digitado `Completa@QA-Teste.com`, gravado em minúsculas), `cep = '01310100'`, `state = 'SP'`, `number = '1000A'`, `manager_phone = '11988887777'`, `business_days = {1,2,3,4,5}`, `opens_at = 08:00:00`, `closes_at = 18:00:00`, `complement = 'Sala 12'`, `notes = 'Atende em horário comercial'`, `is_active = true`. `company_contact` do id 4: `primary = 1133334444`, `secondary = 11987654321`.

C18 (`cnpj = '11444777000161'`): id 5, `complement`, `business_days`, `opens_at`, `closes_at` e `notes` nulos, ativa. `company_contact`: só `primary = 2133334444`.

C19 e C27: `select count(*) from company` = 5 depois das duas criações válidas e das três tentativas duplicadas, ou seja, as recusadas não gravaram. Elas consumiram os ids 6 a 8 da sequência (lacuna esperada em rollback).

C23: `select ... from company where email = 'contato@qa-alfa.test'` retornou id 1 (`QA Alfa`) e id 9 (`[QA] Email Repetido`, CNPJ `13579246000101`): e-mail não é único, conforme o contrato.

C25: `select ... where cnpj = '12ABC34501DE35'` retornou id 10, `[QA] Empresa Alfanumérica`, gravado em maiúsculas.

Estado final de `company`: 7 linhas (3 do seed intactas e os ids 4, 5, 9 e 10, criados pelo teste, prefixo `[QA]`, ativos). O seed não foi alterado.

### Falhas

Nenhuma.

### Erros fora dos cenários

Nenhum nesta rodada. O log do dev server tem, em horário anterior ao início do Reteste 2, `unhandledRejection: Error: Invalid element at key "email": expected a Zod schema` (linha 19 do log, 08:48 local) e avisos `Invalid password` das tentativas de login das rodadas anteriores; nenhuma entrada nova apareceu desde o login do Diretor. O console acumulado da sessão do navegador ainda lista 4 erros "404" de `/registry/companies`, que são os acessos propositais do Admin e do Membro (C2/C3) das rodadas anteriores.

### Não executados

Nenhum. E1–E13 (Etapa 2) ficaram fora de escopo por instrução do comando, não por impedimento.

### Observações

- A digitação e o cursor foram testados com teclado real do Playwright (`pressSequentially`, `keyboard.press`) e `setSelectionRange` para posicionar o cursor; "colar" foi simulado com `fill`, que dispara o mesmo evento de `input`.
- Ordem das UFs no filtro (C7): MG, RJ, SP (alfabética do nome do estado), coerente com a regra de ordem do contrato; o texto do C7 lista "SP, RJ e MG" apenas como conjunto.
- Dados criados pelo teste (todos com `[QA]`): ids 4, 5, 9 e 10. Ficaram ativos; a desativação (E12) pertence à Etapa 2, ainda não rodada.
- A senha do Diretor foi usada só para o login; nenhum snapshot ou screenshot foi tirado com o campo de senha preenchido e nada com senha foi escrito aqui.
- A janela do navegador ficou aberta, logada como o Diretor, em `/registry/companies`.
