import { cn } from "@/app/_lib/utils"

interface DashboardPanelProps extends React.ComponentProps<"section"> {}

const DashboardPanel = ({ className, ...props }: DashboardPanelProps) => {
  return (
    <section
      className={cn(
        "flex h-full min-w-0 flex-col rounded-2xl border border-border-subtle bg-surface p-4",
        className,
      )}
      {...props}
    />
  )
}

export default DashboardPanel
