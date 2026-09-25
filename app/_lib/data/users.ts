import { eq } from "drizzle-orm"

import type { UserProfile } from "@/app/_lib/types/user"
import { db } from "@/db"
import { department, user } from "@/db/schema"

export async function findUserProfile(
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
      image: user.image,
      isActive: user.isActive,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    })
    .from(user)
    .innerJoin(department, eq(user.departmentId, department.id))
    .where(eq(user.id, userId))
    .limit(1)

  return row ?? null
}

export async function updateUserImage(
  userId: number,
  image: string | null,
): Promise<void> {
  await db
    .update(user)
    .set({ image, updatedAt: new Date() })
    .where(eq(user.id, userId))
}
