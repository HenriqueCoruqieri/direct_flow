"use client"

import { useWatch } from "react-hook-form"

import FormField from "@/app/_components/form-field"
import {
  EMPTY_HANDOFF_COMMENT,
  HANDOFF_COMMENT_DESCRIPTION,
  HANDOFF_COMMENT_LABEL,
  isHandoffAssigneeChange,
} from "@/app/_lib/domain/ticket-handoff"

import HandoffCommentTextarea from "../../../_components/handoff-comment-textarea"
import { useTicketEdit } from "../_hooks/use-ticket-edit"

const TicketEditHandoffComment = () => {
  const { form, initialAssigneeId, isSubmitting } = useTicketEdit()
  const assigneeId = useWatch({ control: form.control, name: "assigneeId" })

  if (!isHandoffAssigneeChange(initialAssigneeId, assigneeId)) return null

  return (
    <FormField
      control={form.control}
      name="handoffComment"
      label={HANDOFF_COMMENT_LABEL}
      required
      shouldUnregister
      defaultValue={EMPTY_HANDOFF_COMMENT}
      description={HANDOFF_COMMENT_DESCRIPTION}
      className="col-span-full min-w-0"
    >
      {(field) => <HandoffCommentTextarea {...field} disabled={isSubmitting} />}
    </FormField>
  )
}

export default TicketEditHandoffComment
