import type { Metadata } from "next"

import AuthShell from "@/app/_components/auth/auth-shell"

import LoginForm from "./_components/login-form"

export const metadata: Metadata = {
  title: "Entrar",
}

const LoginPage = () => {
  return (
    <AuthShell>
      <LoginForm />
    </AuthShell>
  )
}

export default LoginPage
