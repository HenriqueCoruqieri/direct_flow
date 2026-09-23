import "dotenv/config"

import { hashPassword } from "better-auth/crypto"
import { sql } from "drizzle-orm"

import { db } from "@/db"
import { account } from "@/db/auth-schema"
import { department, user } from "@/db/schema"

function requiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Seed abortado: variável de ambiente ${name} não definida.`)
  }
  return value
}

async function seed() {
  const departmentName = requiredEnv("SEED_DEPARTMENT_NAME")
  const adminName = requiredEnv("SEED_ADMIN_NAME")
  const adminEmail = requiredEnv("SEED_ADMIN_EMAIL")
  const adminPassword = requiredEnv("SEED_ADMIN_PASSWORD")

  try {
    const [existingAdmin] = await db
      .select({ id: user.id })
      .from(user)
      .where(sql`lower(${user.email}) = lower(${adminEmail})`)
      .limit(1)

    if (existingAdmin) {
      console.log(
        `Seed ignorado: já existe um usuário com o e-mail ${adminEmail}.`,
      )
      return
    }

    await db.transaction(async (tx) => {
      const [existingDepartment] = await tx
        .select({ id: department.id })
        .from(department)
        .where(sql`lower(${department.name}) = lower(${departmentName})`)
        .limit(1)

      const departmentId =
        existingDepartment?.id ??
        (
          await tx
            .insert(department)
            .values({ name: departmentName })
            .returning({ id: department.id })
        )[0].id

      const [createdAdmin] = await tx
        .insert(user)
        .values({
          name: adminName,
          email: adminEmail,
          role: "admin",
          departmentId,
          isActive: true,
          emailVerified: true,
        })
        .returning({ id: user.id })

      const passwordHash = await hashPassword(adminPassword)
      const now = new Date()

      await tx.insert(account).values({
        accountId: String(createdAdmin.id),
        providerId: "credential",
        userId: createdAdmin.id,
        password: passwordHash,
        createdAt: now,
        updatedAt: now,
      })

      console.log(
        `Seed concluído: setor "${departmentName}" (id ${departmentId}) e admin "${adminEmail}" (id ${createdAdmin.id}) criados.`,
      )
    })
  } finally {
    await db.$client.end()
  }
}

seed().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
