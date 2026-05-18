import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { RewardsManager } from "./RewardsManager";

export const metadata = { title: "奖品 · 管理后台" };

export default async function RewardsPage() {
  await requireRole("admin");
  const supabase = await createSupabaseServerClient();
  const { data: items } = await supabase
    .from("reward_items")
    .select("id, name, description, image_url, cost, stock, is_active, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Reward items</h1>
        <span className="text-sm text-zinc-500">{items?.length ?? 0} total</span>
      </div>
      <RewardsManager items={items ?? []} />
    </div>
  );
}
