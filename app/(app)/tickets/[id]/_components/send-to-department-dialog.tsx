"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2Icon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useId, useState } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"

import ComboboxField from "@/app/_components/combobox-field"
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

import HandoffCommentField from "../../../_components/handoff-comment-field"
import TicketAssigneeField from "../../../_components/ticket-assignee-field"

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
  const targetFieldId = useId()
  const assigneeFieldId = useId()
  const commentFieldId = useId()
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
              <Controller
                name="toDepartmentId"
                control={form.control}
                render={({ field, fieldState }) => (
                  <ComboboxField
                    id={targetFieldId}
                    {...field}
                    onChange={(value) => changeTarget(value, field.onChange)}
                    disabled={isBusy}
                    fieldState={fieldState}
                    label={TRANSFER_TARGET_LABEL}
                    options={options.map((option) => ({
                      value: option.id,
                      label: option.name,
                    }))}
                    placeholder={TRANSFER_TARGET_PLACEHOLDER}
                    searchPlaceholder="Buscar setor…"
                    className="min-w-0"
                  />
                )}
              />
              {toDepartmentId !== undefined ? (
                <Controller
                  name="assigneeId"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <TicketAssigneeField
                      id={assigneeFieldId}
                      {...field}
                      disabled={isBusy}
                      fieldState={fieldState}
                      assignees={transferAssigneeOptionsFor(
                        assignees,
                        toDepartmentId,
                      )}
                      queueLabel={TRANSFER_QUEUE_ASSIGNEE_LABEL}
                    />
                  )}
                />
              ) : null}
              <Controller
                name="comment"
                control={form.control}
                render={({ field, fieldState }) => (
                  <HandoffCommentField
                    id={commentFieldId}
                    {...field}
                    disabled={isBusy}
                    fieldState={fieldState}
                  />
                )}
              />
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
      </DialogContent>
    </Dialog>
  )
}

export default SendToDepartmentDialog
