"use client"

import { ImageUpIcon, Loader2Icon } from "lucide-react"
import { useRef, useState, useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/app/_components/ui/button"
import { updateAvatar } from "@/app/_lib/actions/profile"
import {
  AVATAR_EXTENSIONS,
  AVATAR_FORM_FIELD,
  AVATAR_INPUT_ACCEPT,
  AVATAR_SIZE_PX,
  AVATAR_WEBP_QUALITY,
  isAvatarMimeType,
} from "@/app/_lib/domain/avatar"
import {
  avatarFileSchema,
  avatarSourceFileSchema,
} from "@/app/_lib/validation/avatar"

import UserAvatar from "../../_components/user-avatar"
import RemoveAvatarDialog from "./remove-avatar-dialog"

const READ_ERROR = "Não foi possível ler a imagem. Tente outra."

const canvasToBlob = (
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
) =>
  new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, type, quality)
  })

const decodeImage = async (file: File) => {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" })
  } catch {
    return null
  }
}

const encodeCanvas = async (canvas: HTMLCanvasElement) => {
  const webp = await canvasToBlob(canvas, "image/webp", AVATAR_WEBP_QUALITY)

  if (webp && webp.type === "image/webp") return webp

  return canvasToBlob(canvas, "image/png")
}

const resizeAvatar = async (source: File): Promise<File | string> => {
  const bitmap = await decodeImage(source)

  if (!bitmap) return READ_ERROR

  const canvas = document.createElement("canvas")
  canvas.width = AVATAR_SIZE_PX
  canvas.height = AVATAR_SIZE_PX

  const context = canvas.getContext("2d")

  if (!context) {
    bitmap.close()
    return READ_ERROR
  }

  const side = Math.min(bitmap.width, bitmap.height)
  const sx = (bitmap.width - side) / 2
  const sy = (bitmap.height - side) / 2

  context.drawImage(
    bitmap,
    sx,
    sy,
    side,
    side,
    0,
    0,
    AVATAR_SIZE_PX,
    AVATAR_SIZE_PX,
  )
  bitmap.close()

  const blob = await encodeCanvas(canvas)

  if (!blob || !isAvatarMimeType(blob.type)) return READ_ERROR

  const type = blob.type
  const file = new File([blob], `avatar.${AVATAR_EXTENSIONS[type]}`, { type })
  const parsed = avatarFileSchema.safeParse(file)

  if (!parsed.success) return parsed.error.issues[0]?.message ?? READ_ERROR

  return parsed.data
}

interface AvatarUploaderProps {
  image: string | null
  initials: string
  children: React.ReactNode
}

const AvatarUploader = ({ image, initials, children }: AvatarUploaderProps) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const changeButtonRef = useRef<HTMLButtonElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const source = event.target.files?.[0]
    event.target.value = ""

    if (!source) return

    const sourceCheck = avatarSourceFileSchema.safeParse(source)

    if (!sourceCheck.success) {
      toast.error(sourceCheck.error.issues[0]?.message ?? READ_ERROR)
      return
    }

    startTransition(async () => {
      const resized = await resizeAvatar(sourceCheck.data)

      if (typeof resized === "string") {
        toast.error(resized)
        return
      }

      const previewUrl = URL.createObjectURL(resized)
      setPreview(previewUrl)

      const formData = new FormData()
      formData.append(AVATAR_FORM_FIELD, resized)

      const result = await updateAvatar(formData)

      if (result.ok) {
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }

      startTransition(() => {
        setPreview(null)
      })
      URL.revokeObjectURL(previewUrl)
    })
  }

  return (
    <>
      <div className="relative shrink-0" aria-busy={isPending || undefined}>
        <UserAvatar
          initials={initials}
          image={preview ?? image}
          size="xl"
          className={isPending ? "opacity-60" : undefined}
        />
        {isPending ? (
          <span className="absolute inset-0 flex items-center justify-center">
            <Loader2Icon
              aria-hidden="true"
              className="size-6 animate-spin text-primary motion-reduce:animate-none"
            />
          </span>
        ) : null}
      </div>

      {children}

      <div className="flex shrink-0 flex-wrap items-center justify-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={AVATAR_INPUT_ACCEPT}
          aria-label="Selecionar foto de perfil"
          tabIndex={-1}
          className="sr-only"
          onChange={handleFileChange}
        />
        <Button
          ref={changeButtonRef}
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={() => inputRef.current?.click()}
        >
          {isPending ? (
            <Loader2Icon
              aria-hidden="true"
              className="size-4 animate-spin motion-reduce:animate-none"
            />
          ) : (
            <ImageUpIcon aria-hidden="true" className="size-4" />
          )}
          {isPending ? "Enviando…" : "Alterar foto"}
        </Button>
        {image ? (
          <RemoveAvatarDialog
            disabled={isPending}
            returnFocusRef={changeButtonRef}
          />
        ) : null}
      </div>
    </>
  )
}

export default AvatarUploader
