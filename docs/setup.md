# Configuração do ambiente

Guia para quem acabou de clonar o repositório: rodar o Direct Flow localmente e
depois publicar na Vercel.

## 1. Pré-requisitos

- **Node.js 20.9 ou superior.** O `package.json` do projeto não declara
  `engines`; o limite vem do próprio Next.js 16.3.5 instalado
  (`node_modules/next/package.json`, `"node": ">=20.9.0"`).
- **Banco Postgres.** O projeto usa Neon (ADR 013, `.env.example`); qualquer
  Postgres acessível por connection string funciona para a aplicação.
- **Cloudflare R2**, para fotos de perfil e anexos de chamado (ADR 010, ADR 018).
- **Resend**, para e-mail. Opcional em desenvolvimento, obrigatório fora dele.
- **Vercel**, para o deploy e para a tarefa agendada (ADR 014).

## 2. Instalação

1. Instale as dependências:

   ```bash
   npm install
   ```

   O script `prepare` roda o `husky`, que instala os hooks de Git do projeto:
   `pre-commit` executa `lint-staged` (ESLint e Prettier nos arquivos em stage) e
   `commit-msg` executa o `commitlint` com Conventional Commits
   (`commitlint.config.mjs`).

2. Copie o modelo de variáveis:

   ```bash
   cp .env.example .env
   ```

   O `.env` está no `.gitignore` e nunca é comitado.

## 3. Variáveis de ambiente

O `.env.example` traz 20 variáveis. Abaixo, agrupadas por serviço.

### Banco (Neon / Postgres)

| Variável          | Obrigatória      | O que é e de onde vem                                                                                                                                                                                          |
| ----------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`    | sim              | Connection string do banco da aplicação, usada pelo `Pool` de `db/index.ts` e pelo `drizzle-kit`. Sem ela o `drizzle-kit` aborta (`drizzle.config.ts`). No painel do Neon, copie a connection string do banco. |
| `DB_READONLY_URL` | não (só agentes) | Conexão somente leitura do MCP `postgres`, com o role `df_readonly`. Usa o host direto, sem `-pooler`. Ver a seção 6.                                                                                          |

### Better Auth

| Variável             | Obrigatória | O que é e de onde vem                                                                                                                                                                                 |
| -------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BETTER_AUTH_SECRET` | sim         | Segredo de criptografia e hash da sessão (`app/_lib/auth/auth.ts`). A documentação do Better Auth pede no mínimo 32 caracteres de alta entropia e sugere gerar com `openssl rand -base64 32`.         |
| `BETTER_AUTH_URL`    | sim         | URL base da aplicação: `http://localhost:3000` em desenvolvimento, o domínio de produção na Vercel. Sem ela o Better Auth infere a URL da requisição, o que a própria documentação dele desaconselha. |

### Senha padrão de novas pessoas

| Variável                | Obrigatória | O que é e de onde vem                                                                                                                                                                                                                                                                                                    |
| ----------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `DEFAULT_USER_PASSWORD` | não         | Senha com que nasce toda pessoa cadastrada em Cadastros → Pessoas, e para a qual "Restaurar senha padrão" volta. A pessoa é obrigada a trocá-la no primeiro acesso (ADR 012). Sem ela, criar pessoa e restaurar senha falham com mensagem; o resto funciona. O `.env.example` pede no mínimo 8 caracteres. Escolha você. |

### Seed (só local)

| Variável              | Obrigatória        | O que é                                                                                               |
| --------------------- | ------------------ | ----------------------------------------------------------------------------------------------------- |
| `SEED_ADMIN_NAME`     | sim, para o seed   | Nome do primeiro administrador.                                                                       |
| `SEED_ADMIN_EMAIL`    | sim, para o seed   | E-mail de login do primeiro administrador.                                                            |
| `SEED_ADMIN_PASSWORD` | sim, para o seed   | Senha de login do primeiro administrador.                                                             |
| `SEED_DEMO`           | não (`false`)      | Com `true`, cria tags e chamados de demonstração no setor do admin. Nunca ligar em produção.          |
| `SEED_QA`             | não (`false`)      | Com `true`, cria setores, usuários, empresas e chamados de teste do `/test`. Nunca ligar em produção. |
| `SEED_QA_PASSWORD`    | com `SEED_QA=true` | Senha dos usuários de teste. O seed aborta se faltar ou tiver menos de 8 caracteres.                  |

Sem qualquer uma das três `SEED_ADMIN_*`, o seed aborta com
`Seed abortado: variável de ambiente ... não definida.` A aplicação em si não
lê essas variáveis.

### Tarefa agendada

| Variável      | Obrigatória      | O que é e de onde vem                                                                                                                                                                                                   |
| ------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CRON_SECRET` | sim, para o cron | Segredo que a Vercel envia em `Authorization: Bearer <CRON_SECRET>` ao chamar `/api/cron/*`. Sem ele, a rota sempre responde `401` e não toca o banco (ADR 014), inclusive localmente. Gere com `openssl rand -hex 32`. |

### Resend (e-mail)

| Variável         | Obrigatória             | O que é e de onde vem                                                                                                                                                                                                                                                                                                                        |
| ---------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RESEND_API_KEY` | fora de desenvolvimento | Chave da API do Resend, criada no painel do Resend. Em desenvolvimento (`npm run dev`), vazia faz o envio virar log no terminal; o `/test` conta com isso. Fora de desenvolvimento, o módulo de e-mail lança erro ao carregar (`app/_lib/email/client.ts`), e a instância do Better Auth o importa. O `next build` é poupado dessa checagem. |
| `EMAIL_FROM`     | sim, quando há chave    | Remetente, no formato `Nome <endereco@dominio>`. Só é conferido quando há `RESEND_API_KEY`: sem ele o envio falha (`app/_lib/email/shared.ts`). O endereço precisa ser de um domínio aceito pela sua conta no Resend.                                                                                                                        |

### Cloudflare R2 (arquivos)

| Variável                | Obrigatória para arquivos | O que é e de onde vem                                                                                                           |
| ----------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `R2_ACCOUNT_ID`         | sim                       | ID da conta Cloudflare. Monta o endpoint `https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com`.                                    |
| `R2_ACCESS_KEY_ID`      | sim                       | Chave de acesso de um token de API do R2.                                                                                       |
| `R2_SECRET_ACCESS_KEY`  | sim                       | Segredo do mesmo token.                                                                                                         |
| `R2_AVATARS_BUCKET`     | sim                       | Nome do bucket **público** das fotos de perfil.                                                                                 |
| `R2_AVATARS_PUBLIC_URL` | sim                       | URL pública do bucket de avatares, sem barra no final (ex.: `https://pub-xxxx.r2.dev`).                                         |
| `R2_ATTACHMENTS_BUCKET` | sim                       | **Nome** do bucket **privado** dos anexos (ex.: `direct-flow-attachments`), nunca uma URL: uma URL aqui dá `InvalidBucketName`. |

Sem R2 configurado o resto do app funciona: o storage só lança erro na primeira
chamada, e falham apenas o envio e a remoção de foto e de anexo (ADR 010).

Configuração dos buckets, em resumo (o passo a passo está em
`docs/adr/018-direct-upload-of-ticket-attachments.md`, seção "Configuração no
painel da Cloudflare"):

1. Bucket de avatares com acesso público (URL `r2.dev` ou domínio customizado).
   Essa URL vai em `R2_AVATARS_PUBLIC_URL`.
2. Bucket de anexos **sem** acesso público: nem `r2.dev`, nem domínio
   customizado.
3. No bucket de anexos, CORS liberando `PUT` com o cabeçalho `content-type` de
   `http://localhost:3000` e do domínio de produção.
4. No bucket de anexos, regra de ciclo de vida que apaga o prefixo `pending/`
   após 1 dia.
5. Um token de API do R2 com leitura e escrita de objetos **nos dois** buckets.

## 4. Banco de dados

1. Com `DATABASE_URL` preenchida, aplique as migrations de `db/migrations`:

   ```bash
   npm run db:migrate
   ```

   As migrations também criam o setor "Não alocado"
   (`0006_unassigned_department.sql`).

2. Com as `SEED_ADMIN_*` preenchidas, rode o seed:

   ```bash
   npm run db:seed
   ```

   Ele cria o setor "Diretoria" (o setor com poder global, ADR 011) e, nele, o
   administrador com o nome, e-mail e senha das `SEED_ADMIN_*`. Com
   `SEED_DEMO=true`, cria também chamados de demonstração; com `SEED_QA=true`,
   os setores "QA Suporte" e "QA Infra" e os usuários de teste
   `qa.admin.suporte@directflow.test`, `qa.member.suporte@directflow.test` e
   `qa.admin.infra@directflow.test`, com a senha de `SEED_QA_PASSWORD`.

   O seed pode ser rodado de novo sem duplicar: o admin é ignorado se o e-mail
   já existe, os dados de demonstração só entram se o setor do admin ainda não
   tem chamados, e a parte QA reaproveita o que já existe.

3. Primeiro acesso: o cadastro público está desligado (`disableSignUp: true` em
   `app/_lib/auth/auth.ts`), então o admin do seed é a única forma de entrar
   num banco vazio. Entre em `/login` com `SEED_ADMIN_EMAIL` e
   `SEED_ADMIN_PASSWORD`. O admin do seed não passa pela troca obrigatória de
   senha; ela vale para as pessoas cadastradas depois em Cadastros → Pessoas.

Para inspecionar o banco, `npm run db:studio` abre o Drizzle Studio.
`npm run db:generate` gera migration nova a partir do schema, e só é usado
quando o schema muda.

## 5. Rodar localmente

```bash
npm run dev
```

Abra http://localhost:3000. A raiz redireciona para `/login`.

## 6. Opcional: acesso dos agentes (Claude Code)

Só necessário para quem usa os agentes do Claude Code descritos no
`CLAUDE.md`. A aplicação não depende de nada desta seção.

**MCPs.** O `.mcp.json` declara quatro servidores: `playwright` (navegador),
`next-devtools` (erros e logs do dev server), `postgres` (consulta ao banco,
só leitura) e `context7` (documentação das bibliotecas). Os comandos estão
escritos com `cmd /c npx`, ou seja, para Windows.

**Role somente leitura** (usado pelo MCP `postgres`, ADR 013):

1. Abra `db/roles/readonly-role.sql` e troque `<SENHA>` por uma senha aleatória
   longa. O arquivo traz um exemplo de como gerar no PowerShell.
2. Rode o arquivo uma vez, à mão, no SQL Editor do Neon. Crie o role por SQL,
   não pelo console do Neon: role criado pelo console ganha permissão de
   escrita. O script assume o banco `neondb` e o owner `neondb_owner`.
3. Preencha `DB_READONLY_URL` com o usuário `df_readonly`, essa senha e o host
   **direto** do Neon (sem `-pooler`), como no exemplo do `.env.example`.

O `dbhub.toml` lê `DB_READONLY_URL` do `.env`. O role não enxerga `account`,
`session` nem `verification`.

## 7. Deploy na Vercel

1. **Migrations no banco de produção antes do deploy.** O `npm run build` não
   roda migration. Com `DATABASE_URL` apontando para o banco de produção, rode
   `npm run db:migrate` e, se o banco estiver vazio, `npm run db:seed` com
   `SEED_DEMO=false` e `SEED_QA=false`, para criar o primeiro administrador.
2. **Variáveis no projeto da Vercel.** Cadastre:
   - `DATABASE_URL` (banco de produção)
   - `BETTER_AUTH_SECRET`
   - `BETTER_AUTH_URL` com o domínio de produção (`https://...`)
   - `DEFAULT_USER_PASSWORD`
   - `CRON_SECRET`
   - `RESEND_API_KEY` e `EMAIL_FROM` (fora de desenvolvimento a chave é
     obrigatória)
   - as seis `R2_*`

   Ficam só no `.env` local: as `SEED_*` (o seed roda pela sua máquina) e
   `DB_READONLY_URL` (ADR 013: aponta só para desenvolvimento).

3. **CORS do bucket de anexos** com o domínio de produção na lista de origens
   (seção 3). Deploys de preview com URL própria não conseguem enviar anexo até
   a origem deles entrar na regra (ADR 018).
4. **Cron.** O `vercel.json` agenda `GET /api/cron/close-resolved-tickets`
   todo dia às `0 6 * * *` (06:00 UTC, 03:00 em São Paulo). Ele fecha os
   chamados resolvidos cuja janela de 7 dias venceu. Com `CRON_SECRET` nas
   variáveis do projeto, a Vercel envia o segredo sozinha. A primeira execução
   fecha em lote todo resolvido já vencido (ADR 014).

## 8. Verificação rápida

```bash
npx tsc --noEmit
npm run lint
npm run build
```

Os três precisam passar antes de qualquer entrega (seção 8 de
`.claude/rules/stack.md`).
