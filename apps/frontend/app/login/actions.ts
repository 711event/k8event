"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@k8event/shared/supabase/server";

type LoginState = { error?: string } | undefined;

// PLAYER_EMAIL_DOMAIN allows per-group username namespacing in shared Supabase Auth.
// Test group omits this var (defaults to k8event.local). FW sets PLAYER_EMAIL_DOMAIN=fw.k8event.local.
const LOCAL_EMAIL_SUFFIX = `@${process.env.PLAYER_EMAIL_DOMAIN ?? "k8event.local"}`;

export async function signInAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const rawUsername = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!rawUsername || !password) {
    return { error: "请输入用户名和密码。" };
  }

  const email = rawUsername.includes("@") ? rawUsername : `${rawUsername}${LOCAL_EMAIL_SUFFIX}`;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    return { error: "用户名或密码错误。" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", data.user.id)
    .single();

  const role = profile?.role ?? "player";
  // Admin/agent accounts belong on the BO (backend) domain, not the player frontend.
  if (role === "admin" || role === "agent") {
    await supabase.auth.signOut();
    return { error: "此账号无法在会员端登录,请前往管理后台域名。" };
  }
  const next = String(formData.get("next") ?? "");
  redirect(next === "/newuser" ? "/newuser" : "/activities/checkin");
}
