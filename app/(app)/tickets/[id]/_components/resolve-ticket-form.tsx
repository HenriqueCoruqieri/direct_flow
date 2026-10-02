"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2Icon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useId } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/app/_components/ui/button"
import { Field, FieldError, FieldLabel } from "@/app/_components/ui/field"
import { Textarea } from "@/app/_components/ui/textarea"
import { resolveTicket } from "@/app/_lib/actions/ticket-resolution"
import type { ResolveTicketFormDefaults } from "@/app/_lib/types/ticket-resolution"
import {
  type ResolveTicketInput,
  resolveTicketSchema,
} from "@/app/_lib/validation/ticket-resolution"

import ConclusionBlockedActions from "./conclusion-blocked-actions"

interface ResolveTicketFormProps {
  defaults: ResolveTicketFormDefaults
}

const ResolveTicketForm = ({ defaults }: ResolveTicketFormProps) => {
  const solutionId = useId()
  const solutionErrorId = `${solutionId}-error`
  const router = useRouter()

  const form = useForm<ResolveTicketInput>({
    resolver: zodResolver(resolveTicketSchema),
    defaultValues: defaults,
  })

  const isSubmitting = form.formState.isSubmitting

  const onSubmit = async (values: ResolveTicketInput) => {
    const result = await resolveTicket(values)

    if (result.ok) {
      toast.success(result.message)
      return
    }

    if (result.code === "INVALID_INPUT") {
      form.setError(
        "solution",
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
    <form
      noValidate
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
    >
      <Controller
        name="solution"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid} className="gap-1.5">
            <FieldLabel htmlFor={solutionId}>Solução</FieldLabel>
            <Textarea
              ref={field.ref}
              id={solutionId}
              name={field.name}
              value={field.value}
              disabled={field.disabled}
              onChange={field.onChange}
              onBlur={field.onBlur}
              rows={4}
              className="max-h-80 min-h-24"
              aria-invalid={fieldState.invalid}
              aria-describedby={
                fieldState.invalid ? solutionErrorId : undefined
              }
            />
            {fieldState.invalid ? (
              <FieldError id={solutionErrorId} errors={[fieldState.error]} />
            ) : null}
          </Field>
        )}
      />

      <div className="flex flex-wrap items-center justify-end gap-2">
        <ConclusionBlockedActions />
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
          {isSubmitting ? "Resolvendo…" : "Resolver"}
        </Button>
      </div>
    </form>
  )
}

export default ResolveTicketForm
