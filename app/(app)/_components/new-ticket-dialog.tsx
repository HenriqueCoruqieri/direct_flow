"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2Icon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useId, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/app/_components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/_components/ui/dialog"
import { Field, FieldLabel } from "@/app/_components/ui/field"
import { Input } from "@/app/_components/ui/input"
import { createTicket } from "@/app/_lib/actions/tickets"
import { TICKET_CREATOR_LABEL } from "@/app/_lib/domain/ticket-assignee"
import type { NewTicketFormAvailable } from "@/app/_lib/types/ticket"
import {
  type CreateTicketInput,
  createTicketSchema,
} from "@/app/_lib/validation/ticket"

import NewTicketButton from "./new-ticket-button"
import TicketAssigneeField from "./ticket-assignee-field"
import TicketDescriptionField from "./ticket-description-field"
import TicketTagField from "./ticket-tag-field"
import TicketTitleField from "./ticket-title-field"
import TicketTypeField from "./ticket-type-field"

interface NewTicketDialogProps {
  options: NewTicketFormAvailable
}

const TAG_HINT =
  "A tag é utilizada para categorizar e mapear os maiores ofensores da fila de atendimento."

const NewTicketDialog = ({ options }: NewTicketDialogProps) => {
  const titleId = useId()
  const descriptionId = useId()
  const typeId = useId()
  const tagId = useId()
  const creatorId = useId()
  const assigneeId = useId()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const form = useForm<CreateTicketInput>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: options.defaults,
  })

  const isSubmitting = form.formState.isSubmitting

  const handleOpenChange = (nextOpen: boolean) => {
    if (isSubmitting) return
    if (!nextOpen) form.reset(options.defaults)
    setOpen(nextOpen)
  }

  const closeAndDiscard = () => {
    form.reset(options.defaults)
    setOpen(false)
  }

  const onSubmit = async (values: CreateTicketInput) => {
    const result = await createTicket(values)

    if (result.ok) {
      toast.success(result.message)
      closeAndDiscard()
      return
    }

    if (result.code === "INVALID_TAG") {
      form.setError("tagId", { message: result.message }, { shouldFocus: true })
      router.refresh()
      return
    }

    if (result.code === "INVALID_ASSIGNEE") {
      form.setError(
        "assigneeId",
        { message: result.message },
        { shouldFocus: true },
      )
      router.refresh()
      return
    }

    toast.error(result.message)

    if (result.code === "FORBIDDEN") {
      closeAndDiscard()
      router.refresh()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <NewTicketButton />
      </DialogTrigger>

      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-6 overflow-y-auto p-6 sm:max-w-lg">
        <form
          noValidate
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-6"
        >
          <DialogHeader>
            <DialogTitle>Novo chamado</DialogTitle>
            <DialogDescription>
              Descreva o chamado de forma clara, detalhada e objetiva.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <Controller
              name="title"
              control={form.control}
              render={({ field, fieldState }) => (
                <TicketTitleField
                  id={titleId}
                  {...field}
                  fieldState={fieldState}
                />
              )}
            />

            <Controller
              name="description"
              control={form.control}
              render={({ field, fieldState }) => (
                <TicketDescriptionField
                  id={descriptionId}
                  {...field}
                  fieldState={fieldState}
                />
              )}
            />

            <Controller
              name="type"
              control={form.control}
              render={({ field, fieldState }) => (
                <TicketTypeField
                  id={typeId}
                  {...field}
                  fieldState={fieldState}
                />
              )}
            />

            <Controller
              name="tagId"
              control={form.control}
              render={({ field, fieldState }) => (
                <TicketTagField
                  id={tagId}
                  label="Tags"
                  {...field}
                  fieldState={fieldState}
                  tags={options.tags}
                  hint={TAG_HINT}
                />
              )}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field className="min-w-0 gap-1.5">
                <FieldLabel htmlFor={creatorId}>
                  {TICKET_CREATOR_LABEL}
                </FieldLabel>
                <Input id={creatorId} value={options.creatorName} readOnly />
              </Field>

              <Controller
                name="assigneeId"
                control={form.control}
                render={({ field, fieldState }) => (
                  <TicketAssigneeField
                    id={assigneeId}
                    {...field}
                    fieldState={fieldState}
                    assignees={options.assignees}
                  />
                )}
              />
            </div>
          </div>

          <DialogFooter className="-mx-6 -mb-6 p-4">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSubmitting}>
                Cancelar
              </Button>
            </DialogClose>
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
              {isSubmitting ? "Enviando…" : "Abrir chamado"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default NewTicketDialog
