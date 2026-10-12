import { PaperclipIcon } from "lucide-react"

import BlockableOutlineButton from "@/app/_components/blockable-outline-button"
import BlockedActionTrigger from "@/app/_components/blocked-action-trigger"
import {
  ATTACH_FILE_LABEL,
  TICKET_ATTACHMENTS_SOON_MESSAGE,
} from "@/app/_lib/domain/ticket"

const AttachmentsSoonButton = () => {
  return (
    <BlockedActionTrigger message={TICKET_ATTACHMENTS_SOON_MESSAGE}>
      <BlockableOutlineButton blocked>
        <PaperclipIcon aria-hidden="true" className="size-4" />
        {ATTACH_FILE_LABEL}
      </BlockableOutlineButton>
    </BlockedActionTrigger>
  )
}

export default AttachmentsSoonButton
