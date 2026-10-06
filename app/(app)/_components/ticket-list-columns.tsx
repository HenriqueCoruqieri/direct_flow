import { createColumnHelper } from "@tanstack/react-table"
import Link from "next/link"

import type { DataTableFeatures } from "@/app/_components/data-table/data-table-features"
import { formatDate } from "@/app/_lib/date"
import { EMPTY_VALUE_LABEL } from "@/app/_lib/domain/labels"
import {
  formatTicketNumber,
  TICKET_TYPE_LABELS,
  ticketDetailPath,
} from "@/app/_lib/domain/ticket"

import { NONE_FILTER_VALUE } from "./ticket-list-filters"
import type { TicketListRow } from "./ticket-list-row"
import TicketStatusBadge from "./ticket-status-badge"

const createTicketListColumns = <TRow extends TicketListRow>() => {
  const columnHelper = createColumnHelper<DataTableFeatures, TRow>()

  return {
    number: columnHelper.accessor((row) => row.id, {
      id: "id",
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
    search: columnHelper.accessor(
      (row) => `${formatTicketNumber(row.id)} ${row.title}`,
      {
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
      },
    ),
    type: columnHelper.accessor((row) => row.type, {
      id: "type",
      header: "Tipo",
      filterFn: "inValues",
      cell: ({ getValue }) => TICKET_TYPE_LABELS[getValue()],
    }),
    tag: columnHelper.accessor(
      (row) => (row.tagId === null ? NONE_FILTER_VALUE : String(row.tagId)),
      {
        id: "tag",
        header: "Tag",
        filterFn: "inValues",
        cell: ({ row }) => row.original.tagName ?? EMPTY_VALUE_LABEL,
      },
    ),
    status: columnHelper.accessor((row) => row.status, {
      id: "status",
      header: "Status",
      filterFn: "inValues",
      cell: ({ getValue }) => <TicketStatusBadge status={getValue()} />,
    }),
    createdAt: columnHelper.accessor((row) => row.createdAt, {
      id: "createdAt",
      header: "Aberto em",
      cell: ({ getValue }) => (
        <span className="text-muted-foreground tabular-nums">
          {formatDate(getValue())}
        </span>
      ),
    }),
  }
}

export default createTicketListColumns
