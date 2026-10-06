import { InboxIcon } from "lucide-react"

interface TicketListEmptyStateProps {
  title?: string
  description: string
}

const TicketListEmptyState = ({
  title,
  description,
}: TicketListEmptyStateProps) => {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border-strong bg-surface px-6 py-12 text-center">
      <span className="mb-1 flex size-11 items-center justify-center rounded-full bg-surface-muted text-muted-foreground">
        <InboxIcon aria-hidden="true" className="size-5" />
      </span>
      {title !== undefined ? (
        <h2 className="font-heading text-base font-semibold">{title}</h2>
      ) : null}
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

export default TicketListEmptyState
