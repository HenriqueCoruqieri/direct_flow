"use server"

import { revalidatePath } from "next/cache"

import { getDirector } from "@/app/_lib/auth/director"
import {
  insertCompany,
  updateCompany as saveCompany,
  updateCompanyActive,
} from "@/app/_lib/data/companies"
import {
  describeCompanyCnpjTaken,
  describeCompanyCnpjTakenOnUpdate,
} from "@/app/_lib/domain/company"
import { COMPANIES_REGISTRY_PATH } from "@/app/_lib/domain/registry"
import type {
  InsertCompanyOutcome,
  UpdateCompanyActiveOutcome,
  UpdateCompanyOutcome,
} from "@/app/_lib/types/company"
import {
  type CreateCompanyInput,
  createCompanySchema,
  type SetCompanyActiveInput,
  setCompanyActiveSchema,
  type UpdateCompanyInput,
  updateCompanySchema,
} from "@/app/_lib/validation/company"

export type CompanyErrorCode =
  "INVALID_INPUT" | "FORBIDDEN" | "CNPJ_TAKEN" | "NOT_FOUND"

export interface CompanyActionSuccess {
  ok: true
  message: string
}

export interface CompanyActionFailure {
  ok: false
  message: string
  code?: CompanyErrorCode
}

export type CompanyActionResult = CompanyActionSuccess | CompanyActionFailure

const COMPANY_CREATED_MESSAGE = "Empresa criada."
const COMPANY_UPDATED_MESSAGE = "Empresa atualizada."
const COMPANY_ACTIVATED_MESSAGE = "Empresa ativada."
const COMPANY_DEACTIVATED_MESSAGE = "Empresa desativada."
const FORBIDDEN_MESSAGE = "Você não tem permissão para gerenciar empresas."
const COMPANY_NOT_FOUND_MESSAGE = "Empresa não encontrada."
const UNEXPECTED_ERROR_MESSAGE =
  "Não foi possível salvar a empresa agora. Tente novamente."

const FORBIDDEN_FAILURE: CompanyActionFailure = {
  ok: false,
  code: "FORBIDDEN",
  message: FORBIDDEN_MESSAGE,
}

const NOT_FOUND_FAILURE: CompanyActionFailure = {
  ok: false,
  code: "NOT_FOUND",
  message: COMPANY_NOT_FOUND_MESSAGE,
}

const UNEXPECTED_FAILURE: CompanyActionFailure = {
  ok: false,
  message: UNEXPECTED_ERROR_MESSAGE,
}

const invalidInput = (
  firstIssueMessage: string | undefined,
): CompanyActionFailure => ({
  ok: false,
  code: "INVALID_INPUT",
  message: firstIssueMessage ?? UNEXPECTED_ERROR_MESSAGE,
})

const cnpjTaken = (message: string): CompanyActionFailure => ({
  ok: false,
  code: "CNPJ_TAKEN",
  message,
})

export const createCompany = async (
  input: CreateCompanyInput,
): Promise<CompanyActionResult> => {
  const actor = await getDirector()
  if (!actor) return FORBIDDEN_FAILURE

  const parsed = createCompanySchema.safeParse(input)
  if (!parsed.success) return invalidInput(parsed.error.issues[0]?.message)

  let outcome: InsertCompanyOutcome

  try {
    outcome = await insertCompany(parsed.data)
  } catch (error) {
    console.error("[createCompany]", error)
    return UNEXPECTED_FAILURE
  }

  if (outcome.status === "cnpj_taken") {
    return cnpjTaken(describeCompanyCnpjTaken(outcome.existingIsActive))
  }

  revalidatePath(COMPANIES_REGISTRY_PATH)

  return { ok: true, message: COMPANY_CREATED_MESSAGE }
}

export const updateCompany = async (
  input: UpdateCompanyInput,
): Promise<CompanyActionResult> => {
  const actor = await getDirector()
  if (!actor) return FORBIDDEN_FAILURE

  const parsed = updateCompanySchema.safeParse(input)
  if (!parsed.success) return invalidInput(parsed.error.issues[0]?.message)

  const { id, ...values } = parsed.data

  let outcome: UpdateCompanyOutcome

  try {
    outcome = await saveCompany(id, values)
  } catch (error) {
    console.error("[updateCompany]", error)
    return UNEXPECTED_FAILURE
  }

  if (outcome.status === "cnpj_taken") {
    return cnpjTaken(describeCompanyCnpjTakenOnUpdate(outcome.existingIsActive))
  }

  if (outcome.status === "not_found") return NOT_FOUND_FAILURE

  revalidatePath(COMPANIES_REGISTRY_PATH)

  return { ok: true, message: COMPANY_UPDATED_MESSAGE }
}

export const setCompanyActive = async (
  input: SetCompanyActiveInput,
): Promise<CompanyActionResult> => {
  const actor = await getDirector()
  if (!actor) return FORBIDDEN_FAILURE

  const parsed = setCompanyActiveSchema.safeParse(input)
  if (!parsed.success) return invalidInput(parsed.error.issues[0]?.message)

  const { id, isActive } = parsed.data

  let outcome: UpdateCompanyActiveOutcome

  try {
    outcome = await updateCompanyActive(id, isActive)
  } catch (error) {
    console.error("[setCompanyActive]", error)
    return UNEXPECTED_FAILURE
  }

  if (outcome.status === "not_found") return NOT_FOUND_FAILURE

  revalidatePath(COMPANIES_REGISTRY_PATH)

  return {
    ok: true,
    message: isActive ? COMPANY_ACTIVATED_MESSAGE : COMPANY_DEACTIVATED_MESSAGE,
  }
}
