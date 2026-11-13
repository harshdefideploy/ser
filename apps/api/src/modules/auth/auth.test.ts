import { describe, expect, it } from "vitest";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

describe("auth validation (Phase 1)", () => {
  it("rejects malformed email", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "longenough",
    });
    expect(result.success).toBe(false);
  });

  it("rejects short password", () => {
    const result = loginSchema.safeParse({
      email: "admin@example.com",
      password: "short",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid payload", () => {
    const result = loginSchema.safeParse({
      email: "admin@example.com",
      password: "ChangeMeSecurely123!",
    });
    expect(result.success).toBe(true);
  });
});
