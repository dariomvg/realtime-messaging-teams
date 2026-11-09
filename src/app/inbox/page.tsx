import type { Metadata } from "next";
import { requireWorker } from "@/lib/supabase/session";
import { inboxContent, pagesMetadata } from "@/lib/config";
import { getInbox } from "@/lib/data/inbox";
import { ButtonSignOut } from "@/components/auth/button-sign-out";
import { InboxList } from "@/components/inbox/inbox-list";

export const metadata: Metadata = pagesMetadata.inbox;

export default async function InboxPage() {
  // Real protection: role + password check on the server for every request.
  const profile = await requireWorker();
  const items = await getInbox(profile.user_id);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 md:p-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">{inboxContent.header.title}</h1>
          <p className="text-sm text-muted-foreground">
            {profile.name}
            {profile.position ? ` · ${profile.position}` : ""}
          </p>
        </div>
        <ButtonSignOut />
      </header>

      <InboxList initialItems={items} userId={profile.user_id} />
    </main>
  );
}
