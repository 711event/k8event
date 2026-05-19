import { Sparkles } from "lucide-react";
import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@k8event/shared/supabase/database.types";
import { ActivityCard } from "@/components/player/ActivityCard";
import { SectionHeader } from "@/components/player/SectionHeader";
import { EmptyState } from "@/components/player/EmptyState";

export const metadata = { title: "活动中心 · 711event" };

// Activities list is fully public — cache for 60 s, tagged so admin actions can purge
const getActivities = unstable_cache(
  async () => {
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const { data } = await supabase
      .from("activities")
      .select("id, type, name, description, banner_url, end_at, settings")
      .eq("is_active", true)
      .eq("is_visible", true)
      .order("sort_order", { ascending: true });
    return data ?? [];
  },
  ["activities-list-v1"],
  { revalidate: 60, tags: ["activities"] },
);

export default async function ActivitiesPage() {
  const activities = await getActivities();

  return (
    <div className="space-y-6">
      <SectionHeader title="活动中心" hint="参与活动赢取 Token" />

      {!activities.length ? (
        <EmptyState
          icon={<Sparkles size={28} />}
          title="暂无进行中的活动"
          body="活动开启后会在这里显示，敬请期待。"
        />
      ) : (
        <div className="flex flex-col gap-4">
          {activities.map((a) => (
            <ActivityCard key={a.id} activity={a as Parameters<typeof ActivityCard>[0]["activity"]} />
          ))}
        </div>
      )}
    </div>
  );
}
