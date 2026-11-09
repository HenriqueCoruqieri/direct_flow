import type { FieldError as FormFieldError } from "react-hook-form"

import { Field, FieldError, FieldLabel } from "@/app/_components/ui/field"
import { cn } from "@/app/_lib/utils"
import type { CompanyRequiredField } from "@/app/_lib/validation/company"

import CompanyRequiredMark from "./company-required-mark"

export interface CompanyFieldControlProps {
  id: string
  "aria-invalid": boolean
  "aria-describedby": string | undefined
  "aria-required": true | undefined
}

interface CompanyFormFieldProps {
  id: string
  label: string
  requiredField?: CompanyRequiredField
  error: FormFieldError | undefined
  className?: string
  children: (control: CompanyFieldControlProps) => React.ReactNode
}

const CompanyFormField = ({
  id,
  label,
  requiredField,
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
        {requiredField ? <CompanyRequiredMark field={requiredField} /> : null}
      </FieldLabel>
      {children({
        id,
        "aria-invalid": invalid,
        "aria-describedby": invalid ? errorId : undefined,
        "aria-required": requiredField ? true : undefined,
      })}
      {invalid ? <FieldError id={errorId} errors={[error]} /> : null}
    </Field>
  )
}

export default CompanyFormField
