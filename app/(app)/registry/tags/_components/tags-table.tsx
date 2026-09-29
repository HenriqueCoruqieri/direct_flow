"use client"

import { createColumnHelper } from "@tanstack/react-table"
import { useMemo } from "react"

import DataTable from "@/app/_components/data-table/data-table"
import type { DataTableFeatures } from "@/app/_components/data-table/data-table-features"
import type { DataTableFilter } from "@/app/_components/data-table/data-table-filters"
import { formatDate } from "@/app/_lib/date"
import type { DepartmentOption } from "@/app/_lib/types/department"
import type { TagListItem } from "@/app/_lib/types/tag"

import ActiveStatusBadge from "../../_components/active-status-badge"
import activeStatusFilter from "../../_components/active-status-filter"
import DepartmentName from "../../_components/department-name"
import departmentOptionLabel from "../../_components/department-option-label"
import TagRowActions from "./tag-row-actions"

const columnHelper = createColumnHelper<DataTableFeatures, TagListItem>()

const nameColumn = columnHelper.accessor("name", {
  header: "Nome",
  filterFn: "includesString",
  cell: ({ getValue }) => <span className="font-medium">{getValue()}</span>,
})

const departmentColumn = columnHelper.accessor("departmentId", {
  header: "Setor",
  filterFn: "inValues",
  cell: ({ row }) => (
    <DepartmentName
      name={row.original.departmentName}
      isActive={row.original.departmentIsActive}
    />
  ),
})

const statusColumn = columnHelper.accessor("isActive", {
  header: "Status",
  filterFn: "inValues",
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

const DEPARTMENT_ADMIN_FILTERS = [activeStatusFilter]

const TagsTable = ({ tags, isDirector, departmentOptions }: TagsTableProps) => {
  const filters = useMemo<DataTableFilter[]>(
    () =>
      isDirector
        ? [
            {
              columnId: "departmentId",
              label: "Setor",
              options: departmentOptions.map((option) => ({
                value: String(option.id),
                label: departmentOptionLabel(option),
              })),
            },
            activeStatusFilter,
          ]
        : DEPARTMENT_ADMIN_FILTERS,
    [isDirector, departmentOptions],
  )

  return (
    <DataTable
      columns={isDirector ? directorColumns : departmentAdminColumns}
      data={tags}
      emptyMessage="Nenhuma tag cadastrada."
      search={SEARCH}
      filters={filters}
    />
  )
}

export default TagsTable
