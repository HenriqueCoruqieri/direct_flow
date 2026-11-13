import {
  ArrowRightLeftIcon,
  HouseIcon,
  InboxIcon,
  MonitorIcon,
  TicketIcon,
} from "lucide-react"

import { APPROVALS_LABEL, APPROVALS_PATH } from "@/app/_lib/domain/approvals"
import {
  DEPARTMENT_QUEUE_LABEL,
  DEPARTMENT_QUEUE_PATH,
} from "@/app/_lib/domain/department-queue"
import { MY_TICKETS_LABEL, MY_TICKETS_PATH } from "@/app/_lib/domain/my-tickets"
import { OPERATIONS_LABEL, OPERATIONS_PATH } from "@/app/_lib/domain/operations"
import type { NavBadge } from "@/app/_lib/types/nav-badge"
import type { RegistryNavItem } from "@/app/_lib/types/registry"

import NavItem from "./nav-item"
import RegistryNav from "./registry-nav"

interface AppNavProps {
  registryItems: RegistryNavItem[]
  showDepartmentQueue: boolean
  approvalsBadge: NavBadge | null
  departmentQueueBadge: NavBadge | null
}

const AppNav = ({
  registryItems,
  showDepartmentQueue,
  approvalsBadge,
  departmentQueueBadge,
}: AppNavProps) => {
  return (
    <nav aria-label="Principal">
      <ul className="flex flex-col gap-1.5">
        <li>
          <NavItem
            href="/dashboard"
            label="Início"
            icon={<HouseIcon aria-hidden="true" />}
          />
        </li>
        <li>
          <NavItem
            href={OPERATIONS_PATH}
            label={OPERATIONS_LABEL}
            icon={<MonitorIcon aria-hidden="true" />}
          />
        </li>
        <li>
          <NavItem
            href={MY_TICKETS_PATH}
            label={MY_TICKETS_LABEL}
            icon={<TicketIcon aria-hidden="true" />}
          />
        </li>
        {showDepartmentQueue ? (
          <li>
            <NavItem
              href={DEPARTMENT_QUEUE_PATH}
              label={DEPARTMENT_QUEUE_LABEL}
              icon={<InboxIcon aria-hidden="true" />}
              badge={departmentQueueBadge}
            />
          </li>
        ) : null}
        <li>
          <NavItem
            href={APPROVALS_PATH}
            label={APPROVALS_LABEL}
            icon={<ArrowRightLeftIcon aria-hidden="true" />}
            badge={approvalsBadge}
          />
        </li>
        {registryItems.length > 0 ? (
          <li>
            <RegistryNav items={registryItems} />
          </li>
        ) : null}
      </ul>
    </nav>
  )
}

export default AppNav
