import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import {
  getSessionCookieName,
  verifySessionToken,
  type AuthPayload,
} from "../lib/auth-tokens.js";

declare module "fastify" {
  interface FastifyRequest {
    admin?: AuthPayload;
  }
}

async function loadAdminFromRequest(
  request: FastifyRequest,
): Promise<AuthPayload | undefined> {
  const token = request.cookies[getSessionCookieName()];
  if (!token) return undefined;
  const payload = await verifySessionToken(token);
  return payload ?? undefined;
}

export function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
): boolean {
  if (!request.admin) {
    void reply.status(401).send({ error: "Unauthorized" });
    return false;
  }
  return true;
}

export function requireAdminRole(
  request: FastifyRequest,
  reply: FastifyReply,
  allowed: Array<"SUPER_ADMIN" | "ADMIN" | "VIEWER"> = [
    "SUPER_ADMIN",
    "ADMIN",
  ],
): boolean {
  if (!requireAuth(request, reply)) return false;
  if (!allowed.includes(request.admin!.role)) {
    void reply.status(403).send({ error: "Forbidden" });
    return false;
  }
  return true;
}

const authPlugin: FastifyPluginAsync = async (app) => {
  app.decorateRequest("admin", undefined);

  app.addHook("preHandler", async (request) => {
    request.admin = await loadAdminFromRequest(request);
  });
};

export default fp(authPlugin, {
  name: "auth-plugin",
  dependencies: ["@fastify/cookie"],
});
