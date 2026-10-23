import Link from "next/link"

interface DashboardPanelHeaderProps {
  title: string
  href: string
  linkLabel: string
  titleId?: string
}

const DashboardPanelHeader = ({
  title,
  href,
  linkLabel,
  titleId,
}: DashboardPanelHeaderProps) => {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2
        id={titleId}
        className="text-caption font-semibold text-muted-foreground"
      >
        {title}
      </h2>
      <Link
        href={href}
        className="shrink-0 rounded-sm text-caption font-semibold text-primary transition-colors outline-none hover:text-primary-hover focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {linkLabel}
      </Link>
    </div>
  )
}

export default DashboardPanelHeader
