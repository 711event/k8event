import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Next.js 16: this file replaces the legacy middleware.ts convention.
// The function MUST be named `proxy`; it runs on the Node.js runtime.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Read the cached session locally (NO network call). supabase-js will
  // auto-refresh the token + setAll() new cookies if the JWT is near expiry.
  // Previously this used auth.getUser() which validates the JWT against the
  // Supabase auth server on every request; on the free tier that endpoint was
  // being throttled and middleware was taking ~35s per request. getSession()
  // is purely local and turns this into a sub-millisecond operation while
  // still keeping the refresh path intact for expiring tokens.
  await supabase.auth.getSession();

  return response;
}

export const config = {
  matcher: [
    // Run on all paths except static assets, image optimization, and favicon.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
