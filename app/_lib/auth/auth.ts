import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { APIError } from "better-auth/api"
import { nextCookies } from "better-auth/next-js"

import {
  PASSWORD_RESET_TTL_MINUTES,
  PASSWORD_RESET_TTL_SECONDS,
} from "@/app/_lib/domain/password-reset"
import { sendPasswordResetEmail } from "@/app/_lib/email/password-reset"
import { db } from "@/db"
import { roleEnum } from "@/db/schema"

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: "pg" }),
  advanced: {
    database: {
      generateId: "serial",
    },
  },
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    resetPasswordTokenExpiresIn: PASSWORD_RESET_TTL_SECONDS,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      if ("isActive" in user && user.isActive === false) return
      try {
        await sendPasswordResetEmail({
          to: user.email,
          userName: user.name,
          resetUrl: url,
          expiresInMinutes: PASSWORD_RESET_TTL_MINUTES,
        })
      } catch (error) {
        console.error("[sendResetPassword]", error)
      }
    },
  },
  user: {
    additionalFields: {
      departmentId: { type: "number", input: false },
      role: { type: roleEnum.enumValues, input: false },
      isActive: { type: "boolean", input: false },
      lastLoginAt: { type: "date", required: false, input: false },
    },
  },
  databaseHooks: {
    session: {
      create: {
        before: async (session, ctx) => {
          if (!ctx) {
            throw new APIError("INTERNAL_SERVER_ERROR", {
              code: "SESSION_CONTEXT_MISSING",
              message: "Não foi possível validar o usuário.",
            })
          }
          const owner = await ctx.context.internalAdapter.findUserById(
            session.userId,
          )
          if (owner && "isActive" in owner && owner.isActive === false) {
            throw new APIError("FORBIDDEN", {
              code: "USER_DEACTIVATED",
              message: "Usuário desativado.",
            })
          }
        },
        after: async (session, ctx) => {
          if (!ctx) return
          await ctx.context.internalAdapter.updateUser(session.userId, {
            lastLoginAt: new Date(),
          })
        },
      },
    },
  },
  plugins: [nextCookies()],
})
