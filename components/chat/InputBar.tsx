"use client";

import { useEffect, useRef, useState } from "react";

export function InputBar({
  onSendText,
  disabled,
  prefill,
  topSlot,
  leftSlot,
}: {
  onSendText: (text: string) => void | Promise<void>;
  disabled?: boolean;
  prefill?: string;
  topSlot?: React.ReactNode;
  leftSlot?: React.ReactNode;
}) {
  const [text, setText] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);

  // When parent pushes a prefill (e.g. quick reply chip tapped), set it and focus.
  useEffect(() => {
    if (prefill === undefined || prefill === "") return;
    setText(prefill);
    requestAnimationFrame(() => {
      const el = taRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      }
    });
  }, [prefill]);

  async function trySend() {
    const v = text.trim();
    if (!v) return;
    await onSendText(v);
    setText("");
    taRef.current?.focus();
  }

  return (
    <div className="border-t border-foreground/10 bg-background">
      {topSlot}
      <div className="flex items-end gap-2 px-3 py-2">
        {leftSlot}
        <textarea
          ref={taRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              trySend();
            }
          }}
          rows={1}
          placeholder="Type a message…"
          disabled={disabled}
          className="flex-1 resize-none max-h-32 min-h-[40px] px-3 py-2 rounded-2xl border border-foreground/15 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20 disabled:opacity-60"
        />
        <button
          type="button"
          onClick={trySend}
          disabled={disabled || !text.trim()}
          className="h-10 px-4 rounded-full bg-foreground text-background text-sm font-medium disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}
