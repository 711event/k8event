import Link from "next/link";
import { requireRole } from "@k8event/shared/auth/require-role";
import { createSupabaseServerClient } from "@k8event/shared/supabase/server";
import type { ChatThreadStatus } from "@k8event/shared/supabase/types";
import { ChatInboxAutoRefresh } from "./ChatInboxAutoRefresh";
import { ThreadListClient } from "./ThreadListClient";

export const metadata = { title: "客服会话 · 管理后台" };
export const dynamic = "force-dynamic";

const tabs: { key: ChatThreadStatus | "all"; label: string }[] = [
  { key: "open", label: "未处理" },
  { key: "closed", label: "已关闭" },
  { key: "all", label: "全部" },
];

export default async function ChatInboxPage(props: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireRole(["admin", "agent"]);
  const sp = await props.searchParams;
  const active = (tabs.find((t) => t.key === sp.status)?.key ?? "open") as
    | ChatThreadStatus
    | "all";

  const supabase = await createSupabaseServerClient();

  const [{ data: threads }, { data: urgencySettings }] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q = (supabase as any)
        .from("chat_threads")
        .select(
          "id, guest_name, status, last_message_at, last_message_body, last_message_kind, last_message_sender, created_at",
        )
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .limit(200);
      if (active !== "all") q = q.eq("status", active);
      return q;
    })(),
    supabase
      .from("chat_retention_settings")
      .select("warn_after_minutes, critical_after_minutes")
      .limit(1)
      .maybeSingle(),
  ]);

  const warnAfterMinutes = urgencySettings?.warn_after_minutes ?? 5;
  const criticalAfterMinutes = urgencySettings?.critical_after_minutes ?? 8;

  return (
    <div className="space-y-6 max-w-4xl">
      <ChatInboxAutoRefresh />
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">客服会话</h1>
          <p className="text-sm text-zinc-500 mt-1">
            新消息实时到达 · 点会话进入对话页 · 问题解决后请点「结束会话」，让收件箱保持清晰
          </p>
        </div>
        <Link
          href="/admin/chat/retention"
          className="shrink-0 text-xs text-zinc-400 hover:text-zinc-700 mt-1"
        >
          保留策略设置 →
        </Link>
      </div>

      {/* Colour legend */}
      <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-cyan-100 border border-cyan-200 inline-block" />
          有客服正在查看
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-red-50 border border-red-200 inline-block" />
          等待超过 5 分钟
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-red-100 border border-red-300 inline-block" />
          等待超过 8 分钟
        </span>
      </div>

      <div className="flex gap-2 border-b border-zinc-200">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/admin/chat?status=${t.key}`}
            className={
              "px-4 py-2 text-sm font-medium -mb-px border-b-2 transition " +
              (active === t.key
                ? "border-zinc-900 text-zinc-900"
                : "border-transparent text-zinc-500 hover:text-zinc-900")
            }
          >
            {t.label}
          </Link>
        ))}
      </div>

      <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white overflow-hidden">
        <ThreadListClient
          threads={threads ?? []}
          warnAfterMinutes={warnAfterMinutes}
          criticalAfterMinutes={criticalAfterMinutes}
        />
      </ul>
    </div>
  );
}
