# Contrato — Número de recusados no item "Meus chamados" do menu

Pedido do usuário (feature), via `/implement`, em 2026-11-19. Decisões do
orquestrador acatadas. Segue o precedente de
`docs/contracts/department-queue-nav-badge.md` (que ganhou nota de revisão
apontando para cá) e reaproveita a regra da aba "Enviados e recusados" de
`docs/contracts/my-tickets-sent-and-attended.md`.

Versões observadas: `next@16.3.5`, `drizzle-orm@0.45.2`, `zod@4.6.5`.

## Escopo técnico em uma frase

Sem schema e sem migration: o item `Meus chamados` do menu lateral (desktop e
mobile) mostra, em vermelho, quantos chamados da pessoa logada estão na aba
**Enviados e recusados** pelo ramo da recusa, calculado pelo layout `(app)` com
o mesmo match da aba, sem período; `NavBadge` ganha um tom.

## Decisões

| Tema           | Decisão                                                                                                                                                                                                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| O que conta    | Último envio do chamado com `requested_by = eu`, `status = rejeitado`, e `ticket.status = recusado`. É o segundo match de `SENT_TAB_MATCHES` (`MY_TICKETS_TAB_RULES.sent.lastTransfer`). Sem filtro de período                                                           |
| Qual match     | `MY_TICKETS_NAV_BADGE_MATCH`, no domínio. É a **mesma referência** usada na aba (`SENT_DECLINED_MATCH`); a consulta recebe o match e não reescreve status                                                                                                                |
| Quem conta     | O layout `(app)`, para toda pessoa logada (o item Meus chamados sempre existe). Não depende de setor: pessoa em "Não alocado" também tem selo se tiver recusados                                                                                                         |
| Texto e teto   | `formatNavBadgeCount`: até 99, número; acima, `99+`. Zero ou menos → sem selo                                                                                                                                                                                            |
| Nome acessível | `Meus chamados, {count} recusados`; singular `Meus chamados, 1 recusado`. Sempre o número real (`Meus chamados, 120 recusados`)                                                                                                                                          |
| Cor            | `NavBadge.tone: NavBadgeTone` (`"warning" \| "destructive"`). `navBadgeFor` recebe o tom com padrão `"warning"`: Aprovações e Fila não mudam; Meus chamados é `"destructive"`                                                                                            |
| Token do tom   | Tokens sólidos `danger`, `danger-border` e `danger-foreground` (`globals.css:65-67`, `:159-161`, `:251-253`), no mesmo formato de `warning`. O nome do tom continua `destructive`. Contraste do texto: 6.63:1 no tema claro e 9.17:1 no escuro (ver "Nota de contraste") |

## Tabelas, enums e migration

Nada novo. Leitura de `ticket` (`status`) com `left join` no último envio
(`ticket_transfer`: `requested_by`, `status`). Índice: `transfer_ticket_idx`.

---

## Tipos

### `app/_lib/types/nav-badge.ts` (alterado)

```ts
export type NavBadgeTone = "warning" | "destructive"

export interface NavBadge {
  text: string
  accessibleLabel: string
  tone: NavBadgeTone
}
```

`NavBadgeAccessFacts` não muda. Campo novo obrigatório: quem **monta**
`NavBadge` é só o domínio (`navBadgeFor`), então nenhum código fora dele quebra.

## Domínio

### `app/_lib/domain/nav-badge.ts` (alterado)

```ts
export const DEFAULT_NAV_BADGE_TONE: NavBadgeTone = "warning"
navBadgeFor(count: number, accessibleLabel: string, tone?: NavBadgeTone): NavBadge | null
```

`count <= 0` → `null`; senão `{ text: formatNavBadgeCount(count), accessibleLabel, tone }`,
com `tone` padrão `DEFAULT_NAV_BADGE_TONE`. `approvalsNavBadgeFor` e
`departmentQueueNavBadgeFor` passam a devolver `tone: "warning"` sem mudança
no código deles.

### `app/_lib/domain/my-tickets.ts` (alterado)

```ts
export const MY_TICKETS_NAV_BADGE_MATCH: MyTicketsLastTransferMatch
myTicketsNavBadgeFor(count: number): NavBadge | null
```

| Nome                         | Semântica                                                                                                                                                        |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MY_TICKETS_NAV_BADGE_MATCH` | `{ transferStatus: "rejeitado", ticketStatuses: ["recusado"], assigneeIsReviewer: false }` — o mesmo objeto que está em `MY_TICKETS_TAB_RULES.sent.lastTransfer` |
| `myTicketsNavBadgeFor`       | `navBadgeFor(count, "Meus chamados, {count} recusado(s)", "destructive")`, singular só quando `count === 1`                                                      |

Os dois matches da aba viraram constantes privadas (`SENT_PENDING_MATCH`,
`SENT_DECLINED_MATCH`); `SENT_TAB_MATCHES` e a aba não mudam de comportamento.

## Validação

Nada novo.

## `df-data`

### `app/_lib/data/my-tickets.ts` (alterado)

```ts
export async function countMyLastTransferTickets(
  userId: number,
  match: MyTicketsLastTransferMatch,
): Promise<number>
```

- `select count(*)::int from ticket left join last_transfer on last_transfer.ticket_id = ticket.id where <condição>`.
- A condição é a da aba, restrita ao match recebido:
  `and(eq(lastTransfer.requestedBy, userId), lastTransferMatchCondition(match))`.
  Extraia de `tabCondition` um helper privado
  `lastTransferRequesterCondition(userId, matches: readonly MyTicketsLastTransferMatch[])`
  e use-o nos dois lugares (aba com `rule.lastTransfer`, contagem com `[match]`),
  para a regra "requested_by do último envio" não existir duas vezes.
- Reaproveita o `lastTransfer` (`lastTransferTable()`) do arquivo. Não filtrar
  por `requested_by` dentro da subconsulta (último envio é o do chamado).
- Sem período: não recebe `range`.
- Linha ausente → `0`.
- Não reaproveitar `countMyTicketsByTab(userId).sent`: soma pendentes e recusados
  e calcula as seis abas.

## `df-actions`

Nada. Nenhuma action nova nem alterada.

## `df-ui`

### `app/(app)/layout.tsx`

1. Contar em paralelo com as contagens de setor, sem depender de
   `badgeDepartmentId`:

   ```ts
   const [[pendingApprovals, openQueueTickets], declinedMyTickets] =
     await Promise.all([
       badgeDepartmentId === null
         ? Promise.resolve<[number, number]>([0, 0])
         : Promise.all([
             countPendingApprovals(badgeDepartmentId),
             countQueueTickets(
               badgeDepartmentId,
               DEPARTMENT_QUEUE_NAV_BADGE_TAB,
             ),
           ]),
       countMyLastTransferTickets(actor.id, MY_TICKETS_NAV_BADGE_MATCH),
     ])
   const myTicketsBadge = myTicketsNavBadgeFor(declinedMyTickets)
   ```

   A forma exata é livre; o que importa: a contagem de Meus chamados roda para
   toda pessoa logada, inclusive "Não alocado". Sem `try/catch`.

2. Passar `myTicketsBadge` a `AppSidebar` e `MobileHeader`.

### Navegação

- `app-sidebar.tsx`, `mobile-header.tsx`, `mobile-nav.tsx`, `app-nav.tsx`: nova
  prop `myTicketsBadge: NavBadge | null`, repassada até `AppNav`.
- `app-nav.tsx`: `badge={myTicketsBadge}` no `NavItem` de `MY_TICKETS_PATH`.
- `nav-item.tsx`: as classes de cor do selo saem de um mapa por tom, sem objeto
  literal inline na união:

  ```ts
  const BADGE_TONE_CLASSES = {
    warning: "border-warning-border bg-warning text-warning-foreground",
    destructive: "border-danger-border bg-danger text-danger-foreground",
  } satisfies Record<NavBadgeTone, string>
  ```

  As classes estruturais (`ml-auto inline-flex h-5 min-w-5 … tabular-nums`)
  continuam iguais. O tom `destructive` usa os tokens sólidos `danger`, que já
  existiam (`app/globals.css:65-67`, `:159-161`, `:251-253`), no mesmo formato
  dos tokens `warning`.

  **Nota de contraste (revisão do `df-ui`, 2026-11-19).** A primeira versão
  deste contrato pedia `border-destructive/30 bg-destructive/10 text-destructive`
  (as classes do `goal-adherence-badge`). Na linha ativa do tema claro, isso dava
  4.3:1, abaixo do mínimo de 4.5:1. Com `danger-foreground` sobre `danger`, o
  contraste é 6.63:1 no tema claro e 9.17:1 no escuro.

## Quando o número atualiza

Mesmo mecanismo do selo da Fila: o layout só re-renderiza com recarga,
`router.refresh()` ou action que chama `revalidatePath`.

| Evento                                                     | Efeito no selo de quem enviou   | Atualiza sozinho?                                                                                     |
| ---------------------------------------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------- |
| O destino recusa o envio (ação de **outra** pessoa)        | +1                              | Não: aparece ao recarregar ou na próxima action que revalide                                          |
| Remetente atende (`attendTicket`) ou resolve o recusado    | −1 (status deixa `recusado`)    | Sim: as actions revalidam                                                                             |
| Remetente reenvia para outro setor                         | −1 (novo último envio pendente) | Com acesso mantido, pela revalidação; sem acesso, pelo `router.refresh()` do `SendToDepartmentDialog` |
| Outra pessoa do setor de origem assume ou envia o recusado | Pode cair                       | Não, para o remetente                                                                                 |

---

## Cenários do `df-qa`

Usuários de `docs/contracts/qa-seed.md`: `M` = QA Membro Suporte, `A` = QA
Admin Suporte, `I` = QA Admin Infra. Títulos começam com `[QA]`. **Não alterar
#65 a #68.** Escrita só em QA Suporte e QA Infra.

Consulta de referência `REC(u)`:

```sql
select count(*) from ticket t
join (
  select distinct on (ticket_id) ticket_id, requested_by, status
  from ticket_transfer order by ticket_id, created_at desc, id desc
) lt on lt.ticket_id = t.id
where lt.requested_by = :u and lt.status = 'rejeitado' and t.status = 'recusado'
```

| #    | Quem  | Ação                                                                                      | Esperado                                                                                                                                                          |
| ---- | ----- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NB1  | M     | qualquer tela, menu lateral (≥ 1024 px)                                                   | item `Meus chamados` com selo = `REC(M)` (sem selo se 0); mesma forma do selo da Fila, em vermelho; nome acessível `Meus chamados, N recusados` (ou `1 recusado`) |
| NB2  | M     | `/tickets`, aba Enviados e recusados, período Todos, filtro de Status "Recusado"          | número de linhas = selo = `REC(M)`                                                                                                                                |
| NB3  | M     | `/tickets` com período `Hoje`                                                             | a aba muda; o selo **não** muda (sem período)                                                                                                                     |
| NB4  | M     | 390×844, abrir o menu mobile                                                              | mesmo selo vermelho e mesmo nome acessível em `Meus chamados`; selos de Fila e Aprovações continuam amarelos                                                      |
| NB5  | M, I  | M cria `[QA] Selo recusa 1` e envia a QA Infra; antes da recusa, M recarrega              | selo de M **não** muda (pendente não conta, embora esteja na aba Enviados e recusados)                                                                            |
| NB6  | I, M  | I recusa `[QA] Selo recusa 1` com motivo; M recarrega                                     | selo de M +1 (aparece com `1` e nome `Meus chamados, 1 recusado` se antes era 0); banco: `REC(M)` +1                                                              |
| NB7  | M     | em `[QA] Selo recusa 1`, "Atender"                                                        | sem recarregar, selo −1 (some se chegar a 0)                                                                                                                      |
| NB8  | M, I  | criar `[QA] Selo recusa 2`, enviar a QA Infra, I recusa; M recarrega e reenvia a QA Infra | depois do reenvio, selo −1 sem recarregar (com acesso pela revalidação; sem acesso pelo refresh ao sair do detalhe)                                               |
| NB9  | I     | menu de I depois de NB6 e NB8                                                             | selo de Meus chamados de I não conta as recusas que I fez (só conta envios de I)                                                                                  |
| NB10 | todos | toda a bateria                                                                            | selos de `Fila do setor` e `Aprovações` com cor e comportamento de antes; console e dev server sem erro nem aviso de hidratação                                   |

Limite conhecido: `99+` não exercitado; a regra vive em `formatNavBadgeCount`.

## Riscos

1. **Terceira consulta por render do layout**, agora com a subconsulta
   `distinct on` sobre todo `ticket_transfer` (a mesma de `/tickets`). Volume
   atual pequeno; se crescer, `df-data` pode trocar por `lateral`/`exists`
   mantendo a assinatura.
2. **Selo desatualizado depois da recusa**: a recusa é ação de outra pessoa;
   aceito, como em Aprovações e Fila.
3. **Contraste do vermelho**: resolvido com os tokens `danger` (6.63:1 claro,
   9.17:1 escuro). Usar `destructive` com opacidade no selo voltaria a dar
   4.3:1 na linha ativa do tema claro; não fazer.

## Critério de pronto

1. `Meus chamados` mostra o selo vermelho só quando `REC(pessoa) > 0`, desktop e
   mobile, com nome acessível com o número.
2. Fila e Aprovações inalterados.
3. `tsc`, lint e build passam; `df-reviewer` sem bloqueante; `df-qa` aprova
   NB1–NB10.

## Checklist de encerramento

- [x] `NavBadgeTone`, `NavBadge.tone`, `navBadgeFor` com tom, `MY_TICKETS_NAV_BADGE_MATCH`, `myTicketsNavBadgeFor`, este contrato, nota em `department-queue-nav-badge.md` (`df-architect`)
- [ ] `countMyLastTransferTickets` (`df-data`)
- [ ] Layout, `AppSidebar`, `MobileHeader`, `MobileNav`, `AppNav`, `NavItem` com tom (`df-ui`)
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm run build`; `df-reviewer`
- [ ] Cenários NB1–NB10 (`df-qa`)
