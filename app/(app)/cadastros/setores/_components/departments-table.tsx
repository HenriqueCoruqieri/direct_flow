"use client"

import { createColumnHelper } from "@tanstack/react-table"

import DataTable from "@/app/_components/data-table/data-table"
import type { DataTableFeatures } from "@/app/_components/data-table/data-table-features"
import { Badge } from "@/app/_components/ui/badge"
import { formatDate } from "@/app/_lib/date"
import type { DepartmentListItem } from "@/app/_lib/types/department"

import ActiveStatusBadge from "../../_components/active-status-badge"
import DepartmentRowActions from "./department-row-actions"

const columnHelper = createColumnHelper<DataTableFeatures, DepartmentListItem>()

const columns = columnHelper.columns([
  columnHelper.accessor("name", {
    header: "Nome",
    filterFn: "includesString",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <span className="font-medium">{row.original.name}</span>
        {row.original.isBoard ? (
          <Badge variant="secondary">Diretoria</Badge>
        ) : null}
      </div>
    ),
  }),
  columnHelper.accessor("isActive", {
    header: "Status",
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

interface DepartmentsTableProps {
  departments: DepartmentListItem[]
}

const DepartmentsTable = ({ departments }: DepartmentsTableProps) => (
  <DataTable
    columns={columns}
    data={departments}
    emptyMessage="Nenhum setor cadastrado."
    search={{
      columnId: "name",
      label: "Buscar setor por nome",
      placeholder: "Buscar por nome",
    }}
  />
)

export default DepartmentsTable
