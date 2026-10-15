"use client"

import { use, useLayoutEffect, useRef } from "react"

import { TicketEditContext } from "../_hooks/use-ticket-edit"

const LG_QUERY = "(min-width: 64rem)"

interface TicketDetailGridProps {
  main: React.ReactNode
  aside: React.ReactNode
  layoutKey: string
}

const alignColumns = (grid: HTMLElement, columns: readonly HTMLElement[]) => {
  for (const column of columns) column.style.removeProperty("min-height")

  if (!window.matchMedia(LG_QUERY).matches) {
    delete grid.dataset.aligned
    return
  }
  grid.dataset.aligned = ""

  const textareas = Array.from(grid.querySelectorAll("textarea"))
  const draggedHeights = textareas.map((textarea) => textarea.style.height)
  for (const textarea of textareas) textarea.style.removeProperty("height")

  const height = Math.max(
    ...columns.map((column) => column.getBoundingClientRect().height),
  )

  textareas.forEach((textarea, index) => {
    textarea.style.height = draggedHeights[index] ?? ""
  })
  for (const column of columns) column.style.minHeight = `${height}px`
}

const TicketDetailGrid = ({
  main,
  aside,
  layoutKey,
}: TicketDetailGridProps) => {
  const gridRef = useRef<HTMLDivElement>(null)
  const mainRef = useRef<HTMLDivElement>(null)
  const asideRef = useRef<HTMLDivElement>(null)
  const isEditing = use(TicketEditContext)?.isEditing ?? false
  const isEditingRef = useRef(isEditing)

  useLayoutEffect(() => {
    isEditingRef.current = isEditing
    if (isEditing) return
    const grid = gridRef.current
    const mainColumn = mainRef.current
    const asideColumn = asideRef.current
    if (grid === null || mainColumn === null || asideColumn === null) return
    alignColumns(grid, [mainColumn, asideColumn])
  }, [layoutKey, isEditing])

  useLayoutEffect(() => {
    const grid = gridRef.current
    if (grid === null) return

    let width = grid.getBoundingClientRect().width
    let frame = 0

    const observer = new ResizeObserver(() => {
      const nextWidth = grid.getBoundingClientRect().width
      if (nextWidth === width) return
      width = nextWidth
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const mainColumn = mainRef.current
        const asideColumn = asideRef.current
        if (isEditingRef.current) return
        if (mainColumn === null || asideColumn === null) return
        alignColumns(grid, [mainColumn, asideColumn])
      })
    })
    observer.observe(grid)

    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <div
      ref={gridRef}
      className="grid grid-cols-1 gap-5.5 lg:grid-cols-3 lg:items-stretch lg:data-aligned:items-start"
    >
      <div
        ref={mainRef}
        className="flex min-w-0 flex-col gap-5.5 lg:col-span-2"
      >
        {main}
      </div>
      <div ref={asideRef} className="flex min-w-0 flex-col gap-5.5">
        {aside}
      </div>
    </div>
  )
}

export default TicketDetailGrid
