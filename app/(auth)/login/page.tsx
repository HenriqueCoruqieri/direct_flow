import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { getSession } from "@/app/_lib/auth/session"

import LoginForm from "./_components/login-form"
import ResetSuccessToast from "./_components/reset-success-toast"

export const metadata: Metadata = {
  title: "Entrar",
}

const LoginPage = async ({ searchParams }: PageProps<"/login">) => {
  const actor = await getSession()

  if (actor) redirect("/dashboard")

  const { reset } = await searchParams

  return (
    <>
      {reset === "success" ? <ResetSuccessToast /> : null}
      <LoginForm />
    </>
  )
}

export default LoginPage
