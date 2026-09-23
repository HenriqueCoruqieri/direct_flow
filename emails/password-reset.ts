import type { PasswordResetEmailInput } from "@/app/_lib/types/email"

export type PasswordResetEmailProps = Omit<PasswordResetEmailInput, "to">

export const renderPasswordResetEmailHtml = (
  props: PasswordResetEmailProps,
): string => {
  const { userName, resetUrl, expiresInMinutes } = props

  return `<!doctype html>
<html lang="pt-BR">
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; padding: 32px 16px;">
    <div style="max-width: 480px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; padding: 32px;">
      <p>Olá, ${userName}.</p>
      <p>
        Recebemos um pedido para redefinir a senha da sua conta no Direct
        Flow. Clique no botão abaixo para escolher uma nova senha:
      </p>
      <a
        href="${resetUrl}"
        style="display: inline-block; margin-top: 24px; padding: 12px 24px; background-color: #111827; color: #ffffff; border-radius: 6px; text-decoration: none; font-weight: 600;"
      >
        Redefinir senha
      </a>
      <p style="color: #6b7280; font-size: 14px; line-height: 20px;">
        Este link é de uso único e vale por ${expiresInMinutes} minutos.
      </p>
      <p style="color: #6b7280; font-size: 14px; line-height: 20px;">
        Se você não pediu essa redefinição, ignore este e-mail: nenhuma
        alteração será feita na sua conta.
      </p>
    </div>
  </body>
</html>`
}
