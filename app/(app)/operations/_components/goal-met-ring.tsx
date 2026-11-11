"use client"

import { PolarAngleAxis, RadialBar, RadialBarChart } from "recharts"

import { type ChartConfig, ChartContainer } from "@/app/_components/ui/chart"

const RING_CONFIG = {
  value: { color: "var(--primary)" },
} satisfies ChartConfig

const RING_MARGIN = { top: 0, right: 0, bottom: 0, left: 0 }

interface GoalMetRingProps {
  percent: number
}

const GoalMetRing = ({ percent }: GoalMetRingProps) => {
  return (
    <ChartContainer
      config={RING_CONFIG}
      aria-hidden="true"
      initialDimension={{ width: 88, height: 88 }}
      className="aspect-square size-22"
    >
      <RadialBarChart
        data={[{ value: percent }]}
        startAngle={90}
        endAngle={-270}
        innerRadius={34}
        outerRadius={44}
        margin={RING_MARGIN}
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
          cornerRadius={5}
          fill="var(--color-value)"
          isAnimationActive={false}
        />
      </RadialBarChart>
    </ChartContainer>
  )
}

export default GoalMetRing
