import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

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

  const admin = getSupabaseAdmin();
  let { data: thread } = await admin
    .from("chat_threads")
    .select("id, status, guest_name")
    .eq("guest_session", token)
    .maybeSingle();

  if (!thread) {
    const { data: created, error } = await admin
      .from("chat_threads")
      .insert({ guest_session: token })
      .select("id, status, guest_name")
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    thread = created;
  }

  // Return token so the browser supabase client can pass it as x-guest-token
  // for RLS-gated SELECTs and realtime subscriptions.
  return NextResponse.json({
    threadId: thread.id,
    guestToken: token,
    status: thread.status,
    guestName: thread.guest_name,
  });
}
