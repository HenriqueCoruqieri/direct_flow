import { formatDateTime, toISO } from "@/app/_lib/date"
import {
  describeHistoryActor,
  describeHistoryEntry,
  HISTORY_EVENT_LABELS,
  historyEntryNamesActor,
  summarizeTicketTimeline,
} from "@/app/_lib/domain/ticket-history"
import type { TicketHistoryEntry } from "@/app/_lib/types/ticket"
import { cn } from "@/app/_lib/utils"

import ScrollToEndArea from "./scroll-to-end-area"

interface TicketTimelineProps {
  entries: TicketHistoryEntry[]
}

const TicketTimeline = ({ entries }: TicketTimelineProps) => {
  const visibleEntries = summarizeTicketTimeline(entries)

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

      {visibleEntries.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum evento registrado.
        </p>
      ) : (
        <ScrollToEndArea
          itemCount={visibleEntries.length}
          label="Eventos da linha do tempo"
          className="max-h-62"
        >
          <ol className="flex flex-col">
            {visibleEntries.map((entry, index) => {
              const isLast = index === visibleEntries.length - 1

              return (
                <li key={entry.id} className="flex gap-3">
                  <div
                    aria-hidden="true"
                    className="flex flex-col items-center"
                  >
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
        </ScrollToEndArea>
      )}
    </section>
  )
}

export default TicketTimeline
