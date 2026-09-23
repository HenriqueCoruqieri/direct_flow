import type { Metadata } from "next"

import { findMaskedEmailForResetToken } from "@/app/_lib/auth/password-reset"

import InvalidResetLink from "./_components/invalid-reset-link"
import ResetPasswordForm from "./_components/reset-password-form"

export const metadata: Metadata = {
  title: "Redefinir senha",
}

const ResetPasswordPage = async ({
  searchParams,
}: PageProps<"/reset-password">) => {
  const { token } = await searchParams
  const resetToken =
    typeof token === "string" && token.length > 0 ? token : null
  const maskedEmail = resetToken
    ? await findMaskedEmailForResetToken(resetToken)
    : null

  if (!resetToken || !maskedEmail) return <InvalidResetLink />

  return <ResetPasswordForm token={resetToken} maskedEmail={maskedEmail} />
}

export default ResetPasswordPage
