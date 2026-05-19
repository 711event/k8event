import { Sparkles } from "lucide-react";
import { createSupabaseServerClient } from "@k8event/shared/supabase/server";
import { ActivityCard } from "@/components/player/ActivityCard";
import { SectionHeader } from "@/components/player/SectionHeader";
import { EmptyState } from "@/components/player/EmptyState";

export const metadata = { title: "活动中心 · 711event" };
export const dynamic = "force-dynamic";

export default async function ActivitiesPage() {
  const supabase = await createSupabaseServerClient();

  const { data: activities } = await supabase
    .from("activities")
    .select("id, type, name, description, banner_url, end_at, settings")
    .eq("is_active", true)
    .eq("is_visible", true)
    .order("sort_order", { ascending: true });

  return (
    <div className="space-y-6">
      <SectionHeader title="活动中心" hint="参与活动赢取 Token" />

      {!activities?.length ? (
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
