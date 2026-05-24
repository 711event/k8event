import { requireRole } from "@k8event/shared/auth/require-role";
import { createSupabaseServerClient } from "@k8event/shared/supabase/server";
import { formatMalaysia } from "@k8event/shared/time/malaysia";
import { getGroupId } from "@/lib/get-group";
import { CreatePlayerForm } from "./CreatePlayerForm";
import { PlayerRow } from "./PlayerRow";

export const metadata = { title: "玩家管理 · 管理后台" };

export default async function PlayersPage() {
  await requireRole("admin");
  const supabase = await createSupabaseServerClient();

  const { data: players, error } = await supabase
    .from("profiles")
    .select("user_id, username, display_name, created_at")
    .eq("role", "player")
    .eq("group_id", getGroupId())
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">玩家管理</h1>
        <span className="text-sm text-zinc-500">共 {players?.length ?? 0} 位玩家</span>
      </div>

      <section className="rounded-lg border border-zinc-200 p-5">
        <h2 className="text-lg font-medium mb-3">创建新玩家</h2>
        <CreatePlayerForm />
      </section>

      <section className="rounded-lg border border-zinc-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">用户名</th>
              <th className="px-4 py-3 font-medium">显示名称</th>
              <th className="px-4 py-3 font-medium">创建时间 (GMT+8)</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {error ? (
              <tr><td colSpan={4} className="px-4 py-6 text-red-500">{error.message}</td></tr>
            ) : !players?.length ? (
              <tr><td colSpan={4} className="px-4 py-6 text-zinc-500">暂无玩家</td></tr>
            ) : (
              players.map((p) => (
                <PlayerRow
                  key={p.user_id}
                  userId={p.user_id}
                  username={p.username ?? ""}
                  displayName={p.display_name}
                  createdAt={formatMalaysia(p.created_at)}
                />
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
