import {
  columnFilteringFeature,
  createFilteredRowModel,
  filterFn_equalsString,
  filterFn_includesString,
  tableFeatures,
} from "@tanstack/react-table"

export const dataTableFeatures = tableFeatures({
  columnFilteringFeature,
  filteredRowModel: createFilteredRowModel(),
  filterFns: {
    includesString: filterFn_includesString,
    equalsString: filterFn_equalsString,
  },
})

export type DataTableFeatures = typeof dataTableFeatures
