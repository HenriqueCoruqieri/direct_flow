"use client"

import { useId } from "react"
import { Controller } from "react-hook-form"

import { TICKET_CREATOR_LABEL } from "@/app/_lib/domain/ticket-assignee"

import TicketAssigneeField from "../../../_components/ticket-assignee-field"
import { useTicketEdit } from "../_hooks/use-ticket-edit"
import TicketDetailFieldList, {
  TICKET_DETAIL_FIELD_GRID_CLASS,
} from "./ticket-detail-field-list"

interface TicketEditAssigneeProps {
  creatorName: string
  children: React.ReactNode
}

const TicketEditAssignee = ({
  creatorName,
  children,
}: TicketEditAssigneeProps) => {
  const assigneeId = useId()
  const { form, assignees, assigneeHint, queueLabel, isEditing } =
    useTicketEdit()

  if (!isEditing) return children

  return (
    <div className={TICKET_DETAIL_FIELD_GRID_CLASS}>
      <TicketDetailFieldList
        fields={[{ label: TICKET_CREATOR_LABEL, value: creatorName }]}
        className="sm:grid-cols-1"
      />
      <Controller
        name="assigneeId"
        control={form.control}
        render={({ field, fieldState }) => (
          <TicketAssigneeField
            id={assigneeId}
            {...field}
            fieldState={fieldState}
            assignees={assignees}
            hint={assigneeHint}
            queueLabel={queueLabel}
          />
        )}
      />
    </div>
  )
}

export default TicketEditAssignee
