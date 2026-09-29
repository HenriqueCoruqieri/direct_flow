import { and, eq } from "drizzle-orm"
import { headers } from "next/headers"

import { getAccountFacts } from "@/app/_lib/auth/account-facts"
import { auth } from "@/app/_lib/auth/auth"
import { requireSession } from "@/app/_lib/auth/session"
import type { DefinePasswordInput } from "@/app/_lib/validation/password"
import { db } from "@/db"
import { account } from "@/db/auth-schema"
import { user } from "@/db/schema"

export type InitialPasswordFailure =
  "NOT_REQUIRED" | "SAME_AS_DEFAULT" | "USER_DEACTIVATED"

export type DefineInitialPasswordInput = Pick<
  DefinePasswordInput,
  "newPassword"
>

const CREDENTIAL_PROVIDER_ID = "credential"

export const hashDefaultPassword = async (): Promise<string | null> => {
  const defaultPassword = process.env.DEFAULT_USER_PASSWORD
  if (!defaultPassword) return null
  const ctx = await auth.$context
  return ctx.password.hash(defaultPassword)
}

export const defineInitialPassword = async (
  input: DefineInitialPasswordInput,
): Promise<InitialPasswordFailure | null> => {
  const actor = await requireSession()
  const facts = await getAccountFacts()
  if (!facts || !facts.isActive) return "USER_DEACTIVATED"
  if (!facts.mustChangePassword) return "NOT_REQUIRED"

  const ctx = await auth.$context
  const credential = await ctx.internalAdapter.findCredentialAccount(
    String(actor.id),
  )
  if (
    credential?.password &&
    (await ctx.password.verify({
      hash: credential.password,
      password: input.newPassword,
    }))
  ) {
    return "SAME_AS_DEFAULT"
  }

  await auth.api.revokeOtherSessions({ headers: await headers() })

  const passwordHash = await ctx.password.hash(input.newPassword)

  return db.transaction(async (tx): Promise<InitialPasswordFailure | null> => {
    const now = new Date()
    const cleared = await tx
      .update(user)
      .set({ mustChangePassword: false, updatedAt: now })
      .where(and(eq(user.id, actor.id), eq(user.mustChangePassword, true)))
      .returning({ id: user.id })
    if (cleared.length === 0) return "NOT_REQUIRED"
    const updated = await tx
      .update(account)
      .set({ password: passwordHash, updatedAt: now })
      .where(
        and(
          eq(account.userId, actor.id),
          eq(account.providerId, CREDENTIAL_PROVIDER_ID),
        ),
      )
      .returning({ id: account.id })
    if (updated.length === 0) {
      await tx.insert(account).values({
        accountId: String(actor.id),
        providerId: CREDENTIAL_PROVIDER_ID,
        userId: actor.id,
        password: passwordHash,
        createdAt: now,
        updatedAt: now,
      })
    }
    return null
  })
}
