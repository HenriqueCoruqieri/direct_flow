"use client"

import { Loader2Icon, LogOutIcon } from "lucide-react"
import { useFormStatus } from "react-dom"

import { DropdownMenuItem } from "@/app/_components/ui/dropdown-menu"

const SignOutButton = () => {
  const { pending } = useFormStatus()

  return (
    <DropdownMenuItem
      asChild
      disabled={pending}
      onSelect={(event) => event.preventDefault()}
    >
      <button type="submit" aria-busy={pending || undefined} className="w-full">
        {pending ? (
          <Loader2Icon
            aria-hidden="true"
            className="size-4 animate-spin motion-reduce:animate-none"
          />
        ) : (
          <LogOutIcon aria-hidden="true" className="size-4" />
        )}
        {pending ? "Saindo…" : "Sair"}
      </button>
    </DropdownMenuItem>
  )
}

export default SignOutButton
