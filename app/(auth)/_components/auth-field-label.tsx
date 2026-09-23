import { FieldLabel } from "@/app/_components/ui/field"
import { cn } from "@/app/_lib/utils"

interface AuthFieldLabelProps {
  htmlFor: string
  children: React.ReactNode
  className?: string
}

const AuthFieldLabel = ({
  htmlFor,
  children,
  className,
}: AuthFieldLabelProps) => {
  return (
    <FieldLabel
      htmlFor={htmlFor}
      className={cn(
        "text-xs font-bold tracking-widest text-muted-foreground uppercase",
        className,
      )}
    >
      {children}
    </FieldLabel>
  )
}

export default AuthFieldLabel
