"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Copy, Check } from "lucide-react";
import { createPlayerAction, type CreatePlayerState } from "./actions";

export function CreatePlayerForm() {
  const [state, formAction, pending] = useActionState<CreatePlayerState, FormData>(
    createPlayerAction,
    undefined,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (state && "ok" in state && state.ok) {
      formRef.current?.reset();
    }
  }, [state]);

  const credentials =
    state && "ok" in state && state.ok
      ? `用户名: ${state.username}\n密码: ${state.password}`
      : null;

  async function copyCredentials() {
    if (!credentials) return;
    await navigator.clipboard.writeText(credentials);
    setCopied(true);
    toast.success("账号信息已复制");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      <form ref={formRef} action={formAction} className="flex flex-wrap gap-3 items-end">
        <label className="flex flex-col gap-1.5 text-sm flex-1 min-w-[160px]">
          <span className="font-medium">用户名</span>
          <input
            name="username"
            type="text"
            placeholder="字母/数字/下划线"
            required
            autoComplete="off"
            className="h-10 px-3 rounded-md border border-zinc-300 bg-transparent focus:outline-none focus:ring-2 focus:ring-foreground/20 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm w-40">
          <span className="font-medium">显示名称 <span className="font-normal text-zinc-400">（可选）</span></span>
          <input
            name="displayName"
            type="text"
            placeholder="默认同用户名"
            className="h-10 px-3 rounded-md border border-zinc-300 bg-transparent focus:outline-none focus:ring-2 focus:ring-foreground/20 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="h-10 px-6 rounded-md bg-zinc-900 text-white hover:bg-zinc-800 font-medium disabled:opacity-60 text-sm"
        >
          {pending ? "创建中…" : "创建"}
        </button>
        {state && "error" in state && (
          <p className="w-full text-sm text-red-600">{state.error}</p>
        )}
      </form>

      {/* Credentials card shown after creation */}
      {credentials && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-emerald-700 mb-1.5">✓ 玩家已创建 — 账号信息</p>
            <p className="font-mono text-sm text-zinc-800">用户名: <strong>{(state as {ok:true;username:string;password:string}).username}</strong></p>
            <p className="font-mono text-sm text-zinc-800">密码: <strong>{(state as {ok:true;username:string;password:string}).password}</strong></p>
            <p className="text-xs text-zinc-500 mt-1">密码已随机生成，请立即复制并告知会员</p>
          </div>
          <button
            type="button"
            onClick={copyCredentials}
            className="flex-shrink-0 flex items-center gap-1.5 h-9 px-3 rounded-md border border-emerald-300 bg-white hover:bg-emerald-50 text-sm font-medium text-emerald-700 transition"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "已复制" : "复制"}
          </button>
        </div>
      )}
    </div>
  );
}
