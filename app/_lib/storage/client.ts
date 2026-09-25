import { S3Client } from "@aws-sdk/client-s3"

type StorageEnvName =
  | "R2_ACCOUNT_ID"
  | "R2_ACCESS_KEY_ID"
  | "R2_SECRET_ACCESS_KEY"
  | "R2_AVATARS_BUCKET"
  | "R2_AVATARS_PUBLIC_URL"

export const readStorageEnv = (name: StorageEnvName): string => {
  const value = process.env[name]

  if (!value) {
    throw new Error(`[storage] Variável de ambiente ${name} não configurada.`)
  }

  return value
}

let client: S3Client | undefined

export const r2Client = (): S3Client => {
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: `https://${readStorageEnv("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: readStorageEnv("R2_ACCESS_KEY_ID"),
        secretAccessKey: readStorageEnv("R2_SECRET_ACCESS_KEY"),
      },
    })
  }

  return client
}
