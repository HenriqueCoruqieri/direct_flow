import { APIError } from "better-auth/api"
import { headers } from "next/headers"

import { auth } from "@/app/_lib/auth/auth"
import type { ChangePasswordInput } from "@/app/_lib/validation/password"

export type PasswordChangeFailure =
  "INVALID_CURRENT_PASSWORD" | "PASSWORD_TOO_SHORT" | "PASSWORD_TOO_LONG"

export type ChangeUserPasswordInput = Pick<
  ChangePasswordInput,
  "currentPassword" | "newPassword"
>

export const changeUserPassword = async (
  input: ChangeUserPasswordInput,
): Promise<PasswordChangeFailure | null> => {
  try {
    await auth.api.changePassword({
      body: {
        currentPassword: input.currentPassword,
        newPassword: input.newPassword,
        revokeOtherSessions: true,
      },
      headers: await headers(),
    })
    return null
  } catch (error) {
    if (!(error instanceof APIError)) throw error
    if (error.body?.code === "INVALID_PASSWORD") {
      return "INVALID_CURRENT_PASSWORD"
    }
    if (error.body?.code === "PASSWORD_TOO_SHORT") return "PASSWORD_TOO_SHORT"
    if (error.body?.code === "PASSWORD_TOO_LONG") return "PASSWORD_TOO_LONG"
    throw error
  }
}
