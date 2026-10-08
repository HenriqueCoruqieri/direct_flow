import Link from "next/link"

import ActiveTabNav from "@/app/_components/active-tab-nav"

export interface TicketListTabItem {
  value: string
  label: string
  count: number
  href: string
}

interface TicketListTabsProps {
  ariaLabel: string
  items: TicketListTabItem[]
  current: string
}

const TicketListTabs = ({ ariaLabel, items, current }: TicketListTabsProps) => {
  return (
    <div className="border-b border-border-subtle">
      <ActiveTabNav
        activeKey={current}
        aria-label={ariaLabel}
        className="-mb-px flex gap-1 overflow-x-auto"
      >
        {items.map((item) => (
          <Link
            key={item.value}
            href={item.href}
            scroll={false}
            aria-current={item.value === current ? "page" : undefined}
            className="group/tab inline-flex h-10 shrink-0 items-center gap-2 rounded-t-lg border-b-2 border-transparent px-3 text-sm font-semibold whitespace-nowrap text-text-tertiary transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset aria-[current=page]:border-primary aria-[current=page]:font-extrabold aria-[current=page]:text-foreground"
          >
            {item.label}
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-surface-muted px-1.5 text-xs font-bold text-text-secondary tabular-nums group-aria-[current=page]/tab:bg-primary/10 group-aria-[current=page]/tab:text-primary">
              {item.count}
            </span>
          </Link>
        ))}
      </ActiveTabNav>
    </div>
  )
}

export default TicketListTabs
