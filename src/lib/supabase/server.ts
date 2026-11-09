import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase server client for DATA queries (profiles, messages, RPC).
 * It uses the anon key + the user's session cookies, so every query runs
 * under the user's identity and RLS applies. Never use the service role here.
 *
 * Auth operations (sign in, sign out, reset password...) stay in
 * lib/auth/supabase/basic-auth; its internal client is not exported.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component: proxy.ts refreshes the session.
          }
        },
      },
    }
  );
}
