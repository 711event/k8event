"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { FileText, ChevronDown } from "lucide-react";

type Template = { id: string; title: string; body: string };

export function TemplatePicker({
  templates,
  onPick,
}: {
  templates: Template[];
  onPick: (body: string) => void;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; bottom: number; width: number } | null>(null);

  // Place the popup using fixed positioning anchored to the button's rect.
  // This is necessary because the chip row above the chat composer is
  // `overflow-x-auto`, which would otherwise CLIP an absolutely-positioned
  // popup rendered inside it.
  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setPos({
      left: r.left,
      bottom: window.innerHeight - r.top + 8, // 8px gap above button
      width: Math.max(288, r.width),
    });
  }, [open]);

  // Re-position on resize / scroll while open.
  useEffect(() => {
    if (!open) return;
    function reposition() {
      if (!btnRef.current) return;
      const r = btnRef.current.getBoundingClientRect();
      setPos({
        left: r.left,
        bottom: window.innerHeight - r.top + 8,
        width: Math.max(288, r.width),
      });
    }
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open]);

  // Esc to close.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (templates.length === 0) return null;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-white border border-zinc-300 text-zinc-700 text-xs font-medium hover:bg-zinc-50 hover:border-zinc-400 transition whitespace-nowrap flex-shrink-0"
        title="选择回复模板插入到输入框"
      >
        <FileText size={12} />
        模板 · {templates.length}
        <ChevronDown size={11} />
      </button>

      {open && pos && (
        <>
          {/* click-outside backdrop */}
          <button
            type="button"
            aria-label="关闭"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[60] cursor-default"
          />
          <div
            role="menu"
            className="fixed z-[70] max-h-72 overflow-y-auto rounded-lg border border-zinc-200 bg-white shadow-xl"
            style={{
              left: `${pos.left}px`,
              bottom: `${pos.bottom}px`,
              width: `${pos.width}px`,
            }}
          >
            <div className="px-3 py-2 border-b border-zinc-200 text-[11px] text-zinc-500 uppercase tracking-wider">
              点击插入到输入框 · {templates.length} 条
            </div>
            <ul className="divide-y divide-zinc-100">
              {templates.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onPick(t.body);
                      setOpen(false);
                    }}
                    className="w-full text-left px-3 py-2.5 hover:bg-zinc-50 transition"
                  >
                    <div className="text-xs font-semibold text-zinc-900 truncate">{t.title}</div>
                    <div className="text-[11px] text-zinc-500 mt-0.5 line-clamp-2 whitespace-pre-wrap break-words">
                      {t.body}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </>
  );
}
