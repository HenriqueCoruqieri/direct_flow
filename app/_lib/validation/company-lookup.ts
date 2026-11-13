import { z } from "zod"

import {
  CEP_DIGITS,
  cleanCep,
  isBrazilianState,
  isValidCep,
} from "@/app/_lib/domain/brazilian-formats"
import type { BrazilianState } from "@/app/_lib/types/company"
import type {
  CepLookupOutcome,
  CepLookupResult,
  CnpjLookupOutcome,
  CnpjLookupResult,
} from "@/app/_lib/types/company-lookup"
import {
  companyCepSchema,
  companyCnpjSchema,
} from "@/app/_lib/validation/company"

export const lookupCnpjSchema = z.object({ cnpj: companyCnpjSchema })

export type LookupCnpjInput = z.input<typeof lookupCnpjSchema>

export const lookupCepSchema = z.object({ cep: companyCepSchema })

export type LookupCepInput = z.input<typeof lookupCepSchema>

const blankToNull = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim() ?? ""
  return trimmed.length > 0 ? trimmed : null
}

const providerTextSchema = z.string().nullish().transform(blankToNull)

const providerStateSchema = z
  .string()
  .nullish()
  .transform((value): BrazilianState | null => {
    const state = value?.trim().toUpperCase() ?? ""
    return isBrazilianState(state) ? state : null
  })

const providerCepSchema = z
  .union([z.string(), z.number()])
  .nullish()
  .transform((value): string | null => {
    const raw =
      typeof value === "number"
        ? String(value).padStart(CEP_DIGITS, "0")
        : (value ?? "")
    const cep = cleanCep(raw)
    return isValidCep(cep) ? cep : null
  })

const composeStreet = (
  kind: string | null,
  name: string | null,
): string | null => {
  if (!name) return null
  if (!kind || name.toUpperCase().startsWith(`${kind.toUpperCase()} `)) {
    return name
  }
  return `${kind} ${name}`
}

const brasilApiCnpjSchema = z
  .object({
    razao_social: z.string().trim().min(1),
    nome_fantasia: providerTextSchema,
    descricao_tipo_de_logradouro: providerTextSchema,
    logradouro: providerTextSchema,
    numero: providerTextSchema,
    complemento: providerTextSchema,
    bairro: providerTextSchema,
    municipio: providerTextSchema,
    uf: providerStateSchema,
    cep: providerCepSchema,
  })
  .transform((raw): CnpjLookupResult => ({
    legalName: raw.razao_social,
    tradeName: raw.nome_fantasia,
    cep: raw.cep,
    state: raw.uf,
    city: raw.municipio,
    district: raw.bairro,
    street: composeStreet(raw.descricao_tipo_de_logradouro, raw.logradouro),
    number: raw.numero,
    complement: raw.complemento,
  }))

const viaCepNotFoundSchema = z.object({
  erro: z.union([z.literal(true), z.literal("true")]),
})

const viaCepFoundSchema = z
  .object({
    cep: providerCepSchema.pipe(z.string()),
    logradouro: providerTextSchema,
    bairro: providerTextSchema,
    localidade: providerTextSchema,
    uf: providerStateSchema,
  })
  .transform((raw): CepLookupResult => ({
    cep: raw.cep,
    state: raw.uf,
    city: raw.localidade,
    district: raw.bairro,
    street: raw.logradouro,
  }))

export const parseBrasilApiCnpj = (raw: unknown): CnpjLookupOutcome => {
  const parsed = brasilApiCnpjSchema.safeParse(raw)
  return parsed.success
    ? { status: "found", result: parsed.data }
    : { status: "unavailable" }
}

export const parseViaCep = (raw: unknown): CepLookupOutcome => {
  if (viaCepNotFoundSchema.safeParse(raw).success) {
    return { status: "not_found" }
  }
  const parsed = viaCepFoundSchema.safeParse(raw)
  return parsed.success
    ? { status: "found", result: parsed.data }
    : { status: "unavailable" }
}
