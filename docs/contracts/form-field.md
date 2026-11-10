# Contrato — `FormField` genérico

Refatoração dos formulários da área logada para um campo único, que liga ao
React Hook Form por dentro e deriva o "obrigatório" do schema Zod do
formulário. Fora do escopo: telas de `app/(auth)/**` (dono `df-auth`).

Versões observadas: `zod@4.6.5`, `react-hook-form@7.88`, `next@16.3.5`.

## Etapas

| Etapa | Escopo                                                                                                   | Estado                                                                                                                |
| ----- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 1     | Helpers puros (`df-architect`), `FormField` + `FormSchemaProvider` (`df-ui`), Dialog de Empresas migrado | concluída em 2026-11-10 ([relatório](../test-reports/2026-11-10-form-field-etapa-1.md))                               |
| 2     | Setores, Pessoas, Tags e Perfil (trocar senha) migrados. **Pausa** depois dela                           | concluída em 2026-11-10 ([relatório](../test-reports/2026-11-10-form-field-etapa-2.md))                               |
| 3a    | Abertura do chamado, Enviar, Enviar para setor, Recusar, Resolver, Comentar, Editar comentário           | concluída em 2026-11-10 ([relatório](../test-reports/2026-11-10-form-field-etapa-3a.md)); H8 aberto para o `df-debug` |
| 3b    | Edição do chamado (`ticket-edit-*`, `ticket-edit-provider`, `use-ticket-edit`)                           | aguardando decisão do usuário                                                                                         |

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

1. `const { field, fieldState } = useController({ name, control })` — sem
   `control`, o RHF usa o `useFormContext`. `control` existe **só para
   inferência de tipo** (`<FormField control={form.control} name="cnpj">` tipa
   `field.value` como `string`); passe quando o `children` precisa do valor
   tipado (`MaskedInput`, `Select`).
2. `const schema = useFormSchema()`;
   `const fieldSchema = fieldSchemaOf(schema, name)`;
   `const isRequired = resolveFieldRequired(fieldSchema, props.required)`;
   `const showMark = shouldShowRequiredMark(fieldSchema, field.value, props.required)`.
   O `field.value` do `useController` já é o valor atual a cada mudança: não
   precisa de `useWatch` separado.
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
     {children({ ...field, ...a11y }, fieldState)}
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

Etapa 3b (aguardando decisão do usuário):

- [ ] edição do chamado no `FormField` (`TicketEditProvider` com `FormSchemaProvider` de `editTicketSchema`); invólucros `ticket-*-field.tsx` apagados
