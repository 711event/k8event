"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Gift, MessageSquare, Sparkles } from "lucide-react";
import { cn } from "@k8event/shared/utils";

const tabs = [
  {
    key: "event",
    label: "赛事",
    href: "/event",
    icon: CalendarDays,
    match: (p: string) =>
      p === "/event" ||
      p.startsWith("/event/") ||
      p === "/matches" ||
      p.startsWith("/matches/") ||
      p === "/leaderboard" ||
      p === "/history",
  },
  {
    key: "activities",
    label: "活动",
    href: "/activities",
    icon: Sparkles,
    match: (p: string) => p === "/activities" || p.startsWith("/activities/"),
  },
  {
    key: "livechat",
    label: "客服",
    href: "/livechat",
    icon: MessageSquare,
    match: (p: string) => p === "/livechat" || p.startsWith("/livechat/"),
  },
  {
    key: "reward",
    label: "奖励",
    href: "/reward",
    icon: Gift,
    match: (p: string) =>
      p === "/reward" ||
      p.startsWith("/reward/") ||
      p === "/redemptions" ||
      p === "/tokens",
  },
];

export function PlayerBottomNav() {
  const pathname = usePathname() ?? "/event";
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-30 border-t border-[var(--border-subtle)] bg-[var(--bg-base)]/90 backdrop-blur-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto max-w-3xl grid grid-cols-4">
        {tabs.map((t) => {
          const active = t.match(pathname);
          const Icon = t.icon;
          return (
            <li key={t.key}>
              <Link
                href={t.href}
                className={cn(
                  "flex flex-col items-center justify-center py-2.5 gap-1 transition",
                  active ? "text-[var(--gold-500)]" : "text-[var(--text-lo)] hover:text-[var(--text-mid)]",
                )}
              >
                <div className="relative">
                  <Icon size={22} strokeWidth={active ? 2.5 : 2} />
                  {active && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-0.5 w-6 rounded-full bg-[var(--gold-500)]" />
                  )}
                </div>
                <span className={cn("text-[11px] font-medium tracking-wide", active && "text-[var(--gold-300)]")}>
                  {t.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
