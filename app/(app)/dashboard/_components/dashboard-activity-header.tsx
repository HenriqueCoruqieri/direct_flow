import { ACTIVITY_CARD_LABEL } from "@/app/_lib/domain/dashboard"

interface DashboardActivityHeaderProps {
  periodLabel: string
  titleId?: string
  children?: React.ReactNode
}

const DashboardActivityHeader = ({
  periodLabel,
  titleId,
  children,
}: DashboardActivityHeaderProps) => {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
      <div className="flex flex-col gap-0.5">
        <h2
          id={titleId}
          className="text-caption font-semibold text-muted-foreground"
        >
          {ACTIVITY_CARD_LABEL}
        </h2>
        <p className="text-caption text-muted-foreground">{periodLabel}</p>
      </div>
      {children}
    </div>
  )
}

export default DashboardActivityHeader
