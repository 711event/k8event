import Link from "next/link";
import { requireRole } from "@k8event/shared/auth/require-role";
import { createSupabaseServerClient } from "@k8event/shared/supabase/server";
import { formatMalaysia } from "@k8event/shared/time/malaysia";
import { ActivitiesManager } from "./ActivitiesManager";

export const metadata = { title: "活动管理 · 管理后台" };

const TYPE_LABELS: Record<string, string> = {
  worldcup_prediction: "世界杯竞猜",
  daily_checkin: "每日签到",
  lucky_draw: "幸运抽奖",
  spin_wheel: "转盘",
  deposit_mission: "充值任务",
  referral_mission: "推荐任务",
};

export default async function ActivitiesPage() {
  await requireRole("admin");
  const supabase = await createSupabaseServerClient();

  const { data: activities } = await supabase
    .from("activities")
    .select("id, type, name, slug, is_active, is_visible, sort_order, start_at, end_at, created_at")
    .order("sort_order", { ascending: true });

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">活动管理</h1>
        <span className="text-sm text-zinc-500">{activities?.length ?? 0} 个活动</span>
      </div>

      {/* Create new activity */}
      <section className="rounded-lg border border-zinc-200 p-5">
        <h2 className="text-lg font-medium mb-4">新建活动</h2>
        <ActivitiesManager />
      </section>

      {/* Activities list */}
      <section className="rounded-lg border border-zinc-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium w-12">排序</th>
              <th className="px-4 py-3 font-medium">名称</th>
              <th className="px-4 py-3 font-medium">类型</th>
              <th className="px-4 py-3 font-medium">开启</th>
              <th className="px-4 py-3 font-medium">前台显示</th>
              <th className="px-4 py-3 font-medium">时间</th>
              <th className="px-4 py-3 font-medium w-32"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {!activities?.length ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-zinc-500">暂无活动。</td>
              </tr>
            ) : (
              activities.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-3 tabular-nums text-zinc-500">{a.sort_order}</td>
                  <td className="px-4 py-3 font-medium">{a.name}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-700">
                      {TYPE_LABELS[a.type] ?? a.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium " +
                        (a.is_active
                          ? "bg-green-500/15 text-green-600"
                          : "bg-zinc-500/15 text-zinc-500")
                      }
                    >
                      {a.is_active ? "开启" : "关闭"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium " +
                        (a.is_visible
                          ? "bg-amber-500/15 text-amber-600"
                          : "bg-zinc-500/15 text-zinc-500")
                      }
                    >
                      {a.is_visible ? "显示" : "隐藏"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">
                    {a.start_at ? formatMalaysia(a.start_at) : "—"}
                    {a.end_at ? <> → {formatMalaysia(a.end_at)}</> : null}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      {a.type === "worldcup_prediction" && (
                        <>
                          <Link href="/admin/teams" className="text-xs text-zinc-500 hover:text-zinc-900 underline">
                            队伍
                          </Link>
                          <Link href="/admin/matches" className="text-xs text-zinc-500 hover:text-zinc-900 underline">
                            比赛
                          </Link>
                        </>
                      )}
                      <Link href={`/admin/activities/${a.id}`} className="text-sm underline">
                        设置
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
