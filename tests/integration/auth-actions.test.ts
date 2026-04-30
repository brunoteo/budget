import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { admin, deleteTestUsers } from "./_helpers";
import { signupAction } from "@/server/actions/auth";

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

    const result = await signupAction(fd);

    expect(result).toEqual({ error: "Registrazione disabilitata." });

    // Confirm no user was created
    const { data } = await admin().auth.admin.listUsers();
    const created = data.users.find((u) => u.email === TEST_EMAIL);
    expect(created).toBeUndefined();
  });
});
