# Contrato — Seed QA

Descreve o bloco `seedQa` de `db/seed.ts` (dono: `df-data`). Consumidor: o agente
`df-qa`, no comando `/test` e na Onda 4 do `/implement`. O uso dos usuários
durante o teste está em `.claude/agents/df-qa.md`; este documento fixa o que o
seed garante.

## Para que serve

Criar usuários fixos, um por papel, para o `df-qa` testar permissão no
navegador, e chamados com datas no passado que a interface não consegue
produzir (janela de edição). Eles ficam em setores próprios para que os testes não alterem o
gabarito que o seed demo monta na Diretoria (`docs/contracts/dashboard.md`,
bloco demo).

## Gatilho e execução

- Só roda com `SEED_QA === "true"`. Com qualquer outro valor, retorna sem fazer
  nada.
- `SEED_QA_PASSWORD` é obrigatória e tem no mínimo 8 caracteres; faltando ou
  curta, o seed aborta com mensagem.
- Roda depois de `seedAdmin` e `seedDemo`, e independente deles: não usa o
  retorno de nenhum dos dois.
- Tudo numa transação (setores, usuários e os chamados da janela de edição).
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

## Chamados da janela de edição

Acrescentado em 2026-10-05 (`docs/contracts/ticket-edit-window.md`). Dois
chamados `resolvido` para testar a janela de 7 dias e o cron de encerramento
sem esperar uma semana. Criados na mesma transação do `seedQa`, depois dos
usuários.

| Título                | `resolved_at`                                    | Para quê                                               |
| --------------------- | ------------------------------------------------ | ------------------------------------------------------ |
| `[QA] Janela vencida` | agora − (`RESOLUTION_EDIT_WINDOW_MS` + `DAY_MS`) | travado pelo domínio antes do cron; fechado pelo cron  |
| `[QA] Janela aberta`  | agora − (`RESOLUTION_EDIT_WINDOW_MS` − `DAY_MS`) | editável (inclusive a solução) e comentável; não fecha |

"Agora" é **um** `new Date()` por execução do seed. Os dois deslocamentos são
"janela ± 1 dia", derivados de `RESOLUTION_EDIT_WINDOW_MS` e `DAY_MS`, ambos
exportados por `app/_lib/domain/ticket-closure.ts`: hoje dão 8 e 6 dias, e
acompanham a janela se ela mudar. O seed não escreve nenhuma duração em dias
nem redeclara milissegundos por dia; `created_at` = `resolved_at` − `DAY_MS`.

Campos comuns aos dois:

| Campo                                           | Valor                                                                                   |
| ----------------------------------------------- | --------------------------------------------------------------------------------------- |
| autor (`created_by`)                            | QA Membro Suporte (buscado por `lower(email)`)                                          |
| `origin_department_id`, `current_department_id` | QA Suporte                                                                              |
| `status`                                        | `resolvido`                                                                             |
| `priority`, `type`                              | `media`, `duvida`                                                                       |
| `assigned_to`, `closed_at`                      | nulos                                                                                   |
| `description`                                   | `[QA] Chamado criado pelo seed para testar a janela de edição.`                         |
| `solution`                                      | `[QA] Solução registrada pelo seed para testar a janela de edição.`                     |
| `created_at`                                    | `resolved_at` − `DAY_MS`                                                                |
| `updated_at`                                    | `resolved_at`                                                                           |
| `ticket_tag`                                    | uma linha com a tag `[QA] Acesso` de QA Suporte, `created_at` = `created_at` do chamado |

Tag: reaproveita `[QA] Acesso` de QA Suporte (por `lower(name)` no setor),
**sem** alterar `is_active`; se não existir, cria ativa. Se estiver inativa, a
preparação dos cenários a reativa.

Histórico, por chamado, em ordem:

| `event`     | `changed_by`      | Colunas                                                                      | `changed_at`  |
| ----------- | ----------------- | ---------------------------------------------------------------------------- | ------------- |
| `criacao`   | QA Membro Suporte | `to_status = aberto`, `to_priority = media`, `to_department_id` = QA Suporte | `created_at`  |
| `resolucao` | QA Membro Suporte | `from_status = aberto`, `to_status = resolvido`; `note` nula                 | `resolved_at` |

Idempotência: para cada título, se já existe chamado do membro com esse título,
`status = resolvido` **e** no lado certo da janela
(`isResolutionWindowOpen(resolvedAt, agora)` falso para "vencida", verdadeiro
para "aberta"), o seed não faz nada (log). Senão, cria um novo. Assim:

- depois que o cron fecha o `[QA] Janela vencida`, o próximo seed cria outro;
- depois que o `[QA] Janela aberta` vence (1 dia), o próximo seed cria outro.

Os antigos ficam como estão (o histórico é append-only). O `df-qa` usa o de
maior `id` de cada título que ainda esteja `resolvido`.

## Variáveis de ambiente

| Variável           | Para quê                                                                                              |
| ------------------ | ----------------------------------------------------------------------------------------------------- |
| `SEED_QA`          | `true` faz o seed criar os setores e usuários QA. Padrão `false`; nunca em produção                   |
| `SEED_QA_PASSWORD` | Senha dos três usuários QA. Mínimo de 8 caracteres; obrigatória com `SEED_QA=true`. Nunca em produção |

## Dados criados pelos testes

- Todo ticket, tag ou registro criado pelo `df-qa` começa com `[QA]` no título
  ou no nome.
- Criação só nos setores QA. Na Diretoria o teste apenas lê e aprova.
- Exceção: a chamada ao cron de encerramento
  (`docs/contracts/ticket-edit-window.md`) fecha **todo** `resolvido` vencido
  do banco, inclusive os do seed demo na Diretoria. É o comportamento de
  produção, não um dado de teste; o relatório registra quantos foram fechados.
