"use client"

import type { ReactNode } from "react"

import type { DashboardViewMode } from "@/app/_lib/types/dashboard"

import { useDashboardViewMode } from "../_hooks/use-dashboard-view-mode"

interface DashboardViewPaneProps {
  mode: DashboardViewMode
  children: ReactNode
}

const DashboardViewPane = ({ mode, children }: DashboardViewPaneProps) => {
  const { mode: activeMode } = useDashboardViewMode()

  return <div hidden={mode !== activeMode}>{children}</div>
}

export default DashboardViewPane
