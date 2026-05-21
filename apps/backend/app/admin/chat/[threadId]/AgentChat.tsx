"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import {
  agentSendMessageAction,
  closeThreadAction,
  markPendingAction,
  resolveThreadAction,
} from "./actions";
import { TemplatePicker } from "@/components/admin/TemplatePicker";
import { PRESENCE_CHANNEL } from "../ChatPresenceContext";

type QuickReply = { id: string; title: string; body: string; image_url?: string | null };
const isButtonReply = (q: QuickReply) => q.title.trim().startsWith("++");
const uuid = () => crypto.randomUUID();

export function AgentChat({
  threadId,
  status,
  userId,
  initialMessages,
  quickReplies,
}: {
  threadId: string;
  status: string;
  userId: string;
  initialMessages: ChatMessageView[];
  quickReplies: QuickReply[];
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessageView[]>(initialMessages);
  const [prefill, setPrefill] = useState<string>("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pending, startTransition] = useTransition();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const canType = status !== "closed";
  const senderCtx: SenderContext = { sender: "agent", userId };

  // Clear any stale Dexie images on mount (ThumbStrip is no longer used here)
  useEffect(() => {
    void getChatDb().images.clear();
  }, []);

  // ESC key → back to inbox; Ctrl+V → paste image
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        router.push("/admin/chat");
      }
    }
    function onPaste(e: ClipboardEvent) {
      const files = Array.from(e.clipboardData?.items ?? [])
        .filter((i) => i.kind === "file")
        .map((i) => i.getAsFile())
        .filter((f): f is File => f !== null);
      if (files.length) {
        e.preventDefault();
        handleFiles(files);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("paste", onPaste);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // Track the latest message's created_at so polling fetches only newer rows.
  const lastCreatedAtRef = useRef<string>(
    initialMessages.length > 0 ? initialMessages[initialMessages.length - 1].createdAt : new Date(0).toISOString(),
  );

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    // Polling instead of Supabase Realtime. The free-tier project never
    // actually broadcasts postgres_changes events even with publication and
    // REPLICA IDENTITY FULL configured (Realtime Messages stat = 0 across a
    // whole billing cycle even with live subscribers). See ChatUnreadProvider.
    async function pollNewMessages() {
      if (cancelled) return;
      try {
        const since = lastCreatedAtRef.current;
        const { data } = await supabase
          .from("chat_messages")
          .select("id, sender, kind, body, image_url, width, height, created_at, client_id")
          .eq("thread_id", threadId)
          .gt("created_at", since)
          .order("created_at", { ascending: true })
          .limit(50);
        if (cancelled) return;
        if (data && data.length > 0) {
          for (const row of data) mergeNewRow(row);
          // Advance the cursor to the newest row we just received.
          const last = data[data.length - 1];
          if (last?.created_at && last.created_at > lastCreatedAtRef.current) {
            lastCreatedAtRef.current = last.created_at;
          }
        }
      } catch {
        /* network blip — retry next tick */
      }
      scheduleNext();
    }

    function scheduleNext() {
      if (cancelled) return;
      if (typeof document !== "undefined" && document.hidden) return;
      timer = setTimeout(pollNewMessages, 3000);
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
        void pollNewMessages();
      }
    }

    scheduleNext();
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
  }, [supabase, threadId]);

  useEffect(() => {
    pruneOldImages().catch(() => undefined);
  }, []);

  // Broadcast presence so the inbox can highlight this thread in cyan.
  // We await getSession() first to ensure auth is hydrated before joining.
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    async function trackPresence() {
      await supabase.auth.getSession();
      channel = supabase.channel(PRESENCE_CHANNEL);
      channel.subscribe(async (status) => {
        if (status === "SUBSCRIBED" && channel) {
          await channel.track({ threadId, userId });
        }
      });
    }
    void trackPresence();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId, userId]);

  function mergeNewRow(raw: unknown) {
    const r = raw as {
      id: string;
      sender: "guest" | "agent" | "system";
      kind: "text" | "image";
      body: string | null;
      image_url: string | null;
      width: number | null;
      height: number | null;
      created_at: string;
      client_id: string | null;
    };
    setMessages((prev) => {
      if (r.client_id) {
        const idx = prev.findIndex((m) => m.id === r.client_id);
        if (idx >= 0) {
          const next = prev.slice();
          next[idx] = {
            id: r.id,
            sender: r.sender,
            kind: r.kind,
            body: r.body,
            imageUrl: r.image_url,
            width: r.width,
            height: r.height,
            createdAt: r.created_at,
          };
          return next;
        }
      }
      if (prev.find((m) => m.id === r.id)) return prev;
      return [
        ...prev,
        {
          id: r.id,
          sender: r.sender,
          kind: r.kind,
          body: r.body,
          imageUrl: r.image_url,
          width: r.width,
          height: r.height,
          createdAt: r.created_at,
        },
      ];
    });
  }

  async function sendText(body: string) {
    const clientId = uuid();
    setMessages((prev) => [
      ...prev,
      {
        id: clientId,
        sender: "agent",
        kind: "text",
        body,
        imageUrl: null,
        width: null,
        height: null,
        createdAt: new Date().toISOString(),
        pending: true,
      },
    ]);
    const r = await agentSendMessageAction({ threadId, body, clientId });
    if (r && "error" in r) {
      toast.error(r.error);
      setMessages((prev) => prev.filter((m) => m.id !== clientId));
    }
  }

  function handleFiles(files: File[]) {
    // All files → pending preview first, send on button click
    setPendingFiles((prev) => [...prev, ...files]);
  }

  async function sendFileLink(file: File) {
    const clientId = uuid();
    setMessages((prev) => [
      ...prev,
      { id: clientId, sender: "agent", kind: "text", body: `📎 ${file.name}（上传中…）`, imageUrl: null, width: null, height: null, createdAt: new Date().toISOString(), pending: true },
    ]);
    try {
      const { createSupabaseBrowserClient } = await import("@k8event/shared/supabase/client");
      const sb = createSupabaseBrowserClient();
      // Sanitize: strip path separators and Android UUID prefixes
      const rawName = (file.name || "file").split(/[/\\]/).pop() ?? "file";
      const cleanName = rawName.replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[_-]/i, "");
      const path = `agent/${userId}/files/${uuid()}_${cleanName}`;
      const { error } = await sb.storage.from("chat-images").upload(path, file, { upsert: false });
      if (error) throw error;
      const { data } = sb.storage.from("chat-images").getPublicUrl(path);
      const body = `📎 ${cleanName}\n${data.publicUrl}`;
      const r = await agentSendMessageAction({ threadId, body, clientId });
      if (r && "error" in r) throw new Error(r.error);
      // Immediately show file card (don't wait for polling)
      setMessages((prev) =>
        prev.map((m) => (m.id === clientId ? { ...m, body, pending: false } : m)),
      );
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "文件上传失败");
      setMessages((prev) => prev.filter((m) => m.id !== clientId));
    }
  }

  async function sendPendingFiles(files: File[]) {
    const images = files.filter((f) => f.type.startsWith("image/"));
    const others = files.filter((f) => !f.type.startsWith("image/"));
    if (images.length) {
      const ids = await ingestFiles(images, senderCtx);
      for (const id of ids) await sendImage(id);
    }
    for (const f of others) await sendFileLink(f);
    setPendingFiles([]);
  }

  async function handleSend(text: string, files: File[]) {
    if (files.length) await sendPendingFiles(files);
    if (text) await sendText(text);
  }

  /** Handles picking a quick reply (button chip or template).
   *  If it has an image, fetch it as a File so it shows in the pending preview
   *  area — user then clicks Send to dispatch image + text together. */
  function pickQuickReply(body: string, imageUrl?: string | null) {
    if (imageUrl) {
      // Fetch the stored image and add as a pending file so it shows in the
      // input bar preview and is sent together with the text on Send.
      void (async () => {
        try {
          const res = await fetch(imageUrl);
          const blob = await res.blob();
          const ext = (blob.type.split("/")[1] ?? "jpg").replace("jpeg", "jpg");
          const file = new File([blob], `quick-reply.${ext}`, { type: blob.type });
          setPendingFiles((prev) => [...prev, file]);
        } catch {
          toast.error("图片加载失败");
        }
      })();
    }
    setPrefill(body);
  }

  async function sendImage(localId: string) {
    const clientId = uuid();
    setMessages((prev) => [
      ...prev,
      {
        id: clientId,
        sender: "agent",
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
      const r = await agentSendMessageAction({
        threadId,
        imageUrl: img.publicUrl,
        width: img.width,
        height: img.height,
        clientId,
      });
      if (r && "error" in r) {
        toast.error(r.error);
        setMessages((prev) => prev.filter((m) => m.id !== clientId));
        return;
      }
      setMessages((prev) =>
        prev.map((m) =>
          m.id === clientId
            ? { ...m, imageUrl: img.publicUrl ?? null, width: img.width, height: img.height }
            : m,
        ),
      );
      // Remove from local Dexie cache so thumbnail strip stays clean
      await getChatDb().images.delete(localId);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "upload_failed";
      toast.error(msg);
      setMessages((prev) => prev.filter((m) => m.id !== clientId));
    }
  }

  function doClose() {
    if (!confirm(“确认结束此会话?\n\n结束后此会话进入「已关闭」列表，客服无法继续回复。如果之后再有新消息进来，系统会自动重新打开。”))
      return;
    startTransition(async () => {
      const r = await closeThreadAction(threadId);
      if (r && “error” in r) toast.error(r.error);
      else toast.success(“会话已结束”);
    });
  }

  function doMarkPending() {
    if (!confirm(“确认转为「跟进中」?\n\n此会话将移至跟进中列表，会员新消息不会重置状态。”)) return;
    startTransition(async () => {
      const r = await markPendingAction(threadId);
      if (r && “error” in r) toast.error(r.error);
      else toast.success(“已转为跟进中”);
    });
  }

  function doResolve() {
    if (!confirm(“确认标记为「已解决」?\n\n此会话将进入已关闭列表。”)) return;
    startTransition(async () => {
      const r = await resolveThreadAction(threadId);
      if (r && “error” in r) toast.error(r.error);
      else toast.success(“已解决，会话已关闭”);
    });
  }

  return (
    <>
      <div className=”px-4 py-2 border-b border-zinc-200 flex flex-wrap items-center gap-2”>
        {(status === “open” || status === “claimed”) && (
          <button
            type=”button”
            disabled={pending}
            onClick={doMarkPending}
            title=”需要时间跟进 · 转至跟进中列表”
            className=”h-8 px-3 rounded-md border border-amber-400/40 text-amber-700 hover:bg-amber-50 text-xs font-medium disabled:opacity-60”
          >
            转跟进
          </button>
        )}
        {status === “pending” && (
          <button
            type=”button”
            disabled={pending}
            onClick={doResolve}
            title=”问题已处理完毕 · 关闭此会话”
            className=”h-8 px-3 rounded-md border border-emerald-500/40 text-emerald-700 hover:bg-emerald-50 text-xs font-medium disabled:opacity-60”
          >
            ✓ 已解决
          </button>
        )}
        {status !== “closed” && (
          <button
            type=”button”
            disabled={pending}
            onClick={doClose}
            title=”问题已解决 · 结束此会话并归档”
            className=”h-8 px-3 rounded-md border border-red-500/30 text-red-600 hover:bg-red-50 text-xs font-medium disabled:opacity-60”
          >
            结束会话
          </button>
        )}
      </div>

      <MessageList messages={messages} perspective="agent" />

      <InputBar
        onSend={handleSend}
        disabled={!canType}
        prefill={prefill}
        pendingFiles={pendingFiles}
        onRemoveFile={(idx) => setPendingFiles((prev) => prev.filter((_, i) => i !== idx))}
        topSlot={
          <>
            {quickReplies.length > 0 && (
              <div className="px-3 py-2 border-b border-zinc-200 flex gap-2 overflow-x-auto items-center">
                {quickReplies.filter(isButtonReply).map((q) => (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => pickQuickReply(q.body, q.image_url)}
                    className="whitespace-nowrap px-3 py-1.5 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium border border-blue-200 flex-shrink-0"
                    title={q.body.slice(0, 80)}
                  >
                    {q.title}
                    {q.image_url && <span className="ml-1 opacity-60">📷</span>}
                  </button>
                ))}
                <TemplatePicker
                  templates={quickReplies.filter((q) => !isButtonReply(q))}
                  onPick={(body, imageUrl) => pickQuickReply(body, imageUrl)}
                />
              </div>
            )}
          </>
        }
        leftSlot={<AttachMenu onFiles={handleFiles} disabled={!canType} />}
      />
    </>
  );
}
