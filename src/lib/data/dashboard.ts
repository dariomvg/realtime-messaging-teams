import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/supabase/session";

export type WorkerRow = Pick<
  Profile,
  "id" | "user_id" | "name" | "role" | "position" | "created_at"
>;

export type MessageRow = {
  id: number;
  description: string;
  content: string;
  recipient_position: string;
  created_at: string;
};

const MAX_ROWS = 200;

/** Escape LIKE wildcards so user input is matched literally. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

type Filters = { q: string; position?: string };

/** Runs under the admin's session: RLS decides what is returned. */
export async function getProfiles({ q, position }: Filters): Promise<WorkerRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("profiles")
    .select("id, user_id, name, role, position, created_at")
    .order("created_at", { ascending: false })
    .limit(MAX_ROWS);

  if (q) query = query.ilike("name", `%${escapeLike(q)}%`);
  if (position) query = query.eq("position", position);

  const { data, error } = await query;
  if (error) throw new Error("Failed to load workers");
  return data ?? [];
}

export async function getMessages({ q, position }: Filters): Promise<MessageRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("messages")
    .select("id, description, content, recipient_position, created_at")
    .order("created_at", { ascending: false })
    .limit(MAX_ROWS);

  if (q) query = query.ilike("description", `%${escapeLike(q)}%`);
  if (position) query = query.eq("recipient_position", position);

  const { data, error } = await query;
  if (error) throw new Error("Failed to load messages");
  return data ?? [];
}
