import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@k8event/shared/auth/require-role";
import { createSupabaseServerClient } from "@k8event/shared/supabase/server";
import { formatMalaysia } from "@k8event/shared/time/malaysia";
import { getBoLocale } from "@/lib/get-locale";
import { tBo } from "@/lib/i18n";
import { StatusBadge } from "../StatusBadge";
import { MatchControls } from "./MatchControls";
import { EditMatchTeamsForm } from "./EditMatchTeamsForm";

export const metadata = { title: "Match Detail · Admin Panel" };

export default async function MatchDetailPage(props: { params: Promise<{ id: string }> }) {
  await requireRole("admin");
  const locale = await getBoLocale();
  const t = (k: Parameters<typeof tBo>[1], vars?: Record<string, string | number>) => tBo(locale, k, vars);
  const { id } = await props.params;
  const supabase = await createSupabaseServerClient();

  const [{ data: match }, { data: allTeams }] = await Promise.all([
    supabase
      .from("matches")
      .select(
        "id, kickoff_at, token_reward, status, result, home_team_id, away_team_id, home:teams!matches_home_team_id_fkey(name), away:teams!matches_away_team_id_fkey(name)",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase.from("teams").select("id, name, logo_url").order("name"),
  ]);

  if (!match) notFound();

  const home = Array.isArray(match.home) ? match.home[0] : match.home;
  const away = Array.isArray(match.away) ? match.away[0] : match.away;

  const { data: predictions } = await supabase
    .from("predictions")
    .select("pick, is_correct, awarded, player:profiles!predictions_player_id_fkey(username, display_name)")
    .eq("match_id", id)
    .order("submitted_at", { ascending: false });

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <Link href="/admin/matches" className="text-sm text-zinc-500 hover:underline">
          {t("match_detail_back")}
        </Link>
        <h1 className="text-2xl font-semibold mt-2">
          {home?.name ?? "?"} <span className="text-zinc-500 mx-2">vs</span> {away?.name ?? "?"}
        </h1>
        <div className="mt-2 flex items-center gap-3 text-sm text-zinc-500">
          <span>{t("match_detail_kickoff")}{formatMalaysia(match.kickoff_at)} (GMT+8)</span>
          <span>·</span>
          <span>{t("match_detail_reward")}{match.token_reward}</span>
          <span>·</span>
          <StatusBadge status={match.status} result={match.result} />
        </div>
      </div>

      <section className="rounded-lg border border-zinc-200 p-5 space-y-4">
        <h2 className="text-lg font-medium">{t("match_detail_actions")}</h2>
        {match.status === "scheduled" && allTeams && allTeams.length >= 2 && (
          <EditMatchTeamsForm
            matchId={match.id}
            currentHomeId={match.home_team_id}
            currentAwayId={match.away_team_id}
            teams={allTeams.map((t) => ({ id: t.id, name: t.name, logo_url: t.logo_url ?? null }))}
          />
        )}
        <MatchControls
          id={match.id}
          status={match.status}
          homeName={home?.name ?? t("match_detail_home_default")}
          awayName={away?.name ?? t("match_detail_away_default")}
        />
      </section>

      <section className="rounded-lg border border-zinc-200 overflow-x-auto">
        <h2 className="px-5 py-3 text-lg font-medium border-b border-zinc-200">
          {t("match_detail_predictions", { count: predictions?.length ?? 0 })}
        </h2>
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">{t("match_detail_col_player")}</th>
              <th className="px-4 py-3 font-medium">{t("match_detail_col_pick")}</th>
              <th className="px-4 py-3 font-medium">{t("match_detail_col_result")}</th>
              <th className="px-4 py-3 font-medium">{t("match_detail_col_rewarded")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {!predictions?.length ? (
              <tr><td colSpan={4} className="px-4 py-6 text-zinc-500">{t("match_detail_no_predictions")}</td></tr>
            ) : (
              predictions.map((p, i) => {
                const player = Array.isArray(p.player) ? p.player[0] : p.player;
                return (
                  <tr key={i}>
                    <td className="px-4 py-3">{player?.display_name ?? "?"} <span className="text-zinc-500">({player?.username})</span></td>
                    <td className="px-4 py-3 font-mono">{p.pick}</td>
                    <td className="px-4 py-3">
                      {p.is_correct === null ? "—" : p.is_correct ? t("match_detail_correct") : t("match_detail_wrong")}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{p.awarded ?? 0}</td>
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
