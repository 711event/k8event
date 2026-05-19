import { requireRole } from "@k8event/shared/auth/require-role";
import { SignOutButton } from "@k8event/shared/components/SignOutButton";
import { AdminSidebar, type AdminNavItem } from "@/components/admin/AdminSidebar";
import { AdminMobileNav } from "@/components/admin/AdminMobileNav";

const adminNav: AdminNavItem[] = [
  { href: "/admin", label: "总览", icon: "LayoutDashboard" },
  { href: "/admin/players", label: "玩家管理", icon: "Users" },
  { href: "/admin/recharge", label: "充值导入", icon: "Upload" },
  { href: "/admin/teams", label: "球队", icon: "Shield" },
  { href: "/admin/matches", label: "比赛", icon: "Calendar" },
  { href: "/admin/rewards", label: "奖品", icon: "Gift" },
  { href: "/admin/redemptions", label: "兑换审核", icon: "ClipboardCheck" },
  { href: "/admin/chat", label: "客服会话", icon: "MessageSquare" },
  { href: "/admin/quick-replies", label: "快速回复", icon: "Zap" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(["admin", "agent"]);
  const links =
    user.role === "agent"
      ? adminNav.filter((l) => l.href === "/admin/chat" || l.href === "/admin/quick-replies")
      : adminNav;

  return (
    <div className="flex min-h-screen bg-zinc-50 text-zinc-900">
      <AdminSidebar items={links} userLabel={user.displayName} userRole={user.role} />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 bg-white border-b border-zinc-200 h-14 px-4 sm:px-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <AdminMobileNav items={links} userLabel={user.displayName} userRole={user.role} />
            <div className="font-semibold text-sm truncate">BO 管理后台</div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-zinc-500 hidden sm:inline truncate max-w-[160px]">
              {user.displayName}
              <span className="ml-1.5 text-[10px] uppercase tracking-wide bg-zinc-100 text-zinc-600 rounded px-1.5 py-0.5">
                {user.role}
              </span>
            </span>
            <SignOutButton />
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
