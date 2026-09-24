import { Avatar, AvatarFallback } from "@/app/_components/ui/avatar"
import { cn } from "@/app/_lib/utils"

type UserAvatarSize = "sm" | "lg"

interface UserAvatarProps {
  initials: string
  size?: UserAvatarSize
  className?: string
}

const sizeClasses: Record<UserAvatarSize, string> = {
  sm: "size-8.5",
  lg: "size-11 border border-border-strong",
}

const textClasses: Record<UserAvatarSize, string> = {
  sm: "text-xs",
  lg: "text-sm",
}

const UserAvatar = ({ initials, size = "sm", className }: UserAvatarProps) => {
  return (
    <Avatar
      aria-hidden="true"
      className={cn("after:hidden", sizeClasses[size], className)}
    >
      <AvatarFallback
        className={cn(
          "bg-surface-muted font-heading font-semibold text-primary",
          textClasses[size],
        )}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}

export default UserAvatar
