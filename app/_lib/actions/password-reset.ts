"use server"

import { redirect } from "next/navigation"

import {
  requestPasswordResetEmail,
  type ResetPasswordFailure,
  resetPasswordWithToken,
} from "@/app/_lib/auth/password-reset"
import {
  type RequestPasswordResetInput,
  requestPasswordResetSchema,
  type ResetPasswordInput,
  resetPasswordSchema,
} from "@/app/_lib/validation/auth"

export interface RequestPasswordResetSuccess {
  ok: true
  message: string
}

export interface RequestPasswordResetFailure {
  ok: false
  message: string
  code: "INVALID_INPUT"
}

export type RequestPasswordResetResult =
  RequestPasswordResetSuccess | RequestPasswordResetFailure

export type ResetPasswordErrorCode = "INVALID_TOKEN" | "INVALID_INPUT"

export interface ResetPasswordResult {
  ok: false
  message: string
  code?: ResetPasswordErrorCode
}

export interface ResetPasswordActionInput extends ResetPasswordInput {
  token: string
}

const REQUEST_PASSWORD_RESET_MESSAGE =
  "Se houver uma conta com esse e-mail, enviamos as instruções de redefinição."

const INVALID_EMAIL_MESSAGE = "E-mail inválido."

const INVALID_TOKEN_MESSAGE = "Este link expirou ou já foi usado. Peça um novo."

const INVALID_PASSWORD_MESSAGE = "A senha precisa ter entre 8 e 128 caracteres."

const UNEXPECTED_ERROR_MESSAGE =
  "Não foi possível concluir agora. Tente novamente."

const RESET_PASSWORD_ERROR_MESSAGE: Record<ResetPasswordFailure, string> = {
  INVALID_TOKEN: INVALID_TOKEN_MESSAGE,
  PASSWORD_TOO_SHORT: INVALID_PASSWORD_MESSAGE,
  PASSWORD_TOO_LONG: INVALID_PASSWORD_MESSAGE,
}

const RESET_PASSWORD_ERROR_CODE: Record<
  ResetPasswordFailure,
  ResetPasswordErrorCode
> = {
  INVALID_TOKEN: "INVALID_TOKEN",
  PASSWORD_TOO_SHORT: "INVALID_INPUT",
  PASSWORD_TOO_LONG: "INVALID_INPUT",
}

export const requestPasswordReset = async (
  input: RequestPasswordResetInput,
): Promise<RequestPasswordResetResult> => {
  const parsed = requestPasswordResetSchema.safeParse(input)

  if (!parsed.success) {
    return {
      ok: false,
      code: "INVALID_INPUT",
      message: INVALID_EMAIL_MESSAGE,
    }
  }

  try {
    await requestPasswordResetEmail(parsed.data)
  } catch (error) {
    console.error("[requestPasswordReset]", error)
  }

  return { ok: true, message: REQUEST_PASSWORD_RESET_MESSAGE }
}

export const resetPassword = async (
  input: ResetPasswordActionInput,
): Promise<ResetPasswordResult | void> => {
  const parsed = resetPasswordSchema.safeParse({
    password: input.password,
    confirmPassword: input.confirmPassword,
  })

  if (!parsed.success) {
    return {
      ok: false,
      code: "INVALID_INPUT",
      message: INVALID_PASSWORD_MESSAGE,
    }
  }

  const token = input.token.trim()

  if (!token) {
    return {
      ok: false,
      code: "INVALID_TOKEN",
      message: INVALID_TOKEN_MESSAGE,
    }
  }

  let failure: ResetPasswordFailure | null

  try {
    failure = await resetPasswordWithToken({
      token,
      password: parsed.data.password,
    })
  } catch (error) {
    console.error("[resetPassword]", error)
    return { ok: false, message: UNEXPECTED_ERROR_MESSAGE }
  }

  if (failure) {
    return {
      ok: false,
      code: RESET_PASSWORD_ERROR_CODE[failure],
      message: RESET_PASSWORD_ERROR_MESSAGE[failure],
    }
  }

  redirect("/login?reset=success")
}
