import { getSessionCookie } from "better-auth/cookies"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

const authRoutes = ["/login"]

export const proxy = (request: NextRequest) => {
  const hasSessionCookie = getSessionCookie(request) !== null
  const isAuthRoute = authRoutes.includes(request.nextUrl.pathname)

  if (!hasSessionCookie && !isAuthRoute) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  if (hasSessionCookie && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|.*\\..*).*)"],
}
