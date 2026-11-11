const NUMBER_PATTERN = /(\d[\d.,]*)/

interface GoalValueProps {
  label: string
}

const GoalValue = ({ label }: GoalValueProps) => {
  const parts = label.split(NUMBER_PATTERN).filter((part) => part !== "")

  return (
    <span className="inline-flex items-baseline whitespace-nowrap">
      {parts.map((part, index) =>
        NUMBER_PATTERN.test(part) ? (
          <span
            key={index}
            className="font-mono text-2xl leading-none font-semibold tracking-tight tabular-nums"
          >
            {part}
          </span>
        ) : (
          <span
            key={index}
            className="text-sm leading-none font-semibold whitespace-pre text-text-secondary"
          >
            {part}
          </span>
        ),
      )}
    </span>
  )
}

export default GoalValue
