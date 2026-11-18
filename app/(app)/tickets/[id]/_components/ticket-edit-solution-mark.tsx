"use client"

import FormRequiredMark from "@/app/_components/form-required-mark"

import { useTicketEdit } from "../_hooks/use-ticket-edit"

const TicketEditSolutionMark = () => {
  const { form, includesSolution, isEditing } = useTicketEdit()

  if (!isEditing || !includesSolution) return null

  return <FormRequiredMark control={form.control} name="solution" required />
}

export default TicketEditSolutionMark
