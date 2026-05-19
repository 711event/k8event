"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";

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
    <div className="border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
      {topSlot}
      <div className="flex items-end gap-2 px-3 py-2.5">
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
          placeholder="输入消息…"
          disabled={disabled}
          className="flex-1 resize-none max-h-32 min-h-[40px] px-3 py-2 rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-raised)] text-sm text-[var(--text-hi)] placeholder:text-[var(--text-lo)] focus:outline-none focus:border-[var(--gold-500)]/60 disabled:opacity-60"
        />
        <button
          type="button"
          onClick={trySend}
          disabled={disabled || !text.trim()}
          aria-label="发送"
          className="h-10 w-10 rounded-full bg-gradient-to-b from-[var(--gold-300)] to-[var(--gold-500)] text-[var(--text-on-gold)] flex items-center justify-center hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:hover:brightness-100 transition"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
