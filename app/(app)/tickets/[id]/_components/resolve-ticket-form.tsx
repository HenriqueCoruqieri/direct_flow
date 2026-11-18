"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2Icon, SendIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { use, useId, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import FormField from "@/app/_components/form-field"
import FormRequiredMark from "@/app/_components/form-required-mark"
import FormSchemaProvider from "@/app/_components/form-schema-provider"
import { Button } from "@/app/_components/ui/button"
import { resolveTicket } from "@/app/_lib/actions/ticket-resolution"
import { SEND_TO_DEPARTMENT_LABEL } from "@/app/_lib/domain/ticket-transfer"
import type { ResolveTicketFormDefaults } from "@/app/_lib/types/ticket-resolution"
import {
  type ResolveTicketInput,
  resolveTicketSchema,
} from "@/app/_lib/validation/ticket-resolution"

import { TicketEditContext } from "../_hooks/use-ticket-edit"
import HiddenWhileEditing from "./hidden-while-editing"
import SendToDepartmentDialog, {
  type SendToDepartmentSetup,
} from "./send-to-department-dialog"
import TicketSolutionHeading, {
  TICKET_SOLUTION_TITLE,
} from "./ticket-solution-heading"
import TicketTextArea from "./ticket-text-area"

interface ResolveTicketFormProps {
  defaults: ResolveTicketFormDefaults
  sendToDepartment: SendToDepartmentSetup | null
  editable: boolean
  editingReplacement: React.ReactNode
}

const ResolveTicketForm = ({
  defaults,
  sendToDepartment,
  editable,
  editingReplacement,
}: ResolveTicketFormProps) => {
  const formId = useId()
  const router = useRouter()
  const [isSendDialogOpen, setIsSendDialogOpen] = useState(false)
  const isEditing = use(TicketEditContext)?.isEditing ?? false

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

  const solutionForm = (
    <form
      id={formId}
      noValidate
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex min-w-0 flex-col gap-4"
    >
      <FormField
        control={form.control}
        name="solution"
        label={TICKET_SOLUTION_TITLE}
        hideLabel
      >
        {(field) => <TicketTextArea {...field} />}
      </FormField>
    </form>
  )

  const actionBar = (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {sendToDepartment !== null ? (
        <Button
          type="button"
          variant="outline"
          disabled={isSubmitting}
          aria-haspopup="dialog"
          onClick={() => setIsSendDialogOpen(true)}
        >
          <SendIcon aria-hidden="true" className="size-4" />
          {SEND_TO_DEPARTMENT_LABEL}
        </Button>
      ) : null}
      <Button
        type="submit"
        form={formId}
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
  )

  return (
    <>
      <FormSchemaProvider form={form} schema={resolveTicketSchema}>
        <TicketSolutionHeading
          mark={
            isEditing ? null : (
              <FormRequiredMark control={form.control} name="solution" />
            )
          }
        />
        {editable ? (
          <HiddenWhileEditing replacement={editingReplacement}>
            {solutionForm}
          </HiddenWhileEditing>
        ) : (
          solutionForm
        )}
        {editable ? (
          <HiddenWhileEditing replacement={null}>
            {actionBar}
          </HiddenWhileEditing>
        ) : (
          actionBar
        )}
      </FormSchemaProvider>

      {sendToDepartment !== null ? (
        <SendToDepartmentDialog
          {...sendToDepartment}
          open={isSendDialogOpen}
          onOpenChange={setIsSendDialogOpen}
        />
      ) : null}
    </>
  )
}

export default ResolveTicketForm
