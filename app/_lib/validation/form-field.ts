import { z } from "zod"

export type FormSchema = z.core.$ZodType

export type FieldSchema = z.core.$ZodType

const FIELD_PATH_SEPARATOR = "."

export const fieldSchemaOf = (
  schema: FormSchema,
  name: string,
): FieldSchema | null => {
  let current: FieldSchema = schema
  for (const segment of name.split(FIELD_PATH_SEPARATOR)) {
    if (!(current instanceof z.ZodObject)) return null
    if (!Object.hasOwn(current.shape, segment)) return null
    current = current.shape[segment]
  }
  return current
}

export const isFieldValueValid = (
  fieldSchema: FieldSchema,
  value: unknown,
): boolean => z.safeParse(fieldSchema, value).success

const EMPTY_FIELD_VALUES: readonly unknown[] = ["", undefined, null]

export const isFieldRequired = (fieldSchema: FieldSchema): boolean =>
  EMPTY_FIELD_VALUES.every((empty) => !isFieldValueValid(fieldSchema, empty))

export const isFieldValueFilled = (value: unknown): boolean => {
  if (value === undefined || value === null || value === "") return false
  if (Array.isArray(value)) return value.length > 0
  return true
}

export const resolveFieldRequired = (
  fieldSchema: FieldSchema | null,
  required: boolean | undefined,
): boolean => {
  if (required !== undefined) return required
  return fieldSchema ? isFieldRequired(fieldSchema) : false
}

export const shouldShowRequiredMark = (
  fieldSchema: FieldSchema | null,
  value: unknown,
  required: boolean | undefined,
): boolean => {
  if (!resolveFieldRequired(fieldSchema, required)) return false
  if (!isFieldValueFilled(value)) return true
  return fieldSchema ? !isFieldValueValid(fieldSchema, value) : false
}
