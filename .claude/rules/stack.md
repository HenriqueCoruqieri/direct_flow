# Direct Flow — Regras de Engenharia (canônicas)

Este arquivo é a **única fonte de verdade** das regras transversais. Todo agente
o lê antes de escrever código. Regras específicas de um domínio ficam no arquivo
do agente dono daquele domínio, nunca aqui.

---

## 0. Antes de escrever qualquer código

Este projeto usa **Next.js 16.3.5**. A API, as convenções e a estrutura de
arquivos divergem do que você tem em memória. Leia o guia relevante em
`node_modules/next/dist/docs/` antes de escrever código de rota, layout,
Server Action, cache ou proxy (o antigo middleware). Respeite avisos de deprecação.

O bloco `<!-- BEGIN:nextjs-agent-rules -->` em `AGENTS.md` é gerado pelo
`next dev`. Não o remova; se ele reaparecer no diff, comite junto com o trabalho.

## 1. Stack fixa

Nenhum agente introduz alternativa a estas escolhas sem pedido explícito do
usuário. Não existe "segunda biblioteca para a mesma coisa" neste projeto.

| Necessidade       | Biblioteca única                    | Agente dono    |
| ----------------- | ----------------------------------- | -------------- |
| Framework         | Next.js 16 (App Router)             | —              |
| ORM / banco       | Drizzle ORM + `pg` (Postgres)       | `df-data`      |
| Schema do banco   | Drizzle (`db/schema.ts`)            | `df-architect` |
| Validação         | Zod                                 | `df-architect` |
| Formulários       | React Hook Form + Zod               | `df-ui`        |
| Componentes       | shadcn/ui + Tailwind v4             | `df-ui`        |
| Ícones            | `lucide-react`                      | `df-ui`        |
| Tabelas           | TanStack Table                      | `df-ui`        |
| Notificações (UI) | Sonner (via shadcn)                 | `df-ui`        |
| Datas             | Day.js — **só** via `app/_lib/date` | `df-architect` |
| Autenticação      | Better Auth                         | `df-auth`      |
| E-mail            | Resend                              | `df-email`     |
| Estado assíncrono | Server Components (padrão)          | `df-ui`        |

**Datas:** `dayjs` é importado em **um único arquivo**, `app/_lib/date.ts`. Qualquer
outro arquivo que precise formatar data importa de `@/app/_lib/date`. Isso é o que
garante formatação consistente em toda a aplicação — não é preferência de estilo.

**TanStack Query:** desligado por padrão. Busca de dados é Server Component +
recursos nativos do Next. Só entra quando houver necessidade real e comprovada
de cache no cliente, sincronização entre abas, refetch, polling ou orquestração
de estado assíncrono complexo. Quem introduzir registra o motivo em
`docs/adr/` e cita o caso concreto. "Pode ser útil depois" não é motivo.

## 2. Camadas e direção das dependências

```
app/ (UI)  →  app/_lib/actions/  →  app/_lib/data/  →  db/
   │              │
   │              ├→ app/_lib/email/
   │              └→ app/_lib/auth/
   └──────────────┴→ app/_lib/validation/ · app/_lib/domain/ · app/_lib/types/ · app/_lib/date
```

As setas são de mão única. Em particular:

- **UI nunca toca banco.** Nenhum arquivo de UI — tudo em `app/**` fora de
  `app/_lib/**` e `app/api/**` — importa `drizzle-orm`, `@/db/*` ou `pg`. Sem
  exceção.
- **Server Actions nunca escrevem query.** Uma action valida, autoriza, chama
  `app/_lib/data/`, revalida e devolve. O SQL vive em `app/_lib/data/`.
- **`app/_lib/domain/` e `app/_lib/validation/` não fazem I/O.** São funções puras e
  schemas. Por serem puros, rodam no servidor e no cliente — é o que permite
  a UI decidir se mostra um botão usando a _mesma_ regra que a action usa para
  autorizar, sem duplicar lógica.

## 3. Mutações e rotas de API

Toda mutação iniciada pela interface é **Server Action**. Não se cria
`app/api/**/route.ts` para conversar com o próprio backend.

Exceções permitidas (as únicas, e cada uma tem dono):

- `app/api/auth/[...all]/route.ts` — handler obrigatório do Better Auth (`df-auth`)
- webhooks de terceiros, se e quando existirem (`df-email` para Resend)

Qualquer outra rota de API precisa de justificativa escrita em `docs/adr/`.

## 4. package.json

Ninguém edita `package.json` ou `package-lock.json` à mão. Instalação é sempre
`npm install <pacote>`. Cada agente instala **apenas** os pacotes listados no
próprio arquivo. Se você precisa de um pacote que não está na sua lista, pare e
reporte — provavelmente ele pertence a outro agente.

## 5. Código

### Princípios

- **KISS** — a solução mais simples que resolve o caso de hoje. Sem camada de
  abstração para requisito que ninguém pediu.
- **DRY** — regra de negócio, schema Zod, tipo e formatação de data existem em
  um lugar só. Se você está copiando, pare e importe.
- **SOLID** — um arquivo, uma responsabilidade. Módulo depende de assinatura
  documentada, não de detalhe interno de outro módulo.

### TypeScript

O `strict` está ligado. Erro de tipo é bloqueante: nenhuma implementação é
considerada concluída com `npx tsc --noEmit` falhando.

Quando o tipo não fecha, na maioria das vezes o desenho está errado e o
compilador está certo. Resolva nesta ordem, parando no primeiro que funcionar:

1. usar o tipo já existente no projeto (`app/_lib/types/`, `$inferSelect` do Drizzle,
   `z.infer` do schema Zod)
2. refinar o tipo (_type narrowing_) — checagem de `null`, `in`, `typeof`,
   discriminated union
3. generalizar com genérico
4. `unknown` seguido de narrowing

Isso resolve praticamente todo caso em que o reflexo pede `any`.

**Nunca**, sem exceção:

- `@ts-ignore`
- `!` (non-null assertion) para calar o compilador
- afrouxar `tsconfig.json`
- `@ts-expect-error` sem comentário explicando o que se espera e por quê

**`any` e `as`** só quando os quatro caminhos acima falharem, com comentário na
linha imediatamente acima dizendo qual deles foi tentado e por que não serviu:

```ts
// any: retorno do driver pg sem tipagem para linhas de EXPLAIN;
// unknown + narrowing não compensa aqui, o valor é descartado após o log
const plan = result.rows as any
```

Sem esse comentário, é violação. O `df-reviewer` trata cada ocorrência com
justificativa como ATENÇÃO e cada uma sem justificativa como BLOQUEANTE.

**Exceção — primitivos gerados pelo shadcn.** Arquivos em `app/_components/ui/**`
gerados pelo CLI (`npx shadcn@latest add`) e não alterados à mão estão isentos
da exigência de comentário em `as`. Continuam proibidos neles: `any`,
`@ts-ignore` e `!`. Se o arquivo for editado à mão (ex.: ajuste de token), a
isenção cai e a regra volta a valer para as linhas editadas.

### Convenções

- Alias de import: `@/*` aponta para a raiz (`@/app/_lib/data/tickets`, `@/db/schema`).
- Prettier: sem ponto e vírgula, 2 espaços. `simple-import-sort` ordena imports —
  rode `npm run lint -- --fix` antes de commitar.
- **Pastas privadas em `app/`.** Dentro de `app/`, toda pasta que não é segmento
  de rota leva `_` no início do nome (`_components`, `_lib`, `_hooks`…). O
  prefixo tira a pasta e as subpastas do roteamento do Next
  (`node_modules/next/dist/docs/01-app/01-getting-started/02-project-structure.md`,
  seção "Private folders"). Segmentos de rota continuam sem prefixo, assim como
  grupos `(grupo)`, dinâmicos `[id]` e paralelos `@slot`.
- **Todo o código da aplicação vive dentro de `app/`.** Não existem
  `components/` nem `lib/` na raiz do projeto. Fora de `app/` ficam só `db/`,
  `drizzle/`, `emails/`, `docs/`, `public/`, `proxy.ts` e arquivos de
  configuração. Onde colocar cada coisa:
  - usado por **uma rota só** → pasta privada dentro da rota:
    `app/(auth)/login/_components/login-form.tsx`
  - componente usado por **mais de uma rota** → `app/_components/`
    (design system, primitivos shadcn em `app/_components/ui/`)
  - camadas da aplicação e utilitários compartilhados → `app/_lib/`
    (`data`, `actions`, `validation`, `domain`, `types`, `auth`, `email`,
    `date.ts`, `utils.ts`)
  - hooks compartilhados → `app/_hooks/`

## 6. Commits

`husky` + `commitlint` (Conventional Commits). Use o escopo do seu domínio:

`feat:` · `fix` · `refactor` · `chore` Não utilize "()" depois do prefixo.

Um commit por unidade coerente de trabalho. Não comite `.next/` nem `.env`.

Você não faz o commit, apenas sugere a mensagem.

## 7. Ownership de arquivos (a regra que evita conflito entre agentes)

Cada caminho tem **exatamente um** agente com permissão de escrita. Todos os
agentes podem **ler** qualquer arquivo.

| Caminho                                                                                                                              | Escreve        |
| ------------------------------------------------------------------------------------------------------------------------------------ | -------------- |
| `db/schema.ts`, `drizzle/**` (migrations), `drizzle.config.ts`                                                                       | `df-architect` |
| `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `.prettierrc.json`                                                           | `df-architect` |
| `app/_lib/types/**`, `app/_lib/validation/**`, `app/_lib/domain/**`, `app/_lib/date.ts`                                              | `df-architect` |
| `docs/**`                                                                                                                            | `df-architect` |
| `db/auth-schema.ts`, `app/_lib/auth/**`, `proxy.ts`, `app/(auth)/**`, `app/api/auth/**`                                              | `df-auth`      |
| `db/index.ts`, `db/seed.ts`, `app/_lib/data/**`                                                                                      | `df-data`      |
| `app/_lib/actions/**`                                                                                                                | `df-actions`   |
| `app/_lib/email/**`, `emails/**`                                                                                                     | `df-email`     |
| `app/**` (exceto `app/(auth)/**`, `app/api/**` e `app/_lib/**`), incluindo `app/_components/**`, `app/_hooks/**` e `app/globals.css` | `df-ui`        |
| `app/_lib/utils.ts`, `components.json`                                                                                               | `df-ui`        |

`app/_lib/**` não tem dono único: cada subpasta pertence ao agente da camada,
conforme as linhas acima. Subpasta nova em `app/_lib/` só entra com dono
definido nesta tabela.
| nenhum — apenas leitura e execução | `df-reviewer` |
| `.claude/**`, `CLAUDE.md` | orquestrador, só com aprovação do usuário |

**Formulários em `app/(auth)/**`** são do `df-auth`: ele monta a tela e o
formulário usando os componentes e o padrão de formulário do `df-ui`
(React Hook Form + Zod + `field` do shadcn), sem criar componente próprio em
`app/_components/`. Precisa de componente novo? Pede ao `df-ui`.

Precisa de mudança em arquivo que não é seu? **Não edite.** Descreva o que
precisa e para quem, e encerre seu turno. O orquestrador aciona o dono.

## 8. Definição de pronto

Antes de declarar uma tarefa concluída:

1. `npx tsc --noEmit` passa
2. `npm run lint` passa
3. `npm run build` passa
4. Você não escreveu em caminho de outro agente
5. Nenhuma das regras acima foi violada
