"use client"

import type { ReactNode } from "react"
import type { DotItemDotProps, TooltipContentProps } from "recharts"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/app/_components/ui/chart"
import {
  ACTIVITY_SERIES,
  ACTIVITY_SERIES_COLORS,
  ACTIVITY_SERIES_LABELS,
  activityLastPointIndex,
  isRecordedActivityPoint,
} from "@/app/_lib/domain/dashboard"
import type {
  DashboardActivityPoint,
  DashboardActivitySeries,
} from "@/app/_lib/types/dashboard"

const CHART_CONFIG = {
  opened: {
    label: ACTIVITY_SERIES_LABELS.opened,
    color: ACTIVITY_SERIES_COLORS.opened,
  },
  resolved: {
    label: ACTIVITY_SERIES_LABELS.resolved,
    color: ACTIVITY_SERIES_COLORS.resolved,
  },
} satisfies ChartConfig

const LAST_POINT_LABEL_OFFSET = {
  opened: -10,
  resolved: 18,
} satisfies Record<DashboardActivitySeries, number>

const CHART_MARGIN = { top: 20, right: 28, bottom: 0, left: 0 }

const Y_AXIS_PADDING = { top: 0, bottom: 20 }

const MAX_POINTS_WITH_ALL_TICKS = 7

const renderLastPoint = (
  series: DashboardActivitySeries,
  lastIndex: number,
  { cx, cy, index, value }: DotItemDotProps,
): ReactNode => {
  if (index !== lastIndex || cx == null || cy == null) return null
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

interface ActivityChartProps {
  points: DashboardActivityPoint[]
}

const ActivityChart = ({ points }: ActivityChartProps) => {
  const lastIndex = activityLastPointIndex(points)
  const pointsByKey = new Map(points.map((point) => [point.key, point]))
  const showAllTicks = points.length <= MAX_POINTS_WITH_ALL_TICKS

  const tickLabel = (key: unknown): string =>
    typeof key === "string" ? (pointsByKey.get(key)?.label ?? "") : ""

  const renderTooltip = ({
    active,
    payload,
    label,
  }: TooltipContentProps): ReactNode => {
    const point = typeof label === "string" ? pointsByKey.get(label) : undefined
    if (point === undefined || !isRecordedActivityPoint(point)) return null
    return (
      <ChartTooltipContent
        active={active}
        payload={payload}
        label={label}
        indicator="line"
        labelFormatter={() => point.longLabel}
      />
    )
  }

  return (
    <ChartContainer
      config={CHART_CONFIG}
      aria-hidden="true"
      className="absolute inset-0 aspect-auto"
    >
      <LineChart data={points} margin={CHART_MARGIN}>
        <CartesianGrid vertical={false} stroke="var(--color-border-subtle)" />
        <XAxis
          dataKey="key"
          tickFormatter={tickLabel}
          interval={showAllTicks ? 0 : "preserveStartEnd"}
          minTickGap={4}
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
        <ChartTooltip content={renderTooltip} />
        {ACTIVITY_SERIES.map((series) => (
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

export default ActivityChart
