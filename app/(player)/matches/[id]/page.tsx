import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatMalaysia, malaysiaDateString } from "@/lib/time/malaysia";
import { PredictionForm } from "./PredictionForm";

export const metadata = { title: "Match · k8event" };

export default async function PlayerMatchDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createSupabaseServerClient();

  const [{ data: match }, { data: pred }, { data: recharge }] = await Promise.all([
    supabase
      .from("matches")
      .select(
        "id, kickoff_at, token_reward, status, result, home:teams!matches_home_team_id_fkey(name), away:teams!matches_away_team_id_fkey(name)",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("predictions")
      .select("pick, is_correct, awarded")
      .eq("match_id", id)
      .eq("player_id", user.id)
      .maybeSingle(),
    supabase
      .from("daily_recharge")
      .select("amount")
      .eq("player_id", user.id)
      .eq("recharge_date", malaysiaDateString())
      .maybeSingle(),
  ]);

  if (!match) notFound();

  const home = Array.isArray(match.home) ? match.home[0] : match.home;
  const away = Array.isArray(match.away) ? match.away[0] : match.away;
  const now = Date.now();
  const kickoffMs = new Date(match.kickoff_at).getTime();
  const beforeKickoff = now < kickoffMs;
  const eligible = Number(recharge?.amount ?? 0) >= 500;
  const canPredict =
    !pred && match.status === "scheduled" && beforeKickoff && eligible;

  return (
    <main className="p-6 max-w-2xl mx-auto space-y-6">
      <Link href="/matches" className="text-sm text-zinc-500 hover:underline">
        ← All matches
      </Link>

      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">
          {home?.name ?? "?"} <span className="text-zinc-500 mx-2">vs</span> {away?.name ?? "?"}
        </h1>
        <div className="text-sm text-zinc-500">
          Kickoff: {formatMalaysia(match.kickoff_at)} (GMT+8) · Reward: {match.token_reward} tokens
        </div>
        <div className="text-sm text-zinc-500">
          Status: <span className="font-medium text-foreground">{match.status}</span>
          {match.status === "finished" && match.result && (
            <> · Result: <span className="font-medium text-foreground">{match.result}</span></>
          )}
        </div>
      </header>

      {pred ? (
        <div className="rounded-lg border border-foreground/10 p-5 space-y-2">
          <div className="text-sm text-zinc-500">Your prediction</div>
          <div className="text-2xl font-semibold">
            {pred.pick === "home" ? home?.name ?? "Home" : away?.name ?? "Away"}
          </div>
          {pred.is_correct === null ? (
            <div className="text-sm text-zinc-500">Awaiting result…</div>
          ) : pred.is_correct ? (
            <div className="text-green-600 dark:text-green-400 text-sm font-medium">
              ✓ Correct · +{pred.awarded ?? 0} tokens
            </div>
          ) : (
            <div className="text-sm text-red-600 dark:text-red-400">✗ Wrong</div>
          )}
        </div>
      ) : !canPredict ? (
        <div className="rounded-lg border border-foreground/10 p-5 text-sm text-zinc-500">
          {match.status === "finished"
            ? "This match is finished."
            : match.status === "cancelled"
              ? "This match was cancelled."
              : match.status === "locked"
                ? "Predictions are locked for this match."
                : !beforeKickoff
                  ? "Kickoff has already passed."
                  : !eligible
                    ? "You need to recharge at least 500 today to participate."
                    : "Predictions unavailable."}
        </div>
      ) : (
        <PredictionForm matchId={match.id} homeName={home?.name ?? "Home"} awayName={away?.name ?? "Away"} />
      )}
    </main>
  );
}
