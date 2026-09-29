"use client"

import { createColumnHelper } from "@tanstack/react-table"

import DataTable from "@/app/_components/data-table/data-table"
import type { DataTableFeatures } from "@/app/_components/data-table/data-table-features"
import { Badge } from "@/app/_components/ui/badge"
import { formatDate } from "@/app/_lib/date"
import { departmentBadgeFor } from "@/app/_lib/domain/department"
import type { DepartmentListItem } from "@/app/_lib/types/department"

import ActiveStatusBadge from "../../_components/active-status-badge"
import activeStatusFilter from "../../_components/active-status-filter"
import DepartmentRowActions from "./department-row-actions"

const columnHelper = createColumnHelper<DataTableFeatures, DepartmentListItem>()

const columns = columnHelper.columns([
  columnHelper.accessor("name", {
    header: "Nome",
    filterFn: "includesString",
    cell: ({ row }) => {
      const badge = departmentBadgeFor(row.original)
      return (
        <div className="flex items-center gap-2">
          <span className="font-medium">{row.original.name}</span>
          {badge ? <Badge variant="secondary">{badge}</Badge> : null}
        </div>
      )
    },
  }),
  columnHelper.accessor("isActive", {
    header: "Status",
    filterFn: "inValues",
    cell: ({ getValue }) => <ActiveStatusBadge isActive={getValue()} />,
  }),
  columnHelper.accessor("activeUsers", {
    header: "Pessoas ativas",
    cell: ({ getValue }) => <span className="tabular-nums">{getValue()}</span>,
  }),
  columnHelper.accessor("openTickets", {
    header: "Chamados em aberto",
    cell: ({ getValue }) => <span className="tabular-nums">{getValue()}</span>,
  }),
  columnHelper.accessor("createdAt", {
    header: "Criado em",
    cell: ({ getValue }) => (
      <span className="text-muted-foreground tabular-nums">
        {formatDate(getValue())}
      </span>
    ),
  }),
  columnHelper.display({
    id: "actions",
    header: () => <span className="sr-only">Ações</span>,
    cell: ({ row }) => <DepartmentRowActions department={row.original} />,
  }),
])

const SEARCH = {
  columnId: "name",
  label: "Buscar setor por nome",
  placeholder: "Buscar por nome",
}

const FILTERS = [activeStatusFilter]

interface DepartmentsTableProps {
  departments: DepartmentListItem[]
}

const DepartmentsTable = ({ departments }: DepartmentsTableProps) => (
  <DataTable
    columns={columns}
    data={departments}
    emptyMessage="Nenhum setor cadastrado."
    search={SEARCH}
    filters={FILTERS}
  />
)

export default DepartmentsTable
