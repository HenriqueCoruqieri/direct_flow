import { InfoIcon } from "lucide-react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { requireSession } from "@/app/_lib/auth/session"
import { findUserProfile } from "@/app/_lib/data/users"
import { describeMembership, getInitials } from "@/app/_lib/domain/user"

import AccountDetails from "./_components/account-details"
import AvatarUploader from "./_components/avatar-uploader"
import ChangePasswordForm from "./_components/change-password-form"
import ProfileSection from "./_components/profile-section"

export const metadata: Metadata = {
  title: "Meu perfil",
}

const ProfilePage = async () => {
  const actor = await requireSession()
  const profile = await findUserProfile(actor.id)

  if (!profile) notFound()

  return (
    <div className="flex flex-col gap-5.5 px-5 pt-5 pb-8 lg:px-6">
      <h1 className="font-heading text-title font-semibold">Meu perfil</h1>

      <div className="flex flex-col gap-4 lg:max-w-3xl">
        <section
          aria-label="Foto e identificação"
          className="flex flex-col items-center gap-4 rounded-2xl border border-border-subtle bg-surface p-5 text-center sm:flex-row sm:text-left"
        >
          <AvatarUploader
            image={profile.image}
            initials={getInitials(profile.name)}
          >
            <div className="flex w-full min-w-0 flex-1 flex-col gap-1">
              <p className="truncate font-heading text-xl font-semibold">
                {profile.name}
              </p>
              <p className="truncate text-caption font-bold text-muted-foreground">
                {describeMembership(profile.departmentName, profile.role)}
              </p>
            </div>
          </AvatarUploader>
        </section>

        <ProfileSection
          title="Dados da conta"
          description={
            <p className="flex items-center gap-1.5">
              <InfoIcon aria-hidden="true" className="size-4 shrink-0" />
              Para alterar, fale com o administrador do setor.
            </p>
          }
        >
          <AccountDetails profile={profile} />
        </ProfileSection>

        <ProfileSection title="Segurança">
          <ChangePasswordForm />
        </ProfileSection>
      </div>
    </div>
  )
}

export default ProfilePage
