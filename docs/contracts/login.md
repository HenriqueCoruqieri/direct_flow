# Contrato — Login (etapa 1: somente layout)

## Escopo desta etapa

Apenas a tela de login, sem backend. Não há Better Auth, migration, Server
Action, função de dados nem e-mail nesta etapa. `db/schema.ts` não muda.

Referência visual: canvas https://claude.ai/artifact/QFARH48WWbuxmM1V8N1479,
conceito "Órbita". Accent teal: `#3DD6B5` (tema escuro) / `#087360` (tema claro).

## Tabelas e enums

Nenhum nesta etapa.

## Validação — `app/_lib/validation/auth.ts`

```ts
export const loginSchema: z.ZodObject<{ email; password }>
export type LoginInput = { email: string; password: string }
```

| Campo      | Regra                                      | Mensagem              |
| ---------- | ------------------------------------------ | --------------------- |
| `email`    | string, `trim`, obrigatório                | `Informe seu e-mail.` |
| `email`    | formato de e-mail (`z.email()`, após trim) | `E-mail inválido.`    |
| `password` | string, obrigatório (sem trim, sem mínimo) | `Informe sua senha.`  |

- Campo vazio mostra só a mensagem de obrigatório (o formato não é checado).
- Sem tamanho mínimo de senha: é login de conta existente. Regra de força fica
  para o schema de redefinição de senha.
- Schema puro (Zod 4), sem I/O. Uso no cliente: `zodResolver(loginSchema)` com
  `useForm<LoginInput>({ defaultValues: { email: "", password: "" } })`.
  No servidor (etapa futura): `loginSchema.safeParse(input)`.

## Domínio — `app/_lib/domain/`

Nenhuma função nesta etapa.

## Rota

`/login` em `app/(auth)/login/` — dono `df-auth` (seção 7 do stack.md). A página
compõe os componentes publicados pelo `df-ui`.

## Componentes (`df-ui`, em `app/_components/**`)

O `df-ui` define e publica as assinaturas exatas:

- `OrbitHero` — painel visual do conceito "Órbita"
- `LogoMark` — marca do Direct Flow
- `AuthShell` — moldura da tela de autenticação (hero + área do formulário)
- `UnderlineInput` — input com estilo sublinhado, compatível com React Hook Form
- `PillButton` — botão em pílula (submit)
- `ThemeToggle` — alternância claro/escuro

## Submit (provisório)

Validação client-side com `loginSchema`. Se válido, exibe toast (Sonner)
"Autenticação em breve" e não envia nada ao servidor.

## Data (`df-data`) e Server Actions (`df-actions`)

Nenhuma nesta etapa.

## Fica para depois

- Better Auth com `disableSignUp: true` (sem cadastro público); contas criadas
  pelo admin
- Remoção do `user` artesanal (com `password`) de `db/schema.ts`, substituído
  pelo `user` de `db/auth-schema.ts`, com FKs reapontadas na mesma migration
- `proxy.ts` para proteção de rota (Next 16)
- Seed do primeiro admin
- Server Action de login ligada ao formulário
- Redefinição de senha via Resend (`df-email`), com schema próprio contendo a
  regra de força de senha
