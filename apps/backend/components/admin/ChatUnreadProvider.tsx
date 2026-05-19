"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { createSupabaseBrowserClient } from "@k8event/shared/supabase/client";

type Ctx = { unreadCount: number };
const ChatUnreadContext = createContext<Ctx>({ unreadCount: 0 });

export const useChatUnread = () => useContext(ChatUnreadContext);

const STORAGE_KEY = "bo_chat_last_seen_at";
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
export function ChatUnreadProvider({ children }: { children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const pathname = usePathname();
  const onChatPageRef = useRef(false);
  const audioPrimedRef = useRef(false);
  const lastCountRef = useRef(0);

  // Whenever route changes, decide if we're on a chat page.
  useEffect(() => {
    const onChat = pathname?.startsWith("/admin/chat") ?? false;
    onChatPageRef.current = onChat;
    if (onChat) {
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

    async function pollOnce() {
      if (cancelled) return;
      // If we're on the chat page, don't accumulate; just keep the badge at 0.
      if (onChatPageRef.current) {
        scheduleNext();
        return;
      }
      try {
        const lastSeen = readLastSeen();
        const { count, error } = await supabase
          .from("chat_messages")
          .select("id", { count: "exact", head: true })
          .eq("sender", "guest")
          .gt("created_at", lastSeen);
        if (cancelled) return;
        if (error) {
          // Silent fail; just retry on next tick.
        } else {
          const next = count ?? 0;
          // Ding only when the count grows (new message arrived between polls).
          if (next > lastCountRef.current) {
            playDing(audioPrimedRef.current);
          }
          lastCountRef.current = next;
          setUnreadCount(next);
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
  }, []);

  return (
    <ChatUnreadContext.Provider value={{ unreadCount }}>{children}</ChatUnreadContext.Provider>
  );
}

/**
 * Polite two-tone notification via Web Audio. No asset file needed.
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

    const tone = (freq: number, start: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + start);
      gain.gain.linearRampToValueAtTime(0.18, now + start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
      osc.start(now + start);
      osc.stop(now + start + dur + 0.01);
    };

    tone(988, 0, 0.18); // B5
    tone(1319, 0.12, 0.22); // E6
    setTimeout(() => ctx.close().catch(() => {}), 700);
  } catch {
    /* ignored — browser may block until user interacts */
  }
}
