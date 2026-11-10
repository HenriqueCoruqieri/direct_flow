import {
  BRAZILIAN_STATES,
  formatCnpj,
} from "@/app/_lib/domain/brazilian-formats"
import type {
  BrazilianState,
  BusinessHoursCheck,
  BusinessHoursDraft,
  BusinessHoursProblem,
  CompanySearchable,
  Weekday,
} from "@/app/_lib/types/company"

export const WEEKDAY_SHORT_LABELS = {
  1: "Seg",
  2: "Ter",
  3: "Qua",
  4: "Qui",
  5: "Sex",
  6: "Sáb",
  7: "Dom",
} satisfies Record<Weekday, string>

export const WEEKDAY_LABELS = {
  1: "Segunda-feira",
  2: "Terça-feira",
  3: "Quarta-feira",
  4: "Quinta-feira",
  5: "Sexta-feira",
  6: "Sábado",
  7: "Domingo",
} satisfies Record<Weekday, string>

export const WEEKDAYS: readonly Weekday[] = [1, 2, 3, 4, 5, 6, 7]

export const isWeekday = (value: number): value is Weekday =>
  WEEKDAYS.some((day) => day === value)

export const normalizeBusinessDays = (days: readonly Weekday[]): Weekday[] =>
  [...new Set(days)].sort((left, right) => left - right)

export const COMPANY_LEGAL_NAME_MAX_LENGTH = 150

export const COMPANY_STREET_MAX_LENGTH = 120

export const COMPANY_NUMBER_MAX_LENGTH = 10

export const COMPANY_COMPLEMENT_MAX_LENGTH = 80

export const COMPANY_NOTES_MAX_LENGTH = 500

export const COMPANY_COMPLEMENT_PLACEHOLDER = "Sala, andar, bloco"

export const COMPANY_NOTES_PLACEHOLDER = "Informações úteis para quem atende"

export const COMPANY_MANAGER_NAME_PLACEHOLDER = "Nome completo"

export const BUSINESS_HOURS_MESSAGES = {
  DAYS_WITHOUT_OPENS_AT: "Informe o horário de abertura.",
  DAYS_WITHOUT_CLOSES_AT: "Informe o horário de fechamento.",
  CLOSES_NOT_AFTER_OPENS:
    "O horário de fechamento precisa ser depois do de abertura.",
  TIMES_WITHOUT_DAYS: "Marque os dias de atendimento ou apague os horários.",
} satisfies Record<BusinessHoursProblem, string>

export const checkBusinessHours = (
  hours: BusinessHoursDraft,
): BusinessHoursCheck => {
  const problems: BusinessHoursProblem[] = []
  const { opensAt, closesAt } = hours
  if (hours.businessDays.length > 0) {
    if (!opensAt) {
      problems.push("DAYS_WITHOUT_OPENS_AT")
    }
    if (!closesAt) {
      problems.push("DAYS_WITHOUT_CLOSES_AT")
    }
    if (opensAt && closesAt && closesAt <= opensAt) {
      problems.push("CLOSES_NOT_AFTER_OPENS")
    }
  } else if (opensAt || closesAt) {
    problems.push("TIMES_WITHOUT_DAYS")
  }
  return problems.length === 0 ? { ok: true } : { ok: false, problems }
}

const COMPANY_CNPJ_TAKEN_MESSAGE = "Já existe uma empresa com este CNPJ."

const COMPANY_INACTIVE_CNPJ_TAKEN_MESSAGE =
  "Já existe uma empresa inativa com este CNPJ."

export const describeCompanyCnpjTaken = (existingIsActive: boolean): string =>
  existingIsActive
    ? COMPANY_CNPJ_TAKEN_MESSAGE
    : `${COMPANY_INACTIVE_CNPJ_TAKEN_MESSAGE} Reative-a em vez de cadastrar de novo.`

export const describeCompanyCnpjTakenOnUpdate = (
  existingIsActive: boolean,
): string =>
  existingIsActive
    ? COMPANY_CNPJ_TAKEN_MESSAGE
    : COMPANY_INACTIVE_CNPJ_TAKEN_MESSAGE

export const companySearchText = (company: CompanySearchable): string =>
  `${company.tradeName}\n${company.legalName}\n${company.cnpj}\n${formatCnpj(company.cnpj)}`

export const companyLocationLabel = (
  city: string,
  state: BrazilianState,
): string => `${city} / ${state}`

export const statesPresentIn = (
  states: readonly BrazilianState[],
): BrazilianState[] =>
  BRAZILIAN_STATES.filter((state) => states.includes(state))
