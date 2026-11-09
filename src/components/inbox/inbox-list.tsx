"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/auth/supabase/basic-auth/client";
import { commonContent, inboxContent } from "@/lib/config";
import { formatDateTime } from "@/lib/format";
import type { InboxItem } from "@/lib/data/inbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = { initialItems: InboxItem[]; userId: string };

type RecipientRow = { id: string; message_id: number; read_at: string | null };

function sortItems(items: InboxItem[]): InboxItem[] {
  return [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function InboxList({ initialItems, userId }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<InboxItem[]>(initialItems);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Lets the realtime handlers see the latest list without re-subscribing.
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    const channel = supabase
      .channel(`inbox:${userId}`)
      // A message was delivered to this worker (new message, or reassigned to their position).
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "message_recipients",
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          const row = payload.new as RecipientRow;
          if (itemsRef.current.some((item) => item.recipientId === row.id)) return;

          // RLS lets the worker read this message because the recipient row now exists.
          const { data: message } = await supabase
            .from("messages")
            .select("id, description, content, created_at")
            .eq("id", row.message_id)
            .maybeSingle();
          if (!message) return;

          const item: InboxItem = {
            recipientId: row.id,
            messageId: row.message_id,
            readAt: row.read_at,
            description: message.description,
            content: message.content,
            createdAt: message.created_at,
            createdLabel: formatDateTime(message.created_at),
          };
          setItems((prev) =>
            prev.some((existing) => existing.recipientId === item.recipientId)
              ? prev
              : sortItems([item, ...prev]),
          );
          toast.info(`${inboxContent.newMessageToast}: ${item.description}`);
        },
      )
      // Read status changed (e.g. the same worker opened it in another tab).
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "message_recipients",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as RecipientRow;
          setItems((prev) =>
            prev.map((item) =>
              item.recipientId === row.id ? { ...item, readAt: row.read_at } : item,
            ),
          );
        },
      )
      // A message was deleted or reassigned away. DELETE events cannot be filtered
      // and only carry the primary key, so ids that are not in this list are ignored.
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "message_recipients" },
        (payload) => {
          const id = (payload.old as { id?: string }).id;
          if (!id) return;
          setItems((prev) => prev.filter((item) => item.recipientId !== id));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, userId]);

  // If the open message disappears (deleted/reassigned), the dialog closes by itself.
  const selected = items.find((item) => item.recipientId === selectedId) ?? null;
  const unreadCount = items.filter((item) => !item.readAt).length;

  async function openItem(item: InboxItem) {
    setSelectedId(item.recipientId);
    if (item.readAt) return;

    // SECURITY DEFINER function: only touches the caller's own row, only read_at.
    const { error } = await supabase.rpc("mark_message_read", {
      p_message_id: item.messageId,
    });
    if (error) {
      toast.error(commonContent.genericError);
      return;
    }
    setItems((prev) =>
      prev.map((existing) =>
        existing.recipientId === item.recipientId && !existing.readAt
          ? { ...existing, readAt: new Date().toISOString() }
          : existing,
      ),
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {unreadCount} {inboxContent.header.unreadSuffix}
      </p>

      {items.length === 0 ? (
        <p className="border border-dashed p-8 text-center text-sm text-muted-foreground">
          {inboxContent.empty}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => {
            const isUnread = !item.readAt;
            return (
              <li key={item.recipientId}>
                <button
                  type="button"
                  onClick={() => openItem(item)}
                  className={
                    isUnread
                      ? "flex w-full items-start justify-between gap-3 border border-primary bg-accent p-4 text-left text-accent-foreground"
                      : "flex w-full items-start justify-between gap-3 border bg-card p-4 text-left text-muted-foreground"
                  }
                >
                  <span className="flex min-w-0 flex-col gap-1">
                    <span
                      className={
                        isUnread
                          ? "truncate text-sm font-semibold"
                          : "truncate text-sm font-normal"
                      }
                    >
                      {item.description}
                    </span>
                    <span className="text-xs text-muted-foreground">{item.createdLabel}</span>
                  </span>
                  <Badge variant={isUnread ? "default" : "outline"}>
                    {isUnread ? inboxContent.status.unread : inboxContent.status.read}
                  </Badge>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
      >
        <DialogContent>
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.description}</DialogTitle>
                <DialogDescription>{selected.createdLabel}</DialogDescription>
              </DialogHeader>
              <p className="max-h-96 overflow-y-auto text-sm whitespace-pre-wrap">
                {selected.content}
              </p>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedId(null)}>
                  {inboxContent.detail.close}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
