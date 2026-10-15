"use client"

import { createColumnHelper } from "@tanstack/react-table"
import { useCallback, useMemo } from "react"

import DataTable from "@/app/_components/data-table/data-table"
import type { DataTableFeatures } from "@/app/_components/data-table/data-table-features"
import type { DataTableFilter } from "@/app/_components/data-table/data-table-filters"
import { formatDate } from "@/app/_lib/date"
import {
  APPROVALS_EMPTY,
  APPROVALS_FROM_DEPARTMENT_LABEL,
  APPROVALS_SENT_AT_LABEL,
} from "@/app/_lib/domain/approvals"
import { EMPTY_VALUE_LABEL } from "@/app/_lib/domain/labels"
import type { ApprovalListItem } from "@/app/_lib/types/approvals"
import type { PeriodFilterSelection } from "@/app/_lib/types/period"
import { approvalsTicketDetailHref } from "@/app/_lib/validation/ticket-detail-origin"

import createTicketListColumns from "../../_components/ticket-list-columns"
import {
  idNameFiltersFor,
  TICKET_TYPE_FILTER,
  ticketTagFiltersFor,
} from "../../_components/ticket-list-filters"

const columnHelper = createColumnHelper<DataTableFeatures, ApprovalListItem>()

const FROM_DEPARTMENT_COLUMN_ID = "fromDepartment"

const buildColumns = (period: PeriodFilterSelection) => {
  const shared = createTicketListColumns<ApprovalListItem>((ticketId) =>
    approvalsTicketDetailHref(period, ticketId),
  )

  return columnHelper.columns([
    shared.number,
    shared.title,
    shared.type,
    shared.tag,
    columnHelper.accessor((row) => String(row.fromDepartmentId), {
      id: FROM_DEPARTMENT_COLUMN_ID,
      header: APPROVALS_FROM_DEPARTMENT_LABEL,
      filterFn: "inValues",
      cell: ({ row }) => row.original.fromDepartmentName,
    }),
    shared.status,
    shared.createdAt,
    columnHelper.accessor((row) => row.sentAt, {
      id: "sentAt",
      header: APPROVALS_SENT_AT_LABEL,
      cell: ({ getValue }) => (
        <span className="text-muted-foreground tabular-nums">
          {formatDate(getValue())}
        </span>
      ),
    }),
  ])
}

const fromDepartmentFiltersFor = (
  tickets: readonly ApprovalListItem[],
): DataTableFilter[] =>
  idNameFiltersFor(
    tickets,
    (ticket) => ({
      id: ticket.fromDepartmentId,
      name: ticket.fromDepartmentName,
    }),
    {
      columnId: FROM_DEPARTMENT_COLUMN_ID,
      label: APPROVALS_FROM_DEPARTMENT_LABEL,
      noneLabel: EMPTY_VALUE_LABEL,
    },
  )

interface ApprovalsTableProps {
  tickets: ApprovalListItem[]
  period: PeriodFilterSelection
  toolbarFooter: React.ReactNode
}

const ApprovalsTable = ({
  tickets,
  period,
  toolbarFooter,
}: ApprovalsTableProps) => {
  const columns = useMemo(() => buildColumns(period), [period])

  const rowHref = useCallback(
    (row: ApprovalListItem) => approvalsTicketDetailHref(period, row.id),
    [period],
  )

  const filters = useMemo<DataTableFilter[]>(
    () => [
      TICKET_TYPE_FILTER,
      ...ticketTagFiltersFor(tickets),
      ...fromDepartmentFiltersFor(tickets),
    ],
    [tickets],
  )

  return (
    <DataTable
      columns={columns}
      data={tickets}
      emptyMessage={APPROVALS_EMPTY.title}
      filters={filters}
      rowHref={rowHref}
      toolbarFooter={toolbarFooter}
    />
  )
}

export default ApprovalsTable
