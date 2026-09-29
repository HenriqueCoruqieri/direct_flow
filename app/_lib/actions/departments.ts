"use server"

import { revalidatePath } from "next/cache"

import { getDirector } from "@/app/_lib/auth/director"
import {
  insertDepartment,
  updateDepartmentActive,
  updateDepartmentName,
} from "@/app/_lib/data/departments"
import { describeDepartmentDeactivationBlock } from "@/app/_lib/domain/department"
import { DEPARTMENTS_REGISTRY_PATH } from "@/app/_lib/domain/registry"
import type {
  InsertDepartmentOutcome,
  UpdateDepartmentActiveOutcome,
  UpdateDepartmentNameOutcome,
} from "@/app/_lib/types/department"
import {
  type CreateDepartmentInput,
  createDepartmentSchema,
  type RenameDepartmentInput,
  renameDepartmentSchema,
  type SetDepartmentActiveInput,
  setDepartmentActiveSchema,
} from "@/app/_lib/validation/department"

export type DepartmentErrorCode =
  | "INVALID_INPUT"
  | "FORBIDDEN"
  | "NAME_TAKEN"
  | "NOT_FOUND"
  | "IS_BOARD"
  | "HAS_ACTIVE_USERS"
  | "HAS_OPEN_TICKETS"

export interface DepartmentActionSuccess {
  ok: true
  message: string
}

export interface DepartmentActionFailure {
  ok: false
  message: string
  code?: DepartmentErrorCode
}

export type DepartmentActionResult =
  DepartmentActionSuccess | DepartmentActionFailure

const DEPARTMENT_CREATED_MESSAGE = "Setor criado."
const DEPARTMENT_RENAMED_MESSAGE = "Setor renomeado."
const DEPARTMENT_ACTIVATED_MESSAGE = "Setor ativado."
const DEPARTMENT_DEACTIVATED_MESSAGE = "Setor desativado."
const FORBIDDEN_MESSAGE = "Você não tem permissão para gerenciar setores."
const NAME_TAKEN_MESSAGE =
  "Já existe um setor com esse nome. Se ele estiver inativo, reative-o em vez de criar outro."
const NOT_FOUND_MESSAGE = "Setor não encontrado."
const UNEXPECTED_ERROR_MESSAGE =
  "Não foi possível salvar o setor agora. Tente novamente."

const FORBIDDEN_FAILURE: DepartmentActionFailure = {
  ok: false,
  code: "FORBIDDEN",
  message: FORBIDDEN_MESSAGE,
}

const UNEXPECTED_FAILURE: DepartmentActionFailure = {
  ok: false,
  message: UNEXPECTED_ERROR_MESSAGE,
}

const NAME_TAKEN_FAILURE: DepartmentActionFailure = {
  ok: false,
  code: "NAME_TAKEN",
  message: NAME_TAKEN_MESSAGE,
}

const NOT_FOUND_FAILURE: DepartmentActionFailure = {
  ok: false,
  code: "NOT_FOUND",
  message: NOT_FOUND_MESSAGE,
}

const invalidInput = (
  firstIssueMessage: string | undefined,
): DepartmentActionFailure => ({
  ok: false,
  code: "INVALID_INPUT",
  message: firstIssueMessage ?? UNEXPECTED_ERROR_MESSAGE,
})

export const createDepartment = async (
  input: CreateDepartmentInput,
): Promise<DepartmentActionResult> => {
  const actor = await getDirector()
  if (!actor) return FORBIDDEN_FAILURE

  const parsed = createDepartmentSchema.safeParse(input)
  if (!parsed.success) return invalidInput(parsed.error.issues[0]?.message)

  let outcome: InsertDepartmentOutcome

  try {
    outcome = await insertDepartment(parsed.data.name)
  } catch (error) {
    console.error("[createDepartment]", error)
    return UNEXPECTED_FAILURE
  }

  if (outcome.status === "name_taken") return NAME_TAKEN_FAILURE

  revalidatePath(DEPARTMENTS_REGISTRY_PATH)

  return { ok: true, message: DEPARTMENT_CREATED_MESSAGE }
}

export const renameDepartment = async (
  input: RenameDepartmentInput,
): Promise<DepartmentActionResult> => {
  const actor = await getDirector()
  if (!actor) return FORBIDDEN_FAILURE

  const parsed = renameDepartmentSchema.safeParse(input)
  if (!parsed.success) return invalidInput(parsed.error.issues[0]?.message)

  let outcome: UpdateDepartmentNameOutcome

  try {
    outcome = await updateDepartmentName(parsed.data.id, parsed.data.name)
  } catch (error) {
    console.error("[renameDepartment]", error)
    return UNEXPECTED_FAILURE
  }

  if (outcome.status === "name_taken") return NAME_TAKEN_FAILURE
  if (outcome.status === "not_found") return NOT_FOUND_FAILURE

  revalidatePath("/(app)", "layout")

  return { ok: true, message: DEPARTMENT_RENAMED_MESSAGE }
}

export const setDepartmentActive = async (
  input: SetDepartmentActiveInput,
): Promise<DepartmentActionResult> => {
  const actor = await getDirector()
  if (!actor) return FORBIDDEN_FAILURE

  const parsed = setDepartmentActiveSchema.safeParse(input)
  if (!parsed.success) return invalidInput(parsed.error.issues[0]?.message)

  let outcome: UpdateDepartmentActiveOutcome

  try {
    outcome = await updateDepartmentActive(parsed.data.id, parsed.data.isActive)
  } catch (error) {
    console.error("[setDepartmentActive]", error)
    return UNEXPECTED_FAILURE
  }

  if (outcome.status === "not_found") return NOT_FOUND_FAILURE

  if (outcome.status === "blocked") {
    return {
      ok: false,
      code: outcome.block.reason,
      message: describeDepartmentDeactivationBlock(outcome.block),
    }
  }

  revalidatePath(DEPARTMENTS_REGISTRY_PATH)

  return {
    ok: true,
    message: parsed.data.isActive
      ? DEPARTMENT_ACTIVATED_MESSAGE
      : DEPARTMENT_DEACTIVATED_MESSAGE,
  }
}
