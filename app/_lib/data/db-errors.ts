import { DrizzleQueryError } from "drizzle-orm/errors"
import { DatabaseError } from "pg"

export function isUniqueViolation(error: unknown, constraint: string): boolean {
  if (!(error instanceof DrizzleQueryError)) return false
  const cause = error.cause
  if (!(cause instanceof DatabaseError)) return false
  return cause.code === "23505" && cause.constraint === constraint
}
