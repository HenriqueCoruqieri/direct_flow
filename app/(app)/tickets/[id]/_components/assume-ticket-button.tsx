"use client"

import { Loader2Icon, UserCheckIcon } from "lucide-react"

import { Button } from "@/app/_components/ui/button"
import {
  ASSUME_TICKET_LABEL,
  ASSUME_TICKET_PENDING_LABEL,
} from "@/app/_lib/domain/ticket-assignment"
import type { AssumeTicketTarget } from "@/app/_lib/types/ticket-assignment"

import { useAssumeTicket } from "../../../_hooks/use-assume-ticket"

interface AssumeTicketButtonProps {
  target: AssumeTicketTarget
}

const AssumeTicketButton = ({ target }: AssumeTicketButtonProps) => {
  const { isAssuming, assume } = useAssumeTicket()

  return (
    <Button
      type="button"
      disabled={isAssuming}
      aria-busy={isAssuming || undefined}
      onClick={() => assume(target)}
    >
      {isAssuming ? (
        <Loader2Icon
          aria-hidden="true"
          className="size-4 animate-spin motion-reduce:animate-none"
        />
      ) : (
        <UserCheckIcon aria-hidden="true" className="size-4" />
      )}
      {isAssuming ? ASSUME_TICKET_PENDING_LABEL : ASSUME_TICKET_LABEL}
    </Button>
  )
}

export default AssumeTicketButton
