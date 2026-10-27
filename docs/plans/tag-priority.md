# Plano — Prioridade definida pela tag

Aprovado em 2026-10-26 via `/implement`. Em andamento.

Altera `docs/plans/ticket-priority-and-sla.md`: a escolha livre da prioridade
na abertura passa a valer só para tag sem prioridade. Altera
`docs/plans/registry-tags.md`: a tag ganha prioridade opcional e o diálogo de
renomear vira edição de nome e prioridade.

## Escopo

### Entra

- **Cadastro de tags (`/registry/tags`).** Campo "Prioridade" **opcional** na
  tag, com a opção "Sem prioridade (escolhida na abertura)". Definível na
  criação e editável no mesmo diálogo em que hoje se renomeia. Coluna
  "Prioridade" na tabela de tags.
- **Abertura do chamado.** Se a tag escolhida tem prioridade, o Select de
  prioridade fica **travado** (desabilitado) mostrando a prioridade da tag, com
  o hint "Definida pela tag x". Tag sem prioridade → Select livre (como hoje).
  Ao trocar de uma tag com prioridade para uma sem, o Select volta para Média
  (`INITIAL_TICKET_PRIORITY`).
- **Trava também no servidor.** A action `createTicket` lê a prioridade da tag
  no banco (via `app/_lib/data`) e ignora o valor enviado quando a tag tem
  prioridade. O contrato fixa a leitura dentro da transação de `insertTicket`
  (ADR 020).
- **Prioridade fixa na abertura.** Trocar a tag depois (edição pelo
  responsável, aceite de transferência com nova tag) **não** muda a prioridade.
  Mudar a prioridade de uma tag **não** afeta chamados existentes
  (`ticket.priority` já é gravado).

### Fica de fora

- Mudança de prioridade em transferências (próxima decisão).
- Edição manual da prioridade depois da abertura.
- Prioridade obrigatória na tag.

## Impacto no contrato (`df-architect`)

- Schema: `tag.priority` com o enum `ticket_priority` existente, nullable.
- Domínio puro: resolução da prioridade do chamado (tag com prioridade → a da
  tag; senão → a escolhida), usada pelo servidor para decidir e pela UI para
  travar; rótulos do hint, da opção "sem prioridade" e da coluna (reaproveita
  `TICKET_PRIORITY_FIELD_LABEL`).
- Zod: `createTagSchema` ganha `priority` opcional; `renameTagSchema` /
  `renameTag` viram uma edição completa (nome + prioridade). `createTicketSchema`
  não muda.
- Tipos: `TagOption` e `TagListItem` ganham `priority: TicketPriority | null`.
- Contratos: novo `docs/contracts/tag-priority.md`; notas de revisão em
  `registry-tags.md`, `ticket-creation.md` e `ticket-priority-and-sla.md`.
- ADR 020: prioridade definida na abertura e fixa.

## Migration

`db/migrations/0019_tag_priority.sql`, gerada pelo `drizzle-kit generate`:

```sql
ALTER TABLE "tag" ADD COLUMN "priority" "ticket_priority";
```

Não destrutiva; tags existentes ficam sem prioridade. Aplicar com
`npm run db:migrate`.

## Ondas e agentes

- **Onda 0 — `df-architect`**: schema, migration, domínio, Zod, tipos,
  contratos, ADR.
- **Onda 1 — `df-data` ∥ `df-ui`.**
  - `df-data`: insert/update de tag com prioridade; `listTags` e
    `listActiveDepartmentTags` devolvem `priority`; `insertTicket` lê a
    prioridade da tag na transação e aplica a regra do domínio.
  - `df-ui`: coluna Prioridade na tabela de tags; trava do Select no formulário
    de abertura (leitura, não depende de action).
- **Onda 2 — `df-actions` ∥ `df-ui`.**
  - `df-actions`: `createTag` com prioridade; `updateTag` substitui
    `renameTag`; `createTicket` sem mudança de fluxo.
  - `df-ui`: campo Prioridade no `tag-form-dialog.tsx`, ligado a `updateTag`.
- **Onda 3 — `df-reviewer`.**
- **Onda 4 — `df-qa`.**
- `df-email` e `df-auth`: não participam.

## Riscos

1. **Envio forjado** com prioridade diferente da tag: o servidor ignora e grava
   a da tag.
2. **Select desabilitado no React Hook Form** some do envio se desabilitado pelo
   `Controller`; o valor tem de continuar no formulário (detalhe no contrato).
3. **Admin muda a prioridade da tag com o formulário de abertura aberto**: o
   autor vê a antiga, o servidor grava a nova. Aceito.

## Critério de pronto

1. Tag com prioridade Crítica: o Select trava em Crítica com "Definida pela tag <nome>"; o chamado grava `critica` no ticket e no `to_priority` da
   `criacao`.
2. Envio forjado com `priority: "baixa"` e tag Crítica grava `critica`.
3. Tag sem prioridade: Select livre, grava a escolhida.
4. Trocar a tag na edição ou mudar a prioridade da tag no cadastro não altera
   `ticket.priority` de chamados existentes.
5. Coluna Prioridade no cadastro de tags; "—" para tag sem prioridade.
6. `npx tsc --noEmit`, `npm run lint` e `npm run build` passam.
