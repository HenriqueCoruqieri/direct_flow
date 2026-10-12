# Plano — Linha do tempo com rolagem, anexo no novo chamado e card de comentário

Aprovado em 2026-10-12 (via `/consult`). Três etapas, cada uma com o próprio
`/implement` e o próprio commit, nesta ordem. Este documento é registro do
plano; cada etapa tem contrato próprio em `docs/contracts/`, escrito na Onda 0
dela.

Contratos técnicos:

- Etapa 1 — `docs/contracts/ticket-timeline-scroll.md`.
- Etapa 2 — `docs/contracts/new-ticket-attachments-placeholder.md`.
- Etapa 3 — `docs/contracts/comment-card-department-and-actions.md`.

---

## Escopo

1. **Linha do tempo com rolagem interna** em `/tickets/{id}`
   (`app/(app)/tickets/[id]/_components/ticket-timeline.tsx`).
   - Altura máxima equivalente a cerca de 5 eventos simples; a partir daí, a
     lista rola por dentro do card.
   - Abre rolada até o fim, com o evento mais recente visível (a lista é
     cronológica crescente, `app/_lib/data/tickets.ts:214`).
   - Vale em todas as larguras.
   - Motivo: o grid do detalhe (`app/(app)/tickets/[id]/page.tsx:160`,
     `lg:items-stretch`) faz a coluna direita acompanhar a altura da esquerda;
     o card de comentários tem `lg:flex-1` com a lista em `absolute inset-0` e
     esticava junto com a linha do tempo.
2. **Anexo no diálogo de novo chamado**
   (`app/(app)/_components/new-ticket-dialog.tsx`).
   - Botão "Anexar" bloqueado com o aviso
     `Anexos estarão disponíveis em breve`, pelo mesmo componente já usado na
     Conclusão (`app/_components/blocked-action-trigger.tsx`, via
     `app/(app)/tickets/[id]/_components/conclusion-blocked-actions.tsx`).
   - Área "Anexos" logo abaixo da Descrição, exibindo `Nenhum anexo.`, pronta
     para receber a lista quando o upload existir.
3. **Card de comentário.**
   - Badge `outline` com o **setor atual** do autor no fim da linha do
     cabeçalho (`ml-auto`); em largura estreita desce de linha, alinhada à
     direita. Aparece em todo comentário, inclusive nos do próprio setor.
   - Editar e Excluir numa linha própria abaixo do texto, alinhada à direita,
     só ícone (14px, botão `icon-sm`); lixeira sempre `text-destructive`.
   - Tooltip `Editar` / `Excluir` com `app/_components/ui/tooltip.tsx`; os
     `aria-label` atuais continuam.

**Fora:** upload real, R2 e a tabela `attachment`; setor do autor no momento
do comentário; mudança no alinhamento das colunas (`lg:items-stretch`) —
descrição ou conclusão longas ainda esticam o card de comentários; regras de
permissão.

**Migration:** nenhuma.

## Decisões do usuário

| #   | Tema                      | Decisão                                                                                                                                                                                       | Alternativa descartada                                                                |
| --- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| P1  | Posição inicial           | **A** — a rolagem abre no fim. Altura máxima **aproximada** de 5 eventos simples, não contagem exata: contar exigiria medir no cliente, e eventos com observação longa fazem caber menos de 5 | abrir no topo                                                                         |
| P2  | Anexo no novo chamado     | **A** — botão bloqueado + área vazia                                                                                                                                                          | seletor de arquivo listando os nomes localmente sem enviar (enganaria o usuário)      |
| P3  | Setor do autor            | **A** — setor **atual**, por join `users.department_id → department`. Troca de setor é rara; dá para evoluir depois sem perder dado                                                           | coluna `message.department_id` com migration e backfill                               |
| P4  | Posição de Editar/Excluir | **A** — linha própria abaixo do texto                                                                                                                                                         | mesma linha do texto com `items-end`, que estreita o texto inteiro numa coluna de 1/3 |
| P5  | Tamanho do ícone          | **A** — 14px                                                                                                                                                                                  | 16px                                                                                  |
| P6  | Rótulo dos botões         | **A** — tooltip nos botões só-ícone                                                                                                                                                           | só o ícone                                                                            |

## Impacto no contrato

- **Tipos**: `TicketMessageItem` (`app/_lib/types/ticket-comments.ts`) ganha
  `authorDepartmentName: string` (Etapa 3).
- **Domínio**: `TICKET_ATTACHMENTS_SOON_MESSAGE` sai de
  `app/_lib/domain/ticket-resolution.ts` para `app/_lib/domain/ticket.ts`
  (passa a servir criação e conclusão); nasce
  `NO_ATTACHMENTS_LABEL = "Nenhum anexo."` em `app/_lib/domain/ticket.ts`
  (Etapa 2); nasce `COMMENT_AUTHOR_DEPARTMENT_LABEL = "Setor"` em
  `app/_lib/domain/ticket-comments.ts`, prefixo só para leitor de tela do badge
  do setor (Etapa 3). Nenhuma regra de domínio muda.
- **Validação**: nada.
- **Schema / migration**: nada.

## Etapas

| Etapa | Entrega                    | Ondas                                                                 | Contrato                                                |
| ----- | -------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------- |
| 1     | Linha do tempo com rolagem | `df-ui` → `df-reviewer` → `df-qa`                                     | `docs/contracts/ticket-timeline-scroll.md`              |
| 2     | Anexo no novo chamado      | `df-architect` (constantes) → `df-ui` → `df-reviewer` → `df-qa`       | `docs/contracts/new-ticket-attachments-placeholder.md`  |
| 3     | Card de comentário         | `df-architect` (tipo) → `df-data` ‖ `df-ui` → `df-reviewer` → `df-qa` | `docs/contracts/comment-card-department-and-actions.md` |

`df-actions`, `df-email` e `df-auth` não entram em nenhuma etapa.

## Riscos

1. **"5 eventos" é aproximado.** A altura máxima é fixa em `rem`; eventos com
   observação, ou com descrição que quebra linha em tela estreita, fazem caber
   menos de 5 sem rolar.
2. **Tooltip e diálogo no mesmo botão.** No Excluir, `TooltipTrigger asChild` e
   `AlertDialogTrigger asChild` precisam compor sem quebrar a volta do foco
   (`handleCloseAutoFocus` em `delete-ticket-comment-button.tsx`).
3. **Badge em coluna estreita.** A coluna de comentários tem 1/3 da largura em
   `lg`; nome de setor longo desce de linha.
4. **Rolagem ao fim depende da contagem de itens.** Se um evento entra enquanto
   o usuário lê o histórico, a lista pula para o fim (igual aos comentários
   hoje).

## Critério de pronto

- Cenários do contrato de cada etapa aprovados pelo `df-qa`.
- Em cada etapa: `npx tsc --noEmit`, `npm run lint` e `npm run build` passam;
  `df-reviewer` sem bloqueante.
