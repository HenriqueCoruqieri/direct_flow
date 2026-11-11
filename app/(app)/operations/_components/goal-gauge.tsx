"use client"

import type { ReactElement } from "react"
import type { RadialBarSectorProps } from "recharts"
import { PolarAngleAxis, RadialBar, RadialBarChart, Sector } from "recharts"

import { type ChartConfig, ChartContainer } from "@/app/_components/ui/chart"
import type { GoalAdherence } from "@/app/_lib/types/operations"

const GAUGE_COLORS = {
  adherent: "var(--status-resolvido)",
  not_adherent: "var(--destructive)",
  no_data: "var(--muted-foreground)",
} satisfies Record<GoalAdherence, string>

const GAUGE_START_ANGLE = 180

const GAUGE_END_ANGLE = 0

const GAUGE_CENTER_Y = 72

const GAUGE_INNER_RADIUS = 56

const GAUGE_OUTER_RADIUS = 68

const GAUGE_MARKER_OVERHANG = 4

const GAUGE_MARGIN = { top: 0, right: 0, bottom: 0, left: 0 }

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180

const markerAngleFor = (targetPercent: number): number =>
  GAUGE_START_ANGLE -
  ((GAUGE_START_ANGLE - GAUGE_END_ANGLE) * targetPercent) / 100

const renderGaugeSector = (
  targetPercent: number,
  {
    cx,
    cy,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
  }: RadialBarSectorProps,
): ReactElement => {
  const centerX = cx ?? 0
  const centerY = cy ?? 0
  const inner = (innerRadius ?? GAUGE_INNER_RADIUS) - GAUGE_MARKER_OVERHANG
  const outer = (outerRadius ?? GAUGE_OUTER_RADIUS) + GAUGE_MARKER_OVERHANG
  const angle = toRadians(markerAngleFor(targetPercent))
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)

  return (
    <g>
      <Sector
        cx={centerX}
        cy={centerY}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        cornerRadius={6}
        fill="var(--color-value)"
      />
      <line
        x1={centerX + inner * cos}
        y1={centerY - inner * sin}
        x2={centerX + outer * cos}
        y2={centerY - outer * sin}
        strokeWidth={2.5}
        strokeLinecap="round"
        className="stroke-foreground"
      />
    </g>
  )
}

interface GoalGaugeProps {
  fillPercent: number
  targetPercent: number
  adherence: GoalAdherence
}

const GoalGauge = ({
  fillPercent,
  targetPercent,
  adherence,
}: GoalGaugeProps) => {
  const config = {
    value: { color: GAUGE_COLORS[adherence] },
  } satisfies ChartConfig

  return (
    <ChartContainer
      config={config}
      aria-hidden="true"
      initialDimension={{ width: 144, height: 80 }}
      className="aspect-auto h-20 w-36"
    >
      <RadialBarChart
        data={[{ value: fillPercent }]}
        cx="50%"
        cy={GAUGE_CENTER_Y}
        startAngle={GAUGE_START_ANGLE}
        endAngle={GAUGE_END_ANGLE}
        innerRadius={GAUGE_INNER_RADIUS}
        outerRadius={GAUGE_OUTER_RADIUS}
        margin={GAUGE_MARGIN}
      >
        <PolarAngleAxis
          type="number"
          domain={[0, 100]}
          tick={false}
          axisLine={false}
        />
        <RadialBar
          dataKey="value"
          background
          cornerRadius={6}
          isAnimationActive={false}
          shape={(props: RadialBarSectorProps) =>
            renderGaugeSector(targetPercent, props)
          }
        />
      </RadialBarChart>
    </ChartContainer>
  )
}

export default GoalGauge
