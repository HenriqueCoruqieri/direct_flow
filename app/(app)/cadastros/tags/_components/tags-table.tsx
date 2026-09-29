"use client"

import { createColumnHelper } from "@tanstack/react-table"

import DataTable from "@/app/_components/data-table/data-table"
import type { DataTableFeatures } from "@/app/_components/data-table/data-table-features"
import { Badge } from "@/app/_components/ui/badge"
import { formatDate } from "@/app/_lib/date"
import type { DepartmentOption } from "@/app/_lib/types/department"
import type { TagListItem } from "@/app/_lib/types/tag"

import ActiveStatusBadge from "../../_components/active-status-badge"
import TagRowActions from "./tag-row-actions"

const columnHelper = createColumnHelper<DataTableFeatures, TagListItem>()

const nameColumn = columnHelper.accessor("name", {
  header: "Nome",
  filterFn: "includesString",
  cell: ({ getValue }) => <span className="font-medium">{getValue()}</span>,
})

const departmentColumn = columnHelper.accessor("departmentId", {
  header: "Setor",
  filterFn: "equalsString",
  cell: ({ row }) => (
    <div className="flex items-center gap-2">
      <span>{row.original.departmentName}</span>
      {row.original.departmentIsActive ? null : (
        <Badge variant="outline" className="text-muted-foreground">
          Setor inativo
        </Badge>
      )}
    </div>
  ),
})

const statusColumn = columnHelper.accessor("isActive", {
  header: "Status",
  cell: ({ getValue }) => <ActiveStatusBadge isActive={getValue()} />,
})

const ticketCountColumn = columnHelper.accessor("ticketCount", {
  header: "Chamados",
  cell: ({ getValue }) => <span className="tabular-nums">{getValue()}</span>,
})

const createdAtColumn = columnHelper.accessor("createdAt", {
  header: "Criado em",
  cell: ({ getValue }) => (
    <span className="text-muted-foreground tabular-nums">
      {formatDate(getValue())}
    </span>
  ),
})

const actionsColumn = columnHelper.display({
  id: "actions",
  header: () => <span className="sr-only">Ações</span>,
  cell: ({ row }) => <TagRowActions tag={row.original} />,
})

const directorColumns = columnHelper.columns([
  nameColumn,
  departmentColumn,
  statusColumn,
  ticketCountColumn,
  createdAtColumn,
  actionsColumn,
])

const departmentAdminColumns = columnHelper.columns([
  nameColumn,
  statusColumn,
  ticketCountColumn,
  createdAtColumn,
  actionsColumn,
])

const SEARCH = {
  columnId: "name",
  label: "Buscar tag por nome",
  placeholder: "Buscar por nome",
}

interface TagsTableProps {
  tags: TagListItem[]
  isDirector: boolean
  departmentOptions: DepartmentOption[]
}

const TagsTable = ({ tags, isDirector, departmentOptions }: TagsTableProps) => (
  <DataTable
    columns={isDirector ? directorColumns : departmentAdminColumns}
    data={tags}
    emptyMessage="Nenhuma tag cadastrada."
    search={SEARCH}
    selectFilters={
      isDirector
        ? [
            {
              columnId: "departmentId",
              label: "Filtrar por setor",
              allLabel: "Todos os setores",
              options: departmentOptions.map((option) => ({
                value: String(option.id),
                label: option.isActive
                  ? option.name
                  : `${option.name} (inativo)`,
              })),
            },
          ]
        : undefined
    }
  />
)

export default TagsTable
