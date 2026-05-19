"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
} from "lucide-react";
import { ChatUnreadBadge } from "./ChatUnreadBadge";

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
};

export type AdminNavItem = {
  href: string;
  label: string;
  icon: keyof typeof iconMap;
};

export function AdminSidebar({
  items,
  userLabel,
  userRole,
}: {
  items: AdminNavItem[];
  userLabel: string;
  userRole: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-60 flex-shrink-0 bg-zinc-900 text-zinc-100 flex-col">
      <div className="h-14 px-4 flex items-center gap-2.5 border-b border-zinc-800">
        <div className="h-7 w-7 rounded bg-gradient-to-br from-amber-300 to-amber-500 text-zinc-950 flex items-center justify-center font-bold text-[10px] tracking-tight">
          711
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold">711event</div>
          <div className="text-[10px] text-zinc-400 uppercase tracking-wider">管理后台</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3">
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
              className={
                "relative flex items-center gap-3 px-4 py-2.5 text-sm transition-colors " +
                (active
                  ? "bg-zinc-800/70 text-white"
                  : "text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-100")
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
        <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">{userRole}</div>
      </div>
    </aside>
  );
}
