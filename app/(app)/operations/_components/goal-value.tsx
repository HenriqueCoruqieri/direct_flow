import { cn } from "@/app/_lib/utils"

const NUMBER_PATTERN = /(\d[\d.,]*)/

const MEDIUM_LABEL_LENGTH = 8

const LONG_LABEL_LENGTH = 10

interface GoalValueSizes {
  number: string
  unit: string
}

const SHORT_SIZES: GoalValueSizes = { number: "text-2xl", unit: "text-sm" }

const MEDIUM_SIZES: GoalValueSizes = { number: "text-xl", unit: "text-xs" }

const LONG_SIZES: GoalValueSizes = { number: "text-base", unit: "text-micro" }

const sizesFor = (label: string): GoalValueSizes => {
  if (label.length >= LONG_LABEL_LENGTH) return LONG_SIZES
  if (label.length >= MEDIUM_LABEL_LENGTH) return MEDIUM_SIZES
  return SHORT_SIZES
}

interface GoalValueProps {
  label: string
}

const GoalValue = ({ label }: GoalValueProps) => {
  const parts = label.split(NUMBER_PATTERN).filter((part) => part !== "")
  const sizes = sizesFor(label)

  return (
    <span className="inline-flex items-baseline whitespace-nowrap">
      {parts.map((part, index) =>
        NUMBER_PATTERN.test(part) ? (
          <span
            key={index}
            className={cn(
              sizes.number,
              "font-mono leading-none font-semibold tracking-tight tabular-nums",
            )}
          >
            {part}
          </span>
        ) : (
          <span
            key={index}
            className={cn(
              sizes.unit,
              "leading-none font-semibold whitespace-pre text-text-secondary",
            )}
          >
            {part}
          </span>
        ),
      )}
    </span>
  )
}

export default GoalValue
