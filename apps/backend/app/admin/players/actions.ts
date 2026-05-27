"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSupabaseAdmin } from "@k8event/shared/supabase/admin";
import { createSupabaseServerClient } from "@k8event/shared/supabase/server";
import { requireRole } from "@k8event/shared/auth/require-role";
import { getGroupId } from "@/lib/get-group";

const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(32, "Username too long")
  .regex(/^[a-zA-Z0-9_]+$/, "Letters, digits, and underscore only");

const createPlayerSchema = z.object({
  username: usernameSchema,
  displayName: z.string().trim().max(60).optional(),
});

function generatePassword(): string {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let pw = "";
  for (let i = 0; i < 10; i++) pw += chars[crypto.getRandomValues(new Uint32Array(1))[0] % chars.length];
  return pw;
}

export type CreatePlayerState =
  | { ok: true; username: string; password: string }
  | { error: string }
  | undefined;

export async function createPlayerAction(
  _prev: CreatePlayerState,
  formData: FormData,
): Promise<CreatePlayerState> {
  await requireRole("admin");

  const parsed = createPlayerSchema.safeParse({
    username: formData.get("username"),
    displayName: formData.get("displayName") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { username, displayName } = parsed.data;
  const password = generatePassword();
  // PLAYER_EMAIL_DOMAIN allows per-group username namespacing in shared Supabase Auth.
  // Test group omits this var (defaults to k8event.local for backward compat).
  // FW group sets PLAYER_EMAIL_DOMAIN=fw.k8event.local so usernames are independent.
  const emailDomain = process.env.PLAYER_EMAIL_DOMAIN ?? "k8event.local";
  const email = `${username}@${emailDomain}`;
  const admin = getSupabaseAdmin();

  const { data: created, error: authErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username, display_name: displayName ?? username },
  });
  if (authErr || !created.user) {
    const msg = authErr?.message ?? "Could not create auth user";
    if (/already/i.test(msg)) return { error: `Username "${username}" is already taken` };
    return { error: msg };
  }

  const { error: profErr } = await admin.from("profiles").insert({
    user_id: created.user.id,
    role: "player",
    username,
    display_name: displayName ?? username,
    group_id: getGroupId(),
  });
  if (profErr) {
    // Rollback the auth user if profile insert fails
    await admin.auth.admin.deleteUser(created.user.id).catch(() => undefined);
    return { error: profErr.message };
  }

  revalidatePath("/admin/players");
  return { ok: true, username, password };
}

export async function updateDisplayNameAction(
  userId: string,
  displayName: string,
): Promise<{ error?: string }> {
  await requireRole("admin");
  const trimmed = displayName.trim();
  if (!trimmed || trimmed.length > 60) return { error: "显示名称 1–60 字" };
  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("user_id", userId)
    .eq("group_id", getGroupId())
    .eq("role", "player")
    .maybeSingle();
  if (!profile) return { error: "玩家不存在或不属于本组" };
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("profiles").update({ display_name: trimmed }).eq("user_id", userId);
  if (error) return { error: error.message };
  revalidatePath("/admin/players");
  return {};
}

export async function changePasswordAction(
  userId: string,
  newPassword: string,
): Promise<{ error?: string }> {
  await requireRole("admin");
  if (newPassword.length < 8) return { error: "密码至少 8 位" };
  // Verify the target player belongs to this group before touching their auth record
  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("user_id", userId)
    .eq("group_id", getGroupId())
    .eq("role", "player")
    .maybeSingle();
  if (!profile) return { error: "玩家不存在或不属于本组" };
  const admin = getSupabaseAdmin();
  const { error } = await admin.auth.admin.updateUserById(userId, { password: newPassword });
  if (error) return { error: error.message };
  return {};
}

export async function deletePlayerAction(userId: string): Promise<{ error?: string }> {
  await requireRole("admin");
  // Verify the target player belongs to this group before deleting
  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("user_id", userId)
    .eq("group_id", getGroupId())
    .eq("role", "player")
    .maybeSingle();
  if (!profile) return { error: "玩家不存在或不属于本组" };
  const admin = getSupabaseAdmin();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { error: error.message };
  revalidatePath("/admin/players");
  return {};
}
