import Link from "next/link"

import {
  OPERATIONS_TAB_GROUP_LABEL,
  OPERATIONS_TAB_LABELS,
  OPERATIONS_TABS,
} from "@/app/_lib/domain/operations"
import type { OperationsLocation } from "@/app/_lib/types/operations"
import { cn } from "@/app/_lib/utils"
import { operationsTabHref } from "@/app/_lib/validation/operations"

interface OperationsTabsProps {
  location: OperationsLocation
}

const OperationsTabs = ({ location }: OperationsTabsProps) => {
  return (
    <nav
      aria-label={OPERATIONS_TAB_GROUP_LABEL}
      className="inline-flex shrink-0 rounded-full border border-border-strong bg-surface-muted p-0.5"
    >
      <ul className="grid grid-cols-3">
        {OPERATIONS_TABS.map((tab) => {
          const active = tab === location.tab

          return (
            <li key={tab} className="flex">
              <Link
                href={operationsTabHref(location, tab)}
                scroll={false}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-7 flex-1 items-center justify-center rounded-full px-3 text-xs font-bold whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-text-secondary hover:text-foreground",
                )}
              >
                {OPERATIONS_TAB_LABELS[tab]}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export default OperationsTabs
