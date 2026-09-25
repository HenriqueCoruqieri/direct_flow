export interface PasswordResetEmailInput {
  to: string
  userName: string
  resetUrl: string
  expiresInMinutes: number
}

export interface PasswordChangedEmailInput {
  to: string
  userName: string
  changedAt: Date
}
