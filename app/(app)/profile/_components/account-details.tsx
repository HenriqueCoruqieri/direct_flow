import { formatDate, formatDateTime } from "@/app/_lib/date"
import { describeAccountStatus, ROLE_LABELS } from "@/app/_lib/domain/user"
import type { UserProfile } from "@/app/_lib/types/user"

interface AccountDetailsProps {
  profile: UserProfile
}

interface AccountField {
  label: string
  value: string
}

const AccountDetails = ({ profile }: AccountDetailsProps) => {
  const fields: AccountField[] = [
    { label: "Nome", value: profile.name },
    { label: "E-mail", value: profile.email },
    { label: "Setor", value: profile.departmentName },
    { label: "Papel", value: ROLE_LABELS[profile.role] },
    { label: "Situação", value: describeAccountStatus(profile.isActive) },
    { label: "Membro desde", value: formatDate(profile.createdAt) },
    {
      label: "Último acesso",
      value: profile.lastLoginAt ? formatDateTime(profile.lastLoginAt) : "—",
    },
  ]

  return (
    <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
      {fields.map((field) => (
        <div key={field.label} className="flex min-w-0 flex-col gap-1">
          <dt className="text-caption font-semibold text-muted-foreground">
            {field.label}
          </dt>
          <dd className="text-sm font-semibold break-words">{field.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export default AccountDetails
