import { HouseIcon } from "lucide-react"

import LogoMark from "@/app/_components/logo-mark"

import NavItem from "./nav-item"
import UserAvatar from "./user-avatar"
import UserMenu from "./user-menu"

interface AppSidebarProps {
  name: string
  initials: string
  membership: string
}

const AppSidebar = ({ name, initials, membership }: AppSidebarProps) => {
  return (
    <aside className="sticky top-0 hidden h-dvh w-58 shrink-0 flex-col gap-1.5 border-r border-border-subtle bg-surface-bar px-3.5 py-5 lg:flex">
      <div className="flex items-center gap-2.5 px-2 pb-4.5">
        <LogoMark size="sm" variant="tint" />
        <span className="font-heading text-base font-semibold">
          Direct Flow
        </span>
      </div>

      <nav aria-label="Principal">
        <ul className="flex flex-col gap-1.5">
          <li>
            <NavItem
              href="/dashboard"
              label="Início"
              icon={<HouseIcon aria-hidden="true" />}
            />
          </li>
        </ul>
      </nav>

      <div className="flex-1" />

      <UserMenu
        side="top"
        triggerClassName="flex w-full items-center gap-2.5 rounded-[12px] border border-border-subtle p-2.5 text-left transition-colors hover:bg-surface-muted aria-expanded:bg-surface-muted"
      >
        <UserAvatar initials={initials} />
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-caption font-bold">{name}</span>
          <span className="truncate text-xs text-muted-foreground">
            {membership}
          </span>
        </span>
      </UserMenu>
    </aside>
  )
}

export default AppSidebar
