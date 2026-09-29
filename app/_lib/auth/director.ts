import { and, eq } from "drizzle-orm"
import { notFound } from "next/navigation"
import { cache } from "react"

import { getSession, requireSession } from "@/app/_lib/auth/session"
import type { Actor } from "@/app/_lib/types/actor"
import { db } from "@/db"
import { department, user } from "@/db/schema"

const isActiveBoardMember = cache(async (userId: number): Promise<boolean> => {
  const rows = await db
    .select({ id: user.id })
    .from(user)
    .innerJoin(department, eq(user.departmentId, department.id))
    .where(
      and(
        eq(user.id, userId),
        eq(user.isActive, true),
        eq(department.isBoard, true),
      ),
    )
    .limit(1)
  return rows.length > 0
})

export const requireDirector = async (): Promise<Actor> => {
  const actor = await requireSession()
  if (!(await isActiveBoardMember(actor.id))) notFound()
  return actor
}

export const getDirector = async (): Promise<Actor | null> => {
  const actor = await requireSession()
  return (await isActiveBoardMember(actor.id)) ? actor : null
}

export const getIsDirector = async (): Promise<boolean> => {
  const actor = await getSession()
  if (!actor) return false
  return isActiveBoardMember(actor.id)
}
