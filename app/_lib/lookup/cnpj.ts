import { isAlphanumericCnpj } from "@/app/_lib/domain/brazilian-formats"
import type { CnpjLookupOutcome } from "@/app/_lib/types/company-lookup"
import { parseBrasilApiCnpj } from "@/app/_lib/validation/company-lookup"

const BRASIL_API_CNPJ_URL = "https://brasilapi.com.br/api/cnpj/v1"
const USER_AGENT = "direct-flow"
const TIMEOUT_MS = 5000

export const fetchCompanyByCnpj = async (
  cnpj: string,
): Promise<CnpjLookupOutcome> => {
  try {
    const response = await fetch(`${BRASIL_API_CNPJ_URL}/${cnpj}`, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    })

    if (response.status === 200) {
      return parseBrasilApiCnpj(await response.json())
    }
    if (response.status === 400 || response.status === 404) {
      return isAlphanumericCnpj(cnpj)
        ? { status: "unsupported" }
        : { status: "not_found" }
    }
    console.error("[fetchCompanyByCnpj]", `HTTP ${response.status}`)
    return { status: "unavailable" }
  } catch (error) {
    console.error(
      "[fetchCompanyByCnpj]",
      error instanceof Error ? error.name : "unknown error",
    )
    return { status: "unavailable" }
  }
}
