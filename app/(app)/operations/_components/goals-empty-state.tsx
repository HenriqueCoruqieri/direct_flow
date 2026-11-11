import { TargetIcon } from "lucide-react"

import type { OperationsEmptyCopy } from "@/app/_lib/types/operations"

interface GoalsEmptyStateProps {
  copy: OperationsEmptyCopy
  action?: React.ReactNode
}

const GoalsEmptyState = ({ copy, action = null }: GoalsEmptyStateProps) => {
  return (
    <section className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border-strong bg-surface px-6 py-12 text-center">
      <span className="mb-1 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <TargetIcon aria-hidden="true" className="size-5" />
      </span>
      <h2 className="font-heading text-base font-semibold">{copy.title}</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        {copy.description}
      </p>
      {action !== null ? <div className="mt-2">{action}</div> : null}
    </section>
  )
}

export default GoalsEmptyState
