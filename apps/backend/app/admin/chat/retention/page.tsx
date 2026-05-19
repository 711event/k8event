import Link from "next/link";
import { requireRole } from "@k8event/shared/auth/require-role";
import { createSupabaseServerClient } from "@k8event/shared/supabase/server";
import { RetentionForm } from "./RetentionForm";

export const metadata = { title: "聊天保留策略 · 管理后台" };
export const dynamic = "force-dynamic";

export default async function ChatRetentionPage() {
  await requireRole("admin");
  const supabase = await createSupabaseServerClient();

  const { data: settings } = await supabase
    .from("chat_retention_settings")
    .select("*")
    .limit(1)
    .maybeSingle();

  const defaults = {
    message_retention_days: settings?.message_retention_days ?? 90,
    media_retention_days: settings?.media_retention_days ?? 30,
    archive_closed_threads_after_days: settings?.archive_closed_threads_after_days ?? 7,
  };

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <Link href="/admin/chat" className="text-sm text-zinc-500 hover:text-zinc-800">
          ← 返回客服会话
        </Link>
        <h1 className="text-2xl font-semibold mt-2">聊天保留策略</h1>
        <p className="text-sm text-zinc-500 mt-1">
          设置聊天记录和媒体文件的保留天数。目前仅保存设置，自动清理功能将在后续版本中启用。
        </p>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <RetentionForm defaults={defaults} />
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 space-y-1">
        <p className="font-medium">⚠ 注意</p>
        <p>自动清理任务尚未启用，以上设置仅供记录与规划用途。实际数据不会被自动删除。</p>
      </div>
    </div>
  );
}
