import { getCurrentUser } from "@/lib/auth/get-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Leaderboard · k8event" };

export default async function LeaderboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createSupabaseServerClient();

  // token_earned is a view that joins easily but has limited types — fetch raw and join in JS.
  const { data: earnedRows } = await supabase
    .from("token_earned")
    .select("player_id, earned")
    .order("earned", { ascending: false })
    .limit(50);

  const ids = (earnedRows ?? []).map((r) => r.player_id);
  let profilesByid = new Map<string, { username: string | null; display_name: string }>();
  if (ids.length) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, username, display_name")
      .in("user_id", ids);
    for (const p of profiles ?? []) {
      profilesByid.set(p.user_id, { username: p.username, display_name: p.display_name });
    }
  }

  return (
    <main className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Leaderboard</h1>
      <p className="text-sm text-zinc-500">Top 50 by all-time tokens earned.</p>

      <ol className="rounded-lg border border-foreground/10 divide-y divide-foreground/10">
        {!earnedRows?.length ? (
          <li className="px-4 py-6 text-zinc-500">No tokens awarded yet.</li>
        ) : (
          earnedRows.map((r, idx) => {
            const profile = profilesByid.get(r.player_id);
            const isSelf = r.player_id === user.id;
            return (
              <li
                key={r.player_id}
                className={"flex items-center gap-3 px-4 py-3 " + (isSelf ? "bg-foreground/[0.04]" : "")}
              >
                <div className="w-8 text-zinc-500 tabular-nums">#{idx + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">
                    {profile?.display_name ?? "—"}
                    {isSelf && <span className="ml-2 text-xs text-zinc-500">(you)</span>}
                  </div>
                  <div className="text-xs text-zinc-500 font-mono truncate">{profile?.username}</div>
                </div>
                <div className="text-lg font-semibold tabular-nums">{r.earned}</div>
              </li>
            );
          })
        )}
      </ol>
    </main>
  );
}
