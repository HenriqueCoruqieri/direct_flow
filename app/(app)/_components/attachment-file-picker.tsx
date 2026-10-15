"use client"

import { PaperclipIcon } from "lucide-react"
import { useId, useRef } from "react"
import { toast } from "sonner"

import BlockableOutlineButton from "@/app/_components/blockable-outline-button"
import { ATTACHMENT_INPUT_ACCEPT } from "@/app/_lib/domain/attachment"
import { ATTACH_FILE_LABEL } from "@/app/_lib/domain/ticket"

interface AttachmentFilePickerProps {
  id: string
  onFiles: (files: File[]) => void
  disabled?: boolean
  invalid?: boolean
  describedBy?: string
  blockedMessage?: string | null
  ref?: React.Ref<HTMLButtonElement>
}

const AttachmentFilePicker = ({
  id,
  onFiles,
  disabled,
  invalid,
  describedBy,
  blockedMessage = null,
  ref,
}: AttachmentFilePickerProps) => {
  const blockedToastId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const isBlocked = blockedMessage !== null

  const handleClick = () => {
    if (isBlocked) {
      toast.info(blockedMessage, { id: blockedToastId })
      return
    }
    inputRef.current?.click()
  }

  const handleFilesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ""
    onFiles(files)
  }

  return (
    <>
      <BlockableOutlineButton
        ref={ref}
        id={id}
        blocked={isBlocked}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onClick={handleClick}
      >
        <PaperclipIcon aria-hidden="true" className="size-4" />
        {ATTACH_FILE_LABEL}
      </BlockableOutlineButton>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ATTACHMENT_INPUT_ACCEPT}
        hidden
        tabIndex={-1}
        disabled={disabled || isBlocked}
        onChange={handleFilesChange}
      />
    </>
  )
}

export default AttachmentFilePicker
