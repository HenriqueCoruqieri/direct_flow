import { DAILY_ACTIVITY_CARD_LABEL } from "@/app/_lib/domain/dashboard"

interface DashboardDailyActivityHeaderProps {
  titleId?: string
  children?: React.ReactNode
}

const DashboardDailyActivityHeader = ({
  titleId,
  children,
}: DashboardDailyActivityHeaderProps) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
      <h2
        id={titleId}
        className="text-caption font-semibold text-muted-foreground"
      >
        {DAILY_ACTIVITY_CARD_LABEL}
      </h2>
      {children}
    </div>
  )
}

export default DashboardDailyActivityHeader
