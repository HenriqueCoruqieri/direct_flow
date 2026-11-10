import { createContext, useContext } from "react"

import type { FormSchema } from "@/app/_lib/validation/form-field"

export const FormSchemaContext = createContext<FormSchema | null>(null)

export const useFormSchema = (): FormSchema => {
  const schema = useContext(FormSchemaContext)
  if (schema === null) {
    throw new Error("useFormSchema precisa estar dentro de FormSchemaProvider.")
  }
  return schema
}
