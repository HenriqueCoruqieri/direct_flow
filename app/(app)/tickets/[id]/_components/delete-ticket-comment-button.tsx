"use client"

import { Loader2Icon, Trash2Icon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useRef, useState, useTransition } from "react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/app/_components/ui/alert-dialog"
import { Button } from "@/app/_components/ui/button"
import {
  deleteTicketComment,
  type DeleteTicketCommentErrorCode,
} from "@/app/_lib/actions/ticket-comments"
import {
  DELETE_COMMENT_DIALOG_DESCRIPTION,
  DELETE_COMMENT_DIALOG_TITLE,
  DELETE_COMMENT_LABEL,
  DELETE_COMMENT_PENDING_LABEL,
} from "@/app/_lib/domain/ticket-comments"
import type { DeleteTicketCommentTarget } from "@/app/_lib/types/ticket-comments"

const STALE_COMMENT_CODES: ReadonlySet<DeleteTicketCommentErrorCode> = new Set([
  "NOT_FOUND",
  "FORBIDDEN",
])

interface DeleteTicketCommentButtonProps {
  target: DeleteTicketCommentTarget
  ariaLabel: string
  focusAfterLeaveId: string
}

const DeleteTicketCommentButton = ({
  target,
  ariaLabel,
  focusAfterLeaveId,
}: DeleteTicketCommentButtonProps) => {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const leftItemRef = useRef(false)
  const [isPending, startTransition] = useTransition()

  const handleOpenChange = (nextOpen: boolean) => {
    if (isPending) return
    setOpen(nextOpen)
  }

  const handleConfirm = () => {
    if (isPending) return

    startTransition(async () => {
      const result = await deleteTicketComment(target)

      if (result.ok) {
        leftItemRef.current = true
        toast.success(result.message)
      } else {
        toast.error(result.message)
        if (result.code !== undefined && STALE_COMMENT_CODES.has(result.code)) {
          leftItemRef.current = true
          router.refresh()
        }
      }

      startTransition(() => {
        setOpen(false)
      })
    })
  }

  const handleCloseAutoFocus = (event: Event) => {
    if (!leftItemRef.current) return

    event.preventDefault()
    leftItemRef.current = false
    document.getElementById(focusAfterLeaveId)?.focus()
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          disabled={isPending}
          aria-label={ariaLabel}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2Icon aria-hidden="true" data-icon="inline-start" />
          {DELETE_COMMENT_LABEL}
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent onCloseAutoFocus={handleCloseAutoFocus}>
        <AlertDialogHeader>
          <AlertDialogTitle>{DELETE_COMMENT_DIALOG_TITLE}</AlertDialogTitle>
          <AlertDialogDescription>
            {DELETE_COMMENT_DIALOG_DESCRIPTION}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            disabled={isPending}
            aria-busy={isPending || undefined}
            onClick={handleConfirm}
          >
            {isPending ? (
              <Loader2Icon
                aria-hidden="true"
                className="size-4 animate-spin motion-reduce:animate-none"
              />
            ) : null}
            {isPending ? DELETE_COMMENT_PENDING_LABEL : DELETE_COMMENT_LABEL}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default DeleteTicketCommentButton
