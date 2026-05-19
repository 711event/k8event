import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@k8event/shared/auth/require-role";
import { createSupabaseServerClient } from "@k8event/shared/supabase/server";
import { formatMalaysia } from "@k8event/shared/time/malaysia";
import { AgentChat } from "./AgentChat";

export const metadata = { title: "会话 · 管理后台" };

const STATUS_LABEL = {
  open: "未处理",
  claimed: "已认领",
  closed: "已关闭",
} as const;

export default async function ThreadPage(props: { params: Promise<{ threadId: string }> }) {
  const user = await requireRole(["admin", "agent"]);
  const { threadId } = await props.params;
  const supabase = await createSupabaseServerClient();

  const [{ data: thread }, { data: messages }, { data: quickReplies }] = await Promise.all([
    supabase
      .from("chat_threads")
      .select(
        "id, guest_name, status, claimed_by, created_at, last_message_at, claimer:profiles!chat_threads_claimed_by_fkey(display_name)",
      )
      .eq("id", threadId)
      .maybeSingle(),
    supabase
      .from("chat_messages")
      .select("id, sender, kind, body, image_url, width, height, created_at, client_id")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })
      .limit(500),
    // Only "++"-prefixed AND active rows show up as composer chips.
    // Plain templates (no "++") are managed in /admin/quick-replies but not surfaced as buttons here.
    supabase
      .from("quick_replies")
      .select("id, title, body")
      .eq("is_active", true)
      .like("title", "++%")
      .order("sort_order")
      .order("title"),
  ]);

  if (!thread) notFound();

  const claimer = Array.isArray(thread.claimer) ? thread.claimer[0] : thread.claimer;

  return (
    <div className="flex flex-col h-[calc(100vh-56px-2rem)] max-w-3xl w-full mx-auto bg-white rounded-lg border border-zinc-200 overflow-hidden">
      <header className="border-b border-zinc-200 px-4 py-3 flex items-center justify-between">
        <div>
          <Link href="/admin/chat" className="text-xs text-zinc-500 hover:underline">
            ← 返回收件箱
          </Link>
          <h1 className="font-semibold mt-1">
            {thread.guest_name ?? "访客"}{" "}
            <span className="text-xs text-zinc-500 font-mono">{thread.id.slice(0, 8)}</span>
          </h1>
          <p className="text-xs text-zinc-500">
            创建于 {formatMalaysia(thread.created_at)} · 状态 {STATUS_LABEL[thread.status]}
            {claimer && ` · 由 ${claimer.display_name} 认领`}
          </p>
        </div>
      </header>

      <AgentChat
        threadId={thread.id}
        status={thread.status}
        claimedBy={thread.claimed_by}
        userId={user.id}
        initialMessages={(messages ?? []).map((r) => ({
          id: r.id,
          sender: r.sender,
          kind: r.kind,
          body: r.body,
          imageUrl: r.image_url,
          width: r.width,
          height: r.height,
          createdAt: r.created_at,
        }))}
        quickReplies={quickReplies ?? []}
      />
    </div>
  );
}
