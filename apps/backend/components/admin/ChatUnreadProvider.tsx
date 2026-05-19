"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { createSupabaseBrowserClient } from "@k8event/shared/supabase/client";

type Ctx = { unreadCount: number };
const ChatUnreadContext = createContext<Ctx>({ unreadCount: 0 });

export const useChatUnread = () => useContext(ChatUnreadContext);

const STORAGE_KEY = "bo_chat_last_seen_at";

/**
 * Tracks unread guest chat messages across the entire BO 管理后台 shell.
 * - On mount, queries Supabase for guest messages newer than localStorage `last_seen_at`.
 * - Subscribes to realtime INSERT on chat_messages (sender=guest) and bumps the count.
 * - When the user navigates to /admin/chat*, marks all as read (zero count + update timestamp).
 * - Plays a short "ding" via Web Audio when a new message lands AND the user is not on the chat page.
 */
export function ChatUnreadProvider({ children }: { children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const pathname = usePathname();
  const onChatPageRef = useRef(false);
  const audioPrimedRef = useRef(false);

  // Whenever route changes, decide if we're on a chat page.
  useEffect(() => {
    const onChat = pathname?.startsWith("/admin/chat") ?? false;
    onChatPageRef.current = onChat;
    if (onChat) {
      // Mark everything as read.
      try {
        localStorage.setItem(STORAGE_KEY, new Date().toISOString());
      } catch {
        /* private mode etc. */
      }
      setUnreadCount(0);
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

  // Initial count + realtime subscription. Runs once.
  useEffect(() => {
    let cancelled = false;
    const supabase = createSupabaseBrowserClient();

    const lastSeen = (() => {
      try {
        return localStorage.getItem(STORAGE_KEY) ?? new Date(0).toISOString();
      } catch {
        return new Date(0).toISOString();
      }
    })();

    // Initial fetch (only meaningful if we're NOT on the chat page).
    (async () => {
      if (onChatPageRef.current) return;
      const { count } = await supabase
        .from("chat_messages")
        .select("id", { count: "exact", head: true })
        .eq("sender", "guest")
        .gt("created_at", lastSeen);
      if (cancelled) return;
      if (!onChatPageRef.current) setUnreadCount(count ?? 0);
    })();

    const channel = supabase
      .channel("bo:chat-unread")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: "sender=eq.guest",
        },
        () => {
          if (onChatPageRef.current) return;
          setUnreadCount((c) => c + 1);
          playDing(audioPrimedRef.current);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
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
