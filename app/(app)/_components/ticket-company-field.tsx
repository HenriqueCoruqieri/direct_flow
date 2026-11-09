import type { Ref } from "react"
import type { ControllerFieldState } from "react-hook-form"

import Autocomplete from "@/app/_components/autocomplete"
import { Field, FieldError, FieldLabel } from "@/app/_components/ui/field"
import {
  matchesTicketCompanySearch,
  TICKET_COMPANY_EMPTY_SEARCH_MESSAGE,
  TICKET_COMPANY_LABEL,
  TICKET_COMPANY_SEARCH_PLACEHOLDER,
  ticketCompanyOptionLabel,
} from "@/app/_lib/domain/ticket-company"
import type { TicketCompanyOption } from "@/app/_lib/types/ticket-company"

interface TicketCompanyFieldProps {
  id: string
  value: number | undefined
  disabled?: boolean
  onChange: (value: number | undefined) => void
  onBlur: () => void
  ref?: Ref<HTMLInputElement>
  fieldState: ControllerFieldState
  companies: readonly TicketCompanyOption[]
}

const companyId = (company: TicketCompanyOption) => company.id

const TicketCompanyField = ({
  id,
  value,
  disabled,
  onChange,
  onBlur,
  ref,
  fieldState,
  companies,
}: TicketCompanyFieldProps) => {
  const labelId = `${id}-label`
  const errorId = `${id}-error`

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
        getOptionLabel={ticketCompanyOptionLabel}
        filterOption={matchesTicketCompanySearch}
        listLabel={TICKET_COMPANY_LABEL}
        placeholder={TICKET_COMPANY_SEARCH_PLACEHOLDER}
        emptyText={TICKET_COMPANY_EMPTY_SEARCH_MESSAGE}
        aria-labelledby={labelId}
        aria-invalid={fieldState.invalid}
        aria-describedby={fieldState.invalid ? errorId : undefined}
      />
      {fieldState.invalid ? (
        <FieldError id={errorId} errors={[fieldState.error]} />
      ) : null}
    </Field>
  )
}

export default TicketCompanyField
