"use client";

import { useState } from "react";
import { changePasswordAction } from "./actions";
import { tFe, type FeLocale } from "@/lib/i18n";

interface Props {
  username: string;
  loginUrl: string;
  locale: FeLocale;
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      type="button"
      onClick={copy}
      className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition ${
        copied
          ? "bg-emerald-500 border-emerald-500 text-white"
          : "border-zinc-300 text-zinc-500 hover:border-[var(--gold-500)] hover:text-[var(--gold-600)]"
      }`}
    >
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
}

export function NewUserClient({ username, loginUrl, locale }: Props) {
  const t = (k: Parameters<typeof tFe>[1]) => tFe(locale, k);

  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [savedPw, setSavedPw] = useState("");

  const siteDisplay = loginUrl.replace(/^https?:\/\//, "").replace(/\/login$/, "");
  const copyAll = `${loginUrl}\n用户名：${username}\n密码：${savedPw}`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPw.length < 8) { setError(t("newuser_error_too_short")); return; }
    if (newPw !== confirmPw) { setError(t("newuser_error_mismatch")); return; }
    setSaving(true);
    const res = await changePasswordAction(newPw);
    setSaving(false);
    if (res.error) { setError(res.error); return; }
    setSavedPw(newPw);
    setDone(true);
  }

  // ── Done: show credentials ──
  if (done) {
    return (
      <div className="space-y-4">
        <div className="text-center space-y-1">
          <div className="text-3xl">🎉</div>
          <h2 className="text-xl font-bold text-[var(--text-hi)]">{t("newuser_done_title")}</h2>
          <p className="text-sm text-[var(--text-mid)]">{t("newuser_done_subtitle")}</p>
        </div>

        {/* Credentials card */}
        <div className="rounded-2xl border border-[var(--gold-500)]/40 bg-[var(--bg-elevated)] overflow-hidden">
          <div className="bg-gradient-to-r from-[var(--gold-600)]/20 to-[var(--gold-400)]/10 px-4 py-2.5 border-b border-[var(--gold-500)]/20 flex items-center gap-2">
            <span className="text-base">🔐</span>
            <span className="text-sm font-bold text-[var(--text-hi)]">登入信息</span>
          </div>
          <div className="px-4 py-3 space-y-2.5">
            {/* Site URL */}
            <a
              href={loginUrl}
              className="flex items-center gap-2 text-sm font-semibold text-[var(--gold-400)] hover:text-[var(--gold-300)] transition"
            >
              🌐 <span className="underline underline-offset-2">{siteDisplay}</span>
            </a>

            {/* Username */}
            <div className="flex items-center justify-between gap-2 bg-[var(--bg-raised)] rounded-xl px-3 py-2">
              <div className="min-w-0">
                <p className="text-[10px] text-[var(--text-lo)] font-medium uppercase tracking-wide">🔑 用户名</p>
                <p className="text-sm font-mono font-bold text-[var(--text-hi)] mt-0.5">{username}</p>
              </div>
              <CopyButton text={username} label="Copy" />
            </div>

            {/* New password */}
            <div className="flex items-center justify-between gap-2 bg-[var(--bg-raised)] rounded-xl px-3 py-2">
              <div className="min-w-0">
                <p className="text-[10px] text-[var(--text-lo)] font-medium uppercase tracking-wide">🔒 新密码</p>
                <p className="text-sm font-mono font-bold text-[var(--text-hi)] mt-0.5 tracking-wider">{savedPw}</p>
              </div>
              <CopyButton text={savedPw} label="Copy" />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <a
                href={loginUrl}
                className="flex-1 h-10 flex items-center justify-center rounded-xl bg-gradient-to-b from-[var(--gold-300)] to-[var(--gold-500)] text-[var(--text-on-gold)] font-bold text-sm hover:brightness-110 transition"
              >
                进入 App →
              </a>
              <CopyAllButton text={copyAll} />
            </div>
            <p className="text-[11px] text-[var(--text-lo)] text-center">请截图或记录好以上信息</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Change password form ──
  return (
    <div className="space-y-5">
      <div className="text-center space-y-1.5">
        <div className="text-3xl">👋</div>
        <h2 className="text-xl font-bold text-[var(--text-hi)]">{t("newuser_title")}</h2>
        <p className="text-sm text-[var(--text-mid)] leading-relaxed">{t("newuser_subtitle")}</p>
      </div>

      {/* Show who is logged in */}
      <div className="flex items-center gap-2 bg-[var(--bg-raised)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-sm">
        <span className="text-[var(--text-lo)]">🔑 账号：</span>
        <span className="font-mono font-semibold text-[var(--text-hi)]">{username}</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-wider text-[var(--text-lo)]">
            {t("newuser_new_password")}
          </label>
          <input
            type="password"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            minLength={8}
            required
            autoFocus
            placeholder="至少 8 位"
            className="w-full h-11 px-3 rounded-xl bg-[var(--bg-raised)] border border-[var(--border-strong)] text-[var(--text-hi)] placeholder:text-[var(--text-lo)] focus:outline-none focus:ring-2 focus:ring-[var(--gold-500)]/40 focus:border-[var(--gold-500)]/40 transition"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-wider text-[var(--text-lo)]">
            {t("newuser_confirm_password")}
          </label>
          <input
            type="password"
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
            required
            placeholder="再次输入密码"
            className="w-full h-11 px-3 rounded-xl bg-[var(--bg-raised)] border border-[var(--border-strong)] text-[var(--text-hi)] placeholder:text-[var(--text-lo)] focus:outline-none focus:ring-2 focus:ring-[var(--gold-500)]/40 focus:border-[var(--gold-500)]/40 transition"
          />
        </div>

        {error && <p className="text-sm text-[var(--crimson-400)]">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full h-12 rounded-xl bg-gradient-to-b from-[var(--gold-300)] to-[var(--gold-500)] text-[var(--text-on-gold)] font-bold text-sm disabled:opacity-60 hover:brightness-110 transition"
        >
          {saving ? t("newuser_saving") : t("newuser_submit")}
        </button>
      </form>
    </div>
  );
}

function CopyAllButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      type="button"
      onClick={copy}
      className={`h-10 px-4 rounded-xl border text-sm font-semibold transition ${
        copied
          ? "bg-emerald-500/10 border-emerald-500 text-emerald-400"
          : "border-[var(--border-strong)] text-[var(--text-mid)] hover:border-[var(--gold-500)] hover:text-[var(--gold-400)]"
      }`}
    >
      {copied ? "✓ 已复制" : "复制全部"}
    </button>
  );
}
