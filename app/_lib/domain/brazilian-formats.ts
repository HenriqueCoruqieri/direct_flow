import type { BrazilianState } from "@/app/_lib/types/company"

export const BRAZILIAN_STATE_NAMES = {
  AC: "Acre",
  AL: "Alagoas",
  AP: "Amapá",
  AM: "Amazonas",
  BA: "Bahia",
  CE: "Ceará",
  DF: "Distrito Federal",
  ES: "Espírito Santo",
  GO: "Goiás",
  MA: "Maranhão",
  MT: "Mato Grosso",
  MS: "Mato Grosso do Sul",
  MG: "Minas Gerais",
  PA: "Pará",
  PB: "Paraíba",
  PR: "Paraná",
  PE: "Pernambuco",
  PI: "Piauí",
  RJ: "Rio de Janeiro",
  RN: "Rio Grande do Norte",
  RS: "Rio Grande do Sul",
  RO: "Rondônia",
  RR: "Roraima",
  SC: "Santa Catarina",
  SP: "São Paulo",
  SE: "Sergipe",
  TO: "Tocantins",
} satisfies Record<BrazilianState, string>

const isStateKey = (value: string): value is BrazilianState =>
  Object.hasOwn(BRAZILIAN_STATE_NAMES, value)

export const BRAZILIAN_STATES: readonly BrazilianState[] = Object.keys(
  BRAZILIAN_STATE_NAMES,
).filter(isStateKey)

export const CNPJ_LENGTH = 14

export const CNPJ_BASE_LENGTH = 12

export const CEP_DIGITS = 8

export const PHONE_MIN_DIGITS = 10

export const PHONE_MAX_DIGITS = 11

export const CNPJ_TAIL_PREFIX = "…"

export const CNPJ_PLACEHOLDER = "00.000.000/0000-00"

export const CNPJ_PATTERN = /^[0-9A-Z]{12}[0-9]{2}$/

export const CEP_PLACEHOLDER = "00000-000"

export const PHONE_PLACEHOLDER = "(00) 00000-0000"

const CEP_PATTERN = /^[0-9]{8}$/

const PHONE_PATTERN = /^[1-9][0-9]{9,10}$/

const CNPJ_FIRST_WEIGHTS = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

const CNPJ_SECOND_WEIGHTS = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

const CNPJ_GROUPS = [2, 3, 3, 4, 2]

const CNPJ_SEPARATORS = [".", ".", "/", "-"]

const CEP_GROUPS = [5, 3]

const CEP_SEPARATORS = ["-"]

export const onlyDigits = (value: string): string => value.replace(/\D/g, "")

export const stripCnpjMask = (value: string): string =>
  value.toUpperCase().replace(/[^0-9A-Z]/g, "")

export const cleanCnpj = (value: string): string => {
  let result = ""
  for (const char of stripCnpjMask(value)) {
    if (result.length >= CNPJ_LENGTH) {
      break
    }
    if (result.length < CNPJ_BASE_LENGTH || /[0-9]/.test(char)) {
      result += char
    }
  }
  return result
}

export const cleanCep = (value: string): string =>
  onlyDigits(value).slice(0, CEP_DIGITS)

export const cleanPhone = (value: string): string =>
  onlyDigits(value).slice(0, PHONE_MAX_DIGITS)

export const isBrazilianState = (value: string): value is BrazilianState =>
  BRAZILIAN_STATES.some((state) => state === value)

export const brazilianStateLabel = (state: BrazilianState): string =>
  `${state} — ${BRAZILIAN_STATE_NAMES[state]}`

const cnpjCheckDigit = (base: string, weights: readonly number[]): number => {
  let sum = 0
  for (let index = 0; index < weights.length; index += 1) {
    sum += (base.charCodeAt(index) - 48) * (weights[index] ?? 0)
  }
  const remainder = sum % 11
  return remainder < 2 ? 0 : 11 - remainder
}

export const isValidCnpj = (digits: string): boolean => {
  if (!CNPJ_PATTERN.test(digits)) {
    return false
  }
  if (digits.split("").every((char) => char === digits[0])) {
    return false
  }
  const base = digits.slice(0, CNPJ_BASE_LENGTH)
  const first = cnpjCheckDigit(base, CNPJ_FIRST_WEIGHTS)
  const second = cnpjCheckDigit(`${base}${first}`, CNPJ_SECOND_WEIGHTS)
  return digits.slice(CNPJ_BASE_LENGTH) === `${first}${second}`
}

export const isAlphanumericCnpj = (cnpj: string): boolean =>
  /[A-Z]/.test(cleanCnpj(cnpj))

export const isValidCep = (digits: string): boolean => CEP_PATTERN.test(digits)

export const isValidPhone = (digits: string): boolean =>
  PHONE_PATTERN.test(digits)

const applyMask = (
  value: string,
  groups: readonly number[],
  separators: readonly string[],
): string => {
  let result = ""
  let start = 0
  for (let index = 0; index < groups.length; index += 1) {
    if (start >= value.length) {
      break
    }
    const size = groups[index] ?? 0
    if (index > 0) {
      result += separators[index - 1] ?? ""
    }
    result += value.slice(start, start + size)
    start += size
  }
  return result
}

export const formatCnpj = (digits: string): string =>
  applyMask(cleanCnpj(digits), CNPJ_GROUPS, CNPJ_SEPARATORS)

const CNPJ_BRANCH_START = 8

export const formatCnpjTail = (cnpj: string): string => {
  const clean = cleanCnpj(cnpj)
  if (clean.length < CNPJ_LENGTH) {
    return formatCnpj(clean)
  }
  return `${CNPJ_TAIL_PREFIX}/${clean.slice(CNPJ_BRANCH_START, CNPJ_BASE_LENGTH)}-${clean.slice(CNPJ_BASE_LENGTH)}`
}

export const formatCep = (digits: string): string =>
  applyMask(cleanCep(digits), CEP_GROUPS, CEP_SEPARATORS)

export const formatPhone = (digits: string): string => {
  const clean = cleanPhone(digits)
  if (clean.length === 0) {
    return ""
  }
  const areaCode = clean.slice(0, 2)
  if (clean.length <= 2) {
    return `(${areaCode}`
  }
  const prefixLength = clean.length === PHONE_MAX_DIGITS ? 5 : 4
  const prefix = clean.slice(2, 2 + prefixLength)
  const suffix = clean.slice(2 + prefixLength)
  if (suffix.length === 0) {
    return `(${areaCode}) ${prefix}`
  }
  return `(${areaCode}) ${prefix}-${suffix}`
}
