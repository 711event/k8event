import Link from "next/link";
import { requireRole } from "@/lib/auth/require-role";
import { SignOutButton } from "@/components/shared/SignOutButton";
import { MobilePlayerNav } from "@/components/shared/MobilePlayerNav";

const playerNav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/matches", label: "Matches" },
  { href: "/history", label: "History" },
  { href: "/tokens", label: "Tokens" },
  { href: "/shop", label: "Shop" },
  { href: "/redemptions", label: "Redemptions" },
  { href: "/leaderboard", label: "Leaderboard" },
];

export default async function PlayerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("player");
  return (
    <div className="flex flex-1 flex-col min-h-screen pb-[68px] md:pb-0">
      <header className="border-b border-foreground/10 px-4 sm:px-6 py-3 flex items-center justify-between gap-4 sticky top-0 bg-background z-20">
        <Link href="/dashboard" className="font-semibold whitespace-nowrap">k8event</Link>
        <nav className="hidden md:flex items-center gap-3 text-sm flex-1 overflow-x-auto">
          {playerNav.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-zinc-600 dark:text-zinc-400 hover:text-foreground transition-colors whitespace-nowrap"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-zinc-500 hidden sm:inline">{user.displayName}</span>
          <SignOutButton />
        </div>
      </header>
      <div className="flex-1">{children}</div>
      <MobilePlayerNav />
    </div>
  );
}
