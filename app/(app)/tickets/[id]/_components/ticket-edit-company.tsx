"use client"

import FormField from "@/app/_components/form-field"
import {
  TICKET_COMPANY_LABEL,
  ticketCompanyEditOptionLabel,
} from "@/app/_lib/domain/ticket-company"

import TicketCompanyAutocomplete from "../../../_components/ticket-company-autocomplete"
import { useTicketEdit } from "../_hooks/use-ticket-edit"

interface TicketEditCompanyProps {
  children: React.ReactNode
}

const TicketEditCompany = ({ children }: TicketEditCompanyProps) => {
  const { form, companies, companyHint, isEditing } = useTicketEdit()

  if (!isEditing) return children

  return (
    <FormField
      control={form.control}
      name="companyId"
      label={TICKET_COMPANY_LABEL}
      description={companyHint}
    >
      {(field) => (
        <TicketCompanyAutocomplete
          {...field}
          companies={companies}
          getOptionLabel={ticketCompanyEditOptionLabel}
        />
      )}
    </FormField>
  )
}

export default TicketEditCompany
