import {
  columnFilteringFeature,
  columnVisibilityFeature,
  constructFilterFn,
  createFilteredRowModel,
  createPaginatedRowModel,
  filterFn_includesString,
  rowPaginationFeature,
  tableFeatures,
} from "@tanstack/react-table"

const hasSelectedValues = (value: unknown): value is unknown[] =>
  Array.isArray(value) && value.length > 0

const filterFn_inValues = constructFilterFn({
  filter: (dataValue: string, filterValue: unknown) =>
    hasSelectedValues(filterValue) && filterValue.includes(dataValue),
  autoRemove: (filterValue: unknown) => !hasSelectedValues(filterValue),
  resolveDataValue: (value: unknown) => String(value),
})

export const dataTableFeatures = tableFeatures({
  columnFilteringFeature,
  columnVisibilityFeature,
  rowPaginationFeature,
  filteredRowModel: createFilteredRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  filterFns: {
    includesString: filterFn_includesString,
    inValues: filterFn_inValues,
  },
})

export type DataTableFeatures = typeof dataTableFeatures
