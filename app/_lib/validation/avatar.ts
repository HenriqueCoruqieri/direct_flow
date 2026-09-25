import { z } from "zod"

import {
  AVATAR_MAX_BYTES,
  AVATAR_MIME_TYPES,
  AVATAR_SOURCE_MAX_BYTES,
  AVATAR_SOURCE_MAX_MEGABYTES,
  AVATAR_SOURCE_MIME_TYPES,
} from "@/app/_lib/domain/avatar"

export const AVATAR_FORMAT_ERROR =
  "Formato de imagem não aceito. Use WebP ou PNG."

export const avatarFileSchema = z
  .file({ error: "Selecione uma imagem." })
  .min(1, { error: "Selecione uma imagem." })
  .max(AVATAR_MAX_BYTES, {
    error: "A imagem ficou grande demais. Tente outra.",
  })
  .mime([...AVATAR_MIME_TYPES], { error: AVATAR_FORMAT_ERROR })

export type AvatarFileInput = z.infer<typeof avatarFileSchema>

export const avatarSourceFileSchema = z
  .file({ error: "Selecione uma imagem." })
  .min(1, { error: "Selecione uma imagem." })
  .max(AVATAR_SOURCE_MAX_BYTES, {
    error: `A imagem precisa ter no máximo ${AVATAR_SOURCE_MAX_MEGABYTES} MB.`,
  })
  .mime([...AVATAR_SOURCE_MIME_TYPES], {
    error: "Formato não aceito. Use JPEG, PNG, WebP, GIF ou AVIF.",
  })

export type AvatarSourceFileInput = z.infer<typeof avatarSourceFileSchema>
