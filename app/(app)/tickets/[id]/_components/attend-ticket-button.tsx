"use client"

import { Loader2Icon, PlayIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/app/_components/ui/button"
import {
  attendTicket,
  type AttendTicketErrorCode,
} from "@/app/_lib/actions/ticket-assignment"
import {
  ATTEND_TICKET_LABEL,
  ATTEND_TICKET_PENDING_LABEL,
} from "@/app/_lib/domain/ticket-assignment"

const STALE_TICKET_CODES: ReadonlySet<AttendTicketErrorCode> = new Set([
  "CONFLICT",
  "NOT_FOUND",
  "FORBIDDEN",
])

interface AttendTicketButtonProps {
  ticketId: number
}

const AttendTicketButton = ({ ticketId }: AttendTicketButtonProps) => {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleAttend = () => {
    if (isPending) return

    startTransition(async () => {
      const result = await attendTicket({ ticketId })

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
