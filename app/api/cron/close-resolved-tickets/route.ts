import { timingSafeEqual } from "node:crypto"

import { revalidatePath } from "next/cache"

import { closeExpiredResolvedTickets } from "@/app/_lib/data/tickets"
import { DEPARTMENT_QUEUE_PATH } from "@/app/_lib/domain/department-queue"
import { MY_TICKETS_PATH } from "@/app/_lib/domain/my-tickets"
import { resolutionWindowCutoff } from "@/app/_lib/domain/ticket-closure"
import type { CloseExpiredResolvedTicketsOutcome } from "@/app/_lib/types/ticket-closure"

type CloseResolvedTicketsErrorCode = "unauthorized" | "internal"

interface CloseResolvedTicketsSuccess {
  ok: true
  closedCount: number
}

interface CloseResolvedTicketsFailure {
  ok: false
  error: CloseResolvedTicketsErrorCode
}

type CloseResolvedTicketsResponse =
  CloseResolvedTicketsSuccess | CloseResolvedTicketsFailure

const LOG_PREFIX = "[cron:close-resolved-tickets]"

const TICKET_DETAIL_ROUTE = "/(app)/tickets/[id]"

const UNAUTHORIZED: CloseResolvedTicketsFailure = {
  ok: false,
  error: "unauthorized",
}

const INTERNAL: CloseResolvedTicketsFailure = {
  ok: false,
  error: "internal",
}

const respond = (
  body: CloseResolvedTicketsResponse,
  status: number,
): Response => Response.json(body, { status })

const isAuthorized = (
  authorization: string | null,
  secret: string,
): boolean => {
  if (authorization === null) return false

  const expected = Buffer.from(`Bearer ${secret}`)
  const received = Buffer.from(authorization)

  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  )
}

export const GET = async (request: Request): Promise<Response> => {
  const secret = process.env.CRON_SECRET

  if (!secret) {
    console.error(`${LOG_PREFIX} CRON_SECRET não está definido.`)
    return respond(UNAUTHORIZED, 401)
  }

  if (!isAuthorized(request.headers.get("authorization"), secret)) {
    return respond(UNAUTHORIZED, 401)
  }

  const now = new Date()

  let outcome: CloseExpiredResolvedTicketsOutcome

  try {
    outcome = await closeExpiredResolvedTickets(
      resolutionWindowCutoff(now),
      now,
    )
  } catch (error) {
    console.error(LOG_PREFIX, error)
    return respond(INTERNAL, 500)
  }

  if (outcome.closedCount > 0) {
    revalidatePath(MY_TICKETS_PATH)
    revalidatePath(DEPARTMENT_QUEUE_PATH)
    revalidatePath(TICKET_DETAIL_ROUTE, "page")
  }

  return respond({ ok: true, closedCount: outcome.closedCount }, 200)
}
