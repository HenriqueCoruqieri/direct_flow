import type { Metadata } from "next"

import { requirePendingPasswordChange } from "@/app/_lib/auth/account-state"

import SetPasswordForm from "./_components/set-password-form"

export const metadata: Metadata = {
  title: "Defina sua senha",
}

const SetPasswordPage = async () => {
  await requirePendingPasswordChange()

  return <SetPasswordForm />
}

export default SetPasswordPage
