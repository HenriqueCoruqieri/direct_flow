"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2Icon, SendIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useId, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/app/_components/ui/button"
import { resolveTicket } from "@/app/_lib/actions/ticket-resolution"
import { SEND_TO_DEPARTMENT_LABEL } from "@/app/_lib/domain/ticket-transfer"
import type { ResolveTicketFormDefaults } from "@/app/_lib/types/ticket-resolution"
import {
  type ResolveTicketInput,
  resolveTicketSchema,
} from "@/app/_lib/validation/ticket-resolution"

import ConclusionBlockedActions from "./conclusion-blocked-actions"
import SendToDepartmentDialog, {
  type SendToDepartmentSetup,
} from "./send-to-department-dialog"
import TicketSolutionField from "./ticket-solution-field"

interface ResolveTicketFormProps {
  defaults: ResolveTicketFormDefaults
  sendToDepartment: SendToDepartmentSetup | null
}

const ResolveTicketForm = ({
  defaults,
  sendToDepartment,
}: ResolveTicketFormProps) => {
  const solutionId = useId()
  const router = useRouter()
  const [isSendDialogOpen, setIsSendDialogOpen] = useState(false)

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
    <>
      <form
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        <Controller
          name="solution"
          control={form.control}
          render={({ field, fieldState }) => (
            <TicketSolutionField
              id={solutionId}
              {...field}
              fieldState={fieldState}
            />
          )}
        />

        <div className="flex flex-wrap items-center justify-end gap-2">
          <ConclusionBlockedActions />
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
