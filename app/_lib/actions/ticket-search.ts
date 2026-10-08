"use server"

import { getAccountFacts } from "@/app/_lib/auth/account-facts"
import { getSession } from "@/app/_lib/auth/session"
import { searchVisibleTickets } from "@/app/_lib/data/ticket-search"
import {
  TICKET_SEARCH_FAILURE,
  TICKET_SEARCH_LIMIT,
} from "@/app/_lib/domain/ticket-search"
import type { TicketViewerFacts } from "@/app/_lib/types/ticket"
import type {
  TicketSearchResponse,
  TicketSearchSuccess,
} from "@/app/_lib/types/ticket-search"
import { parseTicketSearchQuery } from "@/app/_lib/validation/ticket-search"

const EMPTY_SEARCH: TicketSearchSuccess = {
  ok: true,
  results: [],
}

export const searchTickets = async (
  input: string,
): Promise<TicketSearchResponse> => {
  const actor = await getSession()
  if (!actor) return TICKET_SEARCH_FAILURE

  const query = parseTicketSearchQuery(input)
  if (!query) return EMPTY_SEARCH

  try {
    const facts = await getAccountFacts()
    if (!facts) return TICKET_SEARCH_FAILURE

    const viewer: TicketViewerFacts = {
      userId: actor.id,
      departmentId: facts.departmentId,
      isBoard: facts.isBoard,
    }

    const results = await searchVisibleTickets(
      viewer,
      query,
      TICKET_SEARCH_LIMIT,
    )
    return { ok: true, results }
  } catch (error) {
    console.error("[searchTickets]", error)
    return TICKET_SEARCH_FAILURE
  }
}
