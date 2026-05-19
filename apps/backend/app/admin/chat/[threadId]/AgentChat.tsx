"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
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
import {
  agentSendMessageAction,
  claimThreadAction,
  closeThreadAction,
  unclaimThreadAction,
} from "./actions";
import { TemplatePicker } from "@/components/admin/TemplatePicker";

type QuickReply = { id: string; title: string; body: string };
const isButtonReply = (q: QuickReply) => q.title.trim().startsWith("++");
const uuid = () => crypto.randomUUID();

export function AgentChat({
  threadId,
  status,
  claimedBy,
  userId,
  initialMessages,
  quickReplies,
}: {
  threadId: string;
  status: string;
  claimedBy: string | null;
  userId: string;
  initialMessages: ChatMessageView[];
  quickReplies: QuickReply[];
}) {
  const [messages, setMessages] = useState<ChatMessageView[]>(initialMessages);
  const [prefill, setPrefill] = useState<string>("");
  const [pending, startTransition] = useTransition();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const isClaimer = claimedBy === userId;
  const canType = isClaimer || status === "open";
  const senderCtx: SenderContext = { sender: "agent", userId };

  useEffect(() => {
    const channel = supabase
      .channel(`agent-thread:${threadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => mergeNewRow(payload.new),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, threadId]);

  useEffect(() => {
    pruneOldImages().catch(() => undefined);
  }, []);

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

  async function handleFiles(files: File[]) {
    await ingestFiles(files, senderCtx);
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
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "upload_failed";
      toast.error(msg);
      setMessages((prev) => prev.filter((m) => m.id !== clientId));
    }
  }

  function doClaim(claim: boolean) {
    startTransition(async () => {
      const r = await (claim ? claimThreadAction(threadId) : unclaimThreadAction(threadId));
      if (r && "error" in r) toast.error(r.error);
      else toast.success(claim ? "已认领" : "已释放");
    });
  }

  function doClose() {
    if (!confirm("确认结束此会话?\n\n结束后此会话进入“已关闭”列表,客服无法继续回复。如果之后再有新消息进来,系统会自动重新打开。"))
      return;
    startTransition(async () => {
      const r = await closeThreadAction(threadId);
      if (r && "error" in r) toast.error(r.error);
      else toast.success("会话已结束");
    });
  }

  return (
    <>
      <div className="px-4 py-2 border-b border-zinc-200 flex flex-wrap items-center gap-2">
        {!claimedBy && status !== "closed" && (
          <button
            type="button"
            disabled={pending}
            onClick={() => doClaim(true)}
            title="我接手这个对话(防止其他客服重复回复)"
            className="h-8 px-3 rounded-md bg-zinc-900 text-white hover:bg-zinc-800 text-xs font-medium disabled:opacity-60"
          >
            认领
          </button>
        )}
        {claimedBy && isClaimer && status !== "closed" && (
          <button
            type="button"
            disabled={pending}
            onClick={() => doClaim(false)}
            title="把这个会话放回未认领,让别的客服可以接手"
            className="h-8 px-3 rounded-md border border-zinc-300 text-zinc-700 hover:bg-zinc-50 text-xs font-medium disabled:opacity-60"
          >
            释放
          </button>
        )}
        {status !== "closed" && (
          <button
            type="button"
            disabled={pending}
            onClick={doClose}
            title="处理完了 · 关闭这个会话(归档)"
            className="h-8 px-3 rounded-md border border-red-500/30 text-red-600 hover:bg-red-50 text-xs font-medium disabled:opacity-60"
          >
            结束会话
          </button>
        )}
        {claimedBy && !isClaimer && (
          <span className="text-xs text-zinc-500">已被其他客服认领</span>
        )}
      </div>

      <MessageList messages={messages} perspective="agent" />

      <InputBar
        onSendText={sendText}
        disabled={!canType}
        prefill={prefill}
        topSlot={
          <>
            <ThumbStrip onPick={(img) => sendImage(img.id)} />
            {quickReplies.length > 0 && (
              <div className="px-3 py-2 border-b border-zinc-200 flex gap-2 overflow-x-auto items-center">
                {quickReplies.filter(isButtonReply).map((q) => (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setPrefill(q.body)}
                    className="whitespace-nowrap px-3 py-1.5 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium border border-blue-200 flex-shrink-0"
                    title={q.body.slice(0, 80)}
                  >
                    {q.title}
                  </button>
                ))}
                <TemplatePicker
                  templates={quickReplies.filter((q) => !isButtonReply(q))}
                  onPick={(body) => setPrefill(body)}
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
