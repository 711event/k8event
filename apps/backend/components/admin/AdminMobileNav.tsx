"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  Upload,
  Shield,
  Calendar,
  Gift,
  ClipboardCheck,
  MessageSquare,
  Zap,
  LayoutGrid,
  CalendarCheck,
  ShieldCheck,
  UserCog,
  Settings2,
  UserPlus,
  Menu,
  X,
} from "lucide-react";
import type { AdminNavItem } from "./AdminSidebar";
import { ChatUnreadBadge } from "./ChatUnreadBadge";
import { useChatUnread } from "./ChatUnreadProvider";
import { useLang } from "./LangProvider";
import { tBo } from "@/lib/i18n";

const iconMap = {
  LayoutDashboard,
  Users,
  Upload,
  Shield,
  Calendar,
  Gift,
  ClipboardCheck,
  MessageSquare,
  Zap,
  LayoutGrid,
  CalendarCheck,
  ShieldCheck,
  UserCog,
  Settings2,
  UserPlus,
};

export function AdminMobileNav({
  items,
  userLabel,
  userRole,
  branding,
}: {
  items: AdminNavItem[];
  userLabel: string;
  userRole: string;
  branding: { company_name: string; logo_url: string | null };
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { locale } = useLang();
  const t = (k: Parameters<typeof tBo>[1], vars?: Record<string, string | number>) => tBo(locale, k, vars);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("mobile_nav_open")}
        className="md:hidden relative h-9 w-9 rounded border border-zinc-200 flex items-center justify-center text-zinc-600 hover:bg-zinc-50"
      >
        <Menu size={18} />
        <span className="absolute -top-1 -right-1">
          <MobileMenuChatDot />
        </span>
      </button>

      {open && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="relative h-full w-64 bg-zinc-900 text-zinc-100 flex flex-col">
            <div className="h-14 px-4 flex items-center justify-between border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                {branding.logo_url ? (
                  <img src={branding.logo_url} alt={branding.company_name} className="h-7 w-auto object-contain max-w-[120px]" />
                ) : (
                  <>
                    <div className="h-7 w-7 rounded bg-gradient-to-br from-amber-300 to-amber-500 text-zinc-950 flex items-center justify-center font-bold text-[10px] tracking-tight flex-shrink-0">
                      711
                    </div>
                    <span className="font-semibold text-sm">{t("mobile_nav_backend", { name: branding.company_name })}</span>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("mobile_nav_close")}
                className="h-8 w-8 rounded hover:bg-zinc-800 flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-2">
              {items.map((it) => {
                const Icon = iconMap[it.icon];
                const active =
                  it.href === "/admin"
                    ? pathname === "/admin"
                    : pathname === it.href || pathname?.startsWith(it.href + "/");
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    onClick={() => setOpen(false)}
                    className={
                      "relative flex items-center gap-3 px-4 py-3 text-sm " +
                      (active
                        ? "bg-zinc-800/70 text-white"
                        : "text-zinc-400 hover:bg-zinc-800/40")
                    }
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-0.5 rounded-r bg-amber-400" />
                    )}
                    <Icon size={16} className={active ? "text-amber-300" : ""} />
                    <span className="flex-1">{it.label}</span>
                    {it.href === "/admin/chat" && <ChatUnreadBadge />}
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-zinc-800 px-4 py-3 text-xs">
              <div className="text-zinc-300 truncate">{userLabel}</div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">
                {userRole}
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

function MobileMenuChatDot() {
  const { unreadCount } = useChatUnread();
  if (unreadCount === 0) return null;
  return (
    <span className="inline-flex items-center justify-center min-w-[14px] h-[14px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold tabular-nums ring-2 ring-white">
      {unreadCount > 99 ? "99+" : unreadCount}
    </span>
  );
}
