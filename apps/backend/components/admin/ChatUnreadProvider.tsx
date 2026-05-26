"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { createSupabaseBrowserClient } from "@k8event/shared/supabase/client";

type Ctx = { unreadCount: number; pendingHasNew: boolean; clearPendingNew: () => void };
const ChatUnreadContext = createContext<Ctx>({ unreadCount: 0, pendingHasNew: false, clearPendingNew: () => {} });

export const useChatUnread = () => useContext(ChatUnreadContext);

const STORAGE_KEY = "bo_chat_last_seen_at";
const PENDING_STORAGE_KEY = "bo_chat_pending_seen_at";
const POLL_INTERVAL_MS = 5000;

/**
 * Tracks unread guest chat messages across the entire BO 管理后台 shell.
 *
 * Strategy: HTTP polling, NOT websocket realtime. We tried Supabase Realtime
 * postgres_changes (commits up through 0004) but the free tier never actually
 * broadcasts events even with publication + REPLICA IDENTITY FULL set
 * (Realtime Messages stayed 0 in usage across the whole billing cycle even
 * with live websocket subscribers). Polling is identical UX-wise to ~5s
 * realtime delay and has no service-tier failure mode.
 *
 * - Polls chat_messages count where sender='guest' AND created_at > localStorage
 *   `last_seen_at`, every 5 seconds, while the tab is visible.
 * - When the user navigates to /admin/chat*, marks all as read (count=0,
 *   update timestamp).
 * - On count increase, plays the ding once (Web Audio).
 * - Pauses polling when document.hidden (Page Visibility API); resumes + fires
 *   one immediate fetch on visibilitychange back to visible.
 */
export function ChatUnreadProvider({ children, groupId }: { children: React.ReactNode; groupId?: string }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingHasNew, setPendingHasNew] = useState(false);
  const pathname = usePathname();
  const onChatPageRef = useRef(false);
  const audioPrimedRef = useRef(false);
  const lastCountRef = useRef(0);

  function clearPendingNew() {
    setPendingHasNew(false);
    try { localStorage.setItem(PENDING_STORAGE_KEY, new Date().toISOString()); } catch { /* */ }
  }

  // Only mark as "read" (reset last_seen_at) when on a specific thread page,
  // NOT on the inbox list — the operator hasn't read messages just by being on
  // the list. Sound should fire on any page.
  useEffect(() => {
    // Match /admin/chat/<uuid> (thread detail page)
    const onThreadDetail = /^\/admin\/chat\/[0-9a-f-]{36}/.test(pathname ?? "");
    onChatPageRef.current = false; // never suppress polling
    if (onThreadDetail) {
      try {
        localStorage.setItem(STORAGE_KEY, new Date().toISOString());
      } catch {
        /* private mode etc. */
      }
      setUnreadCount(0);
      lastCountRef.current = 0;
    }
  }, [pathname]);

  // Prime the AudioContext on the first user gesture so the ding can play later
  // (most browsers block AudioContext until a user gesture has happened on the page).
  useEffect(() => {
    function prime() {
      audioPrimedRef.current = true;
      window.removeEventListener("pointerdown", prime);
      window.removeEventListener("keydown", prime);
    }
    window.addEventListener("pointerdown", prime, { once: true });
    window.addEventListener("keydown", prime, { once: true });
    return () => {
      window.removeEventListener("pointerdown", prime);
      window.removeEventListener("keydown", prime);
    };
  }, []);

  // Polling loop. Runs once on mount; teardown on unmount.
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const supabase = createSupabaseBrowserClient();

    function readLastSeen(): string {
      try {
        return localStorage.getItem(STORAGE_KEY) ?? new Date(0).toISOString();
      } catch {
        return new Date(0).toISOString();
      }
    }

    function readPendingLastSeen(): string {
      try {
        return localStorage.getItem(PENDING_STORAGE_KEY) ?? new Date(0).toISOString();
      } catch {
        return new Date(0).toISOString();
      }
    }

    async function pollOnce() {
      if (cancelled) return;
      try {
        const lastSeen = readLastSeen();
        const pendingLastSeen = readPendingLastSeen();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sb = supabase as any;

        // Count threads with new unread guest messages in this group.
        // Using thread-level last_message_at so we can filter by group_id without a join.
        let unreadQ = sb
          .from("chat_threads")
          .select("id", { count: "exact", head: true })
          .eq("last_message_sender", "guest")
          .gt("last_message_at", lastSeen);
        if (groupId) unreadQ = unreadQ.eq("group_id", groupId);

        let pendingQ = sb
          .from("chat_threads")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending")
          .eq("last_message_sender", "guest")
          .gt("last_message_at", pendingLastSeen);
        if (groupId) pendingQ = pendingQ.eq("group_id", groupId);

        const [{ count, error }, { count: pendingCount }] = await Promise.all([
          unreadQ,
          pendingQ,
        ]);

        if (cancelled) return;
        if (!error) {
          const next = count ?? 0;
          if (next > lastCountRef.current) {
            playDing(audioPrimedRef.current);
          }
          lastCountRef.current = next;
          setUnreadCount(next);
        }
        if ((pendingCount ?? 0) > 0) {
          setPendingHasNew(true);
        }
      } catch {
        /* network blip — retry next tick */
      }
      scheduleNext();
    }

    function scheduleNext() {
      if (cancelled) return;
      // Pause polling when the tab is hidden — resumes on visibilitychange.
      if (typeof document !== "undefined" && document.hidden) return;
      timer = setTimeout(pollOnce, POLL_INTERVAL_MS);
    }

    function onVisibility() {
      if (cancelled) return;
      if (document.hidden) {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
      } else {
        // Tab came back to foreground — fetch immediately.
        if (timer) clearTimeout(timer);
        void pollOnce();
      }
    }

    // Kick off
    void pollOnce();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  return (
    <ChatUnreadContext.Provider value={{ unreadCount, pendingHasNew, clearPendingNew }}>
      {children}
    </ChatUnreadContext.Provider>
  );
}

/**
 * Fanfare notification via Web Audio. No asset file needed.
 * Silently no-ops if the AudioContext cannot start (e.g. browser blocked it before any user gesture).
 */
function playDing(primed: boolean) {
  if (!primed) return; // Don't even try until the user has interacted with the page.
  try {
    const AudioCtor: typeof AudioContext =
      window.AudioContext ||
      // @ts-expect-error legacy WebKit
      window.webkitAudioContext;
    const ctx = new AudioCtor();
    const now = ctx.currentTime;

    const tone = (freq: number, start: number, dur: number, vol: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "square";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + start);
      gain.gain.linearRampToValueAtTime(vol, now + start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
      osc.start(now + start);
      osc.stop(now + start + dur + 0.01);
    };

    // Fanfare: C5→E5→G5→C6→G5→C6 ascending melody
    const melody: [number, number][] = [
      [523, 0], [659, 0.12], [784, 0.24], [1047, 0.38], [784, 0.54], [1047, 0.66],
    ];
    melody.forEach(([freq, start]) => tone(freq, start, 0.14, 0.28));
    setTimeout(() => ctx.close().catch(() => {}), 1200);
  } catch {
    /* ignored — browser may block until user interacts */
  }
}
