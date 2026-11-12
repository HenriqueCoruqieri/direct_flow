import { eq } from "drizzle-orm"

import type {
  DepartmentDueHours,
  DepartmentDueHoursRecord,
} from "@/app/_lib/types/department-due-hours"
import { db, type Transaction } from "@/db"
import { departmentDueHours, user } from "@/db/schema"

export async function findDepartmentDueHours(
  departmentId: number,
): Promise<DepartmentDueHoursRecord | null> {
  const [row] = await db
    .select({
      departmentId: departmentDueHours.departmentId,
      criticaHours: departmentDueHours.criticaHours,
      altaHours: departmentDueHours.altaHours,
      mediaHours: departmentDueHours.mediaHours,
      baixaHours: departmentDueHours.baixaHours,
      updatedAt: departmentDueHours.updatedAt,
      updatedByName: user.name,
    })
    .from(departmentDueHours)
    .leftJoin(user, eq(departmentDueHours.updatedBy, user.id))
    .where(eq(departmentDueHours.departmentId, departmentId))
    .limit(1)

  return row ?? null
}

export async function upsertDepartmentDueHours(
  departmentId: number,
  hours: DepartmentDueHours,
  actorId: number,
): Promise<void> {
  const values = {
    criticaHours: hours.criticaHours,
    altaHours: hours.altaHours,
    mediaHours: hours.mediaHours,
    baixaHours: hours.baixaHours,
    updatedBy: actorId,
  }

  await db
    .insert(departmentDueHours)
    .values({ departmentId, ...values })
    .onConflictDoUpdate({
      target: departmentDueHours.departmentId,
      set: { ...values, updatedAt: new Date() },
    })
}

export async function findDepartmentDueHoursIn(
  tx: Transaction,
  departmentId: number,
): Promise<DepartmentDueHours | null> {
  const [row] = await tx
    .select({
      criticaHours: departmentDueHours.criticaHours,
      altaHours: departmentDueHours.altaHours,
      mediaHours: departmentDueHours.mediaHours,
      baixaHours: departmentDueHours.baixaHours,
    })
    .from(departmentDueHours)
    .where(eq(departmentDueHours.departmentId, departmentId))
    .limit(1)

  return row ?? null
}
