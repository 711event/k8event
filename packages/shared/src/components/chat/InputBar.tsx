"use client";

import { useEffect, useRef, useState } from "react";
import { Send, X } from "lucide-react";

export function InputBar({
  onSend,
  disabled,
  prefill,
  topSlot,
  leftSlot,
  pendingFiles,
  onRemoveFile,
}: {
  onSend: (text: string, files: File[]) => void | Promise<void>;
  disabled?: boolean;
  prefill?: string;
  topSlot?: React.ReactNode;
  leftSlot?: React.ReactNode;
  pendingFiles?: File[];
  onRemoveFile?: (idx: number) => void;
}) {
  const [text, setText] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

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

  // Generate preview URLs for pending image files
  useEffect(() => {
    if (!pendingFiles || pendingFiles.length === 0) {
      setPreviewUrls([]);
      return;
    }
    const urls = pendingFiles.map((f) => URL.createObjectURL(f));
    setPreviewUrls(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [pendingFiles]);

  const hasPending = (pendingFiles?.length ?? 0) > 0;
  const canSend = !disabled && (text.trim() !== "" || hasPending);

  async function trySend() {
    if (!canSend) return;
    await onSend(text.trim(), pendingFiles ?? []);
    setText("");
    taRef.current?.focus();
  }

  return (
    <div className="border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
      {topSlot}

      {/* Pending image previews */}
      {hasPending && (
        <div className="px-3 pt-2.5 flex gap-2 flex-wrap">
          {previewUrls.map((url, i) => (
            <div
              key={i}
              className="relative h-16 w-16 rounded-xl overflow-hidden border border-[var(--border-strong)] shadow-sm"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
              {onRemoveFile && (
                <button
                  type="button"
                  onClick={() => onRemoveFile(i)}
                  className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black transition"
                  aria-label="移除"
                >
                  <X size={10} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2 px-3 py-2.5">
        {leftSlot}
        <textarea
          ref={taRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void trySend();
            }
          }}
          rows={1}
          placeholder="输入消息…"
          disabled={disabled}
          className="flex-1 resize-none max-h-32 min-h-[40px] px-3 py-2 rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-raised)] text-sm text-[var(--text-hi)] placeholder:text-[var(--text-lo)] focus:outline-none focus:border-[var(--gold-500)]/60 disabled:opacity-60"
        />
        <button
          type="button"
          onClick={() => void trySend()}
          disabled={!canSend}
          aria-label="发送"
          className="h-10 w-10 rounded-full bg-gradient-to-b from-[var(--gold-300)] to-[var(--gold-500)] text-[var(--text-on-gold)] flex items-center justify-center hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:hover:brightness-100 transition"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
