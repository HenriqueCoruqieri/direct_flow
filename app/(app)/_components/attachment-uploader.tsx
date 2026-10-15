"use client"

import { useId } from "react"
import type { ControllerFieldState } from "react-hook-form"

import { FieldError, FieldTitle } from "@/app/_components/ui/field"
import {
  ATTACHMENT_INVALID_REFERENCE_MESSAGE,
  ATTACHMENT_LIMITS_HINT,
} from "@/app/_lib/domain/attachment"
import { TICKET_ATTACHMENTS_LABEL } from "@/app/_lib/domain/ticket"
import type { UploadedAttachmentRef } from "@/app/_lib/types/attachment"

import {
  type AttachmentUploaderBusy,
  useAttachmentUploads,
} from "../_hooks/use-attachment-uploads"
import AttachmentFilePicker from "./attachment-file-picker"
import AttachmentUploadItem from "./attachment-upload-item"
import AttachmentsEmpty from "./attachments-empty"

interface AttachmentUploaderProps {
  onChange: (value: UploadedAttachmentRef[]) => void
  onBusyChange: (busy: AttachmentUploaderBusy) => void
  disabled?: boolean
  ref?: React.Ref<HTMLButtonElement>
  fieldState: ControllerFieldState
}

const AttachmentUploader = ({
  onChange,
  onBusyChange,
  disabled,
  ref,
  fieldState,
}: AttachmentUploaderProps) => {
  const labelId = useId()
  const hintId = useId()
  const buttonId = useId()
  const errorId = useId()
  const { items, addFiles, remove } = useAttachmentUploads({
    onChange,
    onBusyChange,
  })

  const handleRemove = (id: number) => {
    remove(id)
    document.getElementById(buttonId)?.focus()
  }

  const errorMessage = fieldState.invalid
    ? (fieldState.error?.message ?? ATTACHMENT_INVALID_REFERENCE_MESSAGE)
    : null

  return (
    <div
      role="group"
      aria-labelledby={labelId}
      aria-describedby={errorMessage !== null ? errorId : hintId}
      className="flex flex-col gap-1.5"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <FieldTitle id={labelId}>{TICKET_ATTACHMENTS_LABEL}</FieldTitle>
          <p id={hintId} className="text-xs text-muted-foreground">
            {ATTACHMENT_LIMITS_HINT}
          </p>
        </div>
        <AttachmentFilePicker
          ref={ref}
          id={buttonId}
          disabled={disabled}
          invalid={fieldState.invalid}
          onFiles={(files) => void addFiles(files)}
        />
      </div>

      <div aria-live="polite">
        {items.length === 0 ? (
          <AttachmentsEmpty />
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-2">
            {items.map((item) => (
              <AttachmentUploadItem
                key={item.id}
                fileName={item.file.name}
                sizeBytes={item.file.size}
                status={item.status}
                error={item.error}
                disabled={disabled}
                onRemove={() => handleRemove(item.id)}
              />
            ))}
          </ul>
        )}
      </div>

      {errorMessage !== null ? (
        <FieldError id={errorId}>{errorMessage}</FieldError>
      ) : null}
    </div>
  )
}

export default AttachmentUploader
