import { getCurrentUser } from "@k8event/shared/auth/get-user";
import { createSupabaseServerClient } from "@k8event/shared/supabase/server";
import { getGroupId } from "@/lib/get-group";

export const metadata = { title: "排行榜 · 711event" };

export default async function LeaderboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createSupabaseServerClient();
  const groupId = getGroupId();

  // Get all player_ids in this group first
  const { data: groupProfiles } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("group_id", groupId)
    .eq("role", "player");

  const groupPlayerIds = (groupProfiles ?? []).map((p) => p.user_id);

  // Fetch token_earned only for this group's players
  let earnedRows: { player_id: string; earned: number }[] = [];
  if (groupPlayerIds.length) {
    const { data } = await supabase
      .from("token_earned")
      .select("player_id, earned")
      .in("player_id", groupPlayerIds)
      .order("earned", { ascending: false })
      .limit(50);
    earnedRows = data ?? [];
  }

  const ids = earnedRows.map((r) => r.player_id);
  const profilesById = new Map<string, { username: string | null; display_name: string }>();
  if (ids.length) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, username, display_name")
      .in("user_id", ids);
    for (const p of profiles ?? []) {
      profilesById.set(p.user_id, { username: p.username, display_name: p.display_name });
    }
  }

  return (
    <main className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Leaderboard</h1>
      <p className="text-sm text-zinc-500">Top 50 by all-time tokens earned.</p>

      <ol className="rounded-lg border border-foreground/10 divide-y divide-foreground/10">
        {!earnedRows.length ? (
          <li className="px-4 py-6 text-zinc-500">No tokens awarded yet.</li>
        ) : (
          earnedRows.map((r, idx) => {
            const profile = profilesById.get(r.player_id);
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
