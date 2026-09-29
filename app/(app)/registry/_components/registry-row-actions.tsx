import type { ReactNode } from "react"

import { cn } from "@/app/_lib/utils"

type RegistryRowActionWidth = "fit" | "md" | "lg"

const SLOT_WIDTHS = {
  fit: "",
  md: "w-28",
  lg: "w-40",
} satisfies Record<RegistryRowActionWidth, string>

interface RegistryRowActionSlot {
  id: string
  width: RegistryRowActionWidth
  action: ReactNode
}

interface RegistryRowActionsProps {
  slots: RegistryRowActionSlot[]
}

const RegistryRowActions = ({ slots }: RegistryRowActionsProps) => (
  <div className="flex items-center justify-end gap-1">
    {slots.map(({ id, width, action }) => (
      <div key={id} className={cn("flex shrink-0", SLOT_WIDTHS[width])}>
        {action}
      </div>
    ))}
  </div>
)

export default RegistryRowActions
