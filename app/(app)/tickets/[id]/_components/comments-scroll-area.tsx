"use client"

import { useEffect, useRef } from "react"

import { cn } from "@/app/_lib/utils"

interface CommentsScrollAreaProps {
  itemCount: number
  label: string
  className?: string
  children: React.ReactNode
}

const CommentsScrollArea = ({
  itemCount,
  label,
  className,
  children,
}: CommentsScrollAreaProps) => {
  const areaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const area = areaRef.current
    if (area === null) return
    area.scrollTop = area.scrollHeight
  }, [itemCount])

  return (
    <div
      ref={areaRef}
      role="region"
      aria-label={label}
      tabIndex={0}
      className={cn(
        "overflow-y-auto overscroll-contain rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        className,
      )}
    >
      {children}
    </div>
  )
}

export default CommentsScrollArea
