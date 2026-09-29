import { Badge } from "@/app/_components/ui/badge"
import { describeActiveStatus } from "@/app/_lib/domain/status"

interface ActiveStatusBadgeProps {
  isActive: boolean
}

const ActiveStatusBadge = ({ isActive }: ActiveStatusBadgeProps) => (
  <Badge
    variant={isActive ? "default" : "outline"}
    className={isActive ? undefined : "text-muted-foreground"}
  >
    {describeActiveStatus(isActive)}
  </Badge>
)

export default ActiveStatusBadge
