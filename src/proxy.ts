import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isPublicPath } from "@/lib/auth/public-paths";
import { buildCsp } from "@/lib/auth/csp";

export async function proxy(req: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp(nonce);

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("Content-Security-Policy", csp);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (toSet) =>
          toSet.forEach(({ name, value, options }) =>
            res.cookies.set({ name, value, ...options }),
        ),
      },
    },
  );
  const { data } = await supabase.auth.getUser();
  const isPublic = isPublicPath(
    req.nextUrl.pathname,
    process.env.NEXT_PUBLIC_ALLOW_SIGNUP,
  );

  if (!data.user && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    const redirect = NextResponse.redirect(url);
    redirect.headers.set("Content-Security-Policy", csp);
    return redirect;
  }
  if (data.user && isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    const redirect = NextResponse.redirect(url);
    redirect.headers.set("Content-Security-Policy", csp);
    return redirect;
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/|api/|.*\\..*).*)"],
};
