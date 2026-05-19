import Link from "next/link";
import { requireRole } from "@k8event/shared/auth/require-role";
import { createSupabaseServerClient } from "@k8event/shared/supabase/server";
import { formatMalaysia } from "@k8event/shared/time/malaysia";
import type { ChatThreadStatus } from "@k8event/shared/supabase/types";
import { ChatInboxAutoRefresh } from "./ChatInboxAutoRefresh";

export const metadata = { title: "客服会话 · 管理后台" };
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<ChatThreadStatus, string> = {
  open: "未处理",
  claimed: "已认领",
  closed: "已关闭",
};

const tabs: { key: ChatThreadStatus | "all"; label: string }[] = [
  { key: "open", label: "未处理" },
  { key: "claimed", label: "已认领" },
  { key: "closed", label: "已关闭" },
  { key: "all", label: "全部" },
];

export default async function ChatInboxPage(props: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireRole(["admin", "agent"]);
  const sp = await props.searchParams;
  const active = (tabs.find((t) => t.key === sp.status)?.key ?? "open") as ChatThreadStatus | "all";

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("chat_threads")
    .select(
      "id, guest_name, status, last_message_at, created_at, claimed_by:profiles!chat_threads_claimed_by_fkey(display_name)",
    )
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(200);

  if (active !== "all") query = query.eq("status", active);

  const { data: threads } = await query;

  return (
    <div className="space-y-6 max-w-4xl">
      <ChatInboxAutoRefresh />
      <div>
        <h1 className="text-2xl font-semibold">客服会话</h1>
        <p className="text-sm text-zinc-500 mt-1">
          新消息会自动到达 · 点会话进入对话页 · 多客服时记得"认领"避免重复回复
        </p>
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

      <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
        {!threads?.length ? (
          <li className="px-4 py-8 text-center text-zinc-500 text-sm">暂无会话</li>
        ) : (
          threads.map((t) => {
            const claimed = Array.isArray(t.claimed_by) ? t.claimed_by[0] : t.claimed_by;
            return (
              <li key={t.id}>
                <Link
                  href={`/admin/chat/${t.id}`}
                  className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-zinc-50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {t.guest_name ?? "访客"}{" "}
                      <span className="text-xs text-zinc-500 font-mono">{t.id.slice(0, 8)}</span>
                    </div>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      {t.last_message_at
                        ? `最新活动 ${formatMalaysia(t.last_message_at)}`
                        : `创建于 ${formatMalaysia(t.created_at)} (暂无消息)`}
                      {claimed && ` · 由 ${claimed.display_name} 认领`}
                    </div>
                  </div>
                  <span
                    className={
                      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium " +
                      (t.status === "open"
                        ? "bg-amber-500/15 text-amber-700"
                        : t.status === "claimed"
                          ? "bg-blue-500/15 text-blue-700"
                          : "bg-zinc-500/15 text-zinc-600")
                    }
                  >
                    {STATUS_LABEL[t.status]}
                  </span>
                </Link>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
