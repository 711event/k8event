"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { signOutAction } from "@k8event/shared/auth/sign-out";
import { LangSwitcher } from "./LangSwitcher";

export function AvatarMenu({ displayName, username }: { displayName: string; username: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "?";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="h-9 w-9 rounded-full bg-gradient-to-br from-[var(--gold-300)] to-[var(--gold-600)] text-[var(--text-on-gold)] font-bold text-sm flex items-center justify-center hover:brightness-110 transition ring-2 ring-[var(--gold-500)]/30"
        aria-label="账户菜单"
      >
        {initials}
      </button>
      {open && (
        <div className="absolute right-0 top-11 w-56 rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--bg-elevated)] shadow-[var(--shadow-card)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border-subtle)] space-y-2">
            <div className="text-sm font-semibold text-[var(--text-hi)] truncate">{displayName}</div>
            <div className="text-xs text-[var(--text-lo)] font-mono truncate">{username}</div>
            <LangSwitcher />
          </div>
          <nav className="py-1">
            <Item href="/history" onClick={() => setOpen(false)} icon="📋" label="我的预测" />
            <Item href="/tokens" onClick={() => setOpen(false)} icon="🪙" label="Token 流水" />
            <Item href="/leaderboard" onClick={() => setOpen(false)} icon="🏆" label="完整排行榜" />
            <Item href="/redemptions" onClick={() => setOpen(false)} icon="🎁" label="我的兑换" />
          </nav>
          <form
            action={signOutAction}
            className="border-t border-[var(--border-subtle)]"
          >
            <button
              type="submit"
              className="w-full px-4 py-2.5 text-left text-sm text-[var(--crimson-400)] hover:bg-[var(--bg-raised)] transition"
            >
              退出登录
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function Item({ href, label, icon, onClick }: { href: string; label: string; icon: string; onClick: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--text-mid)] hover:bg-[var(--bg-raised)] hover:text-[var(--text-hi)] transition"
    >
      <span className="text-base leading-none">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}
