"use server"

import { revalidatePath } from "next/cache"

import {
  changeUserPassword,
  type PasswordChangeFailure,
} from "@/app/_lib/auth/password-change"
import { requireSession } from "@/app/_lib/auth/session"
import { findUserProfile, updateUserImage } from "@/app/_lib/data/users"
import {
  AVATAR_FORM_FIELD,
  detectAvatarMimeType,
} from "@/app/_lib/domain/avatar"
import { sendPasswordChangedEmail } from "@/app/_lib/email/password-changed"
import { deleteAvatarByUrl, uploadAvatar } from "@/app/_lib/storage/avatars"
import type { UserProfile } from "@/app/_lib/types/user"
import {
  AVATAR_FORMAT_ERROR,
  avatarFileSchema,
} from "@/app/_lib/validation/avatar"
import {
  type ChangePasswordInput,
  changePasswordSchema,
} from "@/app/_lib/validation/password"

export type ChangePasswordErrorCode =
  "INVALID_INPUT" | "INVALID_CURRENT_PASSWORD" | "USER_DEACTIVATED"

export interface ChangePasswordSuccess {
  ok: true
  message: string
}

export interface ChangePasswordFailure {
  ok: false
  message: string
  code?: ChangePasswordErrorCode
}

export type ChangePasswordResult = ChangePasswordSuccess | ChangePasswordFailure

export type AvatarErrorCode = "INVALID_INPUT" | "USER_DEACTIVATED"

export interface UpdateAvatarSuccess {
  ok: true
  message: string
  image: string
}

export interface RemoveAvatarSuccess {
  ok: true
  message: string
}

export interface AvatarFailure {
  ok: false
  message: string
  code?: AvatarErrorCode
}

export type UpdateAvatarResult = UpdateAvatarSuccess | AvatarFailure
export type RemoveAvatarResult = RemoveAvatarSuccess | AvatarFailure

const PASSWORD_CHANGED_MESSAGE =
  "Senha alterada. As outras sessões foram encerradas."
const INVALID_PASSWORD_LENGTH_MESSAGE =
  "A senha precisa ter entre 8 e 128 caracteres."
const INVALID_CURRENT_PASSWORD_MESSAGE = "Senha atual incorreta."
const USER_DEACTIVATED_MESSAGE = "Usuário desativado."
const PASSWORD_UNEXPECTED_ERROR_MESSAGE =
  "Não foi possível alterar a senha agora. Tente novamente."
const AVATAR_UPDATED_MESSAGE = "Foto atualizada."
const AVATAR_REMOVED_MESSAGE = "Foto removida."
const AVATAR_UNEXPECTED_ERROR_MESSAGE =
  "Não foi possível atualizar a foto agora. Tente novamente."

const PASSWORD_CHANGE_ERROR_MESSAGE: Record<PasswordChangeFailure, string> = {
  INVALID_CURRENT_PASSWORD: INVALID_CURRENT_PASSWORD_MESSAGE,
  PASSWORD_TOO_SHORT: INVALID_PASSWORD_LENGTH_MESSAGE,
  PASSWORD_TOO_LONG: INVALID_PASSWORD_LENGTH_MESSAGE,
}

const PASSWORD_CHANGE_ERROR_CODE: Record<
  PasswordChangeFailure,
  ChangePasswordErrorCode
> = {
  INVALID_CURRENT_PASSWORD: "INVALID_CURRENT_PASSWORD",
  PASSWORD_TOO_SHORT: "INVALID_INPUT",
  PASSWORD_TOO_LONG: "INVALID_INPUT",
}

interface ActiveProfileFound {
  status: "active"
  profile: UserProfile
}

interface ActiveProfileDeactivated {
  status: "deactivated"
}

interface ActiveProfileUnavailable {
  status: "unavailable"
}

type ActiveProfileLookup =
  ActiveProfileFound | ActiveProfileDeactivated | ActiveProfileUnavailable

const loadActiveProfile = async (
  userId: number,
  logPrefix: string,
): Promise<ActiveProfileLookup> => {
  let profile: UserProfile | null

  try {
    profile = await findUserProfile(userId)
  } catch (error) {
    console.error(logPrefix, error)
    return { status: "unavailable" }
  }

  if (!profile) {
    console.error(logPrefix, `perfil ${userId} não encontrado`)
    return { status: "unavailable" }
  }

  if (!profile.isActive) return { status: "deactivated" }

  return { status: "active", profile }
}

const deleteAvatarQuietly = async (
  url: string,
  logPrefix: string,
): Promise<void> => {
  try {
    await deleteAvatarByUrl(url)
  } catch (error) {
    console.error(logPrefix, error)
  }
}

export const changePassword = async (
  input: ChangePasswordInput,
): Promise<ChangePasswordResult> => {
  const actor = await requireSession()

  const parsed = changePasswordSchema.safeParse(input)

  if (!parsed.success) {
    return {
      ok: false,
      code: "INVALID_INPUT",
      message:
        parsed.error.issues[0]?.message ?? PASSWORD_UNEXPECTED_ERROR_MESSAGE,
    }
  }

  const lookup = await loadActiveProfile(actor.id, "[changePassword]")

  if (lookup.status === "unavailable") {
    return { ok: false, message: PASSWORD_UNEXPECTED_ERROR_MESSAGE }
  }

  if (lookup.status === "deactivated") {
    return {
      ok: false,
      code: "USER_DEACTIVATED",
      message: USER_DEACTIVATED_MESSAGE,
    }
  }

  const { profile } = lookup

  let failure: PasswordChangeFailure | null

  try {
    failure = await changeUserPassword({
      currentPassword: parsed.data.currentPassword,
      newPassword: parsed.data.newPassword,
    })
  } catch (error) {
    console.error("[changePassword]", error)
    return { ok: false, message: PASSWORD_UNEXPECTED_ERROR_MESSAGE }
  }

  if (failure) {
    return {
      ok: false,
      code: PASSWORD_CHANGE_ERROR_CODE[failure],
      message: PASSWORD_CHANGE_ERROR_MESSAGE[failure],
    }
  }

  try {
    await sendPasswordChangedEmail({
      to: profile.email,
      userName: profile.name,
      changedAt: new Date(),
    })
  } catch (error) {
    console.error("[changePassword] email", error)
  }

  return { ok: true, message: PASSWORD_CHANGED_MESSAGE }
}

export const updateAvatar = async (
  formData: FormData,
): Promise<UpdateAvatarResult> => {
  const actor = await requireSession()

  const parsed = avatarFileSchema.safeParse(formData.get(AVATAR_FORM_FIELD))

  if (!parsed.success) {
    return {
      ok: false,
      code: "INVALID_INPUT",
      message: parsed.error.issues[0]?.message ?? AVATAR_FORMAT_ERROR,
    }
  }

  const file = parsed.data
  const body = new Uint8Array(await file.arrayBuffer())
  const contentType = detectAvatarMimeType(body)

  if (!contentType || contentType !== file.type) {
    return {
      ok: false,
      code: "INVALID_INPUT",
      message: AVATAR_FORMAT_ERROR,
    }
  }

  const lookup = await loadActiveProfile(actor.id, "[updateAvatar]")

  if (lookup.status === "unavailable") {
    return { ok: false, message: AVATAR_UNEXPECTED_ERROR_MESSAGE }
  }

  if (lookup.status === "deactivated") {
    return {
      ok: false,
      code: "USER_DEACTIVATED",
      message: USER_DEACTIVATED_MESSAGE,
    }
  }

  const previous = lookup.profile.image

  let url: string

  try {
    const uploaded = await uploadAvatar(actor.id, { body, contentType })
    url = uploaded.url
  } catch (error) {
    console.error("[updateAvatar] upload", error)
    return { ok: false, message: AVATAR_UNEXPECTED_ERROR_MESSAGE }
  }

  try {
    await updateUserImage(actor.id, url)
  } catch (error) {
    console.error("[updateAvatar] update", error)
    await deleteAvatarQuietly(url, "[updateAvatar] rollback")
    return { ok: false, message: AVATAR_UNEXPECTED_ERROR_MESSAGE }
  }

  if (previous && previous !== url) {
    await deleteAvatarQuietly(previous, "[updateAvatar] delete previous")
  }

  revalidatePath("/(app)", "layout")

  return { ok: true, message: AVATAR_UPDATED_MESSAGE, image: url }
}

export const removeAvatar = async (): Promise<RemoveAvatarResult> => {
  const actor = await requireSession()

  const lookup = await loadActiveProfile(actor.id, "[removeAvatar]")

  if (lookup.status === "unavailable") {
    return { ok: false, message: AVATAR_UNEXPECTED_ERROR_MESSAGE }
  }

  if (lookup.status === "deactivated") {
    return {
      ok: false,
      code: "USER_DEACTIVATED",
      message: USER_DEACTIVATED_MESSAGE,
    }
  }

  const previous = lookup.profile.image

  if (!previous) {
    return { ok: true, message: AVATAR_REMOVED_MESSAGE }
  }

  try {
    await updateUserImage(actor.id, null)
  } catch (error) {
    console.error("[removeAvatar] update", error)
    return { ok: false, message: AVATAR_UNEXPECTED_ERROR_MESSAGE }
  }

  await deleteAvatarQuietly(previous, "[removeAvatar] delete previous")

  revalidatePath("/(app)", "layout")

  return { ok: true, message: AVATAR_REMOVED_MESSAGE }
}
