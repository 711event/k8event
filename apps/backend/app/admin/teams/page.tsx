import { requireRole } from "@k8event/shared/auth/require-role";
import { createSupabaseServerClient } from "@k8event/shared/supabase/server";
import { TeamsManager } from "./TeamsManager";
import { SeedTeamsButton } from "./SeedTeamsButton";

export const metadata = { title: "球队 · 管理后台" };

export default async function TeamsPage() {
  await requireRole("admin");
  const supabase = await createSupabaseServerClient();
  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, short_code, logo_url, created_at")
    .order("name");

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">球队管理</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-500">共 {teams?.length ?? 0} 支队伍</span>
          <SeedTeamsButton />
        </div>
      </div>
      <TeamsManager teams={teams ?? []} />
    </div>
  );
}
