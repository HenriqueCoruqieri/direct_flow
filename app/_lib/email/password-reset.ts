import { emailFrom, resend } from "@/app/_lib/email/client"
import type { PasswordResetEmailInput } from "@/app/_lib/types/email"
import { renderPasswordResetEmailHtml } from "@/emails/password-reset"

const SUBJECT = "Redefinição de senha — Direct Flow"

export const sendPasswordResetEmail = async (
  input: PasswordResetEmailInput,
): Promise<void> => {
  const html = renderPasswordResetEmailHtml({
    userName: input.userName,
    resetUrl: input.resetUrl,
    expiresInMinutes: input.expiresInMinutes,
  })

  if (!resend) {
    if (process.env.NODE_ENV !== "development") {
      throw new Error(
        "[sendPasswordResetEmail] RESEND_API_KEY não configurada fora de desenvolvimento",
      )
    }

    console.info(
      "[sendPasswordResetEmail] RESEND_API_KEY não configurada, e-mail não enviado",
      {
        to: input.to,
        subject: SUBJECT,
        resetUrl: input.resetUrl,
        expiresInMinutes: input.expiresInMinutes,
      },
    )
    return
  }

  if (!emailFrom) {
    throw new Error(
      "[sendPasswordResetEmail] EMAIL_FROM não configurada em .env",
    )
  }

  const { error } = await resend.emails.send({
    from: emailFrom,
    to: input.to,
    subject: SUBJECT,
    html,
  })

  if (error) {
    throw new Error(`[sendPasswordResetEmail] falha no envio: ${error.message}`)
  }
}
