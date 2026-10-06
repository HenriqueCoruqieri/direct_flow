"use client"

import { Loader2Icon, PowerOffIcon } from "lucide-react"
import Link from "next/link"
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

import type { RegistryMutationResult } from "./registry-mutation-result"

interface DeactivateRegistryDialogLink {
  label: string
  href: string
}

interface DeactivateRegistryDialogProps {
  name: string
  description: string
  blockedReason?: string | null
  blockedLink?: DeactivateRegistryDialogLink | null
  onDeactivate: () => Promise<RegistryMutationResult>
}

const DeactivateRegistryDialog = ({
  name,
  description,
  blockedReason = null,
  blockedLink = null,
  onDeactivate,
}: DeactivateRegistryDialogProps) => {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const isBlocked = blockedReason !== null

  const handleOpenChange = (nextOpen: boolean) => {
    if (isPending) return
    setOpen(nextOpen)
  }

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await onDeactivate()

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
          aria-label={`Desativar ${name}`}
          className="text-destructive hover:text-destructive"
        >
          <PowerOffIcon aria-hidden="true" className="size-3.5" />
          Desativar
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isBlocked ? "Não é possível desativar" : `Desativar ${name}?`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isBlocked ? blockedReason : description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            {isBlocked ? "Entendi" : "Cancelar"}
          </AlertDialogCancel>
          {isBlocked ? (
            blockedLink === null ? null : (
              <Button asChild className="font-bold hover:bg-primary-hover">
                <Link href={blockedLink.href}>{blockedLink.label}</Link>
              </Button>
            )
          ) : (
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
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default DeactivateRegistryDialog
