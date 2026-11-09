import type { Ref } from "react"
import type { ControllerFieldState } from "react-hook-form"

import Autocomplete from "@/app/_components/autocomplete"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/app/_components/ui/field"
import {
  matchesTicketCompanySearch,
  TICKET_COMPANY_EMPTY_SEARCH_MESSAGE,
  TICKET_COMPANY_LABEL,
  TICKET_COMPANY_SEARCH_PLACEHOLDER,
  ticketCompanyOptionLabel,
} from "@/app/_lib/domain/ticket-company"
import type { TicketCompanyOption } from "@/app/_lib/types/ticket-company"

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

const companyId = (company: TicketCompanyOption) => company.id

const TicketCompanyField = <TCompany extends TicketCompanyOption>({
  id,
  value,
  disabled,
  onChange,
  onBlur,
  ref,
  fieldState,
  companies,
  getOptionLabel = ticketCompanyOptionLabel,
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
      <Autocomplete
        id={id}
        ref={ref}
        options={companies}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        disabled={disabled}
        getOptionValue={companyId}
        getOptionLabel={getOptionLabel}
        filterOption={matchesTicketCompanySearch}
        listLabel={TICKET_COMPANY_LABEL}
        placeholder={TICKET_COMPANY_SEARCH_PLACEHOLDER}
        emptyText={TICKET_COMPANY_EMPTY_SEARCH_MESSAGE}
        aria-labelledby={labelId}
        aria-invalid={fieldState.invalid}
        aria-describedby={
          fieldState.invalid ? errorId : showHint ? hintId : undefined
        }
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
