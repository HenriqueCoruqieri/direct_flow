"use client"

import { Loader2Icon, LogOutIcon } from "lucide-react"
import { useFormStatus } from "react-dom"

import { Button } from "@/app/_components/ui/button"

const SignOutButton = () => {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      variant="outline"
      size="lg"
      disabled={pending}
      aria-busy={pending || undefined}
      className="w-full gap-2 text-text-secondary hover:text-foreground focus-visible:ring-ring"
    >
      {pending ? (
        <Loader2Icon
          aria-hidden="true"
          className="size-4 animate-spin motion-reduce:animate-none"
        />
      ) : (
        <LogOutIcon aria-hidden="true" className="size-4" />
      )}
      {pending ? "Saindo…" : "Sair"}
    </Button>
  )
}

export default SignOutButton
