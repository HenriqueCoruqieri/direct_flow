"use client"

import { Loader2Icon, UserCheckIcon } from "lucide-react"

import { Button } from "@/app/_components/ui/button"
import { assumeTicket } from "@/app/_lib/actions/ticket-assignment"
import {
  ASSUME_TICKET_LABEL,
  ASSUME_TICKET_PENDING_LABEL,
} from "@/app/_lib/domain/ticket-assignment"
import type { AssumeTicketTarget } from "@/app/_lib/types/ticket-assignment"

import { useTicketAction } from "../../../_hooks/use-ticket-action"

interface AssumeTicketButtonProps {
  target: AssumeTicketTarget
}

const AssumeTicketButton = ({ target }: AssumeTicketButtonProps) => {
  const { isPending, run } = useTicketAction()

  return (
    <Button
      type="button"
      disabled={isPending}
      aria-busy={isPending || undefined}
      onClick={() => run(() => assumeTicket(target))}
    >
      {isPending ? (
        <Loader2Icon
          aria-hidden="true"
          className="size-4 animate-spin motion-reduce:animate-none"
        />
      ) : (
        <UserCheckIcon aria-hidden="true" className="size-4" />
      )}
      {isPending ? ASSUME_TICKET_PENDING_LABEL : ASSUME_TICKET_LABEL}
    </Button>
  )
}

export default AssumeTicketButton
