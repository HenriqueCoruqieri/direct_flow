"use client"

import { InfoIcon, PaperclipIcon } from "lucide-react"
import { useId, useRef } from "react"
import type { ControllerFieldState } from "react-hook-form"

import { Button } from "@/app/_components/ui/button"
import { FieldError, FieldTitle } from "@/app/_components/ui/field"
import {
  ATTACHMENT_INPUT_ACCEPT,
  ATTACHMENT_INVALID_REFERENCE_MESSAGE,
  ATTACHMENT_LIMITS_HINT,
} from "@/app/_lib/domain/attachment"
import {
  ATTACH_FILE_LABEL,
  NO_ATTACHMENTS_LABEL,
  TICKET_ATTACHMENTS_LABEL,
} from "@/app/_lib/domain/ticket"
import type { UploadedAttachmentRef } from "@/app/_lib/types/attachment"

import {
  type AttachmentUploaderBusy,
  useAttachmentUploads,
} from "../_hooks/use-attachment-uploads"
import AttachmentUploadItem from "./attachment-upload-item"

interface AttachmentUploaderProps {
  onChange: (value: UploadedAttachmentRef[]) => void
  onBusyChange: (busy: AttachmentUploaderBusy) => void
  disabled?: boolean
  notice?: string
  actions?: React.ReactNode
  ref?: React.Ref<HTMLButtonElement>
  fieldState: ControllerFieldState
}

const AttachmentUploader = ({
  onChange,
  onBusyChange,
  disabled,
  notice,
  actions,
  ref,
  fieldState,
}: AttachmentUploaderProps) => {
  const labelId = useId()
  const hintId = useId()
  const noticeId = useId()
  const buttonId = useId()
  const errorId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const { items, addFiles, remove } = useAttachmentUploads({
    onChange,
    onBusyChange,
  })

  const handleFilesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ""
    void addFiles(files)
  }

  const handleRemove = (id: number) => {
    remove(id)
    document.getElementById(buttonId)?.focus()
  }

  const errorMessage = fieldState.invalid
    ? (fieldState.error?.message ?? ATTACHMENT_INVALID_REFERENCE_MESSAGE)
    : null

  const descriptionIds = notice !== undefined ? `${hintId} ${noticeId}` : hintId
  const describedBy = errorMessage !== null ? errorId : descriptionIds
  const hasActionBar = actions !== undefined

  const trigger = (
    <>
      <Button
        ref={ref}
        id={buttonId}
        type="button"
        variant="outline"
        disabled={disabled}
        aria-invalid={fieldState.invalid || undefined}
        aria-describedby={hasActionBar ? describedBy : undefined}
        onClick={() => inputRef.current?.click()}
      >
        <PaperclipIcon aria-hidden="true" className="size-4" />
        {ATTACH_FILE_LABEL}
      </Button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ATTACHMENT_INPUT_ACCEPT}
        hidden
        tabIndex={-1}
        disabled={disabled}
        onChange={handleFilesChange}
      />
    </>
  )

  const heading = (
    <div className="flex min-w-0 flex-col gap-0.5">
      <FieldTitle id={labelId}>{TICKET_ATTACHMENTS_LABEL}</FieldTitle>
      <p id={hintId} className="text-xs text-muted-foreground">
        {ATTACHMENT_LIMITS_HINT}
      </p>
      {notice !== undefined ? (
        <p
          id={noticeId}
          className="flex items-start gap-1 text-xs text-muted-foreground"
        >
          <InfoIcon aria-hidden="true" className="mt-px size-3.5 shrink-0" />
          <span className="min-w-0">{notice}</span>
        </p>
      ) : null}
    </div>
  )

  const group = (
    <div
      role="group"
      aria-labelledby={labelId}
      aria-describedby={describedBy}
      className="flex flex-col gap-1.5"
    >
      {hasActionBar ? (
        heading
      ) : (
        <div className="flex items-center justify-between gap-2">
          {heading}
          {trigger}
        </div>
      )}

      <div aria-live="polite">
        {items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border-strong px-3 py-4 text-center text-sm text-muted-foreground">
            {NO_ATTACHMENTS_LABEL}
          </p>
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

  if (!hasActionBar) return group

  return (
    <>
      {group}
      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border-subtle pt-4">
        {trigger}
        {actions}
      </div>
    </>
  )
}

export default AttachmentUploader
