"use client"

import { Loader2Icon } from "lucide-react"

import { Button } from "@/app/_components/ui/button"
import { assumeTicket } from "@/app/_lib/actions/ticket-assignment"
import { formatTicketNumber } from "@/app/_lib/domain/ticket"
import {
  ASSUME_TICKET_LABEL,
  ASSUME_TICKET_PENDING_LABEL,
} from "@/app/_lib/domain/ticket-assignment"
import type {
  DepartmentQueueListItem,
  DepartmentQueueRowActions,
} from "@/app/_lib/types/department-queue"

import { useTicketAction } from "../../_hooks/use-ticket-action"

interface QueueRowActionsProps {
  ticket: DepartmentQueueListItem
  actions: DepartmentQueueRowActions
}

const QueueRowActions = ({ ticket, actions }: QueueRowActionsProps) => {
  const { isPending: isAssuming, run } = useTicketAction()

  if (!actions.assume) return null

  const handleAssume = () =>
    run(() =>
      assumeTicket({
        ticketId: ticket.id,
        expectedAssigneeId: ticket.assignedTo,
      }),
    )

  return (
    <div className="flex items-center justify-end">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isAssuming}
        aria-busy={isAssuming || undefined}
        aria-label={`${ASSUME_TICKET_LABEL} o chamado ${formatTicketNumber(ticket.id)}`}
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
    </div>
  )
}

export default QueueRowActions
