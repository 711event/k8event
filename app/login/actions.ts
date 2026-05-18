"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type LoginState = { error?: string } | undefined;

const LOCAL_EMAIL_SUFFIX = "@k8event.local";

export async function signInAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const rawUsername = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!rawUsername || !password) {
    return { error: "Please enter both username and password." };
  }

  const email = rawUsername.includes("@") ? rawUsername : `${rawUsername}${LOCAL_EMAIL_SUFFIX}`;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    return { error: "Invalid username or password." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", data.user.id)
    .single();

  const role = profile?.role ?? "player";
  if (role === "admin" || role === "agent") {
    redirect("/admin");
  }
  redirect("/dashboard");
}

export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
