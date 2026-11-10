"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2Icon, SendIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import FormField from "@/app/_components/form-field"
import FormSchemaProvider from "@/app/_components/form-schema-provider"
import { Button } from "@/app/_components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/_components/ui/dialog"
import {
  type AssignTicketErrorCode,
  sendTicket,
} from "@/app/_lib/actions/ticket-assignment"
import { formatTicketNumber, isStaleTicketCode } from "@/app/_lib/domain/ticket"
import { TICKET_ASSIGNEE_LABEL } from "@/app/_lib/domain/ticket-assignee"
import {
  buildSendTicketFormDefaults,
  describeCurrentAssignee,
  SEND_TICKET_DIALOG_DESCRIPTION,
  SEND_TICKET_LABEL,
  SEND_TICKET_PENDING_LABEL,
  sendTargetOptions,
  sendTicketDialogTitle,
} from "@/app/_lib/domain/ticket-assignment"
import { HANDOFF_COMMENT_LABEL } from "@/app/_lib/domain/ticket-handoff"
import type { AssigneeOption } from "@/app/_lib/types/ticket"
import type { SendTicketTarget } from "@/app/_lib/types/ticket-assignment"
import {
  type SendTicketInput,
  sendTicketSchema,
} from "@/app/_lib/validation/ticket-assignment"

import HandoffCommentTextarea from "../../../_components/handoff-comment-textarea"
import TicketAssigneeCombobox from "../../../_components/ticket-assignee-combobox"

const FIELD_ERROR_CODES: ReadonlySet<AssignTicketErrorCode> = new Set([
  "INVALID_ASSIGNEE",
  "INVALID_INPUT",
])

export interface SendTicketDialogProps {
  target: SendTicketTarget
  assignees: readonly AssigneeOption[]
}

const SendTicketDialog = ({ target, assignees }: SendTicketDialogProps) => {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const defaults = buildSendTicketFormDefaults(target)

  const form = useForm<SendTicketInput>({
    resolver: zodResolver(sendTicketSchema),
    defaultValues: defaults,
  })

  const isSubmitting = form.formState.isSubmitting

  const close = () => {
    form.reset(defaults)
    setOpen(false)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (isSubmitting) return
    if (nextOpen) {
      setOpen(true)
      return
    }
    close()
  }

  const onSubmit = async (values: SendTicketInput) => {
    const result = await sendTicket(values)

    if (result.ok) {
      toast.success(result.message)
      close()
      return
    }

    if (result.code !== undefined && FIELD_ERROR_CODES.has(result.code)) {
      form.setError(
        "assigneeId",
        { message: result.message },
        { shouldFocus: true },
      )
      if (result.code === "INVALID_ASSIGNEE") router.refresh()
      return
    }

    toast.error(result.message)

    if (isStaleTicketCode(result.code)) {
      close()
      router.refresh()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-label={`${SEND_TICKET_LABEL} o chamado ${formatTicketNumber(target.id)}`}
        >
          <SendIcon aria-hidden="true" className="size-4" />
          {SEND_TICKET_LABEL}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-6 overflow-y-auto p-6 sm:max-w-md">
        <FormSchemaProvider form={form} schema={sendTicketSchema}>
          <form
            noValidate
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-6"
          >
            <DialogHeader>
              <DialogTitle>{sendTicketDialogTitle(target.id)}</DialogTitle>
              <DialogDescription>
                {SEND_TICKET_DIALOG_DESCRIPTION}
              </DialogDescription>
            </DialogHeader>

            <FormField
              control={form.control}
              name="assigneeId"
              label={TICKET_ASSIGNEE_LABEL}
              description={describeCurrentAssignee(target.assigneeName)}
              className="min-w-0"
            >
              {(field) => (
                <TicketAssigneeCombobox
                  {...field}
                  assignees={sendTargetOptions(assignees, target.assignedTo)}
                />
              )}
            </FormField>

            <FormField
              control={form.control}
              name="comment"
              label={HANDOFF_COMMENT_LABEL}
              className="min-w-0"
            >
              {(field) => (
                <HandoffCommentTextarea {...field} disabled={isSubmitting} />
              )}
            </FormField>

            <DialogFooter className="-mx-6 -mb-6 p-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>
                  Cancelar
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={isSubmitting}
                aria-busy={isSubmitting || undefined}
              >
                {isSubmitting ? (
                  <Loader2Icon
                    aria-hidden="true"
                    className="size-4 animate-spin motion-reduce:animate-none"
                  />
                ) : null}
                {isSubmitting ? SEND_TICKET_PENDING_LABEL : SEND_TICKET_LABEL}
              </Button>
            </DialogFooter>
          </form>
        </FormSchemaProvider>
      </DialogContent>
    </Dialog>
  )
}

export default SendTicketDialog
