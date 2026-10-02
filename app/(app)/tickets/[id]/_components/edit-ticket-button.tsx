import { PencilIcon } from "lucide-react"

import { Button } from "@/app/_components/ui/button"
import { cn } from "@/app/_lib/utils"

interface EditTicketButtonProps extends Omit<
  React.ComponentProps<typeof Button>,
  "children" | "variant" | "size" | "asChild" | "disabled" | "aria-disabled"
> {
  blocked?: boolean
}

const EditTicketButton = ({
  blocked = false,
  className,
  ...props
}: EditTicketButtonProps) => {
  return (
    <Button
      type="button"
      variant="outline"
      aria-disabled={blocked || undefined}
      className={cn(
        blocked &&
          "cursor-not-allowed opacity-50 hover:bg-background dark:hover:bg-input/30",
        className,
      )}
      {...props}
    >
      <PencilIcon aria-hidden="true" className="size-4" />
      Editar
    </Button>
  )
}

export default EditTicketButton
