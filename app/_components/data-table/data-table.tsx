"use client"

import { type ColumnDef, type RowData, useTable } from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/_components/ui/table"

import {
  type DataTableFeatures,
  dataTableFeatures,
} from "./data-table-features"
import DataTableSearch from "./data-table-search"
import DataTableSelectFilter, {
  type DataTableSelectFilterOption,
} from "./data-table-select-filter"

interface DataTableSearchConfig {
  columnId: string
  label: string
  placeholder?: string
}

interface DataTableSelectFilterConfig {
  columnId: string
  label: string
  allLabel: string
  options: ReadonlyArray<DataTableSelectFilterOption>
}

interface DataTableProps<TData extends RowData> {
  columns: ReadonlyArray<ColumnDef<DataTableFeatures, TData>>
  data: ReadonlyArray<TData>
  emptyMessage: string
  search?: DataTableSearchConfig
  selectFilters?: ReadonlyArray<DataTableSelectFilterConfig>
}

const DataTable = <TData extends RowData>({
  columns,
  data,
  emptyMessage,
  search,
  selectFilters = [],
}: DataTableProps<TData>) => {
  const table = useTable({
    features: dataTableFeatures,
    columns,
    data,
  })

  const searchColumn = search ? table.getColumn(search.columnId) : undefined
  const searchValue = searchColumn?.getFilterValue()
  const activeSelectFilters = selectFilters.flatMap((filter) => {
    const column = table.getColumn(filter.columnId)
    return column ? [{ filter, column }] : []
  })
  const hasToolbar = Boolean(searchColumn) || activeSelectFilters.length > 0
  const rows = table.getRowModel().rows
  const isFiltered = table.state.columnFilters.length > 0

  return (
    <div className="flex flex-col gap-4">
      {hasToolbar ? (
        <div className="flex flex-wrap items-center gap-3">
          {search && searchColumn ? (
            <DataTableSearch
              label={search.label}
              placeholder={search.placeholder}
              value={typeof searchValue === "string" ? searchValue : ""}
              onValueChange={(value) => searchColumn.setFilterValue(value)}
            />
          ) : null}
          {activeSelectFilters.map(({ filter, column }) => {
            const value = column.getFilterValue()

            return (
              <DataTableSelectFilter
                key={filter.columnId}
                label={filter.label}
                allLabel={filter.allLabel}
                options={filter.options}
                value={typeof value === "string" ? value : ""}
                onValueChange={(next) => column.setFilterValue(next)}
              />
            )
          })}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border-subtle bg-surface">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="h-11 px-4 text-xs font-bold text-muted-foreground"
                  >
                    {header.isPlaceholder ? null : (
                      <table.FlexRender header={header} />
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length > 0 ? (
              rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getAllCells().map((cell) => (
                    <TableCell key={cell.id} className="px-4 py-3">
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={table.getAllLeafColumns().length}
                  className="h-24 px-4 text-center text-muted-foreground"
                >
                  {isFiltered
                    ? "Nenhum resultado para os filtros aplicados."
                    : emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

export default DataTable
