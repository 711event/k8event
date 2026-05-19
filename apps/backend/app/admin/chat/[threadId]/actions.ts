"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@k8event/shared/supabase/server";
import { requireRole } from "@k8event/shared/auth/require-role";

export type ChatActionState = { ok: true } | { error: string } | undefined;

const sendSchema = z.object({
  threadId: z.string().uuid(),
  body: z.string().trim().min(1).max(2000).optional(),
  imageUrl: z.string().url().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  clientId: z.string().max(64).optional(),
});

export async function agentSendMessageAction(input: unknown): Promise<ChatActionState> {
  const user = await requireRole(["admin", "agent"]);
  const parsed = sendSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  if (!parsed.data.body && !parsed.data.imageUrl) return { error: "Empty message" };

  const supabase = await createSupabaseServerClient();
  const isImage = !!parsed.data.imageUrl;
  const { error } = await supabase.from("chat_messages").insert({
    thread_id: parsed.data.threadId,
    sender: "agent",
    agent_id: user.id,
    kind: isImage ? "image" : "text",
    body: isImage ? null : parsed.data.body ?? null,
    image_url: parsed.data.imageUrl ?? null,
    width: parsed.data.width ?? null,
    height: parsed.data.height ?? null,
    client_id: parsed.data.clientId ?? null,
  });
  if (error) return { error: error.message };
  return { ok: true };
}

export async function claimThreadAction(threadId: string): Promise<ChatActionState> {
  const user = await requireRole(["admin", "agent"]);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("chat_threads")
    .update({ claimed_by: user.id, status: "claimed" })
    .eq("id", threadId);
  if (error) return { error: error.message };
  revalidatePath("/admin/chat");
  revalidatePath(`/admin/chat/${threadId}`);
  return { ok: true };
}

export async function unclaimThreadAction(threadId: string): Promise<ChatActionState> {
  await requireRole(["admin", "agent"]);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("chat_threads")
    .update({ claimed_by: null, status: "open" })
    .eq("id", threadId);
  if (error) return { error: error.message };
  revalidatePath("/admin/chat");
  revalidatePath(`/admin/chat/${threadId}`);
  return { ok: true };
}

export async function closeThreadAction(threadId: string): Promise<ChatActionState> {
  await requireRole(["admin", "agent"]);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("chat_threads")
    .update({ status: "closed" })
    .eq("id", threadId);
  if (error) return { error: error.message };
  revalidatePath("/admin/chat");
  revalidatePath(`/admin/chat/${threadId}`);
  return { ok: true };
}
