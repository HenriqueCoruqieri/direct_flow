"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2Icon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useId } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/app/_components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/_components/ui/dialog"
import {
  type AssignTicketErrorCode,
  sendTicket,
} from "@/app/_lib/actions/ticket-assignment"
import {
  buildSendTicketFormDefaults,
  describeCurrentAssignee,
  SEND_TICKET_DIALOG_DESCRIPTION,
  SEND_TICKET_LABEL,
  SEND_TICKET_PENDING_LABEL,
  sendTargetOptions,
  sendTicketDialogTitle,
} from "@/app/_lib/domain/ticket-assignment"
import type { DepartmentQueueListItem } from "@/app/_lib/types/department-queue"
import type { AssigneeOption } from "@/app/_lib/types/ticket"
import {
  type SendTicketInput,
  sendTicketSchema,
} from "@/app/_lib/validation/ticket-assignment"

import TicketAssigneeField from "../../_components/ticket-assignee-field"

const FIELD_ERROR_CODES: ReadonlySet<AssignTicketErrorCode> = new Set([
  "INVALID_ASSIGNEE",
  "INVALID_INPUT",
])

const STALE_TICKET_CODES: ReadonlySet<AssignTicketErrorCode> = new Set([
  "CONFLICT",
  "NOT_FOUND",
  "FORBIDDEN",
])

interface SendTicketDialogProps {
  ticket: DepartmentQueueListItem
  assignees: readonly AssigneeOption[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

const SendTicketDialog = ({
  ticket,
  assignees,
  open,
  onOpenChange,
}: SendTicketDialogProps) => {
  const assigneeFieldId = useId()
  const router = useRouter()
  const defaults = buildSendTicketFormDefaults(ticket)

  const form = useForm<SendTicketInput>({
    resolver: zodResolver(sendTicketSchema),
    defaultValues: defaults,
  })

  const isSubmitting = form.formState.isSubmitting

  const close = () => {
    form.reset(defaults)
    onOpenChange(false)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (isSubmitting) return
    if (nextOpen) {
      onOpenChange(true)
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

    if (result.code !== undefined && STALE_TICKET_CODES.has(result.code)) {
      close()
      router.refresh()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-6 overflow-y-auto p-6 sm:max-w-md">
        <form
          noValidate
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-6"
        >
          <DialogHeader>
            <DialogTitle>{sendTicketDialogTitle(ticket.id)}</DialogTitle>
            <DialogDescription>
              {SEND_TICKET_DIALOG_DESCRIPTION}
            </DialogDescription>
          </DialogHeader>

          <Controller
            name="assigneeId"
            control={form.control}
            render={({ field, fieldState }) => (
              <TicketAssigneeField
                id={assigneeFieldId}
                {...field}
                fieldState={fieldState}
                assignees={sendTargetOptions(assignees, ticket.assignedTo)}
                hint={describeCurrentAssignee(ticket.assigneeName)}
              />
            )}
          />

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
      </DialogContent>
    </Dialog>
  )
}

export default SendTicketDialog
