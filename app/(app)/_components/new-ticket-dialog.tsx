"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2Icon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useId, useState } from "react"
import {
  Controller,
  type DefaultValues,
  useForm,
  useWatch,
} from "react-hook-form"
import { toast } from "sonner"

import Combobox from "@/app/_components/combobox"
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
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/app/_components/ui/field"
import { Input } from "@/app/_components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/_components/ui/select"
import { Textarea } from "@/app/_components/ui/textarea"
import { createTicket } from "@/app/_lib/actions/tickets"
import {
  describeApprovalNotice,
  requiresApproval,
  TICKET_TYPE_LABELS,
  TICKET_TYPES,
} from "@/app/_lib/domain/ticket"
import type { NewTicketFormAvailable } from "@/app/_lib/types/ticket"
import {
  type CreateTicketInput,
  createTicketSchema,
} from "@/app/_lib/validation/ticket"

import NewTicketButton from "./new-ticket-button"

interface NewTicketDialogProps {
  options: NewTicketFormAvailable
}

const ticketTypeFromValue = (value: string) =>
  TICKET_TYPES.find((type) => type === value)

const initialValuesFor = (
  options: NewTicketFormAvailable,
): DefaultValues<CreateTicketInput> => ({
  title: "",
  description: "",
  departmentId: options.defaultDestinationId ?? undefined,
})

const describedBy = (...ids: (string | null)[]): string | undefined => {
  const present = ids.filter((id): id is string => id !== null)
  return present.length > 0 ? present.join(" ") : undefined
}

const NewTicketDialog = ({ options }: NewTicketDialogProps) => {
  const titleId = useId()
  const descriptionId = useId()
  const typeId = useId()
  const departmentId = useId()
  const tagId = useId()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const form = useForm<CreateTicketInput>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: initialValuesFor(options),
  })

  const isSubmitting = form.formState.isSubmitting
  const destinationOptions = options.destinations.map((destination) => ({
    value: destination.id,
    label: destination.name,
  }))
  const tagOptions = options.tags.map((tag) => ({
    value: tag.id,
    label: tag.name,
  }))

  const selectedDepartmentId = useWatch({
    control: form.control,
    name: "departmentId",
  })
  const selectedDestination =
    options.destinations.find(
      (destination) => destination.id === selectedDepartmentId,
    ) ?? null
  const approvalNotice =
    selectedDestination !== null &&
    requiresApproval(options.authorDepartmentId, selectedDestination.id)
      ? describeApprovalNotice(selectedDestination.name)
      : null

  const handleOpenChange = (nextOpen: boolean) => {
    if (isSubmitting) return
    if (!nextOpen) form.reset(initialValuesFor(options))
    setOpen(nextOpen)
  }

  const closeAndDiscard = () => {
    form.reset(initialValuesFor(options))
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

    if (result.code === "INVALID_DESTINATION") {
      form.setError(
        "departmentId",
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

  const titleErrorId = `${titleId}-error`
  const descriptionErrorId = `${descriptionId}-error`
  const typeErrorId = `${typeId}-error`
  const departmentErrorId = `${departmentId}-error`
  const departmentNoticeId = `${departmentId}-notice`
  const tagErrorId = `${tagId}-error`
  const tagHintId = `${tagId}-hint`

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
                <Field data-invalid={fieldState.invalid} className="gap-1.5">
                  <FieldLabel htmlFor={titleId}>Título</FieldLabel>
                  <Input
                    {...field}
                    id={titleId}
                    autoComplete="off"
                    aria-invalid={fieldState.invalid}
                    aria-describedby={
                      fieldState.invalid ? titleErrorId : undefined
                    }
                  />
                  {fieldState.invalid ? (
                    <FieldError id={titleErrorId} errors={[fieldState.error]} />
                  ) : null}
                </Field>
              )}
            />

            <Controller
              name="description"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid} className="gap-1.5">
                  <FieldLabel htmlFor={descriptionId}>Descrição</FieldLabel>
                  <Textarea
                    {...field}
                    id={descriptionId}
                    rows={5}
                    className="max-h-64 min-h-28"
                    aria-invalid={fieldState.invalid}
                    aria-describedby={
                      fieldState.invalid ? descriptionErrorId : undefined
                    }
                  />
                  {fieldState.invalid ? (
                    <FieldError
                      id={descriptionErrorId}
                      errors={[fieldState.error]}
                    />
                  ) : null}
                </Field>
              )}
            />

            <Controller
              name="type"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid} className="gap-1.5">
                  <FieldLabel htmlFor={typeId}>Tipo</FieldLabel>
                  <Select
                    name={field.name}
                    value={field.value ?? ""}
                    onValueChange={(value) =>
                      field.onChange(ticketTypeFromValue(value))
                    }
                    disabled={field.disabled}
                  >
                    <SelectTrigger
                      id={typeId}
                      ref={field.ref}
                      onBlur={field.onBlur}
                      aria-invalid={fieldState.invalid}
                      aria-describedby={
                        fieldState.invalid ? typeErrorId : undefined
                      }
                      className="w-full"
                    >
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {TICKET_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {TICKET_TYPE_LABELS[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.invalid ? (
                    <FieldError id={typeErrorId} errors={[fieldState.error]} />
                  ) : null}
                </Field>
              )}
            />

            <Controller
              name="departmentId"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid} className="gap-1.5">
                  <FieldLabel htmlFor={departmentId}>
                    Setor de destino
                  </FieldLabel>
                  <Combobox
                    id={departmentId}
                    ref={field.ref}
                    options={destinationOptions}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    disabled={field.disabled}
                    placeholder="Selecione o setor"
                    searchPlaceholder="Buscar setor…"
                    aria-invalid={fieldState.invalid}
                    aria-describedby={describedBy(
                      fieldState.invalid ? departmentErrorId : null,
                      approvalNotice !== null ? departmentNoticeId : null,
                    )}
                  />
                  {fieldState.invalid ? (
                    <FieldError
                      id={departmentErrorId}
                      errors={[fieldState.error]}
                    />
                  ) : null}
                  {approvalNotice !== null ? (
                    <FieldDescription id={departmentNoticeId}>
                      {approvalNotice}
                    </FieldDescription>
                  ) : null}
                </Field>
              )}
            />

            <Controller
              name="tagId"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid} className="gap-1.5">
                  <FieldLabel htmlFor={tagId}>Tags</FieldLabel>
                  <Combobox
                    id={tagId}
                    ref={field.ref}
                    options={tagOptions}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    disabled={field.disabled}
                    placeholder="Selecione a tag"
                    searchPlaceholder="Buscar tag…"
                    aria-invalid={fieldState.invalid}
                    aria-describedby={
                      fieldState.invalid ? tagErrorId : tagHintId
                    }
                  />
                  {fieldState.invalid ? (
                    <FieldError id={tagErrorId} errors={[fieldState.error]} />
                  ) : (
                    <FieldDescription id={tagHintId}>
                      A tag é utilizada para categorizar e mapear os maiores
                      ofensores da fila de atendimento.
                    </FieldDescription>
                  )}
                </Field>
              )}
            />
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
