"use client"

import { useId } from "react"
import { Controller, useWatch } from "react-hook-form"

import {
  EMPTY_HANDOFF_COMMENT,
  HANDOFF_COMMENT_DESCRIPTION,
  isHandoffAssigneeChange,
} from "@/app/_lib/domain/ticket-handoff"

import HandoffCommentField from "../../../_components/handoff-comment-field"
import { useTicketEdit } from "../_hooks/use-ticket-edit"

const TicketEditHandoffComment = () => {
  const commentId = useId()
  const { form, initialAssigneeId, isSubmitting } = useTicketEdit()
  const assigneeId = useWatch({ control: form.control, name: "assigneeId" })

  if (!isHandoffAssigneeChange(initialAssigneeId, assigneeId)) return null

  return (
    <Controller
      name="handoffComment"
      control={form.control}
      shouldUnregister
      defaultValue={EMPTY_HANDOFF_COMMENT}
      render={({ field, fieldState }) => (
        <HandoffCommentField
          id={commentId}
          {...field}
          disabled={isSubmitting}
          fieldState={fieldState}
          description={HANDOFF_COMMENT_DESCRIPTION}
          className="col-span-full"
        />
      )}
    />
  )
}

export default TicketEditHandoffComment
