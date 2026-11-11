"use client"

import type { ReactElement, ReactNode } from "react"
import type { LabelProps, XAxisTickContentProps } from "recharts"
import { Bar, BarChart, LabelList, XAxis } from "recharts"

import { type ChartConfig, ChartContainer } from "@/app/_components/ui/chart"
import {
  PRODUCTION_SCROLL_REGION_LABEL,
  PRODUCTION_SELF_LABEL,
} from "@/app/_lib/domain/operations"
import { getFirstName, getInitials } from "@/app/_lib/domain/user"
import type { TeamProductionEntry } from "@/app/_lib/types/operations"

import UserAvatar from "../../_components/user-avatar"

const CHART_CONFIG = {
  resolvedCount: { color: "var(--primary)" },
} satisfies ChartConfig

const AVATAR_PX = 34

const BAR_PX = AVATAR_PX + 6

const SLOT_PX = BAR_PX + 24

const VALUE_GAP_PX = 6

const CHART_MARGIN = {
  top: AVATAR_PX / 2 + VALUE_GAP_PX + 18,
  right: 0,
  bottom: 0,
  left: 0,
}

const toNumber = (value: number | string | undefined): number | null => {
  if (typeof value === "number") return value
  if (typeof value === "string" && value !== "") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

interface ProductionChartProps {
  entries: TeamProductionEntry[]
  sessionUserId: number
}

const ProductionChart = ({ entries, sessionUserId }: ProductionChartProps) => {
  const renderAvatar = ({
    x,
    y,
    width,
    index,
  }: LabelProps): ReactElement | null => {
    const left = toNumber(x)
    const top = toNumber(y)
    const barWidth = toNumber(width)
    const entry = index === undefined ? undefined : entries[index]
    if (left === null || top === null || barWidth === null || !entry) {
      return null
    }
    const centerX = left + barWidth / 2
    const avatarTop = top - AVATAR_PX / 2

    return (
      <g key={entry.userId}>
        <text
          x={centerX}
          y={avatarTop - VALUE_GAP_PX}
          textAnchor="middle"
          className="fill-foreground font-mono text-xs font-semibold tabular-nums"
        >
          {entry.resolvedCount}
        </text>
        <foreignObject
          x={centerX - AVATAR_PX / 2}
          y={avatarTop}
          width={AVATAR_PX}
          height={AVATAR_PX}
        >
          <UserAvatar
            initials={getInitials(entry.name)}
            image={entry.image}
            size="sm"
            className="ring-2 ring-surface"
          />
        </foreignObject>
      </g>
    )
  }

  const renderTick = ({ x, y, index }: XAxisTickContentProps): ReactNode => {
    const entry = entries[index]
    const left = toNumber(x)
    const top = toNumber(y)
    if (!entry || left === null || top === null) return null
    const isSelf = entry.userId === sessionUserId

    return (
      <text
        x={left}
        y={top}
        dy={12}
        textAnchor="middle"
        className={
          isSelf
            ? "fill-foreground text-xs font-bold"
            : "fill-muted-foreground text-xs"
        }
      >
        {isSelf ? PRODUCTION_SELF_LABEL : getFirstName(entry.name)}
      </text>
    )
  }

  return (
    <div
      role="region"
      aria-label={PRODUCTION_SCROLL_REGION_LABEL}
      tabIndex={0}
      className="-mx-1 overflow-x-auto rounded-lg px-1 pb-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <div style={{ minWidth: entries.length * SLOT_PX }}>
        <ChartContainer
          config={CHART_CONFIG}
          aria-hidden="true"
          className="aspect-auto h-72 w-full"
        >
          <BarChart data={entries} margin={CHART_MARGIN}>
            <XAxis
              dataKey="userId"
              interval={0}
              axisLine={false}
              tickLine={false}
              tickMargin={4}
              tick={renderTick}
            />
            <Bar
              dataKey="resolvedCount"
              fill="var(--color-resolvedCount)"
              barSize={BAR_PX}
              radius={[10, 10, 0, 0]}
              isAnimationActive={false}
            >
              <LabelList dataKey="resolvedCount" content={renderAvatar} />
            </Bar>
          </BarChart>
        </ChartContainer>
      </div>
    </div>
  )
}

export default ProductionChart
