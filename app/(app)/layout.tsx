import { notFound } from "next/navigation"

import { requireSession } from "@/app/_lib/auth/session"
import { getUserProfile } from "@/app/_lib/data/users"
import {
  describeMembership,
  getFirstName,
  getInitials,
} from "@/app/_lib/domain/user"

import AppSidebar from "./_components/app-sidebar"
import AppTopBar from "./_components/app-top-bar"
import MobileHeader from "./_components/mobile-header"

const AppLayout = async ({ children }: LayoutProps<"/">) => {
  const actor = await requireSession()
  const profile = await getUserProfile(actor.id)

  if (!profile) notFound()

  const initials = getInitials(profile.name)
  const membership = describeMembership(profile.departmentName, profile.role)

  return (
    <div className="flex min-h-dvh flex-1 bg-background text-foreground">
      <AppSidebar
        name={profile.name}
        initials={initials}
        membership={membership}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader
          firstName={getFirstName(profile.name)}
          initials={initials}
          membership={membership}
        />
        <AppTopBar />
        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    </div>
  )
}

export default AppLayout
