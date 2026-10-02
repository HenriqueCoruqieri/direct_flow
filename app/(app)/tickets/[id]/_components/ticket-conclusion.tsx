import { formatDateTime, toISO } from "@/app/_lib/date"
import {
  buildResolveTicketFormDefaults,
  NO_SOLUTION_LABEL,
} from "@/app/_lib/domain/ticket-resolution"
import type { TicketConclusionState } from "@/app/_lib/types/ticket-resolution"
import { cn } from "@/app/_lib/utils"

import LockedSolutionField from "./locked-solution-field"
import ResolveTicketForm from "./resolve-ticket-form"

interface TicketConclusionProps {
  ticketId: number
  state: TicketConclusionState
  className?: string
}

const TicketConclusion = ({
  ticketId,
  state,
  className,
}: TicketConclusionProps) => {
  let body: React.ReactNode

  switch (state.state) {
    case "resolvable":
      body = (
        <ResolveTicketForm
          defaults={buildResolveTicketFormDefaults(ticketId)}
        />
      )
      break
    case "resolved":
      body = (
        <div className="flex flex-col gap-2">
          <LockedSolutionField
            value={state.solution ?? NO_SOLUTION_LABEL}
            muted={state.solution === null}
          />
          {state.resolvedAt !== null ? (
            <p className="text-caption text-muted-foreground">
              Resolvido em{" "}
              <time dateTime={toISO(state.resolvedAt)} className="tabular-nums">
                {formatDateTime(state.resolvedAt)}
              </time>
            </p>
          ) : null}
        </div>
      )
      break
    case "awaiting_transfer":
      body = <LockedSolutionField value={state.message} />
      break
    case "empty":
      body = (
        <p className="text-sm text-muted-foreground">{NO_SOLUTION_LABEL}</p>
      )
      break
  }

  return (
    <section
      aria-labelledby="ticket-conclusion-heading"
      className={cn(
        "flex flex-col gap-4 rounded-xl border border-border-subtle bg-surface p-5",
        className,
      )}
    >
      <h2
        id="ticket-conclusion-heading"
        className="font-heading text-base font-semibold"
      >
        Conclusão
      </h2>
      {body}
    </section>
  )
}

export default TicketConclusion
