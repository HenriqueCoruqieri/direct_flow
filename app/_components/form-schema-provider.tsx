"use client"

import {
  type FieldValues,
  FormProvider,
  type UseFormReturn,
} from "react-hook-form"

import { FormSchemaContext } from "@/app/_hooks/use-form-schema"
import type { FormSchema } from "@/app/_lib/validation/form-field"

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
>({
  form,
  schema,
  children,
}: FormSchemaProviderProps<TFieldValues, TContext, TTransformedValues>) => (
  <FormProvider {...form}>
    <FormSchemaContext value={schema}>{children}</FormSchemaContext>
  </FormProvider>
)

export default FormSchemaProvider
