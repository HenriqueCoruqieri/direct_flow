import type { FormFieldA11yProps } from "@/app/_components/form-field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/_components/ui/select"
import { TICKET_TYPE_LABELS, TICKET_TYPES } from "@/app/_lib/domain/ticket"
import type { TicketType } from "@/app/_lib/types/ticket"

interface TicketTypeSelectProps extends FormFieldA11yProps {
  name?: string
  value: TicketType | undefined
  disabled?: boolean
  onChange: (value: TicketType | undefined) => void
  onBlur: () => void
  ref?: React.Ref<HTMLButtonElement>
}

const ticketTypeFromValue = (value: string): TicketType | undefined =>
  TICKET_TYPES.find((type) => type === value)

const TicketTypeSelect = ({
  name,
  value,
  disabled,
  onChange,
  ...trigger
}: TicketTypeSelectProps) => (
  <Select
    name={name}
    value={value ?? ""}
    onValueChange={(next) => onChange(ticketTypeFromValue(next))}
    disabled={disabled}
  >
    <SelectTrigger {...trigger} className="w-full">
      <SelectValue placeholder="Selecione o tipo" />
    </SelectTrigger>
    <SelectContent>
      {TICKET_TYPES.map((type) => (
        <SelectItem key={type} value={type}>
          {TICKET_TYPE_LABELS[type]}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
)

export default TicketTypeSelect
