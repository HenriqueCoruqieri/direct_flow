"use client"

import FormField from "@/app/_components/form-field"
import {
  TICKET_ACTIONS_PLACEHOLDER,
  TICKET_ACTIONS_TITLE,
} from "@/app/_lib/domain/ticket-actions"

import { useTicketEdit } from "../_hooks/use-ticket-edit"
import TicketTextArea from "./ticket-text-area"

interface TicketEditActionsProps {
  children: React.ReactNode
}

const TicketEditActions = ({ children }: TicketEditActionsProps) => {
  const { form, includesActions, isEditing } = useTicketEdit()

  if (!isEditing || !includesActions) return children

  return (
    <FormField
      control={form.control}
      name="actions"
      label={TICKET_ACTIONS_TITLE}
      hideLabel
    >
      {(field) => (
        <TicketTextArea {...field} placeholder={TICKET_ACTIONS_PLACEHOLDER} />
      )}
    </FormField>
  )
}

export default TicketEditActions
