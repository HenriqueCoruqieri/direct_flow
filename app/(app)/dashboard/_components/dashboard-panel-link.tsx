import Link from "next/link"

interface DashboardPanelLinkProps {
  href: string
  label: string
}

const DashboardPanelLink = ({ href, label }: DashboardPanelLinkProps) => {
  return (
    <Link
      href={href}
      className="shrink-0 rounded-sm text-caption font-semibold whitespace-nowrap text-primary transition-colors outline-none hover:text-primary-hover focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {label}
    </Link>
  )
}

export default DashboardPanelLink
