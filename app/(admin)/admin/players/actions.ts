"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/require-role";

const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(32, "Username too long")
  .regex(/^[a-zA-Z0-9_]+$/, "Letters, digits, and underscore only");

const createPlayerSchema = z.object({
  username: usernameSchema,
  password: z.string().min(8, "Password must be at least 8 characters"),
  displayName: z.string().trim().max(60).optional(),
});

export type CreatePlayerState =
  | { ok: true; username: string }
  | { error: string }
  | undefined;

export async function createPlayerAction(
  _prev: CreatePlayerState,
  formData: FormData,
): Promise<CreatePlayerState> {
  await requireRole("admin");

  const parsed = createPlayerSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
    displayName: formData.get("displayName") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { username, password, displayName } = parsed.data;
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
  return { ok: true, username };
}

export async function deletePlayerAction(userId: string): Promise<void> {
  await requireRole("admin");
  const admin = getSupabaseAdmin();
  await admin.auth.admin.deleteUser(userId);
  revalidatePath("/admin/players");
}
