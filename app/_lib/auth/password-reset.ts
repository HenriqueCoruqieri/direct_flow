import { APIError } from "better-auth/api"

import { auth } from "@/app/_lib/auth/auth"
import { signOutSession } from "@/app/_lib/auth/session"
import { maskEmail } from "@/app/_lib/domain/email"
import type { RequestPasswordResetInput } from "@/app/_lib/validation/auth"

export type ResetPasswordFailure =
  "INVALID_TOKEN" | "PASSWORD_TOO_SHORT" | "PASSWORD_TOO_LONG"

interface ResetPasswordWithTokenInput {
  token: string
  password: string
}

const RESET_PASSWORD_REDIRECT_TO = "/reset-password"

const RESET_TOKEN_IDENTIFIER_PREFIX = "reset-password:"

export const requestPasswordResetEmail = async (
  input: RequestPasswordResetInput,
): Promise<void> => {
  await auth.api.requestPasswordReset({
    body: { email: input.email, redirectTo: RESET_PASSWORD_REDIRECT_TO },
  })
}

export const resetPasswordWithToken = async (
  input: ResetPasswordWithTokenInput,
): Promise<ResetPasswordFailure | null> => {
  try {
    await auth.api.resetPassword({
      body: { newPassword: input.password, token: input.token },
    })
  } catch (error) {
    if (!(error instanceof APIError)) throw error
    const code = error.body?.code
    if (code === "INVALID_TOKEN" || code === "USER_NOT_FOUND") {
      return "INVALID_TOKEN"
    }
    if (code === "PASSWORD_TOO_SHORT") return "PASSWORD_TOO_SHORT"
    if (code === "PASSWORD_TOO_LONG") return "PASSWORD_TOO_LONG"
    throw error
  }

  try {
    await signOutSession()
  } catch (error) {
    console.error("[resetPasswordWithToken] signOut", error)
  }

  return null
}

export const findMaskedEmailForResetToken = async (
  token: string,
): Promise<string | null> => {
  const ctx = await auth.$context
  const verification = await ctx.internalAdapter.findVerificationValue(
    `${RESET_TOKEN_IDENTIFIER_PREFIX}${token}`,
  )
  if (!verification || verification.expiresAt < new Date()) return null
  const owner = await ctx.internalAdapter.findUserById(verification.value)
  if (!owner) return null
  return maskEmail(owner.email)
}
