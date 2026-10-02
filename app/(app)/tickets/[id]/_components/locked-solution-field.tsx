import { Field, FieldLabel } from "@/app/_components/ui/field"
import { Textarea } from "@/app/_components/ui/textarea"
import { cn } from "@/app/_lib/utils"

const LOCKED_SOLUTION_ID = "ticket-locked-solution"

interface LockedSolutionFieldProps {
  value: string
  muted?: boolean
}

const LockedSolutionField = ({
  value,
  muted = false,
}: LockedSolutionFieldProps) => {
  return (
    <Field className="gap-1.5">
      <FieldLabel htmlFor={LOCKED_SOLUTION_ID}>Solução</FieldLabel>
      <Textarea
        id={LOCKED_SOLUTION_ID}
        value={value}
        readOnly
        rows={2}
        className={cn(
          "resize-none wrap-break-word whitespace-pre-wrap",
          muted && "text-muted-foreground",
        )}
      />
    </Field>
  )
}

export default LockedSolutionField
