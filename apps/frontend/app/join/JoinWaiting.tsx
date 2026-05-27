"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { createSupabaseBrowserClient } from "@k8event/shared/supabase/client";
import { tFe, type FeLocale } from "@/lib/i18n";

interface Message {
  id: string;
  sender: "guest" | "agent" | "system";
  kind: "text" | "image";
  body: string | null;
  created_at: string;
}

interface Credentials {
  username: string;
  password: string;
  loginUrl: string;
}

interface Props {
  threadId: string;
  guestToken: string;
  guestName: string;
  credentials?: Credentials;
  locale: FeLocale;
}

function CopyButton({ text }: { text: string }) {
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
      className={`text-xs px-2 py-0.5 rounded-md border transition font-medium ${
        copied
          ? "bg-emerald-500 border-emerald-500 text-white"
          : "border-[var(--border-subtle)] text-[var(--text-lo)] hover:border-[var(--gold-500)] hover:text-[var(--gold-400)]"
      }`}
    >
      {copied ? "✓" : "Copy"}
    </button>
  );
}

export function JoinWaiting({ threadId, guestToken, credentials, locale }: Props) {
  const t = (k: Parameters<typeof tFe>[1]) => tFe(locale, k);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastCountRef = useRef(0);

  const supabase = useMemo(
    () => createSupabaseBrowserClient({ "x-guest-token": guestToken }),
    [guestToken],
  );

  const loadMessages = useCallback(async () => {
    const { data } = await supabase
      .from("chat_messages")
      .select("id, sender, kind, body, created_at")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })
      .limit(100);
    if (data) {
      setMessages(data as Message[]);
      if (data.length !== lastCountRef.current) {
        lastCountRef.current = data.length;
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      }
    }
  }, [supabase, threadId]);

  useEffect(() => {
    void loadMessages();
    const interval = setInterval(() => void loadMessages(), 5000);
    return () => clearInterval(interval);
  }, [loadMessages]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput("");
    const res = await fetch("/api/chat/send-join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: text }),
    });
    if (res.ok) {
      await loadMessages();
    } else {
      setInput(text);
    }
    setSending(false);
  }

  function formatTime(ts: string) {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  const copyAll = credentials
    ? `${credentials.loginUrl}\n${t("join_cred_username")}: ${credentials.username}\n${t("join_cred_password")}: ${credentials.password}`
    : "";

  return (
    <div className="space-y-3">
      {/* ── Credential card (auto-approved only) ── */}
      {credentials && (
        <div className="rounded-2xl bg-[var(--bg-elevated)] border border-[var(--gold-500)]/40 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[var(--gold-600)]/20 to-[var(--gold-400)]/10 px-4 py-2.5 flex items-center gap-2 border-b border-[var(--gold-500)]/20">
            <span className="text-base">✅</span>
            <span className="text-sm font-bold text-[var(--text-hi)]">{t("join_cred_activated")}</span>
          </div>

          <div className="px-4 py-3 space-y-2.5">
            {/* Login URL */}
            <a
              href={credentials.loginUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm font-semibold text-[var(--gold-400)] hover:text-[var(--gold-300)] transition"
            >
              🌐 <span className="underline underline-offset-2">{credentials.loginUrl.replace(/^https?:\/\//, "")}</span>
            </a>

            {/* Username row */}
            <div className="flex items-center justify-between gap-2 bg-[var(--bg-raised)] rounded-xl px-3 py-2">
              <div className="min-w-0">
                <p className="text-[10px] text-[var(--text-lo)] font-medium uppercase tracking-wide">🔑 {t("join_cred_username")}</p>
                <p className="text-sm font-mono font-bold text-[var(--text-hi)] mt-0.5 truncate">{credentials.username}</p>
              </div>
              <CopyButton text={credentials.username} />
            </div>

            {/* Password row */}
            <div className="flex items-center justify-between gap-2 bg-[var(--bg-raised)] rounded-xl px-3 py-2">
              <div className="min-w-0">
                <p className="text-[10px] text-[var(--text-lo)] font-medium uppercase tracking-wide">🔒 {t("join_cred_password")}</p>
                <p className="text-sm font-mono font-bold text-[var(--text-hi)] mt-0.5 tracking-widest">{credentials.password}</p>
              </div>
              <CopyButton text={credentials.password} />
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-0.5">
              <a
                href={credentials.loginUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 h-10 flex items-center justify-center rounded-xl border border-[var(--border-strong)] text-[var(--text-mid)] text-sm font-semibold hover:border-[var(--gold-500)] hover:text-[var(--gold-400)] transition"
              >
                {t("join_cred_login_btn")}
              </a>
              <CopyAllButton text={copyAll} label={t("join_cred_copy_all")} labelCopied={t("join_cred_copy_all_copied")} />
            </div>

            <p className="text-[11px] text-[var(--text-lo)] text-center leading-relaxed">
              {t("join_cred_hint")}
            </p>
          </div>
        </div>
      )}

      {/* ── Chat window ── */}
      <div className="rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-strong)] overflow-hidden flex flex-col" style={{ minHeight: credentials ? "320px" : "440px" }}>
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-raised)]">
          <div className="relative">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[var(--gold-300)] to-[var(--gold-600)] flex items-center justify-center text-[var(--text-on-gold)] font-bold text-sm flex-shrink-0">
              CS
            </div>
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-[var(--bg-raised)]" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-emerald-500">{t("join_waiting_online")}</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: "260px" }}>
          {messages.map((msg) => {
            if (msg.sender === "system") {
              return (
                <div key={msg.id} className="flex justify-center">
                  <div className="bg-[var(--bg-raised)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs text-[var(--text-mid)] text-center max-w-[90%] whitespace-pre-line">
                    {msg.body}
                  </div>
                </div>
              );
            }
            const isAgent = msg.sender === "agent";
            return (
              <div key={msg.id} className={`flex gap-2 ${isAgent ? "" : "flex-row-reverse"}`}>
                {isAgent && (
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[var(--gold-300)] to-[var(--gold-600)] flex items-center justify-center text-[var(--text-on-gold)] text-xs font-bold flex-shrink-0 mt-1">
                    CS
                  </div>
                )}
                <div className={`max-w-[75%] space-y-1 ${isAgent ? "" : "items-end flex flex-col"}`}>
                  <div className={`rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    isAgent
                      ? "bg-[var(--bg-raised)] border border-[var(--border-subtle)] text-[var(--text-hi)] rounded-tl-sm"
                      : "bg-gradient-to-br from-[var(--gold-400)] to-[var(--gold-600)] text-[var(--text-on-gold)] rounded-tr-sm"
                  }`}>
                    {msg.body}
                  </div>
                  <p className="text-[10px] text-[var(--text-lo)] px-1">{formatTime(msg.created_at)}</p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-[var(--border-subtle)] p-3 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }}
            placeholder={t("join_waiting_placeholder")}
            className="flex-1 h-10 px-3 rounded-xl bg-[var(--bg-base)] border border-[var(--border-subtle)] text-[var(--text-hi)] placeholder:text-[var(--text-lo)] text-sm outline-none focus:border-[var(--gold-500)] transition"
          />
          <button
            type="button"
            onClick={() => void sendMessage()}
            disabled={!input.trim() || sending}
            className="h-10 px-4 rounded-xl bg-gradient-to-b from-[var(--gold-300)] to-[var(--gold-500)] text-[var(--text-on-gold)] font-semibold text-sm disabled:opacity-50 transition hover:brightness-110"
          >
            {t("join_waiting_send")}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Separate component so its copied-state is independent */
function CopyAllButton({ text, label, labelCopied }: { text: string; label: string; labelCopied: string }) {
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
      {copied ? labelCopied : label}
    </button>
  );
}
