import { APPROVALS_LABEL } from "@/app/_lib/domain/approvals"
import { DEPARTMENT_QUEUE_LABEL } from "@/app/_lib/domain/department-queue"
import { ticketDetailPath } from "@/app/_lib/domain/ticket"
import {
  MY_TICKETS_BACK_LINK,
  MY_TICKETS_ORIGIN,
  TICKET_DETAIL_FROM_APPROVALS,
  TICKET_DETAIL_FROM_PARAM,
  TICKET_DETAIL_FROM_QUEUE,
} from "@/app/_lib/domain/ticket-detail-origin"
import type { DepartmentQueueLocation } from "@/app/_lib/types/department-queue"
import type { DateKey, PeriodFilterSelection } from "@/app/_lib/types/period"
import type {
  TicketDetailBackLink,
  TicketDetailOrigin,
} from "@/app/_lib/types/ticket-detail-origin"
import {
  approvalsHref,
  parseApprovalsPeriod,
} from "@/app/_lib/validation/approvals"
import {
  departmentQueueHref,
  departmentQueueKeepParams,
  parseDepartmentQueueParams,
} from "@/app/_lib/validation/department-queue"
import { periodFilterHref } from "@/app/_lib/validation/period"
import {
  firstSearchParam,
  type RawSearchParams,
} from "@/app/_lib/validation/search-params"

export const parseTicketDetailOrigin = (
  raw: RawSearchParams,
  today: DateKey,
): TicketDetailOrigin => {
  const from = firstSearchParam(raw[TICKET_DETAIL_FROM_PARAM])
  if (from === TICKET_DETAIL_FROM_QUEUE) {
    return {
      source: TICKET_DETAIL_FROM_QUEUE,
      location: parseDepartmentQueueParams(raw, today),
    }
  }
  if (from === TICKET_DETAIL_FROM_APPROVALS) {
    return {
      source: TICKET_DETAIL_FROM_APPROVALS,
      period: parseApprovalsPeriod(raw, today),
    }
  }
  return MY_TICKETS_ORIGIN
}

export const queueTicketDetailHref = (
  { tab, period, departmentId }: DepartmentQueueLocation,
  ticketId: number,
): string =>
  periodFilterHref(
    ticketDetailPath(ticketId),
    {
      [TICKET_DETAIL_FROM_PARAM]: TICKET_DETAIL_FROM_QUEUE,
      ...departmentQueueKeepParams(tab, departmentId),
    },
    period,
  )

export const approvalsTicketDetailHref = (
  period: PeriodFilterSelection,
  ticketId: number,
): string =>
  periodFilterHref(
    ticketDetailPath(ticketId),
    { [TICKET_DETAIL_FROM_PARAM]: TICKET_DETAIL_FROM_APPROVALS },
    period,
  )

export const ticketDetailBackLinkFor = (
  origin: TicketDetailOrigin,
): TicketDetailBackLink => {
  switch (origin.source) {
    case TICKET_DETAIL_FROM_QUEUE:
      return {
        href: departmentQueueHref(origin.location),
        label: DEPARTMENT_QUEUE_LABEL,
      }
    case TICKET_DETAIL_FROM_APPROVALS:
      return { href: approvalsHref(origin.period), label: APPROVALS_LABEL }
    default:
      return MY_TICKETS_BACK_LINK
  }
}
