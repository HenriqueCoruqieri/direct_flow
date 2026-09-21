import { LogoMark } from "@/components/brand/logo-mark"
import { cn } from "@/lib/utils"

type OrbitHeroSize = "sm" | "md" | "lg"

type OrbitHeroProps = {
  /** sm ≈ 260px · md = 344px (mobile, fiel ao canvas) · lg ≈ 464px (desktop) */
  size?: OrbitHeroSize
  className?: string
}

// O palco é desenhado em 344px (medida do canvas) e escalado como um todo,
// para anéis, pontos e marca manterem a proporção em qualquer tamanho.
const boxBySize: Record<OrbitHeroSize, string> = {
  sm: "size-65",
  md: "size-86",
  lg: "size-116",
}

const stageBySize: Record<OrbitHeroSize, string> = {
  sm: "scale-75",
  md: "scale-100",
  lg: "scale-135",
}

const dot = "absolute rounded-full bg-current"

export function OrbitHero({ size = "md", className }: OrbitHeroProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none flex shrink-0 items-center justify-center select-none",
        boxBySize[size],
        className,
      )}
    >
      <div
        className={cn(
          "relative flex size-86 shrink-0 items-center justify-center",
          stageBySize[size],
        )}
      >
        <div className="absolute size-86 animate-orbit-slow rounded-full border border-border-subtle">
          <span
            className={cn(
              dot,
              "-top-1.25 left-1/2 size-2.5 -translate-x-1/2 text-status-aberto shadow-glow-sm",
            )}
          />
          <span
            className={cn(
              dot,
              "bottom-10 left-9 size-1.75 text-status-aguardando-aprovacao",
            )}
          />
          <span
            className={cn(
              dot,
              "right-4.5 bottom-15 size-1.5 text-status-resolvido",
            )}
          />
        </div>

        <div className="absolute size-63 animate-orbit-medium rounded-full border border-dashed border-border-strong">
          <span
            className={cn(
              dot,
              "top-1/2 -left-1.5 size-3 -translate-y-1/2 text-primary shadow-glow",
            )}
          />
          <span
            className={cn(
              dot,
              "top-5 right-7.5 size-1.75 text-status-cancelado",
            )}
          />
        </div>

        <div className="absolute size-41 animate-orbit-fast rounded-full border border-border">
          <span
            className={cn(
              dot,
              "-top-1 left-1/2 size-2 -translate-x-1/2 text-foreground",
            )}
          />
        </div>

        <div className="absolute size-23 animate-breathe rounded-5xl bg-primary" />
        <LogoMark size="lg" />
      </div>
    </div>
  )
}
