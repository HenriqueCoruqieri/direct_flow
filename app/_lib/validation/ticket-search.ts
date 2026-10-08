import { z } from "zod"

import {
  TICKET_SEARCH_MAX_LENGTH,
  TICKET_SEARCH_TEXT_MIN_LENGTH,
} from "@/app/_lib/domain/ticket-search"
import type { TicketSearchQuery } from "@/app/_lib/types/ticket-search"
import { POSTGRES_INTEGER_MAX } from "@/app/_lib/validation/search-params"

const INVALID_SEARCH_MESSAGE = "Busca inválida."

const TICKET_NUMBER_PREFIX = "#"

const DIGITS_ONLY = /^\d+$/

const TICKET_NUMBER_MAX_DIGITS = String(POSTGRES_INTEGER_MAX).length

const classifyTicketSearch = (text: string): TicketSearchQuery | null => {
  const digits = text.startsWith(TICKET_NUMBER_PREFIX)
    ? text.slice(TICKET_NUMBER_PREFIX.length)
    : text
  if (DIGITS_ONLY.test(digits)) {
    return digits.length <= TICKET_NUMBER_MAX_DIGITS
      ? { mode: "number", digits }
      : null
  }
  return text.length >= TICKET_SEARCH_TEXT_MIN_LENGTH
    ? { mode: "title", text }
    : null
}

export const ticketSearchQuerySchema = z
  .string({ error: INVALID_SEARCH_MESSAGE })
  .trim()
  .max(TICKET_SEARCH_MAX_LENGTH, { error: INVALID_SEARCH_MESSAGE })
  .transform(classifyTicketSearch)

export type TicketSearchQueryInput = z.input<typeof ticketSearchQuerySchema>

export const parseTicketSearchQuery = (
  raw: unknown,
): TicketSearchQuery | null => {
  const parsed = ticketSearchQuerySchema.safeParse(raw)
  return parsed.success ? parsed.data : null
}
