import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@tron-gas-sponsor/database";
import { LOG_EVENTS } from "@tron-gas-sponsor/shared";
import { getEnv } from "../../config/index.js";
import {
  getSessionCookieName,
  signSessionToken,
} from "../../lib/auth-tokens.js";
import { logEvent } from "../../lib/logger.js";
import { requireAuth } from "../../plugins/auth.js";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post("/auth/login", async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "Invalid credentials payload",
        details: parsed.error.flatten(),
      });
    }

    const { email, password } = parsed.data;
    const user = await prisma.adminUser.findUnique({ where: { email } });

    // Constant-ish response on failure
    if (!user) {
      return reply.status(401).send({ error: "Invalid email or password" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return reply.status(401).send({ error: "Invalid email or password" });
    }

    const token = await signSessionToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    await prisma.adminUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        adminId: user.id,
        action: LOG_EVENTS.ADMIN_LOGIN,
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
      },
    });

    logEvent(LOG_EVENTS.ADMIN_LOGIN, {
      adminId: user.id,
      email: user.email,
    });

    const env = getEnv();
    const webOrigin = (() => {
      try {
        return new URL(env.WEB_URL).origin;
      } catch {
        return env.WEB_URL;
      }
    })();
    const apiOrigin = (() => {
      try {
        return new URL(env.API_URL).origin;
      } catch {
        return env.API_URL;
      }
    })();
    const crossSite = webOrigin !== apiOrigin;
    reply.setCookie(getSessionCookieName(), token, {
      path: "/",
      httpOnly: true,
      // Cross-origin admin (web.* → api.*) needs None; same-origin keeps Lax.
      sameSite: crossSite ? "none" : "lax",
      secure: env.NODE_ENV === "production" || crossSite,
      maxAge: 60 * 60 * 12,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  });

  app.post("/auth/logout", async (request, reply) => {
    if (request.admin) {
      await prisma.auditLog.create({
        data: {
          adminId: request.admin.sub,
          action: LOG_EVENTS.ADMIN_LOGOUT,
          ipAddress: request.ip,
        },
      });
      logEvent(LOG_EVENTS.ADMIN_LOGOUT, { adminId: request.admin.sub });
    }

    const env = getEnv();
    let crossSite = false;
    try {
      crossSite = new URL(env.WEB_URL).origin !== new URL(env.API_URL).origin;
    } catch {
      crossSite = env.WEB_URL !== env.API_URL;
    }
    reply.clearCookie(getSessionCookieName(), {
      path: "/",
      sameSite: crossSite ? "none" : "lax",
      secure: env.NODE_ENV === "production" || crossSite,
    });
    return { ok: true };
  });

  app.get("/auth/me", async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const user = await prisma.adminUser.findUnique({
      where: { id: request.admin!.sub },
      select: {
        id: true,
        email: true,
        role: true,
        lastLoginAt: true,
        twoFactorEnabled: true,
      },
    });
    if (!user) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    return { user };
  });
};
