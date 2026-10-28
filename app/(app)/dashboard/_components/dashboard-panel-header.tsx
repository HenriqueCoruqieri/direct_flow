import type { ReactNode } from "react"

interface DashboardPanelHeaderProps {
  title: string
  titleId?: string
  children: ReactNode
}

const DashboardPanelHeader = ({
  title,
  titleId,
  children,
}: DashboardPanelHeaderProps) => {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2
        id={titleId}
        className="text-caption font-semibold text-muted-foreground"
      >
        {title}
      </h2>
      {children}
    </div>
  )
}

export default DashboardPanelHeader
