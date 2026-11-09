"use client"

import { useId } from "react"
import { Controller, useWatch } from "react-hook-form"

import { ticketCompanyEditOptionLabel } from "@/app/_lib/domain/ticket-company"

import TicketCompanyField from "../../../_components/ticket-company-field"
import { useTicketEdit } from "../_hooks/use-ticket-edit"

interface TicketEditCompanyProps {
  children: React.ReactNode
}

const TicketEditCompany = ({ children }: TicketEditCompanyProps) => {
  const companyId = useId()
  const { form, companies, companyHint, isEditing } = useTicketEdit()
  const selectedCompanyId = useWatch({
    control: form.control,
    name: "companyId",
  })

  if (!isEditing) return children

  return (
    <Controller
      name="companyId"
      control={form.control}
      render={({ field, fieldState }) => (
        <TicketCompanyField
          id={companyId}
          {...field}
          value={selectedCompanyId}
          fieldState={fieldState}
          companies={companies}
          getOptionLabel={ticketCompanyEditOptionLabel}
          hint={companyHint}
        />
      )}
    />
  )
}

export default TicketEditCompany
