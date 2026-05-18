import Link from "next/link";
import { requireRole } from "@/lib/auth/require-role";
import { SignOutButton } from "@/components/shared/SignOutButton";
import { MobileAdminNav } from "@/components/shared/MobileAdminNav";

const adminNav = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/players", label: "Players" },
  { href: "/admin/teams", label: "Teams" },
  { href: "/admin/matches", label: "Matches" },
  { href: "/admin/recharge", label: "Recharge" },
  { href: "/admin/rewards", label: "Rewards" },
  { href: "/admin/redemptions", label: "Redemptions" },
  { href: "/admin/chat", label: "Chat" },
  { href: "/admin/quick-replies", label: "Quick replies" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(["admin", "agent"]);
  const links = user.role === "agent"
    ? adminNav.filter((l) => l.href === "/admin/chat" || l.href === "/admin/quick-replies")
    : adminNav;

  return (
    <div className="flex flex-1 flex-col min-h-screen">
      <header className="border-b border-foreground/10 px-4 sm:px-6 py-3 flex items-center justify-between gap-4 sticky top-0 bg-background z-20">
        <div className="flex items-center gap-4 sm:gap-6 min-w-0">
          <Link href="/admin" className="font-semibold whitespace-nowrap">k8event admin</Link>
          <nav className="hidden md:flex items-center gap-3 text-sm overflow-x-auto">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-zinc-600 dark:text-zinc-400 hover:text-foreground whitespace-nowrap transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-zinc-500 hidden sm:inline">
            {user.displayName} · {user.role}
          </span>
          <span className="hidden md:inline">
            <SignOutButton />
          </span>
          <MobileAdminNav
            items={links}
            userLabel={`${user.displayName} · ${user.role}`}
            signOutSlot={<SignOutButton />}
          />
        </div>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
