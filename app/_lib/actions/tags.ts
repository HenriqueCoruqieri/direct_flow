"use server"

import { revalidatePath } from "next/cache"

import { getRegistryAccess } from "@/app/_lib/auth/registry-access"
import {
  findTagDepartment,
  insertTag,
  updateTagActive,
  updateTagName,
} from "@/app/_lib/data/tags"
import {
  hasRegistryAccess,
  TAGS_REGISTRY_PATH,
} from "@/app/_lib/domain/registry"
import {
  canManageTagsOf,
  describeTagNameTaken,
  TAG_DEPARTMENT_INACTIVE_MESSAGE,
  TAG_DEPARTMENT_UNASSIGNED_MESSAGE,
} from "@/app/_lib/domain/tag"
import type { GrantedRegistryAccess } from "@/app/_lib/types/registry"
import type {
  InsertTagOutcome,
  UpdateTagActiveOutcome,
  UpdateTagNameOutcome,
} from "@/app/_lib/types/tag"
import {
  type CreateTagInput,
  createTagSchema,
  type RenameTagInput,
  renameTagSchema,
  type SetTagActiveInput,
  setTagActiveSchema,
} from "@/app/_lib/validation/tag"

export type TagErrorCode =
  | "INVALID_INPUT"
  | "FORBIDDEN"
  | "NAME_TAKEN"
  | "NOT_FOUND"
  | "DEPARTMENT_INACTIVE"
  | "DEPARTMENT_UNASSIGNED"

export interface TagActionSuccess {
  ok: true
  message: string
}

export interface TagActionFailure {
  ok: false
  message: string
  code?: TagErrorCode
}

export type TagActionResult = TagActionSuccess | TagActionFailure

const TAG_CREATED_MESSAGE = "Tag criada."
const TAG_RENAMED_MESSAGE = "Tag renomeada."
const TAG_ACTIVATED_MESSAGE = "Tag ativada."
const TAG_DEACTIVATED_MESSAGE = "Tag desativada."
const FORBIDDEN_MESSAGE =
  "Você não tem permissão para gerenciar as tags deste setor."
const TAG_NOT_FOUND_MESSAGE = "Tag não encontrada."
const DEPARTMENT_NOT_FOUND_MESSAGE = "Setor não encontrado."
const UNEXPECTED_ERROR_MESSAGE =
  "Não foi possível salvar a tag agora. Tente novamente."

const FORBIDDEN_FAILURE: TagActionFailure = {
  ok: false,
  code: "FORBIDDEN",
  message: FORBIDDEN_MESSAGE,
}

const UNEXPECTED_FAILURE: TagActionFailure = {
  ok: false,
  message: UNEXPECTED_ERROR_MESSAGE,
}

const TAG_NOT_FOUND_FAILURE: TagActionFailure = {
  ok: false,
  code: "NOT_FOUND",
  message: TAG_NOT_FOUND_MESSAGE,
}

const DEPARTMENT_NOT_FOUND_FAILURE: TagActionFailure = {
  ok: false,
  code: "NOT_FOUND",
  message: DEPARTMENT_NOT_FOUND_MESSAGE,
}

const DEPARTMENT_INACTIVE_FAILURE: TagActionFailure = {
  ok: false,
  code: "DEPARTMENT_INACTIVE",
  message: TAG_DEPARTMENT_INACTIVE_MESSAGE,
}

const DEPARTMENT_UNASSIGNED_FAILURE: TagActionFailure = {
  ok: false,
  code: "DEPARTMENT_UNASSIGNED",
  message: TAG_DEPARTMENT_UNASSIGNED_MESSAGE,
}

const invalidInput = (
  firstIssueMessage: string | undefined,
): TagActionFailure => ({
  ok: false,
  code: "INVALID_INPUT",
  message: firstIssueMessage ?? UNEXPECTED_ERROR_MESSAGE,
})

const nameTaken = (existingIsActive: boolean): TagActionFailure => ({
  ok: false,
  code: "NAME_TAKEN",
  message: describeTagNameTaken(existingIsActive),
})

const authorizeStoredTag = async (
  access: GrantedRegistryAccess,
  tagId: number,
): Promise<TagActionFailure | null> => {
  const departmentId = await findTagDepartment(tagId)
  if (departmentId === null) return TAG_NOT_FOUND_FAILURE
  if (!canManageTagsOf(access, departmentId)) return FORBIDDEN_FAILURE
  return null
}

export const createTag = async (
  input: CreateTagInput,
): Promise<TagActionResult> => {
  const access = await getRegistryAccess()
  if (!hasRegistryAccess(access)) return FORBIDDEN_FAILURE

  const parsed = createTagSchema.safeParse(input)
  if (!parsed.success) return invalidInput(parsed.error.issues[0]?.message)

  if (!canManageTagsOf(access, parsed.data.departmentId)) {
    return FORBIDDEN_FAILURE
  }

  let outcome: InsertTagOutcome

  try {
    outcome = await insertTag(parsed.data.departmentId, parsed.data.name)
  } catch (error) {
    console.error("[createTag]", error)
    return UNEXPECTED_FAILURE
  }

  if (outcome.status === "name_taken")
    return nameTaken(outcome.existingIsActive)
  if (outcome.status === "department_not_found") {
    return DEPARTMENT_NOT_FOUND_FAILURE
  }
  if (outcome.status === "department_inactive") {
    return DEPARTMENT_INACTIVE_FAILURE
  }
  if (outcome.status === "department_unassigned") {
    return DEPARTMENT_UNASSIGNED_FAILURE
  }

  revalidatePath(TAGS_REGISTRY_PATH)

  return { ok: true, message: TAG_CREATED_MESSAGE }
}

export const renameTag = async (
  input: RenameTagInput,
): Promise<TagActionResult> => {
  const access = await getRegistryAccess()
  if (!hasRegistryAccess(access)) return FORBIDDEN_FAILURE

  const parsed = renameTagSchema.safeParse(input)
  if (!parsed.success) return invalidInput(parsed.error.issues[0]?.message)

  let outcome: UpdateTagNameOutcome

  try {
    const denial = await authorizeStoredTag(access, parsed.data.id)
    if (denial) return denial

    outcome = await updateTagName(parsed.data.id, parsed.data.name)
  } catch (error) {
    console.error("[renameTag]", error)
    return UNEXPECTED_FAILURE
  }

  if (outcome.status === "name_taken")
    return nameTaken(outcome.existingIsActive)
  if (outcome.status === "not_found") return TAG_NOT_FOUND_FAILURE

  revalidatePath(TAGS_REGISTRY_PATH)

  return { ok: true, message: TAG_RENAMED_MESSAGE }
}

export const setTagActive = async (
  input: SetTagActiveInput,
): Promise<TagActionResult> => {
  const access = await getRegistryAccess()
  if (!hasRegistryAccess(access)) return FORBIDDEN_FAILURE

  const parsed = setTagActiveSchema.safeParse(input)
  if (!parsed.success) return invalidInput(parsed.error.issues[0]?.message)

  let outcome: UpdateTagActiveOutcome

  try {
    const denial = await authorizeStoredTag(access, parsed.data.id)
    if (denial) return denial

    outcome = await updateTagActive(parsed.data.id, parsed.data.isActive)
  } catch (error) {
    console.error("[setTagActive]", error)
    return UNEXPECTED_FAILURE
  }

  if (outcome.status === "not_found") return TAG_NOT_FOUND_FAILURE
  if (outcome.status === "department_inactive") {
    return DEPARTMENT_INACTIVE_FAILURE
  }
  if (outcome.status === "department_unassigned") {
    return DEPARTMENT_UNASSIGNED_FAILURE
  }

  revalidatePath(TAGS_REGISTRY_PATH)

  return {
    ok: true,
    message: parsed.data.isActive
      ? TAG_ACTIVATED_MESSAGE
      : TAG_DEACTIVATED_MESSAGE,
  }
}
