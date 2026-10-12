import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { toast } from "sonner"

import {
  type AssignTicketErrorCode,
  assumeTicket,
} from "@/app/_lib/actions/ticket-assignment"
import type { AssumeTicketTarget } from "@/app/_lib/types/ticket-assignment"

const STALE_TICKET_CODES: ReadonlySet<AssignTicketErrorCode> = new Set([
  "CONFLICT",
  "NOT_FOUND",
  "FORBIDDEN",
])

export interface AssumeTicketControls {
  isAssuming: boolean
  assume: (target: AssumeTicketTarget) => void
}

export const useAssumeTicket = (): AssumeTicketControls => {
  const router = useRouter()
  const [isAssuming, startAssuming] = useTransition()

  const assume = (target: AssumeTicketTarget) => {
    if (isAssuming) return

    startAssuming(async () => {
      const result = await assumeTicket(target)

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

  return { isAssuming, assume }
}
