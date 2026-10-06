"use client"

import { Loader2Icon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/app/_components/ui/button"
import {
  type AssignTicketErrorCode,
  assumeTicket,
} from "@/app/_lib/actions/ticket-assignment"
import { formatTicketNumber } from "@/app/_lib/domain/ticket"
import {
  ASSUME_TICKET_LABEL,
  ASSUME_TICKET_PENDING_LABEL,
  SEND_TICKET_LABEL,
} from "@/app/_lib/domain/ticket-assignment"
import type {
  DepartmentQueueListItem,
  DepartmentQueueRowActions,
} from "@/app/_lib/types/department-queue"

const STALE_ROW_CODES: ReadonlySet<AssignTicketErrorCode> = new Set([
  "CONFLICT",
  "NOT_FOUND",
  "FORBIDDEN",
])

interface QueueRowActionsProps {
  ticket: DepartmentQueueListItem
  actions: DepartmentQueueRowActions
  onSend: (ticket: DepartmentQueueListItem) => void
}

const QueueRowActions = ({ ticket, actions, onSend }: QueueRowActionsProps) => {
  const router = useRouter()
  const [isAssuming, startAssuming] = useTransition()

  if (!actions.assume && !actions.send) return null

  const ticketNumber = formatTicketNumber(ticket.id)

  const handleAssume = () => {
    if (isAssuming) return

    startAssuming(async () => {
      const result = await assumeTicket({
        ticketId: ticket.id,
        expectedAssigneeId: ticket.assignedTo,
      })

      if (result.ok) {
        toast.success(result.message)
        return
      }

      toast.error(result.message)

      if (result.code !== undefined && STALE_ROW_CODES.has(result.code)) {
        router.refresh()
      }
    })
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {actions.assume ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isAssuming}
          aria-busy={isAssuming || undefined}
          aria-label={`${ASSUME_TICKET_LABEL} o chamado ${ticketNumber}`}
          onClick={handleAssume}
        >
          {isAssuming ? (
            <Loader2Icon
              aria-hidden="true"
              className="size-3.5 animate-spin motion-reduce:animate-none"
            />
          ) : null}
          {isAssuming ? ASSUME_TICKET_PENDING_LABEL : ASSUME_TICKET_LABEL}
        </Button>
      ) : null}
      {actions.send ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isAssuming}
          aria-label={`${SEND_TICKET_LABEL} o chamado ${ticketNumber}`}
          onClick={() => onSend(ticket)}
        >
          {SEND_TICKET_LABEL}
        </Button>
      ) : null}
    </div>
  )
}

export default QueueRowActions
