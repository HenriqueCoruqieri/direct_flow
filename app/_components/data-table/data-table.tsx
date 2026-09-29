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

interface DataTableSearchConfig {
  columnId: string
  label: string
  placeholder?: string
}

interface DataTableProps<TData extends RowData> {
  columns: ReadonlyArray<ColumnDef<DataTableFeatures, TData>>
  data: ReadonlyArray<TData>
  emptyMessage: string
  search?: DataTableSearchConfig
}

const DataTable = <TData extends RowData>({
  columns,
  data,
  emptyMessage,
  search,
}: DataTableProps<TData>) => {
  const table = useTable({
    features: dataTableFeatures,
    columns,
    data,
  })

  const searchColumn = search ? table.getColumn(search.columnId) : undefined
  const searchValue = searchColumn?.getFilterValue()
  const rows = table.getRowModel().rows
  const isFiltered = table.state.columnFilters.length > 0

  return (
    <div className="flex flex-col gap-4">
      {search && searchColumn ? (
        <DataTableSearch
          label={search.label}
          placeholder={search.placeholder}
          value={typeof searchValue === "string" ? searchValue : ""}
          onValueChange={(value) => searchColumn.setFilterValue(value)}
        />
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
                  {isFiltered ? "Nenhum resultado para a busca." : emptyMessage}
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
