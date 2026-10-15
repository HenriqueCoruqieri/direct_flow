import { formatAttachmentSize } from "@/app/_lib/domain/attachment"

import AttachmentKindIcon from "./attachment-kind-icon"

interface AttachmentTileBodyProps {
  fileName: string
  sizeBytes: number
  sizeId?: string
}

const AttachmentTileBody = ({
  fileName,
  sizeBytes,
  sizeId,
}: AttachmentTileBodyProps) => {
  return (
    <>
      <AttachmentKindIcon fileName={fileName} />
      <span
        title={fileName}
        className="line-clamp-2 w-full text-xs font-medium wrap-anywhere"
      >
        {fileName}
      </span>
      <span id={sizeId} className="text-xs text-muted-foreground tabular-nums">
        {formatAttachmentSize(sizeBytes)}
      </span>
    </>
  )
}

export default AttachmentTileBody
