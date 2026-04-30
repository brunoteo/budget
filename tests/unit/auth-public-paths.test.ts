import { describe, it, expect } from "vitest";
import { isPublicPath } from "@/lib/auth/public-paths";

describe("isPublicPath", () => {
  it("treats /login as public regardless of signup flag", () => {
    expect(isPublicPath("/login", "true")).toBe(true);
    expect(isPublicPath("/login", "false")).toBe(true);
    expect(isPublicPath("/login", undefined)).toBe(true);
    expect(isPublicPath("/login/forgot", "false")).toBe(true);
  });

  it("treats /signup as public only when allowSignup is the string 'true'", () => {
    expect(isPublicPath("/signup", "true")).toBe(true);
    expect(isPublicPath("/signup", "false")).toBe(false);
    expect(isPublicPath("/signup", undefined)).toBe(false);
    expect(isPublicPath("/signup", "TRUE")).toBe(false);
    expect(isPublicPath("/signup", "1")).toBe(false);
  });

  it("does not match a path that just contains the public prefix", () => {
    expect(isPublicPath("/loginz", "true")).toBe(false);
    expect(isPublicPath("/signupx", "true")).toBe(false);
  });

  it("rejects everything else", () => {
    expect(isPublicPath("/", "true")).toBe(false);
    expect(isPublicPath("/expenses/new", "true")).toBe(false);
  });
});
