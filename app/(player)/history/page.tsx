import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatMalaysia } from "@/lib/time/malaysia";

export const metadata = { title: "My predictions · k8event" };

export default async function HistoryPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createSupabaseServerClient();

  const { data: predictions } = await supabase
    .from("predictions")
    .select(
      "pick, is_correct, awarded, submitted_at, match:matches!predictions_match_id_fkey(id, kickoff_at, status, result, home:teams!matches_home_team_id_fkey(name), away:teams!matches_away_team_id_fkey(name))",
    )
    .eq("player_id", user.id)
    .order("submitted_at", { ascending: false })
    .limit(200);

  return (
    <main className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">My predictions</h1>

      <ul className="divide-y divide-foreground/10 rounded-lg border border-foreground/10">
        {!predictions?.length ? (
          <li className="px-4 py-6 text-zinc-500">No predictions yet. Visit <Link href="/matches" className="underline">Matches</Link> to start.</li>
        ) : (
          predictions.map((p, i) => {
            const m = Array.isArray(p.match) ? p.match[0] : p.match;
            if (!m) return null;
            const home = Array.isArray(m.home) ? m.home[0] : m.home;
            const away = Array.isArray(m.away) ? m.away[0] : m.away;
            const pickedName = p.pick === "home" ? home?.name ?? "Home" : away?.name ?? "Away";
            return (
              <li key={i}>
                <Link href={`/matches/${m.id}`} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-foreground/[0.03]">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {home?.name ?? "?"} vs {away?.name ?? "?"} · picked <span className="font-mono">{pickedName}</span>
                    </div>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      Kickoff {formatMalaysia(m.kickoff_at)} · status {m.status}
                    </div>
                  </div>
                  <div className="text-sm whitespace-nowrap">
                    {p.is_correct === null ? (
                      <span className="text-zinc-500">awaiting</span>
                    ) : p.is_correct ? (
                      <span className="text-green-600 dark:text-green-400 font-medium">✓ +{p.awarded ?? 0}</span>
                    ) : (
                      <span className="text-red-600 dark:text-red-400 font-medium">✗ wrong</span>
                    )}
                  </div>
                </Link>
              </li>
            );
          })
        )}
      </ul>
    </main>
  );
}
