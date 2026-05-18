"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items: { href: string; label: string; icon: string }[] = [
  { href: "/dashboard", label: "Home", icon: "🏠" },
  { href: "/matches", label: "Matches", icon: "⚽" },
  { href: "/shop", label: "Shop", icon: "🎁" },
  { href: "/tokens", label: "Tokens", icon: "🪙" },
  { href: "/chat", label: "Chat", icon: "💬" },
];

export function MobilePlayerNav() {
  const pathname = usePathname();
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-background border-t border-foreground/10 pb-[env(safe-area-inset-bottom)]">
      <ul className="grid grid-cols-5">
        {items.map((it) => {
          const active = pathname === it.href || pathname?.startsWith(it.href + "/");
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                className={
                  "flex flex-col items-center justify-center py-2 text-[10px] " +
                  (active ? "text-foreground" : "text-zinc-500")
                }
              >
                <span className="text-xl leading-none">{it.icon}</span>
                <span className="mt-1">{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
