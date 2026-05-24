import { createSupabaseServerClient } from "../supabase/server";
import type { UserRole } from "../supabase/types";

export type AdminPermissions = Record<string, boolean>;

export type AuthedUser = {
  id: string;
  email: string | null;
  role: UserRole;
  username: string | null;
  displayName: string;
  adminRoleId: string | null;
  adminRoleName: string | null;
  /** null = unrestricted (admin with no role assigned keeps full access) */
  permissions: AdminPermissions | null;
};

export async function getCurrentUser(): Promise<AuthedUser | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from("profiles")
    .select("role, username, display_name, admin_role_id, admin_roles(name, permissions)")
    .eq("user_id", user.id)
    .single();

  if (!profile) return null;

  const role = profile.role as UserRole;

  let adminRoleId: string | null = profile.admin_role_id ?? null;
  let adminRoleName: string | null = null;
  let permissions: AdminPermissions | null = null;

  if (role === "admin" && adminRoleId && profile.admin_roles) {
    const ar = profile.admin_roles as { name: string; permissions: AdminPermissions };
    adminRoleName = ar.name ?? null;
    permissions = (ar.permissions as AdminPermissions) ?? null;
  }

  // agent role always uses fixed chat-only permissions — represented by null here
  // but has-permission handles agent separately via role field
  if (role === "agent") {
    adminRoleId = null;
    adminRoleName = null;
    permissions = null;
  }

  return {
    id: user.id,
    email: user.email ?? null,
    role,
    username: profile.username,
    displayName: profile.display_name,
    adminRoleId,
    adminRoleName,
    permissions,
  };
}
