import Link from "next/link";
import { requireRole } from "@k8event/shared/auth/require-role";
import { createSupabaseServerClient } from "@k8event/shared/supabase/server";
import { formatMalaysia } from "@k8event/shared/time/malaysia";
import { getGroupId } from "@/lib/get-group";
import { getBoLocale } from "@/lib/get-locale";
import { tBo } from "@/lib/i18n";
import { CreateMatchForm } from "./CreateMatchForm";
import { StatusBadge } from "./StatusBadge";
import { SeedMatchesButton } from "./SeedMatchesButton";

export const metadata = { title: "Matches · Admin Panel" };

export default async function MatchesPage() {
  await requireRole("admin");
  const locale = await getBoLocale();
  const t = (k: Parameters<typeof tBo>[1], vars?: Record<string, string | number>) => tBo(locale, k, vars);
  const supabase = await createSupabaseServerClient();

  const [{ data: matches }, { data: teams }, { data: predActivity }] = await Promise.all([
    supabase
      .from("matches")
      .select(
        "id, kickoff_at, token_reward, status, result, stage, home_team_id, away_team_id, home:teams!matches_home_team_id_fkey(name, short_code, logo_url), away:teams!matches_away_team_id_fkey(name, short_code, logo_url)",
      )
      .order("kickoff_at", { ascending: false })
      .limit(200),
    supabase.from("teams").select("id, name").order("name"),
    // This group's single prediction reward — the one value that actually applies
    // to every match (settle_match + all player UI read it). matches.token_reward
    // is a legacy global-table column and is no longer used for the actual reward.
    supabase
      .from("activities")
      .select("id, settings")
      .eq("type", "worldcup_prediction")
      .eq("group_id", getGroupId())
      .maybeSingle(),
  ]);

  const predSettings = (predActivity?.settings ?? {}) as Record<string, unknown>;
  const groupReward = Number(predSettings.prediction_token_reward ?? 10);
  const activityId = predActivity?.id ?? null;

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("matches_title")}</h1>
        <span className="text-sm text-zinc-500">{t("matches_count", { count: matches?.length ?? 0 })}</span>
      </div>

      <section className="rounded-lg border border-zinc-200 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-medium">{t("matches_generate")}</h2>
          <SeedMatchesButton />
        </div>
        <div className="border-t border-zinc-200 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-medium">{t("matches_create")}</h2>
          <a
            href="https://worldcupkickofftimes.com/schedule/sgt"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline whitespace-nowrap"
          >
            {t("matches_world_cup_schedule")}
          </a>
        </div>
        {(!teams || teams.length < 2) ? (
          <p className="text-sm text-zinc-500">
            {t("matches_no_teams")}{" "}
            <Link href="/admin/teams" className="underline">{t("matches_no_teams_link")}</Link>{" "}
            {t("matches_no_teams_suffix")}
          </p>
        ) : (
          <CreateMatchForm teams={teams} />
        )}
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 overflow-x-auto">
        <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-100 text-xs text-amber-800">
          {t("matches_reward_unified_hint", { reward: groupReward })}{" "}
          {activityId && (
            <Link href={`/admin/activities/${activityId}`} className="underline font-medium">
              {t("matches_reward_unified_link")}
            </Link>
          )}
        </div>
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">{t("matches_col_kickoff")}</th>
              <th className="px-4 py-3 font-medium">{t("matches_col_stage")}</th>
              <th className="px-4 py-3 font-medium">{t("matches_col_match")}</th>
              <th className="px-4 py-3 font-medium">{t("matches_col_reward")}</th>
              <th className="px-4 py-3 font-medium">{t("matches_col_status")}</th>
              <th className="px-4 py-3 font-medium w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {!matches?.length ? (
              <tr><td colSpan={6} className="px-4 py-6 text-zinc-500">{t("matches_empty")}</td></tr>
            ) : (
              matches.map((m) => {
                const home = Array.isArray(m.home) ? m.home[0] : m.home;
                const away = Array.isArray(m.away) ? m.away[0] : m.away;
                return (
                  <tr key={m.id}>
                    <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">
                      {formatMalaysia(m.kickoff_at)}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500 whitespace-nowrap">
                      {m.stage ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5">
                        {home?.logo_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={home.logo_url} alt="" className="h-4 w-4 rounded-sm object-contain flex-shrink-0" />
                        )}
                        <span className="font-medium">{home?.name ?? "?"}</span>
                      </span>
                      <span className="text-zinc-500 mx-2">vs</span>
                      <span className="inline-flex items-center gap-1.5">
                        {away?.logo_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={away.logo_url} alt="" className="h-4 w-4 rounded-sm object-contain flex-shrink-0" />
                        )}
                        <span className="font-medium">{away?.name ?? "?"}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-amber-600 font-medium tabular-nums">
                        +{groupReward}
                      </span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={m.status} result={m.result} /></td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/matches/${m.id}`} className="text-sm underline">
                        {t("matches_view")}
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
