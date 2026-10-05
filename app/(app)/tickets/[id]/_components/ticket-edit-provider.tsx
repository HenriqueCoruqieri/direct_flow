"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { editTicket } from "@/app/_lib/actions/tickets"
import type { TicketEditFormOptions } from "@/app/_lib/types/ticket-edit"
import {
  type EditTicketInput,
  editTicketSchema,
} from "@/app/_lib/validation/ticket"

import { TicketEditContext } from "../_hooks/use-ticket-edit"

const UNAVAILABLE_TAG_HINT =
  "A tag atual não está disponível. Escolha uma tag ativa do seu setor."

interface TicketEditProviderProps {
  options: TicketEditFormOptions
  children: React.ReactNode
}

const TicketEditProvider = ({ options, children }: TicketEditProviderProps) => {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)

  const form = useForm<EditTicketInput>({
    resolver: zodResolver(editTicketSchema),
    defaultValues: options.defaults,
  })

  const isSubmitting = form.formState.isSubmitting

  const startEditing = () => {
    form.reset(options.defaults)
    setIsEditing(true)
  }

  const cancelEditing = () => {
    if (isSubmitting) return
    form.reset(options.defaults)
    setIsEditing(false)
  }

  const onSubmit = async (values: EditTicketInput) => {
    const result = await editTicket(values)

    if (result.ok) {
      toast.success(result.message)
      setIsEditing(false)
      return
    }

    if (result.code === "NO_CHANGES") {
      toast.info(result.message)
      setIsEditing(false)
      return
    }

    if (result.code === "INVALID_TAG") {
      form.setError("tagId", { message: result.message }, { shouldFocus: true })
      router.refresh()
      return
    }

    toast.error(result.message)

    if (result.code === "FORBIDDEN" || result.code === "NOT_FOUND") {
      setIsEditing(false)
      router.refresh()
    }
  }

  return (
    <TicketEditContext
      value={{
        form,
        tags: options.tags,
        tagHint:
          options.defaults.tagId === undefined
            ? UNAVAILABLE_TAG_HINT
            : undefined,
        includesSolution: options.includesSolution,
        isEditing,
        isSubmitting,
        startEditing,
        cancelEditing,
        save: form.handleSubmit(onSubmit),
      }}
    >
      {children}
    </TicketEditContext>
  )
}

export default TicketEditProvider
