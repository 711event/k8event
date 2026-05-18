import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatMalaysia } from "@/lib/time/malaysia";
import { CreatePlayerForm } from "./CreatePlayerForm";

export const metadata = { title: "玩家管理 · 管理后台" };

export default async function PlayersPage() {
  await requireRole("admin");
  const supabase = await createSupabaseServerClient();

  const { data: players, error } = await supabase
    .from("profiles")
    .select("user_id, username, display_name, created_at")
    .eq("role", "player")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Players</h1>
        <span className="text-sm text-zinc-500">{players?.length ?? 0} total</span>
      </div>

      <section className="rounded-lg border border-zinc-200 p-5">
        <h2 className="text-lg font-medium mb-3">Create new player</h2>
        <CreatePlayerForm />
      </section>

      <section className="rounded-lg border border-zinc-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Username</th>
              <th className="px-4 py-3 font-medium">Display name</th>
              <th className="px-4 py-3 font-medium">Created (GMT+8)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {error ? (
              <tr><td colSpan={3} className="px-4 py-6 text-red-500">{error.message}</td></tr>
            ) : !players?.length ? (
              <tr><td colSpan={3} className="px-4 py-6 text-zinc-500">No players yet.</td></tr>
            ) : (
              players.map((p) => (
                <tr key={p.user_id}>
                  <td className="px-4 py-3 font-mono">{p.username}</td>
                  <td className="px-4 py-3">{p.display_name}</td>
                  <td className="px-4 py-3 text-zinc-500">{formatMalaysia(p.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
