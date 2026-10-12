# Plano — Edição pelo destinatário e comentário na troca de destinatário

Aprovado em 2026-10-12. Três etapas, cada uma com o próprio `/implement` e o
próprio commit, nesta ordem. Este documento é registro do plano; as etapas 2 e
3 terão contrato próprio em `docs/contracts/`, escrito na Onda 0 de cada uma.

Contratos técnicos:

- Etapa 1 — revisão de 2026-10-12 em `docs/contracts/my-tickets.md`.
- Etapa 2 — `docs/contracts/assignee-edit-and-assume.md` e
  `docs/adr/017-ticket-edit-belongs-to-assignee.md`.
- Etapa 3 — contrato próprio (a escrever).

---

## Escopo

1. **Aba padrão em Meus chamados.** Em `/tickets`, "Atribuídos a mim" passa a
   ser a primeira aba e a aba padrão (sem `?tab=` ou com valor inválido).
2. **Edição só pelo destinatário atual** (`assignedTo`), sem exceção para
   admin, diretoria ou autor.
   - Quem aceita uma transferência vira destinatário e passa a editar.
   - Antes do aceite (`assignedTo` nulo), ninguém edita.
   - O destinatário edita mesmo antes de "Atender", mantendo o mapa de status
     editáveis atual.
   - No setor de destino, a primeira edição exige uma tag do setor de quem
     edita (recategoriza o chamado).
   - O botão de edição bloqueado ("Aguarde a solução ou devolutiva de X")
     deixa de existir: o `PendingTransferNotice` já informa.
3. **Botão "Assumir" no detalhe** `/tickets/[id]`, reaproveitando
   `canAssumeTicket` e `assumeTicket`.
4. **Resolver da fila torna o resolvedor destinatário.** Resolver um chamado
   sem destinatário grava quem resolveu como destinatário (com histórico
   `atribuicao`), para que ele possa editar a solução na janela de 7 dias.
5. **Comentário público obrigatório em toda troca de destinatário feita por
   terceiro:**
   - "Enviar para outro setor" — o texto também vai para
     `ticket_transfer.request_reason`;
   - "Enviar" da fila (admin ou diretoria → colega);
   - campo Destinatário na edição, quando muda para um colega ou para a fila.
   - "Assumir" não exige comentário.

**Fora:** quem pode resolver, enviar ou aceitar; e-mail; backfill de chamados
já resolvidos sem destinatário (o caso some sozinho em até 7 dias, com o
fechamento automático).

**Migration:** nenhuma. `ticket_transfer.request_reason` e a visibilidade
`publica` de `message` já existem.

## Etapas

| Etapa | Entrega                                                                        | Ondas                                                                         |
| ----- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| 1     | Aba "Atribuídos a mim" primeira e padrão                                       | `df-architect`                                                                |
| 2     | Edição pelo destinatário · "Assumir" no detalhe · resolvedor vira destinatário | `df-architect` → `df-data` ‖ `df-ui` → `df-actions` → `df-reviewer` → `df-qa` |
| 3     | Comentário na troca de destinatário                                            | `df-architect` → `df-data` → `df-actions` → `df-ui` → `df-reviewer` → `df-qa` |

**Etapa 2.** ADR 017 "Edição pertence ao destinatário" registra a decisão.

**Etapa 3.**

- `df-architect`: `handoffCommentSchema`, reutilizado nos três schemas
  (envio para outro setor, envio da fila, edição) e no motivo da recusa;
  `requiresHandoffComment(changes)` no domínio.
- `df-data`: grava a mensagem `publica` em `requestTicketTransfer`, em
  `assignTicket` no modo envio e na edição; a edição devolve
  `comment_required` quando a troca de destinatário chega sem comentário.
- `df-actions`: repassa o comentário e o novo resultado.
- `df-ui`: campo de comentário nos dois diálogos de envio e campo condicional
  na edição.

## Riscos

1. Autores perdem a edição de chamados já existentes em que não são
   destinatários.
2. Chamados resolvidos hoje sem destinatário ficam sem edição de solução até a
   janela expirar.
3. Recategorização de tag depois da transferência: a primeira edição no setor
   de destino troca a tag por uma do setor de quem edita.
4. O comentário é opcional no schema de edição e exigido só no servidor
   (depende da mudança de destinatário): o cliente precisa espelhar a regra
   com `requiresHandoffComment` para não surpreender a pessoa.
5. O seed de QA pode precisar de chamados com destinatário para os cenários.

## Critério de pronto

- `/tickets` abre em "Atribuídos a mim", e ela é a primeira aba.
- Só o destinatário vê "Editar", e a action recusa terceiros.
- "Assumir" no detalhe leva a "Editar".
- O aceite de transferência dá "Editar" a quem aceitou.
- Resolver da fila deixa o resolvedor como destinatário.
- Troca de destinatário sem comentário é bloqueada no cliente e no servidor;
  com comentário, vira comentário público (e, no envio entre setores, aparece
  no quadro de aguardando aprovação).
- `npx tsc --noEmit`, `npm run lint`, `npm run build` e cenários do `df-qa`
  verdes.
