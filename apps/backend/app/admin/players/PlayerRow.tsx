"use client";

import { useState } from "react";
import { toast } from "sonner";
import { KeyRound, RefreshCw, Copy, Check, X, Pencil } from "lucide-react";
import { changePasswordAction, updateDisplayNameAction, updatePhoneAction } from "./actions";
import { useLang } from "@/components/admin/LangProvider";
import { tBo } from "@/lib/i18n";

function randomPw(): string {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let pw = "";
  for (let i = 0; i < 10; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  return pw;
}

export function PlayerRow({
  userId,
  username,
  displayName: initialDisplayName,
  phone: initialPhone,
  createdAt,
}: {
  userId: string;
  username: string;
  displayName: string | null;
  phone: string | null;
  createdAt: string;
}) {
  const { locale } = useLang();
  const t = (k: Parameters<typeof tBo>[1]) => tBo(locale, k);

  // Password panel
  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState(() => randomPw());
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Edit display name panel
  const [editOpen, setEditOpen] = useState(false);
  const [displayName, setDisplayName] = useState(initialDisplayName ?? "");
  const [editSaving, setEditSaving] = useState(false);

  // Edit phone panel
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [phoneSaving, setPhoneSaving] = useState(false);

  async function savePw() {
    if (pw.length < 8) { toast.error(t("player_row_pw_min")); return; }
    setSaving(true);
    const res = await changePasswordAction(userId, pw);
    setSaving(false);
    if (res.error) { toast.error(res.error); return; }
    toast.success(`${username} ${t("player_row_pw_updated")}`);
    setPwOpen(false);
    setPw(randomPw());
  }

  async function saveDisplayName() {
    if (!displayName.trim()) return;
    setEditSaving(true);
    const res = await updateDisplayNameAction(userId, displayName);
    setEditSaving(false);
    if (res.error) { toast.error(res.error); return; }
    toast.success("显示名称已更新");
    setEditOpen(false);
  }

  async function savePhone() {
    setPhoneSaving(true);
    const res = await updatePhoneAction(userId, phone.trim());
    setPhoneSaving(false);
    if (res.error) { toast.error(res.error); return; }
    toast.success("联系方式已更新");
    setPhoneOpen(false);
  }

  async function copyInfo() {
    await navigator.clipboard.writeText(`Username: ${username}\nPassword: ${pw}`);
    setCopied(true);
    toast.success(t("player_row_copied"));
    setTimeout(() => setCopied(false), 2000);
  }

  const closeAll = () => { setEditOpen(false); setPwOpen(false); setPhoneOpen(false); };

  return (
    <>
      <tr className="hover:bg-zinc-50">
        <td className="px-4 py-3 font-mono">{username}</td>
        <td className="px-4 py-3">{displayName || initialDisplayName}</td>
        <td className="px-4 py-3 text-zinc-500">
          {phone || initialPhone ? (
            <span className="font-mono text-zinc-700">{phone || initialPhone}</span>
          ) : (
            <button
              type="button"
              onClick={() => { closeAll(); setPhoneOpen(true); }}
              className="text-xs text-zinc-400 hover:text-zinc-600 border border-dashed border-zinc-300 rounded px-2 py-0.5 transition"
            >
              + 填写
            </button>
          )}
        </td>
        <td className="px-4 py-3 text-zinc-500">{createdAt}</td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5">
            {/* Edit display name */}
            <button
              type="button"
              onClick={() => { closeAll(); setEditOpen((v) => !v); }}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded border border-zinc-300 hover:border-zinc-400 text-zinc-600 hover:text-zinc-800 transition"
            >
              <Pencil size={12} />
              编辑
            </button>
            {/* Change password */}
            <button
              type="button"
              onClick={() => { closeAll(); setPwOpen((v) => !v); }}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded border border-zinc-300 hover:border-zinc-400 text-zinc-600 hover:text-zinc-800 transition"
            >
              <KeyRound size={12} />
              {t("player_row_change_pw")}
            </button>
          </div>
        </td>
      </tr>

      {/* Edit display name panel */}
      {editOpen && (
        <tr className="bg-zinc-50 border-t border-zinc-100">
          <td colSpan={5} className="px-4 py-3">
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
                <span>显示名称</span>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={60}
                  className="h-9 px-3 rounded border border-zinc-300 text-sm w-52 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                />
              </div>
              <button
                type="button"
                onClick={saveDisplayName}
                disabled={editSaving || !displayName.trim()}
                className="h-9 px-4 rounded bg-zinc-900 text-white text-xs font-medium hover:bg-zinc-700 disabled:opacity-60 transition"
              >
                {editSaving ? "保存中…" : "保存"}
              </button>
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="h-9 w-9 rounded border border-zinc-200 hover:bg-zinc-100 flex items-center justify-center text-zinc-400 transition"
              >
                <X size={14} />
              </button>
            </div>
          </td>
        </tr>
      )}

      {/* Edit phone panel */}
      {phoneOpen && (
        <tr className="bg-zinc-50 border-t border-zinc-100">
          <td colSpan={5} className="px-4 py-3">
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
                <span>联系方式 (WhatsApp / 手机号)</span>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={30}
                  placeholder="例：0123456789"
                  className="h-9 px-3 rounded border border-zinc-300 text-sm w-52 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                />
              </div>
              <button
                type="button"
                onClick={savePhone}
                disabled={phoneSaving}
                className="h-9 px-4 rounded bg-zinc-900 text-white text-xs font-medium hover:bg-zinc-700 disabled:opacity-60 transition"
              >
                {phoneSaving ? "保存中…" : "保存"}
              </button>
              <button
                type="button"
                onClick={() => setPhoneOpen(false)}
                className="h-9 w-9 rounded border border-zinc-200 hover:bg-zinc-100 flex items-center justify-center text-zinc-400 transition"
              >
                <X size={14} />
              </button>
            </div>
          </td>
        </tr>
      )}

      {/* Change password panel */}
      {pwOpen && (
        <tr className="bg-zinc-50 border-t border-zinc-100">
          <td colSpan={5} className="px-4 py-3">
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
                <span>{t("player_row_new_pw")}</span>
                <div className="flex gap-1">
                  <input
                    value={pw}
                    onChange={(e) => setPw(e.target.value)}
                    className="h-9 px-3 rounded border border-zinc-300 font-mono text-sm w-44 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                  />
                  <button
                    type="button"
                    onClick={() => setPw(randomPw())}
                    title={t("player_row_regenerate")}
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
                {t("player_row_copy")}
              </button>

              <button
                type="button"
                onClick={savePw}
                disabled={saving}
                className="h-9 px-4 rounded bg-zinc-900 text-white text-xs font-medium hover:bg-zinc-700 disabled:opacity-60 transition"
              >
                {saving ? t("player_row_saving") : t("player_row_save")}
              </button>

              <button
                type="button"
                onClick={() => setPwOpen(false)}
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
