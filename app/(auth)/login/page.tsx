import type { Metadata } from "next"

import LoginForm from "./_components/login-form"

export const metadata: Metadata = {
  title: "Entrar",
}

const LoginPage = () => {
  return <LoginForm />
}

export default LoginPage
