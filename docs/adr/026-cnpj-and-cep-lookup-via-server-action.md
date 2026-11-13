# 026 — Consulta de CNPJ e CEP por Server Action de leitura

Contrato: `docs/contracts/company-lookup.md`. Precedente: ADR 015 (busca
enquanto se digita). Revisa o "Fora do escopo" de
`docs/contracts/registry-companies.md` e o "Trabalho futuro" de
`docs/plans/registry-companies.md`.

## Contexto

No cadastro de empresas (Cadastros → Empresas, só diretor) o CNPJ e o CEP são
digitados à mão, e o resto do endereço e a razão social também. O usuário
pediu que o formulário consulte o CNPJ na BrasilAPI
(`https://brasilapi.com.br/api/cnpj/v1/{cnpj}`) e o CEP no ViaCEP
(`https://viacep.com.br/ws/{cep}/json/`) e preencha o que vier.

A consulta é leitura iniciada pelo cliente depois de a página estar
renderizada. A seção 2 do `stack.md` só libera isso para a busca de chamados
(ADR 015) e exige ADR próprio para qualquer outra. Hoje não existe camada para
falar com API HTTP de terceiros, e a seção 7 só admite subpasta nova em
`app/_lib/` com dono definido.

Riscos conhecidos da BrasilAPI:

- erros 503 em outubro de 2026;
- 403 para o User-Agent padrão do Node;
- os dados vêm do dump **mensal** da Receita: empresa aberta há poucas semanas
  pode não constar, e endereço alterado pode estar defasado;
- talvez não aceite o CNPJ alfanumérico (IN RFB 2.229/2024), que o projeto já
  aceita (`CNPJ_PATTERN`).

## Decisão

### Canal: segunda exceção da seção 2, restrita à consulta de cadastro externo

Duas Server Actions de leitura, `lookupCnpj` e `lookupCep`
(`app/_lib/actions/company-lookup.ts`, dono `df-actions`), com a forma de
qualquer action: conferem que quem chama é diretor (`getDirector`, a mesma
guarda de `createCompany`), validam com o schema compartilhado
(`lookupCnpjSchema`, `lookupCepSchema`), chamam o módulo de consulta e
devolvem. **Não revalidam, não redirecionam, não gravam nada** — nem cookie
próprio, nem linha no banco.

As duas rodam no servidor, inclusive o ViaCEP, que aceitaria chamada direta do
navegador (CORS aberto):

- uniformidade: um só caminho, um só formato de resposta, um só tratamento de
  timeout e erro para as duas consultas;
- User-Agent: o navegador não deixa trocá-lo, e a BrasilAPI já recusou o
  padrão do Node; no servidor mandamos `direct-flow`, sem dado pessoal;
- autorização: só diretor consulta, o que no navegador não se garante;
- trocar de provedor fica atrás do servidor e não muda o bundle do cliente.

A exceção não se estende: outra leitura iniciada pelo cliente continua
precisando de ADR próprio.

### Camada: `app/_lib/lookup/`, dono `df-data`

Pasta nova, só para chamada HTTP de leitura a cadastro público de terceiros.
Dono `df-data`, que já é dono do outro I/O externo (`app/_lib/storage/`, R2).
Regras:

- é o único lugar que chama `fetch` para fora da aplicação em busca de
  cadastro (URL, User-Agent, timeout e o mapeamento de status HTTP ficam aqui);
- não importa `app/_lib/data/`, `app/_lib/auth/`, `app/_lib/email/` nem
  `@/db`; só `app/_lib/domain/`, `app/_lib/validation/` e `app/_lib/types/`;
- quem chama é a action; UI não importa, nem em Server Component;
- devolve sempre o formato normalizado de `app/_lib/types/company-lookup.ts`,
  nunca o JSON do provedor, e nunca lança: falha vira `unavailable`.

Recomendação rejeitada: dono `df-actions`. A action continuaria escrevendo
`fetch` e conhecendo provedor, o que a seção 2 já evita para SQL (a action
valida, autoriza, chama a camada e devolve).

### Formato normalizado e dados que não entram

O JSON do provedor passa por um schema Zod (`app/_lib/validation/company-lookup.ts`)
que lê **só** razão social, nome fantasia e endereço, e devolve
`CnpjLookupResult` ou `CepLookupResult`. O objeto Zod descarta chaves
desconhecidas, então o quadro de sócios (`qsa`), e-mail, telefone e qualquer
dado de pessoa física da BrasilAPI não atravessam o módulo, não chegam ao
cliente e não são gravados. Trocar de provedor muda o módulo e o schema do
provedor; tipos, domínio e UI ficam.

### Timeout, User-Agent e cache

- `AbortSignal.timeout(5000)` em cada chamada. Passou disso, `unavailable`.
- Header `User-Agent: direct-flow` e `Accept: application/json`.
- **Sem cache.** `fetch` com `cache: "no-store"`. No Next 16 o padrão do
  `fetch` no servidor já é não cachear (`auto no cache`,
  `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/fetch.md:52`)
  e o cache é opt-in (`force-cache`, linha 58). O volume é de poucas consultas
  por cadastro, feitas por diretor; cachear CEP economizaria pouco e traria
  invalidação para pensar. `no-store` explícito evita que a decisão dependa do
  contexto da rota.

### CNPJ alfanumérico

A consulta é feita mesmo assim. Se a BrasilAPI responder 400 ou 404 a um CNPJ
com letra, o resultado é `unsupported` ("a consulta ainda não aceita CNPJ
alfanumérico"); se um dia ela passar a aceitar, funciona sem mudança.

### Disparo e preenchimento

- Automático, sem botão: quando o valor limpo do campo fica completo e válido
  (`isCnpjLookupReady`, `isCepLookupReady`) por ação do usuário, e é diferente
  do último valor consultado. O valor carregado ao abrir a edição não dispara.
  Preencher o CEP pela consulta do CNPJ não dispara a consulta do CEP.
- Indicador de carregando no campo, que continua editável.
- Preenche **tudo o que vier**, sobrescrevendo o que estava no campo; o que não
  veio (valor vazio do provedor) não apaga o campo. O usuário edita depois.
- Falha nunca bloqueia: aviso no campo, sem `setError`, e o salvar continua
  livre.

## Consequências

- O cliente despacha Server Functions uma por vez (ADR 015, consequências). Um
  clique em "Salvar" durante a consulta espera ela terminar — no pior caso,
  os 5 s do timeout. Aceito: é raro e o resultado do salvar não muda.
- Dados da Receita vêm em maiúsculas e sem acento (`SAO PAULO`), enquanto o
  ViaCEP vem acentuado. Não normalizamos caixa: o usuário confere e edita.
- Dados do dump mensal podem estar defasados; a mensagem de sucesso pede para
  conferir antes de salvar.
- Indisponibilidade da BrasilAPI ou do ViaCEP só tira a conveniência; o
  cadastro à mão continua igual ao de antes.
- As linhas novas das seções 2 e 7 do `stack.md` (texto no contrato) são
  responsabilidade do orquestrador, com aprovação do usuário.
