import type { FormFieldA11yProps } from "@/app/_components/form-field"
import { Textarea } from "@/app/_components/ui/textarea"

interface TicketTextAreaProps extends FormFieldA11yProps {
  name?: string
  value: string | undefined
  placeholder?: string
  disabled?: boolean
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void
  onBlur: () => void
  ref?: React.Ref<HTMLTextAreaElement>
}

const TicketTextArea = (props: TicketTextAreaProps) => (
  <Textarea {...props} rows={4} className="max-h-80 min-h-24" />
)

export default TicketTextArea
