"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { CornerUpLeftIcon, Loader2Icon } from "lucide-react"
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
import { Textarea } from "@/app/_components/ui/textarea"
import { declineTicketTransfer } from "@/app/_lib/actions/ticket-transfer"
import { isStaleTicketCode } from "@/app/_lib/domain/ticket"
import {
  buildDeclineTicketTransferFormDefaults,
  DECLINE_REASON_LABEL,
  DECLINE_REASON_PLACEHOLDER,
  DECLINE_TRANSFER_LABEL,
  DECLINE_TRANSFER_PENDING_LABEL,
  declineTicketTransferDialogTitle,
  describeDeclineDestination,
} from "@/app/_lib/domain/ticket-transfer"
import type { DeclineTicketTransferTarget } from "@/app/_lib/types/ticket-transfer"
import {
  type DeclineTicketTransferInput,
  declineTicketTransferSchema,
} from "@/app/_lib/validation/ticket-transfer"

const isReasonIssue = (reason: string): boolean =>
  !declineTicketTransferSchema.shape.reason.safeParse(reason).success

export interface DeclineTransferDialogProps {
  target: DeclineTicketTransferTarget
  leaveHref: string
}

const DeclineTransferDialog = ({
  target,
  leaveHref,
}: DeclineTransferDialogProps) => {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)

  const defaults = buildDeclineTicketTransferFormDefaults(target)

  const form = useForm<DeclineTicketTransferInput>({
    resolver: zodResolver(declineTicketTransferSchema),
    defaultValues: defaults,
  })

  const isBusy = form.formState.isSubmitting || isLeaving

  const close = () => {
    form.reset(defaults)
    setOpen(false)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (isBusy) return
    if (nextOpen) {
      setOpen(true)
      return
    }
    close()
  }

  const onSubmit = async (values: DeclineTicketTransferInput) => {
    const result = await declineTicketTransfer(values)

    if (result.ok) {
      toast.success(result.message)
      if (result.keepsAccess) {
        close()
        return
      }
      setIsLeaving(true)
      router.replace(leaveHref)
      router.refresh()
      return
    }

    if (result.code === "INVALID_INPUT" && isReasonIssue(values.reason)) {
      form.setError(
        "reason",
        { message: result.message },
        { shouldFocus: true },
      )
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
        <Button type="button" variant="outline">
          <CornerUpLeftIcon aria-hidden="true" className="size-4" />
          {DECLINE_TRANSFER_LABEL}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-6 overflow-y-auto p-6 sm:max-w-md">
        <FormSchemaProvider form={form} schema={declineTicketTransferSchema}>
          <form
            noValidate
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-6"
          >
            <DialogHeader>
              <DialogTitle>
                {declineTicketTransferDialogTitle(target.ticketId)}
              </DialogTitle>
              <DialogDescription>
                {describeDeclineDestination(target.fromDepartmentName)}
              </DialogDescription>
            </DialogHeader>

            <FormField
              control={form.control}
              name="reason"
              label={DECLINE_REASON_LABEL}
            >
              {(field) => (
                <Textarea
                  {...field}
                  disabled={isBusy}
                  placeholder={DECLINE_REASON_PLACEHOLDER}
                  rows={4}
                  className="max-h-60 min-h-24"
                />
              )}
            </FormField>

            <DialogFooter className="-mx-6 -mb-6 p-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isBusy}>
                  Cancelar
                </Button>
              </DialogClose>
              <Button
                type="submit"
                variant="destructive"
                disabled={isBusy}
                aria-busy={isBusy || undefined}
              >
                {isBusy ? (
                  <Loader2Icon
                    aria-hidden="true"
                    className="size-4 animate-spin motion-reduce:animate-none"
                  />
                ) : null}
                {isBusy
                  ? DECLINE_TRANSFER_PENDING_LABEL
                  : DECLINE_TRANSFER_LABEL}
              </Button>
            </DialogFooter>
          </form>
        </FormSchemaProvider>
      </DialogContent>
    </Dialog>
  )
}

export default DeclineTransferDialog
