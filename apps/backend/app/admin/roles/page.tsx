import Link from "next/link";
import { ShieldCheck, Plus } from "lucide-react";
import { requireRole } from "@k8event/shared/auth/require-role";
import { hasPermission } from "@k8event/shared/auth/has-permission";
import { createSupabaseServerClient } from "@k8event/shared/supabase/server";
import { notFound } from "next/navigation";
import { CreateRoleForm } from "./CreateRoleForm";

export const metadata = { title: "角色权限 · 管理后台" };

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

export const ALL_MODULES = Object.keys(MODULE_LABELS);

export default async function RolesPage() {
  const user = await requireRole(["admin"]);
  if (!hasPermission(user, "roles")) notFound();

  const supabase = await createSupabaseServerClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: roles } = await (supabase as any)
    .from("admin_roles")
    .select("id, name, slug, permissions, is_system, sort_order, created_at")
    .order("sort_order", { ascending: true });

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">角色权限</h1>
          <p className="text-sm text-zinc-500 mt-1">定义角色及其可访问的功能模块，再分配给后台账号。</p>
        </div>
      </div>

      {/* Roles list */}
      <section className="rounded-lg border border-zinc-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">角色名称</th>
              <th className="px-4 py-3 font-medium">Slug</th>
              <th className="px-4 py-3 font-medium">可访问模块</th>
              <th className="px-4 py-3 font-medium w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {!roles?.length ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-zinc-500">暂无角色</td>
              </tr>
            ) : (
              roles.map((role: {
                id: string;
                name: string;
                slug: string;
                permissions: Record<string, boolean>;
                is_system: boolean;
              }) => {
                const enabledModules = ALL_MODULES.filter(m => role.permissions[m]);
                return (
                  <tr key={role.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ShieldCheck size={14} className="text-zinc-400" />
                        <span className="font-medium">{role.name}</span>
                        {role.is_system && (
                          <span className="text-[10px] uppercase tracking-wide bg-amber-100 text-amber-700 rounded px-1.5 py-0.5">
                            系统
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 font-mono text-xs">{role.slug}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {enabledModules.length === ALL_MODULES.length ? (
                          <span className="text-xs bg-emerald-100 text-emerald-700 rounded px-2 py-0.5">
                            全部模块
                          </span>
                        ) : enabledModules.length === 0 ? (
                          <span className="text-xs text-zinc-400">无</span>
                        ) : (
                          enabledModules.map(m => (
                            <span key={m} className="text-xs bg-zinc-100 text-zinc-600 rounded px-1.5 py-0.5">
                              {MODULE_LABELS[m] ?? m}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/roles/${role.id}`}
                        className="text-xs px-2.5 py-1.5 rounded border border-zinc-300 hover:border-zinc-400 text-zinc-600 hover:text-zinc-800 transition"
                      >
                        编辑
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>

      {/* Create new role */}
      <section className="rounded-lg border border-zinc-200 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Plus size={16} className="text-zinc-500" />
          <h2 className="text-lg font-medium">创建新角色</h2>
        </div>
        <CreateRoleForm modules={MODULE_LABELS} />
      </section>
    </div>
  );
}
