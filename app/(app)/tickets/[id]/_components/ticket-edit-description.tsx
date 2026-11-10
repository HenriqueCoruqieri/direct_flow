"use client"

import FormField from "@/app/_components/form-field"

import TicketDescriptionTextarea from "../../../_components/ticket-description-textarea"
import { useTicketEdit } from "../_hooks/use-ticket-edit"

interface TicketEditDescriptionProps {
  children: React.ReactNode
}

const TicketEditDescription = ({ children }: TicketEditDescriptionProps) => {
  const { form, isEditing } = useTicketEdit()

  if (!isEditing) return children

  return (
    <FormField
      control={form.control}
      name="description"
      label="Descrição"
      hideLabel
    >
      {(field) => <TicketDescriptionTextarea {...field} />}
    </FormField>
  )
}

export default TicketEditDescription
