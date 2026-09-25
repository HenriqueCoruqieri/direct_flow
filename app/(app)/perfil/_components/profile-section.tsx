import { useId } from "react"

interface ProfileSectionProps {
  title: string
  description?: React.ReactNode
  children?: React.ReactNode
}

const ProfileSection = ({
  title,
  description,
  children,
}: ProfileSectionProps) => {
  const titleId = useId()

  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-4 rounded-2xl border border-border-subtle bg-surface p-5"
    >
      <div className="flex flex-col gap-1">
        <h2 id={titleId} className="font-heading text-base font-semibold">
          {title}
        </h2>
        {description ? (
          <div className="text-caption text-muted-foreground">
            {description}
          </div>
        ) : null}
      </div>
      {children}
    </section>
  )
}

export default ProfileSection
