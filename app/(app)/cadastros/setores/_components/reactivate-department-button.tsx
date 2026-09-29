"use client"

import { Loader2Icon, PowerIcon } from "lucide-react"
import { useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/app/_components/ui/button"
import { setDepartmentActive } from "@/app/_lib/actions/departments"
import type { DepartmentListItem } from "@/app/_lib/types/department"

interface ReactivateDepartmentButtonProps {
  department: Pick<DepartmentListItem, "id" | "name">
}

const ReactivateDepartmentButton = ({
  department,
}: ReactivateDepartmentButtonProps) => {
  const [isPending, startTransition] = useTransition()

  const handleClick = () => {
    startTransition(async () => {
      const result = await setDepartmentActive({
        id: department.id,
        isActive: true,
      })

      if (result.ok) {
        toast.success(result.message)
        return
      }

      toast.error(result.message)
    })
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={isPending}
      aria-busy={isPending || undefined}
      aria-label={`Reativar ${department.name}`}
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

export default ReactivateDepartmentButton
