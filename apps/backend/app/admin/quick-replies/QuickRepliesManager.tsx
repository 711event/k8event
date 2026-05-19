"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  createQuickReplyAction,
  deleteQuickReplyAction,
  toggleQuickReplyAction,
  updateQuickReplyAction,
  type QRState,
} from "./actions";

type QR = {
  id: string;
  title: string;
  body: string;
  sort_order: number;
  is_active: boolean;
};

const isButton = (title: string) => title.trim().startsWith("++");

export function QuickRepliesManager({ replies }: { replies: QR[] }) {
  const [modalState, setModalState] = useState<{ mode: "create" } | { mode: "edit"; qr: QR } | null>(null);

  return (
    <>
      <div className="rounded-lg border border-zinc-200 bg-white">
        <div className="px-5 py-3 flex items-center justify-between border-b border-zinc-200">
          <div className="text-sm text-zinc-500">共 {replies.length} 条</div>
          <button
            type="button"
            onClick={() => setModalState({ mode: "create" })}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
          >
            <Plus size={15} />
            新建
          </button>
        </div>

        {replies.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-zinc-500">
            还没有快速回复 · 点右上角 <span className="text-blue-600">新建</span> 添加第一条
          </div>
        ) : (
          <ul className="divide-y divide-zinc-200">
            {replies.map((qr) => (
              <QRRow key={qr.id} qr={qr} onEdit={() => setModalState({ mode: "edit", qr })} />
            ))}
          </ul>
        )}
      </div>

      {modalState && (
        <QRModal
          mode={modalState.mode}
          qr={modalState.mode === "edit" ? modalState.qr : undefined}
          onClose={() => setModalState(null)}
        />
      )}
    </>
  );
}

function QRRow({ qr, onEdit }: { qr: QR; onEdit: () => void }) {
  const [delPending, startDel] = useTransition();
  const [togglePending, startToggle] = useTransition();
  const button = isButton(qr.title);

  return (
    <li
      className={
        "px-5 py-3 flex items-start gap-3 transition " +
        (qr.is_active ? "" : "opacity-60")
      }
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={
              "font-mono text-sm font-semibold " +
              (button ? "text-blue-600" : "text-zinc-900")
            }
          >
            {qr.title}
          </span>
          {button && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700">
              快速按钮
            </span>
          )}
        </div>
        <div className="text-sm text-zinc-600 mt-0.5 whitespace-pre-wrap break-words line-clamp-3">
          {qr.body}
        </div>
      </div>

      <div className="flex items-center gap-0.5 flex-shrink-0">
        <button
          type="button"
          aria-label={qr.is_active ? "停用" : "启用"}
          title={qr.is_active ? "停用" : "启用"}
          disabled={togglePending}
          onClick={() =>
            startToggle(async () => {
              const r = await toggleQuickReplyAction(qr.id, !qr.is_active);
              if (r && "error" in r) toast.error(r.error);
            })
          }
          className={
            "h-8 w-8 rounded inline-flex items-center justify-center transition disabled:opacity-50 " +
            (qr.is_active
              ? "text-emerald-600 hover:bg-emerald-50"
              : "text-zinc-400 hover:bg-zinc-100")
          }
        >
          {qr.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
        </button>
        <button
          type="button"
          aria-label="编辑"
          title="编辑"
          onClick={onEdit}
          className="h-8 w-8 rounded inline-flex items-center justify-center text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 transition"
        >
          <Pencil size={15} />
        </button>
        <button
          type="button"
          aria-label="删除"
          title="删除"
          disabled={delPending}
          onClick={() => {
            if (!confirm(`确认删除 "${qr.title}" ?`)) return;
            startDel(async () => {
              const r = await deleteQuickReplyAction(qr.id);
              if (r && "error" in r) toast.error(r.error);
              else toast.success("已删除");
            });
          }}
          className="h-8 w-8 rounded inline-flex items-center justify-center text-red-500 hover:text-red-700 hover:bg-red-50 transition disabled:opacity-50"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </li>
  );
}

function QRModal({
  mode,
  qr,
  onClose,
}: {
  mode: "create" | "edit";
  qr?: QR;
  onClose: () => void;
}) {
  const boundAction =
    mode === "edit" && qr
      ? (prev: QRState, fd: FormData) => updateQuickReplyAction(qr.id, prev, fd)
      : createQuickReplyAction;

  const [state, formAction, pending] = useActionState<QRState, FormData>(boundAction, undefined);
  const [isActive, setIsActive] = useState(qr?.is_active ?? true);

  useEffect(() => {
    if (state && "ok" in state && state.ok) {
      toast.success(mode === "edit" ? "已保存" : "已添加");
      onClose();
    } else if (state && "error" in state) {
      toast.error(state.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <button
        type="button"
        aria-label="关闭"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />
      <div className="relative w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="px-5 py-4 border-b border-zinc-200">
          <h2 className="text-base font-semibold text-zinc-900">
            {mode === "edit" ? "编辑快速回复" : "新建快速回复"}
          </h2>
        </div>
        <form action={formAction} className="px-5 py-4 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-zinc-700">
              标题 <span className="text-xs text-zinc-400 ml-1">(以 ++ 开头将显示为按钮)</span>
            </span>
            <input
              name="title"
              required
              defaultValue={qr?.title ?? ""}
              maxLength={80}
              placeholder="例如  WELCOME  或  ++welcome"
              className="mt-1.5 w-full h-10 px-3 rounded-md border border-zinc-300 bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-zinc-700">内容</span>
            <textarea
              name="body"
              required
              defaultValue={qr?.body ?? ""}
              rows={4}
              maxLength={2000}
              className="mt-1.5 w-full px-3 py-2 rounded-md border border-zinc-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            />
          </label>
          <div className="grid grid-cols-2 gap-3 items-end">
            <label className="block">
              <span className="text-sm font-medium text-zinc-700">排序</span>
              <input
                name="sort_order"
                type="number"
                defaultValue={qr?.sort_order ?? 0}
                className="mt-1.5 w-full h-10 px-3 rounded-md border border-zinc-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              />
            </label>
            <label className="inline-flex h-10 items-center justify-center gap-2 px-3 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm font-medium cursor-pointer hover:bg-emerald-100 transition select-none">
              <input
                type="checkbox"
                name="is_active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="sr-only"
              />
              {isActive ? <Eye size={15} /> : <EyeOff size={15} />}
              {isActive ? "启用" : "停用"}
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="h-9 px-4 rounded-md border border-zinc-300 bg-white text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={pending}
              className="h-9 px-4 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
            >
              {pending ? "保存中…" : "保存"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
