import { z } from "zod"

import {
  BRAZILIAN_STATES,
  CEP_DIGITS,
  cleanCnpj,
  CNPJ_LENGTH,
  isValidCep,
  isValidCnpj,
  isValidPhone,
  onlyDigits,
} from "@/app/_lib/domain/brazilian-formats"
import {
  BUSINESS_HOURS_MESSAGES,
  checkBusinessHours,
  COMPANY_COMPLEMENT_MAX_LENGTH,
  COMPANY_LEGAL_NAME_MAX_LENGTH,
  COMPANY_NOTES_MAX_LENGTH,
  COMPANY_NUMBER_MAX_LENGTH,
  COMPANY_STREET_MAX_LENGTH,
  normalizeBusinessDays,
  WEEKDAYS,
} from "@/app/_lib/domain/company"
import {
  REGISTRY_NAME_MAX_LENGTH,
  REGISTRY_NAME_MIN_LENGTH,
} from "@/app/_lib/domain/registry"
import type { BusinessHoursProblem } from "@/app/_lib/types/company"
import {
  registryActiveSchema,
  registryEmailSchema,
  registryIdSchema,
} from "@/app/_lib/validation/registry"

const PHONE_INVALID_MESSAGE =
  "Telefone inválido. Informe DDD e número, com 10 ou 11 dígitos."

const TIME_INVALID_MESSAGE = "Horário inválido."

const WEEKDAY_INVALID_MESSAGE = "Dia da semana inválido."

const TIME_PATTERN = /^([01][0-9]|2[0-3]):[0-5][0-9]$/

interface CompanyTextRule {
  required: string
  subject: string
  max: number
}

const companyTextSchema = (rule: CompanyTextRule) =>
  z
    .string({ error: rule.required })
    .trim()
    .min(1, { error: rule.required })
    .min(REGISTRY_NAME_MIN_LENGTH, {
      error: `${rule.subject} precisa ter no mínimo ${REGISTRY_NAME_MIN_LENGTH} caracteres.`,
    })
    .max(rule.max, {
      error: `${rule.subject} precisa ter no máximo ${rule.max} caracteres.`,
    })

const optionalTextSchema = (subject: string, max: number) =>
  z
    .string()
    .trim()
    .max(max, {
      error: `${subject} precisa ter no máximo ${max} caracteres.`,
    })
    .nullish()
    .transform((value) => (value ? value : null))

const cleanedSchema = (
  requiredMessage: string,
  clean: (value: string) => string,
  problemOf: (value: string) => string | null,
) =>
  z
    .string({ error: requiredMessage })
    .transform(clean)
    .superRefine((value, ctx) => {
      const message = value.length === 0 ? requiredMessage : problemOf(value)
      if (message) {
        ctx.addIssue({ code: "custom", message })
      }
    })

const phoneProblem = (digits: string): string | null =>
  isValidPhone(digits) ? null : PHONE_INVALID_MESSAGE

export const companyCnpjSchema = cleanedSchema(
  "Informe o CNPJ.",
  cleanCnpj,
  (value) => {
    if (value.length !== CNPJ_LENGTH) {
      return `O CNPJ precisa ter ${CNPJ_LENGTH} caracteres.`
    }
    return isValidCnpj(value) ? null : "CNPJ inválido."
  },
)

export const companyPhoneSchema = (requiredMessage: string) =>
  cleanedSchema(requiredMessage, onlyDigits, phoneProblem)

export const companyOptionalPhoneSchema = z
  .string({ error: PHONE_INVALID_MESSAGE })
  .nullish()
  .transform((value) => onlyDigits(value ?? ""))
  .superRefine((value, ctx) => {
    if (value.length > 0 && !isValidPhone(value)) {
      ctx.addIssue({ code: "custom", message: PHONE_INVALID_MESSAGE })
    }
  })
  .transform((value) => (value.length > 0 ? value : null))

export const companyCepSchema = cleanedSchema(
  "Informe o CEP.",
  onlyDigits,
  (value) =>
    isValidCep(value) ? null : `O CEP precisa ter ${CEP_DIGITS} dígitos.`,
)

export const companyStateSchema = z.enum(BRAZILIAN_STATES, {
  error: "Selecione a UF.",
})

export const businessDaysSchema = z
  .array(z.literal(WEEKDAYS, { error: WEEKDAY_INVALID_MESSAGE }), {
    error: WEEKDAY_INVALID_MESSAGE,
  })
  .nullish()
  .transform((days) =>
    days && days.length > 0 ? normalizeBusinessDays(days) : null,
  )

const businessTimeSchema = z
  .string({ error: TIME_INVALID_MESSAGE })
  .nullish()
  .transform((value) => value ?? "")
  .superRefine((value, ctx) => {
    if (value.length > 0 && !TIME_PATTERN.test(value)) {
      ctx.addIssue({ code: "custom", message: TIME_INVALID_MESSAGE })
    }
  })
  .transform((value) => (value.length > 0 ? value : null))

const companyFields = {
  cnpj: companyCnpjSchema,
  legalName: companyTextSchema({
    required: "Informe a razão social.",
    subject: "A razão social",
    max: COMPANY_LEGAL_NAME_MAX_LENGTH,
  }),
  tradeName: companyTextSchema({
    required: "Informe o nome fantasia.",
    subject: "O nome fantasia",
    max: REGISTRY_NAME_MAX_LENGTH,
  }),
  email: registryEmailSchema,
  primaryPhone: companyPhoneSchema("Informe o telefone primário."),
  secondaryPhone: companyOptionalPhoneSchema,
  cep: companyCepSchema,
  state: companyStateSchema,
  street: companyTextSchema({
    required: "Informe o logradouro.",
    subject: "O logradouro",
    max: COMPANY_STREET_MAX_LENGTH,
  }),
  number: z
    .string({ error: "Informe o número." })
    .trim()
    .min(1, { error: "Informe o número." })
    .max(COMPANY_NUMBER_MAX_LENGTH, {
      error: `O número precisa ter no máximo ${COMPANY_NUMBER_MAX_LENGTH} caracteres.`,
    }),
  district: companyTextSchema({
    required: "Informe o bairro.",
    subject: "O bairro",
    max: REGISTRY_NAME_MAX_LENGTH,
  }),
  city: companyTextSchema({
    required: "Informe a cidade.",
    subject: "A cidade",
    max: REGISTRY_NAME_MAX_LENGTH,
  }),
  complement: optionalTextSchema(
    "O complemento",
    COMPANY_COMPLEMENT_MAX_LENGTH,
  ),
  managerName: companyTextSchema({
    required: "Informe o nome do responsável.",
    subject: "O nome do responsável",
    max: REGISTRY_NAME_MAX_LENGTH,
  }),
  managerPhone: companyPhoneSchema("Informe o contato do responsável."),
  businessDays: businessDaysSchema,
  opensAt: businessTimeSchema,
  closesAt: businessTimeSchema,
  notes: optionalTextSchema("A observação", COMPANY_NOTES_MAX_LENGTH),
}

export const COMPANY_REQUIRED_FIELDS = [
  "cnpj",
  "legalName",
  "tradeName",
  "email",
  "primaryPhone",
  "cep",
  "state",
  "street",
  "number",
  "district",
  "city",
  "managerName",
  "managerPhone",
] as const satisfies readonly (keyof typeof companyFields)[]

export type CompanyRequiredField = (typeof COMPANY_REQUIRED_FIELDS)[number]

export const isCompanyRequiredFieldValid = (
  field: CompanyRequiredField,
  value: unknown,
): boolean => companyFields[field].safeParse(value).success

const BUSINESS_HOURS_FIELDS: readonly string[] = [
  "businessDays",
  "opensAt",
  "closesAt",
]

const BUSINESS_HOURS_PROBLEM_FIELDS = {
  DAYS_WITHOUT_OPENS_AT: "opensAt",
  DAYS_WITHOUT_CLOSES_AT: "closesAt",
  CLOSES_NOT_AFTER_OPENS: "closesAt",
  TIMES_WITHOUT_DAYS: "businessDays",
} satisfies Record<BusinessHoursProblem, string>

interface BusinessHoursOutput {
  businessDays: z.output<typeof businessDaysSchema>
  opensAt: z.output<typeof businessTimeSchema>
  closesAt: z.output<typeof businessTimeSchema>
}

const businessHoursFieldsAreParsed = (payload: z.core.ParsePayload) =>
  payload.issues.every((issue) => {
    const field = issue.path?.[0]
    return (
      field !== undefined &&
      !(typeof field === "string" && BUSINESS_HOURS_FIELDS.includes(field))
    )
  })

const refineBusinessHours = (
  hours: BusinessHoursOutput,
  ctx: z.core.$RefinementCtx<BusinessHoursOutput>,
) => {
  const check = checkBusinessHours({
    businessDays: hours.businessDays ?? [],
    opensAt: hours.opensAt,
    closesAt: hours.closesAt,
  })
  if (check.ok) {
    return
  }
  for (const problem of check.problems) {
    ctx.addIssue({
      code: "custom",
      path: [BUSINESS_HOURS_PROBLEM_FIELDS[problem]],
      message: BUSINESS_HOURS_MESSAGES[problem],
    })
  }
}

const companyIdSchema = registryIdSchema("Empresa inválida.")

export const createCompanySchema = z
  .object(companyFields)
  .superRefine(refineBusinessHours, { when: businessHoursFieldsAreParsed })

export type CompanyFormValues = z.input<typeof createCompanySchema>

export type CreateCompanyInput = z.infer<typeof createCompanySchema>

export const updateCompanySchema = z
  .object({ id: companyIdSchema, ...companyFields })
  .superRefine(refineBusinessHours, { when: businessHoursFieldsAreParsed })

export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>

export const setCompanyActiveSchema = z.object({
  id: companyIdSchema,
  isActive: registryActiveSchema,
})

export type SetCompanyActiveInput = z.infer<typeof setCompanyActiveSchema>
