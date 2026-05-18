import Link from "next/link";
import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatMalaysia } from "@/lib/time/malaysia";
import { CreateMatchForm } from "./CreateMatchForm";
import { StatusBadge } from "./StatusBadge";

export const metadata = { title: "比赛 · 管理后台" };

export default async function MatchesPage() {
  await requireRole("admin");
  const supabase = await createSupabaseServerClient();

  const [{ data: matches }, { data: teams }] = await Promise.all([
    supabase
      .from("matches")
      .select(
        "id, kickoff_at, token_reward, status, result, home_team_id, away_team_id, home:teams!matches_home_team_id_fkey(name, short_code), away:teams!matches_away_team_id_fkey(name, short_code)",
      )
      .order("kickoff_at", { ascending: false })
      .limit(200),
    supabase.from("teams").select("id, name").order("name"),
  ]);

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Matches</h1>
        <span className="text-sm text-zinc-500">{matches?.length ?? 0} total</span>
      </div>

      <section className="rounded-lg border border-zinc-200 p-5">
        <h2 className="text-lg font-medium mb-3">Create match</h2>
        {(!teams || teams.length < 2) ? (
          <p className="text-sm text-zinc-500">
            Add at least 2 teams first on the{" "}
            <Link href="/admin/teams" className="underline">Teams</Link> page.
          </p>
        ) : (
          <CreateMatchForm teams={teams} />
        )}
      </section>

      <section className="rounded-lg border border-zinc-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Kickoff (GMT+8)</th>
              <th className="px-4 py-3 font-medium">Match</th>
              <th className="px-4 py-3 font-medium">Reward</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {!matches?.length ? (
              <tr><td colSpan={5} className="px-4 py-6 text-zinc-500">No matches yet.</td></tr>
            ) : (
              matches.map((m) => {
                const home = Array.isArray(m.home) ? m.home[0] : m.home;
                const away = Array.isArray(m.away) ? m.away[0] : m.away;
                return (
                  <tr key={m.id}>
                    <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">
                      {formatMalaysia(m.kickoff_at)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium">{home?.name ?? "?"}</span>
                      <span className="text-zinc-500 mx-2">vs</span>
                      <span className="font-medium">{away?.name ?? "?"}</span>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{m.token_reward}</td>
                    <td className="px-4 py-3"><StatusBadge status={m.status} result={m.result} /></td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/matches/${m.id}`} className="text-sm underline">
                        Open
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
