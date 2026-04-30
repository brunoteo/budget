const ALWAYS_PUBLIC = ["/login"] as const;
const SIGNUP_PATH = "/signup";

function startsWithSegment(pathname: string, prefix: string): boolean {
  if (pathname === prefix) return true;
  return pathname.startsWith(prefix + "/");
}

export function isPublicPath(
  pathname: string,
  allowSignup: string | undefined,
): boolean {
  if (ALWAYS_PUBLIC.some((p) => startsWithSegment(pathname, p))) return true;
  if (allowSignup === "true" && startsWithSegment(pathname, SIGNUP_PATH)) return true;
  return false;
}
