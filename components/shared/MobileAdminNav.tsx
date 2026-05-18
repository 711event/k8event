"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export function MobileAdminNav({
  items,
  userLabel,
  signOutSlot,
}: {
  items: { href: string; label: string }[];
  userLabel: string;
  signOutSlot: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="md:hidden h-9 w-9 rounded-md border border-foreground/15 flex items-center justify-center"
      >
        ☰
      </button>

      {open && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <aside className="relative ml-auto h-full w-72 bg-background border-l border-foreground/10 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-foreground/10">
              <span className="font-semibold">Menu</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="h-8 w-8 rounded-md hover:bg-foreground/5"
              >
                ✕
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-2">
              {items.map((it) => {
                const active = pathname === it.href || pathname?.startsWith(it.href + "/");
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    onClick={() => setOpen(false)}
                    className={
                      "block px-4 py-3 text-sm " +
                      (active
                        ? "bg-foreground/10 font-medium"
                        : "text-zinc-600 dark:text-zinc-400 hover:bg-foreground/5")
                    }
                  >
                    {it.label}
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-foreground/10 px-4 py-3 flex items-center justify-between gap-2 text-sm">
              <span className="text-zinc-500 truncate">{userLabel}</span>
              {signOutSlot}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
