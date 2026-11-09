"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/session";
import { createClient } from "@/lib/supabase/server";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { commonContent, dashboardContent, positions, routes } from "@/lib/config";

export type ActionResult = { error: string | null };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Server-side log only (never sent to the browser): shows the real cause. */
function logError(action: string, error: { code?: string; message: string } | null) {
  console.error(`${action} failed:`, error?.code ?? "no-code", error?.message ?? "no rows affected");
}

const invalid: ActionResult = { error: commonContent.invalidInput };
const failed: ActionResult = { error: commonContent.genericError };

function isPosition(value: unknown): value is string {
  return typeof value === "string" && (positions as readonly string[]).includes(value);
}

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= max ? trimmed : null;
}

// Every action re-checks the admin role on the server; RLS is the second wall.

export async function sendMessageAction(input: {
  recipientPosition: string;
  description: string;
  content: string;
}): Promise<ActionResult> {
  await requireAdmin();

  const description = cleanText(input?.description, 200);
  const content = cleanText(input?.content, 5000);
  if (!isPosition(input?.recipientPosition) || !description || !content) return invalid;

  const supabase = await createClient();
  // The DB trigger fans the message out to every worker in that position.
  const { error } = await supabase.from("messages").insert({
    recipient_position: input.recipientPosition,
    description,
    content,
  });
  if (error) {
    logError("sendMessage", error);
    return failed;
  }

  revalidatePath(routes.dashboard);
  return { error: null };
}

export async function deleteMessageAction(id: number): Promise<ActionResult> {
  await requireAdmin();
  if (!Number.isSafeInteger(id) || id <= 0) return invalid;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("messages")
    .delete()
    .eq("id", id)
    .select("id");
  if (error || !data?.length) {
    logError("deleteMessage", error);
    return failed;
  }

  revalidatePath(routes.dashboard);
  return { error: null };
}

export async function updateWorkerPositionAction(
  userId: string,
  position: string
): Promise<ActionResult> {
  await requireAdmin();
  if (typeof userId !== "string" || !UUID_RE.test(userId) || !isPosition(position)) {
    return invalid;
  }

  const supabase = await createClient();
  // Only workers can be edited, and only their position (column grant + RLS enforce it too).
  const { data, error } = await supabase
    .from("profiles")
    .update({ position })
    .eq("user_id", userId)
    .eq("role", "worker")
    .select("id");
  if (error || !data?.length) {
    logError("updateWorkerPosition", error);
    return failed;
  }

  revalidatePath(routes.dashboard);
  return { error: null };
}

/** Turns an Edge Function failure into a safe, user-facing message. */
async function getFunctionError(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      if (body?.code === "email_exists") return dashboardContent.addWorkerModal.emailExists;
      if (body?.code === "weak_password") return commonContent.invalidInput;
      if (body?.code === "forbidden") return commonContent.forbidden;
    } catch {
      // Fall through to the generic message.
    }
  }
  return commonContent.genericError;
}

export async function createWorkerAction(input: {
  name: string;
  email: string;
  password: string;
  position: string;
}): Promise<ActionResult> {
  await requireAdmin();

  const name = cleanText(input?.name, 100);
  const email = cleanText(input?.email, 254)?.toLowerCase();
  const password = typeof input?.password === "string" ? input.password : "";
  if (
    !name ||
    !email ||
    !EMAIL_RE.test(email) ||
    password.length < 8 ||
    password.length > 72 ||
    !isPosition(input?.position)
  ) {
    return invalid;
  }

  // The user's session token travels with the call; the function re-verifies
  // the admin role itself and is the only place that holds the service role.
  const supabase = await createClient();
  const { error } = await supabase.functions.invoke("create-worker", {
    body: { name, email, password, position: input.position },
  });
  if (error) return { error: await getFunctionError(error) };

  revalidatePath(routes.dashboard);
  return { error: null };
}

export async function deleteWorkerAction(userId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (typeof userId !== "string" || !UUID_RE.test(userId) || userId === admin.user_id) {
    return invalid;
  }

  const supabase = await createClient();
  const { error } = await supabase.functions.invoke("delete-worker", {
    body: { userId },
  });
  if (error) return { error: await getFunctionError(error) };

  revalidatePath(routes.dashboard);
  return { error: null };
}

export async function updateMessagePositionAction(
  id: number,
  position: string
): Promise<ActionResult> {
  await requireAdmin();
  if (!Number.isSafeInteger(id) || id <= 0 || !isPosition(position)) return invalid;

  const supabase = await createClient();
  // A DB trigger re-syncs message_recipients when the position changes.
  const { data, error } = await supabase
    .from("messages")
    .update({ recipient_position: position })
    .eq("id", id)
    .select("id");
  if (error || !data?.length) {
    logError("updateMessagePosition", error);
    return failed;
  }

  revalidatePath(routes.dashboard);
  return { error: null };
}