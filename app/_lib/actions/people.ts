"use server"

import { revalidatePath } from "next/cache"

import { hashDefaultPassword } from "@/app/_lib/auth/default-password"
import { getRegistryAccess } from "@/app/_lib/auth/registry-access"
import { requireSession, revokeUserSessions } from "@/app/_lib/auth/session"
import {
  findManagedPerson,
  findPersonDepartment,
  insertPerson,
  resetPersonPassword,
  updatePersonActive,
  updatePersonRecord,
} from "@/app/_lib/data/people"
import {
  checkPasswordRestore,
  checkPersonActivation,
  decidePersonCreation,
  decidePersonUpdate,
  LAST_DIRECTOR_MESSAGE,
  PERSON_DENIAL_MESSAGES,
} from "@/app/_lib/domain/person"
import { hasRegistryAccess } from "@/app/_lib/domain/registry"
import type {
  InsertPersonOutcome,
  PersonDenialReason,
  ResetPersonPasswordOutcome,
  UpdatePersonActiveOutcome,
  UpdatePersonOutcome,
} from "@/app/_lib/types/person"
import {
  type CreatePersonInput,
  createPersonSchema,
  type RestorePersonPasswordInput,
  restorePersonPasswordSchema,
  type SetPersonActiveInput,
  setPersonActiveSchema,
  type UpdatePersonInput,
  updatePersonSchema,
} from "@/app/_lib/validation/person"

export type PersonErrorCode =
  | "INVALID_INPUT"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "EMAIL_TAKEN"
  | "DEPARTMENT_INACTIVE"
  | "DEPARTMENT_UNASSIGNED"
  | "LAST_DIRECTOR"
  | "SELF_DEACTIVATION"
  | "SELF_PASSWORD_RESTORE"
  | "DEFAULT_PASSWORD_MISSING"
  | "SESSION_REVOKE_FAILED"

export interface PersonActionSuccess {
  ok: true
  message: string
}

export interface PersonActionFailure {
  ok: false
  message: string
  code?: PersonErrorCode
}

export type PersonActionResult = PersonActionSuccess | PersonActionFailure

type PersonOutcomeFailureStatus = Exclude<
  (
    | InsertPersonOutcome
    | UpdatePersonOutcome
    | UpdatePersonActiveOutcome
    | ResetPersonPasswordOutcome
  )["status"],
  "saved"
>

const PERSON_CREATED_MESSAGE =
  "Pessoa cadastrada. No primeiro acesso ela vai definir a própria senha."
const PERSON_UPDATED_MESSAGE = "Dados atualizados."
const PERSON_DEACTIVATED_MESSAGE =
  "Pessoa desativada. As sessões abertas dela foram encerradas."
const PERSON_REACTIVATED_MESSAGE = "Pessoa reativada."
const PASSWORD_RESTORED_MESSAGE =
  "Senha restaurada para a padrão. A pessoa vai definir uma nova no próximo acesso."
const PERSON_NOT_FOUND_MESSAGE = "Pessoa não encontrada."
const EMAIL_TAKEN_MESSAGE = "Já existe uma pessoa com esse e-mail."
const DEFAULT_PASSWORD_MISSING_MESSAGE =
  "A senha padrão não está configurada no servidor. Peça ao responsável pelo sistema para definir DEFAULT_USER_PASSWORD."
const DEACTIVATION_REVOKE_FAILED_MESSAGE =
  "A pessoa foi desativada, mas as sessões abertas não puderam ser encerradas. Desative de novo para tentar outra vez."
const RESTORE_REVOKE_FAILED_MESSAGE =
  "A senha foi restaurada, mas as sessões abertas não puderam ser encerradas. Restaure de novo para tentar outra vez."
const UNEXPECTED_ERROR_MESSAGE =
  "Não foi possível salvar a pessoa agora. Tente novamente."

const UNEXPECTED_FAILURE: PersonActionFailure = {
  ok: false,
  message: UNEXPECTED_ERROR_MESSAGE,
}

const NOT_FOUND_FAILURE: PersonActionFailure = {
  ok: false,
  code: "NOT_FOUND",
  message: PERSON_NOT_FOUND_MESSAGE,
}

const DEFAULT_PASSWORD_MISSING_FAILURE: PersonActionFailure = {
  ok: false,
  code: "DEFAULT_PASSWORD_MISSING",
  message: DEFAULT_PASSWORD_MISSING_MESSAGE,
}

const OUTCOME_FAILURES = {
  not_found: NOT_FOUND_FAILURE,
  email_taken: {
    ok: false,
    code: "EMAIL_TAKEN",
    message: EMAIL_TAKEN_MESSAGE,
  },
  department_inactive: {
    ok: false,
    code: "DEPARTMENT_INACTIVE",
    message: PERSON_DENIAL_MESSAGES.DEPARTMENT_INACTIVE,
  },
  last_director: {
    ok: false,
    code: "LAST_DIRECTOR",
    message: LAST_DIRECTOR_MESSAGE,
  },
} satisfies Record<PersonOutcomeFailureStatus, PersonActionFailure>

const denied = (reason: PersonDenialReason): PersonActionFailure => ({
  ok: false,
  code: reason === "DEPARTMENT_NOT_FOUND" ? "NOT_FOUND" : reason,
  message: PERSON_DENIAL_MESSAGES[reason],
})

const FORBIDDEN_FAILURE = denied("FORBIDDEN")

const invalidInput = (
  firstIssueMessage: string | undefined,
): PersonActionFailure => ({
  ok: false,
  code: "INVALID_INPUT",
  message: firstIssueMessage ?? UNEXPECTED_ERROR_MESSAGE,
})

const revalidatePeople = () => {
  revalidatePath("/(app)", "layout")
}

export const createPerson = async (
  input: CreatePersonInput,
): Promise<PersonActionResult> => {
  const access = await getRegistryAccess()
  if (!hasRegistryAccess(access)) return FORBIDDEN_FAILURE

  const parsed = createPersonSchema.safeParse(input)
  if (!parsed.success) return invalidInput(parsed.error.issues[0]?.message)

  let outcome: InsertPersonOutcome

  try {
    const department = await findPersonDepartment(parsed.data.departmentId)
    const decision = decidePersonCreation(access, parsed.data, department)
    if (!decision.ok) return denied(decision.reason)

    const passwordHash = await hashDefaultPassword()
    if (passwordHash === null) return DEFAULT_PASSWORD_MISSING_FAILURE

    outcome = await insertPerson({
      name: parsed.data.name,
      email: parsed.data.email,
      role: decision.role,
      departmentId: decision.departmentId,
      passwordHash,
    })
  } catch (error) {
    console.error("[createPerson]", error)
    return UNEXPECTED_FAILURE
  }

  if (outcome.status !== "saved") return OUTCOME_FAILURES[outcome.status]

  revalidatePeople()

  return { ok: true, message: PERSON_CREATED_MESSAGE }
}

export const updatePerson = async (
  input: UpdatePersonInput,
): Promise<PersonActionResult> => {
  const access = await getRegistryAccess()
  if (!hasRegistryAccess(access)) return FORBIDDEN_FAILURE

  const parsed = updatePersonSchema.safeParse(input)
  if (!parsed.success) return invalidInput(parsed.error.issues[0]?.message)

  let outcome: UpdatePersonOutcome

  try {
    const person = await findManagedPerson(parsed.data.id)
    if (!person) return NOT_FOUND_FAILURE

    const department = await findPersonDepartment(parsed.data.departmentId)
    const decision = decidePersonUpdate(access, person, parsed.data, department)
    if (!decision.ok) return denied(decision.reason)

    outcome = await updatePersonRecord({
      id: person.id,
      name: parsed.data.name,
      email: parsed.data.email,
      role: decision.role,
      departmentId: decision.departmentId,
    })
  } catch (error) {
    console.error("[updatePerson]", error)
    return UNEXPECTED_FAILURE
  }

  if (outcome.status !== "saved") return OUTCOME_FAILURES[outcome.status]

  revalidatePeople()

  return { ok: true, message: PERSON_UPDATED_MESSAGE }
}

export const setPersonActive = async (
  input: SetPersonActiveInput,
): Promise<PersonActionResult> => {
  const actor = await requireSession()
  const access = await getRegistryAccess()
  if (!hasRegistryAccess(access)) return FORBIDDEN_FAILURE

  const parsed = setPersonActiveSchema.safeParse(input)
  if (!parsed.success) return invalidInput(parsed.error.issues[0]?.message)

  let outcome: UpdatePersonActiveOutcome

  try {
    const person = await findManagedPerson(parsed.data.id)
    if (!person) return NOT_FOUND_FAILURE

    const check = checkPersonActivation(
      access,
      actor.id,
      person,
      parsed.data.isActive,
    )
    if (!check.ok) return denied(check.reason)

    outcome = await updatePersonActive(person.id, parsed.data.isActive)
  } catch (error) {
    console.error("[setPersonActive]", error)
    return UNEXPECTED_FAILURE
  }

  if (outcome.status !== "saved") return OUTCOME_FAILURES[outcome.status]

  revalidatePeople()

  if (parsed.data.isActive) {
    return { ok: true, message: PERSON_REACTIVATED_MESSAGE }
  }

  try {
    await revokeUserSessions(outcome.id)
  } catch (error) {
    console.error("[setPersonActive] revokeUserSessions", error)
    return {
      ok: false,
      code: "SESSION_REVOKE_FAILED",
      message: DEACTIVATION_REVOKE_FAILED_MESSAGE,
    }
  }

  return { ok: true, message: PERSON_DEACTIVATED_MESSAGE }
}

export const restorePersonPassword = async (
  input: RestorePersonPasswordInput,
): Promise<PersonActionResult> => {
  const actor = await requireSession()
  const access = await getRegistryAccess()
  if (!hasRegistryAccess(access)) return FORBIDDEN_FAILURE

  const parsed = restorePersonPasswordSchema.safeParse(input)
  if (!parsed.success) return invalidInput(parsed.error.issues[0]?.message)

  let outcome: ResetPersonPasswordOutcome

  try {
    const person = await findManagedPerson(parsed.data.id)
    if (!person) return NOT_FOUND_FAILURE

    const check = checkPasswordRestore(access, actor.id, person)
    if (!check.ok) return denied(check.reason)

    const passwordHash = await hashDefaultPassword()
    if (passwordHash === null) return DEFAULT_PASSWORD_MISSING_FAILURE

    outcome = await resetPersonPassword(person.id, passwordHash)
  } catch (error) {
    console.error("[restorePersonPassword]", error)
    return UNEXPECTED_FAILURE
  }

  if (outcome.status !== "saved") return OUTCOME_FAILURES[outcome.status]

  revalidatePeople()

  try {
    await revokeUserSessions(outcome.id)
  } catch (error) {
    console.error("[restorePersonPassword] revokeUserSessions", error)
    return {
      ok: false,
      code: "SESSION_REVOKE_FAILED",
      message: RESTORE_REVOKE_FAILED_MESSAGE,
    }
  }

  return { ok: true, message: PASSWORD_RESTORED_MESSAGE }
}
