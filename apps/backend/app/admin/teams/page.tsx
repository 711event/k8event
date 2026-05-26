import { requireRole } from "@k8event/shared/auth/require-role";
import { createSupabaseServerClient } from "@k8event/shared/supabase/server";
import { getBoLocale } from "@/lib/get-locale";
import { tBo } from "@/lib/i18n";
import { TeamsManager } from "./TeamsManager";
import { SeedTeamsButton } from "./SeedTeamsButton";

export const metadata = { title: "Teams · Admin Panel" };

export default async function TeamsPage() {
  await requireRole("admin");
  const locale = await getBoLocale();
  const t = (k: Parameters<typeof tBo>[1], vars?: Record<string, string | number>) => tBo(locale, k, vars);
  const supabase = await createSupabaseServerClient();
  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, short_code, logo_url, created_at")
    .order("name");

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("teams_title")}</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-500">{t("teams_count", { count: teams?.length ?? 0 })}</span>
          <SeedTeamsButton />
        </div>
      </div>
      <TeamsManager teams={teams ?? []} />
    </div>
  );
}
