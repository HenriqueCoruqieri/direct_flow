# Plano — Linha do tempo resumida, histórico de anexos e card Anexos

Aprovado em 2026-10-15 (via `/consult`). Três etapas, cada uma com o próprio
`/implement` e o próprio commit, nesta ordem. Este documento é registro do
plano; cada etapa tem contrato próprio em `docs/contracts/`, escrito na Onda 0
dela.

Contratos técnicos:

- Etapa 1 — `docs/contracts/timeline-summary.md` (escrito em 2026-10-15, Onda
  0 da Etapa 1).
- Etapa 2 — a escrever na Onda 0 da Etapa 2.
- Etapa 3 — a escrever na Onda 0 da Etapa 3.

| Etapa | Entrega                                                | Ondas (previstas)                                                                 | Migration                                                    |
| ----- | ------------------------------------------------------ | --------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 1     | Linha do tempo resumida por ação, altura de ~3 eventos | `df-architect` → `df-ui` → `df-reviewer` → `df-qa`                                | não                                                          |
| 2     | `attachment_history` e anexos fora da linha do tempo   | `df-architect` → usuário aplica a migration → `df-data` → `df-reviewer` → `df-qa` | sim — tabela nova, retroativo, enum `history_event` recriado |
| 3     | Card "Anexos" entre Descrição e Linha do tempo         | `df-ui` → `df-reviewer` → `df-qa`                                                 | não                                                          |

`df-actions`, `df-email` e `df-auth` não entram em nenhuma etapa: nenhuma
assinatura de action muda, nada é enviado por e-mail, nenhuma permissão muda.

---

## Escopo

**Entra:**

1. **Anexos saem da linha do tempo** e passam a ser auditados numa tabela
   append-only `attachment_history` (nenhuma tela lê), cobrindo inclusão na
   criação do chamado, inclusão na edição e exclusão. Mesmo padrão de
   `message_history` (`docs/contracts/comment-history.md`).
2. **Card próprio "Anexos"** entre Descrição e Linha do tempo em
   `/tickets/[id]`:
   - fora da edição, faixa horizontal rolável ou `Nenhum anexo.`;
   - na edição, dica de limite, vagas, aviso "só valem ao salvar" (mantidos —
     decisão P3) e botão "Anexar" no canto inferior esquerdo.
   - A Conclusão deixa de ter anexos.
3. **Linha do tempo com altura para ~3 eventos simples** (hoje ~5,
   `max-h-104`).
4. **Linha do tempo resumida por ação.** Linhas gravadas pela mesma ação
   (mesmo `changed_at` e mesmo `changed_by` no mesmo chamado) viram uma só na
   tela, a de maior prioridade. Nada deixa de ser gravado: um relatório futuro
   (fora do escopo) lerá o `ticket_history` completo.

**Fora:** view do relatório detalhado; uploader do "Novo chamado";
permissões; e-mail; Server Actions; nome do destinatário no resumo da edição
(decidido: não entra agora).

## Decisões do usuário

- **P1 = A.** Parar de gravar `anexo_incluido`/`anexo_removido` em
  `ticket_history`, apagar as linhas existentes e remover os dois valores do
  enum `history_event` (migration destrutiva; perdem-se os registros de
  remoções antigas, aceito — o banco só tem dado de teste). Retroativo de
  `attachment_history` a partir de `attachment`: uma `inclusao` por anexo
  vivo, `actor_id` = `uploaded_by`, `changed_at` = `created_at`.
- **P2.** A regra de resumo vale para **todas** as ações compostas, não só a
  edição. O usuário ainda vai revisar a linha do tempo inteira, então a
  prioridade fica num mapa fácil de ajustar
  (`HISTORY_EVENT_SUMMARY_RANK`, `app/_lib/domain/ticket-history.ts`).
- **P3.** Manter dica, vagas e aviso no card na edição.

## Mapa das ações compostas hoje

Gravações em `app/_lib/data/tickets.ts`, todas com um único `changedAt` por
transação:

| Ação                                            | Linhas                                                                 | Fica na tela |
| ----------------------------------------------- | ---------------------------------------------------------------------- | ------------ |
| Editar (`updateTicketByAssignee`, `:559-629`)   | `edicao` + `mudanca_tag` + `anexo_*` + `atribuicao` + `mudanca_status` | Edição       |
| Resolver (`updateTicketResolution`, `:733-751`) | `atribuicao` (quando quem resolve assume) + `resolucao`                | Resolução    |
| Assumir/encaminhar (`assignTicket`, `:879-897`) | `atribuicao` + `mudanca_status`                                        | Atribuição   |
| demais                                          | uma linha só                                                           | sem mudança  |

---

## Etapa 1 — Resumo da linha do tempo e altura de ~3 eventos

Sem schema. `df-architect` (domínio + contrato) → `df-ui` → `df-reviewer` →
`df-qa`.

- Domínio: mapa de prioridade `HISTORY_EVENT_SUMMARY_RANK` e função pura
  `summarizeTicketTimeline`, que agrupa por (`changedAt`, `changedById`) e
  devolve uma entrada por grupo, preservando a ordem cronológica.
- UI: `/tickets/[id]` mostra a linha do tempo resumida e a altura máxima cai
  para ~3 eventos simples.
- **Transitório até a Etapa 2:** uma edição só de anexos (sem `edicao`) ainda
  aparece como um único `Anexo removido`/`Anexo incluído` (o de menor `id` do
  grupo). Some quando os `anexo_*` saírem de `ticket_history`.

## Etapa 2 — `attachment_history` e anexos fora da linha do tempo

`df-architect` → usuário aplica a migration → `df-data` → `df-reviewer` →
`df-qa`. `df-actions` não entra (assinaturas não mudam).

- **`df-architect`:**
  - enum `attachment_history_event` = `inclusao`, `exclusao`;
  - tabela `attachment_history`: `id` pk, `attachment_id` integer not null
    **sem FK** (`attachment` é apagada fisicamente), `ticket_id` FK `cascade`,
    `actor_id` FK `users` `restrict`, `event`, `file_name`, `mime_type`,
    `size_bytes`, `storage_key`, `changed_at` default `now()`;
  - índices (`attachment_id`, `changed_at`), (`ticket_id`), (`actor_id`);
  - retroativo em migration custom;
  - `DELETE` das linhas `anexo_*` de `ticket_history` **antes** de recriar o
    tipo `history_event` sem os dois valores;
  - limpeza de `anexo_*` do domínio.
- **Usuário** aplica a migration.
- **`df-data`:**
  - `insertTicket` grava `inclusao` por anexo da criação;
  - `updateTicketByAssignee` grava `exclusao`/`inclusao` a partir dos
    `returning` e deixa de gravar `anexo_*`;
  - **proteger `tx.insert(ticketHistory).values([])`** quando a edição só
    mexe em anexos: o Drizzle lança com lista vazia.

## Etapa 3 — Card "Anexos"

Só UI. `df-ui` → `df-reviewer` → `df-qa`.

- Novo `TicketAttachments` com `h2` `Anexos`, entre Descrição e Linha do tempo
  em `page.tsx`.
- `TicketConclusion` perde `attachments`/`canAttach`; `ResolveTicketForm` perde
  `savedAttachments`.
- Um título "Anexos" por card; "Anexar" embaixo, à esquerda.

---

## Riscos

1. **Edição só de anexos e `values([])`** (Etapa 2): sem a proteção, salvar só
   anexos lança no Drizzle.
2. **Edição só de anexos não deixa rastro na linha do tempo** (depois da Etapa
   2). É o pedido: o rastro fica em `attachment_history`.
3. **Agrupamento depende de instante + autor exatos.** Duas ações distintas no
   mesmo milissegundo pelo mesmo autor no mesmo chamado seriam fundidas;
   praticamente impossível (cada ação trava o chamado na própria transação).
4. **Resumo perde detalhe** na tela: destinatário, status resultante, "assumiu"
   antes de resolver. O banco mantém tudo.
5. **Migration destrutiva** (Etapa 2): enum recriado; código e migration
   precisam entrar juntos.
6. **Contratos anteriores ficam com expectativas antigas** (ex.: TS2/TS4 de
   `docs/contracts/ticket-timeline-scroll.md`, regra 7 de
   `docs/contracts/attachments-in-edit.md`). Cada etapa registra a revisão no
   contrato afetado, sem reescrever o histórico.
7. **"3 eventos" é aproximado**: evento com observação ou descrição que quebra
   linha ocupa mais.

## Critério de pronto (por etapa e final)

- Edição que muda tag e destinatário mostra só `Edição` com
  `Alterou tag e destinatário.`.
- "Assumir" mostra só `Atribuição`.
- Resolver depois de assumir (ou assumindo ao resolver) mostra só `Resolução`.
- O banco mantém todas as linhas em `ticket_history`.
- Nenhum `anexo_*` em `ticket_history` e enum sem eles (Etapa 2).
- `attachment_history` com retroativo e linhas novas (Etapa 2).
- Edição só de anexos salva sem erro (Etapa 2).
- Card Anexos abaixo da Descrição; Conclusão sem anexos (Etapa 3).
- Bordas de Conclusão e Comentários alinhadas.
- ~3 eventos simples visíveis sem rolar.
- `npx tsc --noEmit`, `npm run lint` e `npm run build` passam; `df-reviewer`
  sem bloqueante; `df-qa` aprovado.
