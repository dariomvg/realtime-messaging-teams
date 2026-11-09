import "server-only";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";

export type InboxItem = {
  /** message_recipients.id (unique per worker + message) */
  recipientId: string;
  messageId: number;
  readAt: string | null;
  description: string;
  content: string;
  createdAt: string;
  createdLabel: string;
};

type RawMessage = {
  id: number;
  description: string;
  content: string;
  created_at: string;
};

type RawRow = {
  id: string;
  message_id: number;
  read_at: string | null;
  messages: RawMessage | RawMessage[] | null;
};

/**
 * The worker's messages. Runs under the worker's session: RLS only returns
 * their own recipient rows and the messages delivered to them.
 */
export async function getInbox(userId: string): Promise<InboxItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("message_recipients")
    .select("id, message_id, read_at, messages(id, description, content, created_at)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("inbox query failed:", error.code, error.message);
    throw new Error("Failed to load inbox");
  }

  const items: InboxItem[] = [];
  for (const row of (data ?? []) as unknown as RawRow[]) {
    const message = Array.isArray(row.messages) ? row.messages[0] : row.messages;
    if (!message) continue;
    items.push({
      recipientId: row.id,
      messageId: row.message_id,
      readAt: row.read_at,
      description: message.description,
      content: message.content,
      createdAt: message.created_at,
      createdLabel: formatDateTime(message.created_at),
    });
  }

  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
