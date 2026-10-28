"use client"

import type { ReactNode } from "react"

import type { DashboardViewMode } from "@/app/_lib/types/dashboard"
import { cn } from "@/app/_lib/utils"

import { useDashboardViewMode } from "../_hooks/use-dashboard-view-mode"

interface DashboardViewPaneProps {
  mode: DashboardViewMode
  className?: string
  children: ReactNode
}

const DashboardViewPane = ({
  mode,
  className,
  children,
}: DashboardViewPaneProps) => {
  const { mode: activeMode } = useDashboardViewMode()

  return (
    <div hidden={mode !== activeMode} className={cn(className)}>
      {children}
    </div>
  )
}

export default DashboardViewPane
