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
  // so admins see a real account name instead of "Guest".
  let memberLabel: string | null = null;
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (authUser) {
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
  let { data: thread } = await admin
    .from("chat_threads")
    .select("id, status, guest_name")
    .eq("guest_session", token)
    .maybeSingle();

  if (!thread) {
    const { data: created, error } = await admin
      .from("chat_threads")
      .insert({ guest_session: token, guest_name: memberLabel })
      .select("id, status, guest_name")
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    thread = created;
  } else if (memberLabel && thread.guest_name !== memberLabel) {
    // Backfill / refresh name when the same browser is now a logged-in member.
    const { data: updated } = await admin
      .from("chat_threads")
      .update({ guest_name: memberLabel })
      .eq("id", thread.id)
      .select("id, status, guest_name")
      .single();
    if (updated) thread = updated;
  }

  return NextResponse.json({
    threadId: thread.id,
    guestToken: token,
    status: thread.status,
    guestName: thread.guest_name,
  });
}
