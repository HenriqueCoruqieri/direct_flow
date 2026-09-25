import { formatDateTime } from "@/app/_lib/date"
import type { PasswordChangedEmailInput } from "@/app/_lib/types/email"
import { escapeHtml } from "@/emails/html"

export type PasswordChangedEmailProps = Omit<PasswordChangedEmailInput, "to">

export const renderPasswordChangedEmailHtml = (
  props: PasswordChangedEmailProps,
): string => {
  const { userName, changedAt } = props
  const safeUserName = escapeHtml(userName)

  return `<!doctype html>
<html lang="pt-BR">
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; padding: 32px 16px;">
    <div style="max-width: 480px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; padding: 32px;">
      <p>Olá, ${safeUserName}.</p>
      <p>
        A senha da sua conta no Direct Flow foi alterada em
        ${formatDateTime(changedAt)} (horário de Brasília).
      </p>
      <p>
        As outras sessões abertas nessa conta foram encerradas. Esta é a única
        que continua ativa.
      </p>
      <p style="color: #6b7280; font-size: 14px; line-height: 20px;">
        Se foi você quem alterou, não precisa fazer nada.
      </p>
      <p style="color: #6b7280; font-size: 14px; line-height: 20px;">
        Se não foi você, redefina a senha agora mesmo pela opção "Esqueci
        minha senha" na tela de login e avise o administrador do seu setor.
      </p>
    </div>
  </body>
</html>`
}
