import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatMalaysia } from "@/lib/time/malaysia";
import { AgentChat } from "./AgentChat";

export const metadata = { title: "Conversation · k8event admin" };

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
    supabase
      .from("quick_replies")
      .select("id, title, body")
      .order("sort_order")
      .order("title"),
  ]);

  if (!thread) notFound();

  const claimer = Array.isArray(thread.claimer) ? thread.claimer[0] : thread.claimer;

  return (
    <main className="flex flex-col h-[calc(100vh-56px)] max-w-3xl w-full mx-auto">
      <header className="border-b border-foreground/10 px-4 py-3 flex items-center justify-between">
        <div>
          <Link href="/admin/chat" className="text-xs text-zinc-500 hover:underline">
            ← Inbox
          </Link>
          <h1 className="font-semibold mt-1">
            {thread.guest_name ?? "Guest"}{" "}
            <span className="text-xs text-zinc-500 font-mono">{thread.id.slice(0, 8)}</span>
          </h1>
          <p className="text-xs text-zinc-500">
            Started {formatMalaysia(thread.created_at)} · status {thread.status}
            {claimer && ` · claimed by ${claimer.display_name}`}
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
    </main>
  );
}
