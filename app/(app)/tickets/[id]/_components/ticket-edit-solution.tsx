"use client"

import FormField from "@/app/_components/form-field"

import { useTicketEdit } from "../_hooks/use-ticket-edit"
import { TICKET_SOLUTION_TITLE } from "./ticket-solution-heading"
import TicketTextArea from "./ticket-text-area"

interface TicketEditSolutionProps {
  children: React.ReactNode
}

const TicketEditSolution = ({ children }: TicketEditSolutionProps) => {
  const { form, includesSolution, isEditing } = useTicketEdit()

  if (!isEditing || !includesSolution) return children

  return (
    <FormField
      control={form.control}
      name="solution"
      label={TICKET_SOLUTION_TITLE}
      hideLabel
      required
    >
      {(field) => <TicketTextArea {...field} />}
    </FormField>
  )
}

export default TicketEditSolution
