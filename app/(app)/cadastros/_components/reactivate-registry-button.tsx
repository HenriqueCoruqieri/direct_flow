"use client"

import { Loader2Icon, PowerIcon } from "lucide-react"
import { useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/app/_components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/app/_components/ui/tooltip"

import type { RegistryMutationResult } from "./registry-mutation-result"

interface ReactivateRegistryButtonProps {
  name: string
  disabledReason?: string | null
  onReactivate: () => Promise<RegistryMutationResult>
}

const ReactivateRegistryButton = ({
  name,
  disabledReason = null,
  onReactivate,
}: ReactivateRegistryButtonProps) => {
  const [isPending, startTransition] = useTransition()

  const handleClick = () => {
    startTransition(async () => {
      const result = await onReactivate()

      if (result.ok) {
        toast.success(result.message)
        return
      }

      toast.error(result.message)
    })
  }

  if (disabledReason !== null) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            tabIndex={0}
            className="inline-flex rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled
              aria-label={`Reativar ${name}`}
            >
              <PowerIcon aria-hidden="true" className="size-3.5" />
              Reativar
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>{disabledReason}</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={isPending}
      aria-busy={isPending || undefined}
      aria-label={`Reativar ${name}`}
      onClick={handleClick}
    >
      {isPending ? (
        <Loader2Icon
          aria-hidden="true"
          className="size-3.5 animate-spin motion-reduce:animate-none"
        />
      ) : (
        <PowerIcon aria-hidden="true" className="size-3.5" />
      )}
      Reativar
    </Button>
  )
}

export default ReactivateRegistryButton
