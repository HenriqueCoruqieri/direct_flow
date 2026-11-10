"use client"

import FormField from "@/app/_components/form-field"
import {
  TICKET_ASSIGNEE_LABEL,
  TICKET_CREATOR_LABEL,
} from "@/app/_lib/domain/ticket-assignee"

import TicketAssigneeCombobox from "../../../_components/ticket-assignee-combobox"
import { useTicketEdit } from "../_hooks/use-ticket-edit"
import TicketDetailFieldList, {
  TICKET_DETAIL_FIELD_GRID_CLASS,
} from "./ticket-detail-field-list"
import TicketEditHandoffComment from "./ticket-edit-handoff-comment"

interface TicketEditAssigneeProps {
  creatorName: string
  children: React.ReactNode
}

const TicketEditAssignee = ({
  creatorName,
  children,
}: TicketEditAssigneeProps) => {
  const { form, assignees, assigneeHint, queueLabel, isEditing } =
    useTicketEdit()

  if (!isEditing) return children

  return (
    <div className={TICKET_DETAIL_FIELD_GRID_CLASS}>
      <TicketDetailFieldList
        fields={[{ label: TICKET_CREATOR_LABEL, value: creatorName }]}
        className="sm:grid-cols-1"
      />
      <FormField
        control={form.control}
        name="assigneeId"
        label={TICKET_ASSIGNEE_LABEL}
        description={assigneeHint}
        className="min-w-0"
      >
        {(field) => (
          <TicketAssigneeCombobox
            {...field}
            assignees={assignees}
            queueLabel={queueLabel}
          />
        )}
      </FormField>
      <TicketEditHandoffComment />
    </div>
  )
}

export default TicketEditAssignee
