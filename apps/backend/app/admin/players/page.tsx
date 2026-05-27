import { requireRole } from "@k8event/shared/auth/require-role";
import { createSupabaseServerClient } from "@k8event/shared/supabase/server";
import { formatMalaysia } from "@k8event/shared/time/malaysia";
import { getGroupId } from "@/lib/get-group";
import { CreatePlayerForm } from "./CreatePlayerForm";
import { PlayersClient } from "./PlayersClient";
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
    .select("user_id, username, display_name, phone, created_at")
    .eq("role", "player")
    .eq("group_id", getGroupId())
    .order("created_at", { ascending: false })
    .limit(500);

  const rows = (players ?? []).map((p) => ({
    user_id: p.user_id,
    username: p.username,
    display_name: p.display_name,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    phone: (p as any).phone as string | null,
    createdAt: formatMalaysia(p.created_at),
  }));

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

      {error ? (
        <p className="text-red-500 text-sm">{error.message}</p>
      ) : (
        <PlayersClient players={rows} />
      )}
    </div>
  );
}
