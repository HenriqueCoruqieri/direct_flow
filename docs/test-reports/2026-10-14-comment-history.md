# Relatório de testes — Histórico de comentários (`message_history`)

- **Data:** 2026-10-14
- **Contrato:** `docs/contracts/comment-history.md`
- **Commit:** `50e4fd7` · alterações não comitadas: sim
- **Ambiente:** `http://localhost:3000`, `next dev`, banco de desenvolvimento
- **Resultado:** 9 de 10 passaram · 1 falhou · 0 bloqueados · 0 não executados

## Pré-requisitos

- Dev server: `GET /login` devolveu 200.
- MCP: `next-devtools` achou o servidor na porta 3000; `playwright` abriu `/login` e a janela foi trazida à frente; `SELECT 1` no `postgres` respondeu.
- Usuários: `SELECT email, role, is_active FROM users` devolveu os 4 e-mails da tabela de teste, todos ativos.
- E-mail: `RESEND_API_KEY` está **preenchida** no `.env`. A etapa não dispara e-mail (contrato, "O que não muda"), então nenhum cenário foi marcado como não executado. Mas a linha de log `RESEND_API_KEY não configurada…` não existe neste ambiente, e a parte "nenhum e-mail novo" do MH9 fica sem confirmação por log (ver Observações).

## Cenários

Chamado de preparação `#H1` = **#226** `[QA] Histórico de comentários` (QA Suporte, destinatário M, criado por M pelo "Novo chamado"). Ids: M = 14, A = 13.

| #   | Cenário                                                                                    | Papel | Status     |
| --- | ------------------------------------------------------------------------------------------ | ----- | ---------- |
| MH1 | Retroativo: `criacao` = `message`, sem divergência                                         | —     | PASSOU     |
| MH2 | M comenta `[QA] texto 1` (público) e a linha `criacao` bate                                | M     | **FALHOU** |
| MH3 | M edita para `[QA] texto 2`                                                                | M     | PASSOU     |
| MH4 | M salva o mesmo texto: `NO_CHANGES`, nada gravado                                          | M     | PASSOU     |
| MH5 | M exclui: 3 linhas `criacao` → `edicao` → `exclusao`                                       | M     | PASSOU     |
| MH6 | A forja `editTicketComment` e `deleteTicketComment` em comentário de M                     | A     | PASSOU     |
| MH7 | M, comentário interno: criar, editar, excluir                                              | M     | PASSOU     |
| MH8 | Regressão da tela de comentários (comentar, editar, excluir, rótulos, interno visto por A) | M, A  | PASSOU     |
| MH9 | Console, `next-devtools` e logs sem erro nem aviso                                         | —     | PASSOU     |
| R1  | Responsivo 390×844 na tela de comentários de #226                                          | M     | PASSOU     |

Evidências dos que passaram (todas pelo MCP `postgres`):

- **MH1** (antes de qualquer comentário novo, `max(id)` = 73):
  `SELECT count(*) FROM message_history WHERE event='criacao'` = 73; `SELECT count(*) FROM message` = 73; linhas `edicao`/`exclusao` = 0; consulta de divergência do contrato = 0. Nenhum comentário novo apareceu entre a conferência do orquestrador e o início do teste.
- **MH3**: linha 75 `edicao`, `message_id` 94, `actor_id` 14, `content = '[QA] texto 2'`, `visibility = publica`, `changed_at` = `message.updated_at` (`2026-10-14 19:22:49.099+00`, igualdade `true`); linha 74 `criacao` manteve `[QA] texto 1`.
- **MH4**: a tela mostrou o toast "Nenhuma alteração para salvar." (`.qa-output/mh4.png`); `max(id)` continuou 75 e #226 seguiu com 2 linhas.
- **MH5**: o comentário sumiu da tela ("Nenhum comentário ainda."); `SELECT count(*) FROM message WHERE id=94` = 0; linhas 74 `criacao` (`[QA] texto 1`), 75 `edicao` (`[QA] texto 2`), 76 `exclusao` (`[QA] texto 2`), todas `message_id` 94, `actor_id` 14, `publica`.
- **MH6**: POST da Server Action (header `Next-Action`) logado como A, comentário 96 de M. `editTicketComment` → `{"ok":false,"code":"FORBIDDEN","message":"Você não pode editar este comentário."}`; `deleteTicketComment` → `FORBIDDEN`, `"Você não pode excluir este comentário."`. `max(id)` continuou 80; `message` 96 com `content = '[QA] texto do membro'` e `updated_at = created_at` (intacto).
- **MH7**: linhas 77 `criacao` `[QA] interno 1`, 78 `edicao` `[QA] interno 2`, 79 `exclusao` `[QA] interno 2`, todas `message_id` 95, `actor_id` 14, `visibility = interna`.
- **MH8**: como M e como A, comentar, editar e excluir pela interface funcionaram; rótulos "(editado)" e "Privado" apareceram; A viu o comentário interno de M (98) sem botões de editar/excluir (0 de cada); no ciclo de A (comentário privado) o banco ganhou as linhas 81 `criacao` `[QA] admin 1`, 82 `edicao` `[QA] admin 2`, 83 `exclusao` `[QA] admin 2`, `message_id` 97, `actor_id` 13, `interna`.
- **MH9**: `get_errors` devolveu `configErrors: []` e `sessionErrors: []` após cada bloco (criar, editar, excluir, forjar); `browser_console_messages` com `all: true` = 0 erros e 0 avisos; `.next/dev/logs/next-development.log` sem linha nova de erro ou aviso durante o teste.
- **R1**: em 390×844, `scrollWidth` = `clientWidth` = 375 (sem rolagem horizontal); botão "Comentar", editar e excluir comentário presentes e alcançáveis.

## Falhas

### #MH2 — M comenta `[QA] texto 1` (público): `changed_at` não é igual a `message.created_at`

- **Papel:** M, `qa.member.suporte@directflow.test`
- **Passos:** 1. Login como M. 2. Abrir `/tickets/226`. 3. Digitar `[QA] texto 1`, deixar "Comentário privado" desmarcado, clicar em "Comentar". 4. Consultar `message_history` e `message`.
- **Esperado:** `docs/contracts/comment-history.md`, seção `insertTicketMessage` e cenário MH2: linha `criacao` com `changed_at` = `message.created_at` ("para ficar **igual** a `message.created_at` — a mesma relação que o retroativo grava"). O MH1 usa essa mesma igualdade (`h.changed_at <> m.created_at`) como critério de consistência.
- **Obtido:** o comentário foi criado e a linha `criacao` tem todas as outras colunas corretas, mas `changed_at` perde a precisão de microssegundos. `message.created_at` (`defaultNow()` do banco) tem 6 casas; o `returning` passa por `Date` do JavaScript (3 casas), e o valor gravado no histórico é truncado para milissegundos. Resultado: a igualdade do contrato é falsa para todo comentário criado depois da etapa, e a consulta de divergência do MH1 passou de 0 para 2.
- **Evidência:**

  ```sql
  SELECT h.id, h.message_id, h.changed_at::text AS hist, m.created_at::text AS msg, (m.created_at - h.changed_at) AS diff
  FROM message_history h JOIN message m ON m.id = h.message_id
  WHERE h.event = 'criacao' AND h.id > 73;
  ```

  | id  | message_id | hist                        | msg                             | diff     |
  | --- | ---------- | --------------------------- | ------------------------------- | -------- |
  | 80  | 96         | `2026-10-14 19:23:35.94+00` | `2026-10-14 19:23:35.940553+00` | 0,553 ms |
  | 84  | 98         | `2026-10-14 19:25:01.77+00` | `2026-10-14 19:25:01.770645+00` | 0,645 ms |

  A linha 74 (comentário 94, já excluído) tinha o mesmo desvio: `19:22:35.744+00` contra `19:22:35.744601+00` (lida logo após criar). Reaplicando a consulta de divergência do MH1 ao final: `divergentes` = 2 (comentários 96 e 98). Os eventos `edicao` e `exclusao` não são afetados: `changed_at` e `message.updated_at` vêm do mesmo `Date` e são iguais (MH3, `true`).

- **Camada provável:** data (`insertTicketMessage` grava `changedAt: created.createdAt`, ver `app/_lib/data/ticket-messages.ts:85` e `:94`; o driver devolve `timestamp` como `Date`, com precisão de milissegundo). Pode também ser ambiguidade do contrato, ver Observações.
- **Dono:** df-data (e df-architect, se a decisão for relaxar a igualdade no contrato)

## Erros fora dos cenários

Nenhum. O log do dev server tem, de antes desta sessão de teste, o aviso do `pg` sobre `sslmode` (`SECURITY WARNING: The SSL modes 'prefer', 'require', and 'verify-ca' are treated as aliases for 'verify-full'`, às 00:00:49) e duas linhas `Better Auth: Invalid password` (às 00:55). Ficam fora desta feature e não foram causadas pelos cenários.

## Não executados

Nenhum.

## Observações

1. **Ambiguidade do contrato (para o `df-architect`).** O contrato exige igualdade exata entre `message_history.changed_at` e `message.created_at`, mas também manda ler o valor do `returning` pelo Drizzle, que entrega `Date` (milissegundo). As duas instruções não cabem juntas com o driver atual: ou o histórico lê `created_at` com precisão de microssegundo (por exemplo, `INSERT ... SELECT` a partir da linha recém-criada, na mesma transação), ou o contrato e o MH1/MH2 passam a aceitar tolerância de 1 ms. O retroativo (SQL puro) mantém a igualdade exata nas 73 linhas antigas; só as novas divergem. Decisão de desenho fora do escopo do `df-qa`.
2. **E-mail no MH9.** Com `RESEND_API_KEY` preenchida, o envio de verdade não deixa a linha de log `não enviado`, então "nenhum e-mail novo" não foi comprovado por log. As três actions de comentário não chamam e-mail neste contrato e o `get_logs` não mostrou erro de envio. A caixa `.test` nunca entrega, conforme `docs/contracts/qa-seed.md`.
3. **MH4 pela tela.** A tela deixa clicar em "Salvar" com o mesmo texto e devolve o toast do contrato; não foi preciso forjar a action.
4. **Dados deixados no banco (todos `[QA]`, setor QA Suporte).** Chamado #226 `[QA] Histórico de comentários`, com 2 comentários vivos (`[QA] texto do membro`, público; `[QA] interno do membro`, interno) e as linhas de `message_history` 74 a 84. Chamados #65 a #68 não foram tocados (0 linhas de histórico para eles).
5. O navegador ficou aberto, logado como A (`qa.admin.suporte@directflow.test`) em `/tickets/226`, para o usuário encerrar a gravação.

## Reteste 1

- **Data:** 2026-10-14
- **Commit:** `50e4fd7` · alterações não comitadas: sim (inclui a correção do `df-data` em `app/_lib/data/ticket-messages.ts:82-94`)
- **Escopo:** MH2 (falhou na primeira execução) e MH1 com o critério revisto (`m.id NOT IN (96, 98)`), mais conferência de `edicao`/`exclusao` e `next-devtools`.
- **Resultado:** 2 de 2 passaram · 0 falharam

### Cenários

| #                     | Cenário                                                                   | Papel | Status |
| --------------------- | ------------------------------------------------------------------------- | ----- | ------ |
| MH2                   | M comenta (público e interno) e `changed_at` = `message.created_at` exato | M     | PASSOU |
| MH1                   | Consulta de divergência com `m.id NOT IN (96, 98)` = 0, antes e depois    | —     | PASSOU |
| MH3/MH5 (complemento) | `edicao` e `exclusao` continuam gravando (ciclo rápido)                   | M     | PASSOU |
| MH9 (complemento)     | Sem erro no `next-devtools`, no console nem no log                        | —     | PASSOU |

### Evidências

Chamado #226, logado como M (`qa.member.suporte@directflow.test`, id 14). Sessão de A encerrada pelo menu "Sair" antes.

- **MH1, antes** (`max(id)` de `message_history` = 84, de `message` = 98):
  ```sql
  SELECT count(*) FROM message m
  LEFT JOIN message_history h ON h.message_id = m.id AND h.event = 'criacao'
  WHERE m.id NOT IN (96, 98)
    AND (h.id IS NULL OR h.changed_at <> m.created_at OR h.actor_id <> m.user_id
         OR h.ticket_id <> m.ticket_id OR h.visibility <> m.visibility);
  ```
  `divergentes` = 0.
- **MH2**, comentários criados pela interface (`[QA] reteste publico`, depois `[QA] reteste interno` com "Comentário privado" marcado):

  | h.id | message_id | actor_id | event   | visibility | `changed_at` (histórico)        | `created_at` (message)          | igual |
  | ---- | ---------- | -------- | ------- | ---------- | ------------------------------- | ------------------------------- | ----- |
  | 85   | 99         | 14       | criacao | publica    | `2026-10-14 19:30:58.442655+00` | `2026-10-14 19:30:58.442655+00` | true  |
  | 86   | 100        | 14       | criacao | interna    | `2026-10-14 19:31:05.341202+00` | `2026-10-14 19:31:05.341202+00` | true  |

  `SELECT (h.changed_at = m.created_at) ...` devolveu `true` nos dois, com os seis dígitos de microssegundo. `content` bate com o digitado.

- **Edição e exclusão** (comentário 99, pela interface: editar para `[QA] reteste publico editado`, depois excluir):

  | h.id | message_id | event    | content                        | visibility | `changed_at`                 |
  | ---- | ---------- | -------- | ------------------------------ | ---------- | ---------------------------- |
  | 87   | 99         | edicao   | `[QA] reteste publico editado` | publica    | `2026-10-14 19:31:12.52+00`  |
  | 88   | 99         | exclusao | `[QA] reteste publico editado` | publica    | `2026-10-14 19:31:23.955+00` |

  Ordem `criacao` (85) → `edicao` (87) → `exclusao` (88); `actor_id` = 14 nas três; `message` 99 não existe mais. A igualdade `edicao.changed_at = message.updated_at` não pôde ser reconferida porque a exclusão apagou a linha de `message`; ela já tinha passado no MH3 da primeira execução e o trecho de código de `edicao`/`exclusao` não mudou.

- **MH1, depois** do ciclo: a mesma consulta devolveu `divergentes` = 0. Comentário 100 (interno) segue vivo.
- **Erros:** `get_errors` do `next-devtools` = `{"configErrors":[],"sessionErrors":[]}`; `browser_console_messages` (`all: true`) = 0 erros e 0 avisos; `next-development.log` sem linha nova de erro ou aviso (restam só as linhas antigas descritas em "Erros fora dos cenários").

### Falhas

Nenhuma.

### Observações do reteste

1. Um clique em "Excluir" abriu o diálogo do comentário 96 (seletor `.first()` impreciso do teste). Cancelei na hora, sem excluir; `message` 96 e 98 seguem intactos e nenhuma linha de histórico foi gravada para eles.
2. Dados deixados no #226: comentário 100 `[QA] reteste interno` (vivo, interno), linhas 85 a 88 de `message_history`. Os comentários 96 e 98 continuam com a diferença de sub-milissegundo, aceita pelo contrato.
3. O navegador ficou aberto, logado como M, em `/tickets/226`.
