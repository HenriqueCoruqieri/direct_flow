import type { Metadata } from "next"
import { notFound } from "next/navigation"

import LogoMark from "@/app/_components/logo-mark"
import ThemeToggle from "@/app/_components/theme/theme-toggle"
import { signOut } from "@/app/_lib/actions/auth"
import { requireSession } from "@/app/_lib/auth/session"
import { getUserById } from "@/app/_lib/data/users"
import type { Role } from "@/app/_lib/types/actor"
import SignOutButton from "@/app/dashboard/_components/sign-out-button"

export const metadata: Metadata = {
  title: "Painel",
}

const roleLabel: Record<Role, string> = {
  admin: "Administrador",
  member: "Membro",
}

const DashboardPage = async () => {
  const actor = await requireSession()
  const user = await getUserById(actor.id)

  if (!user) notFound()

  return (
    <div className="py-safe-12 relative flex min-h-dvh flex-1 flex-col items-center justify-center bg-background px-safe-6 text-foreground">
      <div className="absolute top-safe-3 right-safe-3 lg:top-safe-6 lg:right-safe-6">
        <ThemeToggle />
      </div>

      <main className="w-full max-w-md rounded-2xl border border-border-subtle bg-surface p-8">
        <div className="flex items-center gap-4">
          <LogoMark size="md" />
          <div className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">Sessão ativa</span>
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              {user.name}
            </h1>
          </div>
        </div>

        <dl className="mt-8 flex flex-col gap-4 border-t border-border-subtle pt-6">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-sm text-muted-foreground">E-mail</dt>
            <dd className="text-sm font-medium">{user.email}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-sm text-muted-foreground">Papel</dt>
            <dd className="text-sm font-medium">{roleLabel[user.role]}</dd>
          </div>
        </dl>

        <form action={signOut} className="mt-8">
          <SignOutButton />
        </form>
      </main>
    </div>
  )
}

export default DashboardPage
