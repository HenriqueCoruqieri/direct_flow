import { cn } from "@/lib/utils"

type LogoMarkSize = "sm" | "md" | "lg"

type LogoMarkProps = {
  /** sm = 32px (sidebar) · md = 48px · lg = 84px (centro da órbita) */
  size?: LogoMarkSize
  /** tile = superfície com borda · tint = fundo da marca a 12% (sidebar) */
  variant?: "tile" | "tint"
  /** Rótulo acessível; sem ele o ícone é decorativo. */
  label?: string
  className?: string
}

const boxBySize: Record<LogoMarkSize, string> = {
  sm: "size-8 rounded-lg",
  md: "size-12 rounded-2xl",
  lg: "size-21 rounded-4xl",
}

const iconBySize: Record<LogoMarkSize, string> = {
  sm: "size-4.5",
  md: "size-6",
  lg: "size-9.5",
}

export function LogoMark({
  size = "md",
  variant = "tile",
  label,
  className,
}: LogoMarkProps) {
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center text-primary",
        boxBySize[size],
        variant === "tile"
          ? "border border-border-strong bg-surface"
          : "bg-primary/12",
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={iconBySize[size]}
      >
        <path d="M4 8h12l-3-3" />
        <path d="M20 16H8l3 3" />
      </svg>
    </span>
  )
}
