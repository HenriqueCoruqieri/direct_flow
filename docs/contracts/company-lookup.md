# Contrato — Consulta de CNPJ e CEP no cadastro de empresas

Entrada das ondas 1 e 2. Decisão de canal e camada:
`docs/adr/026-cnpj-and-cep-lookup-via-server-action.md`. Continua valendo
`docs/contracts/registry-companies.md` em tudo o que não é tocado aqui; a linha
"Fora" daquele contrato passa a apontar para cá.

Versões observadas: `next@16.3.5`, `zod@4.6.5`, Node 24.

## Escopo técnico em uma frase

Sem schema e sem migration: no formulário de empresa, CNPJ e CEP completos e
válidos disparam uma Server Action de **leitura** (segunda exceção da seção 2,
ADR 026) que consulta BrasilAPI ou ViaCEP por um módulo novo
`app/_lib/lookup/` e devolve a lista de campos a preencher; qualquer falha vira
aviso e o cadastro à mão segue igual.

## Decisões do arquiteto

| Tema                  | Decisão                                                                                                                                               |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Onde roda             | Servidor, as duas consultas. Action `lookupCnpj` / `lookupCep` → módulo `app/_lib/lookup/` → `fetch`                                                  |
| Quem pode             | Só diretor (`getDirector`), igual a `createCompany`. Outro perfil recebe `FORBIDDEN`                                                                  |
| Pasta nova            | `app/_lib/lookup/`, dono `df-data` (texto proposto para o `stack.md` no fim)                                                                          |
| Timeout               | 5 s por chamada (`AbortSignal.timeout(5000)`)                                                                                                         |
| User-Agent            | `direct-flow`, sem nenhum dado pessoal; `Accept: application/json`                                                                                    |
| Cache                 | Nenhum. `cache: "no-store"` explícito (ADR 026)                                                                                                       |
| CNPJ alfanumérico     | Consulta assim mesmo; 400/404 para CNPJ com letra vira `UNSUPPORTED`                                                                                  |
| Disparo               | Automático quando o usuário completa um valor válido diferente do último consultado. Sem botão "Buscar"                                               |
| Preenchimento         | Sobrescreve com tudo o que veio; campo sem valor na resposta fica como está                                                                           |
| QSA e pessoa física   | Nunca lidos: o schema do provedor só conhece razão social, nome fantasia e endereço. E-mail e telefone da Receita também ficam fora                   |
| Complemento do ViaCEP | Não usado: é faixa de numeração do logradouro ("até 500/501"), não sala ou andar. O complemento da BrasilAPI (unidade da empresa, "SALA 101") é usado |
| Caixa e acento        | Como o provedor manda (Receita em maiúsculas sem acento). Sem normalização                                                                            |
| Resposta da action    | Já traz `fill` (lista de campo → valor pronto para o formulário, CEP mascarado). A UI não conhece o formato normalizado nem o provedor                |
| Tipos fora da action  | Em `app/_lib/types/company-lookup.ts`, para o `df-ui` tipar sem esperar o `df-actions` (precedente: `ticket-search`)                                  |

## Tabelas e enums

Nenhuma mudança. Campos de `company` preenchidos pela consulta: `legal_name`,
`trade_name`, `cep`, `state` (`brazilian_state`), `street`, `number`,
`district`, `city`, `complement`. Nada é gravado pela consulta; grava só o
"Salvar" de sempre (`createCompany` / `updateCompany`).

## Tipos — `app/_lib/types/company-lookup.ts` (novo, pronto)

```ts
export interface LookupAddress {
  state: BrazilianState | null
  city: string | null
  district: string | null
  street: string | null
}

export interface CepLookupResult extends LookupAddress {
  cep: string
}

export interface CnpjLookupResult extends LookupAddress {
  legalName: string
  tradeName: string | null
  cep: string | null
  number: string | null
  complement: string | null
}

export interface LookupFound<TResult> {
  status: "found"
  result: TResult
}
export interface LookupNotFound {
  status: "not_found"
}
export interface LookupUnsupported {
  status: "unsupported"
}
export interface LookupUnavailable {
  status: "unavailable"
}

export type CnpjLookupOutcome =
  | LookupFound<CnpjLookupResult>
  | LookupNotFound
  | LookupUnsupported
  | LookupUnavailable

export type CepLookupOutcome =
  LookupFound<CepLookupResult> | LookupNotFound | LookupUnavailable

export type CompanyLookupTextField =
  | "legalName"
  | "tradeName"
  | "cep"
  | "street"
  | "number"
  | "district"
  | "city"
  | "complement"

export interface CompanyLookupTextFill {
  field: CompanyLookupTextField
  value: string
}
export interface CompanyLookupStateFill {
  field: "state"
  value: BrazilianState
}
export type CompanyLookupFillEntry =
  CompanyLookupTextFill | CompanyLookupStateFill

export type CnpjLookupErrorCode =
  "INVALID_INPUT" | "FORBIDDEN" | "NOT_FOUND" | "UNSUPPORTED" | "UNAVAILABLE"
export type CepLookupErrorCode = Exclude<CnpjLookupErrorCode, "UNSUPPORTED">

export interface CompanyLookupSuccess {
  ok: true
  fill: CompanyLookupFillEntry[]
  message: string
}

export interface CompanyLookupFailure<TCode extends CnpjLookupErrorCode> {
  ok: false
  code: TCode
  message: string
}

export type CnpjLookupResponse =
  CompanyLookupSuccess | CompanyLookupFailure<CnpjLookupErrorCode>
export type CepLookupResponse =
  CompanyLookupSuccess | CompanyLookupFailure<CepLookupErrorCode>
```

`*Outcome` é o que `app/_lib/lookup/` devolve à action; `*Response` é o que a
action devolve ao cliente. Valores normalizados: CEP com 8 dígitos sem máscara,
UF validada contra as 27 siglas (fora disso vira `null`), textos com `trim` e
string vazia virando `null`.

## Validação — `app/_lib/validation/company-lookup.ts` (novo, pronto)

| Export               | Assinatura                              | Semântica                                                                                                                                                                                                                                                                                                                       |
| -------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lookupCnpjSchema`   | `z.object({ cnpj: companyCnpjSchema })` | Mesmo schema do campo do formulário: limpa máscara, maiúsculas, 14 caracteres, DV oficial. Saída: `{ cnpj: string }` limpo                                                                                                                                                                                                      |
| `LookupCnpjInput`    | `z.input<typeof lookupCnpjSchema>`      | `{ cnpj: string }` (com ou sem máscara)                                                                                                                                                                                                                                                                                         |
| `lookupCepSchema`    | `z.object({ cep: companyCepSchema })`   | 8 dígitos. Saída: `{ cep: string }` só dígitos                                                                                                                                                                                                                                                                                  |
| `LookupCepInput`     | `z.input<typeof lookupCepSchema>`       | `{ cep: string }`                                                                                                                                                                                                                                                                                                               |
| `parseBrasilApiCnpj` | `(raw: unknown) => CnpjLookupOutcome`   | JSON de resposta 200 da BrasilAPI → `found` com `CnpjLookupResult`; forma inesperada (sem `razao_social`, HTML, etc.) → `unavailable`. Lê só `razao_social`, `nome_fantasia`, `descricao_tipo_de_logradouro`, `logradouro`, `numero`, `complemento`, `bairro`, `municipio`, `uf`, `cep`; o resto (inclusive `qsa`) é descartado |
| `parseViaCep`        | `(raw: unknown) => CepLookupOutcome`    | `{ "erro": true }` ou `{ "erro": "true" }` → `not_found`; JSON com `cep` válido → `found`; forma inesperada → `unavailable`. Lê só `cep`, `logradouro`, `bairro`, `localidade`, `uf`                                                                                                                                            |

Logradouro da BrasilAPI: `descricao_tipo_de_logradouro` + `logradouro`
(`RUA` + `DAS FLORES` → `RUA DAS FLORES`), sem repetir o tipo quando o
logradouro já começa por ele.

## Domínio — `app/_lib/domain/company-lookup.ts` (novo, pronto)

| Export                        | Assinatura                                                       | Semântica                                                                                                                                                                                    |
| ----------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `isCnpjLookupReady`           | `(cnpj: string) => boolean`                                      | Recebe o valor **limpo** (`cleanCnpj`). `true` com 14 caracteres e DV válido. É o gatilho do disparo automático                                                                              |
| `isCepLookupReady`            | `(cep: string) => boolean`                                       | Recebe o valor limpo (`cleanCep`). `true` com 8 dígitos                                                                                                                                      |
| `cnpjLookupFill`              | `(result: CnpjLookupResult) => CompanyLookupFillEntry[]`         | Campos não nulos, nesta ordem: `legalName`, `tradeName`, `cep` (mascarado `00000-000`), `state`, `street`, `district`, `city`, `number`, `complement`                                        |
| `cepLookupFill`               | `(result: CepLookupResult) => CompanyLookupFillEntry[]`          | `state`, `street`, `district`, `city` não nulos. Não toca `cep` (já digitado), `number` nem `complement`                                                                                     |
| `cnpjLookupResponse`          | `(outcome: CnpjLookupOutcome) => CnpjLookupResponse`             | `found` → `{ ok: true, fill, message: CNPJ_LOOKUP_FOUND_MESSAGE }`; demais → falha com código e mensagem da tabela abaixo                                                                    |
| `cepLookupResponse`           | `(outcome: CepLookupOutcome) => CepLookupResponse`               | Idem para CEP                                                                                                                                                                                |
| `isLookupSettled`             | `(response: CnpjLookupResponse \| CepLookupResponse) => boolean` | `true` em `ok: true`, `NOT_FOUND` ou `UNSUPPORTED`: o valor fica "fechado" e redigitá-lo não consulta de novo. `false` em `UNAVAILABLE`, `INVALID_INPUT` e `FORBIDDEN`: libera nova consulta |
| `cnpjLookupFailure`           | `(code: CnpjLookupErrorCode) => CompanyLookupFailure<…>`         | Falha com a mensagem do código (usada pela action para `FORBIDDEN` e `INVALID_INPUT`)                                                                                                        |
| `cepLookupFailure`            | `(code: CepLookupErrorCode) => CompanyLookupFailure<…>`          | Idem para CEP                                                                                                                                                                                |
| `CNPJ_LOOKUP_LOADING_MESSAGE` | `"Consultando CNPJ…"`                                            | Texto do indicador de carregando                                                                                                                                                             |
| `CEP_LOOKUP_LOADING_MESSAGE`  | `"Consultando CEP…"`                                             | Idem                                                                                                                                                                                         |

Em `app/_lib/domain/brazilian-formats.ts`, novo:
`isAlphanumericCnpj(cnpj: string): boolean` — `true` se o CNPJ limpo tem
alguma letra. Usado por `app/_lib/lookup/` para decidir `unsupported`.

### Códigos de erro e mensagens

| Código          | CNPJ (`CNPJ_LOOKUP_ERROR_MESSAGES`)                                     | CEP (`CEP_LOOKUP_ERROR_MESSAGES`)                                     |
| --------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `INVALID_INPUT` | Informe um CNPJ válido para consultar.                                  | Informe um CEP válido para consultar.                                 |
| `FORBIDDEN`     | Você não tem permissão para consultar CNPJ.                             | Você não tem permissão para consultar CEP.                            |
| `NOT_FOUND`     | CNPJ não encontrado na consulta. Preencha os dados à mão.               | CEP não encontrado. Preencha o endereço à mão.                        |
| `UNSUPPORTED`   | A consulta ainda não aceita CNPJ alfanumérico. Preencha os dados à mão. | —                                                                     |
| `UNAVAILABLE`   | A consulta de CNPJ está indisponível agora. Preencha os dados à mão.    | A consulta de CEP está indisponível agora. Preencha o endereço à mão. |

Sucesso: `CNPJ_LOOKUP_FOUND_MESSAGE` = "Dados preenchidos pela consulta do
CNPJ. Confira antes de salvar." · `CEP_LOOKUP_FOUND_MESSAGE` = "Endereço
preenchido pela consulta do CEP. Confira antes de salvar."

## `df-data` — `app/_lib/lookup/` (pasta nova, depois da aprovação do `stack.md`)

| Arquivo                   | Função                                                         |
| ------------------------- | -------------------------------------------------------------- |
| `app/_lib/lookup/cnpj.ts` | `fetchCompanyByCnpj(cnpj: string): Promise<CnpjLookupOutcome>` |
| `app/_lib/lookup/cep.ts`  | `fetchAddressByCep(cep: string): Promise<CepLookupOutcome>`    |

Recebem o valor já limpo e validado pela action. Nomes sem provedor de
propósito: trocar de provedor muda o corpo, não a assinatura. Um helper
interno comum (por exemplo `app/_lib/lookup/http.ts`) é decisão do `df-data`.

Toda chamada: `fetch(url, { headers: { "User-Agent": "direct-flow", Accept: "application/json" }, signal: AbortSignal.timeout(5000), cache: "no-store" })`.
URL, User-Agent e timeout são constantes do módulo. **Nunca lançar**: erro de
rede, timeout (`AbortError`/`TimeoutError`) e JSON inválido viram
`{ status: "unavailable" }`, com `console.error("[fetchCompanyByCnpj]", …)`
(ou `[fetchAddressByCep]`) sem logar o corpo da resposta.

Mapeamento de status HTTP:

| Provedor  | URL                                           | HTTP                           | Outcome                                                  |
| --------- | --------------------------------------------- | ------------------------------ | -------------------------------------------------------- |
| BrasilAPI | `https://brasilapi.com.br/api/cnpj/v1/{cnpj}` | 200                            | `parseBrasilApiCnpj(json)`                               |
| BrasilAPI |                                               | 400 ou 404                     | `isAlphanumericCnpj(cnpj)` ? `unsupported` : `not_found` |
| BrasilAPI |                                               | qualquer outro (403, 429, 5xx) | `unavailable`                                            |
| ViaCEP    | `https://viacep.com.br/ws/{cep}/json/`        | 200                            | `parseViaCep(json)` (cobre o `{"erro": true}`)           |
| ViaCEP    |                                               | 400                            | `not_found`                                              |
| ViaCEP    |                                               | qualquer outro                 | `unavailable`                                            |

O módulo não importa `app/_lib/data/`, `app/_lib/auth/`, `app/_lib/email/` nem
`@/db`. Não guarda nada.

## `df-actions` — `app/_lib/actions/company-lookup.ts` (novo)

```ts
"use server"

export const lookupCnpj = async (input: LookupCnpjInput): Promise<CnpjLookupResponse>
export const lookupCep = async (input: LookupCepInput): Promise<CepLookupResponse>
```

Passos, iguais nas duas:

1. `getDirector()`; `null` → `cnpjLookupFailure("FORBIDDEN")` /
   `cepLookupFailure("FORBIDDEN")`.
2. `lookupCnpjSchema.safeParse(input)` / `lookupCepSchema.safeParse(input)`;
   falha → `…Failure("INVALID_INPUT")`.
3. `fetchCompanyByCnpj(parsed.data.cnpj)` / `fetchAddressByCep(parsed.data.cep)`.
4. Devolve `cnpjLookupResponse(outcome)` / `cepLookupResponse(outcome)`.

Envolva o passo 3 em `try/catch` por segurança (exceção inesperada →
`…Failure("UNAVAILABLE")` com `console.error("[lookupCnpj]", error)`).
**Sem** `revalidatePath`, `redirect` ou escrita. Nenhuma outra action muda.

## `df-ui` — `company-form-dialog.tsx`

Arquivo: `app/(app)/registry/companies/_components/company-form-dialog.tsx`.
Um hook de rota é bem-vindo (`app/(app)/registry/companies/_hooks/`), decisão
do `df-ui`.

1. **Disparo.** No `onChange` do campo CNPJ (ação do usuário, não `setValue`),
   com o valor limpo `cleanCnpj(valor)`: se `isCnpjLookupReady(limpo)` e
   `limpo !== últimoConsultado`, chama `lookupCnpj({ cnpj: limpo })` e guarda
   `últimoConsultado = limpo`. O mesmo para CEP com `cleanCep`,
   `isCepLookupReady` e `lookupCep({ cep: limpo })`. Ao abrir o Dialog
   (criação ou edição) `últimoConsultado` começa com o valor inicial limpo,
   para que abrir a edição não consulte e apagar-e-redigitar o mesmo CNPJ não
   consulte de novo. "Não consulta de novo o mesmo valor" vale só quando a
   última consulta daquele valor terminou em sucesso, `NOT_FOUND` ou
   `UNSUPPORTED` (`isLookupSettled(resposta)`): se terminou em `UNAVAILABLE`,
   `INVALID_INPUT` ou `FORBIDDEN` (`isLookupSettled` devolve `false`),
   limpe `últimoConsultado` daquele campo ao receber a resposta, e redigitar o
   mesmo valor completo consulta de novo. Sem debounce: o gatilho só acontece
   ao completar.
2. **Resposta atrasada.** Ao chegar a resposta, se o valor limpo atual do campo
   não é mais o consultado (ou o Dialog fechou), descarta.
3. **Preenchimento.** `ok: true` → para cada entrada de `fill`,
   `form.setValue(entry.field, entry.value, { shouldDirty: true, shouldValidate: true })`.
   O `cep` preenchido pela consulta do CNPJ **não** dispara `lookupCep`
   (porque não passa pelo `onChange`) — mas atualize o `últimoConsultado` do
   CEP com o valor limpo, para não consultar se o usuário só tocar no campo.
4. **Carregando.** Enquanto a consulta roda, o campo mostra
   `Loader2Icon` animado e `CNPJ_LOOKUP_LOADING_MESSAGE` /
   `CEP_LOOKUP_LOADING_MESSAGE` na `description` do `FormField`. O campo e o
   formulário continuam editáveis e o "Salvar" continua habilitado.
5. **Aviso.** Sucesso → `message` na `description` do campo (texto neutro).
   Falha → `message` na `description` do campo (texto de aviso, não de erro).
   **Nunca** `setError`: o aviso não é erro de validação e não pode bloquear o
   envio. O aviso some quando o usuário volta a editar aquele campo.
   Sem toast para a consulta.
6. O formulário não importa `app/_lib/lookup/` nem conhece BrasilAPI ou ViaCEP.

## Texto proposto para o `stack.md` (aprovação do usuário)

### Seção 2 — diagrama

Acrescentar, sob `app/_lib/actions/`, a linha:

```
           │                     ├─→ app/_lib/lookup/ ──→ BrasilAPI · ViaCEP
```

### Seção 2 — exceção de leitura iniciada pelo cliente

Substituir o parágrafo **"Exceção única — busca enquanto se digita (ADR 015)."**
por:

> **Exceções — leitura iniciada pelo cliente (ADR 015, ADR 026).** São duas, e
> só duas. A busca de chamados do topo (`searchTickets`, ADR 015) e a consulta
> de CNPJ e CEP do cadastro de empresas (`lookupCnpj`, `lookupCep`, ADR 026)
> são Server Actions de **leitura**, chamadas pelo cliente: validam,
> autenticam, chamam `app/_lib/data/` ou `app/_lib/lookup/` e devolvem, sem
> revalidar. A exceção não se estende: qualquer outra leitura iniciada pelo
> cliente precisa de ADR próprio.

### Seção 2 — item novo da lista, depois do de `app/_lib/storage/`

> - **Cadastro público de terceiros só por `app/_lib/lookup/`.** É o único
>   lugar que chama, por `fetch`, API externa de consulta (BrasilAPI para CNPJ,
>   ViaCEP para CEP — ADR 026) e conhece URL, User-Agent e timeout. Devolve o
>   formato normalizado de `app/_lib/types/company-lookup.ts`, nunca o JSON do
>   provedor, e nunca lança. Quem chama é a action; UI não importa, nem em
>   Server Component. `app/_lib/lookup/` não importa `app/_lib/data/`,
>   `app/_lib/auth/`, `app/_lib/email/` nem `@/db`, e não grava nada.

### Seção 7 — tabela de ownership

Substituir a linha do `df-data` por:

| Caminho                                                                                      | Escreve   |
| -------------------------------------------------------------------------------------------- | --------- |
| `db/index.ts`, `db/seed.ts`, `app/_lib/data/**`, `app/_lib/storage/**`, `app/_lib/lookup/**` | `df-data` |

### Seção 3

Sem mudança: não há rota de API nova.

## Cenários para o `df-qa`

Pré-condição: logado como diretor, em Cadastros → Empresas → "Nova empresa",
salvo onde dito "edição". Para cada cenário, conferir no dev server
(`next-devtools`) que não houve erro não tratado, e no banco (`postgres`) que a
consulta sozinha não gravou nada em `company`.

1. **CNPJ real.** Digitar `00.000.000/0001-91` (Banco do Brasil). Aparece
   "Consultando CNPJ…"; depois razão social, CEP (`70040-912` ou o que a
   Receita tiver), UF, logradouro, número, bairro e cidade preenchidos, com
   "Dados preenchidos pela consulta do CNPJ. Confira antes de salvar.".
   Nome fantasia vazio na Receita mantém o campo como estava. E-mail e
   telefones **não** mudam.
2. **QSA não vaza.** No cenário 1, inspecionar a resposta da action na aba de
   rede do navegador: só `ok`, `fill` (campos da tabela de domínio) e
   `message`. Nenhum `qsa`, nome de sócio, e-mail ou telefone.
3. **CNPJ fictício válido.** Digitar `11.222.333/0001-81` (DV válido). Espera-se
   "CNPJ não encontrado na consulta. Preencha os dados à mão." e nenhum campo
   alterado. Se a Receita tiver esse CNPJ, anotar e repetir com outro DV válido.
4. **CNPJ alfanumérico.** Digitar `12.ABC.345/01DE-35`. Espera-se
   "A consulta ainda não aceita CNPJ alfanumérico. Preencha os dados à mão."
   (ou, se a BrasilAPI já aceitar, o preenchimento normal — anotar qual). O
   cadastro completado à mão salva normalmente.
5. **CNPJ com DV inválido.** Digitar `00.000.000/0001-90`. Nenhuma consulta
   (sem "Consultando…", sem chamada na aba de rede); erro de validação de
   sempre ao sair do campo ou salvar.
6. **CNPJ incompleto.** Digitar 13 caracteres. Nenhuma consulta.
7. **CEP real.** Digitar `01001-000`. "Consultando CEP…"; UF `SP`, logradouro
   "Praça da Sé", bairro "Sé", cidade "São Paulo"; número e complemento
   intactos; "Endereço preenchido pela consulta do CEP. Confira antes de
   salvar.".
8. **CEP inexistente.** Digitar `99999-999`. "CEP não encontrado. Preencha o
   endereço à mão."; nenhum campo alterado.
9. **Sobrescrita.** Preencher logradouro e cidade à mão com outro texto e
   digitar `01001-000`: os dois são sobrescritos pela consulta do CEP. Editar
   o logradouro depois: o valor editado fica e o aviso do CEP continua. O
   aviso do CEP só some ao editar o próprio CEP.
10. **CEP preenchido pelo CNPJ não consulta o CEP.** No cenário 1, só uma
    chamada (`lookupCnpj`) na aba de rede, nenhuma `lookupCep`.
11. **Mesmo valor não consulta de novo.** Depois do cenário 7, apagar o último
    dígito e redigitá-lo: nenhuma nova chamada.
12. **Edição não consulta ao abrir.** Abrir "Editar" de uma empresa existente:
    nenhuma chamada. Trocar o CEP por `01001-000`: consulta e preenche.
13. **API fora do ar.** Parar o dev server e subir de novo com
    `NODE_USE_ENV_PROXY=1 HTTPS_PROXY=http://127.0.0.1:9 npm run dev` (todo
    `fetch` de saída falha; o Postgres, que não usa `fetch`, continua).
    Digitar `00.000.000/0001-91`: "A consulta de CNPJ está indisponível agora.
    Preencha os dados à mão."; digitar `01001-000`: "A consulta de CEP está
    indisponível agora. Preencha o endereço à mão.". Preencher tudo à mão e
    salvar: empresa criada. No log do dev server, `[fetchCompanyByCnpj]` e
    `[fetchAddressByCep]` sem corpo de resposta. Voltar a subir o dev server
    sem as variáveis.
14. **Nova tentativa depois de falha.** Antes de voltar a subir o dev server
    no fim do cenário 13 (`fetch` falhando), digitar `01001-000` e ver o aviso de indisponível.
    Apagar o último dígito e redigitá-lo: nova chamada `lookupCep` na aba de
    rede e o aviso de indisponível de novo. Voltar a subir o dev server sem as
    variáveis, apagar e redigitar o último dígito do mesmo CEP: nova chamada e
    endereço preenchido. Depois disso, apagar e redigitar de novo não consulta
    (cenário 11).
15. **Nunca bloqueia.** Com a consulta em curso (cenário 13 ou rede lenta),
    os campos continuam editáveis e "Salvar" continua habilitado; o salvar
    termina depois da consulta (ADR 026, consequências).
16. **Só diretor.** Logado como admin de setor, chamar `lookupCnpj` não é
    possível pela tela (404 em Cadastros → Empresas). Registrar como
    verificado por leitura do código da action (`getDirector`).
17. **Resposta atrasada descartada.** Digitar um CEP válido e, antes de a
    resposta chegar, trocar por outro válido: o endereço final corresponde ao
    segundo CEP.
