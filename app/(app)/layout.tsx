import { notFound, redirect } from "next/navigation"

import { getAccountState } from "@/app/_lib/auth/account-state"
import { getRegistryAccess } from "@/app/_lib/auth/registry-access"
import { requireSession } from "@/app/_lib/auth/session"
import { findUserProfile } from "@/app/_lib/data/users"
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
  const [profile, registryAccess, accountState] = await Promise.all([
    findUserProfile(actor.id),
    getRegistryAccess(),
    getAccountState(),
  ])

  if (accountState?.mustChangePassword) redirect("/set-password")
  if (!profile) notFound()

  const initials = getInitials(profile.name)
  const membership = describeMembership(profile.departmentName, profile.role)

  return (
    <div className="flex min-h-dvh flex-1 bg-background text-foreground">
      <AppSidebar
        name={profile.name}
        initials={initials}
        image={profile.image}
        membership={membership}
        registryItems={registryNavItemsFor(registryAccess)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader
          firstName={getFirstName(profile.name)}
          initials={initials}
          image={profile.image}
          membership={membership}
        />
        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    </div>
  )
}

export default AppLayout
