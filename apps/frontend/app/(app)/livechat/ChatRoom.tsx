"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@k8event/shared/supabase/client";
import { MessageList, type ChatMessageView } from "@k8event/shared/components/chat/MessageList";
import { InputBar } from "@k8event/shared/components/chat/InputBar";
import { ThumbStrip } from "@k8event/shared/components/chat/ThumbStrip";
import { AttachMenu } from "@k8event/shared/components/chat/AttachMenu";
import {
  ensureUploaded,
  ingestFiles,
  pruneOldImages,
  type SenderContext,
} from "@k8event/shared/chat/uploadImage";
import { getChatDb } from "@k8event/shared/chat/dexie";

const PAGE_SIZE = 50;
const uuid = () => crypto.randomUUID();

type Session = { threadId: string; guestToken: string; status: string; guestName: string | null };

function rowToView(r: {
  id: string;
  sender: "guest" | "agent" | "system";
  kind: "text" | "image";
  body: string | null;
  image_url: string | null;
  width: number | null;
  height: number | null;
  created_at: string;
}): ChatMessageView {
  return {
    id: r.id,
    sender: r.sender,
    kind: r.kind,
    body: r.body,
    imageUrl: r.image_url,
    width: r.width,
    height: r.height,
    createdAt: r.created_at,
  };
}

export function ChatRoom() {
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<ChatMessageView[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  // oldest created_at we've loaded — used as cursor for loading older messages
  const oldestAt = useRef<string | null>(null);

  const supabase = useMemo(
    () => (session ? createSupabaseBrowserClient({ "x-guest-token": session.guestToken }) : null),
    [session?.guestToken],
  );

  const senderCtx: SenderContext | null = session
    ? { sender: "guest", guestToken: session.guestToken }
    : null;

  // Bootstrap thread
  useEffect(() => {
    let cancelled = false;
    fetch("/api/chat/guest", { method: "POST" })
      .then((r) => r.json())
      .then((r) => {
        if (cancelled) return;
        if (r.error) setError(r.error);
        else setSession({ threadId: r.threadId, guestToken: r.guestToken, status: r.status, guestName: r.guestName });
      })
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  // Initial load: fetch the 50 most recent messages, then set up realtime + polling
  useEffect(() => {
    if (!supabase || !session) return;
    let cancelled = false;

    // Fetch newest PAGE_SIZE messages (DESC so we get the most recent, then reverse for display)
    supabase
      .from("chat_messages")
      .select("id, sender, kind, body, image_url, width, height, created_at, client_id")
      .eq("thread_id", session.threadId)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE)
      .then(({ data }) => {
        if (cancelled) return;
        const rows = (data ?? []).reverse(); // oldest → newest for display
        setMessages(rows.map(rowToView));
        setHasMore((data ?? []).length === PAGE_SIZE);
        oldestAt.current = rows[0]?.created_at ?? null;
      });

    const channel = supabase
      .channel(`thread:${session.threadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `thread_id=eq.${session.threadId}`,
        },
        (payload) => mergeNewRow(payload.new),
      )
      .subscribe();

    const poll = setInterval(async () => {
      // Poll only for new messages (after the latest we know about)
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        const since = last?.createdAt;
        if (!since) return prev;
        supabase
          .from("chat_messages")
          .select("id, sender, kind, body, image_url, width, height, created_at, client_id")
          .eq("thread_id", session.threadId)
          .gt("created_at", since)
          .order("created_at", { ascending: true })
          .then(({ data }) => {
            if (cancelled || !data?.length) return;
            for (const r of data) mergeNewRow(r);
          });
        return prev; // no-op update; mergeNewRow will trigger real update
      });
    }, 5000);

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, session?.threadId]);

  // Clear stale Dexie images on mount (ThumbStrip removed; auto-send on pick)
  useEffect(() => {
    void getChatDb().images.clear();
  }, []);

  // Load older messages (cursor-based, called when user scrolls to top)
  async function loadOlderMessages() {
    if (!supabase || !session || !hasMore || loadingMore || !oldestAt.current) return;
    setLoadingMore(true);
    try {
      const { data } = await supabase
        .from("chat_messages")
        .select("id, sender, kind, body, image_url, width, height, created_at, client_id")
        .eq("thread_id", session.threadId)
        .lt("created_at", oldestAt.current)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      const rows = (data ?? []).reverse();
      if (rows.length > 0) {
        oldestAt.current = rows[0].created_at;
        setMessages((prev) => [...rows.map(rowToView), ...prev]);
      }
      setHasMore(rows.length === PAGE_SIZE);
    } finally {
      setLoadingMore(false);
    }
  }

  function mergeNewRow(raw: unknown) {
    const r = raw as Parameters<typeof rowToView>[0] & { client_id: string | null };
    setMessages((prev) => {
      if (r.client_id) {
        const idx = prev.findIndex((m) => m.id === r.client_id);
        if (idx >= 0) {
          const next = prev.slice();
          next[idx] = rowToView(r);
          return next;
        }
      }
      if (prev.find((m) => m.id === r.id)) return prev;
      return [...prev, rowToView(r)];
    });
  }

  async function sendText(body: string) {
    if (!session) return;
    const clientId = uuid();
    setMessages((prev) => [
      ...prev,
      {
        id: clientId,
        sender: "guest",
        kind: "text",
        body,
        imageUrl: null,
        width: null,
        height: null,
        createdAt: new Date().toISOString(),
        pending: true,
      },
    ]);
    try {
      const res = await fetchWithTimeout(
        "/api/chat/send",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ body, clientId }),
        },
        15000,
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "send_failed");
        setMessages((prev) => prev.filter((m) => m.id !== clientId));
        return;
      }
      setMessages((prev) =>
        prev.map((m) => (m.id === clientId ? { ...m, pending: false } : m)),
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "send_failed";
      setError(msg === "timeout" ? "网络较慢,消息可能尚未送达,请刷新页面确认。" : msg);
      setMessages((prev) => prev.filter((m) => m.id !== clientId));
    }
  }

  function fetchWithTimeout(input: RequestInfo, init: RequestInit, ms: number): Promise<Response> {
    return new Promise((resolve, reject) => {
      const ctrl = new AbortController();
      const t = setTimeout(() => {
        ctrl.abort();
        reject(new Error("timeout"));
      }, ms);
      fetch(input, { ...init, signal: ctrl.signal })
        .then((r) => {
          clearTimeout(t);
          resolve(r);
        })
        .catch((err) => {
          clearTimeout(t);
          reject(err);
        });
    });
  }

  async function handleFiles(files: File[]) {
    if (!senderCtx) return;
    const ids = await ingestFiles(files, senderCtx);
    // Auto-send immediately
    for (const id of ids) {
      await sendImage(id);
    }
  }

  async function sendImage(localId: string) {
    if (!senderCtx) return;
    const clientId = uuid();
    setMessages((prev) => [
      ...prev,
      {
        id: clientId,
        sender: "guest",
        kind: "image",
        body: null,
        imageUrl: null,
        width: null,
        height: null,
        createdAt: new Date().toISOString(),
        pending: true,
      },
    ]);
    try {
      const img = await ensureUploaded(localId, senderCtx);
      const res = await fetchWithTimeout(
        "/api/chat/send",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            imageUrl: img.publicUrl,
            width: img.width,
            height: img.height,
            clientId,
          }),
        },
        20000,
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "send_failed");
        setMessages((prev) => prev.filter((m) => m.id !== clientId));
        return;
      }
      setMessages((prev) =>
        prev.map((m) =>
          m.id === clientId
            ? {
                ...m,
                imageUrl: img.publicUrl ?? null,
                width: img.width,
                height: img.height,
                pending: false,
              }
            : m,
        ),
      );
      // Remove from local Dexie cache so thumbnail strip stays clean
      await getChatDb().images.delete(localId);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "upload_failed";
      setError(msg === "timeout" ? "网络较慢,图片可能尚未送达,请刷新页面确认。" : msg);
      setMessages((prev) => prev.filter((m) => m.id !== clientId));
    }
  }

  return (
    <>
      <header className="border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-3 flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[var(--gold-300)] to-[var(--gold-500)] text-[var(--text-on-gold)] flex items-center justify-center font-bold font-[family-name:var(--font-display)] text-[11px] tracking-tight">
          711
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-[var(--text-hi)] text-sm">711event 客服</h1>
          <p className="text-[11px] text-[var(--pitch-400)] flex items-center gap-1.5">
            <span
              className="h-1.5 w-1.5 rounded-full bg-[var(--pitch-500)]"
              style={{ animation: "pulse-dot 1.6s ease-in-out infinite" }}
            />
            在线 · 通常几分钟内回复
          </p>
        </div>
      </header>

      {error && (
        <div className="px-4 py-2 text-xs text-[var(--crimson-400)] bg-[var(--crimson-500)]/10 border-b border-[var(--crimson-500)]/30 flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-[11px] underline hover:text-[var(--crimson-500)]"
          >
            关闭
          </button>
        </div>
      )}

      {!session ? (
        <div className="flex-1 flex items-center justify-center text-sm text-[var(--text-lo)]">
          连接中…
        </div>
      ) : (
        <MessageList
          messages={messages}
          perspective="guest"
          hasMore={hasMore}
          loadingMore={loadingMore}
          onLoadMore={loadOlderMessages}
        />
      )}

      <InputBar
        onSendText={sendText}
        disabled={!session}
        leftSlot={<AttachMenu onFiles={handleFiles} disabled={!session} />}
      />
    </>
  );
}
