import { PRODUCTION_PANEL_TITLE } from "@/app/_lib/domain/operations"

interface ProductionPanelFrameProps extends React.ComponentProps<"section"> {
  subtitle: React.ReactNode
  filter?: React.ReactNode
}

const ProductionPanelFrame = ({
  subtitle,
  filter = null,
  children,
  ...props
}: ProductionPanelFrameProps) => {
  return (
    <section
      className="flex min-w-0 flex-col gap-4 rounded-2xl border border-border-subtle bg-surface p-4"
      {...props}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="font-heading text-base font-semibold">
            {PRODUCTION_PANEL_TITLE}
          </h2>
          <div className="text-caption text-muted-foreground">{subtitle}</div>
        </div>
        {filter}
      </div>
      {children}
    </section>
  )
}

export default ProductionPanelFrame
