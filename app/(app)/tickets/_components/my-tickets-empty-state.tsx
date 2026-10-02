import { InboxIcon } from "lucide-react"

import type { MyTicketsEmptyCopy } from "@/app/_lib/types/my-tickets"

interface MyTicketsEmptyStateProps {
  copy: MyTicketsEmptyCopy
}

const MyTicketsEmptyState = ({ copy }: MyTicketsEmptyStateProps) => {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border-strong bg-surface px-6 py-12 text-center">
      <span className="mb-1 flex size-11 items-center justify-center rounded-full bg-surface-muted text-muted-foreground">
        <InboxIcon aria-hidden="true" className="size-5" />
      </span>
      <h2 className="font-heading text-base font-semibold">{copy.title}</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        {copy.description}
      </p>
    </div>
  )
}

export default MyTicketsEmptyState
