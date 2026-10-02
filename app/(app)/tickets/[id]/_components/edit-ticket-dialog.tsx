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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/_components/ui/dialog"
import { editTicket } from "@/app/_lib/actions/tickets"
import { formatTicketNumber } from "@/app/_lib/domain/ticket"
import type { TicketEditFormOptions } from "@/app/_lib/types/ticket-edit"
import {
  type EditTicketInput,
  editTicketSchema,
} from "@/app/_lib/validation/ticket"

import TicketDescriptionField from "../../../_components/ticket-description-field"
import TicketTagField from "../../../_components/ticket-tag-field"
import TicketTitleField from "../../../_components/ticket-title-field"
import TicketTypeField from "../../../_components/ticket-type-field"
import EditTicketButton from "./edit-ticket-button"

const UNAVAILABLE_TAG_HINT =
  "A tag atual não está disponível. Escolha uma tag ativa do seu setor."

interface EditTicketDialogProps {
  options: TicketEditFormOptions
}

const EditTicketDialog = ({ options }: EditTicketDialogProps) => {
  const titleId = useId()
  const descriptionId = useId()
  const typeId = useId()
  const tagId = useId()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const form = useForm<EditTicketInput>({
    resolver: zodResolver(editTicketSchema),
    defaultValues: options.defaults,
  })

  const isSubmitting = form.formState.isSubmitting
  const tagHint =
    options.defaults.tagId === undefined ? UNAVAILABLE_TAG_HINT : undefined

  const handleOpenChange = (nextOpen: boolean) => {
    if (isSubmitting) return
    if (nextOpen) form.reset(options.defaults)
    setOpen(nextOpen)
  }

  const onSubmit = async (values: EditTicketInput) => {
    const result = await editTicket(values)

    if (result.ok) {
      toast.success(result.message)
      setOpen(false)
      return
    }

    if (result.code === "NO_CHANGES") {
      toast.info(result.message)
      setOpen(false)
      return
    }

    if (result.code === "INVALID_TAG") {
      form.setError("tagId", { message: result.message }, { shouldFocus: true })
      router.refresh()
      return
    }

    toast.error(result.message)

    if (result.code === "FORBIDDEN" || result.code === "NOT_FOUND") {
      setOpen(false)
      router.refresh()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <EditTicketButton />
      </DialogTrigger>

      <DialogContent
        aria-describedby={undefined}
        className="max-h-[calc(100dvh-2rem)] gap-6 overflow-y-auto p-6 sm:max-w-lg"
      >
        <form
          noValidate
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-6"
        >
          <DialogHeader>
            <DialogTitle>
              Editar chamado {formatTicketNumber(options.defaults.ticketId)}
            </DialogTitle>
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
                  label="Tag"
                  {...field}
                  fieldState={fieldState}
                  tags={options.tags}
                  hint={tagHint}
                />
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
              {isSubmitting ? "Salvando…" : "Salvar alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default EditTicketDialog
