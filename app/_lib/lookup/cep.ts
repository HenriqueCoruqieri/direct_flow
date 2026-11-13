import type { CepLookupOutcome } from "@/app/_lib/types/company-lookup"
import { parseViaCep } from "@/app/_lib/validation/company-lookup"

const VIA_CEP_URL = "https://viacep.com.br/ws"
const USER_AGENT = "direct-flow"
const TIMEOUT_MS = 5000

export const fetchAddressByCep = async (
  cep: string,
): Promise<CepLookupOutcome> => {
  try {
    const response = await fetch(`${VIA_CEP_URL}/${cep}/json/`, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    })

    if (response.status === 200) {
      return parseViaCep(await response.json())
    }
    if (response.status === 400) {
      return { status: "not_found" }
    }
    console.error("[fetchAddressByCep]", `HTTP ${response.status}`)
    return { status: "unavailable" }
  } catch (error) {
    console.error(
      "[fetchAddressByCep]",
      error instanceof Error ? error.name : "unknown error",
    )
    return { status: "unavailable" }
  }
}
