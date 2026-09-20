---
description: Analisa código em busca de duplicação e oportunidades de refatoração, agrupadas por agente dono
argument-hint: [arquivos ou caminhos] — sem argumento, analisa o código novo (git diff)
---

Analise e refatore no **Direct Flow**: $ARGUMENTS

Você é o **orquestrador**. O foco principal é **bloco de código duplicado**;
depois disso, violação de limite de camada e complexidade desnecessária.

Regra que vale para o comando inteiro: **refatoração não muda comportamento.**
Se a mudança altera o que o sistema faz, não é refatoração — é `/implement` ou
`/fix`, e você para e avisa.

## 1. Delimitar o escopo

Sem argumento, analise o código novo:

```bash
git diff --name-only main...HEAD
git diff --stat
```

Com argumento, analise exatamente os caminhos indicados — e o que eles importam,
para achar duplicação que o usuário não viu.

Não saia refatorando o projeto inteiro. Escopo vago produz diff enorme e revisão
impossível.

## 2. Encontrar duplicação

Procure ativamente estes padrões, que são os que este projeto tende a gerar:

**Regra de negócio repetida** — a mesma condição de permissão ou transição em
JSX e na action. É a duplicação mais cara do projeto porque as duas cópias
divergem em silêncio e a interface passa a discordar do servidor. Destino:
`lib/domain/` (`df-architect`).

**Schema Zod redefinido** — formulário com uma cópia do que está em
`lib/validation/`. Destino: import único.

**Formatação de data artesanal** — `toLocaleDateString`, `Intl`, `slice` em ISO.
Destino: helper em `lib/date.ts` (`df-architect`).

**Query quase igual** — duas funções em `lib/data/` variando um `where`.
Avalie: parametrizar é mais simples que manter duas? Se a parametrização virar um
construtor de query genérico, **não vale** — fere o KISS. Duas funções claras
são melhores que uma flexível.

**Bloco de JSX repetido** — mesma composição de card, badge de status ou célula
de tabela em várias telas. Destino: componente em `components/` (`df-ui`).

**Tratamento de retorno de action repetido** — o mesmo `if (ok) toast.success`
em todo formulário. Destino: helper ou hook (`df-ui`).

Comandos úteis:

```bash
grep -rn "toLocaleDateString\|Intl.DateTimeFormat" app components lib
grep -rn "z.object" app components | grep -v lib/validation
grep -rn "status ===\|role ===" app components lib/actions
```

Três ocorrências é duplicação. Duas, avalie — às vezes duas cópias simples são
melhores que uma abstração torta. Extrair cedo demais também é dívida.

## 3. Agrupar por dono

Monte a lista de refatorações **agrupada pelo agente dono do arquivo**:

```
df-architect
  - extrair canCloseTicket() de app/tickets/[id]/page.tsx:34 e
    lib/actions/tickets.ts:112 para lib/domain/ticket.ts
df-ui
  - extrair <TicketStatusBadge> de 4 telas para components/ticket/
```

Uma refatoração que atravessa donos vira **duas tarefas em ordem**: primeiro o
dono do destino cria a peça compartilhada, depois os donos das origens passam a
importar. Nunca peça a um agente para editar o arquivo do outro.

## 4. Apresentar antes de executar

Mostre a lista ao usuário com ganho e risco de cada item, e confirme o que
executar. Refatoração em lote sem aprovação produz diff que ninguém revisa.

Se algo for arriscado sem teste automatizado cobrindo, diga.

## 5. Executar e verificar

Acione cada dono com o escopo dele. Nada de "já que estou aqui" — a lista
aprovada é o contrato.

Depois: `npx tsc --noEmit`, `npm run lint`, `npm run build`, e o
**`df-reviewer`**. Se houver dúvida se o comportamento mudou, acione `df-debug`
para comparar antes e depois.

## 6. Encerramento

Commit `refactor(<escopo>): ...`, um por agrupamento coerente — não um commit
gigante.

Reporte: o que foi unificado, quantas cópias sumiram, o que você decidiu **não**
refatorar e por quê. Essa última parte importa tanto quanto o resto.
