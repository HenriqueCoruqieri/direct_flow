import type {
  DataTableFilter,
  DataTableFilterOption,
} from "@/app/_components/data-table/data-table-filters"
import { EMPTY_VALUE_LABEL } from "@/app/_lib/domain/labels"
import {
  TICKET_STATUS_LABELS,
  TICKET_TYPE_LABELS,
  TICKET_TYPES,
  ticketDetailPath,
} from "@/app/_lib/domain/ticket"
import type { TicketStatus } from "@/app/_lib/types/ticket"

import type { TicketListRow } from "./ticket-list-row"

export const NONE_FILTER_VALUE = "none"

export const TICKET_LIST_SEARCH = {
  columnId: "search",
  label: "Buscar chamado por número ou título",
  placeholder: "Buscar por # ou título",
}

export const TICKET_TYPE_FILTER: DataTableFilter = {
  columnId: "type",
  label: "Tipo",
  options: TICKET_TYPES.map((type) => ({
    value: type,
    label: TICKET_TYPE_LABELS[type],
  })),
}

export const ticketRowHref = (row: TicketListRow): string =>
  ticketDetailPath(row.id)

export const ticketStatusFiltersFor = (
  statuses: readonly TicketStatus[],
): DataTableFilter[] => {
  if (statuses.length < 2) return []

  return [
    {
      columnId: "status",
      label: "Status",
      options: statuses.map((status) => ({
        value: status,
        label: TICKET_STATUS_LABELS[status],
      })),
    },
  ]
}

export interface IdNameEntry {
  id: number | null
  name: string | null
}

export interface IdNameFilterConfig {
  columnId: string
  label: string
  noneLabel: string
}

export const idNameFiltersFor = <TRow>(
  rows: readonly TRow[],
  entryOf: (row: TRow) => IdNameEntry,
  { columnId, label, noneLabel }: IdNameFilterConfig,
): DataTableFilter[] => {
  const names = new Map<number, string>()
  let hasNone = false
  for (const row of rows) {
    const { id, name } = entryOf(row)
    if (id === null) {
      hasNone = true
    } else {
      names.set(id, name ?? EMPTY_VALUE_LABEL)
    }
  }

  const options: DataTableFilterOption[] = [...names]
    .map(([id, name]) => ({ value: String(id), label: name }))
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"))

  if (hasNone) {
    options.push({ value: NONE_FILTER_VALUE, label: noneLabel })
  }

  return options.length > 0 ? [{ columnId, label, options }] : []
}

export const ticketTagFiltersFor = (
  tickets: readonly TicketListRow[],
): DataTableFilter[] =>
  idNameFiltersFor(
    tickets,
    (ticket) => ({ id: ticket.tagId, name: ticket.tagName }),
    { columnId: "tag", label: "Tag", noneLabel: "Sem tag" },
  )
