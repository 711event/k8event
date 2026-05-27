import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@k8event/shared/auth/require-role";
import { createSupabaseServerClient } from "@k8event/shared/supabase/server";
import { formatMalaysia } from "@k8event/shared/time/malaysia";
import { getGroupId } from "@/lib/get-group";
import { getBoLocale } from "@/lib/get-locale";
import { tBo } from "@/lib/i18n";
import { AgentChat } from "./AgentChat";

export const metadata = { title: "Chat Thread · Admin Panel" };

export default async function ThreadPage(props: { params: Promise<{ threadId: string }> }) {
  const user = await requireRole(["admin", "agent"]);
  const { threadId } = await props.params;
  const locale = await getBoLocale();
  const t = (k: Parameters<typeof tBo>[1]) => tBo(locale, k);
  const supabase = await createSupabaseServerClient();

  const [{ data: thread }, { data: messages }, { data: quickReplies }, { data: referralReq }] = await Promise.all([
    supabase
      .from("chat_threads")
      .select("id, guest_name, status, created_at, last_message_at")
      .eq("id", threadId)
      .maybeSingle(),
    supabase
      .from("chat_messages")
      .select("id, sender, kind, body, image_url, width, height, created_at, client_id")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })
      .limit(500),
    // Fetch ALL active quick_replies. AgentChat splits them client-side:
    //   - "++"-prefixed → rendered as one-tap chip buttons in composer
    //   - others → available via 模板 picker dropdown
    supabase
      .from("quick_replies")
      .select("id, title, body, image_url")
      .eq("is_active", true)
      .eq("group_id", getGroupId())
      .order("sort_order")
      .order("title"),
    supabase
      .from("referral_requests")
      .select("id, name, phone, ref_username, status")
      .eq("chat_thread_id", threadId)
      .maybeSingle(),
  ]);

  if (!thread) notFound();

  return (
    <div className="flex flex-col h-[calc(100vh-56px-2rem)] max-w-3xl w-full mx-auto bg-white rounded-lg border border-zinc-200 overflow-hidden">
      <header className="border-b border-zinc-200 px-4 py-3 flex items-center justify-between">
        <div>
          <Link href="/admin/chat" className="text-xs text-zinc-500 hover:underline">
            {t("thread_back")}
          </Link>
          <h1 className="font-semibold mt-1">
            {thread.guest_name ?? t("thread_guest")}{" "}
            <span className="text-xs text-zinc-500 font-mono">{thread.id.slice(0, 8)}</span>
          </h1>
          <p className="text-xs text-zinc-500">
            {t("thread_created_at")} {formatMalaysia(thread.created_at)} · {t("thread_status_label")} {tBo(locale, `status_${thread.status}` as Parameters<typeof tBo>[1])}
          </p>
        </div>
      </header>

      {/* Referral context banner */}
      {referralReq && (
        <div className="border-b border-amber-100 bg-amber-50 px-4 py-2 flex items-center gap-3 flex-wrap text-xs text-amber-800">
          <span className="font-semibold">📋 推荐申请</span>
          <span>姓名: <b>{referralReq.name}</b></span>
          <span>📞 {referralReq.phone}</span>
          <span>推荐人: <b>{referralReq.ref_username}</b></span>
          <span className={`px-2 py-0.5 rounded-full border font-medium ${
            referralReq.status === "approved"
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : referralReq.status === "rejected"
              ? "bg-red-50 border-red-200 text-red-700"
              : "bg-amber-100 border-amber-200 text-amber-700"
          }`}>
            {referralReq.status}
          </span>
          {referralReq.status === "pending" && (
            <a
              href="/admin/referrals?tab=pending"
              className="ml-auto text-blue-600 hover:underline font-medium"
            >
              去审核 →
            </a>
          )}
        </div>
      )}

      <AgentChat
        threadId={thread.id}
        status={thread.status}
        userId={user.id}
        locale={locale}
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
