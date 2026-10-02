import { cva } from "class-variance-authority"

export const periodPillVariants = cva(
  "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-bold whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
  {
    variants: {
      active: {
        true: "border-primary bg-primary/10 text-primary",
        false:
          "border-border-strong text-text-secondary hover:bg-surface-muted hover:text-foreground",
      },
    },
    defaultVariants: {
      active: false,
    },
  },
)
