"use client"

import type { ColumnFiltersState } from "@tanstack/react-table"
import { createColumnHelper } from "@tanstack/react-table"
import { useMemo } from "react"

import DataTable from "@/app/_components/data-table/data-table"
import type { DataTableFeatures } from "@/app/_components/data-table/data-table-features"
import type { DataTableFilter } from "@/app/_components/data-table/data-table-filters"
import {
  brazilianStateLabel,
  formatCnpj,
} from "@/app/_lib/domain/brazilian-formats"
import {
  companyLocationLabel,
  companySearchText,
  statesPresentIn,
} from "@/app/_lib/domain/company"
import type { CompanyListItem } from "@/app/_lib/types/company"

import ActiveStatusBadge from "../../_components/active-status-badge"
import activeStatusFilter from "../../_components/active-status-filter"
import CompanyRowActions from "./company-row-actions"

const columnHelper = createColumnHelper<DataTableFeatures, CompanyListItem>()

const columns = columnHelper.columns([
  columnHelper.accessor((row) => companySearchText(row), {
    id: "company",
    header: "Empresa",
    filterFn: "includesString",
    cell: ({ row }) => (
      <div className="flex flex-col gap-0.5">
        <span className="font-medium">{row.original.tradeName}</span>
        <span className="text-xs text-muted-foreground">
          {row.original.legalName}
        </span>
      </div>
    ),
  }),
  columnHelper.accessor("cnpj", {
    header: "CNPJ",
    cell: ({ getValue }) => (
      <span className="font-mono whitespace-nowrap">
        {formatCnpj(getValue())}
      </span>
    ),
  }),
  columnHelper.accessor("state", {
    header: "Cidade / UF",
    filterFn: "inValues",
    cell: ({ row }) =>
      companyLocationLabel(row.original.city, row.original.state),
  }),
  columnHelper.accessor("managerName", {
    header: "Responsável",
  }),
  columnHelper.accessor("isActive", {
    header: "Status",
    filterFn: "inValues",
    cell: ({ getValue }) => <ActiveStatusBadge isActive={getValue()} />,
  }),
  columnHelper.display({
    id: "actions",
    header: () => <span className="sr-only">Ações</span>,
    cell: ({ row }) => <CompanyRowActions company={row.original} />,
  }),
])

const SEARCH = {
  columnId: "company",
  label: "Buscar empresa por nome, razão social ou CNPJ",
  placeholder: "Buscar por nome, razão social ou CNPJ",
}

const ACTIVE_ONLY: ColumnFiltersState = [{ id: "isActive", value: ["true"] }]

const NO_FILTERS: ColumnFiltersState = []

interface CompaniesTableProps {
  companies: CompanyListItem[]
}

const CompaniesTable = ({ companies }: CompaniesTableProps) => {
  const filters = useMemo<DataTableFilter[]>(
    () => [
      activeStatusFilter,
      {
        columnId: "state",
        label: "UF",
        options: statesPresentIn(companies.map((item) => item.state)).map(
          (state) => ({ value: state, label: brazilianStateLabel(state) }),
        ),
      },
    ],
    [companies],
  )

  return (
    <DataTable
      columns={columns}
      data={companies}
      emptyMessage="Nenhuma empresa cadastrada."
      search={SEARCH}
      filters={filters}
      initialColumnFilters={companies.length > 0 ? ACTIVE_ONLY : NO_FILTERS}
    />
  )
}

export default CompaniesTable
