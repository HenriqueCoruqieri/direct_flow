"use server"

import { revalidatePath } from "next/cache"

import { getDirector } from "@/app/_lib/auth/director"
import { insertCompany } from "@/app/_lib/data/companies"
import { describeCompanyCnpjTaken } from "@/app/_lib/domain/company"
import { COMPANIES_REGISTRY_PATH } from "@/app/_lib/domain/registry"
import type { InsertCompanyOutcome } from "@/app/_lib/types/company"
import {
  type CreateCompanyInput,
  createCompanySchema,
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
const FORBIDDEN_MESSAGE = "Você não tem permissão para gerenciar empresas."
const UNEXPECTED_ERROR_MESSAGE =
  "Não foi possível salvar a empresa agora. Tente novamente."

const FORBIDDEN_FAILURE: CompanyActionFailure = {
  ok: false,
  code: "FORBIDDEN",
  message: FORBIDDEN_MESSAGE,
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

const cnpjTaken = (existingIsActive: boolean): CompanyActionFailure => ({
  ok: false,
  code: "CNPJ_TAKEN",
  message: describeCompanyCnpjTaken(existingIsActive),
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
    return cnpjTaken(outcome.existingIsActive)
  }

  revalidatePath(COMPANIES_REGISTRY_PATH)

  return { ok: true, message: COMPANY_CREATED_MESSAGE }
}
