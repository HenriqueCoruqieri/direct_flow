# Contrato — Administradores na edição do setor

Atalho em Cadastros → Setores: no Dialog de **edição** de um setor (nunca na
criação), o diretor marca quais membros ativos daquele setor são
administradores. Marcado = `admin`, desmarcado = `member`. Cadastros → Pessoas
continua sendo o lugar principal da troca de papel; as regras são as mesmas
(`docs/contracts/registry-people.md`, ADR 011).

Sem `docs/plans/` (pedido do usuário). Sem schema, sem migration, sem ADR novo.

Versões observadas: `next@16.3.5`, `drizzle-orm@0.45.2`, `zod@4.6.5`,
`react-hook-form@7.88`.

**Por que contrato próprio, e não seção em `registry-departments.md`:** o
atalho cruza dois contratos (Setores e Pessoas) e o de Setores já passa de
48 KB. Um arquivo curto e autocontido deixa as quatro ondas lerem só o que muda;
`registry-departments.md` ganhou uma nota no topo apontando para cá.

## Decisões

| Tema                     | Decisão                                                                                                                                                                                                                                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quem                     | Só o diretor (a tela e a action de Setores já são só dele: `requireDirector` / `getDirector`). Admin e membro não chegam ao Dialog (404 na página) e a action responde `FORBIDDEN`                                                                                                                      |
| Onde                     | Só no modo edição. A criação continua só com o nome (setor novo não tem membros)                                                                                                                                                                                                                        |
| Diretoria (`is_board`)   | Campo **oculto**, com a nota `BOARD_ADMINS_NOTE`. Todos já são admin por força (`forcedRoleFor`); uma lista travada de caixas marcadas não decide nada                                                                                                                                                  |
| Não alocado              | Campo **oculto**, com a nota `UNASSIGNED_ADMINS_NOTE`. Admin no Não alocado tem `RegistryAccess = none` (ADR 011): promover ali não dá poder. O papel de quem está lá continua ajustável em Pessoas                                                                                                     |
| Setor inativo            | Campo **oculto**, sem nota. Setor só desativa com zero pessoas ativas e ninguém é colocado nem reativado num setor inativo, então a lista seria sempre vazia                                                                                                                                            |
| Obrigatoriedade          | **Opcional; zero admins é permitido.** Nenhuma regra atual exige admin num setor (conferido em `domain/person.ts`, `data/people.ts`, `domain/ticket-assignment.ts`, `domain/ticket-resolution.ts`). Risco registrado abaixo                                                                             |
| Escrita                  | **A mesma action e a mesma transação do renomear** (`renameDepartment` → `updateDepartmentName`). Nome e papéis gravam juntos ou nada grava. Uma action separada deixaria "nome salvo, papéis não" como estado possível e dois toasts                                                                   |
| Corrida                  | O formulário manda a lista de membros que **mostrou** (`memberIds`) e os marcados (`adminIds`). Dentro da transação, sob `FOR UPDATE`, a lista atual de membros ativos tem de ser igual à mostrada; senão `MEMBERS_CHANGED` e nada grava (nem o nome)                                                   |
| Mesmas regras de Pessoas | O papel final passa por `forcedRoleFor` (o mesmo de `decidePersonUpdate`); só o diretor troca papel (`canAssignRole`, aqui garantido por `getDirector`). Nenhuma regra nova de papel                                                                                                                    |
| Efeitos colaterais       | Os mesmos de trocar o papel em Pessoas, que são só: `revalidatePath("/(app)", "layout")`. Sem revogar sessão, sem e-mail, sem histórico. O papel é lido do banco a cada request (`getSession` sem cookie cache; `getRegistryAccess` fresco), então menu Cadastros e poderes mudam na próxima requisição |
| `must_change_password`   | Não interfere, como em Pessoas: promover quem ainda não trocou a senha é permitido; o acesso a Cadastros só abre depois da troca (ADR 012)                                                                                                                                                              |
| Rótulos                  | Botão da linha passa de "Renomear" para **"Editar"** e o título para **"Editar setor"** em todos os setores (o Dialog faz mais que renomear). Os nomes de código (`renameDepartment`, `renameDepartmentSchema`, `updateDepartmentName`) ficam, para não mexer em três camadas só por nome               |

## Tabelas

Sem mudança. Lidas/escritas: `department` (trava da linha), `users` (`role`,
`updated_at` dos membros ativos do setor).

## Tipos — `app/_lib/types/` (`df-architect`, pronto)

### `app/_lib/types/department-admins.ts` (novo)

```ts
export interface DepartmentAdminsEditability extends DepartmentStamps {
  isActive: boolean
}

export interface DepartmentMemberRole {
  id: number
  role: Role
}

export interface DepartmentMember extends DepartmentMemberRole {
  name: string
  email: string
  departmentId: number
}

export interface DepartmentAdminsRequest {
  memberIds: readonly number[]
  adminIds: readonly number[]
}

export type DepartmentAdminsDenialReason = "NOT_EDITABLE" | "MEMBERS_CHANGED"

export interface DepartmentAdminsDenied {
  ok: false
  reason: DepartmentAdminsDenialReason
}

export interface DepartmentAdminsChanges {
  ok: true
  promotedIds: number[]
  demotedIds: number[]
}

export type DepartmentAdminsPlan =
  DepartmentAdminsChanges | DepartmentAdminsDenied
```

`DepartmentListItem` já satisfaz `DepartmentAdminsEditability`.

### `app/_lib/types/department.ts` (acrescido)

```ts
export interface DepartmentAdminsNotEditable {
  status: "admins_not_editable"
}

export interface DepartmentMembersChanged {
  status: "members_changed"
}

export type UpdateDepartmentNameOutcome =
  | DepartmentSaved
  | DepartmentNameTaken
  | DepartmentNotFound
  | DepartmentAdminsNotEditable
  | DepartmentMembersChanged
```

## Domínio — `app/_lib/domain/department-admins.ts` (novo, pronto)

| Export                                        | Semântica                                                                                                                                                                                                                                                                                     |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DEPARTMENT_ADMINS_MAX_MEMBERS`               | `1000`. Teto de sanidade dos arrays no Zod                                                                                                                                                                                                                                                    |
| `DEPARTMENT_ADMINS_DENIAL_MESSAGES`           | `Record<DepartmentAdminsDenialReason, string>` (textos abaixo). Usado pela action                                                                                                                                                                                                             |
| `BOARD_ADMINS_NOTE`, `UNASSIGNED_ADMINS_NOTE` | Notas exibidas no lugar do campo                                                                                                                                                                                                                                                              |
| `canEditDepartmentAdmins(d)`                  | `isActive && !isBoard && !isUnassigned`. A UI decide se mostra o campo; o plano recusa o resto com `NOT_EDITABLE`                                                                                                                                                                             |
| `departmentAdminsNoteFor(d)`                  | `isBoard` → `BOARD_ADMINS_NOTE`; `isUnassigned` → `UNASSIGNED_ADMINS_NOTE`; senão `null` (inclusive inativo)                                                                                                                                                                                  |
| `departmentAdminIdsOf(members)`               | Ids com `role === "admin"`, na ordem recebida. Valor inicial do campo                                                                                                                                                                                                                         |
| `planDepartmentAdmins(d, members, request)`   | `!canEditDepartmentAdmins(d)` → `NOT_EDITABLE`. Conjunto de `members[].id` ≠ conjunto de `request.memberIds` → `MEMBERS_CHANGED`. Senão, para cada membro, papel alvo = `forcedRoleFor(d) ?? (adminIds tem o id ? "admin" : "member")`; devolve só quem muda, em `promotedIds` e `demotedIds` |

Conferido com `tsx`: `{admin 1, member 2}` + `adminIds [2]` → promove 2, rebaixa
1; `memberIds [1]` contra `[1, 2]` → `MEMBERS_CHANGED`; Diretoria →
`NOT_EDITABLE`.

## Validação — `app/_lib/validation/department.ts` (alterado, pronto)

```ts
export const departmentAdminsSchema = z
  .object({ memberIds: departmentMemberIdsSchema, adminIds: departmentMemberIdsSchema })
  .refine(adminIds ⊆ memberIds, { path: ["adminIds"] })

export type DepartmentAdminsInput = z.infer<typeof departmentAdminsSchema>

export const renameDepartmentSchema = z.object({
  id: departmentIdSchema,
  name: departmentNameSchema,
  admins: departmentAdminsSchema.optional(),
})
```

- `departmentMemberIdsSchema` (privado): array de `personIdSchema` (agora
  exportado de `validation/person.ts`), máximo `DEPARTMENT_ADMINS_MAX_MEMBERS`,
  sem repetição. Array inválido, acima do máximo ou com repetição:
  `Lista de pessoas inválida.`; item com id malformado: `Pessoa inválida.`
  (mensagem do próprio `personIdSchema`; só payload forjado chega aqui).
- Marcado fora da lista: `Só pessoas ativas do setor podem ser administradoras.`
  (path `admins.adminIds`).
- `admins` ausente = só renomear, exatamente como hoje. Chamadas atuais seguem
  válidas.
- Com `FormField`, `fieldSchemaOf(renameDepartmentSchema, "admins.adminIds")` dá
  `null` (o `admins` é `ZodOptional`), logo o campo **não** é obrigatório e não
  ganha `*`, sem `required` explícito. Conferido.

## `df-data` — o que mudar (`app/_lib/data/departments.ts`)

```ts
export async function listEditableDepartmentMembers(): Promise<
  DepartmentMember[]
>

export async function updateDepartmentName(
  id: number,
  name: string,
  admins: DepartmentAdminsRequest | null,
): Promise<UpdateDepartmentNameOutcome>
```

**`listEditableDepartmentMembers`** — uma consulta para a página inteira:
`users` com `is_active = true` junto de `department` com `is_active = true`,
`is_board = false`, `is_unassigned = false`. Campos `id`, `name`, `email`,
`role`, `departmentId`. Ordem `lower(users.name)`, `users.id`.

**`updateDepartmentName`** — vira transação:

1. `select is_active, is_board, is_unassigned from department where id = $id for update`.
   Sem linha → `{ status: "not_found" }`.
2. Se `admins !== null`: `select id, role from users where department_id = $id and is_active for update`
   e `planDepartmentAdmins(departmentRow, members, admins)`. Recusa:
   `NOT_EDITABLE` → `{ status: "admins_not_editable" }`;
   `MEMBERS_CHANGED` → `{ status: "members_changed" }`. Nada é gravado.
3. `update department set name, updated_at` (violação de
   `department_name_lower_idx` → `name_taken`, capturada fora da transação como
   hoje).
4. Se o plano tem ids: `update users set role = 'admin', updated_at = now() where id in (promotedIds)`
   e o mesmo com `'member'` para `demotedIds`. Arrays vazios não geram update.
5. `{ status: "saved", id }`.

`admins === null` mantém o comportamento atual (passos 1, 3 e 5).

## `df-actions` — o que mudar (`app/_lib/actions/departments.ts`)

`renameDepartment(input: RenameDepartmentInput): Promise<DepartmentActionResult>`
(mesmo nome, mesma guarda `getDirector`, mesmo `safeParse`):

- chama `updateDepartmentName(id, name, parsed.data.admins ?? null)`;
- `DepartmentErrorCode` ganha `"ADMINS_NOT_EDITABLE"` e `"MEMBERS_CHANGED"`,
  com as mensagens de `DEPARTMENT_ADMINS_DENIAL_MESSAGES`;
- em `members_changed` chama `revalidatePath(DEPARTMENTS_REGISTRY_PATH)` antes
  de devolver a falha, para a lista da página chegar atualizada;
- sucesso: `revalidatePath("/(app)", "layout")` (já é assim; é o mesmo efeito do
  `updatePerson`). Mensagem: `admins` presente → `Setor atualizado.`; ausente →
  `Setor renomeado.` (como hoje).

Nenhuma revogação de sessão, nenhum e-mail (Pessoas também não faz ao trocar
papel).

## `df-ui` — o que mudar

### `app/(app)/registry/departments/page.tsx`

Carrega `listEditableDepartmentMembers()` em paralelo com `listDepartments()` e
passa ao `DepartmentsTable` (`members: DepartmentMember[]`), que repassa a
`DepartmentRowActions` só os do setor da linha
(`members.filter((m) => m.departmentId === department.id)`).

### Dialog de edição

Recomendado separar o modo edição num arquivo próprio,
`app/(app)/registry/departments/_components/department-edit-dialog.tsx`, porque
o `useForm` passa a ter outro schema (`renameDepartmentSchema`) e outra forma de
valores. `department-form-dialog.tsx` fica só com a criação. Decisão final do
`df-ui`.

- Props: `department: Pick<DepartmentListItem, "id" | "name" | "isActive" | "isBoard" | "isUnassigned">`,
  `members: DepartmentMember[]`.
- `useForm<RenameDepartmentInput>` com `zodResolver(renameDepartmentSchema)` e
  `FormSchemaProvider schema={renameDepartmentSchema}`.
- `defaultValues` (e `form.reset` ao abrir, com as props do momento):
  `{ id, name, admins: canEditDepartmentAdmins(department) ? { memberIds: members.map((m) => m.id), adminIds: departmentAdminIdsOf(members) } : undefined }`.
- Campo **Administradores**: `FormField name="admins.adminIds" labelMode="group"`.
  Lista de `Checkbox` (primitivo já existente em `app/_components/ui/checkbox.tsx`),
  uma linha por membro, rótulo = nome e, abaixo em texto menor, o e-mail.
  Rolagem própria quando passar de uns oito itens. Não há multi-seleção pronta
  no projeto; `ToggleGroup type="multiple"` (usado em Empresas, dias) não serve
  para nomes longos. Componente local da rota:
  `app/(app)/registry/departments/_components/department-admins-field.tsx`.
- `canEditDepartmentAdmins` falso: sem campo; `departmentAdminsNoteFor` não nulo
  → nota em texto de apoio no lugar do campo.
- Envio: os valores do form (com `admins` ou sem) vão direto para
  `renameDepartment`.
- Resultado: `NAME_TAKEN` → erro no campo nome (como hoje); `INVALID_INPUT` →
  erro no nome (como hoje); `MEMBERS_CHANGED` → `toast.error` e fecha o Dialog;
  demais → `toast.error`.

### Textos

| Onde                                      | Texto                                                                                                                                            |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Botão da linha                            | `Editar` (`aria-label` `Editar {nome}`)                                                                                                          |
| Título                                    | `Editar setor`                                                                                                                                   |
| Descrição                                 | `O nome aparece para todas as pessoas do setor.`                                                                                                 |
| Rótulo do campo                           | `Administradores`                                                                                                                                |
| Descrição do campo                        | `Marque quem administra o setor. Quem ficar desmarcado continua no setor como membro.`                                                           |
| Lista vazia                               | `Nenhuma pessoa ativa neste setor.`                                                                                                              |
| Aviso com zero marcados (lista não vazia) | `Sem administrador, só a Diretoria gerencia as pessoas e as tags deste setor e distribui os chamados dele.`                                      |
| Nota Diretoria                            | `BOARD_ADMINS_NOTE` — `Na Diretoria todas as pessoas são sempre administradoras.`                                                                |
| Nota Não alocado                          | `UNASSIGNED_ADMINS_NOTE` — `Quem está em Não alocado não administra nenhum setor. Para mudar o papel, realoque a pessoa em Cadastros → Pessoas.` |
| Botão salvar                              | `Salvar alterações` / `Salvando…`                                                                                                                |
| Toast de sucesso                          | `Setor atualizado.` (com campo) / `Setor renomeado.` (sem campo)                                                                                 |
| `MEMBERS_CHANGED`                         | `As pessoas deste setor mudaram enquanto você editava. A lista foi atualizada: abra a edição de novo e confira os administradores.`              |
| `ADMINS_NOT_EDITABLE`                     | `Os administradores deste setor não podem ser alterados por aqui.`                                                                               |

## Riscos

1. **Setor sem admin.** Permitido. Sem admin, as pessoas e as tags do setor só
   são geridas pela Diretoria, e "enviar"/resolver chamado do setor como
   despachante fica só com a Diretoria e com o próprio responsável
   (`isTicketDispatcher`, `isTicketResolver`). O aviso no campo deixa isso
   visível; nada bloqueia.
2. **Papel trocado em Pessoas no meio.** Se outro diretor muda o papel de um
   membro em Pessoas enquanto este Dialog está aberto, salvar aqui sobrescreve
   com o que estava marcado (último a salvar ganha). A lista de membros é
   conferida; o papel de cada um, não. Aceito: só diretores fazem as duas coisas.
3. **Deadlock raro.** A transação trava `department` e depois os `users`
   ativos do setor (`for update`). O ciclo só fecha com
   `updatePersonActive(id, true)` sobre alguém que já está ativo neste setor:
   ela trava a linha da pessoa e depois o setor (`for share`,
   `app/_lib/data/people.ts:291-296`). Reativar pessoa inativa não conflita (o
   `for update` daqui filtra `is_active`), e mover alguém para o setor também
   não (a pessoa segue no setor antigo até o commit). O Postgres aborta uma das
   duas; a daqui cai na mensagem genérica e repetir resolve. Aceito.
4. **Página mais pesada.** Uma consulta a mais, com todos os membros ativos dos
   setores editáveis. Volume de empresa; aceito.

## Cenários para o `df-qa`

| #   | Cenário                                                                     | Esperado                                                                                                     |
| --- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| A1  | Diretor abre "Novo setor"                                                   | Só o campo nome; nenhum "Administradores"                                                                    |
| A2  | Diretor abre "Editar" de setor ativo comum com membros                      | Campo "Administradores" com os membros ativos, admins já marcados; inativos não aparecem                     |
| A3  | Marca um membro e desmarca um admin, salva                                  | Toast `Setor atualizado.`; em Pessoas os papéis trocaram; no banco `role` e `updated_at` mudaram só nos dois |
| A4  | Renomeia e troca papel ao mesmo tempo                                       | Os dois gravam                                                                                               |
| A5  | Nome duplicado + troca de papel                                             | Erro no nome; **nenhum** papel muda no banco                                                                 |
| A6  | Desmarca todos e salva                                                      | Aviso de "sem administrador" aparece antes de salvar; grava com zero admins                                  |
| A7  | Editar a Diretoria                                                          | Sem campo; nota da Diretoria                                                                                 |
| A8  | Editar o Não alocado                                                        | Sem campo; nota do Não alocado                                                                               |
| A9  | Editar setor inativo                                                        | Sem campo, sem nota; renomear funciona                                                                       |
| A10 | Setor ativo sem ninguém                                                     | `Nenhuma pessoa ativa neste setor.`; salvar renomeia                                                         |
| A11 | Abrir o Dialog; em outra aba desativar (ou mover) um membro listado; salvar | `MEMBERS_CHANGED`, Dialog fecha, nada grava (nem o nome); reabrir mostra a lista nova                        |
| A12 | Abrir o Dialog; em outra aba mover alguém **para** o setor; salvar          | `MEMBERS_CHANGED`, como A11                                                                                  |
| A13 | Rebaixar um admin de setor logado em outra sessão                           | Na próxima navegação dele, "Cadastros" some, sem novo login                                                  |
| A14 | Promover um membro logado em outra sessão                                   | Na próxima navegação dele, "Cadastros" aparece (Pessoas e Tags)                                              |
| A15 | Admin de setor ou membro abre `/registry/departments`                       | 404                                                                                                          |
| A16 | Admin de setor chama `renameDepartment` forjado com `admins`                | `FORBIDDEN`; nada muda                                                                                       |
| A17 | Diretor forja `admins` para a Diretoria ou o Não alocado                    | `ADMINS_NOT_EDITABLE`; nada muda                                                                             |
| A18 | Diretor forja `adminIds` com id fora de `memberIds`                         | `INVALID_INPUT` com `Só pessoas ativas do setor podem ser administradoras.`                                  |
| A19 | Campo sem `*` ao abrir e com zero marcados                                  | Nenhum asterisco no "Administradores"                                                                        |

## Andamento

Concluído em 2026-11-10. `df-reviewer`: APROVADO COM ATENÇÕES (as três
atenções já aplicadas). `df-qa`: 10 de 19 passaram, 0 falhas, 9 não executados
— relatório
[`docs/test-reports/2026-11-10-department-admins-shortcut.md`](../test-reports/2026-11-10-department-admins-shortcut.md).
Não executados por restrição de escrita/forja e falta de contas QA: A11–A14,
A16–A18 e partes de A9/A10. Ficam abertos abaixo para o `df-debug`.

## Checklist

- [x] Tipos, domínio e Zod (`df-architect`); `tsc` e lint verdes
- [x] `listEditableDepartmentMembers` e `updateDepartmentName(id, name, admins)` transacional (`df-data`)
- [x] `renameDepartment` com `admins`, códigos e mensagens novas, revalidação em `members_changed` (`df-actions`)
- [x] Página carrega membros; Dialog de edição com `renameDepartmentSchema`, campo de checkboxes, notas e textos; botão "Editar" (`df-ui`)
- [x] Nome + papéis atômicos (A5) conferidos no banco (`df-qa`, 2026-11-10)
- [ ] Corrida `MEMBERS_CHANGED` (A11, A12) conferida no banco (`df-debug`)
- [ ] Menu Cadastros acompanha promoção e rebaixamento sem novo login (A13, A14) (`df-debug`)
- [ ] Payloads forjados: `FORBIDDEN` (A16), `ADMINS_NOT_EDITABLE` (A17), `INVALID_INPUT` (A18) (`df-debug`)
- [ ] Foco no primeiro checkbox quando o grupo "Administradores" tem erro (`df-debug`)
