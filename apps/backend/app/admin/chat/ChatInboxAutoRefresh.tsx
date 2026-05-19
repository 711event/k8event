"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@k8event/shared/supabase/client";

/**
 * Tiny client island that re-runs the (server-rendered) inbox whenever:
 *   - A new chat_message lands (any sender)
 *   - A chat_thread row is created or updated (status / claim / last_message_at)
 * The page itself stays a server component — this just calls router.refresh()
 * to re-fetch the latest list with no full page reload.
 *
 * NOTE: we MUST await supabase.auth.getSession() before opening the channel.
 * createBrowserClient hydrates the session asynchronously from cookies; if we
 * subscribe before the JWT is attached the channel opens unauthenticated and
 * Supabase Realtime never delivers any postgres_changes events (silent
 * CHANNEL_ERROR). See plan P11 for the diagnosis.
 */
export function ChatInboxAutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    let retries = 0;
    let channel: RealtimeChannel | null = null;
    const supabase = createSupabaseBrowserClient();

    async function subscribe() {
      await supabase.auth.getSession();
      if (cancelled) return;

      channel = supabase
        .channel("bo:chat-inbox-refresh")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "chat_messages" },
          () => router.refresh(),
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "chat_threads" },
          () => router.refresh(),
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "chat_threads" },
          () => router.refresh(),
        )
        .subscribe((status, err) => {
          // Temporary: always log so we can diagnose production realtime issues.
          // eslint-disable-next-line no-console
          console.log("[ChatInboxAutoRefresh] channel", status, err ?? "");
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            if (cancelled || retries >= 5) return;
            retries += 1;
            setTimeout(() => {
              if (cancelled) return;
              if (channel) supabase.removeChannel(channel);
              void subscribe();
            }, 2000);
          } else if (status === "SUBSCRIBED") {
            retries = 0;
          }
        });
    }

    void subscribe();

    const {
      data: { subscription: authSub },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        if (channel) supabase.removeChannel(channel);
        retries = 0;
        void subscribe();
      }
    });

    return () => {
      cancelled = true;
      authSub.unsubscribe();
      if (channel) supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
