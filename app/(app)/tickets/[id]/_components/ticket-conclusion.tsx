import { formatDateTime, toISO } from "@/app/_lib/date"
import {
  buildResolveTicketFormDefaults,
  NO_SOLUTION_LABEL,
} from "@/app/_lib/domain/ticket-resolution"
import type { TicketConclusionState } from "@/app/_lib/types/ticket-resolution"
import { cn } from "@/app/_lib/utils"

import HiddenWhileEditing from "./hidden-while-editing"
import LockedSolutionField from "./locked-solution-field"
import ResolveTicketForm from "./resolve-ticket-form"
import type { SendToDepartmentSetup } from "./send-to-department-dialog"
import TicketEditSolution from "./ticket-edit-solution"

interface TicketConclusionProps {
  ticketId: number
  state: TicketConclusionState
  sendToDepartment: SendToDepartmentSetup | null
  editable?: boolean
  className?: string
}

const TicketConclusion = ({
  ticketId,
  state,
  sendToDepartment,
  editable = false,
  className,
}: TicketConclusionProps) => {
  const noSolution = (
    <p className="text-sm text-muted-foreground">{NO_SOLUTION_LABEL}</p>
  )

  let body: React.ReactNode

  switch (state.state) {
    case "resolvable": {
      const resolveForm = (
        <ResolveTicketForm
          defaults={buildResolveTicketFormDefaults(ticketId)}
          sendToDepartment={sendToDepartment}
        />
      )
      body = editable ? (
        <HiddenWhileEditing replacement={noSolution}>
          {resolveForm}
        </HiddenWhileEditing>
      ) : (
        resolveForm
      )
      break
    }
    case "resolved": {
      const lockedSolution = (
        <LockedSolutionField
          value={state.solution ?? NO_SOLUTION_LABEL}
          muted={state.solution === null}
        />
      )
      body = (
        <div className="flex flex-col gap-2">
          {editable ? (
            <TicketEditSolution>{lockedSolution}</TicketEditSolution>
          ) : (
            lockedSolution
          )}
          {state.resolvedAt !== null ? (
            <p className="text-caption text-muted-foreground">
              Resolvido em{" "}
              <time dateTime={toISO(state.resolvedAt)} className="tabular-nums">
                {formatDateTime(state.resolvedAt)}
              </time>
            </p>
          ) : null}
          {state.editableUntil !== null ? (
            <p className="text-caption text-muted-foreground">
              Editável até{" "}
              <time
                dateTime={toISO(state.editableUntil)}
                className="tabular-nums"
              >
                {formatDateTime(state.editableUntil)}
              </time>
            </p>
          ) : null}
        </div>
      )
      break
    }
    case "awaiting_transfer":
      body = <LockedSolutionField value={state.message} />
      break
    case "empty":
      body = noSolution
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
