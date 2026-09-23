import "dotenv/config"

import { defineConfig } from "drizzle-kit"

function requiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `drizzle-kit abortado: variável de ambiente ${name} não definida.`,
    )
  }
  return value
}

export default defineConfig({
  schema: ["./db/schema.ts", "./db/auth-schema.ts"],
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: requiredEnv("DATABASE_URL"),
  },
  casing: "snake_case",
})
