"use client"

import { Loader2Icon, PlayIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/app/_components/ui/button"
import {
  attendTicket,
  type AttendTicketErrorCode,
  type AttendTicketResult,
} from "@/app/_lib/actions/ticket-assignment"
import {
  acceptTicketTransfer,
  type AcceptTicketTransferErrorCode,
  type AcceptTicketTransferResult,
} from "@/app/_lib/actions/ticket-transfer"
import {
  ATTEND_TICKET_LABEL,
  ATTEND_TICKET_PENDING_LABEL,
} from "@/app/_lib/domain/ticket-assignment"
import type { TicketAttendTarget } from "@/app/_lib/types/ticket-transfer"

type AttendTargetResult = AttendTicketResult | AcceptTicketTransferResult

const STALE_TICKET_CODES: ReadonlySet<
  AttendTicketErrorCode | AcceptTicketTransferErrorCode
> = new Set(["CONFLICT", "NOT_FOUND", "FORBIDDEN"])

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
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleAttend = () => {
    if (isPending) return

    startTransition(async () => {
      const result = await runAttendTarget(target)

      if (result.ok) {
        toast.success(result.message)
        return
      }

      toast.error(result.message)

      if (result.code !== undefined && STALE_TICKET_CODES.has(result.code)) {
        router.refresh()
      }
    })
  }

  return (
    <Button
      type="button"
      disabled={isPending}
      aria-busy={isPending || undefined}
      onClick={handleAttend}
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
