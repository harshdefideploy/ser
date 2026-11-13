import { SignJWT, jwtVerify } from "jose";
import { getEnv } from "../config/index.js";
import type { AdminRole } from "@tron-gas-sponsor/shared";

export interface AuthPayload {
  sub: string;
  email: string;
  role: AdminRole;
}

const COOKIE_NAME = "tgs_session";

export function getSessionCookieName(): string {
  return COOKIE_NAME;
}

function secretKey(): Uint8Array {
  return new TextEncoder().encode(getEnv().JWT_SECRET);
}

export async function signSessionToken(payload: AuthPayload): Promise<string> {
  return new SignJWT({
    email: payload.email,
    role: payload.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secretKey());
}

export async function verifySessionToken(
  token: string,
): Promise<AuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (!payload.sub || typeof payload.email !== "string") {
      return null;
    }
    return {
      sub: payload.sub,
      email: payload.email,
      role: payload.role as AdminRole,
    };
  } catch {
    return null;
  }
}
