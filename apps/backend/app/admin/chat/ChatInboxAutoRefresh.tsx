"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const POLL_INTERVAL_MS = 8000;

/**
 * Tiny client island that re-runs the (server-rendered) inbox via polling.
 *
 * Previously this used Supabase Realtime postgres_changes subscriptions, but
 * the free-tier project never actually broadcast events even after publication
 * + REPLICA IDENTITY FULL were set (see ChatUnreadProvider for the same
 * diagnosis). Switched to HTTP polling: every 8 seconds (while the tab is
 * visible) we call router.refresh() which re-fetches the server-rendered
 * inbox with fresh thread data. Cheap because Next.js diffs the streamed
 * markup — only changed rows actually re-render.
 *
 * On tab visibilitychange to visible, refreshes immediately (so the operator
 * sees the latest state right when they come back to the tab).
 */
export function ChatInboxAutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    function tick() {
      if (cancelled) return;
      router.refresh();
      schedule();
    }

    function schedule() {
      if (cancelled) return;
      if (typeof document !== "undefined" && document.hidden) return;
      timer = setTimeout(tick, POLL_INTERVAL_MS);
    }

    function onVisibility() {
      if (cancelled) return;
      if (document.hidden) {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
      } else {
        if (timer) clearTimeout(timer);
        // Immediate refresh on focus return, then resume schedule.
        router.refresh();
        schedule();
      }
    }

    // Don't fire immediately on mount — the page just rendered with fresh
    // server data. Wait one full interval before the first poll.
    schedule();
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisibility);
    }

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibility);
      }
    };
  }, [router]);

  return null;
}
