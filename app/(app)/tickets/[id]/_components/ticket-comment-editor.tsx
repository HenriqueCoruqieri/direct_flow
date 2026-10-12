"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2Icon, PencilIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useId, useRef, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/app/_components/ui/button"
import { Field, FieldError, FieldLabel } from "@/app/_components/ui/field"
import { Textarea } from "@/app/_components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/app/_components/ui/tooltip"
import { editTicketComment } from "@/app/_lib/actions/ticket-comments"
import {
  EDIT_COMMENT_LABEL,
  SAVE_COMMENT_LABEL,
  SAVE_COMMENT_PENDING_LABEL,
} from "@/app/_lib/domain/ticket-comments"
import type { EditTicketCommentFormDefaults } from "@/app/_lib/types/ticket-comments"
import {
  type EditTicketCommentInput,
  editTicketCommentSchema,
} from "@/app/_lib/validation/ticket-comments"

import { useFocusReturnTooltip } from "../_hooks/use-focus-return-tooltip"
import TicketCommentBody from "./ticket-comment-body"

interface TicketCommentEditorProps {
  defaults: EditTicketCommentFormDefaults
  editAriaLabel: string
  actions?: React.ReactNode
  children: React.ReactNode
}

const TicketCommentEditor = ({
  defaults,
  editAriaLabel,
  actions,
  children,
}: TicketCommentEditorProps) => {
  const contentId = useId()
  const contentErrorId = `${contentId}-error`
  const router = useRouter()
  const editButtonRef = useRef<HTMLButtonElement>(null)
  const wasEditingRef = useRef(false)
  const [isEditing, setIsEditing] = useState(false)
  const { tooltipProps, triggerProps, markFocusReturn } =
    useFocusReturnTooltip()

  const form = useForm<EditTicketCommentInput>({
    resolver: zodResolver(editTicketCommentSchema),
    defaultValues: defaults,
  })

  const isSubmitting = form.formState.isSubmitting

  useEffect(() => {
    if (isEditing) {
      wasEditingRef.current = true
      form.setFocus("content")
      return
    }
    if (wasEditingRef.current) {
      wasEditingRef.current = false
      const editButton = editButtonRef.current
      if (editButton === null) return
      markFocusReturn()
      editButton.focus()
    }
  }, [isEditing, form, markFocusReturn])

  const startEditing = () => {
    form.reset(defaults)
    setIsEditing(true)
  }

  const cancelEditing = () => {
    if (isSubmitting) return
    form.reset(defaults)
    setIsEditing(false)
  }

  const onSubmit = async (values: EditTicketCommentInput) => {
    const result = await editTicketComment(values)

    if (result.ok) {
      toast.success(result.message)
      setIsEditing(false)
      return
    }

    if (result.code === "NO_CHANGES") {
      toast.info(result.message)
      setIsEditing(false)
      return
    }

    if (result.code === "INVALID_INPUT") {
      form.setError(
        "content",
        { message: result.message },
        { shouldFocus: true },
      )
      return
    }

    toast.error(result.message)

    if (result.code === "FORBIDDEN" || result.code === "NOT_FOUND") {
      setIsEditing(false)
      router.refresh()
    }
  }

  if (!isEditing) {
    return (
      <TicketCommentBody
        actions={
          <>
            <Tooltip {...tooltipProps}>
              <TooltipTrigger asChild {...triggerProps}>
                <Button
                  ref={editButtonRef}
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground"
                  aria-label={editAriaLabel}
                  onClick={startEditing}
                >
                  <PencilIcon aria-hidden="true" className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent hideWhenDetached>
                {EDIT_COMMENT_LABEL}
              </TooltipContent>
            </Tooltip>
            {actions}
          </>
        }
      >
        {children}
      </TicketCommentBody>
    )
  }

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-2"
    >
      <Controller
        name="content"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid} className="gap-1.5">
            <FieldLabel htmlFor={contentId} className="sr-only">
              Comentário
            </FieldLabel>
            <Textarea
              ref={field.ref}
              id={contentId}
              name={field.name}
              value={field.value}
              disabled={field.disabled}
              onChange={field.onChange}
              onBlur={field.onBlur}
              rows={3}
              className="max-h-48 min-h-20"
              aria-invalid={fieldState.invalid}
              aria-describedby={fieldState.invalid ? contentErrorId : undefined}
            />
            {fieldState.invalid ? (
              <FieldError id={contentErrorId} errors={[fieldState.error]} />
            ) : null}
          </Field>
        )}
      />

      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isSubmitting}
          onClick={cancelEditing}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={isSubmitting}
          aria-busy={isSubmitting || undefined}
        >
          {isSubmitting ? (
            <Loader2Icon
              aria-hidden="true"
              data-icon="inline-start"
              className="size-3.5 animate-spin motion-reduce:animate-none"
            />
          ) : null}
          {isSubmitting ? SAVE_COMMENT_PENDING_LABEL : SAVE_COMMENT_LABEL}
        </Button>
      </div>
    </form>
  )
}

export default TicketCommentEditor
