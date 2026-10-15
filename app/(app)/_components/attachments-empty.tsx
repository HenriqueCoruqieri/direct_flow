import { NO_ATTACHMENTS_LABEL } from "@/app/_lib/domain/ticket"

const AttachmentsEmpty = () => {
  return (
    <p className="rounded-lg border border-dashed border-border-strong px-3 py-4 text-center text-sm text-muted-foreground">
      {NO_ATTACHMENTS_LABEL}
    </p>
  )
}

export default AttachmentsEmpty
