import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3"

import { AVATAR_EXTENSIONS } from "@/app/_lib/domain/avatar"
import { r2Client, readStorageEnv } from "@/app/_lib/storage/client"
import type { AvatarMimeType, UploadedAvatar } from "@/app/_lib/types/avatar"

interface AvatarFile {
  body: Uint8Array
  contentType: AvatarMimeType
}

export async function uploadAvatar(
  userId: number,
  file: AvatarFile,
): Promise<UploadedAvatar> {
  const bucket = readStorageEnv("R2_AVATARS_BUCKET")
  const publicUrl = readStorageEnv("R2_AVATARS_PUBLIC_URL")
  const extension = AVATAR_EXTENSIONS[file.contentType]
  const key = `avatars/${userId}/${crypto.randomUUID()}.${extension}`

  await r2Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: file.body,
      ContentType: file.contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  )

  return { url: `${publicUrl}/${key}` }
}

export async function deleteAvatarByUrl(url: string): Promise<void> {
  const publicUrl = readStorageEnv("R2_AVATARS_PUBLIC_URL")
  const prefix = `${publicUrl}/`

  if (!url.startsWith(prefix)) {
    return
  }

  const key = url.slice(prefix.length)

  if (!key.startsWith("avatars/")) {
    return
  }

  await r2Client().send(
    new DeleteObjectCommand({
      Bucket: readStorageEnv("R2_AVATARS_BUCKET"),
      Key: key,
    }),
  )
}
