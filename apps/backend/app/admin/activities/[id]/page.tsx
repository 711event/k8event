import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@k8event/shared/auth/require-role";
import { createSupabaseServerClient } from "@k8event/shared/supabase/server";
import { ActivitySettingsForm } from "./ActivitySettingsForm";
import { CheckinRewardsForm } from "./CheckinRewardsForm";

export const metadata = { title: "活动设置 · 管理后台" };

export default async function ActivityDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("admin");
  const { id } = await props.params;
  const supabase = await createSupabaseServerClient();

  const { data: activity } = await supabase
    .from("activities")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!activity) notFound();

  return (
    <div className="space-y-8 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/activities" className="text-sm text-zinc-500 hover:text-zinc-900 underline">
          ← 返回活动列表
        </Link>
      </div>
      <h1 className="text-2xl font-semibold">{activity.name}</h1>

      {/* World Cup shortcuts */}
      {activity.type === "worldcup_prediction" && (
        <section className="rounded-lg border border-zinc-200 p-5">
          <h2 className="text-lg font-medium mb-3">World Cup 管理</h2>
          <div className="flex gap-3">
            <Link
              href="/admin/teams"
              className="h-9 px-4 rounded-md border border-zinc-300 text-sm font-medium hover:bg-zinc-50 inline-flex items-center"
            >
              🏳️ 管理球队
            </Link>
            <Link
              href="/admin/matches"
              className="h-9 px-4 rounded-md border border-zinc-300 text-sm font-medium hover:bg-zinc-50 inline-flex items-center"
            >
              ⚽ 管理比赛
            </Link>
          </div>
        </section>
      )}

      {/* Daily check-in reward config */}
      {activity.type === "daily_checkin" && (
        <section className="rounded-lg border border-zinc-200 p-5 space-y-4">
          <h2 className="text-lg font-medium">签到奖励设置</h2>
          <p className="text-sm text-zinc-500">设置每天签到获得的 Token 数量。</p>
          <CheckinRewardsForm activityId={id} settings={activity.settings as Record<string, unknown>} />
        </section>
      )}

      {/* General settings */}
      <section className="rounded-lg border border-zinc-200 p-5 space-y-4">
        <h2 className="text-lg font-medium">基本设置</h2>
        <ActivitySettingsForm activity={activity} />
      </section>
    </div>
  );
}
