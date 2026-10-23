interface StatCardProps {
  label: string
  value: React.ReactNode
  footer: React.ReactNode
}

const StatCard = ({ label, value, footer }: StatCardProps) => {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-2xl border border-border-subtle bg-surface p-4">
      <span className="text-caption font-semibold text-muted-foreground">
        {label}
      </span>
      <span className="flex h-8 items-center">
        <span className="font-heading text-display leading-none font-semibold whitespace-nowrap">
          {value}
        </span>
      </span>
      <div className="flex h-5 min-w-0 items-center">{footer}</div>
    </div>
  )
}

export default StatCard
