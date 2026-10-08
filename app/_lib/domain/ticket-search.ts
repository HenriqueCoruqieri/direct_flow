import { TICKET_TITLE_MAX_LENGTH } from "@/app/_lib/domain/ticket"
import type { TicketSearchFailure } from "@/app/_lib/types/ticket-search"

export const TICKET_SEARCH_LIMIT = 8

export const TICKET_SEARCH_DEBOUNCE_MS = 250

export const TICKET_SEARCH_TEXT_MIN_LENGTH = 2

export const TICKET_SEARCH_MAX_LENGTH = TICKET_TITLE_MAX_LENGTH

export const TICKET_SEARCH_LABEL = "Buscar por n° ou título do chamado"

export const TICKET_SEARCH_PLACEHOLDER = TICKET_SEARCH_LABEL

export const TICKET_SEARCH_RESULTS_LABEL = "Chamados encontrados"

export const TICKET_SEARCH_LOADING_MESSAGE = "Buscando…"

export const TICKET_SEARCH_EMPTY_MESSAGE = "Nenhum chamado encontrado"

export const TICKET_SEARCH_FAILURE_MESSAGE =
  "Não foi possível buscar agora. Tente novamente."

export const TICKET_SEARCH_FAILURE: TicketSearchFailure = {
  ok: false,
  message: TICKET_SEARCH_FAILURE_MESSAGE,
}
