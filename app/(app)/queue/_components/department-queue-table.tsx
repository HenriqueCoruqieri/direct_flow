"use client"

import { createColumnHelper } from "@tanstack/react-table"
import { useCallback, useMemo, useState } from "react"

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
import type { AssigneeOption, TicketActorFacts } from "@/app/_lib/types/ticket"
import { queueTicketDetailHref } from "@/app/_lib/validation/ticket-detail-origin"

import createTicketListColumns from "../../_components/ticket-list-columns"
import {
  idNameFiltersFor,
  NONE_FILTER_VALUE,
  TICKET_TYPE_FILTER,
  ticketStatusFiltersFor,
  ticketTagFiltersFor,
} from "../../_components/ticket-list-filters"
import QueueRowActions from "./queue-row-actions"
import SendTicketDialog from "./send-ticket-dialog"

const columnHelper = createColumnHelper<
  DataTableFeatures,
  DepartmentQueueListItem
>()

const ASSIGNEE_COLUMN_ID = "assignee"
const HIDDEN_COLUMNS = [ASSIGNEE_COLUMN_ID] as const

const buildColumns = (
  viewer: TicketActorFacts,
  location: DepartmentQueueLocation,
  onSend: (ticket: DepartmentQueueListItem) => void,
) => {
  const shared = createTicketListColumns<DepartmentQueueListItem>((ticketId) =>
    queueTicketDetailHref(location, ticketId),
  )

  return columnHelper.columns([
    shared.number,
    shared.title,
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
    columnHelper.display({
      id: "actions",
      header: () => <span className="sr-only">Ações</span>,
      cell: ({ row }) => (
        <QueueRowActions
          ticket={row.original}
          actions={queueRowActionsFor(viewer, row.original)}
          onSend={onSend}
        />
      ),
    }),
  ])
}

const sendDialogKey = (ticket: DepartmentQueueListItem): string =>
  `${ticket.id}:${ticket.assignedTo ?? NONE_FILTER_VALUE}`

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
  assignees: AssigneeOption[]
  toolbarFooter: React.ReactNode
  location: DepartmentQueueLocation
}

const DepartmentQueueTable = ({
  tab,
  tickets,
  viewer,
  assignees,
  toolbarFooter,
  location,
}: DepartmentQueueTableProps) => {
  const [sendTarget, setSendTarget] = useState<DepartmentQueueListItem | null>(
    null,
  )
  const [isSendOpen, setIsSendOpen] = useState(false)

  const openSendDialog = useCallback((ticket: DepartmentQueueListItem) => {
    setSendTarget(ticket)
    setIsSendOpen(true)
  }, [])

  const columns = useMemo(
    () => buildColumns(viewer, location, openSendDialog),
    [viewer, location, openSendDialog],
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
    <>
      <DataTable
        columns={columns}
        data={tickets}
        emptyMessage={DEPARTMENT_QUEUE_TAB_RULES[tab].emptyTitle}
        filters={filters}
        rowHref={rowHref}
        toolbarFooter={toolbarFooter}
        hiddenColumns={HIDDEN_COLUMNS}
      />
      {sendTarget !== null ? (
        <SendTicketDialog
          key={sendDialogKey(sendTarget)}
          ticket={sendTarget}
          assignees={assignees}
          open={isSendOpen}
          onOpenChange={setIsSendOpen}
        />
      ) : null}
    </>
  )
}

export default DepartmentQueueTable
