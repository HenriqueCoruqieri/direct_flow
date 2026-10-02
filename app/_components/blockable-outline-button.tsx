import { Button } from "@/app/_components/ui/button"
import { cn } from "@/app/_lib/utils"

interface BlockableOutlineButtonProps extends Omit<
  React.ComponentProps<typeof Button>,
  "variant" | "asChild" | "disabled" | "aria-disabled"
> {
  blocked?: boolean
}

const BlockableOutlineButton = ({
  blocked = false,
  type = "button",
  className,
  ...props
}: BlockableOutlineButtonProps) => {
  return (
    <Button
      type={type}
      variant="outline"
      aria-disabled={blocked || undefined}
      className={cn(
        blocked &&
          "cursor-not-allowed opacity-50 hover:bg-background dark:hover:bg-input/30",
        className,
      )}
      {...props}
    />
  )
}

export default BlockableOutlineButton
