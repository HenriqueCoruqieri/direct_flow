---
description: Implementa uma feature nova no Direct Flow orquestrando os agentes por ondas
argument-hint: <descrição da feature>
---

Implemente no **Direct Flow**: $ARGUMENTS

Você é o **orquestrador**. Você não escreve código de produção — você aciona os
agentes de `.claude/agents/`, repassa contexto entre eles e verifica o resultado.
Cada agente escreve apenas nos caminhos que possui (seção 7 de
`.claude/rules/stack.md`).

## Antes de começar

Leia `.claude/rules/stack.md` e `CLAUDE.md`. Se já existir contrato relacionado
em `docs/contracts/`, leia também.

Se o pedido estiver ambíguo em algo que muda o modelo de dados ou o fluxo de
aprovação, **pergunte antes** — uma pergunta agora custa menos que uma migration
depois. Se estiver claro, siga sem perguntar.

Se a feature mexe em comportamento existente que você não entende, acione
`df-debug` antes da Onda 0 para mapear como funciona hoje. Caso contrário, pule.

## Onda 0 — contrato (`df-architect`)

Passe a descrição da feature e o que existe hoje. Ele entrega:

- tabelas, enums e migration
- schemas Zod em `app/_lib/validation/`
- regras puras em `app/_lib/domain/`
- tipos em `app/_lib/types/`
- **`docs/contracts/<feature>.md`** com as assinaturas que os demais devem criar

Não avance sem o contrato escrito. É ele que permite as ondas seguintes rodarem
em paralelo sem se esperarem.

Se a feature tocar login, sessão ou permissão, acione `df-auth` nesta onda,
em paralelo.

## Onda 1 — em paralelo

Acione simultaneamente, cada um com o contrato como entrada:

- **`df-data`** — funções de `app/_lib/data/` listadas no contrato
- **`df-email`** — funções de envio, se a feature notifica alguém
- **`df-ui`** — layout, rotas e componentes que não dependem de action

Eles não se conhecem. Se um reportar que precisa de algo de outro, anote e
resolva você na onda seguinte — nunca mande um escrever no lugar do outro.

## Onda 2 — em paralelo

- **`df-actions`** — Server Actions. Depende de `app/_lib/data/` da Onda 1 existir,
  porque a seção 2 do `stack.md` o proíbe de tocar o banco.
- **`df-ui`** — telas, formulários e tabelas. Para mutação, liga-se às actions.

Se `df-ui` precisar de uma action que ainda não existe, passe a assinatura do
contrato: ele constrói o formulário contra a assinatura e a ligação fecha quando
a action entra.

## Onda 3 — revisão (`df-reviewer`)

Rode o `df-reviewer`. Veredito:

- **BLOQUEADO** → devolva cada achado ao **agente dono** indicado no relatório.
  Não corrija você. Rode o reviewer de novo depois.
- **APROVADO COM ATENÇÕES** → reporte as atenções ao usuário e siga.
- **APROVADO** → pronto.

Se um achado for sobre comportamento e não sobre código (algo funciona diferente
do esperado em execução), acione `df-debug` para levantar evidência e devolva ao
dono junto com ela.

## Onda 4 — teste em execução (`df-qa`)

Roda só depois de a Onda 3 sair **APROVADO** ou **APROVADO COM ATENÇÕES**.
Siga os passos 1 a 4 de `.claude/commands/test.md`, com o contrato desta
feature e os arquivos que as ondas anteriores alteraram.

- **Tudo passou** → encerramento.
- **Falhou** → para cada falha, acione o **dono** indicado no relatório com a
  evidência e o esperado, como correção pontual (passo 3 do `/fix`). Se a
  camada ficou incerta, acione o `df-debug` antes. Depois rode o `df-reviewer`
  de novo e o `df-qa` em modo reteste, só com os cenários que falharam.
- **No máximo duas rodadas de correção.** Se ainda houver falha, pare e leve
  ao usuário o relatório e o que foi tentado. Falha persistente costuma ser
  contrato ambíguo, não código.
- **Pré-requisito faltando** (seed QA, MCP não aprovado) → não bloqueia a
  entrega. Reporte ao usuário o que falta e siga para o encerramento, deixando
  claro que a feature **não foi testada em execução**.

## Encerramento

Commits por unidade coerente, sem escopo (`feat: ...`), conforme a seção 6 do
`stack.md`.

O relatório de `docs/test-reports/` entra no commit da feature.

Reporte ao usuário: o que foi criado, por qual agente, o veredito da revisão, o
resultado dos testes com o caminho do relatório e o que ficou de fora. Curto.

Inclua no relatório as explicações que os agentes deram sobre o código —
trechos provisórios, decisões não óbvias, justificativas de `as` — com arquivo
e linha. Elas substituem os comentários, que são proibidos no código.
