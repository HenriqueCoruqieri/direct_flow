import { eq } from "drizzle-orm"

import type { UserProfile } from "@/app/_lib/types/user"
import { db } from "@/db"
import { department, user } from "@/db/schema"

export async function getUserProfile(
  userId: number,
): Promise<UserProfile | null> {
  const [row] = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId,
      departmentName: department.name,
    })
    .from(user)
    .innerJoin(department, eq(user.departmentId, department.id))
    .where(eq(user.id, userId))
    .limit(1)

  return row ?? null
}
