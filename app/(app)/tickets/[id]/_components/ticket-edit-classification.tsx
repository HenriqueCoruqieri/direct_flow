"use client"

import FormField from "@/app/_components/form-field"

import TicketTagCombobox from "../../../_components/ticket-tag-combobox"
import TicketTypeSelect from "../../../_components/ticket-type-select"
import { useTicketEdit } from "../_hooks/use-ticket-edit"
import { TICKET_DETAIL_FIELD_GRID_CLASS } from "./ticket-detail-field-list"

interface TicketEditClassificationProps {
  children: React.ReactNode
}

const TicketEditClassification = ({
  children,
}: TicketEditClassificationProps) => {
  const { form, tags, tagHint, isEditing } = useTicketEdit()

  if (!isEditing) return children

  return (
    <div className={TICKET_DETAIL_FIELD_GRID_CLASS}>
      <FormField control={form.control} name="type" label="Tipo">
        {(field) => <TicketTypeSelect {...field} />}
      </FormField>
      <FormField
        control={form.control}
        name="tagId"
        label="Tag"
        description={tagHint}
      >
        {(field) => <TicketTagCombobox {...field} tags={tags} />}
      </FormField>
    </div>
  )
}

export default TicketEditClassification
