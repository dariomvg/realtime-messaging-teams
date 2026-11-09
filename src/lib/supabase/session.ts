import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/supabase/basic-auth/actions";
import type { AuthUser } from "@/lib/auth/supabase/basic-auth/types";
import { createClient } from "@/lib/supabase/server";
import { routes, type Role } from "@/lib/config";

export type Profile = {
  id: string;
  user_id: string;
  name: string;
  role: Role;
  position: string | null;
  password_changed: boolean;
  created_at: string;
};

type AuthContext = { user: AuthUser; profile: Profile | null };

/**
 * Validated user (checked against the Supabase server) + their profile.
 * Cached per request so several guards/components share one lookup.
 * profile is null when the auth user has no row in `profiles`.
 */
export const getAuthContext = cache(async (): Promise<AuthContext | null> => {
  const { data: user } = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, user_id, name, role, position, password_changed, created_at")
    .eq("user_id", user.id)
    .maybeSingle<Profile>();

  if (error) {
    // Server-side log only (never sent to the browser): shows the real cause.
    console.error("profiles query failed:", error.code, error.message);
    throw new Error("Failed to load profile");
  }

  return { user, profile: data };
});

/** Where a signed-in user belongs. */
export function getHomeRoute(profile: Profile): string {
  if (!profile.password_changed) return routes.changePassword;
  return profile.role === "admin" ? routes.dashboard : routes.inbox;
}

async function requireProfile(): Promise<Profile> {
  const ctx = await getAuthContext();
  if (!ctx) redirect(routes.login);
  // Valid auth user without profile (e.g. direct signUp): no access.
  if (!ctx.profile) redirect(routes.noAccess);
  return ctx.profile;
}

/** Use in every admin page AND every admin Server Action. */
export async function requireAdmin(): Promise<Profile> {
  const profile = await requireProfile();
  if (!profile.password_changed) redirect(routes.changePassword);
  if (profile.role !== "admin") redirect(routes.inbox);
  return profile;
}

/** Use in every worker page AND every worker Server Action. */
export async function requireWorker(): Promise<Profile> {
  const profile = await requireProfile();
  if (!profile.password_changed) redirect(routes.changePassword);
  if (profile.role !== "worker") redirect(routes.dashboard);
  return profile;
}

/** For /change-password: only reachable while the provisional password is active. */
export async function requirePendingPasswordChange(): Promise<Profile> {
  const profile = await requireProfile();
  if (profile.password_changed) redirect(getHomeRoute(profile));
  return profile;
}