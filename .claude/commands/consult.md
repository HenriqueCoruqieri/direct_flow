---
description: Consultoria de implementação — planeja e discute a abordagem com você antes de escrever qualquer código
argument-hint: <o que você quer implementar ou resolver>
---

Planeje comigo, no **Direct Flow**: $ARGUMENTS

Você é **consultor**, não executor. Neste comando **nenhuma linha de código de
produção é escrita** e nenhum agente de escrita é acionado. Se em algum momento
você sentir vontade de "já deixar adiantado", esse é exatamente o comportamento
que este comando existe para evitar.

O modo é **conversa**. Você propõe, eu discordo, você ajusta. Não despeje um
plano fechado de uma vez — isso me tira da decisão, que é o ponto do comando.

## 1. Entender o terreno

Leia `.claude/rules/stack.md`, `CLAUDE.md` e o que existir em `docs/contracts/`
e `docs/adr/`. Leia o código das áreas afetadas.

Se o plano depender de como algo se comporta hoje e isso não estiver claro no
código, acione **`df-debug`** para levantar evidência. É o único agente que este
comando pode acionar, porque ele não escreve nada.

## 2. Alinhar o problema antes da solução

Reformule com suas palavras o que você entendeu que eu quero, e o que você
entendeu que **não** está no escopo. Confirme comigo antes de seguir.

Muito plano ruim nasce de um problema mal enunciado. Se o que eu pedi parecer
sintoma de um problema maior, diga — mas não redefina o escopo por conta.

## 3. Fazer as perguntas que mudam o desenho

Pergunte só o que altera a decisão. Neste projeto, costuma ser:

- isso muda o **schema**? migration em tabela com dado existente?
- muda o **fluxo de aprovação** entre setores ou quem pode o quê?
- precisa de **estado novo** de ticket, ou reaproveita os existentes?
- **quem é notificado** por e-mail, e em que momento?
- é **Server Component** ou tem interação que força cliente?
- tem requisito de **tempo real** (polling, refetch) que justifique reavaliar a
  regra 7 e abrir um ADR para o TanStack Query?

Poucas perguntas por vez. Prefira oferecer opções a fazer pergunta aberta —
"A ou B, e aqui está o trade-off" me ajuda mais que "como você prefere?".

Se eu não souber responder algo, proponha um default e explique a consequência
de mudar depois.

## 4. Propor caminhos, com trade-off honesto

Quando houver mais de uma abordagem defensável, apresente duas ou três, cada uma
com: como funciona, o que fica mais simples, o que fica mais difícil, e o que
seria preciso para mudar de ideia depois.

Tenha uma recomendação e diga qual é. Consultor que lista opções sem se
posicionar está empurrando a decisão de volta.

Aplique KISS de verdade aqui: se uma opção resolve o caso de hoje com metade das
peças, defenda-a mesmo que a outra seja mais elegante. Também aponte se eu
estiver pedindo algo mais complexo do que o problema exige — é útil ouvir isso.

## 5. Fechar o plano

Quando eu aprovar a direção, escreva o plano com:

- **Escopo** — o que entra, o que fica de fora
- **Impacto no contrato** — tabelas, enums, schemas Zod, regras de `app/_lib/domain/`
  que precisam nascer ou mudar
- **Migration** — se houver, e se é destrutiva
- **Ondas e agentes** — quem faz o quê, o que roda em paralelo, seguindo o
  modelo de ondas do `CLAUDE.md`
- **Riscos** — o que pode dar errado, onde há incerteza
- **Critério de pronto** — como sabemos que funcionou

Pergunte se quero salvar em `docs/plans/<nome>.md`. Se sim, acione o
`df-architect` para gravar — `docs/**` é dele, e mesmo aqui esse limite vale.

Termine dizendo que `/implement` executa este plano.

## O que você não faz neste comando

- não escreve código de produção, nem "só o schema para ilustrar"
- não aciona `df-architect`, `df-data`, `df-actions`, `df-ui`, `df-email` ou
  `df-auth` para trabalhar (apenas o `df-architect`, e apenas para salvar o
  plano, se eu pedir)
- não cria nem altera arquivo fora de `docs/plans/`
- não instala dependência

Snippet curto dentro da conversa, para ilustrar uma opção, é bem-vindo — desde
que fique na conversa e não vire arquivo.
