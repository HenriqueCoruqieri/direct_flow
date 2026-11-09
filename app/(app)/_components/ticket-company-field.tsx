import ComboboxField, {
  type ComboboxFieldProps,
} from "@/app/_components/combobox-field"
import {
  TICKET_COMPANY_LABEL,
  TICKET_COMPANY_PLACEHOLDER,
  TICKET_COMPANY_SEARCH_PLACEHOLDER,
  ticketCompanyOptionLabel,
} from "@/app/_lib/domain/ticket-company"
import type { TicketCompanyOption } from "@/app/_lib/types/ticket-company"

interface TicketCompanyFieldProps extends Omit<
  ComboboxFieldProps<number>,
  "label" | "options" | "placeholder" | "searchPlaceholder" | "className"
> {
  companies: readonly TicketCompanyOption[]
}

const TicketCompanyField = ({
  companies,
  ...props
}: TicketCompanyFieldProps) => (
  <ComboboxField
    {...props}
    label={TICKET_COMPANY_LABEL}
    options={companies.map((company) => ({
      value: company.id,
      label: ticketCompanyOptionLabel(company),
    }))}
    placeholder={TICKET_COMPANY_PLACEHOLDER}
    searchPlaceholder={TICKET_COMPANY_SEARCH_PLACEHOLDER}
  />
)

export default TicketCompanyField
