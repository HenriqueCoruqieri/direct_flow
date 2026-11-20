"use client"

import {
  type ColumnDef,
  type ColumnFiltersState,
  type ColumnVisibilityState,
  type RowData,
  useTable,
} from "@tanstack/react-table"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

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
import DataTablePagination from "./data-table-pagination"
import DataTableSearch from "./data-table-search"

const PAGE_SIZE = 10

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
  hiddenColumns?: ReadonlyArray<string>
}

const hiddenColumnsVisibility = (
  columnIds: ReadonlyArray<string>,
): ColumnVisibilityState =>
  Object.fromEntries(columnIds.map((columnId) => [columnId, false]))

const DataTable = <TData extends RowData>({
  columns,
  data,
  emptyMessage,
  search,
  filters = [],
  rowHref,
  toolbarFooter,
  initialColumnFilters = [],
  hiddenColumns = [],
}: DataTableProps<TData>) => {
  const router = useRouter()
  const table = useTable({
    features: dataTableFeatures,
    columns,
    data,
    autoResetPageIndex: false,
    initialState: {
      columnFilters: initialColumnFilters,
      columnVisibility: hiddenColumnsVisibility(hiddenColumns),
      pagination: { pageIndex: 0, pageSize: PAGE_SIZE },
    },
  })

  const pageIndex = table.state.pagination.pageIndex
  const pageCount = table.getPageCount()

  useEffect(() => {
    if (pageIndex > 0 && pageIndex >= pageCount) {
      table.setPageIndex(Math.max(pageCount - 1, 0))
    }
  }, [table, pageIndex, pageCount])

  const setColumnFilter = (columnId: string, value: unknown) => {
    table.getColumn(columnId)?.setFilterValue(value)
    table.firstPage()
  }

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
  const totalRows = table.getPrePaginatedRowModel().rows.length
  const firstRow = pageIndex * PAGE_SIZE + 1
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
              onValueChange={(value) => setColumnFilter(search.columnId, value)}
            />
          ) : null}
          {filterGroups.length > 0 ? (
            <div className="ml-auto">
              <DataTableFilters
                groups={filterGroups}
                onSelectedChange={setColumnFilter}
                onClear={() =>
                  filterGroups.forEach((group) =>
                    setColumnFilter(group.columnId, undefined),
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
                    className="h-11 px-3 text-xs font-bold text-muted-foreground"
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
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-3 py-3">
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={table.getVisibleLeafColumns().length}
                  className="h-24 px-3 text-center text-muted-foreground"
                >
                  {isFiltered
                    ? "Nenhum resultado para os filtros aplicados."
                    : emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {totalRows > PAGE_SIZE && rows.length > 0 ? (
          <DataTablePagination
            firstRow={firstRow}
            lastRow={firstRow + rows.length - 1}
            totalRows={totalRows}
            canPreviousPage={table.getCanPreviousPage()}
            canNextPage={table.getCanNextPage()}
            onPreviousPage={() => table.previousPage()}
            onNextPage={() => table.nextPage()}
          />
        ) : null}
      </div>
    </div>
  )
}

export default DataTable
