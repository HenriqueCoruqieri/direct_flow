"use client"

import { useId } from "react"
import {
  type Control,
  type ControllerFieldState,
  type ControllerRenderProps,
  type FieldPath,
  type FieldValues,
  useController,
} from "react-hook-form"

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldTitle,
} from "@/app/_components/ui/field"
import { useFormSchema } from "@/app/_hooks/use-form-schema"
import { cn } from "@/app/_lib/utils"
import {
  fieldSchemaOf,
  resolveFieldRequired,
  shouldShowRequiredMark,
} from "@/app/_lib/validation/form-field"

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
>
  extends ControllerRenderProps<TFieldValues, TName>, FormFieldA11yProps {}

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
>({
  name,
  label,
  control,
  required,
  description,
  labelMode = "for",
  id: idProp,
  className,
  children,
}: FormFieldProps<TFieldValues, TName, TTransformedValues>) => {
  const { field, fieldState } = useController({ name, control })
  const schema = useFormSchema()
  const fieldSchema = fieldSchemaOf(schema, name)
  const isRequired = resolveFieldRequired(fieldSchema, required)
  const showMark = shouldShowRequiredMark(fieldSchema, field.value, required)

  const baseId = useId()
  const id = idProp ?? `${baseId}-control`
  const errorId = `${id}-error`
  const descriptionId = `${id}-description`
  const labelId = `${id}-label`

  const invalid = fieldState.error !== undefined
  const isGroup = labelMode === "group"

  const describedBy = invalid
    ? errorId
    : description
      ? descriptionId
      : undefined

  const a11y: FormFieldA11yProps = {
    id,
    "aria-invalid": invalid,
    "aria-describedby": describedBy,
    "aria-required": isRequired && !isGroup ? true : undefined,
    "aria-labelledby": isGroup ? labelId : undefined,
  }

  const mark = showMark ? (
    <span aria-hidden="true" className="text-destructive">
      *
    </span>
  ) : null

  return (
    <Field data-invalid={invalid} className={cn("gap-1.5", className)}>
      {isGroup ? (
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
  )
}

export default FormField
