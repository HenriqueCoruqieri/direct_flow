"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2Icon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import FormField from "@/app/_components/form-field"
import FormSchemaProvider from "@/app/_components/form-schema-provider"
import { Button } from "@/app/_components/ui/button"
import { saveTicketActions } from "@/app/_lib/actions/ticket-actions"
import {
  SAVE_TICKET_ACTIONS_LABEL,
  SAVE_TICKET_ACTIONS_PENDING_LABEL,
  TICKET_ACTIONS_PLACEHOLDER,
  TICKET_ACTIONS_TITLE,
} from "@/app/_lib/domain/ticket-actions"
import type { SaveTicketActionsFormDefaults } from "@/app/_lib/types/ticket-actions"
import {
  type SaveTicketActionsInput,
  saveTicketActionsSchema,
} from "@/app/_lib/validation/ticket-actions"

import TicketTextArea from "./ticket-text-area"

interface TicketActionsFormProps {
  defaults: SaveTicketActionsFormDefaults
}

const TicketActionsForm = ({ defaults }: TicketActionsFormProps) => {
  const router = useRouter()

  const form = useForm<SaveTicketActionsInput>({
    resolver: zodResolver(saveTicketActionsSchema),
    defaultValues: defaults,
  })

  const { isDirty, isSubmitting } = form.formState

  const onSubmit = async (values: SaveTicketActionsInput) => {
    const result = await saveTicketActions(values)

    if (result.ok) {
      toast.success(result.message)
      form.reset(values)
      return
    }

    if (result.code === "INVALID_INPUT") {
      form.setError(
        "actions",
        { message: result.message },
        { shouldFocus: true },
      )
      return
    }

    toast.error(result.message)

    if (result.code === "FORBIDDEN" || result.code === "NOT_FOUND") {
      router.refresh()
    }
  }

  return (
    <FormSchemaProvider form={form} schema={saveTicketActionsSchema}>
      <form
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex min-w-0 flex-col gap-3"
      >
        <FormField
          control={form.control}
          name="actions"
          label={TICKET_ACTIONS_TITLE}
          hideLabel
        >
          {(field) => (
            <TicketTextArea
              {...field}
              placeholder={TICKET_ACTIONS_PLACEHOLDER}
            />
          )}
        </FormField>
        <div className="flex justify-end">
          <Button
            type="submit"
            variant="outline"
            disabled={!isDirty || isSubmitting}
            aria-busy={isSubmitting || undefined}
          >
            {isSubmitting ? (
              <Loader2Icon
                aria-hidden="true"
                className="size-4 animate-spin motion-reduce:animate-none"
              />
            ) : null}
            {isSubmitting
              ? SAVE_TICKET_ACTIONS_PENDING_LABEL
              : SAVE_TICKET_ACTIONS_LABEL}
          </Button>
        </div>
      </form>
    </FormSchemaProvider>
  )
}

export default TicketActionsForm
