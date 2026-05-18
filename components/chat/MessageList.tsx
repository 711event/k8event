"use client";

import { useEffect, useRef } from "react";
import { formatMalaysia } from "@/lib/time/malaysia";

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
}: {
  messages: ChatMessageView[];
  perspective: "guest" | "agent";
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
      {messages.length === 0 ? (
        <p className="text-center text-sm text-zinc-500 mt-6">
          No messages yet. Say hi 👋
        </p>
      ) : (
        groupByDay(messages).map((group, gi) => (
          <div key={gi} className="space-y-2">
            <div className="text-center text-xs text-zinc-500 py-1">{group.label}</div>
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
      <div className="text-center text-xs text-zinc-500 italic py-1">{message.body}</div>
    );
  }

  const isOwn =
    (perspective === "guest" && message.sender === "guest") ||
    (perspective === "agent" && message.sender === "agent");

  const bubbleClass = isOwn
    ? "bg-foreground text-background ml-auto rounded-br-sm"
    : "bg-foreground/[0.06] text-foreground mr-auto rounded-bl-sm";

  return (
    <div className={"flex flex-col max-w-[80%] " + (isOwn ? "ml-auto items-end" : "items-start")}>
      <div className={"px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words " + bubbleClass + (message.pending ? " opacity-60" : "")}>
        {message.kind === "image" && message.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={message.imageUrl}
            alt="sent"
            width={message.width ?? undefined}
            height={message.height ?? undefined}
            className="rounded-lg max-w-[260px] max-h-[260px] object-cover"
          />
        ) : (
          message.body
        )}
      </div>
      <div className="text-[10px] text-zinc-500 mt-0.5 px-1">
        {formatMalaysia(message.createdAt, "HH:mm")}
        {message.pending && " · sending…"}
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
