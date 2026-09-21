import { ArrowRightIcon, Loader2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type PillButtonProps = Omit<React.ComponentProps<"button">, "children"> & {
  children: React.ReactNode
  /** Mostra o spinner no lugar da seta e desabilita o botão. */
  loading?: boolean
}

/** Botão principal do estilo Órbita: pílula de 56px na cor da marca. */
export function PillButton({
  children,
  loading = false,
  disabled,
  className,
  type = "button",
  ...props
}: PillButtonProps) {
  return (
    <Button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "h-14 w-full justify-between gap-4 rounded-full pr-2 pl-7 text-base font-extrabold",
        // Anel com opacidade total (>= 3:1 nos dois temas) afastado da pílula.
        "hover:bg-primary-hover focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
      {...props}
    >
      <span className="truncate">{children}</span>
      <span className="flex size-10.5 shrink-0 items-center justify-center rounded-full bg-primary-foreground text-primary">
        {loading ? (
          <Loader2Icon
            aria-hidden="true"
            className="size-4.5 animate-spin motion-reduce:animate-none"
          />
        ) : (
          <ArrowRightIcon aria-hidden="true" className="size-4.5" />
        )}
      </span>
      {loading ? <span className="sr-only">Enviando…</span> : null}
    </Button>
  )
}
