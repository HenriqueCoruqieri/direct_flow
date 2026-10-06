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
import { EMPTY_VALUE_LABEL } from "@/app/_lib/domain/labels"
import type {
  DepartmentQueueListItem,
  DepartmentQueueTab,
} from "@/app/_lib/types/department-queue"
import type { AssigneeOption, TicketActorFacts } from "@/app/_lib/types/ticket"

import createTicketListColumns from "../../_components/ticket-list-columns"
import {
  idNameFiltersFor,
  NONE_FILTER_VALUE,
  TICKET_LIST_SEARCH,
  TICKET_TYPE_FILTER,
  ticketRowHref,
  ticketStatusFiltersFor,
  ticketTagFiltersFor,
} from "../../_components/ticket-list-filters"
import QueueRowActions from "./queue-row-actions"
import SendTicketDialog from "./send-ticket-dialog"

const columnHelper = createColumnHelper<
  DataTableFeatures,
  DepartmentQueueListItem
>()
const shared = createTicketListColumns<DepartmentQueueListItem>()

const buildColumns = (
  viewer: TicketActorFacts,
  onSend: (ticket: DepartmentQueueListItem) => void,
) =>
  columnHelper.columns([
    shared.number,
    shared.search,
    shared.type,
    shared.tag,
    columnHelper.accessor("creatorName", {
      header: "Criador",
    }),
    columnHelper.accessor(
      (row) =>
        row.assignedTo === null ? NONE_FILTER_VALUE : String(row.assignedTo),
      {
        id: "assignee",
        header: "Destinatário",
        filterFn: "inValues",
        cell: ({ row }) => row.original.assigneeName ?? EMPTY_VALUE_LABEL,
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

const sendDialogKey = (ticket: DepartmentQueueListItem): string =>
  `${ticket.id}:${ticket.assignedTo ?? NONE_FILTER_VALUE}`

const assigneeFiltersFor = (
  tickets: readonly DepartmentQueueListItem[],
): DataTableFilter[] =>
  idNameFiltersFor(
    tickets,
    (ticket) => ({ id: ticket.assignedTo, name: ticket.assigneeName }),
    {
      columnId: "assignee",
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
}

const DepartmentQueueTable = ({
  tab,
  tickets,
  viewer,
  assignees,
  toolbarFooter,
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
    () => buildColumns(viewer, openSendDialog),
    [viewer, openSendDialog],
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
        search={TICKET_LIST_SEARCH}
        filters={filters}
        rowHref={ticketRowHref}
        toolbarFooter={toolbarFooter}
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
