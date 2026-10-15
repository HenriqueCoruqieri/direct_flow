"use client"

import { InfoIcon } from "lucide-react"
import { useEffect, useId, useRef } from "react"
import {
  type ControllerFieldState,
  useFormState,
  useWatch,
} from "react-hook-form"

import { FieldError } from "@/app/_components/ui/field"
import {
  ATTACHMENT_INVALID_REFERENCE_MESSAGE,
  TICKET_ATTACHMENTS_LIMIT_MESSAGE,
  TICKET_ATTACHMENTS_LIMITS_HINT,
} from "@/app/_lib/domain/attachment"
import {
  describeTicketAttachmentSlots,
  TICKET_ATTACHMENTS_EDIT_NOTICE,
  ticketAttachmentSlotsLeft,
} from "@/app/_lib/domain/ticket-attachment"
import type {
  TicketAttachmentItem,
  UploadedAttachmentRef,
} from "@/app/_lib/types/attachment"

import AttachmentFilePicker from "../../../_components/attachment-file-picker"
import AttachmentUploadItem from "../../../_components/attachment-upload-item"
import { useAttachmentUploads } from "../../../_hooks/use-attachment-uploads"
import { useTicketEdit } from "../_hooks/use-ticket-edit"
import TicketAttachmentTile from "./ticket-attachment-tile"
import TicketAttachmentsFrame from "./ticket-attachments-frame"

interface TicketAttachmentsEditorProps {
  attachments: readonly TicketAttachmentItem[]
  onChange: (value: UploadedAttachmentRef[]) => void
  ref?: React.Ref<HTMLButtonElement>
  fieldState: ControllerFieldState
}

const STRIP_ITEM_CLASS = "w-34 shrink-0"

const TicketAttachmentsEditor = ({
  attachments,
  onChange,
  ref,
  fieldState,
}: TicketAttachmentsEditorProps) => {
  const hintId = useId()
  const slotsId = useId()
  const noticeId = useId()
  const buttonId = useId()
  const errorId = useId()
  const listRef = useRef<HTMLUListElement>(null)
  const shownUploadsRef = useRef(0)
  const { form, isSubmitting, onUploadsBusyChange } = useTicketEdit()
  const storedRemovedIds = useWatch({
    control: form.control,
    name: "removedAttachmentIds",
  })
  const { errors } = useFormState({
    control: form.control,
    name: "removedAttachmentIds",
  })

  const savedIds = attachments.map(({ id }) => id)
  const removedIds = (storedRemovedIds ?? []).filter((id) =>
    savedIds.includes(id),
  )
  const hasStaleRemovedIds =
    removedIds.length !== (storedRemovedIds?.length ?? 0)
  const keptAttachments = attachments.filter(
    ({ id }) => !removedIds.includes(id),
  )
  const counts = { saved: attachments.length, removed: removedIds.length }

  const { items, addFiles, remove } = useAttachmentUploads({
    onChange,
    onBusyChange: onUploadsBusyChange,
    maxFiles: ticketAttachmentSlotsLeft({ ...counts, added: 0 }),
    tooManyMessage: TICKET_ATTACHMENTS_LIMIT_MESSAGE,
  })

  const slots = ticketAttachmentSlotsLeft({ ...counts, added: items.length })
  const hasNoSlots = slots === 0

  useEffect(() => {
    if (hasStaleRemovedIds) form.setValue("removedAttachmentIds", removedIds)
  }, [form, hasStaleRemovedIds, removedIds])

  useEffect(() => {
    if (items.length > shownUploadsRef.current) {
      listRef.current?.lastElementChild?.scrollIntoView({
        block: "nearest",
        inline: "nearest",
      })
    }
    shownUploadsRef.current = items.length
  }, [items.length])

  const focusPicker = () => document.getElementById(buttonId)?.focus()

  const handleRemoveSaved = (id: number) => {
    form.setValue("removedAttachmentIds", [...removedIds, id], {
      shouldDirty: true,
    })
    focusPicker()
  }

  const handleRemoveUpload = (id: number) => {
    remove(id)
    focusPicker()
  }

  const fieldError = fieldState.invalid
    ? (fieldState.error?.message ?? ATTACHMENT_INVALID_REFERENCE_MESSAGE)
    : (errors.removedAttachmentIds?.message ?? null)
  const descriptionIds = `${hintId} ${slotsId} ${noticeId}`

  return (
    <TicketAttachmentsFrame
      isEmpty={keptAttachments.length === 0 && items.length === 0}
      describedBy={
        fieldError !== null ? `${descriptionIds} ${errorId}` : descriptionIds
      }
      announceChanges
      listRef={listRef}
      details={
        <>
          <p id={hintId} className="text-xs text-muted-foreground">
            {TICKET_ATTACHMENTS_LIMITS_HINT}
          </p>
          <p id={slotsId} className="text-xs text-muted-foreground">
            {describeTicketAttachmentSlots(slots)}
          </p>
          <p
            id={noticeId}
            className="flex items-start gap-1 text-xs text-muted-foreground"
          >
            <InfoIcon aria-hidden="true" className="mt-px size-3.5 shrink-0" />
            <span className="min-w-0">{TICKET_ATTACHMENTS_EDIT_NOTICE}</span>
          </p>
        </>
      }
      action={
        <AttachmentFilePicker
          ref={ref}
          id={buttonId}
          disabled={isSubmitting}
          invalid={fieldState.invalid}
          describedBy={hasNoSlots ? slotsId : undefined}
          blockedMessage={hasNoSlots ? TICKET_ATTACHMENTS_LIMIT_MESSAGE : null}
          onFiles={(files) => void addFiles(files)}
        />
      }
      footer={
        fieldError !== null ? (
          <FieldError id={errorId}>{fieldError}</FieldError>
        ) : null
      }
    >
      {keptAttachments.map((attachment) => (
        <TicketAttachmentTile
          key={attachment.id}
          attachment={attachment}
          disabled={isSubmitting}
          onRemove={() => handleRemoveSaved(attachment.id)}
        />
      ))}
      {items.map((item) => (
        <AttachmentUploadItem
          key={item.id}
          fileName={item.file.name}
          sizeBytes={item.file.size}
          status={item.status}
          error={item.error}
          disabled={isSubmitting}
          onRemove={() => handleRemoveUpload(item.id)}
          className={STRIP_ITEM_CLASS}
        />
      ))}
    </TicketAttachmentsFrame>
  )
}

export default TicketAttachmentsEditor
