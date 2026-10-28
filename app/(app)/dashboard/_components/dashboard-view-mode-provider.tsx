"use client"

import { type ReactNode, useMemo, useState } from "react"

import { DEFAULT_DASHBOARD_VIEW_MODE } from "@/app/_lib/domain/dashboard"
import type { DashboardViewMode } from "@/app/_lib/types/dashboard"

import { DashboardViewModeContext } from "../_hooks/use-dashboard-view-mode"

interface DashboardViewModeProviderProps {
  children: ReactNode
}

const DashboardViewModeProvider = ({
  children,
}: DashboardViewModeProviderProps) => {
  const [mode, setMode] = useState<DashboardViewMode>(
    DEFAULT_DASHBOARD_VIEW_MODE,
  )
  const value = useMemo(() => ({ mode, setMode }), [mode])

  return (
    <DashboardViewModeContext value={value}>
      {children}
    </DashboardViewModeContext>
  )
}

export default DashboardViewModeProvider
