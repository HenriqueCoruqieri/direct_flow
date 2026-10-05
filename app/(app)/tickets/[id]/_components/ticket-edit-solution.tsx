"use client"

import { useId } from "react"
import { Controller } from "react-hook-form"

import { useTicketEdit } from "../_hooks/use-ticket-edit"
import TicketSolutionField from "./ticket-solution-field"

interface TicketEditSolutionProps {
  children: React.ReactNode
}

const TicketEditSolution = ({ children }: TicketEditSolutionProps) => {
  const solutionId = useId()
  const { form, includesSolution, isEditing } = useTicketEdit()

  if (!isEditing || !includesSolution) return children

  return (
    <Controller
      name="solution"
      control={form.control}
      render={({ field, fieldState }) => (
        <TicketSolutionField
          id={solutionId}
          {...field}
          fieldState={fieldState}
        />
      )}
    />
  )
}

export default TicketEditSolution
