import {
  CNPJ_LENGTH,
  formatCep,
  isValidCep,
  isValidCnpj,
} from "@/app/_lib/domain/brazilian-formats"
import type {
  CepLookupErrorCode,
  CepLookupOutcome,
  CepLookupResponse,
  CepLookupResult,
  CnpjLookupErrorCode,
  CnpjLookupOutcome,
  CnpjLookupResponse,
  CnpjLookupResult,
  CompanyLookupFailure,
  CompanyLookupFillEntry,
  CompanyLookupTextField,
  LookupAddress,
} from "@/app/_lib/types/company-lookup"

export const CNPJ_LOOKUP_LOADING_MESSAGE = "Consultando CNPJ…"

export const CEP_LOOKUP_LOADING_MESSAGE = "Consultando CEP…"

export const CNPJ_LOOKUP_FOUND_MESSAGE =
  "Dados preenchidos pela consulta do CNPJ. Confira antes de salvar."

export const CEP_LOOKUP_FOUND_MESSAGE =
  "Endereço preenchido pela consulta do CEP. Confira antes de salvar."

export const CNPJ_LOOKUP_ERROR_MESSAGES = {
  INVALID_INPUT: "Informe um CNPJ válido para consultar.",
  FORBIDDEN: "Você não tem permissão para consultar CNPJ.",
  NOT_FOUND: "CNPJ não encontrado na consulta. Preencha os dados à mão.",
  UNSUPPORTED:
    "A consulta ainda não aceita CNPJ alfanumérico. Preencha os dados à mão.",
  UNAVAILABLE:
    "A consulta de CNPJ está indisponível agora. Preencha os dados à mão.",
} satisfies Record<CnpjLookupErrorCode, string>

export const CEP_LOOKUP_ERROR_MESSAGES = {
  INVALID_INPUT: "Informe um CEP válido para consultar.",
  FORBIDDEN: "Você não tem permissão para consultar CEP.",
  NOT_FOUND: "CEP não encontrado. Preencha o endereço à mão.",
  UNAVAILABLE:
    "A consulta de CEP está indisponível agora. Preencha o endereço à mão.",
} satisfies Record<CepLookupErrorCode, string>

export const isCnpjLookupReady = (cnpj: string): boolean =>
  cnpj.length === CNPJ_LENGTH && isValidCnpj(cnpj)

export const isCepLookupReady = (cep: string): boolean => isValidCep(cep)

const textEntry = (
  field: CompanyLookupTextField,
  value: string | null,
): CompanyLookupFillEntry[] => (value ? [{ field, value }] : [])

const addressEntries = (address: LookupAddress): CompanyLookupFillEntry[] => [
  ...(address.state ? [{ field: "state" as const, value: address.state }] : []),
  ...textEntry("street", address.street),
  ...textEntry("district", address.district),
  ...textEntry("city", address.city),
]

export const cnpjLookupFill = (
  result: CnpjLookupResult,
): CompanyLookupFillEntry[] => [
  ...textEntry("legalName", result.legalName),
  ...textEntry("tradeName", result.tradeName),
  ...textEntry("cep", result.cep ? formatCep(result.cep) : null),
  ...addressEntries(result),
  ...textEntry("number", result.number),
  ...textEntry("complement", result.complement),
]

export const cepLookupFill = (
  result: CepLookupResult,
): CompanyLookupFillEntry[] => addressEntries(result)

export const cnpjLookupFailure = (
  code: CnpjLookupErrorCode,
): CompanyLookupFailure<CnpjLookupErrorCode> => ({
  ok: false,
  code,
  message: CNPJ_LOOKUP_ERROR_MESSAGES[code],
})

export const cepLookupFailure = (
  code: CepLookupErrorCode,
): CompanyLookupFailure<CepLookupErrorCode> => ({
  ok: false,
  code,
  message: CEP_LOOKUP_ERROR_MESSAGES[code],
})

const SETTLED_LOOKUP_ERROR_CODES: readonly CnpjLookupErrorCode[] = [
  "NOT_FOUND",
  "UNSUPPORTED",
]

export const isLookupSettled = (
  response: CnpjLookupResponse | CepLookupResponse,
): boolean => response.ok || SETTLED_LOOKUP_ERROR_CODES.includes(response.code)

export const cnpjLookupResponse = (
  outcome: CnpjLookupOutcome,
): CnpjLookupResponse => {
  switch (outcome.status) {
    case "found":
      return {
        ok: true,
        fill: cnpjLookupFill(outcome.result),
        message: CNPJ_LOOKUP_FOUND_MESSAGE,
      }
    case "not_found":
      return cnpjLookupFailure("NOT_FOUND")
    case "unsupported":
      return cnpjLookupFailure("UNSUPPORTED")
    case "unavailable":
      return cnpjLookupFailure("UNAVAILABLE")
  }
}

export const cepLookupResponse = (
  outcome: CepLookupOutcome,
): CepLookupResponse => {
  switch (outcome.status) {
    case "found":
      return {
        ok: true,
        fill: cepLookupFill(outcome.result),
        message: CEP_LOOKUP_FOUND_MESSAGE,
      }
    case "not_found":
      return cepLookupFailure("NOT_FOUND")
    case "unavailable":
      return cepLookupFailure("UNAVAILABLE")
  }
}
