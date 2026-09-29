"use client"

import { KeyRoundIcon, Loader2Icon } from "lucide-react"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/app/_components/ui/alert-dialog"
import { Button } from "@/app/_components/ui/button"
import { restorePersonPassword } from "@/app/_lib/actions/people"

interface RestorePasswordDialogProps {
  personId: number
  name: string
}

const RestorePasswordDialog = ({
  personId,
  name,
}: RestorePasswordDialogProps) => {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleOpenChange = (nextOpen: boolean) => {
    if (isPending) return
    setOpen(nextOpen)
  }

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await restorePersonPassword({ id: personId })

      if (result.ok) {
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }

      startTransition(() => {
        setOpen(false)
      })
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={`Restaurar senha padrão de ${name}`}
        >
          <KeyRoundIcon aria-hidden="true" className="size-3.5" />
          Restaurar senha
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Restaurar a senha padrão de {name}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            A senha volta a ser a padrão, as sessões abertas são encerradas e a
            pessoa vai definir uma nova no próximo acesso.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <Button
            type="button"
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
            {isPending ? "Restaurando…" : "Restaurar senha"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default RestorePasswordDialog
