import { sendTemplatedEmail } from "@/app/_lib/email/shared"
import type { PasswordChangedEmailInput } from "@/app/_lib/types/email"
import { renderPasswordChangedEmailHtml } from "@/emails/password-changed"

const SUBJECT = "Sua senha foi alterada — Direct Flow"
const LOG_PREFIX = "[sendPasswordChangedEmail]"

export const sendPasswordChangedEmail = async (
  input: PasswordChangedEmailInput,
): Promise<void> => {
  const html = renderPasswordChangedEmailHtml({
    userName: input.userName,
    changedAt: input.changedAt,
  })

  await sendTemplatedEmail({
    to: input.to,
    subject: SUBJECT,
    html,
    logPrefix: LOG_PREFIX,
  })
}
