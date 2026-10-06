"use client"

import {
  type ColumnDef,
  type ColumnFiltersState,
  type RowData,
  useTable,
} from "@tanstack/react-table"
import { useRouter } from "next/navigation"

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
import DataTableFilters, {
  type DataTableFilter,
  type DataTableFilterGroup,
} from "./data-table-filters"
import DataTableSearch from "./data-table-search"

interface DataTableSearchConfig {
  columnId: string
  label: string
  placeholder?: string
}

const selectedValuesOf = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : []

const hasTextSelection = (): boolean => {
  const selection = window.getSelection()
  return selection !== null && selection.toString().length > 0
}

const shouldIgnoreRowClick = (
  event: React.MouseEvent<HTMLTableRowElement>,
): boolean =>
  event.button !== 0 ||
  event.ctrlKey ||
  event.metaKey ||
  event.shiftKey ||
  event.altKey ||
  hasTextSelection() ||
  !(event.target instanceof Element) ||
  !event.currentTarget.contains(event.target) ||
  event.target.closest("a, button, input") !== null

interface DataTableProps<TData extends RowData> {
  columns: ReadonlyArray<ColumnDef<DataTableFeatures, TData>>
  data: ReadonlyArray<TData>
  emptyMessage: string
  search?: DataTableSearchConfig
  filters?: ReadonlyArray<DataTableFilter>
  rowHref?: (row: TData) => string
  toolbarFooter?: React.ReactNode
  initialColumnFilters?: ColumnFiltersState
}

const DataTable = <TData extends RowData>({
  columns,
  data,
  emptyMessage,
  search,
  filters = [],
  rowHref,
  toolbarFooter,
  initialColumnFilters,
}: DataTableProps<TData>) => {
  const router = useRouter()
  const table = useTable({
    features: dataTableFeatures,
    columns,
    data,
    initialState: initialColumnFilters
      ? { columnFilters: initialColumnFilters }
      : undefined,
  })

  const searchColumn = search ? table.getColumn(search.columnId) : undefined
  const searchValue = searchColumn?.getFilterValue()
  const filterGroups = filters.flatMap((filter): DataTableFilterGroup[] => {
    const column = table.getColumn(filter.columnId)
    return column
      ? [{ ...filter, selected: selectedValuesOf(column.getFilterValue()) }]
      : []
  })
  const hasToolbar = Boolean(searchColumn) || filterGroups.length > 0
  const rows = table.getRowModel().rows
  const isFiltered = table.state.columnFilters.length > 0

  return (
    <div className="flex flex-col gap-4">
      {hasToolbar ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {search && searchColumn ? (
            <DataTableSearch
              label={search.label}
              placeholder={search.placeholder}
              value={typeof searchValue === "string" ? searchValue : ""}
              onValueChange={(value) => searchColumn.setFilterValue(value)}
            />
          ) : null}
          {filterGroups.length > 0 ? (
            <div className="ml-auto">
              <DataTableFilters
                groups={filterGroups}
                onSelectedChange={(columnId, selected) =>
                  table.getColumn(columnId)?.setFilterValue(selected)
                }
                onClear={() =>
                  filterGroups.forEach((group) =>
                    table.getColumn(group.columnId)?.setFilterValue(undefined),
                  )
                }
              />
            </div>
          ) : null}
        </div>
      ) : null}
      {toolbarFooter}

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
                <TableRow
                  key={row.id}
                  className={rowHref ? "cursor-pointer" : undefined}
                  onClick={
                    rowHref
                      ? (event) => {
                          if (shouldIgnoreRowClick(event)) return
                          router.push(rowHref(row.original))
                        }
                      : undefined
                  }
                >
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
