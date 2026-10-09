import { eq } from "drizzle-orm"

import type { TicketActorFacts } from "@/app/_lib/types/ticket"
import type { Transaction } from "@/db"
import { department, user } from "@/db/schema"

export interface LockedActorFacts extends TicketActorFacts {
  name: string
}

export async function lockActorFacts(
  tx: Transaction,
  userId: number,
): Promise<LockedActorFacts | null> {
  const [row] = await tx
    .select({
      departmentId: user.departmentId,
      role: user.role,
      isActive: user.isActive,
      mustChangePassword: user.mustChangePassword,
      name: user.name,
      isBoard: department.isBoard,
    })
    .from(user)
    .innerJoin(department, eq(department.id, user.departmentId))
    .where(eq(user.id, userId))
    .for("share", { of: user })

  if (!row) return null

  return {
    userId,
    departmentId: row.departmentId,
    isBoard: row.isBoard,
    role: row.role,
    isActive: row.isActive,
    mustChangePassword: row.mustChangePassword,
    name: row.name,
  }
}
