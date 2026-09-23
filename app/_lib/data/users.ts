import { eq } from "drizzle-orm"

import { db } from "@/db"
import { type User, user } from "@/db/schema"

export async function getUserById(id: number): Promise<User | null> {
  const [row] = await db.select().from(user).where(eq(user.id, id)).limit(1)

  return row ?? null
}
