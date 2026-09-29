"use client"

import { Loader2Icon, PowerOffIcon } from "lucide-react"
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
import { setDepartmentActive } from "@/app/_lib/actions/departments"
import {
  checkDepartmentDeactivation,
  describeDepartmentDeactivationBlock,
} from "@/app/_lib/domain/department"
import type { DepartmentListItem } from "@/app/_lib/types/department"

interface DeactivateDepartmentDialogProps {
  department: DepartmentListItem
}

const DeactivateDepartmentDialog = ({
  department,
}: DeactivateDepartmentDialogProps) => {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const check = checkDepartmentDeactivation(department)

  if (!check.ok && check.reason === "IS_BOARD") return null

  const handleOpenChange = (nextOpen: boolean) => {
    if (isPending) return
    setOpen(nextOpen)
  }

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await setDepartmentActive({
        id: department.id,
        isActive: false,
      })

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
          aria-label={`Desativar ${department.name}`}
          className="text-destructive hover:text-destructive"
        >
          <PowerOffIcon aria-hidden="true" className="size-3.5" />
          Desativar
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {check.ok
              ? `Desativar ${department.name}?`
              : "Não é possível desativar"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {check.ok
              ? "O setor deixa de receber pessoas e chamados. Você pode reativá-lo depois."
              : describeDepartmentDeactivationBlock(check)}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            {check.ok ? "Cancelar" : "Entendi"}
          </AlertDialogCancel>
          {check.ok ? (
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
              {isPending ? "Desativando…" : "Desativar"}
            </Button>
          ) : null}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default DeactivateDepartmentDialog
