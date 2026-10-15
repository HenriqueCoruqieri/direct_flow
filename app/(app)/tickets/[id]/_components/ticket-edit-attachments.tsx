"use client"

import { Controller } from "react-hook-form"

import type { TicketAttachmentItem } from "@/app/_lib/types/attachment"

import { useTicketEdit } from "../_hooks/use-ticket-edit"
import TicketAttachmentList from "./ticket-attachment-list"
import TicketAttachmentsEditor from "./ticket-attachments-editor"

interface TicketEditAttachmentsProps {
  attachments: readonly TicketAttachmentItem[]
}

const TicketEditAttachments = ({ attachments }: TicketEditAttachmentsProps) => {
  const { form, isEditing } = useTicketEdit()

  if (!isEditing) return <TicketAttachmentList attachments={attachments} />

  return (
    <Controller
      name="attachments"
      control={form.control}
      render={({ field, fieldState }) => (
        <TicketAttachmentsEditor
          ref={field.ref}
          attachments={attachments}
          onChange={field.onChange}
          fieldState={fieldState}
        />
      )}
    />
  )
}

export default TicketEditAttachments
