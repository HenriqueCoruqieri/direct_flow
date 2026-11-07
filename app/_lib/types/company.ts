import type { BrazilianState, CompanyContactPosition } from "@/db/schema"

export type { BrazilianState, CompanyContactPosition }

export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7

export interface CompanyValues {
  cnpj: string
  legalName: string
  tradeName: string
  email: string
  primaryPhone: string
  secondaryPhone: string | null
  cep: string
  state: BrazilianState
  street: string
  number: string
  district: string
  city: string
  complement: string | null
  managerName: string
  managerPhone: string
  businessDays: Weekday[] | null
  opensAt: string | null
  closesAt: string | null
  notes: string | null
}

export interface CompanyListItem extends CompanyValues {
  id: number
  isActive: boolean
  createdAt: Date
}

export interface CompanySaved {
  status: "saved"
  id: number
}

export interface CompanyCnpjTaken {
  status: "cnpj_taken"
  existingIsActive: boolean
}

export interface CompanyNotFound {
  status: "not_found"
}

export type InsertCompanyOutcome = CompanySaved | CompanyCnpjTaken

export type UpdateCompanyOutcome =
  CompanySaved | CompanyCnpjTaken | CompanyNotFound

export type UpdateCompanyActiveOutcome = CompanySaved | CompanyNotFound

export interface BusinessHoursDraft {
  businessDays: readonly Weekday[]
  opensAt: string | null
  closesAt: string | null
}

export type BusinessHoursProblem =
  | "DAYS_WITHOUT_OPENS_AT"
  | "DAYS_WITHOUT_CLOSES_AT"
  | "TIMES_WITHOUT_DAYS"
  | "CLOSES_NOT_AFTER_OPENS"

export interface BusinessHoursValid {
  ok: true
}

export interface BusinessHoursInvalid {
  ok: false
  problems: BusinessHoursProblem[]
}

export type BusinessHoursCheck = BusinessHoursValid | BusinessHoursInvalid

export type CompanySearchable = Pick<
  CompanyValues,
  "tradeName" | "legalName" | "cnpj"
>
