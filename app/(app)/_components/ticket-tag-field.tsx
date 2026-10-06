import ComboboxField, {
  type ComboboxFieldProps,
} from "@/app/_components/combobox-field"
import type { TagOption } from "@/app/_lib/types/tag"

interface TicketTagFieldProps extends Omit<
  ComboboxFieldProps<number>,
  "options" | "placeholder" | "searchPlaceholder" | "className"
> {
  tags: readonly TagOption[]
}

const TicketTagField = ({ tags, ...props }: TicketTagFieldProps) => (
  <ComboboxField
    {...props}
    options={tags.map((tag) => ({ value: tag.id, label: tag.name }))}
    placeholder="Selecione a tag"
    searchPlaceholder="Buscar tag…"
  />
)

export default TicketTagField
