import { cn } from "@/app/_lib/utils"

interface StatCardProps {
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
  valueTitle?: string
  valueClassName?: string
}

const StatCard = ({
  label,
  value,
  hint,
  valueTitle,
  valueClassName,
}: StatCardProps) => {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-2xl border border-border-subtle bg-surface p-4">
      <span className="text-caption font-semibold text-muted-foreground">
        {label}
      </span>
      <span className="flex h-8 items-center">
        <span
          title={valueTitle}
          className={cn(
            "truncate font-heading text-display leading-none font-semibold",
            valueClassName,
          )}
        >
          {value}
        </span>
      </span>
      {hint ? (
        <span className="truncate text-xs font-bold text-text-tertiary">
          {hint}
        </span>
      ) : null}
    </div>
  )
}

export default StatCard
