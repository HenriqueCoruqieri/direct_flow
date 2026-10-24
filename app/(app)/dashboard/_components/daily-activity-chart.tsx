"use client"

import type { ReactNode } from "react"
import type { DotItemDotProps } from "recharts"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/app/_components/ui/chart"
import {
  DAILY_ACTIVITY_SERIES,
  DAILY_ACTIVITY_SERIES_COLORS,
  DAILY_ACTIVITY_SERIES_LABELS,
} from "@/app/_lib/domain/dashboard"
import type {
  DashboardDailyActivityPoint,
  DashboardDailyActivitySeries,
} from "@/app/_lib/types/dashboard"

const CHART_CONFIG = {
  opened: {
    label: DAILY_ACTIVITY_SERIES_LABELS.opened,
    color: DAILY_ACTIVITY_SERIES_COLORS.opened,
  },
  resolved: {
    label: DAILY_ACTIVITY_SERIES_LABELS.resolved,
    color: DAILY_ACTIVITY_SERIES_COLORS.resolved,
  },
} satisfies ChartConfig

const LAST_POINT_LABEL_OFFSET = {
  opened: -10,
  resolved: 18,
} satisfies Record<DashboardDailyActivitySeries, number>

const CHART_MARGIN = { top: 20, right: 16, bottom: 0, left: 0 }

const Y_AXIS_PADDING = { top: 0, bottom: 20 }

const longLabelFromPayload = (
  label: unknown,
  payload: readonly unknown[],
): ReactNode => {
  const [item] = payload
  if (typeof item === "object" && item !== null && "payload" in item) {
    const point: unknown = item.payload
    if (
      typeof point === "object" &&
      point !== null &&
      "longLabel" in point &&
      typeof point.longLabel === "string"
    ) {
      return point.longLabel
    }
  }
  return typeof label === "string" ? label : null
}

const renderLastPoint = (
  series: DashboardDailyActivitySeries,
  lastIndex: number,
  { cx, cy, index, value }: DotItemDotProps,
): ReactNode => {
  if (index !== lastIndex || cx === undefined || cy === undefined) return null
  return (
    <g key={`${series}-last`}>
      <circle
        cx={cx}
        cy={cy}
        r={4}
        fill={`var(--color-${series})`}
        strokeWidth={2}
        className="stroke-surface"
      />
      <text
        x={cx}
        y={cy + LAST_POINT_LABEL_OFFSET[series]}
        textAnchor="middle"
        className="fill-foreground text-xs font-semibold tabular-nums"
      >
        {typeof value === "number" ? value : 0}
      </text>
    </g>
  )
}

interface DailyActivityChartProps {
  points: DashboardDailyActivityPoint[]
}

const DailyActivityChart = ({ points }: DailyActivityChartProps) => {
  const lastIndex = points.length - 1

  return (
    <ChartContainer
      config={CHART_CONFIG}
      aria-hidden="true"
      className="absolute inset-0 aspect-auto"
    >
      <LineChart data={points} margin={CHART_MARGIN}>
        <CartesianGrid vertical={false} stroke="var(--color-border-subtle)" />
        <XAxis
          dataKey="label"
          interval={0}
          axisLine={false}
          tickLine={false}
          tickMargin={8}
        />
        <YAxis
          allowDecimals={false}
          domain={[0, "auto"]}
          padding={Y_AXIS_PADDING}
          axisLine={false}
          tickLine={false}
          tickMargin={4}
          width={32}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              indicator="line"
              labelFormatter={longLabelFromPayload}
            />
          }
        />
        {DAILY_ACTIVITY_SERIES.map((series) => (
          <Line
            key={series}
            dataKey={series}
            type="monotone"
            stroke={`var(--color-${series})`}
            strokeWidth={2}
            dot={(props) => renderLastPoint(series, lastIndex, props)}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ChartContainer>
  )
}

export default DailyActivityChart
