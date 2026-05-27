import { notFound } from "next/navigation";
import { requireRole } from "@k8event/shared/auth/require-role";
import { hasPermission } from "@k8event/shared/auth/has-permission";
import { createSupabaseServerClient } from "@k8event/shared/supabase/server";
import { getGroupId } from "@/lib/get-group";
import { StaffPageClient } from "./StaffPageClient";

export const metadata = { title: "Account Management · Admin Panel" };
export const dynamic = "force-dynamic";

export default async function StaffPage(props: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await requireRole(["admin"]);
  const canSeeStaff = hasPermission(user, "staff");
  const canSeeRoles = hasPermission(user, "roles");

  if (!canSeeStaff && !canSeeRoles) notFound();

  const sp = await props.searchParams;
  const rawTab = sp.tab;
  const defaultTab: "accounts" | "roles" =
    rawTab === "roles" && canSeeRoles ? "roles"
    : canSeeStaff ? "accounts"
    : "roles";

  const supabase = await createSupabaseServerClient();

  // Fetch staff list — scoped to THIS backend's group only
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: staffList } = await (supabase as any)
    .from("profiles")
    .select("user_id, username, display_name, role, created_at, admin_role_id, admin_roles(name)")
    .in("role", ["admin", "agent"])
    .eq("group_id", getGroupId())
    .order("created_at", { ascending: false });

  // Fetch all roles
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: roles } = await (supabase as any)
    .from("admin_roles")
    .select("id, name, slug, permissions, is_system, sort_order")
    .order("sort_order", { ascending: true });

  return (
    <StaffPageClient
      staffList={staffList ?? []}
      roles={roles ?? []}
      canSeeStaff={canSeeStaff}
      canSeeRoles={canSeeRoles}
      defaultTab={defaultTab}
    />
  );
}
