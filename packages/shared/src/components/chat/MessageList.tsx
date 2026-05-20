"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, FileDown, X, ZoomIn } from "lucide-react";
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

  // Scroll to bottom on initial mount.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "instant", block: "end" });
  }, []);

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

function ImageLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
        aria-label="关闭"
      >
        <X size={20} />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="图片"
        className="max-w-[95vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
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
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
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
          <button
            type="button"
            className="relative group block rounded-lg overflow-hidden"
            onClick={() => setLightboxSrc(message.imageUrl!)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={message.imageUrl}
              alt="图片"
              width={message.width ?? undefined}
              height={message.height ?? undefined}
              className="max-w-[260px] max-h-[260px] object-cover"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center">
              <ZoomIn size={24} className="text-white opacity-0 group-hover:opacity-100 transition drop-shadow" />
            </div>
          </button>
        ) : isFileMessage(message.body) ? (
          <FileMessageBubble body={message.body!} />
        ) : (
          message.body
        )}
      </div>
      <div className="text-[10px] text-[var(--text-lo)] mt-0.5 px-1 tabular-nums">
        {formatMalaysia(message.createdAt, "HH:mm")}
        {message.pending && " · 发送中…"}
      </div>
      {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    </div>
  );
}

// Detect file messages: "📎 filename\nhttps://..."
function isFileMessage(body: string | null): boolean {
  if (!body) return false;
  const lines = body.split("\n");
  return lines.length === 2 && lines[0].startsWith("📎 ") && lines[1].startsWith("https://");
}

function FileMessageBubble({ body }: { body: string }) {
  const [nameLine, url] = body.split("\n");
  const filename = nameLine.replace("📎 ", "").replace(" (上传中…)", "");
  const uploading = nameLine.includes("（上传中…）") || nameLine.includes("(上传中…)");
  return (
    <a
      href={uploading ? undefined : url}
      target="_blank"
      rel="noopener noreferrer"
      className={"flex items-center gap-2.5 min-w-[160px] " + (uploading ? "cursor-default" : "hover:opacity-80")}
      onClick={(e) => { if (uploading) e.preventDefault(); }}
    >
      <span className="h-9 w-9 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
        <FileDown size={18} />
      </span>
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-medium truncate">{filename}</span>
        <span className="text-[10px] opacity-70">{uploading ? "上传中…" : "点击下载"}</span>
      </div>
    </a>
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
