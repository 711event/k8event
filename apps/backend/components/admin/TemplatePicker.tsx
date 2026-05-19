"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { FileText, ChevronDown, Search, X } from "lucide-react";

type Template = { id: string; title: string; body: string };

export function TemplatePicker({
  templates,
  onPick,
}: {
  templates: Template[];
  onPick: (body: string) => void;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
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
      width: Math.max(320, r.width),
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
        width: Math.max(320, r.width),
      });
    }
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open]);

  // Focus search on open; reset query on close.
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => searchRef.current?.focus(), 30);
      return () => clearTimeout(t);
    } else {
      setQuery("");
    }
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter(
      (t) => t.title.toLowerCase().includes(q) || t.body.toLowerCase().includes(q),
    );
  }, [templates, query]);

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
            className="fixed z-[70] rounded-lg border border-zinc-200 bg-white shadow-xl flex flex-col"
            style={{
              left: `${pos.left}px`,
              bottom: `${pos.bottom}px`,
              width: `${pos.width}px`,
              maxHeight: "min(60vh, 24rem)",
            }}
          >
            {/* Search bar */}
            <div className="p-2 border-b border-zinc-200 flex-shrink-0">
              <div className="relative">
                <Search
                  size={13}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
                />
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="搜索标题或内容…"
                  className="w-full h-8 pl-7 pr-7 rounded-md border border-zinc-200 bg-zinc-50 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 focus:bg-white"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      searchRef.current?.focus();
                    }}
                    aria-label="清空"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
              <div className="px-1 pt-1.5 text-[10px] text-zinc-500 tabular-nums">
                {query ? `匹配 ${filtered.length} / ${templates.length}` : `共 ${templates.length} 条 · 点击插入到输入框`}
              </div>
            </div>

            {/* List */}
            <div className="overflow-y-auto flex-1 min-h-0">
              {filtered.length === 0 ? (
                <div className="px-3 py-6 text-center text-xs text-zinc-400">没有匹配的模板</div>
              ) : (
                <ul className="divide-y divide-zinc-100">
                  {filtered.map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onPick(t.body);
                          setOpen(false);
                        }}
                        className="w-full text-left px-3 py-2.5 hover:bg-zinc-50 transition"
                      >
                        <div className="text-xs font-semibold text-zinc-900 truncate">
                          <Highlight text={t.title} query={query} />
                        </div>
                        <div className="text-[11px] text-zinc-500 mt-0.5 line-clamp-2 whitespace-pre-wrap break-words">
                          <Highlight text={t.body} query={query} />
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

/**
 * Highlight matching substring(s) of `query` inside `text` with a subtle yellow background.
 * Case-insensitive. Falls back to plain text when query is empty.
 */
function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const lower = text.toLowerCase();
  const needle = q.toLowerCase();
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  let i = lower.indexOf(needle);
  let key = 0;
  while (i !== -1) {
    if (i > cursor) parts.push(<span key={`p${key++}`}>{text.slice(cursor, i)}</span>);
    parts.push(
      <mark
        key={`m${key++}`}
        className="bg-amber-200/70 text-zinc-900 rounded px-[1px]"
      >
        {text.slice(i, i + needle.length)}
      </mark>,
    );
    cursor = i + needle.length;
    i = lower.indexOf(needle, cursor);
  }
  if (cursor < text.length) parts.push(<span key={`p${key++}`}>{text.slice(cursor)}</span>);
  return <>{parts}</>;
}
