"use client";

import { useState } from "react";
import { FileText, ChevronDown } from "lucide-react";

type Template = { id: string; title: string; body: string };

export function TemplatePicker({
  templates,
  onPick,
}: {
  templates: Template[];
  onPick: (body: string) => void;
}) {
  const [open, setOpen] = useState(false);

  if (templates.length === 0) return null;

  return (
    <div className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-white border border-zinc-300 text-zinc-700 text-xs font-medium hover:bg-zinc-50 hover:border-zinc-400 transition whitespace-nowrap"
        title="选择回复模板插入到输入框"
      >
        <FileText size={12} />
        模板 · {templates.length}
        <ChevronDown size={11} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute bottom-10 left-0 z-40 w-72 max-h-72 overflow-y-auto rounded-lg border border-zinc-200 bg-white shadow-lg">
            <div className="px-3 py-2 border-b border-zinc-200 text-[11px] text-zinc-500 uppercase tracking-wider">
              点击插入到输入框
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
                    <div className="text-xs font-semibold text-zinc-900 truncate">
                      {t.title}
                    </div>
                    <div className="text-[11px] text-zinc-500 mt-0.5 line-clamp-2 whitespace-pre-wrap">
                      {t.body}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
