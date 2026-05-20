"use client";

import { useState } from "react";
import { toast } from "sonner";
import { KeyRound, RefreshCw, Copy, Check, X } from "lucide-react";
import { changePasswordAction } from "./actions";

function randomPw(): string {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let pw = "";
  for (let i = 0; i < 10; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  return pw;
}

export function PlayerRow({
  userId,
  username,
  displayName,
  createdAt,
}: {
  userId: string;
  username: string;
  displayName: string | null;
  createdAt: string;
}) {
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState(() => randomPw());
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  async function save() {
    if (pw.length < 8) { toast.error("密码至少 8 位"); return; }
    setSaving(true);
    const res = await changePasswordAction(userId, pw);
    setSaving(false);
    if (res.error) { toast.error(res.error); return; }
    toast.success(`${username} 密码已更新`);
    setOpen(false);
    setPw(randomPw());
  }

  async function copyInfo() {
    await navigator.clipboard.writeText(`用户名: ${username}\n密码: ${pw}`);
    setCopied(true);
    toast.success("账号信息已复制");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <tr className="hover:bg-zinc-50">
        <td className="px-4 py-3 font-mono">{username}</td>
        <td className="px-4 py-3">{displayName}</td>
        <td className="px-4 py-3 text-zinc-500">{createdAt}</td>
        <td className="px-4 py-3">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded border border-zinc-300 hover:border-zinc-400 text-zinc-600 hover:text-zinc-800 transition"
          >
            <KeyRound size={12} />
            改密
          </button>
        </td>
      </tr>

      {open && (
        <tr className="bg-zinc-50 border-t border-zinc-100">
          <td colSpan={4} className="px-4 py-3">
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
                <span>新密码</span>
                <div className="flex gap-1">
                  <input
                    value={pw}
                    onChange={(e) => setPw(e.target.value)}
                    className="h-9 px-3 rounded border border-zinc-300 font-mono text-sm w-44 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                  />
                  <button
                    type="button"
                    onClick={() => setPw(randomPw())}
                    title="重新随机生成"
                    className="h-9 w-9 rounded border border-zinc-300 hover:bg-zinc-100 flex items-center justify-center text-zinc-500 transition"
                  >
                    <RefreshCw size={13} />
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={copyInfo}
                className="h-9 flex items-center gap-1.5 px-3 rounded border border-zinc-300 hover:bg-zinc-100 text-xs text-zinc-600 transition"
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                复制账号
              </button>

              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="h-9 px-4 rounded bg-zinc-900 text-white text-xs font-medium hover:bg-zinc-700 disabled:opacity-60 transition"
              >
                {saving ? "保存中…" : "保存"}
              </button>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-9 w-9 rounded border border-zinc-200 hover:bg-zinc-100 flex items-center justify-center text-zinc-400 transition"
              >
                <X size={14} />
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
