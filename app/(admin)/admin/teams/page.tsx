import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TeamsManager } from "./TeamsManager";

export const metadata = { title: "Teams · k8event admin" };

export default async function TeamsPage() {
  await requireRole("admin");
  const supabase = await createSupabaseServerClient();
  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, short_code, logo_url, created_at")
    .order("name");

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Teams</h1>
        <span className="text-sm text-zinc-500">{teams?.length ?? 0} total</span>
      </div>
      <TeamsManager teams={teams ?? []} />
    </main>
  );
}
