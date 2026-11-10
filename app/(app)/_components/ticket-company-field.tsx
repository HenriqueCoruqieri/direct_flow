import type { Ref } from "react"
import type { ControllerFieldState } from "react-hook-form"

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/app/_components/ui/field"
import { TICKET_COMPANY_LABEL } from "@/app/_lib/domain/ticket-company"
import type { TicketCompanyOption } from "@/app/_lib/types/ticket-company"

import TicketCompanyAutocomplete from "./ticket-company-autocomplete"

interface TicketCompanyFieldProps<TCompany extends TicketCompanyOption> {
  id: string
  value: number | undefined
  disabled?: boolean
  onChange: (value: number | undefined) => void
  onBlur: () => void
  ref?: Ref<HTMLInputElement>
  fieldState: ControllerFieldState
  companies: readonly TCompany[]
  getOptionLabel?: (company: TCompany) => string
  hint?: string
}

const TicketCompanyField = <TCompany extends TicketCompanyOption>({
  id,
  value,
  disabled,
  onChange,
  onBlur,
  ref,
  fieldState,
  companies,
  getOptionLabel,
  hint,
}: TicketCompanyFieldProps<TCompany>) => {
  const labelId = `${id}-label`
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const showHint = !fieldState.invalid && hint !== undefined

  return (
    <Field data-invalid={fieldState.invalid} className="gap-1.5">
      <FieldLabel id={labelId} htmlFor={id}>
        {TICKET_COMPANY_LABEL}
      </FieldLabel>
      <TicketCompanyAutocomplete
        id={id}
        ref={ref}
        companies={companies}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        disabled={disabled}
        getOptionLabel={getOptionLabel}
        aria-labelledby={labelId}
        aria-invalid={fieldState.invalid}
        aria-describedby={
          fieldState.invalid ? errorId : showHint ? hintId : undefined
        }
        aria-required={undefined}
      />
      {fieldState.invalid ? (
        <FieldError id={errorId} errors={[fieldState.error]} />
      ) : null}
      {showHint ? (
        <FieldDescription id={hintId}>{hint}</FieldDescription>
      ) : null}
    </Field>
  )
}

export default TicketCompanyField
