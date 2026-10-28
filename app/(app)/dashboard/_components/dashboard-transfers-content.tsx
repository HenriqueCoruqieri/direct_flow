import {
  EMPTY_INCOMING_TRANSFERS_COPY,
  REJECTED_TRANSFERS_SCOPE_HINT,
  TRANSFER_COUNTER_LABELS_BY_MODE,
  transferCounterToneFor,
} from "@/app/_lib/domain/dashboard"
import type {
  DashboardIncomingTransfer,
  DashboardTransferCounter,
  DashboardTransferSummary,
  DashboardViewMode,
} from "@/app/_lib/types/dashboard"
import type { PeriodSelection } from "@/app/_lib/types/period"

import IncomingTransferItem from "./incoming-transfer-item"
import TransferCounter from "./transfer-counter"

const COUNTER_ORDER: DashboardTransferCounter[] = [
  "incoming",
  "outgoing",
  "rejected",
]

interface DashboardTransfersContentProps {
  summary: DashboardTransferSummary
  transfers: DashboardIncomingTransfer[]
  mode: DashboardViewMode
  now: Date
  selection: PeriodSelection
}

const DashboardTransfersContent = ({
  summary,
  transfers,
  mode,
  now,
  selection,
}: DashboardTransfersContentProps) => {
  const counts = {
    incoming: summary.incomingPendingCount,
    outgoing: summary.outgoingPendingCount,
    rejected: summary.rejectedCount,
  } satisfies Record<DashboardTransferCounter, number>
  const labels = TRANSFER_COUNTER_LABELS_BY_MODE[mode]
  const emptyCopy = EMPTY_INCOMING_TRANSFERS_COPY[mode]

  return (
    <>
      <dl className="mt-3 grid grid-cols-3 gap-2">
        {COUNTER_ORDER.map((counter) => (
          <TransferCounter
            key={counter}
            label={labels[counter]}
            count={counts[counter]}
            tone={transferCounterToneFor(counter, counts[counter])}
            hint={
              counter === "rejected" ? REJECTED_TRANSFERS_SCOPE_HINT : undefined
            }
          />
        ))}
      </dl>
      {transfers.length === 0 ? (
        <div className="mt-3 flex flex-col gap-1">
          <p className="text-sm font-semibold">{emptyCopy.title}</p>
          <p className="text-caption text-muted-foreground">
            {emptyCopy.description}
          </p>
        </div>
      ) : (
        <ul className="mt-2 flex flex-col">
          {transfers.map((transfer) => (
            <IncomingTransferItem
              key={transfer.transferId}
              transfer={transfer}
              now={now}
              selection={selection}
            />
          ))}
        </ul>
      )}
    </>
  )
}

export default DashboardTransfersContent
