import {
  isNonFinalTicketStatus,
  RESOLVED_TICKET_STATUS,
} from "@/app/_lib/domain/ticket"
import type { TicketStatus } from "@/app/_lib/types/ticket"

export const RESOLUTION_EDIT_WINDOW_DAYS = 7

export const DAY_MS = 24 * 60 * 60 * 1000

export const RESOLUTION_EDIT_WINDOW_MS = RESOLUTION_EDIT_WINDOW_DAYS * DAY_MS

export const AUTO_CLOSE_NOTE = `Encerrado automaticamente ${RESOLUTION_EDIT_WINDOW_DAYS} dias após a resolução.`

export const resolutionWindowEndsAt = (resolvedAt: Date): Date =>
  new Date(resolvedAt.getTime() + RESOLUTION_EDIT_WINDOW_MS)

export const resolutionWindowCutoff = (now: Date): Date =>
  new Date(now.getTime() - RESOLUTION_EDIT_WINDOW_MS)

export const isResolutionWindowOpen = (
  resolvedAt: Date | null,
  now: Date,
): boolean =>
  resolvedAt !== null &&
  now.getTime() < resolutionWindowEndsAt(resolvedAt).getTime()

export const isTicketLocked = (
  status: TicketStatus,
  resolvedAt: Date | null,
  now: Date,
): boolean =>
  !isNonFinalTicketStatus(status) ||
  (status === RESOLVED_TICKET_STATUS &&
    !isResolutionWindowOpen(resolvedAt, now))

export const resolutionEditableUntil = (
  status: TicketStatus,
  resolvedAt: Date | null,
  now: Date,
): Date | null =>
  status === RESOLVED_TICKET_STATUS &&
  resolvedAt !== null &&
  isResolutionWindowOpen(resolvedAt, now)
    ? resolutionWindowEndsAt(resolvedAt)
    : null
