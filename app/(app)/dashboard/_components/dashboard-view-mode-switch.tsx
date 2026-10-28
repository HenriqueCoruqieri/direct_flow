"use client"

import { useId } from "react"

import {
  DASHBOARD_VIEW_MODE_GROUP_LABEL,
  DASHBOARD_VIEW_MODE_LABELS,
  DASHBOARD_VIEW_MODES,
} from "@/app/_lib/domain/dashboard"
import { cn } from "@/app/_lib/utils"

import { useDashboardViewMode } from "../_hooks/use-dashboard-view-mode"

const DashboardViewModeSwitch = () => {
  const { mode, setMode } = useDashboardViewMode()
  const name = useId()

  return (
    <div
      role="radiogroup"
      aria-label={DASHBOARD_VIEW_MODE_GROUP_LABEL}
      className="inline-flex shrink-0 rounded-full border border-border-strong bg-surface-muted p-0.5"
    >
      <div className="relative grid grid-cols-2">
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-y-0 left-0 w-1/2 rounded-full bg-primary shadow-sm transition-transform duration-200 ease-out motion-reduce:transition-none",
            mode === "individual" && "translate-x-full",
          )}
        />
        {DASHBOARD_VIEW_MODES.map((option) => {
          const checked = mode === option

          return (
            <label
              key={option}
              className={cn(
                "relative flex h-7 cursor-pointer items-center justify-center rounded-full px-3 text-xs font-bold whitespace-nowrap transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50 motion-reduce:transition-none",
                checked
                  ? "text-primary-foreground"
                  : "text-text-secondary hover:text-foreground",
              )}
            >
              <input
                type="radio"
                name={name}
                value={option}
                checked={checked}
                onChange={() => setMode(option)}
                className="sr-only"
              />
              {DASHBOARD_VIEW_MODE_LABELS[option]}
            </label>
          )
        })}
      </div>
    </div>
  )
}

export default DashboardViewModeSwitch
