import { emailFrom, resend } from "@/app/_lib/email/client"

interface SendTemplatedEmailInput {
  to: string
  subject: string
  html: string
  logPrefix: string
  devLogFields?: Record<string, unknown>
}

export const sendTemplatedEmail = async (
  input: SendTemplatedEmailInput,
): Promise<void> => {
  const { to, subject, html, logPrefix, devLogFields } = input

  if (!resend) {
    if (process.env.NODE_ENV !== "development") {
      throw new Error(
        `${logPrefix} RESEND_API_KEY não configurada fora de desenvolvimento`,
      )
    }

    console.info(
      `${logPrefix} RESEND_API_KEY não configurada, e-mail não enviado`,
      {
        to,
        subject,
        ...devLogFields,
      },
    )
    return
  }

  if (!emailFrom) {
    throw new Error(`${logPrefix} EMAIL_FROM não configurada em .env`)
  }

  const { error } = await resend.emails.send({
    from: emailFrom,
    to,
    subject,
    html,
  })

  if (error) {
    throw new Error(`${logPrefix} falha no envio: ${error.message}`)
  }
}
