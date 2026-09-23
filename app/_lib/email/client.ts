import { PHASE_PRODUCTION_BUILD } from "next/constants"
import { Resend } from "resend"

const isDevelopment = process.env.NODE_ENV === "development"
const isProductionBuild = process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD
const resendApiKey = process.env.RESEND_API_KEY

if (!resendApiKey && !isDevelopment && !isProductionBuild) {
  throw new Error(
    "RESEND_API_KEY não configurada. Obrigatória fora de desenvolvimento.",
  )
}

export const resend = resendApiKey ? new Resend(resendApiKey) : null

export const emailFrom = process.env.EMAIL_FROM
