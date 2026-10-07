import { and, eq, inArray, sql } from "drizzle-orm"

import { isUniqueViolation } from "@/app/_lib/data/db-errors"
import { checkDepartmentDeactivation } from "@/app/_lib/domain/department"
import { OPEN_TICKET_STATUSES } from "@/app/_lib/domain/ticket"
import type {
  DepartmentListItem,
  DepartmentOption,
  InsertDepartmentOutcome,
  UpdateDepartmentActiveOutcome,
  UpdateDepartmentNameOutcome,
} from "@/app/_lib/types/department"
import { db } from "@/db"
import { department, ticket, user } from "@/db/schema"

const DEPARTMENT_NAME_LOWER_CONSTRAINT = "department_name_lower_idx"

export function isDepartmentNameTakenError(error: unknown): boolean {
  return isUniqueViolation(error, DEPARTMENT_NAME_LOWER_CONSTRAINT)
}

export async function listDepartments(): Promise<DepartmentListItem[]> {
  return db
    .select({
      id: department.id,
      name: department.name,
      isActive: department.isActive,
      isBoard: department.isBoard,
      isUnassigned: department.isUnassigned,
      activeUsers: db.$count(
        user,
        and(eq(user.departmentId, department.id), eq(user.isActive, true)),
      ),
      openTickets: db.$count(
        ticket,
        and(
          eq(ticket.currentDepartmentId, department.id),
          inArray(ticket.status, [...OPEN_TICKET_STATUSES]),
        ),
      ),
      createdAt: department.createdAt,
    })
    .from(department)
    .orderBy(
      sql`${department.isBoard} desc`,
      sql`${department.isUnassigned} asc`,
      sql`lower(${department.name})`,
      department.id,
    )
}

export async function insertDepartment(
  name: string,
): Promise<InsertDepartmentOutcome> {
  try {
    const [row] = await db
      .insert(department)
      .values({ name })
      .returning({ id: department.id })

    return { status: "saved", id: row.id }
  } catch (error) {
    if (isDepartmentNameTakenError(error)) {
      return { status: "name_taken" }
    }
    throw error
  }
}

export async function updateDepartmentName(
  id: number,
  name: string,
): Promise<UpdateDepartmentNameOutcome> {
  try {
    const [row] = await db
      .update(department)
      .set({ name, updatedAt: new Date() })
      .where(eq(department.id, id))
      .returning({ id: department.id })

    if (!row) {
      return { status: "not_found" }
    }

    return { status: "saved", id: row.id }
  } catch (error) {
    if (isDepartmentNameTakenError(error)) {
      return { status: "name_taken" }
    }
    throw error
  }
}

export async function updateDepartmentActive(
  id: number,
  isActive: boolean,
): Promise<UpdateDepartmentActiveOutcome> {
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select({
        id: department.id,
        isBoard: department.isBoard,
        isUnassigned: department.isUnassigned,
      })
      .from(department)
      .where(eq(department.id, id))
      .for("update")

    if (!current) {
      return { status: "not_found" }
    }

    if (isActive) {
      await tx
        .update(department)
        .set({ isActive: true, updatedAt: new Date() })
        .where(eq(department.id, id))

      return { status: "saved", id }
    }

    const activeUsers = await tx.$count(
      user,
      and(eq(user.departmentId, id), eq(user.isActive, true)),
    )
    const openTickets = await tx.$count(
      ticket,
      and(
        eq(ticket.currentDepartmentId, id),
        inArray(ticket.status, [...OPEN_TICKET_STATUSES]),
      ),
    )

    const check = checkDepartmentDeactivation({
      isBoard: current.isBoard,
      isUnassigned: current.isUnassigned,
      activeUsers,
      openTickets,
    })

    if (!check.ok) {
      return { status: "blocked", block: check }
    }

    await tx
      .update(department)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(department.id, id))

    return { status: "saved", id }
  })
}

export async function findDepartmentName(
  departmentId: number,
): Promise<string | null> {
  const [row] = await db
    .select({ name: department.name })
    .from(department)
    .where(eq(department.id, departmentId))
    .limit(1)

  return row?.name ?? null
}

export async function listDepartmentOptions(): Promise<DepartmentOption[]> {
  return db
    .select({
      id: department.id,
      name: department.name,
      isBoard: department.isBoard,
      isUnassigned: department.isUnassigned,
      isActive: department.isActive,
    })
    .from(department)
    .orderBy(
      sql`${department.isBoard} desc`,
      sql`${department.isUnassigned} asc`,
      sql`lower(${department.name})`,
      department.id,
    )
}
