import { createContext, useContext } from "react"
import type { UseFormReturn } from "react-hook-form"

import type { TagOption } from "@/app/_lib/types/tag"
import type { AssigneeOption } from "@/app/_lib/types/ticket"
import type { EditTicketInput } from "@/app/_lib/validation/ticket"

export interface TicketEditContextValue {
  form: UseFormReturn<EditTicketInput>
  tags: readonly TagOption[]
  tagHint: string | undefined
  assignees: readonly AssigneeOption[]
  assigneeHint: string | undefined
  queueLabel: string
  includesSolution: boolean
  isEditing: boolean
  isSubmitting: boolean
  startEditing: () => void
  cancelEditing: () => void
  save: () => Promise<void>
}

export const TicketEditContext = createContext<TicketEditContextValue | null>(
  null,
)

export const useTicketEdit = (): TicketEditContextValue => {
  const value = useContext(TicketEditContext)
  if (value === null) {
    throw new Error("useTicketEdit precisa estar dentro de TicketEditProvider.")
  }
  return value
}
