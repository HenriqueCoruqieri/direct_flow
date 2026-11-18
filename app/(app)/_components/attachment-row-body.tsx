import { formatAttachmentSize } from "@/app/_lib/domain/attachment"

import AttachmentKindIcon from "./attachment-kind-icon"

interface AttachmentRowBodyProps {
  fileName: string
  sizeBytes: number
  sizeId?: string
  children?: React.ReactNode
}

const AttachmentRowBody = ({
  fileName,
  sizeBytes,
  sizeId,
  children,
}: AttachmentRowBodyProps) => {
  return (
    <>
      <AttachmentKindIcon fileName={fileName} compact />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
        <span title={fileName} className="truncate text-xs font-medium">
          {fileName}
        </span>
        <span className="flex min-w-0 items-center gap-1.5 text-xs">
          <span
            id={sizeId}
            className="shrink-0 text-muted-foreground tabular-nums"
          >
            {formatAttachmentSize(sizeBytes)}
          </span>
          {children}
        </span>
      </span>
    </>
  )
}

export default AttachmentRowBody
