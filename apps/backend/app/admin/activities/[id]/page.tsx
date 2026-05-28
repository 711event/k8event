import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@k8event/shared/auth/require-role";
import { createSupabaseServerClient } from "@k8event/shared/supabase/server";
import { getBoLocale } from "@/lib/get-locale";
import { tBo } from "@/lib/i18n";
import { ActivitySettingsForm } from "./ActivitySettingsForm";
import { CheckinRewardsForm } from "./CheckinRewardsForm";
import { PredictionChancesForm } from "./PredictionChancesForm";
import { PredictionTokenRewardForm } from "./PredictionTokenRewardForm";

export const metadata = { title: "Activity Settings · Admin Panel" };

export default async function ActivityDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("admin");
  const locale = await getBoLocale();
  const t = (k: Parameters<typeof tBo>[1], vars?: Record<string, string | number>) => tBo(locale, k, vars);
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
          {t("activity_setting_back")}
        </Link>
      </div>
      <h1 className="text-2xl font-semibold">{activity.name}</h1>

      {/* World Cup shortcuts + prediction chances config */}
      {activity.type === "worldcup_prediction" && (
        <>
          <section className="rounded-lg border border-zinc-200 p-5">
            <h2 className="text-lg font-medium mb-3">{t("activity_setting_wc_title")}</h2>
            <div className="flex gap-3">
              <Link
                href="/admin/teams"
                className="h-9 px-4 rounded-md border border-zinc-300 text-sm font-medium hover:bg-zinc-50 inline-flex items-center"
              >
                {t("activity_setting_teams")}
              </Link>
              <Link
                href="/admin/matches"
                className="h-9 px-4 rounded-md border border-zinc-300 text-sm font-medium hover:bg-zinc-50 inline-flex items-center"
              >
                {t("activity_setting_matches")}
              </Link>
            </div>
          </section>

          <section className="rounded-lg border border-zinc-200 p-5 space-y-4">
            <h2 className="text-lg font-medium">{t("activity_setting_prediction_title")}</h2>
            <p className="text-sm text-zinc-500">
              {locale === "zh"
                ? "设置玩家获得竞猜机会的充值条件。修改后立即对本组玩家生效。"
                : "Configure how players earn prediction chances through recharges. Changes apply immediately to this group."}
            </p>
            <PredictionChancesForm
              activityId={id}
              settings={(activity.settings as Record<string, unknown>) ?? {}}
            />
          </section>

          <section className="rounded-lg border border-zinc-200 p-5 space-y-4">
            <h2 className="text-lg font-medium">
              {locale === "zh" ? "竞猜奖励设置" : "Prediction Token Reward"}
            </h2>
            <p className="text-sm text-zinc-500">
              {locale === "zh"
                ? "设置玩家竞猜正确时获得的 Token 数量，可一键同步更新所有待开赛场次。"
                : "Set how many Tokens a player earns for a correct prediction. Optionally apply to all scheduled matches at once."}
            </p>
            <PredictionTokenRewardForm
              activityId={id}
              settings={(activity.settings as Record<string, unknown>) ?? {}}
            />
          </section>
        </>
      )}

      {/* Daily check-in reward config */}
      {activity.type === "daily_checkin" && (
        <section className="rounded-lg border border-zinc-200 p-5 space-y-4">
          <h2 className="text-lg font-medium">{t("activity_setting_checkin_title")}</h2>
          <p className="text-sm text-zinc-500">{locale === "zh" ? "设置每天签到获得的 Token 数量。" : "Set the Token rewards for each day of check-in."}</p>
          <CheckinRewardsForm activityId={id} settings={activity.settings as Record<string, unknown>} />
        </section>
      )}

      {/* General settings */}
      <section className="rounded-lg border border-zinc-200 p-5 space-y-4">
        <h2 className="text-lg font-medium">{t("activity_setting_basic")}</h2>
        <ActivitySettingsForm activity={{ ...activity, settings: (activity.settings as Record<string, unknown>) ?? {} }} />
      </section>
    </div>
  );
}
