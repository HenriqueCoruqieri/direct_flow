# Contrato — `FormField` genérico

Refatoração dos formulários da área logada para um campo único, que liga ao
React Hook Form por dentro e deriva o "obrigatório" do schema Zod do
formulário. Fora do escopo: telas de `app/(auth)/**` (dono `df-auth`).

Versões observadas: `zod@4.6.5`, `react-hook-form@7.88`, `next@16.3.5`.

## Etapas

| Etapa | Escopo                                                                                                   | Estado                                                                                                                                |
| ----- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Helpers puros (`df-architect`), `FormField` + `FormSchemaProvider` (`df-ui`), Dialog de Empresas migrado | concluída em 2026-11-10 ([relatório](../test-reports/2026-11-10-form-field-etapa-1.md))                                               |
| 2     | Setores, Pessoas, Tags e Perfil (trocar senha) migrados. **Pausa** depois dela                           | concluída em 2026-11-10 ([relatório](../test-reports/2026-11-10-form-field-etapa-2.md))                                               |
| 3a    | Abertura do chamado, Enviar, Enviar para setor, Recusar, Resolver, Comentar, Editar comentário           | concluída em 2026-11-10 ([relatório](../test-reports/2026-11-10-form-field-etapa-3a.md)); H8 aberto para o `df-debug`                 |
| 3b    | Edição do chamado (`ticket-edit-*`, `ticket-edit-provider`, `use-ticket-edit`)                           | concluída em 2026-11-10 ([relatório](../test-reports/2026-11-10-form-field-etapa-3b.md)); J8, J12–J14 e J20 abertos para o `df-debug` |

**Refatoração concluída em 2026-11-10** (Etapas 1, 2, 3a e 3b). Pendências em
aberto só para o `df-debug`: H8 (3a) e J8, J12–J14, J20 (3b).

## Decisões fixadas pelo usuário

| Tema           | Decisão                                                                                                                                                                                 |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Componente     | `FormField` em `app/_components/form-field.tsx` (`df-ui`), usado por todo formulário da área logada                                                                                     |
| Ligação RHF    | Por dentro: `useController` (equivalente ao `Controller`) sobre o `useFormContext`. Todo formulário envolve o conteúdo no provider (abaixo), que inclui o `FormProvider` do RHF         |
| Obrigatório    | **Derivado do schema Zod** do formulário, entregue uma vez ao provider. `required?: boolean` só como override (regra entre campos, schema sem `shape`)                                  |
| Asterisco      | `*` vermelho (`text-destructive`, `aria-hidden="true"`) em campo obrigatório desde a abertura; **some** quando o valor atual é válido pelo schema do campo e **volta** se deixar de ser |
| Erro           | Só depois de tentar salvar (`fieldState.error` do RHF, modo padrão `onSubmit` e revalidação `onChange`), como hoje                                                                      |
| Legenda        | **Nenhum** formulário mostra "Campos com \* são obrigatórios." — Empresas inclusive perde a sua                                                                                         |
| Máscara        | Fora do `FormField`. `MaskedInput` continua genérico e entra pelo `children`                                                                                                            |
| Acessibilidade | `FormField` gera os ids e entrega `aria-required`, `aria-invalid` e `aria-describedby` ao controle                                                                                      |

## Helpers puros — `app/_lib/validation/form-field.ts` (`df-architect`, Etapa 1, pronto)

Sem React, sem I/O, sem `as`. Rodam no cliente e no servidor.

```ts
export type FormSchema = z.core.$ZodType
export type FieldSchema = z.core.$ZodType

export const fieldSchemaOf: (
  schema: FormSchema,
  name: string,
) => FieldSchema | null

export const isFieldValueValid: (
  fieldSchema: FieldSchema,
  value: unknown,
) => boolean

export const isFieldRequired: (fieldSchema: FieldSchema) => boolean

export const isFieldValueFilled: (value: unknown) => boolean

export const resolveFieldRequired: (
  fieldSchema: FieldSchema | null,
  required: boolean | undefined,
) => boolean

export const shouldShowRequiredMark: (
  fieldSchema: FieldSchema | null,
  value: unknown,
  required: boolean | undefined,
) => boolean
```

| Função                   | Semântica                                                                                                                                                                                                                                                                                    |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fieldSchemaOf`          | Caminho do RHF (`"cnpj"`, `"address.city"`) separado por `.`; desce por `ZodObject` (`instanceof z.ZodObject` + `Object.hasOwn(shape, segmento)`). Devolve o schema do campo ou `null` se o topo (ou um nível) não é `ZodObject` ou o campo não existe. Índice de array (`items.0`) → `null` |
| `isFieldValueValid`      | `z.safeParse(fieldSchema, value).success`. Roda o schema **do campo** (com transform e superRefine dele), não o refinamento do objeto                                                                                                                                                        |
| `isFieldRequired`        | `true` se o schema do campo recusa **`""`, `undefined` e `null`**. Aceitar qualquer um dos três = opcional (`.optional()`, `.nullable()`, `.nullish()`, `.default()`, `.catch()`, texto sem `min(1)`)                                                                                        |
| `isFieldValueFilled`     | `false` para `undefined`, `null`, `""` e array vazio; `true` para o resto (`0`, `false`, texto com espaço)                                                                                                                                                                                   |
| `resolveFieldRequired`   | `required` informado ganha; senão `isFieldRequired(fieldSchema)`; sem schema de campo → `false`                                                                                                                                                                                              |
| `shouldShowRequiredMark` | `false` se não é obrigatório (`resolveFieldRequired`). Se é: `true` com valor não preenchido; preenchido → `!isFieldValueValid(fieldSchema, value)`; sem schema de campo, preenchido basta. Assim o override `required` com um schema de campo opcional ainda pede valor                     |

O `null` entra em `isFieldRequired` (decisão do `df-architect`, além do pedido
`""`/`undefined`): `updateTagSchema.priority` é `.nullable()` sem default e
`null` quer dizer "Sem prioridade". Só com `""` e `undefined` ele sairia
obrigatório e ganharia `*` indevido.

### Que formas de schema expõem `shape` (Zod 4.6.5, conferido)

| Topo do schema do formulário                                      | `fieldSchemaOf` | Por quê                                                      |
| ----------------------------------------------------------------- | --------------- | ------------------------------------------------------------ |
| `z.object({...})`                                                 | campo           |                                                              |
| `z.object(...).refine(...)` / `.superRefine(...)` (com `when`)    | campo           | `refine`/`superRefine` devolvem `this` (o mesmo `ZodObject`) |
| `.extend`, `.pick`, `.omit`, `.partial`, `.required`, `.strict`   | campo           | devolvem `ZodObject`                                         |
| objeto aninhado (`a.b`)                                           | campo           | a função desce nível a nível                                 |
| `z.object(...).transform(...)`                                    | `null`          | vira `ZodPipe`                                               |
| `z.preprocess(fn, z.object(...))`                                 | `null`          | vira `ZodPipe`                                               |
| `.pipe(...)`, `z.union`, `z.discriminatedUnion`, `z.intersection` | `null`          | não são `ZodObject`                                          |
| campo inexistente no `shape` / índice de array                    | `null`          |                                                              |

Com `null` o campo só é obrigatório pelo `required` explícito, e o `*` some
quando o valor está preenchido. Hoje **nenhum** schema de formulário da área
logada tem pipe no topo: `createCompanySchema` (superRefine),
`changePasswordSchema` (dois `refine`), `createDepartmentSchema`,
`createPersonSchema`, `updatePersonSchema`, `createTagSchema`,
`updateTagSchema` são todos `ZodObject`.

Refinamento **assíncrono** no schema de um campo faz `z.safeParse` lançar
(`safeParseAsync` seria exigido). Nenhum schema do projeto tem. Quem criar um
campo assíncrono não o usa com `FormField` sem `required` explícito e revisão
deste contrato.

### Resultado conferido (tsx, 2026-11-10)

| Schema                   | Obrigatórios derivados                                                                                                                                                                                     | Opcionais derivados                                                            |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `createCompanySchema`    | `cnpj`, `legalName`, `tradeName`, `email`, `primaryPhone`, `cep`, `state`, `street`, `number`, `district`, `city`, `managerName`, `managerPhone` — idêntico ao antigo `COMPANY_REQUIRED_FIELDS` (removido) | `secondaryPhone`, `complement`, `businessDays`, `opensAt`, `closesAt`, `notes` |
| `changePasswordSchema`   | `currentPassword`, `newPassword`, `confirmPassword`                                                                                                                                                        | —                                                                              |
| `createDepartmentSchema` | `name`                                                                                                                                                                                                     | —                                                                              |
| `createPersonSchema`     | `name`, `email`, `departmentId`                                                                                                                                                                            | `role`                                                                         |
| `createTagSchema`        | `departmentId`, `name`                                                                                                                                                                                     | `priority`                                                                     |
| `updateTagSchema`        | `name`                                                                                                                                                                                                     | `priority` (graças ao `null`)                                                  |

CNPJ: `11.222.333/0001-81` válido, `11.222.333/0001-82` (DV errado) inválido,
`12.ABC.345/01DE-35` válido; `shouldShowRequiredMark` dá `true` para `""` e DV
errado e `false` para o válido. UF: `undefined` → `*`, `"SP"` → sem `*`.

## `df-ui` — o que criar

### `app/_hooks/use-form-schema.ts`

```ts
export const FormSchemaContext: React.Context<FormSchema | null>
export const useFormSchema: () => FormSchema
```

- `FormSchemaContext = createContext<FormSchema | null>(null)`.
- `useFormSchema()` lê o contexto; `null` → `throw new Error(...)` (erro de
  programação: `FormField` fora do provider). Tipo `FormSchema` importado
  (`import type`) de `@/app/_lib/validation/form-field`; o hook não importa
  `zod`.

### `app/_components/form-schema-provider.tsx` (`"use client"`)

```ts
interface FormSchemaProviderProps<
  TFieldValues extends FieldValues,
  TContext,
  TTransformedValues,
> {
  form: UseFormReturn<TFieldValues, TContext, TTransformedValues>
  schema: FormSchema
  children: React.ReactNode
}

const FormSchemaProvider = <
  TFieldValues extends FieldValues,
  TContext,
  TTransformedValues,
>(
  props: FormSchemaProviderProps<TFieldValues, TContext, TTransformedValues>,
) => …
export default FormSchemaProvider
```

- Renderiza `<FormProvider {...form}><FormSchemaContext value={schema}>{children}</FormSchemaContext></FormProvider>`.
- **Substitui** o `FormProvider` do RHF nos formulários migrados (não usar os
  dois).
- O `schema` é o **mesmo** passado ao `zodResolver` do formulário — uma fonte
  só. Ex.: `<FormSchemaProvider form={form} schema={createCompanySchema}>`.

### `app/_components/form-field.tsx` (`"use client"`)

```ts
export interface FormFieldA11yProps {
  id: string
  "aria-invalid": boolean
  "aria-describedby": string | undefined
  "aria-required": true | undefined
  "aria-labelledby": string | undefined
}

export interface FormFieldControlProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> extends ControllerRenderProps<TFieldValues, TName>, FormFieldA11yProps {}

interface FormFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
  TTransformedValues,
> {
  name: TName
  label: React.ReactNode
  control?: Control<TFieldValues, unknown, TTransformedValues>
  required?: boolean
  description?: React.ReactNode
  labelMode?: "for" | "group"
  hideLabel?: boolean
  id?: string
  className?: string
  shouldUnregister?: boolean
  defaultValue?: FieldPathValue<TFieldValues, TName>
  children: (
    field: FormFieldControlProps<TFieldValues, TName>,
    fieldState: ControllerFieldState,
  ) => React.ReactNode
}

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TTransformedValues = TFieldValues,
>(
  props: FormFieldProps<TFieldValues, TName, TTransformedValues>,
) => …
export default FormField
```

`FieldValues`, `FieldPath`, `Control`, `ControllerRenderProps`,
`ControllerFieldState` vêm de `react-hook-form`. `TTransformedValues` existe porque os
formulários usam `useForm<Input, unknown, Output>` (Empresas, Tags): sem ele,
`form.control` não casa com `Control<TFieldValues>`. Se o `unknown` do
`TContext` não fechar com o `useForm` de algum formulário, o `df-ui` usa o
genérico `TContext` em vez de inventar cast e reporta.

Comportamento:

1. `const { field, fieldState } = useController({ name, control, shouldUnregister, defaultValue })`,
   seguido de `const value = useWatch({ control, name, defaultValue, exact: true })` — sem
   `control`, o RHF usa o `useFormContext`. `control` existe **só para
   inferência de tipo** (`<FormField control={form.control} name="cnpj">` tipa
   `field.value` como `string`); passe quando o `children` precisa do valor
   tipado (`MaskedInput`, `Select`).
2. `const schema = useFormSchema()`;
   `const fieldSchema = fieldSchemaOf(schema, name)`;
   `const isRequired = resolveFieldRequired(fieldSchema, props.required)`;
   `const showMark = shouldShowRequiredMark(fieldSchema, value, props.required)`.
   O valor usado no `*` e entregue ao `children` é o `value` do `useWatch`
   sem fallback para o default do formulário (seção "Etapa 3b — mudança no
   `FormField`"), não o `field.value`.
3. Ids: `const baseId = useId()`; `id = props.id ?? \`${baseId}-control\``;
   `errorId = \`${id}-error\``; `descriptionId = \`${id}-description\``;
   `labelId = \`${id}-label\``.
4. `invalid = fieldState.error !== undefined`.
5. Marcação:

   ```tsx
   <Field data-invalid={invalid} className={cn("gap-1.5", className)}>
     {labelMode === "group" ? (
       <FieldTitle id={labelId} className="gap-0.5">
         {label}
         {mark}
       </FieldTitle>
     ) : (
       <FieldLabel htmlFor={id} className="gap-0.5">
         {label}
         {mark}
       </FieldLabel>
     )}
     {children({ ...field, value, ...a11y }, fieldState)}
     {invalid ? (
       <FieldError id={errorId} errors={[fieldState.error]} />
     ) : description ? (
       <FieldDescription id={descriptionId}>{description}</FieldDescription>
     ) : null}
   </Field>
   ```

   `mark` = `showMark ? <span aria-hidden="true" className="text-destructive">*</span> : null`.

6. `a11y`:

   | Prop               | Valor                                                                               |
   | ------------------ | ----------------------------------------------------------------------------------- |
   | `aria-invalid`     | `invalid`                                                                           |
   | `aria-describedby` | inválido → `errorId`; senão, com `description` → `descriptionId`; senão `undefined` |
   | `aria-required`    | `isRequired && labelMode !== "group" ? true : undefined` (fixo, não segue o `*`)    |
   | `aria-labelledby`  | `labelMode === "group"` → `labelId`; senão `undefined`                              |

7. `labelMode="group"` é para controle sem um único elemento rotulável
   (`ToggleGroup` dos dias): o rótulo vira `FieldTitle` e o controle recebe
   `aria-labelledby`. O `ref` do campo vai para o primeiro item (como hoje),
   para o foco no erro. Nesse modo o `FormField` **não** emite `aria-required`:
   o `ToggleGroup` do Radix renderiza `role="toolbar"`, e `aria-required`
   não é permitido nesse papel (ARIA 1.2).
8. O `ref` do `field` **tem** de chegar ao elemento focável: é o que faz o
   `shouldFocusError` do RHF focar o primeiro campo com erro ao salvar.
9. Componente puro de apresentação + RHF: não importa `zod`, `app/_lib/data`,
   `app/_lib/auth` nem `app/_lib/actions`.

Uso:

```tsx
<FormSchemaProvider form={form} schema={createCompanySchema}>
  <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
    <FormField
      control={form.control}
      name="cnpj"
      label="CNPJ"
      className="sm:col-span-2"
    >
      {(field) => (
        <MaskedInput
          {...field}
          clean={cleanCnpj}
          format={formatCnpj}
          placeholder={CNPJ_PLACEHOLDER}
        />
      )}
    </FormField>
    <FormField name="legalName" label="Razão social">
      {(field) => <Input {...field} autoComplete="off" />}
    </FormField>
  </form>
</FormSchemaProvider>
```

`MaskedInput` aceita `{...field}` direto: `value: string` e
`onChange(value: string)` casam com `field.value`/`field.onChange`, e o `ref`
segue pelo `Input`. Campos com valor possivelmente `null`/`undefined` no
formulário (`opensAt`, `state`) continuam com o ajuste no `children`
(`value={field.value ?? ""}`).

## Etapa 1 — Empresas (`df-ui`)

`app/(app)/registry/companies/_components/company-form-dialog.tsx`:

- `FormProvider` → `FormSchemaProvider form={form} schema={createCompanySchema}`.
- Todo `Controller` + `CompanyFormField` → `FormField`. `businessDays` também,
  com `labelMode="group"` (sai o `FieldTitle`/`daysLabelId`/`daysErrorId`
  feitos à mão).
- **Nenhum** `required` explícito: os 13 obrigatórios vêm do schema (tabela
  acima) e o Expediente sai sem `*`.
- Sai o subtítulo: remover o `DialogDescription` com
  `COMPANY_REQUIRED_FIELDS_HINT` e passar `aria-describedby={undefined}` ao
  `DialogContent` (sem descrição, o Radix avisa no console se isso faltar).
- Apagar `company-form-field.tsx` e `company-required-mark.tsx`.
- Layout, larguras, placeholders, máscaras, `form.reset` ao abrir e
  `CNPJ_TAKEN` com `shouldFocus` ficam como estão
  (`docs/contracts/registry-companies.md`).

### Limpeza do `df-architect` ao fim da Etapa 1

Feita depois da entrega do `df-ui`, sem mais uso no projeto. **Removidos**:

- `COMPANY_REQUIRED_FIELDS`, `CompanyRequiredField` e
  `isCompanyRequiredFieldValid` de `app/_lib/validation/company.ts`
- `COMPANY_REQUIRED_FIELDS_HINT` de `app/_lib/domain/company.ts`

## Etapa 2 — Setores, Pessoas, Tags e Perfil (`df-ui`)

| Formulário                                                    | Schema no provider       | `required` explícito | `*` esperado                                        |
| ------------------------------------------------------------- | ------------------------ | -------------------- | --------------------------------------------------- |
| `registry/departments/_components/department-form-dialog.tsx` | `createDepartmentSchema` | —                    | Nome do setor                                       |
| `registry/people/_components/person-form-dialog.tsx`          | `createPersonSchema`     | —                    | Nome, E-mail, Setor (só Diretor); Papel sem `*`     |
| `registry/tags/_components/tag-form-dialog.tsx`               | `createTagSchema`        | —                    | Setor (só Diretor), Nome da tag; Prioridade sem `*` |
| `profile/_components/change-password-form.tsx`                | `changePasswordSchema`   | —                    | Senha atual, Nova senha, Confirmar nova senha       |

- O `FieldDescription` de Setores ("Nomes iguais não são aceitos…") vai pela
  prop `description`.
- `confirmPassword`: o `*` some quando há qualquer texto (o schema do campo é
  só `min(1)`); "as senhas não conferem" é refinamento do objeto e aparece só
  ao salvar, como erro. Esperado, não é falha.
- Para o Administrador de setor, "Nova pessoa" mostra só Nome e E-mail (Setor e
  Papel ficam fixos e não aparecem) e "Nova tag" não mostra Setor (fixo no
  setor dele). O `*` em Setor vale só para o Diretor.
- Se o schema do provider de algum formulário for diferente do do
  `zodResolver`, o `df-ui` para e reporta.

## Etapa 3a — abertura e diálogos do detalhe (`df-ui`)

Fora: edição do chamado (Etapa 3b). Os helpers **não mudam**.

### Schemas conferidos (tsx, 2026-11-10)

Todos são `ZodObject` no topo (os dois com `.refine` também), iguais ao do
`zodResolver` de cada formulário. Campos ocultos (`ticketId`,
`expected*`, `transferId`, `messageId`) não viram `FormField`.

| Formulário (arquivo)                                     | Schema no provider             | Obrigatórios derivados                                           | Opcionais derivados          |
| -------------------------------------------------------- | ------------------------------ | ---------------------------------------------------------------- | ---------------------------- |
| `(app)/_components/new-ticket-dialog.tsx`                | `createTicketSchema`           | `companyId`, `title`, `description`, `type`, `tagId`, `priority` | `assigneeId`, `attachments`  |
| `tickets/[id]/_components/send-ticket-dialog.tsx`        | `sendTicketSchema`             | `assigneeId`, `comment`                                          | —                            |
| `tickets/[id]/_components/send-to-department-dialog.tsx` | `sendTicketToDepartmentSchema` | `toDepartmentId`, `comment`                                      | `assigneeId` (`null` = fila) |
| `tickets/[id]/_components/decline-transfer-dialog.tsx`   | `declineTicketTransferSchema`  | `reason`                                                         | —                            |
| `tickets/[id]/_components/resolve-ticket-form.tsx`       | `resolveTicketSchema`          | `solution`                                                       | —                            |
| `tickets/[id]/_components/ticket-comment-form.tsx`       | `createTicketCommentSchema`    | `content` (`isPrivate` sai "obrigatório", mas fica fora, abaixo) | —                            |
| `tickets/[id]/_components/ticket-comment-editor.tsx`     | `editTicketCommentSchema`      | `content`                                                        | —                            |

Conferido campo a campo com `shouldShowRequiredMark`: Título `""`/`"ab"`/`"   "`
→ `*`, `"abcde"` → sem; Descrição e Solução com menos de 10 caracteres → `*`;
Tipo `undefined`/valor fora do enum → `*`; Prioridade `undefined` → `*`,
`"alta"` → sem (o schema do campo é o `optional().pipe(enum)`, avaliado
inteiro); `tagId`/`companyId` `undefined`, `0` ou acima do int do Postgres →
`*`; `assigneeId` `null` → sem `*` na abertura e no envio para setor, `undefined`
→ `*` no Enviar; comentários/motivo `""` e só espaço → `*`, acima de 5000 → `*`.

### Decisões por campo

**Abertura (`createTicketSchema`)** — `FormSchemaProvider` substitui o `<form>`
solto; todo campo com `control={form.control}`.

| Campo        | `FormField`                                        | `required` explícito    | Observação                                                                                                                                                                                                                      |
| ------------ | -------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Empresa      | sim, `TicketCompanyAutocomplete`                   | —                       | `*` some ao escolher; texto digitado sem escolha não preenche o valor, `*` fica (T17)                                                                                                                                           |
| Título       | sim, `Input autoComplete="off"`                    | —                       |                                                                                                                                                                                                                                 |
| Descrição    | sim, `TicketDescriptionTextarea`                   | —                       |                                                                                                                                                                                                                                 |
| Anexos       | **não** — continua `Controller`                    | —                       | opcional (sem `*`); `AttachmentUploader` tem layout próprio (título + limites + botão na mesma linha, `role="group"`) e já liga `ref` ao botão do seletor. Fica dentro do provider; nada muda nele                              |
| Tipo         | sim, `TicketTypeSelect`                            | —                       |                                                                                                                                                                                                                                 |
| Prioridade   | sim, `TicketPrioritySelect`                        | `priorityLock === null` | com a tag que fixa prioridade: sem `*` e sem `aria-required` (o valor travado já é setado no form por `ticketPriorityOnTagChange`). Sem trava: obrigatório. O aviso vermelho `Defina uma prioridade` **sai**: o `*` o substitui |
| Tags         | sim, `TicketTagCombobox`, `description={TAG_HINT}` | —                       | o `onChange` composto (setValue da prioridade + `field.onChange`) fica no `children`, como hoje                                                                                                                                 |
| Criador      | **não** — `Field` + `Input readOnly` como hoje     | —                       | não é campo do formulário                                                                                                                                                                                                       |
| Destinatário | sim, `TicketAssigneeCombobox`                      | —                       | opcional (`null` = fila do setor); sem `*`                                                                                                                                                                                      |

**Diálogos do detalhe**

| Formulário        | Campo            | Controle                                                               | `required` | Observação                                                                                                                                                 |
| ----------------- | ---------------- | ---------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Enviar            | Destinatário     | `TicketAssigneeCombobox`, `description={describeCurrentAssignee(...)}` | —          | `*` até escolher; "diferente do atual" é `refine` do objeto, só ao salvar                                                                                  |
| Enviar            | Comentário       | `HandoffCommentTextarea`                                               | —          | rótulo `HANDOFF_COMMENT_LABEL`                                                                                                                             |
| Enviar para setor | Setor de destino | `Combobox` direto (opções de setor), rótulo `TRANSFER_TARGET_LABEL`    | —          | `changeTarget` continua no `children`; "setor diferente do atual" é `refine` do objeto                                                                     |
| Enviar para setor | Destinatário     | `TicketAssigneeCombobox` com `queueLabel`                              | —          | opcional; montado só com setor escolhido, como hoje                                                                                                        |
| Enviar para setor | Comentário       | `HandoffCommentTextarea`                                               | —          |                                                                                                                                                            |
| Recusar           | Motivo           | `Textarea` (placeholder, `rows={4}`, `max-h-60 min-h-24`)              | —          | `isReasonIssue` pode continuar lendo `declineTicketTransferSchema.shape.reason`                                                                            |
| Resolver          | Solução          | `TicketSolutionTextarea`                                               | —          | form com `id` e botão fora dele (`form={formId}`): o provider envolve o `<form>`, não muda nada no botão                                                   |
| Comentar          | Comentário       | `Textarea` (`rows={3}`, `max-h-48 min-h-20`)                           | —          | `*` com a caixa vazia (aparece também depois do reset de sucesso)                                                                                          |
| Comentar          | Privado          | **não** — continua `Controller` + `Checkbox`                           | —          | `z.boolean` recusa os três vazios e sairia `aria-required` num checkbox, o que diria "precisa marcar". Layout horizontal com rótulo depois também não cabe |
| Editar comentário | Comentário       | `Textarea`, rótulo oculto                                              | —          | abre preenchido (sem `*`); apagar tudo traz o `*`, que fica oculto junto com o rótulo (abaixo)                                                             |

**Rótulo oculto.** O editor de comentário (e, na 3b, a descrição da edição) usa
rótulo `sr-only`. O `FormField` ganha `hideLabel?: boolean`, que aplica
`sr-only` ao `FieldLabel`/`FieldTitle` inteiro (rótulo **e** `*`); o
`aria-required` continua. Não passar `<span className="sr-only">` no `label`:
o `*` ficaria visível sozinho.

### Peças compartilhadas com a edição — estratégia

Opção escolhida (menor risco **e** sem duplicar regra): **a peça de campo vira
só o controle; o `FormField` fica no formulário.** Os invólucros atuais
(`ticket-*-field.tsx`) continuam existindo **só para a edição**, com a
**mesma API de props e o mesmo DOM**, montados por dentro sobre o controle
novo. A edição não muda de linha nenhuma em 3a; na 3b ela passa ao
`FormField` e os invólucros são apagados.

Por que não "a edição continua com a versão atual intacta": a abertura teria
de reescrever a lógica que hoje mora dentro das peças (conversão do valor do
`Select` para o enum, trava da prioridade com toast, mapeamento fila/pessoa do
destinatário, opções da empresa) — a mesma regra em dois lugares até a 3b.

Controles novos (`"use client"` quando preciso; recebem o que o `children` do
`FormField` entrega — `FormFieldControlProps` — e repassam `id`, `ref`,
`aria-*` ao elemento focável):

| Controle novo                                           | Origem (lógica movida de)      | Usado na 3a por                     | Invólucro mantido para a edição                                     |
| ------------------------------------------------------- | ------------------------------ | ----------------------------------- | ------------------------------------------------------------------- |
| `(app)/_components/ticket-company-autocomplete.tsx`     | `ticket-company-field.tsx`     | abertura                            | `ticket-company-field.tsx`                                          |
| `(app)/_components/ticket-description-textarea.tsx`     | `ticket-description-field.tsx` | abertura                            | `ticket-description-field.tsx`                                      |
| `(app)/_components/ticket-type-select.tsx`              | `ticket-type-field.tsx`        | abertura                            | `ticket-type-field.tsx`                                             |
| `(app)/_components/ticket-priority-select.tsx`          | `ticket-priority-field.tsx`    | abertura                            | nenhum — **apagar** `ticket-priority-field.tsx` (só a abertura usa) |
| `(app)/_components/ticket-tag-combobox.tsx`             | `ticket-tag-field.tsx`         | abertura                            | `ticket-tag-field.tsx`                                              |
| `(app)/_components/ticket-assignee-combobox.tsx`        | `ticket-assignee-field.tsx`    | abertura, Enviar, Enviar para setor | `ticket-assignee-field.tsx`                                         |
| `(app)/_components/handoff-comment-textarea.tsx`        | `handoff-comment-field.tsx`    | Enviar, Enviar para setor           | `handoff-comment-field.tsx`                                         |
| `tickets/[id]/_components/ticket-solution-textarea.tsx` | `ticket-solution-field.tsx`    | Resolver                            | `ticket-solution-field.tsx`                                         |

- Título não ganha controle: é `Input autoComplete="off"`, sem regra.
- **`ComboboxField` é apagado na 3a** (resolve a atenção do `df-reviewer` da
  Etapa 2). Seus últimos usos são Enviar para setor (vira `FormField` +
  `Combobox`) e os invólucros `ticket-tag-field`/`ticket-assignee-field`, que
  passam a montar `Field` + `FieldLabel htmlFor` + controle + `FieldError`/
  `FieldDescription` com o **mesmo** markup, classes e ids que o
  `ComboboxField` gerava (`${id}-error`, `${id}-hint`, `gap-1.5`, `min-w-0` no
  destinatário). Duplicação transitória, some na 3b.
- `Autocomplete` (`app/_components/autocomplete.tsx`) ganha
  `"aria-required"?: boolean` repassado ao `Input`. O `aria-labelledby` vira
  opcional no uso: no `FormField` o rótulo liga por `for`/`id` no próprio
  `Input` (o invólucro da edição continua passando o `labelId` dele).
- Os controles não importam `react-hook-form` para tipar o próprio valor:
  props explícitas (`value`, `onChange`, `onBlur`, `ref`, `disabled`, `name?`
  e as cinco de `FormFieldA11yProps`). `name` que o elemento não aceita
  (`Autocomplete`) é descartado no controle.
- Nenhum `FormField` sem `FormSchemaProvider` acima — os invólucros da edição
  **não** usam `FormField` (o `TicketEditProvider` não tem provider de schema
  até a 3b).

### Cuidados que não podem regredir

| Ref.                    | Onde                                | O que precisa continuar                                                                                                                                                                                   |
| ----------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T10 / `INVALID_COMPANY` | abertura                            | `form.resetField("companyId")` **antes** do `setError(..., { shouldFocus: true })` e depois `router.refresh()`. O `ref` do `field` precisa chegar ao `Input` do `Autocomplete`, senão o foco não acontece |
| `INVALID_TAG`           | abertura                            | `setError("tagId", …, { shouldFocus: true })` + `refresh`; `ref` no botão do `Combobox`                                                                                                                   |
| `INVALID_ASSIGNEE`      | abertura, Enviar, Enviar para setor | `setError("assigneeId", …, { shouldFocus: true })` + `refresh`; no Enviar também `INVALID_INPUT` vai para o destinatário (`FIELD_ERROR_CODES`)                                                            |
| `INVALID_TARGET`        | Enviar para setor                   | `setError("toDepartmentId", …, { shouldFocus: true })` + `refresh`                                                                                                                                        |
| T15                     | abertura                            | busca sem resultado mostra `Nenhuma empresa encontrada.` e o foco continua no `Input` (o `Autocomplete` não muda por dentro)                                                                              |
| L9                      | Enviar                              | o `key={\`${id}:${assignedTo}\`}`em`ticket-detail-header.tsx`continua: o remonte refaz o`useForm` com o destinatário novo. O provider fica **dentro** do diálogo                                          |
| Anexos                  | abertura                            | `Controller` + `AttachmentUploader` intactos; bloqueio do envio com upload em andamento (`submitBlockMessage`) e `setUploadsBusy("idle")` no descarte continuam                                           |
| Reset                   | todos                               | `form.reset(defaults)` ao fechar/cancelar e no sucesso do comentário: o `*` volta nos obrigatórios vazios                                                                                                 |
| Edição intacta          | detalhe                             | invólucros da edição com mesmo DOM; E1–E14 de `ticket-company.md` e a edição de tipo/tag/destinatário/descrição/solução/comentário de passagem passam como antes                                          |

### Limpeza do `df-architect` ao fim da 3a

Depois da entrega do `df-ui`: remover `TICKET_PRIORITY_REQUIRED_HINT` de
`app/_lib/domain/ticket.ts` e atualizar o "Aviso de campo vazio" em
`docs/contracts/tag-priority.md` para o `*`.

## Etapa 3b — edição do chamado (`df-ui`)

Arquivos: `tickets/[id]/_components/ticket-edit-provider.tsx`,
`ticket-edit-heading.tsx`, `ticket-edit-description.tsx`,
`ticket-edit-classification.tsx`, `ticket-edit-company.tsx`,
`ticket-edit-assignee.tsx`, `ticket-edit-handoff-comment.tsx`,
`ticket-edit-solution.tsx`, `ticket-edit-attachments.tsx` e
`tickets/[id]/_hooks/use-ticket-edit.ts`. Nada muda em `app/_lib/**`
(helpers, `editTicketSchema`, domínio e action ficam como estão).

### Schema conferido (tsx, 2026-11-10)

`editTicketSchema` (= `ticketFieldsSchema.extend({...})`) é `ZodObject` no
topo e é o mesmo do `zodResolver` de `ticket-edit-provider.tsx`:
`useForm<EditTicketInput>({ resolver: zodResolver(editTicketSchema), defaultValues: options.defaults })`.

| Campo                  | `isFieldRequired` | Observação                                                                         |
| ---------------------- | ----------------- | ---------------------------------------------------------------------------------- |
| `companyId`            | obrigatório       | `undefined`, `0`, `2147483648` → `*`; id válido → sem                              |
| `title`                | obrigatório       | `""`, `"ab"`, `"   "` → `*`; `"abc"` → sem                                         |
| `description`          | obrigatório       | 9 caracteres → `*`; 10 → sem                                                       |
| `type`                 | obrigatório       | `undefined` / fora do enum → `*`                                                   |
| `tagId`                | obrigatório       | `undefined` → `*`                                                                  |
| `assigneeId`           | opcional          | aceita `null` (fila). `undefined` também sai sem `*`, mas falha ao salvar (abaixo) |
| `solution`             | opcional          | `.optional()` no schema; com `required` → `""`/9 caracteres `*`, 10 → sem          |
| `handoffComment`       | opcional          | `.optional()`; com `required` → `""`/só espaço/5001 → `*`; `"ok"` → sem            |
| `attachments`          | opcional          | fica fora do `FormField`                                                           |
| `ticketId`             | obrigatório       | oculto, não vira campo                                                             |
| `removedAttachmentIds` | opcional          | oculto, não vira campo                                                             |

`safeParse` conferido: `handoffComment: ""` → `Escreva um comentário para quem
vai receber o chamado.`; `companyId` ausente → `Selecione a empresa.`; `tagId`
ausente → `Selecione a tag.`; `solution: ""` → `Descreva a solução.`;
sem `handoffComment` → válido.

### Decisões por campo

`TicketEditProvider` passa a envolver `children` em
`<FormSchemaProvider form={form} schema={editTicketSchema}>` **dentro** do
`TicketEditContext` (o contexto continua expondo `form` para `setFocus`,
`control` e o `useWatch` dos anexos). Toda ilha `ticket-edit-*` fica abaixo
do provider — o `page.tsx` já monta tudo dentro dele. Os formulários do
detalhe (Resolver, Comentar, diálogos) têm o próprio `FormSchemaProvider`, que
sobrepõe o da edição; nenhum `useFormContext` solto existe no subtree
(conferido). Continua **sem** `<form>` envolvendo os cards.

Todo `FormField` da edição recebe `control={form.control}`. Os `useId` das
ilhas saem (o `FormField` gera os ids). O `ref` do `field` chega ao elemento
focável em todos os controles (já garantido na 3a).

| Ilha / campo                          | `FormField`                                                                                                                                                                                                                                    | `required`                  | `*` esperado                                                                                                                                                                                                         |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ticket-edit-heading` — Título        | `label="Título"` (visível, como hoje), `Input autoComplete="off"`; dentro do `div.min-w-0.flex-1`                                                                                                                                              | —                           | só se o título deixar de valer                                                                                                                                                                                       |
| `ticket-edit-description`             | `label="Descrição"` `hideLabel`, `TicketDescriptionTextarea`                                                                                                                                                                                   | —                           | nunca visível (rótulo oculto leva o `*` junto); `aria-required="true"`                                                                                                                                               |
| `ticket-edit-company` — Empresa       | `label={TICKET_COMPANY_LABEL}`, `TicketCompanyAutocomplete` com `getOptionLabel={ticketCompanyEditOptionLabel}`, `description={companyHint}`                                                                                                   | —                           | chamado sem empresa: `*` desde o início, junto com a dica; com empresa (ativa ou inativa atual): sem                                                                                                                 |
| `ticket-edit-classification` — Tipo   | `label="Tipo"`, `TicketTypeSelect`                                                                                                                                                                                                             | —                           | sem, salvo valor inválido                                                                                                                                                                                            |
| `ticket-edit-classification` — Tag    | `label="Tag"`, `TicketTagCombobox`, `description={tagHint}`                                                                                                                                                                                    | —                           | tag atual indisponível (`defaults.tagId` ausente): `*` desde o início, junto com a dica                                                                                                                              |
| `ticket-edit-assignee` — Destinatário | `label={TICKET_ASSIGNEE_LABEL}`, `TicketAssigneeCombobox` com `queueLabel`, `description={assigneeHint}`, `className="min-w-0"`                                                                                                                | —                           | nunca (`null` = fila é escolha válida). Destinatário atual fora da lista (`undefined`): sem `*`, a dica `UNAVAILABLE_ASSIGNEE_HINT` explica e salvar dá `Selecione o destinatário.` com foco — comportamento de hoje |
| `ticket-edit-handoff-comment`         | `label={HANDOFF_COMMENT_LABEL}`, `HandoffCommentTextarea` com `disabled={isSubmitting}`, `description={HANDOFF_COMMENT_DESCRIPTION}`, `className="col-span-full min-w-0"`, **`shouldUnregister`** e **`defaultValue={EMPTY_HANDOFF_COMMENT}`** | `required` (literal `true`) | `*` ao aparecer (vazio); some com texto válido. Só montado quando `isHandoffAssigneeChange(initialAssigneeId, assigneeId)`, como hoje                                                                                |
| `ticket-edit-solution`                | `label="Solução"`, `TicketSolutionTextarea`                                                                                                                                                                                                    | `required` (literal `true`) | a ilha só monta com `includesSolution`; legado sem solução abre com `*`; solução gravada abre sem                                                                                                                    |
| `ticket-edit-attachments`             | **não** — continua `Controller` + `TicketAttachmentsEditor`                                                                                                                                                                                    | —                           | sem `*` (opcional); layout próprio, como na abertura                                                                                                                                                                 |

- `required` na solução e no comentário de passagem: o schema os deixa
  `.optional()` porque só existem em parte dos casos; quando a ilha está
  montada, eles são exigidos (`ticketSolutionSchema` / `handoffCommentSchema`
  recusam `""`). O override dá `*` e `aria-required` coerentes com o erro que
  sai ao salvar.
- **Mudança visível — dica do comentário de passagem.** Hoje
  `O texto vira um comentário público no chamado.` fica **acima** do textarea
  e continua junto do erro (`aria-describedby` com os dois). No `FormField`
  ela vai **abaixo** e é substituída pelo erro, como toda dica do projeto.
  Aceito pela padronização; HC21/HC22 de `handoff-comment.md` passam a
  esperar a dica abaixo.
- **Mudança visível — `*` na edição.** Com valores gravados válidos, a edição
  abre sem nenhum `*`; ele aparece onde o valor deixa de valer (apagar o
  título, descrição curta, chamado sem empresa, tag indisponível, solução
  legada vazia, comentário de passagem). H17 da 3a ("sem `*` em lugar nenhum")
  deixa de valer.
- `ticket-edit-company` **perde** o próprio `useWatch`: passa `{...field}`
  inteiro ao `TicketCompanyAutocomplete` (o `FormField` já entrega o valor
  sem fallback, abaixo).
- `use-ticket-edit.ts`: o tipo do contexto **não** muda
  (`form: UseFormReturn<EditTicketInput>`). Remover campos do contexto só se
  ficarem sem uso.

### Etapa 3b — mudança no `FormField` (`df-ui`, `app/_components/form-field.tsx`)

**Causa do E9, conferida no `react-hook-form@7.88`**
(`node_modules/react-hook-form/dist/index.esm.mjs:458-473`): o `useController`
calcula `defaultValueMemo = get(_formValues, name, get(_defaultValues, name))`
no primeiro render e o passa como `defaultValue` ao `useWatch` interno; o
`useWatch` resolve `get(formValues, name, defaultValue)`
(`generateWatchOutput`, `:335-338`). Depois do
`form.reset({ ...getValues(), companyId: undefined }, { keepDefaultValues: true, … })`,
o valor do formulário é `undefined` e o `field.value` **volta a ser a empresa
gravada**. Era isso que o `ticket-edit-company` contornava com o `useWatch`
próprio. No `FormField`, além do campo não esvaziar, o `*` sumiria com o
campo vazio (ele lê o mesmo valor).

**Solução — o `FormField` passa a ler o valor sem fallback para o default do
formulário, para todos os formulários:**

```ts
interface FormFieldProps<TFieldValues, TName, TTransformedValues> {
  …
  shouldUnregister?: boolean
  defaultValue?: FieldPathValue<TFieldValues, TName>
}

const { field, fieldState } = useController({
  name,
  control,
  shouldUnregister,
  defaultValue,
})
const value = useWatch({ control, name, defaultValue, exact: true })
const showMark = shouldShowRequiredMark(fieldSchema, value, required)
…
{children({ ...field, value, ...a11y }, fieldState)}
```

- O `useWatch` **depois** do `useController`, nesta ordem: o `register` do
  `useController` grava o valor inicial em `_formValues` de forma síncrona
  (`updateValidAndValue`, `:2285-2297`), e o `useWatch` lê esse valor no
  primeiro render. Inverter a ordem faz o comentário de passagem nascer
  `undefined` (aviso de controlado/não controlado).
- O `defaultValue` repassado ao `useWatch` é **só o da prop do `FormField`**
  (comentário de passagem), nunca o do formulário: o fallback fica restrito
  ao default explícito do campo, que não existe no campo Empresa.
- `FieldPathValue` vem de `react-hook-form` (`import type`). O retorno do
  `useWatch` com `name: TName` já é `FieldPathValue<TFieldValues, TName>`,
  o mesmo tipo de `field.value`: sem `as`.
- Efeito nos outros formulários: só difere quando o valor do formulário é
  `undefined` e o default não — e nesse caso o certo é mostrar vazio. Hoje
  isso só acontece no E9; `resetField`, `reset(defaults)` e `setValue`
  continuam iguais. Regressão conferida em J22.

**Provider — sem mudança** (já é o E9 corrigido):

```ts
if (result.code === "INVALID_COMPANY") {
  form.reset(
    { ...form.getValues(), companyId: undefined },
    { keepDefaultValues: true, keepIsSubmitted: true, keepFieldsRef: true },
  )
  form.setError("companyId", { message: result.message }, { shouldFocus: true })
  router.refresh()
  return
}
```

`keepFieldsRef` mantém o `ref` registrado pelo `field.ref` do `FormField` no
`Input` do `Autocomplete` (sem ele, o `shouldFocus` não acharia o elemento
depois do reset); `keepDefaultValues` mantém o "Cancelar volta ao salvo";
`keepIsSubmitted` mantém a revalidação `onChange` depois da primeira tentativa.
Ordem: `reset` → `setError` → `refresh`.

### Cuidados que não podem regredir (3b)

| Ref.                       | O que precisa continuar                                                                                                                                                                                                                                                         |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E9 / `INVALID_COMPANY`     | erro no campo Empresa com **foco** no `Input`; campo vazio (valor `undefined`, sem a empresa gravada de volta) com `*`; nada gravado; "Cancelar" depois volta à empresa gravada                                                                                                 |
| `INVALID_TAG`              | `setError("tagId", …, { shouldFocus: true })` + `refresh`; foco no botão do `Combobox` da Tag                                                                                                                                                                                   |
| `INVALID_ASSIGNEE`         | `setError("assigneeId", …, { shouldFocus: true })` + `refresh`; foco no botão do Destinatário                                                                                                                                                                                   |
| `HANDOFF_COMMENT_REQUIRED` | com troca de destinatário no formulário, erro no comentário com foco; sem troca, `toast.error` + `refresh` (provider intacto)                                                                                                                                                   |
| Entrar                     | `form.reset(options.defaults)` e foco no Título (`form.setFocus("title")` precisa do `ref` no `Input`)                                                                                                                                                                          |
| Cancelar                   | `form.reset(options.defaults)`: valores salvos, erros limpos, `*` recalculado; foco volta ao "Editar"; nenhum request                                                                                                                                                           |
| Botões do cabeçalho        | "Enviar", "Assumir", "Atender" (`attendActions`) somem durante a edição; "Cancelar"/"Salvar alterações" desabilitados no envio. "Enviar para outro setor" e "Resolver" **continuam visíveis** durante a edição: comportamento já existente na 3a, que esta refatoração não muda |
| Janela                     | campo Solução só com `includesSolution`; `Resolvido em`/`Editável até` visíveis; `ResolveTicketForm` montado e oculto (`HiddenWhileEditing`)                                                                                                                                    |
| Anexos                     | `Controller` + `TicketAttachmentsEditor` intactos; bloqueio por upload em andamento e por limite (`saveBlockMessage`, toast com id)                                                                                                                                             |
| Comentário de passagem     | some ao voltar o destinatário e reaparece **vazio** (`shouldUnregister` + `defaultValue`), HC23                                                                                                                                                                                 |

### Invólucros apagados ao fim da 3b

Sem mais uso depois da migração (conferido por `grep`: só as ilhas da edição
os importam):

- `app/(app)/_components/ticket-company-field.tsx`
- `app/(app)/_components/ticket-title-field.tsx`
- `app/(app)/_components/ticket-description-field.tsx`
- `app/(app)/_components/ticket-type-field.tsx`
- `app/(app)/_components/ticket-tag-field.tsx`
- `app/(app)/_components/ticket-assignee-field.tsx`
- `app/(app)/_components/handoff-comment-field.tsx`
- `app/(app)/tickets/[id]/_components/ticket-solution-field.tsx`

Com eles some a duplicação transitória da 3a (markup do antigo
`ComboboxField` em `ticket-tag-field`/`ticket-assignee-field`). Os controles
da 3a (`ticket-*-autocomplete|textarea|select|combobox`) ficam.

## Riscos

1. **Schema sem `shape`** — pipe, preprocess ou transform no topo, união ou
   interseção (tabela acima). O campo sai sem `*` e sem `aria-required`; o
   formulário passa `required` explícito. Hoje nenhum caso.
2. **Vazio com significado** — campo cujo vazio é um valor válido (`priority`
   `null` = "Sem prioridade", `role` ausente = papel padrão). Tratado por
   `null` em `isFieldRequired`; um vazio novo com significado que o schema
   recuse vira `*` indevido e pede `required={false}`.
3. **Formulário espalhado em vários componentes** — todo `FormField` precisa
   estar **dentro** do `FormSchemaProvider` (o `useFormSchema` lança fora
   dele). Crítico na Etapa 3: `ticket-edit-provider.tsx` e editores de
   anexo/comentário montam pedaços do mesmo formulário em componentes
   diferentes.
4. **Regressões já corrigidas no chamado** — T10 (`INVALID_COMPANY` com foco no
   campo), T15 (lista vazia do autocompletar) e E9 (`hasStaleValue` do campo
   empresa) de `docs/contracts/ticket-company.md`. A Etapa 3 refaz esses
   cenários; o `ref` e o `setError(..., { shouldFocus: true })` precisam
   continuar chegando ao controle.
5. **Mudança visível** — Setores, Pessoas, Tags e Perfil passam a mostrar `*`
   onde não havia. Decisão do usuário; QA confere campo a campo.
6. **Refinamento entre campos** — o `*` reflete só o schema do campo. Regra
   que depende de outro campo (prioridade do chamado, expediente) não mexe no
   `*` sem `required` explícito.
7. **Refinamento assíncrono em campo** — `z.safeParse` lança. Nenhum hoje.
8. **Etapa 3a — invólucros da edição** — mexer por dentro de
   `ticket-*-field.tsx` pode mudar ids, `aria-describedby` ou classes da
   edição sem ninguém ver. Mitigação: mesma API e mesmo DOM (tabela da 3a) e
   cenários H17–H18.
9. **Etapa 3a — mudança visível** — `*` em Comentar, Recusar, Resolver,
   Enviar e Enviar para setor; o aviso `Defina uma prioridade` some (o `*`
   assume o papel). Decisão tomada pelo `df-architect` seguindo "nenhuma
   legenda"; reverter é só manter o aviso na `TicketPrioritySelect`.
10. **Etapa 3a — `ref`** — controle que não leva o `ref` ao elemento focável
    quebra T10, `INVALID_TAG`, `INVALID_ASSIGNEE`, `INVALID_TARGET` e o
    `shouldFocusError`. Conferir nos H6–H9.
11. **Etapa 3b — valor do `FormField` sem fallback** — muda a leitura do
    valor em **todos** os formulários. Só difere quando o valor do
    formulário é `undefined` com default definido (hoje, só o E9). Ordem dos
    hooks (`useController` antes do `useWatch`) é obrigatória; invertida, o
    campo montado depois do formulário nasce `undefined`. Regressão em J22.
12. **Etapa 3b — provider envolvendo o detalhe inteiro** — o
    `FormSchemaProvider` da edição fica acima de Resolver, Comentar e
    diálogos. Cada um tem o próprio provider, que sobrepõe; um `FormField`
    novo no detalhe sem provider próprio ligaria **em silêncio** ao
    formulário da edição em vez de lançar. Quem criar formulário no detalhe
    envolve-o no próprio `FormSchemaProvider`.
13. **Etapa 3b — destinatário `undefined`** — o atual fora da lista abre sem
    seleção e sem `*` (o schema aceita `null`, então o campo é opcional); o
    erro aparece só ao salvar. Mantém o comportamento de hoje; a dica
    `UNAVAILABLE_ASSIGNEE_HINT` cobre. Mostrar `*` aí exigiria `required`
    dinâmico (valor `undefined` ≠ `null`), fora do escopo.
14. **Etapa 3b — mudança visível** — dica do comentário de passagem passa de
    cima para baixo do campo e some quando há erro; `*` aparece na edição
    onde o valor deixa de valer.

## Cenários para o `df-qa`

**D** = Diretor, **A** = QA Admin Suporte, **M** = QA Membro Suporte.
Nenhum erro nem aviso no console/dev server em todos (MCP `next-devtools`).

### Etapa 1 — Empresas

| #   | Quem | Ação                                                                             | Esperado                                                                                                                                                                                                                                                                                          |
| --- | ---- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | D    | "Nova empresa"                                                                   | título "Nova empresa", **sem** subtítulo/legenda; `*` vermelho nos 13 obrigatórios (CNPJ, Razão social, Nome fantasia, E-mail, Primário, CEP, UF, Logradouro, Número, Bairro, Cidade, Responsável, Contato do responsável) e em nenhum outro; nenhum erro; sem aviso do Radix sobre `Description` |
| F2  | D    | digitar CNPJ `11.222.333/0001-82`; corrigir para `…-81`; apagar um caractere     | `*` do CNPJ fica com o DV errado, some com o válido, volta ao apagar; nenhuma mensagem de erro até salvar                                                                                                                                                                                         |
| F3  | D    | escolher UF; preencher Razão social com 1 caractere e depois com 3               | `*` da UF some; o da Razão social fica com 1 caractere (abaixo do mínimo) e some com 3                                                                                                                                                                                                            |
| F4  | D    | "Salvar empresa" com tudo vazio                                                  | erro em cada obrigatório; foco no CNPJ (primeiro com erro); opcionais sem erro; `aria-invalid="true"` e `aria-describedby` apontando para o erro em cada um                                                                                                                                       |
| F5  | D    | corrigir um campo com erro depois de salvar                                      | a mensagem dele some ao digitar valor válido (revalidação `onChange`)                                                                                                                                                                                                                             |
| F6  | D    | inspecionar controles                                                            | obrigatórios com `aria-required="true"` sempre (com ou sem `*`), exceto o grupo dos dias (`labelMode="group"`, sem `aria-required`); opcionais sem; cada rótulo ligado ao controle (`for`/`id`); dias com `aria-labelledby` para "Dias"; `*` com `aria-hidden="true"`                             |
| F7  | D    | máscaras: CNPJ, telefones, CEP (repetir C10, C12–C14 de `registry-companies.md`) | mesmo comportamento de antes, cursor inclusive                                                                                                                                                                                                                                                    |
| F8  | D    | Expediente: Seg sem horário; salvar                                              | sem `*` no grupo; erros de horário abaixo de Das/Às; com `TIMES_WITHOUT_DAYS`, erro abaixo dos dias e foco no primeiro dia                                                                                                                                                                        |
| F9  | D    | criar `[QA] Empresa FormField` válida (CNPJ de reserva do `df-qa`)               | toast "Empresa criada.", Dialog fecha                                                                                                                                                                                                                                                             |
| F10 | D    | "Nova empresa" com CNPJ de `QA Alfa`                                             | erro `CNPJ_TAKEN` no CNPJ, com foco                                                                                                                                                                                                                                                               |
| F11 | D    | "Editar" numa empresa válida; apagar o Nome fantasia; Cancelar; reabrir          | abre sem `*`; o `*` do Nome fantasia volta ao apagar, sem mensagem; reabre com os valores gravados e sem `*`                                                                                                                                                                                      |
| F12 | D    | editar e salvar alteração válida                                                 | toast "Empresa atualizada." (mensagem da action), Dialog fecha                                                                                                                                                                                                                                    |

### Etapa 2 — Setores, Pessoas, Tags, Perfil

| #   | Quem  | Ação                                                        | Esperado                                                                                                                                                                                   |
| --- | ----- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| G1  | D     | "Novo setor"; digitar 1 caractere, depois 3                 | `*` em "Nome do setor"; dica "Nomes iguais…" visível; `*` fica com 1 e some com 3; sem erro até salvar                                                                                     |
| G2  | D     | salvar vazio; depois nome de setor existente                | erro no campo com foco; a dica é substituída pelo erro; `NAME_TAKEN` no campo                                                                                                              |
| G3  | D     | "Renomear" um setor                                         | abre sem `*`; apagar o nome faz voltar                                                                                                                                                     |
| G4  | D / A | "Nova pessoa"                                               | D: `*` em Nome, E-mail, Setor; **sem** `*` em Papel. A: só Nome e E-mail visíveis, ambos com `*`. Nos dois, e-mail `abc` mantém o `*`, e-mail válido o tira                                |
| G5  | D     | salvar pessoa vazia; depois criar `[QA]` válida             | erros nos três obrigatórios, foco no primeiro; criação com toast                                                                                                                           |
| G6  | D / A | "Nova tag"                                                  | D: `*` em Setor e Nome da tag, salvar vazio dá erro nos dois. A: Setor não aparece (fixo), `*` só em Nome da tag. Nos dois, **sem** `*` em Prioridade; criar com "Sem prioridade" funciona |
| G7  | D / A | "Editar" uma tag sem prioridade                             | abre sem `*` nenhum (prioridade `null` não é obrigatória)                                                                                                                                  |
| G8  | M     | Perfil → trocar senha                                       | `*` nos três campos; somem ao preencher (Nova senha só com 8+); senhas diferentes → erro só ao salvar em "Confirmar"; nova igual à atual → erro                                            |
| G9  | M     | trocar senha com sucesso (e restaurar a senha de QA depois) | toast de sucesso, campos limpos com `*` de volta                                                                                                                                           |
| G10 | todos | inspecionar os quatro formulários                           | `aria-required` só nos obrigatórios; `aria-invalid`/`aria-describedby` como F6; nenhuma legenda "Campos com \*…"                                                                           |

### Etapa 3a — abertura e diálogos do detalhe

Chamados criados pelo `df-qa` com prefixo `[QA]`. Empresas `QA Alfa`/`QA Beta`
e `[QA] Empresa Temporária` como em `ticket-company.md`.

| #   | Quem  | Ação                                                                                                                          | Esperado                                                                                                                                                                                                                                                                                        |
| --- | ----- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| H1  | M     | "Novo chamado"                                                                                                                | `*` em Empresa, Título, Descrição, Tipo, Prioridade, Tags; **sem** `*` em Anexos, Criador, Destinatário; sem `Defina uma prioridade`; sem erro; dica da tag visível                                                                                                                             |
| H2  | M     | Título `ab` → `abc`; Descrição com 9 → 10 caracteres; Tipo; digitar `alfa` na Empresa sem escolher, depois escolher `QA Alfa` | `*` do Título some com 3; da Descrição com 10; do Tipo ao escolher; da Empresa só ao escolher a opção                                                                                                                                                                                           |
| H3  | M     | escolher uma tag **sem** prioridade e depois uma **com** prioridade fixada; voltar à sem                                      | sem trava: `*` em Prioridade até escolher; com trava: prioridade preenchida, sem `*`, sem `aria-required`, toast de trava ao abrir; voltar limpa a prioridade e o `*` volta                                                                                                                     |
| H4  | M     | "Abrir chamado" com tudo vazio                                                                                                | erro em Empresa, Título, Descrição, Tipo, Prioridade, Tags; foco na Empresa; nenhum erro em Anexos/Destinatário; nada criado                                                                                                                                                                    |
| H5  | M     | criar `[QA] FormField abertura` com `QA Alfa`, um anexo e destinatário "fila"                                                 | toast `Chamado #N criado.`; diálogo fecha; reabrir mostra tudo vazio com os `*` de volta                                                                                                                                                                                                        |
| H6  | D + M | T10: M escolhe `[QA] Empresa Temporária`; D a desativa; M envia                                                               | `Esta empresa não está disponível. Escolha uma empresa ativa.` na Empresa, **foco** no campo, campo vazio com `*`; lista recarrega sem ela; nada criado                                                                                                                                         |
| H7  | M     | T15: digitar `zzz-nao-existe` na Empresa                                                                                      | `Nenhuma empresa encontrada.`; foco continua no campo                                                                                                                                                                                                                                           |
| H8  | D + M | `INVALID_TAG` (D desativa a tag escolhida por M antes do envio) e `INVALID_ASSIGNEE` (D desativa a pessoa escolhida)          | erro no campo certo com foco; lista recarrega; nada criado                                                                                                                                                                                                                                      |
| H9  | M     | anexo ainda subindo e "Abrir chamado"                                                                                         | toast de bloqueio; nada enviado; com o upload pronto, envia                                                                                                                                                                                                                                     |
| H10 | A     | "Enviar" no detalhe                                                                                                           | `*` em Destinatário e Comentário; dica `Destinatário atual: …` abaixo do destinatário; salvar vazio → erro nos dois, foco no destinatário                                                                                                                                                       |
| H11 | A     | L8 + L9: enviar para M; sem recarregar, "Enviar" de novo para outra pessoa                                                    | os dois enviam sem conflito; no segundo, `Destinatário atual: <M>.` e M fora da lista; o `*` volta no diálogo novo                                                                                                                                                                              |
| H12 | A     | "Enviar para setor"                                                                                                           | `*` em Setor de destino e Comentário; Destinatário só depois de escolher setor e **sem** `*`; trocar o setor limpa o destinatário; salvar vazio → erros com foco no setor                                                                                                                       |
| H13 | A     | recusar uma transferência pendente: salvar vazio, depois motivo `[QA] recusa FormField`                                       | `*` em Motivo; vazio → erro com foco; com texto → `*` some e recusa com toast                                                                                                                                                                                                                   |
| H14 | M     | Resolver: salvar vazio; 9 caracteres; 10 caracteres                                                                           | `*` em Solução até 10; vazio → erro com foco; botão "Resolver" (fora do `<form>`) continua enviando                                                                                                                                                                                             |
| H15 | M     | Comentar: `*` com caixa vazia; publicar `[QA] comentário FormField` (privado e público)                                       | `*` some ao digitar; "Comentário privado" sem `*` e sem `aria-required`; após publicar, caixa limpa com `*` de volta e altura restaurada                                                                                                                                                        |
| H16 | M     | editar um comentário próprio: apagar tudo e salvar; depois salvar texto válido; Cancelar                                      | abre sem `*` visível, foco na caixa; vazio → erro com foco; `aria-required="true"` no textarea; o `*` não aparece sozinho (rótulo oculto); sucesso e Cancelar fecham e o foco volta ao lápis. Esc **não** fecha o editor (não há handler de `Escape`, comportamento anterior à 3a): só Cancelar |
| H17 | M     | "Editar" o chamado (E1, E9 de `ticket-company.md`) e alterar Tipo, Tag, Destinatário, Descrição                               | idêntico a antes da 3a: sem `*` em lugar nenhum da edição, mesmos rótulos, dicas, erros e foco                                                                                                                                                                                                  |
| H18 | todos | inspecionar os formulários da 3a                                                                                              | `aria-required` só nos obrigatórios (nunca no checkbox nem na prioridade travada); cada rótulo ligado por `for`/`id` (Empresa inclusive); `aria-describedby` → erro após salvar, senão a dica; `*` com `aria-hidden`; nenhum aviso no console                                                   |

### Etapa 3b — edição do chamado

Chamados e empresas como em `ticket-company.md` (Etapa 2),
`ticket-edit-window.md` (`#T`, `#J`), `assignee-edit-and-assume.md` (`#D*`)
e `handoff-comment.md` (`#H*`). Anotar `max(id)` de `ticket_history` e
`message` antes de todo "nada gravado".

| #   | Quem  | Ação                                                                                                               | Esperado                                                                                                                                                                                                                         |
| --- | ----- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| J1  | M     | `#T` → "Editar" (janela 1)                                                                                         | sem dialog; Título no cabeçalho com foco; Descrição, Empresa (E1: `QA Alfa — …`), Tipo, Tag, Destinatário preenchidos; **nenhum** `*`; "Editar", "Enviar", "Assumir" ausentes; "Cancelar" e "Salvar alterações" presentes        |
| J2  | M     | inspecionar os campos da J1                                                                                        | `aria-required="true"` em Título, Descrição, Empresa, Tipo, Tag; **não** em Destinatário nem nos anexos; cada rótulo ligado por `for`/`id`; Descrição com rótulo `sr-only` e nome acessível `Descrição`; nenhum aviso no console |
| J3  | M     | apagar o título; Descrição com 9 caracteres; depois corrigir os dois                                               | `*` em Título e (oculto) na Descrição; nenhuma mensagem até salvar; `*` some ao corrigir                                                                                                                                         |
| J4  | M     | janela 6: título `ab` → salvar                                                                                     | `O título precisa ter no mínimo 3 caracteres.` com foco; nenhum request de action                                                                                                                                                |
| J5  | M     | janela 3: alterar título e descrição → "Cancelar"; "Editar" de novo                                                | volta aos valores salvos, sem `*`, sem erro; foco no "Editar" ao sair; nenhum request                                                                                                                                            |
| J6  | M     | janela 4 + E2/E3/E13: título, descrição, tipo Bug, tag `[QA] Edição B`, empresa `QA Beta` → salvar                 | toast `Chamado #T atualizado.`; notas da linha do tempo como nos contratos de origem; `mudanca_empresa` gravada                                                                                                                  |
| J7  | M     | E10 / janela 5: salvar sem mudar nada                                                                              | `Nenhuma alteração para salvar.`; sai da edição                                                                                                                                                                                  |
| J8  | M     | E4/E5: chamado sem empresa → "Editar"                                                                              | Empresa vazia com `*` e a dica `Este chamado não tem empresa. Escolha uma para salvar.`; salvar só o título → `Selecione a empresa.` com foco; escolher `QA Alfa` → `*` some; salvar grava `— → QA Alfa`                         |
| J9  | D + M | E6/E7/E8: empresa atual inativa                                                                                    | campo com `… (inativa)` e sem `*`; dica de inativa; salvar só a descrição mantém a inativa; trocar por `QA Alfa` salva e, ao reabrir, a inativa não está mais na lista                                                           |
| J10 | D + M | **E9**: M escolhe outra `[QA]` ativa; D a desativa; M salva                                                        | `Esta empresa não está disponível. Escolha uma empresa ativa.` no campo, **foco** no `Input`; campo **vazio** (a empresa gravada **não** volta) com `*`; nada gravado. "Cancelar" → visualização com a empresa gravada           |
| J11 | M     | E14: digitar `beta`, `↓`, Enter; depois `zzz-nao-existe`; Cancelar                                                 | filtro e teclado como na abertura; `Nenhuma empresa encontrada.` com foco no campo; Cancelar volta ao salvo                                                                                                                      |
| J12 | A / I | AE21: tag atual indisponível → "Editar"                                                                            | Tag sem seleção, com `*` e a dica `A tag atual não está disponível…`; escolher `[QA] Rede` tira o `*`; AE22 salva                                                                                                                |
| J13 | D + M | `INVALID_TAG`: M escolhe tag; D a desativa; M salva                                                                | erro no campo Tag com foco no botão; lista recarrega; nada gravado                                                                                                                                                               |
| J14 | D + M | `INVALID_ASSIGNEE`: M escolhe pessoa; D a desativa; M salva                                                        | erro no Destinatário com foco; lista recarrega; nada gravado                                                                                                                                                                     |
| J15 | M     | HC19/HC20: `#H4` → "Editar"; mudar só o título                                                                     | nenhum campo `Comentário`; salva sem `message` nova                                                                                                                                                                              |
| J16 | M     | HC21/HC22: Destinatário `QA Admin Suporte`; salvar vazio; só espaços                                               | campo `Comentário` abaixo do Destinatário, vazio, com `*` e a dica `O texto vira um comentário público no chamado.` **abaixo** do textarea; ao salvar, a dica dá lugar a `Escreva um comentário…` com foco; nada gravado         |
| J17 | M     | HC23: escrever `[QA] Texto descartado`; voltar o destinatário; salvar; "Editar" → trocar de novo                   | campo some; `Nenhuma alteração para salvar.`; ao reaparecer está **vazio** com `*`; nenhum aviso de controlado/não controlado                                                                                                    |
| J18 | M     | HC24/HC26/HC27: passar ao admin com texto; devolver à fila; `X5001`                                                | sucesso nos dois primeiros (`message` pública gravada); `X5001` → `O comentário precisa ter no máximo 5000 caracteres.` com `*`                                                                                                  |
| J19 | M     | janelas 8–11 / AE27: `#J` → "Editar"                                                                               | Solução preenchida sem `*`, `Resolvido em`/`Editável até` visíveis; vazia → `*` e `Descreva a solução.`; `curta` → mínimo de 10; texto válido salva `Alterou descrição e solução.`                                               |
| J20 | M     | legado resolvido sem solução → "Editar"                                                                            | Solução vazia **com** `*` desde a abertura; `aria-required="true"`                                                                                                                                                               |
| J21 | M     | anexos na edição (`attachments-in-edit.md`): incluir, remover, salvar com upload em andamento e acima do limite    | sem `*` na área de anexos; toasts de bloqueio como antes; salvar grava em `attachment_history` com `inclusao`/`exclusao` (não em `ticket_history`)                                                                               |
| J22 | D / M | regressão do valor sem fallback: F11 (Editar empresa → apagar Nome fantasia → Cancelar → reabrir), G3, H3, H5, H16 | todos como nos relatórios das Etapas 1–3a                                                                                                                                                                                        |
| J23 | A     | AE5/AE11/AE16: editar como destinatário; passar o chamado a outra pessoa                                           | "Editar" e "Atender" no cabeçalho só fora da edição; salvar com troca exige o comentário (J16); depois do salvamento a página volta sem "Editar" para quem deixou de ser destinatário                                            |
| J24 | todos | toda a bateria                                                                                                     | E11 (sem "Editar" para quem não pode); nenhum erro nem aviso no console/dev server; nenhum `ticket-*-field.tsx` nem `handoff-comment-field.tsx` no repositório                                                                   |

## Checklist

Etapa 1:

- [x] helpers puros em `app/_lib/validation/form-field.ts`; conferidos com tsx contra os schemas (`df-architect`)
- [x] contrato `docs/contracts/form-field.md`; `registry-companies.md` aponta para cá (`df-architect`)
- [x] `use-form-schema.ts`, `FormSchemaProvider`, `FormField`; Dialog de Empresas migrado; `company-form-field.tsx` e `company-required-mark.tsx` apagados (`df-ui`)
- [x] limpeza: `COMPANY_REQUIRED_FIELDS`, `CompanyRequiredField`, `isCompanyRequiredFieldValid`, `COMPANY_REQUIRED_FIELDS_HINT` removidos (`df-architect`)
- [x] `npx tsc --noEmit`, `npm run lint`, `npm run build`; `df-reviewer` (aprovado com atenções, todas aplicadas); cenários F1–F12 12/12 ([relatório](../test-reports/2026-11-10-form-field-etapa-1.md))

Etapa 2:

- [x] Setores, Pessoas, Tags e Perfil migrados (`df-ui`); Combobox com `aria-labelledby` declarado e `name` repassado
- [x] `npx tsc --noEmit`, `npm run lint`, `npm run build`; `df-reviewer` (aprovado com atenções, aplicadas exceto o `ComboboxField`, levado à Etapa 3); cenários G1–G10 sem falhas, G5/G8 parciais e G9 não executado por restrição de escrita (não criar pessoa nem trocar senha) ([relatório](../test-reports/2026-11-10-form-field-etapa-2.md))
- [x] pausa para o usuário decidir a Etapa 3 — decidido: 3a agora, 3b depois

Etapa 3a:

- [x] schemas conferidos com tsx; decisões por campo e estratégia das peças compartilhadas neste contrato (`df-architect`)
- [x] `FormField` com `hideLabel`; `Autocomplete` com `aria-required` (`df-ui`)
- [x] controles novos da tabela da 3a; invólucros da edição montados sobre eles com mesma API e DOM; `ticket-priority-field.tsx` e `combobox-field.tsx` apagados (`df-ui`)
- [x] abertura, Enviar, Enviar para setor, Recusar, Resolver, Comentar e Editar comentário migrados (`df-ui`)
- [x] limpeza: `TICKET_PRIORITY_REQUIRED_HINT` removido e `tag-priority.md` atualizado (`df-architect`)
- [x] `npx tsc --noEmit`, `npm run lint`, `npm run build`; `df-reviewer` (aprovado, sem achados); cenários H1–H18 17/18, 0 falhas, H8 não executado por restrição de escrita (não desativar tag nem pessoa) ([relatório](../test-reports/2026-11-10-form-field-etapa-3a.md))
- [ ] H8 (`INVALID_TAG`, `INVALID_ASSIGNEE`, `INVALID_TARGET`) aberto para o `df-debug`: confirmar em execução o `setError` com foco no campo certo e o `refresh`

Etapa 3b (aprovada pelo usuário):

- [x] `editTicketSchema` conferido com tsx; decisões por campo, solução do E9 e cenários J1–J24 neste contrato; nota do E9 em `ticket-company.md` atualizada (`df-architect`)
- [x] `FormField` com `shouldUnregister`, `defaultValue` e valor por `useWatch` sem fallback, depois do `useController` (`df-ui`)
- [x] `TicketEditProvider` com `FormSchemaProvider` de `editTicketSchema`; ilhas `ticket-edit-*` no `FormField`; `ticket-edit-company` sem `useWatch` próprio; anexos continuam `Controller` (`df-ui`)
- [x] invólucros da lista "Invólucros apagados ao fim da 3b" removidos (`df-ui`)
- [x] `npx tsc --noEmit`, `npm run lint`, `npm run build`; `df-reviewer` (aprovado com atenções, 2026-11-10)
- [x] cenários J1–J24: 19/24, 0 falhas; J21 parcial (limite de 10 MB e upload em andamento não exercitados); J8 e J20 não executados (sem chamado `[QA]` sem empresa / resolvido sem solução); J12–J14 não executados (exigiriam desativar tag ou conta) ([relatório](../test-reports/2026-11-10-form-field-etapa-3b.md))
- [ ] J8, J12–J14 e J20 abertos para o `df-debug`: J8 (chamado sem empresa), J12 (tag atual indisponível), J13 (`INVALID_TAG`), J14 (`INVALID_ASSIGNEE`), J20 (legado resolvido sem solução abre com `*`)
