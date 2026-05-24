import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@k8event/shared/supabase/admin";
import { createSupabaseServerClient } from "@k8event/shared/supabase/server";

const COOKIE = "k8e_guest";
const ONE_YEAR = 60 * 60 * 24 * 365;

export async function POST() {
  const cookieStore = await cookies();
  let token = cookieStore.get(COOKIE)?.value;
  if (!token || token.length < 16) {
    token = randomUUID();
    cookieStore.set(COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: ONE_YEAR,
    });
  }

  // If the user is logged in (player session), use their username as the chat name
  // and look up their thread by player_id (persists across cookie loss / devices).
  let memberLabel: string | null = null;
  let authUserId: string | null = null;
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (authUser) {
      authUserId = authUser.id;
      const { data: profile } = await supabase
        .from("profiles")
        .select("username, display_name")
        .eq("user_id", authUser.id)
        .maybeSingle();
      if (profile) {
        memberLabel = profile.username ?? profile.display_name ?? null;
      }
    }
  } catch {
    // Auth lookup is optional — fall through to anonymous guest.
  }

  const admin = getSupabaseAdmin();

  const groupId = process.env.NEXT_PUBLIC_GROUP_ID ?? null;

  // -----------------------------------------------------------------------
  // 1. Logged-in player: find the most-recent non-closed thread by player_id.
  //    This is the persistence key — survives cookie loss and device changes.
  // -----------------------------------------------------------------------
  if (authUserId) {
    // Prefer the most recent non-closed thread; fall back to the most recent
    // closed thread so conversation history is preserved across devices (cookie loss).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q = (admin as any)
      .from("chat_threads")
      .select("id, status, guest_name")
      .eq("player_id", authUserId)
      .neq("status", "closed")
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    if (groupId) q = q.eq("group_id", groupId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let { data: playerThread } = await q;

    if (!playerThread) {
      // No open thread — try most recent closed thread (device change scenario)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q2 = (admin as any)
        .from("chat_threads")
        .select("id, status, guest_name")
        .eq("player_id", authUserId)
        .eq("status", "closed")
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();
      if (groupId) q2 = q2.eq("group_id", groupId);
      ({ data: playerThread } = await q2);
    }

    if (playerThread) {
      // Re-anchor cookie so RLS guest policies still work on this device,
      // and refresh the display name if it changed.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const patch: Record<string, unknown> = { guest_session: token };
      if (memberLabel && playerThread.guest_name !== memberLabel) {
        patch.guest_name = memberLabel;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin as any).from("chat_threads").update(patch).eq("id", playerThread.id);

      return NextResponse.json({
        threadId: playerThread.id,
        guestToken: token,
        status: playerThread.status,
        guestName: memberLabel ?? playerThread.guest_name,
      });
    }
  }

  // -----------------------------------------------------------------------
  // 2. Fall back to cookie-based lookup (anonymous guests + first login).
  // -----------------------------------------------------------------------
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cookieQ = (admin as any)
    .from("chat_threads")
    .select("id, status, guest_name")
    .eq("guest_session", token)
    .maybeSingle();
  if (groupId) cookieQ = cookieQ.eq("group_id", groupId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let { data: thread } = await cookieQ;

  if (!thread) {
    // -----------------------------------------------------------------------
    // 3. No existing thread — create one, linking player_id if authenticated.
    // -----------------------------------------------------------------------
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const insertPayload: Record<string, unknown> = {
      guest_session: token,
      guest_name: memberLabel,
    };
    if (authUserId) insertPayload.player_id = authUserId;
    if (groupId) insertPayload.group_id = groupId;

    const { data: created, error } = await (admin as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      .from("chat_threads")
      .insert(insertPayload)
      .select("id, status, guest_name")
      .single();
    if (error || !created) {
      return NextResponse.json({ error: error?.message ?? "insert_failed" }, { status: 500 });
    }
    thread = created;
  } else {
    // -----------------------------------------------------------------------
    // 4. Existing cookie thread — backfill player_id and name if now logged in.
    // -----------------------------------------------------------------------
    const patch: Record<string, unknown> = {};
    if (memberLabel && thread.guest_name !== memberLabel) patch.guest_name = memberLabel;
    if (authUserId) patch.player_id = authUserId;

    if (Object.keys(patch).length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: updated } = await (admin as any)
        .from("chat_threads")
        .update(patch)
        .eq("id", thread.id)
        .select("id, status, guest_name")
        .single();
      if (updated) thread = updated;
    }
  }

  if (!thread) {
    return NextResponse.json({ error: "thread_unavailable" }, { status: 500 });
  }

  return NextResponse.json({
    threadId: thread.id,
    guestToken: token,
    status: thread.status,
    guestName: thread.guest_name,
  });
}
