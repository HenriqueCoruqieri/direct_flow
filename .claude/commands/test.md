---
description: Testa uma feature do Direct Flow no navegador contra o contrato e gera relatório em docs/test-reports/
argument-hint: <feature (nome do contrato em docs/contracts/)> [--retest <relatório> <cenários>]
---

Teste no **Direct Flow**: $ARGUMENTS

Você é o **orquestrador**. Quem testa é o `df-qa`. Você prepara o ambiente,
aciona o agente e repassa o resultado. Você não corrige nada que o teste
encontrar.

Este comando roda sozinho e também é a Onda 4 do `/implement`, que segue os
passos 1 a 4 abaixo.

## 1. Contrato

Encontre `docs/contracts/<feature>.md`. Se o nome não bater exatamente, procure
em `docs/contracts/`. Se houver mais de um candidato, pergunte. Se nenhum
existir, pare: sem contrato não há o que conferir, e o caminho é pedir ao
`df-architect` que o escreva.

Se o contrato citar plano ou ADR, passe os caminhos junto.

## 2. Ambiente

- **Dev server:** `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/login`.
  Se não responder 200, suba o `npm run dev` em background e espere responder.
  Anote que foi você quem subiu, para derrubar no fim.
- **Servidores MCP:** confira se as ferramentas `mcp__playwright__*` e
  `mcp__next-devtools__*` estão disponíveis na sessão. Se não estiverem, pare e
  peça ao usuário que reinicie o Claude Code e aprove os servidores do
  `.mcp.json`.

O restante dos pré-requisitos (usuários QA, `RESEND_API_KEY`) é o `df-qa` quem
confere.

## 3. Acionar o `df-qa`

Passe:

- o caminho do contrato, e do plano ou ADR se houver
- os arquivos alterados pela feature: `git status --short` e, se a feature já
  foi comitada, `git diff --stat` do intervalo dela
- o modo: **completo** ou **reteste**. No reteste, passe o caminho do relatório
  e os números dos cenários a repetir.

## 4. Ler o relatório

Leia o arquivo que o `df-qa` gravou e confira que ele segue o formato do
agente. Um relatório com falha sem evidência ou sem dono volta para o `df-qa`
completar.

Se o `df-qa` parou por pré-requisito, repasse ao usuário exatamente o que falta
(rodar o seed com `SEED_QA=true`, aprovar o MCP, esvaziar `RESEND_API_KEY`) e
encerre.

## 5. Encerramento (execução isolada)

Se foi você quem subiu o dev server, derrube-o.

Reporte ao usuário, curto:

- o caminho do relatório e o resultado (X de Y passaram)
- cada falha: número, frase curta e agente dono
- ambiguidades do contrato que o `df-qa` anotou

**Não corrija e não acione os donos por conta própria.** Ofereça rodar `/fix`
para cada falha, já com os passos de reprodução do relatório como entrada.

O relatório entra no commit da feature que ele testou. Se a feature já foi
comitada, sugira `chore: record <feature> test report`.
