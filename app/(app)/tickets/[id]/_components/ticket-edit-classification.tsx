"use client"

import { useId } from "react"
import { Controller } from "react-hook-form"

import TicketTagField from "../../../_components/ticket-tag-field"
import TicketTypeField from "../../../_components/ticket-type-field"
import { useTicketEdit } from "../_hooks/use-ticket-edit"
import { TICKET_DETAIL_FIELD_GRID_CLASS } from "./ticket-detail-field-list"

interface TicketEditClassificationProps {
  children: React.ReactNode
}

const TicketEditClassification = ({
  children,
}: TicketEditClassificationProps) => {
  const typeId = useId()
  const tagId = useId()
  const { form, tags, tagHint, isEditing } = useTicketEdit()

  if (!isEditing) return children

  return (
    <div className={TICKET_DETAIL_FIELD_GRID_CLASS}>
      <Controller
        name="type"
        control={form.control}
        render={({ field, fieldState }) => (
          <TicketTypeField id={typeId} {...field} fieldState={fieldState} />
        )}
      />
      <Controller
        name="tagId"
        control={form.control}
        render={({ field, fieldState }) => (
          <TicketTagField
            id={tagId}
            label="Tag"
            {...field}
            fieldState={fieldState}
            tags={tags}
            hint={tagHint}
          />
        )}
      />
    </div>
  )
}

export default TicketEditClassification
