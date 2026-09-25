import type { AvatarExtension, AvatarMimeType } from "@/app/_lib/types/avatar"

export const AVATAR_SIZE_PX = 256

export const AVATAR_MAX_BYTES = 512 * 1024

export const AVATAR_WEBP_QUALITY = 0.9

export const AVATAR_MIME_TYPES = [
  "image/webp",
  "image/png",
] as const satisfies readonly AvatarMimeType[]

export const AVATAR_EXTENSIONS: Record<AvatarMimeType, AvatarExtension> = {
  "image/webp": "webp",
  "image/png": "png",
}

export const AVATAR_FORM_FIELD = "avatar"

export const AVATAR_SOURCE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
] as const

export const AVATAR_SOURCE_MAX_MEGABYTES = 20

export const AVATAR_SOURCE_MAX_BYTES = AVATAR_SOURCE_MAX_MEGABYTES * 1024 * 1024

export const AVATAR_INPUT_ACCEPT = AVATAR_SOURCE_MIME_TYPES.join(",")

export const isAvatarMimeType = (value: string): value is AvatarMimeType =>
  AVATAR_MIME_TYPES.some((type) => type === value)

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const RIFF_SIGNATURE = [0x52, 0x49, 0x46, 0x46]
const WEBP_SIGNATURE = [0x57, 0x45, 0x42, 0x50]

const hasBytesAt = (
  bytes: Uint8Array,
  offset: number,
  expected: readonly number[],
): boolean =>
  bytes.length >= offset + expected.length &&
  expected.every((value, index) => bytes[offset + index] === value)

export const detectAvatarMimeType = (
  bytes: Uint8Array,
): AvatarMimeType | null => {
  if (hasBytesAt(bytes, 0, PNG_SIGNATURE)) return "image/png"
  if (
    hasBytesAt(bytes, 0, RIFF_SIGNATURE) &&
    hasBytesAt(bytes, 8, WEBP_SIGNATURE)
  ) {
    return "image/webp"
  }
  return null
}
