"use client"

import { Loader2Icon, Trash2Icon } from "lucide-react"
import { useRef, useState, useTransition } from "react"
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
import { removeAvatar } from "@/app/_lib/actions/profile"

interface RemoveAvatarDialogProps {
  returnFocusRef: React.RefObject<HTMLButtonElement | null>
  disabled?: boolean
}

const RemoveAvatarDialog = ({
  returnFocusRef,
  disabled = false,
}: RemoveAvatarDialogProps) => {
  const [open, setOpen] = useState(false)
  const removedRef = useRef(false)
  const [isPending, startTransition] = useTransition()

  const handleOpenChange = (nextOpen: boolean) => {
    if (isPending) return
    setOpen(nextOpen)
  }

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await removeAvatar()

      if (result.ok) {
        removedRef.current = true
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }

      startTransition(() => {
        setOpen(false)
      })
    })
  }

  const handleCloseAutoFocus = (event: Event) => {
    if (!removedRef.current) return

    event.preventDefault()
    removedRef.current = false
    returnFocusRef.current?.focus()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" disabled={disabled || isPending}>
          <Trash2Icon aria-hidden="true" className="size-4" />
          Remover
        </Button>
      </DialogTrigger>

      <DialogContent
        showCloseButton={false}
        onCloseAutoFocus={handleCloseAutoFocus}
        className="gap-6 p-6"
      >
        <DialogHeader>
          <DialogTitle>Remover foto?</DialogTitle>
          <DialogDescription>
            Ao remover, não poderá ser recuperada
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="-mx-6 -mb-6 p-4">
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isPending}>
              Cancelar
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            disabled={isPending}
            aria-busy={isPending || undefined}
            onClick={handleConfirm}
          >
            {isPending ? (
              <Loader2Icon
                aria-hidden="true"
                className="size-4 animate-spin motion-reduce:animate-none"
              />
            ) : null}
            {isPending ? "Removendo…" : "Remover"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default RemoveAvatarDialog
