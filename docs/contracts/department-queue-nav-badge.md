# Contrato — Número no item "Fila do setor" do menu

Pedido do usuário (feature), via `/implement`, em 2026-11-12. Decisões do
orquestrador acatadas. Este documento prevalece sobre
`docs/contracts/approvals.md` e `docs/contracts/department-queue.md` no que
diverge (as duas ganharam nota de revisão apontando para cá).

Versões observadas: `next@16.3.5`, `drizzle-orm@0.45.2`, `zod@4.6.5`.

## Escopo técnico em uma frase

Sem schema e sem migration: o item `Fila do setor` do menu lateral (desktop e
mobile) mostra o número de chamados da aba **Em aberto** da Fila do setor da
pessoa logada, calculado pelo layout `(app)` com o mesmo `where` da aba, sem
período; o selo de Aprovações passa a usar um tipo genérico `NavBadge`.

## Decisões

| Tema                  | Decisão                                                                                                                                                                                                                                                                        |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| O que conta           | Exatamente a aba **Em aberto** (`DEPARTMENT_QUEUE_TAB_RULES.open`): `ticket.current_department_id = setor`, `ticket.status in DEPARTMENT_QUEUE_OPEN_STATUSES`, `ticket.assigned_to is null`. Sem filtro de período. Os `aguardando_aprovacao` ficam fora (estão em Aprovações) |
| Qual aba              | `DEPARTMENT_QUEUE_NAV_BADGE_TAB = "open"`, no domínio. A consulta recebe a aba; o filtro não é reescrito                                                                                                                                                                       |
| Setor do Diretor      | O setor da própria pessoa (Diretoria), padrão da página `/queue` sem `?setor=`. O `?setor=` da página não afeta o selo                                                                                                                                                         |
| Setor "Não alocado"   | `navBadgeDepartmentIdFor` devolve `null`: o layout não conta e não há selo. O item já nem aparece (`hasDepartmentQueue` é `false`)                                                                                                                                             |
| Texto e teto          | Os do selo de Aprovações, agora genéricos: até 99, número; acima, `99+` (`formatNavBadgeCount`). Zero ou menos → sem selo                                                                                                                                                      |
| Nome acessível        | `Fila do setor, {count} em aberto`, sempre com o número real (`Fila do setor, 120 em aberto`). "em aberto" vem do rótulo da aba, em minúsculas                                                                                                                                 |
| Generalização do tipo | `ApprovalsNavBadge` vira `NavBadge` (`app/_lib/types/nav-badge.ts`); teto e formatação saem de Aprovações para `app/_lib/domain/nav-badge.ts`. `approvalsNavBadgeFor` e `approvalsDepartmentIdFor` continuam com o mesmo nome e comportamento                                  |
| Cor do selo           | A mesma de Aprovações (`warning`), sem variação por item. O `NavItem` não muda de aparência                                                                                                                                                                                    |

## Tabelas, enums e migration

Nada novo. Leitura de `ticket` (`current_department_id`, `status`,
`assigned_to`). Índice usado: `ticket_dept_status_idx`.

---

## Renomeações (para `df-ui` e `df-data`)

| Antigo                                                      | Novo                                                  | Quem usa                |
| ----------------------------------------------------------- | ----------------------------------------------------- | ----------------------- |
| `ApprovalsNavBadge` (`@/app/_lib/types/approvals`)          | `NavBadge` (`@/app/_lib/types/nav-badge`)             | `df-ui`                 |
| `ApprovalsAccessFacts` (`@/app/_lib/types/approvals`)       | `NavBadgeAccessFacts` (`@/app/_lib/types/nav-badge`)  | ninguém fora do domínio |
| `APPROVALS_BADGE_MAX` (`@/app/_lib/domain/approvals`)       | `NAV_BADGE_MAX` (`@/app/_lib/domain/nav-badge`)       | ninguém fora do domínio |
| `formatApprovalsBadgeCount` (`@/app/_lib/domain/approvals`) | `formatNavBadgeCount` (`@/app/_lib/domain/nav-badge`) | ninguém fora do domínio |

Sem mudança de nome: `approvalsNavBadgeFor`, `approvalsDepartmentIdFor`.
`df-data` não usa nenhum dos símbolos renomeados.

## Tipos

### `app/_lib/types/nav-badge.ts` (novo)

```ts
export interface NavBadge {
  text: string
  accessibleLabel: string
}

export interface NavBadgeAccessFacts {
  departmentId: number
  isUnassigned: boolean
}
```

`RegistryAccessFacts` (retorno de `getAccountFacts`) satisfaz
`NavBadgeAccessFacts`.

### `app/_lib/types/approvals.ts` (alterado)

Saem `ApprovalsAccessFacts` e `ApprovalsNavBadge`. `ApprovalListItem` não muda.

## Domínio

### `app/_lib/domain/nav-badge.ts` (novo)

```ts
export const NAV_BADGE_MAX = 99
formatNavBadgeCount(count: number): string
navBadgeDepartmentIdFor(facts: NavBadgeAccessFacts | null): number | null
navBadgeFor(count: number, accessibleLabel: string): NavBadge | null
```

| Função                    | Semântica                                                                                      |
| ------------------------- | ---------------------------------------------------------------------------------------------- |
| `formatNavBadgeCount`     | `count > 99` → `"99+"`; senão `String(count)`                                                  |
| `navBadgeDepartmentIdFor` | `null` se `facts` é `null` ou `isUnassigned`; senão `facts.departmentId` (vale para Diretoria) |
| `navBadgeFor`             | `count <= 0` → `null`. Senão `{ text: formatNavBadgeCount(count), accessibleLabel }`           |

### `app/_lib/domain/approvals.ts` (alterado)

```ts
approvalsDepartmentIdFor = navBadgeDepartmentIdFor
approvalsNavBadgeFor(count: number): NavBadge | null
```

Comportamento idêntico ao anterior (`Aprovações, {count} aguardando`, teto 99).

### `app/_lib/domain/department-queue.ts` (alterado)

```ts
export const DEPARTMENT_QUEUE_NAV_BADGE_TAB: DepartmentQueueTab = "open"
departmentQueueNavBadgeFor(count: number): NavBadge | null
```

| Nome                             | Semântica                                                                                                                |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `DEPARTMENT_QUEUE_NAV_BADGE_TAB` | A aba que o selo conta. Passada à consulta de `df-data`                                                                  |
| `departmentQueueNavBadgeFor`     | `count <= 0` → `null`. Senão `{ text: formatNavBadgeCount(count), accessibleLabel: "Fila do setor, {count} em aberto" }` |

O setor contado vem de `navBadgeDepartmentIdFor` (`app/_lib/domain/nav-badge.ts`).

## Validação

Nada novo.

## `df-data`

### `app/_lib/data/department-queue.ts` (alterado)

```ts
export async function countQueueTickets(
  departmentId: number,
  tab: DepartmentQueueTab,
): Promise<number>
```

- `select count(*)::int from ticket where queueTabCondition(departmentId, tab)`,
  reaproveitando o `queueTabCondition` privado do arquivo (o mesmo de
  `listQueueTickets` e `countQueueTicketsByTab`). Nada de reescrever status ou
  destinatário.
- Sem período: não recebe `range`.
- Linha ausente → `0`.
- Não reaproveitar `countQueueTicketsByTab(departmentId).open`: ela varre todos
  os chamados do setor (sete `filter` sobre `current_department_id`), em toda
  página do app. A consulta dedicada usa `ticket_dept_status_idx`.

## `df-actions`

Nada. Nenhuma action nova nem alterada (ver "Quando o número atualiza").

## `df-ui`

### `app/(app)/layout.tsx`

1. Trocar o cálculo do setor por `navBadgeDepartmentIdFor(accountFacts)` (ou
   manter `approvalsDepartmentIdFor`, que é o mesmo valor) e usar o mesmo id
   para as duas contagens, em paralelo:

   ```ts
   const badgeDepartmentId = navBadgeDepartmentIdFor(accountFacts)
   const [pendingApprovals, openQueueTickets] =
     badgeDepartmentId === null
       ? [0, 0]
       : await Promise.all([
           countPendingApprovals(badgeDepartmentId),
           countQueueTickets(badgeDepartmentId, DEPARTMENT_QUEUE_NAV_BADGE_TAB),
         ])
   const approvalsBadge = approvalsNavBadgeFor(pendingApprovals)
   const departmentQueueBadge = departmentQueueNavBadgeFor(openQueueTickets)
   ```

   Sem `try/catch`, como as outras leituras do layout.

2. Passar `departmentQueueBadge` a `AppSidebar` e `MobileHeader`.

### Navegação

- `app-sidebar.tsx`, `mobile-header.tsx`, `mobile-nav.tsx`, `app-nav.tsx`:
  `approvalsBadge: ApprovalsNavBadge | null` → `approvalsBadge: NavBadge | null`
  e nova prop `departmentQueueBadge: NavBadge | null`, repassada até `AppNav`.
- `app-nav.tsx`: `badge={departmentQueueBadge}` no `NavItem` de
  `DEPARTMENT_QUEUE_PATH`.
- `nav-item.tsx`: `badge?: NavBadge | null`. Nada mais muda.

### Atualização depois de enviar para outro setor sem manter acesso

`app/(app)/tickets/[id]/_components/send-to-department-dialog.tsx:121`: chamar
`router.refresh()` logo depois de `router.replace(leaveHref)`, exatamente como
`decline-transfer-dialog.tsx:90-91`. Motivo e ordem na seção seguinte.

## Quando o número atualiza

O layout `(app)` só re-renderiza quando o servidor manda a árvore desde a raiz:
recarga, `router.refresh()` ou Server Action que chama `revalidatePath` (no
Next 16 a resposta da action vem da raiz e o cliente aplica com
`FreshnessPolicy.RefreshAll`,
`next/dist/client/components/router-reducer/reducers/server-action-reducer.js:294-297`).
Navegação client-side comum reaproveita o layout.

| Evento (de quem agiu)                                                          | Efeito no "Em aberto" do próprio setor                                                                  | Atualiza sozinho?                                                                                                      |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Assumir (`assumeTicket`)                                                       | −1 se o chamado estava sem destinatário                                                                 | Sim: `ticket-assignment.ts:232-234` sempre revalida                                                                    |
| Atribuir/enviar a uma pessoa (`sendTicket`)                                    | −1 se estava sem destinatário                                                                           | Sim: mesma `runAssignment`                                                                                             |
| Atender (`attendTicket`)                                                       | Nenhum (o chamado já tinha destinatário)                                                                | Sim: `ticket-assignment.ts:306-308`                                                                                    |
| Aceitar transferência (`acceptTicketTransfer`)                                 | Nenhum: `aguardando_aprovacao` não está em Em aberto e o aceite atribui a quem aceitou (`em_andamento`) | Sim: `ticket-transfer.ts:352-355` (o selo de Aprovações cai 1)                                                         |
| Enviar para outro setor, mantendo acesso                                       | −1 se estava sem destinatário                                                                           | Sim: `ticket-transfer.ts:306-311`                                                                                      |
| Enviar para outro setor, **sem** manter acesso                                 | −1 se estava sem destinatário                                                                           | **Não**: a action não revalida (ADR 016) e a UI só faz `router.replace`. Mudança no `df-ui` acima (`router.refresh()`) |
| Recusar transferência                                                          | Nenhum no setor de quem recusa                                                                          | Com acesso, a action revalida; sem acesso, o dialog já faz `router.refresh()`                                          |
| Abrir chamado (`createTicket`)                                                 | +1 se aberto para o próprio setor sem destinatário                                                      | Sim: `tickets.ts:210-212`                                                                                              |
| Editar (`editTicket`) ou resolver (`resolveTicket`)                            | Pode variar                                                                                             | Sim: `tickets.ts:452-455`, `ticket-resolution.ts:101-103`                                                              |
| Ação de **outra** pessoa (colega assume, outro setor envia ou recusa de volta) | Pode variar                                                                                             | Não: aparece ao recarregar ou na próxima action que revalide. Mesmo critério de Aprovações (decisão 4A), sem polling   |

Nenhuma mudança em `df-actions`. Revalidar o layout na action de envio sem
acesso traria de volta a corrida do 404 descrita no ADR 016.

---

## Cenários do `df-qa`

Usuários de `docs/contracts/qa-seed.md`: `D` = Diretor, `A` = QA Admin
Suporte, `M` = QA Membro Suporte, `I` = QA Admin Infra. `S`/`F` = ids de QA
Suporte/QA Infra; `DIR` = id da Diretoria. Títulos começam com `[QA]`. **Não
alterar #65 a #68.** Escrita só em QA Suporte e QA Infra; na Diretoria só ler.

Consulta de referência `EA(dep)`:

```sql
select count(*) from ticket
where current_department_id = :dep
  and status in ('aberto', 'em_analise', 'encaminhado', 'recusado', 'em_andamento')
  and assigned_to is null
```

O `in (...)` é `DEPARTMENT_QUEUE_OPEN_STATUSES` em 2026-11-12: os não finais,
menos `resolvido` e `aguardando_aprovacao`.

| #    | Quem  | Ação                                                                                     | Esperado                                                                                                                                                                                    |
| ---- | ----- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| QB1  | M     | qualquer tela, menu lateral (≥ 1024 px)                                                  | item `Fila do setor` com selo = `EA(S)` (sem selo se 0); cor e forma iguais às do selo de `Aprovações`; nome acessível do link `Fila do setor, N em aberto`; o número não é lido duas vezes |
| QB2  | M     | `/queue` (aba Em aberto, período Todos)                                                  | contador da aba Em aberto = número do selo = `EA(S)`                                                                                                                                        |
| QB3  | M     | `/queue` com período `Hoje`                                                              | a aba e a lista mudam; o selo do menu **não** muda (sem período)                                                                                                                            |
| QB4  | M     | 390×844, abrir o menu mobile                                                             | o mesmo selo e o mesmo nome acessível em `Fila do setor`; selo de `Aprovações` continua                                                                                                     |
| QB5  | M     | criar `[QA] Selo fila 1` em QA Suporte, sem destinatário → `#B1`                         | sem recarregar, selo +1 (aparece com `1` se antes não havia)                                                                                                                                |
| QB6  | M     | na Fila, "Assumir" em `#B1`                                                              | sem recarregar, selo −1 (some se chegar a 0); banco: `assigned_to` = M                                                                                                                      |
| QB7  | A     | criar `[QA] Selo fila 2` (`#B2`); no detalhe, enviar para M                              | sem recarregar, selo de A −1 depois do envio                                                                                                                                                |
| QB8  | A     | criar `[QA] Selo fila 3` (`#B3`); enviar para QA Infra sem destinatário                  | sem recarregar, selo de A −1 (se A mantém acesso, pela revalidação; se não, pelo `router.refresh()` depois de sair do detalhe). F5 não muda o número                                        |
| QB9  | I     | recarregar; `/approvals`; "Atender" em `#B3`                                             | antes do aceite, `#B3` **não** conta no selo da Fila de I (aguardando aprovação); depois do aceite, selo da Fila de I igual a antes, selo de Aprovações −1; ambos sem recarregar            |
| QB10 | A     | criar `[QA] Selo fila 4` (`#B4`); enviar para QA Infra; I recusa com motivo; A recarrega | `#B4` volta a QA Suporte como `recusado`; se sem destinatário, o selo de A +1 só depois de recarregar (ação de outra pessoa)                                                                |
| QB11 | D     | menu; depois `/queue?setor=<S>`                                                          | selo = `EA(DIR)`; trocar o setor na página não muda o selo                                                                                                                                  |
| QB12 | D e M | (opcional) D move M para Não alocado em Cadastros → Pessoas; M recarrega; D devolve      | M não vê o item `Fila do setor` (nem selo); `Aprovações` sem selo; nenhum erro. Se não puder coordenar, não executado. Ao final, M ativo em QA Suporte                                      |
| QB13 | todos | toda a bateria                                                                           | selo de `Aprovações` com o mesmo comportamento de antes (`Aprovações, N aguardando`); console e dev server (`next-devtools`) sem erro nem aviso de hidratação                               |

Limite conhecido: `99+` não exercitado (o banco não tem mais de 99 em aberto num
setor); a regra vive em `formatNavBadgeCount`.

## Riscos

1. **Segunda consulta por render do layout.** Em paralelo com a de Aprovações,
   coberta por `ticket_dept_status_idx`. Custo baixo.
2. **Selo desatualizado para quem não agiu.** Igual a Aprovações; aceito.
3. **Selo e aba podem divergir por instantes**: a página `/queue` é dinâmica e
   o layout reaproveitado em navegação comum. Some no primeiro refresh.

## Critério de pronto

1. `Fila do setor` mostra o selo só quando `EA(setor da pessoa) > 0`, desktop e
   mobile, com nome acessível com o número.
2. Selo atualiza sem recarga depois de assumir, atribuir, enviar (com e sem
   acesso) e aceitar.
3. Selo de Aprovações inalterado.
4. `tsc`, lint e build passam; `df-reviewer` sem bloqueante; `df-qa` aprova
   QB1–QB13.

## Checklist de encerramento

- [x] `NavBadge`, `NavBadgeAccessFacts`, `app/_lib/domain/nav-badge.ts`, selo da Fila no domínio, este contrato, notas em `approvals.md` e `department-queue.md` (`df-architect`)
- [x] `countQueueTickets` (`df-data`)
- [x] Layout, `AppSidebar`, `MobileHeader`, `MobileNav`, `AppNav`, `NavItem` com `NavBadge`; `router.refresh()` em `SendToDepartmentDialog` (`df-ui`)
- [x] `npx tsc --noEmit`, `npm run lint`, `npm run build`; `df-reviewer` (APROVADO COM ATENÇÕES)
- [ ] Cenários QB1–QB13 (`df-qa`)
