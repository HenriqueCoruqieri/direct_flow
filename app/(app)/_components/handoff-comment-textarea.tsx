import type { FormFieldA11yProps } from "@/app/_components/form-field"
import { Textarea } from "@/app/_components/ui/textarea"
import { HANDOFF_COMMENT_PLACEHOLDER } from "@/app/_lib/domain/ticket-handoff"

interface HandoffCommentTextareaProps extends FormFieldA11yProps {
  name?: string
  value: string | undefined
  disabled?: boolean
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void
  onBlur: () => void
  ref?: React.Ref<HTMLTextAreaElement>
}

const HandoffCommentTextarea = (props: HandoffCommentTextareaProps) => (
  <Textarea
    {...props}
    placeholder={HANDOFF_COMMENT_PLACEHOLDER}
    rows={4}
    className="max-h-60 min-h-24"
  />
)

export default HandoffCommentTextarea
