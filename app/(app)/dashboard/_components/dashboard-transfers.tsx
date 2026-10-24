import {
  findTransferSummary,
  listOldestIncomingTransfers,
} from "@/app/_lib/data/dashboard"
import {
  EMPTY_INCOMING_TRANSFERS_DESCRIPTION,
  EMPTY_INCOMING_TRANSFERS_TITLE,
  INCOMING_TRANSFERS_LIMIT,
  REJECTED_TRANSFERS_SCOPE_HINT,
  TRANSFER_COUNTER_LABELS,
  transferCounterToneFor,
} from "@/app/_lib/domain/dashboard"
import type { DashboardTransferCounter } from "@/app/_lib/types/dashboard"
import type { DateRange, PeriodSelection } from "@/app/_lib/types/period"

import DashboardPanel from "./dashboard-panel"
import DashboardTransfersHeader from "./dashboard-transfers-header"
import IncomingTransferItem from "./incoming-transfer-item"
import TransferCounter from "./transfer-counter"

const TITLE_ID = "dashboard-transfers-title"

const COUNTER_ORDER: DashboardTransferCounter[] = [
  "incoming",
  "outgoing",
  "rejected",
]

interface DashboardTransfersProps {
  departmentId: number
  range: DateRange
  now: Date
  selection: PeriodSelection
}

const DashboardTransfers = async ({
  departmentId,
  range,
  now,
  selection,
}: DashboardTransfersProps) => {
  const [summary, transfers] = await Promise.all([
    findTransferSummary(departmentId, range),
    listOldestIncomingTransfers(departmentId, INCOMING_TRANSFERS_LIMIT),
  ])

  const counts = {
    incoming: summary.incomingPendingCount,
    outgoing: summary.outgoingPendingCount,
    rejected: summary.rejectedCount,
  } satisfies Record<DashboardTransferCounter, number>

  return (
    <DashboardPanel
      aria-labelledby={TITLE_ID}
      className="xl:col-span-2 xl:col-start-4"
    >
      <DashboardTransfersHeader titleId={TITLE_ID} />
      <dl className="mt-3 grid grid-cols-3 gap-2">
        {COUNTER_ORDER.map((counter) => (
          <TransferCounter
            key={counter}
            label={TRANSFER_COUNTER_LABELS[counter]}
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
          <p className="text-sm font-semibold">
            {EMPTY_INCOMING_TRANSFERS_TITLE}
          </p>
          <p className="text-caption text-muted-foreground">
            {EMPTY_INCOMING_TRANSFERS_DESCRIPTION}
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
    </DashboardPanel>
  )
}

export default DashboardTransfers
