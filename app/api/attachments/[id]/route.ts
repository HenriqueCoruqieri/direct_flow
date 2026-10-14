import { type NextRequest, NextResponse } from "next/server"

import { getAccountFacts } from "@/app/_lib/auth/account-facts"
import { getSession } from "@/app/_lib/auth/session"
import { findAttachmentForDownload } from "@/app/_lib/data/attachments"
import {
  ATTACHMENT_DOWNLOAD_FAILED_MESSAGE,
  ATTACHMENT_NOT_FOUND_MESSAGE,
  canDownloadAttachment,
} from "@/app/_lib/domain/attachment"
import { createAttachmentDownloadUrl } from "@/app/_lib/storage/attachments"
import type { AttachmentDownloadTarget } from "@/app/_lib/types/attachment"
import type { RegistryAccessFacts } from "@/app/_lib/types/registry"
import type { TicketActorFacts } from "@/app/_lib/types/ticket"
import { parseAttachmentIdParam } from "@/app/_lib/validation/attachment"

const LOG_PREFIX = "[attachments:download]"

const NO_STORE = "private, no-store"

const textResponse = (body: string, status: number): Response =>
  new Response(body, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": NO_STORE,
    },
  })

const notFound = (): Response => textResponse(ATTACHMENT_NOT_FOUND_MESSAGE, 404)

const unavailable = (): Response =>
  textResponse(ATTACHMENT_DOWNLOAD_FAILED_MESSAGE, 503)

export const GET = async (
  request: NextRequest,
  ctx: RouteContext<"/api/attachments/[id]">,
): Promise<Response> => {
  const id = parseAttachmentIdParam((await ctx.params).id)
  if (id === null) return notFound()

  const session = await getSession()
  if (!session) return NextResponse.redirect(new URL("/login", request.url))

  let loaded: [RegistryAccessFacts | null, AttachmentDownloadTarget | null]

  try {
    loaded = await Promise.all([
      getAccountFacts(),
      findAttachmentForDownload(id),
    ])
  } catch (error) {
    console.error(LOG_PREFIX, error)
    return unavailable()
  }

  const [facts, target] = loaded
  if (!facts || !target) return notFound()

  const actor: TicketActorFacts = {
    userId: session.id,
    departmentId: facts.departmentId,
    isBoard: facts.isBoard,
    role: facts.role,
    isActive: facts.isActive,
    mustChangePassword: facts.mustChangePassword,
  }
  if (!canDownloadAttachment(actor, target.ticket)) return notFound()

  let url: string

  try {
    url = await createAttachmentDownloadUrl(target.storageKey, target.fileName)
  } catch (error) {
    console.error(LOG_PREFIX, error)
    return unavailable()
  }

  const response = NextResponse.redirect(url, 307)
  response.headers.set("Cache-Control", NO_STORE)

  return response
}
