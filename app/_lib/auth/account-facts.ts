import { eq } from "drizzle-orm"
import { cache } from "react"

import { getSession } from "@/app/_lib/auth/session"
import type { RegistryAccessFacts } from "@/app/_lib/types/registry"
import { db } from "@/db"
import { department, user } from "@/db/schema"

export const getAccountFacts = cache(
  async (): Promise<RegistryAccessFacts | null> => {
    const actor = await getSession()
    if (!actor) return null
    const [facts] = await db
      .select({
        isActive: user.isActive,
        role: user.role,
        departmentId: user.departmentId,
        mustChangePassword: user.mustChangePassword,
        isBoard: department.isBoard,
        isUnassigned: department.isUnassigned,
      })
      .from(user)
      .innerJoin(department, eq(user.departmentId, department.id))
      .where(eq(user.id, actor.id))
      .limit(1)
    return facts ?? null
  },
)
