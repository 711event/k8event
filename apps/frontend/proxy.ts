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

  // Validate the JWT against the Supabase Auth server on every request.
  // This ensures revoked or tampered sessions are rejected immediately,
  // rather than trusting the locally-cached cookie value.
  // (Previously used getSession() to avoid free-tier throttling; the project
  // is now on the PRO plan so the rate limit concern no longer applies.)
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    // Run on all paths except static assets, image optimization, and favicon.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
