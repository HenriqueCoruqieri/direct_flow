import type { FormFieldA11yProps } from "@/app/_components/form-field"
import { Textarea } from "@/app/_components/ui/textarea"

interface TicketSolutionTextareaProps extends FormFieldA11yProps {
  name?: string
  value: string | undefined
  disabled?: boolean
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void
  onBlur: () => void
  ref?: React.Ref<HTMLTextAreaElement>
}

const TicketSolutionTextarea = (props: TicketSolutionTextareaProps) => (
  <Textarea {...props} rows={4} className="max-h-80 min-h-24" />
)

export default TicketSolutionTextarea
