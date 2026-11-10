import Combobox from "@/app/_components/combobox"
import type { FormFieldA11yProps } from "@/app/_components/form-field"
import type { TagOption } from "@/app/_lib/types/tag"

interface TicketTagComboboxProps extends FormFieldA11yProps {
  value: number | undefined
  disabled?: boolean
  onChange: (value: number) => void
  onBlur: () => void
  ref?: React.Ref<HTMLButtonElement>
  tags: readonly TagOption[]
}

const TicketTagCombobox = ({
  id,
  value,
  disabled,
  onChange,
  onBlur,
  ref,
  tags,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
  "aria-required": ariaRequired,
  "aria-labelledby": ariaLabelledBy,
}: TicketTagComboboxProps) => (
  <Combobox
    id={id}
    ref={ref}
    options={tags.map((tag) => ({ value: tag.id, label: tag.name }))}
    value={value}
    onChange={onChange}
    onBlur={onBlur}
    disabled={disabled}
    placeholder="Selecione a tag"
    searchPlaceholder="Buscar tag…"
    aria-invalid={ariaInvalid}
    aria-describedby={ariaDescribedBy}
    aria-required={ariaRequired}
    aria-labelledby={ariaLabelledBy}
  />
)

export default TicketTagCombobox
