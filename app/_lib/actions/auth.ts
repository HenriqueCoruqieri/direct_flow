"use server"

import { redirect } from "next/navigation"

import {
  type SignInFailure,
  signInWithPassword,
  signOutSession,
} from "@/app/_lib/auth/session"
import { type LoginInput, loginSchema } from "@/app/_lib/validation/auth"

export type LoginErrorCode = SignInFailure

export interface SignInResult {
  ok: false
  message: string
  code?: LoginErrorCode
}

const LOGIN_ERROR_MESSAGE: Record<LoginErrorCode, string> = {
  INVALID_CREDENTIALS: "E-mail ou senha inválidos.",
  USER_DEACTIVATED: "Usuário desativado.",
}

const UNEXPECTED_ERROR_MESSAGE =
  "Não foi possível entrar agora. Tente novamente."

export const signIn = async (
  input: LoginInput,
): Promise<SignInResult | void> => {
  const parsed = loginSchema.safeParse(input)

  if (!parsed.success) {
    return {
      ok: false,
      code: "INVALID_CREDENTIALS",
      message: LOGIN_ERROR_MESSAGE.INVALID_CREDENTIALS,
    }
  }

  let failure: SignInFailure | null

  try {
    failure = await signInWithPassword(parsed.data)
  } catch (error) {
    console.error("[signIn]", error)
    return { ok: false, message: UNEXPECTED_ERROR_MESSAGE }
  }

  if (failure) {
    return { ok: false, code: failure, message: LOGIN_ERROR_MESSAGE[failure] }
  }

  redirect("/dashboard")
}

export const signOut = async (): Promise<void> => {
  try {
    await signOutSession()
  } catch (error) {
    console.error("[signOut]", error)
  }

  redirect("/login")
}
