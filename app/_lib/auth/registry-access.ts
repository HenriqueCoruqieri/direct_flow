import { eq } from "drizzle-orm"
import { notFound, redirect } from "next/navigation"
import { cache } from "react"

import { getSession } from "@/app/_lib/auth/session"
import {
  hasRegistryAccess,
  resolveRegistryAccess,
} from "@/app/_lib/domain/registry"
import type {
  GrantedRegistryAccess,
  RegistryAccess,
} from "@/app/_lib/types/registry"
import { db } from "@/db"
import { department, user } from "@/db/schema"

export const getRegistryAccess = cache(async (): Promise<RegistryAccess> => {
  const actor = await getSession()
  if (!actor) return resolveRegistryAccess(null)
  const [facts] = await db
    .select({
      isActive: user.isActive,
      role: user.role,
      departmentId: user.departmentId,
      isBoard: department.isBoard,
    })
    .from(user)
    .innerJoin(department, eq(user.departmentId, department.id))
    .where(eq(user.id, actor.id))
    .limit(1)
  return resolveRegistryAccess(facts ?? null)
})

export const requireRegistryAccess =
  async (): Promise<GrantedRegistryAccess> => {
    const actor = await getSession()
    if (!actor) redirect("/login")
    const access = await getRegistryAccess()
    if (!hasRegistryAccess(access)) notFound()
    return access
  }
