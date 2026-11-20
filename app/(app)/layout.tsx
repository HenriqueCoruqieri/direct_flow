import { notFound, redirect } from "next/navigation"

import { getAccountFacts } from "@/app/_lib/auth/account-facts"
import { getAccountState } from "@/app/_lib/auth/account-state"
import { getRegistryAccess } from "@/app/_lib/auth/registry-access"
import { requireSession } from "@/app/_lib/auth/session"
import { countPendingApprovals } from "@/app/_lib/data/approvals"
import { countQueueTickets } from "@/app/_lib/data/department-queue"
import { countMyLastTransferTickets } from "@/app/_lib/data/my-tickets"
import { findUserProfile } from "@/app/_lib/data/users"
import { approvalsNavBadgeFor } from "@/app/_lib/domain/approvals"
import {
  DEPARTMENT_QUEUE_NAV_BADGE_TAB,
  departmentQueueNavBadgeFor,
  hasDepartmentQueue,
} from "@/app/_lib/domain/department-queue"
import {
  MY_TICKETS_NAV_BADGE_MATCH,
  myTicketsNavBadgeFor,
} from "@/app/_lib/domain/my-tickets"
import { navBadgeDepartmentIdFor } from "@/app/_lib/domain/nav-badge"
import { registryNavItemsFor } from "@/app/_lib/domain/registry"
import {
  describeMembership,
  getFirstName,
  getInitials,
} from "@/app/_lib/domain/user"

import AppSidebar from "./_components/app-sidebar"
import MobileHeader from "./_components/mobile-header"

const AppLayout = async ({ children }: LayoutProps<"/">) => {
  const actor = await requireSession()
  const [profile, registryAccess, accountState, accountFacts] =
    await Promise.all([
      findUserProfile(actor.id),
      getRegistryAccess(),
      getAccountState(),
      getAccountFacts(),
    ])

  if (accountState?.mustChangePassword) redirect("/set-password")
  if (!profile) notFound()

  const badgeDepartmentId = navBadgeDepartmentIdFor(accountFacts)
  const [[pendingApprovals, openQueueTickets], declinedMyTickets] =
    await Promise.all([
      badgeDepartmentId === null
        ? Promise.resolve<[number, number]>([0, 0])
        : Promise.all([
            countPendingApprovals(badgeDepartmentId),
            countQueueTickets(
              badgeDepartmentId,
              DEPARTMENT_QUEUE_NAV_BADGE_TAB,
            ),
          ]),
      countMyLastTransferTickets(actor.id, MY_TICKETS_NAV_BADGE_MATCH),
    ])

  const initials = getInitials(profile.name)
  const membership = describeMembership(profile.departmentName, profile.role)
  const registryItems = registryNavItemsFor(registryAccess)
  const showDepartmentQueue = hasDepartmentQueue(accountFacts)
  const approvalsBadge = approvalsNavBadgeFor(pendingApprovals)
  const departmentQueueBadge = departmentQueueNavBadgeFor(openQueueTickets)
  const myTicketsBadge = myTicketsNavBadgeFor(declinedMyTickets)

  return (
    <div className="flex min-h-dvh flex-1 bg-background text-foreground">
      <AppSidebar
        name={profile.name}
        initials={initials}
        image={profile.image}
        membership={membership}
        registryItems={registryItems}
        showDepartmentQueue={showDepartmentQueue}
        approvalsBadge={approvalsBadge}
        departmentQueueBadge={departmentQueueBadge}
        myTicketsBadge={myTicketsBadge}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader
          firstName={getFirstName(profile.name)}
          initials={initials}
          image={profile.image}
          membership={membership}
          registryItems={registryItems}
          showDepartmentQueue={showDepartmentQueue}
          approvalsBadge={approvalsBadge}
          departmentQueueBadge={departmentQueueBadge}
          myTicketsBadge={myTicketsBadge}
        />
        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    </div>
  )
}

export default AppLayout
