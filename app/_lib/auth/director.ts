import { notFound } from "next/navigation"

import { getRegistryAccess } from "@/app/_lib/auth/registry-access"
import { requireSession } from "@/app/_lib/auth/session"
import { isDirectorAccess } from "@/app/_lib/domain/registry"
import type { Actor } from "@/app/_lib/types/actor"

export const requireDirector = async (): Promise<Actor> => {
  const actor = await requireSession()
  if (!isDirectorAccess(await getRegistryAccess())) notFound()
  return actor
}

export const getDirector = async (): Promise<Actor | null> => {
  const actor = await requireSession()
  return isDirectorAccess(await getRegistryAccess()) ? actor : null
}

export const getIsDirector = async (): Promise<boolean> =>
  isDirectorAccess(await getRegistryAccess())
