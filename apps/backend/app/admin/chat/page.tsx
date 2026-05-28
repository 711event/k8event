import Link from "next/link";
import { requireRole } from "@k8event/shared/auth/require-role";
import { createSupabaseServerClient } from "@k8event/shared/supabase/server";
import { getGroupId } from "@/lib/get-group";
import { ChatInboxAutoRefresh } from "./ChatInboxAutoRefresh";
import { ThreadListClient } from "./ThreadListClient";
import { InboxTabsClient } from "./InboxTabsClient";
import { getBoLocale } from "@/lib/get-locale";
import { tBo } from "@/lib/i18n";

export const metadata = { title: "Chat Support · Admin Panel" };
export const dynamic = "force-dynamic";

type TabKey = "open" | "pending" | "closed" | "all";

export default async function ChatInboxPage(props: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireRole(["admin", "agent"]);
  const locale = await getBoLocale();
  const t = (k: Parameters<typeof tBo>[1]) => tBo(locale, k);
  const sp = await props.searchParams;
  const validTabs: TabKey[] = ["open", "pending", "closed", "all"];
  const active = (validTabs.includes(sp.status as TabKey) ? sp.status : "open") as TabKey;

  const supabase = await createSupabaseServerClient();
  const groupId = getGroupId();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const [{ data: rawThreads }, { data: urgencySettings }, { count: openCount }, { count: pendingCount }] =
    await Promise.all([
      (() => {
        let q = sb
          .from("chat_threads")
          .select(
            "id, guest_name, player_id, status, last_message_at, last_message_body, last_message_kind, last_message_sender, created_at",
          )
          .eq("group_id", groupId)
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
      sb.from("chat_threads").select("id", { count: "exact", head: true }).eq("group_id", groupId).eq("status", "open"),
      sb.from("chat_threads").select("id", { count: "exact", head: true }).eq("group_id", groupId).eq("status", "pending"),
    ]);

  const warnAfterMinutes = urgencySettings?.warn_after_minutes ?? 5;
  const criticalAfterMinutes = urgencySettings?.critical_after_minutes ?? 8;

  // Enrich threads with player username (show instead of guest_name when available)
  const playerIds: string[] = [...new Set(
    (rawThreads ?? [])
      .map((t: { player_id: string | null }) => t.player_id)
      .filter((id: string | null): id is string => Boolean(id))
  )];
  const usernameMap = new Map<string, string | null>();
  if (playerIds.length > 0) {
    const { data: playerProfiles } = await supabase
      .from("profiles")
      .select("user_id, username")
      .in("user_id", playerIds);
    for (const p of playerProfiles ?? []) {
      usernameMap.set(p.user_id, p.username ?? null);
    }
  }
  const threads = (rawThreads ?? []).map((t: { player_id: string | null; [key: string]: unknown }) => ({
    ...t,
    player_username: t.player_id ? (usernameMap.get(t.player_id) ?? null) : null,
  }));

  return (
    <div className="space-y-6 max-w-4xl">
      <ChatInboxAutoRefresh />
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t("inbox_title")}</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {t("inbox_subtitle")}
          </p>
        </div>
        <Link
          href="/admin/chat/retention"
          className="shrink-0 text-xs text-zinc-400 hover:text-zinc-700 mt-1"
        >
          {t("inbox_retentionLink")}
        </Link>
      </div>

      {/* Colour legend */}
      <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-cyan-100 border border-cyan-200 inline-block" />
          {t("inbox_legend_viewing")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-yellow-50 border border-yellow-200 inline-block" />
          {t("inbox_legend_warn")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-red-100 border border-red-300 inline-block" />
          {t("inbox_legend_critical")}
        </span>
      </div>

      <InboxTabsClient
        active={active}
        openCount={openCount ?? 0}
        pendingCount={pendingCount ?? 0}
      />

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
