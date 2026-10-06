import ComboboxField, {
  type ComboboxFieldProps,
} from "@/app/_components/combobox-field"
import { TICKET_ASSIGNEE_LABEL } from "@/app/_lib/domain/ticket-assignee"
import type { AssigneeOption } from "@/app/_lib/types/ticket"

interface TicketAssigneeFieldProps extends Omit<
  ComboboxFieldProps<number>,
  "label" | "options" | "placeholder" | "searchPlaceholder" | "className"
> {
  assignees: readonly AssigneeOption[]
}

const TicketAssigneeField = ({
  assignees,
  ...props
}: TicketAssigneeFieldProps) => (
  <ComboboxField
    {...props}
    label={TICKET_ASSIGNEE_LABEL}
    options={assignees.map((assignee) => ({
      value: assignee.id,
      label: assignee.name,
    }))}
    placeholder="Selecione o destinatário"
    searchPlaceholder="Buscar pessoa…"
    className="min-w-0"
  />
)

export default TicketAssigneeField
