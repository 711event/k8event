"use client";

/**
 * ChatPresenceContext — tracks which chat thread IDs are currently
 * being viewed by any admin/agent in real-time via Supabase Presence.
 *
 * The inbox subscribes here to know which threads to highlight in cyan.
 * AgentChat tracks { threadId } when an agent opens a thread.
 *
 * Presence uses WebSocket heartbeats — no DB queries, minimal server load.
 */

import { createContext, useContext, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@k8event/shared/supabase/client";

export const PRESENCE_CHANNEL = "admin-chat-presence";

type ViewedIds = Set<string>;
const PresenceCtx = createContext<ViewedIds>(new Set());

export function useViewedThreadIds(): ViewedIds {
  return useContext(PresenceCtx);
}

export function ChatPresenceProvider({ children }: { children: React.ReactNode }) {
  const [viewedIds, setViewedIds] = useState<ViewedIds>(new Set());

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase.channel(PRESENCE_CHANNEL);

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ threadId: string | null }>();
        const ids = new Set<string>();
        for (const presences of Object.values(state)) {
          for (const p of presences as Array<{ threadId: string | null }>) {
            if (p.threadId) ids.add(p.threadId);
          }
        }
        setViewedIds(ids);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return <PresenceCtx.Provider value={viewedIds}>{children}</PresenceCtx.Provider>;
}
