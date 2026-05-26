import { requireRole } from "@k8event/shared/auth/require-role";
import { createSupabaseServerClient } from "@k8event/shared/supabase/server";
import { getGroupId } from "@/lib/get-group";
import { getBoLocale } from "@/lib/get-locale";
import { tBo } from "@/lib/i18n";
import { RewardsManager } from "./RewardsManager";

export const metadata = { title: "Rewards · Admin Panel" };

export default async function RewardsPage() {
  await requireRole("admin");
  const locale = await getBoLocale();
  const supabase = await createSupabaseServerClient();
  const { data: items } = await supabase
    .from("reward_items")
    .select("id, name, description, image_url, cost, stock, is_active, created_at")
    .eq("group_id", getGroupId())
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{tBo(locale, "rewards_title")}</h1>
        <span className="text-sm text-zinc-500">{tBo(locale, "rewards_count", { count: items?.length ?? 0 })}</span>
      </div>
      <RewardsManager items={items ?? []} />
    </div>
  );
}
