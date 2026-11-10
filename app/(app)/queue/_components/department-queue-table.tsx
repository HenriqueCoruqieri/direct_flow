"use client"

import { createColumnHelper } from "@tanstack/react-table"
import { useCallback, useMemo } from "react"

import DataTable from "@/app/_components/data-table/data-table"
import type { DataTableFeatures } from "@/app/_components/data-table/data-table-features"
import type { DataTableFilter } from "@/app/_components/data-table/data-table-filters"
import {
  DEPARTMENT_QUEUE_TAB_RULES,
  NO_ASSIGNEE_LABEL,
  queueRowActionsFor,
} from "@/app/_lib/domain/department-queue"
import type {
  DepartmentQueueListItem,
  DepartmentQueueLocation,
  DepartmentQueueTab,
} from "@/app/_lib/types/department-queue"
import type { TicketActorFacts } from "@/app/_lib/types/ticket"
import { queueTicketDetailHref } from "@/app/_lib/validation/ticket-detail-origin"

import createTicketListColumns, {
  createTicketCompanyColumn,
  createTicketPriorityColumn,
  createTicketSlaColumn,
} from "../../_components/ticket-list-columns"
import {
  idNameFiltersFor,
  NONE_FILTER_VALUE,
  TICKET_TYPE_FILTER,
  ticketStatusFiltersFor,
  ticketTagFiltersFor,
} from "../../_components/ticket-list-filters"
import QueueRowActions from "./queue-row-actions"

const columnHelper = createColumnHelper<
  DataTableFeatures,
  DepartmentQueueListItem
>()

const ASSIGNEE_COLUMN_ID = "assignee"
const HIDDEN_COLUMNS = [ASSIGNEE_COLUMN_ID, TICKET_TYPE_FILTER.columnId]

const buildColumns = (
  viewer: TicketActorFacts,
  location: DepartmentQueueLocation,
  now: Date,
) => {
  const shared = createTicketListColumns<DepartmentQueueListItem>((ticketId) =>
    queueTicketDetailHref(location, ticketId),
  )

  return columnHelper.columns([
    shared.number,
    shared.title,
    createTicketCompanyColumn<DepartmentQueueListItem>(),
    shared.type,
    shared.tag,
    columnHelper.accessor(
      (row) =>
        row.assignedTo === null ? NONE_FILTER_VALUE : String(row.assignedTo),
      {
        id: ASSIGNEE_COLUMN_ID,
        filterFn: "inValues",
      },
    ),
    shared.status,
    shared.createdAt,
    createTicketPriorityColumn<DepartmentQueueListItem>(),
    createTicketSlaColumn<DepartmentQueueListItem>(now),
    columnHelper.display({
      id: "actions",
      header: () => <span className="sr-only">Ações</span>,
      cell: ({ row }) => (
        <QueueRowActions
          ticket={row.original}
          actions={queueRowActionsFor(viewer, row.original)}
        />
      ),
    }),
  ])
}

const assigneeFiltersFor = (
  tickets: readonly DepartmentQueueListItem[],
): DataTableFilter[] =>
  idNameFiltersFor(
    tickets,
    (ticket) => ({ id: ticket.assignedTo, name: ticket.assigneeName }),
    {
      columnId: ASSIGNEE_COLUMN_ID,
      label: "Destinatário",
      noneLabel: NO_ASSIGNEE_LABEL,
    },
  )

interface DepartmentQueueTableProps {
  tab: DepartmentQueueTab
  tickets: DepartmentQueueListItem[]
  viewer: TicketActorFacts
  toolbarFooter: React.ReactNode
  location: DepartmentQueueLocation
  now: Date
}

const DepartmentQueueTable = ({
  tab,
  tickets,
  viewer,
  toolbarFooter,
  location,
  now,
}: DepartmentQueueTableProps) => {
  const columns = useMemo(
    () => buildColumns(viewer, location, now),
    [viewer, location, now],
  )

  const rowHref = useCallback(
    (row: DepartmentQueueListItem) => queueTicketDetailHref(location, row.id),
    [location],
  )

  const filters = useMemo<DataTableFilter[]>(
    () => [
      ...ticketStatusFiltersFor(DEPARTMENT_QUEUE_TAB_RULES[tab].statuses),
      TICKET_TYPE_FILTER,
      ...ticketTagFiltersFor(tickets),
      ...assigneeFiltersFor(tickets),
    ],
    [tab, tickets],
  )

  return (
    <DataTable
      columns={columns}
      data={tickets}
      emptyMessage={DEPARTMENT_QUEUE_TAB_RULES[tab].emptyTitle}
      filters={filters}
      rowHref={rowHref}
      toolbarFooter={toolbarFooter}
      hiddenColumns={HIDDEN_COLUMNS}
    />
  )
}

export default DepartmentQueueTable
