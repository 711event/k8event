import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@k8event/shared/supabase/admin";

const COOKIE = "k8e_guest";

const bodySchema = z.object({
  body: z.string().trim().min(1).max(2000).optional(),
  imageUrl: z.string().url().max(800).optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  clientId: z.string().max(64).optional(),
  guestName: z.string().trim().min(1).max(40).optional(),
});

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: "no_session" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "bad_input" }, { status: 400 });
  }
  if (!parsed.data.body && !parsed.data.imageUrl) {
    return NextResponse.json({ error: "empty_message" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data: thread } = await admin
    .from("chat_threads")
    .select("id, status")
    .eq("guest_session", token)
    .maybeSingle();

  if (!thread) {
    return NextResponse.json({ error: "thread_not_found" }, { status: 404 });
  }

  // If the thread was closed by an agent and the guest sends a new message,
  // reopen it so it appears in the admin inbox under "未处理".
  const patch: Record<string, unknown> = {};
  if (thread.status === "closed") patch.status = "open";
  if (parsed.data.guestName) patch.guest_name = parsed.data.guestName;
  if (Object.keys(patch).length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from("chat_threads").update(patch).eq("id", thread.id);
  }

  const isImage = !!parsed.data.imageUrl;
  const { error } = await admin.from("chat_messages").insert({
    thread_id: thread.id,
    sender: "guest",
    kind: isImage ? "image" : "text",
    body: isImage ? null : parsed.data.body ?? null,
    image_url: parsed.data.imageUrl ?? null,
    width: parsed.data.width ?? null,
    height: parsed.data.height ?? null,
    client_id: parsed.data.clientId ?? null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
