"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2Icon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useId, useState } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"

import FormField from "@/app/_components/form-field"
import FormSchemaProvider from "@/app/_components/form-schema-provider"
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
import { TICKET_PRIORITY_FIELD_LABEL } from "@/app/_lib/domain/ticket"
import {
  TICKET_ASSIGNEE_LABEL,
  TICKET_CREATOR_LABEL,
} from "@/app/_lib/domain/ticket-assignee"
import { TICKET_COMPANY_LABEL } from "@/app/_lib/domain/ticket-company"
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
import TicketAssigneeCombobox from "./ticket-assignee-combobox"
import TicketCompanyAutocomplete from "./ticket-company-autocomplete"
import TicketDescriptionTextarea from "./ticket-description-textarea"
import TicketPrioritySelect from "./ticket-priority-select"
import TicketTagCombobox from "./ticket-tag-combobox"
import TicketTypeSelect from "./ticket-type-select"

interface NewTicketDialogProps {
  options: NewTicketFormAvailable
}

const TAG_HINT =
  "A tag é utilizada para categorizar e mapear os maiores ofensores da fila de atendimento."

const NewTicketDialog = ({ options }: NewTicketDialogProps) => {
  const creatorId = useId()
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

    if (result.code === "INVALID_COMPANY") {
      form.resetField("companyId")
      form.setError(
        "companyId",
        { message: result.message },
        { shouldFocus: true },
      )
      router.refresh()
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
        <FormSchemaProvider form={form} schema={createTicketSchema}>
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
              <FormField
                control={form.control}
                name="companyId"
                label={TICKET_COMPANY_LABEL}
              >
                {(field) => (
                  <TicketCompanyAutocomplete
                    {...field}
                    companies={options.companies}
                  />
                )}
              </FormField>

              <FormField control={form.control} name="title" label="Título">
                {(field) => <Input {...field} autoComplete="off" />}
              </FormField>

              <FormField
                control={form.control}
                name="description"
                label="Descrição"
              >
                {(field) => <TicketDescriptionTextarea {...field} />}
              </FormField>

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
                <FormField control={form.control} name="type" label="Tipo">
                  {(field) => <TicketTypeSelect {...field} />}
                </FormField>

                <FormField
                  control={form.control}
                  name="priority"
                  label={TICKET_PRIORITY_FIELD_LABEL}
                  required={priorityLock === null}
                  className="min-w-0"
                >
                  {(field) => (
                    <TicketPrioritySelect
                      {...field}
                      value={priorityLock ? priorityLock.priority : field.value}
                      lockedMessage={priorityLock?.lockedMessage}
                    />
                  )}
                </FormField>
              </div>

              <FormField
                control={form.control}
                name="tagId"
                label="Tags"
                description={TAG_HINT}
              >
                {(field) => (
                  <TicketTagCombobox
                    {...field}
                    onChange={(nextTagId) => {
                      form.setValue(
                        "priority",
                        ticketPriorityOnTagChange(
                          options.tags,
                          field.value,
                          nextTagId,
                          form.getValues("priority"),
                        ),
                        {
                          shouldDirty: true,
                          shouldValidate: form.formState.isSubmitted,
                        },
                      )
                      field.onChange(nextTagId)
                    }}
                    tags={options.tags}
                  />
                )}
              </FormField>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field className="min-w-0 gap-1.5">
                  <FieldLabel htmlFor={creatorId}>
                    {TICKET_CREATOR_LABEL}
                  </FieldLabel>
                  <Input id={creatorId} value={options.creatorName} readOnly />
                </Field>

                <FormField
                  control={form.control}
                  name="assigneeId"
                  label={TICKET_ASSIGNEE_LABEL}
                  className="min-w-0"
                >
                  {(field) => (
                    <TicketAssigneeCombobox
                      {...field}
                      assignees={options.assignees}
                      queueLabel={options.queueLabel}
                    />
                  )}
                </FormField>
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
        </FormSchemaProvider>
      </DialogContent>
    </Dialog>
  )
}

export default NewTicketDialog
