"use server"

import { redirect } from "next/navigation"

import {
  defineInitialPassword,
  type InitialPasswordFailure,
} from "@/app/_lib/auth/default-password"
import { requireSession } from "@/app/_lib/auth/session"
import {
  type DefinePasswordInput,
  definePasswordSchema,
  SAME_AS_DEFAULT_PASSWORD_ERROR,
} from "@/app/_lib/validation/password"

export type DefinePasswordErrorCode =
  "INVALID_INPUT" | "SAME_AS_DEFAULT" | "USER_DEACTIVATED"

export interface DefinePasswordResult {
  ok: false
  message: string
  code?: DefinePasswordErrorCode
}

const USER_DEACTIVATED_MESSAGE = "Usuário desativado."
const UNEXPECTED_ERROR_MESSAGE =
  "Não foi possível definir a senha agora. Tente novamente."

export const definePassword = async (
  input: DefinePasswordInput,
): Promise<DefinePasswordResult | void> => {
  await requireSession()

  const parsed = definePasswordSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      code: "INVALID_INPUT",
      message: parsed.error.issues[0]?.message ?? UNEXPECTED_ERROR_MESSAGE,
    }
  }

  let failure: InitialPasswordFailure | null

  try {
    failure = await defineInitialPassword({
      newPassword: parsed.data.newPassword,
    })
  } catch (error) {
    console.error("[definePassword]", error)
    return { ok: false, message: UNEXPECTED_ERROR_MESSAGE }
  }

  if (failure === "SAME_AS_DEFAULT") {
    return {
      ok: false,
      code: "SAME_AS_DEFAULT",
      message: SAME_AS_DEFAULT_PASSWORD_ERROR,
    }
  }

  if (failure === "USER_DEACTIVATED") {
    return {
      ok: false,
      code: "USER_DEACTIVATED",
      message: USER_DEACTIVATED_MESSAGE,
    }
  }

  redirect("/dashboard")
}
