"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2Icon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useId, useState } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
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
import {
  ticketPriorityLockFor,
  ticketPriorityOnTagChange,
} from "@/app/_lib/domain/tag-priority"
import { INITIAL_TICKET_PRIORITY } from "@/app/_lib/domain/ticket"
import { TICKET_CREATOR_LABEL } from "@/app/_lib/domain/ticket-assignee"
import type { NewTicketFormAvailable } from "@/app/_lib/types/ticket"
import { cn } from "@/app/_lib/utils"
import {
  type CreateTicketFormValues,
  type CreateTicketInput,
  createTicketSchema,
} from "@/app/_lib/validation/ticket"

import {
  type AttachmentUploaderBusy,
  attachmentUploadsBlockMessage,
} from "../_hooks/use-attachment-uploads"
import AttachmentUploader from "./attachment-uploader"
import NewTicketButton from "./new-ticket-button"
import TicketAssigneeField from "./ticket-assignee-field"
import TicketDescriptionField from "./ticket-description-field"
import TicketPriorityField from "./ticket-priority-field"
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
  const priorityId = useId()
  const tagId = useId()
  const creatorId = useId()
  const assigneeId = useId()
  const submitBlockId = useId()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [uploadsBusy, setUploadsBusy] = useState<AttachmentUploaderBusy>("idle")

  const form = useForm<CreateTicketFormValues, unknown, CreateTicketInput>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: options.defaults,
  })

  const selectedTagId = useWatch({ control: form.control, name: "tagId" })
  const priorityLock = ticketPriorityLockFor(options.tags, selectedTagId)

  const isSubmitting = form.formState.isSubmitting
  const submitBlockMessage = attachmentUploadsBlockMessage(uploadsBusy)

  const discard = () => {
    form.reset(options.defaults)
    setUploadsBusy("idle")
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (isSubmitting) return
    if (!nextOpen) discard()
    setOpen(nextOpen)
  }

  const closeAndDiscard = () => {
    discard()
    setOpen(false)
  }

  const keepOpenOnToast = (event: Event) => {
    if (
      event.target instanceof Element &&
      event.target.closest("[data-sonner-toaster]") !== null
    ) {
      event.preventDefault()
    }
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

  const submitWhenValid = form.handleSubmit(onSubmit)

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    if (submitBlockMessage !== null) {
      event.preventDefault()
      toast.info(submitBlockMessage, { id: submitBlockId })
      return
    }

    return submitWhenValid(event)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <NewTicketButton />
      </DialogTrigger>

      <DialogContent
        onInteractOutside={keepOpenOnToast}
        className="max-h-[calc(100dvh-2rem)] gap-6 overflow-y-auto p-6 sm:max-w-lg"
      >
        <form
          noValidate
          onSubmit={handleFormSubmit}
          className="flex min-w-0 flex-col gap-6"
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
              name="attachments"
              control={form.control}
              render={({ field, fieldState }) => (
                <AttachmentUploader
                  ref={field.ref}
                  onChange={field.onChange}
                  onBusyChange={setUploadsBusy}
                  disabled={isSubmitting}
                  fieldState={fieldState}
                />
              )}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                name="priority"
                control={form.control}
                render={({ field, fieldState }) => (
                  <TicketPriorityField
                    id={priorityId}
                    {...field}
                    value={priorityLock ? priorityLock.priority : field.value}
                    disabled={priorityLock !== null || field.disabled}
                    hint={priorityLock?.hint}
                    fieldState={fieldState}
                  />
                )}
              />
            </div>

            <Controller
              name="tagId"
              control={form.control}
              render={({ field, fieldState }) => (
                <TicketTagField
                  id={tagId}
                  label="Tags"
                  {...field}
                  onChange={(nextTagId) => {
                    form.setValue(
                      "priority",
                      ticketPriorityOnTagChange(
                        options.tags,
                        field.value,
                        nextTagId,
                        form.getValues("priority") ?? INITIAL_TICKET_PRIORITY,
                      ),
                      { shouldDirty: true },
                    )
                    field.onChange(nextTagId)
                  }}
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
                    queueLabel={options.queueLabel}
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
              aria-disabled={submitBlockMessage !== null || undefined}
              aria-describedby={
                submitBlockMessage !== null ? submitBlockId : undefined
              }
              className={cn(
                submitBlockMessage !== null &&
                  "cursor-not-allowed opacity-50 hover:bg-primary",
              )}
            >
              {isSubmitting ? (
                <Loader2Icon
                  aria-hidden="true"
                  className="size-4 animate-spin motion-reduce:animate-none"
                />
              ) : null}
              {isSubmitting ? "Enviando…" : "Abrir chamado"}
            </Button>
            {submitBlockMessage !== null ? (
              <span id={submitBlockId} className="sr-only">
                {submitBlockMessage}
              </span>
            ) : null}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default NewTicketDialog
