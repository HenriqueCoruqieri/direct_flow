# Contrato — Seed QA

Descreve o bloco `seedQa` de `db/seed.ts` (dono: `df-data`). Consumidor: o agente
`df-qa`, no comando `/test` e na Onda 4 do `/implement`. O uso dos usuários
durante o teste está em `.claude/agents/df-qa.md`; este documento fixa o que o
seed garante.

## Para que serve

Criar usuários fixos, um por papel, para o `df-qa` testar permissão no
navegador. Eles ficam em setores próprios para que os testes não alterem o
gabarito que o seed demo monta na Diretoria (`docs/contracts/dashboard.md`,
bloco demo).

## Gatilho e execução

- Só roda com `SEED_QA === "true"`. Com qualquer outro valor, retorna sem fazer
  nada.
- `SEED_QA_PASSWORD` é obrigatória e tem no mínimo 8 caracteres; faltando ou
  curta, o seed aborta com mensagem.
- Roda depois de `seedAdmin` e `seedDemo`, e independente deles: não usa o
  retorno de nenhum dos dois.
- Tudo numa transação.
- Idempotente:
  - setor já existente com o mesmo `lower(name)` é reaproveitado;
  - usuário já existente com o mesmo `lower(email)` é ignorado, sem alteração
    (nem senha, nem papel, nem setor).

## Setores

| Nome         | `isBoard` | `isUnassigned` |
| ------------ | --------- | -------------- |
| `QA Suporte` | `false`   | `false`        |
| `QA Infra`   | `false`   | `false`        |

## Usuários

| Papel no teste       | E-mail                              | Nome                | Papel    | Setor      |
| -------------------- | ----------------------------------- | ------------------- | -------- | ---------- |
| Diretor              | `SEED_ADMIN_EMAIL`                  | `SEED_ADMIN_NAME`   | `admin`  | Diretoria  |
| Admin do setor       | `qa.admin.suporte@directflow.test`  | `QA Admin Suporte`  | `admin`  | QA Suporte |
| Membro (autor)       | `qa.member.suporte@directflow.test` | `QA Membro Suporte` | `member` | QA Suporte |
| Admin de outro setor | `qa.admin.infra@directflow.test`    | `QA Admin Infra`    | `admin`  | QA Infra   |

O diretor não é criado pelo `seedQa`: é o admin do `seedAdmin`, com
`SEED_ADMIN_PASSWORD`. Os três usuários QA compartilham `SEED_QA_PASSWORD`.

Atributos dos usuários QA:

- `isActive: true` e `emailVerified: true`.
- `mustChangePassword: false`, explícito. Com `true`, o usuário cairia na troca
  obrigatória de senha no primeiro acesso (ADR 012) e `resolveRegistryAccess`
  devolveria `none`, bloqueando os cenários antes de começarem.
- Senha em `account.password` (`providerId: "credential"`), gravada por
  `insertCredentialUser` com o mesmo hash do Better Auth usado pelo
  `seedAdmin`. `users` não tem coluna de senha.

O domínio `.test` é reservado (RFC 2606) e nunca entrega e-mail: um envio
disparado por engano durante o teste não chega a ninguém.

## Variáveis de ambiente

| Variável           | Para quê                                                                                              |
| ------------------ | ----------------------------------------------------------------------------------------------------- |
| `SEED_QA`          | `true` faz o seed criar os setores e usuários QA. Padrão `false`; nunca em produção                   |
| `SEED_QA_PASSWORD` | Senha dos três usuários QA. Mínimo de 8 caracteres; obrigatória com `SEED_QA=true`. Nunca em produção |

## Dados criados pelos testes

- Todo ticket, tag ou registro criado pelo `df-qa` começa com `[QA]` no título
  ou no nome.
- Criação só nos setores QA. Na Diretoria o teste apenas lê e aprova.
