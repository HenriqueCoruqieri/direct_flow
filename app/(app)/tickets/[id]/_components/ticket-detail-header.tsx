import { formatTicketNumber } from "@/app/_lib/domain/ticket"
import type { TicketStatus } from "@/app/_lib/types/ticket"
import type { AssumeTicketTarget } from "@/app/_lib/types/ticket-assignment"
import type { TicketAttendTarget } from "@/app/_lib/types/ticket-transfer"

import TicketStatusBadge from "../../../_components/ticket-status-badge"
import AssumeTicketButton from "./assume-ticket-button"
import AttendTicketButton from "./attend-ticket-button"
import DeclineTransferDialog, {
  type DeclineTransferDialogProps,
} from "./decline-transfer-dialog"
import TicketEditHeading from "./ticket-edit-heading"

interface TicketDetailHeaderProps {
  id: number
  title: string
  status: TicketStatus
  editable?: boolean
  assumeTarget?: AssumeTicketTarget | null
  attendTarget?: TicketAttendTarget | null
  decline?: DeclineTransferDialogProps | null
}

const TicketDetailHeader = ({
  id,
  title,
  status,
  editable = false,
  assumeTarget = null,
  attendTarget = null,
  decline = null,
}: TicketDetailHeaderProps) => {
  const heading = (
    <h1 className="min-w-0 font-heading text-title font-semibold wrap-break-word">
      {title}
    </h1>
  )
  const hasAttendActions =
    assumeTarget !== null || attendTarget !== null || decline !== null
  const attendActions = hasAttendActions ? (
    <>
      {assumeTarget !== null ? (
        <AssumeTicketButton target={assumeTarget} />
      ) : null}
      {attendTarget !== null ? (
        <AttendTicketButton target={attendTarget} />
      ) : null}
      {decline !== null ? <DeclineTransferDialog {...decline} /> : null}
    </>
  ) : null

  return (
    <header className="flex flex-col gap-2">
      <span className="text-caption font-bold text-muted-foreground tabular-nums">
        {formatTicketNumber(id)}
      </span>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        {editable ? (
          <TicketEditHeading heading={heading} attendActions={attendActions} />
        ) : (
          <>
            {heading}
            {hasAttendActions ? (
              <div className="flex shrink-0 flex-wrap gap-2">
                {attendActions}
              </div>
            ) : null}
          </>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <TicketStatusBadge status={status} />
      </div>
    </header>
  )
}

export default TicketDetailHeader
