import { and, eq, inArray, sql } from "drizzle-orm"

import { isUniqueViolation } from "@/app/_lib/data/db-errors"
import { checkDepartmentDeactivation } from "@/app/_lib/domain/department"
import { planDepartmentAdmins } from "@/app/_lib/domain/department-admins"
import { OPEN_TICKET_STATUSES } from "@/app/_lib/domain/ticket"
import type {
  DepartmentListItem,
  DepartmentOption,
  InsertDepartmentOutcome,
  UpdateDepartmentActiveOutcome,
  UpdateDepartmentNameOutcome,
} from "@/app/_lib/types/department"
import type {
  DepartmentAdminsRequest,
  DepartmentMember,
} from "@/app/_lib/types/department-admins"
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

export async function listEditableDepartmentMembers(): Promise<
  DepartmentMember[]
> {
  return db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      departmentId: department.id,
    })
    .from(user)
    .innerJoin(department, eq(user.departmentId, department.id))
    .where(
      and(
        eq(user.isActive, true),
        eq(department.isActive, true),
        eq(department.isBoard, false),
        eq(department.isUnassigned, false),
      ),
    )
    .orderBy(sql`lower(${user.name})`, user.id)
}

export async function updateDepartmentName(
  id: number,
  name: string,
  admins: DepartmentAdminsRequest | null,
): Promise<UpdateDepartmentNameOutcome> {
  try {
    return await db.transaction(
      async (tx): Promise<UpdateDepartmentNameOutcome> => {
        const [current] = await tx
          .select({
            isActive: department.isActive,
            isBoard: department.isBoard,
            isUnassigned: department.isUnassigned,
          })
          .from(department)
          .where(eq(department.id, id))
          .for("update")

        if (!current) {
          return { status: "not_found" }
        }

        let promotedIds: number[] = []
        let demotedIds: number[] = []

        if (admins !== null) {
          const members = await tx
            .select({ id: user.id, role: user.role })
            .from(user)
            .where(and(eq(user.departmentId, id), eq(user.isActive, true)))
            .for("update")

          const plan = planDepartmentAdmins(current, members, admins)

          if (!plan.ok) {
            return plan.reason === "NOT_EDITABLE"
              ? { status: "admins_not_editable" }
              : { status: "members_changed" }
          }

          promotedIds = plan.promotedIds
          demotedIds = plan.demotedIds
        }

        const now = new Date()

        await tx
          .update(department)
          .set({ name, updatedAt: now })
          .where(eq(department.id, id))

        if (promotedIds.length > 0) {
          await tx
            .update(user)
            .set({ role: "admin", updatedAt: now })
            .where(inArray(user.id, promotedIds))
        }

        if (demotedIds.length > 0) {
          await tx
            .update(user)
            .set({ role: "member", updatedAt: now })
            .where(inArray(user.id, demotedIds))
        }

        return { status: "saved", id }
      },
    )
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
