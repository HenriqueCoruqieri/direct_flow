"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2Icon, SendIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useId, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/app/_components/ui/button"
import { resolveTicket } from "@/app/_lib/actions/ticket-resolution"
import { RESOLUTION_ATTACHMENTS_NOTICE } from "@/app/_lib/domain/ticket-resolution"
import { SEND_TO_DEPARTMENT_LABEL } from "@/app/_lib/domain/ticket-transfer"
import type { ResolveTicketFormDefaults } from "@/app/_lib/types/ticket-resolution"
import { cn } from "@/app/_lib/utils"
import {
  type ResolveTicketInput,
  resolveTicketSchema,
} from "@/app/_lib/validation/ticket-resolution"

import AttachmentUploader from "../../../_components/attachment-uploader"
import {
  type AttachmentUploaderBusy,
  attachmentUploadsBlockMessage,
} from "../../../_hooks/use-attachment-uploads"
import SendToDepartmentDialog, {
  type SendToDepartmentSetup,
} from "./send-to-department-dialog"
import TicketSolutionField from "./ticket-solution-field"

interface ResolveTicketFormProps {
  defaults: ResolveTicketFormDefaults
  sendToDepartment: SendToDepartmentSetup | null
  canAttach: boolean
}

const ResolveTicketForm = ({
  defaults,
  sendToDepartment,
  canAttach,
}: ResolveTicketFormProps) => {
  const solutionId = useId()
  const submitBlockId = useId()
  const router = useRouter()
  const [isSendDialogOpen, setIsSendDialogOpen] = useState(false)
  const [uploadsBusy, setUploadsBusy] = useState<AttachmentUploaderBusy>("idle")
  const [uploaderShown, setUploaderShown] = useState(canAttach)

  if (uploaderShown !== canAttach) {
    setUploaderShown(canAttach)
    setUploadsBusy("idle")
  }

  const form = useForm<ResolveTicketInput>({
    resolver: zodResolver(resolveTicketSchema),
    defaultValues: defaults,
  })

  const isSubmitting = form.formState.isSubmitting
  const submitBlockMessage = canAttach
    ? attachmentUploadsBlockMessage(uploadsBusy)
    : null

  const onSubmit = async (values: ResolveTicketInput) => {
    const result = await resolveTicket(
      canAttach ? values : { ...values, attachments: [] },
    )

    if (result.ok) {
      toast.success(result.message)
      return
    }

    if (result.code === "INVALID_INPUT") {
      form.setError(
        "solution",
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

  const submitWhenValid = form.handleSubmit(onSubmit)

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    if (submitBlockMessage !== null) {
      event.preventDefault()
      toast.info(submitBlockMessage, { id: submitBlockId })
      return
    }

    return submitWhenValid(event)
  }

  const formActions = (
    <>
      {sendToDepartment !== null ? (
        <Button
          type="button"
          variant="outline"
          disabled={isSubmitting}
          aria-haspopup="dialog"
          onClick={() => setIsSendDialogOpen(true)}
        >
          <SendIcon aria-hidden="true" className="size-4" />
          {SEND_TO_DEPARTMENT_LABEL}
        </Button>
      ) : null}
      <Button
        type="submit"
        disabled={isSubmitting}
        aria-busy={isSubmitting || undefined}
        aria-disabled={submitBlockMessage !== null || undefined}
        aria-describedby={
          submitBlockMessage !== null ? submitBlockId : undefined
        }
        className={cn(
          submitBlockMessage !== null &&
            "cursor-not-allowed opacity-50 hover:bg-primary",
        )}
      >
        {isSubmitting ? (
          <Loader2Icon
            aria-hidden="true"
            className="size-4 animate-spin motion-reduce:animate-none"
          />
        ) : null}
        {isSubmitting ? "Resolvendo…" : "Resolver"}
      </Button>
      {submitBlockMessage !== null ? (
        <span id={submitBlockId} className="sr-only">
          {submitBlockMessage}
        </span>
      ) : null}
    </>
  )

  return (
    <>
      <form
        noValidate
        onSubmit={handleFormSubmit}
        className="flex min-w-0 flex-col gap-4"
      >
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

        {canAttach ? (
          <Controller
            name="attachments"
            control={form.control}
            shouldUnregister
            render={({ field, fieldState }) => (
              <AttachmentUploader
                ref={field.ref}
                onChange={field.onChange}
                onBusyChange={setUploadsBusy}
                disabled={isSubmitting}
                notice={
                  sendToDepartment !== null
                    ? RESOLUTION_ATTACHMENTS_NOTICE
                    : undefined
                }
                actions={formActions}
                fieldState={fieldState}
              />
            )}
          />
        ) : (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border-subtle pt-4">
            {formActions}
          </div>
        )}
      </form>

      {sendToDepartment !== null ? (
        <SendToDepartmentDialog
          {...sendToDepartment}
          open={isSendDialogOpen}
          onOpenChange={setIsSendDialogOpen}
        />
      ) : null}
    </>
  )
}

export default ResolveTicketForm
