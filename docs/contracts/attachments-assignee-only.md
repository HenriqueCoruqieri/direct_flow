# Contrato — Só o destinatário anexa na Conclusão

Pedido do usuário em 2026-10-13, sobre a feature de anexos (plano
`docs/plans/ticket-attachments.md`): _"o usuário (qualquer usuário) só pode
incluir anexos no chamado quando puder clicar no botão 'Editar', ou seja, é
mais uma trava para garantir que somente o responsável pelo chamado possa
incluir anexos"_.

Ondas: `df-architect` (feito) → `df-data` → `df-actions` ‖ `df-ui` →
`df-reviewer` → `df-qa`. `df-email` e `df-auth` não entram.

Altera `docs/contracts/ticket-attachments-on-resolution.md` (quem vê o uploader
da Conclusão; a checagem de `resolveTicket` antes do R2; uma recusa nova de
`updateTicketResolution`). Aquele contrato traz uma revisão apontando para cá.
A regra de quem **resolve** (`canResolveTicket`) não muda.

**Revisão 2026-10-13 (ATENÇÃO do `df-reviewer`).** A tabela de respostas de
`resolveTicket` contradizia a precedência da transação: quem vê o chamado mas
não pode resolvê-lo recebia a recusa de anexo na action e a de resolução na
transação. Decisão do orquestrador: a action segue a ordem da transação e
confere `canResolveTicket` antes de `canAttachToTicket`, ainda sem tocar o R2.
Afeta a checagem antes do R2, a tabela, os cenários AO8, AO16 e AO17 (novos) e
o checklist. No `df-data`, a chamada a `canAttachToTicket` passa a usar spread
dos fatos do chamado, com o mesmo comportamento.

Versões observadas: `next@16.3.5`, `zod@4.6.5`, `drizzle-orm@0.45.2`,
`react-hook-form@7.88`.

## Regra em uma frase

Anexar na Conclusão exige **poder editar o chamado** (ADR 017:
`canEditTicket`) **e** ser o destinatário dele; quem resolve sem ser
destinatário (admin do setor, diretoria, autor de chamado na fila) continua
resolvendo, só que sem anexo.

## O que não muda

| Camada                                        | Mudança                                                                                           |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `db/schema.ts`, migration                     | nenhuma                                                                                           |
| criação ("Novo chamado", `createTicket`)      | nenhuma — o criador continua anexando: não existe "Editar" antes de o chamado existir             |
| `requestAttachmentUpload`                     | nenhuma — não conhece o chamado (serve à criação); a trava fica em quem grava (ver "Riscos")      |
| quem resolve (`canResolveTicket`)             | nenhuma                                                                                           |
| `app/_lib/validation/**`                      | nenhuma — `resolveTicketSchema.attachments` continua opcional; o schema não sabe quem é o usuário |
| `app/_lib/storage/**`, `attachment-intake.ts` | nenhuma                                                                                           |
| "Enviar para outro setor"                     | nenhuma — não recebe anexos                                                                       |
| `ticket_history`                              | nenhuma linha nova; recusa não grava nada                                                         |

## Domínio — `app/_lib/domain/ticket-attachment.ts` (novo, feito)

Arquivo próprio, e não `domain/attachment.ts`: a regra é sobre o **chamado**
(compõe `ticket-edit`), e `domain/attachment.ts` é importado pelo storage e
pelo uploader cliente, que não precisam carregar regras de chamado.

```ts
export const ATTACHMENT_ASSIGNEE_ONLY_MESSAGE =
  "Só o destinatário do chamado pode incluir anexos."

export const canAttachToTicket = (
  actor: TicketEditorFacts,
  ticket: TicketEditabilityFacts,
  now: Date,
): boolean

export const canAttachToTicketDetail = (
  actor: TicketEditorFacts,
  ticket: TicketEditDetailFacts,
  now: Date,
): boolean
```

| Função                    | Semântica                                                                                                                                                                                                |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `canAttachToTicket`       | `canUploadAttachment(actor) && ticket.assignedTo === actor.userId && canEditTicket(actor, ticket, now)`. Fatos com `hasPendingTransfer: boolean` (transação e checagem da action)                        |
| `canAttachToTicketDetail` | o mesmo, a partir dos fatos da página (`pendingTransfer: … \| null` → `hasPendingTransfer`), no padrão `canEditTicket`/`canEditTicketDetail`. Na página, o resultado é igual ao do `canEditTicketDetail` |

**As três partes, e por que a redundância é deliberada.** Hoje
`canEditTicket` já implica as outras duas: `ticketEditBlockFor`
(`app/_lib/domain/ticket-edit.ts:60-77`) recusa conta inativa e troca de senha
pendente (= `canUploadAttachment`) e devolve `NOT_ASSIGNEE` quando
`assignedTo !== userId` (chamado na fila incluído, porque `null !== userId`).
As duas checagens explícitas existem para que a trava de anexo **não dependa**
de a regra do "Editar" continuar sendo "só o destinatário": se o ADR 017 for
revisto (ex.: admin do setor passar a editar), quem anexa continua sendo só o
destinatário até uma decisão própria. Custo: duas comparações.

Consequências da composição, todas vindas do `canEditTicket`: além de ser o
destinatário, a pessoa precisa estar no setor atual do chamado, sem
transferência pendente, com status editável e fora de chamado travado pela
janela. Na Conclusão o uploader só existe no estado `resolvable`, então na
prática a regra soma "ser o destinatário" ao "poder resolver".

Tipos usados: `TicketEditorFacts`, `TicketEditabilityFacts` e
`TicketEditDetailFacts` (`app/_lib/types/ticket-edit.ts`, sem mudança).
`TicketActorFacts` (página, action) e `LockedActorFacts` (transação) servem
como `TicketEditorFacts`.

## Tipos — `app/_lib/types/` (feito)

### `app/_lib/types/attachment.ts` (acrescido)

```ts
export interface TicketAttachmentFacts
  extends TicketVisibilityFacts, TicketEditabilityFacts {}
```

`createdBy`, `assignedTo`, `currentDepartmentId`, `status`, `resolvedAt`,
`hasPendingTransfer`. Retorno da função de dados nova (abaixo): visibilidade
(para a action responder `NOT_FOUND` sem revelar se o chamado existe) e regra
de anexo.

### `app/_lib/types/ticket-resolution.ts` (alterado)

```ts
export type TicketResolutionRefusal = "attachments_not_allowed"

export interface TicketNotResolvable {
  status: "not_resolvable"
  reason?: TicketResolutionRefusal
}
```

**Decisão: motivo dentro de `not_resolvable`, e não um outcome novo.** Um
`status: "attachments_not_allowed"` na união `UpdateTicketResolutionOutcome`
quebraria o `tsc` assim que publicado: o `OUTCOME_FAILURES` de
`resolveTicket` é `satisfies Record<…status sem "saved", …>`
(`app/_lib/actions/ticket-resolution.ts:68-79`) e exigiria a chave nova antes
de o `df-actions` rodar. Com `reason` opcional, cada onda compila: hoje nada
muda; o `df-data` passa a devolver o motivo e a action atual ainda o trata
como `not_resolvable` genérico; o `df-actions` dá a ele a mensagem própria.
Semântica: "esta resolução, com estes anexos, foi recusada". Sem `reason` =
recusa da resolução em si, como hoje.

## `df-data` — o que criar e mudar

### `app/_lib/data/tickets.ts` — `findTicketAttachmentFacts` (novo)

```ts
export async function findTicketAttachmentFacts(
  ticketId: number,
): Promise<TicketAttachmentFacts | null>
```

- `ticket` por id: `createdBy`, `assignedTo`, `currentDepartmentId`, `status`,
  `resolvedAt`; e `hasPendingTransfer` = existe `ticket_transfer` do chamado
  com `status = 'pendente'` (mesma condição de `findTicketDetail` e de
  `updateTicketResolution`). Uma consulta com `exists` ou duas em
  `Promise.all`, à escolha.
- Sem trava (`for update`), sem autorização: é a checagem antecipada da
  action. Quem decide é a transação.
- Não achou → `null`.

Por que não `findTicketDetail`: ele faz três consultas (chamado, transferência
e o histórico inteiro com nove `alias`) para devolver seis campos.

### `app/_lib/data/tickets.ts` — `updateTicketResolution` (alterado)

Mesma transação, mesmas travas. Mudanças:

1. O `select ... for update` do chamado passa a trazer também `resolvedAt`.
2. `changedAt = new Date()` sobe para **antes** da checagem nova (é o `now` da
   regra e continua sendo o instante gravado).
3. **Depois** do `canResolveTicket` (`:562-569`) e **antes** de qualquer
   escrita:

   ```ts
   if (
     attachments.length > 0 &&
     !canAttachToTicket(
       resolver,
       { ...ticketRow, hasPendingTransfer: pendingTransfer !== undefined },
       changedAt,
     )
   ) {
     return { status: "not_resolvable", reason: "attachments_not_allowed" }
   }
   ```

   com `attachments = values.attachments ?? []`. O spread segue a forma da
   chamada a `canResolveTicket` logo acima; o `createdBy` que vem junto no
   `ticketRow` é ignorado por `canAttachToTicket`. A forma exata da linha é do
   `df-data` — o que o contrato fixa são os fatos usados (os cinco campos de
   `TicketEditabilityFacts`), o `now` (`changedAt`) e o lugar da checagem.

Precedência final: `not_found` (chamado) → `not_resolvable` (resolvedor sem
linha) → `not_found` (visibilidade) → `not_resolvable` (`canResolveTicket`) →
`not_resolvable` + `attachments_not_allowed` → gravação. Quem não pode
resolver recebe a recusa de resolução, não a de anexo. Resolver sem anexo
nunca passa pela checagem nova.

Sem anexo, comportamento idêntico ao de hoje. Recusa não grava nada (nem
`ticket`, nem histórico, nem `attachment`); a action apaga as cópias.

## `df-actions` — o que mudar

### `app/_lib/actions/ticket-resolution.ts` — `resolveTicket`

`ResolveTicketErrorCode`, `ResolveTicketResult` e a entrada não mudam.

**Checagem antes do R2** (substitui o passo 4.1 de
`ticket-attachments-on-resolution.md`; continua **só se `refs.length > 0`** e
dentro do `try`):

1. `[facts, ticketFacts] = await Promise.all([getAccountFacts(), findTicketAttachmentFacts(parsed.data.ticketId)])`.
2. `!facts || !canUploadAttachment(facts)` → `OUTCOME_FAILURES.not_resolvable`
   (como hoje).
3. Monta `TicketActorFacts` (`userId: actor.id` + `facts`, como
   `app/(app)/tickets/[id]/page.tsx:79-86`).
4. `!ticketFacts || !canViewTicket(actorFacts, ticketFacts)` →
   `OUTCOME_FAILURES.not_found` (`NOT_FOUND`, `Chamado não encontrado.`): quem
   não vê o chamado não descobre se ele existe.
5. `!canResolveTicket(actorFacts, ticketFacts)` →
   `OUTCOME_FAILURES.not_resolvable` (`FORBIDDEN`,
   `Você não pode resolver este chamado.`) — a mesma falha que a transação
   devolveria. `TicketAttachmentFacts` já carrega tudo que
   `TicketResolutionFacts` pede (`createdBy`, `assignedTo`,
   `currentDepartmentId`, `status`, `hasPendingTransfer`); nenhuma consulta a
   mais.
6. `!canAttachToTicket(actorFacts, ticketFacts, new Date())` →
   `ATTACHMENTS_NOT_ALLOWED_FAILURE`.

Só depois `storePendingAttachments`. Em nenhum dos passos 2–6 o R2 é tocado
(nem `HEAD`, nem cópia) e `stored` continua vazio. Erro lançado em 1 cai no
`catch` de hoje (`UNEXPECTED_FAILURE`).

A ordem dos passos 4–6 é a da precedência da transação (visibilidade →
`canResolveTicket` → `canAttachToTicket`): quem não pode resolver recebe a
recusa de resolução, nunca a de anexo, nos dois pontos. A única diferença é a
conta, conferida antes de tudo no passo 2 (como já era): conta inutilizável
recebe `FORBIDDEN` mesmo para um id que ela não vê ou que não existe, o que não
revela nada sobre o chamado.

```ts
const ATTACHMENTS_NOT_ALLOWED_FAILURE: ResolveTicketFailure = {
  ok: false,
  code: "FORBIDDEN",
  message: ATTACHMENT_ASSIGNEE_ONLY_MESSAGE,
}
```

**Resultado da transação.** `outcome.status !== "saved"` continua chamando
`discardStoredAttachments(stored, "[resolveTicket]")` primeiro (rollback das
cópias). Depois:
`outcome.status === "not_resolvable" && outcome.reason === "attachments_not_allowed"`
→ `ATTACHMENTS_NOT_ALLOWED_FAILURE`; senão `OUTCOME_FAILURES[outcome.status]`
como hoje. Com anexos, qualquer recusa da transação só acontece em corrida (o
chamado ou o destinatário mudou entre a checagem e a trava): o pedido forjado
de quem não pode resolver para no passo 5, e o de quem resolve mas não é
destinatário, no passo 6.

Respostas com anexos, na ordem das checagens:

| Situação (com anexos)                                                                                                  | `code`      | Mensagem                                            | R2 tocado             |
| ---------------------------------------------------------------------------------------------------------------------- | ----------- | --------------------------------------------------- | --------------------- |
| 2. sem conta, conta inativa ou com troca de senha pendente                                                             | `FORBIDDEN` | `Você não pode resolver este chamado.`              | não                   |
| 4. chamado inexistente ou que a pessoa não vê                                                                          | `NOT_FOUND` | `Chamado não encontrado.`                           | não                   |
| 5. vê, mas não pode resolver (não é resolvedor; chamado já resolvido, encerrado, com transferência pendente ou parado) | `FORBIDDEN` | `Você não pode resolver este chamado.`              | não                   |
| 6. pode resolver, mas não é destinatário / não pode editar                                                             | `FORBIDDEN` | `Só o destinatário do chamado pode incluir anexos.` | não                   |
| corrida: transação devolve `not_found` ou `not_resolvable` sem `reason`                                                | conforme    | `OUTCOME_FAILURES[outcome.status]`                  | sim — cópias apagadas |
| corrida: transação devolve `attachments_not_allowed`                                                                   | `FORBIDDEN` | `Só o destinatário do chamado pode incluir anexos.` | sim — cópias apagadas |
| demais casos (anexo inválido, erro inesperado)                                                                         | —           | como em `ticket-attachments-on-resolution.md`       | —                     |

"Parado" = status fora de `TICKET_STATUS_IS_RESOLVABLE`
(`app/_lib/domain/ticket-resolution.ts:34-44`). Destinatário com o chamado já
resolvido e ainda dentro da janela é o caso que mais se confunde: ele **pode
editar** (`resolvido` é editável até a trava da janela, `ticket-edit.ts:27-37`
e `:72-74`), então `canAttachToTicket` passaria, mas `canResolveTicket` recusa
(`ALREADY_RESOLVED`) no passo 5, antes do R2.

Sem anexo: nenhuma mudança (não chama `getAccountFacts` nem
`findTicketAttachmentFacts`, não toca o R2).

## `df-ui` — o que mudar

```
app/(app)/tickets/[id]/page.tsx                            alterado — calcula canAttach e passa à Conclusão
app/(app)/tickets/[id]/_components/ticket-conclusion.tsx   alterado — prop canAttach, repassada ao formulário
app/(app)/tickets/[id]/_components/resolve-ticket-form.tsx alterado — uploader só com canAttach
```

`new-ticket-dialog.tsx`, `attachment-uploader.tsx`, `attachment-upload-item.tsx`
e `use-attachment-uploads.ts` **não mudam**.

### `page.tsx`

`const canAttach = canAttachToTicketDetail(actor, ticket, now)` (ao lado de
`isEditable`, `page.tsx:96`) e `<TicketConclusion … canAttach={canAttach} />`.

### `TicketConclusion`

```ts
interface TicketConclusionProps {
  ticketId: number
  state: TicketConclusionState
  sendToDepartment: SendToDepartmentSetup | null
  editable?: boolean
  canAttach?: boolean
  className?: string
}
```

`canAttach` com padrão `false` (na falta, sem uploader). Repassa ao
`ResolveTicketForm` no estado `resolvable`.

### `ResolveTicketForm`

```ts
interface ResolveTicketFormProps {
  defaults: ResolveTicketFormDefaults
  sendToDepartment: SendToDepartmentSetup | null
  canAttach: boolean
}
```

- **`canAttach` verdadeiro**: exatamente como hoje (uploader com `Anexar` na
  barra de ações, aviso `RESOLUTION_ATTACHMENTS_NOTICE` quando há "Enviar para
  outro setor", bloqueio do "Resolver" durante envio).
- **`canAttach` falso**:
  - sem `Controller name="attachments"`, sem `AttachmentUploader`: nenhum
    título `Anexos`, dica, aviso, `Nenhum anexo.`, `Anexar` nem
    `input[type=file]` no card;
  - a barra de ações é renderizada pelo próprio formulário, com as mesmas
    classes da barra do uploader
    (`flex flex-wrap items-center justify-end gap-2 border-t border-border-subtle pt-4`),
    só com `[Enviar para outro setor]` (se houver) e `[Resolver]`;
  - o bloqueio por envio é ignorado:
    `submitBlockMessage = canAttach ? attachmentUploadsBlockMessage(uploadsBusy) : null`.
    Sem isso, um uploader desmontado com item `failed` deixaria o "Resolver"
    preso;
  - a action recebe **sempre** `attachments: []`:
    `resolveTicket(canAttach ? values : { ...values, attachments: [] })`. Por
    padrão o RHF mantém o valor de um `Controller` desmontado, e a lista de
    antes do `router.refresh()` seria reenviada e recusada de novo. O `df-ui`
    pôs também `shouldUnregister` no `Controller` de anexos: as duas medidas
    coexistem, e o `attachments: []` continua sendo a garantia no envio.
- Resultado `FORBIDDEN` (inclusive a mensagem nova): `toast.error` e
  `router.refresh()`, como hoje. O refresh recalcula `canAttach`; se virou
  falso, o uploader some e a solução digitada fica (o formulário não
  desmonta). A pessoa clica "Resolver" de novo e resolve sem anexo.
- Depois de "Assumir" (cabeçalho), a revalidação recalcula `canAttach` e o
  uploader aparece.

## Riscos

1. **Pedido de URL por quem não anexa.** `requestAttachmentUpload` não conhece
   o chamado, então quem não é destinatário ainda consegue subir arquivo para
   `pending/<id dele>/`. Nada vira anexo: a gravação é recusada antes do R2 e
   o ciclo de vida apaga `pending/` em 1 dia. Mesma cota aceita no ADR 018.
2. **Corrida entre checagem e trava.** Coberta pela transação, que repete as
   duas checagens sob trava (`not_resolvable` e `attachments_not_allowed`);
   custa até 5 cópias, apagadas em seguida.
   Órfão de cópia se a limpeza falhar (ADR 018).
3. **Chamado resolvido pelo autor na fila.** O autor vira destinatário ao
   resolver (ADR 017, item 5), mas no momento da resolução ainda não é: não
   anexa. Quer anexar? Assume antes.

## Cenários para o `df-qa`

Usuários de `docs/contracts/qa-seed.md`: `M` = QA Membro Suporte, `A` = QA
Admin Suporte, `I` = QA Admin Infra, `D` = diretor. Títulos começam com
`[QA] Anexo destinatário`. Criação e resolução só em QA Suporte. **Não alterar
#65 a #68.** Arquivos de teste: os da Etapa 1
(`ticket-attachments-create-and-download.md`). Pré-requisito: configuração do
ADR 018; sem ela, rodar só AO3–AO6, AO9 e AO7 até a seção `Anexos` aparecer
(que não sobem arquivo) e registrar o resto como bloqueado.

**Preparação** (M, pelo "Novo chamado"):

- `#Q1` = `[QA] Anexo destinatário M`, destinatário **M**, com `print.png` na
  criação.
- `#Q2` = `[QA] Anexo destinatário fila`, destinatário **fila**.
- `#Q3` = `[QA] Anexo destinatário admin`, destinatário **M**.
- `#Q4` = `[QA] Anexo destinatário diretoria`, destinatário **M**.
- `#Q5` = `[QA] Anexo destinatário forjado`, destinatário **fila**.
- `#Q6` = `[QA] Anexo destinatário sem resolução`, destinatário **A** (M é
  autor e vê o chamado, mas não o resolve: não é admin nem destinatário).

**Chave forjada.** Nos cenários de pedido forjado (AO8, AO10, AO16, AO17), a
chave é real e do próprio usuário: `requestAttachmentUpload` + `PUT` feitos
por ele no "Novo chamado", sem enviar o diálogo. "R2 não tocado" se confere
pela ausência de log `[resolveTicket] rollback` no `next-devtools` (nada foi
copiado) e pela chave continuar em `pending/` sem cópia definitiva.

| #    | Quem | Viewport | Ação                                                                                                                                                                                                                               | Esperado                                                                                                                                                                                                                                                                          |
| ---- | ---- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AO1  | M    | 1440×900 | abrir `/tickets/Q1`                                                                                                                                                                                                                | cabeçalho com `Editar`; Conclusão com `Solução`, seção `Anexos` (dica, `Nenhum anexo.`, `input[type=file][multiple]`) e a barra com `Anexar` ativo e `Resolver`                                                                                                                   |
| AO2  | M    | 1440×900 | em Q1, anexar `dados.csv` (`Enviado`); solução válida → `Resolver`                                                                                                                                                                 | toast `Chamado #Q1 resolvido.`; banco: 2 linhas em `attachment` para Q1 (`print.png` da criação e `dados.csv` com `uploaded_by` = M e `created_at` = `ticket.resolved_at`)                                                                                                        |
| AO3  | A    | 1440×900 | abrir `/tickets/Q3` (destinatário M; A é admin do setor)                                                                                                                                                                           | cabeçalho **sem** `Editar`; Conclusão com `Solução` e a barra com `Enviar para outro setor` e `Resolver`; **nenhum** título `Anexos`, dica, aviso `Os anexos são salvos só ao resolver…`, `Anexar` nem `input[type=file]` no card                                                 |
| AO4  | A    | 1440×900 | em Q3, solução válida → `Resolver`                                                                                                                                                                                                 | toast `Chamado #Q3 resolvido.`; nenhuma linha em `attachment` para Q3; nenhum request de `requestAttachmentUpload` nem `PUT` ao R2                                                                                                                                                |
| AO5  | D    | 1440×900 | abrir `/tickets/Q4`; solução válida → `Resolver`                                                                                                                                                                                   | igual a AO3 (sem `Editar`, sem nada de anexo; `Enviar para outro setor` se a regra de envio da diretoria o mostrar); resolvido; nenhuma linha em `attachment` para Q4                                                                                                             |
| AO6  | M, A | 1440×900 | abrir `/tickets/Q2` (fila) como M e como A                                                                                                                                                                                         | nos dois: Conclusão resolvível, sem nada de anexo, sem `Editar`; botão `Assumir` no cabeçalho                                                                                                                                                                                     |
| AO7  | M    | 1440×900 | em Q2, `Assumir`                                                                                                                                                                                                                   | sem recarregar a página: aparecem `Editar` e a seção `Anexos` com `Anexar` na Conclusão. Anexar `print.png` e resolver → 1 linha em `attachment`, `uploaded_by` = M                                                                                                               |
| AO8  | A    | —        | com uma chave real de A, forjar `resolveTicket` (`Next-Action`) para Q5 com `attachments: [{ key, fileName: "print.png" }]` e solução válida. A **pode** resolver Q5 (admin do setor; ver AO9), então passa do passo 5 e para no 6 | `{ ok: false, code: "FORBIDDEN", message: "Só o destinatário do chamado pode incluir anexos." }`; Q5 continua **não** resolvido; `max(id)` de `ticket_history` e de `attachment` inalterados; no `next-devtools`, nenhum log `[resolveTicket] rollback` (nada foi copiado)        |
| AO9  | A    | —        | repetir AO8 sem `attachments` (só `ticketId` e `solution`)                                                                                                                                                                         | resolve normalmente (`Chamado #Q5 resolvido.`); A vira destinatário de Q5 com linha `atribuicao` antes da `resolucao` (ADR 017, item 5 — sem mudança); nenhuma linha em `attachment`                                                                                              |
| AO10 | I    | —        | forjar `resolveTicket` como I (outro setor) para um chamado da fila de QA Suporte, com uma chave real de I                                                                                                                         | `{ ok: false, code: "NOT_FOUND", message: "Chamado não encontrado." }`; nada gravado; nenhum log de rollback                                                                                                                                                                      |
| AO11 | A    | 1440×900 | A cria `[QA] Anexo destinatário corrida` com destinatário **A**. Aba 1: Conclusão, anexar `print.png` (`Enviado`), digitar a solução. Aba 2: `Editar` → destinatário **M** → salvar. Aba 1: `Resolver`                             | toast `Só o destinatário do chamado pode incluir anexos.`; a seção `Anexos` some da Conclusão; a solução digitada continua no campo; `Resolver` de novo → resolvido **sem** anexo (A é admin), 0 linhas em `attachment`, e o 2º request de `resolveTicket` leva `attachments: []` |
| AO12 | M    | 1440×900 | regressão: "Novo chamado" com `print.png`, destinatário fila (`[QA] Anexo destinatário criação`)                                                                                                                                   | criado com 1 linha em `attachment` (`uploaded_by` = M), como AT2/AR14                                                                                                                                                                                                             |
| AO13 | M    | 1440×900 | abrir Q1 depois de resolvido                                                                                                                                                                                                       | Conclusão travada, sem uploader (como AR16)                                                                                                                                                                                                                                       |
| AO14 | A, M | 390×844  | A em um chamado resolvível de QA Suporte de outra pessoa; M em um chamado em que é destinatário, com 2 anexos na lista                                                                                                             | sem rolagem horizontal (`scrollWidth <= clientWidth`); na visão de A, a barra só com `Enviar para outro setor` e `Resolver` quebrando de linha sem estourar                                                                                                                       |
| AO15 | —    | —        | toda a bateria                                                                                                                                                                                                                     | nenhum erro nem aviso de hidratação no console nem no `next-devtools`; nenhum erro de CORS fora de interceptação; nenhum e-mail novo                                                                                                                                              |
| AO16 | M    | —        | pedido forjado por quem **não pode resolver**: com uma chave real de M, forjar `resolveTicket` para Q6 (destinatário A; M é autor e vê) com `attachments: [{ key, fileName: "print.png" }]` e solução válida                       | `{ ok: false, code: "FORBIDDEN", message: "Você não pode resolver este chamado." }` — a recusa de **resolução**, não a de anexo; Q6 continua **não** resolvido; `max(id)` de `ticket_history` e de `attachment` inalterados; nenhum log `[resolveTicket] rollback`                |
| AO17 | M    | —        | destinatário com chamado **já resolvido na janela**: depois de AO2, com uma chave real de M, forjar `resolveTicket` para Q1 com `attachments: [{ key, fileName: "print.png" }]` e solução válida                                   | `{ ok: false, code: "FORBIDDEN", message: "Você não pode resolver este chamado." }`; `ticket.resolved_at`, `solution` e `updated_at` de Q1 inalterados; Q1 continua com 2 linhas em `attachment`; `max(id)` de `ticket_history` inalterado; nenhum log `[resolveTicket] rollback` |

Nota: AO11 cobre a recusa de anexo na **checagem da action** (o destinatário
já mudou antes do clique); AO16 e AO17 cobrem a recusa de resolução na mesma
checagem, antes do R2 — em AO17, M ainda pode editar Q1 e passaria em
`canAttachToTicket`, então só o passo 5 explica a ausência de cópia. A recusa
dentro da **transação** só acontece se o chamado ou o destinatário mudar entre
a checagem e a trava (milissegundos); não é reproduzível pelo navegador e fica
para o `df-reviewer` conferir no código (`updateTicketResolution` e o
mapeamento em `resolveTicket`).

## Critério de pronto

1. AO1–AO17 aprovados pelo `df-qa`.
2. `canAttachToTicket` conferido em dois pontos no servidor: `resolveTicket`
   antes de `storePendingAttachments` e `updateTicketResolution` sob trava;
   a UI decide o uploader com `canAttachToTicketDetail`. Nenhum outro arquivo
   reescreve a regra.
3. Nos dois pontos do servidor, `canResolveTicket` vem antes de
   `canAttachToTicket`: a mesma entrada recebe a mesma recusa na action e na
   transação.
4. `npx tsc --noEmit`, `npm run lint` e `npm run build` passam; `df-reviewer`
   sem bloqueante.

## Checklist de encerramento

- [x] `canAttachToTicket`, `canAttachToTicketDetail`, `ATTACHMENT_ASSIGNEE_ONLY_MESSAGE`; `TicketAttachmentFacts`; `TicketResolutionRefusal` e `TicketNotResolvable.reason`; este contrato e a revisão em `ticket-attachments-on-resolution.md` (`df-architect`)
- [x] `findTicketAttachmentFacts` com duas consultas em `Promise.all` (`app/_lib/data/tickets.ts:528-557`); `updateTicketResolution` com `resolvedAt` no `for update` (`:573`), `changedAt` no início da transação (`:565`) e a recusa `attachments_not_allowed` depois do `canResolveTicket` (`:607-624`, antes da revisão) (`df-data`)
- [x] revisão: fatos de `canAttachToTicket` em `updateTicketResolution` por spread (`{ ...ticketRow, hasPendingTransfer: pendingTransfer !== undefined }`, condição em `app/_lib/data/tickets.ts:609-616`, recusa em `:617`), depois do `canResolveTicket` (`:598-605`), sem mudança de comportamento (`df-data`)
- [x] checagem antes do R2, só com anexos (`app/_lib/actions/ticket-resolution.ts:125-148`, antes da revisão), `ATTACHMENTS_NOT_ALLOWED_FAILURE` (`:90-94`) e mapeamento da recusa da transação depois do rollback das cópias (`:171-180`, antes da revisão) (`df-actions`)
- [x] revisão: import de `canResolveTicket` (`app/_lib/actions/ticket-resolution.ts:31-34`); passo 5, `canResolveTicket(actorFacts, ticketFacts)` → `OUTCOME_FAILURES.not_resolvable` (`:148-150`), depois da visibilidade (`:145-147`) e antes de `canAttachToTicket` (`:151-153`); R2 só em `storePendingAttachments` (`:156`) (`df-actions`)
- [x] revisão deste contrato: tabela de respostas na ordem das checagens, passos 5–6, cenários AO8, AO16 e AO17, preparação de `#Q6` (`df-architect`)
- [x] `canAttach` em `page.tsx:96` → `TicketConclusion` (`:174`; prop com padrão `false`, `ticket-conclusion.tsx:20`, `:29`) → `ResolveTicketForm`; sem `canAttach`, barra própria (`resolve-ticket-form.tsx:186-188`), bloqueio por envio ignorado (`:60-62`) e `attachments: []` no envio (`:66`) (`df-ui`)
- [x] além do contrato (`df-ui`): `shouldUnregister` no `Controller` de anexos (`resolve-ticket-form.tsx:168`), que tira `attachments` dos valores quando o uploader desmonta — o `attachments: []` de `:66` continua como garantia; e reset de `uploadsBusy` para `"idle"` quando `canAttach` muda, pelo padrão de ajuste de estado no render (`:47-52`), para que um envio em andamento ou com falha de antes do `router.refresh()` não prenda o "Resolver" se o uploader voltar
- [ ] cenários do `df-qa`
- [x] `npx tsc --noEmit`, `npm run lint`, `npm run build` depois da revisão
