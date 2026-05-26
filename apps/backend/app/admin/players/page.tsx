import { requireRole } from "@k8event/shared/auth/require-role";
import { createSupabaseServerClient } from "@k8event/shared/supabase/server";
import { formatMalaysia } from "@k8event/shared/time/malaysia";
import { getGroupId } from "@/lib/get-group";
import { CreatePlayerForm } from "./CreatePlayerForm";
import { PlayerRow } from "./PlayerRow";
import { getBoLocale } from "@/lib/get-locale";
import { tBo } from "@/lib/i18n";

export const metadata = { title: "玩家管理 · 管理后台" };

export default async function PlayersPage() {
  await requireRole("admin");
  const supabase = await createSupabaseServerClient();
  const locale = await getBoLocale();
  const t = (k: Parameters<typeof tBo>[1], vars?: Record<string, string | number>) => tBo(locale, k, vars);

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
        <h1 className="text-2xl font-semibold">{t("players_title")}</h1>
        <span className="text-sm text-zinc-500">{t("players_subtitle_count", { count: players?.length ?? 0 })}</span>
      </div>

      <section className="rounded-lg border border-zinc-200 p-5">
        <h2 className="text-lg font-medium mb-3">{t("players_create")}</h2>
        <CreatePlayerForm />
      </section>

      <section className="rounded-lg border border-zinc-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">{t("players_col_username")}</th>
              <th className="px-4 py-3 font-medium">{t("players_col_displayName")}</th>
              <th className="px-4 py-3 font-medium">{t("players_col_createdAt")}</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {error ? (
              <tr><td colSpan={4} className="px-4 py-6 text-red-500">{error.message}</td></tr>
            ) : !players?.length ? (
              <tr><td colSpan={4} className="px-4 py-6 text-zinc-500">{t("players_empty")}</td></tr>
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
