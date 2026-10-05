"use client"

import { useId } from "react"
import { Controller } from "react-hook-form"

import TicketDescriptionField from "../../../_components/ticket-description-field"
import { useTicketEdit } from "../_hooks/use-ticket-edit"

interface TicketEditDescriptionProps {
  children: React.ReactNode
}

const TicketEditDescription = ({ children }: TicketEditDescriptionProps) => {
  const descriptionId = useId()
  const { form, isEditing } = useTicketEdit()

  if (!isEditing) return children

  return (
    <Controller
      name="description"
      control={form.control}
      render={({ field, fieldState }) => (
        <TicketDescriptionField
          id={descriptionId}
          {...field}
          fieldState={fieldState}
          hideLabel
        />
      )}
    />
  )
}

export default TicketEditDescription
