import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatMalaysia } from "@/lib/time/malaysia";
import { StatusBadge } from "../StatusBadge";
import { MatchControls } from "./MatchControls";

export const metadata = { title: "Match · k8event admin" };

export default async function MatchDetailPage(props: { params: Promise<{ id: string }> }) {
  await requireRole("admin");
  const { id } = await props.params;
  const supabase = await createSupabaseServerClient();

  const { data: match } = await supabase
    .from("matches")
    .select(
      "id, kickoff_at, token_reward, status, result, home:teams!matches_home_team_id_fkey(name), away:teams!matches_away_team_id_fkey(name)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!match) notFound();

  const home = Array.isArray(match.home) ? match.home[0] : match.home;
  const away = Array.isArray(match.away) ? match.away[0] : match.away;

  const { data: predictions } = await supabase
    .from("predictions")
    .select("pick, is_correct, awarded, player:profiles!predictions_player_id_fkey(username, display_name)")
    .eq("match_id", id)
    .order("submitted_at", { ascending: false });

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <Link href="/admin/matches" className="text-sm text-zinc-500 hover:underline">
          ← All matches
        </Link>
        <h1 className="text-2xl font-semibold mt-2">
          {home?.name ?? "?"} <span className="text-zinc-500 mx-2">vs</span> {away?.name ?? "?"}
        </h1>
        <div className="mt-2 flex items-center gap-3 text-sm text-zinc-500">
          <span>Kickoff: {formatMalaysia(match.kickoff_at)} (GMT+8)</span>
          <span>·</span>
          <span>Reward: {match.token_reward} tokens</span>
          <span>·</span>
          <StatusBadge status={match.status} result={match.result} />
        </div>
      </div>

      <section className="rounded-lg border border-foreground/10 p-5">
        <h2 className="text-lg font-medium mb-3">Controls</h2>
        <MatchControls
          id={match.id}
          status={match.status}
          homeName={home?.name ?? "Home"}
          awayName={away?.name ?? "Away"}
        />
      </section>

      <section className="rounded-lg border border-foreground/10 overflow-x-auto">
        <h2 className="px-5 py-3 text-lg font-medium border-b border-foreground/10">
          Predictions ({predictions?.length ?? 0})
        </h2>
        <table className="w-full text-sm">
          <thead className="bg-foreground/[0.03] text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Player</th>
              <th className="px-4 py-3 font-medium">Pick</th>
              <th className="px-4 py-3 font-medium">Result</th>
              <th className="px-4 py-3 font-medium">Awarded</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-foreground/10">
            {!predictions?.length ? (
              <tr><td colSpan={4} className="px-4 py-6 text-zinc-500">No predictions yet.</td></tr>
            ) : (
              predictions.map((p, i) => {
                const player = Array.isArray(p.player) ? p.player[0] : p.player;
                return (
                  <tr key={i}>
                    <td className="px-4 py-3">{player?.display_name ?? "?"} <span className="text-zinc-500">({player?.username})</span></td>
                    <td className="px-4 py-3 font-mono">{p.pick}</td>
                    <td className="px-4 py-3">
                      {p.is_correct === null ? "—" : p.is_correct ? "✓ correct" : "✗ wrong"}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{p.awarded ?? 0}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
