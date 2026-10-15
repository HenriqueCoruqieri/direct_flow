"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useId, useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"

import { editTicket } from "@/app/_lib/actions/tickets"
import { TICKET_ATTACHMENTS_LIMIT_MESSAGE } from "@/app/_lib/domain/attachment"
import { exceedsTicketAttachmentsLimit } from "@/app/_lib/domain/ticket-attachment"
import { isHandoffAssigneeChange } from "@/app/_lib/domain/ticket-handoff"
import type { TicketEditFormOptions } from "@/app/_lib/types/ticket-edit"
import {
  type EditTicketInput,
  editTicketSchema,
} from "@/app/_lib/validation/ticket"

import {
  type AttachmentUploaderBusy,
  attachmentUploadsBlockMessage,
} from "../../../_hooks/use-attachment-uploads"
import { TicketEditContext } from "../_hooks/use-ticket-edit"

interface TicketEditProviderProps {
  options: TicketEditFormOptions
  savedAttachmentCount: number
  children: React.ReactNode
}

const TicketEditProvider = ({
  options,
  savedAttachmentCount,
  children,
}: TicketEditProviderProps) => {
  const router = useRouter()
  const saveBlockToastId = useId()
  const [isEditing, setIsEditing] = useState(false)
  const [uploadsBusy, setUploadsBusy] = useState<AttachmentUploaderBusy>("idle")

  const form = useForm<EditTicketInput>({
    resolver: zodResolver(editTicketSchema),
    defaultValues: options.defaults,
  })

  const addedAttachments = useWatch({
    control: form.control,
    name: "attachments",
  })
  const removedAttachmentIds = useWatch({
    control: form.control,
    name: "removedAttachmentIds",
  })

  const isSubmitting = form.formState.isSubmitting
  const uploadsBlockMessage = attachmentUploadsBlockMessage(uploadsBusy)
  const exceedsLimit = exceedsTicketAttachmentsLimit({
    saved: savedAttachmentCount,
    removed: removedAttachmentIds?.length ?? 0,
    added: addedAttachments?.length ?? 0,
  })
  const saveBlockMessage =
    uploadsBlockMessage ??
    (exceedsLimit ? TICKET_ATTACHMENTS_LIMIT_MESSAGE : null)

  const stopEditing = () => {
    setIsEditing(false)
    setUploadsBusy("idle")
  }

  const startEditing = () => {
    form.reset(options.defaults)
    setUploadsBusy("idle")
    setIsEditing(true)
  }

  const cancelEditing = () => {
    if (isSubmitting) return
    form.reset(options.defaults)
    stopEditing()
  }

  const onSubmit = async (values: EditTicketInput) => {
    const result = await editTicket(values)

    if (result.ok) {
      toast.success(result.message)
      stopEditing()
      return
    }

    if (result.code === "NO_CHANGES") {
      toast.info(result.message)
      stopEditing()
      return
    }

    if (result.code === "INVALID_TAG") {
      form.setError("tagId", { message: result.message }, { shouldFocus: true })
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

    if (result.code === "HANDOFF_COMMENT_REQUIRED") {
      if (
        isHandoffAssigneeChange(
          options.defaults.assigneeId,
          form.getValues("assigneeId"),
        )
      ) {
        form.setError(
          "handoffComment",
          { message: result.message },
          { shouldFocus: true },
        )
        return
      }
      toast.error(result.message)
      router.refresh()
      return
    }

    toast.error(result.message)

    if (result.code === "FORBIDDEN" || result.code === "NOT_FOUND") {
      stopEditing()
      router.refresh()
      return
    }

    if (
      result.code === "ATTACHMENT_NOT_FOUND" ||
      result.code === "ATTACHMENTS_LIMIT"
    ) {
      router.refresh()
    }
  }

  const submitWhenValid = form.handleSubmit(onSubmit)

  const save = async () => {
    if (uploadsBlockMessage !== null) {
      toast.info(uploadsBlockMessage, { id: saveBlockToastId })
      return
    }
    if (exceedsLimit) {
      toast.error(TICKET_ATTACHMENTS_LIMIT_MESSAGE, { id: saveBlockToastId })
      return
    }
    await submitWhenValid()
  }

  return (
    <TicketEditContext
      value={{
        form,
        tags: options.tags,
        tagHint: options.tagHint,
        assignees: options.assignees,
        assigneeHint: options.assigneeHint,
        initialAssigneeId: options.defaults.assigneeId,
        queueLabel: options.queueLabel,
        includesSolution: options.includesSolution,
        isEditing,
        isSubmitting,
        saveBlockMessage,
        onUploadsBusyChange: setUploadsBusy,
        startEditing,
        cancelEditing,
        save,
      }}
    >
      {children}
    </TicketEditContext>
  )
}

export default TicketEditProvider
