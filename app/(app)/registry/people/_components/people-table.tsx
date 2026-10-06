"use client"

import {
  type ColumnFiltersState,
  createColumnHelper,
} from "@tanstack/react-table"
import { useMemo } from "react"

import DataTable from "@/app/_components/data-table/data-table"
import type { DataTableFeatures } from "@/app/_components/data-table/data-table-features"
import type { DataTableFilter } from "@/app/_components/data-table/data-table-filters"
import { Badge } from "@/app/_components/ui/badge"
import { formatDateTime } from "@/app/_lib/date"
import { departmentBadgeFor } from "@/app/_lib/domain/department"
import { canManagePerson, NEVER_ACCESSED_LABEL } from "@/app/_lib/domain/person"
import { isDirectorAccess } from "@/app/_lib/domain/registry"
import { getInitials, ROLE_LABELS, ROLES } from "@/app/_lib/domain/user"
import type { DepartmentOption } from "@/app/_lib/types/department"
import type { PeopleFilters, PersonListItem } from "@/app/_lib/types/person"
import type { GrantedRegistryAccess } from "@/app/_lib/types/registry"

import UserAvatar from "../../../_components/user-avatar"
import ActiveStatusBadge from "../../_components/active-status-badge"
import activeStatusFilter from "../../_components/active-status-filter"
import DepartmentName from "../../_components/department-name"
import departmentOptionLabel from "../../_components/department-option-label"
import type { PersonRow } from "./person-row"
import PersonRowActions from "./person-row-actions"

const columnHelper = createColumnHelper<DataTableFeatures, PersonRow>()

const departmentBadgeOf = (person: PersonRow): string | null =>
  departmentBadgeFor({
    isBoard: person.departmentIsBoard,
    isUnassigned: person.departmentIsUnassigned,
  })

const renderName = (person: PersonRow, withDepartmentBadge: boolean) => {
  const badge = withDepartmentBadge ? departmentBadgeOf(person) : null

  return (
    <div className="flex items-center gap-3">
      <UserAvatar initials={getInitials(person.name)} image={person.image} />
      <span className="font-medium">{person.name}</span>
      {badge ? <Badge variant="secondary">{badge}</Badge> : null}
    </div>
  )
}

const nameColumnFor = (withDepartmentBadge: boolean) =>
  columnHelper.accessor((person) => `${person.name}\n${person.email}`, {
    id: "name",
    header: "Nome",
    filterFn: "includesString",
    cell: ({ row }) => renderName(row.original, withDepartmentBadge),
  })

const emailColumn = columnHelper.accessor("email", {
  header: "E-mail",
  cell: ({ getValue }) => (
    <span className="text-muted-foreground">{getValue()}</span>
  ),
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

const roleColumn = columnHelper.accessor("role", {
  header: "Papel",
  filterFn: "inValues",
  cell: ({ getValue }) => ROLE_LABELS[getValue()],
})

const statusColumn = columnHelper.accessor("isActive", {
  header: "Status",
  filterFn: "inValues",
  cell: ({ getValue }) => <ActiveStatusBadge isActive={getValue()} />,
})

const lastAccessColumn = columnHelper.accessor("lastLoginAt", {
  header: "Último acesso",
  cell: ({ getValue }) => {
    const lastLoginAt = getValue()

    return (
      <span className="text-muted-foreground tabular-nums">
        {lastLoginAt ? formatDateTime(lastLoginAt) : NEVER_ACCESSED_LABEL}
      </span>
    )
  },
})

const actionsColumn = columnHelper.display({
  id: "actions",
  header: () => <span className="sr-only">Ações</span>,
  cell: ({ row }) =>
    canManagePerson(row.original.context.access, row.original) ? (
      <PersonRowActions person={row.original} />
    ) : null,
})

const directorColumns = columnHelper.columns([
  nameColumnFor(false),
  emailColumn,
  departmentColumn,
  roleColumn,
  statusColumn,
  lastAccessColumn,
  actionsColumn,
])

const departmentAdminColumns = columnHelper.columns([
  nameColumnFor(true),
  emailColumn,
  roleColumn,
  statusColumn,
  lastAccessColumn,
  actionsColumn,
])

const SEARCH = {
  columnId: "name",
  label: "Buscar pessoa por nome ou e-mail",
  placeholder: "Buscar por nome ou e-mail",
}

const roleFilter: DataTableFilter = {
  columnId: "role",
  label: "Papel",
  options: ROLES.map((role) => ({ value: role, label: ROLE_LABELS[role] })),
}

const DEPARTMENT_ADMIN_FILTERS = [roleFilter, activeStatusFilter]

const columnFiltersFrom = (filters: PeopleFilters): ColumnFiltersState => [
  ...(filters.departmentId === null
    ? []
    : [{ id: "departmentId", value: [String(filters.departmentId)] }]),
  ...(filters.isActive === null
    ? []
    : [{ id: "isActive", value: [String(filters.isActive)] }]),
]

interface PeopleTableProps {
  people: PersonListItem[]
  access: GrantedRegistryAccess
  actorId: number
  departmentOptions: DepartmentOption[]
  initialFilters: PeopleFilters
}

const PeopleTable = ({
  people,
  access,
  actorId,
  departmentOptions,
  initialFilters,
}: PeopleTableProps) => {
  const isDirector = isDirectorAccess(access)

  const initialColumnFilters = useMemo(
    () => columnFiltersFrom(initialFilters),
    [initialFilters],
  )

  const rows = useMemo<PersonRow[]>(() => {
    const context = { access, actorId, departmentOptions }
    return people.map((person) => ({ ...person, context }))
  }, [people, access, actorId, departmentOptions])

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
            roleFilter,
            activeStatusFilter,
          ]
        : DEPARTMENT_ADMIN_FILTERS,
    [isDirector, departmentOptions],
  )

  return (
    <DataTable
      columns={isDirector ? directorColumns : departmentAdminColumns}
      data={rows}
      emptyMessage="Nenhuma pessoa cadastrada."
      search={SEARCH}
      filters={filters}
      initialColumnFilters={initialColumnFilters}
    />
  )
}

export default PeopleTable
