import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@k8event/shared/supabase/admin";

// Separate cookie name used exclusively for the /join waiting room.
// Avoids overwriting the player's existing k8e_guest session.
const JOIN_COOKIE = "k8e_join_guest";

const bodySchema = z.object({
  body: z.string().trim().min(1).max(2000),
});

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(JOIN_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: "no_session" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "bad_input" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  // Find thread by the join-guest token
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (admin as any)
    .from("chat_threads")
    .select("id, status")
    .eq("guest_session", token);
  const groupId = process.env.NEXT_PUBLIC_GROUP_ID;
  if (groupId) q = q.eq("group_id", groupId);
  const { data: thread } = await q.maybeSingle();

  if (!thread) {
    return NextResponse.json({ error: "thread_not_found" }, { status: 404 });
  }

  // Reopen if closed
  if (thread.status === "closed") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from("chat_threads").update({ status: "open" }).eq("id", thread.id);
  }

  const { error } = await admin.from("chat_messages").insert({
    thread_id: thread.id,
    sender: "guest",
    kind: "text",
    body: parsed.data.body,
  });

  // Update last_message_at
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any)
    .from("chat_threads")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", thread.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
