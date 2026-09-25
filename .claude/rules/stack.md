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

| Necessidade       | Biblioteca única                     | Agente dono    |
| ----------------- | ------------------------------------ | -------------- |
| Framework         | Next.js 16 (App Router)              | —              |
| ORM / banco       | Drizzle ORM + `pg` (Postgres)        | `df-data`      |
| Schema do banco   | Drizzle (`db/schema.ts`)             | `df-architect` |
| Validação         | Zod                                  | `df-architect` |
| Formulários       | React Hook Form + Zod                | `df-ui`        |
| Componentes       | shadcn/ui + Tailwind v4              | `df-ui`        |
| Ícones            | `lucide-react`                       | `df-ui`        |
| Tabelas           | TanStack Table                       | `df-ui`        |
| Notificações (UI) | Sonner (via shadcn)                  | `df-ui`        |
| Datas             | Day.js — **só** via `app/_lib/date`  | `df-architect` |
| Autenticação      | Better Auth                          | `df-auth`      |
| E-mail            | Resend                               | `df-email`     |
| Arquivos          | Cloudflare R2 (`@aws-sdk/client-s3`) | `df-data`      |
| Estado assíncrono | Server Components (padrão)           | `df-ui`        |

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
app/ (UI) ─┬─→ app/_lib/actions/ ─┬─→ app/_lib/data/ ──→ db/
           │                     ├─→ app/_lib/storage/ ──→ Cloudflare R2
           │                     ├─→ app/_lib/email/
           │                     └─→ app/_lib/auth/ ──→ app/_lib/email/
           │
           ├─→ app/_lib/data/           (leitura, só em Server Component)
           ├─→ app/_lib/auth/           (leitura de sessão e proteção de rota)
           │
           └─→ app/_lib/validation/ · app/_lib/domain/ · app/_lib/types/ · app/_lib/date
```

As setas são de mão única. Em particular:

- **UI nunca toca banco.** Nenhum arquivo de UI — tudo em `app/**` fora de
  `app/_lib/**` e `app/api/**` — importa `drizzle-orm`, `@/db/*` ou `pg`. Sem
  exceção.
- **A UI lê direto e escreve só por action.** Um Server Component pode importar
  `app/_lib/data/` e `app/_lib/auth/` para **ler** — lista de tickets, sessão
  atual, redirecionamento de rota protegida — e esse é o caminho padrão, não uma
  concessão (`app/(app)/dashboard/page.tsx` faz as duas coisas). Mutação não: toda
  escrita iniciada pela interface passa por Server Action. Componente marcado
  `"use client"` não importa nenhuma das duas — são código de servidor, e o
  cliente chega a elas pela action ou por props vindas do Server Component.
  Ler direto não dispensa autorizar: a página decide o que mostrar aplicando
  `app/_lib/domain/` sobre a sessão que carregou.
- **Server Actions nunca escrevem query.** Uma action valida, autoriza, chama
  `app/_lib/data/`, revalida e devolve. O SQL vive em `app/_lib/data/`.
- **Arquivo só entra e sai por `app/_lib/storage/`.** É o único lugar que
  importa `@aws-sdk/client-s3` e conhece bucket, chave e credencial do R2 (ADR
  010). Quem chama é a action; UI não importa storage, nem em Server Component.
  `app/_lib/storage/` não importa `app/_lib/data/`, `app/_lib/auth/` nem
  `app/_lib/email/`: grava e apaga arquivo, e a action decide o que fazer com a
  URL devolvida.
- **`app/_lib/auth/` envia e-mail apenas pelos callbacks do Better Auth.** O
  `sendResetPassword` é configurado dentro da instância do Better Auth, então
  quem dispara o e-mail de redefinição é a camada de auth, não a action — a
  action só pede o envio. Fora dos callbacks da biblioteca, e-mail continua
  saindo da action. `app/_lib/email/` nunca importa `app/_lib/auth/`.
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
- `@ts-expect-error` sem descrição na própria diretiva
  (`// @ts-expect-error: <o que se espera e por quê>`)

**`any` e `as`** só quando os quatro caminhos acima falharem. A justificativa
(qual caminho foi tentado e por que não serviu) vai na resposta do agente, com
arquivo e linha, nunca em comentário no código:

> `app/_lib/data/explain.ts:12` — `as any`: retorno do driver `pg` sem tipagem
> para linhas de EXPLAIN; `unknown` + narrowing não compensa, o valor é
> descartado após o log.

Sem essa justificativa na resposta, é violação. O `df-reviewer` trata cada
ocorrência como ATENÇÃO e confere a justificativa no relatório do agente; sem
ela, BLOQUEANTE.

**`as const` e `satisfies` são permitidos e não precisam de justificativa.**
Apesar da palavra `as`, `as const` não é cast: não força o compilador a aceitar
um tipo que ele não consegue provar, só declara que o valor literal é imutável
e mantém os literais em vez de alargá-los para `string`. `satisfies` é o oposto
de um cast: confere o valor contra o tipo sem trocar o tipo inferido. Os dois
aumentam a checagem, nunca a reduzem. Caso de uso típico — derivar a união de
uma lista única, sem repetir os valores:

```ts
export const PERIODS = ["hoje", "semana", "mes", "personalizado"] as const
export type Period = (typeof PERIODS)[number]

export const PERIOD_LABELS = {
  hoje: "Hoje",
  semana: "Semana",
  mes: "Mês",
  personalizado: "Personalizado",
} satisfies Record<Period, string>
```

Sem o `as const`, `Period` seria só `string`. Com o `satisfies`, esquecer um
período ou digitar uma chave errada vira erro de compilação, e o tipo de
`PERIOD_LABELS` continua com as chaves literais.

**Exceção — primitivos gerados pelo shadcn.** Arquivos em `app/_components/ui/**`
gerados pelo CLI (`npx shadcn@latest add`) e não alterados à mão estão isentos
da exigência de justificativa para `as`. Continuam proibidos neles: `any`,
`@ts-ignore` e `!`. Se o arquivo for editado à mão (ex.: ajuste de token), a
isenção cai e a regra volta a valer para as linhas editadas. Trocar o import do
`cn` para `@/app/_lib/utils` e remover comentários gerados pelo CLI não contam
como edição à mão.

Pelo mesmo motivo, formatação de data **interna** de um primitivo gerado
(`toLocaleString`, `toLocaleDateString` etc.) que a aplicação não exibe — um
atributo `data-*`, um modo do componente que não usamos — também está isenta
da regra de datas da seção 1. Se um dia esse texto passar a ser exibido, o
formato entra pela API do próprio componente (ex.: prop `formatters` do
`Calendar`) a partir de `@/app/_lib/date`, nunca editando o primitivo.

**`interface` e `type`.** Props e objetos usam `interface`; `type` fica para o
que `interface` não expressa. Vale para todo componente, não só os que compõem
shadcn, e o ESLint garante (`@typescript-eslint/consistent-type-definitions`).

- Props: `interface NomeComponenteProps`, declarada logo acima do componente.
- Herdar props de outro componente: `extends`, nunca `&`
  (`interface PillButtonProps extends React.ComponentProps<typeof Button>`).
- Mudar uma prop herdada: `extends Omit<..., "prop">` antes de redeclará-la.
- `type` só para: uniões (`type Size = "sm" | "md"`), props "ou isto ou aquilo"
  (cada formato é uma `interface`, a junção é `type`), `z.infer`, `$inferSelect`
  e tipos utilitários. Estender uma união exige `type X = União & { ... }`.
- **União de objetos, em qualquer lugar** — props, retorno de action, estado
  interno de função, resultado de helper privado: cada formato é uma
  `interface` nomeada e a união é `type`. Objeto literal inline dentro da união
  (`type R = { ok: true } | { ok: false; code: C }`) não é permitido, nem em
  tipo não exportado. O ESLint não pega esse caso; o `df-reviewer` pega.
- Primitivos em `app/_components/ui/**` gerados pelo CLI ficam como vieram.

### Convenções

- Alias de import: `@/*` aponta para a raiz (`@/app/_lib/data/tickets`, `@/db/schema`).
- Prettier: sem ponto e vírgula, 2 espaços. `simple-import-sort` ordena imports —
  rode `npm run lint -- --fix` antes de commitar.
- **Sem comentários no código.** Nenhum `//`, `/* */`, `{/* */}` ou JSDoc em
  `.ts`, `.tsx`, `.mjs` e `.css`, em nenhuma hipótese. Toda explicação (trecho
  complexo, dado provisório, placeholder de feature futura, justificativa de
  `as`) vai na resposta do agente, citando arquivo e linha; o orquestrador
  repassa ao usuário no relatório final. Único texto permitido: diretivas de
  ferramenta (`// eslint-disable-next-line <regra>`, `// @ts-expect-error: …`,
  `// @ts-check`), com a justificativa também na resposta. Garantido pelo
  ESLint (`df/no-comments`) em TypeScript/JavaScript; no CSS, pelo `df-reviewer`.
- **Componentes: arrow function + `export default`.** Um componente por
  arquivo, declarado como `const NomeComponente = (props: NomeComponenteProps) => {}`
  e exportado no fim com `export default NomeComponente`. Quem importa usa o
  mesmo nome do componente (`import PillButton from "@/app/_components/pill-button"`).
  Vale também para os arquivos especiais do Next (`page`, `layout`, `loading`,
  `error`, `not-found`); `metadata`, `viewport` e `generateMetadata` continuam
  como exportação nomeada, como o Next exige. Com genérico, use `<T,>`
  (`const DataTable = <TData,>(props: DataTableProps<TData>) => {}`). Primitivos
  em `app/_components/ui/**` ficam como o CLI gera. Garantido pelo ESLint
  (`react/function-component-definition` e `import/prefer-default-export`).
- **Pastas privadas em `app/`.** Dentro de `app/`, toda pasta que não é segmento
  de rota leva `_` no início do nome (`_components`, `_lib`, `_hooks`…). O
  prefixo tira a pasta e as subpastas do roteamento do Next
  (`node_modules/next/dist/docs/01-app/01-getting-started/02-project-structure.md`,
  seção "Private folders"). Segmentos de rota continuam sem prefixo, assim como
  grupos `(grupo)`, dinâmicos `[id]` e paralelos `@slot`.
- **Todo o código da aplicação vive dentro de `app/`.** Não existem
  `components/` nem `lib/` na raiz do projeto. Fora de `app/` ficam só `db/`,
  `emails/`, `docs/`, `public/`, `proxy.ts` e arquivos de configuração.
- **Componente mora perto de quem usa (colocation).** Começa no nível mais
  baixo e só sobe quando uma segunda área passa a usá-lo:
  - usado por **uma rota só** → `_components/` da rota:
    `app/(auth)/login/_components/login-form.tsx`
  - usado por **várias rotas do mesmo grupo** → `_components/` do grupo:
    `app/(auth)/_components/orbit-hero.tsx`
  - usado por **áreas diferentes** → `app/_components/`, solto na pasta:
    `app/_components/pill-button.tsx`
  - moldura comum a todas as telas de um grupo → `layout.tsx` do grupo, não
    componente (`app/(auth)/layout.tsx`)
- **Subpasta em `app/_components/`:** só `ui/` (primitivos do shadcn), `theme/`
  e conjuntos de arquivos que formam uma peça só (`data-table/` com toolbar,
  paginação e cabeçalho). Nunca por tipo de coisa (`form/`, `brand/`, `auth/`).
  Qualquer subpasta nova exige aprovação do usuário: o agente não a cria; para,
  reporta a pasta proposta, os arquivos que iriam para ela e por que formam uma
  peça só, e encerra o turno. O orquestrador leva a pergunta ao usuário.
- **Camadas e utilitários** → `app/_lib/` (`data`, `actions`, `validation`,
  `domain`, `types`, `auth`, `email`, `date.ts`, `utils.ts`). Hooks
  compartilhados → `app/_hooks/`.
- **`cn` tem uma fonte só: `@/app/_lib/utils`.** Todo arquivo, primitivos do
  shadcn inclusive, importa `cn` daí. Importar do pacote `cn` (ou `cn/*`) direto
  é erro de lint (`no-restricted-imports`); a única exceção é o próprio
  `utils.ts`. O CLI do shadcn gera `from "cn"`: depois de todo
  `npx shadcn@latest add`, troque o import.
- **Token novo no `@theme` → registrado no `cn`.** O `cn` resolve conflitos por
  grupo de classe, mas não lê o `globals.css`. Um token com nome fora da escala
  padrão do Tailwind (`--shadow-underline`, `--text-hero`) é classificado no
  grupo errado e descartado em silêncio. Ao criar um, registre-o no `createCn`
  de `app/_lib/utils.ts`, na chave de tema correspondente (`shadow`, `text`,
  `radius`…).

## 6. Commits

`husky` + `commitlint` (Conventional Commits), **sem escopo**: o tipo vem
direto seguido de dois-pontos, nunca `tipo(escopo):`.

Tipos usados: `feat:` · `fix:` · `refactor:` · `chore:` · `docs:`

Um commit por unidade coerente de trabalho. Não comite `.next/` nem `.env`.

Você não faz o commit, apenas sugere a mensagem.

## 7. Ownership de arquivos (a regra que evita conflito entre agentes)

Cada caminho tem **exatamente um** agente com permissão de escrita. Todos os
agentes podem **ler** qualquer arquivo.

| Caminho                                                                                                                              | Escreve                                   |
| ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| `db/schema.ts` (domínio **e** `users`), `db/migrations/**`, `drizzle.config.ts`                                                      | `df-architect`                            |
| `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `.prettierrc.json`, `.gitignore`, `.env.example`                             | `df-architect`                            |
| `app/_lib/types/**`, `app/_lib/validation/**`, `app/_lib/domain/**`, `app/_lib/date.ts`                                              | `df-architect`                            |
| `docs/**`                                                                                                                            | `df-architect`                            |
| `db/auth-schema.ts` (só `session`, `account`, `verification`), `app/_lib/auth/**`, `proxy.ts`, `app/(auth)/**`, `app/api/auth/**`    | `df-auth`                                 |
| `db/index.ts`, `db/seed.ts`, `app/_lib/data/**`, `app/_lib/storage/**`                                                               | `df-data`                                 |
| `app/_lib/actions/**`                                                                                                                | `df-actions`                              |
| `app/_lib/email/**`, `emails/**`                                                                                                     | `df-email`                                |
| `app/**` (exceto `app/(auth)/**`, `app/api/**` e `app/_lib/**`), incluindo `app/_components/**`, `app/_hooks/**` e `app/globals.css` | `df-ui`                                   |
| `app/_lib/utils.ts`, `components.json`                                                                                               | `df-ui`                                   |
| nenhum — apenas leitura e execução                                                                                                   | `df-reviewer`, `df-debug`                 |
| `.claude/**`, `CLAUDE.md`                                                                                                            | orquestrador, só com aprovação do usuário |

`app/_lib/**` não tem dono único: cada subpasta pertence ao agente da camada,
conforme as linhas acima. Subpasta nova em `app/_lib/` só entra com dono
definido nesta tabela.

**Variável de ambiente nova.** O `.env.example` é do `df-architect` porque as
variáveis vêm de agentes diferentes — `df-auth` traz as de sessão, `df-email` as
do Resend — e o arquivo não pode ter dois donos. Quem introduz a variável não
edita o arquivo: reporta o nome e para que serve, e o orquestrador aciona o
`df-architect`. O `.env` de verdade nunca é editado por agente nenhum: quem
preenche valor é o usuário.

**A tabela `users` é do `df-architect`**, em `db/schema.ts`, mesmo sendo a tabela
de usuário do Better Auth. Ela carrega setor, papel e ativo/inativo e é alvo das
foreign keys do domínio; o CLI do Better Auth não conhece nada disso e apagaria
ao regenerar. O `df-auth` alcança essa tabela por configuração (`modelName`,
`fields`, `additionalFields`) e guarda em `db/auth-schema.ts` só o que é seguro
regenerar: `session`, `account` e `verification`. A senha mora em
`account.password`, nunca em `users`. `db/auth-schema.ts` importa `users`; o
contrário nunca acontece.

**Telas em `app/(auth)/**`** são do `df-auth`: layout do grupo, formulários e
componentes usados só por auth (`app/(auth)/_components/`). Ele usa os
componentes compartilhados e o padrão de formulário do `df-ui` (React Hook
Form, Zod e `field` do shadcn) e não cria nada em `app/_components/`. Precisa de
componente compartilhado novo? Pede ao `df-ui`.

Precisa de mudança em arquivo que não é seu? **Não edite.** Descreva o que
precisa e para quem, e encerre seu turno. O orquestrador aciona o dono.

## 8. Definição de pronto

Antes de declarar uma tarefa concluída:

1. `npx tsc --noEmit` passa
2. `npm run lint` passa
3. `npm run build` passa
4. Você não escreveu em caminho de outro agente
5. Nenhuma das regras acima foi violada
