"use client"

import {
  type Control,
  type FieldPath,
  type FieldPathValue,
  type FieldValues,
  useWatch,
} from "react-hook-form"

import { useFormSchema } from "@/app/_hooks/use-form-schema"
import {
  fieldSchemaOf,
  shouldShowRequiredMark,
} from "@/app/_lib/validation/form-field"

interface FormRequiredMarkProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
  TTransformedValues,
> {
  name: TName
  control?: Control<TFieldValues, unknown, TTransformedValues>
  required?: boolean
  defaultValue?: FieldPathValue<TFieldValues, TName>
}

const FormRequiredMark = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TTransformedValues = TFieldValues,
>({
  name,
  control,
  required,
  defaultValue,
}: FormRequiredMarkProps<TFieldValues, TName, TTransformedValues>) => {
  const value = useWatch({ control, name, defaultValue, exact: true })
  const schema = useFormSchema()
  const fieldSchema = fieldSchemaOf(schema, name)

  if (!shouldShowRequiredMark(fieldSchema, value, required)) return null

  return (
    <span aria-hidden="true" className="text-destructive">
      *
    </span>
  )
}

export default FormRequiredMark
