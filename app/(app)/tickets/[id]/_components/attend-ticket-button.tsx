"use client"

import { Loader2Icon, PlayIcon } from "lucide-react"

import { Button } from "@/app/_components/ui/button"
import {
  attendTicket,
  type AttendTicketResult,
} from "@/app/_lib/actions/ticket-assignment"
import {
  acceptTicketTransfer,
  type AcceptTicketTransferResult,
} from "@/app/_lib/actions/ticket-transfer"
import {
  ATTEND_TICKET_LABEL,
  ATTEND_TICKET_PENDING_LABEL,
} from "@/app/_lib/domain/ticket-assignment"
import type { TicketAttendTarget } from "@/app/_lib/types/ticket-transfer"

import { useTicketAction } from "../../../_hooks/use-ticket-action"

type AttendTargetResult = AttendTicketResult | AcceptTicketTransferResult

const runAttendTarget = (
  target: TicketAttendTarget,
): Promise<AttendTargetResult> =>
  target.kind === "start_work"
    ? attendTicket({ ticketId: target.ticketId })
    : acceptTicketTransfer({
        ticketId: target.ticketId,
        transferId: target.transferId,
      })

interface AttendTicketButtonProps {
  target: TicketAttendTarget
}

const AttendTicketButton = ({ target }: AttendTicketButtonProps) => {
  const { isPending, run } = useTicketAction()

  return (
    <Button
      type="button"
      disabled={isPending}
      aria-busy={isPending || undefined}
      onClick={() => run(() => runAttendTarget(target))}
    >
      {isPending ? (
        <Loader2Icon
          aria-hidden="true"
          className="size-4 animate-spin motion-reduce:animate-none"
        />
      ) : (
        <PlayIcon aria-hidden="true" className="size-4" />
      )}
      {isPending ? ATTEND_TICKET_PENDING_LABEL : ATTEND_TICKET_LABEL}
    </Button>
  )
}

export default AttendTicketButton
