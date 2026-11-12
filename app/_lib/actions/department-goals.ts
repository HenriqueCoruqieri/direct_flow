"use server"

import { revalidatePath } from "next/cache"

import { getRegistryAccess } from "@/app/_lib/auth/registry-access"
import { getSession } from "@/app/_lib/auth/session"
import { upsertDepartmentGoals } from "@/app/_lib/data/department-goals"
import { findDepartmentOption } from "@/app/_lib/data/departments"
import { DEPARTMENT_GOALS_SAVED_MESSAGE } from "@/app/_lib/domain/department-goals"
import {
  canEditDepartmentGoals,
  OPERATIONS_PATH,
} from "@/app/_lib/domain/operations"
import {
  type SaveDepartmentGoalsInput,
  saveDepartmentGoalsSchema,
} from "@/app/_lib/validation/department-goals"

export type DepartmentGoalsErrorCode =
  "INVALID_INPUT" | "FORBIDDEN" | "NOT_FOUND"

export interface DepartmentGoalsActionSuccess {
  ok: true
  message: string
}

export interface DepartmentGoalsActionFailure {
  ok: false
  message: string
  code?: DepartmentGoalsErrorCode
}

export type DepartmentGoalsActionResult =
  DepartmentGoalsActionSuccess | DepartmentGoalsActionFailure

const FORBIDDEN_MESSAGE =
  "Você não tem permissão para editar os objetivos deste setor."
const NOT_FOUND_MESSAGE = "Setor não encontrado."
const UNEXPECTED_ERROR_MESSAGE =
  "Não foi possível salvar os objetivos agora. Tente novamente."

const FORBIDDEN_FAILURE: DepartmentGoalsActionFailure = {
  ok: false,
  code: "FORBIDDEN",
  message: FORBIDDEN_MESSAGE,
}

const NOT_FOUND_FAILURE: DepartmentGoalsActionFailure = {
  ok: false,
  code: "NOT_FOUND",
  message: NOT_FOUND_MESSAGE,
}

const UNEXPECTED_FAILURE: DepartmentGoalsActionFailure = {
  ok: false,
  message: UNEXPECTED_ERROR_MESSAGE,
}

const invalidInput = (
  firstIssueMessage: string | undefined,
): DepartmentGoalsActionFailure => ({
  ok: false,
  code: "INVALID_INPUT",
  message: firstIssueMessage ?? UNEXPECTED_ERROR_MESSAGE,
})

export const saveDepartmentGoals = async (
  input: SaveDepartmentGoalsInput,
): Promise<DepartmentGoalsActionResult> => {
  const actor = await getSession()
  if (!actor) return FORBIDDEN_FAILURE

  const access = await getRegistryAccess()
  if (access.kind === "none") return FORBIDDEN_FAILURE

  const parsed = saveDepartmentGoalsSchema.safeParse(input)
  if (!parsed.success) return invalidInput(parsed.error.issues[0]?.message)

  const { departmentId, ...goals } = parsed.data

  if (
    access.kind === "department_admin" &&
    access.departmentId !== departmentId
  ) {
    return FORBIDDEN_FAILURE
  }

  try {
    const target = await findDepartmentOption(departmentId)
    if (!target) return NOT_FOUND_FAILURE
    if (!canEditDepartmentGoals(access, target)) return FORBIDDEN_FAILURE

    await upsertDepartmentGoals(departmentId, goals, actor.id)
  } catch (error) {
    console.error("[saveDepartmentGoals]", error)
    return UNEXPECTED_FAILURE
  }

  revalidatePath(OPERATIONS_PATH)

  return { ok: true, message: DEPARTMENT_GOALS_SAVED_MESSAGE }
}
