import { requireRole } from "@k8event/shared/auth/require-role";
import { createSupabaseServerClient } from "@k8event/shared/supabase/server";
import { QuickRepliesManager } from "./QuickRepliesManager";

export const metadata = { title: "快速回复 · 管理后台" };
export const dynamic = "force-dynamic";

export default async function QuickRepliesPage() {
  await requireRole(["admin", "agent"]);
  const supabase = await createSupabaseServerClient();
  const { data: replies } = await supabase
    .from("quick_replies")
    .select("id, title, body, sort_order, is_active")
    .order("sort_order")
    .order("title");

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">快速回复</h1>
          <p className="text-sm text-zinc-500 mt-1">
            标题以 <code className="px-1 py-0.5 rounded bg-zinc-100 text-zinc-700">++</code> 开头的将在聊天界面显示为快速按钮 · 不区分大小写
          </p>
        </div>
      </div>
      <QuickRepliesManager replies={replies ?? []} />
    </div>
  );
}
