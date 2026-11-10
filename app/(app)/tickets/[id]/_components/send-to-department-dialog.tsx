"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2Icon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"

import Combobox from "@/app/_components/combobox"
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
} from "@/app/_components/ui/dialog"
import { sendTicketToDepartment } from "@/app/_lib/actions/ticket-transfer"
import { isStaleTicketCode } from "@/app/_lib/domain/ticket"
import { TICKET_ASSIGNEE_LABEL } from "@/app/_lib/domain/ticket-assignee"
import { HANDOFF_COMMENT_LABEL } from "@/app/_lib/domain/ticket-handoff"
import {
  NO_TRANSFER_TARGETS_MESSAGE,
  SEND_TO_DEPARTMENT_DIALOG_DESCRIPTION,
  SEND_TO_DEPARTMENT_PENDING_LABEL,
  SEND_TO_DEPARTMENT_SUBMIT_LABEL,
  sendToDepartmentDialogTitle,
  TRANSFER_QUEUE_ASSIGNEE_LABEL,
  TRANSFER_TARGET_LABEL,
  TRANSFER_TARGET_PLACEHOLDER,
  transferAssigneeOptionsFor,
} from "@/app/_lib/domain/ticket-transfer"
import type { DepartmentOption } from "@/app/_lib/types/department"
import type {
  SendToDepartmentFormDefaults,
  TransferAssigneeOption,
} from "@/app/_lib/types/ticket-transfer"
import {
  type SendTicketToDepartmentInput,
  sendTicketToDepartmentSchema,
} from "@/app/_lib/validation/ticket-transfer"

import HandoffCommentTextarea from "../../../_components/handoff-comment-textarea"
import TicketAssigneeCombobox from "../../../_components/ticket-assignee-combobox"

export interface SendToDepartmentSetup {
  defaults: SendToDepartmentFormDefaults
  options: DepartmentOption[]
  assignees: TransferAssigneeOption[]
  leaveHref: string
}

interface SendToDepartmentDialogProps extends SendToDepartmentSetup {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const SendToDepartmentDialog = ({
  defaults,
  options,
  assignees,
  leaveHref,
  open,
  onOpenChange,
}: SendToDepartmentDialogProps) => {
  const router = useRouter()
  const [isLeaving, setIsLeaving] = useState(false)

  const form = useForm<SendTicketToDepartmentInput>({
    resolver: zodResolver(sendTicketToDepartmentSchema),
    defaultValues: defaults,
  })

  const toDepartmentId = useWatch({
    control: form.control,
    name: "toDepartmentId",
  })

  const isBusy = form.formState.isSubmitting || isLeaving
  const hasTargets = options.length > 0

  const changeTarget = (
    nextDepartmentId: number,
    onChange: (value: number) => void,
  ) => {
    onChange(nextDepartmentId)
    if (nextDepartmentId === toDepartmentId) return
    form.setValue("assigneeId", null)
    form.clearErrors("assigneeId")
  }

  const close = () => {
    form.reset(defaults)
    onOpenChange(false)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (isBusy) return
    if (nextOpen) {
      onOpenChange(true)
      return
    }
    close()
  }

  const onSubmit = async (values: SendTicketToDepartmentInput) => {
    const result = await sendTicketToDepartment(values)

    if (result.ok) {
      toast.success(result.message)
      if (result.keepsAccess) {
        close()
        return
      }
      setIsLeaving(true)
      router.replace(leaveHref)
      return
    }

    if (result.code === "INVALID_TARGET") {
      form.setError(
        "toDepartmentId",
        { message: result.message },
        { shouldFocus: true },
      )
      router.refresh()
      return
    }

    if (result.code === "INVALID_ASSIGNEE") {
      form.setError(
        "assigneeId",
        { message: result.message },
        { shouldFocus: true },
      )
      router.refresh()
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
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-6 overflow-y-auto p-6 sm:max-w-md">
        <FormSchemaProvider form={form} schema={sendTicketToDepartmentSchema}>
          <form
            noValidate
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-6"
          >
            <DialogHeader>
              <DialogTitle>
                {sendToDepartmentDialogTitle(defaults.ticketId)}
              </DialogTitle>
              <DialogDescription>
                {SEND_TO_DEPARTMENT_DIALOG_DESCRIPTION}
              </DialogDescription>
            </DialogHeader>

            {hasTargets ? (
              <>
                <FormField
                  control={form.control}
                  name="toDepartmentId"
                  label={TRANSFER_TARGET_LABEL}
                  className="min-w-0"
                >
                  {(field) => (
                    <Combobox
                      ref={field.ref}
                      id={field.id}
                      value={field.value}
                      onChange={(value) => changeTarget(value, field.onChange)}
                      onBlur={field.onBlur}
                      disabled={isBusy}
                      aria-invalid={field["aria-invalid"]}
                      aria-describedby={field["aria-describedby"]}
                      aria-required={field["aria-required"]}
                      aria-labelledby={field["aria-labelledby"]}
                      options={options.map((option) => ({
                        value: option.id,
                        label: option.name,
                      }))}
                      placeholder={TRANSFER_TARGET_PLACEHOLDER}
                      searchPlaceholder="Buscar setor…"
                    />
                  )}
                </FormField>
                {toDepartmentId !== undefined ? (
                  <FormField
                    control={form.control}
                    name="assigneeId"
                    label={TICKET_ASSIGNEE_LABEL}
                    className="min-w-0"
                  >
                    {(field) => (
                      <TicketAssigneeCombobox
                        {...field}
                        disabled={isBusy}
                        assignees={transferAssigneeOptionsFor(
                          assignees,
                          toDepartmentId,
                        )}
                        queueLabel={TRANSFER_QUEUE_ASSIGNEE_LABEL}
                      />
                    )}
                  </FormField>
                ) : null}
                <FormField
                  control={form.control}
                  name="comment"
                  label={HANDOFF_COMMENT_LABEL}
                  className="min-w-0"
                >
                  {(field) => (
                    <HandoffCommentTextarea {...field} disabled={isBusy} />
                  )}
                </FormField>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                {NO_TRANSFER_TARGETS_MESSAGE}
              </p>
            )}

            <DialogFooter className="-mx-6 -mb-6 p-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isBusy}>
                  Cancelar
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={isBusy || !hasTargets}
                aria-busy={isBusy || undefined}
              >
                {isBusy ? (
                  <Loader2Icon
                    aria-hidden="true"
                    className="size-4 animate-spin motion-reduce:animate-none"
                  />
                ) : null}
                {isBusy
                  ? SEND_TO_DEPARTMENT_PENDING_LABEL
                  : SEND_TO_DEPARTMENT_SUBMIT_LABEL}
              </Button>
            </DialogFooter>
          </form>
        </FormSchemaProvider>
      </DialogContent>
    </Dialog>
  )
}

export default SendToDepartmentDialog
