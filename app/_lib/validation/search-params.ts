import { z } from "zod"

export type RawSearchParams = Record<string, string | string[] | undefined>

export const firstSearchParam = (
  value: string | string[] | undefined,
): string | undefined => (Array.isArray(value) ? value[0] : value)

export const POSTGRES_INTEGER_MAX = 2_147_483_647

export const idSearchParamSchema = (message: string) =>
  z
    .string({ error: message })
    .regex(/^[1-9]\d*$/, { error: message })
    .transform(Number)
    .pipe(z.number().max(POSTGRES_INTEGER_MAX, { error: message }))
