import type { BrazilianState } from "@/app/_lib/types/company"

export interface LookupAddress {
  state: BrazilianState | null
  city: string | null
  district: string | null
  street: string | null
}

export interface CepLookupResult extends LookupAddress {
  cep: string
}

export interface CnpjLookupResult extends LookupAddress {
  legalName: string
  tradeName: string | null
  cep: string | null
  number: string | null
  complement: string | null
}

export interface LookupFound<TResult> {
  status: "found"
  result: TResult
}

export interface LookupNotFound {
  status: "not_found"
}

export interface LookupUnsupported {
  status: "unsupported"
}

export interface LookupUnavailable {
  status: "unavailable"
}

export type CnpjLookupOutcome =
  | LookupFound<CnpjLookupResult>
  | LookupNotFound
  | LookupUnsupported
  | LookupUnavailable

export type CepLookupOutcome =
  LookupFound<CepLookupResult> | LookupNotFound | LookupUnavailable

export type CompanyLookupTextField =
  | "legalName"
  | "tradeName"
  | "cep"
  | "street"
  | "number"
  | "district"
  | "city"
  | "complement"

export interface CompanyLookupTextFill {
  field: CompanyLookupTextField
  value: string
}

export interface CompanyLookupStateFill {
  field: "state"
  value: BrazilianState
}

export type CompanyLookupFillEntry =
  CompanyLookupTextFill | CompanyLookupStateFill

export type CnpjLookupErrorCode =
  "INVALID_INPUT" | "FORBIDDEN" | "NOT_FOUND" | "UNSUPPORTED" | "UNAVAILABLE"

export type CepLookupErrorCode = Exclude<CnpjLookupErrorCode, "UNSUPPORTED">

export interface CompanyLookupSuccess {
  ok: true
  fill: CompanyLookupFillEntry[]
  message: string
}

export interface CompanyLookupFailure<TCode extends CnpjLookupErrorCode> {
  ok: false
  code: TCode
  message: string
}

export type CnpjLookupResponse =
  CompanyLookupSuccess | CompanyLookupFailure<CnpjLookupErrorCode>

export type CepLookupResponse =
  CompanyLookupSuccess | CompanyLookupFailure<CepLookupErrorCode>
