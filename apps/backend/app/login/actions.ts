"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@k8event/shared/supabase/server";

type LoginState = { error?: string } | undefined;

const LOCAL_EMAIL_SUFFIX = "@k8event.local";

export async function signInAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const rawUsername = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!rawUsername || !password) {
    return { error: "请输入账号和密码。" };
  }

  const email = rawUsername.includes("@") ? rawUsername : `${rawUsername}${LOCAL_EMAIL_SUFFIX}`;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    return { error: "账号或密码错误。" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", data.user.id)
    .single();

  const role = profile?.role;
  // Backend is staff-only. Reject player accounts immediately.
  if (role !== "admin" && role !== "agent") {
    await supabase.auth.signOut();
    return { error: "此账号无管理权限,无法登录后台。" };
  }
  if (role === "agent") redirect("/admin/chat");
  redirect("/admin");
}
