# Contrato — `FormField` genérico

Refatoração dos formulários da área logada para um campo único, que liga ao
React Hook Form por dentro e deriva o "obrigatório" do schema Zod do
formulário. Fora do escopo: telas de `app/(auth)/**` (dono `df-auth`).

Versões observadas: `zod@4.6.5`, `react-hook-form@7.88`, `next@16.3.5`.

## Etapas

| Etapa | Escopo                                                                                                   | Estado                                                                                  |
| ----- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 1     | Helpers puros (`df-architect`), `FormField` + `FormSchemaProvider` (`df-ui`), Dialog de Empresas migrado | concluída em 2026-11-10 ([relatório](../test-reports/2026-11-10-form-field-etapa-1.md)) |
| 2     | Setores, Pessoas, Tags e Perfil (trocar senha) migrados. **Pausa** depois dela                           | concluída em 2026-11-10 ([relatório](../test-reports/2026-11-10-form-field-etapa-2.md)) |
| 3     | Formulários de chamado (novo, editar, resolver, comentar, enviar, recusar) e `ComboboxField`             | aguardando decisão do usuário                                                           |

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
- [ ] pausa para o usuário decidir a Etapa 3 — aguardando

Etapa 3 (aguardando decisão do usuário):

- [ ] `ComboboxField` — atenção do `df-reviewer` na Etapa 2, adiada para cá
- [ ] formulários de chamado (novo, editar, resolver, comentar, enviar, recusar), escopo a definir
