---
description: Corrige um bug no Direct Flow — investiga com df-debug, corrige pelo agente dono da camada
argument-hint: <descrição do bug ou comportamento errado>
---

Corrija no **Direct Flow**: $ARGUMENTS

Você é o **orquestrador**. Você não corrige — quem corrige é o agente dono do
arquivo (seção 7 de `.claude/rules/stack.md`).

A tentação aqui é editar direto porque "é uma linha só". Não faça. Uma linha
escrita fora do ownership é como o modelo começa a desmoronar.

## 1. Entender antes de mexer

Leia `.claude/rules/stack.md`. Se houver contrato do fluxo afetado em
`docs/contracts/`, leia também.

Reproduza ou localize o problema. **Acione `df-debug`** — em correção de bug ele
é quase sempre o primeiro passo, porque o relato do usuário descreve o sintoma e
você precisa da causa.

Passe ao `df-debug`: o sintoma relatado, como reproduzir se você souber, e o que
mudou recentemente (`git log`). Ele devolve evidência e a **camada** onde o
comportamento diverge.

Lembre que ele reporta observação, não correção. Se o relatório vier com um
patch pronto, ignore o patch e use só a evidência — a decisão é do dono.

## 2. Identificar o dono

Da camada apontada pelo `df-debug`, chegue ao agente:

| Camada / caminho                                                                        | Dono           |
| --------------------------------------------------------------------------------------- | -------------- |
| `app/**` (fora de `app/_lib/**`, `app/(auth)/**`, `app/api/**`)                         | `df-ui`        |
| `app/_lib/actions/**`                                                                   | `df-actions`   |
| `app/_lib/domain/**`, `app/_lib/validation/**`, `app/_lib/types/**`, `app/_lib/date.ts` | `df-architect` |
| `db/schema.ts`, `db/migrations/**`                                                      | `df-architect` |
| `app/_lib/data/**`, `db/index.ts`, `db/seed.ts`                                         | `df-data`      |
| `app/_lib/auth/**`, `proxy.ts`, `app/(auth)/**`                                         | `df-auth`      |
| `app/_lib/email/**`, `emails/**`                                                        | `df-email`     |

A causa frequentemente está numa camada diferente do sintoma. Botão que não
aparece pode ser regra em `app/_lib/domain/`, não JSX. Corrija onde está a causa.

Se a correção atravessar mais de um dono, acione cada um com o escopo dele,
começando pela camada mais funda — corrigir o contrato primeiro às vezes dissolve
o sintoma nas camadas acima.

## 3. Corrigir

Acione o dono com: a evidência do `df-debug`, o comportamento esperado, e o
limite do escopo. Deixe explícito que é correção pontual — não é hora de
refatorar o arquivo inteiro. Oportunidade de refatoração que aparecer vai para o
`/refactor`, anotada, não executada agora.

## 4. Verificar

Confirme que o comportamento original foi corrigido. Se o `df-debug` levantou
uma forma de reproduzir, use a mesma.

Rode o **`df-reviewer`**. Correção sob pressão é onde limite de camada costuma
ser furado — vale a passada mesmo em bug pequeno.

Se estiver **BLOQUEADO**, devolva ao dono indicado e revise de novo.

## 5. Encerramento

Commit `fix(<escopo>): ...` descrevendo a causa, não o sintoma.

Reporte ao usuário: causa raiz, o que foi alterado e por qual agente, como
verificar. Se o `df-debug` deixou algo em aberto, diga.
