import { redirect } from "next/navigation";
import { getAuthContext, getHomeRoute } from "@/lib/supabase/session";
import { routes } from "@/lib/config";

/** No UI: routes each signed-in user to the right place by role. */
export default async function HomePage() {
  const ctx = await getAuthContext();

  if (!ctx) redirect(routes.login);
  if (!ctx.profile) redirect(routes.noAccess);

  redirect(getHomeRoute(ctx.profile));
}