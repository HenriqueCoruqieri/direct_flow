import { APIError } from "better-auth/api"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { auth } from "@/app/_lib/auth/auth"
import type { Actor } from "@/app/_lib/types/actor"
import type { LoginInput } from "@/app/_lib/validation/auth"

export type SignInFailure = "INVALID_CREDENTIALS" | "USER_DEACTIVATED"

export const getSession = async (): Promise<Actor | null> => {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return null
  const { user } = session
  return {
    id: Number(user.id),
    name: user.name,
    email: user.email,
    role: user.role,
    departmentId: user.departmentId,
  }
}

export const requireSession = async (): Promise<Actor> => {
  const actor = await getSession()
  if (!actor) redirect("/login")
  return actor
}

export const requireDepartmentAdmin = async (
  departmentId: number,
): Promise<Actor> => {
  const actor = await requireSession()
  if (actor.role !== "admin" || actor.departmentId !== departmentId) {
    throw new Error("Acesso restrito ao administrador do setor.")
  }
  return actor
}

export const signInWithPassword = async (
  input: LoginInput,
): Promise<SignInFailure | null> => {
  try {
    await auth.api.signInEmail({
      body: { email: input.email, password: input.password },
      headers: await headers(),
    })
    return null
  } catch (error) {
    if (!(error instanceof APIError)) throw error
    if (error.body?.code === "USER_DEACTIVATED") return "USER_DEACTIVATED"
    if (
      error.body?.code === "INVALID_EMAIL_OR_PASSWORD" ||
      error.body?.code === "INVALID_EMAIL"
    ) {
      return "INVALID_CREDENTIALS"
    }
    throw error
  }
}

export const signOutSession = async (): Promise<void> => {
  await auth.api.signOut({ headers: await headers() })
}
