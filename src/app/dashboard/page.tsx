import type { Metadata } from "next";
import { requireAdmin } from "@/lib/supabase/session";
import { pagesMetadata, positions } from "@/lib/config";
import { getMessages, getProfiles } from "@/lib/data/dashboard";
import { DashboardFilters, type DashboardView } from "@/components/dashboard/dashboard-filters";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { TableMessages } from "@/components/dashboard/table-messages";
import { TableWorkers } from "@/components/dashboard/table-workers";

export const metadata: Metadata = pagesMetadata.dashboard;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  // Real protection: role check on the server for every request.
  const admin = await requireAdmin();

  const params = await searchParams;
  const view: DashboardView = first(params.view) === "messages" ? "messages" : "workers";
  const q = first(params.q).trim().slice(0, 100);
  const positionParam = first(params.position);
  const position = (positions as readonly string[]).includes(positionParam)
    ? positionParam
    : "";

  const filters = { q, position: position || undefined };
  const workers = view === "workers" ? await getProfiles(filters) : [];
  const messages = view === "messages" ? await getMessages(filters) : [];

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-8">
      <DashboardHeader adminName={admin.name} />
      <DashboardFilters view={view} q={q} position={position} />
      {view === "workers" ? (
        <TableWorkers workers={workers} />
      ) : (
        <TableMessages messages={messages} />
      )}
    </main>
  );
}