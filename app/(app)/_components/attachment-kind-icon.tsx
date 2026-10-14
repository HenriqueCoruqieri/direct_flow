import {
  FileIcon,
  FileImageIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  LibraryIcon,
  type LucideIcon,
  PresentationIcon,
} from "lucide-react"

import {
  attachmentExtensionLabel,
  attachmentKindFor,
} from "@/app/_lib/domain/attachment"
import type { AttachmentKind } from "@/app/_lib/types/attachment"
import { cn } from "@/app/_lib/utils"

interface AttachmentKindVisual {
  icon: LucideIcon
  className: string
}

const KIND_VISUALS = {
  pdf: { icon: FileTextIcon, className: "text-file-pdf" },
  text: { icon: FileIcon, className: "text-muted-foreground" },
  spreadsheet: {
    icon: FileSpreadsheetIcon,
    className: "text-file-spreadsheet",
  },
  document: { icon: FileTextIcon, className: "text-file-document" },
  presentation: { icon: PresentationIcon, className: "text-file-presentation" },
  image: { icon: FileImageIcon, className: "text-file-image" },
  archive: { icon: LibraryIcon, className: "text-file-archive" },
} satisfies Record<AttachmentKind, AttachmentKindVisual>

const UNKNOWN_KIND_VISUAL: AttachmentKindVisual = {
  icon: FileIcon,
  className: "text-muted-foreground",
}

interface AttachmentKindIconProps {
  fileName: string
  className?: string
}

const AttachmentKindIcon = ({
  fileName,
  className,
}: AttachmentKindIconProps) => {
  const kind = attachmentKindFor(fileName)
  const extension = attachmentExtensionLabel(fileName)
  const visual = kind === null ? UNKNOWN_KIND_VISUAL : KIND_VISUALS[kind]
  const Icon = visual.icon

  return (
    <span
      aria-hidden="true"
      className={cn("flex shrink-0 flex-col items-center gap-1", className)}
    >
      <Icon className={cn("size-8 shrink-0", visual.className)} />
      {extension !== null ? (
        <span className="text-micro font-semibold tracking-wide text-muted-foreground">
          {extension}
        </span>
      ) : null}
    </span>
  )
}

export default AttachmentKindIcon
