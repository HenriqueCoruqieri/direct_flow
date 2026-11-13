"use server"

import { getDirector } from "@/app/_lib/auth/director"
import {
  cepLookupFailure,
  cepLookupResponse,
  cnpjLookupFailure,
  cnpjLookupResponse,
} from "@/app/_lib/domain/company-lookup"
import { fetchAddressByCep } from "@/app/_lib/lookup/cep"
import { fetchCompanyByCnpj } from "@/app/_lib/lookup/cnpj"
import type {
  CepLookupResponse,
  CnpjLookupResponse,
} from "@/app/_lib/types/company-lookup"
import {
  type LookupCepInput,
  lookupCepSchema,
  type LookupCnpjInput,
  lookupCnpjSchema,
} from "@/app/_lib/validation/company-lookup"

export const lookupCnpj = async (
  input: LookupCnpjInput,
): Promise<CnpjLookupResponse> => {
  const director = await getDirector()
  if (!director) return cnpjLookupFailure("FORBIDDEN")

  const parsed = lookupCnpjSchema.safeParse(input)
  if (!parsed.success) return cnpjLookupFailure("INVALID_INPUT")

  try {
    const outcome = await fetchCompanyByCnpj(parsed.data.cnpj)
    return cnpjLookupResponse(outcome)
  } catch (error) {
    console.error("[lookupCnpj]", error)
    return cnpjLookupFailure("UNAVAILABLE")
  }
}

export const lookupCep = async (
  input: LookupCepInput,
): Promise<CepLookupResponse> => {
  const director = await getDirector()
  if (!director) return cepLookupFailure("FORBIDDEN")

  const parsed = lookupCepSchema.safeParse(input)
  if (!parsed.success) return cepLookupFailure("INVALID_INPUT")

  try {
    const outcome = await fetchAddressByCep(parsed.data.cep)
    return cepLookupResponse(outcome)
  } catch (error) {
    console.error("[lookupCep]", error)
    return cepLookupFailure("UNAVAILABLE")
  }
}
