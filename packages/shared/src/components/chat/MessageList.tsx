"use client";

import { useEffect, useRef } from "react";
import { MessageCircle } from "lucide-react";
import { formatMalaysia } from "../../time/malaysia";

export type ChatMessageView = {
  id: string;
  sender: "guest" | "agent" | "system";
  kind: "text" | "image";
  body: string | null;
  imageUrl: string | null;
  width: number | null;
  height: number | null;
  createdAt: string;
  pending?: boolean;
};

export function MessageList({
  messages,
  perspective,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
}: {
  messages: ChatMessageView[];
  perspective: "guest" | "agent";
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevLengthRef = useRef(messages.length);
  const prevScrollHeightRef = useRef(0);

  // Scroll to bottom only when NEW messages are appended (not when older ones are prepended).
  useEffect(() => {
    const prev = prevLengthRef.current;
    const curr = messages.length;
    if (curr > prev) {
      // Determine if messages were appended (new) or prepended (older loaded)
      const container = containerRef.current;
      if (container) {
        const addedCount = curr - prev;
        // If the first message id changed it's a prepend; otherwise it's an append.
        // A simple heuristic: if we were loading more, restore scroll position.
        if (prevScrollHeightRef.current > 0) {
          // Prepended: keep scroll position so user stays at same visual spot
          const newScrollHeight = container.scrollHeight;
          container.scrollTop = newScrollHeight - prevScrollHeightRef.current;
          prevScrollHeightRef.current = 0;
        } else {
          // Appended: scroll to bottom
          bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
        }
      }
    }
    prevLengthRef.current = curr;
  }, [messages.length]);

  // Save scroll height before prepending older messages
  function handleLoadMore() {
    if (containerRef.current) {
      prevScrollHeightRef.current = containerRef.current.scrollHeight;
    }
    onLoadMore?.();
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-[var(--bg-base)]"
    >
      {/* Load more button at the top */}
      {hasMore && (
        <div className="flex justify-center py-2">
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="text-xs px-3 py-1.5 rounded-full bg-[var(--bg-elevated)] text-[var(--text-lo)] border border-[var(--border-subtle)] hover:text-[var(--text-hi)] disabled:opacity-50 transition"
          >
            {loadingMore ? "加载中…" : "加载更早的消息"}
          </button>
        </div>
      )}

      {messages.length === 0 ? (
        <div className="flex flex-col items-center text-center mt-10 gap-2 text-[var(--text-lo)]">
          <div className="h-12 w-12 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center">
            <MessageCircle size={22} />
          </div>
          <p className="text-sm">还没有消息,先打个招呼吧 👋</p>
        </div>
      ) : (
        groupByDay(messages).map((group, gi) => (
          <div key={gi} className="space-y-2">
            <div className="flex justify-center py-1">
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[var(--bg-elevated)] text-[var(--text-lo)] border border-[var(--border-subtle)]">
                {group.label}
              </span>
            </div>
            {group.messages.map((m) => (
              <MessageBubble key={m.id} message={m} perspective={perspective} />
            ))}
          </div>
        ))
      )}
      <div ref={bottomRef} />
    </div>
  );
}

function MessageBubble({
  message,
  perspective,
}: {
  message: ChatMessageView;
  perspective: "guest" | "agent";
}) {
  if (message.sender === "system") {
    return (
      <div className="text-center text-[11px] text-[var(--text-lo)] italic py-1">
        {message.body}
      </div>
    );
  }

  const isOwn =
    (perspective === "guest" && message.sender === "guest") ||
    (perspective === "agent" && message.sender === "agent");

  const bubbleClass = isOwn
    ? "bg-gradient-to-br from-[var(--gold-300)] to-[var(--gold-500)] text-[var(--text-on-gold)] rounded-br-sm"
    : "bg-[var(--bg-elevated)] text-[var(--text-hi)] border border-[var(--border-subtle)] rounded-bl-sm";

  return (
    <div className={"flex flex-col max-w-[80%] " + (isOwn ? "ml-auto items-end" : "items-start")}>
      <div
        className={
          "px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words " +
          bubbleClass +
          (message.pending ? " opacity-60" : "")
        }
      >
        {message.kind === "image" && message.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={message.imageUrl}
            alt="图片"
            width={message.width ?? undefined}
            height={message.height ?? undefined}
            className="rounded-lg max-w-[260px] max-h-[260px] object-cover"
          />
        ) : (
          message.body
        )}
      </div>
      <div className="text-[10px] text-[var(--text-lo)] mt-0.5 px-1 tabular-nums">
        {formatMalaysia(message.createdAt, "HH:mm")}
        {message.pending && " · 发送中…"}
      </div>
    </div>
  );
}

function groupByDay(messages: ChatMessageView[]) {
  const groups: { label: string; messages: ChatMessageView[] }[] = [];
  let lastLabel = "";
  for (const m of messages) {
    const label = formatMalaysia(m.createdAt, "yyyy-MM-dd");
    if (label !== lastLabel) {
      groups.push({ label, messages: [] });
      lastLabel = label;
    }
    groups[groups.length - 1].messages.push(m);
  }
  return groups;
}
