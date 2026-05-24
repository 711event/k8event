import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@k8event/shared/auth/require-role";
import { hasPermission } from "@k8event/shared/auth/has-permission";
import { createSupabaseServerClient } from "@k8event/shared/supabase/server";
import { RoleEditForm } from "./RoleEditForm";

export const metadata = { title: "编辑角色 · 管理后台" };

const MODULE_LABELS: Record<string, string> = {
  overview: "总览",
  players: "玩家管理",
  recharge: "充值导入",
  activities: "活动管理",
  rewards: "奖品",
  redemptions: "兑换审核",
  checkins: "签到记录",
  chat: "客服会话",
  quick_replies: "快速回复",
  staff: "后台账号",
  roles: "角色权限",
};

export default async function RoleDetailPage(props: { params: Promise<{ id: string }> }) {
  const user = await requireRole(["admin"]);
  if (!hasPermission(user, "roles")) notFound();

  const { id } = await props.params;
  const supabase = await createSupabaseServerClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: role } = await (supabase as any)
    .from("admin_roles")
    .select("id, name, slug, permissions, is_system")
    .eq("id", id)
    .maybeSingle();

  if (!role) notFound();

  // Count staff assigned to this role
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: assignedCount } = await (supabase as any)
    .from("profiles")
    .select("user_id", { count: "exact", head: true })
    .eq("admin_role_id", id);

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/roles" className="text-sm text-zinc-500 hover:text-zinc-900 underline">
          ← 返回角色列表
        </Link>
      </div>

      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{role.name}</h1>
          {role.is_system && (
            <span className="text-xs uppercase tracking-wide bg-amber-100 text-amber-700 rounded px-2 py-0.5">
              系统内置
            </span>
          )}
        </div>
        <p className="text-sm text-zinc-500 mt-1">
          Slug: <code className="font-mono">{role.slug}</code>
          {assignedCount != null && assignedCount > 0 && (
            <span className="ml-3">已分配 {assignedCount} 位账号</span>
          )}
        </p>
      </div>

      <section className="rounded-lg border border-zinc-200 p-5">
        <RoleEditForm
          id={role.id}
          initialName={role.name}
          initialPermissions={role.permissions as Record<string, boolean>}
          isSystem={role.is_system}
          modules={MODULE_LABELS}
        />
      </section>
    </div>
  );
}
