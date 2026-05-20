"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useViewedThreadIds } from "./ChatPresenceContext";
import { formatMalaysia } from "@k8event/shared/time/malaysia";
import type { ChatThreadStatus } from "@k8event/shared/supabase/types";

type ChatKind = "text" | "image";
type ChatSender = "guest" | "agent" | "system";

export interface ThreadRow {
  id: string;
  guest_name: string | null;
  status: ChatThreadStatus;
  last_message_at: string | null;
  last_message_body: string | null;
  last_message_kind: ChatKind | null;
  last_message_sender: ChatSender | null;
  created_at: string;
}

const STATUS_LABEL: Record<ChatThreadStatus, string> = {
  open: "未处理",
  claimed: "未处理",
  closed: "已关闭",
};

function MessagePreview({
  kind,
  body,
  sender,
}: {
  kind: ChatKind | null;
  body: string | null;
  sender: ChatSender | null;
}) {
  if (!kind) return <span className="italic text-zinc-400">暂无消息</span>;
  const prefix = sender === "agent" ? "客服: " : "";
  if (kind === "image") return <span>{prefix}📷 图片</span>;
  const text = body ?? "";
  const truncated = text.length > 60 ? text.slice(0, 60) + "…" : text;
  return <span>{prefix}{truncated}</span>;
}

/**
 * Returns the background colour class for a thread row.
 *
 * Priority (highest → lowest):
 *  1. Cyan   — another admin is actively viewing this thread right now
 *  2. Red-2  — guest's last message is ≥ criticalAfterMinutes old and no reply yet
 *  3. Red-1  — guest's last message is ≥ warnAfterMinutes old and no reply yet
 *  4. White  — default
 */
function getRowBg(
  t: ThreadRow,
  viewedIds: Set<string>,
  warnMin: number,
  criticalMin: number,
): string {
  if (viewedIds.has(t.id)) return "bg-cyan-50";

  if (
    t.status !== "closed" &&
    t.last_message_sender === "guest" &&
    t.last_message_at
  ) {
    const ageMin =
      (Date.now() - new Date(t.last_message_at).getTime()) / 60_000;
    if (ageMin >= criticalMin) return "bg-red-100";
    if (ageMin >= warnMin) return "bg-red-50";
  }

  return "";
}

export function ThreadListClient({
  threads,
  warnAfterMinutes = 5,
  criticalAfterMinutes = 8,
}: {
  threads: ThreadRow[];
  warnAfterMinutes?: number;
  criticalAfterMinutes?: number;
}) {
  const viewedIds = useViewedThreadIds();
  // Force a re-render every 30 s so the time-based colours update
  // without waiting for the next server refresh (router.refresh every 8 s
  // already gives fresh data, but this ensures visual colour changes happen
  // even between server refreshes).
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  if (!threads.length) {
    return (
      <li className="px-4 py-8 text-center text-zinc-500 text-sm">暂无会话</li>
    );
  }

  return (
    <>
      {threads.map((t) => {
        const rowBg = getRowBg(t, viewedIds, warnAfterMinutes, criticalAfterMinutes);
        return (
          <li key={t.id} className={rowBg ? `${rowBg} transition-colors` : "transition-colors"}>
            <Link
              href={`/admin/chat/${t.id}`}
              className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-black/[0.04]"
            >
              {/* Left: name + preview */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">
                    {t.guest_name ?? "访客"}
                  </span>
                  <span className="text-xs text-zinc-400 font-mono shrink-0">
                    {t.id.slice(0, 8)}
                  </span>
                </div>
                <div className="text-sm text-zinc-500 truncate mt-0.5">
                  <MessagePreview
                    kind={t.last_message_kind}
                    body={t.last_message_body}
                    sender={t.last_message_sender}
                  />
                </div>
              </div>

              {/* Right: status badge + timestamp */}
              <div className="shrink-0 flex flex-col items-end gap-1">
                <span
                  className={
                    "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium " +
                    (t.status === "closed"
                      ? "bg-zinc-500/15 text-zinc-600"
                      : "bg-amber-500/15 text-amber-700")
                  }
                >
                  {STATUS_LABEL[t.status]}
                </span>
                <span className="text-xs text-zinc-400 whitespace-nowrap">
                  {t.last_message_at
                    ? formatMalaysia(t.last_message_at)
                    : formatMalaysia(t.created_at)}
                </span>
              </div>
            </Link>
          </li>
        );
      })}
    </>
  );
}
