# Plano — Histórico de comentários, lista de anexos e anexos no Editar

Aprovado em 2026-10-14 (via `/consult`). Três etapas, cada uma com o próprio
`/implement` e o próprio commit, nesta ordem. Este documento é registro do
plano; cada etapa tem contrato próprio em `docs/contracts/`, escrito na Onda 0
dela.

Contratos técnicos:

- Etapa 1 — `docs/contracts/comment-history.md` (escrito em 2026-10-14, Onda 0
  da Etapa 1).
- Etapa 2 — a escrever na Onda 0 dela.
- Etapa 3 — a escrever na Onda 0 dela.

| Etapa | Entrega                                                                       | Ondas (previstas)                                                                                           | Migration                            |
| ----- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| 1     | `message_history`: criação, edição e exclusão de comentário gravadas no banco | `df-architect` → `df-data` → `df-reviewer` → `df-qa`                                                        | sim — tabela nova + retroativo       |
| 2     | Bloco "Anexos" na Conclusão e download                                        | `df-architect` → `df-data` → `df-actions` ‖ `df-ui` → `df-reviewer` → `df-qa`                               | não                                  |
| 3     | Anexar e remover só no "Editar"                                               | `df-architect` → `df-data` → `df-actions` ‖ `df-ui` → `df-architect` (fechamento) → `df-reviewer` → `df-qa` | sim — `ADD VALUE` em `history_event` |

`df-email` e `df-auth` não entram em nenhuma etapa.

---

## Etapa 1 — `message_history`

**Problema.** Editar comentário sobrescreve `message.content`
(`app/_lib/data/ticket-messages.ts:148-151`); excluir é `DELETE` físico
(`:208-210`). O banco perde o texto anterior a uma edição e o comentário
excluído inteiro.

**Pedido do usuário.** Rastreio **só para consulta direta no banco**: nenhuma
tela lê a tabela nova, nenhuma action muda, nenhum e-mail.

**Decisão.** Tabela de eventos append-only `message_history`, uma linha por
criação, edição ou exclusão, gravada pela camada de dados na mesma transação
que muda `message`.

- Enum `message_history_event`: `criacao`, `edicao`, `exclusao`.
- Colunas: `id`, `message_id` (**sem FK** — `message` é apagada fisicamente;
  `cascade` apagaria o histórico, `restrict` impediria excluir, `set null`
  perderia a ligação), `ticket_id` (→ `ticket`, `cascade`), `actor_id`
  (→ `users`, `restrict`), `event`, `content` (texto depois do evento; em
  `exclusao`, o texto no momento da exclusão), `visibility`, `changed_at`.
  Sem `updated_at`.
- Índices: (`message_id`, `changed_at`), (`ticket_id`), (`actor_id`).
- Migration do schema gerada pelo `drizzle-kit`; retroativo (`criacao` para
  todo comentário existente, `changed_at` = `created_at`) em migration
  **custom** separada, como `0011_align_legacy_transfers.sql`.
- Recusas (`no_changes`, `not_found`, `not_editable`, `not_deletable`,
  `not_commentable`) não gravam nada.

**Fora:** tela de histórico de comentário; leitura da tabela pelo app; mudança
em quem edita ou exclui.

**Riscos.**

1. **MCP `postgres` sem conexão na sessão de consultoria.** O desenho foi feito
   pelo código, sem contar as linhas reais de `message`. O `df-qa` confere o
   retroativo no MH1.
2. **Retroativo perde o que já se perdeu.** Comentário editado antes da etapa
   ganha `criacao` com o texto atual; comentário já excluído não ganha linha.
3. **Integridade sem FK em `message_id`.** Depende de só
   `app/_lib/data/ticket-messages.ts` gravar, na mesma transação. O
   `df-reviewer` confere por `grep`.
4. **Ordem de aplicação.** O código do `df-data` falha sem a tabela: as
   migrations são aplicadas (pelo usuário) antes de o código rodar.

**Critério de pronto.** MH1–MH9 de `docs/contracts/comment-history.md`
aprovados; `tsc`, `lint` e `build` verdes; `df-reviewer` sem bloqueante.

---

## Etapa 2 — Lista de anexos e download

**Decisão.** Volta a leitura de anexos removida em
`docs/contracts/attachments-card-removal.md`, agora dentro da Conclusão.

- Bloco **"Anexos"** na Conclusão de `/tickets/[id]`, **sempre visível**, em
  todos os estados (`resolvable`, `resolved`, `awaiting_transfer`, `empty`),
  para quem vê o chamado.
- Mostra os anexos de `message_id` nulo (criação e edições), ordenados por
  `created_at, id`.
- **Uma linha só de blocos**, com **rolagem horizontal dentro do bloco** quando
  excede a largura. A página nunca rola de lado. Interpretação do pedido do
  usuário: o "nunca rolagem horizontal" de `attachment-tiles.md` é sobre a
  página, não sobre um contêiner rolável.
- Cada bloco é um `<a href>` com ícone da categoria, extensão, nome e tamanho;
  nome acessível `Baixar <nome>`.
- Continua montado durante a edição do chamado (fora do `HiddenWhileEditing`).
- Ordem visual no estado `resolvable`: Solução → Anexos → barra de ações.
- Volta a rota `GET /api/attachments/[id]` do ADR 018 (decisão 5; desenho em
  `docs/contracts/ticket-attachments-create-and-download.md`):
  `canDownloadAttachment`, `attachmentContentDisposition`, TTL de 60 s,
  `listTicketAttachments`, `findAttachmentForDownload`,
  `createAttachmentDownloadUrl`, `parseAttachmentIdParam`.
- A exceção da rota volta à seção 3 do `.claude/rules/stack.md` (aprovada pelo
  usuário; o orquestrador edita) e `app/api/attachments/**` volta ao
  `ACTION_HELPER_IMPORTERS` do `eslint.config.mjs` (`df-architect`). Revisão no
  ADR 018.

**Riscos.** Os riscos de download do ADR 018 voltam: URL assinada de 60 s
reaproveitável dentro do prazo por quem a recebeu; ZIP/RAR sem inspeção
(download sempre como `attachment`); dependência da configuração do R2.

**Critério de pronto.** Cenários do contrato da etapa aprovados (bloco nos
quatro estados, rolagem só dentro do bloco em 390 px, download com o nome
original, 404 para quem não vê o chamado, sem sessão não baixa, URL expira);
`tsc`, `lint` e `build` verdes; `df-reviewer` sem bloqueante.

---

## Etapa 3 — Anexar e remover só no "Editar"

**Decisão.** Anexo deixa de entrar pela resolução e passa a entrar e sair pelo
modo de edição do chamado.

- "Anexar" e o X de remover aparecem **só no modo edição**, para o
  destinatário (`canAttachToTicket`).
- Mudanças aplicadas em **"Salvar alterações"** via `editTicket`; descartadas
  em **"Cancelar"** (o que subiu para `pending/` expira em 1 dia pelo ciclo de
  vida do bucket).
- Teto **`TICKET_ATTACHMENTS_MAX = 10`** por chamado, contado como salvos −
  removidos + novos. Dica: `Até 10 arquivos neste chamado, de até 10 MB cada.`
  A criação continua com 5 por vez (`ATTACHMENT_MAX_FILES`).
- Remoção apaga a linha de `attachment` e o objeto no R2; o R2 é tocado
  **depois** do commit, e falha ali só gera log.
- `history_event` ganha `anexo_incluido` e `anexo_removido`: uma linha por
  arquivo, nome do arquivo em `note`. Migration `ADD VALUE`, não destrutiva.
- Sai "Anexar" do formulário de resolver. Saem `attachments` de
  `resolveTicketSchema`, `resolveTicket` e `updateTicketResolution`,
  `TicketResolutionRefusal` e `RESOLUTION_ATTACHMENTS_NOTICE` (fechamento do
  `df-architect` depois dos consumidores, para o `tsc` ficar verde a cada
  onda).
- "Salvar alterações" bloqueado durante envio em curso ou com falha.
- `no_changes` considera anexos: incluir ou remover anexo já é mudança.
- O destinatário pode remover anexo de outra pessoa, inclusive os da criação.

**Riscos.**

1. **Órfão no R2.** Remoção com commit feito e `DeleteObject` falho deixa
   objeto em `tickets/` sem linha; fica no log (mesmo risco do ADR 010/018).
2. **Formulário antigo de resolver com anexo.** Uma aba aberta antes do deploy
   envia `attachments`; o schema novo descarta o campo e a resolução segue sem
   anexo.
3. **Troca de destinatário + anexo no mesmo salvamento.** Passa: quem salva
   ainda é o destinatário no momento da checagem, sob trava.
4. **Corrida no teto.** Duas abas do mesmo destinatário podem somar mais de 10;
   a contagem é refeita na transação, sob trava do chamado.

**Critério de pronto.** Cenários do contrato da etapa aprovados (anexar e
remover só no Editar, Cancelar descarta, teto de 10, histórico
`anexo_incluido`/`anexo_removido` com o nome em `note`, resolver sem
"Anexar", `no_changes` com anexos); migration aplicada; `tsc`, `lint` e
`build` verdes; `df-reviewer` sem bloqueante.
