import { notFound, redirect } from "next/navigation"
import { cache } from "react"

import { getAccountFacts } from "@/app/_lib/auth/account-facts"
import { getSession } from "@/app/_lib/auth/session"
import {
  hasRegistryAccess,
  resolveRegistryAccess,
} from "@/app/_lib/domain/registry"
import type {
  GrantedRegistryAccess,
  RegistryAccess,
} from "@/app/_lib/types/registry"

export const getRegistryAccess = cache(async (): Promise<RegistryAccess> =>
  resolveRegistryAccess(await getAccountFacts()),
)

export const requireRegistryAccess =
  async (): Promise<GrantedRegistryAccess> => {
    const actor = await getSession()
    if (!actor) redirect("/login")
    const access = await getRegistryAccess()
    if (!hasRegistryAccess(access)) notFound()
    return access
  }
