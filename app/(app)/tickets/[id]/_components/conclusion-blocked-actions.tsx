import { PaperclipIcon } from "lucide-react"

import BlockableOutlineButton from "@/app/_components/blockable-outline-button"
import BlockedActionTrigger from "@/app/_components/blocked-action-trigger"
import { TICKET_ATTACHMENTS_SOON_MESSAGE } from "@/app/_lib/domain/ticket-resolution"

const ConclusionBlockedActions = () => {
  return (
    <BlockedActionTrigger message={TICKET_ATTACHMENTS_SOON_MESSAGE}>
      <BlockableOutlineButton blocked>
        <PaperclipIcon aria-hidden="true" className="size-4" />
        Anexar
      </BlockableOutlineButton>
    </BlockedActionTrigger>
  )
}

export default ConclusionBlockedActions
