import { and, eq, ne, or, sql } from "drizzle-orm"

import { isUniqueViolation } from "@/app/_lib/data/db-errors"
import type {
  InsertPersonOutcome,
  InsertPersonValues,
  ManagedPerson,
  PersonDepartmentFacts,
  PersonListItem,
  PersonListScope,
  ResetPersonPasswordOutcome,
  UpdatePersonActiveOutcome,
  UpdatePersonOutcome,
  UpdatePersonValues,
} from "@/app/_lib/types/person"
import type { AssigneeOption } from "@/app/_lib/types/ticket"
import { db, type Transaction } from "@/db"
import { account } from "@/db/auth-schema"
import { department, user } from "@/db/schema"

const USER_EMAIL_LOWER_CONSTRAINT = "user_email_lower_idx"
const CREDENTIAL_PROVIDER_ID = "credential"

export function isPersonEmailTakenError(error: unknown): boolean {
  return isUniqueViolation(error, USER_EMAIL_LOWER_CONSTRAINT)
}

async function countOtherActiveBoardMembers(
  tx: Transaction,
  personId: number,
): Promise<number> {
  await tx
    .select({ id: department.id })
    .from(department)
    .where(eq(department.isBoard, true))
    .for("update")

  return tx.$count(
    user,
    and(
      ne(user.id, personId),
      eq(user.isActive, true),
      sql`${user.departmentId} in (select id from ${department} where ${department.isBoard})`,
    ),
  )
}

async function insertCredentialAccount(
  tx: Transaction,
  userId: number,
  passwordHash: string,
): Promise<void> {
  const now = new Date()

  await tx.insert(account).values({
    accountId: String(userId),
    providerId: CREDENTIAL_PROVIDER_ID,
    userId,
    password: passwordHash,
    createdAt: now,
    updatedAt: now,
  })
}

export async function listPeople(
  scope: PersonListScope,
): Promise<PersonListItem[]> {
  return db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role,
      departmentId: user.departmentId,
      departmentName: department.name,
      departmentIsBoard: department.isBoard,
      departmentIsUnassigned: department.isUnassigned,
      departmentIsActive: department.isActive,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    })
    .from(user)
    .innerJoin(department, eq(user.departmentId, department.id))
    .where(
      scope.kind === "department_and_unassigned"
        ? or(
            eq(user.departmentId, scope.departmentId),
            eq(department.isUnassigned, true),
          )
        : undefined,
    )
    .orderBy(sql`lower(${user.name})`, user.id)
}

export async function listTicketAssigneeOptions(
  departmentId: number,
): Promise<AssigneeOption[]> {
  return db
    .select({ id: user.id, name: user.name })
    .from(user)
    .where(and(eq(user.departmentId, departmentId), eq(user.isActive, true)))
    .orderBy(sql`lower(${user.name})`, user.id)
}

export async function findManagedPerson(
  id: number,
): Promise<ManagedPerson | null> {
  const [row] = await db
    .select({
      id: user.id,
      role: user.role,
      isActive: user.isActive,
      departmentId: user.departmentId,
      departmentIsActive: department.isActive,
      departmentIsBoard: department.isBoard,
      departmentIsUnassigned: department.isUnassigned,
    })
    .from(user)
    .innerJoin(department, eq(user.departmentId, department.id))
    .where(eq(user.id, id))
    .limit(1)

  return row ?? null
}

export async function findPersonDepartment(
  departmentId: number,
): Promise<PersonDepartmentFacts | null> {
  const [row] = await db
    .select({
      id: department.id,
      isActive: department.isActive,
      isBoard: department.isBoard,
      isUnassigned: department.isUnassigned,
    })
    .from(department)
    .where(eq(department.id, departmentId))
    .limit(1)

  return row ?? null
}

export async function insertPerson(
  values: InsertPersonValues,
): Promise<InsertPersonOutcome> {
  try {
    return await db.transaction(async (tx) => {
      const [departmentRow] = await tx
        .select({ isActive: department.isActive })
        .from(department)
        .where(eq(department.id, values.departmentId))
        .for("share")

      if (!departmentRow || !departmentRow.isActive) {
        return { status: "department_inactive" }
      }

      const [created] = await tx
        .insert(user)
        .values({
          name: values.name,
          email: values.email,
          role: values.role,
          departmentId: values.departmentId,
          mustChangePassword: true,
        })
        .returning({ id: user.id })

      await insertCredentialAccount(tx, created.id, values.passwordHash)

      return { status: "saved", id: created.id }
    })
  } catch (error) {
    if (isPersonEmailTakenError(error)) {
      return { status: "email_taken" }
    }
    throw error
  }
}

export async function updatePersonRecord(
  values: UpdatePersonValues,
): Promise<UpdatePersonOutcome> {
  try {
    return await db.transaction(async (tx) => {
      const [current] = await tx
        .select({
          departmentId: user.departmentId,
          isActive: user.isActive,
          departmentIsBoard: department.isBoard,
        })
        .from(user)
        .innerJoin(department, eq(user.departmentId, department.id))
        .where(eq(user.id, values.id))
        .for("update", { of: user })

      if (!current) {
        return { status: "not_found" }
      }

      const departmentChanged = current.departmentId !== values.departmentId

      if (current.isActive && current.departmentIsBoard && departmentChanged) {
        const others = await countOtherActiveBoardMembers(tx, values.id)
        if (others === 0) {
          return { status: "last_director" }
        }
      }

      if (departmentChanged) {
        const [target] = await tx
          .select({ isActive: department.isActive })
          .from(department)
          .where(eq(department.id, values.departmentId))
          .for("share")

        if (!target || !target.isActive) {
          return { status: "department_inactive" }
        }
      }

      await tx
        .update(user)
        .set({
          name: values.name,
          email: values.email,
          role: values.role,
          departmentId: values.departmentId,
          updatedAt: new Date(),
        })
        .where(eq(user.id, values.id))

      return { status: "saved", id: values.id }
    })
  } catch (error) {
    if (isPersonEmailTakenError(error)) {
      return { status: "email_taken" }
    }
    throw error
  }
}

export async function updatePersonActive(
  id: number,
  isActive: boolean,
): Promise<UpdatePersonActiveOutcome> {
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select({
        isActive: user.isActive,
        departmentId: user.departmentId,
        departmentIsBoard: department.isBoard,
      })
      .from(user)
      .innerJoin(department, eq(user.departmentId, department.id))
      .where(eq(user.id, id))
      .for("update", { of: user })

    if (!current) {
      return { status: "not_found" }
    }

    if (!isActive && current.isActive && current.departmentIsBoard) {
      const others = await countOtherActiveBoardMembers(tx, id)
      if (others === 0) {
        return { status: "last_director" }
      }
    }

    if (isActive) {
      const [target] = await tx
        .select({ isActive: department.isActive })
        .from(department)
        .where(eq(department.id, current.departmentId))
        .for("share")

      if (!target || !target.isActive) {
        return { status: "department_inactive" }
      }
    }

    await tx
      .update(user)
      .set({
        isActive,
        deactivatedAt: isActive
          ? null
          : sql`coalesce(${user.deactivatedAt}, now())`,
        updatedAt: new Date(),
      })
      .where(eq(user.id, id))

    return { status: "saved", id }
  })
}

export async function resetPersonPassword(
  id: number,
  passwordHash: string,
): Promise<ResetPersonPasswordOutcome> {
  return db.transaction(async (tx) => {
    const [updatedUser] = await tx
      .update(user)
      .set({ mustChangePassword: true, updatedAt: new Date() })
      .where(eq(user.id, id))
      .returning({ id: user.id })

    if (!updatedUser) {
      return { status: "not_found" }
    }

    const [updatedAccount] = await tx
      .update(account)
      .set({ password: passwordHash, updatedAt: new Date() })
      .where(
        and(
          eq(account.userId, id),
          eq(account.providerId, CREDENTIAL_PROVIDER_ID),
        ),
      )
      .returning({ id: account.id })

    if (!updatedAccount) {
      await insertCredentialAccount(tx, id, passwordHash)
    }

    return { status: "saved", id }
  })
}
