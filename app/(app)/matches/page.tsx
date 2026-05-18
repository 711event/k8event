import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatMalaysia } from "@/lib/time/malaysia";

export const metadata = { title: "Matches · k8event" };

type Tab = "open" | "live" | "finished";

const tabs: { key: Tab; label: string }[] = [
  { key: "open", label: "Open" },
  { key: "live", label: "Locked / live" },
  { key: "finished", label: "Finished" },
];

export default async function PlayerMatchesPage(props: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const sp = await props.searchParams;
  const active: Tab = sp.tab === "live" || sp.tab === "finished" ? sp.tab : "open";

  const supabase = await createSupabaseServerClient();
  const query = supabase
    .from("matches")
    .select(
      "id, kickoff_at, token_reward, status, result, home:teams!matches_home_team_id_fkey(name), away:teams!matches_away_team_id_fkey(name)",
    )
    .order("kickoff_at", { ascending: active !== "finished" });

  const { data } =
    active === "open"
      ? await query.eq("status", "scheduled").gte("kickoff_at", new Date().toISOString())
      : active === "live"
        ? await query.in("status", ["locked"])
        : await query.eq("status", "finished");

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Matches</h1>
      </div>

      <div className="flex gap-2 border-b border-foreground/10">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/matches?tab=${t.key}`}
            className={
              "px-4 py-2 text-sm font-medium -mb-px border-b-2 " +
              (active === t.key
                ? "border-foreground text-foreground"
                : "border-transparent text-zinc-500 hover:text-foreground")
            }
          >
            {t.label}
          </Link>
        ))}
      </div>

      <ul className="divide-y divide-foreground/10 rounded-lg border border-foreground/10">
        {!data?.length ? (
          <li className="px-4 py-6 text-zinc-500">No matches.</li>
        ) : (
          data.map((m) => {
            const home = Array.isArray(m.home) ? m.home[0] : m.home;
            const away = Array.isArray(m.away) ? m.away[0] : m.away;
            return (
              <li key={m.id}>
                <Link href={`/matches/${m.id}`} className="flex items-center justify-between gap-4 px-4 py-4 hover:bg-foreground/[0.03]">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {home?.name ?? "?"} <span className="text-zinc-500 mx-2">vs</span> {away?.name ?? "?"}
                    </div>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      {formatMalaysia(m.kickoff_at)} · {m.token_reward} tokens
                    </div>
                  </div>
                  <span className="text-sm text-zinc-500">→</span>
                </Link>
              </li>
            );
          })
        )}
      </ul>
    </main>
  );
}
