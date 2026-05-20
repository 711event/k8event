"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSupabaseAdmin } from "@k8event/shared/supabase/admin";
import { requireRole } from "@k8event/shared/auth/require-role";

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
  for (let i = 0; i < 10; i++) pw += chars[Math.floor(Math.random() * chars.length)];
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
  const email = `${username}@k8event.local`;
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
  });
  if (profErr) {
    // Rollback the auth user if profile insert fails
    await admin.auth.admin.deleteUser(created.user.id).catch(() => undefined);
    return { error: profErr.message };
  }

  revalidatePath("/admin/players");
  return { ok: true, username, password };
}

export async function changePasswordAction(
  userId: string,
  newPassword: string,
): Promise<{ error?: string }> {
  await requireRole("admin");
  if (newPassword.length < 8) return { error: "密码至少 8 位" };
  const admin = getSupabaseAdmin();
  const { error } = await admin.auth.admin.updateUserById(userId, { password: newPassword });
  if (error) return { error: error.message };
  return {};
}

export async function deletePlayerAction(userId: string): Promise<void> {
  await requireRole("admin");
  const admin = getSupabaseAdmin();
  await admin.auth.admin.deleteUser(userId);
  revalidatePath("/admin/players");
}
