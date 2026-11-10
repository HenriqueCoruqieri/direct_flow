"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2Icon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useId } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import FormField from "@/app/_components/form-field"
import FormSchemaProvider from "@/app/_components/form-schema-provider"
import { Button } from "@/app/_components/ui/button"
import { Checkbox } from "@/app/_components/ui/checkbox"
import { Field, FieldLabel } from "@/app/_components/ui/field"
import { Textarea } from "@/app/_components/ui/textarea"
import { addTicketComment } from "@/app/_lib/actions/ticket-comments"
import { PRIVATE_COMMENT_LABEL } from "@/app/_lib/domain/ticket-comments"
import type { TicketCommentFormDefaults } from "@/app/_lib/types/ticket-comments"
import {
  type CreateTicketCommentInput,
  createTicketCommentSchema,
} from "@/app/_lib/validation/ticket-comments"

interface TicketCommentFormProps {
  defaults: TicketCommentFormDefaults
}

const TicketCommentForm = ({ defaults }: TicketCommentFormProps) => {
  const contentId = useId()
  const privateId = useId()
  const router = useRouter()

  const form = useForm<CreateTicketCommentInput>({
    resolver: zodResolver(createTicketCommentSchema),
    defaultValues: defaults,
  })

  const isSubmitting = form.formState.isSubmitting

  const onSubmit = async (values: CreateTicketCommentInput) => {
    const result = await addTicketComment(values)

    if (result.ok) {
      toast.success(result.message)
      form.reset(defaults)
      document.getElementById(contentId)?.style.removeProperty("height")
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
      router.refresh()
    }
  }

  return (
    <FormSchemaProvider form={form} schema={createTicketCommentSchema}>
      <form
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-3"
      >
        <FormField
          control={form.control}
          name="content"
          label="Comentário"
          id={contentId}
        >
          {(field) => (
            <Textarea {...field} rows={3} className="max-h-48 min-h-20" />
          )}
        </FormField>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Controller
            name="isPrivate"
            control={form.control}
            render={({ field }) => (
              <Field orientation="horizontal" className="w-auto gap-2">
                <Checkbox
                  ref={field.ref}
                  id={privateId}
                  name={field.name}
                  checked={field.value}
                  disabled={field.disabled}
                  onCheckedChange={(checked) =>
                    field.onChange(checked === true)
                  }
                  onBlur={field.onBlur}
                />
                <FieldLabel htmlFor={privateId} className="font-normal">
                  {PRIVATE_COMMENT_LABEL}
                </FieldLabel>
              </Field>
            )}
          />

          <Button
            type="submit"
            disabled={isSubmitting}
            aria-busy={isSubmitting || undefined}
          >
            {isSubmitting ? (
              <Loader2Icon
                aria-hidden="true"
                className="size-4 animate-spin motion-reduce:animate-none"
              />
            ) : null}
            {isSubmitting ? "Publicando…" : "Comentar"}
          </Button>
        </div>
      </form>
    </FormSchemaProvider>
  )
}

export default TicketCommentForm
