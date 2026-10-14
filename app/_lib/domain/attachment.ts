import type { AccountState } from "@/app/_lib/types/account"
import type {
  AttachmentByteSignature,
  AttachmentExtension,
  AttachmentKind,
  AttachmentTypeMatch,
  AttachmentTypeSpec,
  AttachmentUploadStatus,
  PendingAttachmentKeyParts,
} from "@/app/_lib/types/attachment"

export const ATTACHMENT_MAX_MEGABYTES = 10

export const ATTACHMENT_MAX_BYTES = ATTACHMENT_MAX_MEGABYTES * 1024 * 1024

export const ATTACHMENT_MAX_FILES = 5

export const ATTACHMENT_HEADER_BYTES = 4096

export const ATTACHMENT_FILE_NAME_MAX_LENGTH = 255

export const ATTACHMENT_UPLOAD_URL_TTL_SECONDS = 300

export const ATTACHMENT_PENDING_PREFIX = "pending/"

export const ATTACHMENT_STORED_PREFIX = "tickets/"

const ZIP_SIGNATURE: readonly AttachmentByteSignature[] = [
  { offset: 0, bytes: [0x50, 0x4b, 0x03, 0x04] },
]

const JPEG_SIGNATURE: readonly AttachmentByteSignature[] = [
  { offset: 0, bytes: [0xff, 0xd8, 0xff] },
]

export const ATTACHMENT_TYPES = {
  png: {
    contentType: "image/png",
    kind: "image",
    check: {
      kind: "binary",
      signature: [
        {
          offset: 0,
          bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
        },
      ],
    },
  },
  jpg: {
    contentType: "image/jpeg",
    kind: "image",
    check: { kind: "binary", signature: JPEG_SIGNATURE },
  },
  jpeg: {
    contentType: "image/jpeg",
    kind: "image",
    check: { kind: "binary", signature: JPEG_SIGNATURE },
  },
  webp: {
    contentType: "image/webp",
    kind: "image",
    check: {
      kind: "binary",
      signature: [
        { offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] },
        { offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] },
      ],
    },
  },
  pdf: {
    contentType: "application/pdf",
    kind: "pdf",
    check: {
      kind: "binary",
      signature: [{ offset: 0, bytes: [0x25, 0x50, 0x44, 0x46, 0x2d] }],
    },
  },
  txt: { contentType: "text/plain", kind: "text", check: { kind: "text" } },
  csv: {
    contentType: "text/csv",
    kind: "spreadsheet",
    check: { kind: "text" },
  },
  log: { contentType: "text/plain", kind: "text", check: { kind: "text" } },
  docx: {
    contentType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    kind: "document",
    check: { kind: "binary", signature: ZIP_SIGNATURE },
  },
  xlsx: {
    contentType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    kind: "spreadsheet",
    check: { kind: "binary", signature: ZIP_SIGNATURE },
  },
  pptx: {
    contentType:
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    kind: "presentation",
    check: { kind: "binary", signature: ZIP_SIGNATURE },
  },
  zip: {
    contentType: "application/zip",
    kind: "archive",
    check: { kind: "binary", signature: ZIP_SIGNATURE },
  },
  rar: {
    contentType: "application/vnd.rar",
    kind: "archive",
    check: {
      kind: "binary",
      signature: [{ offset: 0, bytes: [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07] }],
    },
  },
} satisfies Record<AttachmentExtension, AttachmentTypeSpec>

const isAttachmentExtension = (value: string): value is AttachmentExtension =>
  Object.hasOwn(ATTACHMENT_TYPES, value)

export const ATTACHMENT_EXTENSIONS: readonly AttachmentExtension[] =
  Object.keys(ATTACHMENT_TYPES).filter(isAttachmentExtension)

export const ATTACHMENT_INPUT_ACCEPT = ATTACHMENT_EXTENSIONS.map(
  (extension) => `.${extension}`,
).join(",")

export const attachmentExtensionOf = (
  fileName: string,
): AttachmentExtension | null => {
  const dot = fileName.lastIndexOf(".")
  if (dot <= 0 || dot === fileName.length - 1) return null
  const extension = fileName.slice(dot + 1).toLowerCase()
  return isAttachmentExtension(extension) ? extension : null
}

export const attachmentKindFor = (fileName: string): AttachmentKind | null => {
  const extension = attachmentExtensionOf(fileName)
  if (extension === null) return null
  const spec: AttachmentTypeSpec = ATTACHMENT_TYPES[extension]
  return spec.kind
}

export const attachmentExtensionLabel = (fileName: string): string | null =>
  attachmentExtensionOf(fileName)?.toUpperCase() ?? null

const FORBIDDEN_FILE_NAME_CHARACTERS = ["/", "\\"]

const FORBIDDEN_FILE_NAME_CODE_POINTS: readonly (readonly [number, number])[] =
  [
    [0x0000, 0x001f],
    [0x007f, 0x009f],
    [0x061c, 0x061c],
    [0x200e, 0x200f],
    [0x202a, 0x202e],
    [0x2066, 0x2069],
  ]

const isForbiddenCodePoint = (code: number): boolean =>
  FORBIDDEN_FILE_NAME_CODE_POINTS.some(
    ([start, end]) => code >= start && code <= end,
  )

export const isSafeAttachmentFileName = (fileName: string): boolean =>
  Array.from(fileName).every((character) => {
    const code = character.codePointAt(0)
    return (
      code !== undefined &&
      !isForbiddenCodePoint(code) &&
      !FORBIDDEN_FILE_NAME_CHARACTERS.includes(character)
    )
  })

const hasBytesAt = (
  bytes: Uint8Array,
  { offset, bytes: expected }: AttachmentByteSignature,
): boolean =>
  bytes.length >= offset + expected.length &&
  expected.every((value, index) => bytes[offset + index] === value)

const looksLikeText = (bytes: Uint8Array): boolean =>
  bytes.length > 0 && !bytes.includes(0x00)

export const detectAttachmentType = (
  fileName: string,
  headBytes: Uint8Array,
): AttachmentTypeMatch | null => {
  const extension = attachmentExtensionOf(fileName)
  if (extension === null) return null

  const spec: AttachmentTypeSpec = ATTACHMENT_TYPES[extension]
  const matches =
    spec.check.kind === "text"
      ? looksLikeText(headBytes)
      : spec.check.signature.every((part) => hasBytesAt(headBytes, part))

  return matches ? { extension, contentType: spec.contentType } : null
}

export const attachmentTypeFor = (
  extension: AttachmentExtension,
): AttachmentTypeMatch => ({
  extension,
  contentType: ATTACHMENT_TYPES[extension].contentType,
})

export const pendingAttachmentKey = (
  userId: number,
  id: string,
  extension: AttachmentExtension,
): string => `${ATTACHMENT_PENDING_PREFIX}${userId}/${id}.${extension}`

export const storedAttachmentKey = (
  id: string,
  extension: AttachmentExtension,
): string => `${ATTACHMENT_STORED_PREFIX}${id}.${extension}`

const UUID_PATTERN =
  "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"

export const PENDING_ATTACHMENT_KEY_PATTERN = new RegExp(
  `^${ATTACHMENT_PENDING_PREFIX}([1-9]\\d*)/(${UUID_PATTERN})\\.([a-z]+)$`,
)

const STORED_ATTACHMENT_KEY_PATTERN = new RegExp(
  `^${ATTACHMENT_STORED_PREFIX}${UUID_PATTERN}\\.([a-z]+)$`,
)

export const parsePendingAttachmentKey = (
  key: string,
): PendingAttachmentKeyParts | null => {
  const match = PENDING_ATTACHMENT_KEY_PATTERN.exec(key)
  if (match === null) return null

  const [, userId, id, extension] = match
  if (
    userId === undefined ||
    id === undefined ||
    extension === undefined ||
    !isAttachmentExtension(extension)
  ) {
    return null
  }

  return { userId: Number(userId), id, extension }
}

export const isPendingAttachmentKeyOf = (
  key: string,
  userId: number,
): boolean => parsePendingAttachmentKey(key)?.userId === userId

const isStoredAttachmentKey = (key: string): boolean => {
  const extension = STORED_ATTACHMENT_KEY_PATTERN.exec(key)?.[1]
  return extension !== undefined && isAttachmentExtension(extension)
}

export const isAttachmentStorageKey = (key: string): boolean =>
  parsePendingAttachmentKey(key) !== null || isStoredAttachmentKey(key)

export const canUploadAttachment = (account: AccountState): boolean =>
  account.isActive && !account.mustChangePassword

const KILOBYTE = 1024
const MEGABYTE = KILOBYTE * 1024

const sizeFormat = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 })

export const formatAttachmentSize = (bytes: number): string => {
  if (bytes < KILOBYTE) return `${bytes} B`
  if (bytes < MEGABYTE) return `${sizeFormat.format(bytes / KILOBYTE)} KB`
  return `${sizeFormat.format(bytes / MEGABYTE)} MB`
}

export const ATTACHMENT_TYPE_NOT_ALLOWED_MESSAGE =
  "Tipo de arquivo não aceito. Envie PNG, JPEG, WebP, PDF, TXT, CSV, LOG, DOCX, XLSX, PPTX, ZIP ou RAR."

export const ATTACHMENT_CONTENT_MISMATCH_MESSAGE =
  "O conteúdo do arquivo não corresponde à extensão."

export const ATTACHMENT_TOO_LARGE_MESSAGE = `O arquivo precisa ter no máximo ${ATTACHMENT_MAX_MEGABYTES} MB.`

export const ATTACHMENT_EMPTY_MESSAGE = "O arquivo está vazio."

export const ATTACHMENT_INVALID_FILE_NAME_MESSAGE = "Nome de arquivo inválido."

export const ATTACHMENT_TOO_MANY_MESSAGE = `Anexe no máximo ${ATTACHMENT_MAX_FILES} arquivos.`

export const ATTACHMENT_DUPLICATE_MESSAGE = "O mesmo envio aparece duas vezes."

export const ATTACHMENT_INVALID_REFERENCE_MESSAGE =
  "Anexo inválido. Remova-o e anexe de novo."

export const ATTACHMENT_UPLOAD_FORBIDDEN_MESSAGE =
  "Você não pode enviar arquivos agora."

export const ATTACHMENT_UPLOAD_UNEXPECTED_MESSAGE =
  "Não foi possível preparar o envio agora. Tente novamente."

export const ATTACHMENT_UPLOAD_FAILED_MESSAGE =
  "Falha no envio. Remova o arquivo e tente de novo."

export const ATTACHMENT_UPLOADS_IN_PROGRESS_MESSAGE =
  "Aguarde o envio dos anexos terminar."

export const ATTACHMENT_UPLOADS_FAILED_MESSAGE =
  "Remova os anexos com falha antes de continuar."

export const ATTACHMENT_LIMITS_HINT = `Até ${ATTACHMENT_MAX_FILES} arquivos de até ${ATTACHMENT_MAX_MEGABYTES} MB cada.`

export const ATTACHMENT_UPLOAD_STATUS_LABELS = {
  uploading: "Enviando…",
  uploaded: "Enviado",
  failed: "Falha no envio",
} satisfies Record<AttachmentUploadStatus, string>

export const describeAttachmentUploadStatus = (
  fileName: string,
  status: AttachmentUploadStatus,
): string => `${fileName}: ${ATTACHMENT_UPLOAD_STATUS_LABELS[status]}`

export const describeInvalidAttachment = (fileName: string): string =>
  `Não foi possível anexar "${fileName}". Remova o arquivo e anexe de novo.`

export const describeRejectedAttachment = (
  fileName: string,
  reason: string,
): string => `${fileName}: ${reason}`

export const removeAttachmentLabel = (fileName: string): string =>
  `Remover ${fileName}`
