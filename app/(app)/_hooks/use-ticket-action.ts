import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { toast } from "sonner"

import { isStaleTicketCode } from "@/app/_lib/domain/ticket"

interface TicketActionSuccess {
  ok: true
  message: string
}

interface TicketActionFailure {
  ok: false
  message: string
  code?: string
}

type TicketActionResult = TicketActionSuccess | TicketActionFailure

export interface TicketActionControls {
  isPending: boolean
  run: (action: () => Promise<TicketActionResult>) => void
}

export const useTicketAction = (): TicketActionControls => {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const run = (action: () => Promise<TicketActionResult>) => {
    if (isPending) return

    startTransition(async () => {
      const result = await action()

      if (result.ok) {
        toast.success(result.message)
        return
      }

      toast.error(result.message)

      if (isStaleTicketCode(result.code)) router.refresh()
    })
  }

  return { isPending, run }
}
