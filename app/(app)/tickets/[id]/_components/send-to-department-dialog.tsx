"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2Icon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useId, useState } from "react"
import { Controller, useForm } from "react-hook-form"
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
import {
  sendTicketToDepartment,
  type SendTicketToDepartmentErrorCode,
} from "@/app/_lib/actions/ticket-transfer"
import {
  NO_TRANSFER_TARGETS_MESSAGE,
  SEND_TO_DEPARTMENT_DIALOG_DESCRIPTION,
  SEND_TO_DEPARTMENT_PENDING_LABEL,
  SEND_TO_DEPARTMENT_SUBMIT_LABEL,
  sendToDepartmentDialogTitle,
  TRANSFER_TARGET_LABEL,
  TRANSFER_TARGET_PLACEHOLDER,
} from "@/app/_lib/domain/ticket-transfer"
import type { DepartmentOption } from "@/app/_lib/types/department"
import type { SendToDepartmentFormDefaults } from "@/app/_lib/types/ticket-transfer"
import {
  type SendTicketToDepartmentInput,
  sendTicketToDepartmentSchema,
} from "@/app/_lib/validation/ticket-transfer"

const STALE_TICKET_CODES: ReadonlySet<SendTicketToDepartmentErrorCode> =
  new Set(["CONFLICT", "NOT_FOUND", "FORBIDDEN"])

export interface SendToDepartmentSetup {
  defaults: SendToDepartmentFormDefaults
  options: DepartmentOption[]
  leaveHref: string
}

interface SendToDepartmentDialogProps extends SendToDepartmentSetup {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const SendToDepartmentDialog = ({
  defaults,
  options,
  leaveHref,
  open,
  onOpenChange,
}: SendToDepartmentDialogProps) => {
  const targetFieldId = useId()
  const router = useRouter()
  const [isLeaving, setIsLeaving] = useState(false)

  const form = useForm<SendTicketToDepartmentInput>({
    resolver: zodResolver(sendTicketToDepartmentSchema),
    defaultValues: defaults,
  })

  const isBusy = form.formState.isSubmitting || isLeaving
  const hasTargets = options.length > 0

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
            <DialogTitle>
              {sendToDepartmentDialogTitle(defaults.ticketId)}
            </DialogTitle>
            <DialogDescription>
              {SEND_TO_DEPARTMENT_DIALOG_DESCRIPTION}
            </DialogDescription>
          </DialogHeader>

          {hasTargets ? (
            <Controller
              name="toDepartmentId"
              control={form.control}
              render={({ field, fieldState }) => (
                <ComboboxField
                  id={targetFieldId}
                  {...field}
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
