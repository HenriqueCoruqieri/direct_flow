"use client"

import FormField from "@/app/_components/form-field"

import { useTicketEdit } from "../_hooks/use-ticket-edit"
import TicketSolutionTextarea from "./ticket-solution-textarea"

interface TicketEditSolutionProps {
  children: React.ReactNode
}

const TicketEditSolution = ({ children }: TicketEditSolutionProps) => {
  const { form, includesSolution, isEditing } = useTicketEdit()

  if (!isEditing || !includesSolution) return children

  return (
    <FormField control={form.control} name="solution" label="Solução" required>
      {(field) => <TicketSolutionTextarea {...field} />}
    </FormField>
  )
}

export default TicketEditSolution
