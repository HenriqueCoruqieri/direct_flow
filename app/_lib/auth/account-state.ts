import { redirect } from "next/navigation"

import { getAccountFacts } from "@/app/_lib/auth/account-facts"
import { getSession } from "@/app/_lib/auth/session"
import type { AccountState } from "@/app/_lib/types/account"
import type { Actor } from "@/app/_lib/types/actor"

export const getAccountState = async (): Promise<AccountState | null> => {
  const facts = await getAccountFacts()
  if (!facts) return null
  return {
    isActive: facts.isActive,
    mustChangePassword: facts.mustChangePassword,
  }
}

export const requirePendingPasswordChange = async (): Promise<Actor> => {
  const actor = await getSession()
  if (!actor) redirect("/login")
  const state = await getAccountState()
  if (!state || !state.isActive) redirect("/login")
  if (!state.mustChangePassword) redirect("/dashboard")
  return actor
}
