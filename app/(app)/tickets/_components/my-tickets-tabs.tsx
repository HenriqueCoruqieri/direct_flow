import Link from "next/link"

import {
  MY_TICKETS_TAB_RULES,
  MY_TICKETS_TABS,
} from "@/app/_lib/domain/my-tickets"
import type {
  MyTicketsTab,
  MyTicketsTabCounts,
} from "@/app/_lib/types/my-tickets"
import { myTicketsTabHref } from "@/app/_lib/validation/my-tickets"

interface MyTicketsTabsProps {
  current: MyTicketsTab
  counts: MyTicketsTabCounts
}

const MyTicketsTabs = ({ current, counts }: MyTicketsTabsProps) => {
  return (
    <div className="border-b border-border-subtle">
      <nav
        aria-label="Abas de Meus chamados"
        className="-mb-px flex gap-1 overflow-x-auto"
      >
        {MY_TICKETS_TABS.map((tab) => (
          <Link
            key={tab}
            href={myTicketsTabHref(tab)}
            scroll={false}
            aria-current={tab === current ? "page" : undefined}
            className="group/tab inline-flex h-10 shrink-0 items-center gap-2 rounded-t-lg border-b-2 border-transparent px-3 text-sm font-semibold whitespace-nowrap text-text-tertiary transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset aria-[current=page]:border-primary aria-[current=page]:font-extrabold aria-[current=page]:text-foreground"
          >
            {MY_TICKETS_TAB_RULES[tab].label}
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-surface-muted px-1.5 text-xs font-bold text-text-secondary tabular-nums group-aria-[current=page]/tab:bg-primary/10 group-aria-[current=page]/tab:text-primary">
              {counts[tab]}
            </span>
          </Link>
        ))}
      </nav>
    </div>
  )
}

export default MyTicketsTabs
