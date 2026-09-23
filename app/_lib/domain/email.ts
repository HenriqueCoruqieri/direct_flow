const MASK = "••••••"
const MAX_VISIBLE = 2

export const maskEmail = (email: string): string => {
  const trimmed = email.trim()
  const at = trimmed.lastIndexOf("@")

  if (at < 1 || at === trimmed.length - 1) return MASK

  const local = trimmed.slice(0, at)
  const domain = trimmed.slice(at + 1)
  const visible = Math.min(MAX_VISIBLE, Math.floor(local.length / 2))

  return `${local.slice(0, visible)}${MASK}@${domain}`
}
