"use client"

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { Button } from "@/app/_components/ui/button"

interface DataTablePaginationProps {
  firstRow: number
  lastRow: number
  totalRows: number
  canPreviousPage: boolean
  canNextPage: boolean
  onPreviousPage: () => void
  onNextPage: () => void
}

const DataTablePagination = ({
  firstRow,
  lastRow,
  totalRows,
  canPreviousPage,
  canNextPage,
  onPreviousPage,
  onNextPage,
}: DataTablePaginationProps) => (
  <nav
    aria-label="Paginação"
    className="flex items-center justify-end gap-3 border-t border-border-subtle px-3 py-2"
  >
    <p
      aria-live="polite"
      className="text-xs text-muted-foreground tabular-nums"
    >
      <span className="font-semibold text-foreground">
        {firstRow}–{lastRow}
      </span>{" "}
      de {totalRows}
    </p>
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label="Página anterior"
        disabled={!canPreviousPage}
        onClick={onPreviousPage}
      >
        <ChevronLeftIcon aria-hidden="true" className="size-4" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label="Próxima página"
        disabled={!canNextPage}
        onClick={onNextPage}
      >
        <ChevronRightIcon aria-hidden="true" className="size-4" />
      </Button>
    </div>
  </nav>
)

export default DataTablePagination
