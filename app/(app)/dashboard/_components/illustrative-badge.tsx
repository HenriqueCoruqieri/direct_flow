import { Badge } from "@/app/_components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/app/_components/ui/tooltip"
import {
  ILLUSTRATIVE_DESCRIPTION,
  ILLUSTRATIVE_LABEL,
} from "@/app/_lib/domain/dashboard"

const IllustrativeBadge = () => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          tabIndex={0}
          className="cursor-help text-muted-foreground outline-none"
        >
          {ILLUSTRATIVE_LABEL}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>{ILLUSTRATIVE_DESCRIPTION}</TooltipContent>
    </Tooltip>
  )
}

export default IllustrativeBadge
