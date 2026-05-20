import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@k8event/shared/supabase/admin";

const COOKIE = "k8e_guest";

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: "no_session" }, { status: 401 });
  }

  // Validate guest token
  const supabase = getSupabaseAdmin();
  const { data: thread } = await supabase
    .from("chat_threads")
    .select("id")
    .eq("guest_token", token)
    .maybeSingle();
  if (!thread) {
    return NextResponse.json({ error: "invalid_session" }, { status: 401 });
  }

  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    return NextResponse.json({ error: "no_file" }, { status: 400 });
  }
  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: "file_too_large" }, { status: 413 });
  }

  const ext = file.name.split(".").pop() ?? "bin";
  const path = `guest/${thread.id}/${crypto.randomUUID()}.${ext}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error } = await supabase.storage
    .from("chat-images")
    .upload(path, arrayBuffer, { contentType: file.type || "application/octet-stream", upsert: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data } = supabase.storage.from("chat-images").getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl, filename: file.name });
}
