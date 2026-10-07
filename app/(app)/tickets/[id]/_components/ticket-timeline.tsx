import { formatDateTime, toISO } from "@/app/_lib/date"
import {
  describeHistoryActor,
  describeHistoryEntry,
  HISTORY_EVENT_LABELS,
  historyEntryNamesActor,
} from "@/app/_lib/domain/ticket-history"
import type { TicketHistoryEntry } from "@/app/_lib/types/ticket"
import { cn } from "@/app/_lib/utils"

interface TicketTimelineProps {
  entries: TicketHistoryEntry[]
}

const TicketTimeline = ({ entries }: TicketTimelineProps) => {
  return (
    <section
      aria-labelledby="ticket-timeline-heading"
      className="flex flex-col gap-4 rounded-xl border border-border-subtle bg-surface p-5"
    >
      <h2
        id="ticket-timeline-heading"
        className="font-heading text-base font-semibold"
      >
        Linha do tempo
      </h2>

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum evento registrado.
        </p>
      ) : (
        <ol className="flex flex-col">
          {entries.map((entry, index) => {
            const isLast = index === entries.length - 1

            return (
              <li key={entry.id} className="flex gap-3">
                <div aria-hidden="true" className="flex flex-col items-center">
                  <span className="mt-1.5 size-2.5 shrink-0 rounded-full border-2 border-primary" />
                  {isLast ? null : (
                    <span className="mt-1 w-px flex-1 bg-border-strong" />
                  )}
                </div>
                <div
                  className={cn(
                    "flex min-w-0 flex-col gap-1",
                    isLast ? undefined : "pb-5",
                  )}
                >
                  <h3 className="text-sm font-bold">
                    {HISTORY_EVENT_LABELS[entry.event]}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {historyEntryNamesActor(entry) ? null : (
                      <>{describeHistoryActor(entry)} · </>
                    )}
                    <time
                      dateTime={toISO(entry.changedAt)}
                      className="tabular-nums"
                    >
                      {formatDateTime(entry.changedAt)}
                    </time>
                  </p>
                  <p className="text-sm text-text-secondary">
                    {describeHistoryEntry(entry)}
                  </p>
                  {entry.note !== null ? (
                    <p className="mt-1 rounded-lg bg-surface-muted px-3 py-2 text-sm wrap-break-word whitespace-pre-wrap">
                      {entry.note}
                    </p>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}

export default TicketTimeline
