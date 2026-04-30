import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { buildCsp } from "@/lib/auth/csp";

describe("buildCsp", () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("includes the nonce in script-src and style-src", () => {
    const csp = buildCsp("nonce-A");
    expect(csp).toContain("script-src 'self' 'nonce-nonce-A' 'strict-dynamic'");
    expect(csp).toContain("style-src 'self' 'nonce-nonce-A'");
  });

  it("includes the Supabase connect-src origin", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co";
    const csp = buildCsp("n");
    expect(csp).toContain("connect-src 'self' https://abc.supabase.co");
  });

  it("locks down framing", () => {
    const csp = buildCsp("n");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
  });

  it("allows inline-style attributes for Recharts", () => {
    const csp = buildCsp("n");
    expect(csp).toContain("style-src-attr 'unsafe-inline'");
  });

  it("emits upgrade-insecure-requests in production only", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(buildCsp("n")).toContain("upgrade-insecure-requests");
    vi.stubEnv("NODE_ENV", "development");
    expect(buildCsp("n")).not.toContain("upgrade-insecure-requests");
  });
});
