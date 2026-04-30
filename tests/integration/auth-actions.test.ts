import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { admin, deleteTestUsers } from "./_helpers";

// Mock next/headers so Server Actions can be called outside Next.js request context
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: () => [],
    set: () => undefined,
  }),
}));

import { signupAction } from "@/server/actions/auth";
import { loginAction } from "@/server/actions/auth";

const TEST_EMAIL = "signup-guard-test@test.local";

describe("signupAction — signup disabled guard", () => {
  beforeEach(async () => {
    await deleteTestUsers([TEST_EMAIL]);
  });

  afterEach(async () => {
    await deleteTestUsers([TEST_EMAIL]);
    vi.unstubAllEnvs();
  });

  it("returns signupDisabled error and creates no user when NEXT_PUBLIC_ALLOW_SIGNUP is not 'true'", async () => {
    vi.stubEnv("NEXT_PUBLIC_ALLOW_SIGNUP", "false");

    const fd = new FormData();
    fd.set("email", TEST_EMAIL);
    fd.set("password", "Password!99");
    fd.set("displayName", "Test");
    fd.set("cycleStartDay", "1");

    const result = await signupAction({ ok: false, fieldErrors: {} }, fd);

    expect(result).toEqual({ ok: false, fieldErrors: {}, formError: "Registrazione disabilitata." });

    // Confirm no user was created
    const { data } = await admin().auth.admin.listUsers();
    const created = data.users.find((u) => u.email === TEST_EMAIL);
    expect(created).toBeUndefined();
  });
});

describe("loginAction", () => {
  it("returns fieldErrors for malformed input", async () => {
    const fd = new FormData();
    fd.set("email", "nope");
    fd.set("password", "x");
    const result = await loginAction({ ok: false, fieldErrors: {} }, fd);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.fieldErrors.email).toBeDefined();
    expect(result.fieldErrors.password).toBeDefined();
  });

  it("returns formError when Supabase rejects credentials", async () => {
    const fd = new FormData();
    fd.set("email", "nobody@example.com");
    fd.set("password", "TestPassword!1");
    const result = await loginAction({ ok: false, fieldErrors: {} }, fd);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.formError).toBeDefined();
  });
});
