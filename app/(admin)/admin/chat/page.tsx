import Link from "next/link";
import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatMalaysia } from "@/lib/time/malaysia";
import type { ChatThreadStatus } from "@/lib/supabase/types";

export const metadata = { title: "Chat inbox · k8event admin" };

const tabs: { key: ChatThreadStatus | "all"; label: string }[] = [
  { key: "open", label: "Open" },
  { key: "claimed", label: "Claimed" },
  { key: "closed", label: "Closed" },
  { key: "all", label: "All" },
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
    <main className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Chat inbox</h1>

      <div className="flex gap-2 border-b border-foreground/10">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/admin/chat?status=${t.key}`}
            className={
              "px-4 py-2 text-sm font-medium -mb-px border-b-2 " +
              (active === t.key
                ? "border-foreground text-foreground"
                : "border-transparent text-zinc-500 hover:text-foreground")
            }
          >
            {t.label}
          </Link>
        ))}
      </div>

      <ul className="divide-y divide-foreground/10 rounded-lg border border-foreground/10">
        {!threads?.length ? (
          <li className="px-4 py-6 text-zinc-500">No threads.</li>
        ) : (
          threads.map((t) => {
            const claimed = Array.isArray(t.claimed_by) ? t.claimed_by[0] : t.claimed_by;
            return (
              <li key={t.id}>
                <Link
                  href={`/admin/chat/${t.id}`}
                  className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-foreground/[0.03]"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {t.guest_name ?? "Guest"}{" "}
                      <span className="text-xs text-zinc-500 font-mono">{t.id.slice(0, 8)}</span>
                    </div>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      {t.last_message_at
                        ? `Last activity ${formatMalaysia(t.last_message_at)}`
                        : `Started ${formatMalaysia(t.created_at)} (no messages yet)`}
                      {claimed && ` · claimed by ${claimed.display_name}`}
                    </div>
                  </div>
                  <span
                    className={
                      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium " +
                      (t.status === "open"
                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                        : t.status === "claimed"
                          ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                          : "bg-zinc-500/15 text-zinc-500")
                    }
                  >
                    {t.status}
                  </span>
                </Link>
              </li>
            );
          })
        )}
      </ul>
    </main>
  );
}
