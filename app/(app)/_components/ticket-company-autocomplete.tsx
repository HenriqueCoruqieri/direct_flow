import type { Ref } from "react"

import Autocomplete from "@/app/_components/autocomplete"
import type { FormFieldA11yProps } from "@/app/_components/form-field"
import {
  matchesTicketCompanySearch,
  TICKET_COMPANY_EMPTY_SEARCH_MESSAGE,
  TICKET_COMPANY_LABEL,
  TICKET_COMPANY_SEARCH_PLACEHOLDER,
  ticketCompanyOptionLabel,
} from "@/app/_lib/domain/ticket-company"
import type { TicketCompanyOption } from "@/app/_lib/types/ticket-company"

interface TicketCompanyAutocompleteProps<
  TCompany extends TicketCompanyOption,
> extends FormFieldA11yProps {
  value: number | undefined
  disabled?: boolean
  onChange: (value: number | undefined) => void
  onBlur: () => void
  ref?: Ref<HTMLInputElement>
  companies: readonly TCompany[]
  getOptionLabel?: (company: TCompany) => string
}

const companyId = (company: TicketCompanyOption) => company.id

const TicketCompanyAutocomplete = <TCompany extends TicketCompanyOption>({
  id,
  value,
  disabled,
  onChange,
  onBlur,
  ref,
  companies,
  getOptionLabel = ticketCompanyOptionLabel,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
  "aria-required": ariaRequired,
  "aria-labelledby": ariaLabelledBy,
}: TicketCompanyAutocompleteProps<TCompany>) => (
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
    aria-labelledby={ariaLabelledBy}
    aria-invalid={ariaInvalid}
    aria-describedby={ariaDescribedBy}
    aria-required={ariaRequired}
  />
)

export default TicketCompanyAutocomplete
