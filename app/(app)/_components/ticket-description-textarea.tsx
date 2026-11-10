import type { FormFieldA11yProps } from "@/app/_components/form-field"
import { Textarea } from "@/app/_components/ui/textarea"

interface TicketDescriptionTextareaProps extends FormFieldA11yProps {
  name?: string
  value: string | undefined
  disabled?: boolean
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void
  onBlur: () => void
  ref?: React.Ref<HTMLTextAreaElement>
}

const TicketDescriptionTextarea = (props: TicketDescriptionTextareaProps) => (
  <Textarea {...props} rows={5} className="max-h-64 min-h-28" />
)

export default TicketDescriptionTextarea
