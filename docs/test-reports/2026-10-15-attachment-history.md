# Relatório de testes — Histórico de anexos (`attachment_history`)

- **Data:** 2026-10-15
- **Contrato:** `docs/contracts/attachment-history.md`
- **Commit:** `95e007f` · alterações não comitadas: sim (schema, migrations 0016–0018, `app/_lib/data/tickets.ts`, domínio e docs da Etapa 2)
- **Ambiente:** `http://localhost:3000`, `next dev`, banco de desenvolvimento (migrations 0016–0018 aplicadas)
- **Resultado:** 11 de 11 passaram · 0 falharam · 0 bloqueados · 0 não executados

## Pré-requisitos

- Dev server: `/login` respondeu 200.
- MCP: `next-devtools` (porta 3000), `playwright` e `postgres` (`SELECT 1` ok).
- Usuários QA e o diretor existem e estão ativos (`users`: 4 linhas, todas `is_active = true`).
- E-mail: a linha `RESEND_API_KEY=` do `.env` casa com `^RESEND_API_KEY=.+`, mas o valor é só um comentário (` #...`), que o dotenv lê como vazio. Tratado como e-mail desligado. Nenhum log de envio apareceu na bateria.
- Os testes usaram o papel M (já logado ao abrir o navegador) e depois A (login pelo `/login`). Arquivos de teste em `.qa-output/ah/`.

## Cenários

| #    | Cenário                                                         | Papel | Status |
| ---- | --------------------------------------------------------------- | ----- | ------ |
| AH1  | Retroativo: `attachment_history` = `attachment`                 | —     | PASSOU |
| AH2  | Enums e ausência de `anexo_*` em `ticket_history`               | —     | PASSOU |
| AH3  | Novo chamado #242 com 2 anexos grava 2 `inclusao`               | M     | PASSOU |
| AH4  | Editar só anexos: salva sem erro, sem linha em `ticket_history` | M     | PASSOU |
| AH5  | Linha do tempo só com `Abertura` depois do AH4                  | M     | PASSOU |
| AH6  | Editar título + anexos: 1 `edicao`, sem evento de anexo         | M     | PASSOU |
| AH7  | `editTicket` forjado por A é recusado, sem escrita              | A     | PASSOU |
| AH8  | Editar sem mudança: `Nenhuma alteração para salvar.`            | M     | PASSOU |
| AH9  | Download de `ah-c.txt` e `ah-d.txt`; removido dá 404            | M, A  | PASSOU |
| AH10 | Divergência = 0 e nenhuma `exclusao` de anexo vivo              | —     | PASSOU |
| AH11 | Sem erro no console, no `next-devtools` nem nos logs            | —     | PASSOU |

## Evidências

**AH1** (feito antes de qualquer anexo novo):

- `SELECT count(*) FROM attachment_history` = 70; `attachment` = 70; linhas com `event <> 'inclusao'` = 0.
- Consulta de divergência do contrato = `0`.

**AH2:**

- `enum_range(null::history_event)` = `{criacao,mudanca_status,mudanca_prioridade,atribuicao,transferencia_solicitada,transferencia_aprovada,transferencia_rejeitada,reabertura,encerramento,mudanca_tag,edicao,resolucao}` (12 valores).
- `enum_range(null::attachment_history_event)` = `{inclusao,exclusao}`.
- `SELECT count(*) FROM ticket_history WHERE event::text LIKE 'anexo%'` = 0.

**AH3** (chamado #242, destinatário M, `ah-a.txt` e `ah-b.png`, cada um com um único acionamento do seletor):

- `attachment_history` (ids 71 e 72): `inclusao`, `actor_id` 14, `attachment_id` 84 e 85, `file_name`, `mime_type`, `size_bytes` e `storage_key` iguais aos de `attachment`.
- `changed_at` = `2026-10-15 20:11:24.609+00` em `attachment_history` e em `attachment.created_at`.
- Divergência = 0. `ticket_history` do #242: só `criacao` (id 640).
- Não consegui ler o toast de criação (a tela estava em "Enviando…" quando conferi); o chamado existe e o `get_errors` veio limpo.

**AH4:**

- Toast `Chamado #242 atualizado.`; saiu da edição; anexos exibidos `ah-b.png` e `ah-c.txt`.
- `ticket_history` continuou só com `criacao`.
- `attachment_history` ganhou o id 73 (`exclusao`, `attachment_id` 84, mesmos `storage_key`, `size_bytes` 14 e `mime_type` `text/plain` do id 71, `actor_id` 14) e o id 74 (`inclusao` de `ah-c.txt`, `attachment_id` 86). Os dois com `changed_at` = `20:12:16.407+00`; o 74 é igual a `attachment.created_at`. A `exclusao` (73) tem id menor que a `inclusao` (74).
- `attachment` não tem mais a linha 84.

**AH5:** a região "Eventos da linha do tempo" mostra só `Abertura`.

**AH6:**

- Linha do tempo: `Abertura` e `Edição` ("Editou o chamado. Alterou título."), sem evento de anexo.
- `ticket_history` ganhou só o id 641 (`edicao`, `note` = `Alterou título.`, `changed_at` = `20:12:45.734+00`).
- `attachment_history`: id 75 (`exclusao` de `ah-b.png`, `attachment_id` 85) e id 76 (`inclusao` de `ah-d.txt`, `attachment_id` 87), ambos com `changed_at` = `20:12:45.734+00`, o mesmo da `edicao`.
- O toast não foi capturado (fiz a leitura cedo demais, durante a compilação do dev). A gravação e a tela, depois de recarregar, estavam corretas.

**AH7:**

- Login como A (`qa.admin.suporte@directflow.test`); A não vê o botão "Editar" no #242.
- POST forjado da Server Action `editTicket` (id lido de `.next/dev/server/server-reference-manifest.json`) com `removedAttachmentIds: [86]` e os demais campos iguais aos atuais.
- Resposta: `{"ok":false,"code":"FORBIDDEN","message":"Você não pode editar este chamado."}`.
- `max(id)` de `attachment_history` = 76 antes e depois; `max(id)` de `ticket_history` = 641 antes e depois; `attachment` 86 e 87 continuam; título intacto.

**AH8:** toast `Nenhuma alteração para salvar.`; `attachment_history` com `max(id)` = 76 e `ticket_history` com `max(id)` = 641, os mesmos de antes.

**AH9:**

- M e A baixaram `ah-c.txt` (`/api/attachments/86`) e `ah-d.txt` (`/api/attachments/87`), com o conteúdo enviado (`conteudo ah-c`, `conteudo ah-d`).
- `GET /api/attachments/84` (removido) devolveu 404 como M e como A.

**AH10:**

- Divergência = `0`.
- `SELECT count(*) FROM attachment_history WHERE event='exclusao' AND attachment_id IN (SELECT id FROM attachment)` = 0.
- Totais ao fim: `attachment_history` 76, `attachment` 72, 2 `exclusao`. A história do #242 tem as 6 linhas esperadas (`inclusao` 71, 72, 74, 76 e `exclusao` 73, 75).

**AH11:**

- `get_errors` do `next-devtools` veio vazio (`configErrors` e `sessionErrors`) depois de AH3, AH4 e ao fim.
- Console do navegador: o único erro é o `404` de `/api/attachments/84`, provocado de propósito no AH9.
- `.next/dev/logs/next-development.log`: nenhum `[editTicket]`/`[createTicket]` de erro e nenhuma linha de e-mail. Só aparece o aviso de SSL do `pg` (`sslmode`), emitido na subida do servidor, antes da bateria.

## Falhas

Nenhuma.

## Erros fora dos cenários

Nenhum. O aviso do `pg` sobre `sslmode` (`SECURITY WARNING … treated as aliases for 'verify-full'`) está no log de desenvolvimento desde a subida do servidor. Não tem relação com a feature.

## Não executados

Nenhum. O responsivo (390×844) não faz parte do contrato desta etapa (sem mudança de UI).

## Observações

1. O contrato (AH7) diz "recusado como hoje" sem citar o código. A recusa veio como `FORBIDDEN` ("Você não pode editar este chamado."), porque A não é destinatário nem criador. Não é ambiguidade de comportamento, só vale citar o código no contrato.
2. A bateria deixou dados de teste: chamado #242 (`[QA] Histórico de anexos (editado)`), com `ah-c.txt` e `ah-d.txt`; e 6 linhas em `attachment_history`, 2 delas `exclusao`. Chamados #65 a #68 não foram tocados.
3. O `.env` tem `RESEND_API_KEY= #"r…`: o grep do pré-requisito acusa chave preenchida, embora o valor seja um comentário. Vale revisar a linha para o pré-requisito não gerar falso positivo.
4. O contrato deixa o toast de AH3 e de AH6 implícito. Em AH6 o toast não foi capturado, mas a gravação e a linha do tempo conferem.
