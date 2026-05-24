import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@k8event/shared/supabase/admin";
import { createSupabaseServerClient } from "@k8event/shared/supabase/server";

const COOKIE = "k8e_guest";
const ONE_YEAR = 60 * 60 * 24 * 365;

function makeCookieOpts() {
  return { httpOnly: true, sameSite: "lax" as const, path: "/", maxAge: ONE_YEAR };
}

export async function POST() {
  const cookieStore = await cookies();
  let token = cookieStore.get(COOKIE)?.value;
  if (!token || token.length < 16) {
    token = randomUUID();
    cookieStore.set(COOKIE, token, makeCookieOpts());
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
      const { error: updateErr } = await (admin as any)
        .from("chat_threads")
        .update(patch)
        .eq("id", playerThread.id);

      // UNIQUE constraint (code 23505): the current cookie is already anchored to a
      // different thread on this device (e.g. an anonymous thread or another player's
      // thread from a shared device). Issue a fresh cookie so both threads keep their
      // own distinct guest_session.
      if (updateErr?.code === "23505") {
        token = randomUUID();
        cookieStore.set(COOKIE, token, makeCookieOpts());
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (admin as any)
          .from("chat_threads")
          .update({ guest_session: token, ...(memberLabel ? { guest_name: memberLabel } : {}) })
          .eq("id", playerThread.id);
      }

      return NextResponse.json({
        threadId: playerThread.id,
        guestToken: token,
        status: playerThread.status,
        guestName: memberLabel ?? playerThread.guest_name,
      });
    }

    // No thread exists yet for this player.
    // Check if the current cookie is already owned by a different thread, and issue
    // a fresh one to avoid a UNIQUE constraint failure on insert.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let cookieCheckQ = (admin as any)
      .from("chat_threads")
      .select("id")
      .eq("guest_session", token)
      .maybeSingle();
    if (groupId) cookieCheckQ = cookieCheckQ.eq("group_id", groupId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: cookieOwner } = await cookieCheckQ;
    if (cookieOwner) {
      // Cookie is taken by another thread — generate a fresh one.
      token = randomUUID();
      cookieStore.set(COOKIE, token, makeCookieOpts());
    }

    // Create a new thread for this authenticated player.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const insertPayload: Record<string, unknown> = {
      guest_session: token,
      guest_name: memberLabel,
      player_id: authUserId,
    };
    if (groupId) insertPayload.group_id = groupId;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: created, error } = await (admin as any)
      .from("chat_threads")
      .insert(insertPayload)
      .select("id, status, guest_name")
      .single();
    if (error || !created) {
      return NextResponse.json({ error: error?.message ?? "insert_failed" }, { status: 500 });
    }
    return NextResponse.json({
      threadId: created.id,
      guestToken: token,
      status: created.status,
      guestName: memberLabel ?? created.guest_name,
    });
  }

  // -----------------------------------------------------------------------
  // 2. Anonymous guest: fall back to cookie-based lookup.
  // -----------------------------------------------------------------------
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cookieQ = (admin as any)
    .from("chat_threads")
    .select("id, status, guest_name, player_id")
    .eq("guest_session", token)
    .maybeSingle();
  if (groupId) cookieQ = cookieQ.eq("group_id", groupId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let { data: thread } = await cookieQ;

  if (!thread) {
    // -----------------------------------------------------------------------
    // 3. No existing thread — create one (anonymous, no player_id).
    // -----------------------------------------------------------------------
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const insertPayload: Record<string, unknown> = {
      guest_session: token,
      guest_name: memberLabel,
    };
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
