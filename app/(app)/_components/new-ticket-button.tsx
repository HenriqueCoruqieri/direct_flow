import { PlusIcon } from "lucide-react"

import { Button } from "@/app/_components/ui/button"
import { cn } from "@/app/_lib/utils"

interface NewTicketButtonProps extends Omit<
  React.ComponentProps<typeof Button>,
  "children" | "variant" | "size" | "asChild" | "disabled" | "aria-disabled"
> {
  blocked?: boolean
}

const NewTicketButton = ({
  blocked = false,
  className,
  ...props
}: NewTicketButtonProps) => {
  return (
    <Button
      type="button"
      aria-disabled={blocked || undefined}
      className={cn(
        "size-12 gap-2 rounded-xl px-0 text-sm font-extrabold hover:bg-primary-hover lg:h-10 lg:w-auto lg:rounded-lg lg:px-4",
        blocked && "cursor-not-allowed opacity-50 hover:bg-primary",
        className,
      )}
      {...props}
    >
      <PlusIcon aria-hidden="true" strokeWidth={2.4} className="size-4" />
      <span className="sr-only lg:not-sr-only">Novo chamado</span>
    </Button>
  )
}

export default NewTicketButton
