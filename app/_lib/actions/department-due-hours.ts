"use server"

import { revalidatePath } from "next/cache"

import { getRegistryAccess } from "@/app/_lib/auth/registry-access"
import { getSession } from "@/app/_lib/auth/session"
import { upsertDepartmentDueHours } from "@/app/_lib/data/department-due-hours"
import { findDepartmentOption } from "@/app/_lib/data/departments"
import {
  canEditDepartmentDueHours,
  DUE_HOURS_FORBIDDEN_MESSAGE,
  DUE_HOURS_NOT_FOUND_MESSAGE,
  DUE_HOURS_SAVE_FAILED_MESSAGE,
  DUE_HOURS_SAVED_MESSAGE,
} from "@/app/_lib/domain/department-due-hours"
import { DUE_HOURS_REGISTRY_PATH } from "@/app/_lib/domain/registry"
import {
  type SaveDepartmentDueHoursInput,
  saveDepartmentDueHoursSchema,
} from "@/app/_lib/validation/department-due-hours"

export type DepartmentDueHoursErrorCode =
  "INVALID_INPUT" | "FORBIDDEN" | "NOT_FOUND"

export interface DepartmentDueHoursActionSuccess {
  ok: true
  message: string
}

export interface DepartmentDueHoursActionFailure {
  ok: false
  message: string
  code?: DepartmentDueHoursErrorCode
}

export type DepartmentDueHoursActionResult =
  DepartmentDueHoursActionSuccess | DepartmentDueHoursActionFailure

const FORBIDDEN_FAILURE: DepartmentDueHoursActionFailure = {
  ok: false,
  code: "FORBIDDEN",
  message: DUE_HOURS_FORBIDDEN_MESSAGE,
}

const NOT_FOUND_FAILURE: DepartmentDueHoursActionFailure = {
  ok: false,
  code: "NOT_FOUND",
  message: DUE_HOURS_NOT_FOUND_MESSAGE,
}

const UNEXPECTED_FAILURE: DepartmentDueHoursActionFailure = {
  ok: false,
  message: DUE_HOURS_SAVE_FAILED_MESSAGE,
}

const invalidInput = (
  firstIssueMessage: string | undefined,
): DepartmentDueHoursActionFailure => ({
  ok: false,
  code: "INVALID_INPUT",
  message: firstIssueMessage ?? DUE_HOURS_SAVE_FAILED_MESSAGE,
})

export const saveDepartmentDueHours = async (
  input: SaveDepartmentDueHoursInput,
): Promise<DepartmentDueHoursActionResult> => {
  const actor = await getSession()
  if (!actor) return FORBIDDEN_FAILURE

  const access = await getRegistryAccess()
  if (access.kind === "none") return FORBIDDEN_FAILURE

  const parsed = saveDepartmentDueHoursSchema.safeParse(input)
  if (!parsed.success) return invalidInput(parsed.error.issues[0]?.message)

  const { departmentId, ...hours } = parsed.data

  if (
    access.kind === "department_admin" &&
    access.departmentId !== departmentId
  ) {
    return FORBIDDEN_FAILURE
  }

  try {
    const target = await findDepartmentOption(departmentId)
    if (!target) return NOT_FOUND_FAILURE
    if (!canEditDepartmentDueHours(access, target)) return FORBIDDEN_FAILURE

    await upsertDepartmentDueHours(departmentId, hours, actor.id)
  } catch (error) {
    console.error("[saveDepartmentDueHours]", error)
    return UNEXPECTED_FAILURE
  }

  revalidatePath(DUE_HOURS_REGISTRY_PATH)

  return { ok: true, message: DUE_HOURS_SAVED_MESSAGE }
}
