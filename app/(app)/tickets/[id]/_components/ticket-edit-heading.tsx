"use client"

import { Loader2Icon } from "lucide-react"
import { useEffect, useId, useRef } from "react"

import FormField from "@/app/_components/form-field"
import { Button } from "@/app/_components/ui/button"
import { Input } from "@/app/_components/ui/input"
import { cn } from "@/app/_lib/utils"

import { useTicketEdit } from "../_hooks/use-ticket-edit"
import EditTicketButton from "./edit-ticket-button"

interface TicketEditHeadingProps {
  heading: React.ReactNode
  attendActions?: React.ReactNode
}

const TicketEditHeading = ({
  heading,
  attendActions,
}: TicketEditHeadingProps) => {
  const saveBlockId = useId()
  const editButtonRef = useRef<HTMLButtonElement>(null)
  const wasEditingRef = useRef(false)
  const {
    form,
    isEditing,
    isSubmitting,
    saveBlockMessage,
    startEditing,
    cancelEditing,
    save,
  } = useTicketEdit()
  const isSaveBlocked = saveBlockMessage !== null

  useEffect(() => {
    if (isEditing) {
      wasEditingRef.current = true
      form.setFocus("title")
      return
    }
    if (wasEditingRef.current) {
      wasEditingRef.current = false
      editButtonRef.current?.focus()
    }
  }, [isEditing, form])

  return (
    <>
      {isEditing ? (
        <div className="min-w-0 flex-1">
          <FormField control={form.control} name="title" label="Título">
            {(field) => <Input {...field} autoComplete="off" />}
          </FormField>
        </div>
      ) : (
        heading
      )}
      <div className="mt-6 flex shrink-0 flex-wrap gap-2">
        {isEditing ? (
          <>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={cancelEditing}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={isSubmitting}
              aria-busy={isSubmitting || undefined}
              aria-disabled={isSaveBlocked || undefined}
              aria-describedby={isSaveBlocked ? saveBlockId : undefined}
              onClick={save}
              className={cn(
                isSaveBlocked &&
                  "cursor-not-allowed opacity-50 hover:bg-primary",
              )}
            >
              {isSubmitting ? (
                <Loader2Icon
                  aria-hidden="true"
                  className="size-4 animate-spin motion-reduce:animate-none"
                />
              ) : null}
              {isSubmitting ? "Salvando…" : "Salvar alterações"}
            </Button>
            {isSaveBlocked ? (
              <span id={saveBlockId} className="sr-only">
                {saveBlockMessage}
              </span>
            ) : null}
          </>
        ) : (
          <>
            {attendActions}
            <EditTicketButton ref={editButtonRef} onClick={startEditing} />
          </>
        )}
      </div>
    </>
  )
}

export default TicketEditHeading
