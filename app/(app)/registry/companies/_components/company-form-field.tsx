import type { FieldError as FormFieldError } from "react-hook-form"

import { Field, FieldError, FieldLabel } from "@/app/_components/ui/field"
import { cn } from "@/app/_lib/utils"

export interface CompanyFieldControlProps {
  id: string
  "aria-invalid": boolean
  "aria-describedby": string | undefined
  "aria-required": true | undefined
}

interface CompanyFormFieldProps {
  id: string
  label: string
  required?: boolean
  error: FormFieldError | undefined
  className?: string
  children: (control: CompanyFieldControlProps) => React.ReactNode
}

const CompanyFormField = ({
  id,
  label,
  required = false,
  error,
  className,
  children,
}: CompanyFormFieldProps) => {
  const errorId = `${id}-error`
  const invalid = error !== undefined

  return (
    <Field data-invalid={invalid} className={cn("gap-1.5", className)}>
      <FieldLabel htmlFor={id} className="gap-0.5">
        {label}
        {required ? <span aria-hidden="true">*</span> : null}
      </FieldLabel>
      {children({
        id,
        "aria-invalid": invalid,
        "aria-describedby": invalid ? errorId : undefined,
        "aria-required": required || undefined,
      })}
      {invalid ? <FieldError id={errorId} errors={[error]} /> : null}
    </Field>
  )
}

export default CompanyFormField
