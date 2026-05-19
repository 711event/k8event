"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@k8event/shared/supabase/client";

/**
 * Tiny client island that re-runs the (server-rendered) inbox whenever:
 *   - A new chat_message lands (any sender)
 *   - A chat_thread row is created or updated (status / claim / last_message_at)
 * The page itself stays a server component — this just calls router.refresh()
 * to re-fetch the latest list with no full page reload.
 */
export function ChatInboxAutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
