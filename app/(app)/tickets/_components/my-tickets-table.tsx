"use client"

import { createColumnHelper } from "@tanstack/react-table"
import Link from "next/link"
import { useMemo } from "react"

import DataTable from "@/app/_components/data-table/data-table"
import type { DataTableFeatures } from "@/app/_components/data-table/data-table-features"
import type {
  DataTableFilter,
  DataTableFilterOption,
} from "@/app/_components/data-table/data-table-filters"
import { formatDate } from "@/app/_lib/date"
import { EMPTY_VALUE_LABEL } from "@/app/_lib/domain/labels"
import { MY_TICKETS_TAB_RULES } from "@/app/_lib/domain/my-tickets"
import {
  formatTicketNumber,
  TICKET_STATUS_LABELS,
  TICKET_TYPE_LABELS,
  TICKET_TYPES,
  ticketDetailPath,
} from "@/app/_lib/domain/ticket"
import type {
  MyTicketListItem,
  MyTicketsTab,
} from "@/app/_lib/types/my-tickets"

import TicketStatusBadge from "../../_components/ticket-status-badge"

const NO_TAG_VALUE = "none"

const columnHelper = createColumnHelper<DataTableFeatures, MyTicketListItem>()

const columns = columnHelper.columns([
  columnHelper.accessor("id", {
    header: () => (
      <>
        <span aria-hidden="true">#</span>
        <span className="sr-only">Número</span>
      </>
    ),
    cell: ({ getValue }) => (
      <Link
        href={ticketDetailPath(getValue())}
        className="rounded-sm font-semibold text-primary tabular-nums underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {formatTicketNumber(getValue())}
      </Link>
    ),
  }),
  columnHelper.accessor((row) => `${formatTicketNumber(row.id)} ${row.title}`, {
    id: "search",
    header: "Título",
    filterFn: "includesString",
    cell: ({ row }) => (
      <span
        title={row.original.title}
        className="block max-w-96 truncate font-medium"
      >
        {row.original.title}
      </span>
    ),
  }),
  columnHelper.accessor("type", {
    header: "Tipo",
    filterFn: "inValues",
    cell: ({ getValue }) => TICKET_TYPE_LABELS[getValue()],
  }),
  columnHelper.accessor(
    (row) => (row.tagId === null ? NO_TAG_VALUE : String(row.tagId)),
    {
      id: "tag",
      header: "Tag",
      filterFn: "inValues",
      cell: ({ row }) => row.original.tagName ?? EMPTY_VALUE_LABEL,
    },
  ),
  columnHelper.accessor("currentDepartmentName", {
    header: "Setor atual",
  }),
  columnHelper.accessor("status", {
    header: "Status",
    filterFn: "inValues",
    cell: ({ getValue }) => <TicketStatusBadge status={getValue()} />,
  }),
  columnHelper.accessor("createdAt", {
    header: "Aberto em",
    cell: ({ getValue }) => (
      <span className="text-muted-foreground tabular-nums">
        {formatDate(getValue())}
      </span>
    ),
  }),
])

const SEARCH = {
  columnId: "search",
  label: "Buscar chamado por número ou título",
  placeholder: "Buscar por # ou título",
}

const TYPE_FILTER: DataTableFilter = {
  columnId: "type",
  label: "Tipo",
  options: TICKET_TYPES.map((type) => ({
    value: type,
    label: TICKET_TYPE_LABELS[type],
  })),
}

const rowHref = (row: MyTicketListItem): string => ticketDetailPath(row.id)

const statusFiltersFor = (tab: MyTicketsTab): DataTableFilter[] => {
  const { statuses } = MY_TICKETS_TAB_RULES[tab]
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

const tagFiltersFor = (
  tickets: readonly MyTicketListItem[],
): DataTableFilter[] => {
  const tagNames = new Map<number, string>()
  for (const ticket of tickets) {
    if (ticket.tagId !== null) {
      tagNames.set(ticket.tagId, ticket.tagName ?? EMPTY_VALUE_LABEL)
    }
  }

  const options: DataTableFilterOption[] = [...tagNames]
    .map(([tagId, name]) => ({ value: String(tagId), label: name }))
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"))

  if (tickets.some((ticket) => ticket.tagId === null)) {
    options.push({ value: NO_TAG_VALUE, label: "Sem tag" })
  }

  return options.length > 0 ? [{ columnId: "tag", label: "Tag", options }] : []
}

interface MyTicketsTableProps {
  tab: MyTicketsTab
  tickets: MyTicketListItem[]
  periodFilter: React.ReactNode
}

const MyTicketsTable = ({
  tab,
  tickets,
  periodFilter,
}: MyTicketsTableProps) => {
  const filters = useMemo<DataTableFilter[]>(
    () => [...statusFiltersFor(tab), TYPE_FILTER, ...tagFiltersFor(tickets)],
    [tab, tickets],
  )

  return (
    <DataTable
      columns={columns}
      data={tickets}
      emptyMessage={MY_TICKETS_TAB_RULES[tab].emptyTitle}
      search={SEARCH}
      filters={filters}
      rowHref={rowHref}
      toolbarFooter={periodFilter}
    />
  )
}

export default MyTicketsTable
