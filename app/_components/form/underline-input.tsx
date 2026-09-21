import { Input } from "@/app/_components/ui/input"
import { cn } from "@/app/_lib/utils"

interface UnderlineInputProps extends React.ComponentProps<typeof Input> {
  trailing?: React.ReactNode
  containerClassName?: string
}

export function UnderlineInput({
  trailing,
  containerClassName,
  className,
  ...props
}: UnderlineInputProps) {
  return (
    <div
      data-slot="underline-input"
      className={cn(
        "flex w-full items-center gap-3 border-b border-input transition-[border-color,box-shadow]",
        "focus-within:border-text-secondary focus-within:shadow-underline focus-within:shadow-text-secondary",
        "has-[input[aria-invalid=true]]:border-destructive has-[input[aria-invalid=true]]:shadow-destructive",
        "has-[input:disabled]:opacity-50",
        containerClassName,
      )}
    >
      <Input
        className={cn(
          "h-12 flex-1 rounded-none border-0 bg-transparent px-0 py-0 pl-2 text-base text-foreground shadow-none md:text-base",
          "focus-visible:border-0 focus-visible:ring-0",
          "aria-invalid:border-0 aria-invalid:ring-0",
          "disabled:bg-transparent dark:bg-transparent dark:disabled:bg-transparent dark:aria-invalid:ring-0",
          className,
        )}
        {...props}
      />
      {trailing}
    </div>
  )
}
