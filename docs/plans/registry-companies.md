# Plano — Cadastros → Empresas

Aprovado pelo usuário em 2026-11-06. Contrato por etapa em
`docs/contracts/registry-companies.md`. Poder da Diretoria no ADR 011. Padrões
de tabela, filtro, formulário e resultado de action reusados de
`docs/contracts/registry-departments.md`, `docs/contracts/registry-tags.md` e
`docs/contracts/registry-people.md`.

Este documento é o Commit 0 da feature (`docs:`): planejamento publicado antes
de qualquer código.

## O que é

Cadastro das empresas atendidas, em `/registry/companies`, item **Empresas** no
submenu Cadastros (depois de Tags), **só para o diretor**. Lista com busca e
filtros, criação e edição num Dialog, desativar e reativar. Empresa nunca é
excluída.

## Decisões fixadas pelo usuário

| Tema           | Decisão                                                                                                                                                                                                                                                                                                                                                                                                             |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Acesso         | Só diretor (`requireDirector` na página, `getDirector` na action). Admin de setor e membro não veem o item; ao abrir a URL recebem o mesmo tratamento de Setores (ver nota 1)                                                                                                                                                                                                                                       |
| Menu           | Cadastros → Pessoas, Setores, Tags, **Empresas**                                                                                                                                                                                                                                                                                                                                                                    |
| Lista          | Título "Empresas", botão "Nova empresa". Busca por nome fantasia, razão social ou CNPJ (com ou sem máscara, sem diferenciar maiúsculas). Filtros Status (padrão Ativo) e UF                                                                                                                                                                                                                                         |
| Colunas        | Empresa (nome fantasia em destaque, razão social abaixo), CNPJ (mascarado, mono), Cidade / UF, Responsável, Status. Ações por linha na Etapa 2                                                                                                                                                                                                                                                                      |
| Dialog         | "Nova empresa" / "Editar empresa", subtítulo "Campos com \* são obrigatórios.". Cabeçalho e rodapé fixos, só o corpo rola                                                                                                                                                                                                                                                                                           |
| Grupos         | Identificação, Contatos, Endereço, Responsável, Expediente                                                                                                                                                                                                                                                                                                                                                          |
| CNPJ           | Numérico **e alfanumérico** (IN RFB 2.229/2024): 14 caracteres, os 12 primeiros `[0-9A-Z]`, os 2 últimos (DV) só dígitos. Guardado em maiúsculas, sem máscara (entrada em minúsculas é convertida). DV pelo cálculo oficial (ASCII − 48, mesmos pesos módulo 11), que vale também para o numérico; recusa caractere repetido. Máscara `AA.AAA.AAA/AAAA-DD` na exibição e no input. Único; duplicado = erro no campo |
| CEP            | 8 dígitos, máscara `00000-000`                                                                                                                                                                                                                                                                                                                                                                                      |
| UF             | Lista fixa das 27 siglas no domínio (select e filtro)                                                                                                                                                                                                                                                                                                                                                               |
| Telefone       | Máscara dinâmica, até 11 dígitos: 10 → fixo `(11) 9123-2341`, 11 → celular `(11) 91232-3410`. DDD de 2 dígitos que não começa com 0. Guarda só dígitos. Sem seletor de tipo                                                                                                                                                                                                                                         |
| Expediente     | Opcional e tudo-ou-nada: com dia marcado, "Das" e "Às" obrigatórios e "Às" > "Das"; horário sem dia é inválido. Informativo: **não** mexe no prazo dos chamados (ADR 019)                                                                                                                                                                                                                                           |
| E-mail         | Formato válido, não único                                                                                                                                                                                                                                                                                                                                                                                           |
| Exclusão       | Nunca. Só desativar e reativar                                                                                                                                                                                                                                                                                                                                                                                      |
| QA             | Pode criar, editar e desativar **apenas** empresas que ele mesmo criou, com prefixo de teste no nome fantasia (ver nota 2)                                                                                                                                                                                                                                                                                          |
| Fora do escopo | Botões "Buscar" de CNPJ e CEP; vínculo empresa ↔ chamado. Cada um terá plano próprio (seção "Trabalho futuro")                                                                                                                                                                                                                                                                                                      |

Notas de interpretação (decididas pelo `df-architect`, sujeitas a confirmação):

1. **Acesso negado = 404**, como em Setores: `requireDirector` chama
   `notFound()` (ADR 011, "Página restrita responde 404 a não-diretor, para não
   revelar que a rota existe"). O membro já para no layout de `/registry`
   (`requireRegistryAccess`); o admin de setor passa pelo layout e para na
   página. Se o desejo for um redirecionamento de verdade (para `/dashboard`,
   por exemplo), a mudança é em `requireDirector` e vale também para Setores:
   precisa de nota no ADR 011.
2. **Prefixo do QA = `[QA] `**, o mesmo que `docs/contracts/qa-seed.md` e o
   agente `df-qa` já exigem para tudo o que o teste cria. As empresas do seed
   usam `QA ` sem colchetes, como os setores `QA Suporte` e `QA Infra`, e são
   só de leitura para o teste.

## Escopo por etapa

### Etapa 1 — lista e criação (commit `feat:`)

- Schema: tabelas `company` e `company_contact`, enums `brazilian_state` e
  `company_contact_position`, checks de consistência.
- Migration `0021_company` (só cria; não destrutiva).
- Tipos, domínio (UF, CNPJ, CEP, telefone, dias da semana, regra do
  expediente, mensagens), Zod de criação.
- `df-data`: `listCompanies`, `insertCompany`; seed QA com três empresas.
- `df-actions`: `createCompany`.
- `df-ui`: item de menu (vem de `registryNavItemsFor`), página, tabela com busca e
  filtros, Dialog "Nova empresa", input com máscara.

### Etapa 2 — edição, desativar e reativar (commit `feat:`)

- Sem schema e sem migration.
- Zod `updateCompanySchema` e `setCompanyActiveSchema`.
- `df-data`: `updateCompany`, `updateCompanyActive`.
- `df-actions`: `updateCompany`, `setCompanyActive`.
- `df-ui`: ações por linha (`RegistryRowActions`), Dialog em modo edição,
  `DeactivateRegistryDialog`, `ReactivateRegistryButton`.

## Impacto no contrato

- `db/schema.ts`: `company`, `company_contact`, `brazilianStateEnum`,
  `companyContactPositionEnum`, `relations`.
- `db/migrations/0021_company.sql`, gerada pelo `drizzle-kit generate`.
- `app/_lib/types/company.ts` (novo); `app/_lib/types/registry.ts`
  (`RegistrySection` ganha `"companies"`).
- `app/_lib/domain/brazilian-formats.ts` (novo: UF, CNPJ, CEP, telefone),
  `app/_lib/domain/company.ts` (novo: dias, expediente, mensagens, busca),
  `app/_lib/domain/registry.ts` (`COMPANIES_REGISTRY_PATH`, item no menu do
  diretor).
- `app/_lib/validation/company.ts` (novo).
- `app/_lib/data/companies.ts` (novo), `db/seed.ts` (empresas QA).
- `app/_lib/actions/companies.ts` (novo).
- `app/(app)/registry/companies/**` (novo), `app/_components/masked-input.tsx`
  (novo), primitivo `toggle-group` do shadcn.
- Docs: ADR 011 (nota), `docs/contracts/auth.md`, `docs/contracts/qa-seed.md`,
  notas de menu nos contratos de Setores e Tags.
- Sem e-mail, sem variável de ambiente nova, sem pacote novo além do primitivo.

## Migration

`0021_company`: `CREATE TYPE` dos dois enums, `CREATE TABLE` das duas tabelas,
índice único de CNPJ, índice único `(company_id, position)`, FK com
`on delete cascade` e os checks. Nada é alterado nem apagado em tabela
existente. Quem aplica (`npm run db:migrate`) é o usuário, antes da Onda 1 da
Etapa 1. A Etapa 2 não tem migration.

## Ondas e agentes (iguais nas duas etapas)

```
Onda 0  df-architect     schema e migration (só Etapa 1) · domínio · Zod · tipos
Onda 1  df-data  ∥  df-ui (tabela, Dialog e máscaras contra o contrato)
Onda 2  df-actions  ∥  df-ui (liga o Dialog e as ações à action)
Onda 3  df-reviewer
Onda 4  df-qa  (Diretor; Admin e Membro só para o bloqueio de acesso)
```

Pré-requisito do usuário na Etapa 1, entre a Onda 0 e a Onda 1:
`npm run db:migrate`; depois da Onda 1, `npm run db:seed` com `SEED_QA=true`
para as empresas de exemplo.

## Decisão registrada — CNPJ alfanumérico

Em 2026-11-06 o usuário decidiu aceitar o CNPJ alfanumérico, emitido pela
Receita Federal desde julho de 2026 (IN RFB 2.229/2024), ao lado do numérico.
Um formato só (`[0-9A-Z]{12}[0-9]{2}`, check `company_cnpj_format` no banco),
uma função de DV só e uma máscara só: o numérico é o caso particular com
dígitos nas 12 primeiras posições. Detalhe no contrato (`cleanCnpj`,
`isValidCnpj`, `formatCnpj`; cenários C10, C11, C25–C27).

## Riscos

1. **CNPJ duplicado.** Tem de aparecer como erro no campo CNPJ, não como toast
   genérico. A data layer traduz a violação do índice `company_cnpj_idx` em
   resultado (`cnpj_taken`), a action devolve `CNPJ_TAKEN` e o Dialog faz
   `setError("cnpj")` com foco. Corrida entre duas criações iguais cai no mesmo
   caminho, porque quem decide é o índice.
2. **Máscara de telefone.** A transição fixo ↔ celular troca a posição do
   hífen (`9123-2341` ↔ `91232-3410`) a cada 10º/11º dígito. Reformatar o
   valor inteiro a cada tecla faz o cursor saltar para o fim e faz o Backspace
   "não apagar" quando cai num caractere da máscara. O contrato fixa o
   algoritmo de cursor (contagem de dígitos antes do cursor) e cenários
   específicos (C13).
3. **Dialog alto (~1260 px).** Em telas baixas e no celular, o corpo rola entre
   cabeçalho e rodapé fixos. Risco de o campo focado (Tab ou foco de erro)
   ficar escondido atrás do rodapé e de o teclado virtual cobrir o campo. O
   rodapé fica **fora** do contêiner que rola, o corpo usa `scroll-padding`, a
   altura usa `dvh`. Cenários C20 e C21.
4. **Senha do Diretor.** O QA entra com `SEED_ADMIN_EMAIL` e a senha do
   `.env`. Se o usuário trocou essa senha pela interface, o QA não entra e as
   duas etapas ficam sem teste. Conferir antes da Onda 4; a senha nunca é
   escrita em documento nem relatório.
5. **Expediente que vira a noite** (22h–06h) não é representável com "Às" >
   "Das". Aceito: o campo é informativo.
6. **Lista carrega o registro inteiro.** Para o Dialog de edição abrir
   preenchido sem leitura iniciada pelo cliente (ADR 015 só libera a busca de
   chamados), `listCompanies` devolve todos os campos. Custo aceitável para o
   volume esperado de empresas; se crescer, paginar no servidor.

## Trabalho futuro (cada item terá plano próprio)

- **Botões "Buscar" de CNPJ e CEP** (BrasilAPI / ViaCEP). É leitura iniciada
  pelo cliente, que hoje só existe para `searchTickets` (ADR 015): exige ADR
  novo, decidir quem chama o serviço externo (action de leitura ou rota),
  tempo limite e falha silenciosa. Nesta feature tudo é digitado à mão e os
  botões **não aparecem**.
- **Vínculo empresa ↔ chamado**: `ticket.company_id` nullable; se a empresa
  puder ser trocada depois da abertura, `ticket_history` ganha
  `from_company_id`/`to_company_id` (histórico append-only). Só empresas ativas
  seriam oferecidas; desativar continua sem pré-condição.

## Critério de pronto

Etapa 1:

- Diretor vê Empresas no submenu, depois de Tags; admin de setor e membro não
  veem e recebem 404 na URL.
- Lista abre com Status = Ativo; busca acha por nome fantasia, razão social e
  CNPJ com ou sem máscara e sem diferenciar maiúsculas; filtro UF funciona
  com a busca.
- Criação grava CNPJ em maiúsculas sem máscara (numérico ou alfanumérico),
  CEP e telefones só com dígitos, telefone primário (e o
  secundário, se houver) em `company_contact` na mesma transação, expediente
  coerente; CNPJ repetido vira erro no campo.
- Máscaras sem salto de cursor; Dialog usável em 1280×720 e 390×844.
- `npx tsc --noEmit`, `npm run lint`, `npm run build`; `df-reviewer` sem
  bloqueante; `df-qa` aprovado (cenários C).

Etapa 2:

- Editar abre o Dialog preenchido e salva, inclusive removendo o telefone
  secundário e o expediente; CNPJ repetido continua erro no campo.
- Desativar com confirmação e reativar, com toast; nenhuma forma de excluir.
- Mesmas verificações e `df-qa` aprovado (cenários E).

## Andamento

- [x] Commit 0 — plano e contrato (`docs:`)
- [x] Etapa 1 — lista e criação, concluída em 2026-11-06: `df-reviewer`
      aprovado com atenções (refletidas no contrato); `df-qa` 28/28
      (`docs/test-reports/2026-11-06-registry-companies-etapa-1.md`)
- [ ] Etapa 2 — edição, desativar e reativar. As quatro empresas `[QA]`
      criadas pela rodada da Etapa 1 (ids 4, 5, 9 e 10) são desativadas no
      cenário E12
