"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@k8event/shared/auth/require-role";
import { hasPermission } from "@k8event/shared/auth/has-permission";
import { getSupabaseAdmin } from "@k8event/shared/supabase/admin";
import { createSupabaseServerClient } from "@k8event/shared/supabase/server";
import { getGroupId } from "@/lib/get-group";

async function requireStaffPermission() {
  const user = await requireRole(["admin"]);
  if (!hasPermission(user, "staff")) throw new Error("权限不足");
  return user;
}

const usernameSchema = z
  .string()
  .min(3, "用户名至少 3 位")
  .max(32, "用户名最多 32 位")
  .regex(/^[a-zA-Z0-9_]+$/, "只能包含字母、数字和下划线");

export type StaffActionResult =
  | { ok: true; username: string; password: string }
  | { error: string }
  | undefined;

function generatePassword(): string {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#";
  let pw = "";
  for (let i = 0; i < 12; i++) pw += chars[crypto.getRandomValues(new Uint32Array(1))[0] % chars.length];
  return pw;
}

export async function createStaffAction(
  _prev: StaffActionResult,
  formData: FormData,
): Promise<StaffActionResult> {
  await requireStaffPermission();

  const parsed = usernameSchema.safeParse(formData.get("username"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "无效用户名" };

  const username = parsed.data;
  const displayName = (formData.get("displayName") as string | null)?.trim() || username;
  const role = (formData.get("role") as string | null) ?? "agent";
  const adminRoleId = (formData.get("adminRoleId") as string | null)?.trim() || null;

  if (!["admin", "agent"].includes(role)) return { error: "无效角色" };

  const password = generatePassword();
  const email = `${username}@k8event.local`;
  const adminClient = getSupabaseAdmin();

  const { data: created, error: authErr } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username, display_name: displayName },
  });

  if (authErr || !created.user) {
    const msg = authErr?.message ?? "创建失败";
    if (/already/i.test(msg)) return { error: `用户名 "${username}" 已存在` };
    return { error: msg };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: profErr } = await (adminClient as any).from("profiles").insert({
    user_id: created.user.id,
    role,
    username,
    display_name: displayName,
    admin_role_id: adminRoleId || null,
    group_id: getGroupId(),  // bind account to this backend's group
  });

  if (profErr) {
    await adminClient.auth.admin.deleteUser(created.user.id).catch(() => undefined);
    return { error: profErr.message };
  }

  revalidatePath("/admin/staff");
  return { ok: true, username, password };
}

export async function assignRoleAction(userId: string, adminRoleId: string | null): Promise<{ error?: string }> {
  await requireStaffPermission();
  const supabase = await createSupabaseServerClient();

  // Verify the target user belongs to this group before modifying
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from("profiles")
    .select("user_id")
    .eq("user_id", userId)
    .eq("group_id", getGroupId())
    .in("role", ["admin", "agent"])
    .maybeSingle();
  if (!profile) return { error: "账号不存在" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("profiles")
    .update({ admin_role_id: adminRoleId || null })
    .eq("user_id", userId)
    .eq("group_id", getGroupId());

  if (error) return { error: error.message };
  revalidatePath("/admin/staff");
  return {};
}

export async function changeStaffPasswordAction(userId: string, newPassword: string): Promise<{ error?: string }> {
  await requireStaffPermission();
  if (newPassword.length < 8) return { error: "密码至少 8 位" };
  // Verify the target staff member belongs to this group
  const supabase = await createSupabaseServerClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from("profiles")
    .select("user_id")
    .eq("user_id", userId)
    .eq("group_id", getGroupId())
    .in("role", ["admin", "agent"])
    .maybeSingle();
  if (!profile) return { error: "账号不存在" };
  const adminClient = getSupabaseAdmin();
  const { error } = await adminClient.auth.admin.updateUserById(userId, { password: newPassword });
  if (error) return { error: error.message };
  return {};
}

export async function deleteStaffAction(userId: string): Promise<{ error?: string }> {
  await requireStaffPermission();
  // Verify the target staff member belongs to this group
  const supabase = await createSupabaseServerClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from("profiles")
    .select("user_id")
    .eq("user_id", userId)
    .eq("group_id", getGroupId())
    .in("role", ["admin", "agent"])
    .maybeSingle();
  if (!profile) return { error: "账号不存在" };
  const adminClient = getSupabaseAdmin();
  const { error } = await adminClient.auth.admin.deleteUser(userId);
  if (error) return { error: error.message };
  revalidatePath("/admin/staff");
  return {};
}
