import { getSessionCookie } from "better-auth/cookies"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

const publicRoutes = ["/login", "/reset-password"]

export const proxy = (request: NextRequest) => {
  const { pathname } = request.nextUrl

  if (publicRoutes.includes(pathname)) return NextResponse.next()

  if (getSessionCookie(request) === null) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|.*\\..*).*)"],
}
