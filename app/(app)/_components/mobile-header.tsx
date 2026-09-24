import UserAvatar from "./user-avatar"
import UserMenu from "./user-menu"

interface MobileHeaderProps {
  firstName: string
  initials: string
  membership: string
}

const MobileHeader = ({
  firstName,
  initials,
  membership,
}: MobileHeaderProps) => {
  return (
    <header className="flex items-center gap-3 pt-safe-5 px-safe-5 pb-3.5 lg:hidden">
      <UserMenu
        label="Abrir menu do usuário"
        triggerClassName="rounded-full"
        contentClassName="w-auto min-w-48"
      >
        <UserAvatar initials={initials} size="lg" />
      </UserMenu>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-xs font-bold text-muted-foreground">
          {membership}
        </span>
        <span className="truncate font-heading text-xl font-semibold tracking-tight">
          Olá, {firstName}
        </span>
      </div>
    </header>
  )
}

export default MobileHeader
