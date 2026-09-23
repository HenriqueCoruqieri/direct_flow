export interface PasswordResetEmailInput {
  to: string
  userName: string
  resetUrl: string
  expiresInMinutes: number
}
