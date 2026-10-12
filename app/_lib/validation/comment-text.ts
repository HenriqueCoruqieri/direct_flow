import { z } from "zod"

import {
  TICKET_COMMENT_MAX_LENGTH,
  TICKET_COMMENT_MIN_LENGTH,
} from "@/app/_lib/domain/ticket-comments"
import {
  HANDOFF_COMMENT_REQUIRED_MESSAGE,
  HANDOFF_COMMENT_TOO_LONG_MESSAGE,
} from "@/app/_lib/domain/ticket-handoff"

interface CommentTextMessages {
  required: string
  tooLong: string
}

export const commentTextSchema = (messages: CommentTextMessages) =>
  z
    .string({ error: messages.required })
    .trim()
    .min(TICKET_COMMENT_MIN_LENGTH, { error: messages.required })
    .max(TICKET_COMMENT_MAX_LENGTH, { error: messages.tooLong })

export const handoffCommentSchema = commentTextSchema({
  required: HANDOFF_COMMENT_REQUIRED_MESSAGE,
  tooLong: HANDOFF_COMMENT_TOO_LONG_MESSAGE,
})
