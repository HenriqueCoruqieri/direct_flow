import { createContext, useContext } from "react"

import type { DashboardViewMode } from "@/app/_lib/types/dashboard"

export interface DashboardViewModeContextValue {
  mode: DashboardViewMode
  setMode: (mode: DashboardViewMode) => void
}

export const DashboardViewModeContext =
  createContext<DashboardViewModeContextValue | null>(null)

export const useDashboardViewMode = (): DashboardViewModeContextValue => {
  const value = useContext(DashboardViewModeContext)
  if (value === null) {
    throw new Error(
      "useDashboardViewMode precisa estar dentro de DashboardViewModeProvider.",
    )
  }
  return value
}
