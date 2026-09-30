@AGENTS.md
@.claude/rules/stack.md

# Direct Flow — orquestração dos agentes

Sistema de gestão de chamados: ciclo de vida documentado do ticket, resolução
pelo próprio autor, encaminhamento dentro do setor ou para outro setor com
aprovação de admin, tags de categoria por setor e classificação fixa
(`Dúvida`, `Ocorrência`, `Solicitação`, `Sugestão de melhoria`, `Incidente`, `Bug`
— enum `ticket_type` em `db/schema.ts`).

Nove agentes em `.claude/agents/`, cada um dono exclusivo de um conjunto de
caminhos (tabela na seção 7 de `.claude/rules/stack.md`). Nenhum agente escreve
em caminho de outro; quando precisa, reporta e encerra o turno.

| Agente         | Papel                                         | Escreve   |
| -------------- | --------------------------------------------- | --------- |
| `df-architect` | contratos: schema, Zod, domínio, datas, docs  | sim       |
| `df-auth`      | Better Auth, sessão, proteção de rota         | sim       |
| `df-data`      | queries e mutações Drizzle                    | sim       |
| `df-actions`   | Server Actions                                | sim       |
| `df-email`     | Resend, templates                             | sim       |
| `df-ui`        | App Router, componentes, formulários, tabelas | sim       |
| `df-reviewer`  | conformidade do código parado                 | não       |
| `df-debug`     | comportamento em execução, evidência          | não       |
| `df-qa`        | teste no navegador contra o contrato          | relatório |

## Comandos

`/implement` feature nova · `/fix` bug · `/refactor` duplicação e limpeza ·
`/document` documentação · `/consult` consultoria antes de codar ·
`/test` teste da feature no navegador, com relatório

Os servidores MCP de teste (`playwright` e `next-devtools`) ficam em
`.mcp.json` e são usados só pelo `df-qa`.

Os comandos são os orquestradores. Eles acionam agentes, repassam contexto e
verificam; não escrevem código de produção.

## Ordem de execução por feature

```
Onda 0  df-architect     schema · Zod · app/_lib/domain · app/_lib/date · contrato em docs/
           │
Onda 1  df-data ─┬─ df-email ─┬─ df-ui (layout, design system)      ← em paralelo
                 │             │
Onda 2  df-actions           df-ui (telas e formulários)            ← em paralelo
           │
Onda 3  df-reviewer      lint · tsc · build · limites entre camadas
           │
Onda 4  df-qa            navegador · erros do dev server · banco → docs/test-reports/
```

`df-auth` roda uma vez, na configuração inicial, junto com a Onda 0 — ele
entrega `db/auth-schema.ts` e o `df-architect` reaponta as foreign keys na mesma
migration. Depois disso só é acionado para mudança em login, sessão ou proteção
de rota.

`df-debug` não tem lugar fixo no fluxo. É consultado sob demanda, por qualquer
comando, quando há incerteza sobre comportamento real.

## As três únicas dependências entre agentes

Rule of thumb: se você pode trabalhar contra o contrato publicado, trabalhe.

1. **Todos → `df-architect`.** Sem tabela, tipo e schema Zod publicados não há o
   que importar nem tipar. É a razão de ele existir como onda separada.
2. **`df-actions` → `df-data`** (por entidade). A action não pode tocar o banco
   (seção 2 do `stack.md`), então a função de dados é a única via de escrita dela.
3. **`df-ui` → `df-actions`** (só para mutação). Um formulário precisa da action
   à qual se ligar. A leitura não depende: a UI chama `app/_lib/data` direto no Server
   Component.

Fora dessas três, os agentes trabalham contra `docs/contracts/<fluxo>.md` e não
esperam uns pelos outros. Se um descobrir que precisa de algo de outro, reporta a
assinatura necessária e encerra — nunca escreve no lugar do colega.

## Por que `df-reviewer`, `df-debug` e `df-qa` não são dependências

Nenhum dos três escreve código e nenhum é invocado por outro agente — quem os
aciona é o comando. O `df-qa` escreve só o próprio relatório, em
`docs/test-reports/`. Todo fluxo funciona sem eles; eles só o deixam mais
informado. E os três reportam constatação, nunca correção pronta: um patch vindo
deles seria decisão de desenho tomada fora do ownership, que é justamente o que
o modelo evita.

A fronteira entre eles: o `df-reviewer` lê **código parado** contra as regras;
o `df-debug` investiga **uma pergunta** sobre comportamento em execução; o
`df-qa` roda **uma bateria de cenários** derivada do contrato e diz o que passou
e o que não passou.
