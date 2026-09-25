import { sendTemplatedEmail } from "@/app/_lib/email/shared"
import type { PasswordResetEmailInput } from "@/app/_lib/types/email"
import { renderPasswordResetEmailHtml } from "@/emails/password-reset"

const SUBJECT = "Redefinição de senha — Direct Flow"
const LOG_PREFIX = "[sendPasswordResetEmail]"

export const sendPasswordResetEmail = async (
  input: PasswordResetEmailInput,
): Promise<void> => {
  const html = renderPasswordResetEmailHtml({
    userName: input.userName,
    resetUrl: input.resetUrl,
    expiresInMinutes: input.expiresInMinutes,
  })

  await sendTemplatedEmail({
    to: input.to,
    subject: SUBJECT,
    html,
    logPrefix: LOG_PREFIX,
    devLogFields: {
      resetUrl: input.resetUrl,
      expiresInMinutes: input.expiresInMinutes,
    },
  })
}
