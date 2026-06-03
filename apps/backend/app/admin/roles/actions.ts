"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@k8event/shared/auth/require-role";
import { hasPermission } from "@k8event/shared/auth/has-permission";
import { createSupabaseServerClient } from "@k8event/shared/supabase/server";
import { getGroupId } from "@/lib/get-group";

async function requireRolePermission() {
  const user = await requireRole(["admin"]);
  if (!hasPermission(user, "roles")) {
    throw new Error("权限不足");
  }
  return user;
}

export type RoleActionResult = { ok: true } | { error: string };

export async function createRoleAction(
  name: string,
  slug: string,
  permissions: Record<string, boolean>,
): Promise<RoleActionResult> {
  await requireRolePermission();
  if (!name.trim()) return { error: "角色名称不能为空" };
  if (!slug.trim() || !/^[a-z0-9_]+$/.test(slug)) return { error: "Slug 只能包含小写字母、数字和下划线" };

  const supabase = await createSupabaseServerClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from("admin_roles").insert({
    name: name.trim(),
    slug: slug.trim(),
    permissions,
    is_system: false,
    group_id: getGroupId(),  // bind role to the current group
  });

  if (error) {
    if (error.code === "23505") return { error: `Slug "${slug}" 已被使用` };
    return { error: error.message };
  }

  revalidatePath("/admin/roles");
  revalidatePath("/admin/staff");
  return { ok: true };
}

export async function updateRoleAction(
  id: string,
  name: string,
  permissions: Record<string, boolean>,
): Promise<RoleActionResult> {
  await requireRolePermission();
  if (!name.trim()) return { error: "角色名称不能为空" };

  const supabase = await createSupabaseServerClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("admin_roles")
    .update({ name: name.trim(), permissions })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/admin/roles");
  revalidatePath(`/admin/roles/${id}`);
  revalidatePath("/admin/staff");
  return { ok: true };
}

export async function deleteRoleAction(id: string): Promise<RoleActionResult> {
  await requireRolePermission();
  const supabase = await createSupabaseServerClient();

  // Prevent deleting system roles
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: role } = await (supabase as any)
    .from("admin_roles")
    .select("is_system")
    .eq("id", id)
    .single();

  if (!role) return { error: "角色不存在" };
  if (role.is_system) return { error: "系统内置角色无法删除" };

  // Check no users assigned to this role
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count } = await (supabase as any)
    .from("profiles")
    .select("user_id", { count: "exact", head: true })
    .eq("admin_role_id", id);

  if (count && count > 0) return { error: `还有 ${count} 位账号使用此角色，请先重新分配` };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from("admin_roles").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/roles");
  revalidatePath("/admin/staff");
  return { ok: true };
}
